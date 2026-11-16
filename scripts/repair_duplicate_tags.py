"""按登记同义词与字符归一规则整理重复标签；默认只生成复核 CSV。"""
from __future__ import annotations

import argparse
import sys
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent.parent
if str(PROJECT_ROOT / 'src') not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT / 'src'))

from peach.config import GENERATED_DIR
from peach.interface_text import dev as t
from peach.review_csv import write_rows
from peach.scripting import add_ledger_write_args, counts_of, open_for_write, verify_after_write
from peach.tag_management import apply_plan, preview
from peach.catalog_rules import canonical_tag_name

FIELDS = ('source_id', 'source_name', 'target_id', 'target_name', 'resources')


def build_parser():
    parser = argparse.ArgumentParser(description=t('repair_duplicate_tags.description'))
    add_ledger_write_args(parser)
    parser.add_argument('--review-csv', type=Path, default=GENERATED_DIR / 'duplicate-tags.csv')
    return parser


def run(args):
    connection = open_for_write(args)
    try:
        if args.apply:
            connection.execute('BEGIN IMMEDIATE')
        command = {'operation': 'repair', 'ids': []}
        plan = preview(connection, command)
        by_id = {row['entity_id']: row for row in plan['tags']}
        rows = []
        for group in plan['groups']:
            target = min((by_id[value] for value in group), key=lambda row: (row['k'] != canonical_tag_name(row['k']), -row['n'], row['entity_id']))
            rows.extend({'source_id': value, 'source_name': by_id[value]['k'], 'target_id': target['entity_id'],
                         'target_name': target['k'], 'resources': by_id[value]['n']} for value in group if value != target['entity_id'])
        write_rows(args.review_csv, FIELDS, rows)
        print(t('repair_duplicate_tags.planned', groups=len(plan["groups"]), assets=plan["assets"], csv=args.review_csv))
        if args.apply:
            before = counts_of(connection, {'asset_tag': 'SELECT count(*) FROM asset_tag'})
            apply_plan(connection, {**command, 'token': plan['token']})
            integrity, violations = verify_after_write(connection)
            if integrity != 'ok' or violations:
                raise ValueError(t('repair_duplicate_tags.checkFailed', integrity=integrity, violations=violations))
            connection.commit()
            after = counts_of(connection, {'asset_tag': 'SELECT count(*) FROM asset_tag'})
            print(t('repair_duplicate_tags.applied', entitiesBefore=before["entity"], entitiesAfter=after["entity"],
                    tagsBefore=before["asset_tag"], tagsAfter=after["asset_tag"], integrity=integrity, violations=violations))
        else:
            print(t('repair_duplicate_tags.reviewOnly'))
    except BaseException:
        connection.rollback()
        raise
    finally:
        connection.close()
    return 0


if __name__ == '__main__':
    raise SystemExit(run(build_parser().parse_args()))
