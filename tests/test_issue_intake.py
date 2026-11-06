"""外部 issue 模板检查的判定；GitHub 写操作在工作流里，这里只验证脚本给出的结论。"""
from __future__ import annotations

import io
import json
import sys
import tempfile
import unittest
from contextlib import redirect_stdout
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))
import issue_intake  # noqa: E402

JARGON_BODY = "## 目标\n\n导入资料，不做真实账本写入。\n\n## 授权边界\n\n测试使用合成样本。\n"
FEATURE_BODY = "## 使用场景 / Use case\n\n想按女优查看全部作品。\n\n## 期望的行为 / Desired behavior\n\n列出作品。\n"
BUG_BODY = "### 问题描述\n\n闪退\n\n### Environment\n\nWindows 11\n"


def event(action="opened", body=JARGON_BODY, **issue):
    return {"action": action, "issue": {"body": body, "author_association": "NONE",
                                        "user": {"type": "User"}, "type": None, "state": "open",
                                        "labels": [], **issue}}


class IssueIntakeTests(unittest.TestCase):
    def test_templates_supply_issue_type_and_bilingual_section_names(self):
        templates = dict(issue_intake.load_templates())
        self.assertIn(("问题描述", "what happened"), templates["Bug"])
        self.assertIn(("使用场景", "use case"), templates["Feature"])
        self.assertIn(("补充", "additional context"), templates["Feature"])

    def test_command_line_issue_that_follows_a_template_gets_its_type(self):
        self.assertEqual(issue_intake.verdict(event(body=FEATURE_BODY + "\n不写入账本。\n")), "type Feature")
        self.assertEqual(issue_intake.verdict(event(body=BUG_BODY)), "type Bug")
        self.assertEqual(issue_intake.verdict(event("edited", BUG_BODY)), "type Bug")

    def test_untyped_new_issue_without_template_sections_is_closed(self):
        for body in (JARGON_BODY, "希望垃圾文件可以批量删除", ""):
            with self.subTest(body=body[:12]):
                self.assertEqual(issue_intake.verdict(event(body=body)), "close")
        self.assertEqual(issue_intake.verdict(event("edited")), "keep")

    def test_web_form_issues_keep_their_text_even_without_sections(self):
        for payload in (event(type={"name": "Feature"}),
                        event(body=FEATURE_BODY, type={"name": "Feature"}),
                        event(body="希望垃圾文件可以批量删除", type={"name": "Feature"})):
            with self.subTest(body=payload["issue"]["body"][:12]):
                self.assertEqual(issue_intake.verdict(payload), "keep")

    def test_maintainers_bots_and_pull_requests_are_exempt(self):
        for issue in ({"author_association": "MEMBER"}, {"author_association": "OWNER"},
                      {"author_association": "COLLABORATOR"}, {"user": {"type": "Bot"}},
                      {"pull_request": {"url": "x"}}):
            with self.subTest(issue=issue):
                self.assertEqual(issue_intake.verdict(event(**issue)), "keep")

    def test_closed_issue_reopens_with_its_type_once_the_sections_are_filled_in(self):
        closed = {"state": "closed", "labels": [{"name": issue_intake.LABEL}]}
        self.assertEqual(issue_intake.verdict(event("edited", FEATURE_BODY, **closed)), "reopen Feature")
        self.assertEqual(issue_intake.verdict(event("edited", JARGON_BODY, **closed)), "keep")
        self.assertEqual(issue_intake.verdict(event("edited", FEATURE_BODY, state="closed")), "keep")

    def test_cli_reads_the_event_file_and_prints_the_notice(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "event.json"
            path.write_text(json.dumps(event(), ensure_ascii=False), encoding="utf-8")
            out = io.StringIO()
            with redirect_stdout(out):
                self.assertEqual(issue_intake.main(["--event", str(path)]), 0)
            self.assertEqual(out.getvalue().strip(), "close")
        out = io.StringIO()
        with redirect_stdout(out):
            issue_intake.main(["--notice"])
        self.assertIn("issues/new/choose", out.getvalue())
        self.assertIn("This issue was closed automatically", out.getvalue())


if __name__ == "__main__":
    unittest.main()
