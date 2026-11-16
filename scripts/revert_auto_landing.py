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
    revert_auto_landing.py --source upgrade:garbled-performers
    revert_auto_landing.py --source upgrade:javdb-actor-records
    revert_auto_landing.py --source upgrade:source-resolution-tags
    revert_auto_landing.py --source upgrade:quality-resolution

默认只列计划；`--apply` 必须同时给 `--backup`，删文件在账本行之后、同一次运行里完成。
"""
from __future__ import annotations

import argparse
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))

from peach import auto_landing_revert  # noqa: E402
from peach.config import COVER_DIR, GENERATED_DIR  # noqa: E402
from peach.interface_text import dev as t, list_separator, local_language  # noqa: E402
from peach.scripting import add_ledger_write_args, open_for_write, verify_after_write  # noqa: E402


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description=t("revert_auto_landing.description"))
    add_ledger_write_args(parser)
    parser.add_argument("--source", default="auto:studio-mark",
                        help=t("revert_auto_landing.sourceHelp"))
    parser.add_argument("--batch", default="", help=t("revert_auto_landing.batchHelp"))
    parser.add_argument("--logo-root", type=Path, default=GENERATED_DIR / "logos")
    parser.add_argument("--cover-root", type=Path, default=COVER_DIR)
    return parser


def print_acquired(planned: list[dict]) -> None:
    """想要清单里对账标了已入库的那几条，一条一行。"""
    for item in planned:
        label = item["code"] or item["title"] or f"#{item['id']}"
        print(t("revert_auto_landing.wantRow", label=f"{label[:40]:<40}", asset=item['acquired_asset_id'],
                batch=item['acquired_batch']))


def print_verified(planned: list[dict]) -> None:
    """核查结算的撤回清单：覆盖写还原几条资产、几条已被改过不动，并集删几个标签。"""
    for entry in planned:
        if "tags" in entry:
            names = list_separator(local_language()).join(tag["tag"] for tag in entry["tags"])
            print(t("revert_auto_landing.verifiedUnionRow", key=f"{entry['item_key']:<28}", tags=names[:40]))
        else:
            print(t("revert_auto_landing.verifiedReplaceRow", key=f"{entry['item_key']:<28}",
                    restores=len(entry['restores']), changed=len(entry['changed'])))


def print_profiles(profiles: list[dict], companies: list[dict]) -> None:
    """显示逐行人物资料与逐字段公司资料的撤回清单。"""
    for profile in profiles:
        print(t("revert_auto_landing.profileRow", entity=f"{profile['entity'][:20]:<20}", source=profile['source']))
    for company in companies:
        print(t("revert_auto_landing.companyRow", entity=company['entity'], fields=','.join(company['fields'])))


def print_files(files: list[Path], covers: list[Path]) -> None:
    """显示要删的标识文件与无番号作品封面。"""
    for path in files:
        print(t("revert_auto_landing.logoRow", name=path.name))
    for path in covers:
        print(t("revert_auto_landing.coverRow", name=path.name))


def print_plan(planned: dict) -> None:
    print_acquired(planned["acquired"])
    print_verified(planned["verified"])
    for link in planned["links"]:
        print(t("revert_auto_landing.linkRow", entity=f"{link['entity'][:20]:<20}", url=link['url'][:56],
                batch=link['batch']))
    for alias in planned["aliases"]:
        print(t("revert_auto_landing.aliasRow", entity=f"{alias['entity'][:20]:<20}", alias=alias['alias'][:40],
                source=alias['source']))
    for name in planned["names"]:
        print(t("revert_auto_landing.chineseNameRow", entity=name['entity'], previous=name['previous_name'],
                source=name['source']))
    print_profiles(planned["profiles"], planned["companies"])
    for creator in planned["creators"]:
        print(t("revert_auto_landing.creatorRow", name=f"{creator['name'][:20]:<20}", sources=creator['sources'],
                batch=creator['batch']))
    for claim in planned["claims"]:
        print(t("revert_auto_landing.claimRow", entity=f"{claim['entity'][:20]:<20}", facet=claim['facet'],
                value=claim['value'], source=claim['source']))
    for ref in planned["refs"]:
        print(t("revert_auto_landing.refRow", entity=f"{ref['entity'][:20]:<20}", provider=ref['provider'],
                id=ref['id'], batch=ref['batch']))
    for membership in planned["memberships"]:
        print(t("revert_auto_landing.membershipRow", entity=f"{membership['entity'][:20]:<20}",
                agency=membership['agency'][:30], source=membership['source']))
    for maker in planned["makers"]:
        print(t("revert_auto_landing.makerRow", entity=f"{maker['entity'][:20]:<20}", studio=maker['maker'][:30],
                source=maker['source']))
    print_files(planned["files"], planned["covers"])
    for sample in planned["samples"]:
        print(t("revert_auto_landing.sampleRow", code=f"{sample['code']:<20}", count=sample['count'],
                source=sample['source']))
    for rejection in planned["rejections"]:
        print(t("revert_auto_landing.rejectionRow", category=rejection['category'], key=rejection['item_key']))
    for tag in planned["tags"]:
        print(t("revert_auto_landing.tagRow", asset=f"{tag['asset_id']:<8}", tag=f"{tag['tag'][:30]:<30}",
                source=tag['source']))
    for rehome in planned["rehomes"]:
        print(t("revert_auto_landing.rehomeRow", old=f"{rehome['old_asset_id']:<8}", new=f"{rehome['new_asset_id']:<8}",
                name=rehome['name'][:40], batch=rehome['batch']))
    for item in planned["garbled"]:
        row = item["row"]
        label = row.get("canonical_name") or row.get("tag") or row.get("external_id") or row.get("alias") or ""
        row_id = str(row.get('asset_id') or row.get('entity_id') or row.get('id'))
        print(t("revert_auto_landing.garbledRow", table=f"{item['table']:<20}", id=f"{row_id:<8}",
                label=str(label)[:30], batch=item['batch']))
    for item in planned.get("javdb_records", []):
        what = (t("revert_auto_landing.feed", id=item['source_id']) if item["kind"] == "feed"
                else t("revert_auto_landing.uncensored") if item["uncensored"] else t("revert_auto_landing.censored"))
        print(f" - JavDB {item['entity_id']:<8} {item['external_id']:<10} {what} {item['batch']}")
    for item in planned.get("resolution_tags", []):
        row = item["row"]
        print(t("revert_auto_landing.resolutionTagRow", asset=f"{row['asset_id']:<8}", kind=f"{item['kind']:<4}",
                source=row['source'], batch=item['batch']))
    for item in planned.get("quality", []):
        print(t("revert_auto_landing.qualityRow", asset=f"{item['asset_id']:<8}", quality=item["quality"],
                previous=item["previous"], batch=item["batch"]))
    print(auto_landing_revert.counts(planned))


def main(argv: list[str] | None = None) -> int:
    args = build_parser().parse_args(argv)
    connection = open_for_write(args)
    try:
        planned = auto_landing_revert.plan(connection, args.source, args.batch,
                                           logo_root=args.logo_root, cover_root=args.cover_root)
        print_plan(planned)
        if not args.apply:
            print(t("revert_auto_landing.dryRun"))
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
        if key == "deleted_creator_entities":
            summary[t("revert_auto_landing.deletedFiles")] = removed
    print({**summary, "integrity_check": integrity, "foreign_key_check": orphans})
    return 0


if __name__ == "__main__":
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    raise SystemExit(main())
