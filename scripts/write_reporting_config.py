#!/usr/bin/env python3
"""把构建环境里的公开 Sentry DSN 写成包根 `sentry.json`，Windows 与 macOS 打包共用。

只读环境变量 `PEACH_SENTRY_DSN` 与 `PEACH_LIBRARY_SENTRY_DSN`，不读检出里的 `sentry.json`。
本地构建缺 DSN 时写空值，安装后显示上传服务未配置；发行构建带 `--require`，
缺失、格式不合法或两项指向同一 Sentry 项目都直接失败，不产出静默的安装包。
"""
from __future__ import annotations

import argparse
import json
import os
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "src"))

from peach import library_sharing, remote_reporting
from peach.interface_text import dev as t

TARGETS = {"dsn": "PEACH_SENTRY_DSN", "library_dsn": "PEACH_LIBRARY_SENTRY_DSN"}


def reporting_config(*, require: bool = False) -> dict[str, str]:
    config = {key: os.environ.get(name, "").strip() for key, name in TARGETS.items()}
    if not require:
        return config
    missing = [name for key, name in TARGETS.items() if not config[key]]
    if missing:
        raise SystemExit(t("write_reporting_config.missingVariables",
                           names=missing))
    if remote_reporting.dsn() != config["dsn"]:
        raise SystemExit(t("write_reporting_config.badDsn"))
    if library_sharing.target() != config["library_dsn"]:
        raise SystemExit(t("write_reporting_config.badLibraryDsn"))
    return config


def write(output: Path, *, require: bool = False) -> Path:
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(reporting_config(require=require)), encoding="utf-8")
    return output


def main() -> int:
    parser = argparse.ArgumentParser(description=t("write_reporting_config.description"))
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--require", action="store_true", help=t("write_reporting_config.requireHelp"))
    args = parser.parse_args()
    print(write(args.output, require=args.require))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
