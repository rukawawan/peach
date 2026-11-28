"""在 Windows 原生窗口打开本机 Peach。"""
from __future__ import annotations

from hashlib import sha256
import logging
import os
from pathlib import Path
import subprocess
import sys

from .config import PROJECT_ROOT
from .distribution import user_data_root
from .fsutil import atomic_write_bytes

_LOGGER = logging.getLogger(__name__)
_EXECUTABLE = "PeachWindow.exe"
_FILES = (_EXECUTABLE, "Microsoft.Web.WebView2.Core.dll", "Microsoft.Web.WebView2.WinForms.dll", "WebView2Loader.dll")


def _window_executable(local: Path) -> Path:
    if not getattr(sys, "frozen", False):
        return PROJECT_ROOT / "build" / "windows-webview" / _EXECUTABLE

    bundle = Path(sys._MEIPASS) / "tools" / "peach-webview"
    files = {name: (bundle / name).read_bytes() for name in _FILES}
    digest = sha256(b"".join(sha256(content).digest() for content in files.values())).hexdigest()
    # 独立进程继续使用这些文件时，PyInstaller 可清理临时目录，安装器也可以替换源码包。
    destination = local / "host" / digest
    for name, content in files.items():
        target = destination / name
        if not target.is_file():
            atomic_write_bytes(target, content)
    return destination / _EXECUTABLE


def open_window(url: str, data_root: Path) -> bool:
    """原生入口不可用时返回 False，由调用方打开默认浏览器。"""
    if sys.platform != "win32":
        return False
    local = user_data_root(os.environ).parent / "WebView2"
    try:
        host = _window_executable(local)
        if not host.is_file():
            return False
        profile = sha256(os.path.normcase(str(data_root.resolve())).encode("utf-8")).hexdigest()
        subprocess.Popen([str(host), url, str(local / "profiles" / profile)], cwd=host.parent,
                         stdin=subprocess.DEVNULL, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    except OSError:
        _LOGGER.exception("Could not launch the Peach WebView2 window")
        return False
    return True
