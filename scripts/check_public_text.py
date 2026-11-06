"""要公开的文字发出去之前，对照本机账本找成串列出的馆藏细节。

PR、issue、评论与提交说明都公开在 GitHub 上，编辑后旧版仍留在编辑历史里。问题本身需要的
一两个番号、前缀或标签照常写；把账本里的作品番号、人物名、标题片段成串列出来就拦下。
判据只读本机账本（SQLite `mode=ro`），仓库里不带任何馆藏数据；没有账本的机器（CI、
其他贡献者）一律放行。确有必要多列时，在正文里写一行 `peach-public-text: <理由>` 放行。

用法：
    python scripts/check_public_text.py FILE...      # 检查文件，`-` 读 stdin
    python scripts/check_public_text.py --hook-event # Claude PreToolUse 钩子：拦 gh 发布命令
"""
from __future__ import annotations

import argparse
import json
import re
import sqlite3
import sys
from dataclasses import dataclass, field
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CODE = re.compile(r"(?<![A-Za-z0-9])([A-Za-z]{2,7})-?(\d{2,6})(?![0-9])")
CJK = re.compile(r"[぀-ヿ㐀-鿿ｦ-ﾟ]{2,}")
#: 标题片段按这么长的连续假名、汉字比对；短了会撞上普通用语。
GRAM = 7
#: 一段文字里达到这些数目才算「成串」；问题本身需要的一两个例子不拦。
LIMITS = {"番号": 3, "人物": 2, "标题片段": 2}
WAIVER = re.compile(r"peach-public-text:\s*\S")
#: 会把文字发到 GitHub 的 gh 子命令。
PUBLISH = re.compile(r"\bgh\s+(?:(?:pr|issue)\s+(?:create|edit|comment)\b|api\b[^\n]*\bcomments\b)")
BODY_FILE = re.compile(r"""(?:--body-file|-F)[=\s]+(?:body=@)?(?P<path>"[^"]+"|'[^']+'|[^\s"';|&]+)""")


def code_key(prefix: str, digits: str) -> str:
    return f"{prefix.upper()}-{int(digits):03d}"


@dataclass
class Library:
    """账本里能认出馆藏的几样东西；只读载入，不写账本。"""
    codes: set[str] = field(default_factory=set)
    names: set[str] = field(default_factory=set)
    grams: set[str] = field(default_factory=set)

    @classmethod
    def load(cls, ledger: Path) -> "Library":
        library = cls()
        connection = sqlite3.connect(f"file:{ledger.as_posix()}?mode=ro", uri=True)
        try:
            rows = connection.execute("SELECT code FROM asset WHERE code<>'' UNION SELECT code FROM feed_item WHERE code<>''")
            library.codes = {code_key(*match.groups()) for (code,) in rows
                             for match in [CODE.fullmatch(code.strip())] if match}
            names = connection.execute(
                "SELECT canonical_name FROM entity WHERE kind IN ('performer','creator')"
                " UNION SELECT label FROM follow_source WHERE label IS NOT NULL")
            library.names = {name for (name,) in names if name and len(name) >= 3}
            for row in connection.execute("SELECT catalog_title, original_title, name FROM asset"):
                for text in row:
                    for run in CJK.findall(text or ""):
                        library.grams.update(run[i:i + GRAM] for i in range(len(run) - GRAM + 1))
        finally:
            connection.close()
        return library

    def findings(self, text: str) -> dict[str, list[str]]:
        found: dict[str, set[str]] = {"番号": set(), "人物": set(), "标题片段": set()}
        for match in CODE.finditer(text):
            if code_key(*match.groups()) in self.codes:
                found["番号"].add(match.group(0).upper())
        for name in self.names:
            if name.isascii():
                if len(name) >= 5 and re.search(rf"(?<![\w-]){re.escape(name)}(?![\w-])", text):
                    found["人物"].add(name)
            elif name in text:
                found["人物"].add(name)
        for run in CJK.findall(text):
            if any(run[i:i + GRAM] in self.grams for i in range(len(run) - GRAM + 1)):
                found["标题片段"].add(run)
        return {kind: sorted(values) for kind, values in found.items() if values}


def problems(text: str, library: Library | None) -> list[str]:
    """达到「成串」的那几类，各一句；没有账本或写了放行理由时为空。"""
    if library is None or WAIVER.search(text):
        return []
    found = library.findings(text)
    return [f"{kind} {len(values)} 个：" + "、".join(values[:8]) + ("……" if len(values) > 8 else "")
            for kind, values in found.items() if len(values) >= LIMITS[kind]]


def ledger_for(project: Path) -> Path | None:
    """这个检出所用 Peach 数据目录里的账本；找不到数据目录或账本时返回 None。"""
    sys.path.insert(0, str(ROOT / "src"))
    try:
        from peach.settings_file import discover_data_root
        root, found = discover_data_root(project)
    except Exception:  # noqa: BLE001 - 认不出数据目录就当这台机器没有账本
        return None
    ledger = root / "database" / "ledger.db"
    return ledger if found and ledger.is_file() else None


def load_library(project: Path) -> Library | None:
    ledger = ledger_for(project)
    return Library.load(ledger) if ledger else None


def publish_text(command: str, cwd: Path) -> str | None:
    """gh 发布命令要发出去的全部文字：命令本身（含 --title、--body 与 heredoc）加上引用的正文文件。"""
    if not PUBLISH.search(command):
        return None
    parts = [command]
    for match in BODY_FILE.finditer(command):
        raw = match.group("path").strip("\"'")
        if raw == "-":
            continue
        path = Path(raw) if Path(raw).is_absolute() else cwd / raw
        try:
            parts.append(path.read_text(encoding="utf-8"))
        except (OSError, UnicodeError):
            continue
    return "\n".join(parts)


def hook(payload: dict) -> int:
    """PreToolUse：gh 要发的文字成串列了馆藏就退出码 2，stderr 交给模型改。"""
    command = str((payload.get("tool_input") or {}).get("command") or "")
    if "gh" not in command:
        return 0
    cwd = Path(payload.get("cwd") or ROOT)
    if not cwd.is_dir():
        cwd = ROOT
    text = publish_text(command, cwd)
    if text is None:
        return 0
    found = problems(text, load_library(cwd))
    if not found:
        return 0
    print("这次要发到 GitHub 的文字成串列出了本机账本里的馆藏细节（" + "；".join(found) + "）。"
          "按 peach-issue-delivery：规则效果写类型和定性结论，只留问题本身需要的一两个例子；"
          "确有必要多列时，正文加一行 `peach-public-text: <理由>`。", file=sys.stderr)
    return 2


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("files", nargs="*", help="要检查的文件，`-` 读 stdin")
    parser.add_argument("--hook-event", action="store_true", help="从 stdin 收 PreToolUse 钩子 JSON")
    args = parser.parse_args(argv)
    if args.hook_event:
        try:
            payload = json.load(sys.stdin)
        except (ValueError, OSError):
            return 0
        return hook(payload if isinstance(payload, dict) else {})
    library = load_library(ROOT)
    if library is None:
        print("没有找到本机账本，跳过检查")
        return 0
    failed = False
    for name in args.files or ["-"]:
        text = sys.stdin.read() if name == "-" else Path(name).read_text(encoding="utf-8")
        for problem in problems(text, library):
            failed = True
            print(f"{name}: {problem}")
    return 1 if failed else 0


if __name__ == "__main__":
    raise SystemExit(main())
