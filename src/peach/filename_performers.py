"""按文件名认艺人：`艺人名 - 片名.mp4` 这类文件名开头写着的艺人，库里已经有这位就关联上。

欧美片常这样命名（`Tru Kait - Milf Blonde and ….mp4`、`Riley Reid, Lana Rhoades - ….mp4`），
没有番号，刮削也不一定对得上。只认库里**已有**的艺人（规范名或别名，大小写与写法不计），
同名的有好几位就不认；文件名开头没有「 - 」分隔、或像番号的都不碰。已有演员关联的视频不动。

关联来源记为 `SOURCE`，可整批撤回（`undo`）。扫描登记新文件时自动跑（`scan` 调 `link_new`），
数据管理「按文件夹归艺人」页可对全库补一遍（`link_all`）。
"""
from __future__ import annotations

import re
import sqlite3
from datetime import datetime, timezone
from pathlib import PureWindowsPath

SOURCE = "filename-performer"

_SEPARATOR = re.compile(r"\s+[-–—]\s+")
_SITE_PREFIX = re.compile(r"^\s*[\[【(（][^\]】)）]{1,40}[\]】)）]\s*")
_NAME_SPLIT = re.compile(r"\s*(?:,|，|、|&|＆|\band\b|\bx\b|\bfeat\.?)\s*", re.IGNORECASE)
_DIGITS = re.compile(r"\d")


def names_in(file_name: str) -> list[str]:
    """文件名开头「 - 」之前写的艺人名；没有这个分隔、或开头像番号或日期时返回空。"""
    from .catalog_rules import is_jav_code
    stem = PureWindowsPath(str(file_name or "")).stem
    stem = _SITE_PREFIX.sub("", stem)
    parts = _SEPARATOR.split(stem, maxsplit=1)
    if len(parts) < 2:
        return []
    head = parts[0].strip()
    if not head or is_jav_code(head) or _DIGITS.search(head) or len(head) > 80:
        return []
    names = [name.strip(" ._") for name in _NAME_SPLIT.split(head)]
    return [name for name in names if 2 <= len(name) <= 40]


def _performer(connection, name: str) -> tuple[int, str] | None:
    """库里唯一一位叫这个名字（规范名或别名）的艺人；没有或有好几位返回 None。"""
    from .entities import normalize_entity_name
    key = normalize_entity_name(name)
    if not key:
        return None
    rows = connection.execute(
        "SELECT DISTINCT e.id, e.canonical_name FROM entity e LEFT JOIN entity_alias al ON al.entity_id=e.id "
        "WHERE e.kind='performer' AND (e.normalized_name=? OR al.normalized_alias=?)", (key, key)).fetchall()
    return (int(rows[0][0]), str(rows[0][1])) if len(rows) == 1 else None


def _unattributed(connection, asset_ids=None):
    """还没有任何演员关联、仍在库里的视频：(id, 文件名)。"""
    query = ("SELECT a.id, a.name FROM asset a WHERE a.medium='video' AND a.disposal IS NULL "
             "AND NOT EXISTS (SELECT 1 FROM asset_entity ae JOIN entity e ON e.id=ae.entity_id "
             "WHERE ae.asset_id=a.id AND e.kind='performer')")
    if asset_ids is None:
        return connection.execute(query).fetchall()
    ids = list(asset_ids)
    rows = []
    for start in range(0, len(ids), 500):
        batch = ids[start:start + 500]
        marks = ",".join("?" for _ in batch)
        rows += connection.execute(query + f" AND a.id IN ({marks})", batch).fetchall()
    return rows


def matches(connection, asset_ids=None) -> list[dict]:
    """能认出艺人的视频与认出的名字，供预览和写入共用。"""
    found = []
    cache: dict[str, tuple[int, str] | None] = {}
    for asset_id, name in _unattributed(connection, asset_ids):
        performers = []
        for written in names_in(str(name or "")):
            if written.casefold() not in cache:
                cache[written.casefold()] = _performer(connection, written)
            hit = cache[written.casefold()]
            if hit and hit not in performers:
                performers.append(hit)
        if performers:
            found.append({"id": int(asset_id), "name": str(name or ""), "performers": performers})
    return found


def _write(connection, found: list[dict]) -> int:
    from .entities import upsert_asset_entity
    now = datetime.now(timezone.utc).isoformat()
    for item in found:
        for _, canonical in item["performers"]:
            connection.execute(
                "INSERT OR IGNORE INTO asset_tag(asset_id,tag,confidence,source) VALUES(?,?,?,?)",
                (item["id"], "演员:" + canonical, 0.95, SOURCE))
            upsert_asset_entity(connection, kind="performer", name=canonical, asset_id=item["id"],
                                role="performer", source=SOURCE, confidence=0.95, now=now)
    return len(found)


def link_new(connection, asset_ids) -> int:
    """扫描刚登记的视频里，文件名写着库里已有艺人的关联上；返回关联了几部。"""
    if not asset_ids:
        return 0
    try:
        return _write(connection, matches(connection, asset_ids))
    except sqlite3.OperationalError:
        # 旧库还没有实体表时不阻塞扫描。
        return 0


def preview(contract) -> dict:
    """全库还没归属的视频里，按文件名能认出艺人的有几部，附前 50 条样例。"""
    with contract.read_connection() as connection:
        found = matches(connection)
    sample = [{"name": item["name"], "performers": [name for _, name in item["performers"]]}
              for item in found[:50]]
    return {"count": len(found), "sample": sample}


def link_all(contract) -> dict:
    with contract.write_transaction() as connection:
        linked = _write(connection, matches(connection))
    return {"linked": linked}


def undo(contract) -> dict:
    """撤回按文件名认上的全部艺人关联；其他来源不动。"""
    with contract.write_transaction() as connection:
        removed = connection.execute("DELETE FROM asset_entity WHERE source=?", (SOURCE,)).rowcount
        connection.execute("DELETE FROM asset_tag WHERE source=?", (SOURCE,))
    return {"removed": removed}
