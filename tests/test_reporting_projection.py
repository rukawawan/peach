"""远程错误投影保留可定位信息且拒绝任意来源字段。"""
import json
import unittest
from unittest import mock

from peach import diagnostic_browser, diagnostic_exceptions, remote_reporting


class ReportingProjectionTests(unittest.TestCase):
    def test_media_categories_survive_preview_scrubbing_and_read_subprocess_stderr(self):
        import subprocess
        from peach.library_processing import _PreviewCaptureError
        error = _PreviewCaptureError({'reason': 'ffmpeg_error', 'returncode': 1,
                                     'stderr': '/private/media/movie.mp4: Invalid data found when processing input'})
        self.assertEqual(error.diagnostics['failure_category'], 'invalid_media')
        self.assertNotIn('private', json.dumps(error.diagnostics))
        with mock.patch.object(remote_reporting, 'send') as send:
            remote_reporting.capture('library-preview', error)
            self.assertEqual(send.call_args.kwargs, {'count_only': True})
            self.assertEqual(send.call_args.args[1]['tags']['condition'], 'invalid_media')
            self.assertNotIn('private', json.dumps(send.call_args.args[1]))
            send.reset_mock()
            failed = subprocess.CalledProcessError(1, 'ffprobe', stderr=b'Unknown decoder private-decoder')
            remote_reporting.capture('media-probe', failed)
            self.assertEqual(send.call_args.args[1]['tags']['media_failure'], 'decoder_unavailable')
            self.assertNotIn('private', json.dumps(send.call_args.args[1]))

    def test_coded_errors_are_reported_like_the_plain_errors_they_replace(self):
        """带 code 的报错身上的 `status_code` 只是接口层的状态提示，不能让后台技术故障被当成 4xx 而不上报。"""
        from peach.user_messages import UserRuntimeError, UserValueError
        for error in (UserRuntimeError('errors.libraryProcessing.captureUnfetched'),
                      UserValueError('errors.libraryProcessing.captureUnfetched')):
            with self.subTest(kind=type(error).__name__):
                self.assertTrue(remote_reporting._actionable('background-job', error, {}))

    def test_python_chain_has_separate_frames_and_sqlite_error_identity(self):
        code = compile('def fail():\n    import sqlite3\n    connection = sqlite3.connect(":memory:")\n'
                       '    try:\n        connection.execute("SELECT private_column")\n'
                       '    except sqlite3.OperationalError as error:\n        raise RuntimeError("private text") from error\n',
                       'private/peach/fixture.py', 'exec')
        namespace = {'__name__': 'peach.fixture'}
        exec(code, namespace)
        try:
            namespace['fail']()
        except RuntimeError as error:
            values, codes, chain = diagnostic_exceptions.project(error, lambda error: None)
        self.assertEqual(chain, ['RuntimeError', 'OperationalError'])
        self.assertEqual([value['type'] for value in values], ['OperationalError', 'RuntimeError'])
        self.assertEqual(codes['sqlite_errorname'], 'SQLITE_ERROR')
        self.assertEqual(codes['sqlite_failure'], 'missing_column')
        self.assertTrue(all(value['stacktrace']['frames'] for value in values))
        self.assertNotIn('private', json.dumps(values))

    def test_sqlite_categories_are_shared_with_local_evidence_without_query_names(self):
        import sqlite3
        from peach import error_reporting
        with sqlite3.connect(':memory:') as connection:
            try:
                connection.execute('SELECT * FROM private_table')
            except sqlite3.OperationalError as error:
                codes = diagnostic_exceptions.structured_codes(error)
                local = error_reporting.exception_facts(error)
        self.assertEqual(codes['sqlite_failure'], 'missing_table')
        self.assertEqual(local['exception'][0]['codes'], codes)
        self.assertNotIn('private', json.dumps(codes))

    def test_framework_frames_and_nested_peach_modules_are_locatable(self):
        namespace = {'__name__': 'starlette.middleware.base'}
        exec(compile('def fail():\n    raise RuntimeError("private request")\n',
                     '/private/site-packages/starlette/middleware/base.py', 'exec'), namespace)
        try:
            namespace['fail']()
        except RuntimeError as error:
            values, _, _ = diagnostic_exceptions.project(error, lambda error: None)
        frame = values[0]['stacktrace']['frames'][-1]
        self.assertEqual(frame['module'], 'starlette.middleware.base')
        self.assertEqual(frame['filename'], 'base.py')
        self.assertNotIn('/private/', json.dumps(values))
        with mock.patch.object(remote_reporting, 'send') as send:
            try:
                namespace['fail']()
            except RuntimeError as error:
                remote_reporting.capture('logging', error, logger='starlette')
            send.assert_not_called()

    def test_browser_type_frames_and_debug_id_are_projected_without_urls(self):
        identity = 'fe664ca7-794e-4b41-841a-3106ec80fb1f'
        with mock.patch.object(remote_reporting, 'send') as send:
            remote_reporting.capture('browser', error_name='TypeError', message='private movie',
                stack='at https://private/peach-app.js:12:2\nat https://private/peach-app.js:20:4',
                bundle_debug_ids={'peach-app.js': identity, 'private.js': identity})
        event = send.call_args.args[1]
        self.assertEqual(event['platform'], 'javascript')
        value = event['exception']['values'][0]
        self.assertEqual(value['type'], 'TypeError')
        self.assertEqual([frame['lineno'] for frame in value['stacktrace']['frames']], [20, 12])
        self.assertEqual(event['debug_meta']['images'], [
            {'type': 'sourcemap', 'code_file': 'app:///peach-app.js', 'debug_id': identity}])
        self.assertNotIn('private', json.dumps(event))

    def test_browser_chunk_frames_keep_their_hashed_names_and_debug_ids(self):
        chunk, identity, entry = ('peach-app.stats-page-Ab1_x-Y9.js', 'fe664ca7-794e-4b41-841a-3106ec80fb1f',
                                  '0b8a7c55-2f0e-4c4a-9d6e-6a1f5f3f4e21')
        value, meta = diagnostic_browser.project({'error_name': 'TypeError',
            'stack': f'at https://private/dist/{chunk}:3:7\nat https://private/dist/peach-app.js?v=1:9:1',
            'bundle_debug_ids': {chunk: identity, 'peach-app.js': entry, 'peach-app.a.b.js': identity}})
        self.assertEqual([(frame['filename'], frame['abs_path']) for frame in value['stacktrace']['frames']],
                         [('peach-app.js', 'app:///peach-app.js'), (chunk, f'app:///{chunk}')])
        self.assertEqual(meta['images'], [
            {'type': 'sourcemap', 'code_file': 'app:///peach-app.js', 'debug_id': entry},
            {'type': 'sourcemap', 'code_file': f'app:///{chunk}', 'debug_id': identity}])
        self.assertEqual(diagnostic_browser.clean_debug_meta(meta), meta)
        value, _ = diagnostic_browser.project({'source_file': chunk, 'line': 2, 'column': 5})
        self.assertEqual(value['stacktrace']['frames'][0]['filename'], chunk)

    def test_browser_untrusted_names_urls_ids_and_file_suffixes_are_rejected(self):
        value, meta = diagnostic_browser.project({'error_name': 'private title',
            'stack': 'at https://private/not-peach-app.js:1:1\nat peach-pages.js:4:5',
            'bundle_debug_ids': {'peach-pages.js': 'https://private/'}})
        self.assertEqual(value['type'], 'BrowserError')
        self.assertEqual(len(value['stacktrace']['frames']), 1)
        self.assertIsNone(meta)
        self.assertIsNone(diagnostic_browser.clean_debug_meta({'images': [
            {'type': 'sourcemap', 'code_file': 'https://private/app.js', 'debug_id': 'private'}]}))

    def test_browser_debug_metadata_is_kept_in_final_sdk_bytes(self):
        from sentry_sdk.transport import HttpTransport
        identity = 'fe664ca7-794e-4b41-841a-3106ec80fb1f'
        sent = []
        self.enterContext(mock.patch.object(remote_reporting, '_disabled', False))
        client = remote_reporting._new_client('https://public@o123.ingest.us.sentry.io/456', envelope_gate=lambda envelope: True)
        self.addCleanup(lambda: client.close(timeout=0))
        with mock.patch.object(HttpTransport, '_send_envelope', side_effect=lambda envelope: sent.append(envelope.serialize())):
            client.capture_event({'platform': 'javascript', 'debug_meta': {'images': [
                {'type': 'sourcemap', 'code_file': 'app:///peach-app.js', 'debug_id': identity, 'private': 'secret'}]}})
            client.flush(timeout=2)
        self.assertIn(identity.encode(), sent[0])
        self.assertNotIn(b'secret', sent[0])

    def test_browser_event_position_is_usable_only_for_known_bundle_and_positive_coordinates(self):
        value, _ = diagnostic_browser.project({'source_file': 'peach-pages.js', 'line': 8, 'column': 3})
        self.assertEqual(value['stacktrace']['frames'][0]['filename'], 'peach-pages.js')
        for source, line, column in [('private.js', 8, 3), ('peach-app.js', 0, 0), ('peach-app.js', True, 3)]:
            value, _ = diagnostic_browser.project({'source_file': source, 'line': line, 'column': column})
            self.assertEqual(value['stacktrace']['frames'], [])

    def test_same_exception_trace_is_reported_once_across_hooks_and_a_new_raise_counts(self):
        error = RuntimeError('private text')
        with mock.patch.object(remote_reporting, 'send', return_value=True) as send:
            remote_reporting.capture('background-job', error)
            remote_reporting.capture('unhandled-main', error)
            self.assertEqual(send.call_count, 1)
            try:
                raise error
            except RuntimeError:
                remote_reporting.capture('unhandled-main', error)
            self.assertEqual(send.call_count, 2)
