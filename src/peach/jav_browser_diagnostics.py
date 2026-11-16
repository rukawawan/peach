"""专用令牌范围内的脚本错误取证，只写本机白名单字段。"""
from collections import deque
from datetime import datetime
import re
import threading
import time

from fastapi import HTTPException

from . import error_reporting

KINDS = {"timeout", "network", "abort", "http", "invalid_response", "client_exception"}


def _validated_event(row, sites):
    from .jav_browser import code_key
    if not isinstance(row, dict):
        raise HTTPException(400, "error event must be an object")
    if (not all(isinstance(row.get(key), str) for key in ("kind", "operation", "site"))
            or row.get("kind") not in KINDS or row.get("operation") not in {"GET", "POST", "IDENTIFY"}
            or row.get("site") not in sites
            or not isinstance(row.get("id"), str) or not re.fullmatch(r"[a-f0-9-]{36}", row["id"])
            or not isinstance(row.get("script_version"), str)
            or not re.fullmatch(r"\d{1,3}\.\d{1,3}\.\d{1,3}", row["script_version"])
            or type(row.get("elapsed_ms")) is not int or not 0 <= row["elapsed_ms"] <= 3_600_000
            or type(row.get("status")) is not int or not 0 <= row["status"] <= 599):
        raise HTTPException(400, "error event has invalid fields")
    try:
        code = code_key(row["code"]) if row.get("code") else ""
        at = datetime.fromisoformat(str(row.get("at", "")))
        if at.tzinfo is None:
            raise ValueError()
    except (TypeError, ValueError):
        raise HTTPException(400, "error event has an invalid code or timestamp") from None
    return {**{key: row[key] for key in ("id", "kind", "operation", "site", "script_version",
                                        "elapsed_ms", "status")}, "code": code, "occurred_at": at.isoformat()}


class BrowserDiagnostics:
    def __init__(self):
        self._lock = threading.Lock()
        self._recent = deque()

    def record(self, data):
        from .jav_browser import source_sites
        events = data.get("events") if isinstance(data, dict) else None
        if not isinstance(events, list) or not 1 <= len(events) <= 10:
            raise HTTPException(400, "events must be a list of 1 to 10 items")
        sites = {site["id"] for site in source_sites()}
        clean = [_validated_event(row, sites) for row in events]
        with self._lock:
            now = time.monotonic()
            while self._recent and now - self._recent[0][0] >= 60:
                self._recent.popleft()
            known = {identity for _, identity in self._recent}
            fresh = {row["id"]: row for row in clean if row["id"] not in known}
            if len(self._recent) + len(fresh) > 20:
                raise HTTPException(429, "too many error events")
            for row in fresh.values():
                if error_reporting.local_event("userscript", **row) is None:
                    raise HTTPException(503, "error log is not writable")
                self._recent.append((now, row["id"]))
        return {"recorded": len(fresh)}
