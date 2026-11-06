"""在可终止的只读子进程中访问媒体挂载；账本与任务状态由调用方保存。"""
from __future__ import annotations

import argparse
import base64
import errno
import json
import os
import stat
from pathlib import Path
import subprocess
import sys
from types import SimpleNamespace

TIMEOUT_SECONDS = 20.0
OPERATIONS = ('directory', 'files', 'nfo', 'art', 'online', 'resolve', 'stat')


def _request(operation, path, *, value='', timeout=None):
    from .smb_media import resolve
    remote = resolve(path)
    if remote is not None:
        if timeout is not None:
            from dataclasses import replace
            if timeout <= 0:
                raise TimeoutError(errno.ETIMEDOUT, '媒体读取已超过期限')
            remote = replace(remote, connection=replace(remote.connection, timeout=min(remote.connection.timeout, timeout)))
        return _read(operation, remote, value)
    command = ([sys.executable, 'media-read'] if getattr(sys, 'frozen', False)
               else [sys.executable, '-m', 'peach.media_io'])
    try:
        result = subprocess.run([*command, operation, str(path), value],
            stdin=subprocess.DEVNULL, stdout=subprocess.PIPE, stderr=subprocess.PIPE,
            timeout=TIMEOUT_SECONDS if timeout is None else timeout,
            creationflags=subprocess.CREATE_NO_WINDOW if os.name == 'nt' else 0)
    except subprocess.TimeoutExpired as error:
        raise TimeoutError(errno.ETIMEDOUT, '读取媒体目录或配套文件超时，已跳过，可重试', str(path)) from error
    if result.returncode:
        raise OSError(errno.EIO, '媒体读取进程未完成', str(path))
    response = json.loads(result.stdout)
    if 'error' in response:
        error = response['error']
        if error['kind'] == 'value':
            raise ValueError(error['message'])
        raise OSError(error.get('errno'), error['message'], str(path))
    return response['value']


class DirectoryEntry:
    """目录快照中的条目，属性访问不再触碰媒体盘。"""

    def __init__(self, value):
        self.__dict__.update(value)

    def is_dir(self):
        return self.directory

    def is_symlink(self):
        return self.symlink

    def stat(self):
        if self.error:
            raise OSError(errno.EIO, self.error, self.path)
        return SimpleNamespace(**self.attributes)


def directory_entries(path, *, file_identity=False):
    return [DirectoryEntry(value) for value in _request('directory', path, value='identity' if file_identity else '')]


def directory_files(path):
    from .smb_media import resolve
    return {name: resolve(value) or Path(value) for name, value in _request('files', path).items()}


def read_nfo(path):
    from .smb_media import resolve
    if remote := resolve(path):
        from .library_nfo import read_nfo as read_remote_nfo
        return read_remote_nfo(remote)
    from .processing_traffic import record_media_read
    payload, encoded = _request('nfo', path)
    raw = base64.b64decode(encoded)
    record_media_read(path, len(raw))
    return payload, raw


def local_art(video, payload):
    value = payload.get('local_art', '')
    if not value or '://' in value:
        return None
    found = _request('art', video, value=value)
    from .smb_media import resolve
    return (resolve(found) or Path(found)) if found else None


def root_online(path):
    return _request('online', path)


def resolve_case_insensitive(path):
    from .platform import translate_ledger_path
    from .smb_media import resolve
    return _request('resolve', resolve(path) or translate_ledger_path(path))


def file_stat(path, *, timeout=None):
    return SimpleNamespace(**_request('stat', path, timeout=timeout))


def _attributes(stat):
    return {key: getattr(stat, key) for key in ('st_size', 'st_mtime', 'st_mtime_ns', 'st_mode',
            'st_ino', 'st_dev', 'st_birthtime_ns') if hasattr(stat, key)}


def _read(operation, path, value):
    if operation == 'directory':
        from .smb_media import SmbResource
        if isinstance(path, SmbResource):
            return [dict(name=entry.name, path=str(path / entry.name), directory=entry.is_dir,
                         symlink=entry.is_symlink, error='', attributes=dict(st_size=entry.size,
                         st_mtime=entry.mtime, st_mtime_ns=entry.mtime_ns,
                         st_mode=stat.S_IFDIR if entry.is_dir else stat.S_IFREG)) for entry in path.scandir()]
        result = []
        with os.scandir(path) as entries:
            for entry in entries:
                item = dict(name=entry.name, path=entry.path, directory=False, symlink=False,
                            attributes={}, error='')
                try:
                    item.update(directory=entry.is_dir(), symlink=entry.is_symlink())
                    if not item['directory']:
                        info = entry.stat()
                        # Windows 的目录快照没有文件 ID；仅本地身份请求在子进程内补读。
                        if value == 'identity' and not info.st_ino:
                            info = os.stat(entry.path)
                        item['attributes'] = _attributes(info)
                except OSError as error:
                    item['error'] = str(error)
                result.append(item)
        return result
    if operation in ('files', 'nfo', 'art'):
        from . import library_nfo
        if operation == 'files':
            return {key: str(value) for key, value in library_nfo.directory_files(path).items()}
        if operation == 'art':
            found = library_nfo.local_art(path, {'local_art': value})
            return str(found) if found else None
        payload, raw = library_nfo.read_nfo(path)
        return payload, base64.b64encode(raw).decode('ascii')
    if operation == 'online':
        from .platform import root_online
        return root_online(path)
    if operation == 'resolve':
        from .media import resolve_case_insensitive
        return str(resolve_case_insensitive(str(path)))
    return _attributes(path.stat())


def main(argv=None):
    parser = argparse.ArgumentParser(description='限时读取媒体目录与配套文件')
    parser.add_argument('operation', choices=OPERATIONS)
    parser.add_argument('path', type=Path)
    parser.add_argument('value', nargs='?', default='')
    args = parser.parse_args(argv)
    try:
        response = {'value': _read(args.operation, args.path, args.value)}
    except (OSError, ValueError) as error:
        response = {'error': dict(kind='os' if isinstance(error, OSError) else 'value',
                                  errno=getattr(error, 'errno', None), message=str(error))}
    except Exception as error:
        from xml.etree.ElementTree import ParseError
        if not isinstance(error, ParseError):
            raise
        response = {'error': dict(kind='value', message=str(error))}
    try:
        print(json.dumps(response, ensure_ascii=True), flush=True)
    except OSError:
        # 父进程已超时离开、管道关闭时，结果没有读取方，不算故障。
        pass
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
