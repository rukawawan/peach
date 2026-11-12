"""首次目录的只读分批预检与请求生命周期。"""
import sqlite3
import tempfile
import unittest
from contextlib import closing
from pathlib import Path
from unittest.mock import patch

from peach.processing_inventory import preview, recent_rows, _SESSIONS, _LATEST
from peach.processing_traffic import ProcessingTraffic
from peach.settings_file import PeachConfig
from support.ledger import fresh_ledger


class InventoryTests(unittest.TestCase):
    def test_library_inventory_excludes_other_library_assets_and_roots(self):
        from dataclasses import replace
        from peach.media_libraries import libraries
        from peach.library_processing_scope import scoped_config
        config = replace(self.config, locations={'mounted': ('A:\\Cloud', 'B:\\Other')})
        with closing(sqlite3.connect(self.db)) as connection, connection:
            for location in ('A:\\Cloud', 'B:\\Other'):
                connection.execute('INSERT INTO asset(location,path,name,medium) VALUES(?,?,?,?)',
                                   ('mounted', location + '\\ABW-001.mp4', 'ABW-001.mp4', 'video'))
        library_id = libraries(config)[0]['id']
        selected = scoped_config(config, library_id)
        result = preview(selected, self.db, 'collect', None, library_id=library_id)
        self.assertEqual(result['workload']['video_files'], 1)
        self.assertEqual(selected.locations, {'mounted': ('A:\\Cloud',)})
        with self.assertRaisesRegex(ValueError, '媒体库'):
            scoped_config(config, 'missing')

    def setUp(self):
        temporary = tempfile.TemporaryDirectory()
        self.addCleanup(temporary.cleanup)
        self.root = Path(temporary.name).resolve()
        self.media = self.root / 'media'
        self.media.mkdir()
        self.config = PeachConfig(self.root, self.root / 'config.toml', present=True,
            locations={'mounted': ('A:\\Cloud',)}, media_costs={'A:\\Cloud': 'metered'})
        self.db = fresh_ledger(self.root)
        self.addCleanup(_SESSIONS.clear)
        self.addCleanup(_LATEST.clear)
        mount = patch('peach.scan.walk_root_for', return_value=self.media)
        self.walk = mount.start()
        self.addCleanup(mount.stop)

    def test_empty_ledger_recognizes_names_without_opening_media_or_writing_ledger(self):
        for name in ('ABW-001.mp4', 'ABW-001-CD2.MKV', '日常.mov', 'ABW-001.nfo', 'poster.jpg'):
            (self.media / name).write_bytes(b'')
        (self.media / '#recycle').mkdir()
        (self.media / '#recycle' / 'ABW-002.mp4').touch()
        before = self.db.read_bytes()
        original = Path.open

        def guarded(path, *args, **kwargs):
            self.assertFalse(path.is_relative_to(self.media), '预检读取了媒体内容')
            return original(path, *args, **kwargs)

        with patch.object(Path, 'open', guarded):
            result = preview(self.config, self.db, 'all', None)
        self.assertTrue(result['inventory']['complete'])
        self.assertEqual(result['inventory']['errors'], 0)
        self.assertEqual(result['workload']['video_files'], 3)
        self.assertEqual(result['workload']['jav_files'], 2)
        self.assertEqual(result['workload']['jav_titles'], 1)
        self.assertGreater(result['estimated_bytes'], 0)
        self.assertEqual(self.db.read_bytes(), before)

    def test_release_code_families_count_as_jav_during_inventory(self):
        for name in ('LAF-41.mpg', 'MKBD-S94.mkv', 'MKD-S118.iso', '040221_0012.flv',
                     'IMG_3092.mpg', 'VIDEO-2022.rmvb'):
            (self.media / name).touch()
        before = self.db.read_bytes()
        result = preview(self.config, self.db, 'all', None)
        self.assertEqual(result['workload']['video_files'], 6)
        self.assertEqual(result['workload']['jav_files'], 4)
        self.assertEqual(result['workload']['jav_titles'], 4)
        self.assertEqual(self.db.read_bytes(), before)

    def test_trailers_are_excluded_from_discovered_and_registered_workloads(self):
        for name in ('ABC-123.mp4', 'ABC-123-trailer.mp4', 'ABC-123.TRAILER.MKV', 'short.mp4'):
            (self.media / name).touch()
        before = self.db.read_bytes()
        discovered = preview(self.config, self.db, 'all', None)
        self.assertEqual(discovered['workload']['video_files'], 2)
        self.assertEqual(discovered['workload']['jav_files'], 1)
        self.assertEqual(self.db.read_bytes(), before)
        with closing(sqlite3.connect(self.db)) as connection, connection:
            for name in ('ABC-123.mp4', 'ABC-123-trailer.mp4'):
                connection.execute('INSERT INTO asset(location,path,name,medium) VALUES(?,?,?,?)',
                                   ('mounted', 'A:\\Cloud\\' + name, name, 'video'))
        before = self.db.read_bytes()
        registered = preview(self.config, self.db, 'all', None)
        self.assertEqual(registered['workload']['video_files'], 2)
        self.assertEqual(self.db.read_bytes(), before)

    def test_extra_directories_have_no_discovered_or_registered_workload(self):
        relative = ('Film/Film.mp4', 'Film/Trailers/Teaser.mp4',
                    'Film/Extras/Disc 1/Making of.mp4', 'Film/Actor-interview2.mkv')
        for value in relative:
            target = self.media / value
            target.parent.mkdir(parents=True, exist_ok=True)
            target.touch()
        before = self.db.read_bytes()
        result = preview(self.config, self.db, 'all', None)
        self.assertEqual(result['workload']['video_files'], 1)
        self.assertEqual(self.db.read_bytes(), before)
        with closing(sqlite3.connect(self.db)) as connection, connection:
            for value in relative:
                connection.execute('INSERT INTO asset(location,path,name,medium) VALUES(?,?,?,?)',
                    ('mounted', 'A:/Cloud/' + value, Path(value).name, 'video'))
        before = self.db.read_bytes()
        result = preview(self.config, self.db, 'all', None)
        self.assertEqual(result['workload']['video_files'], 1)
        self.assertEqual(self.db.read_bytes(), before)

    def test_each_query_advances_a_batch_and_preserves_deduplication(self):
        for number in range(1100):
            (self.media / f'ABW-001-CD{number}.mp4').touch()
        first = preview(self.config, self.db, 'scan', None)
        self.assertFalse(first['inventory']['complete'])
        token = first['inventory']['token']
        session = _SESSIONS[token]
        count = len(session.rows)
        self.assertEqual(len(session.rows), count)
        result = first
        for _ in range(20):
            if result['inventory']['complete']:
                break
            result = preview(self.config, self.db, 'scan', None, token)
        self.assertTrue(result['inventory']['complete'])
        self.assertEqual(result['workload']['video_files'], 1100)
        self.assertEqual(result['workload']['jav_titles'], 1)
        self.assertNotIn(token, _SESSIONS)

    def test_selected_assets_and_collection_do_not_list_directories(self):
        with closing(sqlite3.connect(self.db)) as connection, connection:
            connection.execute("INSERT INTO asset(location,path,name,medium,size) VALUES(?,?,?,?,?)",
                               ('mounted', 'A:\\Cloud\\ABW-001.mp4', 'ABW-001.mp4', 'video', 1024))
        for stage, asset_ids in (('all', [1]), ('collect', None)):
            result = preview(self.config, self.db, stage, asset_ids)
            self.assertTrue(result['inventory']['complete'])
            self.assertEqual(result['workload']['video_files'], 1)
        self.walk.assert_not_called()

    def test_full_library_inventory_discovers_new_files_beside_registered_files(self):
        with closing(sqlite3.connect(self.db)) as connection, connection:
            connection.execute("INSERT INTO asset(location,path,name,medium,size) VALUES(?,?,?,?,?)",
                               ('mounted', 'A:\\Cloud\\ABW-001.mp4', 'ABW-001.mp4', 'video', 1024))
        (self.media/'ABW-001.mp4').touch()
        (self.media/'ABW-002.mp4').touch()
        result = preview(self.config,self.db,'all',None)
        self.assertTrue(result['inventory']['complete'])
        self.assertEqual(result['workload']['video_files'],2)

    def test_unreadable_directory_reports_incomplete_counts(self):
        with patch('peach.scan.os.scandir', side_effect=PermissionError('拒绝访问')):
            result = preview(self.config, self.db, 'all', None)
        self.assertTrue(result['inventory']['complete'])
        self.assertEqual(result['inventory']['errors'], 1)
        self.assertEqual(result['workload']['video_files'], 0)

    def test_invalid_continuation_is_rejected(self):
        with self.assertRaisesRegex(ValueError, '预检已结束'):
            preview(self.config, self.db, 'scan', None, 'invalid')

    def test_incremental_preview_finds_additions_in_a_root_with_completed_assets(self):
        for name in ('old.mp4','new.mp4'):
            (self.media/name).touch()
        with closing(sqlite3.connect(self.db)) as connection, connection:
            connection.execute("INSERT INTO asset(location,path,name,medium) VALUES(?,?,?,?)",
                               ('mounted','A:\\Cloud\\old.mp4','old.mp4','video'))
        result = preview(self.config,self.db,'all',None,incremental=True)
        self.assertEqual(result['workload']['video_files'],1)
        self.assertTrue(result['inventory']['complete'])

    def test_started_task_uses_recent_inventory_and_registered_rows_take_precedence(self):
        (self.media / 'ABW-001.mp4').touch()
        before = preview(self.config, self.db, 'all', None)
        rows = recent_rows(self.config, self.db, 'all', None)
        task = ProcessingTraffic(self.config, self.db, 'all', inventory_rows=rows)
        self.assertEqual(task.snapshot()['workload'], before['workload'])
        self.assertEqual(task.snapshot()['estimated_bytes'], before['estimated_bytes'])
        with closing(sqlite3.connect(self.db)) as connection, connection:
            connection.execute("INSERT INTO asset(location,path,name,medium,size,duration) VALUES(?,?,?,?,?,?)",
                               ('mounted', 'A:\\Cloud\\ABW-001.mp4', 'ABW-001.mp4', 'video', 1234, 3600))
        task = ProcessingTraffic(self.config, self.db, 'all', inventory_rows=rows)
        self.assertEqual(task.snapshot()['workload']['video_files'], 1)
        self.assertEqual(task.plan.assets[0]['size'], 1234)
        self.assertEqual(recent_rows(self.config, self.db, 'scan', None), [])
