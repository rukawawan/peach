"""维护者本机研究附件归档与群体汇总，使用独立 SQLite 数据库。"""
from __future__ import annotations

from collections import Counter
from datetime import date, datetime, timedelta, timezone
import gzip
import hashlib
import io
import json
from pathlib import Path
import re
import sqlite3
import zlib

from .capacity_history import valid_projection as valid_capacity
from .fsutil import atomic_write_text
from .library_research import COUNTS, KINDS, valid_projection
from .library_sharing import MAX_BYTES, MAX_RAW_BYTES
from .research_participation import instance
from .user_messages import UserFacingError

DATABASE = 'archive.sqlite3'
REPORT = 'summary.json'
DEFAULT_RETENTION_DAYS = 30
FIELDS = {'schema', 'peach', 'period', 'library', 'preferences', 'coverage'}


class ArchiveError(UserFacingError, ValueError):
    """可公开的归档失败原因，不包含原始附件内容。"""


def timestamp(value):
    """将显式来源时间规范为 UTC，拒绝缺少时区的时间。"""
    try:
        moment = datetime.fromisoformat(value.replace('Z', '+00:00'))
        if moment.tzinfo is None:
            raise ValueError
        return moment.astimezone(timezone.utc).isoformat(timespec='microseconds')
    except (ValueError, TypeError, AttributeError):
        raise ArchiveError('researchArchive.timeRequiresTimezone') from None


def _unique_object(pairs):
    value = {}
    for key, item in pairs:
        if key in value:
            raise ArchiveError('researchArchive.duplicateFields')
        value[key] = item
    return value


def _valid_header(payload):
    if not isinstance(payload, dict) or type(payload.get('schema')) is not int:
        return False
    schema = payload['schema']
    expected = FIELDS | {'capacity'} if schema in {5, 6} else FIELDS
    if schema == 4 and 'capacity' in payload:
        expected = expected | {'capacity'}
    if schema not in {4, 5, 6} or set(payload) != expected:
        return False
    if not isinstance(payload['peach'], str) or not re.fullmatch(r'[0-9A-Za-z.+-]{1,64}', payload['peach']):
        return False
    period = payload['period']
    if not isinstance(period, str) or not re.fullmatch(r'\d{4}-W\d{2}', period):
        return False
    try:
        date.fromisocalendar(int(period[:4]), int(period[6:]), 1)
    except ValueError:
        return False
    return isinstance(payload['library'], list) and isinstance(payload['preferences'], dict)


def parse_attachment(wire):
    """限量解压并按历史字段白名单校验，返回附件 JSON 与原文摘要。"""
    if len(wire) > MAX_BYTES:
        raise ArchiveError('researchArchive.compressedTooLarge')
    try:
        with gzip.GzipFile(fileobj=io.BytesIO(wire)) as compressed:
            raw = compressed.read(MAX_RAW_BYTES + 1)
        if len(raw) > MAX_RAW_BYTES:
            raise ArchiveError('researchArchive.rawTooLarge')
        payload = json.loads(raw, object_pairs_hook=_unique_object)
        if not _valid_header(payload) or not valid_projection(payload, controlled_tags=payload['schema'] >= 6):
            raise ArchiveError('researchArchive.invalidProjection')
        if 'capacity' in payload and not valid_capacity(payload['capacity']):
            raise ArchiveError('researchArchive.invalidCapacity')
    except ArchiveError:
        raise
    except (ValueError, TypeError, KeyError, OSError, EOFError, zlib.error, RecursionError):
        raise ArchiveError('researchArchive.invalidAttachment') from None
    return payload, hashlib.sha256(raw).hexdigest()


def _connect(root):
    """显式指定的目录只写归档专用库，事务覆盖一次完整更新。"""
    root = Path(root).resolve()
    root.mkdir(parents=True, exist_ok=True, mode=0o700)
    connection = sqlite3.connect(root / DATABASE, timeout=5)
    connection.row_factory = sqlite3.Row
    try:
        connection.execute('PRAGMA secure_delete=ON')
        connection.execute('BEGIN IMMEDIATE')
        version = connection.execute('PRAGMA user_version').fetchone()[0]
        if version not in {0, 1}:
            raise ArchiveError('researchArchive.unsupportedDatabaseVersion')
        if version == 0:
            if connection.execute("SELECT name FROM sqlite_master WHERE type='table'").fetchone():
                raise ArchiveError('researchArchive.nonArchiveDatabase')
            connection.execute('''CREATE TABLE snapshot (
                identity TEXT NOT NULL, period TEXT NOT NULL, scope TEXT NOT NULL,
                received_at TEXT NOT NULL, digest TEXT NOT NULL, peach TEXT NOT NULL,
                schema INTEGER NOT NULL, attachment BLOB NOT NULL,
                PRIMARY KEY (identity, period))''')
            connection.execute('PRAGMA user_version=1')
        connection.commit()
        return connection
    except BaseException:
        connection.close()
        raise


def import_attachment(root, source, *, received_at, research_instance=None):
    """同实例同周保留最新原始 gzip，旧无实例附件按内容独立计样本。"""
    received_at = timestamp(received_at)
    if research_instance is not None and not instance(research_instance):
        raise ArchiveError('researchArchive.invalidInstance')
    with Path(source).open('rb') as stream:
        wire = stream.read(MAX_BYTES + 1)
    payload, digest = parse_attachment(wire)
    identity = research_instance or f'legacy-{digest}'
    scope = 'instance' if research_instance else 'legacy-sample'
    connection = _connect(root)
    try:
        with connection:
            connection.execute('BEGIN IMMEDIATE')
            previous = connection.execute('SELECT received_at,digest FROM snapshot WHERE identity=? AND period=?',
                                          (identity, payload['period'])).fetchone()
            status = _import_status(previous, received_at, digest)
            if status in {'imported', 'updated'}:
                (Path(root).resolve() / REPORT).unlink(missing_ok=True)
                connection.execute('''INSERT INTO snapshot VALUES (?,?,?,?,?,?,?,?)
                    ON CONFLICT(identity,period) DO UPDATE SET
                    received_at=excluded.received_at,digest=excluded.digest,peach=excluded.peach,
                    schema=excluded.schema,attachment=excluded.attachment''',
                    (identity, payload['period'], scope, received_at, digest, payload['peach'], payload['schema'], wire))
        return {'status': status, 'scope': scope, 'retained_snapshots': _size(connection)}
    finally:
        connection.close()


def _import_status(previous, received_at, digest):
    if previous is None:
        return 'imported'
    if (received_at, digest) <= (previous['received_at'], previous['digest']):
        return 'duplicate' if digest == previous['digest'] else 'older'
    return 'updated'


def _size(connection):
    return connection.execute('SELECT count(*) FROM snapshot').fetchone()[0]


def _remove(root, clause, parameters, *, apply):
    connection = _connect(root)
    try:
        with connection:
            connection.execute('BEGIN IMMEDIATE')
            count = connection.execute(f'SELECT count(*) FROM snapshot WHERE {clause}', parameters).fetchone()[0]
            if apply:
                (Path(root).resolve() / REPORT).unlink(missing_ok=True)
                connection.execute(f'DELETE FROM snapshot WHERE {clause}', parameters)
        return {'status': 'deleted' if apply else 'preview', 'matched_snapshots': count,
                'retained_snapshots': _size(connection)}
    finally:
        connection.close()


def delete_instance(root, research_instance, *, apply=False):
    """按研究实例预演或删除全部周快照。"""
    if not instance(research_instance):
        raise ArchiveError('researchArchive.invalidInstance')
    return _remove(root, 'identity=? AND scope=?', (research_instance, 'instance'), apply=apply)


def prune(root, *, retention_days=DEFAULT_RETENTION_DAYS, apply=False, now=None):
    """按来源接收时间预演或清除超过留存周期的快照。"""
    if type(retention_days) is not int or retention_days < 1:
        raise ArchiveError('researchArchive.invalidRetention')
    moment = datetime.now(timezone.utc) if now is None else now
    try:
        cutoff = timestamp((moment - timedelta(days=retention_days)).isoformat())
    except OverflowError:
        raise ArchiveError('researchArchive.retentionOutOfRange') from None
    return {**_remove(root, 'received_at<?', (cutoff,), apply=apply), 'retention_days': retention_days}


def _rating_result(histogram):
    count = sum(histogram.values())
    total = sum(float(score) * amount for score, amount in histogram.items())
    return {'count': count, 'mean': round(total / count, 2) if count else None,
            'histogram': dict(sorted(histogram.items(), key=lambda item: float(item[0])))}


def _work_summary(payloads):
    works = {}
    for payload in payloads:
        for work in payload['library']:
            row = works.setdefault(work['code'], {'code': work['code'], 'holding_samples': 0,
                'liked_samples': 0, 'disliked_samples': 0, 'watched_samples': 0, 'ratings': Counter()})
            row['holding_samples'] += 1
            row['liked_samples'] += bool(work.get('liked'))
            row['disliked_samples'] += work.get('feedback') == 'dislike'
            row['watched_samples'] += bool(work.get('play_count') or work.get('watch_ratio') or work.get('feedback') == 'seen')
            if 'rating' in work:
                row['ratings'][str(float(work['rating']))] += 1
    for row in works.values():
        row['ratings'] = _rating_result(row['ratings'])
    return sorted(works.values(), key=lambda row: (-row['holding_samples'], row['code']))


def _preference_summary(payloads, kind):
    groups = {}
    for payload in payloads:
        for preference in payload['preferences'][kind]:
            group = groups.setdefault(preference['name'], {'name': preference['name'], 'reporting_samples': 0,
                                                          'favorite_samples': 0, 'works': {}, 'uncoded': {}})
            group['reporting_samples'] += 1
            group['favorite_samples'] += bool(preference.get('favorite'))
            for scope in ('works', 'uncoded'):
                if scope in preference:
                    _merge_counts(group[scope], preference[scope])
    for group in groups.values():
        for scope in ('works', 'uncoded'):
            if group[scope]:
                group[scope]['ratings'] = _rating_result(group[scope]['ratings'])
    return sorted(groups.values(), key=lambda row: (-row['reporting_samples'], row['name']))


def _merge_counts(target, source):
    for key in COUNTS:
        target[key] = target.get(key, 0) + source[key]
    target.setdefault('ratings', Counter()).update(source['ratings'])


def _cohort_summary(rows):
    payloads = [parse_attachment(row['attachment'])[0] for row in rows]
    coverage = Counter()
    for payload in payloads:
        coverage.update(payload['coverage'])
    return {'sample_count': len(payloads), 'coverage_totals': dict(coverage),
            'releases': dict(Counter(payload['peach'] for payload in payloads)),
            'works': _work_summary(payloads),
            'preferences': {kind: _preference_summary(payloads, kind) for kind in KINDS}}


def summarize(root):
    """每实例取最新周，历史无实例样本独立汇总，返回值只供私有文件消费。"""
    connection = _connect(root)
    try:
        with connection:
            connection.execute('BEGIN')
            return _read_summary(connection)
    finally:
        connection.close()


def export_summary(root):
    """汇总只写固定私有文件，与导入和删除共用数据库事务锁。"""
    connection = _connect(root)
    try:
        with connection:
            connection.execute('BEGIN IMMEDIATE')
            summary = _read_summary(connection)
            atomic_write_text(Path(root).resolve() / REPORT,
                              json.dumps(summary, ensure_ascii=False, allow_nan=False, indent=2), mode=0o600)
        return {'status': summary['status'], 'retained_snapshots': summary['retained_snapshots'],
                'instance_samples': summary['instances']['sample_count'],
                'unlinked_legacy_samples': summary['unlinked_legacy_samples']['sample_count']}
    finally:
        connection.close()


def _read_summary(connection):
    rows = connection.execute('''SELECT * FROM snapshot WHERE (identity,period) IN
        (SELECT identity,max(period) FROM snapshot GROUP BY identity) ORDER BY identity''').fetchall()
    retained, last_received = connection.execute('SELECT count(*),max(received_at) FROM snapshot').fetchone()
    instances = [row for row in rows if row['scope'] == 'instance']
    legacy = [row for row in rows if row['scope'] == 'legacy-sample']
    return {'format': 1, 'status': 'available' if rows else 'empty', 'retained_snapshots': retained,
            'selection': 'latest-period-per-instance; legacy-content-samples-separate',
            'instances': _cohort_summary(instances), 'unlinked_legacy_samples': _cohort_summary(legacy),
            'latest_snapshot_received_at': last_received,
            'contact_basis': 'attachment_received_at',
            'instance_snapshots': [{'research_instance': row['identity'], 'period': row['period'],
                'peach': row['peach'], 'received_at': row['received_at']} for row in instances]}
