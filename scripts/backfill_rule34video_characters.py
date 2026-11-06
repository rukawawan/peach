#!/usr/bin/env python3
# -*- coding: utf-8 -*-
r"""把已入库的 rule34video 追更条目里站方单列的角色改记成 `character`。

详情页的角色和普通标签都是 `a.tag_item`，只有外层 `.vp-group--characters` 分组不同。
旧解析把它们全记成 general，角色名因此混在关注卡片的内容标签里。有 `tag_types` 的行
不再进详情页探测（`follow_store._ENRICHED_PREDICATES["tag_types"]`），常规检查改不回来，
所以要这一趟。判据不重写，直接复用 `Rule34VideoConnector._detail`。

只改一件事：站方列进 Characters 组、库里已经记过类型的名字改成 `character`。别的类型、
标签列表、封面与日期一格不动；库里还没有 `tag_types` 的行留给常规检查补。

默认 dry-run，只写复核 CSV。`--apply` 必须同时给 `--backup`。`--resume` 跳过同一份
CSV 里已经写入或确认无需改动的条目。
"""
from __future__ import annotations

import argparse
import json
import sqlite3
import sys
import time
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent.parent
SRC_DIR = PROJECT_ROOT / "src"
if str(SRC_DIR) not in sys.path:
    sys.path.insert(0, str(SRC_DIR))

import httpx

from peach.config import GENERATED_DIR
from peach.follow_sources import (
    FollowSourceError, FollowSourceRateLimited, Rule34VideoConnector, build_connector,
)
from peach.review_csv import read_rows, write_rows
from peach.scripting import (
    BACKUP_REQUIRED, add_ledger_write_args, open_for_write, open_readonly,
)

FIELDS = ("item_id", "external_id", "result", "characters", "written", "note")
#: 详情页的最小请求间隔。站方没有公布限流口径，按常规检查的节奏留余量。
DEFAULT_DELAY = 1.0
#: 被 429 挡回时静默多久；连续这么多次就停下，留给下一趟 `--resume`。
COOLDOWN_SECONDS = 120.0
RATE_LIMIT_STOP = 3
FLUSH_EVERY = 50
#: 续跑跳过的结果：写过的，以及问过确认没有要改的。
SETTLED = frozenset({"无需改动"})


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="把 rule34video 追更条目里站方单列的角色改记成 character")
    add_ledger_write_args(parser)
    parser.add_argument("--out", type=Path,
                        default=GENERATED_DIR / "rule34video-character-backfill.csv")
    parser.add_argument("--limit", type=int, default=0, help="只处理前 N 条，0 为全部")
    parser.add_argument("--delay", type=float, default=DEFAULT_DELAY)
    parser.add_argument("--resume", action="store_true",
                        help="跳过 --out 里已经写入或无需改动的条目，接着上一趟跑")
    return parser


def settled_ids(path: Path) -> set[int]:
    return {int(row["item_id"]) for row in read_rows(path, missing_ok=True)
            if (row.get("written") == "是" or row.get("result") in SETTLED)
            and str(row.get("item_id") or "").isdigit()}


def pending_rows(connection: sqlite3.Connection, limit: int,
                 done: set[int] = frozenset()) -> list[dict]:
    """待问条目：已经记过 `tag_types` 的 rule34video 条目，扣掉上一趟问定的。

    不按名字带不带括号筛：那是词形猜测，`melony` 这类不带括号的角色会漏。
    """
    rows = []
    for row in connection.execute(
            "SELECT i.id, i.external_id, i.url FROM follow_item i"
            " JOIN follow_source s ON s.id=i.source_id"
            " WHERE s.provider='rule34video'"
            " AND json_extract(i.metadata_json,'$.tag_types') IS NOT NULL ORDER BY i.id"):
        if row["id"] in done:
            continue
        rows.append({"id": row["id"], "external_id": str(row["external_id"] or ""),
                     "url": str(row["url"] or "")})
        if limit and len(rows) >= limit:
            break
    return rows


def characters_of(detail: dict) -> list[str]:
    types = (detail.get("extra") or {}).get("tag_types") or {}
    return [name for name, kind in types.items() if kind == "character"]


def retype(metadata: dict, characters: list[str]) -> dict | None:
    """库里这份 metadata 改完的样子；没有要改的就是 None。只改已经记过类型的名字。"""
    types = metadata.get("tag_types")
    if not isinstance(types, dict):
        return None
    changed = {name: "character" for name in characters
               if name in types and types[name] != "character"}
    if not changed:
        return None
    return {**metadata, "tag_types": {**types, **changed}}


def _apply(writer: sqlite3.Connection, item_id: int, characters: list[str]) -> bool:
    """在写事务里重读再改：服务的关注检查同时在写这一列，不拿 dry-run 时读到的旧值覆盖。"""
    writer.execute("BEGIN IMMEDIATE")
    row = writer.execute("SELECT metadata_json FROM follow_item WHERE id=?",
                         (item_id,)).fetchone()
    try:
        metadata = json.loads(row["metadata_json"] or "{}") if row else {}
    except ValueError:
        metadata = {}
    updated = retype(metadata, characters) if isinstance(metadata, dict) else None
    if updated is not None:
        writer.execute("UPDATE follow_item SET metadata_json=? WHERE id=?",
                       (json.dumps(updated, ensure_ascii=False), item_id))
    writer.commit()
    return updated is not None


def inspect_row(connector, reader: sqlite3.Connection, row: dict) -> tuple[dict, list[str]]:
    """问一条详情页。返回 CSV 行和要改记成角色的名字；取不到就是「未取得」，不写。"""
    entry = {"item_id": row["id"], "external_id": row["external_id"], "result": "",
             "characters": "", "written": "否", "note": ""}
    if not Rule34VideoConnector._VIDEO_RE.match(row["url"]):
        entry.update(result="跳过", note="url 不是详情页")
        return entry, []
    try:
        response = connector._get(row["url"], headers={"Accept": "text/html"})
        connector._raise_if_rate_limited(response)
        if response.status != 200:
            entry.update(result="未取得", note=f"HTTP {response.status}")
            return entry, []
        detail = Rule34VideoConnector._detail(response.body)
    except FollowSourceRateLimited:
        raise
    except (FollowSourceError, OSError, httpx.HTTPError, ValueError) as error:
        entry.update(result="未取得", note=f"{type(error).__name__}: {error}"[:120])
        return entry, []
    if not detail:
        entry.update(result="未取得", note="详情页没有解析出细节")
        return entry, []
    characters = characters_of(detail)
    current = reader.execute("SELECT metadata_json FROM follow_item WHERE id=?",
                             (row["id"],)).fetchone()
    try:
        metadata = json.loads(current["metadata_json"] or "{}") if current else {}
    except ValueError:
        metadata = {}
    updated = retype(metadata, characters) if isinstance(metadata, dict) else None
    if updated is None:
        entry["result"] = "无需改动"
        return entry, []
    names = [name for name in characters
             if updated["tag_types"].get(name) != metadata["tag_types"].get(name)]
    entry.update(result="取得", characters=" | ".join(names))
    return entry, names


def run(args: argparse.Namespace) -> int:
    if args.apply and not args.backup:
        print(BACKUP_REQUIRED, file=sys.stderr)
        return 2
    done = settled_ids(args.out) if args.resume else set()
    previous = [row for row in read_rows(args.out, missing_ok=True)
                if int(row.get("item_id") or 0) in done] if args.resume else []
    reader = open_readonly(args.db)
    rows = pending_rows(reader, args.limit, done)
    print(f"rule34video 已记类型的条目：上一趟问定 {len(done)} 条，本趟待问 {len(rows)} 条",
          flush=True)
    if not rows:
        reader.close()
        return 0
    writer: sqlite3.Connection | None = None
    before = 0
    if args.apply:
        writer = open_for_write(args)
        writer.isolation_level = None
        writer.execute("PRAGMA busy_timeout=60000")
        print(f"备份：{args.backup}", flush=True)
        before = writer.execute("SELECT COUNT(*) FROM follow_item").fetchone()[0]

    connector = build_connector("rule34video")
    log: list[dict] = []
    counts = {"取得": 0, "无需改动": 0, "未取得": 0, "跳过": 0, "names": 0}
    limited = 0
    next_request = 0.0

    def flush() -> None:
        args.out.parent.mkdir(parents=True, exist_ok=True)
        write_rows(args.out, FIELDS, previous + log, atomic=True)

    stopped = False
    for index, row in enumerate(rows, 1):
        time.sleep(max(0.0, next_request - time.monotonic()))
        next_request = time.monotonic() + args.delay
        try:
            entry, names = inspect_row(connector, reader, row)
            limited = 0
        except FollowSourceRateLimited as error:
            limited += 1
            if limited >= RATE_LIMIT_STOP:
                print(f"连续 {limited} 次被限流，停在第 {index} 条；用 --resume 接着跑",
                      flush=True)
                stopped = True
                break
            wait = max(COOLDOWN_SECONDS, float(error.retry_after or 0))
            print(f"被限流，静默 {wait:.0f} 秒", flush=True)
            time.sleep(wait)
            continue
        counts[entry["result"]] += 1
        if names:
            counts["names"] += len(names)
            if writer is not None and _apply(writer, row["id"], names):
                entry["written"] = "是"
        log.append(entry)
        if index % FLUSH_EVERY == 0:
            flush()
            print(f"{index}/{len(rows)}：改记角色 {counts['取得']} 条（{counts['names']} 个名字），"
                  f"无需改动 {counts['无需改动']}，未取得 {counts['未取得']}", flush=True)
    flush()
    reader.close()
    summary = (f"改记角色 {counts['取得']} 条（{counts['names']} 个名字），无需改动 "
               f"{counts['无需改动']}，未取得 {counts['未取得']}，跳过 {counts['跳过']} → {args.out}")
    if writer is None:
        print(f"dry-run：{summary}；加 --apply --backup 才真正写入", flush=True)
        return 1 if stopped else 0
    after = writer.execute("SELECT COUNT(*) FROM follow_item").fetchone()[0]
    writer.close()
    # 条数必须不变：这一趟只改已有条目的一列。
    print(f"已写入：{summary}；follow_item {before} → {after}", flush=True)
    return 0 if before == after and not stopped else 1


def main(argv: list[str] | None = None) -> int:
    return run(build_parser().parse_args(argv))


if __name__ == "__main__":
    raise SystemExit(main())
