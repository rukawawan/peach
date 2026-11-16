#!/usr/bin/env python3
# -*- coding: utf-8 -*-
r"""按片长确认「名字像番号、里面的文件却不带番号」的目录。

`audit_code_creators.py` 只清有文件级证据的那批：目录名与目录内文件解析出同一个番号。
剩下的存疑行里两种东西长得一模一样——`Tokyo-Hot n0780-HD\Tokyo-Hot.mp4` 是发行目录，
`banbi_555` 是上传者账号——名字本身答不了。

本脚本去来源要这个番号的片长，和目录里最长那条视频比：对得上就是这部片，按番号处理
（补 code、摘掉假创作者）；对不上或来源查无此片，留在人工队列（用户 2026-09-16 定的
判据，容差见 `code_creators.DURATION_TOLERANCE_SECONDS`）。

默认只联网比对并产出 CSV，`--apply` 才写 ledger 且必须给 `--backup`。
"""
from __future__ import annotations

import argparse
import sqlite3
import sys
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent.parent
SRC_DIR = PROJECT_ROOT / "src"
if str(SRC_DIR) not in sys.path:
    sys.path.insert(0, str(SRC_DIR))

from peach.code_creators import (  # noqa: E402
    VERDICT_CODE,
    VERDICT_UNCLEAR,
    apply_rows,
    collect,
    duration_confirms_code,
    main_video_seconds,
)
from peach.config import DATABASE_PATH, GENERATED_DIR, SECRETS_DIR  # noqa: E402
from peach.interface_text import dev as t  # noqa: E402
from peach.metadata_policy import PREFERRED_COMMUNITY_SOURCE  # noqa: E402
from peach.migrations import sqlite_backup  # noqa: E402
from peach.review_csv import write_rows  # noqa: E402

FIELDS = ("entity_id", "creator", "identity", "assets", "local_seconds", "source",
          "runtime_minutes", "confirmed", "reason")


def source_runtime(provider, code: str) -> tuple[str, float | None, str]:
    """这个番号的片长：先问 r18.dev，它没有再问社区来源。返回 (来源, 分钟, 说明)。

    社区来源之间按 `PREFERRED_COMMUNITY_SOURCE` 排：`n0780` 的片长 javbus 报 36 分、
    javdb 报 96 分，盘里那条 98 分——按返回顺序取第一家就会把这个目录判成对不上。
    """
    try:
        payload = provider.query(code)
        if payload.get("runtime"):
            return "r18dev", float(payload["runtime"]), ""
    except Exception as error:                                  # noqa: BLE001
        note = t("confirm_code_dirs.r18devError", error=type(error).__name__)
    else:
        note = t("confirm_code_dirs.r18devNoRuntime")
    try:
        found = sorted(provider.community(code),
                       key=lambda item: item[0] != PREFERRED_COMMUNITY_SOURCE)
    except Exception as error:                                  # noqa: BLE001
        return "", None, t("confirm_code_dirs.communityError", note=note, error=type(error).__name__)
    for name, payload in found:
        if payload.get("runtime"):
            return name, float(payload["runtime"]), note
    return "", None, t("confirm_code_dirs.communityNoRuntime", note=note)


def assets_of(connection: sqlite3.Connection, entity_id: int) -> list:
    cursor = connection.cursor()
    cursor.row_factory = sqlite3.Row
    return cursor.execute(
        "SELECT a.id,a.name,a.path,a.code,a.medium,a.duration FROM asset_entity ae "
        "JOIN asset a ON a.id=ae.asset_id WHERE ae.entity_id=? AND ae.role='creator' "
        "ORDER BY a.id", (entity_id,)).fetchall()


def examine(connection: sqlite3.Connection, provider) -> list[dict[str, object]]:
    """对每个存疑目录取一次片长，判它是不是这个番号。"""
    rows = []
    for row in collect(connection):
        if row["verdict"] != VERDICT_UNCLEAR:
            continue
        entity_id = int(row["entity_id"])
        local = main_video_seconds(assets_of(connection, entity_id))
        source, runtime, note = source_runtime(provider, str(row["identity"]))
        confirmed, reason = duration_confirms_code(local, runtime)
        rows.append({
            "entity_id": entity_id, "creator": row["creator"], "identity": row["identity"],
            "assets": row["assets"], "local_seconds": "" if local is None else round(local),
            "source": source, "runtime_minutes": "" if runtime is None else runtime,
            "confirmed": t("confirm_code_dirs.yes" if confirmed else "confirm_code_dirs.no"),
            "reason": reason if runtime else t("confirm_code_dirs.reasonWithNote", reason=reason, note=note),
            # 判定成立的按番号处理，交给 `code_creators.apply_rows` 走既有那条写入路径。
            "verdict": VERDICT_CODE if confirmed else VERDICT_UNCLEAR,
        })
    return rows


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description=t("confirm_code_dirs.description"))
    parser.add_argument("--db", type=Path, default=DATABASE_PATH)
    parser.add_argument("--secrets", type=Path, default=SECRETS_DIR)
    parser.add_argument("--review-csv", type=Path,
                        default=GENERATED_DIR / "code-dir-duration-review.csv")
    parser.add_argument("--apply", action="store_true", help=t("confirm_code_dirs.applyHelp"))
    parser.add_argument("--backup", type=Path, help=t("confirm_code_dirs.backupHelp"))
    return parser


def run(args: argparse.Namespace) -> int:
    if args.apply and not args.backup:
        raise SystemExit(t("confirm_code_dirs.backupRequired"))
    from peach.library_processing import LibraryMetadataProvider

    connection = sqlite3.connect(args.db)
    provider = LibraryMetadataProvider(args.secrets)
    try:
        rows = examine(connection, provider)
    finally:
        provider.close()
    confirmed = [row for row in rows if row["verdict"] == VERDICT_CODE]
    print(t("confirm_code_dirs.summary", total=len(rows), confirmed=len(confirmed)))
    for row in rows:
        print(f"  {row['creator']:<34} {row['identity']:<14} {row['confirmed']} {row['reason']}")

    if args.apply and confirmed:
        sqlite_backup(args.db, args.backup)
        print(t("confirm_code_dirs.backedUp", path=args.backup))
        connection.execute("BEGIN IMMEDIATE")
        try:
            counts = apply_rows(connection, confirmed)
            connection.commit()
        except Exception:
            connection.rollback()
            raise
        print(t("confirm_code_dirs.written", links=counts["links"], entities=counts["entities"],
                codes=counts["codes"], flat=counts["flat"]))
    connection.close()

    # 判定用的 `verdict` 不进 CSV：那一列是给 `apply_rows` 的开关，复核看的是 `confirmed`。
    write_rows(args.review_csv, FIELDS,
               [{key: row[key] for key in FIELDS} for row in rows])
    print(t("confirm_code_dirs.reviewCsv", path=args.review_csv))
    if not args.apply:
        print(t("confirm_code_dirs.previewOnly"))
    return 0


def main(argv: list[str] | None = None) -> int:
    return run(build_parser().parse_args(argv))


if __name__ == "__main__":
    raise SystemExit(main())
