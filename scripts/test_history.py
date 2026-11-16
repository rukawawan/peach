"""逐条测试结果的历史：每次正式运行把结果追加到按月分的 JSON Lines，用来统计每条测试抓到回归的比率。

一次运行先写一行运行头（`type: run`：范围、平台、提交、分支、工作树、是否 CI、跑了哪些测试文件），
再按条写结果（`type: test`）。为控制体积，只逐条写非通过的用例与耗时不少于 `SLOW_SECONDS`
的通过用例；某条用例跑了几次，由运行头的文件清单推算。

写历史失败只告警，不改变测试判定；文件在测试记录同级、仓库之外（CI 上落在作业目录的
`build/test-history/`），不进代码快照，也不新增环境变量，不影响测试记录的环境指纹。
"""
from __future__ import annotations

import json
import os
import platform
import re
import subprocess
import sys
import time
import uuid
from contextlib import contextmanager
from pathlib import Path

from filelock import FileLock, Timeout
if str(Path(__file__).resolve().parents[1] / "src") not in sys.path:
    sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))
from peach.interface_text import dev as t  # noqa: E402

SLOW_SECONDS = 5.0
SUMMARY_CHARS = 200
OUTCOMES = frozenset({"pass", "fail", "error", "skip"})

#: 测试进程里由 vitest、浏览器用例交上来的逐条结果；分片子进程把它们连同自己的结果报给父进程。
_external: list[dict] = []

_SECRET = re.compile(r"(?i)\b(token|password|passwd|secret|api[_-]?key|authorization|cookie)\b(\s*[:=]\s*)\S+")


def summary(text: str | None) -> str | None:
    """失败的首行摘要：取最后一个非空的异常行，遮掉形如 `token=…` 的值并截断。"""
    if not text:
        return None
    lines = [line.strip() for line in str(text).splitlines() if line.strip()]
    if not lines:
        return None
    errors = [line for line in lines if re.match(r"^[\w.]*(Error|Exception|Failure)\b", line)]
    line = (errors or lines)[-1]
    return _SECRET.sub(r"\1\2***", line)[:SUMMARY_CHARS]


def result(test_id: str, outcome: str, seconds: float, message: str | None = None) -> dict:
    if outcome not in OUTCOMES:
        raise ValueError(t("test_history.unknownOutcome", outcome=outcome))
    row = {"id": test_id, "outcome": outcome, "seconds": round(float(seconds), 3)}
    if outcome in {"fail", "error"}:
        row["message"] = summary(message)
    return row


#: 运行器正在执行用例的层数。用例里再调运行器（测运行器自己的那些用例）时不写真实历史，
#: 也不取走外层运行收集到一半的外部结果。
_running = 0


@contextmanager
def running():
    global _running
    _running += 1
    try:
        yield
    finally:
        _running -= 1


def nested() -> bool:
    """运行器正在执行用例：此刻调用运行器的是某条用例，不是正式运行。"""
    return _running > 0


def record_external(rows: list[dict]) -> None:
    """vitest 与浏览器用例在测试进程里交上来的逐条结果。"""
    if _running > 1:
        return
    _external.extend(rows)


def take_external() -> list[dict]:
    if _running:
        return []
    rows = list(_external)
    _external.clear()
    return rows


def history_dir(root: Path) -> Path:
    """与测试记录同级：`<Git common directory 的上一级>/build/test-history`。"""
    common = subprocess.run(["git", "-c", f"safe.directory={root.as_posix()}", "-C", str(root),
                             "rev-parse", "--path-format=absolute", "--git-common-dir"],
                            capture_output=True, text=True, encoding="utf-8", check=True).stdout.strip()
    return Path(common).parent / "build" / "test-history"


def _git(root: Path, *args: str) -> str:
    try:
        return subprocess.run(["git", "-c", f"safe.directory={root.as_posix()}", "-C", str(root), *args],
                              capture_output=True, text=True, encoding="utf-8", check=True).stdout.strip()
    except (OSError, subprocess.CalledProcessError):
        return ""


def is_ci() -> bool:
    return any(os.environ.get(name) for name in ("CI", "GITLAB_CI", "GITHUB_ACTIONS"))


def run_header(root: Path, scope: str, files: list[str], count: int) -> dict:
    branch = _git(root, "rev-parse", "--abbrev-ref", "HEAD")
    if branch in {"", "HEAD"}:
        branch = os.environ.get("CI_COMMIT_REF_NAME") or os.environ.get("GITHUB_REF_NAME") or branch
    return {"type": "run", "run": uuid.uuid4().hex, "time": time.strftime("%Y-%m-%dT%H:%M:%S%z"),
            "scope": scope, "platform": platform.platform(), "python": platform.python_version(),
            "head": _git(root, "rev-parse", "HEAD"), "branch": branch, "worktree": str(root),
            "ci": is_ci(), "files": sorted(files), "count": count}


def kept(rows: list[dict]) -> list[dict]:
    """逐条写哪些：非通过的全写，通过的只写慢的。"""
    return [row for row in rows if row["outcome"] != "pass" or row["seconds"] >= SLOW_SECONDS]


def append(root: Path, *, scope: str, files: list[str], rows: list[dict],
           folder: Path | None = None) -> Path | None:
    """追加一次运行；多个进程同时写同一个月的文件时用旁边的锁串行。失败只告警，返回 None。"""
    if folder is None and _running:
        return None
    try:
        header = run_header(root, scope, files, len(rows))
        return _write(root, folder, [header, *({"type": "test", "run": header["run"], **row} for row in kept(rows))])
    except (OSError, ValueError, Timeout, subprocess.CalledProcessError) as error:
        print(t("test_history.historyNotWritten", error=error), file=sys.stderr, flush=True)
        return None


def append_flaky(root: Path, selectors: list[str], folder: Path | None = None) -> Path | None:
    """记一次偶发：失败后单独重跑通过的文件。一行 `type: flaky`，供 `flaky` 子命令排行。"""
    if folder is None and _running:
        return None
    try:
        header = run_header(root, "flaky", [], len(selectors))
        line = {key: header[key] for key in ("time", "head", "branch", "worktree", "ci")}
        return _write(root, folder, [{"type": "flaky", **line, "selectors": sorted(selectors)}])
    except (OSError, ValueError, Timeout, subprocess.CalledProcessError) as error:
        print(t("test_history.flakyNotWritten", error=error), file=sys.stderr, flush=True)
        return None


def _write(root: Path, folder: Path | None, records: list[dict]) -> Path:
    folder = history_dir(root) if folder is None else folder
    folder.mkdir(parents=True, exist_ok=True)
    path = folder / f"{time.strftime('%Y-%m')}.jsonl"
    lines = [json.dumps(record, ensure_ascii=False) for record in records]
    with FileLock(path.with_suffix(".lock"), timeout=30):
        with path.open("a", encoding="utf-8", newline="\n") as stream:
            stream.write("\n".join(lines) + "\n")
    return path


def flaky_ranking(records, *, since: str = "") -> list[dict]:
    """按偶发次数排行：同一文件反复出现，说明它的等待写法或时限要修（docs/TESTING.md）。"""
    ranks: dict[str, dict] = {}
    for record in records:
        if record.get("type") != "flaky" or str(record.get("time", "")) < since:
            continue
        for selector in record.get("selectors", ()):
            rank = ranks.setdefault(selector, {"selector": selector, "count": 0, "ci": 0,
                                               "days": set(), "branches": set(), "last": ""})
            rank["count"] += 1
            rank["ci"] += bool(record.get("ci"))
            rank["days"].add(str(record.get("time", ""))[:10])
            rank["branches"].add(record.get("branch") or "")
            rank["last"] = max(rank["last"], str(record.get("time", "")))
    rows = [{**rank, "days": len(rank["days"]), "branches": len(rank["branches"])} for rank in ranks.values()]
    return sorted(rows, key=lambda row: (-row["count"], -row["days"], row["selector"]))


def read_records(folders: list[Path]):
    for folder in folders:
        for path in sorted(folder.rglob("*.jsonl")):
            with path.open(encoding="utf-8") as stream:
                for line in stream:
                    try:
                        yield json.loads(line)
                    except json.JSONDecodeError:
                        continue


def main(argv: list[str] | None = None) -> int:
    import argparse
    parser = argparse.ArgumentParser(description=t("test_history.description"))
    commands = parser.add_subparsers(dest="command", required=True)
    flaky = commands.add_parser("flaky", help=t("test_history.helpFlaky"))
    flaky.add_argument("--days", type=int, default=30, help=t("test_history.helpDays"))
    flaky.add_argument("--folder", type=Path, action="append",
                       help=t("test_history.helpFolder"))
    args = parser.parse_args(argv)
    root = Path(__file__).resolve().parents[1]
    folders = args.folder or [history_dir(root)]
    since = time.strftime("%Y-%m-%d", time.localtime(time.time() - args.days * 86400))
    rows = flaky_ranking(read_records(folders), since=since)
    if not rows:
        print(t("test_history.noFlaky", days=args.days))
        return 0
    print("\t".join((t("test_history.columnCount"), "CI", t("test_history.columnDays"), t("test_history.columnBranches"),
                     t("test_history.columnLast"), t("test_history.columnFile"))))
    for row in rows:
        print(f"{row['count']}\t{row['ci']}\t{row['days']}\t{row['branches']}\t{row['last'][:16]}\t{row['selector']}")
    return 0


def vitest_rows(report: dict, frontend: Path) -> list[dict]:
    """vitest JSON 报告 → 逐条结果，用例名为「文件 > 分组 > 标题」。"""
    status = {"passed": "pass", "failed": "fail", "skipped": "skip", "pending": "skip", "todo": "skip"}
    rows = []
    for suite in report.get("testResults", []):
        name = Path(suite.get("name", ""))
        try:
            name = name.relative_to(frontend)
        except ValueError:
            pass
        for case in suite.get("assertionResults", []):
            title = " > ".join([name.as_posix(), *case.get("ancestorTitles", []), case.get("title", "")])
            rows.append(result(f"vitest:{title}", status.get(case.get("status"), "error"),
                               (case.get("duration") or 0) / 1000,
                               "\n".join(case.get("failureMessages") or [])))
    return rows


def file_result(kind: str, path: str, success: bool, seconds: float = 0) -> dict:
    """完整外部文件的终态，区别于尚未收齐的叶子结果。"""
    return {**result(f'{kind}:{path} > 文件结果', 'pass' if success else 'fail', seconds),
            'file_complete': True}


def vitest_files(report: dict, frontend: Path) -> list[dict]:
    rows = []
    for suite in report.get('testResults', ()):
        try:
            path = Path(suite['name']).relative_to(frontend).as_posix()
        except (ValueError, KeyError):
            continue
        rows.append(file_result('vitest', path, suite.get('status') == 'passed'))
    return rows


_TAP_RESULT = re.compile(r"^(?P<indent>\s*)(?P<not>not )?ok \d+ - (?P<name>.*?)(?P<skip> # (?:SKIP|TODO)\b.*)?$")


def tap_rows(path: str, output: str) -> list[dict]:
    """Node `--test-reporter=tap` 的输出 → 逐条叶子用例，用例名为「文件 > 分组 > 标题」。"""
    lines = output.splitlines()
    stack: dict[int, str] = {}
    rows = []
    for index, line in enumerate(lines):
        if line.lstrip().startswith("# Subtest: "):
            indent = len(line) - len(line.lstrip())
            stack[indent] = line.lstrip()[len("# Subtest: "):]
            stack = {level: name for level, name in stack.items() if level <= indent}
            continue
        match = _TAP_RESULT.match(line)
        if not match:
            continue
        indent = len(match["indent"])
        block, seconds, kind, message = [], 0.0, "test", None
        for following in lines[index + 1:]:
            stripped = following.strip()
            if stripped == "...":
                break
            block.append(following)
        for position, item in enumerate(block):
            stripped = item.strip()
            if stripped.startswith("duration_ms:"):
                seconds = float(stripped.split(":", 1)[1]) / 1000
            elif stripped.startswith("type:"):
                kind = stripped.split(":", 1)[1].strip().strip("'\"")
            elif stripped.startswith("error:") and message is None:
                value = stripped.split(":", 1)[1].strip()
                message = value.strip("'\"") if value not in {"|-", "|", ">-", ">"} \
                    else next((rest.strip() for rest in block[position + 1:] if rest.strip()), "")
        if kind != "test":
            continue
        parents = [name for level, name in sorted(stack.items()) if level < indent]
        outcome = "skip" if match["skip"] else ("fail" if match["not"] else "pass")
        rows.append(result(" > ".join(["e2e:" + path, *parents, match["name"]]), outcome, seconds, message))
    return rows


if __name__ == "__main__":
    raise SystemExit(main())
