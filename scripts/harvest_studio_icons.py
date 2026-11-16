"""给厂牌或事务所补标识的命令行入口，判据全在 `peach.studio_icons`。

默认只出复核 CSV 和候选 PNG，不碰已安装的目录。`--install` 才写 `<safe>.icon.img`
与 `<safe>.logo.img`；`<safe>.img` 只在尚不存在时补写一份，已有的一个字节都不动。
新登记的厂牌不必跑这个：处理任务的补厂牌后继按同一份判据自动补（ADR-0052）。
这个入口留给补历史、换指定来源和事务所。
"""
from __future__ import annotations

import argparse
import sqlite3
import sys
from pathlib import Path


sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))

from peach import studio_icons as icons  # noqa: E402
from peach.config import GENERATED_DIR, REVIEW_DIR, STATE_DIR  # noqa: E402
from peach.interface_text import dev as t  # noqa: E402
from peach.review_csv import write_rows  # noqa: E402

ORDER = {icons.OK: 0, icons.PADDED: 1, icons.TOOSMALL: 2, icons.SHARED: 3,
         icons.PORTRAIT: 4, icons.WORDMARK: 5, icons.MISSING: 6, icons.SKIP: 7}


def run(args: argparse.Namespace) -> dict[str, object]:
    logo_root = args.logo_root.resolve()
    connection = sqlite3.connect(f"file:{args.database}?mode=ro", uri=True)
    connection.row_factory = sqlite3.Row
    try:
        links = icons.studio_links(connection, args.kind)
    finally:
        connection.close()

    # 补白名单和那两张指定来源表都是厂牌那一趟的历史遗留，事务所一条都不该收：
    # 按名字撞上就会给一家事务所装上同名厂牌指好的图。事务所的入场理由只有链接，
    # 指定字标只查它自己那张 `AGENCY_WORDMARK_SOURCES`。
    wordmarks = None
    if args.kind == "studio":
        targets = icons.harvest_targets(icons.padded_studios(logo_root), links, logo_root)
    else:
        targets = {safe: {"original_size": "", "installed": ""} for safe in links}
        wordmarks = icons.AGENCY_WORDMARK_SOURCES_BY_SAFE
    if args.only:
        wanted = {icons.safe_name(name) for name in args.only}
        targets = {key: value for key, value in targets.items() if key in wanted}

    faces = icons.FaceGate(not args.no_face_gate)
    from peach.peach_proxy import http_client
    client = http_client(follow_redirects=True)
    try:
        rows = icons.harvest(targets, links, icons.Fetcher(client, args.timeout, args.interval),
                             args.candidate_dir.resolve(), faces,
                             icons.named_avatars(args.avatars), wordmarks)
    finally:
        client.close()

    rows.sort(key=lambda row: (ORDER.get(row["verdict"], 9), row["safe"], row["variant"]))
    write_rows(args.output, icons.FIELDS, rows)
    stats: dict[str, object] = {t("harvest_studio_icons.targets"): len(targets), t("harvest_studio_icons.reviewRows"): len(rows)}
    stats.update({verdict: sum(1 for row in rows if row["verdict"] == verdict)
                  for verdict in ORDER})
    stats[t("harvest_studio_icons.logoRows")] = sum(1 for row in rows if row["variant"] == icons.LOGO)
    stats[t("harvest_studio_icons.portraitRejected")] = faces.rejected
    if faces.unavailable:
        # 这一轮没人拦照片。写进统计，别让它看起来像「查过了，都不是照片」。
        stats[t("harvest_studio_icons.portraitGateOff")] = faces.unavailable
    stats["output"] = str(args.output)
    if args.install:
        stats[t("harvest_studio_icons.installed")] = icons.install(rows, logo_root)
    return stats


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=t("harvest_studio_icons.description"))
    parser.add_argument("--database", type=Path, required=True)
    parser.add_argument("--output", type=Path,
                        default=REVIEW_DIR / "studio-icons.csv")
    parser.add_argument("--logo-root", type=Path, default=GENERATED_DIR / "logos")
    parser.add_argument("--avatars", type=Path, default=STATE_DIR / "agency-avatars.json",
                        help=t("harvest_studio_icons.avatarsHelp"))
    parser.add_argument("--candidate-dir", type=Path,
                        default=REVIEW_DIR / "studio-icons")
    parser.add_argument("--only", nargs="*", default=[],
                        help=t("harvest_studio_icons.onlyHelp"))
    parser.add_argument("--kind", default="studio", choices=("studio", "agency"),
                        help=t("harvest_studio_icons.kindHelp"))
    parser.add_argument("--interval", type=float, default=1.5)
    parser.add_argument("--timeout", type=float, default=20.0)
    parser.add_argument("--no-face-gate", action="store_true",
                        help=t("harvest_studio_icons.noFaceGateHelp"))
    parser.add_argument("--install", action="store_true",
                        help=t("harvest_studio_icons.installHelp"))
    args = parser.parse_args(argv)
    print(run(args))
    return 0


if __name__ == "__main__":
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    raise SystemExit(main())
