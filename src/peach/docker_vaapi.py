"""渲染节点准备：只改容器 /dev 中透传的节点，由 docker_entrypoint 在降权前以 root 调用。

报错写进容器日志，固定英文（ADR-0159）。
"""
from __future__ import annotations

import os
import re
import stat


class RenderDeviceError(ValueError):
    """渲染节点不符合设备透传约束。"""


class RenderPermissionError(PermissionError):
    """渲染节点权限不符合服务身份约束。"""


def prepare(device: str, gid: int) -> None:
    """把单个透传的渲染节点交给服务的主组读写；宿主机节点与数据卷不动。"""
    if not re.fullmatch(r'/dev/dri/renderD(?:12[89]|1[3-8][0-9]|19[01])', device):
        raise RenderDeviceError(f'only /dev/dri/renderD128 to renderD191 can be prepared, got {device!r}')
    if os.geteuid() != 0:
        raise RenderPermissionError('preparing the render node needs the container to start as root')
    if gid == 0:
        raise RenderPermissionError('the render node must not be handed to the root group')
    info = os.lstat(device)
    if (not stat.S_ISCHR(info.st_mode) or os.major(info.st_rdev) != 226
            or os.minor(info.st_rdev) != int(device.rsplit('renderD', 1)[1])):
        raise RenderDeviceError(f'{device} is not a DRM render node')
    # --device 在容器 /dev 的 tmpfs 创建独立节点。绑定宿主机的节点或整个 /dev/dri
    # 属于另一文件系统，不能在这里 chmod，否则会改变宿主机权限。
    if info.st_dev != os.stat('/dev').st_dev:
        raise RenderPermissionError('pass a single node with Compose devices; a bind mount of the host /dev/dri is refused')
    os.chown(device, 0, gid)
    os.chmod(device, 0o660)
