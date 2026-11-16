"""清退已入库的跨作者合集条目。默认只列清单，`--apply` 才删。

抓取那一侧按画面作者数拦截新候选（`Rule34VideoConnector.MAX_COLLECTION_MODELS`），
判据收紧之前入库的行还在库里，这个脚本按同一个判据扫一遍存量。删除不可逆，
`--apply` 先把账本备份成 `ledger.pre-follow-compilations-<时间戳>.db`，
清单同时落盘成 CSV 复核产物。已经保存成 asset 的条目一律不动。
"""
from __future__ import annotations

import argparse
import json
import sqlite3
import sys
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))

from peach.config import DATABASE_PATH, GENERATED_DIR  # noqa: E402
from peach.follow_store import FollowStore  # noqa: E402
from peach.interface_text import dev as t  # noqa: E402
from peach.migrations import sqlite_backup  # noqa: E402
from peach.review_csv import write_rows  # noqa: E402

FIELDS = ("item_id", "external_id", "source_ref", "status", "credited", "visual", "title")


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=t("prune_follow_compilations.description"))
    parser.add_argument("--db", type=Path, default=DATABASE_PATH, help=t("prune_follow_compilations.dbHelp"))
    parser.add_argument("--review", type=Path, help=t("prune_follow_compilations.reviewHelp"))
    parser.add_argument("--apply", action="store_true", help=t("prune_follow_compilations.applyHelp"))
    parser.add_argument("--json", action="store_true", help=t("prune_follow_compilations.jsonHelp"))
    args = parser.parse_args(argv)

    db = args.db.resolve()
    stamp = datetime.now(timezone.utc).strftime("%Y%m%d-%H%M%S")
    connection = sqlite3.connect(db)
    try:
        rows = FollowStore(lambda: connection).collected_compilations()
        review = args.review or GENERATED_DIR / f"follow-compilations-{stamp}.csv"
        write_rows(review, FIELDS,
                   [{field: getattr(row, field) for field in FIELDS} for row in rows])
        backup = None
        if args.apply and rows:
            connection.close()
            backup = db.with_name(f"{db.stem}.pre-follow-compilations-{stamp}{db.suffix}")
            sqlite_backup(db, backup)
            connection = sqlite3.connect(db)
            store = FollowStore(lambda: connection)
            with connection:
                removed = store.purge_compilations(rows, confirm=True)
        else:
            removed = 0
    finally:
        connection.close()

    if args.json:
        print(json.dumps({
            "db": str(db), "found": len(rows), "removed": removed,
            "backup": str(backup) if backup else None, "review": str(review),
        }, ensure_ascii=False, indent=2))
    else:
        for row in rows:
            print(t("prune_follow_compilations.row", visual=f"{row.visual:>2}", credited=f"{row.credited:>2}",
                    source=row.source_ref, title=row.title[:52]))
        print(t("prune_follow_compilations.removed" if args.apply else "prune_follow_compilations.willRemove",
                count=len(rows), review=review))
        if backup:
            print(t("prune_follow_compilations.backup", backup=backup))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
