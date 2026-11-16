"""agent/* 分支提交时的 trailer 形态检查。"""
from __future__ import annotations

import argparse
import subprocess
import sys
from pathlib import Path

if not __package__:
    sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
    sys.path.insert(1, str(Path(__file__).resolve().parents[1] / "src"))
    __package__ = "scripts"
from peach.interface_text import dev as t

from . import check_readme_impact, co_author


def author_mail(repo: Path) -> str:
    """这次提交实际采用的作者邮箱，`--author` 与 cherry-pick 保留的原作者都算。"""
    ident = check_readme_impact.git(repo, "var", "GIT_AUTHOR_IDENT")
    return ident.partition("<")[2].partition(">")[0]


def check(repo: Path, message: str, *, own: bool = True) -> list[str]:
    parsed = check_readme_impact.trailers(repo, message)
    problems = co_author.problems(t("check_commit_message.pendingLabel"), parsed.get("co-authored-by", []), own=own)
    mentioned = sum(line.partition(":")[0].casefold() == "co-authored-by"
                    for line in message.splitlines())
    if mentioned != len(parsed.get("co-authored-by", [])):
        problems.append(t("check_commit_message.trailerBlock"))
    return problems


def main(argv=None) -> int:
    parser = argparse.ArgumentParser(description=t("check_commit_message.description"))
    parser.add_argument("message_file", type=Path)
    args = parser.parse_args(argv)
    repo = Path.cwd()
    try:
        branch = check_readme_impact.git(repo, "branch", "--show-current").strip()
        merge = check_readme_impact.git(repo, "rev-parse", "--git-path", "MERGE_HEAD").strip()
        if not branch.startswith("agent/") or (repo / merge).exists():
            return 0
        own = co_author.is_own(author_mail(repo), co_author.committer_mail(repo))
        problems = check(repo, args.message_file.read_text(encoding="utf-8"), own=own)
    except (OSError, UnicodeError, subprocess.CalledProcessError) as error:
        print(t("check_commit_message.checkFailed", error=error), file=sys.stderr)
        return 1
    for problem in problems:
        print(problem, file=sys.stderr)
    return 1 if problems else 0


if __name__ == "__main__":
    raise SystemExit(main())
