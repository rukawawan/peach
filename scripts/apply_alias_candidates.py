#!/usr/bin/env python3
# -*- coding: utf-8 -*-
r"""把 javdb 别名候选写进账本。

采集与落库分成两个脚本、两次授权：`harvest_javdb_cn_names.py --aliases` 出网抓页、
只产复核 CSV，这里读那份 CSV 写 `entity_alias`。中间那一步是人看一遍——候选带着
来源页地址和判定词，看的就是「这个写法确实是她的」。

写进去的是别名不是规范名，所以这里不碰 `entity.canonical_name`：多一个写法只是让
搜索、头像图库和合并判定多一条路走得通，改统称是另一回事（资料页上那个下拉）。
即便如此，`--apply` 仍要 `--backup`——别名表是身份的一部分，写歪了要有得退回去。

四种不写：

1. **这条实体已经有这个写法**（规范名或别名，按归一后的形比）。记 `held`。
2. **这个写法挂在另一条实体名下**。要么两条该合并、要么真有两位重名，都得人判，
   静默写下去只会给后面的合并判定多送一个假信号。记 `taken`。
3. **账本里这条实体的统称已经不是 CSV 里那个了**。CSV 是某一刻的快照；统称变过说明
   这个人后来被动过，候选该重新抓一遍再看。记 `stale`。
4. **实体不在了**，或者已经不是 performer。记 `gone`。

来源记 `peach.javdb.ALIAS_SOURCE@<--revision>`，与 `localize_performer_names.py` 写的那些
同一个形状。批次号不是装饰：解析判错时，认得出批次才能按 `source` 把那一趟整批撤回，
而写进去的名字混在一个裸来源里就只能一条条看。所以它必须在命令行里给。

界面上能撤销的只有 `user:alias` 那一类，这里写的不在其中：它是「这个名字在 javdb 的
资料页上」的记录，不给一次点击删掉。

同一份复核 CSV 也收别的站给的写法（`--alias-source` 记真实来源，如 Seesaa 的 `av_name`），
以及判定为 `remove`（旧版与手填的「删除」同样认）的行：那个写法被人看过、确认不是她，从这条实体上摘掉。
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
sys.path.append(str(Path(__file__).resolve().parent))

from peach import javdb   # noqa: E402
from peach.config import GENERATED_DIR   # noqa: E402
from peach.entities import normalize_entity_name   # noqa: E402
from peach.interface_text import dev as t   # noqa: E402
from peach.review_csv import read_rows, write_rows   # noqa: E402
from peach.scripting import (   # noqa: E402
    add_ledger_write_args, counts_of, open_for_write, verify_after_write)
from legacy_values import ALIAS_CANDIDATE_VERDICTS   # noqa: E402

#: 复核 CSV `action` 列：写入、已有、被别的实体占用、统称已变、查无此人、归一后是空名。
WRITE, HAVE, TAKEN, STALE, GONE, BAD = "write", "held", "taken", "stale", "gone", "empty-name"
#: 判定为 `remove` 的行把这个写法从这条实体上摘掉，不论它是哪个来源写的：javdb 与 Wiki 的
#: 「別名」栏都混有共演男优名（`島修也` 挂在皆月ひかる 名下）。摘掉前的来源写进复核
#: CSV 的 detail，要退回时照着补。人手填的「删除」与旧版判定词读入时先归一（`verdict_of`）。
REMOVE_VERDICT = "remove"
#: `action` 列：摘掉、名下本来就没有这个写法。
REMOVE, ABSENT = "remove", "absent"

FIELDS = ("entity_id", "current_name", "alias", "origin", "verdict", "url",
          "action", "detail")

#: 本脚本自己关心的口径；基础计数由 `scripting.counts_of` 给。前缀比对而不是相等：
#: 每一趟的来源都带自己的批次号，按相等数永远是 0。
EXTRA_COUNTS = {
    "performer": "SELECT count(*) FROM entity WHERE kind='performer'",
    "javdb_alias": ("SELECT count(*) FROM entity_alias WHERE source LIKE "
                    f"'{javdb.ALIAS_SOURCE}%'"),
}


def source_for(revision: str, base: str = javdb.ALIAS_SOURCE) -> str:
    """这一趟写进 `entity_alias.source` 的串。候选不是 javdb 抓的时，`base` 记真实来源。"""
    return f"{base}@{revision}"


def verdict_of(value) -> str:
    """候选判定词；旧版脚本写的与人手填的中文先归一成英文 id。"""
    value = str(value or "").strip()
    return ALIAS_CANDIDATE_VERDICTS.get(value, value)


def accepted(rows: list[dict], verdicts: list[str]) -> list[dict]:
    """判定词在 `--accept` 里、且真有别名可写的那些行；两边的旧中文判定词都先归一。"""
    wanted = {verdict_of(value) for value in verdicts}
    return [row for row in rows
            if verdict_of(row.get("verdict")) in wanted
            and str(row.get("alias", "")).strip()]


def plan(connection: sqlite3.Connection, rows: list[dict]) -> list[dict]:
    """逐行判该不该写，以及为什么。不写库。

    同一份 CSV 里同一个写法可能出现两次（两条实体各自抓到同一个名字）。这里不去重：
    第二条会在第一条写完之后撞上 `taken`，那正是该让人看见的东西。
    """
    out = []
    for row in rows:
        alias = str(row.get("alias", "")).strip()
        entity_id = int(str(row.get("entity_id", "0")).strip() or 0)
        planned = {"entity_id": entity_id, "current_name": row.get("current_name", ""),
                   "alias": alias, "origin": row.get("origin", ""),
                   "verdict": row.get("verdict", ""), "url": row.get("url", "")}
        alias_key = normalize_entity_name(alias)
        if not alias_key:
            out.append({**planned, "action": BAD, "detail": t("apply_alias_candidates.emptyAfterNormalize")})
            continue
        entity = connection.execute(
            "SELECT canonical_name,normalized_name FROM entity WHERE id=? AND kind='performer'",
            (entity_id,)).fetchone()
        if not entity:
            out.append({**planned, "action": GONE, "detail": t("apply_alias_candidates.entityGone", id=entity_id)})
            continue
        canonical, canonical_key = str(entity[0]), str(entity[1])
        if canonical_key != normalize_entity_name(str(row.get("current_name", ""))):
            out.append({**planned, "action": STALE,
                        "detail": t("apply_alias_candidates.renamedSince", name=canonical)})
            continue
        if verdict_of(row.get("verdict")) == REMOVE_VERDICT:
            sources = [str(found[0]) for found in connection.execute(
                "SELECT source FROM entity_alias WHERE entity_id=? AND normalized_alias=?",
                (entity_id, alias_key))]
            out.append({**planned, "action": REMOVE, "detail": t(
                "apply_alias_candidates.sourcesBeforeRemoval", sources=list(sources))}
                       if sources else {**planned, "action": ABSENT,
                                        "detail": t("apply_alias_candidates.absent", name=canonical)})
            continue
        if alias_key == canonical_key or connection.execute(
                "SELECT 1 FROM entity_alias WHERE entity_id=? AND normalized_alias=? LIMIT 1",
                (entity_id, alias_key)).fetchone():
            out.append({**planned, "action": HAVE, "detail": t("apply_alias_candidates.alreadyHas", name=canonical)})
            continue
        owner = connection.execute(
            "SELECT e.id,e.canonical_name FROM entity e"
            " WHERE e.kind='performer' AND e.id<>? AND (e.normalized_name=?"
            "   OR EXISTS(SELECT 1 FROM entity_alias a"
            "             WHERE a.entity_id=e.id AND a.normalized_alias=?))"
            " ORDER BY e.id LIMIT 1",
            (entity_id, alias_key, alias_key)).fetchone()
        if owner:
            out.append({**planned, "action": TAKEN,
                        "detail": t("apply_alias_candidates.takenBy", name=owner[1], id=owner[0])})
            continue
        out.append({**planned, "action": WRITE, "detail": t("apply_alias_candidates.addAlias", name=canonical)})
    return out


def apply_rows(connection: sqlite3.Connection, rows: list[dict], revision: str, *,
               base: str = javdb.ALIAS_SOURCE) -> int:
    """写判成 `写入` 的那些行。返回真正落下去的条数。"""
    written = 0
    for row in rows:
        if row["action"] != WRITE:
            continue
        alias = str(row["alias"])
        connection.execute(
            "INSERT INTO entity_alias(entity_id,alias,normalized_alias,source,confidence)"
            " VALUES(?,?,?,?,1.0)",
            (int(row["entity_id"]), alias, normalize_entity_name(alias),
             source_for(revision, base)))
        written += connection.execute("SELECT changes()").fetchone()[0]
    return written


def remove_rows(connection: sqlite3.Connection, rows: list[dict]) -> int:
    """摘掉判成 `删除` 的那些写法。返回真正删掉的条数。"""
    removed = 0
    for row in rows:
        if row["action"] != REMOVE:
            continue
        connection.execute(
            "DELETE FROM entity_alias WHERE entity_id=? AND normalized_alias=?",
            (int(row["entity_id"]), normalize_entity_name(str(row["alias"]))))
        removed += connection.execute("SELECT changes()").fetchone()[0]
    return removed


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description=t("apply_alias_candidates.description"))
    add_ledger_write_args(parser)
    parser.add_argument("--candidates", type=Path, required=True,
                        help=t("apply_alias_candidates.candidatesHelp"))
    parser.add_argument("--accept", default="ok",
                        help=t("apply_alias_candidates.acceptHelp"))
    parser.add_argument("--revision", required=True,
                        help=t("apply_alias_candidates.revisionHelp"))
    parser.add_argument("--alias-source", default=javdb.ALIAS_SOURCE,
                        help=t("apply_alias_candidates.aliasSourceHelp"))
    parser.add_argument("--review-csv", type=Path,
                        default=GENERATED_DIR / "javdb-alias-apply.csv")
    return parser


def run(args: argparse.Namespace) -> int:
    verdicts = [part.strip() for part in str(args.accept).split(",") if part.strip()]
    candidates = accepted(read_rows(args.candidates), verdicts)
    connection = open_for_write(args)
    try:
        rows = plan(connection, candidates)
        write_rows(args.review_csv, FIELDS, rows, fill_missing=True)
        counts = Counter(str(row["action"]) for row in rows)
        print(t("apply_alias_candidates.planned", count=len(rows),
                verdicts=list(verdicts), path=args.review_csv))
        print(t("apply_alias_candidates.actions", counts=dict(counts)))
        for row in rows:
            if row["action"] in (TAKEN, STALE, GONE, REMOVE, ABSENT):
                print(t("apply_alias_candidates.flaggedRow", action=row['action'], name=row['current_name'],
                        alias=row['alias'], detail=row['detail'], url=row['url']))
        if not args.apply:
            print(t("apply_alias_candidates.dryRun"))
            return 0

        print(t("apply_alias_candidates.backedUp", path=args.backup))
        before = counts_of(connection, EXTRA_COUNTS)
        with connection:
            written = apply_rows(connection, rows, args.revision, base=args.alias_source)
            removed = remove_rows(connection, rows)
        after = counts_of(connection, EXTRA_COUNTS)
        integrity, foreign_keys = verify_after_write(connection)
        print(t("apply_alias_candidates.written", written=written,
                source=source_for(args.revision, args.alias_source), removed=removed))
        for name in before:
            print(f"    {name}: {before[name]} -> {after[name]}")
        print(t("apply_alias_candidates.selfCheck", integrity=integrity, foreignKeys=foreign_keys))
        # 服务把实体页缓存在进程里，失效只由自己的写入端点触发。这一趟是从外面写的，
        # 页面上要看见新名字得让服务重起一次。
        print(t("apply_alias_candidates.restartNeeded"))
        return 1 if integrity != "ok" or foreign_keys else 0
    finally:
        connection.close()


def main(argv: list[str] | None = None) -> int:
    return run(build_parser().parse_args(argv))


if __name__ == "__main__":
    raise SystemExit(main())
