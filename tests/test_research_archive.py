"""下载研究附件的限量解析、事务归档与私有聚合回归。"""
from concurrent.futures import ThreadPoolExecutor
from contextlib import redirect_stderr, redirect_stdout
from datetime import datetime, timezone
import gzip
import importlib.util
import io
import json
from pathlib import Path
import sqlite3
import tempfile
import unittest
from contextlib import closing
from unittest.mock import patch

from peach import capacity_history, research_archive as archive


INSTANCE = 'a' * 32
OTHER = 'b' * 32
RECEIVED = '2026-11-09T12:00:00Z'


def payload(schema=5, *, rating=80, period='2026-W46'):
    value = {'schema': schema, 'peach': '0.9.0', 'period': period,
        'library': [{'code': 'TEST-001', 'rating': rating, 'liked': True}],
        'preferences': {kind: [] for kind in archive.KINDS},
        'coverage': {'active_files': 3, 'coded_files': 2, 'coded_works': 1, 'uncoded_items': 1}}
    value['preferences']['tag'] = [{'name': '剧情', 'favorite': True,
        'works': {'collected': 1, 'liked': 1, 'disliked': 0, 'watched': 0, 'ratings': {str(rating): 1}},
        'uncoded': {'collected': 1, 'liked': 0, 'disliked': 0, 'watched': 0, 'ratings': {}}}]
    if schema >= 5:
        value['capacity'] = capacity_history.project(None)
    return value


class ResearchArchiveTests(unittest.TestCase):
    def setUp(self):
        temporary = tempfile.TemporaryDirectory()
        self.addCleanup(temporary.cleanup)
        self.root = Path(temporary.name).resolve()
        self.destination = self.root / 'private-archive'
        self.source = self.root / 'download.json.gz'

    def attachment(self, value=None):
        raw = json.dumps(payload() if value is None else value, ensure_ascii=False).encode()
        self.source.write_bytes(gzip.compress(raw, mtime=0))
        return self.source

    def ingest(self, value=None, *, identity=INSTANCE, received_at=RECEIVED):
        return archive.import_attachment(self.destination, self.attachment(value),
                                         received_at=received_at, research_instance=identity)

    def test_historical_schemas_preserve_original_gzip_and_release(self):
        for schema in (4, 5, 6):
            with self.subTest(schema=schema):
                value = payload(schema, period=f'2026-W{40 + schema}')
                self.ingest(value)
        with closing(sqlite3.connect(self.destination / archive.DATABASE)) as connection:
            rows = connection.execute('SELECT schema,peach,attachment FROM snapshot ORDER BY schema').fetchall()
        self.assertEqual([row[:2] for row in rows], [(4, '0.9.0'), (5, '0.9.0'), (6, '0.9.0')])
        self.assertEqual(json.loads(gzip.decompress(rows[-1][2])), payload(6, period='2026-W46'))

    def test_current_schema_checks_controlled_tags_and_legacy_tags_remain_readable(self):
        value = payload(5)
        value['library'][0]['manual_tags'] = ['旧版自定义标签']
        self.assertEqual(archive.parse_attachment(self.attachment(value).read_bytes())[0], value)
        value['schema'] = 6
        with self.assertRaises(archive.ArchiveError):
            archive.parse_attachment(self.attachment(value).read_bytes())

    def test_unknown_fields_invalid_values_and_duplicate_json_fields_fail(self):
        variants = []
        for field, value in [('schema', 7), ('period', '2026-W54'), ('peach', 'private/path'), ('secret', 'private')]:
            candidate = payload()
            candidate[field] = value
            variants.append(candidate)
        candidate = payload()
        candidate['coverage']['coded_works'] = 3
        variants.append(candidate)
        candidate = payload()
        candidate['library'][0]['rating'] = float('nan')
        variants.append(candidate)
        for value in variants:
            with self.subTest(value=value), self.assertRaises(archive.ArchiveError):
                archive.parse_attachment(self.attachment(value).read_bytes())
        with self.assertRaises(archive.ArchiveError):
            archive.parse_attachment(gzip.compress(b'{"schema":4,"schema":5}'))

    def test_corrupt_gzip_and_both_size_limits_fail_before_database_creation(self):
        self.source.write_bytes(b'sensitive attachment text')
        with self.assertRaises(archive.ArchiveError):
            archive.import_attachment(self.destination, self.source, received_at=RECEIVED)
        self.assertFalse(self.destination.exists())
        wire = self.attachment().read_bytes()
        with patch.object(archive, 'MAX_BYTES', len(wire) - 1), self.assertRaises(archive.ArchiveError):
            archive.parse_attachment(wire)
        with patch.object(archive, 'MAX_RAW_BYTES', 30), self.assertRaises(archive.ArchiveError):
            archive.parse_attachment(wire)
        with self.assertRaises(archive.ArchiveError):
            archive.parse_attachment(wire[:-4])

    def test_same_instance_week_is_idempotent_and_newer_snapshot_replaces(self):
        self.assertEqual(self.ingest()['status'], 'imported')
        self.assertEqual(self.ingest()['status'], 'duplicate')
        self.assertEqual(self.ingest(payload(rating=50), received_at='2026-11-10T12:00:00Z')['status'], 'updated')
        self.assertEqual(self.ingest(received_at=RECEIVED)['status'], 'older')
        result = archive.summarize(self.destination)
        self.assertEqual(result['retained_snapshots'], 1)
        self.assertEqual(result['instances']['works'][0]['ratings']['mean'], 50)
        self.assertEqual(result['instance_snapshots'][0]['received_at'], '2026-11-10T12:00:00.000000+00:00')

    def test_same_time_conflicts_choose_content_hash_independent_of_import_order(self):
        files = []
        for score in (40, 90):
            path = self.root / f'{score}.gz'
            path.write_bytes(self.attachment(payload(rating=score)).read_bytes())
            files.append(path)
        for root, order in ((self.destination, files), (self.root / 'other-archive', files[::-1])):
            for source in order:
                archive.import_attachment(root, source, received_at=RECEIVED, research_instance=INSTANCE)
        self.assertEqual(archive.summarize(self.destination), archive.summarize(self.root / 'other-archive'))

    def test_latest_week_and_unlinked_legacy_have_separate_denominators(self):
        self.ingest(payload(rating=30, period='2026-W45'))
        self.ingest(payload(rating=80))
        self.ingest(payload(rating=100), identity=OTHER)
        self.ingest(payload(4, rating=10), identity=None)
        self.ingest(payload(4, rating=10), identity=None)
        result = archive.summarize(self.destination)
        linked = result['instances']
        self.assertEqual((result['retained_snapshots'], linked['sample_count']), (4, 2))
        self.assertEqual(linked['coverage_totals'], {'active_files': 6, 'coded_files': 4, 'coded_works': 2, 'uncoded_items': 2})
        work = linked['works'][0]
        self.assertEqual((work['holding_samples'], work['ratings']['count'], work['ratings']['mean']), (2, 2, 90))
        group = linked['preferences']['tag'][0]
        self.assertEqual((group['reporting_samples'], group['favorite_samples']), (2, 2))
        self.assertEqual((group['works']['collected'], group['uncoded']['collected']), (2, 2))
        self.assertEqual(result['unlinked_legacy_samples']['sample_count'], 1)
        self.assertEqual(result['unlinked_legacy_samples']['works'][0]['ratings']['mean'], 10)
        self.assertEqual(result['contact_basis'], 'attachment_received_at')

    def test_delete_and_retention_preview_preserve_data_and_apply_invalidates_summary(self):
        self.ingest(payload(period='2026-W45'))
        self.ingest()
        self.ingest(identity=OTHER)
        archive.export_summary(self.destination)
        report = self.destination / archive.REPORT
        self.assertTrue(report.is_file())
        result = archive.delete_instance(self.destination, INSTANCE)
        self.assertEqual((result['matched_snapshots'], result['retained_snapshots']), (2, 3))
        self.assertTrue(report.is_file())
        result = archive.delete_instance(self.destination, INSTANCE, apply=True)
        self.assertEqual(result['retained_snapshots'], 1)
        self.assertFalse(report.exists())
        now = datetime(2026, 12, 10, 12, tzinfo=timezone.utc)
        self.assertEqual(archive.prune(self.destination, now=now)['matched_snapshots'], 1)
        self.assertEqual(archive.summarize(self.destination)['retained_snapshots'], 1)
        self.assertEqual(archive.prune(self.destination, now=now, apply=True)['retained_snapshots'], 0)
        result = archive.summarize(self.destination)
        self.assertEqual((result['status'], result['latest_snapshot_received_at']), ('empty', None))

    def test_concurrent_imports_keep_one_latest_snapshot(self):
        files = []
        for index in range(4):
            path = self.root / f'input-{index}.gz'
            path.write_bytes(self.attachment(payload(rating=20 + index)).read_bytes())
            files.append(path)
        def ingest(index):
            return archive.import_attachment(self.destination, files[index], research_instance=INSTANCE,
                                             received_at=f'2026-11-{10 + index}T12:00:00Z')
        with ThreadPoolExecutor() as executor:
            list(executor.map(ingest, range(4)))
        result = archive.summarize(self.destination)
        self.assertEqual(result['retained_snapshots'], 1)
        self.assertEqual(result['instances']['works'][0]['ratings']['mean'], 23)

    def test_failed_write_keeps_previous_snapshot_and_reports_storage_failure(self):
        self.ingest()
        with closing(sqlite3.connect(self.destination / archive.DATABASE)) as connection, connection:
            connection.execute("""CREATE TRIGGER reject_update BEFORE UPDATE ON snapshot
                BEGIN SELECT RAISE(ABORT,'private details'); END""")
        with self.assertRaises(sqlite3.IntegrityError):
            self.ingest(payload(rating=30), received_at='2026-11-10T12:00:00Z')
        self.assertEqual(archive.summarize(self.destination)['instances']['works'][0]['ratings']['mean'], 80)

    def test_invalid_identity_naive_timestamp_and_retention_are_explicit_failures(self):
        for options in ({'identity': 'bad'}, {'received_at': '2026-11-09T12:00:00'}):
            with self.subTest(options=options), self.assertRaises(archive.ArchiveError):
                self.ingest(**options)
        with self.assertRaises(archive.ArchiveError):
            archive.prune(self.destination, retention_days=0)

    def test_cli_writes_sensitive_summary_only_to_private_file(self):
        path = Path(__file__).resolve().parents[1] / 'scripts' / 'research_archive.py'
        spec = importlib.util.spec_from_file_location('research_archive_cli', path)
        cli = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(cli)
        output, errors = io.StringIO(), io.StringIO()
        with redirect_stdout(output), redirect_stderr(errors):
            self.assertEqual(cli.main(['--archive', str(self.destination), 'import', str(self.attachment()),
                '--received-at', RECEIVED, '--research-instance', INSTANCE]), 0)
            self.assertEqual(cli.main(['--archive', str(self.destination), 'summary']), 0)
            self.source.write_bytes(b'private-malformed-attachment')
            self.assertEqual(cli.main(['--archive', str(self.destination), 'import', str(self.source),
                                      '--received-at', RECEIVED]), 1)
        self.assertNotIn('TEST-001', output.getvalue() + errors.getvalue())
        self.assertNotIn('剧情', output.getvalue() + errors.getvalue())
        self.assertNotIn('private-malformed-attachment', errors.getvalue())
        report = json.loads((self.destination / archive.REPORT).read_text(encoding='utf-8'))
        self.assertEqual(report['instances']['works'][0]['code'], 'TEST-001')
