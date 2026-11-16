#!/usr/bin/env python3
# -*- coding: utf-8 -*-
r"""把 Peach 菜单栏项注册成 LaunchAgent。

**不能用 .app 外壳直接跑菜单栏项。** macOS 26 上，主可执行文件如果是一个 exec 到
真正解释器的跳板（shell 脚本、C launcher 都算），状态项就注册不上：进程活着、
`NSStatusItem` 也建出来了，但它的按钮窗口永远是 `(0,0,34,0)`——高度 0，从来没被
布局，菜单栏上什么都不出现。Apple 已受理为 FB21015611，目前没有绕过办法。

同一份代码由 launchd 或 shell 直接拉起（没有跳板）时立刻正常：实测按钮窗口
`(858, 949, 34, 33)`，屏宽 1512，落在菜单栏内。

所以登录自启走 LaunchAgent，而不是把 .app 放进登录项。`.app` 只留作双击入口，
它做的事也只是 `launchctl kickstart`，不自己 exec 解释器。

`install` 会先清理 `peach.appid.LEGACY_MACOS_LAUNCH_AGENT_LABELS` 里的遗留标签：
`launchctl bootout` 只作用于给定的那一个 label，装着遗留标签的机器上会同时活着两个
菜单栏进程，两个都拿 `.local` 的 80/443 转发。清理的动作是逐个 bootout 再删掉
`~/Library/LaunchAgents/<遗留标签>.plist`；那台机器上没有遗留标签就静默跳过。
"""
from __future__ import annotations

import argparse
import getpass
import os
import plistlib
import subprocess
import time
import sys
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent.parent
SRC_DIR = PROJECT_ROOT / "src"
if str(SRC_DIR) not in sys.path:
    sys.path.insert(0, str(SRC_DIR))

from peach.appid import LEGACY_MACOS_LAUNCH_AGENT_LABELS, MACOS_LAUNCH_AGENT_LABEL
from peach.config import LOG_DIR, PROJECT_ROOT
from peach.desktop_startup import launch_agent_supervision
from peach.interface_text import dev as t


LABEL = MACOS_LAUNCH_AGENT_LABEL
#: 交给 agent 的 PATH。Homebrew 的前缀在 launchd 的默认 PATH 里没有。
AGENT_PATH = "/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin"


def launch_agents_dir() -> Path:
    return Path.home() / "Library" / "LaunchAgents"


def plist_path(label: str = LABEL) -> Path:
    return launch_agents_dir() / f"{label}.plist"


def build_plist(tray: Path) -> dict:
    return {
        "Label": LABEL,
        # 直接跑目标程序，中间不能有 exec 跳板，否则菜单栏项注册不上。
        "ProgramArguments": [str(tray)],
        "RunAtLoad": True,
        # 从菜单退出不拉回来，崩溃才拉回来；与设置页写的登录启动项同一份设置。
        **launch_agent_supervision(True),
        "ProcessType": "Interactive",
        # launchd 给的 PATH 只有 /usr/bin:/bin:/usr/sbin:/sbin，找不到 Homebrew 的
        # ffmpeg/ffprobe，转码和抽帧会静默变成「不可用」。
        "EnvironmentVariables": {"PATH": AGENT_PATH},
        "WorkingDirectory": str(PROJECT_ROOT),
        "StandardOutPath": str(LOG_DIR / "macos-tray.log"),
        "StandardErrorPath": str(LOG_DIR / "macos-tray.log"),
    }


def launchctl(*args: str) -> subprocess.CompletedProcess:
    # 显式给 encoding：text=True 会用平台默认编码，中文输出会静默丢成空 stdout。
    return subprocess.run(
        ["launchctl", *args], capture_output=True, text=True,
        encoding="utf-8", errors="replace")


def remove_legacy_agents(domain: str) -> list[str]:
    """卸掉遗留标签的 LaunchAgent 并删掉它的 plist，返回真正清掉的标签。

    `launchctl bootout` 只作用于给定的那一个 label，所以装新标签这一步碰不到遗留的
    那份：它会继续开机自启一个菜单栏进程，继续在 80/443 上抢转发目标。判据取「已加载
    或 plist 还在」，两者都不成立就静默跳过——多数机器没有遗留标签，不该为此打印噪音。
    """
    cleaned: list[str] = []
    for label in LEGACY_MACOS_LAUNCH_AGENT_LABELS:
        stale = plist_path(label)
        loaded = launchctl("print", f"{domain}/{label}").returncode == 0
        if not loaded and not stale.is_file():
            continue
        launchctl("bootout", f"{domain}/{label}")
        if stale.is_file():
            stale.unlink()
        cleaned.append(label)
    return cleaned


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description=t("install_macos_agent.description"))
    parser.add_argument("action", choices=("install", "uninstall", "status"),
                        nargs="?", default="install")
    parser.add_argument("--tray", type=Path,
                        default=PROJECT_ROOT / ".venv" / "bin" / "peach-tray")
    return parser


def run(args: argparse.Namespace) -> int:
    target = plist_path()
    domain = f"gui/{os.getuid()}"

    if args.action == "status":
        result = launchctl("print", f"{domain}/{LABEL}")
        print(t("install_macos_agent.plistState", target=target, state=t("install_macos_agent.exists") if target.is_file() else t("install_macos_agent.missing")))
        print(t("install_macos_agent.loaded") if result.returncode == 0 else t("install_macos_agent.notLoaded"))
        return 0

    if args.action == "uninstall":
        launchctl("bootout", f"{domain}/{LABEL}")
        if target.is_file():
            target.unlink()
        print(t("install_macos_agent.uninstalled", label=LABEL))
        return 0

    if not args.tray.is_file():
        raise SystemExit(t("install_macos_agent.trayMissing", tray=args.tray))
    for label in remove_legacy_agents(domain):
        print(t("install_macos_agent.legacyRemoved", label=label))
    LOG_DIR.mkdir(parents=True, exist_ok=True)
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_bytes(plistlib.dumps(build_plist(args.tray)))

    # 重装时先 bootout：同一个 label 不能重复 bootstrap。bootout 是异步的，
    # 立刻 bootstrap 会撞上「Input/output error (5)」，所以要等它真的消失。
    launchctl("bootout", f"{domain}/{LABEL}")
    for _ in range(50):
        if launchctl("print", f"{domain}/{LABEL}").returncode != 0:
            break
        time.sleep(0.2)
    result = launchctl("bootstrap", domain, str(target))
    if result.returncode != 0:
        raise SystemExit(t("install_macos_agent.bootstrapFailed", stderr=result.stderr.strip()))
    launchctl("kickstart", "-k", f"{domain}/{LABEL}")
    print(t("install_macos_agent.installed", label=LABEL, user=getpass.getuser()))
    print(t("install_macos_agent.plistPath", target=target))
    print(t("install_macos_agent.logPath", log=LOG_DIR / 'macos-tray.log'))
    print(t("install_macos_agent.stopHint", domain=domain, label=LABEL))
    return 0


def main() -> int:
    return run(build_parser().parse_args())


if __name__ == "__main__":
    raise SystemExit(main())
