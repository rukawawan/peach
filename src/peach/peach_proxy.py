"""外部请求共用的 Peach 连接策略与本机代理凭据。"""
from __future__ import annotations

import json
from pathlib import Path
from urllib.parse import urlsplit

from .follow_secrets import CredentialStore
from .fsutil import atomic_write_text
from .user_messages import UserOSError, UserValueError


def values(root: Path) -> dict:
    store = CredentialStore(root)
    saved = store.load("peach-proxy")
    if saved:
        return dict(saved.values)
    # 已有来源仅有一个自定义地址时，它就是可无损继承的公共代理。
    legacy = set()
    for path in store.root.glob("scraping-*.json"):
        if path.name.endswith(".cooldown.json"):
            continue
        item = store.load(path.stem)
        if item and item.values.get("network") == "proxy" and item.values.get("proxy"):
            legacy.add(item.values["proxy"])
    if len(legacy) > 1:
        return {"mode": "environment", "conflict": True}
    return {"mode": "proxy", "proxy": legacy.pop()} if legacy else {"mode": "environment"}


def describe(root: Path) -> dict:
    saved = values(root)
    return {"mode": saved.get("mode", "environment"), "proxy_saved": bool(saved.get("proxy")),
            "needs_selection": bool(saved.get("conflict"))}


def validate(root: Path, body: object) -> dict:
    """校验连接方式与地址；凭据只留在返回给保存流程的值中。"""
    if not isinstance(body, dict):
        raise UserValueError("errors.peachProxy.modeRequired")
    mode = body.get("mode")
    if not isinstance(mode, str) or mode not in {"environment", "direct", "proxy"}:
        raise UserValueError("errors.peachProxy.modeRequired")
    address = body.get("proxy") or values(root).get("proxy", "")
    if not isinstance(address, str):
        raise ValueError("proxy address must be a string")
    address = address.strip()
    if mode == "proxy":
        try:
            parsed = urlsplit(address)
            valid = (parsed.scheme in {"http", "https", "socks5", "socks5h"} and parsed.hostname
                     and parsed.port and not parsed.query and not parsed.fragment and parsed.path in {"", "/"})
        except ValueError:
            valid = False
        if not valid or any(char.isspace() for char in address):
            raise UserValueError("errors.peachProxy.addressInvalid")
    return {"mode": mode, "proxy": address if mode == "proxy" else ""}


def save(root: Path, body: dict) -> dict:
    checked = validate(root, body)
    path = CredentialStore(root).path_for("peach-proxy")
    atomic_write_text(path, json.dumps(checked), mode=0o600)
    return describe(root)


def secrets_root() -> Path:
    from .settings_file import active
    return active().directory("secrets")


def client_options(root: Path | None = None) -> dict:
    root = secrets_root() if root is None else root
    saved = values(root)
    if saved.get("conflict"):
        raise UserValueError("errors.peachProxy.conflict")
    mode = saved.get("mode", "environment")
    if mode == "proxy":
        return {"trust_env": False, "proxy": saved["proxy"]}
    return {"trust_env": mode == "environment"}


def http_client(*, root: Path | None = None, **kwargs):
    """外网 HTTPX 客户端；注入的传输独占请求，不额外挂载代理。"""
    import httpx
    options = {"trust_env": False} if kwargs.get("transport") is not None else client_options(root)
    return httpx.Client(**{**options, **kwargs})


def curl_options(root: Path | None = None) -> dict:
    """libcurl 的直连与自定义代理显式覆盖环境 NO_PROXY。"""
    from curl_cffi import CurlOpt
    options = client_options(root)
    if not options.get("trust_env"):
        options["curl_options"] = {CurlOpt.NOPROXY: "" if options.get("proxy") else "*"}
    return options


def read_url(url: str, *, timeout: float = 60, headers=None, max_bytes: int | None = None) -> bytes:
    """读取模型、清单等完整响应，沿用 Peach 的 HTTP 与 SOCKS 代理。"""
    import httpx
    from .http import _bounded_body
    try:
        with http_client(follow_redirects=True, timeout=timeout) as client, client.stream("GET", url, headers=headers) as response:
            response.raise_for_status()
            return response.read() if max_bytes is None else _bounded_body(response.iter_bytes(), max_bytes)
    except httpx.HTTPError as error:
        kind = f"HTTP {error.response.status_code}" if isinstance(error, httpx.HTTPStatusError) else type(error).__name__
        raise UserOSError("errors.peachProxy.requestFailed", {"kind": kind}) from error
