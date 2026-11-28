"""在来源的本机专用登录窗口内读取会话，沿用已有的来源凭据。"""
from __future__ import annotations

import base64
import json
import logging
import math
import re
import time
from dataclasses import dataclass
from pathlib import Path

from . import peach_proxy, scraping_access
from .attended_browser_login import AttendedBrowserLogin, netscape_cookie_file, private_browser, temporary_profile
from .browser_transport import BrowserUnavailable, _Browser
from .follow_secrets import CredentialStore

LOGGER = logging.getLogger(__name__)
_PROXY_ERROR = "labels.sourceBrowserLogin.proxyWithCredentials"
_FORUMS = frozenset({"simpcity", "f95zone"})
_FC2_HOSTS = frozenset({"fc2cmadb.com", "www.fc2cmadb.com"})
_FANBOX_HOSTS = frozenset({"fanbox.cc", "api.fanbox.cc"})
_FANBOX_SESSION = re.compile(r"[1-9][0-9]*_[A-Za-z0-9_-]+")
_XENFORO_PREFIX = re.compile(r"[A-Za-z0-9_-]{1,64}")
_COOKIE_VALUE = re.compile(r"[\x21\x23-\x2b\x2d-\x3a\x3c-\x5b\x5d-\x7e]+")
_ACCESS_TOKEN = re.compile(r"[A-Za-z0-9._~+/-]+=*")
_IWARA_TOKEN_ENDPOINTS = frozenset({
    "https://apiq.iwara.tv/user/token", "https://api.iwara.tv/user/token",
})

# Inertia 共享的 auth.user 与站内退出入口都由登录后的页面提供。
_INERTIA_SIGNED_IN = """(() => {
  if (document.querySelector('a[href="/logout"], form[action="/logout"]')) return true;
  const pages = document.querySelectorAll('script[type="application/json"], #app[data-page]');
  for (const node of pages) {
    try {
      const page = JSON.parse(node.getAttribute('data-page')?.startsWith('{')
        ? node.getAttribute('data-page') : node.textContent);
      const user = page?.props?.auth?.user;
      if (user && ((typeof user.id === 'number' && user.id > 0)
        || (typeof user.id === 'string' && user.id.trim()))) return true;
    } catch (error) {}
  }
  return false;
})()"""


@dataclass(frozen=True)
class _Site:
    url: str
    origins: tuple[str, ...]
    signed_in: str = "true"
    probe_result: str = "({origin: location.origin})"

    @property
    def probe(self) -> str:
        return (f"({json.dumps(self.origins)}.includes(location.origin) && "
                f"({self.signed_in})) ? {self.probe_result} : null")


def _forum(host: str) -> _Site:
    origin = f"https://{host}"
    return _Site(f"{origin}/login/", (origin,), "document.documentElement?.dataset.loggedIn === 'true'",
                 "({origin: location.origin, prefix: document.documentElement.dataset.cookiePrefix || 'xf_'})")


_SITES = {
    "simpcity": _forum("simpcity.cr"),
    "f95zone": _forum("f95zone.to"),
    "iwara": _Site("https://www.iwara.tv/login", ("https://www.iwara.tv", "https://iwara.tv")),
    "fanbox": _Site("https://www.fanbox.cc/", ("https://www.fanbox.cc", "https://fanbox.cc")),
    "fc2cmadb": _Site("https://fc2cmadb.com/login", ("https://fc2cmadb.com", "https://www.fc2cmadb.com"),
                     _INERTIA_SIGNED_IN),
}
SOURCE_BROWSER_LOGIN_SOURCES = frozenset(_SITES)
FOLLOW_BROWSER_LOGIN_SOURCES = SOURCE_BROWSER_LOGIN_SOURCES - {"fc2cmadb"}


def cancel_source_browser_login(contract, source: str) -> None:
    login = getattr(contract, "source_browser_logins", {}).get(source)
    if login is not None:
        login.cancel()


def _session_cookies(browser: _Browser, url: str, hosts: frozenset[str]) -> list[dict]:
    assert browser.socket is not None
    cookies = browser.socket.call("Network.getCookies", 5, urls=[url]).get("cookies", [])
    now = time.time()
    return [cookie for cookie in cookies if (
        isinstance(cookie, dict)
        and isinstance(cookie.get("domain"), str) and cookie["domain"].lstrip(".") in hosts
        and cookie.get("partitionKey") is None and not cookie.get("partitionKeyOpaque")
        and isinstance(cookie.get("value"), str) and _COOKIE_VALUE.fullmatch(cookie["value"])
        and (cookie.get("session") or (type(cookie.get("expires")) in (int, float)
                                       and math.isfinite(cookie["expires"]) and cookie["expires"] > now))
    )]


class _IwaraToken:
    """只接收 Iwara 前端成功换出的 access token，忽略登录请求和 refresh token。"""

    def __init__(self) -> None:
        self.pending: set[str] = set()
        self.ready: str | None = None

    def observe(self, message: dict) -> None:
        method = message["method"]
        if method not in {"Network.responseReceived", "Network.loadingFinished", "Network.loadingFailed"}:
            return
        params = message.get("params", {})
        request_id = params.get("requestId")
        if not isinstance(request_id, str):
            return
        if method == "Network.responseReceived":
            response = params.get("response", {})
            if (response.get("url") in _IWARA_TOKEN_ENDPOINTS and response.get("status") == 200
                    and response.get("mimeType") == "application/json"):
                self.pending.add(request_id)
            return
        if request_id in self.pending:
            self.pending.remove(request_id)
            if method == "Network.loadingFinished":
                self.ready = request_id

    def take(self, browser: _Browser) -> dict | None:
        if self.ready is None:
            return None
        request_id, self.ready = self.ready, None
        assert browser.socket is not None
        response = browser.socket.call("Network.getResponseBody", 5, requestId=request_id)
        body = response.get("body")
        if not isinstance(body, str) or len(body) > 65536:
            return None
        try:
            payload = json.loads(base64.b64decode(body, validate=True) if response.get("base64Encoded") else body)
        except (ValueError, UnicodeError):
            return None
        token = payload.get("accessToken") if isinstance(payload, dict) else None
        if isinstance(token, str) and len(token) <= 4096 and _ACCESS_TOKEN.fullmatch(token):
            return {"access_token": token}
        return None


class SourceBrowserLogin(AttendedBrowserLogin):
    message_namespace = "labels.sourceBrowserLogin"
    browser_missing_code = "labels.sourceBrowserLogin.browserMissing"
    thread_name = "PeachSourceLogin"
    logger = LOGGER

    def __init__(self, root: Path, source: str, *, browser=None, **options):
        self.source = source
        self.site = _SITES[source]
        self.login_url = self.site.url
        self._store = CredentialStore(root)
        self._revision: tuple[int, int, int] | None = None
        self._iwara_token = _IwaraToken()
        super().__init__(root, self._persist, browser=browser or self._open_browser, **options)

    def _open_browser(self, executable: str, profile: Path) -> _Browser:
        options = ({"trust_env": False} if self.source == "fc2cmadb"
                   and scraping_access.values_for(self.profile, self.source).get("network") == "direct"
                   else peach_proxy.client_options(self.profile))
        return private_browser(executable, profile, options, proxy_error=_PROXY_ERROR, standard_login=True)

    def _before_start(self) -> None:
        self._revision = (scraping_access.scraping_settings_revision(self.profile, self.source)
                          if self.source == "fc2cmadb" else self._store.revision(self.source))

    def _browser_profile(self):
        return temporary_profile(self.profile, f".{self.source}-login-")

    def _prepare_browser(self, browser: _Browser) -> None:
        if self.source == "iwara":
            assert browser.socket is not None
            self._iwara_token = _IwaraToken()
            browser.socket.on_event = self._iwara_token.observe

    def _read_capture(self, browser: _Browser) -> dict | None:
        page = browser.evaluate(self.site.probe, timeout=5)
        if not isinstance(page, dict):
            return None
        origin = page.get("origin")
        if origin not in self.site.origins:
            return None
        if self.source == "iwara":
            return self._iwara_token.take(browser)
        if self.source in _FORUMS:
            prefix = page.get("prefix")
            if not isinstance(prefix, str) or not _XENFORO_PREFIX.fullmatch(prefix):
                return None
            host = origin.removeprefix("https://")
            cookies = _session_cookies(browser, origin + "/", frozenset({host}))
            fields = {cookie["name"]: cookie["value"] for cookie in cookies
                      if cookie.get("name") in (prefix + "session", prefix + "user")}
            return {"cookie": "; ".join(f"{name}={value}" for name, value in fields.items())} if fields else None
        if self.source == "fanbox":
            cookies = _session_cookies(browser, "https://api.fanbox.cc/post.info", _FANBOX_HOSTS)
            return next(({"cookie": f"FANBOXSESSID={cookie['value']}"} for cookie in cookies
                         if cookie.get("name") == "FANBOXSESSID" and _FANBOX_SESSION.fullmatch(cookie["value"])), None)
        cookies = _session_cookies(browser, origin + "/articles/", _FC2_HOSTS)
        sessions = [cookie for cookie in cookies if cookie.get("httpOnly")
                    and cookie.get("name") == "fc2cmadb-session"]
        text = netscape_cookie_file(sessions, _FC2_HOSTS)
        return {"cookies_text": text} if text else None

    def _persist(self, capture: dict) -> bool:
        if self.source == "fc2cmadb":
            return scraping_access.save_captured_scraping_session(
                self.profile, self.source, capture["cookies_text"], self._revision)
        return self._store.save_if_unchanged(self.source, capture, self._revision)

    def _browser_error(self, error: BrowserUnavailable) -> tuple[str, dict]:
        return ("proxyWithCredentials" if getattr(error, "code", None) == _PROXY_ERROR else "failed"), {}
