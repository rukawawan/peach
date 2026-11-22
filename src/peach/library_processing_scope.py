"""馆藏处理按媒体库身份限制目录、估算与资产集合。"""
import json
import sqlite3
from contextlib import closing
from pathlib import PureWindowsPath

from . import media_io
from .discovery_rules import system_path
from .media_identity import catalog, project
from .media_libraries import predicate
from .platform import resolve_root, within_root
from .user_messages import UserValueError


def scoped_config(config, library_id):
    if library_id is None:
        return config
    libraries, roots = catalog(config)
    if not isinstance(library_id, str) or library_id not in libraries:
        raise UserValueError('errors.libraryProcessingScope.libraryGone')
    chosen = {key: value for key, value in roots.items() if value['library_id'] == library_id}
    if not chosen:
        raise UserValueError('errors.libraryProcessingScope.noDirectories')
    return project(config, {library_id: libraries[library_id]}, chosen)


def scoped_assets(config, db_path, library_id, asset_ids=None):
    if library_id is None:
        return asset_ids
    clause, values = predicate(config, library_id)
    query = "SELECT a.id FROM asset a WHERE a.medium='video' AND a.disposal IS NULL AND " + clause
    if asset_ids is not None:
        query += ' AND a.id IN (SELECT value FROM json_each(?))'
        values.append(json.dumps(asset_ids))
    with closing(sqlite3.connect(db_path, timeout=30)) as connection:
        return [row[0] for row in connection.execute(query + ' ORDER BY a.id', values)]


def _directory_target(config, directory):
    from .scan import walk_root_for

    if not isinstance(directory, str) or not directory or any(ord(char) < 32 for char in directory):
        raise UserValueError('api.libraryProcessing.directoryOutsideLibrary')
    path = PureWindowsPath(directory)
    source, index, tail = resolve_root(str(path), config.locations)
    if (source is None or not path.is_absolute() or system_path(str(path))
            or any(part.endswith(('.', ' ')) or any(char in part for char in ':*?"<>|') for part in tail)):
        raise UserValueError('api.libraryProcessing.directoryOutsideLibrary')
    root = config.locations[source][index]
    libraries, roots = catalog(config)
    root_id, info = next((key, info) for key, info in roots.items() if PureWindowsPath(info['root']) == PureWindowsPath(root))
    path = PureWindowsPath(root, *tail)
    target = walk_root_for(source, str(path), declared_roots=config.locations, mounts=config.mounts)
    anchor = walk_root_for(source, root, declared_roots=config.locations, mounts=config.mounts) if tail else None
    try:
        media_io.bounded(media_io.mount_key(target), _check_directory_target, target, anchor)
    except OSError as error:
        raise UserValueError('api.libraryProcessing.directoryUnavailable') from error
    return libraries, root_id, info, path, target


def _check_directory_target(target, anchor):
    if anchor is not None and not within_root(target.resolve(), anchor.resolve()):
        raise UserValueError('api.libraryProcessing.directoryOutsideLibrary')
    if not target.is_dir():
        raise UserValueError('api.libraryProcessing.directoryUnavailable')


def directory_config(config, directory):
    """将扫描和估算投影到选中的子树，保留根目录的存储与媒体库身份。"""
    libraries, root_id, info, path, target = _directory_target(config, directory)
    from .smb_media import SmbResource
    library_id = info['library_id']
    mount = info.get('mount', '') if isinstance(target, SmbResource) else str(target)
    return project(config, {library_id: libraries[library_id]}, {
        root_id: {**info, 'root': str(path), 'mount': mount},
    })


def directory_choices(config, directory=None):
    """列出所选媒体库的根目录，或当前目录下可以进入的子目录。"""
    if directory is None:
        libraries, roots = catalog(config)
        return {'directories': [
            {'path': info['root'], 'name': info['root'], 'library': libraries[info['library_id']]['name']}
            for info in roots.values()
        ]}
    _, _, info, path, target = _directory_target(config, directory)
    try:
        entries = media_io.directory_entries(target)
        names = [entry.name for entry in entries if entry.directory and not entry.symlink and not entry.error]
    except OSError as error:
        raise UserValueError('api.libraryProcessing.directoryUnavailable') from error
    return {
        'current': str(path),
        'parent': None if path == PureWindowsPath(info['root']) else str(path.parent),
        'directories': [{'name': name, 'path': str(path / name)}
                        for name in sorted(names, key=str.casefold) if not system_path(str(path / name))],
    }
