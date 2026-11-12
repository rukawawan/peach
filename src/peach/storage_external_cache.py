"""读取本机 CloudDrive 的缓存目录，不更改外部缓存设置。"""
from __future__ import annotations

import ipaddress
import os
from urllib.parse import urlsplit

from google.protobuf.empty_pb2 import Empty

from .clouddrive_proxy import client_for
from .downloads import DownloadSettings
from .storage_budget import validate


def read(config):
    if not DownloadSettings(config.directory('state')).load().clouddrive_address:
        return {'configured': False}
    with client_for(config) as client:
        host = urlsplit(client.address).hostname
        try:
            local = ipaddress.ip_address(host).is_loopback
        except ValueError:
            local = host == 'localhost'
        if not local:
            raise ValueError('远程 CloudDrive 请手动填写 Peach 可访问的缓存映射目录')
        if not client.token_info().permissions.allow_get_system_settings:
            raise ValueError('自动读取需要 CloudDrive API 令牌的“查看系统设置”权限')
        settings = client.call('GetSystemSettings', Empty(), '读取缓存目录')
        if not settings.HasField('fileBufferDiskCacheLocation') or not settings.fileBufferDiskCacheLocation:
            raise ValueError('CloudDrive 未返回缓存目录，请手动填写')
        path = validate({'external_cache_path': settings.fileBufferDiskCacheLocation}).external_cache_path
        with os.scandir(path):
            pass
        return {'path': path}
