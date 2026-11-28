"""网页媒体目录：按需读取一个目录，不触发扫描、探测或媒体写入。"""
from pathlib import Path, PurePosixPath, PureWindowsPath
import json
import os

from . import media_io, media_libraries, settings_file
from .discovery_rules import FILE_BROWSER_TRASH
from .media_folders import path_predicate
from .media_sources import CLOUD_LOCATIONS
from .nas_directories import DIRECTORY_CHOICES, DIRECTORY_RANGES, DIRECTORY_SORTS, is_browsable_root
from .platform import is_unmapped, translate_ledger_path
from .user_messages import UserValueError
from .table_filters import column_filters


def media_roots():
    roots = []
    for library in media_libraries.libraries(settings_file.active()):
        for root in library['roots']:
            mount = translate_ledger_path(root['root'])
            if not is_unmapped(mount) and is_browsable_root(
                    mount, allow_cloud_drive_root=root['location'] in CLOUD_LOCATIONS):
                roots.append({'id': root['root_id'], 'name': library['name'],
                              'icon': library['icon'],
                              'location': root['location'], 'ledger_root': root['root'],
                              'mount': str(mount)})
    return roots


def relative_parts(value):
    if not isinstance(value, str):
        raise UserValueError('errors.nasDirectories.outsideRoots')
    parts = PurePosixPath(value)
    if (parts.is_absolute() or '\\' in value or ':' in value or '..' in parts.parts or '\x00' in value
            or any(part.casefold() == FILE_BROWSER_TRASH for part in parts.parts)):
        raise UserValueError('errors.nasDirectories.outsideRoots')
    return parts.parts


def q_media_directory(contract, args):
    roots = media_roots()
    public_roots = [{key: value for key, value in root.items() if key != 'ledger_root'} for root in roots]
    result = {'roots': public_roots, 'root': None, 'relative': '', 'directories': [],
              'files': [], 'next_offset': None, 'state': 'roots'}
    root_id, relative = args.get('root', ''), args.get('relative', '')
    focus_name = ''
    if args.get('asset'):
        position = asset_directory(contract, roots, args['asset'])
        if 'last_path' in position:
            return {**result, 'state': 'unmapped', **position}
        root_id, relative, focus_name = position['root'], position['relative'], position['focus_name']
    if not root_id:
        return result
    root = next((row for row in roots if row['id'] == root_id), None)
    parts = relative_parts(relative)
    if root is None:
        raise UserValueError('errors.nasDirectories.outsideRoots')
    try:
        offset = int(args.get('offset', '0'))
        if not 0 <= offset < 2**31:
            raise ValueError
    except (ValueError, TypeError):
        raise UserValueError('errors.nasDirectories.invalidOffset') from None
    target = Path(root['mount']).joinpath(*parts)
    result.update(root=root_id, relative='/'.join(parts), focus_name=focus_name,
                  path=str(target), path_separator=os.sep, state='ready')
    # 台账只查当前层；目录读取在可终止子进程内执行，离线网盘不占住请求线程。
    ledger_directory = str(PureWindowsPath(root['ledger_root']).joinpath(*parts))
    clause, values = path_predicate(root['location'], ledger_directory, False)
    with contract.read_connection() as connection:
        indexed = {PureWindowsPath(path).name: {'asset_id': asset_id, 'duration': duration, 'width': width, 'height': height}
                   for asset_id, path, duration, width, height in connection.execute(
                       f'SELECT a.id,a.path,a.duration,a.width,a.height FROM asset a WHERE {clause} '
                       "AND COALESCE(a.disposal,'') NOT IN ('trash','vanished')", values)}
    options = {'allowed': [root['mount']], 'offset': offset, 'include_files': True,
               'focus_name': focus_name, 'allow_cloud_drive_root': root['location'] in CLOUD_LOCATIONS}
    order = directory_order(args, indexed)
    try:
        if order:
            with media_io.MountWorker() as worker:
                page = worker.call('browse_directory', str(target), {**options, 'order': order}, timeout=15)
        else:
            page = media_io._request('browse', str(target), value=json.dumps(options), timeout=10)
    except PermissionError:
        return {**result, 'state': 'denied'}
    except FileNotFoundError:
        return {**result, 'state': 'missing'}
    except TimeoutError:
        return {**result, 'state': 'timeout'}
    except OSError:
        return {**result, 'state': 'unreachable'}
    except ValueError:
        raise UserValueError('errors.nasDirectories.outsideRoots') from None
    result.update(directories=[{key: item[key] for key in ('name', 'modified_at', 'created_at')} for item in page['directories']],
                  files=[{**item, **indexed.get(item['name'], {'asset_id': None})} for item in page['files']],
                  next_offset=page['next_offset'], offset=page['offset'], read_only=page['read_only'])
    if order:
        result['total'] = page['total']
        result['facets'] = page['facets']
    return result


def directory_order(args, indexed):
    if 'sort' not in args:
        return None
    sort, direction, term = args['sort'], args.get('dir', 'asc'), args.get('q', '')
    try:
        limit = int(args.get('limit', '100'))
    except (TypeError, ValueError):
        limit = 0
    if sort not in DIRECTORY_SORTS or direction not in ('asc', 'desc') or len(term) > 255 or not 1 <= limit <= 500:
        raise UserValueError('errors.nasDirectories.invalidOrder')
    selected = column_filters(args.get('column_filters'), DIRECTORY_CHOICES, DIRECTORY_RANGES)
    metrics = {name: (row['duration'], row['width'], row['height']) for name, row in indexed.items()}
    return {'sort': sort, 'descending': direction == 'desc', 'term': term.strip().casefold(), 'limit': limit,
            'metrics': metrics, 'selected': selected}


def asset_directory(contract, roots, value):
    """从账本定位文件，嵌套配置优先采用最具体的授权根。"""
    try:
        asset_id = int(value)
    except (ValueError, TypeError):
        raise UserValueError('api.folders.folderMissing') from None
    with contract.read_connection() as connection:
        asset = connection.execute('SELECT location,path FROM asset WHERE id=?', (asset_id,)).fetchone()
    if asset is None or not asset[1]:
        raise UserValueError('api.folders.folderMissing')
    path = PureWindowsPath(asset[1])
    matching = [row for row in roots if row['location'] == asset[0]
                and path.is_relative_to(PureWindowsPath(row['ledger_root']))]
    if not matching:
        return {'last_path': str(path)}
    root = max(matching, key=lambda row: len(PureWindowsPath(row['ledger_root']).parts))
    return {'root': root['id'], 'relative': '/'.join(path.parent.relative_to(PureWindowsPath(root['ledger_root'])).parts),
            'focus_name': path.name}
