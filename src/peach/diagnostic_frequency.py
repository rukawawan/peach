"""跨进程聚合已筛选的技术诊断；不读取日志或账本。

同一诊断键在本机只上传一次错误事件，之后的发生次数按间隔合并成计数日志（ADR-0132）。
"""
from __future__ import annotations

import hashlib
import json
from datetime import datetime, timedelta, timezone

from filelock import FileLock

from .fsutil import atomic_write_text

INTERVAL = 6 * 3600
EVENT_LIMIT = 5
NEW_KEY_LIMIT = 20
RETENTION_DAYS = 7


def _now():
    return datetime.now(timezone.utc)


def _path(config):
    return config.directory("state") / "remote-reporting-frequency.json"


def _valid(key, row, cutoff, day):
    return (isinstance(key, str) and len(key) == 64 and isinstance(row, dict)
            and isinstance(row.get("day"), str) and cutoff <= row["day"] <= day
            and isinstance(row.get("first"), str) and row["first"] <= row["day"]
            and isinstance(row.get("event"), dict) and type(row.get("sent")) is bool
            and type(row.get("total")) is int and type(row.get("submitted")) is int
            and 0 <= row["submitted"] <= row["total"]
            and type(row.get("last_logged")) in (int, float))


def _load(path, revision, now):
    try:
        state = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, ValueError, UnicodeError):
        state = {}
    if not isinstance(state, dict) or state.get("revision") != revision:
        state = {"revision": revision, "records": {}}
    day = now.date().isoformat()
    if state.get("day") != day:
        state.update(day=day, events=0)
    cutoff = (now.date() - timedelta(days=RETENTION_DAYS - 1)).isoformat()
    records = state.get("records", {})
    if not isinstance(records, dict):
        records = {}
    state["records"] = {key: row for key, row in records.items() if _valid(key, row, cutoff, day)}
    if type(state.get("events")) is not int or state["events"] < 0:
        state["events"] = 0
    return state


def _tags(row, key, count):
    return {**row["event"].get("tags", {}), "diagnostic_key": key,
            "occurrence_day": row["day"], "occurrence_count": str(count)}


def _emit_event(state, row, key, emit, *, event_id=None):
    """诊断键的首次错误事件只携带一次发生，其余次数交给计数日志。"""
    if row["sent"] or row["total"] - row["submitted"] <= 0 or state["events"] >= EVENT_LIMIT:
        return
    event = {**row["event"], "tags": _tags(row, key, 1)}
    if event_id:
        event["event_id"] = event_id
    try:
        accepted = emit(event)
    except Exception:
        accepted = False
    if accepted:
        row.update(sent=True, submitted=row["submitted"] + 1)
        state["events"] += 1


def _emit_counts(rows, now, log, *, force=False):
    """已上传首次事件的诊断键，把未提交次数合并成一批计数日志。"""
    due = [(key, row) for key, row in rows
           if row["sent"] and row["total"] > row["submitted"]
           and (force or row["day"] != now.date().isoformat()
                or now.timestamp() - row["last_logged"] >= INTERVAL)]
    if not due:
        return
    counts = [{**row["event"], "tags": _tags(row, key, row["total"] - row["submitted"])} for key, row in due]
    try:
        accepted = log(counts)
    except Exception:
        accepted = False
    if accepted:
        for _key, row in due:
            row.update(submitted=row["total"], last_logged=now.timestamp())


def _roll(row, key, now, log):
    """跨 UTC 日先提交前一天的次数，计数日志的统计日期是实际发生日；提交失败的旧次数不再保留。"""
    day = now.date().isoformat()
    if row["day"] == day or not row["sent"]:
        return
    _emit_counts([(key, row)], now, log, force=True)
    row.update(day=day, total=0, submitted=0, last_logged=now.timestamp())


def record(config, revision, event, emit, log):
    """记录一次筛选后的故障；新诊断键立即上传错误事件，重复发生只累计次数。"""
    path = _path(config)
    path.parent.mkdir(parents=True, exist_ok=True)
    with FileLock(str(path) + ".lock", timeout=.1):
        now = _now()
        state = _load(path, revision, now)
        sample = {key: value for key, value in event.items() if key != "event_id"}
        key = hashlib.sha256(json.dumps(sample, sort_keys=True).encode()).hexdigest()
        day = now.date().isoformat()
        records = state["records"]
        if key not in records:
            if sum(row["first"] == day for row in records.values()) >= NEW_KEY_LIMIT:
                return
            records[key] = {"event": sample, "first": day, "day": day, "sent": False,
                            "total": 0, "submitted": 0, "last_logged": now.timestamp()}
        row = records[key]
        _roll(row, key, now, log)
        row["total"] += 1
        _emit_event(state, row, key, emit, event_id=event.get("event_id"))
        atomic_write_text(path, json.dumps(state))


def flush(config, revision, emit, log, *, force=False):
    """补传额度不足时推迟的首次事件，并按间隔提交计数日志；退出时可提前提交。"""
    path = _path(config)
    if not path.exists():
        return
    with FileLock(str(path) + ".lock", timeout=.1):
        now = _now()
        state = _load(path, revision, now)
        for key, row in state["records"].items():
            _emit_event(state, row, key, emit)
        _emit_counts(state["records"].items(), now, log, force=force)
        atomic_write_text(path, json.dumps(state))


def clear(config):
    path = _path(config)
    path.parent.mkdir(parents=True, exist_ok=True)
    with FileLock(str(path) + ".lock", timeout=.1):
        path.unlink(missing_ok=True)
