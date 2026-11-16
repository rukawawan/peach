"""项目资源根 `PROJECT_ROOT`：语言资源、迁移脚本、内置数据都从这里找。

不依赖任何别的 peach 模块：`interface_text` 要用它找语言资源，而 `settings_file` 又要靠
`interface_text` 渲染带 code 的报错，资源根单独成模块才不会循环导入。
"""
from __future__ import annotations

import sys
from pathlib import Path


def _project_root(module_file: str = __file__, bundle_root: str | None = None) -> Path:
    """资源来自源码树、wheel 内的资源目录或 PyInstaller 的 `_MEIPASS`。"""
    packaged = Path(module_file).resolve().parent / "_resources"
    if bundle_root is None and packaged.is_dir():
        return packaged
    return (Path(bundle_root) if bundle_root is not None
            else Path(module_file).resolve().parents[2])


PROJECT_ROOT = _project_root(bundle_root=getattr(sys, "_MEIPASS", None))
