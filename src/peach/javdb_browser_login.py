"""用户在 Peach 专用浏览器窗口完成 JavDB 登录，复用本机 Cookie 存储。"""
from __future__ import annotations

import json
import logging
from pathlib import Path

from . import peach_proxy
from .attended_browser_login import AttendedBrowserLogin, netscape_cookie_file, private_browser, temporary_profile
from .browser_transport import BrowserUnavailable, _Browser
from .javdb import BASE, PROFILE_PATH, SIGNED_IN_SELECTOR
from .scraping_access import JAVDB_WEB_HOSTS, save_captured_scraping_session, scraping_settings_revision, values_for

LOGGER = logging.getLogger(__name__)
_OFFICIAL_ORIGINS = frozenset(f"https://{host}" for host in JAVDB_WEB_HOSTS)
_SIGNED_IN_ORIGIN = f"""(() => {{
  if (!{json.dumps(sorted(_OFFICIAL_ORIGINS))}.includes(location.origin)) return null;
  return document.querySelector({json.dumps(SIGNED_IN_SELECTOR)}) ? location.origin : null;
}})()"""


def _attended_browser(executable: str, profile: Path) -> _Browser:
    root = profile.parent
    options = ({"trust_env": False} if values_for(root, "javdb").get("network") == "direct"
               else peach_proxy.client_options(root))
    return private_browser(executable, profile, options, proxy_error="labels.javdbBrowserLogin.proxyWithCredentials")


class JavDBBrowserLogin(AttendedBrowserLogin):
    login_url = BASE + "login"
    message_namespace = "labels.javdbBrowserLogin"
    browser_missing_code = "labels.javdbBrowserLogin.browserMissing"
    thread_name = "PeachJavDBLogin"
    logger = LOGGER

    def __init__(self, root: Path, *, browser=_attended_browser, **options):
        super().__init__(root, self._persist_cookies, browser=browser, **options)
        self._revision: tuple[int, int, int] | None = None

    def _before_start(self) -> None:
        self._revision = scraping_settings_revision(self.profile, "javdb")

    def _browser_profile(self):
        return temporary_profile(self.profile, ".javdb-login-")

    def _read_capture(self, browser: _Browser) -> dict | None:
        origin = browser.evaluate(_SIGNED_IN_ORIGIN, timeout=5)
        if not isinstance(origin, str) or origin not in _OFFICIAL_ORIGINS:
            return None
        assert browser.socket is not None
        # CDP 能读 HttpOnly；只取这轮专用窗口中会随 JavDB 页面发送的 Cookie。
        response = browser.socket.call("Network.getCookies", 5, urls=[origin + PROFILE_PATH])
        text = netscape_cookie_file(response.get("cookies", []), JAVDB_WEB_HOSTS)
        return {"cookies_text": text} if text else None

    def _persist_cookies(self, capture: dict) -> bool:
        return save_captured_scraping_session(self.profile, "javdb", capture["cookies_text"], self._revision)

    def _browser_error(self, error: BrowserUnavailable) -> tuple[str, dict]:
        # 浏览器异常可能带命令行或页面细节，状态只保留已知的错误类型。
        if getattr(error, "code", None) == "labels.javdbBrowserLogin.proxyWithCredentials":
            return "proxyWithCredentials", {}
        return "failed", {}
