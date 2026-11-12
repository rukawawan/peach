"""下载任务：云下载与本地下载共用的状态机、失败分类、任务表与对账轮询。

云下载把磁力交给 115（经 CloudDrive2 gRPC，`downloads_clouddrive`）或 PikPak（直连非官方
API，`downloads_pikpak`）离线下载。文件落在已挂载的网盘目录，由推送发现
（CloudDrive2 通知 → `scan.ingest_path`）登记进账本，不拉回本机。这里的轮询只做两件事：
看远端任务走到哪一步，以及远端完成之后账本里迟迟没有那个文件时，定向登记一次。

**状态机**（云下载与待办第 42 条本地下载共用，ADR-0089）：候选 → 已选定 → 已提交 → 远端进行中 → 远端完成 → 已落地 →
已入库，旁支失败、已取消、停滞。候选与已选定留给资源搜索（待办第 43 条）与「想要」清单；
云下载从「已提交」开始。

**九类失败**，只有「瞬时网络」自动重试，其余停在失败、交给用户决定：重新提交会再扣一条
115 离线配额，替用户自动重提等于替他花钱。

**幂等键是小写 40 位 infohash。** 同一个磁力再提交，接管已有任务；远端目录里已经有同一
infohash 的离线任务时也接管，不再调提交接口。

凭据（CloudDrive2 API 令牌、PikPak refresh token）只存本机 `CredentialStore`，不列为可
同步字段，不进 URL、日志与 ledger。
"""
from __future__ import annotations

import base64
import binascii
import json
import logging
import re
import sqlite3
import threading
import time
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path, PureWindowsPath
from typing import Callable, Protocol
from urllib.parse import parse_qs, unquote, urlsplit

from .follow_secrets import CredentialStore
from .fsutil import atomic_write_text
from .push_discovery import CloudPathError, CloudPrefix, map_cloud_path, normalise_prefix
from .repository import LedgerDatabase, in_background
from .task_retry import RETRY_DELAYS, retry_delay

LOGGER = logging.getLogger(__name__)

# ---------------------------------------------------------------- 状态与失败

CANDIDATE = "candidate"
SELECTED = "selected"
SUBMITTED = "submitted"
REMOTE_RUNNING = "remote_running"
REMOTE_DONE = "remote_done"
LANDED = "landed"
INGESTED = "ingested"
FAILED = "failed"
CANCELLED = "cancelled"
STALLED = "stalled"
#: 提交时网盘暂时没应答，磁力还没交出去；对账线程按退避再交，见 `SUBMIT_RETRY_WINDOW`。
SUBMIT_PENDING = "submit_pending"

POSTPROCESS_NOT_REQUESTED = "not_requested"
POSTPROCESS_PENDING = "pending"
POSTPROCESS_QUEUED = "queued"
POSTPROCESS_RUNNING = "running"
POSTPROCESS_COMPLETE = "complete"
POSTPROCESS_FAILED = "failed"
POSTPROCESS_LABELS = {
    POSTPROCESS_NOT_REQUESTED: "整理未开始", POSTPROCESS_PENDING: "等待整理",
    POSTPROCESS_QUEUED: "整理已排队", POSTPROCESS_RUNNING: "整理中",
    POSTPROCESS_COMPLETE: "整理完成", POSTPROCESS_FAILED: "整理失败",
}

STATE_LABELS = {
    CANDIDATE: "待选择的资源", SELECTED: "已选定", SUBMITTED: "已提交", REMOTE_RUNNING: "网盘下载中",
    REMOTE_DONE: "网盘下载完成", LANDED: "文件已可访问", INGESTED: "已入库",
    FAILED: "失败", CANCELLED: "已取消", STALLED: "长时间未完成", SUBMIT_PENDING: "等待自动重新提交",
}
#: 轮询要看的状态。远端完成与已落地还在等账本里出现那个文件；等待重新提交的还要再交一次。
TRACKED_STATES = frozenset({SUBMIT_PENDING, SUBMITTED, REMOTE_RUNNING, REMOTE_DONE, LANDED})
#: 可以再提交一次的状态。已入库的不必，在跑的接管就行。
RESUBMITTABLE_STATES = frozenset({FAILED, CANCELLED, STALLED})


@dataclass(frozen=True)
class FailureKind:
    key: str
    label: str
    retryable: bool = False


FAILURE_KINDS: dict[str, FailureKind] = {kind.key: kind for kind in (
    FailureKind("config", "配置或登录有误"),
    FailureKind("quota", "下载额度已用完"),
    FailureKind("rejected", "网盘拒绝下载该资源"),
    FailureKind("invalid_link", "链接无效"),
    FailureKind("no_source", "没有可用下载源或进度长时间未更新"),
    FailureKind("not_accepted", "网盘没有收下任务"),
    FailureKind("removed", "网盘任务被删除"),
    FailureKind("duplicate", "下载任务已存在"),
    FailureKind("not_landed", "目标目录中未找到下载文件"),
    FailureKind("mismatch", "下载内容与目标作品不符"),
    FailureKind("network", "网络暂时不可用", retryable=True),
)}


def never_seen(task: "DownloadTask") -> bool:
    """提交后从没在网盘离线列表里见过：没有远端编号，也没读到过进度。名字不算，提交时就取自磁力。"""
    return task.progress is None and not task.remote_id


class DownloadError(RuntimeError):
    """一次远端操作失败。`detail` 是给用户看的中文原因，不含凭据。

    `block` 只给 115 的违规拦截（`50038`）：这类失败不重试，同一 infohash 以后直接拒收。
    """

    def __init__(self, failure: str, detail: str, *, block: bool = False):
        if failure not in FAILURE_KINDS:
            raise ValueError(f"未知的失败类别：{failure}")
        super().__init__(detail)
        self.failure = failure
        self.detail = detail
        self.block = block

    @property
    def retryable(self) -> bool:
        return FAILURE_KINDS[self.failure].retryable


#: 115 对违规内容的离线拦截码。CloudDrive2 把 115 的原文放进 `errorMessage`，
#: 只认得出码或「违规」字样，所以两样都匹配。
BLOCKED_PATTERN = re.compile(r"50038|违规|敏感")


def classify_remote_message(message: str) -> DownloadError:
    """远端只给一句话时按字面归类。认不出的归「资源被拒」，原文照抄给用户。"""
    text = str(message or "").strip() or "远端没有给出原因"
    lowered = text.casefold()
    if BLOCKED_PATTERN.search(text):
        return DownloadError("rejected", f"115 拦截了这个资源（违规内容，50038），不会重试：{text}",
                             block=True)
    if any(word in lowered for word in ("配额", "quota", "次数", "上限", "limit")):
        return DownloadError("quota", f"离线配额不够：{text}")
    if any(word in lowered for word in ("已存在", "exist", "重复", "duplicate")):
        return DownloadError("duplicate", f"远端已有同一个任务：{text}")
    if any(word in lowered for word in ("链接", "无效", "invalid", "url", "格式")):
        return DownloadError("invalid_link", f"远端不认这个链接：{text}")
    return DownloadError("rejected", f"远端拒绝了这个任务：{text}")


# ---------------------------------------------------------------- 磁力


@dataclass(frozen=True)
class Magnet:
    info_hash: str
    uri: str
    name: str = ""


_HEX40 = re.compile(r"^[0-9a-f]{40}$")
_BASE32 = re.compile(r"^[a-z2-7]{32}$")


def normalise_info_hash(raw: str) -> str:
    """小写 40 位十六进制。32 位 base32（BEP 9 允许）先换成十六进制，两种写法才是同一个键。"""
    text = str(raw or "").strip().lower()
    if _HEX40.match(text):
        return text
    if _BASE32.match(text):
        try:
            return base64.b32decode(text.upper()).hex()
        except binascii.Error:
            pass
    raise ValueError("磁力链接里的 infohash 不是 40 位十六进制或 32 位 base32")


_TRACKER = re.compile(r"^(?:udp|https?|wss?)://[A-Za-z0-9.\-]+(?::\d{1,5})?(?:/[!-~]*)?$")


def clean_magnet(text: str) -> str:
    """去掉无法解析的 tracker 参数，其余原样保留。

    有的来源给出的磁力里夹着一段打乱的 tracker（`exoduecnuonnaF2%9696A3%moc.cnysed.s`，
    倒过来是 `exodus.desync.com`），115 开放平台把整条链接判为「错误的链接」（10004），
    有时还不报错、只是不建任务。2026-10-28 对照实验：同一个 DASD-911 磁力原样提交被拒，
    只去掉这一段后五秒内就出现在离线列表里。
    """
    split = urlsplit(text)
    kept = []
    for part in split.query.split("&"):
        key, _, value = part.partition("=")
        if key == "tr":
            try:
                decoded = unquote(value, errors="strict")
            except UnicodeDecodeError:
                continue
            if not _TRACKER.match(decoded):
                continue
        if part:
            kept.append(part)
    return f"{split.scheme}:?{'&'.join(kept)}"


def parse_magnet(raw: str) -> Magnet:
    """解析用户粘贴的磁力，或一个裸 infohash。只认 `urn:btih`，v2 的 `btmh` 不在幂等键口径内。"""
    text = str(raw or "").strip()
    if not text:
        raise ValueError("请粘贴磁力链接")
    if not text.casefold().startswith("magnet:"):
        info_hash = normalise_info_hash(text)
        return Magnet(info_hash, f"magnet:?xt=urn:btih:{info_hash}")
    query = parse_qs(urlsplit(text).query)
    for value in query.get("xt", []):
        if value.casefold().startswith("urn:btih:"):
            info_hash = normalise_info_hash(value[len("urn:btih:"):])
            name = (query.get("dn") or [""])[0].strip()
            return Magnet(info_hash, clean_magnet(text), name[:300])
    raise ValueError("磁力链接里没有 urn:btih，Peach 只接受 BitTorrent 磁力")


def magnet_info_hash(uri: str) -> str:
    """远端只回了原始链接时，从里面取 infohash；取不到返回空串。"""
    try:
        return parse_magnet(uri).info_hash
    except ValueError:
        return ""


# ---------------------------------------------------------------- 远端接口


@dataclass(frozen=True)
class RemoteStatus:
    """远端任务此刻的样子。`state` 只有四种：在跑、完成、失败、列表里找不到。"""
    state: str
    remote_id: str = ""
    name: str = ""
    progress: float | None = None
    message: str = ""
    #: 提交时远端目录里已有同一 infohash 的任务，接过来跟踪，没有调提交接口。
    adopted: bool = False


RUNNING, DONE, ERROR, MISSING = "running", "done", "error", "missing"


class OfflineProvider(Protocol):
    key: str

    def submit(self, magnet: Magnet, target: str) -> RemoteStatus: ...

    def status(self, task: "DownloadTask") -> RemoteStatus: ...

    def landed(self, task: "DownloadTask") -> bool: ...

    def cancel(self, task: "DownloadTask") -> None: ...


PROVIDER_LABELS = {"115": "115", "pikpak": "PikPak"}

# ---------------------------------------------------------------- 时间


def iso(ts: float) -> str:
    return datetime.fromtimestamp(ts, timezone.utc).isoformat(timespec="seconds")


def parse_iso(text: str | None) -> float | None:
    if not text:
        return None
    try:
        return datetime.fromisoformat(text).timestamp()
    except ValueError:
        return None


#: 提交后第一次看的间隔，之后按这张表退避，最后一档封顶。JavBoss 提交后 10 秒查一次。
POLL_DELAYS = (10.0, 30.0, 60.0, 120.0, 300.0, 600.0, 900.0)
#: 提交时网盘暂时没应答（如 CloudDrive2 刷新 115 离线列表超时），从第一次提交起按 `POLL_DELAYS`
#: 再交，这么久还没交上才算失败。
SUBMIT_RETRY_WINDOW = 3600.0
#: 远端完成后先等推送发现登记；过了这一段账本里还没有，才定向登记一次。
LANDING_GRACE = 60.0
#: 远端完成之后最多等这么久让文件出现在挂载目录、进入账本，超过算「落地未见」。
LANDING_TIMEOUT = 6 * 3600.0
#: 远端列表里找不到任务时，提交后这么久之内当作列表还没刷新，不判失败。
MISSING_GRACE = 180.0
#: 提交后从没在离线列表里出现过的任务多等一会儿：批量提交时 CloudDrive2 与 115 登记慢，
#: 2026-10-16 一批 83 个提交里 25 个三到十分钟内被判失败，期间同一接口超时 17 次。
UNSEEN_GRACE = 900.0
DEFAULT_WAIT_HOURS = 168
MAX_WAIT_HOURS = 24 * 60
#: 判成「长时间未完成」之后，远端任务多半还挂在网盘里，冷门种子过几天才凑齐源的也有。
#: 之后每隔这么久再看一眼，远端完成就照常落地入库；最多再看这么久就彻底不管。
#: 做法同 SakuraMedia `551715b321`：超时只是不再催，不等于远端不会完成。
STALL_RECHECK = 6 * 3600.0
STALL_RECHECK_HORIZON = 7 * 86400.0


def _stall_cutoff(now: float) -> float:
    """停滞早于这一刻的，下一次复查就会超出期限（`_recheck_stalled` 的同一条界线）。"""
    return now - (STALL_RECHECK_HORIZON - STALL_RECHECK)


#: 已落地的目录最多登记这么多个文件；种子里成千上万个小文件交给全量扫描。
MAX_LANDED_FILES = 500


def poll_delay(checks: int) -> float:
    return POLL_DELAYS[min(max(checks, 0), len(POLL_DELAYS) - 1)]


# ---------------------------------------------------------------- 任务表


@dataclass
class DownloadTask:
    id: int
    info_hash: str | None
    provider: str
    source_uri: str
    display_name: str
    target: str
    state: str
    code: str | None = None
    title: str | None = None
    origin: str | None = None
    failure: str | None = None
    failure_detail: str | None = None
    remote_id: str | None = None
    remote_name: str | None = None
    progress: float | None = None
    ledger_path: str | None = None
    asset_id: int | None = None
    checks: int = 0
    submitted_at: str | None = None
    remote_done_at: str | None = None
    updated_at: str = ""
    finished_at: str | None = None
    next_check_at: str | None = None
    blocked_at: str | None = None
    postprocess_state: str = POSTPROCESS_NOT_REQUESTED
    postprocess_detail: str | None = None
    postprocess_run_id: int | None = None
    postprocessed_at: str | None = None
    postprocess_retries: int = 0

    @property
    def postprocess_label(self) -> str:
        if self.postprocess_state == POSTPROCESS_PENDING and self.next_check_at:
            return f"等待自动重试（{self.postprocess_retries}/{len(RETRY_DELAYS)}）"
        return POSTPROCESS_LABELS.get(self.postprocess_state, self.postprocess_state)

    @property
    def location(self) -> str:
        """渠道关联的媒体来源。"""
        return self.provider.split(":", 2)[1] if self.provider.startswith("clouddrive:") else self.provider

    @classmethod
    def from_row(cls, row: sqlite3.Row) -> "DownloadTask":
        return cls(**{name: row[name] for name in row.keys()})

    def payload(self, asset: dict | None = None) -> dict:
        from .catalog_rules import jav_fallback_title, release_code_from_filename, same_release_code
        from .media_sources import SOURCES

        kind = FAILURE_KINDS.get(self.failure or "")
        codes = {code for name in (self.remote_name, self.display_name, self.title)
                 if name and (code := release_code_from_filename(name))}
        display_code = self.code or (asset or {}).get("code") or (next(iter(codes)) if len(codes) == 1 else None)
        matched_asset = asset if asset and (not display_code or not asset.get("code")
                                            or same_release_code(display_code, asset["code"])) else {}
        display_title = next((str(matched_asset.get(field) or "").strip()
                              for field in ("catalog_title", "original_title")
                              if str(matched_asset.get(field) or "").strip()), "")
        if not display_title:
            display_title = (self.title or "").strip() if jav_fallback_title(self.title, display_code) else ""
        if not display_title:
            display_title = next((title for name in (self.display_name, self.remote_name)
                                  if (title := jav_fallback_title(name, display_code))), "")
        return {
            "id": self.id, "info_hash": self.info_hash, "provider": self.provider,
            "provider_label": SOURCES[self.location].name if self.location in SOURCES else self.provider,
            "source_uri": self.source_uri, "display_name": self.display_name,
            "target": self.target, "code": self.code, "title": self.title, "origin": self.origin,
            "display_code": display_code, "display_title": display_title,
            "state": self.state, "state_label": STATE_LABELS.get(self.state, self.state),
            "failure": self.failure, "failure_label": kind.label if kind else None,
            "failure_detail": self.failure_detail,
            "progress": self.progress, "remote_name": self.remote_name,
            "ledger_path": self.ledger_path, "asset_id": self.asset_id,
            "submitted_at": self.submitted_at, "updated_at": self.updated_at,
            "finished_at": self.finished_at, "blocked": bool(self.blocked_at),
            "postprocess_state": self.postprocess_state,
            "postprocess_label": self.postprocess_label,
            "postprocess_detail": self.postprocess_detail,
            "postprocess_run_id": self.postprocess_run_id,
            "postprocessed_at": self.postprocessed_at,
            "postprocess_retries": self.postprocess_retries,
            "postprocess_retry_at": self.next_check_at if self.postprocess_state == POSTPROCESS_PENDING else None,
            "postprocess_active": self.postprocess_state in {
                POSTPROCESS_PENDING, POSTPROCESS_QUEUED, POSTPROCESS_RUNNING},
            "postprocess_retryable": self.state == INGESTED and self.postprocess_state == POSTPROCESS_FAILED,
            "cancellable": self.state in TRACKED_STATES,
            "resubmittable": self.state in RESUBMITTABLE_STATES and not self.blocked_at,
        }


_TASK_COLUMNS = (
    "info_hash", "provider", "source_uri", "display_name", "target", "state", "code", "title",
    "origin", "failure", "failure_detail", "remote_id", "remote_name", "progress",
    "ledger_path", "asset_id", "checks", "submitted_at", "remote_done_at", "updated_at",
    "finished_at", "next_check_at", "blocked_at",
    "postprocess_state", "postprocess_detail", "postprocess_run_id", "postprocessed_at",
    "postprocess_retries",
)


class DownloadStore:
    """两张表的读写。任务表是运行状态，写入不清聚合缓存（`notify=False`）。"""

    def __init__(self, database: LedgerDatabase):
        self.database = database

    def get(self, task_id: int) -> DownloadTask | None:
        with self.database.read_connection() as connection:
            row = connection.execute("SELECT * FROM download_task WHERE id=?", (task_id,)).fetchone()
        return DownloadTask.from_row(row) if row else None

    def by_hash(self, info_hash: str) -> DownloadTask | None:
        with self.database.read_connection() as connection:
            row = connection.execute(
                "SELECT * FROM download_task WHERE info_hash=?", (info_hash,)).fetchone()
        return DownloadTask.from_row(row) if row else None

    def active_by_code(self, code: str) -> DownloadTask | None:
        states = tuple(sorted(RESUBMITTABLE_STATES))
        marks = ",".join("?" for _ in states)
        with self.database.read_connection() as connection:
            row = connection.execute(
                "SELECT * FROM download_task WHERE normalise_code_key(code)=normalise_code_key(?) "
                f"AND state NOT IN ({marks}) AND blocked_at IS NULL ORDER BY id DESC LIMIT 1",
                (code, *states)).fetchone()
        return DownloadTask.from_row(row) if row else None

    def recent(self, limit: int = 100) -> list[DownloadTask]:
        with self.database.read_connection() as connection:
            rows = connection.execute(
                "SELECT * FROM download_task ORDER BY updated_at DESC, id DESC LIMIT ?",
                (max(1, min(int(limit), 500)),)).fetchall()
        return [DownloadTask.from_row(row) for row in rows]

    def count(self) -> int:
        with self.database.read_connection() as connection:
            return connection.execute("SELECT count(*) FROM download_task").fetchone()[0]

    def page(self, limit: int, before_id: int | None = None, *, offset: int = 0) -> list[DownloadTask]:
        """按提交顺序读取一页；状态更新时间不影响分页位置。"""
        where = " WHERE id<?" if before_id is not None else ""
        args = (before_id, limit) if before_id is not None else (limit,)
        with self.database.read_connection() as connection:
            rows = connection.execute(
                f"SELECT * FROM download_task{where} ORDER BY id DESC LIMIT ? OFFSET ?", (*args, offset)).fetchall()
        return [DownloadTask.from_row(row) for row in rows]

    def display_assets(self, tasks: list[DownloadTask]) -> dict[int, dict]:
        """一页任务已绑定作品的只读标题资料。"""
        ids = sorted({task.asset_id for task in tasks if task.asset_id is not None})
        if not ids:
            return {}
        with self.database.read_connection() as connection:
            rows = connection.execute(
                "SELECT id,code,catalog_title,original_title FROM asset "
                f"WHERE id IN ({','.join('?' for _ in ids)})", ids).fetchall()
        return {row["id"]: dict(row) for row in rows}

    def due(self, now: float) -> list[DownloadTask]:
        # 停滞的任务排了复查时间才算到期；时间为空表示已经不再复查。例外是停滞还没满复查期限、
        # 时间却为空的：那是有低频复查之前就判停滞的旧任务，当作到期，复查一次后照常排下一次。
        states = tuple(sorted(TRACKED_STATES))
        marks = ",".join("?" for _ in states)
        with self.database.read_connection() as connection:
            rows = connection.execute(
                f"SELECT * FROM download_task WHERE (state IN ({marks}) "
                "AND (next_check_at IS NULL OR next_check_at<=?)) "
                "OR (state=? AND next_check_at IS NOT NULL AND next_check_at<=?) "
                "OR (state=? AND next_check_at IS NULL AND finished_at>=?) "
                "OR (state=? AND postprocess_state=? AND next_check_at<=?) ORDER BY next_check_at, id",
                (*states, iso(now), STALLED, iso(now), STALLED, iso(_stall_cutoff(now)),
                 INGESTED, POSTPROCESS_PENDING, iso(now))).fetchall()
        return [DownloadTask.from_row(row) for row in rows]

    def next_due(self, now: float) -> float | None:
        states = tuple(sorted(TRACKED_STATES))
        marks = ",".join("?" for _ in states)
        with self.database.read_connection() as connection:
            row = connection.execute(
                f"SELECT min(coalesce(next_check_at,'')) FROM download_task WHERE state IN ({marks}) "
                "OR (state=? AND next_check_at IS NOT NULL) "
                "OR (state=? AND next_check_at IS NULL AND finished_at>=?) "
                "OR (state=? AND postprocess_state=? AND next_check_at IS NOT NULL)",
                (*states, STALLED, STALLED, iso(_stall_cutoff(now)), INGESTED, POSTPROCESS_PENDING)).fetchone()
        if row is None or row[0] is None:
            return None
        return parse_iso(row[0]) or 0.0

    def save(self, task: DownloadTask) -> DownloadTask:
        values = [getattr(task, name) for name in _TASK_COLUMNS]
        with self.database.write_transaction(notify=False) as connection:
            if task.id:
                assignments = ",".join(f"{name}=?" for name in _TASK_COLUMNS)
                connection.execute(f"UPDATE download_task SET {assignments} WHERE id=?",
                                   (*values, task.id))
            else:
                marks = ",".join("?" for _ in _TASK_COLUMNS)
                cursor = connection.execute(
                    f"INSERT INTO download_task({','.join(_TASK_COLUMNS)}) VALUES({marks})", values)
                task.id = int(cursor.lastrowid)
        return task

    def record_submission(self, *, task: DownloadTask, outcome: str, now: float,
                          failure: str | None = None, detail: str | None = None) -> None:
        with self.database.write_transaction(notify=False) as connection:
            connection.execute(
                "INSERT INTO download_submission(task_id,info_hash,provider,source_uri,target,code,"
                "origin,outcome,failure,detail,created_at) VALUES(?,?,?,?,?,?,?,?,?,?,?)",
                (task.id or None, task.info_hash, task.provider, task.source_uri, task.target,
                 task.code, task.origin, outcome, failure, detail, iso(now)))

    def submissions(self, task_id: int) -> list[dict]:
        with self.database.read_connection() as connection:
            rows = connection.execute(
                "SELECT outcome,failure,detail,provider,created_at FROM download_submission "
                "WHERE task_id=? ORDER BY id", (task_id,)).fetchall()
        return [dict(row) for row in rows]

    def assets_under(self, location: str, ledger_path: str) -> list[dict]:
        """账本里这条路径或目录下的全部活动资产；路径按 Windows 口径不区分。"""
        escaped = ledger_path.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")
        with self.database.read_connection() as connection:
            rows = connection.execute(
                "SELECT id,path,name,code,medium,size,duration,width,height FROM asset "
                "WHERE location=? AND disposal IS NULL "
                "AND (path=? COLLATE NOCASE OR path LIKE ? ESCAPE '\\') ORDER BY id",
                (location, ledger_path, escaped + "\\\\%")).fetchall()
        return [dict(row) for row in rows]

    def asset_under(self, location: str, ledger_path: str, code: str | None = None) -> int | None:
        """选择正片，而不是目录中最早登记的一条推广视频。"""
        from .catalog_rules import release_code_from_filename, same_release_code
        rows = [row for row in self.assets_under(location, ledger_path)
                if row.get("medium") == "video"]
        if not rows:
            return None
        def rank(row):
            shown = row.get("code") or release_code_from_filename(row.get("name") or "")
            exact = bool(code and shown and same_release_code(code, shown))
            promo = bool(re.search(r"(?i)(?:manko\.fun|广告|廣告|扫码|掃碼|最新地址)",
                                   str(row.get("name") or "")))
            duration = float(row.get("duration") or 0)
            pixels = int(row.get("width") or 0) * int(row.get("height") or 0)
            return (exact, not promo, duration, pixels, int(row.get("size") or 0), -int(row["id"]))
        return int(max(rows, key=rank)["id"])

    def pending_postprocess(self, now: float | None = None) -> list[DownloadTask]:
        with self.database.read_connection() as connection:
            rows = connection.execute(
                "SELECT * FROM download_task WHERE state=? AND postprocess_state=? "
                "AND (next_check_at IS NULL OR next_check_at<=?) ORDER BY id",
                (INGESTED, POSTPROCESS_PENDING, iso(time.time() if now is None else now))).fetchall()
        return [DownloadTask.from_row(row) for row in rows]

    def postprocess(self, task_id: int, state: str, *, detail: str | None = None,
                    run_id: int | None = None, finished: str | None = None) -> None:
        assignments = ["postprocess_state=?", "postprocess_detail=?", "next_check_at=NULL"]
        values: list[object] = [state, detail]
        if run_id is not None:
            assignments.append("postprocess_run_id=?")
            values.append(run_id)
        if finished is not None:
            assignments.append("postprocessed_at=?")
            values.append(finished)
        with self.database.write_transaction(notify=False) as connection:
            connection.execute(f"UPDATE download_task SET {','.join(assignments)} WHERE id=?",
                               (*values, int(task_id)))

    def fail_postprocess(self, task_id: int, error: Exception, *, now: float | None = None) -> bool:
        """在原任务上排下一次后处理；终止条件与错误都保留，不重交磁力。"""
        task = self.get(task_id)
        delay = retry_delay(error, task.postprocess_retries)
        detail = f'{type(error).__name__}: {error}'
        if delay is None:
            if task.postprocess_retries >= len(RETRY_DELAYS):
                detail = f'自动重试 {task.postprocess_retries} 次后仍未完成；{detail}'
            self.postprocess(task_id, POSTPROCESS_FAILED, detail=detail)
            return False
        with self.database.write_transaction(notify=False) as connection:
            connection.execute(
                'UPDATE download_task SET postprocess_state=?,postprocess_detail=?,postprocess_retries=?,next_check_at=? WHERE id=?',
                (POSTPROCESS_PENDING, detail, task.postprocess_retries + 1,
                 iso((time.time() if now is None else now) + delay), task_id))
        return True


# ---------------------------------------------------------------- 设置

SETTINGS_FILENAME = "downloads.json"
#: 凭据文件名：`<secrets>/follow/download-clouddrive2.json` 与 `download-pikpak.json`。
#: 不登记进 `CREDENTIAL_GUIDE`，所以既不出现在追更凭据页，也没有可同步字段。
CLOUDDRIVE_CREDENTIAL = "download-clouddrive2"
PIKPAK_CREDENTIAL = "download-pikpak"


def normalise_target(raw: str) -> str:
    """网盘里的目标目录统一成 `/a/b`。CloudDrive2 与 PikPak 都是 POSIX 口径。"""
    text = normalise_prefix(raw)
    if text == "/" or any(part in {".", ".."} for part in text.split("/")):
        raise ValueError("目标目录要写成网盘里的一个具体文件夹，不能是网盘根目录")
    return text


@dataclass(frozen=True)
class DownloadConfig:
    clouddrive_address: str = ""
    targets: dict = field(default_factory=dict)
    #: PikPak 根目录对应的数据库路径前缀；115 使用推送发现中配置的云端路径前缀。
    pikpak_root: str = ""
    wait_hours: int = DEFAULT_WAIT_HOURS
    problems: tuple[str, ...] = ()

    def payload(self) -> dict:
        return {"clouddrive_address": self.clouddrive_address, "targets": dict(self.targets),
                "pikpak_root": self.pikpak_root, "wait_hours": self.wait_hours}


def clean_address(raw) -> str:
    text = str(raw or "").strip().rstrip("/")
    if not text:
        return ""
    if "://" not in text:
        text = "http://" + text
    message = "CloudDrive2 地址只写协议、主机和端口，例如 http://127.0.0.1:19798"
    if len(text) > 2048 or "\\" in text or any(char.isspace() or ord(char) < 32 for char in text):
        raise ValueError(message)
    try:
        parts = urlsplit(text)
        port = parts.port
    except ValueError:
        raise ValueError("CloudDrive2 地址的端口必须是 1–65535 的整数，IPv6 地址须放在方括号内") from None
    if parts.scheme not in {"http", "https"} or not parts.hostname or parts.path not in {"", "/"} \
            or parts.query or parts.fragment or parts.username is not None or parts.password is not None:
        raise ValueError(message)
    if port == 0 or parts.netloc.endswith(":"):
        raise ValueError("CloudDrive2 地址的端口必须是 1–65535 的整数")
    return f"{parts.scheme}://{parts.netloc}"


class DownloadSettings:
    """地址、目标目录与等待上限的落点。本机偏好，不是账本真相，也不是凭据。"""

    def __init__(self, state_root: Path):
        self.path = Path(state_root) / SETTINGS_FILENAME

    def load(self) -> DownloadConfig:
        try:
            payload = json.loads(self.path.read_text(encoding="utf-8"))
        except FileNotFoundError:
            return DownloadConfig()
        except (OSError, ValueError):
            LOGGER.warning("云下载设置读不出来，按默认值跑：%s", self.path)
            return DownloadConfig(problems=("云下载设置无法读取，请检查设置文件或重新填写。",))
        if not isinstance(payload, dict):
            return DownloadConfig(problems=("云下载设置格式不符，请检查设置文件或重新填写。",))
        try:
            return self._parse(payload, declared_roots=None, saved=True)
        except ValueError:
            LOGGER.warning("云下载设置有不合法的值，按默认值跑：%s", self.path)
            return DownloadConfig(problems=("云下载设置含有无效值，请检查目标目录和等待上限。",))

    def _parse(self, body: dict, *, declared_roots, saved: bool = False) -> DownloadConfig:
        from .media_sources import SOURCE_REGISTRY
        targets = {}
        raw_targets = body.get("targets") if isinstance(body.get("targets"), dict) else {}
        for key in (source.id for source in SOURCE_REGISTRY if source.cloud):
            value = str(raw_targets.get(key) or "").strip()
            if value:
                targets[key] = normalise_target(value)
        root = str(body.get("pikpak_root") or "").strip()
        if root and declared_roots is not None:
            known = {str(item).casefold(): str(item) for item in declared_roots.get("pikpak", ())}
            if root.casefold() not in known:
                shown = "、".join(known.values()) or "（设置文件里没有 pikpak 来源）"
                raise ValueError(f"{root} 不是已声明的 PikPak 媒体根；已知：{shown}")
            root = known[root.casefold()]
        try:
            hours = int(body.get("wait_hours") or DEFAULT_WAIT_HOURS)
        except (TypeError, ValueError) as error:
            raise ValueError("等待上限要写成小时数") from error
        if not 1 <= hours <= MAX_WAIT_HOURS:
            raise ValueError(f"等待上限在 1 到 {MAX_WAIT_HOURS} 小时之间")
        problems = ()
        try:
            address = clean_address(body.get("clouddrive_address"))
        except ValueError as error:
            if not saved:
                raise
            address = str(body.get("clouddrive_address") or "").strip()
            problems = (str(error),)
        return DownloadConfig(address, targets, root, hours, problems)

    def save(self, body: dict, declared_roots) -> DownloadConfig:
        if not isinstance(body, dict):
            raise ValueError("设置必须是一个对象")
        config = self._parse(body, declared_roots=declared_roots)
        atomic_write_text(self.path, json.dumps(config.payload(), ensure_ascii=False, indent=2) + "\n")
        return config


# ---------------------------------------------------------------- 服务


@dataclass(frozen=True)
class SubmitResult:
    outcome: str
    task: DownloadTask

    def payload(self) -> dict:
        return {"ok": True, "outcome": self.outcome, "task": self.task.payload()}


#: 提交结果的几种说法。`adopted` 是本机已有同一 infohash 的任务；`adopted_remote` 是远端
#: 目录里已有同一个离线任务，接过来跟踪、没有调提交接口，也就没有扣配额。
SUBMIT_OUTCOMES = ("submitted", "adopted", "adopted_remote", "deferred", "refused", "failed")


class DownloadService:
    """提交、取消、列表与后台对账。

    `providers` 按 provider 键现取客户端：凭据和地址随时会在设置页里改，不在启动时固化。
    `landing` 提供推送发现那一侧：云端路径前缀、定向登记与本机路径换算。
    """

    def __init__(
        self, *, database: LedgerDatabase, state_root: Path, credentials: CredentialStore,
        providers: Callable[[str], OfflineProvider], landing: "Landing",
        available: bool = True, clock: Callable[[], float] = time.time,
        after_ingest: Callable[[DownloadTask], None] | None = None,
        channel_catalog: Callable[[], dict] | None = None,
    ):
        self.store = DownloadStore(database)
        self.settings = DownloadSettings(state_root)
        self.credentials = credentials
        self.providers = providers
        self.landing = landing
        self.available = bool(available)
        self.clock = clock
        self.after_ingest = after_ingest
        self.channel_catalog = channel_catalog
        self.config = self.settings.load()
        self._submit_lock = threading.Lock()
        self._wake = threading.Event()
        self._stop = threading.Event()
        self._thread: threading.Thread | None = None

    # -- 提交

    def submit(self, *, source: str, provider: str, target: str | None = None,
               code: str | None = None, title: str | None = None,
               origin: str | None = None, dedupe_code: bool = False) -> SubmitResult:
        if not self.available:
            raise ValueError("云下载只在允许修改数据库的设备上可用")
        magnet = parse_magnet(source)
        channels = self.channel_snapshot()["providers"]
        channel = next((row for row in channels if row["key"] == provider), None)
        if channel is None or (self.channel_catalog is not None and not channel["configured"]):
            raise ValueError("请选择媒体库中可用的云下载渠道")
        folder = normalise_target(target or channel["target"])
        if provider.startswith("clouddrive:") and not (
                folder == channel["target"] or folder.startswith(channel["target"].rstrip("/") + "/")):
            raise ValueError("下载目标目录必须位于所选媒体库内")
        with self._submit_lock:
            now = self.clock()
            if dedupe_code and code and (existing := self.store.active_by_code(code)) is not None:
                self.store.record_submission(task=existing, outcome="adopted", now=now)
                return SubmitResult("adopted", existing)
            task = self.store.by_hash(magnet.info_hash)
            if task is not None and task.blocked_at:
                self.store.record_submission(task=task, outcome="refused", now=now,
                                             failure="rejected", detail=task.failure_detail)
                return SubmitResult("refused", task)
            if task is not None and task.state not in RESUBMITTABLE_STATES:
                self.store.record_submission(task=task, outcome="adopted", now=now)
                return SubmitResult("adopted", task)
            task = self._fresh(task, magnet, provider, folder, code, title, origin, now)
            try:
                status = self.providers(provider).submit(magnet, folder)
            except DownloadError as error:
                if not error.retryable:
                    self._fail(task, error, now)
                    self.store.record_submission(task=task, outcome="failed", now=now,
                                                 failure=error.failure, detail=error.detail)
                    return SubmitResult("failed", task)
                task.state = SUBMIT_PENDING
                self._reschedule(task, now, error.detail)
                outcome = "deferred"
                self.store.record_submission(task=task, outcome=outcome, now=now,
                                             failure=error.failure, detail=error.detail)
            else:
                self._accepted(task, status, now)
                outcome = "adopted_remote" if status.adopted else "submitted"
                self.store.record_submission(task=task, outcome=outcome, now=now)
        self._wake.set()
        return SubmitResult(outcome, task)

    def _accepted(self, task: DownloadTask, status: RemoteStatus, now: float) -> None:
        task.remote_id = status.remote_id or task.remote_id
        task.remote_name = status.name or task.remote_name
        task.state = SUBMITTED
        task.checks = 0
        task.failure_detail = None
        task.next_check_at = iso(now + POLL_DELAYS[0])
        self.store.save(task)

    def _retry_submit(self, task: DownloadTask, now: float) -> None:
        """再交一次提交时网盘没应答的磁力。远端收下后从这一刻起按新提交对账。"""
        with self._submit_lock:
            latest = self.store.get(task.id)
            if latest is None or latest.state != SUBMIT_PENDING:
                return  # 到期之后、拿到提交锁之前被取消或重新提交了。
            task = latest
            try:
                status = self.providers(task.provider).submit(parse_magnet(task.source_uri), task.target)
            except DownloadError as error:
                started = parse_iso(task.submitted_at) or now
                if error.retryable and now - started < SUBMIT_RETRY_WINDOW:
                    self._reschedule(task, now, error.detail)
                    return
                if error.retryable:
                    error = DownloadError(error.failure, f"{error.detail}（自动重试 {task.checks} 次后仍未提交）")
                self._fail(task, error, now)
                self.store.record_submission(task=task, outcome="failed", now=now,
                                             failure=error.failure, detail=error.detail)
                return
            latest = self.store.get(task.id)
            if latest is None or latest.state != SUBMIT_PENDING:
                return  # 再交的这段时间里任务被取消了。
            task.submitted_at = iso(now)
            self._accepted(task, status, now)
            self.store.record_submission(task=task, outcome="adopted_remote" if status.adopted else "submitted",
                                         now=now)

    def _fresh(self, task, magnet: Magnet, provider, folder, code, title, origin, now) -> DownloadTask:
        """新任务，或把失败／取消／停滞的那一行重置成一次新的提交。"""
        fresh = DownloadTask(
            id=task.id if task else 0, info_hash=magnet.info_hash, provider=provider,
            source_uri=magnet.uri, display_name=magnet.name or (task.display_name if task else ""),
            target=folder, state=SUBMITTED,
            code=_short(code) or (task.code if task else None),
            title=_short(title) or (task.title if task else None),
            origin=_short(origin) or (task.origin if task else None),
            submitted_at=iso(now), updated_at=iso(now))
        return self.store.save(fresh)

    def _fail(self, task: DownloadTask, error: DownloadError, now: float, *, state: str = FAILED) -> None:
        task.state = state
        task.failure = error.failure
        task.failure_detail = error.detail
        task.finished_at = iso(now)
        task.updated_at = iso(now)
        task.next_check_at = iso(now + STALL_RECHECK) if state == STALLED else None
        if error.block:
            task.blocked_at = iso(now)
        self.store.save(task)

    # -- 取消与列表

    def cancel(self, task_id: int) -> DownloadTask:
        if not self.available:
            raise ValueError("云下载只在允许修改数据库的设备上可用")
        task = self.store.get(int(task_id))
        if task is None:
            raise ValueError("没有这个下载任务")
        if task.state not in TRACKED_STATES:
            raise ValueError("这个任务已经结束，不能取消")
        if task.state in {SUBMITTED, REMOTE_RUNNING}:
            try:
                self.providers(task.provider).cancel(task)
            except DownloadError as error:
                raise ValueError(f"远端没有取消成功：{error.detail}") from error
        now = self.clock()
        task.state = CANCELLED
        task.finished_at = iso(now)
        task.updated_at = iso(now)
        task.next_check_at = None
        self.store.save(task)
        return task

    def snapshot(self, limit: int = 100, *, before_id: int | None = None, page: int = 1) -> dict:
        limit = max(1, min(int(limit), 500))
        total = self.store.count()
        page = min(page, max(1, (total + limit - 1) // limit))
        rows = self.store.page(limit + 1, before_id, offset=(page - 1) * limit)
        tasks = rows[:limit]
        has_more = len(rows) > limit
        assets = self.store.display_assets(tasks)
        catalog = self.channel_snapshot()
        labels = {row["key"]: row["label"] for row in catalog["providers"]}
        uncancellable = {row["key"] for row in catalog["providers"] if row.get("can_cancel") is False}
        payloads = [task.payload(assets.get(task.asset_id)) for task in tasks]
        for payload in payloads:
            payload["provider_label"] = labels.get(payload["provider"], payload["provider_label"])
            if payload["provider"] in uncancellable and payload["state"] in {SUBMITTED, REMOTE_RUNNING}:
                payload["cancellable"] = False
        return {
            "available": self.available,
            **catalog,
            "tasks": payloads,
            "has_more": has_more,
            "total": total,
            "page": page,
            "next_before_id": tasks[-1].id if has_more else None,
        }

    def channel_snapshot(self) -> dict:
        if self.channel_catalog is not None:
            return self.channel_catalog()
        return {"providers": [self._provider_state(key) for key in PROVIDER_LABELS], "problems": []}

    def retry_postprocess(self, task_id: int) -> DownloadTask:
        task = self.store.get(int(task_id))
        if task is None:
            raise ValueError("没有这个下载任务")
        if task.state != INGESTED or task.postprocess_state != POSTPROCESS_FAILED:
            raise ValueError("这个任务没有失败的后处理可以重试")
        task.postprocess_retries = 0
        self.store.save(task)
        self.store.postprocess(task.id, POSTPROCESS_PENDING, detail="等待重新处理")
        task = self.store.get(task.id)
        self._dispatch_postprocess(task)
        return self.store.get(task.id)

    def _provider_state(self, key: str) -> dict:
        credential = CLOUDDRIVE_CREDENTIAL if key == "115" else PIKPAK_CREDENTIAL
        needed = "token" if key == "115" else "refresh_token"
        described = self.credentials.describe(credential)
        configured = needed in described["fields"] and (key != "115" or bool(self.config.clouddrive_address))
        return {"key": key, "label": PROVIDER_LABELS[key], "configured": configured,
                "target": self.config.targets.get(key, "")}

    # -- 对账

    def start(self) -> None:
        if not self.available or self._thread is not None:
            return
        self._stop.clear()
        self._thread = threading.Thread(target=in_background(self._loop), name="PeachDownloads", daemon=True)
        self._thread.start()
        if self.after_ingest is not None:
            try:
                pending = self.store.pending_postprocess(self.clock())
            except sqlite3.Error:
                # 未配置实例的 lifespan 也会装配服务；账本尚不存在时没有待恢复任务。
                pending = []
            for task in pending:
                self._dispatch_postprocess(task)

    def stop(self) -> None:
        thread, self._thread = self._thread, None
        self._stop.set()
        self._wake.set()
        if thread is not None:
            thread.join(timeout=5)

    def wake(self) -> None:
        self._wake.set()

    def _loop(self) -> None:
        while not self._stop.is_set():
            self._wake.clear()
            try:
                self.poll_once()
                upcoming = self.store.next_due(self.clock())
            except Exception:
                # 一轮里出什么错都不能让线程退出：退出之后所有任务都不再推进，界面上只是不动。
                LOGGER.exception("云下载对账失败")
                upcoming = self.clock() + POLL_DELAYS[2]
            delay = POLL_DELAYS[-1] if upcoming is None else upcoming - self.clock()
            self._wake.wait(timeout=min(max(delay, 1.0), POLL_DELAYS[-1]))

    def poll_once(self) -> int:
        """推进所有到期的任务，返回推进了几条。测试直接调它。"""
        due = self.store.due(self.clock())
        for task in due:
            try:
                self.advance(task)
            except Exception:
                LOGGER.exception("云下载任务 %s 对账失败", task.id)
                self._reschedule(task, self.clock(), "对账时出现未预期的错误，稍后再试")
        return len(due)

    def advance(self, task: DownloadTask) -> None:
        now = self.clock()
        if task.state == INGESTED and task.postprocess_state == POSTPROCESS_PENDING:
            self._dispatch_postprocess(task)
            return
        if task.state == STALLED:
            self._recheck_stalled(task, now)
            return
        if task.state == SUBMIT_PENDING:
            self._retry_submit(task, now)
            return
        try:
            if task.state in {SUBMITTED, REMOTE_RUNNING}:
                self._follow_remote(task, now)
            else:
                self._settle_landing(task, now)
        except DownloadError as error:
            if error.retryable:
                self._reschedule(task, now, error.detail)
            else:
                self._fail(task, error, now)
            return
        if task.state in {SUBMITTED, REMOTE_RUNNING} and self._overdue(task, now):
            self._fail(task, DownloadError(
                "no_source", f"等了 {self.config.wait_hours} 小时远端还没完成，多半是没有人做种。"
                "可以取消，或换一个磁力"), now, state=STALLED)

    def _recheck_stalled(self, task: DownloadTask, now: float) -> None:
        """停滞任务的低频复查：远端完成就回到落地流程，否则排下一次，超出期限就不再查。

        这里不改失败原因与「长时间未完成」的状态：远端仍在跑、出错或不见了，都只是这次没等到。
        """
        try:
            provider = self.providers(task.provider)
            status = provider.status(task)
            done = status.state == DONE or (status.state == MISSING and provider.landed(task))
        except DownloadError:
            done = False
        if done:
            task.finished_at = None
            task.failure = None
            self._remote_done(task, status, now)
            return
        stalled = parse_iso(task.finished_at) or now
        task.next_check_at = (iso(now + STALL_RECHECK)
                              if now + STALL_RECHECK - stalled <= STALL_RECHECK_HORIZON else None)
        task.updated_at = iso(now)
        self.store.save(task)

    def _overdue(self, task: DownloadTask, now: float) -> bool:
        started = parse_iso(task.submitted_at) or now
        return now - started > self.config.wait_hours * 3600.0

    def _reschedule(self, task: DownloadTask, now: float, detail: str | None = None) -> None:
        """隔一段再查。`detail` 是这一次暂时性故障的原因；没带就是这一次查通了，旧原因作废。"""
        task.checks += 1
        task.updated_at = iso(now)
        task.next_check_at = iso(now + poll_delay(task.checks))
        task.failure_detail = detail
        self.store.save(task)

    def _follow_remote(self, task: DownloadTask, now: float) -> None:
        provider = self.providers(task.provider)
        status = provider.status(task)
        if status.state == RUNNING:
            task.state = REMOTE_RUNNING
            task.progress = status.progress
            task.remote_id = status.remote_id or task.remote_id
            task.remote_name = status.name or task.remote_name
            task.failure_detail = None
            self._reschedule(task, now)
            return
        if status.state == ERROR:
            raise classify_remote_message(status.message)
        if status.state == MISSING:
            if not provider.landed(task):
                started = parse_iso(task.submitted_at) or now
                # 磁力本身失败时 115 会把任务留在列表里标为离线失败；从没出现过说明网盘没有收下，
                # 出现过又不见了说明任务在网盘一侧被删除或清理，两种都不是换磁力能解决的。
                unseen = never_seen(task)
                if now - started < (UNSEEN_GRACE if unseen else MISSING_GRACE):
                    self._reschedule(task, now)
                    return
                if unseen:
                    raise DownloadError("not_accepted", "网盘没有收下这个任务：提交后离线列表里始终没有它，目标目录里也没有文件")
                raise DownloadError("removed", "网盘里的这个任务不见了：离线列表里找不到它，目标目录里也没有文件")
        self._remote_done(task, status, now)

    def _remote_done(self, task: DownloadTask, status, now: float) -> None:
        task.remote_name = status.name or task.remote_name
        task.remote_id = status.remote_id or task.remote_id
        task.state = REMOTE_DONE
        task.progress = 1.0
        task.remote_done_at = iso(now)
        task.failure_detail = None
        task.updated_at = iso(now)
        # 先给推送发现一段时间：CloudDrive2 的通知通常几秒内就把文件登记好了。
        task.next_check_at = iso(now + LANDING_GRACE)
        self.store.save(task)

    def _settle_landing(self, task: DownloadTask, now: float) -> None:
        mapped = self.landing.ledger_path(task, self.config)
        if mapped is None:
            raise DownloadError(
                "not_landed",
                "目标目录对应不到媒体目录，请检查媒体库挂载和云端路径前缀关联")
        location, ledger_path = mapped
        task.ledger_path = ledger_path
        asset_id = self.store.asset_under(location, ledger_path, task.code)
        if asset_id is None and self.landing.ingest(location, ledger_path):
            task.state = LANDED
            asset_id = self.store.asset_under(location, ledger_path, task.code)
        if asset_id is None and self.providers(task.provider).landed(task):
            if self.landing.ingest(location, ledger_path):
                task.state = LANDED
                asset_id = self.store.asset_under(location, ledger_path, task.code)
        if asset_id is not None:
            task.state = INGESTED
            task.asset_id = asset_id
            task.finished_at = iso(now)
            task.updated_at = iso(now)
            task.next_check_at = None
            task.failure = task.failure_detail = None
            task.postprocess_state = POSTPROCESS_PENDING
            task.postprocess_detail = None
            task.postprocess_run_id = None
            task.postprocessed_at = None
            self.store.save(task)
            self._dispatch_postprocess(task)
            return
        done = parse_iso(task.remote_done_at) or now
        if now - done > LANDING_TIMEOUT:
            raise DownloadError(
                "not_landed", f"远端已完成，但挂载目录里一直没有出现 {ledger_path}")
        task.updated_at = iso(now)
        task.next_check_at = iso(now + LANDING_GRACE)
        self.store.save(task)

    def _dispatch_postprocess(self, task: DownloadTask) -> None:
        if self.after_ingest is None:
            return
        try:
            self.after_ingest(task)
        except Exception as error:
            LOGGER.exception("云下载任务 %s 后处理入队失败", task.id)
            if self.store.fail_postprocess(task.id, error, now=self.clock()):
                self.wake()

    # -- 设置

    def save_settings(self, body: dict, declared_roots) -> DownloadConfig:
        self.config = self.settings.save(body, declared_roots)
        return self.config


def _short(value) -> str | None:
    text = str(value or "").strip()
    return text[:300] or None


# ---------------------------------------------------------------- 落地


class Landing:
    """远端完成之后的那一段：网盘路径换成账本路径，账本里没有就定向登记一次。

    115 的网盘路径是 CloudDrive2 挂载树里的路径，换算用推送发现已经配好的云端路径前缀，
    不另存一张表。PikPak 直连取得网盘内部路径，再与设置中选定的数据库路径前缀拼接。
    """

    def __init__(self, push_discovery, *, mounts=None, declared_roots=None):
        self.push_discovery = push_discovery
        self.channel_catalog = None
        self.mounts = mounts if mounts is not None else getattr(push_discovery, "mounts", {})
        self.declared_roots = (declared_roots if declared_roots is not None
                               else getattr(push_discovery, "declared_roots", {}))

    def remote_path(self, task: DownloadTask) -> str:
        name = (task.remote_name or task.display_name or "").strip().strip("/")
        if not name:
            return ""
        return f"{task.target.rstrip('/')}/{name}"

    def ledger_path(self, task: DownloadTask, config: DownloadConfig) -> tuple[str, str] | None:
        remote = self.remote_path(task)
        if not remote:
            return None
        if task.provider == "pikpak":
            if not config.pikpak_root:
                return None
            prefixes = (CloudPrefix("/pikpak", config.pikpak_root),)
            remote = "/pikpak" + remote
        else:
            prefixes = tuple(self.push_discovery.config.prefixes)
            if self.channel_catalog:
                channel = next((row for row in self.channel_catalog()["providers"] if row["key"] == task.provider), None)
                if channel and channel.get("cloud_root"):
                    prefixes = (CloudPrefix(channel["cloud_root"], channel["root"]),)
        try:
            path = map_cloud_path(remote, prefixes)
        except CloudPathError:
            return None
        from .platform import resolve_location
        location = resolve_location(path, self.declared_roots)[0]
        return (location, path) if location else None

    def ingest(self, location: str, ledger_path: str) -> bool:
        """定向登记。目录就逐个登记里面的文件；什么也没找到返回假。"""
        from .discovery_rules import system_directory, system_path
        from .push_discovery import ignored
        from .scan import _relative_directory, _walk, walk_root_for
        if system_path(ledger_path):
            return False
        parent = str(PureWindowsPath(ledger_path).parent)
        try:
            local_parent = walk_root_for(location, parent, declared_roots=self.declared_roots,
                                         mounts=self.mounts)
        except ValueError:
            return False
        local = local_parent / PureWindowsPath(ledger_path).name
        try:
            if local.is_file():
                return self.push_discovery.ingest_now(location, ledger_path)
            if not local.is_dir() or system_directory(local.name):
                return False
            found = False
            count = 0
            for directory, entries in _walk(local):
                for item in entries:
                    relative = (*_relative_directory(directory, local), item.name)
                    path = str(PureWindowsPath(ledger_path).joinpath(*relative))
                    if ignored(path):
                        continue
                    if count >= MAX_LANDED_FILES:
                        return found
                    found = self.push_discovery.ingest_now(location, path) or found
                    count += 1
            return found
        except OSError:
            return False


# ---------------------------------------------------------------- 入口


def submit_offline_download(
    service: DownloadService, *, magnet: str, provider: str, target: str | None = None,
    code: str | None = None, title: str | None = None, origin: str | None = None,
    dedupe_code: bool = False,
) -> dict:
    """把一个磁力交给云下载，各入口共用这条提交路径。

    `origin` 说这次提交从哪儿来，例如 `paste`、`asset:12`、`follow:34`、`wishlist:56`。
    同一 infohash 已有任务就接管，返回的 `outcome` 是 `adopted`，不会重复提交。
    浏览器添加启用 `dedupe_code`，在提交锁内接管同番号的进行中或已入库任务。
    """
    return service.submit(source=magnet, provider=provider, target=target, code=code,
                          title=title, origin=origin, dedupe_code=dedupe_code).payload()
