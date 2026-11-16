"""拿着整机的重负载锁运行一条命令，结束后释放。

本机 CI runner 的构建、冒烟与镜像作业用它和本机测试排同一把锁（`test_evidence.machine_lock_path`）；
测试入口自己会拿这把锁，经测试入口的作业不要再套一层，否则会自己等自己。

用法：python scripts/machine_lock.py [--wait 秒] -- 命令 参数...
"""
from __future__ import annotations

import argparse
from pathlib import Path
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[1]
if not __package__:
    sys.path.insert(0, str(ROOT))
    __package__ = "scripts"

SRC_DIR = ROOT / "src"
if str(SRC_DIR) not in sys.path:
    sys.path.insert(0, str(SRC_DIR))

from peach.interface_text import dev as t  # noqa: E402

from . import test_evidence  # noqa: E402


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=t("machine_lock.description"),
                                     formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--wait", type=float, default=3600, help=t("machine_lock.waitHelp"))
    parser.add_argument("command", nargs=argparse.REMAINDER)
    args = parser.parse_args(argv)
    command = args.command[1:] if args.command[:1] == ["--"] else args.command
    if not command:
        parser.error(t("machine_lock.commandMissing"))
    lock = test_evidence.machine_lock_path()
    try:
        with test_evidence.held(lock, wait_seconds=args.wait, scope=" ".join(command)[:120], root=str(ROOT)):
            return subprocess.run(command, check=False).returncode
    except test_evidence.Timeout:
        print(t("machine_lock.timedOut", seconds=f"{args.wait:g}", holder=test_evidence.describe_holder(lock)),
              flush=True)
        return 2


if __name__ == "__main__":
    raise SystemExit(main())
