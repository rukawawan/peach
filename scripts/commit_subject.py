"""核对交付分支每个提交的主题行：`type(scope)!: 描述`，变更日志靠它起草。"""

from __future__ import annotations

import re
import sys
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent.parent
SRC_DIR = PROJECT_ROOT / "src"
if str(SRC_DIR) not in sys.path:
    sys.path.insert(0, str(SRC_DIR))

from peach.interface_text import dev as t  # noqa: E402

from . import co_author  # noqa: E402
from .check_readme_impact import git, unpublished  # noqa: E402

#: 允许的提交类型，封闭清单。前三个进变更日志（`scripts/changelog.py` 的 TYPE_GROUPS），
#: 其余只改开发过程。要加新类型先想清它属于哪一组，不是随手起个词。
TYPES = frozenset({"feat", "fix", "perf", "refactor", "docs", "test", "chore",
                   "build", "ci", "style", "revert"})

#: 主题形状。scope 可省，省了就等人在变更日志里定区域标签；冒号后必须有一个空格，
#: `fix(web):保留` 这种历史写法解析得出来，但两种写法并存就没法 grep。
FORM = re.compile(r"^(?P<type>[a-z]+)(?:\((?P<scope>[^()\s]+)\))?(?P<bang>!)?: (?P<text>\S.*)$")

EXAMPLE = "fix(web): 补齐图标声明与兜底路径"


def subjects(repo: Path, base: str, head: str = "HEAD") -> list[str]:
    """分支上本机提交的主题，不含从目标分支合进来的 merge，也不含已发布到远端的提交。

    采纳社区 PR 时对方的提交原样合进来（`git merge -s ours` 记入），主题是对方写的，
    改了就不再是原提交；和 `co_author.check` 一样，作者不是本机提交者的不归这里管。
    """
    local_mail = co_author.committer_mail(repo)
    output = git(repo, "log", "--no-merges", "--format=%ae%x00%s", f"{base}..{head}", *unpublished(repo))
    rows = [line.split("\0", 1) for line in output.splitlines() if line.strip()]
    return [subject for mail, subject in rows if co_author.is_own(mail, local_mail)]


def check(repo: Path, base: str, head: str = "HEAD") -> list[str]:
    """每个提交主题都要是 Conventional Commits 形状，类型在清单内。

    `changelog.py` 按类型分组、按 scope 贴区域标签起草变更日志，主题写歪的提交不是
    报错而是静默漏掉或错归组，等人定版时才发现少了一条。所以在 `ready` / `integrate`
    就拒收：形状不对、类型不在清单、描述为空，三种都算。
    """
    problems = []
    for subject in subjects(repo, base, head):
        parsed = FORM.match(subject)
        if parsed is None:
            problems.append(t("commit_subject.badForm", subject=subject, example=EXAMPLE))
        elif parsed["type"] not in TYPES:
            problems.append(t("commit_subject.unknownType", subject=subject, type=parsed["type"],
                              allowed=sorted(TYPES)))
    return problems
