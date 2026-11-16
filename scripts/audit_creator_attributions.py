"""全库创作者归属审计；修复须带审计计划、备份和可回滚记录。"""
from __future__ import annotations

import argparse
import json
import sys
from collections import Counter
from contextlib import closing
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent.parent
SRC_DIR = PROJECT_ROOT / "src"
if str(SRC_DIR) not in sys.path:
    sys.path.insert(0, str(SRC_DIR))

from peach.review_csv import write_rows
from peach.fsutil import atomic_write_text
from peach.interface_text import dev as t
from peach.scripting import open_readonly
from peach.metadata_creator_attributions import (
    FIELDS, apply_plan, collect, fingerprint, restore,
)
from peach.scripting import add_ledger_write_args, counts_of, open_for_write, verify_after_write


ITEM_FIELDS = FIELDS
SUMMARY_FIELDS = ("entity_id", "verdict", "current_creator", "assets", "action", "reason")
STRUCTURAL = {"门槛", "视频", "宣傳文件", "宣传文件", "asce"}


def _parts(path: str) -> list[str]:
    return [part for part in path.replace("/", "\\").split("\\") if part]


def classify(path: str, creator: str) -> tuple[str, str, str, str, str, str]:
    parts = _parts(path)
    folded = creator.casefold().strip()
    matches = [index for index, part in enumerate(parts) if part.casefold().strip() == folded]
    parent = parts[matches[0] - 1] if matches and matches[0] else ""
    child = parts[matches[0] + 1] if matches and matches[0] + 1 < len(parts) else ""
    normalized = "\\".join(parts).casefold()

    if folded == "足交仙人".casefold() and matches:
        return "yes", parent, child, "replace", "suzuq", t("audit_creator_attributions.watermarkConfirmed")
    if folded == "捅主任".casefold() and normalized.startswith(
        "b:\\mvp\\捅主任\\tokyodolls\\".casefold()
    ):
        return "yes", parent, child, "remove", "", t("audit_creator_attributions.subtreeConflict")
    if creator in STRUCTURAL:
        return ("yes" if matches else "no", parent, child, "review_structural", "",
                t("audit_creator_attributions.structuralDirectory"))
    if matches:
        return ("yes", parent, child, "review_folder_projection", "",
                t("audit_creator_attributions.pathOnlyMatch"))
    return "no", "", "", "review_legacy_projection", "", t("audit_creator_attributions.legacyNoEvidence")


def rows(database: Path) -> list[dict[str, object]]:
    connection = open_readonly(database)
    try:
        return collect(connection)
    finally:
        connection.close()


def summaries(items: list[dict[str, object]]) -> list[dict[str, object]]:
    counts = Counter((row['entity_id'], str(row["verdict"]), str(row["current_creator"]),
                      str(row['action']), str(row["reason"])) for row in items)
    return [
        {"entity_id": entity_id, "verdict": verdict, "current_creator": creator,
         "assets": count, "action": action, "reason": reason}
        for (entity_id, verdict, creator, action, reason), count in sorted(counts.items(), key=lambda item: (-item[1], item[0]))
    ]


def entity_summary(database: Path, items: list[dict]) -> list[dict]:
    result = summaries(items)
    with closing(open_readonly(database)) as connection:
        for row in connection.execute("SELECT e.id,e.canonical_name FROM entity e WHERE e.kind='creator' "
                                      "AND NOT EXISTS(SELECT 1 FROM asset_entity ae WHERE ae.entity_id=e.id AND ae.role='creator')"):
            result.append({'entity_id': row['id'], 'current_creator': row['canonical_name'],
                           'verdict':'empty_entity', 'assets':0, 'action':'keep',
                           'reason': t('audit_creator_attributions.emptyEntity')})
    return result


def _write(path: Path, fields: tuple[str, ...], data: list[dict[str, object]]) -> None:
    write_rows(path, fields, data)


def _write_ledger(args, payload: dict) -> None:
    connection = open_for_write(args)
    try:
        before = counts_of(connection)
        baseline_integrity, _ = verify_after_write(connection)
        baseline_foreign_keys = sorted((tuple(row) for row in connection.execute('PRAGMA foreign_key_check')), key=repr)
        if baseline_integrity != 'ok':
            raise ValueError(t('audit_creator_attributions.integrityFailed'))
        connection.execute('PRAGMA foreign_keys=ON')
        connection.execute('BEGIN IMMEDIATE')
        if args.restore:
            restore(connection, payload)
            report = {'restored': len(payload['relations'])}
        else:
            report = apply_plan(connection, payload['rows'])
        integrity, foreign_keys = verify_after_write(connection)
        current_foreign_keys = sorted((tuple(row) for row in connection.execute('PRAGMA foreign_key_check')), key=repr)
        if integrity != 'ok' or current_foreign_keys != baseline_foreign_keys:
            raise ValueError(t('audit_creator_attributions.repairChangedIntegrity'))
        after = counts_of(connection)
        report.update(before_counts=before, after_counts=after, integrity=integrity,
                      foreign_keys=foreign_keys, baseline_foreign_keys=baseline_foreign_keys, status='prepared')
        if args.manifest:
            args.manifest.parent.mkdir(parents=True, exist_ok=True)
            with args.manifest.open('x', encoding='utf-8') as handle:
                json.dump(report, handle, ensure_ascii=False, indent=2)
        connection.commit()
        report['status'] = 'committed'
        if args.manifest:
            atomic_write_text(args.manifest, json.dumps(report, ensure_ascii=False, indent=2))
        print(json.dumps({'before': before, 'after': after, 'integrity': integrity,
                          'foreign_keys': foreign_keys, 'status': report['status']}, ensure_ascii=False))
    except Exception:
        connection.rollback()
        raise
    finally:
        connection.close()


def main() -> int:
    parser = add_ledger_write_args(argparse.ArgumentParser(description=t("audit_creator_attributions.description")))
    parser.add_argument("--output", type=Path, help=t("audit_creator_attributions.outputHelp"))
    parser.add_argument("--summary", type=Path, help=t("audit_creator_attributions.summaryHelp"))
    parser.add_argument("--repair-plan", type=Path, help=t("audit_creator_attributions.repairPlanHelp"))
    parser.add_argument("--manifest", type=Path, help=t("audit_creator_attributions.manifestHelp"))
    parser.add_argument("--restore", type=Path, help=t("audit_creator_attributions.restoreHelp"))
    args = parser.parse_args()
    if args.restore or args.apply:
        if not args.apply or not args.backup:
            parser.error(t("audit_creator_attributions.writeNeedsBackup"))
        if not args.restore and (not args.repair_plan or not args.manifest):
            parser.error(t("audit_creator_attributions.repairNeedsPlan"))
        if args.manifest and args.manifest.exists():
            parser.error(t("audit_creator_attributions.manifestExists"))
        source = args.restore or args.repair_plan
        payload = json.loads(source.read_text(encoding='utf-8'))
        if not args.restore and fingerprint(payload['rows']) != payload['sha256']:
            parser.error(t("audit_creator_attributions.planDigestMismatch"))
        _write_ledger(args, payload)
        return 0
    if not args.output:
        parser.error(t("audit_creator_attributions.previewNeedsOutput"))
    items = rows(args.db)
    _write(args.output, ITEM_FIELDS, items)
    summary = entity_summary(args.db, items)
    if args.summary:
        _write(args.summary, SUMMARY_FIELDS, summary)
    plan = [row for row in items if row['action'] in {'remove','replace'}]
    if args.repair_plan:
        args.repair_plan.parent.mkdir(parents=True, exist_ok=True)
        atomic_write_text(args.repair_plan, json.dumps({'rows': plan, 'sha256': fingerprint(plan)},
                                                     ensure_ascii=False, indent=2))
    print(t("audit_creator_attributions.previewed", items=len(items), groups=len(summary), errors=len(plan)))
    print(json.dumps(dict(Counter((str(row['verdict']) for row in items))), ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
