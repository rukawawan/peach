"""读取本机 CloudDrive 的缓存目录，不更改外部缓存设置。"""
from __future__ import annotations

import ipaddress
import os
from urllib.parse import urlsplit

from google.protobuf.empty_pb2 import Empty

from .clouddrive_proxy import client_for
from .downloads import DownloadSettings
from .storage_budget import validate
from .user_messages import UserValueError


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
            raise UserValueError('errors.storageExternalCache.remoteNeedsManualPath')
        if not client.token_info().permissions.allow_get_system_settings:
            raise UserValueError('errors.storageExternalCache.tokenNeedsPermission')
        settings = client.call('GetSystemSettings', Empty(), 'readCacheDir')
        if not settings.HasField('fileBufferDiskCacheLocation') or not settings.fileBufferDiskCacheLocation:
            raise UserValueError('errors.storageExternalCache.noCacheDirectory')
        path = validate({'external_cache_path': settings.fileBufferDiskCacheLocation}).external_cache_path
        with os.scandir(path):
            pass
        return {'path': path}
