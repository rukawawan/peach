"""明确同意的馆藏与口味明细，与错误诊断使用独立接收项目。"""
from __future__ import annotations

import gzip
import io
import json
import logging
import threading
import time
import uuid
from datetime import datetime, timezone
from urllib.parse import urlsplit

from . import __version__, interface_text, remote_reporting
from .fsutil import atomic_write_text
from .user_messages import UserValueError

SCHEMA = 6
CONSENT_SCHEMA = 5
MAX_BYTES = 18 * 1024 * 1024
MAX_RAW_BYTES = 100 * 1024 * 1024
FILENAME = "peach-library-taste.json.gz"
#: 维护页「上传哪些字段」逐条说明的 code（ADR-0159）；文字在 `labels.librarySharing.field.<id>`。
FIELD_CODES = (
    "labels.librarySharing.field.works", "labels.librarySharing.field.preferences",
    "labels.librarySharing.field.counts", "labels.librarySharing.field.capacity",
    "labels.librarySharing.field.instance", "labels.librarySharing.field.participation",
    "labels.librarySharing.field.version",
)
NOTICE_CODE = "labels.librarySharing.notice"


def _text(code: str) -> str:
    return interface_text.text(f"server:{code}")


def _path(config):
    return config.directory("state") / "library-sharing.json"


def _state_path(config):
    return config.directory("state") / "library-sharing-attempt.json"


def _state_lock(config):
    from filelock import FileLock
    path = _state_path(config)
    path.parent.mkdir(parents=True, exist_ok=True)
    return FileLock(str(path) + ".lock", timeout=5)


def _period():
    return datetime.now(timezone.utc).strftime("%G-W%V")


def _used(value, period):
    return value.get("period") == period and (value.get("attempted") is True
        or ("attempted" not in value and value.get("status") in {"attempted", "failed"}))


def useful_payload(payload):
    """公共编号或任一偏好分组提供可分析内容。"""
    window = payload['capacity']['windows']['30d']
    return bool(payload["library"] or any(payload["preferences"].values())
                or window['observed_days'] or window['activity_observed_days'] or window['cleaned_bytes'] is not None)


def valid_consent_version(value):
    """同意范围版本独立于上传格式，兼容同一范围的历史记录。"""
    version = value.get('consent_schema')
    legacy = value.get('schema')
    if 'consent_schema' not in value and type(legacy) is int and legacy in (5, 6):
        version = 5
    return type(version) is int and version == CONSENT_SCHEMA


def consent(config):
    from .research_participation import instance
    value = remote_reporting._read(_path(config))
    return value if (value.get("enabled") is True and valid_consent_version(value)
                     and instance(value.get('research_instance')) and instance(value.get('revision'))) else {}


def consent_state(config):
    value = remote_reporting._read(_path(config))
    if value.get('enabled') is False:
        return 'disabled'
    if value.get('enabled') is True:
        return 'enabled' if consent(config) else 'needs-consent'
    return 'not-selected'


def save_choice(config, enabled):
    """保存设置页或安装器的主动选择，不读取馆藏或初始化上传。"""
    if type(enabled) is not bool:
        raise UserValueError("errors.librarySharing.choiceNotBoolean")
    value = {"enabled": enabled, "schema": SCHEMA, "consent_schema": CONSENT_SCHEMA, "revision": uuid.uuid4().hex,
             "selected_at": datetime.now(timezone.utc).isoformat()}
    with _state_lock(config):
        previous = remote_reporting._read(_path(config))
        granted = consent(config)
        if enabled:
            value['research_instance'] = uuid.uuid4().hex
        elif previous.get('enabled') is False and valid_consent_version(previous):
            value = previous
        elif granted:
            value['closing'] = {'research_instance': granted['research_instance'],
                                'authorization': granted['revision'], 'event_id': uuid.uuid4().hex}
        atomic_write_text(_path(config), json.dumps(value))
        state = remote_reporting._read(_state_path(config))
        if state.get("status") == "queued":
            status = "unknown" if state.get("attempted") else "blocked"
            atomic_write_text(_state_path(config), json.dumps({**state, "status": status, "reason": "consent"}))
    return snapshot(config)


def target():
    destination = remote_reporting.dsn("PEACH_LIBRARY_SENTRY_DSN", "library_dsn")
    diagnostic = remote_reporting.dsn()
    first, second = urlsplit(destination), urlsplit(diagnostic)
    if destination and diagnostic and (first.hostname, first.path) == (second.hostname, second.path):
        return ""
    return destination


def snapshot(config):
    from .research_participation import snapshot as participation_snapshot
    attempt = remote_reporting._read(config.directory("state") / "library-sharing-attempt.json")
    last_attempt = attempt_evidence(config)
    if (attempt.get('status') == 'attempted' and attempt.get('schema') == SCHEMA
            and attempt.get('period') == _period()):
        last_attempt = {'period': attempt['period'], 'status': 'unknown', 'attempted': True}
    return {"enabled": bool(consent(config)), 'consent_state': consent_state(config), "available": bool(target()),
            "schema": SCHEMA, "fields": [_text(code) for code in FIELD_CODES], "field_codes": list(FIELD_CODES),
            "notice": _text(NOTICE_CODE), "notice_code": NOTICE_CODE,
            'participation': participation_snapshot(config),
            'last_sent_at': attempt.get('last_sent_at'),
            "last_attempt": last_attempt}


def attempt_evidence(config):
    """仅导出当前授权的快照回执字段，授权凭据留在本机。"""
    current = consent(config)
    value = remote_reporting._read(_state_path(config))
    if (not current or value.get('revision') != current['revision'] or value.get('schema') != SCHEMA
            or value.get('period') != _period()):
        return {}
    result = {key: value[key] for key in ('period', 'status', 'attempted', 'raw_bytes', 'compressed_bytes', 'reason')
              if key in value}
    result['snapshot_id'] = value.get('attempt_id')
    if result.get('status') == 'queued' and result.get('attempted'):
        result['status'] = 'unknown'
    from .research_participation import valid_snapshot
    return result if valid_snapshot(result) else {}


def collect(contract):
    """在本机生成群体分析投影，不读取浏览历史或写入缓存。"""
    from .library_research import project
    from .capacity_history import project as capacity_projection
    with contract.read_connection() as connection:
        connection.execute("BEGIN")
        projection = project(connection)
    payload = {"schema": SCHEMA, "peach": __version__, "period": datetime.now(timezone.utc).strftime("%G-W%V"),
               **projection, 'capacity': capacity_projection(getattr(contract, 'upgrade_config', None))}
    data = json.dumps(payload, ensure_ascii=False, allow_nan=False, separators=(",", ":")).encode()
    if len(data) > MAX_RAW_BYTES:
        raise UserValueError("errors.librarySharing.tooLarge")
    return payload, data


def compressed(data):
    """使用无文件名和时间戳的 gzip 附件，保持全部 JSON 字段。"""
    wire = gzip.compress(data, mtime=0)
    if len(wire) > MAX_BYTES:
        raise UserValueError("errors.librarySharing.compressedTooLarge")
    return wire


def valid_payload(payload):
    from .library_research import valid_projection
    from .capacity_history import valid_projection as valid_capacity
    if (not isinstance(payload, dict) or set(payload) != {"schema", "peach", "period", "library", "preferences", "coverage", "capacity"}
            or type(payload["schema"]) is not int or payload["schema"] != SCHEMA or payload["peach"] != __version__
            or payload["period"] != datetime.now(timezone.utc).strftime("%G-W%V")
            or not isinstance(payload["library"], list) or not isinstance(payload["preferences"], dict)):
        return False
    return valid_projection(payload, controlled_tags=True) and valid_capacity(payload['capacity'])


class Service:
    def __init__(self, config, contract):
        self.config, self.contract = config, contract
        self._stop = threading.Event()
        self._wake = threading.Event()
        self._thread = None
        self._preview = None
        self._lock = threading.RLock()
        from .research_participation import Service as ParticipationService
        self.participation = ParticipationService(config, target=target, stopping=self._stop)

    def preview(self):
        payload, data = collect(self.contract)
        size = len(compressed(data))
        token = uuid.uuid4().hex
        with self._lock:
            self._preview = token, time.monotonic() + 600
        return {"data": payload, "bytes": len(data), "compressed_bytes": size, "token": token, "schema": SCHEMA}

    def save(self, body):
        if type(body.get("enabled")) is not bool:
            raise UserValueError("errors.librarySharing.choiceNotBoolean")
        with self._lock:
            if body["enabled"] and (not self._preview or body.get("preview_token") != self._preview[0]
                    or time.monotonic() > self._preview[1]
                    or body.get("consent") is not True or body.get("schema") != SCHEMA):
                raise UserValueError("errors.librarySharing.previewFirst")
            save_choice(self.config, body["enabled"])
            self._preview = None
        self._wake.set()
        return snapshot(self.config)

    def _gate(self, revision, envelope, attempt_id=None):
        current = consent(self.config)
        if self._stop.is_set() or not current or current.get("revision") != revision:
            return False
        if len(envelope.items) != 2 or [item.type for item in envelope.items] != ["event", "attachment"]:
            return False
        attachment = envelope.items[1]
        if attachment.headers.get("filename") != FILENAME:
            return False
        data = attachment.payload.get_bytes()
        if len(data) > MAX_BYTES:
            return False
        try:
            with gzip.GzipFile(fileobj=io.BytesIO(data)) as archive:
                raw = archive.read(MAX_RAW_BYTES + 1)
            if len(raw) > MAX_RAW_BYTES:
                return False
            payload = json.loads(raw)
            if not valid_payload(payload) or not useful_payload(payload):
                return False
        except (ValueError, KeyError, TypeError, OSError, EOFError):
            return False
        event = envelope.items[0].get_event()
        for key in tuple(event):
            if key not in {"event_id", "timestamp", "platform"}:
                del event[key]
        metadata = remote_reporting.event_metadata("research")
        event.update(**metadata, message="Peach library and taste research", level="info")
        event["tags"].update(schema=str(SCHEMA), period=payload["period"])
        event['tags']['research_instance'] = current['research_instance']
        if attempt_id:
            event['tags']['snapshot_id'] = attempt_id
        event['tags'].update(raw_bytes=str(len(raw)), compressed_bytes=str(len(data)))
        for key in tuple(envelope.headers):
            if key not in {"event_id", "sent_at"}:
                del envelope.headers[key]
        if attempt_id is None:
            return True
        with _state_lock(self.config):
            current = consent(self.config)
            state = remote_reporting._read(_state_path(self.config))
            if (self._stop.is_set() or not current or current.get("revision") != revision
                    or state.get("attempt_id") != attempt_id or state.get("revision") != revision
                    or state.get("period") != _period() or state.get("status") != "queued"
                    or _used(state, _period())):
                return False
            atomic_write_text(_state_path(self.config), json.dumps({**state, "attempted": True}))
        return True

    def _delivery(self, identity, result):
        """仅更新当前投递的脱敏回执，不把 HTTP 接收解释为留存。"""
        if result.get("status") not in {"accepted", "failed", "unknown", "blocked"}:
            return
        with _state_lock(self.config):
            state = remote_reporting._read(_state_path(self.config))
            if (any(state.get(key) != value for key, value in identity.items())
                    or consent(self.config).get("revision") != identity["revision"]
                    or state.get("status") not in {"queued", "unknown"}):
                return
            if state.get("status") == "unknown" and result["status"] == "unknown":
                return
            status = result["status"]
            if status == "unknown" and not state.get("attempted"):
                status = "failed"
            value = {key: value for key, value in state.items() if key not in {"reason", "status_code"}}
            value["status"] = status
            if status == 'accepted':
                value['last_sent_at'] = datetime.now(timezone.utc).isoformat()
            if type(result.get("status_code")) is int and 100 <= result["status_code"] <= 599:
                value["status_code"] = result["status_code"]
            if result.get("reason") in {"network", "http_status", "rate_limit", "queue_full", "consent", "disabled", "unknown"}:
                value["reason"] = result["reason"]
            atomic_write_text(_state_path(self.config), json.dumps(value))

    def attempt(self):
        current, destination = consent(self.config), target()
        if not current or not destination or self._stop.is_set():
            return
        period = _period()
        state = _state_path(self.config)
        with _state_lock(self.config):
            previous = remote_reporting._read(state)
            if _used(previous, period):
                return
        identity = {"schema": SCHEMA, "period": period, "revision": current["revision"], "attempt_id": uuid.uuid4().hex}
        value = {**identity, "attempted": False}
        if previous.get('last_sent_at'):
            value['last_sent_at'] = previous['last_sent_at']
        stage = "collection"
        try:
            payload, data = collect(self.contract)
            value['raw_bytes'] = len(data)
            if useful_payload(payload):
                stage = "compression"
                data = compressed(data)
                value['compressed_bytes'] = len(data)
                value["status"] = "queued"
            else:
                value["status"] = "waiting-data"
        except Exception:
            value.update(status="failed", reason=stage)
        with _state_lock(self.config):
            if (consent(self.config).get("revision") != identity["revision"] or _period() != period
                    or _used(remote_reporting._read(state), period)):
                return
            atomic_write_text(state, json.dumps(value))
        if value["status"] != "queued":
            return
        client = None
        try:
            from sentry_sdk.attachments import Attachment
            client = remote_reporting._new_client(destination,
                envelope_gate=lambda envelope: self._gate(current["revision"], envelope, identity["attempt_id"]),
                delivery_callback=lambda result: self._delivery(identity, result))
            client.capture_event({"message": "Peach library and taste research", "level": "info",
                                  **remote_reporting.event_metadata("research")},
                                 hint={"attachments": [Attachment(bytes=data, filename=FILENAME,
                                                                  content_type="application/gzip")]})
            client.flush(timeout=5)
        except Exception:
            pass
        finally:
            try:
                if client is not None:
                    client.close(timeout=0)
            finally:
                self._delivery(identity, {"status": "unknown", "reason": "unknown"})

    def start(self):
        if self._thread and self._thread.is_alive():
            return
        self._stop.clear()
        def run():
            while not self._stop.is_set():
                self.sample_capacity()
                try:
                    self.attempt()
                except Exception:
                    # 分享失败不把数据或错误原文转交诊断通道。
                    pass
                try:
                    self.participation.attempt()
                except Exception:
                    # 每日联系携带本轮快照状态，失败与快照分别保留回执。
                    pass
                self._wake.wait(3600)
                self._wake.clear()
        self._thread = threading.Thread(target=run, name="PeachLibrarySharing", daemon=True)
        self._thread.start()

    def sample_capacity(self):
        """研究日采样在分享后台运行，不让请求中的容量检查展开数据目录。"""
        from . import storage_budget
        current = consent(self.config)
        if not current or self._stop.is_set() or not storage_budget._history_due(self.config):
            return
        next_check = 0.0
        def active():
            nonlocal next_check
            if self._stop.is_set():
                raise InterruptedError("research capacity sampling stopped")
            now = time.monotonic()
            if now >= next_check:
                next_check = now + 2
                if consent(self.config).get('revision') != current['revision']:
                    raise InterruptedError("consent for research capacity sampling changed")
        try:
            data_bytes = storage_budget.data_usage(self.config, check=active)
            cache = storage_budget.cache_usage(self.config, check=active)
            if self._stop.is_set() or consent(self.config).get('revision') != current['revision']:
                return
            storage_budget.record_history(self.config, data_bytes=data_bytes, cache_bytes=cache['managed_cache_bytes'])
        except InterruptedError:
            return
        except (OSError, ValueError) as error:
            logging.getLogger(__name__).warning('Research capacity sample unavailable (%s)', type(error).__name__)

    def stop(self):
        self._stop.set()
        self._wake.set()
        if self._thread:
            self._thread.join(timeout=6)
