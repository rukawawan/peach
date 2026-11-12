"""入库时顺手探时长：探哪些行、哪些来源不碰、探不出来记成什么。"""
from __future__ import annotations

import os
import json
import sqlite3
import subprocess
import tempfile
import threading
import unittest
from pathlib import Path, PureWindowsPath
from types import SimpleNamespace
from unittest import mock

from peach import media_probe
from peach import push_discovery as push
from support.ledger import fresh_ledger

ROOT = r"R:\media"


class ProbeUnmeasuredTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.db = fresh_ledger(Path(self.tmp.name))
        self.probed: list[str] = []

    def add(self, path, *, location="local", medium="video", duration=None, disposal=None) -> int:
        connection = sqlite3.connect(self.db)
        try:
            cursor = connection.execute(
                "INSERT INTO asset(location,path,name,medium,duration,disposal) VALUES(?,?,?,?,?,?)",
                (location, path, PureWindowsPath(path).name, medium, duration, disposal))
            connection.commit()
            return cursor.lastrowid
        finally:
            connection.close()

    def row(self, asset_id):
        connection = sqlite3.connect(self.db)
        try:
            return connection.execute(
                "SELECT duration,width,height,ctx_quality FROM asset WHERE id=?", (asset_id,)).fetchone()
        finally:
            connection.close()

    def fake_probe(self, _ffprobe, path, _timeout):
        self.probed.append(PureWindowsPath(path).name)
        return 1800.0, 1920, 1080, "h264", 30.0, None

    def probe(self, location="local", root=ROOT, ffprobe="ffprobe"):
        with mock.patch.object(media_probe, "probe_file", self.fake_probe), \
                mock.patch.object(media_probe, "resolve_case_insensitive", str):
            return media_probe.probe_unmeasured(self.db, ffprobe, location, root)

    def test_probe_uses_each_mount_root_choice_including_pikpak(self):
        self.add(r'A:\Media\normal.mp4', location='pikpak')
        self.add(r'A:\Media\Proxy\protected.mp4', location='pikpak')
        config = SimpleNamespace(locations={'pikpak': (r'A:\Media', r'A:\Media\Proxy')},
                                 media_costs={r'A:\Media': 'free', r'A:\Media\Proxy': 'metered'})
        with mock.patch.object(media_probe, 'probe_file', self.fake_probe), \
                mock.patch.object(media_probe, 'resolve_case_insensitive', str):
            count = media_probe.probe_unmeasured(self.db, 'ffprobe', 'pikpak', r'A:\Media', config=config)
        self.assertEqual(count, 1)
        self.assertEqual(self.probed, ['normal.mp4'])

    def test_only_unmeasured_active_videos_under_the_scanned_root_are_probed(self):
        fresh = self.add(ROOT + r"\新片\a.mp4")
        measured = self.add(ROOT + r"\b.mp4", duration=10.0)
        self.add(ROOT + r"\c.jpg", medium="image")
        self.add(ROOT + r"\d.mp4", disposal="trash")
        self.add(r"R:\mediax\e.mp4")
        self.add(r"R:\other\f.mp4")

        self.assertEqual(self.probe(), 1)
        self.assertEqual(self.probed, ["a.mp4"], "同前缀的兄弟目录 R:\\mediax 不在这个根下")
        self.assertEqual(self.row(fresh), (1800.0, 1920, 1080, "2K"))
        self.assertEqual(self.row(measured)[0], 10.0)

    def test_selected_probe_query_fits_the_connection_parameter_limit(self):
        selected = self.add(ROOT + r'\selected.mp4')
        self.add(ROOT + r'\unselected.mp4')
        connect = sqlite3.connect
        def limited_connection(*args, **kwargs):
            connection = connect(*args, **kwargs)
            connection.setlimit(sqlite3.SQLITE_LIMIT_VARIABLE_NUMBER, 5)
            return connection
        with mock.patch.object(media_probe.sqlite3, 'connect', side_effect=limited_connection), \
                mock.patch.object(media_probe, '_record', return_value=1) as record:
            count = media_probe.probe_unmeasured(
                self.db, 'ffprobe', 'local', ROOT, asset_ids=[selected] * 10)
        self.assertEqual(count, 1)
        self.assertEqual([row[0] for row in record.call_args.args[2]], [selected])

    def test_a_metered_source_is_left_for_the_explicit_batch(self):
        pending = self.add(r"A:\创作者\a.mp4", location="pikpak")
        self.assertEqual(self.probe("pikpak", "A:\\"), 0)
        self.assertEqual(self.probed, [])
        self.assertIsNone(self.row(pending)[0])

    def test_registered_trailer_is_not_read_or_changed_by_background_probe(self):
        main = self.add(ROOT + r'\ABC-123.mp4')
        trailer = self.add(ROOT + r'\ABC-123-trailer.mp4')
        self.assertEqual(self.probe(), 1)
        self.assertEqual(self.probed, ['ABC-123.mp4'])
        self.assertEqual(self.row(main)[0], 1800)
        self.assertIsNone(self.row(trailer)[0])

    def test_directory_extras_and_numbered_suffixes_are_not_probed(self):
        main = self.add(ROOT + r'\Film\Film.mp4')
        extras = [self.add(ROOT + relative) for relative in (
            r'\Film\Trailers\Teaser.mp4', r'\Film\Extras\Disc 1\Making of.mkv',
            r'\Film\Actor-interview2.mp4', r'\Film\sample2.mp4')]
        self.assertEqual(self.probe(), 1)
        self.assertEqual(self.row(main)[0], 1800)
        self.assertTrue(all(self.row(aid)[0] is None for aid in extras))

    def test_without_ffprobe_the_scan_still_finishes_and_leaves_rows_pending(self):
        pending = self.add(ROOT + r"\a.mp4")
        self.assertEqual(self.probe(ffprobe=None), 0)
        self.assertIsNone(self.row(pending)[0])

    def test_file_scope_reads_exactly_that_file(self):
        self.add(ROOT + r'\a.mp4')
        self.add(ROOT + r'\b.mp4')
        self.assertEqual(self.probe(root=ROOT + r'\a.mp4'), 1)
        self.assertEqual(self.probed, ['a.mp4'])

    def test_measured_short_promotion_is_isolated_and_bound_main_is_protected(self):
        from peach.repository import LedgerDatabase
        for aid in (1, 2):
            self.add(ROOT + rf'\bbsxv.xyz-ABC-123\附件{aid}.mp4')
        with LedgerDatabase(self.db).write_transaction() as connection:
            connection.execute("UPDATE asset SET size=1048576,creator='bbsxv.xyz',code='ABC-123'")
        with mock.patch.object(media_probe, 'probe_file', return_value=(10, 1280, 720, 'h264', 30, None)), \
                mock.patch.object(media_probe, 'resolve_case_insensitive', str):
            count = media_probe.probe_unmeasured(self.db, 'ffprobe', 'local', ROOT, protected_ids=[1])
        self.assertEqual(count, 2)
        with LedgerDatabase(self.db).read_connection() as connection:
            self.assertEqual([tuple(row) for row in connection.execute(
                'SELECT id,duration,disposal FROM asset ORDER BY id')], [(1, 10, None), (2, 10, 'trash')])

    def test_personal_records_reattach_before_measured_junk_isolation(self):
        from peach.repository import LedgerDatabase
        fresh = self.add(ROOT + r'\bbsxv.xyz\点击进入.mp4')
        with LedgerDatabase(self.db).write_transaction() as connection:
            connection.execute("UPDATE asset SET size=1000,creator='bbsxv.xyz' WHERE id=?", (fresh,))
            connection.execute("INSERT INTO asset(location,path,name,medium,size,creator,duration,play_count,disposal) "
                "VALUES('local','R:\\gone\\点击进入.mp4','点击进入.mp4','video',1000,'bbsxv.xyz',10,1,'vanished')")
        checked = []
        with mock.patch.object(media_probe, 'probe_file', return_value=(10, 1280, 720, 'h264', 30, None)), \
                mock.patch.object(media_probe, 'resolve_case_insensitive', str):
            media_probe.probe_unmeasured(self.db, 'ffprobe', 'local', ROOT, on_junk=checked.append)
        with LedgerDatabase(self.db).read_connection() as connection:
            self.assertEqual(tuple(connection.execute('SELECT disposal,play_count FROM asset WHERE id=?',
                                                     (fresh,)).fetchone()), (None, 1))
            self.assertEqual(connection.execute('SELECT count(*) FROM record_rehome').fetchone()[0], 1)
        self.assertEqual(checked[0]['isolated'], 0)

    def test_an_unreadable_file_is_marked_failed_so_the_next_scan_skips_it(self):
        broken = self.add(ROOT + r"\坏.mp4")

        def timeout(*_args):
            raise subprocess.TimeoutExpired("ffprobe", 20)

        with mock.patch.object(media_probe, "probe_file", timeout), \
                mock.patch.object(media_probe, "resolve_case_insensitive", str):
            media_probe.probe_unmeasured(self.db, "ffprobe", "local", ROOT)
        self.assertEqual(self.row(broken), (-1, 0, 0, None))
        self.assertEqual(self.probe(), 0, "-1 已经不是待办")

    def test_a_pushed_file_is_probed_on_its_own(self):
        pushed = self.add(ROOT + r"\a.mp4")
        other = self.add(ROOT + r"\b.mp4")
        with mock.patch.object(media_probe, "probe_file", self.fake_probe), \
                mock.patch.object(media_probe, "resolve_case_insensitive", str):
            self.assertEqual(media_probe.probe_path(self.db, "ffprobe", "local", ROOT + r"\a.mp4"), 1)
        self.assertEqual(self.row(pushed)[0], 1800.0)
        self.assertIsNone(self.row(other)[0])

    def test_controlled_probe_uses_parallel_readers_and_serial_progress(self):
        from peach.processing_control import control_for
        from peach.settings_file import PeachConfig
        root = Path(self.tmp.name).resolve()
        config = PeachConfig(root, root / 'config.toml', present=True, locations={'local': (ROOT,)})
        control = control_for(config)
        for mode, workers in (('low', 1), ('standard', 2), ('high', 4)):
            with self.subTest(mode=mode):
                selected = [self.add(ROOT + f'\\{mode}-{index}.mp4') for index in range(workers)]
                barrier = threading.Barrier(workers, timeout=3)
                readers, writers = set(), set()
                def probe(*_args, readers=readers, barrier=barrier):
                    readers.add(threading.get_ident())
                    barrier.wait()
                    return 1800.0, 1920, 1080, 'h264', 30.0, None
                with control.bind(mode, publish=lambda **_: None, active=lambda: True, db_path=self.db, mode=mode), \
                        mock.patch.object(media_probe, 'probe_file', probe), \
                        mock.patch.object(media_probe, 'resolve_case_insensitive', str):
                    count = media_probe.probe_unmeasured(self.db, 'ffprobe', 'local', ROOT, config=config,
                        asset_ids=selected, report=lambda *_, writers=writers: writers.add(threading.get_ident()))
                self.assertEqual(count, workers)
                self.assertEqual(len(readers), workers)
                self.assertEqual(writers, {threading.get_ident()})


class ProbeProcessTests(unittest.TestCase):
    def test_probe_uses_positive_sar_then_dar_and_keeps_unknown_ratios_unscaled(self):
        cases = [('256:81', '16:9', 2276), ('N/A', '16:9', 2276),
                 ('0:1', '16:9', 2276), ('1:1', '16:9', 720),
                 ('-1:1', 'N/A', 720), ('1:0', None, 720)]
        for sar, dar, width in cases:
            payload = json.dumps({'format': {'duration': '12.5'}, 'streams': [dict(
                width=720, height=1280, sample_aspect_ratio=sar, display_aspect_ratio=dar)]}).encode()
            with self.subTest(sar=sar, dar=dar), mock.patch.object(media_probe.subprocess, 'run',
                    return_value=SimpleNamespace(stdout=payload, returncode=0, stderr=b'')), \
                    mock.patch.object(media_probe, 'resolve_case_insensitive', return_value='sample.mp4'):
                result = media_probe.measure('ffprobe', 1, 'sample.mp4')
            self.assertEqual(result[1:3], (width, 1280))
            self.assertEqual(result[7], '横屏' if width > 1280 else '竖屏')
            self.assertEqual(result[8], '2K' if width > 1280 else '720P')

    def test_probe_reads_metadata_with_a_hidden_windows_process(self):
        payload = b'{"format":{"duration":"12.5"},"streams":[{"width":320,"height":240,' \
                  b'"codec_name":"h264","avg_frame_rate":"25/1"}]}'
        with mock.patch.object(media_probe.subprocess, "run",
                               return_value=SimpleNamespace(stdout=payload, returncode=0, stderr=b'')) as run:
            result = media_probe.probe_file("ffprobe", "sample.mp4", timeout=3)
        self.assertEqual(result, (12.5, 320, 240, "h264", 25.0, None))
        options = run.call_args.kwargs
        self.assertEqual(options["creationflags"],
                         subprocess.CREATE_NO_WINDOW if os.name == "nt" else 0)
        self.assertTrue(options["capture_output"])
        self.assertEqual(options["timeout"], 3)


class PushDiscoveryProbeTests(unittest.TestCase):
    def test_a_pushed_video_lands_with_its_duration(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp).resolve()
            db = fresh_ledger(root)
            media = root / "media"
            media.mkdir()
            (media / "a.mp4").write_bytes(b"0" * 8)
            if os.name == "nt":
                declared, mounts = {"local": (str(media),)}, {}
            else:
                declared, mounts = {"local": (ROOT,)}, {"local": (str(media),)}
            service = push.PushDiscoveryService(
                state_root=root / "state", secrets_root=root / "secrets", db_path=db,
                declared_roots=declared, mounts=mounts,
                ffprobe=lambda: SimpleNamespace(path="ffprobe"))
            path = str(PureWindowsPath(declared["local"][0]).joinpath("a.mp4"))
            with mock.patch.object(media_probe, "probe_file",
                                   lambda *_args: (95.0, 1280, 720, "h264", 25.0, None)):
                self.assertTrue(service.queue.ingest("local", path))
            connection = sqlite3.connect(db)
            try:
                duration, height = connection.execute("SELECT duration,height FROM asset").fetchone()
            finally:
                connection.close()
        self.assertEqual((duration, height), (95.0, 720))


if __name__ == "__main__":
    unittest.main()
