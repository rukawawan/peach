"""按模板整理文件名与目录：生成计划、执行、回滚（ADR-0039）。

三件事在一个模块里，因为它们共用同一份判据：什么算「会变的一行」、目标路径怎么算出来、
哪些行必须跳过。散开写的下场是预览说会改、执行时又按另一套规则跳过，而用户手上那份
CSV 于是变成一份不准的清单。

顺序是固定的，和 `scripts/flatten_release_dirs.py` 一致：先备份 SQLite，再动文件，最后
改账本；账本写失败就把文件名改回去。反过来先改账本会留下一批指向不存在路径的行。

路径一律按账本口径（Windows 形态）计算，真正动盘时才由 `platform.translate_ledger_path`
翻译成本机路径。macOS 上因此也能生成和 Windows 完全一样的计划。
"""
from __future__ import annotations

import json
import ntpath
import os
import sqlite3
import time
from collections.abc import Callable, Iterable, Sequence
from contextlib import contextmanager
from pathlib import Path, PureWindowsPath

from .catalog_rules import is_jav_code, is_uncensored_release, normalise_code_key, part_marker
from .jobs import ACTIVE_ASSET_SQL
from .task_retry import transient_delay
from .organize_templates import MAX_PATH, TemplateError, clean_filename, render, validate_template
from .platform import (is_windows_path, location_mounts, location_roots, resolve_root, root_online,
                       translate_ledger_path, within_root)
from .review_csv import write_rows
from .fsutil import atomic_write_text

#: 计划 CSV 的列。`reason` 只在 `action=skip` 时有值。
PLAN_FIELDS = ["asset_id", "location", "current_path", "target_path", "action", "reason"]

#: 文件名与目录组合，以及使用示例字段时的完整路径。
PRESETS: tuple[dict[str, str], ...] = (
    {"label": "仅番号", "file": "{code}", "dir": "", "example": "ABC-123.mp4"},
    {"label": "番号和标题", "file": "{code}[ {title}]", "dir": "", "example": "ABC-123 标题.mp4"},
    {"label": "番号和画质", "file": "{code}[ {definition}]", "dir": "", "example": "ABC-123 1080p.mp4"},
    {"label": "番号和出演者", "file": "{code}[ {actors}]", "dir": "", "example": "ABC-123 甲、乙.mp4"},
    {"label": "按厂牌建文件夹", "file": "{code}[ {title}]", "dir": "{studio}", "example": "厂牌/ABC-123 标题.mp4"},
    {"label": "按系列建文件夹", "file": "{code}[ {title}]", "dir": "{series}", "example": "系列/ABC-123 标题.mp4"},
    {"label": "按出演者建文件夹", "file": "{code}[ {title}]", "dir": "{actors}", "example": "甲、乙/ABC-123 标题.mp4"},
    {"label": "按发行年建文件夹", "file": "{code}[ {title}]", "dir": "{year}", "example": "2024/ABC-123 标题.mp4"},
    {"label": "厂牌下按番号建文件夹", "file": "{code}[ {title}][ CD{cd}]", "dir": "{studio}/{code}", "example": "厂牌/ABC-123/ABC-123 标题 CD2.mp4"},
)

#: 跳过原因的固定写法。界面按这几个键分组计数，所以它们是契约的一部分。
SKIP_OFFLINE = "来源未挂载"
SKIP_MISSING_FIELD = "字段缺失"
SKIP_OUTSIDE_ROOT = "不在来源根内"
SKIP_TARGET_EXISTS = "目标已存在"
SKIP_CROSS_VOLUME = "跨盘"
SKIP_TOO_LONG = "路径过长"


#: 挂载上的 `os.rename` 证明不了云端真的改了名的来源：PikPak 挂载对大文件常报 WinError 50，
#: 回报成功时官方目录也可能没变。这些来源的改名只交给显式注入的官方核验实现。
VERIFIED_RENAME_LOCATIONS = frozenset({"pikpak"})
_verified_renames: dict[str, Callable[[str, str], None]] = {}


class OrganizeError(ValueError):
    """整理本身拒绝执行。消息直接给用户看；接口按参数错误回 400。"""


class UnverifiedRename(OSError):
    """来源的改名须经官方核验，而当前进程没有注入核验通道。"""


@contextmanager
def verified_renames(location: str, rename: Callable[[str, str], None]):
    """在这段上下文里，`location` 的改名交给 `rename`（它自己确认云端结果）。"""
    if location in _verified_renames:
        raise RuntimeError(f"来源 {location} 已注入核验改名")
    _verified_renames[location] = rename
    try:
        yield
    finally:
        _verified_renames.pop(location, None)


def _location_of(raw: str) -> str | None:
    """账本路径或本机挂载路径属于哪个来源。"""
    location, _index, _tail = resolve_root(raw, location_roots())
    if location is None and not is_windows_path(raw):
        local = Path(raw)
        for name, mounts in location_mounts().items():
            if any(within_root(local, mount) for mount in mounts):
                return name
    return location


def unverified_location(location: str | None) -> bool:
    """这个来源的改名须经官方核验，而当前进程没有注入。"""
    return location in VERIFIED_RENAME_LOCATIONS and location not in _verified_renames


def refuse_unverified(paths: Iterable[str]) -> None:
    """整批动盘之前的门槛：涉及须核验来源而没有核验通道时整批拒绝，一个文件都不动。"""
    locations = [_location_of(str(path)) for path in paths]
    blocked = sorted({location for location in locations
                      if unverified_location(location)})
    if blocked:
        raise OrganizeError(f"来源 {'、'.join(blocked)} 的挂载改名无法核验云端结果，整批未执行；"
                            "须经官方核验通道（如 organize_library_dirs.py --pikpak-webdav）")


def _definition(width, height) -> str:
    """按高度给一档画质。取不到尺寸就留空，让可选分组整段省略。"""
    try:
        lines = int(height or 0)
        columns = int(width or 0)
    except (TypeError, ValueError):
        return ""
    if columns and lines and columns < lines:
        # 竖屏素材按短边算，不然一条 1080×1920 会被报成 1920p。
        lines = columns
    for floor, label in ((2160, "4K"), (1440, "1440p"), (1080, "1080p"),
                         (720, "720p"), (480, "480p")):
        if lines >= floor:
            return label
    return ""


def placeholder_values(row, performers: Sequence[str] = ()) -> dict[str, str]:
    """一行资产的占位符取值，全部来自 approved 真相字段。

    候选表一个都不查：整理会改文件系统，而文件系统上没有地方记「这个名字是猜的」。
    """
    code = str(row["code"] or "")
    name = str(row["name"] or "")
    title = str(row["catalog_title"] or "") or str(row["original_title"] or "")
    release_date = str(row["release_date"] or "")
    marker = part_marker(name)
    return {
        "code": normalise_code_key(code) if is_jav_code(code) else code.strip(),
        "title": title.strip(),
        "studio": str(row["studio"] or "").strip(),
        "series": str(row["series"] or "").strip(),
        "year": release_date[:4] if len(release_date) >= 4 else "",
        # 四个以上就不再往文件名里塞：名字会长到在资源管理器里看不见番号。
        "actors": "、".join(list(performers)[:4]),
        "cd": marker.upper() if marker else "",
        # 有码不是本机可核验的事实，所以只在有无码证据时给值；`[{mosaic}]` 于是
        # 在普通片上整段消失，而不是写上一个猜出来的「有码」。
        "mosaic": "无码" if is_uncensored_release(name, code) else "",
        "definition": _definition(row["width"], row["height"]),
    }


def _performers(connection: sqlite3.Connection, location: str) -> dict[int, list[str]]:
    """资产 → 出演者规范名。`entity` 是规范身份，扁平字段只是兼容投影（ADR-0005）。"""
    found: dict[int, list[str]] = {}
    for asset_id, name in connection.execute(
        "SELECT ae.asset_id,e.canonical_name FROM asset_entity ae "
        "JOIN entity e ON e.id=ae.entity_id JOIN asset a ON a.id=ae.asset_id "
        "WHERE e.kind='performer' AND a.location=? ORDER BY e.canonical_name",
        (location,),
    ):
        found.setdefault(int(asset_id), []).append(str(name))
    return found


def _rows(connection: sqlite3.Connection, location: str,
          asset_ids: Sequence[int] | None = None) -> list[sqlite3.Row]:
    """这个来源上会被整理的行：只有视频，且不在回收站里。

    只取视频不是图省事。模板说的是「一部片叫什么」，
    它回答不了一张封面该叫什么。
    """
    connection.row_factory = sqlite3.Row
    ids = list(dict.fromkeys(int(value) for value in (asset_ids or ())))
    selected = f" AND id IN ({','.join('?' * len(ids))})" if asset_ids is not None else ""
    if asset_ids is not None and not ids:
        return []
    return connection.execute(
        "SELECT id,location,path,name,code,catalog_title,original_title,studio,series,"
        f"release_date,width,height FROM asset WHERE location=? AND {ACTIVE_ASSET_SQL} "
        f"AND medium='video' AND path IS NOT NULL AND trim(path)<>''{selected} ORDER BY id",
        (location, *ids),
    ).fetchall()


def _extension(name: str) -> str:
    stem, dot, ext = str(name).rpartition(".")
    return f".{ext}" if dot and stem else ""


def scope_path(location: str, path: str = '', roots=None) -> str:
    """将指定目录核对并转换为账本路径；空值表示整个来源。"""
    if not isinstance(path, str):
        raise OrganizeError('整理路径必须是目录路径')
    text = path.strip()
    if not text:
        return ''
    if '..' in PureWindowsPath(text).parts or '\x00' in text:
        raise OrganizeError('整理路径不能包含上级目录跳转或空字符')
    declared = location_roots() if roots is None else roots
    if resolve_root(text, declared)[0] != location:
        local = Path(text)
        if local.is_absolute():
            for index, mount in enumerate(location_mounts().get(location, ())):
                if within_root(local, mount) and index < len(declared.get(location, ())):
                    tail = local.resolve().relative_to(mount.resolve())
                    text = str(PureWindowsPath(declared[location][index], *tail.parts))
                    break
    candidate = PureWindowsPath(text)
    if not candidate.is_absolute() or '..' in candidate.parts:
        raise OrganizeError('整理路径须为所选来源内的绝对目录路径，不能包含上级目录跳转')
    canonical = ntpath.normpath(text)
    if resolve_root(canonical, declared)[0] != location:
        raise OrganizeError('整理路径不在所选来源内')
    return canonical


def build_plan(connection: sqlite3.Connection, *, location: str,
               file_template: str = "", dir_template: str = "",
               roots=None, online: bool | None = None,
               asset_ids: Sequence[int] | None = None, path: str = '') -> dict:
    """按目录范围与可选模板生成逐文件整理计划。

    返回 `{"rows": [...], "counts": {...}}`：`rows` 只含会变的行与被跳过的行，
    已经就是目标名字的行只进 `counts["unchanged"]`——几万行原样列出来，用户要找的
    那几百行反而看不见了。

    存在性只用挂载判定（`root_online`），不逐行 `stat`：115 与 PikPak 的挂载上那是
    一次网络往返。撞名在执行那一步 `rename` 之前当场判（ADR-0039）。
    """
    file_template = validate_template(file_template)
    dir_template = validate_template(dir_template, directory=True)
    declared = dict(location_roots() if roots is None else roots)
    selected_path = scope_path(location, path, declared)
    rows = _rows(connection, location, asset_ids)
    if selected_path:
        selected = PureWindowsPath(selected_path)
        rows = [row for row in rows if PureWindowsPath(row['path']).is_relative_to(selected)]
    counts: dict[str, int] = {"total": len(rows), "unchanged": 0, "change": 0, "skip": 0}
    reasons: dict[str, int] = {}
    plan: list[dict] = []

    def skip(row, reason: str, target: str = "") -> None:
        counts["skip"] += 1
        reasons[reason] = reasons.get(reason, 0) + 1
        plan.append({"asset_id": row["id"], "location": location,
                     "current_path": str(row["path"]), "target_path": target,
                     "action": "skip", "reason": reason})

    root_states = None
    if online is None:
        root_states = [root_online(_media_path(root)) for root in declared.get(location, ())]
        online = any(root_states)
    if not online:
        for row in rows:
            skip(row, SKIP_OFFLINE)
        return {"rows": plan, "counts": counts, "reasons": reasons}

    performers = _performers(connection, location)
    # 目标撞名先按账本已知的路径判一遍：同一批里两行算出同一个名字，或者目标位置上
    # 已经躺着另一条记录，都在预览里就说清楚，而不是等执行到一半才报一行失败。
    claimed = {str(path).casefold(): int(aid) for aid, path in connection.execute(
        'SELECT id,path FROM asset WHERE location=? AND path IS NOT NULL', (location,))}

    for row in rows:
        path = str(row["path"])
        matched, index, _tail = resolve_root(path, declared)
        if matched != location or index < 0:
            skip(row, SKIP_OUTSIDE_ROOT)
            continue
        root = declared[location][index]
        if root_states is not None and not root_states[index]:
            skip(row, SKIP_OFFLINE)
            continue
        values = placeholder_values(row, performers.get(int(row["id"]), []))
        current_dir = ntpath.dirname(path)
        target_dir = current_dir
        missing: set[str] = set()
        if dir_template:
            rendered, absent = render(dir_template, values, directory=True)
            missing |= absent
            if not rendered:
                skip(row, SKIP_MISSING_FIELD)
                continue
            target_dir = ntpath.join(selected_path or root, *rendered.split("/"))
        name = str(row["name"] or ntpath.basename(path))
        target_name = clean_filename(name)
        if file_template:
            rendered, absent = render(file_template, values)
            missing |= absent
            if not rendered:
                skip(row, SKIP_MISSING_FIELD)
                continue
            target_name = rendered + _extension(name)
        if missing:
            skip(row, SKIP_MISSING_FIELD)
            continue
        target = ntpath.join(target_dir, target_name)
        if target == path:
            counts["unchanged"] += 1
            continue
        if ntpath.splitdrive(target)[0].casefold() != ntpath.splitdrive(path)[0].casefold():
            skip(row, SKIP_CROSS_VOLUME, target)
            continue
        if len(target) > MAX_PATH:
            skip(row, SKIP_TOO_LONG, target)
            continue
        occupant = claimed.get(target.casefold())
        if occupant is not None and occupant != int(row["id"]):
            skip(row, SKIP_TARGET_EXISTS, target)
            continue
        claimed.pop(path.casefold(), None)
        claimed[target.casefold()] = int(row["id"])
        counts["change"] += 1
        plan.append({
            "asset_id": row["id"], "location": location, "current_path": path,
            "target_path": target,
            "action": "rename" if target_dir == current_dir else "move", "reason": "",
        })
    return {"rows": plan, "counts": counts, "reasons": reasons}


def write_plan(path: Path | str, rows: Sequence[dict]) -> Path:
    write_rows(path, PLAN_FIELDS, rows, atomic=True)
    return Path(path)


def plan_path(root: Path | str, location: str) -> Path:
    return Path(root) / f"organize-plan-{location}.csv"


def batch_log_dir(root: Path | str) -> Path:
    return Path(root) / "organize-batches"


def latest_batch(root: Path | str) -> Path | None:
    """最近一个批次日志；一次都没执行过返回 None。"""
    logs = sorted(batch_log_dir(root).glob("organize-*.json"))
    return logs[-1] if logs else None


def _media_path(raw):
    from .smb_media import resolve
    return resolve(raw) or translate_ledger_path(raw)


def _rename(source: str, target: str) -> None:
    """按账本路径改名，真正动盘时翻译成本机路径。

    须核验来源（`VERIFIED_RENAME_LOCATIONS`）交给注入的官方改名；没有注入时拒绝。
    """
    location = _location_of(str(source))
    if location in VERIFIED_RENAME_LOCATIONS:
        verified = _verified_renames.get(location)
        if verified is None:
            raise UnverifiedRename(f"来源 {location} 的挂载改名无法核验云端结果，须经官方核验通道")
        verified(str(source), str(target))
        return
    from .smb_media import resolve
    remote_source, remote_target = resolve(source), resolve(target)
    if remote_source is not None or remote_target is not None:
        if remote_source is None or remote_target is None:
            raise OSError('SMB 整理仅支持同一媒体根目录')
        remote_target.parent.mkdir(parents=True, exist_ok=True)
        remote_source.rename(remote_target)
        return
    local_source = translate_ledger_path(source)
    local_target = translate_ledger_path(target)
    local_target.parent.mkdir(parents=True, exist_ok=True)
    os.rename(local_source, local_target)


def _update_row(connection: sqlite3.Connection, asset_id: int,
                old_path: str, new_path: str) -> int:
    return connection.execute(
        "UPDATE asset SET path=?,name=? WHERE id=? AND path=?",
        (new_path, ntpath.basename(new_path), int(asset_id), old_path),
    ).rowcount


class MoveFailure(str):
    """保留原有原因字符串，并把可自动恢复的移动失败带回批次结果。"""

    def __new__(cls, reason: str, *, retry_after: float | None):
        value = super().__new__(cls, reason)
        value.retryable = retry_after is not None
        value.retry_after = retry_after
        return value


def _move_one(connection: sqlite3.Connection, asset_id: int,
              old_path: str, new_path: str) -> str:
    """动一个文件并同步账本；返回 `ok` 或跳过／失败原因。

    账本写失败就把文件改回去：反过来留下的是一条指向不存在路径的行，而它看起来
    和正常的行没有任何区别。
    """
    if ntpath.splitdrive(old_path)[0].casefold() != ntpath.splitdrive(new_path)[0].casefold():
        # 计划那一步已经拦过一次。这里再拦是因为执行接受的是一份计划数据，而计划可以
        # 来自命令行、来自一份被人编辑过的 CSV；跨盘「改名」在这台机器上会退化成
        # 拷贝加删除，中断就是半个文件。
        return SKIP_CROSS_VOLUME
    local_source = _media_path(old_path)
    local_target = _media_path(new_path)
    if not local_source.exists():
        return "源文件不存在"
    case_only = old_path.casefold() == new_path.casefold()
    if local_target.exists() and not (
            case_only and isinstance(local_source, Path) and local_source.samefile(local_target)):
        return SKIP_TARGET_EXISTS
    try:
        _rename(old_path, new_path)
    except OSError as error:
        return MoveFailure(f"改名失败：{error.strerror or error}", retry_after=transient_delay(error))
    try:
        if not _update_row(connection, asset_id, old_path, new_path):
            raise OrganizeError("数据库里这一行已经变了")
        connection.commit()
    except Exception as error:
        connection.rollback()
        try:
            _rename(new_path, old_path)
            return f"数据库写入失败，已改回原名：{error}"
        except OSError:
            return f"数据库写入失败且改不回原名，需要人工处理：{error}"
    return "ok"


def apply_plan(connection: sqlite3.Connection, rows: Sequence[dict], *,
               generated_root: Path | str, progress: Callable[..., None] | None = None,
               stamp: str | None = None) -> dict:
    """执行计划，逐条动文件并同步账本；失败的行单独报，不影响其余行。

    调用方必须在拿到可写连接之前完成 SQLite 备份（`scripting.open_for_write` 与
    `web_organize` 都是这么做的）。这里只负责动盘、写账本和留下批次日志。
    """
    movable = [row for row in rows if row.get("action") in {"rename", "move"}]
    refuse_unverified(path for row in movable for path in (row["current_path"], row["target_path"]))
    log_path = batch_log_dir(generated_root) / (
        f"organize-{stamp or time.strftime('%Y%m%d-%H%M%S')}.json")
    log_path.parent.mkdir(parents=True, exist_ok=True)
    previous = json.loads(log_path.read_text(encoding='utf-8')) if stamp and log_path.exists() else {}
    entries = list(previous.get('entries') or [])
    failures: list[dict] = []
    completed = {entry['asset_id'] for entry in entries}
    def save():
        atomic_write_text(log_path, json.dumps(
            {'stamp': stamp or time.strftime('%Y%m%d-%H%M%S'), 'entries': entries, 'failures': failures},
            ensure_ascii=False, indent=1))
    try:
        for index, row in enumerate(movable, 1):
            if int(row['asset_id']) in completed:
                continue
            old_path, new_path = str(row["current_path"]), str(row["target_path"])
            current = connection.execute('SELECT path,disposal FROM asset WHERE id=?', (int(row['asset_id']),)).fetchone()
            landed = (current is not None and current[0] == new_path
                      and _media_path(new_path).is_file()
                      and (old_path.casefold() == new_path.casefold() or not _media_path(old_path).exists()))
            if current is None or current[1] is not None:
                outcome = '资产已不在馆藏，未执行整理'
            else:
                outcome = 'ok' if landed else _move_one(connection, int(row["asset_id"]), old_path, new_path)
            if outcome == "ok":
                entries.append({"asset_id": int(row["asset_id"]),
                                "old_path": old_path, "new_path": new_path})
            else:
                failures.append({"asset_id": int(row["asset_id"]),
                                 "path": old_path, "reason": outcome,
                                 "retryable": isinstance(outcome, MoveFailure) and outcome.retryable,
                                 "retry_after": outcome.retry_after if isinstance(outcome, MoveFailure) else None})
            save()
            if progress:
                progress(checked=index, total=len(movable))
    finally:
        save()
    return {"moved": len(entries), "failed": len(failures), "failures": failures[:50],
            "batch": log_path.name, "log_path": str(log_path)}


def rollback_batch(connection: sqlite3.Connection, log_path: Path | str, *,
                   progress: Callable[..., None] | None = None) -> dict:
    """把一个批次逆序改回去。已经被人手工改过的行改不回来，单独报出来。"""
    path = Path(log_path)
    payload = json.loads(path.read_text(encoding="utf-8"))
    entries = list(payload.get("entries") or [])
    previous_restored = int(payload.get('restored_count') or 0)
    refuse_unverified(path for entry in entries for path in (entry["new_path"], entry["old_path"]))
    restored: list[dict] = []
    failures: list[dict] = []
    for index, entry in enumerate(reversed(entries), 1):
        current = connection.execute('SELECT path FROM asset WHERE id=?', (int(entry['asset_id']),)).fetchone()
        landed = (current is not None and current[0] == entry['old_path']
                  and _media_path(entry['old_path']).is_file()
                  and (entry['old_path'].casefold() == entry['new_path'].casefold()
                       or not _media_path(entry['new_path']).exists()))
        outcome = 'ok' if landed else _move_one(connection, int(entry["asset_id"]),
                                                str(entry["new_path"]), str(entry["old_path"]))
        if outcome == "ok":
            restored.append(entry)
        else:
            failures.append({"asset_id": int(entry["asset_id"]),
                             "path": str(entry["new_path"]), "reason": outcome})
        payload['entries'] = [row for row in entries if row not in restored]
        payload['restored_count'] = previous_restored + len(restored)
        atomic_write_text(path, json.dumps(payload, ensure_ascii=False, indent=1))
        if progress:
            progress(checked=previous_restored + index, total=previous_restored + len(entries))
    remaining = [entry for entry in entries
                 if entry not in restored]
    if remaining:
        payload["entries"] = remaining
        atomic_write_text(path, json.dumps(payload, ensure_ascii=False, indent=1))
    else:
        # 整批都退回去了，这个批次就不该再出现在「回滚上一批」里。
        path.unlink(missing_ok=True)
    return {"restored": previous_restored + len(restored), "failed": len(failures), "failures": failures[:50],
            "batch": path.name}


__all__ = [
    "MAX_PATH", "PLAN_FIELDS", "PRESETS", "VERIFIED_RENAME_LOCATIONS", "OrganizeError",
    "TemplateError", "UnverifiedRename", "apply_plan", "batch_log_dir", "build_plan",
    "latest_batch", "placeholder_values", "plan_path", "refuse_unverified", "rollback_batch",
    "unverified_location", "verified_renames", "write_plan",
]
