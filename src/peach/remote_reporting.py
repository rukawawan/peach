"""按本机选择发送技术诊断；不读取历史日志、账本或媒体。"""
from __future__ import annotations

import atexit
import errno
import hashlib
import json
import os
import platform
import re
import subprocess
import threading
import uuid
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urlsplit

from .reporting_identity import event_metadata, machine_facts
from .diagnostic_exceptions import media_details

FIELDS = {
    "usage": "Peach 版本、分发方式（Windows／macOS 应用、Docker、wheel 或源码）、操作系统类型与版本、CPU 架构与核数、内存档位、Python 版本、运行环境与公开构建编号；每天最多一条日志和一条会话汇总，不含安装标识。",
    "errors": "Peach 版本、分发方式、运行环境与公开构建编号、系统类型、Python 版本、CPU 架构、故障环节、异常链、Peach 与白名单框架的代码文件名/函数名/行号、结构化错误码、媒体工具故障类别、浏览器白名单异常类型与正式脚本构建映射、HTTP 方法/路由模板/关联错误编号、同类故障次数与统计日期；同一版本的同类故障只上传一次完整诊断，每天最多 5 条，之后的次数每 6 小时或退出时合并为计数日志。",
}
NOTICE = "发送至 Sentry。不上报错误原文、完整日志、诊断 ZIP、媒体名称、路径、网址、观看记录或凭据。接收服务会接触连接 IP；关闭后停止新发送，已发送的信息无法撤回。"
_lock = threading.RLock()
_client = None
_client_dsn = ""
_disabled = False
_frequency_timer = None
_frequency_configs = {}
TELEMETRY_ITEMS = frozenset({"log", "sessions"})
MEDIA_STAGES = frozenset({"frame-capture", "frame-tile", "media-probe", "preview", "library-preview"})
LOCAL_EXCEPTION_TYPES = frozenset({
    ("asyncio.exceptions", "CancelledError"), ("concurrent.futures._base", "CancelledError"),
    ("builtins", "InterruptedError"), ("peach.jobs", "JobPolicyError"),
    ("peach.jav_cover_fetch", "Unavailable"), ("peach.jav_cover_fetch", "DeadlineExceeded"),
    ("peach.scraping_access", "SourcePaused"), ("peach.previews", "PreviewUnavailable"),
    ("peach.transcodes", "TranscodeCancelled"), ("peach.segments", "SegmentCancelled"),
    ("peach.browser_transport", "BrowserUnavailable"), ("peach.browser_transport", "ChallengeUnsolved"),
    ("peach.face_detect", "FaceModelUnavailable"), ("peach.avatar_watermark", "WatermarkModelUnavailable"),
    ("starlette.requests", "ClientDisconnect"), ("filelock._error", "Timeout"),
    ("httpx", "TimeoutException"),
})
# 磁盘与文件系统层的 SQLite 错误，以及下一轮会重试的锁争用。
LOCAL_SQLITE_ERRORS = ("SQLITE_IOERR", "SQLITE_FULL", "SQLITE_BUSY", "SQLITE_LOCKED")


def _config(config=None):
    if config is None:
        from .settings_file import active
        config = active()
    return config


def _read(path, *, missing=None):
    try:
        value = json.loads(path.read_text(encoding="utf-8"))
        return value if isinstance(value, dict) else {}
    except FileNotFoundError:
        return missing if missing is not None else {}
    except (OSError, ValueError, UnicodeError):
        return {}


def _consent(path):
    value = _read(path, missing={"usage": True, "errors": True, "revision": "default"})
    enabled = all(value.get(key) is True for key in FIELDS)
    return {"usage": enabled, "errors": enabled,
            "revision": str(value.get("revision", ""))}


def consent(config=None):
    return _consent(_config(config).directory("state") / "remote-reporting.json")


def dsn(environment="PEACH_SENTRY_DSN", key="dsn"):
    value = os.environ.get(environment, "").strip()
    if not value:
        from .settings_file import PROJECT_ROOT
        value = _read(PROJECT_ROOT / "sentry.json").get(key, "")
    if not isinstance(value, str):
        return ""
    try:
        parsed = urlsplit(value)
        # 托管 Sentry 的公开 DSN；不接受任意网络目标或带私钥的旧 DSN。
        if (parsed.scheme == "https" and parsed.hostname and re.fullmatch(r"[a-z0-9-]+\.ingest(?:\.(?:us|de))?\.sentry\.io", parsed.hostname)
                and parsed.username and not parsed.password and not parsed.query and not parsed.fragment
                and parsed.path[1:].isdigit() and parsed.port in (None, 443)):
            return value
    except ValueError:
        pass
    return ""


def snapshot(config=None):
    from . import reporting_delivery
    config = _config(config)
    return {**{key: value for key, value in consent(config).items() if key != "revision"},
            "available": bool(dsn()), "fields": FIELDS, "notice": NOTICE,
            "delivery": reporting_delivery.snapshot(config)}


def parse_choices(body, *, partial=False):
    if not isinstance(body, dict):
        raise ValueError("遥测和自动错误诊断必须是布尔值")
    defaults = consent() if partial else {}
    choices = {key: body.get(key, defaults.get(key)) for key in FIELDS}
    if any(type(value) is not bool for value in choices.values()):
        raise ValueError("遥测和自动错误诊断必须是布尔值")
    if choices["usage"] != choices["errors"]:
        raise ValueError("版本统计与错误诊断须同时开启或关闭")
    return choices


def save(body, config=None):
    payload = parse_choices(body)
    from .fsutil import atomic_write_text
    config = _config(config)
    payload["revision"] = uuid.uuid4().hex
    atomic_write_text(config.directory("state") / "remote-reporting.json", json.dumps(payload))
    from . import diagnostic_frequency
    diagnostic_frequency.clear(config)
    return snapshot(config)


def _reserve(config, kind, event):
    """版本统计跨托盘与子服务每天只发一次；额度文件只存指纹。"""
    from filelock import FileLock
    from .fsutil import atomic_write_text
    path = config.directory("state") / "remote-reporting-budget.json"
    path.parent.mkdir(parents=True, exist_ok=True)
    with FileLock(str(path) + ".lock", timeout=.1):
        day = datetime.now(timezone.utc).date().isoformat()
        value = _read(path)
        value = value if value.get("day") == day else {"day": day}
        seen = value.get(kind, [])
        if not isinstance(seen, list):
            return False
        fingerprint = hashlib.sha256(json.dumps({key: value for key, value in event.items()
                                                if key != "event_id"}, sort_keys=True).encode()).hexdigest()
        if seen:
            return False
        value[kind] = [*seen, fingerprint]
        atomic_write_text(path, json.dumps(value))
        return True


def _new_client(target, *, envelope_gate=None, delivery_callback=None):
    from sentry_sdk import Client
    from .reporting_transport import transport_class

    def permitted(permit):
        try:
            current = _consent(Path(permit["consent"]))
            return all(current.get(key) is True for key in FIELDS) and current["revision"] == permit["revision"]
        except Exception:
            return False

    def gate(envelope):
        if _disabled:
            return False
        if envelope_gate is not None:
            return envelope_gate(envelope)
        # 日志与会话汇总没有 extra，同意凭据在信封头；只有 Peach 自己组装、带凭据的信封能放行这两类条目。
        telemetry = "peach_permit" in envelope.headers
        if telemetry and not permitted(envelope.headers.pop("peach_permit")):
            return False
        for item in envelope.items:
            if (item.type in TELEMETRY_ITEMS) != telemetry:
                return False
            if telemetry:
                continue
            event = item.get_event()
            if event is None or not permitted(event.pop("extra", {})):
                return False
        for key in tuple(envelope.headers):
            if key not in {"event_id", "sent_at"}:
                del envelope.headers[key]
        return bool(envelope.items)

    def final_event(event, _hint):
        # SDK 的服务器名、上下文、SDK 包清单和全局 scope 均不进入发送载荷。
        result = {key: value for key, value in event.items() if key in {
            "event_id", "timestamp", "platform", "release", "environment", "dist", "level", "message", "tags", "exception", "extra",
        }}
        from .diagnostic_browser import clean_debug_meta
        if event.get("platform") == "javascript" and (metadata := clean_debug_meta(event.get("debug_meta"))):
            result["debug_meta"] = metadata
        return result

    return Client(dsn=target, transport=transport_class(gate, delivery_callback), default_integrations=False,
                  auto_enabling_integrations=False, auto_session_tracking=False,
                  send_default_pii=False, include_local_variables=False, include_source_context=False,
                  send_client_reports=False, enable_backpressure_handling=False,
                  enable_logs=False, enable_metrics=False, traces_sample_rate=0,
                  profiles_sample_rate=0, transport_queue_size=10, shutdown_timeout=0,
                  before_send=final_event)


def _connect(target):
    global _client, _client_dsn
    if _client is None or _client_dsn != target:
        if _client is not None:
            _client.close(timeout=0)
        _client, _client_dsn = _new_client(target), target
    return _client


def _permit(kind, config, current):
    return {"consent": str(config.directory("state") / "remote-reporting.json"),
            "kind": kind, "revision": current["revision"]}


def _attribute(value):
    kind = {bool: "boolean", int: "integer", float: "double"}.get(type(value), "string")
    return {"value": value if kind != "string" else str(value)[:200], "type": kind}


def _log_item(body, event, extra=None):
    """事件的版本、环境与白名单标签转成日志属性；不经过 SDK，避免附加主机名与追踪上下文。"""
    attributes = {"sentry.release": event.get("release", ""), "sentry.environment": event.get("environment", ""),
                  **({"sentry.dist": event["dist"]} if event.get("dist") else {}),
                  **event.get("tags", {}), **(extra or {})}
    return {"timestamp": datetime.now(timezone.utc).timestamp(), "trace_id": uuid.uuid4().hex,
            "level": "info", "body": body,
            "attributes": {key: _attribute(value) for key, value in attributes.items() if value != ""}}


def _submit_telemetry(kind, items, config, current, target):
    """日志与会话汇总组成一个信封交给同一传输；同意凭据只在信封头，闸门发送前移除。"""
    from sentry_sdk.envelope import Envelope, Item, PayloadRef
    from sentry_sdk.utils import format_timestamp
    with _lock:
        client = _connect(target)
        from .reporting_delivery import record
        receipt = uuid.uuid4().hex
        permit = {**_permit(kind, config, current), "receipt": receipt}
        envelope = Envelope(headers={"sent_at": format_timestamp(datetime.now(timezone.utc)), "peach_permit": permit})
        logs = [item for item in items if "body" in item]
        if logs:
            envelope.add_item(Item(type="log", content_type="application/vnd.sentry.items.log+json",
                                   headers={"item_count": len(logs)},
                                   payload=PayloadRef(json={"version": 2, "items": logs})))
        for session in (item for item in items if "aggregates" in item):
            envelope.add_item(Item(type="sessions", payload=PayloadRef(json=session)))
        record(permit, receipt, {"status": "queued"})
        if client.transport is None:
            return False
        client.transport.capture_envelope(envelope)
        return True


def _submit(kind, event, config, current, target):
    with _lock:
        client = _connect(target)
        from .reporting_delivery import record
        permit = _permit(kind, config, current)
        event_id = event.get("event_id") or uuid.uuid4().hex
        record(permit, event_id, {"status": "queued"})
        accepted = client.capture_event({**event, "event_id": event_id,
            "platform": event.get("platform", "python"), "extra": permit})
        if not accepted:
            record(permit, event_id, {"status": "failed", "reason": "queue_full"})
        return accepted


def _schedule_frequency(config):
    global _frequency_timer
    with _lock:
        _frequency_configs[str(config.directory("state"))] = config
        if _frequency_timer is None:
            _frequency_timer = threading.Timer(60, _frequency_tick)
            _frequency_timer.daemon = True
            _frequency_timer.start()


def _frequency_tick():
    global _frequency_timer
    with _lock:
        _frequency_timer = None
        configs = list(_frequency_configs.values())
    for config in configs:
        flush_counts(config)
    with _lock:
        if _frequency_configs and not _disabled:
            _schedule_frequency(next(iter(_frequency_configs.values())))


def _count_logs(config, current, target):
    """计数日志带整数 `occurrence_count`，接收端可按诊断键、日期与版本直接求和。"""
    def submit(counts):
        items = []
        for event in counts:
            values = event.get("exception", {}).get("values", [])
            extra = {"occurrence_count": int(event["tags"]["occurrence_count"]),
                     **({"exception_type": values[-1].get("type", "")} if values else {})}
            items.append(_log_item("Peach diagnostic count", event, extra))
        return _submit_telemetry("errors", items, config, current, target)
    return submit


def flush_counts(config=None, *, force=False):
    try:
        from . import diagnostic_frequency
        config = _config(config)
        current, target = consent(config), dsn()
        if _disabled or not current["errors"] or not target:
            return
        diagnostic_frequency.flush(config, current["revision"],
            lambda event: _submit("errors", event, config, current, target),
            _count_logs(config, current, target), force=force)
    except Exception:
        pass


def send(kind, event, config=None):
    """发送失败不影响应用；技术诊断按同意版本聚合，关闭时不初始化 SDK。"""
    if _disabled:
        return
    try:
        config = _config(config)
        current = consent(config)
        target = dsn()
        if kind not in FIELDS or not current[kind] or not target:
            return
        metadata = event_metadata(kind)
        event = {**event, **metadata, "tags": {**event.get("tags", {}), **metadata["tags"]}}
        if kind == "errors":
            from . import diagnostic_frequency
            diagnostic_frequency.record(config, current["revision"], event,
                lambda batch: _submit(kind, batch, config, current, target),
                _count_logs(config, current, target))
            _schedule_frequency(config)
        elif _reserve(config, kind, event):
            # 版本统计是一条日志加一条会话汇总，不占错误事件额度（ADR-0132）。
            day = datetime.now(timezone.utc).date().isoformat()
            session = {"attrs": {"release": event["release"], "environment": event["environment"]},
                       "aggregates": [{"started": f"{day}T00:00:00Z", "exited": 1}]}
            _submit_telemetry(kind, [_log_item(event.get("message", ""), event), session], config, current, target)
        return True
    except Exception:
        # 不能把遥测自身故障写回错误钩子而递归发送。
        pass


def usage(config=None):
    send("usage", {"message": "Peach started", "level": "info",
                   "tags": {"os": platform.system(), **machine_facts()}}, config)
    flush_counts(config)
    try:
        if not _disabled and consent(config)["errors"] and dsn():
            _schedule_frequency(_config(config))
    except Exception:
        pass


def _http_status(error):
    status = getattr(error, "status_code", None)
    if type(status) is not int or not 100 <= status <= 599:
        status = getattr(getattr(error, "response", None), "status_code", None)
    if type(status) is not int and any(cls.__module__ == "urllib.error" and cls.__name__ == "HTTPError"
                                      for cls in type(error).__mro__):
        status = getattr(error, "code", None)
    return status if type(status) is int and 100 <= status <= 599 else None


def _exception_details(error):
    from .diagnostic_exceptions import project
    return project(error, _http_status)


def _media_failure(stage, error):
    return stage in MEDIA_STAGES or any(cls.__module__ == 'peach.transcodes'
        and cls.__name__ == 'TranscodeUnavailable' for cls in type(error).__mro__)


def _expected_failure(stage, error, fields):
    kinds = {(cls.__module__, cls.__name__) for cls in type(error).__mro__}
    unsupported = ('peach.folder_picker', 'PickerUnsupported')
    if unsupported in kinds:
        return True
    if ('starlette.exceptions', 'HTTPException') in kinds:
        status = _http_status(error)
        if status == 501:
            cause = getattr(error, '__cause__', None)
            if unsupported in {(cls.__module__, cls.__name__) for cls in type(cause).__mro__}:
                return True
        if status in {502, 503, 504}:
            # 路由主动报告上游不可用；未处理异常走 500，仍然上报。
            return True
    name = getattr(error, "sqlite_errorname", "")
    if isinstance(name, str) and name.startswith(LOCAL_SQLITE_ERRORS):
        return True
    if stage == "logging" and fields.get("level", "ERROR") not in {"ERROR", "CRITICAL"}:
        return True
    if stage == "browser" and fields.get("error_name") == "AbortError":
        return True
    if kinds & LOCAL_EXCEPTION_TYPES:
        return True
    if ("peach.sources.base", "SourceFailure") in kinds:
        return str(error.reason) in {"cloudflare_challenge", "ip_banned", "geo_restricted", "auth_required",
            "not_found", "gone", "no_usable_metadata", "rate_limited", "timeout", "server_error", "network"}
    if ("peach.metadata", "MetadataProviderError") in kinds and error.detail != "parse_error":
        return error.kind in {"auth", "not_found"} or error.retryable is True or error.temporary is True
    if _media_failure(stage, error):
        detail = getattr(error, "diagnostics", {})
        if (isinstance(error, (subprocess.TimeoutExpired, TimeoutError))
                or isinstance(detail, dict) and detail.get("reason") == "timeout"):
            return True
        if isinstance(error, OSError) and error.errno in (errno.ENOSPC, errno.EIO):
            return True
        if isinstance(error, (FileNotFoundError, PermissionError, IsADirectoryError, NotADirectoryError)):
            filename = getattr(error, "filename", None)
            if filename and Path(filename).name != Path(str(fields.get("tool", ""))).name:
                return True
    return False


def _actionable(stage, error, fields):
    """仅允许技术故障入口；预期领域状态和 SDK 自身日志留在本机。"""
    if str(fields.get("logger", "")).startswith(("sentry_sdk", "urllib3")):
        return False
    if stage == "unhandled-asyncio":
        from .error_reporting import is_asyncio_connection_cleanup
        if is_asyncio_connection_cleanup(error, fields):
            return False
    stages = {"browser", "http-request", "unhandled-main", "unhandled-thread", "unraisable",
              "unhandled-asyncio", "cli", "packaged-cli", "desktop-entry", "tray-import",
              "background-job", "library-preview", "frame-capture", "frame-tile", "media-probe",
              "preview", "standalone-update-install", "standalone-update-rollback", "logging"}
    if stage not in stages or isinstance(error, (SystemExit, KeyboardInterrupt)):
        return False
    if _expected_failure(stage, error, fields):
        return False
    if stage == "http-request" and fields.get("status_code", 500) < 500:
        return False
    if (status := _http_status(error)) is not None and 400 <= status < 500:
        return False
    return True


def _http_details(stage, fields):
    tags, error_id = {}, ""
    if stage != "http-request":
        return tags, error_id
    if fields.get("method") in {"GET", "HEAD", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"}:
        tags["http_method"] = fields["method"]
    route = fields.get("route", "")
    if isinstance(route, str) and re.fullmatch(r"[a-zA-Z0-9_/{}/:-]{1,180}", route):
        tags["route_template"] = route
    candidate = fields.get("error_id", "")
    if isinstance(candidate, str) and re.fullmatch(r"[a-f0-9]{32}", candidate):
        error_id = candidate
    return tags, error_id


def _technical_projection(stage, error, fields):
    """投影各入口的故障证据，排除缺少定位信息与已知媒体输入条件的记录。"""
    media_stage = _media_failure(stage, error)
    if error is None and stage != "browser" and not media_stage:
        return
    values, codes, _chain = _exception_details(error)
    debug_meta = None
    if error is None and stage == "browser":
        from .diagnostic_browser import project
        value, debug_meta = project(fields)
        if not value["stacktrace"]["frames"]:
            return
        values = [value]
    if stage == "logging" and not any("module" not in frame for value in values for frame in value["stacktrace"]["frames"]):
        return
    for key in ("returncode", "status_code"):
        if type(fields.get(key)) is int:
            codes[key] = fields[key]
    reason = ""
    if media_stage:
        reason = media_details(error, fields, codes)
        if reason in {"invalid_media", "permission_denied", "disk_full", "missing_media", "io_error"}:
            return
        if not reason and not codes and error is None:
            return
    category = type(error).__name__ if error is not None else ("BrowserError" if stage == "browser" else "MediaToolError")
    if not values:
        values = [{"type": category, "value": reason or category, "stacktrace": {"frames": []}}]
    return values, codes, reason, debug_meta


def capture(stage, error=None, **fields):
    """只投影代码位置和错误类别，不发送异常文本或日志文本。"""
    if not _actionable(stage, error, fields):
        return
    capture_key = (os.getpid(), id(error.__traceback__)) if error is not None else None
    if error is not None and getattr(error, "_peach_remote_capture", None) == capture_key:
        return
    projection = _technical_projection(stage, error, fields)
    if projection is None:
        return
    values, codes, reason, debug_meta = projection
    http, error_id = _http_details(stage, fields)
    event = {"level": "error", "tags": {"os": platform.system(),
        "python": platform.python_version(), "architecture": platform.machine(), "stage": stage,
        **http, **{key: str(value) for key, value in codes.items()}, **({"media_failure": reason} if reason else {})},
        "exception": {"values": values}}
    if stage == "browser":
        event["platform"] = "javascript"
        if debug_meta:
            event["debug_meta"] = debug_meta
    if error_id:
        event["event_id"] = error_id
    if send("errors", event) and error is not None:
        try:
            error._peach_remote_capture = capture_key
        except (AttributeError, TypeError):
            pass


def disable_for_process():
    """本进程停止远程发送，保留本机选择。"""
    global _disabled
    _disabled = True
    close()


def close():
    global _client, _client_dsn, _frequency_timer
    with _lock:
        if _frequency_timer is not None:
            _frequency_timer.cancel()
        _frequency_timer = None
        _frequency_configs.clear()
        if _client is not None:
            _client.close(timeout=0)
        _client, _client_dsn = None, ""


def _shutdown():
    try:
        with _lock:
            configs = list(_frequency_configs.values())
        for config in configs:
            flush_counts(config, force=True)
        with _lock:
            if _client is not None:
                _client.flush(timeout=1)
            close()
    except Exception:
        pass


atexit.register(_shutdown)
