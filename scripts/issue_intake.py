"""外部 issue 的模板检查：让命令行和 API 提交的 issue 与网页模板提交的结果一致。

网页「New issue」按模板提交时，即使删光模板文字也会带上模板的 Issue Type；用 `gh` 或 API
提交则不经过模板。作者不是维护者的新 issue 均检查正文：含有某个模板的章节时保留已有类型，
没有类型则补上那个模板的 Issue Type；缺少模板章节则关闭；按模板补齐章节后重开并补上类型，
关闭时留下的提示评论折叠为「已过时」。GitHub 写操作由 `.github/workflows/issue-intake.yml` 完成，
本脚本只输出 `keep`、`close`、`type <类型>`、`reopen <类型>` 或待折叠评论的 node ID。
"""
from __future__ import annotations

import argparse
import json
from pathlib import Path
import re
import sys

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT / "src") not in sys.path:
    sys.path.insert(0, str(ROOT / "src"))

from peach.interface_text import dev as t  # noqa: E402

TEMPLATES = ROOT / ".github/ISSUE_TEMPLATE"
LABEL = "status:needs-template"
MAINTAINERS = frozenset({"OWNER", "MEMBER", "COLLABORATOR"})
HEADING = re.compile(r"^ {0,3}#{1,6}\s*(.+?)\s*#*\s*$", re.M)
TYPE_LINE = re.compile(r"^type:\s*(\S+)\s*$", re.M)
OPTIONAL = re.compile(r"[（(][^）)]*[）)]")
NOTICE = """\
这条 issue 没有按模板填写，已自动关闭。请编辑正文，补上模板的章节（缺陷：问题描述、复现步骤、运行环境；\
建议：使用场景、期望的行为），用通用技术说法描述问题；补齐后会自动重新打开。也可以从 \
[New issue](https://github.com/peach-mitao/peach/issues/new/choose) 重新选择模板提交，或按 \
[参与 Peach](https://github.com/peach-mitao/peach/blob/master/CONTRIBUTING.md#开-issue) 里的命令用 `gh` 提交。

This issue was closed automatically because it does not follow an issue template. Edit it to add the \
template sections (bug: What happened, Steps to reproduce, Environment; feature: Use case, Desired \
behavior) in plain technical language, and it will reopen. You can also pick a template from \
[New issue](https://github.com/peach-mitao/peach/issues/new/choose), or submit with `gh` as shown in \
[CONTRIBUTING](https://github.com/peach-mitao/peach/blob/master/CONTRIBUTING.md#开-issue).
"""
NOTICE_AUTHOR = "github-actions[bot]"
NOTICE_MARK = NOTICE.split("，", 1)[0]

Template = tuple[str, list[tuple[str, ...]]]


def load_templates(directory: Path = TEMPLATES) -> list[Template]:
    """每个模板的 Issue Type 与章节名；标题里的中英文用「/」分开，括号里的「可选」不参与匹配。"""
    templates = []
    for path in sorted(directory.glob("*.md")):
        text = path.read_text(encoding="utf-8")
        kind = TYPE_LINE.search(text.split("---", 2)[1] if text.startswith("---") else "")
        sections = [tuple(OPTIONAL.sub("", part).strip().casefold()
                          for part in title.split("/") if OPTIONAL.sub("", part).strip())
                    for title in HEADING.findall(text)]
        if kind and sections:
            templates.append((kind.group(1), sections))
    return templates


def matched_type(body: str, templates: list[Template] | None = None) -> str | None:
    """正文命中某个模板的至少两个章节时返回该模板的 Issue Type；只有一个章节的模板命中一个即可。"""
    titles = [title.casefold() for title in HEADING.findall(body or "")]
    for kind, sections in load_templates() if templates is None else templates:
        hits = sum(any(name in title for title in titles for name in names) for names in sections)
        if hits >= min(2, len(sections)):
            return kind
    return None


def verdict(payload: dict, templates: list[Template] | None = None) -> str:
    issue = payload.get("issue") or {}
    if issue.get("pull_request") or (issue.get("user") or {}).get("type") == "Bot" \
            or issue.get("author_association") in MAINTAINERS:
        return "keep"
    body = issue.get("body") or ""
    action = payload.get("action")
    labels = {label.get("name") for label in issue.get("labels") or []}
    kind = matched_type(body, templates)
    if action == "edited" and issue.get("state") == "closed" and LABEL in labels:
        return f"reopen {kind}" if kind else "keep"
    if action not in {"opened", "edited"} or issue.get("state") == "closed":
        return "keep"
    if kind:
        return "keep" if issue.get("type") else f"type {kind}"
    return "close" if action == "opened" else "keep"


def notice_ids(comments: list[dict]) -> list[str]:
    """issue 重开后要折叠的提示评论：本工作流以 Actions 身份发出、以提示开头的那几条。"""
    return [comment["node_id"] for comment in comments
            if (comment.get("user") or {}).get("login") == NOTICE_AUTHOR
            and (comment.get("body") or "").lstrip().startswith(NOTICE_MARK)]


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=t("issue_intake.description"))
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument("--event", type=Path, help=t("issue_intake.eventHelp"))
    group.add_argument("--notice", action="store_true", help=t("issue_intake.noticeHelp"))
    group.add_argument("--notice-ids", type=Path, help=t("issue_intake.noticeIdsHelp"))
    args = parser.parse_args(argv)
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")
    if args.notice:
        sys.stdout.write(NOTICE)
        return 0
    if args.notice_ids:
        for node_id in notice_ids(json.loads(args.notice_ids.read_text(encoding="utf-8"))):
            print(node_id)
        return 0
    print(verdict(json.loads(args.event.read_text(encoding="utf-8"))))
    return 0


if __name__ == "__main__":
    sys.exit(main())
