"""要公开的文字发出去之前，查两样：成串列出的馆藏细节，和外部读者看不懂的内部用语。

PR、issue、评论与提交说明都公开在 GitHub 上，编辑后旧版仍留在编辑历史里。问题本身需要的
一两个番号、前缀或标签照常写；把账本里的作品番号、人物名、标题片段成串列出来就拦下。
判据只读本机账本（SQLite `mode=ro`），仓库里不带任何馆藏数据；没有账本的机器（CI、
其他贡献者）一律放行。

PR、issue 与评论的读者是社区贡献者和用户：反馈汇总的条目编号、派单的批次号与轮次、
「剩余模块」「最上层 PR」这类不说明指谁的相对说法、本机交付流程的说法（工作树、`ready` 输出等）
他们看不懂，见 `insider_terms`。这一项不看账本，
也不查提交说明——改工作树脚本的提交本来就要写工作树。

确有必要时，在正文里写一行 `peach-public-text: <理由>` 放行。

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
if str(ROOT / "src") not in sys.path:
    sys.path.insert(0, str(ROOT / "src"))
from peach.interface_text import dev as t  # noqa: E402

CODE = re.compile(r"(?<![A-Za-z0-9])([A-Za-z]{2,7})-?(\d{2,6})(?![0-9])")
CJK = re.compile(r"[぀-ヿ㐀-鿿ｦ-ﾟ]{2,}")
#: 标题片段按这么长的连续假名、汉字比对；短了会撞上普通用语。
GRAM = 7
#: 一段文字里达到这些数目才算「成串」；问题本身需要的一两个例子不拦。给人看的类名见 `kind_label`。
LIMITS = {"codes": 3, "names": 2, "titles": 2}
WAIVER = re.compile(r"peach-public-text:\s*\S")
#: 会把文字发到 GitHub 的 gh 子命令。
PUBLISH = re.compile(r"\bgh\s+(?:(?:pr|issue)\s+(?:create|edit|comment)\b|release\s+(?:create|edit)\b"
                     r"|api\b[^\n]*\bcomments\b)")
BODY_FILE = re.compile(r"""(?:--body-file|--notes-file|-F)[=\s]+(?:body=@)?(?P<path>"[^"]+"|'[^']+'|[^\s"';|&]+)""")
#: 反引号里的命令、标识照写，不算内部用语。
CODE_SPAN = re.compile(r"```.*?```|`[^`\n]*`", re.S)
#: 外部读者看不懂的内部用语，按类给出；改法见 `insider_hint`。钩子查的是整条命令（heredoc
#: 正文也在里面），所以不收脚本名：同一条命令里接着跑的 `agent_worktree.py integrate` 不是要发的文字。
#: 「相对指代」只收搭配：「剩余空间」「其余显示英文」「这一批」「同批更新锁」是正常说法，不拦。
INSIDER = {
    "feedbackNumbers": re.compile(r"(?<![A-Za-z0-9_/#.\-])(?:N\d{2,3}|R[0-2]\s*[–-]\s*R[0-2])(?![A-Za-z0-9])"),
    "batches": re.compile(r"批次\s*[0-9①-⑩]|第\s*(?:[一二三四五六七八九十0-9]+|[①-⑩][a-z]?)\s*[批轮]|合批|首轮"),
    "relativeReferences": re.compile(r"(?:剩余|剩下的?|其余)的?(?:模块|文案|页面组|PR|分支|几批|影响面|路由|回归|分片)|剩余文字"
                       r"|前几批|另起一批|本批(?:的|改动|范围|集成)|同批\s*(?:PR|检查|修|交付|重跑|集成|验收)"
                       r"|(?:媒体|集成|本机)批次|此批|最上层\s*的?\s*PR|叠在(?:它|这个?\s*PR)上面"
                       r"|(?:用户|维护者)本轮|本轮(?:组合|固定组合|集成|已验证|未实测|实际|先)|上轮主线|[两几]轮主线"
                       r"|固定组合|组合分支|(?:发布|本次)收口"),
    "localDelivery": re.compile(r"工作树|集成分支|主检出|派单|协调会话|协调者|子代理|已签发|按域"
                         r"|\b(?:ready|integrate|preflight)\s*[:：(（]"),
    "coinedTerms": re.compile(r"门槛|本机提交者|账本副本|真相字段|升级后存量|延后清单"
                       r"|(?:中文|复杂度|主线|旧|独立|上游|最终)基线|以\S{0,16}为基线|基线(?:失败|复核|审阅|检出)"
                       r"|基线\s*[0-9a-f]{7,40}"),
}


def insider_hint() -> str:
    """内部用语的改法；钩子与 `agent_worktree.py integrate` 的拒收说明都接上这一句。"""
    return t("check_public_text.insiderHint")


def kind_label(kind: str) -> str:
    """`LIMITS` 与 `INSIDER` 的类名给人看的写法。"""
    return t(f"check_public_text.kind.{kind}")


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
        found: dict[str, set[str]] = {"codes": set(), "names": set(), "titles": set()}
        for match in CODE.finditer(text):
            if code_key(*match.groups()) in self.codes:
                found["codes"].add(match.group(0).upper())
        for name in self.names:
            if name.isascii():
                if len(name) >= 5 and re.search(rf"(?<![\w-]){re.escape(name)}(?![\w-])", text):
                    found["names"].add(name)
            elif name in text:
                found["names"].add(name)
        for run in CJK.findall(text):
            if any(run[i:i + GRAM] in self.grams for i in range(len(run) - GRAM + 1)):
                found["titles"].add(run)
        return {kind: sorted(values) for kind, values in found.items() if values}


def problems(text: str, library: Library | None) -> list[str]:
    """达到「成串」的那几类，各一句；没有账本或写了放行理由时为空。"""
    if library is None or WAIVER.search(text):
        return []
    found = library.findings(text)
    return [t("check_public_text.libraryFinding", kind=kind_label(kind), count=len(values), values=values[:8],
              more=t("check_public_text.more") if len(values) > 8 else "")
            for kind, values in found.items() if len(values) >= LIMITS[kind]]


def insider_terms(text: str) -> list[str]:
    """PR、issue 与评论里外部读者看不懂的内部用语，每类一句；写了放行理由时为空。"""
    if WAIVER.search(text):
        return []
    plain = CODE_SPAN.sub(" ", text)
    found = []
    for kind, pattern in INSIDER.items():
        terms = sorted({match.group(0).strip() for match in pattern.finditer(plain)})
        if terms:
            found.append(t("check_public_text.insiderFinding", kind=kind_label(kind), terms=terms[:6],
                           more=t("check_public_text.more") if len(terms) > 6 else ""))
    return found


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
    """PreToolUse：gh 要发的文字成串列了馆藏或用了内部用语就退出码 2，stderr 交给模型改。"""
    command = str((payload.get("tool_input") or {}).get("command") or "")
    if "gh" not in command:
        return 0
    cwd = Path(payload.get("cwd") or ROOT)
    if not cwd.is_dir():
        cwd = ROOT
    text = publish_text(command, cwd)
    if text is None:
        return 0
    found, insider = problems(text, load_library(cwd)), insider_terms(text)
    if found:
        print(t("check_public_text.hookLibrary", findings=t("common.clauseSeparator").join(found)), file=sys.stderr)
    if insider:
        print(t("check_public_text.hookInsider", findings=t("common.clauseSeparator").join(insider),
                hint=insider_hint()), file=sys.stderr)
    if found or insider:
        print(t("check_public_text.hookWaiver"), file=sys.stderr)
        return 2
    return 0


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=t("check_public_text.description"),
                                     formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("files", nargs="*", help=t("check_public_text.filesHelp"))
    parser.add_argument("--hook-event", action="store_true", help=t("check_public_text.hookEventHelp"))
    args = parser.parse_args(argv)
    if args.hook_event:
        try:
            payload = json.load(sys.stdin)
        except (ValueError, OSError):
            return 0
        return hook(payload if isinstance(payload, dict) else {})
    library = load_library(ROOT)
    if library is None:
        print(t("check_public_text.noLedger"))
    failed = False
    for name in args.files or ["-"]:
        text = sys.stdin.read() if name == "-" else Path(name).read_text(encoding="utf-8")
        for problem in problems(text, library) + insider_terms(text):
            failed = True
            print(f"{name}: {problem}")
    return 1 if failed else 0


if __name__ == "__main__":
    raise SystemExit(main())
