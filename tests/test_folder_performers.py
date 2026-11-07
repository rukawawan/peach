"""按文件夹归艺人：父目录下的艺人文件夹一次设成「人物」目录规则，新文件沿用。"""
import unittest
from pathlib import Path
from tempfile import TemporaryDirectory
from types import SimpleNamespace
from unittest.mock import patch

from peach import folder_performers as fp
from peach import folder_rules
from peach.migrations import upgrade
from peach.web_state import WebContract

ROOT = Path(__file__).resolve().parents[1]
PARENT = 'D:\\Downloads\\欧美'


class FolderPerformerTests(unittest.TestCase):
    def setUp(self):
        temporary = TemporaryDirectory()
        self.addCleanup(temporary.cleanup)
        self.root = Path(temporary.name).resolve()
        self.path = self.root / 'ledger.db'
        upgrade(self.path, ROOT / 'migrations')
        self.contract = WebContract(self.path, candidate_root=self.root / 'generated',
                                    follow_state_root=self.root / 'state', snapshot_root=self.root / 'snapshots')
        config = SimpleNamespace(locations={'local': ('D:\\Downloads',)}, library_names={}, library_icons={})
        self.addCleanup(patch.stopall)
        patch('peach.web_folders.settings_file.active', return_value=config).start()
        rows = [
            PARENT + '\\Kayden_Kross\\[Straight]TopGuns[2011].mkv',
            PARENT + '\\Kayden_Kross\\LiveChat\\a.wmv',
            PARENT + '\\DorcelClub.2017.03-Collection\\x.mp4',
            PARENT + '\\loose.mp4',
            'D:\\Downloads\\日本\\Kayden_Kross\\y.mp4',
        ]
        with self.contract.write_transaction() as connection:
            connection.executemany("INSERT INTO asset(location,path,name,medium) VALUES('local',?,?,'video')",
                                   [(path, path.rsplit('\\', 1)[1]) for path in rows])

    def performers(self):
        with self.contract.read_connection() as connection:
            return sorted((row[0].rsplit('\\', 1)[1], row[1]) for row in connection.execute(
                "SELECT a.path, e.canonical_name FROM asset_entity ae JOIN asset a ON a.id=ae.asset_id "
                "JOIN entity e ON e.id=ae.entity_id WHERE e.kind='performer'"))

    def test_preview_lists_first_level_folders_with_suggested_names(self):
        folders = {row['folder']: row for row in fp.preview(self.contract, 'd:/downloads/欧美/')['folders']}
        self.assertEqual(set(folders), {'Kayden_Kross', 'DorcelClub.2017.03-Collection'})
        self.assertEqual((folders['Kayden_Kross']['name'], folders['Kayden_Kross']['videos']), ('Kayden Kross', 2))
        self.assertTrue(folders['Kayden_Kross']['selected'])
        self.assertFalse(folders['DorcelClub.2017.03-Collection']['selected'])

    def test_apply_sets_a_performer_rule_that_new_files_inherit_and_undo_removes_it(self):
        result = fp.apply(self.contract, PARENT, [{'folder': 'Kayden_Kross', 'name': 'Kayden Kross'}])
        self.assertEqual((result['videos'], result['performers'], result['skipped']), (2, 1, []))
        self.assertEqual(self.performers(), [('[Straight]TopGuns[2011].mkv', 'Kayden Kross'),
                                             ('a.wmv', 'Kayden Kross')])
        held = fp.preview(self.contract, PARENT)['folders']
        self.assertEqual([row['assigned'] for row in held if row['folder'] == 'Kayden_Kross'], ['Kayden Kross'])

        new_path = PARENT + '\\Kayden_Kross\\new.mp4'
        with self.contract.write_transaction() as connection:
            new_id = connection.execute("INSERT INTO asset(location,path,name,medium) VALUES('local',?,'new.mp4','video')",
                                        (new_path,)).lastrowid
            folder_rules.apply_new(connection, [new_id])
        self.assertIn(('new.mp4', 'Kayden Kross'), self.performers())

        fp.undo(self.contract, PARENT)
        self.assertEqual(self.performers(), [])

    def test_a_name_written_differently_lands_on_the_existing_performer(self):
        from peach.entities import upsert_asset_entity
        with self.contract.write_transaction() as connection:
            upsert_asset_entity(connection, kind='performer', name='Mia Malkova', asset_id=5,
                                role='performer', source='tpdb', confidence=0.9)
        result = fp.apply(self.contract, PARENT, [{'folder': 'Kayden_Kross', 'name': 'mia MALKOVA'}])
        self.assertEqual(result['skipped'], [])
        self.assertIn(('a.wmv', 'Mia Malkova'), self.performers())

    def test_same_named_performers_pick_the_one_already_in_the_folder_or_ask(self):
        from peach.entities import upsert_asset_entity
        with self.contract.write_transaction() as connection:
            ids = [row[0] for row in connection.execute("SELECT id FROM asset ORDER BY id")]
            connection.execute("INSERT INTO entity(kind,canonical_name,normalized_name,created_at,updated_at) "
                               "VALUES('performer','JULIA','julia','2026-01-01','2026-01-01')")
            upsert_asset_entity(connection, kind='performer', name='Julia Ann', asset_id=ids[4],
                                role='performer', source='tpdb', confidence=0.9)
            julia_ann = connection.execute("SELECT id FROM entity WHERE canonical_name='Julia Ann'").fetchone()[0]
            connection.execute("INSERT INTO entity_alias(entity_id,alias,normalized_alias,source) "
                               "VALUES(?,?,?,?)", (julia_ann, 'Julia', 'julia', 'tpdb'))
        result = fp.apply(self.contract, PARENT, [{'folder': 'Kayden_Kross', 'name': 'Julia'}])
        self.assertEqual(len(result['skipped']), 1)
        self.assertIn('2 位同名艺人', result['skipped'][0])
        with self.contract.write_transaction() as connection:
            upsert_asset_entity(connection, kind='performer', name='Julia Ann', asset_id=ids[0],
                                role='performer', source='tpdb', confidence=0.9)
        result = fp.apply(self.contract, PARENT, [{'folder': 'Kayden_Kross', 'name': 'Julia'}])
        self.assertEqual(result['skipped'], [])
        self.assertIn(('a.wmv', 'Julia Ann'), self.performers())

    def test_suggested_names_drop_separators_and_notes(self):
        self.assertEqual(fp.suggested_name("Lola Bellucci(Lola Bellucci's Fetish Ni"), 'Lola Bellucci')
        self.assertEqual(fp.suggested_name('Riley.Reid'), 'Riley Reid')
        self.assertFalse(fp.looks_like_name('DSDP-015'))
        self.assertTrue(fp.looks_like_name('明日花绮罗'))

    def test_relative_or_empty_paths_are_refused(self):
        with self.assertRaises(ValueError):
            fp.preview(self.contract, 'Downloads')
        with self.assertRaises(ValueError):
            fp.apply(self.contract, PARENT, [])


if __name__ == '__main__':
    unittest.main()
