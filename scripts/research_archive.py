"""将已下载的研究 gzip 附件导入独立本机归档，汇总写入私有文件。"""
from __future__ import annotations

import argparse
import json
from pathlib import Path
import sqlite3
import sys

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'src'))

from peach import research_archive
from peach.interface_text import dev as t
from peach.user_messages import message_fields


def main(argv=None):
    parser = argparse.ArgumentParser(description=t('research_archive.description'))
    parser.add_argument('--archive', type=Path, required=True, help=t('research_archive.archiveHelp'))
    commands = parser.add_subparsers(dest='command', required=True)
    ingest = commands.add_parser('import', help=t('research_archive.importHelp'))
    ingest.add_argument('source', type=Path)
    ingest.add_argument('--received-at', required=True, help=t('research_archive.receivedAtHelp'))
    ingest.add_argument('--research-instance', help=t('research_archive.instanceHelp'))
    commands.add_parser('summary', help=t('research_archive.summaryHelp'))
    removal = commands.add_parser('delete-instance', help=t('research_archive.deleteInstanceHelp'))
    removal.add_argument('research_instance')
    removal.add_argument('--apply', action='store_true')
    expiry = commands.add_parser('prune', help=t('research_archive.pruneHelp'))
    expiry.add_argument('--retention-days', type=int, default=research_archive.DEFAULT_RETENTION_DAYS)
    expiry.add_argument('--apply', action='store_true')
    args = parser.parse_args(argv)
    try:
        result = _run(args)
    except research_archive.ArchiveError as error:
        print(json.dumps({'status': 'failed', **message_fields(error.code, error.params, key='reason')},
                         ensure_ascii=False), file=sys.stderr)
        return 1
    except (OSError, sqlite3.Error):
        print(json.dumps({'status': 'failed', **message_fields(
            'researchArchive.storageFailed', key='reason')}, ensure_ascii=False), file=sys.stderr)
        return 1
    print(json.dumps(result, ensure_ascii=False))
    return 0


def _run(args):
    if args.command == 'import':
        return research_archive.import_attachment(args.archive, args.source, received_at=args.received_at,
                                                 research_instance=args.research_instance)
    if args.command == 'delete-instance':
        return research_archive.delete_instance(args.archive, args.research_instance, apply=args.apply)
    if args.command == 'prune':
        return research_archive.prune(args.archive, retention_days=args.retention_days, apply=args.apply)
    return research_archive.export_summary(args.archive)


if __name__ == '__main__':
    raise SystemExit(main())
