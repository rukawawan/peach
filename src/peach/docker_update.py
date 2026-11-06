"""Docker 部署的一键更新（ADR-0140）：核对镜像仓库、探测 Watchtower、请它重建容器。

容器换不掉自己，拉镜像与重建交给同一 compose 里可选的 Watchtower。两边共用的令牌由 Peach
在首次启动时生成，放在只装这一个文件的 `peach-update` 卷里；Watchtower 只读挂这个卷、
启动时读一次。用户不用填任何设置，接口也从不回传令牌。
"""
from __future__ import annotations

import json
import os
import re
import secrets
from pathlib import Path

import httpx

from .fsutil import atomic_write_text
from .http import HttpRequest

REPOSITORY = "longmeidao/peach"
REGISTRY = "https://registry-1.docker.io"
REGISTRY_AUTH = "https://auth.docker.io/token"
#: 版本号标签与 `edge` 用同一组内容协商，比较的才是同一种文档的摘要。
MANIFEST_ACCEPT = ", ".join((
    "application/vnd.oci.image.index.v1+json", "application/vnd.oci.image.manifest.v1+json",
    "application/vnd.docker.distribution.manifest.list.v2+json",
    "application/vnd.docker.distribution.manifest.v2+json",
))
_DIGEST = re.compile(r"sha256:[0-9a-f]{64}")
#: 同一 compose 网络里的服务名；watchtower profile 没启用时这个名字解析不出来。
WATCHTOWER_URL = "http://watchtower:8080"
#: 镜像里建好并交给 UID 1000 的目录，compose 把 `peach-update` 卷挂在这里。
UPDATE_DIR_ENV = "PEACH_UPDATE_DIR"
TOKEN_NAME = "watchtower-token"
#: compose 把 `${PEACH_VERSION:-edge}` 传进来。Watchtower 只换同一标签的新镜像，钉了版本号就换不动。
IMAGE_TAG_ENV = "PEACH_IMAGE_TAG"
ROLLING_TAG = "edge"
RESTART_WATCHTOWER = "在 compose.yaml 所在目录运行 docker compose restart watchtower 后重试"


def image_tag() -> str:
    return os.environ.get(IMAGE_TAG_ENV, "").strip()


def token_path() -> Path | None:
    directory = os.environ.get(UPDATE_DIR_ENV, "").strip()
    return Path(directory) / TOKEN_NAME if directory else None


def ensure_token() -> None:
    """首次启动时生成令牌，之后不轮换：Watchtower 只在自己启动时读一次。"""
    path = token_path()
    if path is None or path.is_file():
        return
    atomic_write_text(path, secrets.token_urlsafe(32), mode=0o600)


def _token() -> str:
    path = token_path()
    try:
        return path.read_text(encoding="utf-8").strip() if path is not None else ""
    except OSError:
        return ""


def _digest(transport, tag: str, token: str) -> str | None:
    response = transport(HttpRequest("HEAD", f"{REGISTRY}/v2/{REPOSITORY}/manifests/{tag}", {
        "Accept": MANIFEST_ACCEPT, "Authorization": f"Bearer {token}"}), 12.0, 0)
    if response.status == 404:
        return None
    if response.status != 200:
        raise OSError(f"Docker Hub 返回 HTTP {response.status}")
    digest = {key.lower(): value for key, value in response.headers.items()}.get("docker-content-digest", "")
    if not _DIGEST.fullmatch(digest):
        raise ValueError("Docker Hub 返回的镜像摘要无效")
    return digest


def published(transport, version: str) -> bool:
    """版本号标签已推送且 `edge` 指向同一镜像。只读 manifest 摘要，不下载镜像层。"""
    response = transport(HttpRequest("GET", REGISTRY_AUTH + "?service=registry.docker.io&scope=repository:"
                                     + REPOSITORY + ":pull", {"Accept": "application/json"}), 12.0, 64_000)
    if response.status != 200:
        raise OSError(f"Docker Hub 令牌请求返回 HTTP {response.status}")
    body = json.loads(response.body)
    token = body.get("token") or body.get("access_token") if isinstance(body, dict) else None
    if not isinstance(token, str) or not token:
        raise ValueError("Docker Hub 没有返回匿名令牌")
    target = _digest(transport, version, token)
    return target is not None and target == _digest(transport, ROLLING_TAG, token)


def _client(transport: httpx.BaseTransport | None, timeout: float) -> httpx.Client:
    # 地址在 compose 网络里：不走 Peach 代理，也不跟随重定向，令牌只发给这一个地址。
    return httpx.Client(trust_env=False, follow_redirects=False, timeout=timeout, transport=transport)


def status(*, transport: httpx.BaseTransport | None = None) -> dict:
    """能不能一键更新；不能时 `reason` 说明为什么，没启用 Watchtower 时为空。"""
    tag = image_tag()
    if not tag:
        return {"available": False, "reason": "容器里没有镜像标签，compose.yaml 可能还是旧版；换成仓库当前的 compose.yaml 并重建容器后可一键更新。"}
    if tag != ROLLING_TAG:
        return {"available": False, "reason": f"镜像标签是 {tag}，Watchtower 只换同一标签的新镜像；把 .env 的 PEACH_VERSION 删掉或改成 edge 后可一键更新。"}
    if not _token():
        return {"available": False, "reason": "更新令牌还没有生成，重建 Peach 容器后可一键更新。"}
    try:
        with _client(transport, 3.0) as client:
            client.get(WATCHTOWER_URL + "/v1/update")
    except httpx.HTTPError:
        # 名字解析不出来或连不上：没有用 watchtower profile 启动，照常给两步命令。
        return {"available": False, "reason": ""}
    return {"available": True, "reason": ""}


def trigger(*, transport: httpx.BaseTransport | None = None) -> dict:
    """请 Watchtower 在后台拉镜像、重建 Peach 容器，收到 202 就返回。

    必须异步：同步请求时 Watchtower 会在响应回来之前把 Peach 容器停掉。
    """
    state = status(transport=transport)
    if not state["available"]:
        raise ValueError(state["reason"] or "没有检测到 Watchtower，请用 compose 的 watchtower profile 启动")
    try:
        with _client(transport, 15.0) as client:
            response = client.post(WATCHTOWER_URL + "/v1/update", params={"async": "true"},
                                   headers={"Authorization": f"Bearer {_token()}"})
    except httpx.HTTPError as error:
        raise OSError(f"连不上 Watchtower（{type(error).__name__}），请稍后重试") from error
    if response.status_code == 202:
        return {"state": "updating", "message": "Watchtower 正在拉取新镜像并重建容器。"}
    if response.status_code == 401:
        raise ValueError(f"Watchtower 读到的令牌与 Peach 不一致；{RESTART_WATCHTOWER}")
    if response.status_code == 429:
        raise ValueError("Watchtower 正在执行另一次更新，请稍后再试")
    raise OSError(f"Watchtower 返回 HTTP {response.status_code}")
