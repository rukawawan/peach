"""媒体读取超时的进程回收、问题隔离与公共写入边界。"""
import contextlib
import io
import json
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest
from unittest.mock import Mock, patch
from types import SimpleNamespace

from peach import media_io, library_processing


class MediaIoTests(unittest.TestCase):
    def setUp(self):
        self.root = Path(self.enterContext(tempfile.TemporaryDirectory())).resolve()
        self.config = Mock()
        self.config.directory.side_effect = lambda name: self.root / name
        # 抽帧按目录的流量保护取舍：给一个免费的本地根，`cost_for` 才读得出这批条目可抽帧。
        self.config.locations = {'local': (str(self.root),)}
        self.config.media_costs = {}

    def test_worker_reads_unicode_nfo_and_directory_attributes(self):
        source = self.root / '影片.nfo'
        raw = '<movie><title>测试影片</title><num>ABW-101</num></movie>'.encode()
        source.write_bytes(raw)
        payload, evidence = media_io.read_nfo(source)
        self.assertEqual((payload['title'], evidence), ('测试影片', raw))
        entries = media_io.directory_entries(self.root)
        self.assertEqual([(entry.name, entry.stat().st_size) for entry in entries], [(source.name, len(raw))])
        self.assertEqual(media_io.directory_files(self.root), {source.name: source})

    def test_fixed_local_disk_directories_are_read_without_a_child_process(self):
        source = self.root / '影片.mp4'
        source.write_bytes(b'video')
        with patch.object(media_io, '_fixed_local_drive', return_value=True), \
                patch.object(media_io.subprocess, 'run', side_effect=AssertionError('不该起子进程')):
            entries = media_io.directory_entries(self.root, file_identity=True)
        self.assertEqual([(entry.name, entry.stat().st_size) for entry in entries], [(source.name, 5)])
        with patch.object(media_io, '_fixed_local_drive', return_value=True):
            with self.assertRaises(OSError):
                media_io.directory_entries(self.root / '不存在')

    def test_only_windows_drive_letters_count_as_fixed_local_disks(self):
        with patch.object(media_io.os, 'name', 'posix'):
            self.assertFalse(media_io._fixed_local_drive('D:\\Downloads'))
        with patch.object(media_io.os, 'name', 'nt'):
            self.assertFalse(media_io._fixed_local_drive('\\\\nas\\share'))

    def test_native_file_identity_survives_the_reader_process_boundary(self):
        source = self.root/'影片.mp4'
        source.write_bytes(b'video')
        before = source.stat()
        info = media_io.directory_entries(self.root,file_identity=True)[0].stat()
        self.assertEqual((info.st_ino,info.st_dev,info.st_size),
                         (before.st_ino,before.st_dev,before.st_size))
        self.assertNotEqual(info.st_ino,0)

    def test_timeout_reaps_reader_before_returning(self):
        children = []
        original_run, original_popen = subprocess.run, subprocess.Popen
        def spawn(*args, **kwargs):
            child = original_popen(*args, **kwargs)
            children.append(child)
            return child
        def blocked(_command, **options):
            return original_run([sys._base_executable, '-c', 'import time; time.sleep(60)'], **options)
        with patch.object(media_io, 'TIMEOUT_SECONDS', 0.2), \
                patch.object(media_io.subprocess, 'run', side_effect=blocked), \
                patch.object(media_io.subprocess, 'Popen', side_effect=spawn), \
                self.assertRaises(TimeoutError):
            media_io.directory_files(self.root)
        self.assertEqual(len(children), 1)
        self.assertIsNotNone(children[0].poll())

    def test_packaged_cli_dispatches_the_read_only_worker(self):
        from peach.cli import main
        output = io.StringIO()
        with contextlib.redirect_stdout(output):
            self.assertEqual(main(['media-read', 'online', str(self.root)]), 0)
        self.assertEqual(json.loads(output.getvalue()), {'value': True})

    def test_invalid_nfo_and_art_outside_media_directory_are_rejected(self):
        nfo = self.root / 'broken.nfo'
        nfo.write_text('<movie>', encoding='utf-8')
        with self.assertRaises(ValueError):
            media_io.read_nfo(nfo)
        outside = self.root / 'outside.jpg'
        outside.write_bytes(b'image')
        inside = self.root / 'media'
        inside.mkdir()
        self.assertIsNone(media_io.local_art(inside / 'video.mp4', {'local_art': '../outside.jpg'}))

    def test_failed_directory_is_attempted_once_in_a_task(self):
        listing = library_processing._DirectoryIndex()
        with patch.object(library_processing, 'directory_files', side_effect=TimeoutError('读取超时')) as read:
            for _ in range(3):
                with self.assertRaises(TimeoutError):
                    listing.files(self.root)
        self.assertEqual(read.call_count, 1)

    def test_scan_continues_to_sibling_after_directory_timeout(self):
        from peach.scan import _walk
        good, bad = self.root / 'good', self.root / 'bad'
        good.mkdir()
        bad.mkdir()
        (good / 'video.mp4').write_bytes(b'video')
        def read(path):
            if Path(path) == bad:
                raise TimeoutError('目录读取超时')
            return media_io.directory_entries(path)
        errors = []
        walked = list(_walk(self.root, read_directory=read, onerror=errors.append))
        self.assertEqual(len(errors), 1)
        self.assertEqual([entry.name for directory, entries in walked if Path(directory) == good
                          for entry in entries], ['video.mp4'])

    def test_cover_output_failure_interrupts_instead_of_marking_bad_media(self):
        row = dict(id=1, name='video.mp4')
        issue = Mock()
        with patch('peach.local_poster.read_jpeg', return_value=(b'image', (20, 30))), \
                patch('peach.cover_artwork.install_cover', side_effect=OSError('空间不足')), \
                self.assertRaisesRegex(OSError, '空间不足'):
            library_processing._read_local_posters(
                [(row, self.root / 'source.jpg', 'ABW-101', self.root / 'cover.jpg')],
                dict(speed_mode='standard', covers=0), update=lambda **_: None, issue=issue)
        issue.assert_not_called()

    def test_metadata_persistence_failure_propagates(self):
        remote = Mock()
        remote._evidence.side_effect = PermissionError('证据目录无法写入')
        result = library_processing._MetadataResults(remote, 'ABW-101', Mock())
        with self.assertRaises(library_processing._ProcessingPersistenceError) as caught:
            result.save([('r18dev', {'id': 'ABW-101'})])
        with self.assertRaises(library_processing._ProcessingPersistenceError):
            library_processing._raise_task_failure(caught.exception)

    def test_source_pause_request_is_not_a_file_failure(self):
        from peach.jobs import JobPaused
        for error in (InterruptedError('停止'), JobPaused('暂停')):
            with self.subTest(error=type(error)), self.assertRaises(type(error)):
                library_processing._raise_task_failure(error)

    def test_nfo_timeout_preserves_filename_code_for_external_collection(self):
        video = self.root / 'ABW-101.mp4'
        row = dict(id=1, name=video.name, path=str(video), code='ABW-101')
        listing = Mock()
        listing.files.return_value = {video.name.casefold(): video}
        listing.sidecars.return_value = (video.with_suffix('.nfo'), [])
        issues = Mock()
        with patch.object(library_processing, 'read_nfo', side_effect=TimeoutError('NFO 读取超时')):
            result = library_processing._read_local_metadata(
                Mock(), self.root / 'unused.db', row, self.root, listing,
                dict(identified=0, covers=0), Mock(), issues, [])
        self.assertEqual(result, ('ABW-101', True, None, []))
        self.assertTrue(issues.call_args.kwargs['retryable'])

    def test_preview_frames_share_one_deadline(self):
        video = self.root / 'video.mp4'
        video.write_bytes(b'video')
        row = dict(id=1, name=video.name, path=str(video), duration=30, location='local')
        config = self.config
        resolver = Mock()
        resolver.ffmpeg.return_value = SimpleNamespace(path=Path('ffmpeg'))
        now, budgets = [100.0], []
        def capture(*_args, **options):
            budgets.append(options['timeout'])
            now[0] += options['timeout']
            return True
        with patch.object(library_processing.time, 'monotonic', side_effect=lambda: now[0]), \
                patch.object(library_processing, 'metadata_only', return_value=False), \
                patch('peach.frame_capture.capture_with_retry', side_effect=capture), \
                self.assertRaises(library_processing._PreviewCaptureError) as caught:
            library_processing._generate_preview(config, row, Mock(), resolver, progress=lambda: None)
        self.assertEqual(budgets, [45, 45, 30])
        self.assertEqual(caught.exception.diagnostics['reason'], 'timeout')

    def test_preview_timeout_continues_and_only_success_gets_checkpoint(self):
        rows = [dict(id=index, name=f'{index}.mp4', path=str(self.root / f'{index}.mp4'), location='local')
                for index in (1, 2)]
        issue, checkpoint = Mock(), Mock()
        with patch.object(library_processing, '_library_stages', return_value=lambda _: {'preview'}), \
                patch.object(library_processing, 'metadata_only', return_value=False), \
                patch.object(library_processing, '_generate_preview', side_effect=[TimeoutError('超时'), True]):
            made = library_processing._generate_previews(self.config, rows, Mock(), update=Mock(),
                issue=issue, guard=Mock(), checkpoint=checkpoint)
        self.assertEqual(made, 1)
        self.assertEqual(issue.call_args.args[0]['id'], 1)
        checkpoint.assert_called_once_with(rows[1])

    def test_preview_progress_write_failure_stops_the_batch(self):
        row = dict(id=1, name='video.mp4', path=str(self.root / 'video.mp4'), location='local')
        issue = Mock()
        def capture(_config, _row, _database, _resolver, *, progress):
            progress()
            return True
        with patch.object(library_processing, '_library_stages', return_value=lambda _: {'preview'}), \
                patch.object(library_processing, 'metadata_only', return_value=False), \
                patch.object(library_processing, '_generate_preview', side_effect=capture), \
                self.assertRaises(library_processing._ProcessingPersistenceError):
            library_processing._generate_previews(self.config, [row], Mock(),
                update=Mock(side_effect=[None, PermissionError('状态无法保存')]), issue=issue, guard=Mock())
        issue.assert_not_called()
