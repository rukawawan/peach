#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""用已保存的 r18.dev 日文原文替换早期自动落库的英文回退值。

只处理归属仍为 ``auto:r18dev`` 的 ``catalog_title`` / ``series``，并要求当前值与
同一份原始快照里的英文值完全一致，且目标确实含日文。r18.dev 的机翻标记会漏标，
所以它只进入审计记录，不作为是否修复的门槛。用户填写、人工复核、快照缺失、番号
不一致或英文值已被改过的字段都只记入审计 CSV，不写 ledger。默认 dry-run；真实写入
必须同时给 ``--apply --backup``。

同一批自动落库还按英文名建了系列与女优实体，详情页的身份区读的是实体规范名，只修
``asset`` 的扁平字段时页面上照样是英文。所以第二遍看实体：由 r18 来源建出、规范名
不含日文的系列与女优，拿挂在它名下的作品的快照找出同一个名字的日文写法（系列取
``series_name_ja``，女优按罗马字对上 ``name_kanji``）。有一份快照的日文那一侧就写着
这个拉丁字母名时，它是原名（``RARA``），不改。日文名已是另一条同类实体的规范名或别名
（账本里已有的中文名多半把日文写法记成了别名）时只报 ``merge-needed``，不合并。
改名同时把英文旧名留作别名、改写扁平投影，审计写进 ``--entity-audit-csv``。厂牌不在
这一遍：账本的厂牌实体本来就用品牌名（``Prestige``），见 ``peach.sources.r18dev``。
"""
from __future__ import annotations

import argparse
import sys
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent.parent
SRC_DIR = PROJECT_ROOT / "src"
if str(SRC_DIR) not in sys.path:
    sys.path.insert(0, str(SRC_DIR))

from peach.config import GENERATED_DIR, SOURCES_DIR
from peach.interface_text import dev as t
from peach.review_csv import write_rows
from peach.scripting import add_ledger_write_args, counts_of, open_for_write, verify_after_write


from peach.r18_legacy_repair import (FIELDS, ENTITY_FIELDS, collect, apply_rows, collect_entities, apply_entity_rows)


EXTRA_COUNTS = {
    "asset_tag": "SELECT count(*) FROM asset_tag",
    "r18_machine_fields": "SELECT count(*) FROM asset "
    "WHERE json_extract(COALESCE(field_owners,'{}'),'$.catalog_title')='auto:r18dev' "
    "OR json_extract(COALESCE(field_owners,'{}'),'$.series')='auto:r18dev'",
    "series_entities": "SELECT count(*) FROM entity WHERE kind='series'",
    "entity_aliases": "SELECT count(*) FROM entity_alias",
}


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description=t("repair_r18_machine_translations.description"))
    add_ledger_write_args(parser)
    parser.add_argument(
        "--snapshots", type=Path,
        default=SOURCES_DIR / "library-metadata",
        help=t("repair_r18_machine_translations.snapshotsHelp"),
    )
    parser.add_argument(
        "--audit-csv", type=Path,
        default=GENERATED_DIR / "r18-machine-translation-repair.csv",
    )
    parser.add_argument(
        "--javinizer-snapshots", type=Path,
        default=SOURCES_DIR / "metadata" / "javinizer-go",
        help=t("repair_r18_machine_translations.javinizerSnapshotsHelp"),
    )
    parser.add_argument(
        "--entity-audit-csv", type=Path,
        default=GENERATED_DIR / "r18-machine-translation-entities.csv",
    )
    return parser


def run(args: argparse.Namespace) -> int:
    connection = open_for_write(args)
    connection.execute("PRAGMA foreign_keys=ON")
    try:
        rows = collect(connection, args.snapshots)
        write_rows(args.audit_csv, FIELDS, rows, atomic=True, fill_missing=True)
        distribution = Counter(str(row["action"]) for row in rows)
        reasons = Counter(str(row["reason"]) for row in rows if row["action"] != "replace")
        print(t("repair_r18_machine_translations.fieldsAudited", count=len(rows), path=args.audit_csv))
        print(t("repair_r18_machine_translations.actions", counts=dict(distribution)))
        if reasons:
            print(t("repair_r18_machine_translations.skipReasons", counts=dict(reasons)))
        entity_rows = collect_entities(connection, args.snapshots, args.javinizer_snapshots)
        write_rows(args.entity_audit_csv, ENTITY_FIELDS, entity_rows, atomic=True, fill_missing=True)
        print(t("repair_r18_machine_translations.entitiesAudited", count=len(entity_rows), path=args.entity_audit_csv))
        print(t("repair_r18_machine_translations.actions", counts=dict(Counter(str(row["action"]) for row in entity_rows))))
        for row in entity_rows:
            if row["action"] != "skip":
                print(f"    [{row['action']}] {row['kind']} #{row['entity_id']} "
                      f"{row['current']} -> {row['target']}")
        if not args.apply:
            print(t("repair_r18_machine_translations.dryRun"))
            return 0

        print(t("repair_r18_machine_translations.backedUp", path=args.backup))
        before = counts_of(connection, EXTRA_COUNTS)
        stamp = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
        with connection:
            changed = apply_rows(connection, rows)
            entities = apply_entity_rows(connection, entity_rows, stamp)
        after = counts_of(connection, EXTRA_COUNTS)
        integrity, foreign_keys = verify_after_write(connection)
        print(t("repair_r18_machine_translations.written", fields=changed, entities=dict(entities)))
        for key in before:
            print(f"    {key}: {before[key]} -> {after[key]}")
        print(t("repair_r18_machine_translations.selfCheck", integrity=integrity, foreignKeys=foreign_keys))
        return 1 if integrity != "ok" or foreign_keys else 0
    finally:
        connection.close()


def main(argv: list[str] | None = None) -> int:
    return run(build_parser().parse_args(argv))


if __name__ == "__main__":
    raise SystemExit(main())
