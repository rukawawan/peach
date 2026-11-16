"""按原生线程身份读取 CPU 时间，按执行进程可用容量归一化。"""
from __future__ import annotations

import ctypes
import errno
import re
import sys
from functools import lru_cache
from pathlib import Path, PurePosixPath

import psutil


class ThreadInfo(ctypes.Structure):
    _fields_ = [('user', ctypes.c_uint64), ('system', ctypes.c_uint64),
                ('scheduling', ctypes.c_int32 * 8), ('name', ctypes.c_char * 64)]


@lru_cache(maxsize=1)
def _libproc():
    library = ctypes.CDLL('/usr/lib/libproc.dylib', use_errno=True)
    library.proc_pidinfo.argtypes = (ctypes.c_int, ctypes.c_int, ctypes.c_uint64,
                                     ctypes.c_void_p, ctypes.c_int)
    library.proc_pidinfo.restype = ctypes.c_int
    return library


def thread_times(process, identities):
    if sys.platform != 'darwin':
        return {thread.id: thread.user_time + thread.system_time
                for thread in process.threads() if thread.id in identities}
    result = {}
    library = _libproc()
    for identity in identities:
        info = ThreadInfo()
        ctypes.set_errno(0)
        size = library.proc_pidinfo(process.pid, 15, identity, ctypes.byref(info), ctypes.sizeof(info))
        if size != ctypes.sizeof(info):
            code = ctypes.get_errno()
            if code == errno.ESRCH:
                continue  # 采样前线程已退出。
            raise OSError(code, 'macOS native thread CPU time not available')
        result[identity] = (info.user + info.system) / 1_000_000_000
    return result


def _unescape(value):
    return re.sub(r'\\([0-7]{3})', lambda match: chr(int(match[1], 8)), value)


def cgroup_capacity(proc_root, pid):
    """读取当前挂载命名空间中可见的 v1/v2 CPU 配额，包括可见父组。"""
    memberships = {}
    for line in (proc_root / str(pid) / 'cgroup').read_text().splitlines():
        _hierarchy, controllers, group = line.split(':', 2)
        for controller in controllers.split(','):
            memberships[controller] = PurePosixPath(group)
    capacities = []
    for line in (proc_root / str(pid) / 'mountinfo').read_text().splitlines():
        before, after = line.split(' - ', 1)
        fields, filesystem = before.split(), after.split()
        unified = filesystem[0] == 'cgroup2'
        if not unified and not (filesystem[0] == 'cgroup' and 'cpu' in filesystem[2].split(',')):
            continue
        group = memberships.get('' if unified else 'cpu')
        root = PurePosixPath(_unescape(fields[3]))
        if group is None or not group.is_relative_to(root):
            continue
        mount = Path(_unescape(fields[4]))
        current = mount.joinpath(*group.relative_to(root).parts)
        if '..' in group.parts:
            raise ValueError("CPU cgroup path isn't accessible")
        while True:
            try:
                if unified:
                    quota, period = (current / 'cpu.max').read_text().split()
                else:
                    quota = (current / 'cpu.cfs_quota_us').read_text().strip()
                    period = (current / 'cpu.cfs_period_us').read_text().strip()
                if int(period) <= 0:
                    raise ValueError("invalid CPU cgroup period")
                if quota not in ('max', '-1'):
                    if int(quota) <= 0:
                        raise ValueError("invalid CPU cgroup quota")
                    capacities.append(int(quota) / int(period))
            except FileNotFoundError:
                pass  # 根组或未启用 CPU 控制器的组没有配额文件。
            if current == mount:
                break
            current = current.parent
    return min(capacities) if capacities else None


def cpu_capacity(process):
    capacity = psutil.cpu_count()
    if not capacity:
        raise ValueError("total CPU capacity not available")
    if sys.platform.startswith('linux'):
        allowed = process.cpu_affinity()
        if not allowed:
            raise ValueError("CPU affinity of the process not available")
        capacity = min(capacity, len(allowed))
        quota = cgroup_capacity(Path('/proc'), process.pid)
        if quota is not None:
            capacity = min(capacity, quota)
    return capacity
