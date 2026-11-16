#!/usr/bin/env python3
# -*- coding: utf-8 -*-
r"""把账本里的退役标签名改成规范名，撤掉的粗桶整条删掉。

名单与判据在 `peach.catalog_rules.RETIRED_TAGS` 与 `peach.tag_renames`，页面上那些
「同一件事两行」就是按这张表消掉的。本脚本是写这一步的唯一入口。

默认只产出复核 CSV，`--apply` 才写 ledger 且必须给 `--backup`。
"""
from __future__ import annotations

import argparse
import sys
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent.parent
SRC_DIR = PROJECT_ROOT / "src"
if str(SRC_DIR) not in sys.path:
    sys.path.insert(0, str(SRC_DIR))

from peach.config import GENERATED_DIR
from peach.interface_text import dev as t
from peach.review_csv import write_rows
from peach.scripting import add_ledger_write_args, counts_of, open_for_write, verify_after_write
from peach.tag_renames import FIELDS, apply_rows, collect


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description=t("rename_retired_tags.description"))
    add_ledger_write_args(parser)
    parser.add_argument("--review-csv", type=Path,
                        default=GENERATED_DIR / "retired-tag-rename.csv")
    return parser


def run(args: argparse.Namespace) -> int:
    connection = open_for_write(args)
    try:
        rows = collect(connection)
        total = sum(row["assets"] + row["merged"] for row in rows)
        kept = sum(row["raw_kept"] for row in rows)
        print(t("rename_retired_tags.summary", names=len(rows), total=total, kept=kept))
        for row in rows:
            if row["new"] and (row["assets"] or row["merged"]):
                print(t("rename_retired_tags.renameRow", old=row['old'], new=row['new'], assets=row['assets'],
                        merged=row['merged'], entity=row['entity'] or t("rename_retired_tags.none")))
            elif row["assets"]:
                print(t("rename_retired_tags.dropRow", old=row['old'], assets=row['assets'],
                        entity=row['entity'] or t("rename_retired_tags.none")))

        if args.apply:
            before = counts_of(connection, {"asset_tag": "SELECT count(*) FROM asset_tag"})
            connection.execute("BEGIN IMMEDIATE")
            try:
                counts = apply_rows(connection, rows)
                connection.commit()
            except Exception:
                connection.rollback()
                raise
            after = counts_of(connection, {"asset_tag": "SELECT count(*) FROM asset_tag"})
            integrity, violations = verify_after_write(connection)
            print(t("rename_retired_tags.written", tags=counts['tags'], dropped=counts['dropped'],
                    entities=counts['entities']))
            print(t("rename_retired_tags.counts", tags_before=before['asset_tag'], tags_after=after['asset_tag'],
                    entities_before=before['entity'], entities_after=after['entity']))
            print(t("rename_retired_tags.selfCheck", integrity=integrity, violations=violations))
    finally:
        connection.close()

    write_rows(args.review_csv, FIELDS, rows)
    print(t("rename_retired_tags.reviewCsv", path=args.review_csv))
    if not args.apply:
        print(t("rename_retired_tags.preview"))
    return 0


def main(argv: list[str] | None = None) -> int:
    return run(build_parser().parse_args(argv))


if __name__ == "__main__":
    raise SystemExit(main())
