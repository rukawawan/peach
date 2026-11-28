"""文件浏览器的同根目录操作与可还原回收站。"""
from __future__ import annotations

from contextlib import contextmanager
import json
import ntpath
from pathlib import Path, PureWindowsPath
import re
import sqlite3
import time
from uuid import uuid4

from filelock import FileLock

from . import media_io
from .discovery_rules import FILE_BROWSER_TRASH, file_browser_trash_path, system_directory
from .fsutil import atomic_write_text
from .media_folders import path_predicate
from .media_sources import CLOUD_LOCATIONS
from .user_messages import UserFacingError, UserOSError, UserValueError, error_fields, nested_message
from .web_media_directory import media_roots, relative_parts

MAX_ITEMS = 100
_TOKEN = re.compile(r'[0-9a-f]{32}')
_INVALID_NAME = re.compile(r'[<>:"/\\|?*\x00-\x1f]|[ .]$')


def _scope(root_id):
    roots = media_roots()
    root = next((item for item in roots if item['id'] == root_id), None)
    if root is None:
        raise UserValueError('errors.nasDirectories.outsideRoots')
    return root, roots


def _archive(contract):
    return Path(contract.candidate_root) / 'file-browser-trash'


def _receipt(folder, identity):
    path = folder / f'{identity}.json'
    try:
        return json.loads(path.read_text(encoding='utf-8'))
    except FileNotFoundError:
        raise UserValueError('api.fileBrowser.trashMissing') from None


def q_file_browser_trash(contract, args):
    root_id = args.get('root')
    roots = {root['id']: root for root in media_roots()}
    if root_id and root_id not in roots:
        raise UserValueError('errors.nasDirectories.outsideRoots')
    folder = _archive(contract)
    rows = []
    for path in folder.glob('*.json'):
        try:
            item = _receipt(folder, path.stem)
        except UserValueError:  # 此时另一个请求刚完成还原。
            continue
        if not root_id or item['root'] == root_id:
            root = roots.get(item['root'])
            rows.append({'id': path.stem, 'name': item['source'][-1], 'directory': item['directory'],
                         'relative': '/'.join(item['source'][:-1]), 'at': item['at'], 'ready': item['ready'],
                         'kind': 'file', 'root': item['root'], 'available': root is not None,
                         'library': root['name'] if root else item.get('library', '')})
    if not root_id:
        rows.extend(_catalog_trash(contract, roots.values()))
    return {'items': sorted(rows, key=lambda row: (-row['at'], row['name']))}


def _catalog_trash(contract, roots):
    with contract.read_connection() as connection:
        for asset_id, location, path, name, at in connection.execute(
                "SELECT id,location,path,name,feedback_at FROM asset WHERE disposal='trash'"):
            if file_browser_trash_path(path):
                continue
            file = PureWindowsPath(path) if path else None
            root = max((item for item in roots if file and item['location'] == location and
                        file.parent.is_relative_to(PureWindowsPath(item['ledger_root']))),
                       key=lambda item: len(item['ledger_root']), default=None)
            relative = '/'.join(file.parent.relative_to(PureWindowsPath(root['ledger_root'])).parts) if root else (
                str(file.parent) if file else '')
            yield {'id': f'asset:{asset_id}', 'asset_id': asset_id, 'name': file.name if file else name or str(asset_id),
                   'kind': 'catalog', 'directory': False, 'relative': relative, 'at': at or 0, 'ready': True,
                   'available': True, 'library': root['name'] if root else ''}


def _leaf(value):
    if (not isinstance(value, str) or not 0 < len(value) <= 255 or _INVALID_NAME.search(value)
            or system_directory(value) or ntpath.isreserved(value)):
        raise UserValueError('api.fileBrowser.invalidName')
    return value


def _location(root, parts):
    return str(PureWindowsPath(root['ledger_root']).joinpath(*parts))


def _protect_nested(root, roots, parts):
    if not parts:
        return
    boundaries = (Path(root['mount']), PureWindowsPath(root['ledger_root']))
    paths = tuple(boundary.joinpath(*parts) for boundary in boundaries)
    for other in roots:
        if other['id'] != root['id']:
            for boundary, path, nested in zip(boundaries, paths, (Path(other['mount']), PureWindowsPath(other['ledger_root']))):
                if nested.is_relative_to(boundary) and (nested.is_relative_to(path) or path.is_relative_to(nested)):
                    raise UserValueError('api.fileBrowser.configuredRoot')


def _rows(connection, location, original, directory):
    if directory:
        clause, values = path_predicate(location, original)
    else:
        clause, values = "a.location=? AND replace(a.path,'/',char(92))=? COLLATE NOCASE", [location, original]
    return [tuple(row) for row in connection.execute(
        f'SELECT a.id,a.path,a.disposal,a.disposal_reason FROM asset a WHERE {clause} ORDER BY a.id', values)]


def _with_path_change(contract, root, changed, source, target, directory, operation, previous=None):
    original, destination = _location(root, source), _location(root, target)
    same_name = original.casefold() == destination.casefold()
    with contract.read_connection() as connection:
        before = _rows(connection, root['location'], original, directory)
        if not same_name and _rows(connection, root['location'], destination, directory):
            raise UserValueError('api.fileBrowser.catalogConflict')
    changed('move', source, target, directory)
    try:
        if before:
            with contract.write_transaction() as connection:
                if before != _rows(connection, root['location'], original, directory) or (
                        not same_name and _rows(connection, root['location'], destination, directory)):
                    raise UserValueError('api.fileBrowser.changed')
                for asset_id, path, disposal, reason in before:
                    tail = PureWindowsPath(path).relative_to(PureWindowsPath(original)).parts if directory else ()
                    new_path = str(PureWindowsPath(destination).joinpath(*tail))
                    if operation == 'trash':
                        disposal, reason = 'trash', 'manual'
                    elif operation == 'restore':
                        disposal, reason = previous.get(str(asset_id), (None, None))
                    connection.execute('UPDATE asset SET path=?,name=?,disposal=?,disposal_reason=? WHERE id=?',
                                       (new_path, ntpath.basename(new_path), disposal, reason, asset_id))
    except (sqlite3.Error, UserFacingError) as cause:
        try:
            changed('move', target, source, directory)
        except (OSError, UserFacingError) as error:
            raise UserOSError('api.fileBrowser.rollbackFailed', {'error': nested_message(error)}) from cause
        raise UserOSError('api.fileBrowser.catalogRolledBack', {'error': nested_message(cause)}) from cause


@contextmanager
def _writer(root, sample):
    cloud = root['location'] in CLOUD_LOCATIONS
    if root['location'] != 'pikpak':
        with media_io.MountWorker() as worker:
            def native(action, source, target, directory):
                return worker.call('change_directory', root['mount'], cloud, action, source, target, directory, timeout=15)
            yield native
        return
    from .organize_clouddrive import UnconfirmedMove, pikpak_renames
    from .platform import location_roots
    with pikpak_renames(_location(root, sample), location_roots()) as drive:
        def verified(action, source, target, directory):
            destination = _location(root, target)
            parent = str(PureWindowsPath(destination).parent)
            if action == 'mkdir':
                status, _reply = drive.request('MKCOL', destination)
                if status in (405, 409) and any(row['path'] == destination for row in drive.list(parent)):
                    raise FileExistsError(destination)
                if status != 201 or not any(row['path'] == destination and row['directory'] for row in drive.refresh(parent)):
                    raise UserOSError('api.fileBrowser.unverified')
                return
            drive.list(parent)
            try:
                drive.move(_location(root, source), destination)
            except UnconfirmedMove as error:
                raise UserOSError('api.fileBrowser.unverified') from error
        yield verified


def _save(folder, identity, record):
    atomic_write_text(folder / f'{identity}.json', json.dumps(record, ensure_ascii=False))


def _trash(contract, root, folder, changed, source, directory):
    identity = uuid4().hex
    for parts in ((FILE_BROWSER_TRASH,), (FILE_BROWSER_TRASH, identity)):
        try:
            changed('mkdir', (), parts, True)
        except FileExistsError:
            if len(parts) != 1:
                raise
    target = (FILE_BROWSER_TRASH, identity, source[-1])
    with contract.read_connection() as connection:
        rows = _rows(connection, root['location'], _location(root, source), directory)
    record = {'root': root['id'], 'library': root['name'], 'source': source, 'target': target, 'directory': directory,
              'at': time.time(), 'ready': False, 'previous': {str(i): [disposal, reason] for i, _, disposal, reason in rows}}
    _save(folder, identity, record)
    try:
        _with_path_change(contract, root, changed, source, target, directory, 'trash')
    except (FileExistsError, FileNotFoundError, PermissionError, UserValueError):
        (folder / f'{identity}.json').unlink()
        raise
    record['ready'] = True
    _save(folder, identity, record)
    return identity


def _restore(contract, root, folder, changed, identity, record):
    _with_path_change(contract, root, changed, record['target'], record['source'],
                      record['directory'], 'restore', record['previous'])
    (folder / f'{identity}.json').unlink()


def _entry_error(error):
    if isinstance(error, UserFacingError):
        return error_fields(error)
    code = ('targetExists' if isinstance(error, FileExistsError) else 'sourceMissing' if isinstance(error, FileNotFoundError)
            else 'unverified' if isinstance(error, TimeoutError) else 'operationFailed')
    return error_fields(UserOSError(f'api.fileBrowser.{code}', {'error': str(error)}))


def _make_directory(root, roots, parent, name):
    target = (*parent, _leaf(name))
    _protect_nested(root, roots, target)
    try:
        with _writer(root, parent) as changed:
            changed('mkdir', (), target, True)
    except (OSError, UserFacingError) as error:
        return {'name': target[-1], 'ok': False, **_entry_error(error)}
    return {'name': target[-1], 'ok': True}


def w_file_browser(contract, body):
    if not isinstance(body, dict) or body.get('operation') not in ('mkdir', 'rename', 'move', 'trash', 'restore'):
        raise UserValueError('api.fileBrowser.invalidRequest')
    root, roots = _scope(body.get('root'))
    operation = body['operation']
    parent = relative_parts(body.get('relative', ''))
    destination = relative_parts(body.get('destination', '')) if operation == 'move' else parent
    folder = _archive(contract)
    folder.mkdir(parents=True, exist_ok=True)
    with FileLock(str(folder / '.lock')):
        if operation == 'mkdir':
            return {'items': [_make_directory(root, roots, parent, body.get('name'))]}
        if operation == 'restore':
            return {'items': _restore_items(contract, root, roots, folder, body.get('ids'))}
        entries = body.get('entries')
        if (not isinstance(entries, list) or not 0 < len(entries) <= MAX_ITEMS or
                any(not isinstance(row, dict) or type(row.get('directory')) is not bool for row in entries) or
                (operation == 'rename' and len(entries) != 1)):
            raise UserValueError('api.fileBrowser.invalidRequest')
        names = [_leaf(row.get('name')) for row in entries]
        if len(set(names)) != len(names):
            raise UserValueError('api.fileBrowser.invalidRequest')
        renamed = _leaf(body.get('name')) if operation == 'rename' else None
        moves = []
        for name, row in zip(names, entries):
            source, target = (*parent, name), (*destination, renamed or name)
            _protect_nested(root, roots, source)
            if operation != 'trash':
                _protect_nested(root, roots, target)
                if source == target or (row['directory'] and len(target) > len(source) and
                                       PureWindowsPath(*target).is_relative_to(PureWindowsPath(*source))):
                    raise UserValueError('api.fileBrowser.invalidTarget')
            moves.append((source, target, row['directory']))
        results = []
        with _writer(root, moves[0][0]) as changed:
            for source, target, directory in moves:
                try:
                    if operation == 'trash':
                        identity = _trash(contract, root, folder, changed, source, directory)
                        results.append({'name': source[-1], 'ok': True, 'id': identity})
                    else:
                        _with_path_change(contract, root, changed, source, target, directory, operation)
                        results.append({'name': source[-1], 'ok': True})
                except (OSError, UserFacingError) as error:
                    results.append({'name': source[-1], 'ok': False, **_entry_error(error)})
        return {'items': results}


def _restore_items(contract, root, roots, folder, ids):
    if (not isinstance(ids, list) or not 0 < len(ids) <= MAX_ITEMS or
            any(not isinstance(item, str) or not _TOKEN.fullmatch(item) for item in ids)):
        raise UserValueError('api.fileBrowser.invalidRequest')
    records = [(identity, _receipt(folder, identity)) for identity in dict.fromkeys(ids)]
    if any(row['root'] != root['id'] for _, row in records):
        raise UserValueError('api.fileBrowser.trashMissing')
    results = []
    with _writer(root, records[0][1]['target']) as changed:
        for identity, row in records:
            name = row['source'][-1]
            try:
                _protect_nested(root, roots, row['source'])
                _restore(contract, root, folder, changed, identity, row)
                results.append({'name': name, 'ok': True, 'id': identity})
            except (OSError, UserFacingError) as error:
                results.append({'name': name, 'ok': False, 'id': identity, **_entry_error(error)})
    return results
