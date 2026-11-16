"""生成可导入 NAS 容器管理器的 Compose；不连接 Docker、不启动或覆盖已有部署。"""
from __future__ import annotations

import argparse
import ipaddress
import json
from pathlib import Path, PurePosixPath
import re

from .interface_text import cli as _t
from .user_messages import UserFacingError


class NasSetupError(UserFacingError, ValueError):
    """NAS 安装参数错误；命令行保留原提示，调用方也能取得稳定编码。"""


#: NAS 容器面板只按 latest 检查更新（ADR-0121），生成的配置默认用它。
IMAGE = 'longmeidao/peach:latest'


def _quoted(value: str) -> str:
    # YAML 接受 JSON 字符串；Compose 还会处理美元符号，必须独立转义。
    return json.dumps(value.replace('$', '$$'), ensure_ascii=False)


def _validate(address, *, port: int, media: str, hostname: str, image: str, render_device: str,
              render_gid: int | None, prepare_render: bool, uid: int | None, gid: int | None) -> None:
    """生成前拒绝无效参数；报错带 nasSetup.* 的 code。"""
    if address.is_unspecified or address.is_multicast or address.is_link_local:
        raise NasSetupError('nasSetup.invalidBind')
    if not 1 <= port <= 65535:
        raise NasSetupError('nasSetup.invalidPort')
    if not PurePosixPath(media).is_absolute() or any(c in media for c in '\r\n\0'):
        raise NasSetupError('nasSetup.invalidMediaPath')
    if not re.fullmatch(r'[a-zA-Z0-9][a-zA-Z0-9.-]{0,62}', hostname):
        raise NasSetupError('nasSetup.invalidHostname')
    if not image or any(c.isspace() or c == '\0' for c in image):
        raise NasSetupError('nasSetup.invalidImage')
    if render_device and not re.fullmatch(r'/dev/dri/renderD(?:12[89]|1[3-8][0-9]|19[01])', render_device):
        raise NasSetupError('nasSetup.invalidRenderDevice')
    if render_gid is not None and (type(render_gid) is not int or not 0 <= render_gid < 2**32 - 1):
        raise NasSetupError('nasSetup.invalidRenderGid')
    for value in (uid, gid):
        if value is not None and (type(value) is not int or not 1 <= value < 2**32 - 1):
            raise NasSetupError('nasSetup.invalidIdentity')
    if (render_gid is not None or prepare_render) and not render_device:
        raise NasSetupError('nasSetup.renderDeviceRequired')
    if render_device and sum((render_gid is not None, prepare_render)) != 1:
        raise NasSetupError('nasSetup.renderPermissionChoice')


def compose(*, bind: str, media: str, port: int = 8900,
            image: str = IMAGE, hostname: str = 'peach-nas',
            render_device: str = '', render_gid: int | None = None,
            prepare_render: bool = False, uid: int | None = None, gid: int | None = None) -> str:
    address = ipaddress.ip_address(bind)
    _validate(address, port=port, media=media, hostname=hostname, image=image, render_device=render_device,
              render_gid=render_gid, prepare_render=prepare_render, uid=uid, gid=gid)
    endpoint = f'[{address}]' if address.version == 6 else str(address)
    lines = ['services:', '  peach:', f'    image: {_quoted(image)}',
             f'    hostname: {_quoted(hostname)}', '    init: true',
             '    restart: unless-stopped', '    stop_grace_period: 75s',
             '    ports:', f'      - {_quoted(f"{endpoint}:{port}:8900")}',
             '    volumes:', '      - peach-data:/data', '      - type: bind',
             f'        source: {_quoted(media)}', '        target: /media',
             '        read_only: true', '        bind:', '          propagation: rslave',
             '          create_host_path: false']
    environment = {}
    if uid is not None:
        environment['PEACH_UID'] = str(uid)
    if gid is not None:
        environment['PEACH_GID'] = str(gid)
    if render_device:
        lines.extend(['    devices:', f'      - {_quoted(render_device + ":" + render_device)}'])
        environment['PEACH_VAAPI_DEVICE'] = render_device
        if prepare_render:
            # 镜像以 root 启动，入口把节点交给服务的主组后再降权（docker_entrypoint）。
            environment['PEACH_VAAPI_PREPARE'] = '1'
        else:
            lines.extend(['    group_add:', f'      - "{render_gid}"'])
    if environment:
        lines.append('    environment:')
        lines.extend(f'      {name}: {_quoted(value)}' for name, value in environment.items())
    return '\n'.join([*lines, 'volumes:', '  peach-data:', ''])


def main(argv=None) -> int:
    parser = argparse.ArgumentParser(description=_t('nasSetup.description'))
    parser.add_argument('--bind', required=True, help=_t('nasSetup.help.bind'))
    parser.add_argument('--media', required=True, help=_t('nasSetup.help.media'))
    parser.add_argument('--port', type=int, default=8900)
    parser.add_argument('--image', default=IMAGE)
    parser.add_argument('--hostname', default='peach-nas', help=_t('nasSetup.help.hostname'))
    parser.add_argument('--uid', type=int, help=_t('nasSetup.help.uid'))
    parser.add_argument('--gid', type=int, help=_t('nasSetup.help.gid'))
    parser.add_argument('--render-device', default='')
    permission = parser.add_mutually_exclusive_group()
    permission.add_argument('--render-gid', type=int)
    permission.add_argument('--prepare-render', action='store_true', help=_t('nasSetup.help.prepareRender'))
    parser.add_argument('--output', type=Path, help=_t('nasSetup.help.output'))
    args = vars(parser.parse_args(argv))
    output = args.pop('output')
    try:
        result = compose(**args)
        if output is None:
            print(result, end='')
        else:
            with output.open('x', encoding='utf-8') as stream:
                stream.write(result)
    except (ValueError, OSError) as error:
        parser.error(str(error))
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
