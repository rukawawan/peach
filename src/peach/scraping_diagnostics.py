"""从本机采集证据生成有界、只读的刮削诊断产物。"""
from __future__ import annotations

import csv
import hashlib
import heapq
import io
import json
import re
import sqlite3
import tempfile
import zipfile
import xml.etree.ElementTree as ET
from contextlib import closing
from datetime import datetime, timezone
from pathlib import Path

from . import error_reporting
from .task_stages import stage as stage_fields
from .user_messages import UserFacingError, UserValueError

SUMMARY_LIMIT = 50
CODE_LIMIT = 20
FILE_LIMIT = 1024 * 1024
EXPORT_LIMIT = 128 * 1024 * 1024
# 每组主键以 SQLite 参数传入，保留在标准 32766 参数上限以内。
ROW_LIMIT = 30_000
SNAPSHOT_FIELDS = frozenset({
    'id', 'content_id', 'title', 'original_title', 'release_date', 'release', 'date',
    'actresses', 'actors', 'performers', 'maker', 'studio', 'label', 'series',
    'genres', 'tags', 'director', 'source', 'source_url', 'catalog_evidence', 'collection_diagnostics',
})
CANDIDATE_FIELDS = frozenset({
    'candidate_key', 'source', 'provider', 'value', 'display_value', 'confidence',
    'warnings', 'provider_id', 'content_id', 'source_kind', 'official',
    'requires_review', 'catalog_evidence', 'unmapped_genres',
})


class EvidenceTooLarge(ValueError):
    """来源文件超过详细导出的单文件上限。"""


class ExportCancelled(UserFacingError, RuntimeError):
    """用户取消本次诊断导出。code 固定为导出阶段的 `stage.diagnostics.cancelled`。"""

    def __init__(self) -> None:
        super().__init__("stage.diagnostics.cancelled")


def selected_codes(value: str) -> list[str]:
    """导出选择只接受作品编号，不能作为文件路径使用。"""
    codes = list(dict.fromkeys(part.upper() for part in re.split(r'[\s,，、;；]+', value.strip()) if part))
    if len(codes) > CODE_LIMIT or any(not re.fullmatch(r'[A-Z0-9][A-Z0-9_-]{1,63}', code) for code in codes):
        raise UserValueError('errors.scrapingDiagnostics.codesInvalid', {'limit': CODE_LIMIT})
    return codes


def _inside(path: Path, root: Path) -> bool:
    return path.is_file() and not path.is_symlink() and path.resolve().is_relative_to(root.resolve())


def _recent_snapshots(root: Path, limit: int):
    if not root.is_dir():
        return []
    def entries():
        for path in root.glob('*.json'):
            try:
                if _inside(path, root):
                    yield path.stat().st_mtime, path.name, path
            except OSError:
                continue
    return heapq.nlargest(limit, entries())


def _read_json(path: Path, root: Path):
    if not _inside(path, root):
        raise ValueError('evidence file is outside the fetch directory')
    with path.open('rb') as stream:
        raw = stream.read(FILE_LIMIT + 1)
    if len(raw) > FILE_LIMIT:
        raise EvidenceTooLarge('evidence file exceeds the per-file limit')
    payload = json.loads(raw)
    if not isinstance(payload, dict):
        raise ValueError('evidence file is not a metadata object')
    return payload


def _snapshot_identity(path: Path):
    # 文件名由 library_processing._evidence_path 写入：<番号>-<来源>.json。
    from .metadata_policy import SOURCE_SPECS
    for source in sorted(SOURCE_SPECS, key=len, reverse=True):
        suffix = '-' + source
        if path.stem.endswith(suffix):
            code = path.stem[:-len(suffix)].upper()
            return (code, source) if re.fullmatch(r'[A-Z0-9][A-Z0-9_-]{1,63}', code) else ('', '')
    match = re.match(r'(.+)-(custom-[a-z0-9_-]+)$', path.stem)
    return ((match[1].upper(), match[2]) if match and re.fullmatch(r'[A-Za-z0-9][A-Za-z0-9_-]{1,63}', match[1])
            else ('', ''))


def summary(config) -> dict:
    """普通诊断只附近期来源索引，字段取值留给主动导出的详细包。"""
    root = config.directory('sources') / 'library-metadata'
    records = []
    for modified, _name, path in _recent_snapshots(root, SUMMARY_LIMIT + 1):
        code, source = _snapshot_identity(path)
        if not code:
            continue
        row = {'code': code, 'source': source,
               'saved_at': datetime.fromtimestamp(modified, timezone.utc).isoformat()}
        try:
            payload = _read_json(path, root)
            row.update(status='available', fields=sorted(SNAPSHOT_FIELDS.intersection(payload)))
        except (OSError, ValueError) as error:
            row.update(status='unavailable', reason=type(error).__name__)
        records.append(row)
    return {'schema': 1, 'kind': 'recent-source-index', 'limit': SUMMARY_LIMIT,
            'status': 'available' if records else 'unavailable',
            'truncated': len(records) > SUMMARY_LIMIT, 'records': records[:SUMMARY_LIMIT],
            'detail': 'Export scraping records separately for full fields and credit evidence'}


class _Export:
    def __init__(self, archive, progress, cancelled):
        self.archive = archive
        self.used = 0
        self.entries = []
        self.progress = progress
        self.cancelled = cancelled

    def check(self):
        if self.cancelled():
            raise ExportCancelled()

    def add(self, name: str, payload):
        self.check()
        reserve = min(8 * 1024 * 1024, EXPORT_LIMIT // 4)
        limit = EXPORT_LIMIT if name == 'manifest.json' else EXPORT_LIMIT - reserve
        size = 0
        with tempfile.TemporaryFile() as prepared:
            for chunk in json.JSONEncoder(ensure_ascii=False, indent=2).iterencode(error_reporting.scrub(payload)):
                self.check()
                raw = chunk.encode('utf-8')
                size += len(raw)
                if self.used + size > limit:
                    self.entries.append({'name': name, 'status': 'size_limit'})
                    return False
                prepared.write(raw)
            prepared.seek(0)
            with self.archive.open(name, 'w', force_zip64=True) as target:
                while chunk := prepared.read(256 * 1024):
                    self.check()
                    target.write(chunk)
        self.used += size
        self.entries.append({'name': name, 'status': 'included', 'bytes': size})
        self.progress(**stage_fields('diagnostics.collectEvidence'), files=len(self.entries), content_bytes=self.used)
        return True

    def unavailable(self, section, error, **facts):
        self.check()
        self.entries.append({'name': section,
                             'status': 'file_limit' if isinstance(error, EvidenceTooLarge) else 'unavailable',
                             'reason': type(error).__name__, **facts})


def _snapshot_ref(path):
    return hashlib.sha256(str(path).encode('utf-8')).hexdigest()[:20]


def _ledger(config, codes, export):
    from .scripting import open_readonly
    path = config.directory('database') / 'ledger.db'
    marks = ','.join('?' for _ in codes)
    asset_ids = []
    snapshot_paths = set()
    with closing(open_readonly(path)) as connection:
        connection.execute('BEGIN')
        rows = connection.execute(
            'SELECT id,code,catalog_title,original_title,release_date,studio,series,creator,field_owners '
            f'FROM asset WHERE upper(code) IN ({marks}) ORDER BY id LIMIT ?', (*codes, ROW_LIMIT + 1)).fetchall()
        export.add('ledger/fields.json', {'truncated': len(rows) > ROW_LIMIT, 'records': [dict(row) for row in rows[:ROW_LIMIT]]})
        asset_ids = [row['id'] for row in rows[:ROW_LIMIT]]
        if not asset_ids:
            return asset_ids, snapshot_paths
        assets = ','.join('?' for _ in asset_ids)
        links = connection.execute(
            'SELECT ae.asset_id,ae.entity_id,ae.role,ae.source,ae.confidence,ae.metadata_json,'
            'ae.first_seen_at,ae.last_seen_at,e.kind,e.canonical_name FROM asset_entity ae '
            f'JOIN entity e ON e.id=ae.entity_id WHERE ae.asset_id IN ({assets}) '
            "AND ae.role IN ('performer','studio','series','tag') ORDER BY ae.asset_id,ae.role LIMIT ?",
            (*asset_ids, ROW_LIMIT + 1)).fetchall()
        records = []
        entity_ids = set()
        for row in links[:ROW_LIMIT]:
            record = dict(row)
            metadata = json.loads(record.pop('metadata_json') or '{}')
            if isinstance(metadata, dict):
                record['evidence'] = {key: metadata[key] for key in (
                    'provider', 'source', 'provider_id', 'content_id', 'review_item', 'candidate_key') if key in metadata}
                if metadata.get('raw_snapshot'):
                    snapshot_paths.add(str(metadata['raw_snapshot']))
                    record['evidence']['snapshot'] = _snapshot_ref(metadata['raw_snapshot'])
            records.append(record)
            entity_ids.add(row['entity_id'])
        export.add('ledger/entities.json', {'truncated': len(links) > ROW_LIMIT, 'records': records})
        if entity_ids:
            entities = ','.join('?' for _ in entity_ids)
            for name, query in (
                ('aliases', 'SELECT entity_id,alias,source,confidence FROM entity_alias'),
                ('external_refs', 'SELECT entity_id,provider,external_kind,external_id FROM entity_external_ref'),
            ):
                evidence = connection.execute(f'{query} WHERE entity_id IN ({entities}) LIMIT ?',
                                              (*sorted(entity_ids), ROW_LIMIT + 1)).fetchall()
                export.add(f'ledger/{name}.json', {'truncated': len(evidence) > ROW_LIMIT,
                                                  'records': [dict(row) for row in evidence[:ROW_LIMIT]]})
        # 字段决定的主键带字段名，按选中资产解析，不按文本子串匹配。
        decisions = connection.execute(
            "SELECT item_key,status,updated_at FROM review_decision WHERE category='metadata_fields' "
            f"AND CAST(substr(item_key,7,instr(substr(item_key,7),':')-1) AS INTEGER) IN ({assets}) "
            "AND item_key LIKE 'asset:%:%' LIMIT ?", (*asset_ids, ROW_LIMIT + 1)).fetchall()
        export.add('ledger/decisions.json', {'truncated': len(decisions) > ROW_LIMIT,
                                            'records': [dict(row) for row in decisions[:ROW_LIMIT]]})
    return asset_ids, snapshot_paths


def _candidates(config, codes, asset_ids, export):
    from .review_csv import ENCODING, candidate_files
    root = config.directory('generated')
    records, snapshots, seen = [], set(), set()
    asset_keys = {str(value) for value in asset_ids}
    scanned = 0
    for path in candidate_files('metadata_fields', root):
        if scanned >= 100_000 or len(records) > ROW_LIMIT:
            break
        try:
            if not _inside(path, root) or path.stat().st_size > EXPORT_LIMIT:
                export.entries.append({'name': 'candidates', 'status': 'file_limit'})
                continue
            with path.open(encoding=ENCODING, newline='') as stream:
                for row in csv.DictReader(stream):
                    scanned += 1
                    if scanned % 100 == 0:
                        export.check()
                        export.progress(**stage_fields('diagnostics.readCandidates'), rows=scanned, done=0, total=0)
                    if scanned > 100_000 or len(records) > ROW_LIMIT:
                        break
                    if row.get('code', '').upper() not in codes and row.get('asset_id') not in asset_keys:
                        continue
                    if row.get('item_key') in seen:
                        continue
                    seen.add(row.get('item_key'))
                    record = {key: row.get(key) for key in ('item_key', 'asset_id', 'code', 'field', 'current_value',
                                                           'status', 'fetched_at', 'policy_version')}
                    choices = json.loads(row.get('candidates_json') or '[]')
                    if not isinstance(choices, list):
                        raise ValueError('candidates_json is not an array')
                    record['candidates'] = [
                        {**{key: value for key, value in choice.items() if key in CANDIDATE_FIELDS},
                         **({'snapshot': _snapshot_ref(choice['raw_snapshot'])} if choice.get('raw_snapshot') else {})}
                        for choice in choices if isinstance(choice, dict)]
                    snapshots.update(str(choice['raw_snapshot']) for choice in choices
                                     if isinstance(choice, dict) and choice.get('raw_snapshot'))
                    records.append(record)
        except (OSError, ValueError, csv.Error) as error:
            export.unavailable('candidates', error)
    export.add('candidates.json', {'truncated': len(records) > ROW_LIMIT or scanned >= 100_000,
                                 'records': records[:ROW_LIMIT]})
    return snapshots


def _issues(config, asset_ids, export):
    root = config.directory('state')
    def recent():
        for path in root.glob('library-processing-*.issues.jsonl'):
            try:
                yield path.stat().st_mtime, path.name, path
            except OSError as error:
                export.unavailable('issues', error)
    paths = [path for _stamp, _name, path in heapq.nlargest(8, recent())]
    records = []
    truncated = False
    for path in paths:
        try:
            if not _inside(path, root):
                continue
            with path.open('rb') as stream:
                size = stream.seek(0, 2)
                stream.seek(max(0, size - FILE_LIMIT))
                text = stream.read(FILE_LIMIT).decode('utf-8', errors='replace')
            if size > FILE_LIMIT:
                truncated = True
                text = text.partition('\n')[2]
            for line in text.splitlines():
                try:
                    row = json.loads(line)
                except ValueError:
                    truncated = True
                    continue
                if not isinstance(row, dict) or row.get('asset_id') not in asset_ids:
                    continue
                record = {key: row[key] for key in ('asset_id', 'message', 'severity', 'failed_action',
                                                   'retryable', 'last_failed_at') if key in row}
                if isinstance(row.get('diagnostics'), dict):
                    record['diagnostics'] = error_reporting.scrub(row['diagnostics'])
                record['job_id'] = path.name[len('library-processing-'):-len('.issues.jsonl')]
                records.append(record)
                if len(records) > ROW_LIMIT:
                    break
        except OSError as error:
            export.unavailable('issues', error)
        if len(records) > ROW_LIMIT:
            break
    export.add('issues.json', {'truncated': truncated or len(records) > ROW_LIMIT, 'records': records[:ROW_LIMIT]})


def bundle_to(config, destination, *, codes: str = '', include_all: bool = False,
              progress=lambda **values: None, cancelled=lambda: False):
    """导出选定番号或近期作品的现存资料，不重新抓取或修改账本。"""
    selected = selected_codes(codes)
    root = config.directory('sources') / 'library-metadata'
    inventory_limit = ROW_LIMIT if include_all else SUMMARY_LIMIT
    recent = _recent_snapshots(root, inventory_limit + 1)
    inventory_truncated = len(recent) > inventory_limit
    recent = recent[:inventory_limit]
    if not selected:
        selected = list(dict.fromkeys(code for _, _, path in recent
                                      if (code := _snapshot_identity(path)[0])))[:ROW_LIMIT if include_all else CODE_LIMIT]
    with zipfile.ZipFile(destination, 'w', compression=zipfile.ZIP_DEFLATED) as archive:
        export = _Export(archive, progress, cancelled)
        if inventory_truncated:
            export.entries.append({'name': 'source_inventory', 'status': 'count_limit'})
        snapshots = set()
        if selected:
            try:
                asset_ids, snapshots = _ledger(config, selected, export)
            except (OSError, sqlite3.Error, ValueError) as error:
                export.unavailable('ledger', error)
                asset_ids = []
            _issues(config, asset_ids, export)
            try:
                snapshots.update(_candidates(config, selected, asset_ids, export))
            except OSError as error:
                export.unavailable('candidates', error)
            snapshots.update(str(path) for path in root.glob('*.json') if _snapshot_identity(path)[0] in selected)
        for index, value in enumerate(sorted(snapshots)):
            export.check()
            progress(**stage_fields('diagnostics.collectSnapshots'), done=index, total=len(snapshots))
            if index >= ROW_LIMIT:
                export.entries.append({'name': 'snapshots', 'status': 'count_limit'})
                break
            path = Path(value)
            try:
                if path.suffix.lower() == '.nfo':
                    if not _inside(path, root):
                        raise ValueError('local NFO evidence cannot be read')
                    if path.stat().st_size > FILE_LIMIT:
                        raise EvidenceTooLarge('local NFO evidence exceeds the per-file limit')
                    from .library_nfo import read_nfo
                    payload, _raw = read_nfo(path)
                    source = 'local_nfo'
                else:
                    payload = _read_json(path, root)
                    source = _snapshot_identity(path)[1]
                export.add(f'snapshots/{index}.json', {'source': source, 'snapshot': _snapshot_ref(value),
                    'requested_code': _snapshot_identity(path)[0],
                    'saved_at': datetime.fromtimestamp(path.stat().st_mtime, timezone.utc).isoformat(),
                    'fields': {key: value for key, value in payload.items() if key in SNAPSHOT_FIELDS}})
            except (OSError, ValueError, ET.ParseError) as error:
                export.unavailable(f'snapshots/{index}', error, snapshot=_snapshot_ref(value))
        export.add('manifest.json', {'schema': 1, 'kind': 'scraping-evidence',
            'created_at': datetime.now(timezone.utc).isoformat(), 'system': error_reporting.system_facts(),
            'codes': selected, 'selection': 'codes' if codes.strip() else 'available' if include_all else 'recent',
            'limits': {'codes': ROW_LIMIT if include_all else CODE_LIMIT, 'rows': ROW_LIMIT,
                       'file_bytes': FILE_LIMIT, 'content_bytes': EXPORT_LIMIT},
            'evidence_scope': ('Current source snapshots, field candidates and current credits; empty records mean '
                               'not found, and older snapshots may have been overwritten by later fetches'),
            'entries': list(export.entries)})
        export.check()
    progress(**stage_fields('diagnostics.scrapingDone'), done=len(snapshots), total=len(snapshots))


def bundle_bytes(config, *, codes: str = '', include_all: bool = False) -> bytes:
    output = io.BytesIO()
    bundle_to(config, output, codes=codes, include_all=include_all)
    return output.getvalue()
