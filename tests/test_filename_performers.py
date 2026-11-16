"""按文件名认艺人：`艺人名 - 片名` 开头写着库里已有艺人的视频关联上，其余不碰。"""
import unittest
from pathlib import Path
from tempfile import TemporaryDirectory

from peach import filename_performers as fp
from peach.entities import upsert_asset_entity
from peach.migrations import upgrade
from peach.web_state import WebContract

ROOT = Path(__file__).resolve().parents[1]


class FilenamePerformerTests(unittest.TestCase):
    def setUp(self):
        temporary = TemporaryDirectory()
        self.addCleanup(temporary.cleanup)
        root = Path(temporary.name).resolve()
        path = root / 'ledger.db'
        upgrade(path, ROOT / 'migrations')
        self.contract = WebContract(path, candidate_root=root / 'generated',
                                    follow_state_root=root / 'state', snapshot_root=root / 'snapshots')
        names = ['scraped.mp4', 'Tru Kait - Milf Blonde and Teen Brunette.mp4', 'tru kait, Nobody Known - B.mkv',
                 'Unknown Person - C.mp4', 'Julia - D.mp4', 'SSIS-001 - E.mp4']
        with self.contract.write_transaction() as connection:
            for index, name in enumerate(names, 1):
                connection.execute("INSERT INTO asset(id,location,path,name,medium) VALUES(?,'local',?,?,'video')",
                                   (index, 'D:\\Downloads\\' + name, name))
            upsert_asset_entity(connection, kind='performer', name='Tru Kait', asset_id=1,
                                role='performer', source='tpdb', confidence=0.9)
            connection.execute("INSERT INTO entity(kind,canonical_name,normalized_name,created_at,updated_at) "
                               "VALUES('performer','JULIA','julia','2026-01-01','2026-01-01')")
            other = connection.execute("INSERT INTO entity(kind,canonical_name,normalized_name,created_at,updated_at) "
                                       "VALUES('performer','Julia Ann','julia ann','2026-01-01','2026-01-01')").lastrowid
            connection.execute("INSERT INTO entity_alias(entity_id,alias,normalized_alias,source) "
                               "VALUES(?,'Julia','julia','tpdb')", (other,))

    def performers(self):
        with self.contract.read_connection() as connection:
            return sorted((row[0], row[1]) for row in connection.execute(
                "SELECT ae.asset_id, e.canonical_name FROM asset_entity ae JOIN entity e ON e.id=ae.entity_id "
                "WHERE e.kind='performer' AND ae.source=?", (fp.SOURCE,)))

    def test_known_performers_written_before_the_dash_are_linked_and_can_be_undone(self):
        self.assertEqual(fp.preview(self.contract)['count'], 2)
        self.assertEqual(fp.link_all(self.contract), {'linked': 2})
        self.assertEqual(self.performers(), [(2, 'Tru Kait'), (3, 'Tru Kait')])
        self.assertEqual(fp.preview(self.contract)['count'], 0)
        fp.undo(self.contract)
        self.assertEqual(self.performers(), [])

    def test_new_files_are_linked_during_the_scan_hook(self):
        with self.contract.write_transaction() as connection:
            self.assertEqual(fp.link_new(connection, [2, 4, 5, 6]), 1)
        self.assertEqual(self.performers(), [(2, 'Tru Kait')])

    def test_names_need_a_spaced_dash_and_no_code_or_date(self):
        self.assertEqual(fp.names_in('[Brazzers] Mia Malkova & Kayden Kross - Title.mkv'), ['Mia Malkova', 'Kayden Kross'])
        self.assertEqual(fp.names_in('Riley Reid, Lana Rhoades - X.mp4'), ['Riley Reid', 'Lana Rhoades'])
        self.assertEqual(fp.names_in('SSIS-001 - x.mp4'), [])
        self.assertEqual(fp.names_in('2019-05-01 - x.mp4'), [])
        self.assertEqual(fp.names_in('Riley-Reid.mp4'), [])


if __name__ == '__main__':
    unittest.main()
