"""原生线程读取和 Linux 控制组容量的行为验证。"""
from __future__ import annotations

import ctypes
import errno
import os
from pathlib import Path
import sys
import tempfile
import threading
import time
from types import SimpleNamespace
import unittest
from unittest.mock import Mock, patch

import psutil

from peach.resource_platform import ThreadInfo, cgroup_capacity, cpu_capacity, thread_times
from peach.gpu_linux import LinuxGpuCounters
from peach.gpu_usage import GpuCounters


def said(reason, language='zh-CN'):
    """GPU 读数原因是一句带 code 的话（ADR-0159），按语言渲染出来再比对。"""
    from peach import interface_text
    return interface_text.text(f"server:{reason['code']}", reason.get('params'), language)


class PlatformCpuTests(unittest.TestCase):
    def setUp(self):
        temporary = tempfile.TemporaryDirectory()
        self.addCleanup(temporary.cleanup)
        self.root = Path(temporary.name).resolve()
        self.proc = self.root / 'proc'
        (self.proc / '10').mkdir(parents=True)
        self.mount = self.root / 'groups'
        (self.mount / 'service' / 'worker').mkdir(parents=True)

    def groups(self, *, version=2, mount_root='/', group='/service/worker'):
        unified = version == 2
        (self.proc / '10/cgroup').write_text(f"{'0::' if unified else '2:cpu,cpuacct:'}{group}\n")
        path = str(self.mount).replace(' ', r'\040')
        filesystem = 'cgroup2 cgroup rw' if unified else 'cgroup cgroup rw,cpu,cpuacct'
        (self.proc / '10/mountinfo').write_text(f'20 1 0:30 {mount_root} {path} rw - {filesystem}\n')

    def test_v2_uses_visible_parent_quota_and_container_namespace_root(self):
        self.groups()
        (self.mount / 'cpu.max').write_text('max 100000')
        (self.mount / 'service/cpu.max').write_text('150000 100000')
        (self.mount / 'service/worker/cpu.max').write_text('200000 100000')
        self.assertEqual(cgroup_capacity(self.proc, 10), 1.5)
        self.groups(group='/')
        (self.mount / 'cpu.max').write_text('50000 100000')
        self.assertEqual(cgroup_capacity(self.proc, 10), .5)

    def test_v1_uses_cpu_mount_root_and_does_not_treat_unlimited_as_zero(self):
        self.groups(version=1, mount_root='/docker/unit', group='/docker/unit/service')
        (self.mount / 'cpu.cfs_quota_us').write_text('-1')
        (self.mount / 'cpu.cfs_period_us').write_text('100000')
        (self.mount / 'service/cpu.cfs_quota_us').write_text('75000')
        (self.mount / 'service/cpu.cfs_period_us').write_text('100000')
        self.assertEqual(cgroup_capacity(self.proc, 10), .75)
        (self.mount / 'service/cpu.cfs_quota_us').write_text('-1')
        self.assertIsNone(cgroup_capacity(self.proc, 10))

    def test_invalid_quota_and_unreadable_membership_are_not_host_capacity(self):
        self.groups()
        for value in ('0 100000', '200000 0', 'broken', 'max zero'):
            with self.subTest(value=value):
                (self.mount / 'service/worker/cpu.max').write_text(value)
                with self.assertRaises(ValueError):
                    cgroup_capacity(self.proc, 10)
        with patch.object(Path, 'read_text', side_effect=PermissionError('denied')):
            with self.assertRaises(PermissionError):
                cgroup_capacity(self.proc, 10)

    def test_capacity_intersects_host_affinity_and_fractional_quota(self):
        process = Mock(pid=10)
        process.cpu_affinity.return_value = [2, 3]
        with patch('peach.resource_platform.sys.platform', 'linux'), \
                patch('peach.resource_platform.psutil.cpu_count', return_value=32), \
                patch('peach.resource_platform.cgroup_capacity', return_value=.5) as quota:
            self.assertEqual(cpu_capacity(process), .5)
            quota.return_value = None
            self.assertEqual(cpu_capacity(process), 2)

    def test_macos_requests_native_thread_ids_and_converts_nanoseconds(self):
        def read(pid, flavor, identity, buffer, size):
            self.assertEqual((pid, flavor, size), (10, 15, ctypes.sizeof(ThreadInfo)))
            self.assertIn(identity, (123456789, 987654321))
            buffer._obj.user, buffer._obj.system = 1_000_000_000, 250_000_000
            return size
        library = SimpleNamespace(proc_pidinfo=Mock(side_effect=read))
        with patch('peach.resource_platform.sys.platform', 'darwin'), \
                patch('peach.resource_platform._libproc', return_value=library):
            self.assertEqual(thread_times(SimpleNamespace(pid=10), {123456789, 987654321}),
                             {123456789: 1.25, 987654321: 1.25})

    def test_macos_permission_error_is_distinct_from_an_exited_thread(self):
        def denied(*_args):
            ctypes.set_errno(errno.EPERM)
            return 0
        library = SimpleNamespace(proc_pidinfo=Mock(side_effect=denied))
        with patch('peach.resource_platform.sys.platform', 'darwin'), \
                patch('peach.resource_platform._libproc', return_value=library):
            with self.assertRaises(PermissionError):
                thread_times(SimpleNamespace(pid=10), {20})
            def exited(*_args):
                ctypes.set_errno(errno.ESRCH)
                return 0
            library.proc_pidinfo.side_effect = exited
            self.assertEqual(thread_times(SimpleNamespace(pid=10), {20}), {})

    def test_native_running_thread_has_increasing_cpu_time(self):
        process = psutil.Process(os.getpid())
        identity = threading.get_native_id()
        before = thread_times(process, {identity})
        deadline = time.thread_time() + .04
        while time.thread_time() < deadline:
            pass
        after = thread_times(process, {identity})
        self.assertGreater(after[identity], before[identity])
        self.assertGreater(cpu_capacity(process), 0)

    @unittest.skipUnless(sys.platform == 'darwin', 'macOS 原生 GPU 能力边界')
    def test_macos_gpu_unavailable_does_not_return_zero(self):
        counter = GpuCounters()
        self.addCleanup(counter.close)
        values, state, reason = counter.sample()
        self.assertIsNone(values)
        self.assertEqual(state, 'unavailable')
        self.assertIn('macOS', said(reason))


class LinuxGpuTests(unittest.TestCase):
    def setUp(self):
        temporary = tempfile.TemporaryDirectory()
        self.addCleanup(temporary.cleanup)
        self.root = Path(temporary.name).resolve()
        self.devices = self.root / 'dri'
        self.devices.mkdir()
        self.now = 100.0
        self.counter = LinuxGpuCounters(proc=self.root / 'proc', devices=self.devices, clock=lambda: self.now)
        self.addCleanup(self.counter.close)

    def fd(self, pid, descriptor, busy, *, client=1, capacity=1, device='0000:01:00.0'):
        folder = self.root / 'proc' / str(pid) / 'fdinfo'
        folder.mkdir(parents=True, exist_ok=True)
        path = folder / str(descriptor)
        path.write_text(f'drm-driver: i915\ndrm-pdev: {device}\ndrm-client-id: {client}\n'
                        f'drm-engine-render: {busy} ns\ndrm-engine-capacity-render: {capacity}\n')
        return path

    def sample(self, processes=None):
        self.counter.sample()
        return self.counter.sample_processes(processes or {10: 1.0})

    def test_drm_duplicates_are_counted_once_and_capacity_normalizes_busy_time(self):
        for descriptor in (4, 5):
            self.fd(10, descriptor, 1_000_000_000, capacity=2)
        self.assertEqual(self.sample()[1], 'sampling')
        self.now += 2
        for descriptor in (4, 5):
            self.fd(10, descriptor, 3_000_000_000, capacity=2)
        values, state, reason = self.sample()
        self.assertEqual((state, reason), ('ready', ''))
        self.assertEqual(values[10], {'0000:01:00.0:render': 50.0})

    def test_counter_regression_keeps_high_water_mark_and_pid_reuse_starts_sampling(self):
        self.fd(10, 4, 2_000_000_000)
        self.sample()
        self.now += 1
        self.fd(10, 4, 1_000_000_000)
        self.assertEqual(self.sample()[0][10]['0000:01:00.0:render'], 0.0)
        self.now += 1
        self.fd(10, 4, 3_000_000_000)
        self.assertEqual(self.sample()[0][10]['0000:01:00.0:render'], 50.0)
        self.now += 1
        self.assertEqual(self.sample({10: 2.0})[1], 'sampling')

    def test_shared_clients_are_not_attributed_twice_to_owned_processes(self):
        self.fd(10, 4, 0)
        self.fd(20, 6, 0)
        values, state, reason = self.sample({10: 1.0, 20: 2.0})
        self.assertIsNone(values)
        self.assertEqual(state, 'unavailable')
        self.assertIn('共享', said(reason))

    def test_missing_container_device_or_process_permissions_are_unavailable(self):
        self.devices.rmdir()
        self.assertEqual(self.sample()[1], 'unavailable')
        self.devices.mkdir()
        with patch.object(Path, 'iterdir', side_effect=PermissionError('fdinfo denied')):
            values, state, reason = self.sample()
        self.assertIsNone(values)
        self.assertEqual(state, 'unavailable')
        self.assertIn('denied', said(reason))

    def test_driver_without_engine_counters_is_not_idle_zero(self):
        path = self.fd(10, 4, 0)
        path.write_text('drm-driver: nvidia\ndrm-client-id: 1\n')
        values, state, reason = self.sample()
        self.assertIsNone(values)
        self.assertEqual(state, 'unavailable')
        self.assertIn('未提供', said(reason))

    def test_readable_process_with_no_gpu_descriptors_is_idle(self):
        folder = self.root / 'proc/10/fdinfo'
        folder.mkdir(parents=True)
        (folder / '0').write_text('pos: 0\nflags: 0100000\n')
        self.assertEqual(self.sample(), ({10: {}}, 'ready', ''))
