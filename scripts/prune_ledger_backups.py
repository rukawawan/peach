"""清退旧的账本备份 `ledger.pre-*.db`。默认只列计划，`--apply` 才删。

保留规则在 `peach.ledger_backups`：最近几份、还没满 24 小时、比当前账本更新的都留；
当前账本 `integrity_check` 不是 ok 时拒绝清退。主文件已经不在的 `-wal`／`-shm` 一并扫掉。
托盘每次启动按同一规则自动跑一遍，这个脚本给手动与排障用。

`--organize` 改看 `<generated>/organize-backups/` 里的整理备份，只认
`ledger.pre-download-*` 与 `ledger.pre-organize-*`，缺省只留最近几份、不按年龄保留；
每次整理写备份时也按这套规则清一遍。
"""
from __future__ import annotations

import argparse
import json
import sys
from datetime import timedelta
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))

from peach import ledger_backups  # noqa: E402
from peach.config import DATABASE_PATH, GENERATED_DIR  # noqa: E402
from peach.interface_text import dev as t  # noqa: E402


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=t("prune_ledger_backups.description", pattern="ledger.pre-*.db"))
    parser.add_argument("--db", type=Path, default=DATABASE_PATH, help=t("prune_ledger_backups.helpDb"))
    parser.add_argument("--organize", type=Path, nargs="?", const=GENERATED_DIR, default=None,
                        metavar="GENERATED",
                        help=t("prune_ledger_backups.helpOrganize"))
    parser.add_argument("--keep", type=int, default=None,
                        help=t("prune_ledger_backups.helpKeep"))
    parser.add_argument("--min-age-hours", type=float, default=None,
                        help=t("prune_ledger_backups.helpMinAge"))
    parser.add_argument("--apply", action="store_true", help=t("prune_ledger_backups.helpApply"))
    parser.add_argument("--json", action="store_true", help=t("prune_ledger_backups.helpJson"))
    args = parser.parse_args(argv)

    if args.organize is not None:
        scope = {"directory": ledger_backups.organize_dir(args.organize.resolve()),
                 "pattern": ledger_backups.ORGANIZE_PATTERN}
        keep, min_age = ledger_backups.ORGANIZE_KEEP_RECENT, ledger_backups.ORGANIZE_MIN_AGE
    else:
        scope = {}
        keep, min_age = ledger_backups.KEEP_RECENT, ledger_backups.MIN_AGE
    decided = ledger_backups.prune(
        args.db.resolve(), apply=args.apply,
        keep_recent=keep if args.keep is None else args.keep,
        min_age=min_age if args.min_age_hours is None else timedelta(hours=args.min_age_hours),
        **scope,
    )
    if args.json:
        print(json.dumps({
            "db": str(args.db.resolve()),
            "applied": bool(args.apply and not decided.refused),
            "refused": decided.refused,
            "keep": [path.name for path in decided.keep],
            "remove": [path.name for path in decided.remove],
            "orphans": [path.name for path in decided.orphans],
            "removable_bytes": decided.removable_bytes,
        }, ensure_ascii=False, indent=2))
    else:
        verb = t("prune_ledger_backups.deleted") if args.apply and not decided.refused else t("prune_ledger_backups.willDelete")
        for path in decided.keep:
            print(t("prune_ledger_backups.keepRow", name=path.name))
        for path in decided.remove:
            print(f"{verb}  {path.name}")
        for path in decided.orphans:
            print(t("prune_ledger_backups.orphanRow", verb=verb, name=path.name))
        print(t("prune_ledger_backups.summary", verb=verb, count=len(decided.remove), orphans=len(decided.orphans),
                size=f"{decided.removable_bytes / 1_048_576:.0f}"))
        if decided.refused:
            from peach import interface_text
            # 拒绝原因是一句带 code 的话，按 zh-CN 渲染后打印（脚本输出的语言另起一批再改）。
            code, params = decided.refused["code"], decided.refused.get("params")
            print(t("prune_ledger_backups.refused", reason=interface_text.text(f'server:{code}', params)))
    return 2 if decided.refused else 0


if __name__ == "__main__":
    raise SystemExit(main())
