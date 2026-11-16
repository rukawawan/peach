from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent.parent
SRC_DIR = PROJECT_ROOT / "src"
if str(SRC_DIR) not in sys.path:
    sys.path.insert(0, str(SRC_DIR))

from peach.config import DATA_ROOT, SOURCES_DIR, STATE_DIR
from peach.interface_text import dev as t
from peach.taste_history import (
    HistorySource,
    analyze_history,
    discover_history_sources,
    refresh_history,
    refresh_takeout_history,
    write_manifest,
)


def _parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description=t("taste_history.description"))
    parser.add_argument("action", choices=("discover", "refresh", "analyze"))
    parser.add_argument("--store", type=Path, default=SOURCES_DIR / "taste-history" / "history.sqlite")
    parser.add_argument("--output", type=Path, default=DATA_ROOT / "review" / "taste-history")
    parser.add_argument("--manifest", type=Path, default=STATE_DIR / "taste-history" / "manifest.json")
    parser.add_argument("--since", help=t("taste_history.helpSince"))
    parser.add_argument(
        "--takeout",
        action="append",
        default=[],
        type=Path,
        metavar="ZIP",
        help=t("taste_history.helpTakeout"),
    )
    parser.add_argument(
        "--takeout-only",
        action="store_true",
        help=t("taste_history.helpTakeoutOnly"),
    )
    parser.add_argument(
        "--source",
        action="append",
        default=[],
        metavar="BROWSER=PATH",
        help=t("taste_history.helpSource"),
    )
    return parser


def _explicit_sources(values: list[str]) -> list[HistorySource]:
    sources: list[HistorySource] = []
    for value in values:
        browser, separator, raw_path = value.partition("=")
        if not separator or browser not in {"chrome", "firefox", "safari", "zen"}:
            raise SystemExit(t("taste_history.invalidSource", value=value))
        path = Path(raw_path).expanduser()
        if not path.is_file():
            raise SystemExit(t("taste_history.sourceMissing", path=path))
        sources.append(HistorySource(browser, path.parent.name, path))
    return sources


def main() -> int:
    args = _parser().parse_args()
    takeouts = [path.expanduser() for path in args.takeout]
    missing_takeouts = [path for path in takeouts if not path.is_file()]
    if missing_takeouts:
        raise SystemExit(t("taste_history.takeoutMissing", path=missing_takeouts[0]))
    if args.takeout_only and (args.action != "refresh" or not takeouts or args.source):
        raise SystemExit(t("taste_history.takeoutOnlyMisuse"))
    sources = [] if args.takeout_only else discover_history_sources() + _explicit_sources(args.source)
    unique = {(source.browser, source.profile, source.path.resolve()): source for source in sources}
    sources = list(unique.values())
    if args.action == "discover":
        print(json.dumps([
            {"browser": source.browser, "profile": source.profile, "path": str(source.path)}
            for source in sources
        ], ensure_ascii=False, indent=2))
        return 0
    refresh_results: list[dict[str, object]] = []
    if args.action == "refresh":
        if not sources and not takeouts:
            raise SystemExit(t("taste_history.noSources"))
        if sources:
            refresh_results = refresh_history(sources, args.store)
        if takeouts:
            refresh_results.extend(refresh_takeout_history(takeouts, args.store))
    if not args.store.is_file():
        raise SystemExit(t("taste_history.storeMissing", path=args.store))
    analysis = analyze_history(args.store, args.output, since=args.since)
    write_manifest(args.manifest, refresh_results, analysis)
    print(json.dumps({"refresh": refresh_results, "analysis": analysis}, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
