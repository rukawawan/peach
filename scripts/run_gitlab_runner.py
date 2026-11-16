"""以无控制台进程运行现有 Windows runner 入口，避免创建终端窗口。"""
from __future__ import annotations

import argparse
import os
from pathlib import Path
import shutil
import subprocess
import sys

PROJECT_ROOT = Path(__file__).resolve().parent.parent
SRC_DIR = PROJECT_ROOT / "src"
if str(SRC_DIR) not in sys.path:
    sys.path.insert(0, str(SRC_DIR))

from peach.interface_text import dev as t  # noqa: E402


def run(root: Path) -> int:
    root = root.resolve(strict=True)
    for name in ("run-runner.ps1", "gitlab-runner.exe", "config.toml"):
        path = root / name
        if path.is_symlink() or not path.is_file():
            raise ValueError(t("run_gitlab_runner.entryMissing", name=name))
    powershell = shutil.which("pwsh.exe")
    if not powershell:
        raise ValueError(t("run_gitlab_runner.pwshMissing"))
    with (root / "runner-launcher.log").open("ab") as log:
        process = subprocess.run([powershell, "-NoProfile", "-NonInteractive", "-File", str(root / "run-runner.ps1")],
            cwd=root, stdin=subprocess.DEVNULL, stdout=log, stderr=subprocess.STDOUT,
            creationflags=subprocess.CREATE_NO_WINDOW, check=False)
    return process.returncode


def main() -> int:
    parser = argparse.ArgumentParser(description=t("run_gitlab_runner.description"))
    parser.add_argument("--root", required=True, type=Path)
    args = parser.parse_args()
    if os.name != "nt":
        parser.error(t("run_gitlab_runner.windowsOnly"))
    return run(args.root)


if __name__ == "__main__":
    raise SystemExit(main())
