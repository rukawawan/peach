"""无桌面部署的只读目录选择；访问限制在明确配置的媒体根内。"""
from __future__ import annotations

from itertools import islice
import json
import os
from pathlib import Path
import re
from stat import FILE_ATTRIBUTE_REPARSE_POINT

from .platform import is_windows_path, system_volume
from .discovery_rules import FILE_BROWSER_TRASH
from .table_filters import filter_selected_rows
from .user_messages import UserValueError


class NasDirectoryError(UserValueError):
    """目录选择超出已配置的媒体根，或分页参数无效。"""


def available() -> bool:
    from .local_playback import available as desktop_available
    return desktop_available()


def file_position(path, ledger_path: str = '') -> dict:
    """回执只描述已知容器/服务端位置，不推测宿主机的共享路径。"""
    from .platform import location_mount_values, resolve_root
    result = {'mode': 'server', 'path': str(path),
              'container': os.environ.get('PEACH_DISTRIBUTION') == 'docker'}
    if ledger_path:
        location, index, tail = resolve_root(ledger_path)
        mounts = location_mount_values().get(location, ())
        if 0 <= index < len(mounts):
            result.update(media_root=str(mounts[index]), relative_path='/'.join(tail))
    return result


def is_browsable_root(value: str | Path, *, allow_cloud_drive_root: bool = False) -> bool:
    root = Path(value)
    if not root.is_absolute():
        return False
    if root != Path(root.anchor):
        return True
    return allow_cloud_drive_root and is_windows_path(root) and root != system_volume()


def roots(config) -> list[str]:
    values = [value for group in config.mounts.values() for value in group]
    if os.name == 'nt':
        values.extend(value for group in config.locations.values() for value in group)
    if os.environ.get('PEACH_DISTRIBUTION') == 'docker':
        values.insert(0, '/media')
    return list(dict.fromkeys(str(Path(value)) for value in values if is_browsable_root(value)))


def browse(config, initial: str, *, start: bool = False, offset: int = 0) -> dict:
    from .media_io import _request
    if type(offset) is not int or not 0 <= offset < 2**31:
        raise NasDirectoryError('errors.nasDirectories.invalidOffset')
    allowed = roots(config)
    if start or not initial:
        return {'mode': 'server', 'path': None, 'parent': None, 'roots': allowed,
                'directories': [], 'next_offset': None}
    candidate = Path(initial)
    if not candidate.is_absolute() or not any(candidate.is_relative_to(Path(root)) for root in allowed):
        raise NasDirectoryError('errors.nasDirectories.outsideRoots')
    try:
        return _request('browse', initial, value=json.dumps({'allowed': allowed, 'offset': offset}), timeout=10)
    except ValueError as exc:
        # 读取子进程解析符号链接后才知道越界，回传的只有原因；界面一律按越界提示。
        raise NasDirectoryError('errors.nasDirectories.outsideRoots') from exc


DIRECTORY_SORTS = frozenset({'name', 'type', 'size', 'modified', 'created', 'duration', 'resolution'})
DIRECTORY_RANGES = {'size': 'size', 'modified': 'timestamp', 'created': 'timestamp', 'duration': 'duration'}
DIRECTORY_CHOICES = ('type', 'resolution')
_STAT_FIELDS = {'size': 'st_size', 'modified': 'st_mtime', 'created': 'st_birthtime'}


def browse_directory(path, options):
    return list_directory(path, **options)


def resolve_directory(path, allowed, allow_cloud_drive_root=False):
    """解析挂载边界，虚拟盘查询不到最终路径时逐层核对。"""
    candidate = Path(path)
    if not candidate.is_absolute():
        raise ValueError('the path must be absolute')
    boundaries = [Path(root) for root in allowed if candidate.is_relative_to(Path(root))
                  and is_browsable_root(root, allow_cloud_drive_root=allow_cloud_drive_root)]
    if not boundaries:
        raise ValueError('outside the configured media roots')
    # 只访问本次路径所属的根；离线网盘不阻塞另一个本地媒体根。
    declared = max(boundaries, key=lambda root: len(root.parts))
    drive_root = declared == Path(declared.anchor)
    try:
        boundary = declared.resolve(strict=True)
    except OSError as error:
        if not drive_root or getattr(error, 'winerror', None) != 1005:
            raise
        # 有些虚拟盘能读目录，但不支持查询最终路径。逐层拒绝可能改写路径的重解析点。
        boundary = target = declared
        for part in candidate.relative_to(declared).parts:
            if part == '..':
                raise ValueError('outside the configured media roots') from None
            target /= part
            if target.lstat().st_file_attributes & FILE_ATTRIBUTE_REPARSE_POINT:
                raise ValueError('outside the configured media roots') from None
    else:
        target = boundary if candidate == declared else candidate.resolve(strict=True)
    # 盘符映射成共享根时保留共享边界，普通目录链接不能把授权扩大到整卷。
    other_anchor = boundary == Path(boundary.anchor) and boundary != declared
    if not target.is_relative_to(boundary) or (other_anchor and (not drive_root or is_windows_path(boundary))):
        raise ValueError('outside the configured media roots')
    return boundary, target


def list_directory(path, allowed: list[str], offset: int = 0, include_files: bool = False, focus_name: str = '',
                   *, allow_cloud_drive_root: bool = False, order: dict | None = None) -> dict:
    """由可终止的媒体读取子进程调用；不跟随列表中的符号链接。"""
    boundary, target = resolve_directory(path, allowed, allow_cloud_drive_root)
    if order is not None:
        return _ordered_page(target, offset, focus_name, **order)
    directories = []
    files = []
    with os.scandir(target) as entries:
        if focus_name:
            # 定位只枚举当前目录，保留命中文件所在的一页，不读取文件内容。
            limited = []
            first_page = []
            found = False
            offset = 0
            for entry in entries:
                if len(first_page) < 501:
                    first_page.append(entry)
                limited.append(entry)
                if entry.name == focus_name:
                    found = True
                    limited.extend(islice(entries, 501 - len(limited)))
                    break
                if len(limited) == 500:
                    limited = []
                    offset += 500
            if not found:
                limited, offset = first_page, 0
        else:
            limited = list(islice(entries, offset, offset + 501))
        for entry in limited[:500]:
            if entry.is_dir(follow_symlinks=False):
                directory = {'name': entry.name, 'path': str(target / entry.name)}
                if include_files:
                    directory.update(_entry_times(_entry_metadata(entry)))
                directories.append(directory)
            elif include_files and entry.is_file(follow_symlinks=False):
                metadata = _entry_metadata(entry)
                files.append({'name': entry.name, 'size': getattr(metadata, 'st_size', None), **_entry_times(metadata)})
    return {'mode': 'server', 'path': str(target),
            'parent': str(target.parent) if target != boundary else None,
            'roots': allowed, 'directories': sorted(directories, key=lambda item: item['name'].casefold()),
            'next_offset': offset + 500 if len(limited) > 500 else None,
            **({'files': sorted(files, key=lambda item: item['name'].casefold()),
                'offset': offset,
                'read_only': bool(os.statvfs(target).f_flag & os.ST_RDONLY) if hasattr(os, 'statvfs') else None} if include_files else {})}


def _entry_metadata(entry: os.DirEntry) -> os.stat_result | None:
    try:
        return entry.stat(follow_symlinks=False)
    except OSError:
        # 文件可能在列目录后被移走，仍可展示已取得的文件名。
        return None


def _entry_times(metadata: os.stat_result | None) -> dict:
    return {'modified_at': getattr(metadata, 'st_mtime', None), 'created_at': getattr(metadata, 'st_birthtime', None)}


def _natural_name(name):
    return tuple(int(part) if index % 2 else part for index, part in enumerate(re.split(r'([0-9]+)', name.casefold())))


def _directory_row(entry, folder, metadata, metrics):
    duration, width, height = metrics.get(entry.name, (None, None, None)) if not folder else (None, None, None)
    fields = {key: getattr(metadata, attr, None) for key, attr in _STAT_FIELDS.items()}
    if folder:
        fields['size'] = None
    fields.update(duration=duration if duration and duration > 0 else None,
                  type='folder' if folder else (Path(entry.name).suffix[1:].upper() or 'file'),
                  resolution=f'{width}×{height}' if width and height else 'none')
    return {'entry': entry, 'folder': folder, 'name': (_natural_name(entry.name), entry.name),
            'metadata': metadata, 'pixels': width * height if width and height else None, **fields}


def _ordered_page(target, offset, focus_name, *, sort, descending, term, limit, metrics, selected=None):
    rows = []
    selected = selected or {}
    read_metadata = any(key in _STAT_FIELDS for key in (*selected, sort))
    with os.scandir(target) as entries:
        for entry in entries:
            if term not in entry.name.casefold() or entry.name.casefold() == FILE_BROWSER_TRASH:
                continue
            folder = entry.is_dir(follow_symlinks=False)
            if not folder and not entry.is_file(follow_symlinks=False):
                continue
            metadata = _entry_metadata(entry) if read_metadata else None
            rows.append(_directory_row(entry, folder, metadata, metrics))
    included, facets = filter_selected_rows(
        rows, selected, {key: (lambda row, key=key: (row[key],)) for key in DIRECTORY_CHOICES},
        ranges={key: (lambda row, key=key: row[key]) for key in DIRECTORY_RANGES}, range_kinds=DIRECTORY_RANGES)

    sort_key = 'pixels' if sort == 'resolution' else sort
    ordered = sorted(included, key=lambda row: row['name'])
    ordered.sort(key=lambda row: row[sort_key] if row[sort_key] is not None else 0, reverse=descending)
    ordered.sort(key=lambda row: (not row['folder'], row[sort_key] is None))
    if focus_name:
        index = next((i for i, row in enumerate(ordered) if row['entry'].name == focus_name), 0)
        offset = index // limit * limit
    elif offset >= len(ordered):
        offset = max(0, (len(ordered) - 1) // limit * limit)
    directories, file_rows = [], []
    for selected_row in ordered[offset:offset + limit]:
        entry = selected_row['entry']
        metadata = selected_row['metadata'] if read_metadata else _entry_metadata(entry)
        row = {'name': entry.name, **_entry_times(metadata)}
        if selected_row['folder']:
            directories.append(row)
        else:
            file_rows.append({**row, 'size': getattr(metadata, 'st_size', None)})
    return {'directories': directories, 'files': file_rows, 'total': len(ordered), 'offset': offset, 'facets': facets,
            'next_offset': offset + limit if offset + limit < len(ordered) else None,
            'read_only': bool(os.statvfs(target).f_flag & os.ST_RDONLY) if hasattr(os, 'statvfs') else None}
