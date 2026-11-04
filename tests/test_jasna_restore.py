"""Jasna 去码：程序路径校验、成品命名、进度读取与子进程结算。"""
import os
import stat
import sys
import tempfile
import unittest
from pathlib import Path

from peach import jasna_restore as jasna
from peach.repository import LedgerDatabase
from support.ledger import fresh_ledger


class Handle:
    def __init__(self):
        self.calls = []

    def progress(self, **kwargs):
        self.calls.append(kwargs)


def fake_jasna(folder: Path, body: str) -> Path:
    """一个假的 `jasna`：Python 脚本，按测试需要打印进度、写文件或失败。"""
    path = folder / 'jasna'
    path.write_text(f'#!{sys.executable}\n{body}\n', encoding='utf-8')
    path.chmod(path.stat().st_mode | stat.S_IEXEC)
    return path


class NamingTests(unittest.TestCase):
    def test_output_keeps_the_code_first(self):
        self.assertEqual(jasna.output_name('ABP-327.mp4'), 'ABP-327-去码.mkv')
        self.assertTrue(jasna.is_restored('ABP-327-去码.mkv'))
        self.assertFalse(jasna.is_restored('ABP-327.mp4'))

    def test_restored_copy_carries_its_own_badge(self):
        from peach.catalog_rules import jav_edition_badges
        self.assertEqual(jav_edition_badges('ipx-458-C-去码.mkv', 'IPX-458'), ['中字', 'AI去码'])
        self.assertEqual(jav_edition_badges('ipx-458-C.mp4', 'IPX-458'), ['中字'])


class ConfigTests(unittest.TestCase):
    def test_only_an_existing_jasna_program_is_accepted(self):
        with tempfile.TemporaryDirectory() as folder:
            other = Path(folder) / 'calc.exe'
            other.write_bytes(b'')
            with self.assertRaisesRegex(ValueError, 'jasna.exe'):
                jasna.check_exe(str(other))
            with self.assertRaisesRegex(ValueError, '找不到'):
                jasna.check_exe(str(Path(folder) / 'jasna.exe'))

    def test_settings_round_trip_and_reject_unknown_models(self):
        with tempfile.TemporaryDirectory() as folder:
            exe = fake_jasna(Path(folder), 'pass')
            saved = jasna.save_config({'exe': str(exe), 'model': 'ltx', 'extra': '--max-clip-size 60'}, Path(folder))
            self.assertEqual(jasna.read_config(Path(folder)), saved)
            with self.assertRaisesRegex(ValueError, '模型'):
                jasna.save_config({'exe': str(exe), 'model': 'rm -rf'}, Path(folder))


class ProgressTests(unittest.TestCase):
    def test_last_percentage_in_the_log_is_the_progress(self):
        with tempfile.TemporaryDirectory() as folder:
            log = Path(folder) / 'run.log'
            log.write_bytes('Processing:  12%|#\rProcessing:  47.5%|###\r'.encode())
            self.assertEqual(jasna.progress_of(log), 47.5)
            log.write_bytes(b'loading models')
            self.assertIsNone(jasna.progress_of(log))


@unittest.skipIf(os.name == 'nt', '假程序用 shebang 启动')
class ExecuteTests(unittest.TestCase):
    def test_successful_run_reports_progress(self):
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder)
            exe = fake_jasna(root, 'import sys\nsys.stderr.write("50%\\r100%\\n")')
            handle, seen = Handle(), []
            jasna._execute([str(exe)], cwd=root, log=root / 'run.log', control=None, handle=handle,
                           report=seen.append, name='ABP-327')
            self.assertEqual(seen[-1], 100.0)

    def test_failed_run_carries_the_log_tail(self):
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder)
            exe = fake_jasna(root, 'import sys\nprint("CUDA out of memory")\nsys.exit(3)')
            with self.assertRaisesRegex(RuntimeError, 'CUDA out of memory'):
                jasna._execute([str(exe)], cwd=root, log=root / 'run.log', control=None, handle=Handle(),
                               report=lambda value: None, name='ABP-327')


class LabelTests(unittest.TestCase):
    def test_restored_copy_gets_the_original_title_with_a_label_once(self):
        with tempfile.TemporaryDirectory() as folder:
            database = LedgerDatabase(fresh_ledger(Path(folder)))
            with database.write_transaction() as connection:
                connection.execute("INSERT INTO asset(id,location,path,name,medium,catalog_title) VALUES"
                                   "(1,'local','E:\\a\\ABP-327.mp4','ABP-327.mp4','video','原标题'),"
                                   "(2,'local','E:\\a\\ABP-327-去码.mkv','ABP-327-去码.mkv','video','原标题')")
            contract = type('Contract', (), {'database': database})()
            self.assertTrue(jasna.label_restored(contract, 1, 2))
            self.assertFalse(jasna.label_restored(contract, 1, 2))
            with database.read_connection() as connection:
                titles = dict(connection.execute("SELECT id,catalog_title FROM asset").fetchall())
            self.assertEqual(titles, {1: '原标题', 2: '原标题（去码）'})


if __name__ == '__main__':
    unittest.main()
