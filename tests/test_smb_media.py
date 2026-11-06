"""SMB 媒体配置、字节范围与媒体工具输入的行为回归。"""
from __future__ import annotations

import io
import json
import os
import shutil
import subprocess
import sqlite3
import tempfile
import unittest
from contextlib import closing
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import patch

import httpx
from fastapi import FastAPI
from fastapi.testclient import TestClient

from peach import media_configuration, media_identity, settings_file, smb_media, scan
from peach.migrations import upgrade
from peach.smb_response import SmbResponse
from peach.smb_transport import SmbConnection, SmbStat
from support.conditions import missing_prerequisite


class _Resource:
    root_id = 'fixture'
    name = 'sample.mp4'

    def __init__(self, data):
        self.data = data
        self.opened = []

    def __str__(self):
        return 'fixture/sample.mp4'

    def stat(self):
        return SimpleNamespace(st_size=len(self.data), st_mtime=1, st_mtime_ns=1)

    def open(self):
        handle = io.BytesIO(self.data)
        self.opened.append(handle)
        return handle


class SmbMediaTests(unittest.TestCase):
    def tearDown(self):
        smb_media.close_bridge()

    def test_smb_organize_and_transaction_recovery_use_remote_operations(self):
        from peach import organize, web_batch
        from pathlib import PureWindowsPath
        with tempfile.TemporaryDirectory() as temporary:
            directory = Path(temporary).resolve()
            (directory / 'film.mp4').write_bytes(b'local protocol fixture')

            class Transport:
                def __enter__(self):
                    return self

                def __exit__(self, *_):
                    pass

                def close(self):
                    pass

                def stat(self, parts):
                    path = directory.joinpath(*parts)
                    info = path.stat()
                    return SmbStat(info.st_size, info.st_mtime, info.st_mtime_ns, path.is_dir(), path.name)

                def mkdir(self, parts):
                    directory.joinpath(*parts).mkdir()

                def rename(self, source, target):
                    destination = directory.joinpath(*target)
                    if destination.exists():
                        raise FileExistsError(str(destination))
                    directory.joinpath(*source).rename(destination)

                def unlink(self, parts, directory=False):
                    path = self.path(parts)
                    path.rmdir() if directory else path.unlink()

                def path(self, parts):
                    return directory.joinpath(*parts)

            def resolve(raw, config=None):
                if isinstance(raw, smb_media.SmbResource):
                    return raw
                parts = PureWindowsPath(str(raw)).relative_to(PureWindowsPath('R:/Media')).parts
                return smb_media.SmbResource('fixture', 'R:/Media', 'smb://files.invalid/media', parts,
                                             SmbConnection('files.invalid', 'media'))

            with patch.object(smb_media, 'resolve', side_effect=resolve), \
                    patch.object(smb_media.SmbResource, '_transport', return_value=Transport()), \
                    sqlite3.connect(':memory:') as connection:
                connection.execute('CREATE TABLE asset(id INTEGER PRIMARY KEY,path TEXT,name TEXT)')
                connection.execute('INSERT INTO asset VALUES(1,?,?)', ('R:/Media/film.mp4', 'film.mp4'))
                connection.commit()
                result = organize._move_one(connection, 1, 'R:/Media/film.mp4', 'R:/Media/folder/renamed.mp4')
                self.assertEqual(result, 'ok')
                self.assertEqual((directory / 'folder/renamed.mp4').read_bytes(), b'local protocol fixture')
                self.assertEqual(connection.execute('SELECT path FROM asset').fetchone()[0], 'R:/Media/folder/renamed.mp4')
                original = resolve('R:/Media/folder/renamed.mp4')
                quarantined = web_batch._quarantine_media(original)
                self.assertFalse(original.exists())
                self.assertTrue(quarantined.exists())
                web_batch._restore_staged_media([(original, quarantined)])
                self.assertTrue(original.exists())
                self.assertFalse(quarantined.exists())
                with patch.object(organize, '_update_row', side_effect=sqlite3.OperationalError('fixture failure')):
                    result = organize._move_one(connection, 1, str(original), 'R:/Media/again.mp4')
                self.assertIn('已改回原名', result)
                self.assertTrue(original.exists())
                self.assertFalse((directory / 'again.mp4').exists())

    def test_smb_mutations_refuse_other_roots_and_declared_root_itself(self):
        root = smb_media.SmbResource('one', 'R:/Media', 'smb://files.invalid/media', (),
                                     SmbConnection('files.invalid', 'media'))
        other = smb_media.SmbResource('two', 'S:/Media', 'smb://files.invalid/other', ('file',),
                                      SmbConnection('files.invalid', 'other'))
        with self.assertRaises(OSError):
            (root / 'file').rename(other)
        for operation in (root.unlink, root.rmdir, lambda: root.open('wb')):
            with self.assertRaises(PermissionError):
                operation()

    def test_media_io_preserves_smb_identity_and_uses_transport_deadlines(self):
        from peach import media_io
        from peach.smb_transport import SmbEntry
        root = smb_media.SmbResource('fixture', 'R:/Media', 'smb://files.invalid/media', (),
                                     SmbConnection('files.invalid', 'media'))
        def resolve(raw):
            if isinstance(raw, smb_media.SmbResource):
                return raw
            return root / 'film.mp4' if raw == 'R:\\Media\\film.mp4' else None
        transport = SimpleNamespace(stat=lambda _parts: SmbStat(9, 1, 1, False, 'film.mp4'), close=lambda: None)
        with patch.object(smb_media, 'resolve', side_effect=resolve), \
                patch.object(smb_media.SmbResource, 'scandir', return_value=[SmbEntry(9,1,1,False,'film.mp4',False)]), \
                patch.object(smb_media.SmbResource, '_transport', return_value=transport), \
                patch.object(media_io.subprocess, 'run') as subprocess_run:
            entries = media_io.directory_entries(root)
            self.assertEqual(entries[0].name, 'film.mp4')
            files = media_io.directory_files(root)
            self.assertIsInstance(files['film.mp4'], smb_media.SmbResource)
            self.assertEqual(media_io.file_stat(root / 'film.mp4', timeout=2).st_size, 9)
            with self.assertRaises(TimeoutError):
                media_io.file_stat(root / 'film.mp4', timeout=0)
            subprocess_run.assert_not_called()

    def test_address_rejects_credentials_and_path_escape(self):
        for value in ('smb://u:p@nas/share', 'smb://nas/share/%2e%2e/private',
                      'smb://nas/share/a%2fb', 'smb://nas/share/file:stream', 'smb://nas'):
            with self.subTest(value=value), self.assertRaises(ValueError):
                smb_media.canonical(value)
        self.assertEqual(smb_media.canonical('smb://NAS/share/中文'), 'smb://nas/share/%E4%B8%AD%E6%96%87')

    def test_configuration_roundtrip_keeps_password_out_of_config_and_responses(self):
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary).resolve()
            config = settings_file.PeachConfig(root, root / 'config.toml', present=True, locations={})
            sources = media_configuration.prepare_sources([
                dict(location='local', path='smb://nas/share/Movies', library='NAS',
                     smb_username='reader', smb_password='private-password', cost='free')], windows=True, config=config)
            _locations, _mounts, errors = media_configuration.validate(sources, windows=True, config=config)
            self.assertEqual(errors, [])
            prepared = media_identity.configure_sources(config, sources, windows=True)
            smb_media.save_credentials(prepared, sources)
            body = settings_file.render(prepared)
            self.assertNotIn('private-password', body)
            config.path.write_text(body, encoding='utf-8')
            loaded = settings_file.load_config(environ={'PEACH_DATA_ROOT': str(root)})
            self.assertEqual(loaded.storage_roots, prepared.storage_roots)
            rows = media_configuration.rows(loaded, windows=True)
            self.assertTrue(rows[0]['smb_password_saved'])
            self.assertNotIn('private-password', json.dumps(rows))
            resource = smb_media.resolve(sources[0]['root'] + '\\video.mp4', loaded)
            self.assertEqual(resource.relative, ('video.mp4',))
            self.assertEqual(resource.connection.password, 'private-password')
            smb_media.save_credentials(loaded, [{**sources[0], 'smb_password': ''}])
            self.assertEqual(smb_media.resolve(str(resource), loaded).connection.password, 'private-password')
            with self.assertRaises(OSError):
                with smb_media.credential_transaction(loaded, [{**sources[0], 'smb_password': 'replacement'}]):
                    raise OSError('模拟配置文件替换失败')
            self.assertEqual(smb_media.resolve(str(resource), loaded).connection.password, 'private-password')
            smb_media.save_credentials(loaded, [{**sources[0], 'smb_clear': True}])
            self.assertEqual(smb_media.resolve(str(resource), loaded).connection.password, '')

    def test_http_range_and_head_release_independent_handles(self):
        resource = _Resource(b'0123456789')
        app = FastAPI()
        @app.api_route('/media', methods=['GET', 'HEAD'])
        def media():
            return SmbResponse(resource)
        with TestClient(app) as client:
            for value, expected in [('bytes=3-5', b'345'), ('bytes=-2', b'89'), ('bytes=7-', b'789')]:
                response = client.get('/media', headers={'Range': value})
                self.assertEqual((response.status_code, response.content), (206, expected))
            self.assertEqual(client.get('/media', headers={'Range': 'bytes=100-'}).status_code, 416)
            count = len(resource.opened)
            self.assertEqual(client.head('/media').headers['content-length'], '10')
            self.assertEqual(len(resource.opened), count)
        self.assertTrue(all(handle.closed for handle in resource.opened))

    def test_unreadable_resource_returns_service_unavailable(self):
        resource = _Resource(b'0123456789')
        app = FastAPI()
        @app.get('/media')
        def media():
            return SmbResponse(resource)
        with patch.object(resource, 'open', side_effect=PermissionError('denied')), TestClient(app) as client:
            self.assertEqual(client.get('/media').status_code, 503)

    def test_scan_preserves_stable_paths_and_pairs_subtitles(self):
        from peach.smb_transport import SmbEntry
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary).resolve()
            config = settings_file.PeachConfig(root, root / 'config.toml', present=True, locations={})
            sources = media_configuration.prepare_sources([
                dict(location='local', path='smb://nas/share/Movies', library='NAS', cost='free')], windows=True, config=config)
            config = media_identity.configure_sources(config, sources, windows=True)
            ledger_root = sources[0]['root']
            db = root / 'ledger.db'
            upgrade(db, Path(__file__).resolve().parents[1] / 'migrations')
            files = [SmbEntry(10, 1700000000, 1700000000000000000, False, 'ABC-123.mp4'),
                     SmbEntry(20, 1700000000, 1700000000000000000, False, 'ABC-123.srt')]
            with patch('peach.settings_file.active', return_value=config), \
                    patch.object(smb_media.SmbResource, 'scandir', return_value=files):
                first = scan.scan_location(db, 'local', ledger_root, declared_roots=config.locations,
                                           mounts=config.mounts, report=lambda _: None)
                second = scan.scan_location(db, 'local', ledger_root, declared_roots=config.locations,
                                            mounts=config.mounts, report=lambda _: None)
            self.assertEqual((first.files, first.subtitles, second.files), (2, 1, 2))
            with closing(sqlite3.connect(db)) as connection:
                self.assertEqual(connection.execute("SELECT path FROM asset WHERE medium='video'").fetchall(), [(ledger_root + '\\ABC-123.mp4',)])
                self.assertEqual(connection.execute('SELECT COUNT(*) FROM asset_subtitle').fetchone()[0], 1)

    def test_scan_walk_shares_one_connection_and_reconnects_once_after_a_drop(self):
        import errno
        from peach.smb_transport import SmbEntry
        tree = {('Movies',): [SmbEntry(0, 1, 1, True, name) for name in ('A', 'B', 'C', 'Gone')]}
        for name in 'ABC':
            tree[('Movies', name)] = [SmbEntry(10, 1, 1, False, f'{name}.mp4'), SmbEntry(0, 1, 1, True, 'extrafanart')]
            tree[('Movies', name, 'extrafanart')] = [SmbEntry(5, 1, 1, False, 'fanart1.jpg')]
        listed_directories = len(tree)

        class Transport:
            def __init__(self, drop_on=None):
                self.drop_on, self.calls, self.closed = drop_on, 0, False
                transports.append(self)

            def scandir(self, parts):
                assert not self.closed, '已关闭的连接不应再被使用'
                self.calls += 1
                if self.calls == self.drop_on:
                    raise OSError(errno.ENETDOWN, 'SMB 连接已断开')
                if parts not in tree:
                    raise FileNotFoundError(errno.ENOENT, '不存在')
                return tree[parts]

            def close(self):
                self.closed = True

        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary).resolve()
            config = settings_file.PeachConfig(root, root / 'config.toml', present=True, locations={})
            sources = media_configuration.prepare_sources([
                dict(location='local', path='smb://nas/share/Movies', library='NAS', cost='free')], windows=True, config=config)
            config = media_identity.configure_sources(config, sources, windows=True)
            with patch('peach.settings_file.active', return_value=config):
                top = scan.walk_root_for('local', sources[0]['root'], declared_roots=config.locations, mounts=config.mounts)
            for drop_on, expected_transports in ((None, 1), (3, 2)):
                with self.subTest(drop_on=drop_on):
                    transports, errors = [], []
                    with patch.object(smb_media.SmbResource, '_transport',
                                      side_effect=lambda first_drop=drop_on, created=transports: Transport(None if created else first_drop)):
                        walked = list(scan._walk(top, onerror=errors.append))
                    self.assertEqual(len(transports), expected_transports)
                    self.assertTrue(all(transport.closed for transport in transports))
                    self.assertEqual(len(walked), listed_directories)
                    self.assertEqual(sorted(entry.name for _, files in walked for entry in files),
                                     ['A.mp4', 'B.mp4', 'C.mp4', 'fanart1.jpg', 'fanart1.jpg', 'fanart1.jpg'])
                    self.assertEqual([error.errno for error in errors], [errno.ENOENT])
            transports = []
            with patch.object(smb_media.SmbResource, '_transport', side_effect=lambda: Transport()):
                walker = scan._walk(top, onerror=lambda error: None)
                next(walker)
                walker.close()
            self.assertEqual([transport.closed for transport in transports], [True])

    def test_loopback_bridge_range_and_authorization(self):
        resource = _Resource(b'0123456789')
        bridge = smb_media._bridge()
        url = bridge.register(resource)
        with httpx.Client(trust_env=False) as client:
            response = client.get(url, headers={'Range': 'bytes=3-5'})
            self.assertEqual((response.status_code, response.content), (206, b'345'))
            self.assertEqual(client.head(url).headers['content-length'], '10')
            self.assertEqual(client.get(url.replace(bridge.secret, 'invalid')).status_code, 404)
        self.assertTrue(all(handle.closed for handle in resource.opened))
        self.assertEqual(smb_media.source_identity(url), str(resource))

    def test_ffmpeg_reads_tail_index_and_seeks_through_bridge(self):
        ffmpeg, ffprobe = shutil.which('ffmpeg'), shutil.which('ffprobe')
        if not ffmpeg or not ffprobe:
            missing_prerequisite('需要 FFmpeg 与 ffprobe 验证回环媒体输入')
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary).resolve()
            source, frame = root / 'sample.mp4', root / 'frame.jpg'
            flags = {'creationflags': subprocess.CREATE_NO_WINDOW} if os.name == 'nt' else {}
            generated = subprocess.run([ffmpeg, '-v', 'error', '-f', 'lavfi', '-i',
                                        'testsrc2=size=96x64:rate=10', '-t', '3', '-c:v', 'mpeg4',
                                        str(source)], capture_output=True, timeout=20, **flags)
            self.assertEqual(generated.returncode, 0, generated.stderr)
            resource = _Resource(source.read_bytes())
            url = smb_media._bridge().register(resource)
            measured = subprocess.run([ffprobe, '-v', 'error', '-show_entries', 'format=duration',
                                       '-of', 'json', url], capture_output=True, timeout=15, **flags)
            self.assertEqual(measured.returncode, 0, measured.stderr)
            self.assertGreater(float(json.loads(measured.stdout)['format']['duration']), 2)
            captured = subprocess.run([ffmpeg, '-v', 'error', '-ss', '2', '-i', url,
                                       '-frames:v', '1', str(frame)], capture_output=True, timeout=15, **flags)
            self.assertEqual(captured.returncode, 0, captured.stderr)
            self.assertGreater(frame.stat().st_size, 100)
