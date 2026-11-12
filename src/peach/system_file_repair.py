"""将旧扫描与推送发现登记的系统元数据放入可还原回收站。

文件名本身就是系统元数据的（macOS 的 `._` AppleDouble、`Thumbs.db`、`@SynoEAStream` 等）
不论被认成什么媒介、文件名里带没带番号都隔离：`._SSIS-950.mp4` 会被认成视频并按番号刮到资料，
但它只是 4 KB 左右的属性文件。只因所在目录（`@eaDir`、`#recycle` 等）判为系统元数据的，
仍只处理无番号的 `other` 行，目录里的视频、图片与音频不自动隔离。
"""
import json
from pathlib import PureWindowsPath

from .discovery_rules import system_file, system_path
from .personal_records import record_holders

#: 更早的回执：其中隔离过、后来被用户还原的同一资产与路径不再处理。
PRIOR_RULES = ('discovery-system-files-1', 'discovery-system-files-2')
RULE = 'discovery-system-files-3'


def _previously_isolated(connection) -> set[tuple[int, PureWindowsPath]]:
    """旧回执中隔离过的同一路径不再处理，保留用户后来的还原决定。"""
    found = set()
    for rule in PRIOR_RULES:
        receipts = connection.execute(
            'SELECT json_extract(result_json,?) FROM ledger_upgrade_repair '
            'WHERE json_type(result_json,?) IS NOT NULL', (f'$."{rule}"', f'$."{rule}"'))
        found |= {(row['id'], PureWindowsPath(row['path'])) for receipt in receipts
                  for row in json.loads(receipt[0])['isolated']}
    return found


def _eligible(row) -> bool:
    if system_file(PureWindowsPath(row['path']).name):
        return True
    return row['medium'] == 'other' and not row['code'] and system_path(row['path'])


def collect(connection) -> list[dict]:
    previous = _previously_isolated(connection)
    rows = [{key: row[key] for key in ('id', 'path', 'disposal', 'disposal_reason', 'feedback_at')}
            for row in connection.execute(
                "SELECT id,path,medium,code,disposal,disposal_reason,feedback_at FROM asset "
                "WHERE disposal IS NULL AND coalesce(feedback,'')<>'like'")
            if _eligible(row) and (row['id'], PureWindowsPath(row['path'])) not in previous]
    protected = record_holders(connection, [row['id'] for row in rows])
    return [row for row in rows if row['id'] not in protected and not connection.execute(
        "SELECT 1 FROM review_decision WHERE category='junk_file' AND item_key=? AND status='rejected'",
        (str(row['id']),)).fetchone()]


def apply(connection, rows, stamp: float) -> list[dict]:
    current = {row['id']: row for row in collect(connection)}
    changed = []
    for row in rows:
        if current.get(row['id']) != row:
            continue
        connection.execute(
            "UPDATE asset SET disposal='trash',disposal_reason='junk',feedback_at=? WHERE id=?",
            (stamp, row['id']))
        changed.append(row)
    return changed
