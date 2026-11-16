"""自愿研究的实例联系状态；与错误诊断无标识或开关关联。"""
from __future__ import annotations

from datetime import datetime, timezone
import json
import math
import re
import uuid

from . import __version__, remote_reporting
from .fsutil import atomic_write_text
from .user_messages import UserValueError

MESSAGE = 'Peach research participation'
PURPOSE = 'population-research-participation'
MAX_STATE_BYTES = 16 * 1024
STATUSES = {'queued', 'accepted', 'failed', 'unknown', 'blocked'}
SNAPSHOT_REASONS = {'collection', 'compression', 'network', 'http_status', 'rate_limit', 'queue_full',
                    'consent', 'disabled', 'unknown'}


def instance(value):
    return isinstance(value, str) and len(value) == 32 and all(char in '0123456789abcdef' for char in value)


def _now():
    return datetime.now(timezone.utc)


def _path(config):
    return config.directory('state') / 'research-participation.json'


def _stamp(moment):
    return moment.isoformat(timespec='seconds').replace('+00:00', 'Z')


def valid_payload(value, *, current=True):
    from .library_sharing import SCHEMA
    required = {'schema', 'peach', 'period', 'day', 'last_seen', 'research_instance', 'state', 'kind'}
    if (not isinstance(value, dict) or not required <= set(value) <= required | {'snapshot'}
            or type(value['schema']) is not int
            or (value['schema'] != SCHEMA if current else not 1 <= value['schema'] <= SCHEMA)
            or not isinstance(value['peach'], str) or not re.fullmatch(r'[0-9A-Za-z.+-]{1,64}', value['peach'])
            or (current and value['peach'] != __version__) or not instance(value['research_instance'])
            or not isinstance(value['kind'], str) or value['kind'] not in {'enabled', 'heartbeat', 'disabled'}
            or value['state'] != ('disabled' if value['kind'] == 'disabled' else 'enabled')):
        return False
    if 'snapshot' in value and (value['schema'] < 6 or value['state'] != 'enabled'
                                or not valid_snapshot(value['snapshot']) or value['snapshot']['period'] != value['period']):
        return False
    try:
        moment = datetime.fromisoformat(value['last_seen'].replace('Z', '+00:00'))
        return (moment.tzinfo == timezone.utc and _stamp(moment) == value['last_seen']
                and value['day'] == moment.date().isoformat() and value['period'] == moment.strftime('%G-W%V'))
    except (ValueError, TypeError, AttributeError):
        return False


def valid_snapshot(value):
    """研究日联系只接受有界的技术回执字段。"""
    from .library_sharing import MAX_BYTES, MAX_RAW_BYTES
    required = {'snapshot_id', 'period', 'status', 'attempted'}
    if (not isinstance(value, dict) or not required <= set(value) <= required | {'raw_bytes', 'compressed_bytes', 'reason'}
            or not instance(value['snapshot_id']) or not isinstance(value['period'], str)
            or not re.fullmatch(r'\d{4}-W\d{2}', value['period']) or type(value['attempted']) is not bool
            or not isinstance(value['status'], str) or value['status'] not in STATUSES | {'waiting-data'}
            or (value['status'] == 'accepted' and not value['attempted'])):
        return False
    for key, maximum in (('raw_bytes', MAX_RAW_BYTES), ('compressed_bytes', MAX_BYTES)):
        if key in value and (type(value[key]) is not int or not 0 <= value[key] <= maximum):
            return False
    return 'reason' not in value or isinstance(value['reason'], str) and value['reason'] in SNAPSHOT_REASONS


def _load(config):
    path = _path(config)
    try:
        if path.stat().st_size > MAX_STATE_BYTES:
            raise UserValueError('errors.researchParticipation.stateTooLarge')
        value = json.loads(path.read_text(encoding='utf-8'))
    except FileNotFoundError:
        return None
    if (not isinstance(value, dict) or not set(value) <= {'event_id', 'dispatch_id', 'revision', 'payload', 'status', 'attempted',
            'reason', 'status_code'} or not {'event_id', 'dispatch_id', 'revision', 'payload', 'status', 'attempted'} <= set(value)
            or not all(instance(value[key]) for key in ('event_id', 'dispatch_id', 'revision'))
            or not valid_payload(value['payload'], current=False)
            or not isinstance(value['status'], str) or value['status'] not in STATUSES or type(value['attempted']) is not bool
            or (value['status'] == 'accepted' and not value['attempted'])
            or ('status_code' in value and (type(value['status_code']) is not int or not 100 <= value['status_code'] <= 599))
            or ('reason' in value and (not isinstance(value['reason'], str) or value['reason'] not in {
                'network', 'http_status', 'rate_limit', 'queue_full', 'consent', 'disabled', 'unknown'}))):
        raise UserValueError('errors.researchParticipation.stateInvalid')
    return value


def snapshot(config):
    try:
        value = _load(config)
    except (OSError, ValueError):
        return {'status': 'failed', 'reason': 'state', 'attempted': None}
    choice = _choice(config)
    pending = None
    if choice is not None:
        if choice.get('enabled') is False and (value is None or value['event_id'] != choice['closing']['event_id']):
            pending = 'disabled'
        elif choice.get('enabled') is True and (value is None or value['revision'] != choice['revision']):
            pending = 'enabled'
    if value is None:
        return {'status': 'not-attempted', 'attempted': False, 'pending_state': pending}
    result = {**{key: item for key, item in value.items() if key not in {'revision', 'payload', 'dispatch_id'}},
              **{key: value['payload'][key] for key in ('state', 'kind', 'day', 'last_seen')}, 'pending_state': pending}
    if result['status'] == 'queued' and result['attempted']:
        result['status'] = 'unknown'
    return result


def _choice(config):
    from .library_sharing import valid_consent_version, _path as consent_path
    value = remote_reporting._read(consent_path(config))
    if not valid_consent_version(value) or not instance(value.get('revision')):
        return None
    if value.get('enabled') is True and instance(value.get('research_instance')):
        return value
    closing = value.get('closing')
    if (value.get('enabled') is False and isinstance(closing, dict)
            and set(closing) == {'research_instance', 'authorization', 'event_id'}
            and all(instance(item) for item in closing.values())):
        return value
    return None


def _permitted(config, record, *, check_day=True):
    choice = _choice(config)
    if choice is None or choice['revision'] != record['revision']:
        return False
    payload = record['payload']
    if payload['state'] == 'enabled':
        return (choice.get('enabled') is True and choice.get('research_instance') == payload['research_instance']
                and (not check_day or payload['day'] == _now().date().isoformat()))
    closing = choice.get('closing', {})
    return (choice.get('enabled') is False and closing.get('event_id') == record['event_id']
            and closing.get('research_instance') == payload['research_instance'])


def _log(record):
    metadata = remote_reporting.event_metadata('research')
    payload = {key: value for key, value in record['payload'].items() if key != 'snapshot'}
    payload.update({f'snapshot_{key.removeprefix("snapshot_")}': value
                    for key, value in record['payload'].get('snapshot', {}).items()})
    value = remote_reporting._log_item(MESSAGE, {'release': metadata['release'], 'environment': metadata['environment']},
        {'purpose': PURPOSE, 'message_id': record['event_id'], **payload})
    value['trace_id'] = record['event_id']
    value['timestamp'] = datetime.fromisoformat(record['payload']['last_seen'].replace('Z', '+00:00')).timestamp()
    return value


class Service:
    def __init__(self, config, *, target, stopping):
        self.config, self.target, self.stopping = config, target, stopping

    def _prepare(self):
        from .library_sharing import SCHEMA, _state_lock, attempt_evidence
        with _state_lock(self.config):
            choice = _choice(self.config)
            if choice is None or self.stopping.is_set():
                return None
            previous = _load(self.config)
            moment = _now()
            disabled = choice.get('enabled') is False
            research_instance = choice['closing']['research_instance'] if disabled else choice['research_instance']
            kind = 'disabled' if disabled else ('enabled' if str(choice.get('selected_at', ''))[:10]
                                               == moment.date().isoformat() else 'heartbeat')
            event_id = choice['closing']['event_id'] if disabled else uuid.uuid5(
                uuid.NAMESPACE_URL, f'peach-research:{research_instance}:{moment.date().isoformat()}').hex
            if previous is not None and previous['event_id'] == event_id:
                if previous['attempted']:
                    return None
                # 排队失败可以沿用同一个事件编号；新授权不借用旧代际。
                if previous['revision'] != choice['revision']:
                    return None
                record = previous
                record.update(status='queued')
                record['payload'].update(schema=SCHEMA, peach=__version__, last_seen=_stamp(moment),
                                         day=moment.date().isoformat(), period=moment.strftime('%G-W%V'))
                record.pop('reason', None)
                record.pop('status_code', None)
            else:
                payload = {'schema': SCHEMA, 'peach': __version__, 'period': moment.strftime('%G-W%V'),
                    'day': moment.date().isoformat(), 'last_seen': _stamp(moment), 'research_instance': research_instance,
                    'state': 'disabled' if disabled else 'enabled', 'kind': kind}
                record = {'event_id': event_id, 'revision': choice['revision'], 'payload': payload,
                          'status': 'queued', 'attempted': False}
            if not disabled:
                evidence = attempt_evidence(self.config)
                if evidence:
                    record['payload']['snapshot'] = evidence
                else:
                    record['payload'].pop('snapshot', None)
            record['dispatch_id'] = uuid.uuid4().hex
            atomic_write_text(_path(self.config), json.dumps(record))
            return record

    def _gate(self, identity, envelope):
        from .library_sharing import _state_lock
        if self.stopping.is_set() or len(envelope.items) != 1 or envelope.items[0].type != 'log':
            return False
        item = envelope.items[0]
        try:
            raw = item.payload.get_bytes()
            if len(raw) > 4096:
                return False
            logs = json.loads(raw)
        except (OSError, ValueError):
            return False
        if (not valid_payload(identity['payload']) or not isinstance(logs, dict) or set(logs) != {'version', 'items'}
                or type(logs['version']) is not int or logs['version'] != 2
                or not isinstance(logs['items'], list) or len(logs['items']) != 1):
            return False
        log = logs['items'][0]
        if (not isinstance(log, dict) or set(log) != {'timestamp', 'trace_id', 'level', 'body', 'attributes'}
                or type(log['timestamp']) not in (int, float) or not math.isfinite(log['timestamp'])
                or not 0 <= log['timestamp'] <= 10 ** 11 or log != _log(identity)):
            return False
        with _state_lock(self.config):
            record = _load(self.config)
            if (self.stopping.is_set() or record is None or any(record[key] != identity[key]
                    for key in ('event_id', 'revision', 'dispatch_id'))
                    or record['payload'] != identity['payload'] or record['attempted'] or record['status'] != 'queued'
                    or not _permitted(self.config, record)):
                return False
            record['attempted'] = True
            moment = _now()
            record['payload'].update(last_seen=_stamp(moment), day=moment.date().isoformat(), period=moment.strftime('%G-W%V'))
            identity['payload'] = record['payload']
            atomic_write_text(_path(self.config), json.dumps(record))
        from sentry_sdk.envelope import PayloadRef
        item.payload = PayloadRef(json={'version': 2, 'items': [_log(identity)]})
        item.headers = {'type': 'log', 'content_type': 'application/vnd.sentry.items.log+json', 'item_count': 1}
        envelope.headers = {'sent_at': _stamp(moment)}
        return True

    def _delivery(self, identity, result):
        from .library_sharing import _state_lock
        if result.get('status') not in {'accepted', 'failed', 'unknown', 'blocked'}:
            return
        with _state_lock(self.config):
            record = _load(self.config)
            if (record is None or any(record[key] != identity[key] for key in ('event_id', 'revision', 'dispatch_id'))
                    or record['status'] not in {'queued', 'unknown'} or not _permitted(self.config, record, check_day=False)):
                return
            status = result['status']
            if status in {'accepted', 'unknown'} and not record['attempted']:
                status = 'failed'
            record['status'] = status
            if result.get('reason') in {'network', 'http_status', 'rate_limit', 'queue_full', 'consent', 'disabled', 'unknown'}:
                record['reason'] = result['reason']
            if type(result.get('status_code')) is int and 100 <= result['status_code'] <= 599:
                record['status_code'] = result['status_code']
            atomic_write_text(_path(self.config), json.dumps(record))

    def attempt(self):
        destination = self.target()
        if self.stopping.is_set() or remote_reporting._disabled or not destination:
            return
        record = self._prepare()
        if record is None:
            return
        client = None
        try:
            client = remote_reporting._new_client(destination,
                envelope_gate=lambda envelope: self._gate(record, envelope),
                delivery_callback=lambda result: self._delivery(record, result))
            if client.transport is None:
                self._delivery(record, {'status': 'failed', 'reason': 'queue_full'})
                return
            from sentry_sdk.envelope import Envelope, Item, PayloadRef
            envelope = Envelope(headers={'sent_at': _stamp(_now())})
            envelope.add_item(Item(type='log', content_type='application/vnd.sentry.items.log+json',
                headers={'item_count': 1}, payload=PayloadRef(json={'version': 2, 'items': [_log(record)]})))
            client.transport.capture_envelope(envelope)
            client.flush(timeout=5)
        except Exception:
            self._delivery(record, {'status': 'unknown', 'reason': 'unknown'})
        finally:
            try:
                if client is not None:
                    client.close(timeout=0)
            finally:
                self._delivery(record, {'status': 'unknown', 'reason': 'unknown'})
