"""「设置 › 修复与迁移」：升级后的各项修复做了什么、改了多少、何时做的，以及等用户确认的项。

开销小、只改自动写入的值（用户手改的不动）的修复在升级后自动执行，这里只列结果；开销大或
可能改错的（例如逐部读取网盘视频）不自动做，在这里等用户确认后才执行。
数据只读本机升级回执（`upgrade-repairs/receipt.json`）与账本的 `ledger_upgrade_repair`；
关注快照清理的估算与进度由 `follow_evidence.Reclaim` 在后台算好交进来。

只列这台机器真碰到的项：馆藏里没有网盘视频、没有 NAS 系统目录、没有乱码人物的，对应那项不出现；
历史里没改动的那几次也不列。平台、媒体来源与馆藏的差别都落在这些读数上，不另按系统判断。
"""
from __future__ import annotations

import json
from pathlib import Path

from . import follow_evidence, system_file_repair
from .media_sources import CLOUD_LOCATIONS

#: 列给用户看的修复：标题、一句做了什么、是否自动执行。顺序就是页面顺序。
ITEMS = (
    ('catalog', '资料与番号整理', '按新规则修正番号、标题等自动写入的资料，你手动改过的不动', 'auto'),
    ('display-local', '本地视频显示尺寸', '重新读取本机与局域网视频的文件头，修正横竖屏判断', 'auto'),
    ('display-cloud', '网盘视频显示尺寸', '要逐部读取网盘里的视频，网盘缓存和流量会增加，确认后才开始', 'confirm'),
    ('system-files', '系统附属文件', 'NAS 系统目录里的缩略图、macOS 的 ._ 附属文件等移出馆藏，文件本身不删', 'auto'),
    ('garbled-people', '乱码人物', '解除早期采集乱码留下的人物关联，重新补采演员', 'auto'),
    ('dangling-candidates', '失效的复核候选', '资产删除后留下的候选改挂到同一文件的新编号，对不上的撤下', 'auto'),
    ('javdb-entries', '人物页的 JavDB 入口', '和作品署名同为有码或同为无码的同名演员页不再给入口，订着它的订阅停用', 'auto'),
    ('follow-evidence', '关注抓取的旧快照', '每个关注来源只留最近 3 份原始快照和条目引用的那几份，其余删除，删除后不能恢复', 'confirm'),
)
#: 历史里的规则：账本行 id 的前缀、名字、计哪个字段（`None` 为资料整理的改动合计）。
RULES = (
    ('catalog-', '资料与番号整理', None), ('verification-settlement-', '核查差异结算', ('applied',)),
    ('studio-unbounded-misses-', '厂牌查询缓存', ('released',)), ('stale-filename-codes-', '清除误认的番号', ('cleared',)),
    ('dangling-candidates-', '失效的复核候选', ('repinned', 'withdrawn')),
    ('javdb-actor-records-', '人物页的 JavDB 入口', ('hidden', 'disabled_feeds')),
    (follow_evidence.RECEIPT_PREFIX, '清理关注抓取的旧快照', ('files',)),
)
#: 资料整理回执里不算「改动」的计数：重新探测、转人工与来源快照失效只是排队或让缓存重取，不是改了资料。
_NOT_CHANGES = ('probe_retry', 'text_review', 'text_snapshots_invalidated')


def _count(value) -> int:
    if isinstance(value, bool):
        return int(value)
    if isinstance(value, (int, float)):
        return int(value)
    if isinstance(value, (list, tuple)):
        return len(value)
    if isinstance(value, dict):
        return sum(_count(item) for item in value.values() if not isinstance(item, (str, type(None))))
    return 0


def _latest(rows, key):
    for _, _, result in rows:
        if key in result:
            return result[key]
    return None


def _touched(fact: dict) -> bool:
    """这台机器上这一项有没有事：在跑、等确认、失败，或者确实改了、补测了东西。"""
    if fact['state'] in ('running', 'waiting', 'failed', 'pending'):
        return True
    return bool(fact.get('changed') or fact.get('total') or fact.get('included'))


def _backups(value, directories) -> list[dict]:
    """回执里记下的写入前备份（`backup` 字段，可能嵌在各项补修里），以及它还在不在。

    这些备份和「账本备份」是同一批文件、同一套保留规则：还在的能从那里恢复，
    清退了的照实写已清理，撤回只能靠逐行回执。"""
    found = []
    if isinstance(value, dict):
        for key, item in value.items():
            if key == 'backup' and isinstance(item, str) and item:
                name = Path(item).name
                found.append({'name': name, 'exists': any((folder / name).is_file() for folder in directories)})
            else:
                found += _backups(item, directories)
    return found


def _history(rows, backup_directories) -> list[dict]:
    """历史记录：认得的规则里确实改了东西的那几次，连同修复前的备份还在不在。"""
    history = []
    for row_id, applied_at, result in rows:
        rule = next((rule for rule in RULES if row_id.startswith(rule[0])), None)
        if rule is None:
            continue
        if rule[2] is None:
            changed = _count({key: value for key, value in result.get('local', {}).get('changed', {}).items()
                              if key not in _NOT_CHANGES})
        else:
            changed = sum(_count(result.get(key)) for key in rule[2])
        if not changed:
            continue
        backups = list({row['name']: row for row in _backups(result, backup_directories)}.values())
        history.append({'id': row_id, 'title': rule[1], 'at': applied_at, 'changed': changed, 'backups': backups})
    return history


def _follow_evidence(status: dict | None, rows) -> dict:
    """关注快照清理：在删就报进度，估算出有可删的就等确认，删过且没剩下的报上一次删了多少。"""
    status = status or {}
    phase = status.get('phase')
    if phase == 'running':
        return {'state': 'running', 'done': status.get('done', 0), 'total': status.get('total', 0)}
    if phase == 'failed':
        return {'state': 'failed', 'error': status.get('error', '')}
    if phase == 'estimating':
        return {'state': 'waiting', 'estimating': True}
    if phase == 'ready' and status.get('files'):
        return {'state': 'waiting', 'files': status['files'], 'bytes': status.get('bytes', 0)}
    last = next((result for row_id, _, result in rows if row_id.startswith(follow_evidence.RECEIPT_PREFIX)), None)
    return {'state': 'done', 'changed': _count(last.get('files'))} if last else {'state': 'none'}


def _display_progress(connection) -> dict[bool, tuple[int, int]]:
    """显示尺寸补测按来源拆开的进度：`{是否网盘: (完成几部, 一共几部)}`。

    补测名单与完成状态都在 `ledger_upgrade_item`（迁移 0053），网盘补测确认后网盘视频并进同一条规则，
    表里不记哪部来自网盘，所以按资产现在的 `location` 分：本地那项只数本机与局域网，网盘那项只数网盘。
    资产已删除的按本地算。没有状态表的旧账本（读取端尚未同步迁移）按都没有算。"""
    import sqlite3
    from .display_dimensions_repair import ITEM_RULE
    cloud = f"a.location IN ({','.join('?' * len(CLOUD_LOCATIONS))})" if CLOUD_LOCATIONS else '0'
    split = {False: (0, 0), True: (0, 0)}
    try:
        rows = connection.execute(
            f"SELECT coalesce({cloud}, 0), count(*), coalesce(sum(i.state='done'), 0) FROM ledger_upgrade_item i"
            " LEFT JOIN asset a ON a.id=i.asset_id WHERE i.rule=? GROUP BY 1", (*CLOUD_LOCATIONS, ITEM_RULE)).fetchall()
    except sqlite3.OperationalError:
        return split
    for is_cloud, total, done in rows:
        split[bool(is_cloud)] = (int(done), int(total))
    return split


def _display_cloud(pending: int, included: bool, done: int, total: int) -> dict:
    """网盘补测：确认前等确认，不画进度；确认后报这一批做到哪里。

    待补测数连同名单里还没测的网盘片：早期版本准备名单时没排除网盘，那批片子在名单里却没有确认记录，
    在用户看来同样还没开始。"""
    if not included:
        waiting = pending + total - done
        return {'state': 'waiting' if waiting else 'none', 'pending': waiting, 'included': False}
    return {'state': 'done' if done >= total else 'running', 'pending': 0, 'included': True,
            **({'done': done, 'total': total} if total else {})}


def snapshot(connection, receipt: dict, *, cloud_pending: int, backup_directories=(),
             follow_evidence_status: dict | None = None) -> dict:
    rows = sorted(((row[0], float(row[1] or 0), json.loads(row[2] or '{}')) for row in connection.execute(
        'SELECT id, applied_at, result_json FROM ledger_upgrade_repair')), key=lambda row: row[1], reverse=True)
    local = receipt.get('local', {})
    display = receipt.get('display_dimensions_v2', {})
    progress = _display_progress(connection)
    done, total = progress[False]
    cloud_done, cloud_total = progress[True]
    included = bool(display.get('cloud_included_at'))
    isolated = _latest(rows, system_file_repair.RULE) or {}
    garbled = _latest(rows, 'garbled_people') or {}
    dangling = next((result for row_id, _, result in rows if row_id.startswith('dangling-candidates-')), {})
    javdb_entries = next((result for row_id, _, result in rows if row_id.startswith('javdb-actor-records-')), {})
    facts = {
        'catalog': {'state': local.get('state') or ('done' if local else 'none'),
                    'changed': _count({key: value for key, value in local.get('changed', {}).items()
                                       if key not in _NOT_CHANGES})},
        'display-local': {'state': 'none' if not total else 'done' if done >= total else 'running',
                          'done': done, 'total': total},
        'display-cloud': _display_cloud(cloud_pending, included, cloud_done, cloud_total),
        'system-files': {'state': 'done' if isolated else 'none', 'changed': _count(isolated.get('isolated'))},
        'garbled-people': {'state': 'done' if garbled else 'none', 'changed': _count(garbled.get('links'))},
        'dangling-candidates': {'state': 'done' if dangling else 'none',
                                'changed': _count(dangling.get('repinned')) + _count(dangling.get('withdrawn'))},
        'javdb-entries': {'state': 'done' if javdb_entries else 'none',
                          'changed': _count(javdb_entries.get('hidden')) + _count(javdb_entries.get('disabled_feeds'))},
        'follow-evidence': _follow_evidence(follow_evidence_status, rows),
    }
    items = [{'id': key, 'title': title, 'summary': summary, 'mode': mode, **facts[key]}
             for key, title, summary, mode in ITEMS if _touched(facts[key])]
    return {'items': items, 'history': _history(rows, backup_directories)}
