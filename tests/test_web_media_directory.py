"""网页文件浏览的授权根、只读边界、文件定位和离线状态。"""
import json
import os
import unittest
from pathlib import Path
from stat import FILE_ATTRIBUTE_REPARSE_POINT
from tempfile import TemporaryDirectory
from types import SimpleNamespace
from unittest.mock import patch

from peach import nas_directories, web_file_browser, web_media_directory
from peach.migrations import upgrade
from peach.user_messages import UserValueError
from peach.web_state import WebContract

ROOT = Path(__file__).resolve().parents[1]


class MediaDirectoryTests(unittest.TestCase):
    def setUp(self):
        self.root = Path(self.enterContext(TemporaryDirectory())).resolve()
        self.media = self.root / 'media'
        self.media.mkdir()
        self.folder = self.media / 'series'
        self.folder.mkdir()
        (self.folder / 'movie.mp4').write_bytes(b'not read')
        (self.folder / 'unindexed.mp4').touch()
        (self.folder / 'gone.mp4').touch()
        (self.folder / 'child').mkdir()
        self.path = self.root / 'ledger.db'
        upgrade(self.path, ROOT / 'migrations')
        self.contract = WebContract(self.path, candidate_root=self.root / 'generated',
                                    follow_state_root=self.root / 'state', snapshot_root=self.root / 'snapshots')
        self.libraries = [{'name': 'Library', 'icon': 'film', 'roots': [
            {'root_id': 'local', 'root': 'R:\\Media', 'location': 'local'},
            {'root_id': 'cloud', 'root': 'A:\\Cloud', 'location': 'cloud'}]}]
        self.enterContext(patch('peach.web_media_directory.settings_file.active'))
        self.enterContext(patch('peach.web_media_directory.media_libraries.libraries', return_value=self.libraries))
        self.enterContext(patch('peach.web_media_directory.translate_ledger_path',
                                side_effect=lambda path: self.media if path.startswith('R:') else self.root / 'offline'))
        self.enterContext(patch('peach.web_media_directory.is_unmapped', return_value=False))
        self.reader = self.enterContext(patch('peach.web_media_directory.media_io._request', side_effect=self.browse))
        with self.contract.write_transaction() as conn:
            conn.executemany("INSERT INTO asset(id,location,path,name,medium,disposal) VALUES(?,?,?,?, 'video', ?)", [
                (1, 'local', 'R:\\Media\\series\\movie.mp4', 'movie', None),
                (2, 'local', 'R:\\Media\\series\\child\\nested.mp4', 'nested', None),
                (3, 'local', 'R:\\Media\\series\\gone.mp4', 'gone', 'trash'),
                (4, 'other', 'R:\\Media\\series\\unindexed.mp4', 'other source', None),
                (5, 'local', 'Z:\\Missing\\movie.mp4', 'unmounted', None),
            ])

    def browse(self, operation, path, *, value, timeout):
        self.assertEqual(operation, 'browse')
        self.assertEqual(timeout, 10)
        return nas_directories.list_directory(path, **json.loads(value))

    def read(self, **args):
        return web_media_directory.q_media_directory(self.contract, args)

    def test_sort_filters_all_entries_before_paging_and_focus_resolves_sorted_page(self):
        (self.folder / 'movie-2.mp4').write_bytes(b'22')
        (self.folder / 'movie-10.mp4').write_bytes(b'1234567890')
        first = self.read(root='local', relative='series', sort='name', limit=2, q='movie')
        self.assertEqual(([row['name'] for row in first['files']], first['total'], first['next_offset']),
                         (['movie-2.mp4', 'movie-10.mp4'], 3, 2))
        focused = self.read(asset=1, sort='name', limit=2, q='movie')
        self.assertEqual((focused['offset'], focused['files'][0]['name']), (2, 'movie.mp4'))
        largest = self.read(root='local', relative='series', sort='size', dir='desc', limit=1, q='movie')
        self.assertEqual(largest['files'][0]['name'], 'movie-10.mp4')
        with self.assertRaises(UserValueError):
            self.read(root='local', relative='series', sort='unsupported')

    def test_column_filters_apply_to_the_folder_before_paging_and_keep_other_type_facets(self):
        (self.folder / 'note.txt').write_bytes(b'index')
        (self.folder / 'note-copy.txt').write_bytes(b'not empty')
        filters = json.dumps({'type': ['TXT'], 'size': {'range': {'min': 6}}})
        result = self.read(root='local', relative='series', sort='name', limit=1, column_filters=filters)
        self.assertEqual((result['total'], [row['name'] for row in result['files']]), (1, ['note-copy.txt']))
        self.assertEqual(result['facets']['type'], [{'id': 'MP4', 'count': 1}, {'id': 'TXT', 'count': 1}])

    def test_file_operations_preserve_asset_identity_and_recycle_original_paths(self):
        def write(operation, **params):
            return web_file_browser.w_file_browser(self.contract, {'root': 'local', 'relative': 'series',
                                                                   'operation': operation, **params})['items']
        self.assertTrue(write('mkdir', name='destination')[0]['ok'])
        entry = {'name': 'movie.mp4', 'directory': False}
        self.assertTrue(write('rename', name='renamed.mp4', entries=[entry])[0]['ok'])
        renamed = {**entry, 'name': 'renamed.mp4'}
        self.assertTrue(write('move', destination='series/destination', entries=[renamed])[0]['ok'])
        folder = {'name': 'destination', 'directory': True}
        result = write('trash', entries=[folder])[0]
        self.assertTrue(result['ok'])
        self.assertFalse((self.folder / 'destination').exists())
        with self.contract.read_connection() as connection:
            moved = connection.execute('SELECT path,disposal FROM asset WHERE id=1').fetchone()
        self.assertIn('\\.peach-file-trash\\', moved[0])
        self.assertEqual(moved[1], 'trash')
        self.assertEqual(web_file_browser.q_file_browser_trash(self.contract, {'root': 'local'})['items'][0]['id'], result['id'])
        global_bin = web_file_browser.q_file_browser_trash(self.contract, {})['items']
        self.assertEqual({(row['id'], row['kind'], row['library']) for row in global_bin},
                         {(result['id'], 'file', 'Library'), ('asset:3', 'catalog', 'Library')})
        self.assertTrue(write('restore', ids=[result['id']])[0]['ok'])
        self.assertEqual((self.folder / 'destination' / 'renamed.mp4').read_bytes(), b'not read')
        with self.contract.read_connection() as connection:
            restored = connection.execute('SELECT path,disposal FROM asset WHERE id=1').fetchone()
        self.assertEqual(tuple(restored), ('R:\\Media\\series\\destination\\renamed.mp4', None))
        self.assertEqual(web_file_browser.q_file_browser_trash(self.contract, {'root': 'local'}), {'items': []})

    def test_file_mutations_reject_conflicts_and_out_of_scope_paths(self):
        entry = {'name': 'movie.mp4', 'directory': False}
        request = {'root': 'local', 'relative': 'series', 'operation': 'rename', 'entries': [entry]}
        conflict = web_file_browser.w_file_browser(self.contract, {**request, 'name': 'unindexed.mp4'})['items'][0]
        self.assertFalse(conflict['ok'])
        self.assertEqual(conflict['message_code'], 'api.fileBrowser.targetExists')
        self.assertEqual((self.folder / 'movie.mp4').read_bytes(), b'not read')
        for name in ('../outside', 'C:alternate', '.peach-file-trash', 'NUL.txt'):
            with self.subTest(name=name), self.assertRaises(UserValueError):
                web_file_browser.w_file_browser(self.contract, {**request, 'name': name})
        with self.assertRaises(UserValueError):
            web_file_browser.w_file_browser(self.contract, {**request, 'operation': 'move', 'destination': '../outside'})

    def test_roots_are_returned_without_touching_any_mount(self):
        result = self.read()
        self.assertEqual([row['id'] for row in result['roots']], ['local', 'cloud'])
        self.assertEqual(result['roots'][0]['icon'], 'film')
        self.assertNotIn('ledger_root', result['roots'][0])
        self.reader.assert_not_called()

    def test_filesystem_anchor_is_not_offered_as_a_browsable_media_root(self):
        self.libraries[0]['roots'].append({'root_id': 'filesystem', 'root': 'M:\\', 'location': 'local'})
        with patch('peach.web_media_directory.translate_ledger_path', side_effect={
            'R:\\Media': self.media, 'A:\\Cloud': self.root / 'offline', 'M:\\': Path(self.root.anchor),
        }.__getitem__):
            self.assertEqual([row['id'] for row in self.read()['roots']], ['local', 'cloud'])
            with self.assertRaises(UserValueError):
                self.read(root='filesystem')
        self.reader.assert_not_called()

    @unittest.skipUnless(os.name == 'nt', 'Windows drive roots')
    def test_cloud_drive_root_lists_files_and_locates_a_catalog_asset(self):
        drive = Path('B:\\')
        system = Path('C:\\')
        cloud_file = drive / 'folder' / 'movie.mp4'
        self.libraries[0]['roots'].extend([
            {'root_id': '115-drive', 'root': str(drive), 'location': '115'},
            {'root_id': 'system-drive', 'root': str(system), 'location': 'mounted'},
        ])
        with self.contract.write_transaction() as conn:
            conn.execute("INSERT INTO asset(id,location,path,name,medium,duration,width,height) "
                         "VALUES(6,'115',?, 'movie', 'video', 60, 1280, 720)",
                         (str(cloud_file),))
        root_entry = SimpleNamespace(name='folder', is_dir=lambda **kwargs: True,
                                     stat=lambda **kwargs: SimpleNamespace(st_mtime=1700000000))
        file_entry = SimpleNamespace(name=cloud_file.name, is_dir=lambda **kwargs: False,
                                     is_file=lambda **kwargs: True,
                                     stat=lambda **kwargs: SimpleNamespace(st_size=8, st_mtime=1700000000))
        with patch('peach.web_media_directory.translate_ledger_path', side_effect={
            'R:\\Media': self.media, 'A:\\Cloud': self.root / 'offline', str(drive): drive, str(system): system,
        }.__getitem__), patch('peach.nas_directories.system_volume', return_value=system), \
                patch.object(Path, 'resolve', autospec=True, side_effect=lambda path, **kwargs: path) as resolve, \
                patch('peach.nas_directories.os.scandir') as scandir:
            self.assertEqual([row['id'] for row in self.read()['roots']], ['local', 'cloud', '115-drive'])
            self.reader.assert_not_called()
            scandir.return_value.__enter__.return_value = iter([root_entry])
            self.assertEqual(self.read(root='115-drive')['directories'], [
                {'name': 'folder', 'modified_at': 1700000000, 'created_at': None}])
            scandir.assert_called_once_with(drive)
            scandir.return_value.__enter__.return_value = iter([file_entry])
            result = self.read(asset='6')
            self.assertEqual((result['root'], result['relative'], result['focus_name']),
                             ('115-drive', 'folder', cloud_file.name))
            self.assertEqual(result['files'], [{'name': cloud_file.name, 'asset_id': 6, 'size': 8, 'modified_at': 1700000000,
                                               'created_at': None, 'duration': 60, 'width': 1280, 'height': 720}])
            scandir.assert_called_with(cloud_file.parent)

            scandir.reset_mock()
            resolve.side_effect = lambda path, **kwargs: system / 'outside' if path == cloud_file.parent else path
            with self.assertRaises(UserValueError):
                self.read(root='115-drive', relative='folder')
            scandir.assert_not_called()

    @unittest.skipUnless(os.name == 'nt', 'Windows drive roots')
    def test_cloud_drive_accepts_shared_roots_and_checks_unresolvable_paths(self):
        drive = Path('B:\\')
        share = Path('\\\\CloudDrive\\library\\')
        child = drive / 'folder'
        unrecognized_volume = OSError('Unrecognized volume')
        unrecognized_volume.winerror = 1005
        with patch('peach.nas_directories.system_volume', return_value=Path('C:\\')), \
                patch.object(Path, 'resolve', autospec=True) as resolve, \
                patch.object(Path, 'lstat', autospec=True) as lstat, patch('peach.nas_directories.os.scandir') as scandir:
            resolve.side_effect = lambda path, **kwargs: share.joinpath(*path.relative_to(drive).parts)
            page = nas_directories.list_directory(child, [str(drive)], allow_cloud_drive_root=True)
            self.assertEqual(page['parent'], str(share))
            scandir.assert_called_once_with(share / 'folder')
            lstat.assert_not_called()

            resolve.side_effect = unrecognized_volume
            lstat.return_value = SimpleNamespace(st_file_attributes=0)
            page = nas_directories.list_directory(child, [str(drive)], allow_cloud_drive_root=True)
            self.assertEqual(page['parent'], str(drive))
            lstat.assert_called_once_with(child)
            scandir.assert_called_with(child)

            scandir.reset_mock()
            lstat.return_value.st_file_attributes = FILE_ATTRIBUTE_REPARSE_POINT
            with self.assertRaises(ValueError):
                nas_directories.list_directory(child / 'nested', [str(drive)], allow_cloud_drive_root=True)
            scandir.assert_not_called()

    def test_listing_only_marks_current_source_and_directory_live_assets(self):
        with self.contract.write_transaction() as conn:
            conn.execute('UPDATE asset SET duration=72,width=1920,height=1080 WHERE id=1')
        before = self.path.read_bytes()
        result = self.read(root='local', relative='series')
        self.assertEqual(result['state'], 'ready')
        self.assertEqual({row['name']: row['asset_id'] for row in result['files']},
                         {'gone.mp4': None, 'movie.mp4': 1, 'unindexed.mp4': None})
        metadata = (self.folder / 'child').stat()
        self.assertEqual(result['directories'], [{'name': 'child', 'modified_at': metadata.st_mtime,
                                                   'created_at': getattr(metadata, 'st_birthtime', None)}])
        movie = next(row for row in result['files'] if row['asset_id'] == 1)
        self.assertEqual(movie['size'], 8)
        self.assertEqual((movie['duration'], movie['width'], movie['height']), (72, 1920, 1080))
        self.assertEqual(movie['modified_at'], (self.folder / 'movie.mp4').stat().st_mtime)
        self.assertEqual(self.path.read_bytes(), before)

    def test_asset_position_uses_server_record_instead_of_caller_path(self):
        result = self.read(asset='1', root='cloud', relative='outside')
        self.assertEqual((result['root'], result['relative'], result['focus_name']), ('local', 'series', 'movie.mp4'))
        self.assertEqual(self.reader.call_args.args[1], str(self.folder))
        self.assertEqual(json.loads(self.reader.call_args.kwargs['value'])['allowed'], [str(self.media)])

    def test_unmounted_asset_keeps_its_recorded_position_without_io(self):
        result = self.read(asset='5')
        self.assertEqual(result['state'], 'unmapped')
        self.assertEqual(result['last_path'], 'Z:\\Missing\\movie.mp4')
        self.reader.assert_not_called()

    def test_invalid_scope_and_page_are_refused_before_io(self):
        for args in [dict(root='unknown'), dict(root='local', relative='../elsewhere'),
                     dict(root='local', relative='/etc'), dict(root='local', relative='a\\b'),
                     dict(root='local', offset='-1'), dict(root='local', offset='2147483648'),
                     dict(root='local', offset='not-a-number'), dict(asset='invalid'), dict(asset='999')]:
            with self.subTest(args=args), self.assertRaises(UserValueError):
                self.read(**args)
        self.reader.assert_not_called()

    def test_unavailable_sources_return_distinct_recoverable_states(self):
        for error, state in [(PermissionError, 'denied'), (FileNotFoundError, 'missing'),
                             (TimeoutError, 'timeout'), (OSError, 'unreachable')]:
            with self.subTest(state=state):
                self.reader.side_effect = error('unavailable')
                result = self.read(root='cloud')
                self.assertEqual(result['state'], state)
                self.assertEqual(result['root'], 'cloud')
                self.assertEqual(result['files'], [])

    def test_nested_configured_root_is_used_for_asset_position(self):
        self.libraries[0]['roots'].append({'root_id': 'nested', 'root': 'R:\\Media\\series', 'location': 'local'})
        self.reader.side_effect = None
        self.reader.return_value = {'directories': [], 'files': [{'name': 'movie.mp4'}],
                                    'next_offset': None, 'offset': 0, 'read_only': True}
        result = self.read(asset='1')
        self.assertEqual((result['root'], result['relative']), ('nested', ''))
        self.assertEqual(result['files'][0]['asset_id'], 1)
