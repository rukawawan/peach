"""Linux DRM fdinfo 的逐进程引擎时间；容器仅读取已映射设备及当前 PID 空间。"""
from __future__ import annotations

from pathlib import Path
import re
import time

from .gpu_usage import unavailable_reason
from .user_messages import UserValueError, nested_message


class LinuxGpuCounters:
    def __init__(self, *, proc=Path('/proc'), devices=Path('/dev/dri'), clock=time.monotonic):
        self.proc, self.devices, self.clock = proc, devices, clock
        self.previous = {}
        self.cache = {}
        self.now = None

    def sample(self):
        self.now = self.clock()
        self.cache = {}
        self.previous = {key: value for key, value in self.previous.items() if self.now - value[0] < 60}
        return None, 'sampling', unavailable_reason('waitingProcesses')

    def _read(self, pid):
        clients = {}
        for path in (self.proc / str(pid) / 'fdinfo').iterdir():
            try:
                text = path.read_text()
            except FileNotFoundError:
                continue
            fields = dict(line.split(':', 1) for line in text.splitlines() if ':' in line)
            fields = {key: value.strip() for key, value in fields.items()}
            if 'drm-driver' not in fields:
                continue
            client = fields.get('drm-client-id')
            if client is None or not client.isdigit():
                raise UserValueError('errors.gpuLinux.clientIdMissing')
            device = fields.get('drm-pdev', fields['drm-driver'])
            engines = {}
            for key, value in fields.items():
                if not key.startswith('drm-engine-') or key.startswith('drm-engine-capacity-'):
                    continue
                name = key.removeprefix('drm-engine-')
                match = re.fullmatch(r'(\d+)\s+ns', value)
                capacity = fields.get(f'drm-engine-capacity-{name}', '1')
                if match is None or not capacity.isdigit() or int(capacity) <= 0:
                    raise UserValueError('errors.gpuLinux.engineFormatInvalid')
                engines[f'{device}:{name}'] = (int(match[1]), int(capacity))
            if not engines:
                raise UserValueError('errors.gpuLinux.engineTimeMissing')
            clients[(device, client)] = engines
        return clients

    def _process(self, pid, created):
        identity = (pid, created)
        if identity in self.cache:
            return self.cache[identity]
        clients = self._read(pid)
        values, sampling = {}, False
        for client, engines in clients.items():
            for engine, (busy, capacity) in engines.items():
                key = (pid, created, client, engine)
                old = self.previous.get(key)
                if old is None:
                    sampling = True
                    self.previous[key] = (self.now, busy)
                    continue
                elapsed = self.now - old[0]
                if elapsed <= 0:
                    sampling = True
                    continue
                # DRM 允许短暂回退；保留高水位，避免恢复时重复累计。
                if busy >= old[1]:
                    values[engine] = values.get(engine, 0) + 100 * (busy - old[1]) / 1e9 / elapsed / capacity
                    self.previous[key] = (self.now, busy)
                else:
                    values.setdefault(engine, 0.0)
        result = (values, sampling, set(clients))
        self.cache[identity] = result
        return result

    def sample_processes(self, processes):
        if not self.devices.exists():
            return None, 'unavailable', unavailable_reason('noDrmDevice')
        result, clients, sampling = {}, set(), False
        try:
            for pid, created in processes.items():
                values, pending, owned = self._process(pid, created)
                if clients & owned:
                    return None, 'unavailable', unavailable_reason('sharedClient')
                clients.update(owned)
                sampling |= pending
                result[pid] = values
        except (OSError, ValueError) as error:
            return None, 'unavailable', unavailable_reason('taskCounter', error=nested_message(error))
        if sampling:
            return None, 'sampling', unavailable_reason('waiting')
        return result, 'ready', ''

    def close(self):
        self.previous.clear()
        self.cache.clear()
