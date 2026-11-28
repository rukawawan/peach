"""本机专用浏览器窗口的登录等待、取消与收尾。"""
from __future__ import annotations

import atexit
import logging
import math
import tempfile
import threading
import time
from contextlib import contextmanager, nullcontext
from pathlib import Path
from typing import Callable

from .browser_transport import BrowserLaunchFailed, BrowserUnavailable, _Browser, find_browser, proxy_flags
from .user_messages import UserValueError, message_fields, nested_message

IDLE, WAITING, DONE, CANCELLED, TIMEOUT, FAILED = "idle", "waiting", "done", "cancelled", "timeout", "failed"
WAIT_SECONDS = 600.0
POLL_SECONDS = 1.0


def private_browser(executable: str, profile: Path, options: dict, *, proxy_error: str,
                    standard_login: bool = False) -> _Browser:
    proxy = options.get("proxy", "")
    flags = proxy_flags(direct=not options.get("trust_env", True) and not proxy, proxy=proxy)
    if flags is None:
        raise BrowserLaunchFailed(proxy_error)
    private = "--inprivate" if "msedge" in Path(executable).name.lower() else "--incognito"
    return _Browser(executable, profile, (*flags, private), attended=True, standard_login=standard_login)


@contextmanager
def temporary_profile(root: Path, prefix: str):
    root.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(prefix=prefix, dir=root.resolve()) as directory:
        yield Path(directory)


def netscape_cookie_file(cookies: list[dict], hosts: frozenset[str]) -> str | None:
    now = time.time()
    rows = [row for cookie in cookies if (row := _cookie_row(cookie, hosts, now)) is not None]
    return "\n".join(("# Netscape HTTP Cookie File", *rows, "")) if rows else None


def _cookie_row(cookie: dict, hosts: frozenset[str], now: float) -> str | None:
    domain = cookie.get("domain", "")
    if not isinstance(domain, str) or domain.lstrip(".") not in hosts or cookie.get("partitionKey") is not None:
        return None
    path, name, value = cookie.get("path", ""), cookie.get("name", ""), cookie.get("value", "")
    if (not all(isinstance(field, str) for field in (path, name, value))
            or not path.startswith("/") or not name or any(
                ord(char) < 32 or ord(char) >= 127 for field in (path, name, value) for char in field)):
        return None
    expires = cookie.get("expires")
    if type(expires) not in (int, float) or not math.isfinite(expires):
        return None
    if not cookie.get("session") and expires <= now:
        return None
    session_expiry = "" if cookie.get("session") else str(int(expires))
    cookie_domain = f"#HttpOnly_{domain}" if cookie.get("httpOnly") else domain
    return "\t".join((cookie_domain, "TRUE" if domain.startswith(".") else "FALSE", path,
                      "TRUE" if cookie.get("secure") else "FALSE", session_expiry, name, value))


class AttendedBrowserLogin:
    """服务通过钩子读取和保存已登录会话，状态只保存文案和生命周期信息。"""

    login_url: str
    message_namespace: str
    browser_missing_code: str
    thread_name: str
    logger: logging.Logger

    def __init__(self, profile: Path, persist: Callable[[dict], bool | None], *,
                 find: Callable[[], str | None] = find_browser,
                 browser: Callable[[str, Path], _Browser],
                 clock: Callable[[], float] = time.monotonic, sleep: Callable[[float], None] = time.sleep,
                 wait_seconds: float = WAIT_SECONDS, on_done: Callable[[], None] | None = None):
        self.profile = Path(profile)
        self.persist = persist
        self._find, self._browser = find, browser
        self._clock, self._sleep = clock, sleep
        self.wait_seconds = wait_seconds
        self.on_done = on_done
        self._lock = threading.Lock()
        self._state = {"state": IDLE, "message": ""}
        self._cancel = threading.Event()
        self._thread: threading.Thread | None = None

    def available(self) -> bool:
        return self._find() is not None

    def status(self) -> dict:
        with self._lock:
            return dict(self._state)

    def start(self) -> dict:
        """一轮等待期间复用窗口，上一轮关闭后才能再次启动。"""
        with self._lock:
            if self._thread is not None and self._thread.is_alive():
                return dict(self._state)
            executable = self._find()
            if executable is None:
                raise UserValueError(self.browser_missing_code)
            self._before_start()
            self._set_state(WAITING)
            self._cancel = threading.Event()
            thread = self._thread = threading.Thread(target=self._run, args=(executable, self._cancel),
                                                     name=self.thread_name, daemon=True)
            atexit.register(self.close)
            thread.start()
            return dict(self._state)

    def cancel(self) -> dict:
        with self._lock:
            if self._state["state"] == WAITING:
                self._cancel.set()
                self._set_state(CANCELLED)
            return dict(self._state)

    def close(self) -> None:
        self.cancel()
        thread = self._thread
        if thread is not None and thread.is_alive() and thread is not threading.current_thread():
            thread.join(timeout=10)

    def _set_state(self, state: str, message: str = "", params: dict | None = None) -> None:
        self._state = {"state": state, **message_fields(f"{self.message_namespace}.{message or state}", params)}

    def _finish(self, state: str, message: str = "", params: dict | None = None) -> None:
        with self._lock:
            if self._state["state"] == WAITING:
                self._set_state(state, message, params)

    def _before_start(self) -> None:
        pass

    def _browser_profile(self):
        return nullcontext(self.profile)

    def _prepare_browser(self, browser: _Browser) -> None:
        pass

    def _read_capture(self, browser: _Browser) -> dict | None:
        raise NotImplementedError

    def _store_capture(self, values: dict) -> bool:
        return self.persist(values) is not False

    def _after_capture(self, browser: _Browser) -> None:
        pass

    def _browser_error(self, error: BrowserUnavailable) -> tuple[str, dict]:
        return "notOpened", {"error": nested_message(error)}

    def _run(self, executable: str, cancel: threading.Event) -> None:
        try:
            if cancel.is_set():
                return
            with self._browser_profile() as profile:
                browser = self._browser(executable, profile)
                try:
                    browser.start()
                    if cancel.is_set():
                        return
                    self._prepare_browser(browser)
                    browser.navigate(self.login_url)
                    browser.place(visible=True)
                    self._wait(browser, cancel)
                finally:
                    browser.close()
            if self.status()["state"] == DONE and self.on_done is not None:
                self.on_done()
        except BrowserUnavailable as error:
            self._finish(FAILED, *self._browser_error(error))
        except Exception as error:  # noqa: BLE001 —— 浏览器线程的异常要转成可轮询状态
            self.logger.error("%s: %s", self.thread_name, type(error).__name__)
            self._finish(FAILED, params={"type": type(error).__name__})
        finally:
            atexit.unregister(self.close)

    def _wait(self, browser: _Browser, cancel: threading.Event) -> None:
        deadline = self._clock() + self.wait_seconds
        while not cancel.is_set():
            if not browser.alive():
                self._finish(CANCELLED, "windowClosed")
                return
            try:
                values = self._read_capture(browser)
            except TimeoutError:
                values = None
            except RuntimeError:
                # 导航会销毁上一页的执行环境，下一轮等新文档。
                values = None
            except (OSError, ValueError):
                self._finish(CANCELLED, "windowClosed")
                return
            if values is not None:
                with self._lock:
                    if cancel.is_set():
                        return
                    # 取消状态与落盘按同一把锁结算，已取消的一轮不会写回旧会话。
                    stored = self._store_capture(values)
                    self._set_state(DONE if stored else CANCELLED)
                if stored:
                    self._after_capture(browser)
                return
            if self._clock() >= deadline:
                self._finish(TIMEOUT, params={"minutes": int(self.wait_seconds // 60)})
                return
            self._sleep(POLL_SECONDS)
