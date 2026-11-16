"""远程诊断的断连、独立资源与媒体故障证据行为回归。"""
import asyncio
import importlib.util
import json
from pathlib import Path
import shutil
import sys
import tempfile
import unittest
from unittest import mock

from peach import api, metadata_amane, remote_reporting, settings_file
from peach.ffmpeg import BinaryChoice
from peach.streaming import BufferedFileResponse
from peach.transcodes import TranscodeService, TranscodeUnavailable


class FaultFixTests(unittest.TestCase):
    def test_recovery_scheduler_works_without_local_timezone_data(self):
        from datetime import timezone
        from zoneinfo import ZoneInfoNotFoundError
        from peach.web_job_recovery import RecoveryService
        with mock.patch('apscheduler.schedulers.base.get_localzone', side_effect=ZoneInfoNotFoundError('synthetic')):
            service = RecoveryService(mock.Mock(), available=True)
            self.assertEqual(service.scheduler.timezone, timezone.utc)
            service.scheduler.add_job(service.tick, 'interval', seconds=1)
            self.assertEqual(len(service.scheduler.get_jobs()), 1)

    def test_a_stuck_recovery_records_its_step_and_thread_stacks_once(self):
        """接回中断任务卡住时，日志里要能看出卡在哪个任务、停在哪一行；同一次只记一次。"""
        import threading
        import time
        from peach import web_job_recovery
        service = web_job_recovery.RecoveryService(mock.Mock(), available=True)
        started, release = threading.Event(), threading.Event()

        def stuck_in_processing(*_args, **_kwargs):
            started.set()
            release.wait(5)

        with mock.patch('peach.update_tasks.is_pausing', return_value=False), \
                mock.patch.object(web_job_recovery, 'resume',
                                  side_effect=lambda _db, handlers: handlers['library-processing']({})), \
                mock.patch.object(web_job_recovery, 'w_library_processing', side_effect=stuck_in_processing), \
                mock.patch('peach.error_reporting.local_event') as event:
            worker = threading.Thread(target=service.tick)
            worker.start()
            self.assertTrue(started.wait(5))
            service.watch(now=time.monotonic() + 5)
            event.assert_not_called()
            service.watch(now=time.monotonic() + web_job_recovery.STUCK_SECONDS + 1)
            service.watch(now=time.monotonic() + web_job_recovery.STUCK_SECONDS * 2)
            release.set()
            worker.join(5)
            service.watch(now=time.monotonic() + 1000)
        event.assert_called_once()
        self.assertEqual(event.call_args.args, ('job-recovery-stuck',))
        self.assertEqual(event.call_args.kwargs['step'], 'library-processing')
        frames = [line for stack in event.call_args.kwargs['stacks'].values() for line in stack]
        self.assertTrue(any(line.endswith(' stuck_in_processing') for line in frames), frames)
        self.assertFalse(any('\\' in line or '/' in line for line in frames), '只留文件名，不带本机路径')

    def test_early_disconnect_returns_without_a_server_exception(self):
        async def exercise(path):
            async def inner(scope, receive, send):
                await BufferedFileResponse(path)(scope, receive, send)

            async def receive():
                return {'type': 'http.disconnect'}

            async def send(message):
                pass

            await api.ResponseHeadersMiddleware(inner)(
                {'type': 'http', 'method': 'GET', 'path': '/stream', 'headers': []}, receive, send)

        with tempfile.TemporaryDirectory() as folder:
            path = Path(folder).resolve() / 'synthetic.mp4'
            path.write_bytes(b'synthetic')
            asyncio.run(exercise(path))

    def test_server_errors_propagate_even_after_client_disconnect(self):
        error = RuntimeError('synthetic server failure')

        async def inner(scope, receive, send):
            await receive()
            raise error

        async def receive():
            return {'type': 'http.disconnect'}

        with self.assertRaises(RuntimeError) as raised:
            asyncio.run(api.ResponseHeadersMiddleware(inner)(
                {'type': 'http', 'path': '/stream'}, receive, mock.AsyncMock()))
        self.assertIs(raised.exception, error)

    def test_response_headers_preserve_cache_policy_and_non_http_messages(self):
        class Messages(list):
            async def append_async(self, value):
                self.append(value)

        async def check(path, cache=None):
            messages = Messages()

            async def inner(scope, receive, send):
                headers = [] if cache is None else [(b'cache-control', cache)]
                await send({'type': 'http.response.start', 'status': 206, 'headers': headers})
                await send({'type': 'http.response.body', 'body': b'body'})

            await api.ResponseHeadersMiddleware(inner)(
                {'type': 'http', 'path': path}, mock.AsyncMock(), messages.append_async)
            return messages

        for path, cache, expected in (('/vendor/test.js', None, b'public, max-age=31536000, immutable'),
                ('/stream', None, b'no-store'), ('/api/test', b'public, no-cache', b'public, no-cache')):
            with self.subTest(path=path):
                messages = asyncio.run(check(path, cache))
                headers = dict(messages[0]['headers'])
                self.assertEqual(headers[b'cache-control'], expected)
                self.assertEqual(headers[b'x-content-type-options'], b'nosniff')
                self.assertEqual(headers[b'referrer-policy'], b'same-origin')
                self.assertIn(b'x-robots-tag', headers)
                self.assertEqual(messages[1]['body'], b'body')
        inner = mock.AsyncMock()
        asyncio.run(api.ResponseHeadersMiddleware(inner)({'type': 'websocket'}, None, None))
        inner.assert_awaited_once_with({'type': 'websocket'}, None, None)

    def test_bundle_manifest_loads_bridge_revision_in_frozen_and_wheel_layouts(self):
        from peach.bundle_resources import data_files
        root = Path(__file__).resolve().parents[1]
        bridge_data = [(Path(source), target) for source, target in data_files(root)
                       if target == 'tools/amane-bridge']
        self.assertEqual({path.name for path, _ in bridge_data}, {'bridge.py', 'pyproject.toml', 'uv.lock'})
        for layout in ('_internal', 'site-packages/peach/_resources'):
            with self.subTest(layout=layout), tempfile.TemporaryDirectory() as folder:
                destination = Path(folder).resolve() / layout
                for source, target in bridge_data:
                    parent = destination / target
                    parent.mkdir(parents=True, exist_ok=True)
                    shutil.copy2(source, parent / source.name)
                name = 'peach._bridge_resource_fixture'
                spec = importlib.util.spec_from_file_location(name, metadata_amane.__file__)
                module = importlib.util.module_from_spec(spec)
                with mock.patch.dict(sys.modules, {name: module}), \
                        mock.patch.object(settings_file, 'PROJECT_ROOT', destination):
                    spec.loader.exec_module(module)
                    facts = module.describe(Path(folder).resolve() / 'data-tools')
                self.assertEqual(facts['revision'], metadata_amane.pinned_revision())
                self.assertTrue(module.BRIDGE_SCRIPT.is_file())
                self.assertFalse(facts['installed'])

    def test_transcode_failure_projects_bounded_structured_tool_evidence(self):
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder).resolve()
            source = root / 'synthetic.avi'
            source.write_bytes(b'synthetic')
            resolver = mock.Mock()
            resolver.ffmpeg.return_value = BinaryChoice(root / 'ffmpeg.exe', 'test')
            service = TranscodeService(resolver, root / 'cache', prefer_hardware=False)
            with mock.patch.object(service, '_probe', return_value=None), \
                    mock.patch.object(service.hardware, 'encoders', return_value=()), \
                    mock.patch.object(service, '_execute', return_value=(69, b'', b'Unknown decoder private_input')):
                try:
                    service.browser_path(1, source)
                except TranscodeUnavailable as error:
                    self.assertEqual(error.returncode, 69)
                    with mock.patch.object(remote_reporting, 'send') as send:
                        remote_reporting.capture('logging', error, logger='peach.routes_media', level='ERROR')
                    event = send.call_args.args[1]
                else:
                    self.fail('合成工具失败必须生成转码异常')
            self.assertEqual(event['tags']['returncode'], '69')
            self.assertEqual(event['tags']['media_failure'], 'decoder_unavailable')
            self.assertNotIn('private_input', json.dumps(event))

    def test_bad_media_input_is_counted_and_cancellation_stays_local(self):
        from peach.transcodes import TranscodeCancelled
        with mock.patch.object(remote_reporting, 'send') as send:
            remote_reporting.capture('logging', TranscodeCancelled('synthetic'), logger='peach.routes_media', level='ERROR')
        send.assert_not_called()
        error = TranscodeUnavailable('synthetic', diagnostics={'stderr': 'Invalid data found', 'returncode': 1})
        with mock.patch.object(remote_reporting, 'send') as send:
            remote_reporting.capture('logging', error, logger='peach.routes_media', level='ERROR')
        self.assertEqual(send.call_args.kwargs, {'count_only': True})
        self.assertEqual(send.call_args.args[1]['tags']['condition'], 'invalid_media')

    def test_transcode_input_failure_is_counted_after_real_pipeline_frames(self):
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder).resolve()
            source = root / 'synthetic.avi'
            source.write_bytes(b'synthetic')
            resolver = mock.Mock()
            resolver.ffmpeg.return_value = BinaryChoice(root / 'ffmpeg.exe', 'test')
            service = TranscodeService(resolver, root / 'cache', prefer_hardware=False)
            with mock.patch.object(service, '_probe', return_value=None), \
                    mock.patch.object(service.hardware, 'encoders', return_value=()), \
                    mock.patch.object(service, '_execute', return_value=(1, b'', b'Invalid data found')):
                with mock.patch.object(remote_reporting, 'send') as send:
                    try:
                        service.browser_path(1, source)
                    except TranscodeUnavailable as error:
                        remote_reporting.capture('logging', error, logger='peach.routes_media', level='ERROR')
                    else:
                        self.fail('坏输入必须保留转码失败状态')
                self.assertEqual(send.call_args.kwargs, {'count_only': True})
                self.assertEqual(send.call_args.args[1]['tags']['condition'], 'invalid_media')
