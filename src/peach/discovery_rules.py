"""全量扫描、推送与下载登记共用的系统元数据判据。"""
from pathlib import PureWindowsPath
import re


# 厂商保留名称的来源与边界见 docs/REUSE.md「系统元数据发现过滤」。
_DIRECTORIES = frozenset({
    '@eadir', '@tmp', '@sharebin', '#recycle', '#snapshot', '@snapshot',
    '@recycle', '@recently-snapshot', '.@__thumb', '.@__qini', '.@upload_cache', '.streams',
    '.zfs', '.snapshot', '.snapshots', '~snapshot', '.recycle', '.trash', '.@#local',
    '.appledouble', '.appledesktop', '.appledb', 'network trash folder',
    '.spotlight-v100', '.trashes', '.temporaryitems', '.fseventsd', '__macosx',
    '$recycle.bin', 'system volume information',
})
_FILES = frozenset({
    'desktop.ini', 'thumbs.db', '.ds_store', '.localized', 'icon\r', '.volumeicon.icns',
})


def system_directory(name: str) -> bool:
    lowered = name.casefold()
    return (lowered in _DIRECTORIES or lowered.startswith('.wfm_upload')
            or re.fullmatch(r'\.trash-[0-9]+|\.documentrevisions-v100(-bad-[0-9]+)?', lowered) is not None)


def system_file(name: str) -> bool:
    lowered = name.casefold()
    return (lowered in _FILES or lowered.startswith(('._', '.synoppsdb', '.wfm_upload'))
            or lowered.endswith('@synoeastream'))


def system_path(path: str) -> bool:
    parts = PureWindowsPath(path).parts
    return any(system_directory(part) for part in parts) or (
        bool(parts) and system_file(parts[-1]))
