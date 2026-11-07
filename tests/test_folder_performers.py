import sqlite3
import tempfile
import unittest
from pathlib import Path

from peach import folder_performers as fp
from peach.repository import LedgerDatabase
from support.ledger import fresh_ledger


class FolderPerformerTests(unittest.TestCase):
    def setUp(self):
        temporary = tempfile.TemporaryDirectory()
        self.addCleanup(temporary.cleanup)
        self.db_path = fresh_ledger(Path(temporary.name))
        self.database = LedgerDatabase(self.db_path)
        rows = [
            (1, r"D:\Downloads\欧美\Kayden_Kross\[Straight]TopGuns[2011].mkv", "video"),
            (2, r"D:\Downloads\欧美\Kayden_Kross\LiveChat\a.wmv", "video"),
            (3, r"D:\Downloads\欧美\Kayden_Kross\cover.jpg", "image"),
            (4, r"D:\Downloads\欧美\DorcelClub.2017.03-Collection\x.mp4", "video"),
            (5, r"D:\Downloads\欧美\loose.mp4", "video"),
            (6, r"D:\Downloads\日本\Kayden_Kross\y.mp4", "video"),
        ]
        connection = sqlite3.connect(self.db_path)
        connection.executemany(
            "INSERT INTO asset(id,location,path,name,medium,size) VALUES(?,?,?,?,?,1000)",
            [(i, "local", p, p.rsplit("\\", 1)[-1], m) for i, p, m in rows])
        connection.commit()
        connection.close()

    def tags(self, asset_id):
        connection = sqlite3.connect(self.db_path)
        try:
            return {row[0] for row in connection.execute(
                "SELECT tag FROM asset_tag WHERE asset_id=? AND source=?", (asset_id, fp.SOURCE))}
        finally:
            connection.close()

    def test_preview_lists_first_level_folders_with_suggested_names(self):
        result = fp.preview(self.database, "d:/downloads/欧美/")
        folders = {row["folder"]: row for row in result["folders"]}
        self.assertEqual(set(folders), {"Kayden_Kross", "DorcelClub.2017.03-Collection"})
        self.assertEqual(folders["Kayden_Kross"]["name"], "Kayden Kross")
        self.assertEqual(folders["Kayden_Kross"]["videos"], 2)
        self.assertTrue(folders["Kayden_Kross"]["selected"])
        self.assertFalse(folders["DorcelClub.2017.03-Collection"]["selected"])

    def test_apply_tags_every_video_in_the_folder_and_undo_takes_it_back(self):
        result = fp.apply(self.database, r"D:\Downloads\欧美", [{"folder": "Kayden_Kross", "name": "Kayden Kross"}])
        self.assertEqual(result, {"videos": 2, "performers": 1})
        self.assertEqual(self.tags(1), {"演员:Kayden Kross"})
        self.assertEqual(self.tags(2), {"演员:Kayden Kross"})
        self.assertEqual(self.tags(3) | self.tags(4) | self.tags(5) | self.tags(6), set())
        self.assertEqual(fp.preview(self.database, r"D:\Downloads\欧美")["folders"][1]["assigned"], 2)
        fp.undo(self.database, r"D:\Downloads\欧美")
        self.assertEqual(self.tags(1), set())

    def test_suggested_names_drop_separators_and_notes(self):
        self.assertEqual(fp.suggested_name("Lola Bellucci(Lola Bellucci's Fetish Ni"), "Lola Bellucci")
        self.assertEqual(fp.suggested_name("Riley.Reid"), "Riley Reid")
        self.assertFalse(fp.looks_like_name("DSDP-015"))
        self.assertTrue(fp.looks_like_name("明日花绮罗"))

    def test_relative_or_empty_paths_are_refused(self):
        with self.assertRaises(ValueError):
            fp.preview(self.database, "Downloads")
        with self.assertRaises(ValueError):
            fp.apply(self.database, r"D:\Downloads\欧美", [])


if __name__ == "__main__":
    unittest.main()
