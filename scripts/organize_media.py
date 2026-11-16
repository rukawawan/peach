#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""按模板整理文件名与目录（ADR-0039）。

和数据管理页上那一块是同一份实现（`peach.organize`）：模板解析、计划生成、执行与回滚
只有一处，命令行和界面看到的结果因此必然一致。

默认只出计划 CSV。`--apply` 走 `peach.scripting` 的标准门槛：必须同时给 `--backup`，
备份用 SQLite 备份 API 落盘，写完跑 `integrity_check` 与 `foreign_key_check`。

用法:
    python scripts/organize_media.py --location 115 --file-template '{number}[ {title}]'
    python scripts/organize_media.py --location 115 --file-template '…' --apply --backup <落点>
    python scripts/organize_media.py --rollback-last --apply --backup <落点>
"""
from __future__ import annotations

import argparse
import sys
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent.parent
SRC_DIR = PROJECT_ROOT / "src"
if str(SRC_DIR) not in sys.path:
    sys.path.insert(0, str(SRC_DIR))

from peach import interface_text, junk, organize
from peach.config import DATABASE_PATH, GENERATED_DIR
from peach.interface_text import dev as t
from peach.media_sources import SCANNABLE_LOCATIONS
from peach.organize_templates import PLACEHOLDERS, TemplateError
from peach.platform import location_roots
from peach.scripting import add_ledger_write_args, open_for_write, verify_after_write


def _server_text(code: str) -> str:
    """产品资源里的一句（占位符名、跳过原因），按本机语言取。"""
    return interface_text.text(f"server:{code}", None, interface_text.local_language())


def build_parser() -> argparse.ArgumentParser:
    placeholders = [
        f"{{{key}}}={_server_text(f'labels.organizeTemplates.placeholder.{key}')}" for key in PLACEHOLDERS]
    parser = argparse.ArgumentParser(
        description=t("organize_media.description"),
        epilog=t("organize_media.placeholders", items=placeholders))
    add_ledger_write_args(parser, db_default=DATABASE_PATH)
    parser.add_argument("--location", choices=SCANNABLE_LOCATIONS, default="local")
    parser.add_argument("--file-template", default="", help=t("organize_media.fileTemplateHelp"))
    parser.add_argument("--dir-template", default="",
                        help=t("organize_media.dirTemplateHelp"))
    parser.add_argument("--generated-root", type=Path, default=GENERATED_DIR,
                        help=t("organize_media.generatedRootHelp"))
    parser.add_argument("--rollback-last", action="store_true",
                        help=t("organize_media.rollbackLastHelp"))
    return parser


def _report_plan(plan: dict) -> None:
    counts = plan["counts"]
    print(t("organize_media.planSummary", total=counts["total"], change=counts["change"],
            unchanged=counts["unchanged"], skip=counts["skip"]))
    codes = plan.get("reason_codes", {})
    for reason, count in sorted(plan["reasons"].items(), key=lambda item: -item[1]):
        label = _server_text(codes[reason]) if reason in codes else reason
        print(t("organize_media.reasonCount", reason=label, count=count))


def run(args: argparse.Namespace) -> int:
    connection = open_for_write(args)
    try:
        baseline = {tuple(row) for row in connection.execute('PRAGMA foreign_key_check')}
        if args.rollback_last:
            latest = organize.latest_batch(args.generated_root)
            if latest is None:
                print(t("organize_media.noBatch"))
                return 0
            print(t("organize_media.lastBatch", batch=latest))
            if not args.apply:
                print(t("organize_media.rollbackDryRun"))
                return 0
            result = organize.rollback_batch(connection, latest)
            print(t("organize_media.rolledBack", restored=result["restored"], failed=result["failed"]))
            for failure in result["failures"]:
                print(t("organize_media.failure", path=failure["path"], reason=failure["reason"]))
        else:
            if args.apply:
                checked = junk.isolate(args.db, roots=[(args.location, root)
                    for root in location_roots().get(args.location, ())])
                print(t("organize_media.junkCheck", isolated=checked["isolated"], review=checked["review"]))
            plan = organize.build_plan(
                connection, location=args.location,
                file_template=args.file_template, dir_template=args.dir_template)
            path = organize.plan_path(args.generated_root, args.location)
            organize.write_plan(path, plan["rows"])
            _report_plan(plan)
            print(f"→ {path}")
            if not args.apply:
                print(t("organize_media.planDryRun"))
                return 0
            result = organize.apply_plan(connection, plan["rows"],
                                         generated_root=args.generated_root)
            print(t("organize_media.organized", moved=result["moved"], failed=result["failed"]))
            for failure in result["failures"]:
                print(t("organize_media.failure", path=failure["path"], reason=failure["reason"]))
            print(t("organize_media.batchLog", path=result["log_path"]))
        integrity, _ = verify_after_write(connection)
        introduced = {tuple(row) for row in connection.execute('PRAGMA foreign_key_check')} - baseline
        if integrity != "ok" or introduced:
            print(t("organize_media.verifyFailed", integrity=integrity, introduced=len(introduced)))
            return 2
        print(t("organize_media.verified", count=len(baseline)))
        return 0
    finally:
        connection.close()


def main(argv: list[str] | None = None) -> int:
    args = build_parser().parse_args(argv)
    try:
        return run(args)
    except (TemplateError, organize.OrganizeError) as error:
        print(f"[stop] {error}")
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
