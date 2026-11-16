"""正式测试入口的依赖准备，只在隔离工作树自动同步环境。"""
from __future__ import annotations

import os
import shutil
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT / "src") not in sys.path:
    sys.path.insert(0, str(ROOT / "src"))

from peach.interface_text import dev as t
from peach.runtime_prepare import Dependencies, find_uv


def prepare(root: Path, main: Path, *, run=subprocess.run, which=shutil.which,
            environ=None) -> None:
    """准备完成才允许加载测试运行器；主检出依赖只读检查。"""
    root, main = root.resolve(), main.resolve()
    if not (root / "uv.lock").is_file():
        raise RuntimeError(t("test_environment.lockMissing", path=root / "uv.lock"))
    environment = dict(os.environ if environ is None else environ)
    for name in ("VIRTUAL_ENV", "UV_PROJECT_ENVIRONMENT"):
        environment.pop(name, None)
    if root == main:
        step = Dependencies(root, run=run, which=which, environ=environment, frozen=False).check()
        if step.state != "current":
            raise RuntimeError(t("test_environment.mainNotReady", message=step.message))
        print(step.message, flush=True)
        return
    if (root / ".venv").resolve() != root / ".venv":
        raise RuntimeError(t("test_environment.venvOutside"))
    uv = find_uv(which=which, environ=environment)
    if uv is None:
        raise RuntimeError(t("test_environment.uvMissing"))
    print(t("test_environment.syncing", path=root / ".venv"), flush=True)
    result = run([str(uv), "sync", "--locked", "--all-extras", "--python", sys.executable,
                  "--project", str(root)], cwd=str(root), env=environment, check=False)
    if result.returncode:
        raise RuntimeError(t("test_environment.syncFailed", code=result.returncode))


def main(argv=None) -> int:
    import argparse

    parser = argparse.ArgumentParser(description=t("test_environment.description"))
    parser.add_argument("root", type=Path)
    parser.add_argument("main_root", type=Path)
    args = parser.parse_args(argv)
    try:
        prepare(args.root, args.main_root)
    except (RuntimeError, OSError) as error:
        print(str(error), file=sys.stderr, flush=True)
        return 3
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
