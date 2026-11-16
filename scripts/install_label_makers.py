"""把复核过的「label 属于哪家片商」装进 ledger 的 `label_maker`（ADR-0049）。

输入是复核 CSV，列为 `label,maker,evidence`。两边都按 `kind='studio'` 的规范名或唯一别名
解析；片商在账本里还没有实体（妄想族就是：作品全挂在旗下 label 上）时，加
`--create-makers` 才新建，否则那一行跳过并写明原因。

上级自己也可以是别家的 label（ADR-0051：妄想族 → 素人ホイホイ → 素人ホイホイpower），
只是不能成环。一个名字在同一份表里既当 label 又当上级、账本里还没有它时，加
`--create-makers` 会先建出来再写它自己那一行，一张表就能装完整条链。

默认 dry-run，只打印计划。`--apply` 必须同时给 `--backup`：这是真实账本写入。重跑是
幂等的，已是同一家的跳过；label 转手时覆盖成新片商，计划里写成 update。
"""
from __future__ import annotations

import argparse
import sqlite3
import sys
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))

from peach.entities import normalize_entity_name, resolve_entity   # noqa: E402
from peach.interface_text import dev as t   # noqa: E402
from peach.review_csv import read_rows   # noqa: E402
from peach.scripting import (   # noqa: E402
    BACKUP_REQUIRED,
    add_ledger_write_args,
    open_for_write,
    verify_after_write,
)


def name_key(connection: sqlite3.Connection, name: str) -> str:
    """别名和规范名落到同一个键上；账本里还没有的名字按它自己归一。"""
    found = resolve_entity(connection, "studio", name)
    return normalize_entity_name(found["canonical_name"] if found is not None else name)


def parents(connection: sqlite3.Connection, rows: list[dict]) -> dict[str, str]:
    """账本现有的上级关系叠上这张表里的行，按名字键：成环要连同批的行一起查。"""
    edges = {normalize_entity_name(label): normalize_entity_name(maker)
             for label, maker in connection.execute(
                 "SELECT l.canonical_name,m.canonical_name FROM label_maker lm "
                 "JOIN entity l ON l.id=lm.label_id JOIN entity m ON m.id=lm.maker_id")}
    for row in rows:
        label, maker = (str(row.get(key) or "").strip() for key in ("label", "maker"))
        if label and maker:
            edges[name_key(connection, label)] = name_key(connection, maker)
    return edges


def closes_a_loop(edges: dict[str, str], label: str, maker: str) -> bool:
    """从上级一路往上走，走回 label 自己就是环。"""
    seen: set[str] = set()
    step = maker
    while step and step not in seen:
        if step == label:
            return True
        seen.add(step)
        step = edges.get(step, "")
    return False


def plan(connection: sqlite3.Connection, rows: list[dict], *,
         create_makers: bool) -> list[dict]:
    """逐行给出动作与原因；不合法的行照样列出，动作写成 skip。"""
    planned: list[dict] = []
    makers_in_plan = {normalize_entity_name(str(row.get("maker") or "").strip())
                      for row in rows}
    edges = parents(connection, rows)
    for row in rows:
        label_name = str(row.get("label") or "").strip()
        maker_name = str(row.get("maker") or "").strip()
        item = {"label": label_name, "maker": maker_name, "label_id": None,
                "maker_id": None, "action": "skip", "reason": "",
                "evidence": str(row.get("evidence") or "").strip()}
        planned.append(item)
        if not label_name or not maker_name:
            item["reason"] = t("install_label_makers.emptyNames")
            continue
        if not item["evidence"]:
            item["reason"] = t("install_label_makers.noEvidence")
            continue
        label = resolve_entity(connection, "studio", label_name)
        if label is None and not (create_makers
                                  and normalize_entity_name(label_name) in makers_in_plan):
            item["reason"] = t("install_label_makers.labelNotFound", label=label_name)
            continue
        item["label_id"] = int(label["id"]) if label is not None else None
        maker = resolve_entity(connection, "studio", maker_name)
        if maker is None and not create_makers:
            item["reason"] = t("install_label_makers.studioMissing", studio=maker_name)
            continue
        item["maker_id"] = int(maker["id"]) if maker is not None else None
        label_key, maker_key = name_key(connection, label_name), name_key(connection, maker_name)
        if label_key == maker_key:
            item["reason"] = t("install_label_makers.sameEntity")
            continue
        if closes_a_loop(edges, label_key, maker_key):
            item["reason"] = t("install_label_makers.loop")
            continue
        item.update(**change(connection, item))
    return planned


def change(connection: sqlite3.Connection, item: dict) -> dict:
    """同一条 label 在账本里已有上级时是跳过还是转手，没有时是新写。"""
    current = connection.execute(
        "SELECT maker_id FROM label_maker WHERE label_id=?",
        (item["label_id"],)).fetchone() if item["label_id"] is not None else None
    if current and item["maker_id"] is not None and int(current[0]) == item["maker_id"]:
        return {"reason": t("install_label_makers.alreadySet")}
    if current:
        return {"action": "update", "reason": t("install_label_makers.reassigned", current=current[0], studio=item['maker'])}
    created = [name for name, found in ((item["label"], item["label_id"]),
                                        (item["maker"], item["maker_id"])) if found is None]
    return {"action": "insert", "reason": t("install_label_makers.created", names='、'.join(created)) if created else ""}


def ensure_maker(connection: sqlite3.Connection, name: str, stamp: str) -> int:
    """片商实体不存在时按规范名新建一条 `kind='studio'`，已存在则返回它。"""
    found = resolve_entity(connection, "studio", name)
    if found is not None:
        return int(found["id"])
    connection.execute(
        "INSERT INTO entity(kind,canonical_name,normalized_name,metadata_json,created_at,updated_at) "
        "VALUES('studio',?,?,'{}',?,?)", (name, normalize_entity_name(name), stamp, stamp))
    return int(connection.execute("SELECT last_insert_rowid()").fetchone()[0])


def install(connection: sqlite3.Connection, planned: list[dict], *, source: str) -> int:
    stamp = datetime.now(timezone.utc).isoformat(timespec="seconds")
    written = 0
    for item in planned:
        if item["action"] not in {"insert", "update"}:
            continue
        # 同一个名字在前一行已被当作上级建出来时，`ensure_maker` 取到的就是那一条。
        maker_id = item["maker_id"] or ensure_maker(connection, item["maker"], stamp)
        label_id = item["label_id"] or ensure_maker(connection, item["label"], stamp)
        connection.execute(
            "INSERT INTO label_maker(label_id,maker_id,source,confidence,checked_at) "
            "VALUES(?,?,?,1.0,?) ON CONFLICT(label_id) DO UPDATE SET "
            "maker_id=excluded.maker_id,source=excluded.source,"
            "confidence=excluded.confidence,checked_at=excluded.checked_at",
            (label_id, maker_id, f"review:{source}", stamp))
        written += 1
    return written


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description=t("install_label_makers.description"))
    parser.add_argument("--input", type=Path, required=True, help=t("install_label_makers.inputHelp"))
    parser.add_argument("--create-makers", action="store_true",
                        help=t("install_label_makers.createMakersHelp"))
    return add_ledger_write_args(parser)


def main(argv: list[str] | None = None) -> int:
    args = build_parser().parse_args(argv)
    if args.apply and not args.backup:
        print(f"[stop] {BACKUP_REQUIRED}")
        return 2
    connection = open_for_write(args)
    if args.apply:
        print(t("install_label_makers.backedUp", backup=args.backup))
    connection.execute("PRAGMA foreign_keys=ON")
    rows = read_rows(args.input)
    try:
        before = connection.execute("SELECT count(*) FROM label_maker").fetchone()[0]
        planned = plan(connection, rows, create_makers=args.create_makers)
        for item in planned:
            mark = {"insert": "+", "update": "~"}.get(item["action"], " ")
            print(f" {mark} {item['label'][:24]:<24} → {item['maker'][:14]:<14} {item['reason']}")
        changes = [item for item in planned if item["action"] != "skip"]
        print({t("install_label_makers.inputRows"): len(rows), t("install_label_makers.toWrite"): len(changes), t("install_label_makers.skipped"): len(planned) - len(changes),
               t("install_label_makers.before"): before})
        if not args.apply:
            print(t("install_label_makers.dryRun"))
            return 0
        with connection:
            written = install(connection, planned, source=args.input.name)
        after = connection.execute("SELECT count(*) FROM label_maker").fetchone()[0]
        integrity, orphans = verify_after_write(connection)
        inserted = sum(item["action"] == "insert" for item in planned)
        print({t("install_label_makers.written"): written, t("install_label_makers.after"): after, t("install_label_makers.delta"): after - before,
               "integrity_check": integrity, "foreign_key_check": orphans})
        if after - before != inserted or integrity != "ok" or orphans:
            print(t("install_label_makers.checkMismatch"))
            return 1
    finally:
        connection.close()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
