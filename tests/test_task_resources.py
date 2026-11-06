"""任务资源只使用临时登记、伪进程计数器和注入式 GPU 读数。"""
from __future__ import annotations

import ctypes
from ctypes import wintypes
import json
import math
import os
from pathlib import Path
import tempfile
from types import SimpleNamespace
import unittest
from unittest.mock import Mock, patch

import psutil

from peach import task_control, task_resources
from peach.gpu_usage import GpuCounters
from peach.task_runs import TaskRunStore
from support.ledger import fresh_ledger


class Clock:
    def __init__(self):
        self.now = 100.0

    def __call__(self):
        return self.now

    def advance(self, seconds=1):
        self.now += seconds


class Process:
    def __init__(self, pid, *, created=10.0):
        self.pid, self.created = pid, created
        self.thread_cpu = {}
        self.cpu = 0.0
        self.members = []
        self.total_reads = 0

    def create_time(self):
        return self.created

    def threads(self):
        return [SimpleNamespace(id=identity, user_time=value, system_time=0.0)
                for identity, value in self.thread_cpu.items()]

    def cpu_times(self):
        self.total_reads += 1
        return SimpleNamespace(user=self.cpu, system=0.0)

    def children(self, *, recursive=False):
        return self.members

    def cpu_affinity(self):
        return list(range(4))


class GpuReader:
    def __init__(self, values=None, *, state='ready', reason=''):
        self.values = {} if values is None else values
        self.state, self.reason = state, reason
        self.calls = 0
        self.closed = False

    def sample(self):
        self.calls += 1
        return (self.values if self.state == 'ready' else None), self.state, self.reason

    def close(self):
        self.closed = True


class TaskResourceTests(unittest.TestCase):
    def setUp(self):
        temporary = tempfile.TemporaryDirectory()
        self.addCleanup(temporary.cleanup)
        self.root = Path(temporary.name).resolve()
        self.db = fresh_ledger(self.root)
        self.store = TaskRunStore(self.db)
        self.clock = Clock()
        self.root_process = Process(os.getpid())
        self.root_process.thread_cpu = {11: 1.0, 22: 4.0, 999: 1000.0}
        self.root_process.cpu = 3000.0
        self.processes = {self.root_process.pid: self.root_process}
        process_patch = patch('peach.task_resources.psutil.Process', side_effect=self.process)
        self.process_reads = process_patch.start()
        self.addCleanup(process_patch.stop)
        capacity_patch = patch('peach.task_resources.psutil.cpu_count', return_value=4)
        self.capacity = capacity_patch.start()
        self.addCleanup(capacity_patch.stop)
        threads_patch = patch('peach.task_resources.thread_times',
                              side_effect=lambda process, wanted: {t.id: t.user_time + t.system_time
                                  for t in process.threads() if t.id in wanted})
        threads_patch.start()
        self.addCleanup(threads_patch.stop)
        quota_patch = patch('peach.resource_platform.cgroup_capacity', return_value=None)
        quota_patch.start()
        self.addCleanup(quota_patch.stop)

    def process(self, pid=None):
        identity = self.root_process.pid if pid is None else int(pid)
        if identity not in self.processes:
            raise psutil.NoSuchProcess(identity)
        return self.processes[identity]

    def child(self, identity, *, cpu=0.0, created=20.0):
        process = Process(identity, created=created)
        process.cpu = cpu
        self.processes[identity] = process
        return process

    def new_run(self, name='resource-test'):
        return self.store.start(name, trigger='manual')

    def usage(self, run, *, threads=(), processes=()):
        usage = task_resources.Usage(self.db, run.id)
        self.addCleanup(usage.close)
        for identity in threads:
            with patch('peach.task_resources.threading.get_native_id', return_value=identity):
                usage.enter_thread()
        for identity in processes:
            usage.enter_process(SimpleNamespace(pid=identity))
        return usage

    def monitor(self, gpu=None):
        monitor = task_resources.Monitor(self.store, gpu=gpu or GpuReader(), clock=self.clock)
        self.addCleanup(monitor.close)
        return monitor

    def download(self, usage, size):
        token = task_control.CURRENT.set(SimpleNamespace(usage=usage))
        try:
            task_resources.record_download(size)
        finally:
            task_control.CURRENT.reset(token)

    def test_cpu_uses_registered_native_threads_and_owned_children_as_a_share_of_host_capacity(self):
        first, second = self.new_run('first'), self.new_run('second')
        child, grandchild = self.child(5001, cpu=2), self.child(5002, cpu=4)
        child.members = [grandchild]
        self.usage(first, threads=(11,), processes=(child.pid,))
        self.usage(second, threads=(22,))
        monitor = self.monitor()
        self.assertEqual(monitor.for_run(first)['cpu']['state'], 'sampling')
        self.clock.advance(2)
        self.root_process.thread_cpu[11] += 2
        self.root_process.thread_cpu[22] += .4
        self.root_process.thread_cpu[999] += 100
        self.root_process.cpu += 1000
        child.cpu += 1
        grandchild.cpu += 1
        self.assertEqual(monitor.for_run(first)['cpu']['percent'], 50.0)
        self.assertEqual(monitor.for_run(second)['cpu']['percent'], 5.0)
        self.assertEqual(self.root_process.total_reads, 0)
        self.assertTrue(monitor.for_run(first)['cpu']['high'])
        self.assertFalse(monitor.for_run(second)['cpu']['high'])

    def test_nested_registration_keeps_a_native_thread_until_its_last_scope_exits(self):
        usage = self.usage(self.new_run())
        with patch('peach.task_resources.threading.get_native_id', return_value=11):
            usage.enter_thread()
            usage.enter_thread()
            usage.leave_thread()
            self.assertEqual(usage.snapshot()['threads'], [11])
            usage.leave_thread()
            self.assertEqual(usage.snapshot()['threads'], [])

    def test_gpu_sums_the_same_physical_engine_and_reports_the_busiest_engine(self):
        run = self.new_run()
        first, second = self.child(5001), self.child(5002)
        self.usage(run, processes=(first.pid, second.pid))
        gpu = GpuReader({first.pid: {'adapter-0:engine-0': 25, 'adapter-0:engine-1': 70},
                         second.pid: {'adapter-0:engine-0': 30, 'adapter-0:engine-1': 0}})
        result = self.monitor(gpu).for_run(run)
        self.assertEqual(result['gpu']['state'], 'ready')
        self.assertEqual(result['gpu']['percent'], 70.0)
        self.assertTrue(result['gpu']['high'])

    def test_gpu_activity_in_the_shared_python_service_is_unavailable_for_an_individual_task(self):
        run = self.new_run()
        child = self.child(5001)
        self.usage(run, threads=(11,), processes=(child.pid,))
        gpu = GpuReader({self.root_process.pid: {'engine-0': 10}, child.pid: {'engine-0': 40}})
        result = self.monitor(gpu).for_run(run)['gpu']
        self.assertEqual(result['state'], 'unavailable')
        self.assertIsNone(result['percent'])
        self.assertIn('共享', result['reason'])

    def test_network_uses_two_sample_differences_and_high_only_marks_the_readout(self):
        run = self.new_run()
        usage = self.usage(run, threads=(11,))
        self.download(usage, 2048)
        monitor = self.monitor()
        initial = monitor.for_run(run)['network']
        self.assertEqual(initial['state'], 'sampling')
        self.assertIsNone(initial['bytes_per_second'])
        self.clock.advance(2)
        self.download(usage, 4 * 1024 * 1024)
        measured = monitor.for_run(run)['network']
        self.assertEqual(measured['bytes_per_second'], 2 * 1024 * 1024)
        self.assertFalse(measured['high'])
        self.clock.advance()
        self.download(usage, 12 * 1024 * 1024)
        high = monitor.for_run(run)['network']
        self.assertEqual(high['bytes_per_second'], 12 * 1024 * 1024)
        self.assertTrue(high['high'])
        self.assertEqual(usage.snapshot()['network_bytes'], 16 * 1024 * 1024 + 2048)

    def test_real_idle_zero_is_distinct_from_missing_registration_and_unobserved_network(self):
        idle, missing = self.new_run('idle'), self.new_run('missing')
        usage = self.usage(idle, threads=(11,))
        monitor = self.monitor()
        monitor.for_run(idle)
        self.clock.advance()
        ready = monitor.for_run(idle)
        self.assertEqual((ready['cpu']['state'], ready['cpu']['percent']), ('ready', 0.0))
        self.assertEqual((ready['network']['state'], ready['network']['bytes_per_second']), ('ready', 0))
        unknown = monitor.for_run(missing)
        self.assertEqual(unknown['cpu']['state'], 'unavailable')
        self.assertIsNone(unknown['network']['bytes_per_second'])
        token = task_control.CURRENT.set(SimpleNamespace(usage=usage))
        try:
            task_resources.unobserved_network('挂载盘传输无法准确归属')
        finally:
            task_control.CURRENT.reset(token)
        self.clock.advance()
        network = monitor.for_run(idle)['network']
        self.assertEqual(network['state'], 'unavailable')
        self.assertIsNone(network['bytes_per_second'])
        self.assertEqual(network['reason'], '挂载盘传输无法准确归属')
        self.assertNotIn('via', network)

    def test_network_read_through_a_cloud_mount_says_so_while_staying_unmeasured(self):
        run = self.new_run('cloud')
        usage = self.usage(run, threads=(11,))
        monitor = self.monitor()
        monitor.for_run(run)
        token = task_control.CURRENT.set(SimpleNamespace(usage=usage))
        try:
            task_resources.unobserved_network('网盘挂载的缓存与预读无法按任务取得实际网速', via='cloud')
        finally:
            task_control.CURRENT.reset(token)
        self.clock.advance()
        network = monitor.for_run(run)['network']
        self.assertEqual((network['state'], network['via']), ('unavailable', 'cloud'))
        self.assertIsNone(network['bytes_per_second'])

    def test_parent_aggregation_deduplicates_cpu_parts_shared_with_a_child_run(self):
        parent = self.new_run('parent')
        child_id = self.store.enqueue_followups(parent.id, [('child:1', 'child', '子任务')])['queued'][0]
        child_run = self.store.claim_followup(['child'])
        self.assertEqual(child_run.id, child_id)
        process = self.child(5001)
        self.usage(parent, threads=(11,), processes=(process.pid,))
        self.usage(child_run, threads=(22,), processes=(process.pid,))
        monitor = self.monitor()
        monitor.for_run(parent)
        self.clock.advance(2)
        self.root_process.thread_cpu[11] += 2
        self.root_process.thread_cpu[22] += 1
        process.cpu += 1
        self.assertEqual(monitor.for_run(parent)['cpu']['percent'], 50.0)
        self.assertEqual(monitor.for_run(child_run)['cpu']['percent'], 25.0)

    def test_parent_gpu_counts_each_owned_process_engine_once_across_descendants(self):
        parent = self.new_run('parent')
        self.store.enqueue_followups(parent.id, [('child:1', 'child', '子任务')])
        child_run = self.store.claim_followup(['child'])
        shared, separate = self.child(5001), self.child(5002)
        self.usage(parent, processes=(shared.pid,))
        self.usage(child_run, processes=(shared.pid, separate.pid))
        monitor = self.monitor(GpuReader({shared.pid: {'engine-0': 40, 'engine-1': 60},
                                          separate.pid: {'engine-0': 30}}))
        self.assertEqual(monitor.for_run(parent)['gpu']['percent'], 70.0)
        self.assertEqual(monitor.for_run(child_run)['gpu']['percent'], 70.0)

    def test_finished_parent_still_shows_live_descendants_but_pure_history_has_no_resources(self):
        parent = self.new_run('parent')
        child_id = self.store.enqueue_followups(parent.id, [('child:1', 'child', '子任务')])['queued'][0]
        child_run = self.store.claim_followup(['child'])
        self.usage(child_run, threads=(11,))
        self.store.finish(parent.id, 'succeeded')
        parent = self.store.get(parent.id)
        monitor = self.monitor()
        self.assertIsNotNone(monitor.for_run(parent))
        self.store.finish(child_id, 'succeeded')
        self.clock.advance()
        self.assertIsNone(monitor.for_run(parent))
        self.assertIsNone(monitor.for_run(self.store.get(child_id)))

    def test_pending_work_has_real_zero_without_initializing_native_gpu_counters(self):
        parent = self.new_run('parent')
        child_id = self.store.enqueue_followups(parent.id, [('child:1', 'child', '子任务')])['queued'][0]
        self.store.finish(parent.id, 'succeeded')
        gpu = GpuReader()
        with patch('peach.task_resources.GpuCounters', return_value=gpu) as factory:
            monitor = task_resources.Monitor(self.store, clock=self.clock)
            try:
                result = monitor.for_run(self.store.get(child_id))
                self.assertEqual((result['cpu']['state'], result['cpu']['percent']), ('ready', 0.0))
                self.assertEqual((result['gpu']['state'], result['gpu']['percent']), ('ready', 0.0))
                self.assertEqual((result['network']['state'], result['network']['bytes_per_second']), ('ready', 0.0))
                factory.assert_not_called()
                self.assertEqual(gpu.calls, 0)
                self.store.finish(child_id, 'cancelled')
                self.assertIsNone(monitor.for_run(self.store.get(parent.id)))
                factory.assert_not_called()
            finally:
                monitor.close()

    def test_other_host_and_reused_service_pid_are_not_attributed_to_local_tasks(self):
        foreign, reused = self.new_run('foreign'), self.new_run('reused')
        with self.store.database.write_transaction() as connection:
            connection.execute('UPDATE task_run SET host=?,pid=? WHERE id=?', ('other-host', 9001, foreign.id))
        foreign = self.store.get(foreign.id)
        self.usage(reused, threads=(11,))
        self.root_process.created += 1
        monitor = self.monitor()
        for run in (foreign, reused):
            result = monitor.for_run(run)
            self.assertEqual(result['cpu']['state'], 'unavailable')
            self.assertIsNone(result['cpu']['percent'])
            self.assertIsNone(result['gpu']['percent'])
        self.assertNotIn(9001, [call.args[0] for call in self.process_reads.call_args_list if call.args])

    def test_reused_child_pid_does_not_transfer_cpu_or_gpu_ownership(self):
        run = self.new_run()
        child = self.child(5001, cpu=1)
        self.usage(run, processes=(child.pid,))
        child.created += 1
        gpu = GpuReader({child.pid: {'engine-0': 90}})
        monitor = self.monitor(gpu)
        monitor.for_run(run)
        self.clock.advance()
        child.cpu += 100
        result = monitor.for_run(run)
        self.assertEqual(result['cpu']['percent'], 0.0)
        self.assertEqual(result['gpu']['percent'], 0.0)
        self.assertEqual(child.total_reads, 0)

    def test_unknown_host_capacity_does_not_invent_a_cpu_percentage(self):
        run = self.new_run()
        self.usage(run, threads=(11,))
        monitor = self.monitor()
        monitor.for_run(run)
        self.clock.advance()
        self.capacity.return_value = None
        result = monitor.for_run(run)['cpu']
        self.assertEqual(result['state'], 'unavailable')
        self.assertIsNone(result['percent'])

    def test_invalid_resource_record_does_not_break_other_task_samples(self):
        broken, good = self.new_run('broken'), self.new_run('good')
        self.usage(good, threads=(11,))
        path = task_resources._path(self.db, broken.id)
        path.parent.mkdir(parents=True, exist_ok=True)
        monitor = self.monitor()
        for raw in ('not json', json.dumps([]), json.dumps({'pid': broken.pid, 'created': 'invalid'})):
            with self.subTest(record=raw):
                path.write_text(raw, encoding='utf-8')
                self.clock.advance()
                self.assertEqual(monitor.for_run(broken)['cpu']['state'], 'unavailable')
                self.assertIn(monitor.for_run(good)['cpu']['state'], ('sampling', 'ready'))


class CounterValue(ctypes.Union):
    _fields_ = [('number', ctypes.c_double), ('large', ctypes.c_longlong)]


class FormattedCounter(ctypes.Structure):
    _fields_ = [('status', wintypes.DWORD), ('value', CounterValue)]


class CounterItem(ctypes.Structure):
    _fields_ = [('name', wintypes.LPWSTR), ('formatted', FormattedCounter)]


class Pdh:
    def __init__(self, values):
        self.values = values
        self.names = [ctypes.create_unicode_buffer(name) for name, _value, _status in values]
        self.PdhCollectQueryData = Mock(return_value=0)
        self.PdhCloseQuery = Mock(return_value=0)

    def PdhGetFormattedCounterArrayW(self, _counter, _format, size, count, buffer):
        size._obj.value = ctypes.sizeof(CounterItem) * len(self.values)
        count._obj.value = len(self.values)
        if buffer is None:
            return 0x800007D2
        items = ctypes.cast(buffer, ctypes.POINTER(CounterItem))
        for index, (_name, value, status) in enumerate(self.values):
            items[index].name = ctypes.cast(self.names[index], wintypes.LPWSTR)
            items[index].formatted.status = status
            items[index].formatted.value.number = value
        return 0


class GpuCounterTests(unittest.TestCase):
    def counters(self, values):
        counter = GpuCounters.__new__(GpuCounters)
        counter.dll = Pdh(values)
        counter.query, counter.counter = ctypes.c_void_p(1), ctypes.c_void_p(2)
        counter.collected, counter.error = False, ''
        self.addCleanup(counter.close)
        return counter

    def test_first_gpu_sample_is_unknown_and_instances_keep_the_same_physical_engine_key(self):
        engine = 'luid_0x00000000_0x00001234_phys_0_eng_0_engtype_3D'
        counter = self.counters([(f'pid_5001_{engine}', 20, 0), (f'pid_5002_{engine}', 30, 1),
                                 ('not-a-process', 90, 0), ('pid_5003_bad', 50, 0x800007D5)])
        self.assertEqual(counter.sample()[1], 'sampling')
        values, state, error = counter.sample()
        self.assertEqual((state, error), ('ready', ''))
        self.assertEqual(values, {5001: {engine: 20.0}, 5002: {engine: 30.0}})

    def test_nonfinite_gpu_values_are_not_exposed_as_real_percentages(self):
        counter = self.counters([('pid_5001_engine-valid', 0.0, 0), ('pid_5002_engine-nan', math.nan, 0),
                                 ('pid_5003_engine-inf', math.inf, 0)])
        counter.sample()
        values, state, _error = counter.sample()
        self.assertEqual(state, 'ready')
        self.assertEqual(values, {5001: {'engine-valid': 0.0}})

    def test_counter_failure_reports_unavailable_without_a_fake_zero(self):
        counter = self.counters([])
        counter.dll.PdhCollectQueryData.return_value = 0xC0000BC6
        values, state, reason = counter.sample()
        self.assertIsNone(values)
        self.assertEqual(state, 'unavailable')
        self.assertIn('0xc0000bc6', reason)
