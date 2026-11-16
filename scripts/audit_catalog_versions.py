"""只读核查全库版本与分卷，输出每个文件的分组及待复核原因。"""
from __future__ import annotations

import argparse
import json
import sys
from collections import Counter, defaultdict
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(PROJECT_ROOT / 'src'))

from peach.interface_text import dev as t
from peach.catalog_rules import duration_clusters, normalise_code_key
from peach.catalog_versions import filename_matches_code
from peach.review_csv import write_rows
from peach.scripting import open_readonly
from peach.web_catalog import _catalog_group_rows, _edition_groups, multipart_groups
from peach.web_state import WebContract

FIELDS = ('code', 'asset_id', 'name', 'disposal', 'resolution', 'duration', 'size',
          'status', 'version_id', 'version_label', 'part_ids')
#: 同番号组的 `status`：版本已归组、分卷已归组（其余或版本待复核）、番号证据冲突或未取得、缺时长、
#: 重复文件候选、剪辑或分卷关系待复核。
VERSIONS_GROUPED = 'versions-grouped'
PARTS_GROUPED = 'parts-grouped'
PARTS_GROUPED_VERSIONS_PENDING = 'parts-grouped-versions-pending'
PARTS_GROUPED_REST_PENDING = 'parts-grouped-rest-pending'
CODE_EVIDENCE_CONFLICT = 'code-evidence-conflict'
MISSING_DURATION = 'missing-duration'
DUPLICATE_CANDIDATES = 'duplicate-candidates'
RELATION_PENDING = 'relation-pending'
#: `asset_counts` 里 `disposal` 为空（还在库里）那一项的键。
IN_LIBRARY = 'in-library'


def group_status(code, items, parts_by_id, editions) -> str:
    live = [row for row in items if row.get('disposal') is None]
    grouped = [row for row in live if row['id'] in parts_by_id]
    if code in editions:
        return VERSIONS_GROUPED
    if len(grouped) == len(live) and len(live) > 1:
        if len({parts_by_id[row['id']][0]['id'] for row in grouped}) > 1:
            return PARTS_GROUPED_VERSIONS_PENDING
        return PARTS_GROUPED
    if len(grouped) > 1:
        return PARTS_GROUPED_REST_PENDING
    if not all(filename_matches_code(row) for row in live):
        return CODE_EVIDENCE_CONFLICT
    if any(float(row.get('duration') or 0) <= 0 for row in live):
        return MISSING_DURATION
    if len(live) > 1 and any(len(cluster) > 1 for cluster in duration_clusters(live)):
        return DUPLICATE_CANDIDATES
    return RELATION_PENDING


def audit(database: Path, output: Path, baseline: Path | None = None) -> dict:
    from peach.catalog_versions import resolution_label

    contract = WebContract(database)
    rows = _catalog_group_rows(contract)
    by_code = defaultdict(list)
    for row in rows:
        by_code[normalise_code_key(row['code'])].append(row)
    parts = multipart_groups(contract)
    parts_by_id = {row['id']: group for group in parts.values() for row in group}
    editions = _edition_groups(contract, by_code)
    editions_by_id = {row['id']: row for group in editions.values() for row in group}
    statuses, live_statuses = {}, {}
    records = []
    for code, items in sorted(by_code.items()):
        if len(items) < 2:
            continue
        live = [row for row in items if row.get('disposal') is None]
        status = group_status(code, items, parts_by_id, editions)
        statuses[code] = status
        if len(live) > 1:
            live_statuses[code] = status
        for row in items:
            edition = editions_by_id.get(row['id'], {})
            records.append({
                'code': code, 'asset_id': row['id'], 'name': row['name'],
                'disposal': row.get('disposal') or '', 'resolution': resolution_label(row),
                'duration': row.get('duration'), 'size': row.get('size'), 'status': status,
                'version_id': edition.get('version_id', ''),
                'version_label': edition.get('version_label', ''),
                'part_ids': '|'.join(str(part['id']) for part in parts_by_id.get(row['id'], [])),
            })
    with open_readonly(database) as connection:
        totals = {row[0] or IN_LIBRARY: row[1] for row in connection.execute(
            'SELECT disposal,count(*) FROM asset GROUP BY disposal')}
    summary = {'asset_counts': totals, 'coded_video_files': len(rows),
               'filename_code_projections': [row['id'] for row in rows if not row['raw_code']],
               'same_code_groups_including_trash': len(statuses),
               'same_code_live_groups': len(live_statuses),
               'live_group_statuses': dict(Counter(live_statuses.values())),
               'version_groups': len(editions), 'multipart_sets': len(parts),
               'ledger_changed': False}
    if baseline:
        initial = json.loads(baseline.read_text(encoding='utf-8'))
        newly_folded = {code: status for code, status in live_statuses.items()
                        if code in initial['ungrouped'] and status in (VERSIONS_GROUPED, PARTS_GROUPED)}
        summary['newly_folded_groups'] = newly_folded
        summary['baseline_groups_unfolded'] = [
            code for code, members in initial['parts'].items()
            if not all(row['id'] in parts_by_id or row['id'] in editions_by_id for row in members)]
    write_rows(output, FIELDS, records)
    output.with_suffix('.json').write_text(json.dumps(summary, ensure_ascii=False, indent=2), encoding='utf-8')
    return summary


def main() -> int:
    parser = argparse.ArgumentParser(description=t("audit_catalog_versions.description"))
    parser.add_argument('--db', type=Path, required=True)
    parser.add_argument('--out', type=Path, required=True)
    parser.add_argument('--baseline', type=Path)
    args = parser.parse_args()
    print(json.dumps(audit(args.db, args.out, args.baseline), ensure_ascii=False, indent=2))
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
