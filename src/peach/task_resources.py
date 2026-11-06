"""按已登记线程、子进程和实际传输计量任务资源，不使用整机占用代替任务占用。"""
from __future__ import annotations

import json
import math
import os
import sys
import threading
import time
from datetime import datetime, timezone

import psutil

from .fsutil import atomic_write_text
from .gpu_usage import GpuCounters
from .resource_platform import cpu_capacity, thread_times
from .update_tasks import state_for

_LIVE = {}
_LOCK = threading.RLock()
CPU_HIGH = 50.0
GPU_HIGH = 50.0
NETWORK_HIGH = 10 * 1024 * 1024


def _path(db, identity):
    return state_for(db).parent / 'task-controls' / f'{identity}.resources.json'


class Usage:
    def __init__(self, db, identity):
        self.db, self.identity = db, identity
        self.pid = os.getpid()
        self.created = psutil.Process().create_time()
        self.threads = {}
        self.processes = {}
        self.network_bytes = 0
        self.network_error = ''
        #: 读数未取得时传输走的是哪一路；`cloud` 是网盘挂载，界面据此写「网盘读取」。
        self.network_via = ''
        self.lock = threading.RLock()
        self.saved_at = 0.0
        with _LOCK:
            _LIVE[(str(db.resolve()), identity)] = self

    def snapshot(self):
        with self.lock:
            return {'pid': self.pid, 'created': self.created, 'threads': list(self.threads),
                    'processes': dict(self.processes), 'network_bytes': self.network_bytes,
                    'network_error': self.network_error, 'network_via': self.network_via}

    def publish(self, *, force=False):
        now = time.monotonic()
        with self.lock:
            if not force and now - self.saved_at < 1:
                return
            self.saved_at = now
            atomic_write_text(_path(self.db, self.identity), json.dumps(self.snapshot()))

    def enter_thread(self):
        identity = threading.get_native_id()
        with self.lock:
            self.threads[identity] = self.threads.get(identity, 0) + 1
        self.publish()

    def leave_thread(self):
        identity = threading.get_native_id()
        with self.lock:
            count = self.threads.get(identity, 0) - 1
            if count > 0:
                self.threads[identity] = count
            else:
                self.threads.pop(identity, None)
        self.publish()

    def enter_process(self, process):
        try:
            created = psutil.Process(process.pid).create_time()
        except psutil.NoSuchProcess:
            return
        with self.lock:
            self.processes[process.pid] = created
        self.publish(force=True)

    def leave_process(self, process):
        with self.lock:
            self.processes.pop(process.pid, None)
        self.publish(force=True)

    def close(self):
        with _LOCK:
            _LIVE.pop((str(self.db.resolve()), self.identity), None)


def record_download(size):
    from .task_control import CURRENT
    control = CURRENT.get()
    if control is not None and size > 0:
        with control.usage.lock:
            control.usage.network_bytes += size
        control.usage.publish()


def unobserved_network(reason, *, via=''):
    from .task_control import CURRENT
    control = CURRENT.get()
    if control is not None:
        with control.usage.lock:
            control.usage.network_error = reason
            control.usage.network_via = via
        control.usage.publish(force=True)


def media_input(path):
    from .task_control import CURRENT
    if CURRENT.get() is None:
        return
    from . import settings_file
    from .platform import resolve_root
    from .media_sources import CLOUD_LOCATIONS
    from .smb_media import resolve, source_identity
    raw = str(source_identity(path))
    config = settings_file.active()
    location, _index, _tail = resolve_root(raw, config.locations)
    if location in CLOUD_LOCATIONS:
        unobserved_network('网盘挂载的缓存与预读无法按任务取得实际网速', via='cloud')
    elif resolve(raw, config) is not None:
        unobserved_network('SMB 的缓存与预读无法按任务取得实际网速')


def _metric(state, field, value=None, reason='', threshold=0):
    return {'state': state, field: value, 'high': value is not None and value >= threshold,
            **({'reason': reason} if reason else {})}


class Monitor:
    def __init__(self, store, *, gpu=None, clock=time.monotonic):
        self.store, self.clock = store, clock
        self.gpu = gpu
        self.previous = {}
        self.rows = {}
        self.sampled_at = None
        self.lock = threading.RLock()

    def _owners(self, run):
        with _LOCK:
            live = _LIVE.get((str(self.store.database.db_path.resolve()), run.id))
        if live is not None:
            return live.snapshot()
        try:
            value = json.loads(_path(self.store.database.db_path, run.id).read_text(encoding='utf-8'))
        except FileNotFoundError:
            return None
        except (OSError, ValueError) as error:
            raise ValueError('这轮任务的资源归属记录未取得') from error
        if (not isinstance(value, dict) or type(value.get('pid')) is not int or value['pid'] <= 0
                or not isinstance(value.get('threads'), list)
                or not all(type(identity) is int and identity > 0 for identity in value['threads'])
                or not isinstance(value.get('processes'), dict)
                or not all(str(identity).isdigit() and int(identity) > 0
                           and type(created) in (int, float) and math.isfinite(created) and created > 0
                           for identity, created in value['processes'].items())
                or type(value.get('created')) not in (int, float)
                or not math.isfinite(value['created']) or value['created'] <= 0
                or type(value.get('network_bytes')) not in (int, float)
                or not math.isfinite(value['network_bytes']) or value['network_bytes'] < 0
                or not isinstance(value.get('network_error', ''), str)
                or not isinstance(value.get('network_via', ''), str)):
            raise ValueError('这轮任务的资源归属记录无效')
        if value.get('pid') != run.pid:
            return None
        return value

    def _sample(self, run, now, gpu, gpu_state, gpu_error):
        empty = {'cpu': _metric('unavailable', 'percent', reason='这轮任务尚未登记资源归属'),
                 'gpu': _metric('unavailable', 'percent', reason='这轮任务尚未登记资源归属'),
                 'network': _metric('unavailable', 'bytes_per_second', reason='这轮任务尚未登记传输计量')}
        try:
            owners = self._owners(run)
        except ValueError as error:
            for metric in empty.values():
                metric['reason'] = str(error)
            return empty
        if owners is None:
            return empty
        try:
            root = psutil.Process(owners['pid'])
            if root.create_time() != owners['created']:
                return empty
            wanted = set(owners['threads'])
            cpu = {f't:{root.pid}:{identity}': value
                   for identity, value in thread_times(root, wanted).items()}
            children = {}
            for pid, created in owners['processes'].items():
                try:
                    process = psutil.Process(int(pid))
                    if process.create_time() != created:
                        continue
                    for member in (process, *process.children(recursive=True)):
                        children[member.pid] = member
                except psutil.NoSuchProcess:
                    continue
            for pid, process in children.items():
                try:
                    times = process.cpu_times()
                    cpu[f'p:{pid}:{process.create_time()}'] = times.user + times.system
                except psutil.NoSuchProcess:
                    pass
        except (psutil.Error, OSError) as error:
            empty['cpu']['reason'] = f'任务 CPU 计数器未取得：{type(error).__name__}'
            return empty
        previous = self.previous.get(run.id)
        self.previous[run.id] = (now, cpu, owners['network_bytes'])
        parts = {}
        if previous is None:
            cpu_metric = _metric('sampling', 'percent')
            network_metric = _metric('sampling', 'bytes_per_second')
        else:
            elapsed = max(.001, now - previous[0])
            try:
                capacity = cpu_capacity(root)
            except (psutil.Error, OSError, ValueError) as error:
                cpu_metric = _metric('unavailable', 'percent', reason=f'执行端 CPU 可用容量未取得：{error}')
            else:
                parts = {key: 100 * max(0, value - previous[1].get(key, value)) / elapsed / capacity
                         for key, value in cpu.items()}
                cpu_metric = _metric('ready', 'percent', round(min(100.0, sum(parts.values())), 1), threshold=CPU_HIGH)
            rate = max(0.0, (owners['network_bytes'] - previous[2]) / elapsed)
            network_metric = _metric('ready', 'bytes_per_second', round(rate), threshold=NETWORK_HIGH)
        if owners.get('network_error'):
            network_metric = _metric('unavailable', 'bytes_per_second', reason=owners['network_error'])
            if owners.get('network_via'):
                network_metric['via'] = owners['network_via']
        if hasattr(self.gpu, 'sample_processes'):
            try:
                identities = {root.pid: root.create_time(), **{pid: child.create_time() for pid, child in children.items()}}
                gpu, gpu_state, gpu_error = self.gpu.sample_processes(identities)
            except psutil.Error as error:
                gpu, gpu_state, gpu_error = None, 'unavailable', f'GPU 进程身份未取得：{type(error).__name__}'
        gpu_metric = _metric(gpu_state, 'percent', reason=gpu_error)
        engines = {}
        gpu_parts = {}
        if gpu is not None:
            for pid in children:
                for engine, value in gpu.get(pid, {}).items():
                    gpu_parts[(pid, engine)] = value
                    engines[engine] = engines.get(engine, 0.0) + value
            shared = max(gpu.get(root.pid, {}).values(), default=0.0)
            if shared:
                gpu_metric = _metric('unavailable', 'percent', reason='共享服务进程的 GPU 使用无法准确归属到这一轮')
            else:
                gpu_metric = _metric('ready', 'percent', round(min(100.0, max(engines.values(), default=0.0)), 1), threshold=GPU_HIGH)
        return {'cpu': cpu_metric, 'gpu': gpu_metric, 'network': network_metric,
                '_cpu_parts': parts, '_gpu_parts': gpu_parts}

    def snapshot(self):
        with self.lock:
            now = self.clock()
            if self.sampled_at is not None and now - self.sampled_at < 1:
                return self.rows
            runs = self.store.query(status='running', limit=500)
            runs = [run for run in runs if run.host == self.store.host]
            if not runs:
                self.rows, self.previous, self.sampled_at = {}, {}, now
                return self.rows
            if self.gpu is None:
                if sys.platform.startswith('linux'):
                    from .gpu_linux import LinuxGpuCounters
                    self.gpu = LinuxGpuCounters()
                else:
                    self.gpu = GpuCounters()
            gpu, state, reason = self.gpu.sample()
            stamp = datetime.now(timezone.utc).isoformat()
            self.rows = {run.id: {**self._sample(run, now, gpu, state, reason), 'sampled_at': stamp,
                         'detail': 'CPU 按已登记工作线程及子进程计量，占执行端可用容量（容器按可见 CPU 配额）；GPU 为所属子进程最忙引擎；网络为已观测下载速率。'}
                         for run in runs}
            active = {run.id for run in runs}
            self.previous = {key: value for key, value in self.previous.items() if key in active}
            self.sampled_at = now
            return self.rows

    def close(self):
        if self.gpu is not None:
            self.gpu.close()

    def for_run(self, run):
        with self.store.database.read_connection() as connection:
            family = connection.execute(
                'WITH RECURSIVE family(id) AS (SELECT ? UNION ALL '
                'SELECT t.id FROM task_run t JOIN family f ON t.parent_run_id=f.id) '
                "SELECT id,status FROM task_run WHERE id IN (SELECT id FROM family) AND status IN ('pending','running')",
                (run.id,)).fetchall()
        if not family:
            return None
        rows = self.snapshot()
        waiting = {'cpu': _metric('ready', 'percent', 0.0, threshold=CPU_HIGH),
                   'gpu': _metric('ready', 'percent', 0.0, threshold=GPU_HIGH),
                   'network': _metric('ready', 'bytes_per_second', 0.0, threshold=NETWORK_HIGH)}
        unknown = {'cpu': _metric('unavailable', 'percent', reason='执行端的资源读数未取得'),
                   'gpu': _metric('unavailable', 'percent', reason='执行端的资源读数未取得'),
                   'network': _metric('unavailable', 'bytes_per_second', reason='执行端的传输读数未取得')}
        samples = [waiting if row['status'] == 'pending' else rows.get(row['id'], unknown) for row in family]
        result = {'sampled_at': datetime.now(timezone.utc).isoformat(),
                  'detail': 'CPU 为已登记工作线程及所属子进程占执行端可用容量（容器按可见 CPU 配额），未包含无法归属的共享原生线程；GPU 为所属子进程最忙引擎；网络为已观测下载速率，未取得时不报告零值。颜色加深阈值：CPU/GPU 50%，网络 10 MiB/s，仅作显示提示。'}
        for name, field, threshold in (('cpu', 'percent', CPU_HIGH), ('gpu', 'percent', GPU_HIGH),
                                       ('network', 'bytes_per_second', NETWORK_HIGH)):
            values = [sample[name] for sample in samples]
            unavailable = next((value for value in values if value['state'] == 'unavailable'), None)
            if unavailable is not None:
                result[name] = dict(unavailable)
            elif any(value['state'] == 'sampling' for value in values):
                result[name] = _metric('sampling', field)
            else:
                if name == 'cpu':
                    parts = {}
                    for sample in samples:
                        for key, value in sample.get('_cpu_parts', {}).items():
                            parts[key] = max(parts.get(key, 0.0), value)
                    value = round(min(100.0, sum(parts.values())), 1)
                elif name == 'gpu':
                    parts = {}
                    for sample in samples:
                        for key, value in sample.get('_gpu_parts', {}).items():
                            parts[key] = max(parts.get(key, 0.0), value)
                    engines = {}
                    for (_pid, engine), value in parts.items():
                        engines[engine] = engines.get(engine, 0.0) + value
                    value = round(min(100.0, max(engines.values(), default=0.0)), 1)
                else:
                    value = sum(value[field] for value in values)
                result[name] = _metric('ready', field, value, threshold=threshold)
        return result
