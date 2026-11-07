"""按文件夹指定艺人：一个父目录下每个子文件夹是一位艺人，里面的视频都记到她名下。

用户已经按艺人分好文件夹（如 `D:\\Downloads\\欧美\\Kayden_Kross`），文件名却刮削不到时，
在「数据管理 → 按文件夹归艺人」里填父目录，勾选哪些子文件夹是艺人，一次写入。

写入是用户确认过的断言：`asset_tag` 的 `演员:<名字>` 与规范实体关系，来源都是 `SOURCE`，
可以按来源整批撤回（`undo`）。`asset.path` 保持 Windows 形态，只读不改。
"""
from __future__ import annotations

import re
from datetime import datetime, timezone

SOURCE = "user:folder-performer"
MAX_FOLDERS = 500

_PAREN = re.compile(r"\s*[(（\[【].*$")
_SEPARATORS = re.compile(r"[_.]+")
_SPACES = re.compile(r"\s+")
_LATIN_NAME = re.compile(r"[A-Za-z][A-Za-z'\-]*(?: [A-Za-z][A-Za-z'\-]*){1,3}")
_CJK_NAME = re.compile(r"[\u3040-\u30ff\u4e00-\u9fff・·]{2,12}")


def normalize_parent(parent: str) -> str:
    """把用户填的目录统一成账本里 Windows 路径的形态，不带结尾分隔符。"""
    value = str(parent or "").strip().strip('"').replace("/", "\\")
    value = value.rstrip("\\")
    if re.fullmatch(r"[A-Za-z]:", value):
        value += "\\"
    if not re.match(r"^(?:[A-Za-z]:\\|\\\\)", value):
        raise ValueError("请填 Windows 目录的完整路径，例如 D:\\Downloads\\欧美")
    return value.rstrip("\\") if len(value) > 3 else value


def suggested_name(folder: str) -> str:
    """文件夹名换成艺人名：下划线和点换成空格，去掉括号里的备注。"""
    name = _PAREN.sub("", folder)
    name = _SEPARATORS.sub(" ", name)
    return _SPACES.sub(" ", name).strip()


def looks_like_name(name: str) -> bool:
    """像人名的默认勾选：两到四个英文词，或两到十二个中日文字；带数字的合集、站名不勾。"""
    return bool(_LATIN_NAME.fullmatch(name) or _CJK_NAME.fullmatch(name))


def _prefix(parent: str) -> str:
    return parent if parent.endswith("\\") else parent + "\\"


def _videos(connection, prefix: str):
    """父目录下所有还在库里的视频：(id, 第一层子文件夹名)。直接放在父目录里的文件不算。"""
    rows = connection.execute(
        "SELECT id, path FROM asset WHERE medium='video' AND disposal IS NULL "
        "AND lower(substr(path, 1, ?)) = ?", (len(prefix), prefix.casefold())).fetchall()
    for asset_id, path in rows:
        rest = str(path)[len(prefix):]
        if "\\" in rest:
            yield int(asset_id), rest.split("\\", 1)[0]


def preview(database, parent: str) -> dict:
    """父目录下各子文件夹的视频数、建议的艺人名、是否默认勾选和已经归过的数量。"""
    parent = normalize_parent(parent)
    prefix = _prefix(parent)
    with database.read_connection() as connection:
        groups: dict[str, list[int]] = {}
        for asset_id, folder in _videos(connection, prefix):
            groups.setdefault(folder, []).append(asset_id)
        done = {row[0] for row in connection.execute(
            "SELECT DISTINCT asset_id FROM asset_tag WHERE source=?", (SOURCE,))}
    folders = []
    for folder in sorted(groups, key=str.casefold)[:MAX_FOLDERS]:
        name = suggested_name(folder)
        ids = groups[folder]
        folders.append({"folder": folder, "name": name, "videos": len(ids),
                        "assigned": sum(1 for asset_id in ids if asset_id in done),
                        "selected": looks_like_name(name)})
    return {"parent": parent, "folders": folders, "truncated": len(groups) > MAX_FOLDERS}


def apply(database, parent: str, choices: list[dict]) -> dict:
    """把勾选的子文件夹里的视频记到对应艺人名下；返回写了多少部、几位艺人。"""
    from .entities import upsert_asset_entity
    parent = normalize_parent(parent)
    prefix = _prefix(parent)
    names = {}
    for choice in choices or []:
        folder = str(choice.get("folder") or "")
        name = _SPACES.sub(" ", str(choice.get("name") or "")).strip()
        if folder and name and "\\" not in folder:
            if len(name) > 80:
                raise ValueError(f"艺人名太长：{name[:20]}…")
            names[folder.casefold()] = name
    if not names:
        raise ValueError("没有勾选任何文件夹")
    now = datetime.now(timezone.utc).isoformat()
    written: dict[str, int] = {}
    with database.write_transaction() as connection:
        for asset_id, folder in list(_videos(connection, prefix)):
            name = names.get(folder.casefold())
            if not name:
                continue
            connection.execute(
                "INSERT OR IGNORE INTO asset_tag(asset_id,tag,confidence,source) VALUES(?,?,?,?)",
                (asset_id, "演员:" + name, 1.0, SOURCE))
            upsert_asset_entity(connection, kind="performer", name=name, asset_id=asset_id,
                                role="performer", source=SOURCE, confidence=1.0, now=now)
            written[name] = written.get(name, 0) + 1
    return {"videos": sum(written.values()), "performers": len(written)}


def undo(database, parent: str) -> dict:
    """撤回这个父目录下按文件夹归过的艺人；其他来源的艺人不动。"""
    parent = normalize_parent(parent)
    prefix = _prefix(parent)
    with database.write_transaction() as connection:
        ids = [asset_id for asset_id, _ in _videos(connection, prefix)]
        removed = 0
        for start in range(0, len(ids), 500):
            batch = ids[start:start + 500]
            marks = ",".join("?" for _ in batch)
            removed += connection.execute(
                f"DELETE FROM asset_tag WHERE source=? AND asset_id IN ({marks})", (SOURCE, *batch)).rowcount
            connection.execute(
                f"DELETE FROM asset_entity WHERE source=? AND asset_id IN ({marks})", (SOURCE, *batch))
    return {"removed": removed}
