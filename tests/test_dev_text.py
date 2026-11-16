"""开发工具的文字（`scripts/locales/<语言>/dev.json`，ADR-0159 第三条）：中英两份对得上，脚本要的键都在。"""
import ast
import json
import re
import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))
import check_backend_copy as checker  # noqa: E402

LOCALES = ROOT / "scripts" / "locales"
PLACEHOLDER = re.compile(r"\{\{\s*([A-Za-z_][\w-]*)\s*\}\}")
#: 汉字、假名与全角标点：英文里出现时只能是照抄的数据（站点原文栏名、判词、示例名）。
CJK = re.compile(r"[　-〿぀-ヿ㐀-鿿＀-￯]+")
#: 把第一个参数当开发工具文字键的调用：`t` / `dev` 渲染，`dev_log` 与各脚本的 `log` 同键写日志。
KEYED_CALLS = {"t", "dev", "dev_log", "log"}
KEY_SHAPE = re.compile(r"^[a-z][a-z0-9_]*(\.[A-Za-z][A-Za-z0-9]*)+$")


def flatten(tree: dict, prefix: str = "") -> dict[str, str]:
    flat = {}
    for key, value in tree.items():
        flat.update(flatten(value, f"{prefix}{key}.") if isinstance(value, dict) else {prefix + key: value})
    return flat


def texts(language: str) -> dict[str, str]:
    return flatten(json.loads((LOCALES / language / "dev.json").read_text(encoding="utf-8")))


def requested_keys(source: str) -> set[str]:
    """脚本里按字面写出的文字键，条件表达式的两支都算；f-string 拼出来的键不在其列。"""
    found = set()
    for node in ast.walk(ast.parse(source)):
        if not (isinstance(node, ast.Call) and node.args):
            continue
        func = node.func
        name = func.id if isinstance(func, ast.Name) else func.attr if isinstance(func, ast.Attribute) else ""
        if name not in KEYED_CALLS:
            continue
        first = node.args[0]
        for value in (first.body, first.orelse) if isinstance(first, ast.IfExp) else (first,):
            if isinstance(value, ast.Constant) and isinstance(value.value, str) and KEY_SHAPE.match(value.value):
                found.add(value.value)
    return found


class DevTextTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.zh, cls.en = texts("zh-CN"), texts("en")

    def test_both_languages_have_the_same_keys_and_placeholders(self):
        self.assertEqual(sorted(self.zh.keys() ^ self.en.keys()), [])
        mismatched = [key for key in self.zh
                      if set(PLACEHOLDER.findall(self.zh[key])) != set(PLACEHOLDER.findall(self.en[key]))]
        self.assertEqual(mismatched, [])

    def test_english_text_carries_chinese_only_as_quoted_data(self):
        """英文里的汉字与假名只能是中文那一句里也有的原文（站点栏名、判词、示例名），整句没译的不算。"""
        untranslated = [key for key, english in self.en.items()
                        if CJK.search(english) and (english == self.zh[key]
                                                    or any(run not in self.zh[key] for run in CJK.findall(english)))]
        self.assertEqual(untranslated, [])

    def test_every_key_a_script_asks_for_exists(self):
        scripts = {path.stem: path for path in (ROOT / "scripts").glob("*.py")}
        namespaces = {key.split(".", 1)[0] for key in self.zh}
        missing = []
        for stem, path in sorted(scripts.items()):
            for key in sorted(requested_keys(path.read_text(encoding="utf-8"))):
                if key.split(".", 1)[0] in namespaces | {stem, "common"} and key not in self.zh:
                    missing.append(f"{path.name}: {key}")
        self.assertEqual(missing, [])

    def test_keys_are_found_in_calls_and_both_branches_of_a_choice(self):
        source = "\n".join([
            't("sample.plain", count=1)',
            'log("sample.logged" if direct else "sample.other")',
            'print("sample.notAKey")',
            't(f"sample.{name}")',
            'dev_log("sample with spaces")',
        ])
        self.assertEqual(requested_keys(source), {"sample.plain", "sample.logged", "sample.other"})

    def test_the_legacy_value_tables_are_data_only(self):
        """旧版中文取值的对照整份不计数，所以里面只能有常量，混进输出文字或逻辑就拦不住了。"""
        self.assertIn("legacy_values.py", checker.DEV_CONTENT_FILES)
        tree = ast.parse((ROOT / "scripts" / "legacy_values.py").read_text(encoding="utf-8"))
        statements = {type(node).__name__ for node in tree.body[1:]}
        self.assertLessEqual(statements, {"ImportFrom", "Assign"})

    def test_no_script_has_more_chinese_strings_than_its_baseline(self):
        baseline = json.loads(checker.DEV_BASELINE.read_text(encoding="utf-8"))
        self.assertEqual(checker.raised(checker.scan_scripts(), baseline), {},
                         "开发工具的输出写进 scripts/locales/<语言>/dev.json，中英两份同一 PR 写，日志用英文；"
                         "抽走后跑 python scripts/check_backend_copy.py --write 收紧基线")


if __name__ == "__main__":
    unittest.main()
