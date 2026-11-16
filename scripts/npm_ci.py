"""安装锁定的 npm 依赖，仅对明确的临时下载错误有限重试。"""
from __future__ import annotations

import argparse
from pathlib import Path
import re
import shutil
import subprocess
import sys
import time

PROJECT_ROOT = Path(__file__).resolve().parent.parent
SRC_DIR = PROJECT_ROOT / "src"
if str(SRC_DIR) not in sys.path:
    sys.path.insert(0, str(SRC_DIR))

from peach.interface_text import dev as t  # noqa: E402

TRANSPORT_ERROR = re.compile(r"(?m)^npm (?:error|ERR!) code (?:ECONNRESET|ETIMEDOUT|EAI_AGAIN)\s*$")


def install(project: Path, *, ignore_scripts: bool = False, runner=subprocess.run, sleep=time.sleep) -> int:
    command = [shutil.which("npm") or "npm", "ci", "--prefer-offline"]
    if ignore_scripts:
        command.append("--ignore-scripts")
    for attempt in range(3):
        result = runner(command, cwd=project, capture_output=True, text=True, encoding="utf-8", errors="replace")
        print(result.stdout, end="", flush=True)
        print(result.stderr, end="", file=sys.stderr, flush=True)
        if result.returncode == 0:
            return 0
        if attempt == 2 or not TRANSPORT_ERROR.search(result.stderr):
            return result.returncode
        print(t("npm_ci.retrying", attempt=attempt + 1), flush=True)
        sleep(5 * (attempt + 1))
    return 1


def main() -> int:
    parser = argparse.ArgumentParser(description=t("npm_ci.description"))
    parser.add_argument("--prefix", type=Path, default=Path("."))
    parser.add_argument("--ignore-scripts", action="store_true")
    args = parser.parse_args()
    return install(args.prefix.resolve(), ignore_scripts=args.ignore_scripts)


if __name__ == "__main__":
    raise SystemExit(main())
