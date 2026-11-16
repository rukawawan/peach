"""实体事实种子包的导出与导入（ADR-0073）。

    seed_pack.py export --version 2026-10-23.1
    seed_pack.py validate
    seed_pack.py import
    seed_pack.py import --apply --backup peach-data/database/ledger.pre-seed-<时间戳>.db

`export` 只读账本，默认写入应用资源的 `resources/seed/entities.json`，由维护者复核并随版本分发；
格式 2 保留来源置信度、继承累计显式撤销，用内容摘要绑定版本与导入任务。内容变化须推进版本与修订，
同一版本的不同内容或回退修订被拒绝。`validate` 只校验包，不打开账本。`import` 默认 dry-run，只报会补多少；
`--apply` 必须同时给 `--backup`。撤回：`revert_auto_landing.py --source auto:seed`。
"""
from __future__ import annotations

import argparse
import json
import sys
from datetime import date
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))

from peach import seed_pack  # noqa: E402
from peach.config import DATABASE_PATH  # noqa: E402
from peach.interface_text import dev as t  # noqa: E402
from peach.scripting import add_ledger_write_args, open_for_write, open_readonly, verify_after_write  # noqa: E402


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description=t("seed_pack.description"), formatter_class=argparse.RawDescriptionHelpFormatter)
    commands = parser.add_subparsers(dest="command", required=True)
    export = commands.add_parser("export", help=t("seed_pack.exportHelp"))
    export.add_argument("--db", type=Path, default=DATABASE_PATH, help=t("seed_pack.dbHelp"))
    export.add_argument("--version", default=date.today().isoformat(),
                        help=t("seed_pack.versionHelp"))
    export.add_argument("--out", type=Path, default=seed_pack.DEFAULT_PACK, help=t("seed_pack.outHelp"))
    export.add_argument("--previous", type=Path, help=t("seed_pack.previousHelp"))
    export.add_argument("--revision", type=int, help=t("seed_pack.revisionHelp"))
    export.add_argument("--withdrawals", type=Path, help=t("seed_pack.withdrawalsHelp"))
    landing = commands.add_parser("import", help=t("seed_pack.importHelp"))
    add_ledger_write_args(landing)
    landing.add_argument("--pack", type=Path, default=seed_pack.DEFAULT_PACK, help=t("seed_pack.packHelp"))
    validation = commands.add_parser("validate", help=t("seed_pack.validateHelp"))
    validation.add_argument("--pack", type=Path, default=seed_pack.DEFAULT_PACK, help=t("seed_pack.packHelp"))
    return parser


def _version_in(text: str) -> str | None:
    """现有文件里的版本串；文件不是种子包就当没有版本，让导出照常覆盖。"""
    try:
        return str(json.loads(text)["version"])
    except (ValueError, KeyError, TypeError):
        return None


def export(args: argparse.Namespace) -> int:
    previous_path = args.previous or args.out
    previous = seed_pack.load(previous_path) if previous_path.is_file() else None
    inherited = list((previous or {}).get("withdrawals", []))
    withdrawals = json.loads(args.withdrawals.read_text(encoding="utf-8")) if args.withdrawals else []
    if not isinstance(withdrawals, list):
        raise ValueError(t("seed_pack.withdrawalsNotArray"))
    same_version = previous is not None and previous["version"] == args.version
    revision = args.revision if args.revision is not None else (
        max(1, previous.get("revision", 0)) if same_version else (previous or {}).get("revision", 0) + 1)
    connection = open_readonly(args.db)
    try:
        pack = seed_pack.export_pack(connection, version=args.version, revision=revision,
                                     withdrawals=[*inherited, *withdrawals],
                                     previous=None if same_version else previous)
    finally:
        connection.close()
    text = seed_pack.dump(pack)
    existing = args.out.read_text(encoding="utf-8") if args.out.is_file() else None
    changed = existing != text
    summary = {"out": str(args.out), "version": pack["version"], "changed": changed, **pack["counts"]}
    current = _version_in(existing) if existing is not None else None
    # 版本串按字典序比：ISO 日期加 `.n` 后缀在同一天十次以内单调；缺省的当天日期退不回已发过的 `.1`。
    if changed and current is not None and pack["version"] <= current:
        print(json.dumps({**summary, "written": False,
                          "error": t("seed_pack.versionNotNewer", version=pack['version'], current=current)},
                         ensure_ascii=False))
        return 2
    if changed:
        args.out.parent.mkdir(parents=True, exist_ok=True)
        args.out.write_text(text, encoding="utf-8", newline="\n")
    print(json.dumps(summary, ensure_ascii=False))
    return 0


def validate(args: argparse.Namespace) -> int:
    pack = seed_pack.load(args.pack)
    print(json.dumps({"valid": True, "format": pack["format"], "version": pack["version"],
                      "revision": pack.get("revision", 0), "content_sha256": seed_pack.seed_validation.digest(pack),
                      "counts": pack["counts"], "withdrawals": len(pack.get("withdrawals", []))}, ensure_ascii=False))
    return 0


def land(args: argparse.Namespace) -> int:
    pack = seed_pack.load(args.pack)
    connection = open_for_write(args)
    try:
        if not args.apply:
            report = seed_pack.plan(connection, pack)
            print(json.dumps(report, ensure_ascii=False))
            print(t("seed_pack.dryRun"))
            return 0
        with connection:
            report = seed_pack.land(connection, pack)
        integrity, orphans = verify_after_write(connection)
    finally:
        connection.close()
    print(json.dumps({**report, "integrity_check": integrity, "foreign_key_check": orphans},
                     ensure_ascii=False))
    return 0 if integrity == "ok" and orphans == 0 else 1


def main(argv: list[str] | None = None) -> int:
    args = build_parser().parse_args(argv)
    try:
        if args.command == "validate":
            return validate(args)
        return export(args) if args.command == "export" else land(args)
    except (ValueError, OSError) as exc:
        print(json.dumps({"written": False, "error": str(exc)}, ensure_ascii=False))
        return 2


if __name__ == "__main__":
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    raise SystemExit(main())
