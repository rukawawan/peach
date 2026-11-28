"""Web 请求的本机访问判断；配置与本地播放器共用。"""
from __future__ import annotations

import ipaddress
import os
from urllib.parse import urlsplit

from fastapi import Request

from . import distribution, listening, tunnel

from .ai_endpoints import is_private_lan


def managed_configuration() -> bool:
    """托盘或无桌面入口负责消费配置保存后的重载标记。"""
    return (distribution.standalone() or os.environ.get("PEACH_TRAY_MANAGED") == "1"
            or os.environ.get("PEACH_HEADLESS_MANAGED") == "1")


def tunnel_forwarded(request: Request) -> bool:
    """隧道转发请求按公网来源处理。"""
    return tunnel.from_edge(getattr(request.app.state, "tunnel", None), request.headers)


def loopback_client(request: Request) -> bool:
    """只认直接连接本机回环地址的请求，不把代理连接算作本机操作。"""
    if not request.client or tunnel_forwarded(request):
        return False
    if any(header.startswith("x-forwarded-") or header in {"forwarded", "cf-connecting-ip"}
           for header in request.headers):
        return False
    try:
        return (ipaddress.ip_address(request.client.host).is_loopback
                and listening.is_loopback(request.url.hostname or ""))
    except ValueError:
        return False


def _ai_local_address(host: str) -> bool:
    try:
        address = ipaddress.ip_address(host)
    except ValueError:
        return False
    if isinstance(address, ipaddress.IPv6Address) and address.ipv4_mapped:
        address = address.ipv4_mapped
    return address.is_loopback or address.is_link_local or is_private_lan(address)


def private_ai_client(request: Request) -> bool:
    """Saved AI connections require a direct private peer and a private entry point."""
    if (not request.client or not _ai_local_address(request.client.host) or tunnel_forwarded(request)
            or any(header == "forwarded" or header.startswith(("x-forwarded-", "cf-")) for header in request.headers)):
        return False
    settings = request.app.state.settings
    mdns = (getattr(settings, "mdns_name", "") or "").lower().rstrip(".").removesuffix(".local")
    public = (getattr(settings, "tunnel_hostname", "") or "").lower().rstrip(".")

    def private_host(host):
        host = (host or "").lower().rstrip(".")
        return host != public and (host == "localhost" or (bool(mdns) and host == mdns + ".local") or _ai_local_address(host))

    try:
        if not private_host(request.url.hostname):
            return False
        for header in ("origin", "referer"):
            value = request.headers.get(header)
            if value and value != "null" and not private_host(urlsplit(value).hostname):
                return False
    except ValueError:
        return False
    return True


def local_client(request: Request) -> bool:
    """桌面限本机，Docker 允许本机与私有网络，拒绝代理转发。"""
    if not request.client or tunnel_forwarded(request):
        return False
    server = request.scope.get("server")
    try:
        peer = ipaddress.ip_address(request.client.host)
        bound = ipaddress.ip_address(server[0]) if server else None
    except ValueError:
        bound = None
        try:
            peer = ipaddress.ip_address(request.client.host)
        except ValueError:
            return False
    if os.environ.get("PEACH_HEADLESS_MANAGED") == "1":
        if any(header.startswith("x-forwarded-") or header in {"forwarded", "cf-connecting-ip"}
               for header in request.headers):
            return False
        return peer.is_loopback or (peer.is_private and not any((
            peer.is_link_local, peer.is_reserved, peer.is_unspecified, peer.is_multicast,
        )))
    if not peer.is_loopback and (peer != bound or peer.is_unspecified):
        return False
    if managed_configuration():
        name = request.app.state.settings.mdns_name.lower().removesuffix(".local")
        hosts = {"127.0.0.1", "localhost", "::1", f"{name}.local"}
        if bound and not bound.is_unspecified:
            hosts.add(str(bound))
        if (request.url.hostname or "").lower().rstrip(".") not in hosts:
            return False
    return True
