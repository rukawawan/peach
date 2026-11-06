"""版本化存量补修：本地事务、证据回执和有界后台派发。"""
from __future__ import annotations

import json
import logging
import time
import threading
from pathlib import Path

from apscheduler.schedulers.background import BackgroundScheduler
from filelock import FileLock, Timeout

from . import artifact_rules, composite_alias_repair, metadata_text_repair, r18_legacy_repair, upgrade_rules
from .field_owners import SCAN_FILENAME, is_protected, owner_of, write_owned_fields
from .followups import FollowupType, Attempts, attempts_root, register
from .fsutil import atomic_write_text
from .migrations import sqlite_backup
from .task_runs import MAX_FOLLOWUPS

LOGGER = logging.getLogger(__name__)
TASK_KEY = 'upgrade-repairs'
MEDIA_TASK = 'upgrade-library'
CATALOG_REVISION = ':'.join((upgrade_rules.CATALOG, upgrade_rules.PREVIEWS, upgrade_rules.PROCESSING,
                           str(upgrade_rules.PUBLIC_SNAPSHOTS), str(upgrade_rules.PROVIDER_EVIDENCE)))
REVISION = f'{CATALOG_REVISION}:text-{upgrade_rules.PROVIDER_TEXT}'


def _read(path: Path) -> dict:
    try:
        value = json.loads(path.read_text(encoding='utf-8'))
    except FileNotFoundError:
        return {}
    if not isinstance(value, dict):
        raise ValueError('更新后的处理记录格式无效')
    return value


def _title(row) -> str:
    """任务中心里这一条写哪部片：有番号写番号，没有就写文件名。"""
    return str(row['code'] or row['name'] or f'影片 {row["id"]}')


def _counts(connection) -> dict:
    return {table: connection.execute(f'SELECT count(*) FROM {table}').fetchone()[0]
            for table in ('asset', 'entity', 'asset_tag')}


def _manual_name(connection, entity_id: int) -> bool:
    row = connection.execute('SELECT metadata_json FROM entity WHERE id=?', (entity_id,)).fetchone()
    try:
        metadata = json.loads(row[0] or '{}') if row else {}
        if not isinstance(metadata, dict):
            return True
        preference = metadata.get('name_preference', {})
    except (ValueError, TypeError):
        return True
    return (is_protected(preference.get('source')) if isinstance(preference, dict) else True) or bool(
        connection.execute("SELECT 1 FROM entity_alias WHERE entity_id=? AND source='user:preferred-name'",
                           (entity_id,)).fetchone())


#: 旧版从文件名误认的番号只清一次；清掉的行与原值记进同一条回执，可以按它整批撤回。
STALE_CODES_KEY = 'stale-filename-codes-1'


def stale_filename_codes(connection) -> list[dict]:
    """旧版从文件名误认、现行规则已经不认的番号。

    实例是手机录像的时间戳（`VID_20220818_125735_816` 记成 `125735-816`）和被截断的「名字_日期」
    （个人投稿者的 `KUZU_250103` 记成 `KUZU-25010`）。这类行有了番号就被当成 JAV，日期式番号还会拿到
    「无码」徽章。只看无主或由文件名扫描写入的番号，且文件名与所在文件夹按现行规则都认不出番号；
    再满足下面一条才清：番号本身已不合现行形状；或番号没有完整出现在文件名与文件夹里，这一行也没有
    任何目录资料（标题、片商、发行日）。带资料的那类是刮削按另一份身份改过的（`1pon-092415-001-fhd2`
    实为 `092415_159`），不碰。
    """
    import re
    from pathlib import PureWindowsPath
    from .catalog_rules import compile_code_patterns, is_jav_code, normalise_code_key, release_code_from_filename
    from .profiles import read_settings
    patterns = compile_code_patterns(read_settings(connection).get('codePatterns'))
    rows = []
    for row in connection.execute(
            "SELECT id,name,path,code,field_owners,catalog_title,studio,release_date FROM asset "
            "WHERE medium='video' AND code IS NOT NULL AND code<>''"):
        owner = owner_of(row['field_owners'], 'code')
        if owner not in ('', SCAN_FILENAME):
            continue
        texts = (str(row['name'] or ''), PureWindowsPath(str(row['path'] or '')).parent.name)
        if any(release_code_from_filename(text, patterns=patterns) for text in texts):
            continue
        body = re.escape(normalise_code_key(row['code'])).replace(r'\-', '[-_ ]?')
        whole = any(re.search(rf'(?<![A-Za-z0-9]){body}(?![A-Za-z0-9])', text, re.I) for text in texts)
        described = row['catalog_title'] or row['studio'] or row['release_date']
        if not is_jav_code(row['code']) or (not whole and not described):
            rows.append({'id': row['id'], 'code': row['code']})
    return rows


#: 撤过旧番号证据的影片按现番号重采时，补全任务键上的规则段。上一轮改回番号时已按
#: `processing-v2` 派过同一部片，键相同就会被当成派过而跳掉。
CODE_EVIDENCE_RULE = 'code-evidence-1'
CANDIDATE_FILE = 'library-metadata-field-candidates.csv'


def _split_by_code(row: dict, old: str, current: str) -> tuple[list[dict], dict | None]:
    """一行候选按旧、现番号拆开：撤下的候选，与改按现番号核身份的那一行（摘空了是 None）。"""
    from .metadata_auto_apply import _candidate_identifies_code
    try:
        choices = [choice for choice in json.loads(row.get('candidates_json') or '[]') if isinstance(choice, dict)]
    except ValueError:
        return [], row
    stale = [choice for choice in choices
             if _candidate_identifies_code(old, choice) and not _candidate_identifies_code(current, choice)]
    remaining = [choice for choice in choices if choice not in stale]
    if not remaining:
        return stale, None
    # 留下的候选按现番号核身份；`refresh_current_values` 也按这一栏找影片。
    return stale, {**row, 'code': current, 'query': current, 'source_count': len(remaining),
                   'candidates_json': json.dumps(remaining, ensure_ascii=False)}


def _orphan_snapshots(sources: Path, withdrawn: list[dict], codes) -> list[str]:
    """撤下的候选出自哪几份旧番号快照；库里还有影片是那部片的不算。"""
    from .catalog_rules import same_release_code
    snapshots = []
    pairs = {(row['code'], str(choice.get('source') or '')) for row in withdrawn for choice in row['candidates']}
    for old, source in sorted(pairs):
        path = sources / f'{old}-{source}.json'
        if (source and path.is_file() and not path.is_symlink()
                and not any(same_release_code(old, code) for code in codes)):
            snapshots.append(str(path))
    return snapshots


def stale_code_evidence(connection, candidates: Path, sources: Path) -> dict:
    """番号改过之后，旧番号下取到的资料候选和来源快照（#296）。

    `MCDV-24` 曾被补零成 `MCDV-024`，按它从 r18.dev 取回的是 2004 年的另一部片；番号改回之后，
    候选表那一行的 `code` 还写着旧番号，复核页按它核身份，那组资料就一直摆着。

    判据是候选级的：这一行记的番号与影片现番号不是同一部片（`same_release_code`），且这条
    候选认得旧番号、不认现番号。同一部片只是写法变了（`HEYZO-707` 改成 `HEYZO-0707`）的整行
    放过；两个番号都不认的候选身份不明，也放过。用户批准过的行候选与账本值都不动，那是人的
    结论，只把这一行的番号改成现番号：复核页按它核身份，按现番号重采回来的资料与批准值不同时，
    这一行会以差异重新摆出。旧番号的快照只在库里已没有任何影片还是那部片时失效：真有 2004 年
    那部 `MCDV-024` 的，快照是对的。
    """
    from .catalog_rules import same_release_code
    from .review_csv import read_rows
    rows = read_rows(candidates, missing_ok=True)
    codes = {row[0]: row[1] for row in connection.execute(
        "SELECT id,code FROM asset WHERE medium='video' AND disposal IS NULL AND code IS NOT NULL AND code<>''")}
    approved = {row[0] for row in connection.execute(
        "SELECT item_key FROM review_decision WHERE category='metadata_fields' AND status='approved'")}
    kept, withdrawn, held, changed = [], [], [], False
    for row in rows:
        old = str(row.get('code') or '').strip()
        asset_id = int(row['asset_id']) if str(row.get('asset_id') or '').isdigit() else 0
        current = codes.get(asset_id)
        if not old or not current or same_release_code(old, current):
            kept.append(row)
            continue
        changed = True
        if row['item_key'] in approved:
            held.append(row['item_key'])
            kept.append({**row, 'code': current, 'query': current})
            continue
        stale, rest = _split_by_code(row, old, current)
        if stale:
            withdrawn.append({'item_key': row['item_key'], 'asset_id': asset_id, 'code': old, 'target': current,
                              'candidates': stale})
        if rest is not None:
            kept.append(rest)
    return {'rows': kept if changed else None, 'withdrawn': withdrawn,
            'snapshots': _orphan_snapshots(sources, withdrawn, codes.values()),
            'approved_kept': held, 'asset_ids': sorted({row['asset_id'] for row in withdrawn})}


def _catalog_plan(connection, sources: Path, *, catalog: bool = True) -> dict:
    text = metadata_text_repair.collect(connection, sources / 'library-metadata')
    if not catalog:
        return {'codes':[], 'fields':[], 'names':[], 'aliases':[], 'text':text, 'catalog':False}
    from .catalog_rules import (compile_code_patterns, normalise_code_key, release_code_from_filename,
                                same_release_code)
    from .profiles import read_settings
    patterns = compile_code_patterns(read_settings(connection).get('codePatterns'))
    codes = []
    for row in connection.execute('SELECT id,name,code,field_owners FROM asset WHERE medium=\'video\''):
        if owner_of(row['field_owners'], 'code') != SCAN_FILENAME:
            continue
        expected = release_code_from_filename(row['name'] or '', patterns=patterns)
        # 同一部片、规范写法变了的也改：HEYZO 定宽四位后，旧的 `HEYZO-707` 规范化就是 `HEYZO-0707`（#354）。
        rewritten = row['code'] != expected == normalise_code_key(row['code'])
        if expected and row['code'] and (rewritten or not same_release_code(expected, row['code'])):
            codes.append({'id': row['id'], 'current': row['code'], 'target': expected})
    fields = r18_legacy_repair.collect(connection, sources / 'library-metadata')
    names = r18_legacy_repair.collect_entities(connection, sources / 'library-metadata',
                                              sources / 'metadata/javinizer-go')
    for row in names:
        if _manual_name(connection, row['entity_id']):
            row.update(action='skip', reason='manual-name')
    aliases = composite_alias_repair.collect(connection)
    for row in aliases:
        if is_protected(row['source']):
            row.update(verdict='review', note='人工别名保持原样')
    return {'codes': codes, 'fields': fields, 'names': names, 'aliases': aliases,
            'text': text, 'catalog': True}


def _catalog_apply(connection, plan: dict) -> dict:
    if not plan.get('catalog', True):
        return {'codes':0, 'probe_retry':0, **metadata_text_repair.apply(connection, plan['text'])}
    from datetime import datetime, timezone
    changed = {}
    for row in plan['codes']:
        current = connection.execute('SELECT code,field_owners FROM asset WHERE id=?', (row['id'],)).fetchone()
        if current and current[0] == row['current'] and owner_of(current[1], 'code') == SCAN_FILENAME:
            write_owned_fields(connection, [row['id']], {'code': row['target']}, SCAN_FILENAME)
    changed['codes'] = len(plan['codes'])
    changed.update(r18_legacy_repair.apply_rows(connection, plan['fields']))
    stamp = datetime.now(timezone.utc).isoformat()
    names = [row for row in plan['names'] if not _manual_name(connection, row['entity_id'])]
    changed.update(r18_legacy_repair.apply_entity_rows(connection, names, stamp))
    fields = ('entity_id', 'field', 'value', 'source', 'parts')
    approved = {tuple(row[field] for field in fields) for row in plan['aliases'] if row['verdict'] == 'auto'}
    aliases = [row for row in composite_alias_repair.collect(connection)
               if tuple(row[field] for field in fields) in approved and not is_protected(row['source'])]
    changed.update(composite_alias_repair.apply_rows(connection, aliases))
    changed.update(metadata_text_repair.apply(connection, plan['text']))
    failed = connection.execute("SELECT id FROM asset WHERE medium='video' AND duration<=0 AND disposal IS NULL").fetchall()
    connection.execute("UPDATE asset SET duration=NULL WHERE medium='video' AND duration<=0 AND disposal IS NULL")
    changed['probe_retry'] = len(failed)
    return changed


def _stale_previews(contract, row):
    """本地配套海报和九宫格分别按所属规则校验。

    只看本机影片：影片补全只给本机影片重抽九宫格、重读配套海报。网盘影片的九宫格是
    `scripts/sheets.py` 抽的，没有规则签名，算它过期就每次换版都把整个网盘库派一遍，派完照旧过期。
    """
    from .media_processing_policy import metadata_only
    from .platform import translate_ledger_path
    if row['location'] != 'local':
        return False
    poster = Path(getattr(contract, 'poster_root', Path(contract.candidate_root) / 'posters')) / f'{row["id"]}_4.jpg'
    if poster.is_file() and not (artifact_rules.current(poster, source_required=True) or artifact_rules.current(
            poster, upgrade_rules.LOCAL_POSTERS, source_required=True)):
        return True
    snapshot = translate_ledger_path(row['snapshot_path']) if row['snapshot_path'] else None
    return (snapshot is not None and contract.snapshot_root is not None
            and snapshot.is_relative_to(contract.snapshot_root) and not artifact_rules.current(snapshot)
            and not metadata_only(contract.follow_state_root))


class UpgradeRepairs:
    """一个数据目录一份回执；网络与媒体工作由现有任务通道执行。"""

    def __init__(self, contract, *, available: bool, config=None):
        self.contract, self.available = contract, available
        self.config = config
        self.error = ''
        self.stopping = threading.Event()
        self.root = Path(contract.follow_state_root) / 'upgrade-repairs'
        self.scheduler = BackgroundScheduler(timezone='UTC', daemon=True)

    @property
    def receipt(self) -> Path:
        return self.root / 'receipt.json'

    def snapshot(self) -> dict:
        if not self.available:
            return {'state': 'unavailable', 'items': [], 'available': False}
        try:
            receipt = _read(self.receipt)
        except (OSError, ValueError, TypeError):
            return {'state': 'failed', 'items': [{'id': 'receipt', 'label': '更新后自动处理', 'state': 'failed',
                                                 'message': '更新后的处理记录无法读取'}],
                    'available': True, 'message': '处理记录无法读取，请重试'}
        local = receipt.get('local', {})
        queued = receipt.get('queued', {})
        states = []
        ids = list(queued.values())
        if ids:
            with self.contract.database.read_connection() as connection:
                for offset in range(0, len(ids), 900):
                    batch = ids[offset:offset + 900]
                    states.extend(row[0] for row in connection.execute(
                        f'SELECT status FROM task_run WHERE id IN ({",".join("?" for _ in batch)})', batch))
        active = sum(state in ('pending', 'running') for state in states)
        failed = sum(state in ('failed', 'interrupted') for state in states)
        review = int(local.get('review_count', 0)) + len(receipt.get('deferred', []))
        state = 'failed' if self.error else 'running' if active else 'failed' if failed else 'review' if review else (
            'complete' if receipt.get('dispatch_complete') and local else 'pending')
        items = [{'id': REVISION, 'label': '更新已有资料', 'state': local.get('state', 'pending'),
                  'changed': local.get('changed', {}), 'review_count': review},
                 {'id': 'background', 'label': '后台更新进度', 'state': state,
                  'pending': active, 'failed': failed, 'queued': len(queued)}]
        return {'state': state, 'items': items, 'available': self.available, 'message': self.error}

    def prepare(self) -> None:
        """服务恢复任务前应用本地确定性修复。"""
        if not self.available or not self.contract.task_runs.enabled:
            return
        self.root.mkdir(parents=True, exist_ok=True)
        with FileLock(str(self.receipt) + '.lock', timeout=0):
            contract = self.contract
            with contract.database.read_connection() as connection:
                applied = connection.execute('SELECT result_json FROM ledger_upgrade_repair WHERE id=?',
                                              (REVISION,)).fetchone()
                prior = connection.execute(
                    'SELECT result_json,id FROM ledger_upgrade_repair WHERE id=? OR id GLOB ? '
                    'ORDER BY CAST(applied_at AS REAL) DESC LIMIT 1',
                    (CATALOG_REVISION, CATALOG_REVISION + ':text-*')).fetchone()
            if applied is not None:
                self._restore_receipt(json.loads(applied[0]))
                self._withdraw_stale_code_evidence()
                return
            self._restore_receipt(None)
            sources = Path(contract.follow_sources_root)
            previous = json.loads(prior[0]) if prior is not None else {}
            with contract.database.read_connection() as connection:
                plan = _catalog_plan(connection, sources, catalog=prior is None)
                before = _counts(connection)
                failed = [row[0] for row in connection.execute(
                    "SELECT id FROM asset WHERE medium='video' AND duration<=0 AND disposal IS NULL")] if prior is None else []
            atomic_write_text(self.root / 'catalog-review.json', json.dumps(plan, ensure_ascii=False, indent=2))
            backup = contract.db_path.with_name(f'ledger.pre-upgrade-{time.time_ns()}.db')
            sqlite_backup(contract.db_path, backup)
            review = sum(row['reason'] not in ('already-original', 'already-japanese', 'manual-name')
                         and row['action'] not in ('replace', 'rename') for row in plan['fields'] + plan['names'])
            review += sum(row['verdict'] == 'review' for row in plan['aliases'])
            review += sum(row['action'] == 'review' for row in plan['text']['rows'])
            review += previous.get('local', {}).get('review_count', 0)
            with contract.database.write_transaction() as connection:
                violations = {tuple(row) for row in connection.execute('PRAGMA foreign_key_check')}
                changed = _catalog_apply(connection, plan)
                if connection.execute('PRAGMA integrity_check').fetchone()[0] != 'ok':
                    raise RuntimeError('更新已有资料时账本完整性校验失败')
                if any(tuple(row) not in violations for row in connection.execute('PRAGMA foreign_key_check')):
                    raise RuntimeError('更新已有资料时关联校验失败')
                after = _counts(connection)
                receipt = {'revision': REVISION, 'local': {'state': 'succeeded', 'changed': changed,
                           'review_count': review, 'before': before, 'after': after, 'backup': str(backup)},
                           'text_media_ids': plan['text']['asset_ids'],
                           'media_ids': sorted(set(failed + [row['id'] for row in plan['codes']]
                                                   + previous.get('media_ids', [])
                                                   + plan['text']['asset_ids'])),
                           'queued': dict(previous.get('queued', {})),
                           'deferred': list(previous.get('deferred', [])),
                           'code_media_ids': list(previous.get('code_media_ids', [])),
                           'dispatch_complete': bool(previous.get('dispatch_complete')) and not plan['text']['asset_ids'],
                           'text_only': prior is not None,
                           'prior_revision': prior[1] if prior else None}
                connection.execute('INSERT INTO ledger_upgrade_repair(id,applied_at,result_json) VALUES(?,?,?)',
                                   (REVISION, str(time.time()), json.dumps(receipt, ensure_ascii=False)))
            atomic_write_text(self.receipt, json.dumps(receipt, ensure_ascii=False))
            self._withdraw_stale_code_evidence()

    def _withdraw_stale_code_evidence(self) -> None:
        """撤掉旧番号下取到的候选与快照（`stale_code_evidence`），被撤的影片按现番号重采。

        每份回执做一次，在 `prepare` 里、处理任务恢复之前做：那时没有采集任务拿着候选表。
        撤下的候选原样记进回执的 `code_evidence`，快照只加失效标记、正文不动，都能按它整批还原。
        """
        from .library_processing import FIELDS
        from .review_csv import write_rows
        output = Path(self.contract.candidate_root) / CANDIDATE_FILE
        sources = Path(self.contract.follow_sources_root) / 'library-metadata'
        with self.contract.database.write_transaction() as connection:
            stored = connection.execute('SELECT result_json FROM ledger_upgrade_repair WHERE id=?',
                                        (REVISION,)).fetchone()
            receipt = json.loads(stored[0]) if stored else None
            if receipt is None or 'code_evidence' in receipt:
                return
            plan = stale_code_evidence(connection, output, sources)
            if plan['rows'] is not None:
                write_rows(output, FIELDS, plan['rows'], atomic=True)
            for path in plan['snapshots']:
                artifact_rules.remember(Path(path), f'invalid:{CODE_EVIDENCE_RULE}')
            receipt['code_evidence'] = {'withdrawn': plan['withdrawn'], 'snapshots': plan['snapshots'],
                                        'approved_kept': plan['approved_kept']}
            if plan['asset_ids']:
                receipt['code_media_ids'] = sorted(set(receipt.get('code_media_ids', [])) | set(plan['asset_ids']))
                receipt['media_ids'] = sorted(set(receipt.get('media_ids', [])) | set(plan['asset_ids']))
                receipt['dispatch_complete'] = False
            connection.execute('UPDATE ledger_upgrade_repair SET result_json=? WHERE id=?',
                               (json.dumps(receipt, ensure_ascii=False), REVISION))
        atomic_write_text(self.receipt, json.dumps(receipt, ensure_ascii=False))
        if plan['withdrawn']:
            LOGGER.info('旧番号下的资料候选：撤下 %s 行，快照失效 %s 份',
                        len(plan['withdrawn']), len(plan['snapshots']))

    def _clear_stale_codes(self) -> None:
        """清掉旧版从文件名误认的番号（`stale_filename_codes`），只做一次。"""
        with self.contract.database.write_transaction() as connection:
            if connection.execute('SELECT 1 FROM ledger_upgrade_repair WHERE id=?', (STALE_CODES_KEY,)).fetchone():
                return
            rows = stale_filename_codes(connection)
            if rows:
                write_owned_fields(connection, [row['id'] for row in rows], {'code': None}, SCAN_FILENAME)
            connection.execute('INSERT INTO ledger_upgrade_repair(id,applied_at,result_json) VALUES(?,?,?)',
                               (STALE_CODES_KEY, str(time.time()), json.dumps({'cleared': rows})))
        LOGGER.info('旧版误认的番号：清掉 %s 条', len(rows))

    def _release_studio_misses(self) -> None:
        """旧版断网时记下的「官网未取得」各放一次重试（`studio_followup.release_unbounded_misses`）。

        只改候选缓存里的记号文件，不写账本行；做过的记进 `ledger_upgrade_repair`，只做一次。
        """
        from .studio_followup import release_unbounded_misses
        key = 'studio-unbounded-misses-1'
        try:
            with self.contract.database.read_connection() as connection:
                if connection.execute('SELECT 1 FROM ledger_upgrade_repair WHERE id=?', (key,)).fetchone():
                    return
            changed = release_unbounded_misses(attempts_root(self.contract.candidate_root))
            with self.contract.database.write_transaction() as connection:
                connection.execute('INSERT OR IGNORE INTO ledger_upgrade_repair(id,applied_at,result_json) '
                                   'VALUES(?,?,?)', (key, str(time.time()), json.dumps({'released': changed})))
            LOGGER.info('旧的「官网未取得」放行重试：%s 条', changed)
        except Exception:
            LOGGER.exception('放行旧的「官网未取得」重试失败')

    def _settle_verification(self) -> None:
        """核查差异的结算规则（ADR-0139）对存量候选跑一遍，规则版本变了才再跑。

        只喂带核查标记的那些行：其余候选的判据没变，这一步不替它们重判。有要处理的行才
        先备份；结果连同规则版本记进 `ledger_upgrade_repair`，账本恢复到之前的备份时会重跑。
        几千行要跑一两分钟，所以不在 `prepare` 里挡着服务启动，由 `start` 交给后台调度跑；
        自动落库按批提交，页面上的写入照常穿插进来。
        """
        try:
            self._settle_verification_once()
        except Exception as exc:
            self.error = str(exc)
            LOGGER.exception('核查差异存量结算失败')

    def _settle_verification_once(self) -> None:
        from .metadata_auto_apply import _parsed_candidates, auto_apply_metadata
        from .review_csv import read_candidates
        key = f'verification-settlement-{upgrade_rules.VERIFICATION_SETTLEMENT}'
        contract = self.contract
        with contract.database.read_connection() as connection:
            if connection.execute('SELECT 1 FROM ledger_upgrade_repair WHERE id=?', (key,)).fetchone():
                return
        rows, _source, _skipped = read_candidates('metadata_fields', Path(contract.candidate_root))
        rows = [row for row in rows
                if any(candidate.get('requires_review') for candidate in _parsed_candidates(row))]
        result = {'rows': len(rows)}
        if rows:
            backup = contract.db_path.with_name(f'ledger.pre-upgrade-{time.time_ns()}.db')
            sqlite_backup(contract.db_path, backup)
            summary = auto_apply_metadata(
                contract.database, Path(contract.candidate_root), candidate_rows=rows,
                snapshot_root=Path(contract.follow_sources_root) / 'library-metadata',
                active=lambda: not self.stopping.is_set())
            if self.stopping.is_set():
                return
            result.update({name: summary[name] for name in
                           ('applied', 'kept', 'refreshed', 'auto_rejected', 'left_to_review')},
                          backup=str(backup))
        with contract.database.write_transaction() as connection:
            connection.execute('INSERT OR IGNORE INTO ledger_upgrade_repair(id,applied_at,result_json) '
                               'VALUES(?,?,?)', (key, str(time.time()), json.dumps(result, ensure_ascii=False)))
        LOGGER.info('核查差异存量结算：%s', result)

    def _restore_receipt(self, authoritative):
        try:
            cached = _read(self.receipt)
        except (ValueError, TypeError):
            self.receipt.replace(self.receipt.with_name(f'receipt.corrupt-{time.time_ns()}.json'))
            cached = {}
        if authoritative is not None and cached != authoritative:
            atomic_write_text(self.receipt, json.dumps(authoritative, ensure_ascii=False))

    def _save_receipt(self, receipt):
        encoded = json.dumps(receipt, ensure_ascii=False)
        with self.contract.database.write_transaction(notify=False) as connection:
            if connection.execute('SELECT 1 FROM ledger_upgrade_repair WHERE id=?', (REVISION,)).fetchone() is None:
                raise ValueError('更新后的处理记录需要重新准备，请重试')
            connection.execute('UPDATE ledger_upgrade_repair SET result_json=? WHERE id=? AND result_json<>?',
                               (encoded, REVISION, encoded))
        atomic_write_text(self.receipt, encoded)

    def _media_backlog(self) -> int:
        """已经派出、还没轮到的影片补全条数。"""
        with self.contract.database.read_connection() as connection:
            return connection.execute("SELECT count(*) FROM task_run WHERE task_key=? AND status='pending'",
                                      (MEDIA_TASK,)).fetchone()[0]

    def _plan(self, receipt: dict, *, media: bool = True):
        """`media` 为假时只排资料与人物后继，影片补全等前面那批跑下去再派。"""
        from . import (avatar_followup, creator_identity_followup, performer_alias_followup,
                       performer_profile_followup, seed_followup, studio_followup)
        from .library_processing import _people_allowed
        from .media_sources import cost_for
        from .settings_file import load_config, DATA_ROOT_ENV
        config = load_config(environ={DATA_ROOT_ENV: str(self.config.data_root)}) if self.config is not None else load_config()
        seen = set(receipt.get('queued', {}))
        inherited = set()
        for key, run_id in receipt.get('queued', {}).items():
            if key.startswith(MEDIA_TASK + ':'):
                run = self.contract.task_runs.get(run_id)
                if run is not None and run.status in ('pending', 'running', 'cancelled'):
                    inherited.add(int(key.rsplit(':', 1)[1]))
        attempts = Attempts(attempts_root(self.contract.candidate_root))
        with self.contract.database.read_connection() as connection:
            maximum = connection.execute('SELECT coalesce(max(id),0) FROM entity').fetchone()[0]
            planned = [row for row in seed_followup.plan(connection, since_entity_id=maximum) if row.key not in seen]
            planners = (performer_alias_followup, studio_followup, performer_profile_followup,
                        creator_identity_followup, avatar_followup) if (
                            not receipt.get('text_only') and _people_allowed(config)) else ()
            for planner in planners:
                remaining = MAX_FOLLOWUPS - len(planned)
                if remaining <= 0:
                    break
                args = [connection]
                if planner is studio_followup:
                    args.append(self.contract.logo_root)
                elif planner is avatar_followup:
                    args.append(self.contract.avatar_root)
                args.append(attempts)
                planned.extend(planner.stock(*args, limit=min(16, remaining), skip=seen))
            if not media:
                return planned[:MAX_FOLLOWUPS]
            rows = connection.execute("SELECT id,code,name,path,location,snapshot_path FROM asset WHERE medium='video' "
                                      "AND disposal IS NULL ORDER BY id").fetchall()
        from .followups import Followup
        selected = set(receipt.get('media_ids', []))
        deferred = []
        for row in rows:
            if row['id'] in inherited:
                continue
            if row['id'] not in selected and not _stale_previews(self.contract, row):
                continue
            rule = upgrade_rules.PROCESSING
            if row['id'] in receipt.get('text_media_ids', []):
                rule += f':text-{upgrade_rules.PROVIDER_TEXT}'
            if row['id'] in receipt.get('code_media_ids', []):
                rule += f':{CODE_EVIDENCE_RULE}'
            key = f'{MEDIA_TASK}:{rule}:{row["id"]}'
            if key in seen:
                continue
            if cost_for(row['location'], row['path'], config) != 'free':
                deferred.append(row['id'])
                continue
            planned.append(Followup(key, MEDIA_TASK, _title(row)))
            if len(planned) >= MAX_FOLLOWUPS:
                break
        receipt['deferred'] = deferred
        return planned[:MAX_FOLLOWUPS]

    def tick(self) -> None:
        if not self.available or not self.receipt.is_file():
            return
        try:
            with FileLock(str(self.receipt) + '.lock', timeout=0):
                receipt = _read(self.receipt)
                if receipt.get('dispatch_complete'):
                    from . import seed_followup
                    with self.contract.database.read_connection() as connection:
                        maximum = connection.execute('SELECT coalesce(max(id),0) FROM entity').fetchone()[0]
                        seed = seed_followup.plan(connection, since_entity_id=maximum)
                    if not receipt.get('deferred') and not any(row.key not in receipt.get('queued', {}) for row in seed):
                        return
                    receipt['dispatch_complete'] = False
                # 影片补全只有一条通道、一次一部；不等前面那批跑下去就每分钟再派一批，
                # 整个库会在一两个小时里全堆进队列，任务中心满屏都是「已处理 0 / 64」。
                media = self._media_backlog() < MAX_FOLLOWUPS
                planned = self._plan(receipt, media=media)
                if not planned and not media:
                    return
                if not planned:
                    receipt['dispatch_complete'] = True
                else:
                    if not self._dispatch(planned, receipt):
                        return
                self._save_receipt(receipt)
                self.error = ''
            self.contract.followups.wake()
        except Timeout:
            return
        except Exception as exc:
            self.error = str(exc)
            LOGGER.exception('升级补修派发失败')

    def _dispatch(self, planned, receipt):
        store = self.contract.task_runs
        orphan = store.blocking(TASK_KEY)
        if orphan is not None:
            store.finish(orphan.id, 'failed', error='资料派发被中断，正在重新安排')
        run = store.start(TASK_KEY, trigger='scheduled', mutex_key=TASK_KEY, label='安排自动更新资料')
        if run is None:
            return False
        try:
            result = store.enqueue_followups(run.id, [(row.key, row.task_key, row.label) for row in planned])
            queued = receipt.setdefault('queued', {})
            for run_id in result['queued']:
                child = store.get(run_id)
                queued[child.followup_key] = run_id
            for row in planned:
                if row.key not in queued:
                    child = store.blocking(row.key)
                    if child is not None:
                        queued[row.key] = child.id
            store.finish(run.id, 'succeeded', summary={'outcome': f'已安排 {len(result["queued"])} 项处理'})
        except Exception as exc:
            store.finish(run.id, 'failed', error=str(exc))
            raise
        return True

    def retry(self) -> dict:
        """显式重试失败项；用户取消的任务保持取消。"""
        if not self.available:
            raise ValueError('更新后自动处理只在本机写入端可用')
        self.prepare()
        with FileLock(str(self.receipt) + '.lock', timeout=0):
            receipt = _read(self.receipt)
            kept = {}
            for key, run_id in receipt.get('queued', {}).items():
                run = self.contract.task_runs.get(run_id)
                if run is None or run.status not in ('failed', 'interrupted'):
                    kept[key] = run_id
            receipt.update(queued=kept, dispatch_complete=False)
            self._save_receipt(receipt)
            self.error = ''
        self.tick()
        return self.snapshot()

    def start(self) -> None:
        if self.available and not self.scheduler.running:
            self.tick()
            self.scheduler.add_job(self.tick, 'interval', seconds=60, max_instances=1, coalesce=True)
            self.scheduler.add_job(self._settle_verification, max_instances=1)
            self.scheduler.add_job(self._release_studio_misses, max_instances=1)
            self.scheduler.add_job(self._clear_stale_codes, max_instances=1)
            self.scheduler.start()

    def stop(self) -> None:
        self.stopping.set()
        if self.scheduler.running:
            self.scheduler.shutdown(wait=True)
        if self.available:
            self.contract.followups.stop(wait_for=(MEDIA_TASK,))


def _media_run(contract, key: str, handle) -> dict:
    from .settings_file import load_config
    from .library_processing import process_library
    from .jobs import JobPaused
    asset_id = int(key.rsplit(':', 1)[1])
    config = getattr(contract, 'upgrade_config', None) or load_config()
    state_file = Path(contract.follow_state_root) / 'upgrade-repairs' / f'{asset_id}.json'
    previous = _read(state_file)
    job_id = key.replace(':', '-')
    if previous.get('job_id', job_id) != job_id:
        previous = {}
    if previous:
        previous.update(issue_count=0, paused_count=0, issue_preview=[], retryable_asset_ids=[])
    service = getattr(contract, 'upgrade_repairs', None)
    with contract.database.read_connection() as connection:
        found = connection.execute('SELECT id,code,name FROM asset WHERE id=?', (asset_id,)).fetchone()
    title = _title(found) if found else f'影片 {asset_id}'
    def active():
        return service is None or not service.stopping.is_set()
    try:
        result = process_library(config, contract.db_path, contract.candidate_root, contract.cover_root,
                             database=contract.database, asset_ids=[asset_id], stage='collect',
                             recheck_existing=True, job_id=job_id,
                             state_file=state_file, resume_state=previous or None,
                             active=active,
                             report=lambda state: handle.progress(
                                 label=f"{title} · {state.get('stage') or '更新影片资料'}"))
    except InterruptedError:
        if not active():
            raise JobPaused('服务重启后继续') from None
        raise
    # 走完全程只剩这部片自己的问题（坏文件探不出时长、抽不出帧）算完成；有来源冷却暂缓的
    # 还要等来源放开再补，留成失败交给后继重试。
    finished = result.get('status') in ('complete', 'succeeded') or (
        result.get('outcome') == 'partial' and not result.get('paused_count'))
    if not finished:
        raise RuntimeError(result.get('error') or '影片升级补全未完成，请在任务中心查看后重试')
    return {'outcome': '影片升级补全完成', 'name': title, 'asset_id': asset_id}


TYPE = register(FollowupType(MEDIA_TASK, '更新影片资料', True, _media_run))
