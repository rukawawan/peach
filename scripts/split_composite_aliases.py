#!/usr/bin/env python3
# -*- coding: utf-8 -*-
r"""把一格装了多个艺名的别名拆成一人多名。

r18.dev 的罗马字字段本身就是 `现用名 (曾用名, 曾用名)` 这个渲染格式，导入时一个字段
写一行，于是 `Ako Momona (Kou Akemi, Mari Koizumi)` 整串成了一条别名。它做别名是死的：
按任何一段都搜不到，选成统称更不成立。同一条实体的假名和汉字写法本来就各自成行，缺的
只是这几个罗马字，所以拆开是补信息，不是丢信息。

**只拆罗马字人名这一种形状**（判据见 `peach.entities.COMPOSITE_PERSON_NAME`）。账本里
「名字后面跟一对括号」的还有四类完全不同的东西，一律不动，只写进复核 CSV 交人工：

- `AV DEBUT（本物人妻）`：括号里是厂牌，用来把三个同名系列分开。拆了就撞成一个。
- `アスナ(SAO)`：角色标签的出处消歧，账本里有五百多条。
- `快慢扳机（接稿中）`、`るかぴあ（X：復帰しました）`：括号里是接稿状态或公告。
- `kitty(1)`、`Mana(23)`：去重后缀或数字。

形状分不开的那些交人工：在复核 CSV 里把 `verdict` 改成 `split`（别名拆成几条）或
`strip`（规范名换成 `target`，旧名留作别名），填好 `target`，再用 `--from-review` 跑。

拆分不可逆。默认只产出复核 CSV，`--apply` 才写 ledger 且必须给 `--backup`。
"""
from __future__ import annotations

import argparse
import sqlite3
import sys
import time
from collections import Counter
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent.parent
SRC_DIR = PROJECT_ROOT / "src"
if str(SRC_DIR) not in sys.path:
    sys.path.insert(0, str(SRC_DIR))

from peach.config import GENERATED_DIR   # noqa: E402
from peach.entities import (   # noqa: E402
    normalize_entity_name, rewrite_flat_projection,
)
from peach.interface_text import dev as t   # noqa: E402
from peach.review_csv import read_rows, write_rows   # noqa: E402
from peach.scripting import (   # noqa: E402
    add_ledger_write_args, counts_of, open_for_write, verify_after_write,
)

#: 只有人名实体才可能出现「一个人的多个艺名」。系列、厂牌和标签的括号是别的意思。
from peach.composite_alias_repair import (FIELDS, CLEANUP_SOURCE, EXTRA_COUNTS, collect, apply_rows, _blocked)


def apply_review(connection: sqlite3.Connection,
                 rows: list[dict[str, str]]) -> dict[str, object]:
    """按人工填好的 `verdict` 与 `target` 改名字。

    `split`：把一条别名换成 `target` 里那几条，来源不变。
    `strip`：把规范名换成 `target` 的第一段，旧名留作别名，扁平投影跟着改。
    """
    done = {"split": 0, "strip": 0, "flat": 0, "blocked": []}
    for row in rows:
        verdict = str(row.get("verdict", "")).strip()
        targets = [part.strip() for part in str(row.get("target", "")).split("|")
                   if part.strip()]
        if verdict not in {"split", "strip"} or not targets:
            continue
        entity_id, value = int(row["entity_id"]), str(row["value"])
        blocked = _blocked(connection, entity_id, targets)
        if blocked:
            done["blocked"].append(t("split_composite_aliases.blocked", value=value, reason=blocked))
            continue
        if verdict == "split":
            source = str(row.get("source", ""))
            for target in targets:
                connection.execute(
                    "INSERT OR IGNORE INTO entity_alias"
                    "(entity_id,alias,normalized_alias,source) VALUES(?,?,?,?)",
                    (entity_id, target, normalize_entity_name(target), source))
            connection.execute(
                "DELETE FROM entity_alias WHERE entity_id=? AND alias=? AND source=?",
                (entity_id, value, source))
            done["split"] += 1
            continue
        target = targets[0]
        stamp = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
        connection.execute(
            "UPDATE entity SET canonical_name=?,normalized_name=?,updated_at=? WHERE id=?",
            (target, normalize_entity_name(target), stamp, entity_id))
        # 旧名留作别名：它是这条实体真的用过的写法，也是回退的入口。
        connection.execute(
            "INSERT OR IGNORE INTO entity_alias"
            "(entity_id,alias,normalized_alias,source,confidence) VALUES(?,?,?,?,1.0)",
            (entity_id, value, normalize_entity_name(value), CLEANUP_SOURCE))
        done["flat"] += rewrite_flat_projection(
            connection, str(row["kind"]), entity_id, value, target)
        done["strip"] += 1
    return done


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description=t("split_composite_aliases.description"),
                                     formatter_class=argparse.RawDescriptionHelpFormatter)
    add_ledger_write_args(parser)
    parser.add_argument("--review-csv", type=Path,
                        default=GENERATED_DIR / "review" / "composite-names.csv",
                        help=t("split_composite_aliases.reviewCsvHelp"))
    parser.add_argument("--from-review", type=Path,
                        help=t("split_composite_aliases.fromReviewHelp"))
    return parser


def _report(before: dict[str, int], after: dict[str, int],
            connection: sqlite3.Connection) -> int:
    _integrity, violations = verify_after_write(connection)
    for key in before:
        mark = "" if before[key] == after[key] else t("split_composite_aliases.changed")
        print(f"    {key}: {before[key]} -> {after[key]}{mark}")
    print(t("split_composite_aliases.foreignKeyViolations", count=violations))
    return 1 if violations else 0


def run_review(args: argparse.Namespace) -> int:
    connection = open_for_write(args)
    try:
        rows = read_rows(args.from_review)
        acting = [row for row in rows
                  if str(row.get("verdict", "")).strip() in {"split", "strip"}]
        print(t("split_composite_aliases.reviewedRows", count=len(acting), path=args.from_review))
        for row in acting:
            print(f"    {row['verdict']} [{row['entity_id']}] {row['value']}"
                  f" -> {row['target']}")
        if not args.apply:
            print(t("split_composite_aliases.notWritten"))
            return 0
        print(t("split_composite_aliases.backedUp", path=args.backup))
        before = counts_of(connection, EXTRA_COUNTS)
        with connection:
            done = apply_review(connection, acting)
        after = counts_of(connection, EXTRA_COUNTS)
        print(t("split_composite_aliases.result"), done)
        return _report(before, after, connection)
    finally:
        connection.close()


def run(args: argparse.Namespace) -> int:
    if args.from_review:
        return run_review(args)
    connection = open_for_write(args)
    try:
        rows = collect(connection)
        write_rows(args.review_csv, FIELDS, rows)
        verdicts = Counter(str(row["verdict"]) for row in rows)
        print(t("split_composite_aliases.bracketedNames", count=len(rows), path=args.review_csv))
        print(t("split_composite_aliases.verdicts"), dict(verdicts))
        for row in rows:
            if row["verdict"] == "auto":
                print(t("split_composite_aliases.autoSplit", id=row["entity_id"],
                        name=row["canonical_name"], value=row["value"], parts=row["parts"]))
        by_kind = Counter(f"{row['kind']}/{row['field']}" for row in rows
                          if row["verdict"] != "auto")
        print(t("split_composite_aliases.forReview"), dict(by_kind))
        if not args.apply:
            print(t("split_composite_aliases.notWritten"))
            return 0

        print(t("split_composite_aliases.backedUp", path=args.backup))
        before = counts_of(connection, EXTRA_COUNTS)
        with connection:
            moved = apply_rows(connection, rows)
        after = counts_of(connection, EXTRA_COUNTS)
        print(t("split_composite_aliases.splitResult"), moved)
        return _report(before, after, connection)
    finally:
        connection.close()


def main() -> int:
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    return run(build_parser().parse_args())


if __name__ == "__main__":
    raise SystemExit(main())
