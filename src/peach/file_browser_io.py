"""受媒体根约束的文件浏览器写操作，由挂载子进程执行。"""
from __future__ import annotations

import ctypes
import errno
import os
import stat
import sys

from .media_io import move
from .nas_directories import resolve_directory
from .user_messages import UserValueError


def _checked(boundary, parts):
    path = boundary
    for part in parts:
        path = path / part
        info = path.lstat()
        if stat.S_ISLNK(info.st_mode) or getattr(info, 'st_file_attributes', 0) & stat.FILE_ATTRIBUTE_REPARSE_POINT:
            raise UserValueError('errors.nasDirectories.outsideRoots')
    return path


def change_directory(root, cloud, action, source, destination, directory):
    boundary, _ = resolve_directory(root, [root], cloud)
    target_parent = _checked(boundary, destination[:-1])
    if not target_parent.is_dir():
        raise NotADirectoryError(str(target_parent))
    target = target_parent / destination[-1]
    if action == 'mkdir':
        target.mkdir()
        return
    current = _checked(boundary, source)
    if current.is_dir() != directory or (not directory and not current.is_file()):
        raise UserValueError('api.fileBrowser.changed')
    if os.name == 'nt':
        # Windows 的 rename 不覆盖目标；复用现有挂载移动及仅改大小写的处理。
        result = move(str(current), str(target), str(current).casefold() == str(target).casefold())
        if result == 'taken':
            raise FileExistsError(str(target))
        if result == 'missing':
            raise FileNotFoundError(str(current))
    elif sys.platform.startswith('linux'):
        rename = getattr(ctypes.CDLL(None, use_errno=True), 'renameat2', None)
        _atomic_rename(rename, (-100, os.fsencode(current), -100, os.fsencode(target), 1), target)
    elif sys.platform == 'darwin':
        rename = getattr(ctypes.CDLL(None, use_errno=True), 'renamex_np', None)
        _atomic_rename(rename, (os.fsencode(current), os.fsencode(target), 4), target)
    else:
        raise OSError(errno.ENOTSUP, 'exclusive rename is unavailable', str(target))


def _atomic_rename(rename, args, target):
    # Linux RENAME_NOREPLACE / macOS RENAME_EXCL 在目标同时被其他应用创建时仍拒绝覆盖。
    if rename is None:
        raise OSError(errno.ENOTSUP, 'exclusive rename is unavailable', str(target))
    if rename(*args) != 0:
        code = ctypes.get_errno()
        raise OSError(code, os.strerror(code), str(target))
