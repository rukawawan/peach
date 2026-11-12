"""README 安装契约与提交检查共用的 Git 读取。"""

from __future__ import annotations

import subprocess
import re
import tomllib
from pathlib import Path

READMES = {"README.md", "README.zh-CN.md"}


def installation_contracts(repo: Path) -> list[str]:
    """README 的 Python 下限与语言入口须和安装声明一致。"""
    project = tomllib.loads((repo / 'pyproject.toml').read_text(encoding='utf-8'))['project']
    floor = project['requires-python'].removeprefix('>=')
    problems = []
    for name in sorted(READMES):
        text = (repo / name).read_text(encoding='utf-8')
        if not re.search(rf'\bPython {re.escape(floor)}(?:\+| or newer| 或更高)', text):
            problems.append(f'{name}: Python 下限须为 {floor}')
        counterpart, = READMES - {name}
        if counterpart not in re.findall(r'\]\(([^)\s]+)\)', text):
            problems.append(f'{name}: 缺少语言入口 {counterpart}')
    return problems


#: 已经推到 GitHub 的提交。它的署名与主题改不了：改写 hash 只能强推覆盖远端。
PUBLISHED_REF = "origin/master"


def git(repo: Path, *args: str, message: str | None = None) -> str:
    return subprocess.run(
        ["git", "-C", str(repo), *args], input=message, capture_output=True,
        text=True, encoding="utf-8", check=True,
    ).stdout


def unpublished(repo: Path) -> list[str]:
    """`git log` 用的排除参数：`PUBLISHED_REF` 存在就排掉它能到达的提交，没有远端就什么都不排。

    逐提交的门槛（署名、主题）只能落在还没发布的提交上：网页上直接改 README 的那条已经在
    远端 master 上，分支把它并回来时它不可能再补署名。
    """
    try:
        git(repo, "rev-parse", "--verify", "--quiet", f"{PUBLISHED_REF}^{{commit}}")
    except subprocess.CalledProcessError:
        return []
    return [f"^{PUBLISHED_REF}"]


def trailers(repo: Path, message: str) -> dict[str, list[str]]:
    """Git 解析提交末尾的 trailer；每个字段保留全部取值。"""
    result: dict[str, list[str]] = {}
    trailers = git(repo, "interpret-trailers", "--parse", message=message)
    for line in trailers.splitlines():
        name, _, value = line.partition(":")
        result.setdefault(name.casefold(), []).append(value.strip())
    return result
