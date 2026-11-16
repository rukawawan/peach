#!/usr/bin/env python3
# -*- coding: utf-8 -*-
r"""番号目录被投影成创作者的清理器。

判定与清理在 `peach.code_creators`，复核页按同一套判据现算队列。本脚本是写这一步的
唯一入口：有文件级证据的那批由 `--apply` 带备份清掉，另外产出可复核、可重放的 CSV。

默认只产出复核 CSV，`--apply` 才写 ledger 且必须给 `--backup`。
"""
from __future__ import annotations

import argparse
import sqlite3
import sys
from collections import Counter
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent.parent
SRC_DIR = PROJECT_ROOT / "src"
if str(SRC_DIR) not in sys.path:
    sys.path.insert(0, str(SRC_DIR))

from peach.code_creators import FIELDS, apply_rows, collect
from peach.config import DATABASE_PATH, GENERATED_DIR
from peach.interface_text import dev as t
from peach.migrations import sqlite_backup
from peach.review_csv import write_rows


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description=t("audit_code_creators.description"))
    parser.add_argument("--db", type=Path, default=DATABASE_PATH)
    parser.add_argument("--review-csv", type=Path,
                        default=GENERATED_DIR / "code-creator-review.csv")
    parser.add_argument("--apply", action="store_true", help=t("audit_code_creators.applyHelp"))
    parser.add_argument("--backup", type=Path, help=t("audit_code_creators.backupHelp"))
    return parser


def run(args: argparse.Namespace) -> int:
    if args.apply and not args.backup:
        raise SystemExit(t("audit_code_creators.applyNeedsBackup"))
    connection = sqlite3.connect(args.db)
    rows = collect(connection)
    print(t("audit_code_creators.matched", count=len(rows)))
    print(t("audit_code_creators.verdicts", counts=dict(Counter(str(row["verdict"]) for row in rows))))

    if args.apply:
        sqlite_backup(args.db, args.backup)
        print(t("audit_code_creators.backedUp", path=args.backup))
        connection.execute("BEGIN IMMEDIATE")
        try:
            counts = apply_rows(connection, rows)
            connection.commit()
        except Exception:
            connection.rollback()
            raise
        print(t("audit_code_creators.written", links=counts['links'], entities=counts['entities'],
                codes=counts['codes'], flat=counts['flat']))
    connection.close()

    write_rows(args.review_csv, FIELDS, rows)
    print(t("audit_code_creators.reviewCsv", path=args.review_csv))
    if not args.apply:
        print(t("audit_code_creators.previewOnly"))
    return 0


def main(argv: list[str] | None = None) -> int:
    return run(build_parser().parse_args(argv))


if __name__ == "__main__":
    raise SystemExit(main())
