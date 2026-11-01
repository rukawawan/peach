"""垃圾复核展示、批量决定、物理清除与回收站。

`junk` 提供各流程共用的证据与隔离规则；本模块将评分转成页面数据，并执行用户的
批量决定。自动隔离只进入回收站，永久删除需要独立的确认与取证流程。

物理删除要清的引用表只写在 `personal_records.ASSET_REFERENCE_TABLES` 一处。本地文件先隔离，
账本失败时可以恢复；rclone FUSE 挂载直接删除，账本失败时保留回收站行供重试。
"""
from __future__ import annotations

import hashlib
import json
import os
import re
import stat
import shutil
import tempfile
import time
import uuid

from pathlib import Path, PureWindowsPath
from typing import Sequence

from . import junk
from .catalog_rules import duration_clusters, is_jav_code, normalise_code_key
from .config import GENERATED_DIR, LOCATION_ROOT_DECLARATIONS
from .field_owners import USER_MANUAL, write_owned_fields
from .media_sources import SCANNABLE_LOCATIONS
from .personal_records import ASSET_REFERENCE_TABLES, VANISHED
from .platform import is_unmapped, root_online, translate_ledger_path, within_root
from .regions import normalize_region
from .task_runs import TaskRunHandle
from .web_activity import DEFAULT_PROFILE_ID
from .web_catalog import attach_card_performers
from .media_sources import cost_for
from .web_resource_sync import clean_resource_orphans
from .web_state import WebContract

from .junk import (
    AD_DIRPACK as AD_DIRPACK,
    AD_DOMAIN as AD_DOMAIN,
    AUTO_TRASH_SCORE as AUTO_TRASH_SCORE,
    BUNDLE_DIR_ASSETS as BUNDLE_DIR_ASSETS,
    CONTENT_BYTES as CONTENT_BYTES,
    INTERNET_SHORTCUT_SUFFIXES as INTERNET_SHORTCUT_SUFFIXES,
    JUNK_KINDS as JUNK_KINDS,
    JUNK_REVIEW_SCORE as JUNK_REVIEW_SCORE,
    JUNK_VIDEO_MAX_BYTES as JUNK_VIDEO_MAX_BYTES,
    MEDIA_SIDECAR_SUFFIXES as MEDIA_SIDECAR_SUFFIXES,
    PART_MARK as PART_MARK,
    PROMO_CLUSTER_FILES as PROMO_CLUSTER_FILES,
    PROMO_DOMAIN as PROMO_DOMAIN,
    PROMO_FILLER as PROMO_FILLER,
    PROMO_PHRASE as PROMO_PHRASE,
    REAL_CODE as REAL_CODE,
    has_sibling_original as has_sibling_original,
    promo_residue as promo_residue,
)

# Linux 容器可从 mountinfo 识别媒体实际所在的 FUSE 文件系统。
MOUNTINFO_PATH = Path("/proc/self/mountinfo")

#: 批量操作在活动页上的名字。表里存 `operation`，人看的是这一列。
BATCH_LABELS = {
    "like": "批量标记喜欢", "seen": "批量标记看过", "later": "批量加入稍后看",
    "dispose": "批量移入回收站", "restore": "批量还原", "delete": "批量永久删除",
    "dismiss-junk": "批量确认不是垃圾", "reconsider-junk": "批量重新判定垃圾",
    "region": "批量判定产地",
}


def q_ads(contract: WebContract, limit=200, offset=0, kind="", status="pending"):
    """疑似垃圾复核队列 —— **不自动删**，只排队让人看证据确认。

    没有可靠的单一判据（试过「同番号短版」会误伤 CD2/part1 分卷，
    试过「同名扩散」会误伤 001.mp4 这类通用名的真文件）。
    所以给的是**嫌疑分**，按分排序，人工看图定夺，确认的走既定 CSV 删除流程。

    2026-08-15 按用户标记的 21 条真广告重新标定：命中推广词本身不算证据，
    要看**剥掉推广词后还剩不剩内容**。三类实测误判据此排除：剧情里的「微信」、
    开头是盗版站域名但正文是真实描述、以及把创作者账号当成番号去比时长。

    2026-09-03 按用户复核的三类结果再调，判据从「只看文件名」扩到**看它的邻居**：
    手游插页靠 `PROMO_FILLER` 与不再补空格的残留计算入队，剩下几个残留仍高的靠
    `PROMO_CLUSTER_FILES`（同目录成群的同类推广名）补齐；同目录资产满
    `BUNDLE_DIR_ASSETS` 的成套资源包不再因整名是域名而入队；文件自己是真番号、
    自己超过 `CONTENT_BYTES`、或是同目录正片的封面／截图时，`AD_DIRPACK` 的目录
    证据不成立——蓝光原盘和它的海报都属于这一类。

    物理资源的类型不能成为免检条件。视频保留时长、体积和同番号长版证据；图片、
    音频、压缩包和其它文件走共用的推广名／推广目录证据；Windows ``.url`` 是网址
    快捷方式，在媒体目录中直接进入人工复核。在线资产不是待清理的物理文件，排除。

    广告包还有一类没有推广词的样本：目录名自曝（`一键约炮`、`-APP`、`論壇文宣`），
    整包只有一条正片加一张配套封面，其余是装饰符小图、品牌推广卡与网页存档。
    这几种形态各自独立计分，配套封面走正片配对豁免，推广目录里的长视频只加 30 分、
    要再叠一条时长或体积证据才到门槛。

    词库 `PROMO_NAMES_FILE` 里的固定命名，以及未探测时长视频的目录与体积证据，只够进队列：
    这部分分数单独凑够 `AUTO_TRASH_SCORE` 时压到线下，须有别的证据或人看过内容才进回收站。"""
    kind = str(kind or "").strip().casefold()
    status = str(status or "pending").strip().casefold()
    if kind and kind not in JUNK_KINDS:
        raise ValueError("invalid junk kind")
    if status not in {"pending", "dismissed"}:
        raise ValueError("invalid junk status")
    out, dismissed_ids = contract.cached_until_changed(
        "junk-scored", lambda: _scored_junk(contract))
    pending = [item for item in out if item["id"] not in dismissed_ids]
    dismissed = [item for item in out if item["id"] in dismissed_ids]
    pool = dismissed if status == "dismissed" else pending
    counts = {junk_kind: 0 for junk_kind in JUNK_KINDS}
    for item in pool:
        counts[item["junk_kind"]] += 1
    filtered = [item for item in pool if not kind or item["junk_kind"] == kind]
    # 缓存里那份是共享的，这一页的条目复制出来再挂演员，不改到下一次请求。
    items = [dict(item) for item in filtered[offset:offset + limit]]
    attach_card_performers(
        contract, [item for item in items if item.get("medium") == "video"])
    return {
        "total": len(filtered),
        "all_total": len(pool),
        "pending_total": len(pending),
        "dismissed_total": len(dismissed),
        "counts": counts,
        "kind": kind,
        "status": status,
        "items": items,
    }


def _scored_junk(contract: WebContract) -> tuple[list[dict], frozenset[int]]:
    """领域评分加上页面需要的成本与缩略图状态，路径留在服务内部。"""
    out, dismissed = junk.scored_candidates(contract)
    for item in out:
        item["cost"] = cost_for(item['location'], item.get('path'))
        item["has_thumb"] = contract.has_snapshot(item.pop("snapshot_path", None))
        item.pop("path", None)
    return out, dismissed


def _restore_staged_media(staged):
    """数据库失败时恢复隔离文件；本地备份带原路径与内容摘要。"""
    for original, quarantine in reversed(staged):
        if quarantine.exists() and not original.exists():
            manifest = quarantine.parent / 'restore.json'
            if quarantine.name == 'content' and manifest.is_file():
                record = json.loads(manifest.read_text(encoding='utf-8'))
                if record['original'] != str(original):
                    raise ValueError('隔离恢复路径不符')
                shutil.copyfile(quarantine, original)
                if hashlib.sha256(original.read_bytes()).hexdigest() != record['sha256']:
                    raise ValueError('隔离恢复内容不符')
                quarantine.unlink()
                manifest.unlink()
                quarantine.parent.rmdir()
            else:
                quarantine.rename(original)


def _mountinfo_field(value: str) -> str:
    """解码 mountinfo 中空白字符和反斜杠的八进制转义。"""
    return re.sub(r"\\([0-7]{3})", lambda match: chr(int(match.group(1), 8)), value)


def _is_rclone_mount(path: Path) -> bool:
    """按最深挂载点与覆盖关系识别 rclone 文件系统；不确定时保留隔离流程。"""
    from .smb_media import SmbResource
    if isinstance(path, SmbResource):
        return False
    try:
        lines = MOUNTINFO_PATH.read_text(encoding="utf-8", errors="surrogateescape").splitlines()
    except OSError:
        return False

    target = Path(os.path.abspath(path))
    matches = []
    for line in lines:
        before, separator, after = line.partition(" - ")
        if not separator:
            continue
        fields = before.split()
        filesystem = after.split(maxsplit=1)
        if len(fields) < 5 or not filesystem:
            continue
        try:
            mount_id, parent_id = int(fields[0]), int(fields[1])
        except ValueError:
            continue
        mountpoint = Path(os.path.abspath(_mountinfo_field(fields[4])))
        try:
            target.relative_to(mountpoint)
        except ValueError:
            continue
        matches.append((len(mountpoint.parts), mount_id, parent_id, filesystem[0]))
    if not matches:
        return False
    depth = max(item[0] for item in matches)
    deepest = [item for item in matches if item[0] == depth]
    covered = {item[2] for item in deepest if item[1] != item[2]}
    visible = [item for item in deepest if item[1] not in covered]
    return len(visible) == 1 and visible[0][3] == "fuse.rclone"


def _quarantine_media(original: Path, *, location: str | None = None) -> Path:
    """同目录改名不支持时，小文件先保留本地完整备份再删除原文件。"""
    from .smb_media import SmbResource
    key = uuid.uuid4().hex
    name = (f'peach-purge-{key}.peach-quarantine'
            if location == 'pikpak'
            else f'.{original.name}.peach-purge-{key}.tmp')
    quarantine = original.with_name(name)
    if isinstance(original, SmbResource):
        original.rename(quarantine)
        return quarantine
    try:
        os.rename(original, quarantine)
        return quarantine
    except OSError as error:
        if getattr(error, 'winerror', None) != 50 or original.is_symlink():
            raise
        stat = original.stat()
        if stat.st_size > 1024 * 1024:
            raise
    staging = GENERATED_DIR / 'purge-staging'
    staging.mkdir(parents=True, exist_ok=True)
    folder = Path(tempfile.mkdtemp(prefix='purge-', dir=staging))
    quarantine = folder / 'content'
    manifest = folder / 'restore.json'
    try:
        shutil.copyfile(original, quarantine)
        body = quarantine.read_bytes()
        current = original.stat()
        if len(body) != stat.st_size or (current.st_size, current.st_mtime_ns) != (stat.st_size, stat.st_mtime_ns):
            raise OSError('文件在隔离备份期间发生变化')
        record = dict(original=str(original), size=len(body),
                      sha256=hashlib.sha256(body).hexdigest())
        manifest.write_text(json.dumps(record, ensure_ascii=False), encoding='utf-8')
        original.unlink()
        return quarantine
    except BaseException:
        if original.exists():
            quarantine.unlink(missing_ok=True)
            manifest.unlink(missing_ok=True)
            folder.rmdir()
        raise


def _online_source_roots() -> dict[str, tuple[Path, ...]]:
    """Return only declared physical roots that can be enumerated now, per source."""
    roots: dict[str, tuple[Path, ...]] = {}
    for location, declarations in LOCATION_ROOT_DECLARATIONS.items():
        online = []
        for declaration in declarations:
            from .smb_media import resolve
            remote = resolve(declaration)
            root = remote or translate_ledger_path(declaration)
            if (remote is None and is_unmapped(root)) or not root.is_dir() or not root_online(root):
                continue
            online.append(root)
        if online:
            roots[location] = tuple(online)
    return roots


def _remove_empty_ancestors(parent: Path, source_roots: Sequence[Path]) -> list[Path]:
    """Remove empty parents up to, but never including, a declared source root."""
    source_root = next(
        (root for root in sorted(source_roots, key=lambda item: len(item.parts), reverse=True)
         if within_root(parent, root)),
        None,
    )
    if source_root is None:
        return []
    removed: list[Path] = []
    current = parent
    while current != source_root and within_root(current, source_root):
        if current.is_symlink():
            break
        next_parent = current.parent
        try:
            current.rmdir()
        except FileNotFoundError:
            # CloudDrive may collapse an empty layer as soon as its last file vanishes.
            current = next_parent
            continue
        except OSError:
            # Non-empty, offline, or protected directories are a normal stop boundary.
            break
        removed.append(current)
        current = next_parent
    return removed


def purge_vanished_rows(contract: WebContract, rows) -> dict:
    """永久删除文件已不在盘上的这些行，连同引用与派生产物；返回 `_finish_purge` 的回执。

    带个人记录的在库行到不了这里：资源同步先把它们标「已消失」（ADR-0087）。

    `missing_only`：到了删的这一刻文件又在了（复核之后网盘才同步回来），这一行整条
    跳过进 `blocked`，媒体文件一个字节都不碰。这一批要删的只是账本行。
    """
    contract.cache_bust()
    outcome = None
    try:
        with contract.write_transaction() as connection:
            outcome = purge_assets(connection, rows, missing_only=True)
    except BaseException:
        if outcome is not None:
            _restore_staged_media(outcome["_staged"])
        raise
    return _finish_purge(outcome)


def _finish_purge(outcome):
    """Delete committed quarantine files; report any residue for explicit cleanup."""
    cleanup_pending = []
    for _original, quarantine in outcome.pop("_staged"):
        try:
            quarantine.unlink(missing_ok=True)
            manifest = quarantine.parent / 'restore.json'
            if quarantine.name == 'content' and manifest.is_file():
                manifest.unlink()
                quarantine.parent.rmdir()
        except OSError as error:
            cleanup_pending.append({
                "path": str(quarantine), "reason": error.strerror or str(error),
            })
    for snapshot in outcome.pop("_snapshots"):
        try:
            snapshot.unlink(missing_ok=True)
        except OSError:
            pass
    source_roots = tuple(root for roots in _online_source_roots().values() for root in roots)
    removed_directories: set[Path] = set()
    for parent in outcome.pop("_parents"):
        removed_directories.update(_remove_empty_ancestors(parent, source_roots))
    outcome["cleanup_pending"] = cleanup_pending
    outcome["empty_dirs_removed"] = len(removed_directories)
    return outcome


def _purge_media_path(row, online_roots: dict[str, tuple[Path, ...]]) -> Path:
    """核对永久删除目标的路径映射和来源可读性，失败时拒绝删除。"""
    media = row["path"]
    from .smb_media import resolve
    if remote := resolve(media):
        return remote
    translated = translate_ledger_path(media)
    if is_unmapped(translated):
        raise OSError("媒体路径未映射到可访问的挂载目录")
    if PureWindowsPath(str(media)).drive:
        location = row["location"] if "location" in row.keys() else None
        if not any(within_root(translated, root) and root_online(root)
                   for root in online_roots.get(location, ())):
            raise OSError("媒体来源未挂载或不可读取")
    return translated


def purge_assets(connection, rows, *, missing_only: bool = False):
    """删除媒体和账本行，调用方提交后清理隔离文件。

    本地文件同目录隔离，账本事务失败时恢复。rclone FUSE 直接删除，避免远端改名
    触发复制；账本事务失败时保留记录供重试，已经删除的远端媒体无法恢复。

    ``missing_only`` 删的只是账本行：文件还在（或答不上在不在）的行进 ``blocked``。
    """
    purged, blocked, staged, snapshots, parents = [], [], [], [], []
    online_roots = None
    for row in rows:
        media = row["path"]
        translated = None
        if media:
            try:
                if online_roots is None and PureWindowsPath(str(media)).drive:
                    online_roots = _online_source_roots()
                translated = _purge_media_path(row, online_roots or {})
            except OSError as error:
                blocked.append({"id": row["id"], "path": media,
                                "reason": error.strerror or str(error)})
                continue
        media_stat = None
        if media:
            try:
                media_stat = translated.stat()
            except FileNotFoundError:
                pass
            except OSError as error:
                blocked.append({"id": row["id"], "path": media,
                                "reason": error.strerror or str(error)})
                continue
        if media and missing_only:
            if media_stat is not None:
                blocked.append({"id": row["id"], "path": media, "reason": "文件仍在盘上"})
                continue
        elif media:
            original = translated
            try:
                if media_stat is not None and not stat.S_ISREG(media_stat.st_mode):
                    raise OSError("not a regular file")
                if media_stat is not None:
                    if _is_rclone_mount(original):
                        original.unlink()
                    else:
                        quarantine = _quarantine_media(original, location=row['location'] if 'location' in row.keys() else None)
                        staged.append((original, quarantine))
            except OSError as error:
                blocked.append({"id": row["id"], "path": media,
                                "reason": error.strerror or str(error)})
                continue
        snapshot = row["snapshot_path"]
        if snapshot:
            snapshots.append(Path(snapshot))
        if media:
            parents.append(translated.parent)
        purged.append(row["id"])
    try:
        if purged:
            marks = ",".join("?" * len(purged))
            connection.execute(
                f"UPDATE playlist SET current_asset_id=NULL WHERE current_asset_id IN ({marks})",
                purged,
            )
            connection.execute(
                f"UPDATE playlist SET source_seed_asset_id=NULL WHERE source_seed_asset_id IN ({marks})",
                purged,
            )
            for table in ASSET_REFERENCE_TABLES:
                connection.execute(f"DELETE FROM {table} WHERE asset_id IN ({marks})", purged)
            connection.execute(f"DELETE FROM asset WHERE id IN ({marks})", purged)
    except BaseException:
        _restore_staged_media(staged)
        raise
    return {
        "purged": len(purged), "blocked": blocked,
        "_staged": staged, "_snapshots": snapshots, "_parents": parents,
    }


def w_empty_trash(contract: WebContract):
    """永久清空回收站：只处理 disposal='trash' 的资产，其余一律不碰。"""
    contract.cache_bust()
    outcome = None
    try:
        with contract.write_transaction() as connection:
            rows = connection.execute(
                "SELECT id,location,path,snapshot_path FROM asset WHERE disposal='trash'",
            ).fetchall()
            outcome = purge_assets(connection, rows)
    except BaseException:
        if outcome is not None:
            _restore_staged_media(outcome["_staged"])
        raise
    result = {"ok": True, "operation": "empty-trash", **_finish_purge(outcome)}
    result.update(clean_resource_orphans(contract))
    return result


def _batch_region_value(body) -> str | None:
    """批量判定产地要写进真相字段的值；`None` 表示退回未判定。

    `none` 是「撤回这个判定」。认不出的写法一律拒绝，而不是按 `normalize_region`
    的习惯当成未判定——那会把一次拼错的批量操作变成一次静默的清空。
    """
    requested = str(body.get("region") or "").strip().lower()
    value = normalize_region(requested)
    if not value and requested != "none":
        raise ValueError("unsupported region")
    return value or None


#: 还原与永久删除只对这两档成立：回收站里的，和文件已不在盘上、带着个人记录的
#: （`vanished`，ADR-0087）。还原是清掉 `disposal`，永久删除走 `purge_assets`。
DISPOSED = frozenset({"trash", VANISHED})


def _reject_ineligible_targets(operation: str, rows) -> None:
    """选中集合与操作对不上就拒绝整批，不做部分生效。"""
    if operation in {"restore", "delete"} and any(row["disposal"] not in DISPOSED for row in rows):
        raise ValueError("restore/delete is only allowed for recycle-bin or vanished assets")
    # 已消失的行文件不在盘上：进回收站再还原就成了在库，只能在孤儿记录里接回或彻底删除。
    if operation == "dispose" and any(row["disposal"] == VANISHED for row in rows):
        raise ValueError("vanished assets cannot be moved to the recycle bin")
    if operation in {"dismiss-junk", "reconsider-junk"} and any(
            row["location"] not in SCANNABLE_LOCATIONS
            or row["disposal"] is not None for row in rows):
        raise ValueError("junk decisions are only allowed for active physical assets")


def _batch_disposal_reason(body):
    """移入回收站的原因；显式空值用于撤销未记录原因的条目。"""
    if body.get("operation") != "dispose":
        return None
    reason = body.get("disposal_reason", "manual")
    if reason not in (None, "manual", "junk", "duplicate", "missing"):
        raise ValueError("unsupported disposal reason")
    return reason


def _write_batch_state(connection, rows, operation, now, disposal_reason):
    """同一事务写入反馈或回收站状态，并保留还原操作的撤销信息。"""
    ids = [row["id"] for row in rows]
    marks = ",".join("?" * len(ids))
    if operation == "restore":
        connection.execute(
            f"UPDATE asset SET disposal=NULL,disposal_reason=NULL,feedback_at=? WHERE id IN ({marks})",
            [now, *ids],
        )
        return {"restored_reasons": {str(row["id"]): row["disposal_reason"] for row in rows}}
    if operation == "dispose":
        connection.execute(
            f"UPDATE asset SET disposal='trash',disposal_reason=?,feedback_at=? WHERE id IN ({marks})",
            [disposal_reason, now, *ids],
        )
    else:
        connection.execute(f"UPDATE asset SET feedback='seen',feedback_at=? WHERE id IN ({marks})", [now, *ids])
    return {}


def w_batch(contract: WebContract, body):
    """Apply one explicit, reversible marker to a bounded selected set."""
    raw_ids = body.get("ids")
    if not isinstance(raw_ids, list):
        raise TypeError("ids must be a list")
    ids = list(dict.fromkeys(int(item) for item in raw_ids))
    if not ids or len(ids) > 200:
        raise ValueError("batch requires 1 to 200 assets")
    operation = body.get("operation")
    if operation not in {
        "like", "seen", "later", "dispose", "restore", "delete",
        "dismiss-junk", "reconsider-junk", "region",
    }:
        raise ValueError("unsupported batch operation")
    # 产地的取值在这里就要认出来，别等到写库那一步才发现拼错了。
    region_value = _batch_region_value(body) if operation == "region" else None
    disposal_reason = _batch_disposal_reason(body)
    marks = ",".join("?" * len(ids))
    contract.cache_bust()
    purge_outcome = None
    state_receipt = {}
    # 批量是一次写、几秒就完的事，但删除那一支会真的动磁盘：事后「刚才那一批到底
    # 删了多少、有没有半路失败」只有这条记录答得出。不声明互斥——两批不同的资产
    # 各改各的，互斥只会把正常的连续操作挡住。
    run = contract.task_runs.start("batch", trigger="manual", total=len(ids),
                                   label=BATCH_LABELS.get(operation, operation))
    handle = TaskRunHandle(contract.task_runs, run.id if run else None)
    from .task_control import bind, Cancelled
    try:
        with bind(contract.task_runs, handle.run_id):
            try:
                with contract.write_transaction() as connection:
                    found = connection.execute(
                        f"SELECT id,path,snapshot_path,disposal,disposal_reason,location FROM asset WHERE id IN ({marks})", ids,
                    ).fetchall()
                    valid_ids = [row["id"] for row in found]
                    if not valid_ids:
                        raise ValueError("assets not found")
                    _reject_ineligible_targets(operation, found)
                    now = time.time()
                    if operation in {"restore", "seen", "dispose"}:
                        state_receipt = _write_batch_state(connection, found, operation, now, disposal_reason)
                    elif operation == "delete":
                        # 已消失的行文件本来就不在了，只删账本行；文件又回到盘上的那几条留着，
                        # 下一轮扫描会把它们接回在库。选中里有一条已消失的，整批都按这条口径删。
                        purge_outcome = purge_assets(
                            connection, found, missing_only=any(row["disposal"] == VANISHED for row in found))
                    elif operation == "dismiss-junk":
                        connection.executemany(
                            "INSERT INTO review_decision(category,item_key,status,note,updated_at) "
                            "VALUES('junk_file',?,'rejected','用户确认不是垃圾',?) "
                            "ON CONFLICT(category,item_key) DO UPDATE SET "
                            "status='rejected',note=excluded.note,updated_at=excluded.updated_at",
                            [(str(asset_id), time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime(now)))
                             for asset_id in valid_ids],
                        )
                    elif operation == "reconsider-junk":
                        connection.executemany(
                            "DELETE FROM review_decision WHERE category='junk_file' AND item_key=?",
                            [(str(asset_id),) for asset_id in valid_ids],
                        )
                    elif operation == "region":
                        # 走 `write_owned_fields` 而不是直接 UPDATE：产地是真相字段，用户这一
                        # 笔要压得住后面每一轮刮削与推断，归属列是它唯一的凭据。
                        write_owned_fields(connection, valid_ids,
                                           {"region": region_value}, USER_MANUAL)
                    elif operation == "later":
                        connection.executemany(
                            "INSERT OR IGNORE INTO watch_queue(profile_id,asset_id,added_at,source) "
                            f"VALUES('{DEFAULT_PROFILE_ID}',?,strftime('%Y-%m-%dT%H:%M:%fZ','now'),'web-batch')",
                            [(asset_id,) for asset_id in valid_ids],
                        )
                    else:
                        connection.executemany(
                            "INSERT INTO asset_preference(profile_id,asset_id,liked,reason,source,updated_at) "
                            f"VALUES('{DEFAULT_PROFILE_ID}',?,1,'','web-batch',strftime('%Y-%m-%dT%H:%M:%fZ','now')) "
                            "ON CONFLICT(profile_id,asset_id) DO UPDATE SET liked=1,source='web-batch',"
                            "updated_at=excluded.updated_at",
                            [(asset_id,) for asset_id in valid_ids],
                        )
            except BaseException as error:
                if purge_outcome is not None:
                    _restore_staged_media(purge_outcome["_staged"])
                handle.finish("cancelled" if isinstance(error, Cancelled) else "failed",
                              error="" if isinstance(error, Cancelled) else f"{type(error).__name__}: {error}")
                raise
            if purge_outcome is not None:
                result = {"ok": True, "operation": operation, **_finish_purge(purge_outcome)}
                result.update(clean_resource_orphans(contract))
                handle.finish("succeeded", summary={"operation": operation,
                                                    "changed": len(valid_ids)})
                return result
            handle.finish("succeeded", summary={"operation": operation,
                                                "changed": len(valid_ids)})
            return {"ok": True, "operation": operation, "changed": len(valid_ids), **state_receipt}
    except Cancelled:
        handle.finish('cancelled', summary={'cancelled_by_user': True})
        raise


JUNK_BULK_OPERATIONS = {"dispose": "垃圾文件全部移入回收站", "dismiss-junk": "垃圾文件全部标为不是垃圾"}
JUNK_BULK_CHUNK = 500


def w_junk_bulk(contract: WebContract, body):
    """对垃圾文件当前视图（待判断、可按类）里的全部条目一次处置，不受 `w_batch` 的 200 条上限。

    条目由服务端按与 `q_ads` 相同的口径重算，客户端只给分类和它看到的总数：总数对不上说明
    队列已经变了，整批拒绝，让页面重读后再确认。移入回收站可在回收站还原，不动磁盘文件。
    """
    operation = body.get("operation")
    if operation not in JUNK_BULK_OPERATIONS:
        raise ValueError("unsupported junk bulk operation")
    kind = str(body.get("kind") or "").strip().casefold()
    if kind and kind not in JUNK_KINDS:
        raise ValueError("invalid junk kind")
    expected = body.get("expected_total")
    out, dismissed_ids = contract.cached_until_changed("junk-scored", lambda: _scored_junk(contract))
    ids = [item["id"] for item in out
           if item["id"] not in dismissed_ids and (not kind or item["junk_kind"] == kind)]
    if expected is not None and int(expected) != len(ids):
        raise ValueError(f"垃圾文件队列已变化（现在 {len(ids)} 条，页面上是 {int(expected)} 条），请刷新页面后再试")
    if not ids:
        return {"ok": True, "operation": operation, "changed": 0}
    contract.cache_bust()
    run = contract.task_runs.start("batch", trigger="manual", total=len(ids), label=JUNK_BULK_OPERATIONS[operation])
    handle = TaskRunHandle(contract.task_runs, run.id if run else None)
    changed = 0
    try:
        with contract.write_transaction() as connection:
            now = time.time()
            stamp = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime(now))
            for start in range(0, len(ids), JUNK_BULK_CHUNK):
                chunk = ids[start:start + JUNK_BULK_CHUNK]
                marks = ",".join("?" * len(chunk))
                # 只处置仍在库、可扫描的物理资产；期间已进回收站或已消失的跳过，不算失败。
                eligible = [row["id"] for row in connection.execute(
                    f"SELECT id,location,disposal FROM asset WHERE id IN ({marks})", chunk).fetchall()
                    if row["disposal"] is None and row["location"] in SCANNABLE_LOCATIONS]
                if not eligible:
                    continue
                marks = ",".join("?" * len(eligible))
                if operation == "dispose":
                    connection.execute(
                        f"UPDATE asset SET disposal='trash',disposal_reason='junk',feedback_at=? WHERE id IN ({marks})",
                        [now, *eligible])
                else:
                    connection.executemany(
                        "INSERT INTO review_decision(category,item_key,status,note,updated_at) "
                        "VALUES('junk_file',?,'rejected','用户确认不是垃圾',?) "
                        "ON CONFLICT(category,item_key) DO UPDATE SET "
                        "status='rejected',note=excluded.note,updated_at=excluded.updated_at",
                        [(str(asset_id), stamp) for asset_id in eligible])
                changed += len(eligible)
    except BaseException as error:
        handle.finish("failed", error=f"{type(error).__name__}: {error}")
        raise
    handle.finish("succeeded", summary={"operation": operation, "changed": changed})
    return {"ok": True, "operation": operation, "changed": changed}


def _add_large_short_copy_cluster(items: list[dict], clusters: list[list[dict]]):
    """把同番号的大体积短版本并到完整版所在组，返回这个组。"""
    claimed = {item["id"] for cluster in clusters for item in cluster}
    full = max(items, key=lambda item: item.get("duration") or 0)
    full_duration = float(full.get("duration") or 0)
    short_copies = [item for item in items
                    if item["id"] not in claimed and item["id"] != full["id"]
                    and (item.get("size") or 0) >= JUNK_VIDEO_MAX_BYTES
                    and 0 < float(item.get("duration") or 0) < full_duration * 0.2
                    and not PART_MARK.search(PureWindowsPath(
                        str(item.get("name") or "")).stem)]
    if not short_copies:
        return None
    cluster = next((candidate for candidate in clusters if any(
        item["id"] == full["id"] for item in candidate)), None)
    if cluster is None:
        cluster = [full]
        clusters.append(cluster)
    cluster.extend(short_copies)
    return cluster


def _duplicate_groups(grouped: dict[str, list[dict]]):
    """把已按番号归组的资产整理成重复项 API 结果。"""
    groups = []
    for code, items in grouped.items():
        if len(items) < 2:
            continue
        clusters = [cluster for cluster in duration_clusters(items) if len(cluster) >= 2]
        short_copy_cluster = _add_large_short_copy_cluster(items, clusters)
        for cluster in clusters:
            largest = max(cluster, key=lambda x: x.get("size") or 0)
            longest = max(cluster, key=lambda x: x.get("duration") or 0)
            hashes_present = [x["hash"] for x in cluster if x["hash"]]
            hashes = set(hashes_present)
            for item in cluster:
                item["is_largest"] = item["id"] == largest["id"]
                item["is_longest"] = item["id"] == longest["id"]
                item.pop("hash", None)
                item.pop("disposal", None)
            groups.append({
                "code": code,
                "files": sorted(cluster, key=lambda x: -(x.get("size") or 0)),
                "count": len(cluster),
                "evidence": "same_code_short_copy" if cluster is short_copy_cluster
                else "duration",
                # 必须每个文件都有 sha1 且完全相同才算确证字节一致。缺一个哈希
                # 就只是「时长相近」的推断，不能对外宣称已确证。
                "identical": len(hashes) == 1 and len(hashes_present) == len(cluster),
                "drives": sorted({x["drive"] for x in cluster}),
                "cross_drive": len({x["drive"] for x in cluster}) > 1,
                "reclaimable": sum(x.get("size") or 0 for x in cluster)
                - (largest.get("size") or 0),
            })
    return groups


def q_duplicates(contract: WebContract, args):
    """按番号 + 时长找真重复，也收同番号的大体积短版本。"""
    limit = min(max(int(args.get("limit", "60")), 1), 300)
    offset = max(int(args.get("offset", "0")), 0)
    with contract.read_connection() as connection:
        rows = connection.execute(
            "SELECT id,code,location,path,name,size,duration,hash,disposal "
            "FROM asset WHERE medium='video' AND code IS NOT NULL AND code<>'' "
            "AND disposal IS NULL"
        ).fetchall()

    grouped: dict[str, list[dict]] = {}
    for row in rows:
        if not is_jav_code(row["code"]):
            continue
        item = dict(row)
        # 盘符只用于判定跨盘；重复项页面还要显示完整路径，不能在契约层丢掉。
        item["drive"] = str(item.get("path") or "")[:2].upper()
        grouped.setdefault(normalise_code_key(row["code"]), []).append(item)

    groups = _duplicate_groups(grouped)
    groups.sort(key=lambda g: -g["reclaimable"])
    window = groups[offset:offset + limit]
    return {
        "total": len(groups),
        "files": sum(g["count"] for g in groups),
        "reclaimable": sum(g["reclaimable"] for g in groups),
        "groups": window,
        "has_more": offset + limit < len(groups),
    }
