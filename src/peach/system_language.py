"""运行 Peach 的电脑的系统界面语言（ADR-0156）。

界面语言选「自动」时，前端先看浏览器的语言偏好；浏览器里没有可用的语言，才用这里报的系统语言兜底。
只认有译文的语言：中文的各种写法都算简体中文，英文算英文，其余报 None，由前端落到英文。
"""
from __future__ import annotations

from collections.abc import Iterator
from functools import lru_cache
import locale
import os
import sys


def interface_language(tag: object) -> str | None:
    """一个语言标签（zh_TW、en-US、zh-Hant…）对应哪种界面语言。"""
    primary = tag.strip().lower().replace("_", "-").split("-")[0] if isinstance(tag, str) else ""
    return {"zh": "zh-CN", "en": "en"}.get(primary)


def _candidates() -> Iterator[str]:
    if sys.platform == "win32":
        # Windows 的显示语言；区域格式（GetUserDefaultLCID）可能和界面语言不同，以显示语言为准。
        try:
            import ctypes
            name = locale.windows_locale.get(ctypes.windll.kernel32.GetUserDefaultUILanguage())
        except (AttributeError, OSError):
            name = None
        if name:
            yield name
    for key in ("LC_ALL", "LC_MESSAGES", "LANGUAGE", "LANG"):
        value = os.environ.get(key, "")
        if value and value not in ("C", "POSIX"):
            yield from value.split(":")
    try:
        name = locale.getlocale()[0]
    except ValueError:
        name = None
    if name:
        yield name


@lru_cache(maxsize=1)
def system_language() -> str | None:
    """系统语言里第一个有译文的；系统语言在进程活着时不会变，算一次就够。"""
    for tag in _candidates():
        match = interface_language(tag)
        if match:
            return match
    return None
