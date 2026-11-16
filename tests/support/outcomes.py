"""后继结论的断言辅助（ADR-0159）：摘要里只存段落，断言照旧比接口出口渲染出的那一句。"""

from __future__ import annotations

from peach import task_outcomes


def told(summary: dict) -> dict:
    """摘要按 zh-CN 渲染后的样子（`task_runs` 出口那一份），去掉段落，留下 `outcome`、`source` 等文字。"""
    out = task_outcomes.rendered(summary)
    return {key: value for key, value in out.items() if not key.endswith("_parts")}
