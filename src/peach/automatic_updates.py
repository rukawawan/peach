"""本机软件更新偏好与定时检查，复用发行查询、下载事务和 APScheduler。"""
from __future__ import annotations

import json
import time
from pathlib import Path

from apscheduler.schedulers.background import BackgroundScheduler
from filelock import FileLock, Timeout

from . import distribution, interface_text, release_updates, standalone_update
from .fsutil import atomic_write_text
from .user_messages import UserValueError


class AutomaticUpdates:
    def __init__(self, root: Path, *, available: bool):
        self.path = root / "automatic-updates.json"
        self.available = available
        self.scheduler = BackgroundScheduler(timezone="UTC", daemon=True)

    def read(self) -> dict:
        try:
            data = json.loads(self.path.read_text(encoding="utf-8"))
            if (not isinstance(data, dict) or data.get("mode") not in ("off", "check", "download")
                    or type(data.get("interval_hours")) is not int or data["interval_hours"] not in (6, 24, 168)):
                raise ValueError("invalid settings")
            return data
        except FileNotFoundError:
            return {"mode": "check", "interval_hours": 24}
        except (OSError, ValueError):
            return {"mode": "off", "interval_hours": 24, "error": interface_text.text("server:errors.automaticUpdates.unreadable"),
                    "error_code": "errors.automaticUpdates.unreadable"}

    def snapshot(self) -> dict:
        data = self.read()
        result = data.get("result")
        if isinstance(result, dict):
            if (data.get('listing_rule') == release_updates.LISTING_RULE
                    and result.get("current_version") == release_updates.snapshot()["current_version"]):
                data["result"] = dict(result, checked_at=data.get("checked_at"))
            else:
                data.pop("result")
        data.pop('listing_rule', None)
        return dict(data, available=self.available, download_available=distribution.in_app_update())

    def remember(self, result: dict) -> None:
        """手动检查与后台检查共享最近一次结果。"""
        self.path.parent.mkdir(parents=True, exist_ok=True)
        try:
            with FileLock(str(self.path) + ".lock", timeout=0):
                data = self.read()
                data.pop("error", None)
                data.pop("error_code", None)
                self.write(dict(data, checked_at=time.time(), result=result,
                                listing_rule=release_updates.LISTING_RULE))
        except Timeout:
            pass

    def write(self, data: dict) -> None:
        atomic_write_text(self.path, json.dumps(data, ensure_ascii=False))

    def save(self, body: dict) -> dict:
        if not self.available:
            raise UserValueError("errors.automaticUpdates.needsTray")
        mode, hours = body.get("mode"), body.get("interval_hours")
        if mode not in ("off", "check", "download"):
            raise UserValueError("errors.automaticUpdates.chooseMode")
        if type(hours) is not int or hours not in (6, 24, 168):
            raise UserValueError("errors.automaticUpdates.chooseInterval")
        if mode == "download" and not distribution.in_app_update():
            raise UserValueError("errors.automaticUpdates.downloadUnsupported")
        self.path.parent.mkdir(parents=True, exist_ok=True)
        with FileLock(str(self.path) + ".lock", timeout=0):
            current = self.read()
            if current.get("mode") == mode and current.get("interval_hours") == hours and not current.get("error"):
                return self.snapshot()
            self.write({"mode": mode, "interval_hours": hours})
        return self.snapshot()

    def tick(self) -> None:
        if not self.available or self.read()["mode"] == "off":
            return
        try:
            with FileLock(str(self.path) + ".lock", timeout=0):
                data = self.read()
                if data["mode"] == "off":
                    return
                now = time.time()
                if data.get('listing_rule') != release_updates.LISTING_RULE:
                    data.pop('result', None)
                    last = 0
                else:
                    last = data.get("checked_at", 0)
                if isinstance(last, (int, float)) and 0 <= now - last < data["interval_hours"] * 3600:
                    return
                # 先落检查时间；进程中断后也按频率重试，多服务共用这一份记录。
                self.write(dict(data, checked_at=now, listing_rule=release_updates.LISTING_RULE))
                result = release_updates.check()
                data.pop("error", None)
                data.pop("error_code", None)
                data = dict(data, checked_at=now, result=result, listing_rule=release_updates.LISTING_RULE)
                self.write(data)
                # 以前在 macOS 独立包上存下的「自动下载」只按检查处理：那里没有应用内安装。
                if data["mode"] == "download" and distribution.in_app_update() and result["state"] == "available":
                    job = standalone_update.public()
                    if job["state"] not in standalone_update.ACTIVE | {"ready"}:
                        try:
                            standalone_update.start()
                        except (ValueError, Timeout) as exc:
                            self.write(dict(data, error=str(exc)))
        except Timeout:
            return

    def start(self) -> None:
        if self.available:
            self.scheduler.add_job(self.tick, "interval", seconds=60, max_instances=1, coalesce=True)
            self.scheduler.start()

    def stop(self) -> None:
        if self.scheduler.running:
            self.scheduler.shutdown(wait=False)
