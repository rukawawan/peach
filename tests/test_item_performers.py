"""详情页手动指定艺人：落到库里已有的那位，同名多位时报出候选，移除只断开这一部。"""
import unittest
from pathlib import Path
from tempfile import TemporaryDirectory

from peach import item_performers as ip
from peach.migrations import upgrade
from peach.web_state import WebContract

ROOT = Path(__file__).resolve().parents[1]


class ItemPerformerTests(unittest.TestCase):
    def setUp(self):
        temporary = TemporaryDirectory()
        self.addCleanup(temporary.cleanup)
        root = Path(temporary.name).resolve()
        path = root / 'ledger.db'
        upgrade(path, ROOT / 'migrations')
        self.contract = WebContract(path, candidate_root=root / 'generated',
                                    follow_state_root=root / 'state', snapshot_root=root / 'snapshots')
        with self.contract.write_transaction() as connection:
            connection.execute("INSERT INTO asset(id,location,path,name,medium) "
                               "VALUES(1,'local','D:\\\\a\\\\IPZ-536.mp4','IPZ-536.mp4','video')")
            yua = connection.execute("INSERT INTO entity(kind,canonical_name,normalized_name,created_at,updated_at) "
                                     "VALUES('performer','三上悠亜','三上悠亜','2026-01-01','2026-01-01')").lastrowid
            connection.execute("INSERT INTO entity_alias(entity_id,alias,normalized_alias,source) "
                               "VALUES(?,'三上悠亚','三上悠亚','user:alias')", (yua,))
            for name in ('Rin', 'RIN Mori'):
                connection.execute("INSERT INTO entity(kind,canonical_name,normalized_name,created_at,updated_at) "
                                   "VALUES('performer',?,?,'2026-01-01','2026-01-01')", (name, name.lower()))
            other = connection.execute("SELECT id FROM entity WHERE canonical_name='RIN Mori'").fetchone()[0]
            connection.execute("INSERT INTO entity_alias(entity_id,alias,normalized_alias,source) "
                               "VALUES(?,'Kana','kana','tpdb')", (other,))
            connection.execute("INSERT INTO entity(kind,canonical_name,normalized_name,created_at,updated_at) "
                               "VALUES('performer','KANA','kana','2026-01-01','2026-01-01')")

    def performers(self):
        with self.contract.read_connection() as connection:
            return sorted(row[0] for row in connection.execute(
                "SELECT e.canonical_name FROM asset_entity ae JOIN entity e ON e.id=ae.entity_id "
                "WHERE ae.asset_id=1 AND e.kind='performer'"))

    def test_alias_lands_on_existing_performer_and_remove_unlinks_only_this_item(self):
        self.assertEqual(ip.assign(self.contract, 1, 'add', ' 三上悠亚 ')['name'], '三上悠亜')
        self.assertEqual(self.performers(), ['三上悠亜'])
        self.assertTrue(ip.assign(self.contract, 1, 'remove', '三上悠亜')['ok'])
        self.assertEqual(self.performers(), [])
        with self.contract.read_connection() as connection:
            self.assertTrue(connection.execute("SELECT 1 FROM entity WHERE canonical_name='三上悠亜'").fetchone())

    def test_exact_name_wins_and_unknown_name_creates_performer(self):
        self.assertEqual(ip.assign(self.contract, 1, 'add', 'kana')['name'], 'KANA')
        self.assertEqual(ip.assign(self.contract, 1, 'add', 'New Person')['name'], 'New Person')
        self.assertEqual(self.performers(), ['KANA', 'New Person'])

    def test_bad_input_is_rejected(self):
        with self.assertRaises(ValueError):
            ip.assign(self.contract, 1, 'add', '')
        with self.assertRaises(ValueError):
            ip.assign(self.contract, 99, 'add', 'Rin')
