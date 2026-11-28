"""PikPak 用浏览器登录：人在 Peach 拉起的浏览器窗口里登录一次，Peach 从网页的 localStorage 读出 token（ADR-0093）。

做法和 Greasy Fork 上的 PikPak Assistant 用户脚本一样，只是换了宿主：脚本跑在用户自己的浏览器页面里，
Peach 是外部进程，读不到用户主浏览器的 localStorage，也不去读它磁盘上的 LevelDB。这里复用
`browser_transport._Browser` 的 CDP 通道，开一个 Peach 专用的持久 profile（`<凭据根>/browser-pikpak`，
和采集用的 `browser/` 分开），打开 mypikpak.com 顶到前面；人机验证由这台真浏览器自然通过。登录完成后
网页 SDK 把凭据写进 `credentials_<client_id>`，这里每秒用 `Runtime.evaluate` 看一次，读到就存进
`CredentialStore`（`download-pikpak`），然后关掉浏览器。

**刷新只归 Peach。** PikPak 每次刷新都作废旧的 refresh token，两个刷新者会互相打死对方。所以读到 token
后先把页面里的 `credentials_*` 删掉再关浏览器，这个 profile 之后不再持有 Peach 也持有的那一份；下次
拉起登录窗时，`_FORGET_ON_FIRST_DOCUMENT` 在网页脚本运行之前再删一次，网页从未登录开始，不会拿旧
token 去刷新，Peach 也不会把旧 token 当成新登录读回来。只有 Peach 刷新失败、要重新登录时，才重新
拉起这个窗口。设备号（`deviceid`）留着，同一台设备不必每次都过一遍设备验证。

**client 绑定。** client_id 从键名后缀读（`credentials_<client_id>`，多账号模式是
`credentials_<client_id>@<sub>`），不写死；`downloads_pikpak.profile_for` 按它选网页端常量。设备号按网页
自己的取法归一：`deviceid`（或 `_deviceid`）按 `.` 拆开取最后一段的前 32 个字符。

**等待与取消。** 登录在后台线程里等，接口只回状态，页面轮询。最多等 `WAIT_SECONDS`；用户关掉窗口时
调试连接断开或进程退出，记为「已取消」。token 只进凭据文件，不进日志、状态和响应体。
"""
from __future__ import annotations

import json
import logging
import time
from datetime import datetime
from pathlib import Path
from typing import Callable

from .attended_browser_login import AttendedBrowserLogin, WAIT_SECONDS
from .attended_browser_login import CANCELLED as CANCELLED, DONE as DONE, FAILED as FAILED, IDLE as IDLE, TIMEOUT as TIMEOUT, WAITING as WAITING
from .browser_transport import BrowserLaunchFailed, _Browser, find_browser
from .downloads_pikpak import SESSION_LOCK, new_device_id

LOGGER = logging.getLogger(__name__)

PROFILE_DIRNAME = "browser-pikpak"
LOGIN_URL = "https://mypikpak.com/drive/"
CREDENTIALS_PREFIX = "credentials_"

#: 每个新文档里先于网页脚本运行。同一个标签页里只在 mypikpak.com 系的第一个文档删一次 `credentials_*`：
#: 标记放在 sessionStorage，登录后跳回来的文档不再删，刚登录写下的凭据才留得住。
_FORGET_ON_FIRST_DOCUMENT = """(() => {
  try {
    if (!/(^|\\.)mypikpak\\.com$/.test(location.hostname) || sessionStorage.getItem('peach-forgot')) return;
    sessionStorage.setItem('peach-forgot', '1');
    Object.keys(localStorage).filter((key) => key.startsWith('credentials_'))
      .forEach((key) => localStorage.removeItem(key));
  } catch (error) {}
})()"""
#: 读凭据。还没登录、不在 mypikpak.com 系的页面上（登录中可能跳到 user.mypikpak.com）都回 null。
_READ_SCRIPT = """(() => {
  if (!/(^|\\.)mypikpak\\.com$/.test(location.hostname)) return null;
  for (const key of Object.keys(localStorage)) {
    if (!key.startsWith('credentials_')) continue;
    let value = null;
    try { value = JSON.parse(localStorage.getItem(key) || 'null'); } catch (error) { continue; }
    if (!value || !value.refresh_token || !value.access_token) continue;
    const device = localStorage.getItem('deviceid') || localStorage.getItem('_deviceid') || '';
    return JSON.stringify({key, access_token: value.access_token, refresh_token: value.refresh_token,
      expires_at: value.expires_at || '', sub: value.sub || '', device: (device.split('.').pop() || '').substring(0, 32)});
  }
  return null;
})()"""
#: 读到之后从页面里删掉凭据，profile 里不留 Peach 也持有的 refresh token。
_FORGET_SCRIPT = """(() => {
  Object.keys(localStorage).filter((key) => key.startsWith('credentials_'))
    .forEach((key) => localStorage.removeItem(key));
  return true;
})()"""


def profile_dir(secrets_root: Path) -> Path:
    """浏览器 profile 放在凭据根下：里面有 PikPak 的设备号与登录会话，和凭据文件一个性质。"""
    return Path(secrets_root) / PROFILE_DIRNAME


def _epoch(raw) -> int:
    """网页 SDK 把 `expires_at` 存成 ISO 时间（已提前留了余量）；读不出就记 0，第一次用时先刷新。"""
    try:
        return int(datetime.fromisoformat(str(raw)).timestamp())
    except (TypeError, ValueError):
        return 0


def parse_capture(payload: dict) -> dict[str, str] | None:
    """`_READ_SCRIPT` 的回包换成凭据字典。缺 token 或键名里没有 client_id 时返回 None。"""
    key = str(payload.get("key") or "")
    client_id = key[len(CREDENTIALS_PREFIX):].split("@", 1)[0] if key.startswith(CREDENTIALS_PREFIX) else ""
    access, refresh = str(payload.get("access_token") or ""), str(payload.get("refresh_token") or "")
    if not (client_id and access and refresh):
        return None
    device = str(payload.get("device") or "")
    if not device:
        LOGGER.warning("PikPak web localStorage has no deviceid; generating a new device id")
        device = new_device_id()
    return {"refresh_token": refresh, "access_token": access, "expires_at": str(_epoch(payload.get("expires_at"))),
            "user_id": str(payload.get("sub") or ""), "device_id": device, "client_id": client_id}


def _attended_browser(executable: str, profile: Path) -> _Browser:
    from . import peach_proxy
    from .browser_transport import proxy_flags
    options = peach_proxy.client_options(profile.parent)
    flags = proxy_flags(direct=not options.get('trust_env') and not options.get('proxy'),
                        proxy=options.get('proxy', ''))
    if flags is None:
        raise BrowserLaunchFailed("errors.downloadsPikpakBrowser.proxyWithCredentials")
    return _Browser(executable, profile, flags, attended=True)


class BrowserLogin(AttendedBrowserLogin):
    """复用专用登录窗口，读取 PikPak 网页的本机凭据。"""

    login_url = LOGIN_URL
    message_namespace = "labels.downloadsPikpakBrowser"
    browser_missing_code = "errors.downloadsPikpakBrowser.browserMissing"
    thread_name = "PeachPikPakLogin"
    logger = LOGGER

    def __init__(self, profile: Path, persist: Callable[[dict], None], *,
                 find: Callable[[], str | None] = find_browser,
                 browser: Callable[[str, Path], _Browser] = _attended_browser,
                 clock: Callable[[], float] = time.monotonic, sleep: Callable[[float], None] = time.sleep,
                 wait_seconds: float = WAIT_SECONDS, on_done: Callable[[], None] | None = None):
        super().__init__(profile, persist, find=find, browser=browser, clock=clock, sleep=sleep,
                         wait_seconds=wait_seconds, on_done=on_done)

    def _prepare_browser(self, browser: _Browser) -> None:
        assert browser.socket is not None
        browser.socket.call("Page.addScriptToEvaluateOnNewDocument", source=_FORGET_ON_FIRST_DOCUMENT)

    def _read_capture(self, browser: _Browser) -> dict | None:
        raw = browser.evaluate(_READ_SCRIPT, timeout=10)
        return parse_capture(json.loads(raw)) if raw else None

    def _store_capture(self, values: dict) -> bool:
        with SESSION_LOCK:
            return super()._store_capture(values)

    def _after_capture(self, browser: _Browser) -> None:
        """刷新凭据只由 Peach 持有，持久浏览器 profile 里清掉网页的副本。"""
        try:
            browser.evaluate(_FORGET_SCRIPT, timeout=10)
        except (OSError, RuntimeError, ValueError):
            LOGGER.warning("credentials_* entries in the PikPak login window were not removed; closing the browser anyway")
