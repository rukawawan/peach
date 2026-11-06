"""把自动落库写下的一批结果整批撤回（ADR-0052）。

认哪些写入、怎么撤、哪些不动，全在 `peach.auto_landing_revert`；复核页的「自动写入的资料」
走同一份实现（ADR-0141）。这里只管命令行参数、打印计划和备份。

    revert_auto_landing.py --source auto:follow-creator
    revert_auto_landing.py --source auto:performer-alias
    revert_auto_landing.py --source auto:performer-alias --batch auto:performer-alias@812
    revert_auto_landing.py --source auto:performer-profile
    revert_auto_landing.py --source script:creator-identity-wiki
    revert_auto_landing.py --source auto:sample-images
    revert_auto_landing.py --source auto:seed --batch auto:seed@2026-09-25
    revert_auto_landing.py --source adr-0079-fc2-descriptive-performer
    revert_auto_landing.py --source auto:metadata-tags
    revert_auto_landing.py --source adr-0139-official-replaces-verified
    revert_auto_landing.py --source auto:vanished-reattach --batch auto:vanished-reattach@3
    revert_auto_landing.py --source auto:want-acquired
    revert_auto_landing.py --source auto:western-artwork --batch auto:western-artwork@20261008T000000Z

默认只列计划；`--apply` 必须同时给 `--backup`，删文件在账本行之后、同一次运行里完成。
"""
from __future__ import annotations

import argparse
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))

from peach import auto_landing_revert  # noqa: E402
from peach.config import COVER_DIR, GENERATED_DIR  # noqa: E402
from peach.scripting import add_ledger_write_args, open_for_write, verify_after_write  # noqa: E402


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description=__doc__)
    add_ledger_write_args(parser)
    parser.add_argument("--source", default="auto:studio-mark",
                        help="要撤回的归属串，与写入时记的逐字相同")
    parser.add_argument("--batch", default="", help="只撤这一批；不给就撤这个来源的全部")
    parser.add_argument("--logo-root", type=Path, default=GENERATED_DIR / "logos")
    parser.add_argument("--cover-root", type=Path, default=COVER_DIR)
    return parser


def print_acquired(planned: list[dict]) -> None:
    """想要清单里对账标了已入库的那几条，一条一行。"""
    for item in planned:
        label = item["code"] or item["title"] or f"#{item['id']}"
        print(f" - 想要 {label[:40]:<40} 资产 {item['acquired_asset_id']} {item['acquired_batch']}")


def print_verified(planned: list[dict]) -> None:
    """核查结算的撤回清单：覆盖写还原几条资产、几条已被改过不动，并集删几个标签。"""
    for entry in planned:
        if "tags" in entry:
            names = "、".join(tag["tag"] for tag in entry["tags"])
            print(f" - 核查并集 {entry['item_key']:<28} {names[:40]}")
        else:
            print(f" - 核查覆盖 {entry['item_key']:<28} 还原 {len(entry['restores'])} 条"
                  f"，已被改过 {len(entry['changed'])} 条")


def print_profiles(profiles: list[dict], companies: list[dict]) -> None:
    """显示逐行人物资料与逐字段公司资料的撤回清单。"""
    for profile in profiles:
        print(f" - 资料 {profile['entity'][:20]:<20} {profile['source']}")
    for company in companies:
        print(f" - 公司资料 {company['entity']}: {','.join(company['fields'])}")


def print_files(files: list[Path], covers: list[Path]) -> None:
    """显示要删的标识文件与无番号作品封面。"""
    for path in files:
        print(f" - 标识 {path.name}")
    for path in covers:
        print(f" - 封面 {path.name}")


def print_plan(planned: dict) -> None:
    print_acquired(planned["acquired"])
    print_verified(planned["verified"])
    for link in planned["links"]:
        print(f" - 链接 {link['entity'][:20]:<20} {link['url'][:56]} {link['batch']}")
    for alias in planned["aliases"]:
        print(f" - 别名 {alias['entity'][:20]:<20} {alias['alias'][:40]} {alias['source']}")
    for name in planned["names"]:
        print(f" - 中文名 {name['entity']} → {name['previous_name']} {name['source']}")
    print_profiles(planned["profiles"], planned["companies"])
    for creator in planned["creators"]:
        print(f" - 建档 {creator['name'][:20]:<20} {creator['sources']} 个来源 {creator['batch']}")
    for claim in planned["claims"]:
        print(f" - 断言 {claim['entity'][:20]:<20} {claim['facet']}={claim['value']} {claim['source']}")
    for ref in planned["refs"]:
        print(f" - 编号 {ref['entity'][:20]:<20} {ref['provider']} {ref['id']} {ref['batch']}")
    for membership in planned["memberships"]:
        print(f" - 归属 {membership['entity'][:20]:<20} {membership['agency'][:30]} {membership['source']}")
    for maker in planned["makers"]:
        print(f" - 片商 {maker['entity'][:20]:<20} {maker['maker'][:30]} {maker['source']}")
    print_files(planned["files"], planned["covers"])
    for sample in planned["samples"]:
        print(f" - 样张 {sample['code']:<20} {sample['count']} 张 {sample['source']}")
    for rejection in planned["rejections"]:
        print(f" - 否决 {rejection['category']} {rejection['item_key']}")
    for tag in planned["tags"]:
        print(f" - 标签 {tag['asset_id']:<8} {tag['tag'][:30]:<30} {tag['source']}")
    for rehome in planned["rehomes"]:
        print(f" - 接回 {rehome['old_asset_id']:<8} → {rehome['new_asset_id']:<8} "
              f"{rehome['name'][:40]} {rehome['batch']}")
    print(auto_landing_revert.counts(planned))


def main(argv: list[str] | None = None) -> int:
    args = build_parser().parse_args(argv)
    connection = open_for_write(args)
    try:
        planned = auto_landing_revert.plan(connection, args.source, args.batch,
                                           logo_root=args.logo_root, cover_root=args.cover_root)
        print_plan(planned)
        if not args.apply:
            print("dry-run；确认无误后加 --apply --backup <路径>")
            return 0
        with connection:
            result = auto_landing_revert.apply(connection, planned)
        integrity, orphans = verify_after_write(connection)
    finally:
        connection.close()
    removed = auto_landing_revert.remove_files(planned)
    # 「删除文件」排在建档实体之后，和这一行一直以来的顺序一致。
    summary = {}
    for key, value in result.items():
        summary[key] = value
        if key == "删除建档实体":
            summary["删除文件"] = removed
    print({**summary, "integrity_check": integrity, "foreign_key_check": orphans})
    return 0


if __name__ == "__main__":
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    raise SystemExit(main())
