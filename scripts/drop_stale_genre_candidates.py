#!/usr/bin/env python3
# -*- coding: utf-8 -*-
r"""把 genre 还停在英文那一层的资料候选摘掉，让下一趟「只采集」重抓它们。

判据在 `peach.stale_candidates`。摘掉之后那几条在复核页上暂时消失，采集回来的
是同一批片子的日文原词。不碰 ledger，只改复核候选文件，并先留一份备份。

默认只报数，`--apply` 才改文件。
"""
from __future__ import annotations

import argparse
import json
import shutil
import sys
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent.parent
SRC_DIR = PROJECT_ROOT / "src"
if str(SRC_DIR) not in sys.path:
    sys.path.insert(0, str(SRC_DIR))

from peach.config import GENERATED_DIR
from peach.interface_text import dev as t, list_separator, local_language
from peach.library_processing import FIELDS
from peach.review_csv import read_rows, write_rows
from peach.stale_candidates import is_english, stale_genre_rows, without

CANDIDATES = GENERATED_DIR / "library-metadata-field-candidates.csv"


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description=t("drop_stale_genre_candidates.description"))
    parser.add_argument("--candidates", type=Path, default=CANDIDATES)
    parser.add_argument("--apply", action="store_true", help=t("drop_stale_genre_candidates.applyHelp"))
    return parser


def run(args: argparse.Namespace) -> int:
    rows = read_rows(args.candidates)
    stale = stale_genre_rows(rows)
    words = sorted({word for row in stale for word in _words(row)})
    print(t("drop_stale_genre_candidates.found", rows=len(rows), stale=len(stale)))
    print(t("drop_stale_genre_candidates.scope", assets=len({row["asset_id"] for row in stale}), words=len(words)))
    print("  " + list_separator(local_language()).join(words[:20]) + ("…" if len(words) > 20 else ""))

    if args.apply:
        backup = args.candidates.with_suffix(".pre-japanese-genres.csv")
        shutil.copy2(args.candidates, backup)
        write_rows(args.candidates, FIELDS, without(rows, stale), atomic=True)
        print(t("drop_stale_genre_candidates.backedUp", backup=backup))
        print(t("drop_stale_genre_candidates.dropped"))
    else:
        print(t("drop_stale_genre_candidates.preview"))
    return 0


def _words(row: dict) -> set[str]:
    found = set()
    for candidate in json.loads(row.get("candidates_json") or "[]"):
        found |= {word for word in candidate.get("unmapped_genres") or [] if is_english(word)}
    return found


def main(argv: list[str] | None = None) -> int:
    return run(build_parser().parse_args(argv))


if __name__ == "__main__":
    raise SystemExit(main())
