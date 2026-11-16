"""公开资源取回：只连公网 HTTPS，连接固定到已核验的地址，每一跳重定向重新核验。

站点圆标要去任意外链的首页、manifest 和页面声明的图标地址取图，这些地址来自对方
页面，不能信。`http.public_https_url` 只看字面；域名解析到哪里要在连接前查，查完还得
连到查过的那个地址——否则两次解析之间换了答案（DNS 重绑定），查的是公网、连的是
内网。CONNECT_TO 把连接钉在核验过的 IP 上，TLS 仍按原域名校验证书和 SNI；走代理时
代理收到的 CONNECT 也是这个 IP。重定向不交给底层自动跟随，每一跳另开一个会话重新核验，
会话之间不带 Cookie。
"""
from __future__ import annotations

from contextlib import contextmanager
import ipaddress
import re
import time
from urllib.parse import urljoin, urlsplit

from curl_cffi import CurlOpt, ffi, lib, requests

from .http import HttpResponse, host_addresses, public_https_url
from .user_agent import USER_AGENT

REDIRECTS = (301, 302, 303, 307, 308)
#: Clash / Mihomo / Stash 的 Fake-IP 地址池（`mdns.py` 认的同一段）。本机 DNS 只给这段虚拟地址时，
#: 真实地址由代理在远端解析，本机核验不到；连到虚拟地址等于交给代理，按代理的规则出网。
#: 一律拒绝的话，开着 Fake-IP 的机器上外链圆标全部退成地球。公网与虚拟地址混着回的照旧拒绝。
FAKE_IP = ipaddress.ip_network("198.18.0.0/15")


def _check_deadline(deadline: float | None) -> None:
    if deadline is not None and time.monotonic() >= deadline:
        raise ValueError("public resource request timed out")


def pinned_address(url: str, *, deadline: float | None = None) -> tuple[str, str]:
    """核验地址并解析一次，返回 `(主机, 要连的 IP)`；任何一个解析结果不是公网就拒绝。"""
    parsed = urlsplit(url)
    try:
        host = (parsed.hostname or "").encode("idna").decode("ascii")
        port = parsed.port
    except (UnicodeError, ValueError) as error:
        raise ValueError("public resource address is not valid") from error
    if (not public_https_url(url) or port not in (None, 443)
            or not re.fullmatch(r"[A-Za-z0-9.-]+", host) or any(ord(char) < 33 for char in url)):
        raise ValueError("public resource must be a public HTTPS address on port 443")
    _check_deadline(deadline)
    addresses = host_addresses(host)
    _check_deadline(deadline)
    try:
        parsed_addresses = [ipaddress.ip_address(ip) for ip in addresses]
    except ValueError:
        parsed_addresses = []
    public = bool(parsed_addresses) and (all(ip.is_global for ip in parsed_addresses)
                                         or all(ip in FAKE_IP for ip in parsed_addresses))
    if not public:
        raise ValueError("public resource host must resolve only to public addresses")
    return host, addresses[0]


@contextmanager
def pinned_session(url: str, *, client_options=None, deadline: float | None = None):
    """连到 `pinned_address` 核验过的 IP 的会话；`client_options` 是 `peach_proxy.client_options` 的形状。"""
    host, address = pinned_address(url, deadline=deadline)
    if ":" in address:
        address = f"[{address}]"
    # curl_cffi 的 CONNECT_TO 收原生 slist；会话关闭后才释放。
    target = ffi.gc(lib.curl_slist_append(ffi.NULL, f"{host}:443:{address}:443".encode()),
                    lib.curl_slist_free_all)
    options = dict(client_options or {"trust_env": False})
    curl_options = {CurlOpt.CONNECT_TO: target}
    if not options.get("trust_env"):
        curl_options[CurlOpt.NOPROXY] = "" if options.get("proxy") else "*"
    with requests.Session(curl_options=curl_options, **options) as client:
        yield client


def get(url: str, *, timeout: float = 8, max_bytes: int = 8 * 1024 * 1024,
        max_redirects: int = 5, client_options=None) -> HttpResponse:
    """取回一份公开资源：总时长、体积与重定向次数都有上限，每一跳重新核验地址。"""
    expires = time.monotonic() + timeout
    for _ in range(max_redirects + 1):
        with pinned_session(url, client_options=client_options, deadline=expires) as client:
            remaining = expires - time.monotonic()
            if remaining <= 0:
                raise ValueError("public resource request timed out")
            with client.stream("GET", url, timeout=remaining, allow_redirects=False,
                               headers={"User-Agent": USER_AGENT}) as response:
                if response.status_code in REDIRECTS:
                    location = response.headers.get("location")
                    if not location:
                        raise ValueError("public resource redirect has no location")
                    url = urljoin(url, location)
                    continue
                chunks, total = [], 0
                for chunk in response.iter_content():
                    total += len(chunk)
                    if total > max_bytes:
                        raise ValueError("public resource response is too large")
                    _check_deadline(expires)
                    chunks.append(chunk)
                return HttpResponse(response.status_code,
                                    {key.lower(): value for key, value in response.headers.items()},
                                    b"".join(chunks), url)
    raise ValueError("public resource redirected too many times")
