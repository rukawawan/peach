import io
import json
import sqlite3
import subprocess
import tempfile
import unittest
from contextlib import redirect_stderr
from pathlib import Path
from unittest import mock

from scripts import check_public_text
from scripts.check_public_text import Library, problems, publish_text


def ledger(path: Path) -> Path:
    """只有判据读到的那几列；内容全是虚构的。"""
    connection = sqlite3.connect(path)
    connection.executescript("""
        CREATE TABLE asset(code TEXT, catalog_title TEXT, original_title TEXT, name TEXT);
        CREATE TABLE feed_item(code TEXT);
        CREATE TABLE entity(kind TEXT, canonical_name TEXT);
        CREATE TABLE follow_source(label TEXT);
        INSERT INTO asset VALUES ('ZZQ-101', '架空作品のための長い題名です', '', 'ZZQ-101.mp4'),
                                 ('zzq102', '', '', ''), ('ZZQ-103', '', '', ''), ('', '', '', '');
        INSERT INTO feed_item VALUES ('YYW-007');
        INSERT INTO entity VALUES ('performer', '虚构女优甲'), ('performer', '虚构女优乙'), ('tag', '虚构标签名'),
                                  ('creator', 'Fictional Maker');
        INSERT INTO follow_source VALUES ('fictional_account'), (NULL);
    """)
    connection.commit()
    connection.close()
    return path


class LibraryTests(unittest.TestCase):
    def setUp(self):
        directory = tempfile.TemporaryDirectory()
        self.addCleanup(directory.cleanup)
        self.library = Library.load(ledger(Path(directory.name) / "ledger.db"))

    def test_the_ledger_is_read_into_codes_names_and_title_fragments(self):
        self.assertEqual(self.library.codes, {"ZZQ-101", "ZZQ-102", "ZZQ-103", "YYW-007"})
        self.assertEqual(self.library.names, {"虚构女优甲", "虚构女优乙", "Fictional Maker", "fictional_account"})
        self.assertIn("架空作品のため", self.library.grams)

    def test_a_list_of_owned_codes_names_or_titles_is_a_problem(self):
        cases = {"ZZQ-101、zzq-102、ZZQ103 都要人判": "番号 3 个",
                 "虚构女优甲 对 虚构女优乙": "人物 2 个",
                 "系列名：架空作品のための長い題名 对 題名です長い架空作品のため": "标题片段 2 个"}
        for text, expected in cases.items():
            with self.subTest(text=text):
                self.assertTrue(problems(text, self.library)[0].startswith(expected))

    def test_the_example_a_fix_needs_and_unrelated_text_pass(self):
        for text in ("只修 ZZQ-101 的前缀，YYW-007 是反例。", "虚构女优甲 的别名修好了。",
                     "ABC-123、DEF-456、GHI-789 都不在账本里。", "Fictional 与 Maker 分开写不算。"):
            with self.subTest(text=text):
                self.assertEqual(problems(text, self.library), [])

    def test_a_stated_reason_or_a_machine_without_a_ledger_passes(self):
        listed = "ZZQ-101、ZZQ-102、ZZQ-103"
        self.assertEqual(problems(listed + "\n<!-- peach-public-text: 三个番号就是这次修的前缀 -->", self.library), [])
        self.assertNotEqual(problems(listed + "\npeach-public-text:", self.library), [])
        self.assertEqual(problems(listed, None), [])


class PublishCommandTests(unittest.TestCase):
    def setUp(self):
        directory = tempfile.TemporaryDirectory()
        self.addCleanup(directory.cleanup)
        self.cwd = Path(directory.name)
        (self.cwd / "body.md").write_text("正文文件里的内容", encoding="utf-8")

    def test_gh_commands_that_publish_carry_their_text_and_body_files(self):
        for command in ("gh pr create --title t --body-file body.md", "gh pr edit 3 -F body.md",
                        "cd x && gh issue comment 5 --body-file=body.md",
                        f"gh api -X PATCH repos/o/r/issues/comments/9 -F body=@{self.cwd / 'body.md'}"):
            with self.subTest(command=command):
                text = publish_text(command, self.cwd)
                self.assertIn(command, text)
                self.assertIn("正文文件里的内容", text)
        heredoc = "gh pr create --body \"$(cat <<'EOF'\n正文直接写在命令里\nEOF\n)\""
        self.assertIn("正文直接写在命令里", publish_text(heredoc, self.cwd))

    def test_commands_that_only_read_are_not_publishing(self):
        for command in ("gh pr view 3 --json body", "gh pr list", "gh api repos/o/r/pulls/3", "echo hello"):
            with self.subTest(command=command):
                self.assertIsNone(publish_text(command, self.cwd))

    def test_the_hook_blocks_with_a_reason_and_lets_everything_else_through(self):
        library = Library(codes={"ZZQ-101", "ZZQ-102", "ZZQ-103"})
        listed = {"cwd": str(self.cwd), "tool_input": {"command": "gh pr create --body 'ZZQ-101 ZZQ-102 ZZQ-103'"}}
        with mock.patch.object(check_public_text, "load_library", return_value=library) as load:
            error = io.StringIO()
            with redirect_stderr(error):
                self.assertEqual(check_public_text.hook(listed), 2)
            self.assertIn("番号 3 个", error.getvalue())
            self.assertIn("peach-public-text", error.getvalue())
            self.assertEqual(check_public_text.hook({"tool_input": {"command": "gh pr create --body 'ZZQ-101'"}}), 0)
            load.reset_mock()
            self.assertEqual(check_public_text.hook({"tool_input": {"command": "git status"}}), 0)
            load.assert_not_called()

    def test_the_hook_reads_a_missing_cwd_as_this_checkout(self):
        payload = {"cwd": "/no/such/place", "tool_input": {"command": "gh pr create --body x"}}
        with mock.patch.object(check_public_text, "load_library", return_value=None) as load:
            self.assertEqual(check_public_text.hook(payload), 0)
        load.assert_called_once_with(check_public_text.ROOT)

    def test_the_configured_claude_hook_runs_as_written(self):
        """配置里的命令原样跑一遍：PATH 上没有 uv 就是测试红，不是钩子静默；`--no-project` 不建 venv。"""
        settings = json.loads((check_public_text.ROOT / ".claude" / "settings.json").read_text(encoding="utf-8"))
        [matcher] = settings["hooks"]["PreToolUse"]
        self.assertEqual(matcher["matcher"], "Bash|PowerShell")
        [hook] = matcher["hooks"]
        argv = [hook["command"], *(arg.replace("${CLAUDE_PROJECT_DIR}", str(check_public_text.ROOT))
                                   for arg in hook["args"])]
        venv = (self.cwd / ".venv").exists()
        result = subprocess.run(argv, input=json.dumps({"cwd": str(self.cwd), "tool_input": {"command": "git status"}}),
                                capture_output=True, text=True, encoding="utf-8", cwd=self.cwd, timeout=120)
        self.assertEqual((result.returncode, result.stderr), (0, ""))
        self.assertEqual((self.cwd / ".venv").exists(), venv)

    def test_unreadable_hook_input_never_blocks(self):
        with mock.patch("sys.stdin", io.StringIO("not json")):
            self.assertEqual(check_public_text.main(["--hook-event"]), 0)
        with mock.patch("sys.stdin", io.StringIO(json.dumps([1]))):
            self.assertEqual(check_public_text.main(["--hook-event"]), 0)


if __name__ == "__main__":
    unittest.main()
