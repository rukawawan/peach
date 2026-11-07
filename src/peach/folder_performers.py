"""按文件夹归艺人：一个父目录下每个子文件夹是一位艺人，给它们一次设好「人物」目录规则。

用户已经按艺人分好文件夹（如 `D:\\Downloads\\欧美\\Kayden_Kross`），文件名却刮削不到时，
在「数据管理 → 按文件夹归艺人」里填父目录，勾选哪些子文件夹是艺人，一次写入。

写入复用目录用途（`folder_rules`）：每个勾选的子文件夹得到一条「人物」规则，包含子文件夹、
新文件沿用。现有视频立即关联到这位艺人，以后扫描进这个文件夹的新视频自动关联；已有不同
人物或逐件确认的视频保留原归属。撤回就是移除这些目录规则（`undo`）。`asset.path` 只读不改。
"""
from __future__ import annotations

import re

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


def preview(contract, parent: str) -> dict:
    """父目录下各子文件夹的视频数、建议的艺人名、是否默认勾选，以及已经设好的艺人。"""
    parent = normalize_parent(parent)
    prefix = _prefix(parent)
    with contract.read_connection() as connection:
        groups: dict[str, int] = {}
        for _, folder in _videos(connection, prefix):
            groups[folder] = groups.get(folder, 0) + 1
    assigned = assigned_names(contract, parent)
    folders = []
    for folder in sorted(groups, key=str.casefold)[:MAX_FOLDERS]:
        held = assigned.get(folder.casefold(), "")
        name = held or suggested_name(folder)
        folders.append({"folder": folder, "name": name, "videos": groups[folder], "assigned": held,
                        "selected": not held and looks_like_name(name)})
    return {"parent": parent, "folders": folders, "truncated": len(groups) > MAX_FOLDERS}


def _nodes(contract, parent: str) -> dict[str, dict]:
    """父目录下第一层子文件夹在目录索引里的节点，键是小写的文件夹名。"""
    from .web_folders import _index
    prefix = _prefix(parent).casefold()
    found = {}
    for node in _index(contract, {}).values():
        path = str(node["path"])
        rest = path[len(prefix):] if path.casefold().startswith(prefix) else ""
        if rest and "\\" not in rest:
            found[rest.casefold()] = node
    return found


def _rules(connection) -> dict[str, dict]:
    from . import folder_rules
    _, data = folder_rules.load(connection)
    return {rule["id"]: rule for rule in data["rules"]}


def assigned_names(contract, parent: str) -> dict[str, str]:
    """父目录下已经设成「人物」的子文件夹：小写文件夹名 → 艺人名。"""
    nodes = _nodes(contract, normalize_parent(parent))
    with contract.read_connection() as connection:
        rules = _rules(connection)
    return {key: rules[node["id"]]["name"] for key, node in nodes.items()
            if rules.get(node["id"], {}).get("purpose") == "performer"}


def _identity(connection, name: str, node: dict) -> tuple[str, str]:
    """把填的名字落到库里已有的那位艺人：(规范名, 没落上的原因)。

    大小写或写法不同（`Mia MalKova` 对 `Mia Malkova`）、名字是别名时取那唯一一位；同名的有
    好几位时，取这个文件夹里已经关联作品最多的那位，一部都没有就不猜，把候选列出来。
    """
    from .entities import normalize_entity_name
    from .media_folders import path_predicate
    key = normalize_entity_name(name)
    rows = connection.execute(
        "SELECT DISTINCT e.id, e.canonical_name FROM entity e LEFT JOIN entity_alias al ON al.entity_id=e.id "
        "WHERE e.kind='performer' AND (e.normalized_name=? OR al.normalized_alias=?) ORDER BY e.id",
        (key, key)).fetchall()
    if not rows:
        return name, ""
    if len(rows) == 1:
        return str(rows[0][1]), ""
    clause, values = path_predicate(node["location"], node["path"], True)
    counts = []
    for entity_id, canonical in rows:
        held = connection.execute(
            "SELECT count(DISTINCT a.id) FROM asset a JOIN asset_entity ae ON ae.asset_id=a.id "
            "WHERE ae.entity_id=? AND " + clause, (entity_id, *values)).fetchone()[0]
        counts.append((held, str(canonical)))
    counts.sort(reverse=True)
    if counts[0][0] and (len(counts) == 1 or counts[0][0] > counts[1][0]):
        return counts[0][1], ""
    return "", "有 " + str(len(rows)) + " 位同名艺人（" + "、".join(c for _, c in counts) + "），请改成其中一位的完整名字"


def apply(contract, parent: str, choices: list[dict]) -> dict:
    """勾选的子文件夹各设一条「人物」目录规则（含子文件夹、新文件沿用）；返回关联数与跳过的原因。"""
    from . import folder_rules
    parent = normalize_parent(parent)
    names = {}
    for choice in choices or []:
        folder = str(choice.get("folder") or "")
        name = _SPACES.sub(" ", str(choice.get("name") or "")).strip()
        if folder and name and "\\" not in folder:
            names[folder.casefold()] = (folder, name)
    if not names:
        raise ValueError("没有勾选任何文件夹")
    nodes = _nodes(contract, parent)
    linked, performers, skipped = 0, 0, []
    with contract.write_transaction() as connection:
        for key, (folder, name) in names.items():
            node = nodes.get(key)
            if node is None:
                skipped.append(f"{folder}：不在 Peach 的媒体目录里")
                continue
            settings, data = folder_rules.load(connection)
            name, reason = _identity(connection, name, node)
            if reason:
                skipped.append(f"{folder}：{reason}")
                continue
            try:
                rule = folder_rules.validate(connection, node, {
                    "purpose": "performer", "name": name, "recursive": True, "future": True})
            except ValueError as error:
                skipped.append(f"{folder}：{error}")
                continue
            preview = folder_rules.plan(connection, rule, data)
            linked += folder_rules.save(connection, settings, data, rule, preview, preview["plan_version"])
            performers += 1
    return {"videos": linked, "performers": performers, "skipped": skipped}


def undo(contract, parent: str) -> dict:
    """移除父目录下各子文件夹的「人物」目录规则，撤回它们写入的关联；其他来源不动。"""
    from . import folder_rules
    nodes = _nodes(contract, normalize_parent(parent))
    removed = 0
    with contract.write_transaction() as connection:
        for node in nodes.values():
            settings, data = folder_rules.load(connection)
            if any(rule["id"] == node["id"] and rule["purpose"] == "performer" for rule in data["rules"]):
                removed += folder_rules.remove(connection, settings, data, node["id"])
    return {"removed": removed}
