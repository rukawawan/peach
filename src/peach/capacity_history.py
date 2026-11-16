"""本机容量的 UTC 日聚合；研究投影不读取媒体、目录清单或路径。"""
from __future__ import annotations

from datetime import date, datetime, timedelta, timezone
import json
import logging

from filelock import FileLock

from .fsutil import atomic_write_text

SCHEMA = 1
RETENTION_DAYS = 90
MAX_FILE_BYTES = 256 * 1024
MAX_BYTES = 2 ** 53 - 1
MAX_COMPARISONS = 2 ** 31 - 1
METRICS = ('data', 'cache')
LOGGER = logging.getLogger(__name__)


def _today():
    return datetime.now(timezone.utc).date()


def _path(config):
    return config.directory('state') / 'capacity-history.json'


def _integer(value, maximum=MAX_BYTES):
    return type(value) is int and 0 <= value <= maximum


def _day(value):
    if not isinstance(value, str) or date.fromisoformat(value).isoformat() != value:
        raise ValueError("invalid capacity history date")
    return date.fromisoformat(value)


def _valid_metric(value, *, local=False):
    fields = {'current_bytes', 'peak_bytes', 'positive_growth_bytes', 'growth_observations'}
    fields.add('first_bytes' if local else 'observed_days')
    if not isinstance(value, dict) or set(value) != fields:
        return False
    if local:
        return (all(_integer(value[key]) for key in fields - {'growth_observations'})
                and _integer(value['growth_observations'], MAX_COMPARISONS)
                and value['peak_bytes'] >= max(value['first_bytes'], value['current_bytes'])
                and (value['growth_observations'] > 0 or value['positive_growth_bytes'] == 0))
    observed, comparisons = value['observed_days'], value['growth_observations']
    if not _integer(observed, 30) or not _integer(comparisons, MAX_COMPARISONS):
        return False
    if observed == 0:
        return comparisons == 0 and all(value[key] is None for key in
                                       ('current_bytes', 'peak_bytes', 'positive_growth_bytes'))
    return (all(_integer(value[key]) for key in ('current_bytes', 'peak_bytes'))
            and value['peak_bytes'] >= value['current_bytes'] and comparisons >= observed - 1
            and (value['positive_growth_bytes'] is None if comparisons == 0
                 else _integer(value['positive_growth_bytes'])
                 and value['positive_growth_bytes'] <= value['peak_bytes'] * comparisons))


def _read(config):
    path = _path(config)
    try:
        if path.stat().st_size > MAX_FILE_BYTES:
            raise ValueError("capacity history exceeds the local size limit")
        value = json.loads(path.read_text(encoding='utf-8'))
    except FileNotFoundError:
        return None
    _validate_state(value)
    return value


def _validate_state(value):
    if (not isinstance(value, dict) or set(value) != {'schema', 'activity_started', 'days'}
            or type(value['schema']) is not int or value['schema'] != SCHEMA
            or not isinstance(value['days'], dict) or len(value['days']) > RETENTION_DAYS):
        raise ValueError("invalid capacity history format")
    started = _day(value['activity_started']) if value['activity_started'] is not None else None
    growth = {key: 0 for key in METRICS}
    cleaned = 0
    for stamp, row in value['days'].items():
        day = _day(stamp)
        if (not isinstance(row, dict) or set(row) != {'active', 'data', 'cache', 'cleaned_bytes'}
                or type(row['active']) is not bool or (row['active'] and (started is None or day < started))
                or (row['cleaned_bytes'] is not None and not _integer(row['cleaned_bytes']))):
            raise ValueError("invalid capacity history day record")
        cleaned += row['cleaned_bytes'] or 0
        for key in METRICS:
            if row[key] is not None:
                if not _valid_metric(row[key], local=True):
                    raise ValueError("invalid capacity history measurement")
                growth[key] += row[key]['positive_growth_bytes']
    if not _integer(cleaned) or not all(_integer(amount) for amount in growth.values()):
        raise ValueError("capacity history totals out of range")


def sample_due(config) -> bool:
    """当日数据和缓存均取得后不再请求完整采样；缺失值不算取得。"""
    value = _read(config)
    row = value['days'].get(_today().isoformat()) if value is not None else None
    return row is None or any(row[key] is None for key in METRICS)


def _update(config, change):
    path = _path(config)
    path.parent.mkdir(parents=True, exist_ok=True)
    with FileLock(str(path) + '.lock', timeout=5):
        value = _read(config) or {'schema': SCHEMA, 'activity_started': None, 'days': {}}
        today = _today()
        cutoff = today - timedelta(days=RETENTION_DAYS - 1)
        value['days'] = {stamp: row for stamp, row in value['days'].items() if _day(stamp) >= cutoff}
        row = value['days'].setdefault(today.isoformat(),
            {'active': False, 'data': None, 'cache': None, 'cleaned_bytes': None})
        if not change(value, row):
            return False
        _validate_state(value)
        encoded = json.dumps(value, ensure_ascii=False, separators=(',', ':'))
        if len(encoded.encode('utf-8')) > MAX_FILE_BYTES:
            raise ValueError("capacity history exceeds the local size limit")
        atomic_write_text(path, encoded)
    return True


def record_sample(config, data_bytes: int | None, cache_bytes: int | None, cleaned_bytes: int = 0) -> bool:
    """接收已有容量测量和本次实际清理字节，不触发扫描或上报。"""
    if (any(amount is not None and not _integer(amount) for amount in (data_bytes, cache_bytes))
            or not _integer(cleaned_bytes)):
        raise ValueError("capacity sample must be a non-negative integer in range or None")
    if data_bytes is None and cache_bytes is None and cleaned_bytes == 0:
        return False
    def change(_value, row):
        for key, amount in zip(METRICS, (data_bytes, cache_bytes)):
            if amount is None:
                continue
            metric = row[key]
            if metric is None:
                row[key] = {'first_bytes': amount, 'current_bytes': amount, 'peak_bytes': amount,
                            'positive_growth_bytes': 0, 'growth_observations': 0}
            else:
                metric['positive_growth_bytes'] += max(0, amount - metric['current_bytes'])
                metric['growth_observations'] += 1
                metric['current_bytes'] = amount
                metric['peak_bytes'] = max(metric['peak_bytes'], amount)
        row['cleaned_bytes'] = (row['cleaned_bytes'] or 0) + cleaned_bytes
        return True
    return _update(config, change)


def record_activity(config) -> bool:
    """明确播放开始时记录活跃日；首次入口之前的日期不算已观察。"""
    def change(value, row):
        if row['active']:
            return False
        if value['activity_started'] is None:
            value['activity_started'] = _today().isoformat()
        row['active'] = True
        return True
    return _update(config, change)


def record_playback(contract):
    config = getattr(contract, 'upgrade_config', None)
    if config is not None:
        try:
            record_activity(config)
        except (OSError, ValueError) as error:
            LOGGER.warning('Playback activity days unavailable (%s)', type(error).__name__)


def _metric(rows, key):
    values = [row[key] for row in rows if row[key] is not None]
    if not values:
        return {'observed_days': 0, 'current_bytes': None, 'peak_bytes': None,
                'positive_growth_bytes': None, 'growth_observations': 0}
    growth = sum(row['positive_growth_bytes'] for row in values)
    growth += sum(max(0, right['first_bytes'] - left['current_bytes']) for left, right in zip(values, values[1:]))
    comparisons = sum(row['growth_observations'] for row in values) + len(values) - 1
    return {'observed_days': len(values), 'current_bytes': values[-1]['current_bytes'],
            'peak_bytes': max(row['peak_bytes'] for row in values),
            'positive_growth_bytes': growth if comparisons else None, 'growth_observations': comparisons}


def _window(value, today, days):
    start = today - timedelta(days=days - 1)
    rows = [row for stamp, row in sorted(value['days'].items()) if start <= _day(stamp) <= today]
    activity_start = _day(value['activity_started']) if value['activity_started'] else None
    covered = max(0, (today - max(start, activity_start)).days + 1) if activity_start else 0
    cleaned = [row['cleaned_bytes'] for row in rows if row['cleaned_bytes'] is not None]
    return {'days': days, 'observed_days': sum(any(row[key] is not None for key in METRICS) for row in rows),
            'activity_observed_days': covered, 'active_days': sum(row['active'] for row in rows) if covered else None,
            **{key: _metric(rows, key) for key in METRICS},
            'cleaned_bytes': sum(cleaned) if cleaned else None}


def project(config) -> dict:
    """只读近 7/30 天聚合，缺失或损坏记录不伪装成零容量。"""
    state = 'available'
    try:
        value = _read(config) if config is not None else None
        if value is None:
            state = 'unavailable'
    except (OSError, ValueError):
        value, state = None, 'failed'
    value = value or {'activity_started': None, 'days': {}}
    result = {'state': state, 'activity_basis': 'playback',
              'windows': {f'{days}d': _window(value, _today(), days) for days in (7, 30)}}
    if not valid_projection(result):
        raise ValueError("capacity research projection has unexpected fields or values")
    return result


def _valid_window(row, days, state) -> bool:
    if (not isinstance(row, dict) or set(row) != {'days', 'observed_days', 'activity_observed_days',
            'active_days', 'data', 'cache', 'cleaned_bytes'} or type(row['days']) is not int or row['days'] != days
            or not _integer(row['observed_days'], days) or not _integer(row['activity_observed_days'], days)
            or (row['active_days'] is not None and not _integer(row['active_days'], row['activity_observed_days']))
            or ((row['active_days'] is None) != (row['activity_observed_days'] == 0))
            or (row['cleaned_bytes'] is not None and not _integer(row['cleaned_bytes']))):
        return False
    if any(not _valid_metric(row[key]) or row[key]['observed_days'] > row['observed_days'] for key in METRICS):
        return False
    if row['observed_days'] > sum(row[key]['observed_days'] for key in METRICS):
        return False
    if row['observed_days'] > 0 and row['cleaned_bytes'] is None:
        return False
    return state == 'available' or not (row['observed_days'] or row['activity_observed_days']
                                       or row['cleaned_bytes'] is not None)


def valid_projection(value) -> bool:
    if (not isinstance(value, dict) or set(value) != {'state', 'activity_basis', 'windows'}
            or not isinstance(value['state'], str) or value['state'] not in {'available', 'unavailable', 'failed'}
            or value['activity_basis'] != 'playback'
            or not isinstance(value['windows'], dict) or set(value['windows']) != {'7d', '30d'}):
        return False
    for days in (7, 30):
        row = value['windows'][f'{days}d']
        if not _valid_window(row, days, value['state']):
            return False
    short, long = (value['windows'][key] for key in ('7d', '30d'))
    for key in ('observed_days', 'activity_observed_days', 'active_days', 'cleaned_bytes'):
        if short[key] is not None and (long[key] is None or short[key] > long[key]):
            return False
    for key in METRICS:
        if short[key]['observed_days'] > long[key]['observed_days']:
            return False
        if short[key]['observed_days'] and short[key]['current_bytes'] != long[key]['current_bytes']:
            return False
        for field in ('peak_bytes', 'positive_growth_bytes', 'growth_observations'):
            if short[key][field] is not None and (long[key][field] is None or short[key][field] > long[key][field]):
                return False
    return True
