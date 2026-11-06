"""诊断快照的技术字段白名单；不采集账号、媒体名称和网络坐标。"""
from __future__ import annotations

import base64
import ipaddress
import json
import math
import os
import platform
import re
import shutil
import sqlite3
import threading
from importlib.metadata import PackageNotFoundError, version

CODECS = ('h264', 'h264High', 'hevc', 'av1', 'vp9', 'aac', 'ac3', 'opus')
BROWSER_TEXT = ('user_agent', 'platform', 'platform_hint', 'language', 'timezone', 'protocol')
BROWSER_BOOL = ('mobile', 'secure_context', 'online', 'cookies_enabled', 'local_storage', 'media_source', 'media_capabilities',
                'web_codecs', 'fullscreen', 'picture_in_picture')
BROWSER_NUMBERS = ('viewport_width', 'viewport_height', 'pixel_ratio', 'touch_points', 'logical_processors', 'device_memory_gb', 'utc_offset_minutes')
PLAYBACK_NUMBERS = ('code', 'network_state', 'ready_state', 'current_time', 'duration', 'volume', 'playback_rate', 'video_width', 'video_height', 'asset_id')


def _fields(value, *, texts=(), booleans=(), numbers=()):
    value = value if isinstance(value, dict) else {}
    result = {key: item[:512] for key in texts if isinstance(item := value.get(key), str)}
    result.update({key: item for key in booleans if type(item := value.get(key)) is bool})
    result.update({key: item for key in numbers if type(item := value.get(key)) in (int, float)
                   and abs(item) <= 1e15 and math.isfinite(item)})
    return result


def _brand(value):
    """数字版本使用 v 前缀，诊断格式将版本与网络地址明确区分。"""
    result = _fields(value, texts=('brand',))
    raw = value.get('version') if isinstance(value, dict) else None
    if isinstance(raw, str) and re.fullmatch(r'v?\d{1,6}(?:\.\d{1,6}){0,3}', raw):
        result['version'] = 'v' + raw.removeprefix('v')
    return result


def browser(value, *, user_agent=''):
    result = _fields(value, texts=BROWSER_TEXT, booleans=BROWSER_BOOL, numbers=BROWSER_NUMBERS)
    if isinstance(value, dict):
        brands = value.get('brands')
        if isinstance(brands, list):
            result['brands'] = [_brand(row) for row in brands[:8]]
        for name in ('native_codecs', 'mse_codecs'):
            rows = value.get(name)
            if isinstance(rows, dict):
                result[name] = {key: item for key in CODECS if (item := rows.get(key)) is None
                                or type(item) is bool or isinstance(item, str) and item in ('', 'maybe', 'probably')}
        connection = _fields(value.get('connection'), texts=('effective_type',),
                             booleans=('save_data',), numbers=('rtt_ms', 'downlink_mbps'))
        if connection:
            result['connection'] = connection
        if isinstance(value.get('graphics'), dict):
            result['graphics'] = _fields(value['graphics'], texts=('status', 'vendor', 'renderer'))
        if isinstance(hints := value.get('client_hints'), dict):
            result['client_hints'] = _fields(hints, texts=('status', 'architecture', 'bitness', 'platformVersion'), booleans=('wow64',))
            if isinstance(full := hints.get('fullVersionList'), list):
                result['client_hints']['fullVersionList'] = [_brand(row) for row in full[:8]]
    if isinstance(user_agent, str) and user_agent:
        result['user_agent'] = user_agent[:512]
    return {'status': 'available' if result else 'unavailable',
            **({} if result else {'reason': 'no-client-snapshot'}), **result}


def browser_header(value, *, user_agent=''):
    try:
        data = json.loads(base64.b64decode(value, validate=True)) if value and len(value) <= 12000 else None
    except (ValueError, UnicodeError):
        data = None
    return browser(data, user_agent=user_agent)


def playback(value):
    result = _fields(value, texts=('message', 'source_protocol', 'source_type', 'preload'),
                     booleans=('paused', 'ended', 'muted', 'same_origin', 'source_assigned'), numbers=PLAYBACK_NUMBERS)
    if not isinstance(value, dict):
        return result
    route = re.compile(r'/(?:stream(?:/hls/\d+/(?:index\.m3u8|\d+\.ts))?|follow-stream|preview-stream|strm-resource/\d+/[a-f0-9]+)')
    for key in ('source_route', 'declared_route'):
        if isinstance(raw := value.get(key), str) and route.fullmatch(raw):
            result[key] = raw
    ranges = value.get('buffered_ranges')
    if isinstance(ranges, list):
        result['buffered_ranges'] = [row for row in ranges[:8] if isinstance(row, list) and len(row) == 2
            and all(type(item) in (int, float) and 0 <= item <= 1e9 and math.isfinite(item) for item in row)]
    requests = value.get('recent_requests')
    if isinstance(requests, list):
        result['recent_requests'] = [{**_fields(row, texts=('initiator',),
            numbers=('duration_ms', 'transfer_bytes', 'body_bytes', 'status')), 'route': row['route']}
            for row in requests[-8:] if isinstance(row, dict) and isinstance(row.get('route'), str) and route.fullmatch(row['route'])]
    return result


def host_kind(value):
    try:
        address = ipaddress.ip_address(value)
        return 'loopback' if address.is_loopback else 'unspecified' if address.is_unspecified else 'private' if address.is_private else 'public'
    except ValueError:
        return 'hostname'


def runtime(config):
    from . import media_processing_policy
    from .reporting_identity import distribution, event_metadata, machine_facts
    packages = {}
    for name in ('peach', 'fastapi', 'starlette', 'uvicorn', 'anyio', 'httpx', 'curl_cffi', 'pillow', 'opencv-python-headless', 'sentry-sdk'):
        try:
            raw = version(name)
            packages[name] = 'v' + raw if re.fullmatch(r'\d{1,6}(?:\.\d{1,6}){0,3}', raw) else raw
        except PackageNotFoundError:
            packages[name] = None
    result = {'status': 'available', 'packages': packages, 'sqlite': sqlite3.sqlite_version,
              'distribution': distribution(), 'memory_gb': machine_facts().get('memory_gb'),
              'checkout_or_build_commit': event_metadata('errors').get('dist'),
              'logical_processors': os.cpu_count(), 'active_threads': threading.active_count(),
              'windows_edition': platform.win32_edition() if os.name == 'nt' else None,
              'server': {'host_kind': host_kind(config.server.host), 'port': config.server.port,
                         'replication_enabled': config.replication.enabled, 'tunnel_enabled': config.tunnel.enabled,
                         'tunnel_mode': config.tunnel.mode},
              'proxy_environment': {name.lower(): bool(os.environ.get(name) or os.environ.get(name.lower()))
                                    for name in ('HTTP_PROXY', 'HTTPS_PROXY', 'ALL_PROXY', 'NO_PROXY')},
              'windows_browsing': windows_browsing(),
              'media_preferences': {'metadata_only': media_processing_policy.metadata_only(config.directory('state')),
                  'preview_acceleration': media_processing_policy.acceleration(config.directory('state'), purpose='preview'),
                  'playback_acceleration': media_processing_policy.acceleration(config.directory('state'))},
              'environment': {name: os.environ.get(name) == '1' for name in ('PEACH_HEADLESS_MANAGED', 'PEACH_TRAY_MANAGED')}}
    backend = os.environ.get('PEACH_TRANSCODE_BACKEND', 'auto')
    from .hardware_transcode import BACKENDS
    result['transcode_backend'] = backend if backend in BACKENDS else 'invalid'
    result['storage'] = {}
    for name in ('database', 'generated', 'state', 'logs', 'tools'):
        try:
            path = config.directory(name)
            result['storage'][name] = {'status': 'available' if path.is_dir() else 'missing'}
        except OSError as error:
            result['storage'][name] = {'status': 'unavailable', 'reason': type(error).__name__}
    try:
        disk = shutil.disk_usage(config.data_root)
        result['data_disk'] = {'status': 'available', 'total_bytes': disk.total, 'free_bytes': disk.free}
    except OSError as error:
        result['data_disk'] = {'status': 'unavailable', 'reason': type(error).__name__}
    return result


def _registry_values(path, names):
    import winreg
    with winreg.OpenKey(winreg.HKEY_CURRENT_USER, path) as key:
        values = {}
        for name in names:
            try:
                values[name] = winreg.QueryValueEx(key, name)[0]
            except FileNotFoundError:
                values[name] = None
        return values


def windows_browsing():
    """Windows 的系统代理与默认浏览器：只记开关和程序标识，不记代理地址。"""
    if os.name != 'nt':
        return {'status': 'unavailable', 'reason': 'not-windows'}
    result = {'status': 'available'}
    try:
        proxy = _registry_values(r'Software\Microsoft\Windows\CurrentVersion\Internet Settings',
                                 ('ProxyEnable', 'ProxyServer', 'ProxyOverride', 'AutoConfigURL', 'AutoDetect'))
        bypass = [item.strip().lower() for item in str(proxy['ProxyOverride'] or '').split(';')]
        result['system_proxy'] = {
            'enabled': bool(proxy['ProxyEnable']), 'server_configured': bool(proxy['ProxyServer']),
            'auto_config': bool(proxy['AutoConfigURL']), 'auto_detect': bool(proxy['AutoDetect']),
            'bypass_local': '<local>' in bypass,
            'bypass_loopback': any(item in ('127.0.0.1', 'localhost', '127.*', '<-loopback>') for item in bypass)}
    except OSError as error:
        result['system_proxy'] = {'status': 'unavailable', 'reason': type(error).__name__}
    try:
        choice = _registry_values(
            r'Software\Microsoft\Windows\Shell\Associations\UrlAssociations\http\UserChoice', ('ProgId',))['ProgId']
        result['default_browser'] = choice if isinstance(choice, str) and re.fullmatch(r'[A-Za-z0-9._-]{1,64}', choice) \
            else 'unrecognized' if choice else None
    except OSError as error:
        result['default_browser'] = {'status': 'unavailable', 'reason': type(error).__name__}
    return result


ORIGIN_FIELDS = ('guard', 'accepted', 'origin_class', 'origin', 'server', 'scheme_match', 'host_match', 'port_match',
                 'fetch_site', 'fetch_mode', 'fetch_dest', 'scope_scheme', 'forwarded', 'user_agent')


def archived_context(archive):
    """从本次已脱敏、有界日志中提取近期上下文，托盘导出也保留浏览器与来源检查证据。"""
    browsers, media, origins = [], [], []
    for name in archive.namelist():
        if '/errors-' not in name:
            continue
        for line in archive.read(name).decode('utf-8', 'replace').splitlines():
            try:
                row = json.loads(line)
            except ValueError:
                continue
            if not isinstance(row, dict):
                continue
            if row.get('stage') in ('browser', 'browser-context'):
                context = browser(row.get('browser'), user_agent=row.get('user_agent', ''))
                if context['status'] == 'available':
                    browsers.append({'at': row.get('at'), **context})
                if isinstance(row.get('playback'), dict):
                    media.append({'at': row.get('at'), 'stage': 'browser', **playback(row['playback'])})
            if row.get('stage') in ('playback-request', 'playback-plan', 'playback-source'):
                media.append(row)
            if row.get('stage') == 'origin-mismatch':
                origins.append({'at': row.get('at'), **{key: row[key] for key in ORIGIN_FIELDS if key in row}})
    return {'recent_browsers': sorted(browsers, key=lambda row: str(row.get('at') or ''))[-8:],
            'recent_playback': sorted(media, key=lambda row: str(row.get('at') or ''))[-20:],
            'recent_origin_mismatches': sorted(origins, key=lambda row: str(row.get('at') or ''))[-8:]}
