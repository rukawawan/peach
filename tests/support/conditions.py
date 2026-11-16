"""按设计只在某个平台上成立的用例条件，以及外部前置条件缺失时的处理。"""

from __future__ import annotations

import json
import os
from pathlib import Path
from typing import NoReturn
import unittest
from unittest.mock import patch


def missing_prerequisite(reason: str) -> NoReturn:
    """缺 Node、依赖、ffmpeg 或浏览器这类外部前置条件时调用。

    本机没装时显式跳过，免得整个测试域红掉让人绕过入口。CI 的 runner 由工作流负责
    装齐，缺了就是工作流写错：跳过会让用例在 CI 里永远不执行，所以那里判失败。
    """
    if any(os.environ.get(name) == "true" for name in ("GITHUB_ACTIONS", "GITLAB_CI")):
        raise AssertionError(f"CI 缺少前置条件，工作流应当装好：{reason}")
    raise unittest.SkipTest(reason)


#: 直接把临时目录填入 `[media.locations]` 的用例只适用于 Windows，因为该表保存
#: Windows 格式的数据库路径前缀。POSIX 临时路径无法通过目录访问权限检查。
#: 跨平台用例应将 Windows 格式的前缀填入 `[media.locations]`，将临时媒体目录填入
#: `[media.mounts]`，按产品的路径转换规则验证。
windows_ledger_roots = unittest.skipUnless(os.name == "nt", "数据库中的目录前缀是 Windows 盘符")


#: 容量闸的默认保留值按真实磁盘总量算（最多 40 GiB）。不测容量闸的用例不该随本机磁盘余量变红：
#: 本机盘紧时它们会在第一项之前就以「空间不足」停下。
def without_capacity_reserve():
    """进程内的补丁：磁盘保留值为 0。数据与缓存上限照常生效，测容量闸的用例自己造磁盘读数。"""
    return patch("peach.storage_budget.reserve_bytes", return_value=0)


def pin_capacity_reserve(data_root: Path, gib: int = 1) -> None:
    """给子进程用的临时数据目录写一份容量设置，保留值固定为 `gib` GiB。"""
    state = Path(data_root) / "state"
    state.mkdir(parents=True, exist_ok=True)
    (state / "storage-policy.json").write_text(json.dumps({"minimum_free_gib": gib}), encoding="utf-8")
