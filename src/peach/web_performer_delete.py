"""在数据管理中按女优复核并永久删除关联影片。"""
from __future__ import annotations

import hashlib
import json

from .task_runs import TaskRunHandle
from .task_control import bind, Cancelled
from .user_messages import UserValueError
from .web_batch import _purge_outside_lock, _purge_receipt
from .web_entity import _decorate_index


def _performer_ids(values):
    if not isinstance(values, list) or not values:
        raise UserValueError("api.performerDelete.selectionRequired")
    ids = []
    for value in values:
        text = str(value)
        if not text.isascii() or not text.isdecimal() or len(text) > 19 or not 0 < int(text) < 2**63:
            raise UserValueError("api.performerDelete.selectionInvalid")
        ids.append(int(text))
    return sorted(set(ids))


def q_performer_delete_candidates(contract, args):
    with contract.read_connection() as connection:
        rows = [dict(row) for row in connection.execute(
            "SELECT e.id entity_id,e.canonical_name k,"
            "COUNT(DISTINCT COALESCE(NULLIF(a.code,''),'asset:'||a.id)) n,"
            "COUNT(*) file_count,SUM(COALESCE(a.size,0)) bytes "
            "FROM (SELECT DISTINCT entity_id,asset_id FROM asset_entity) ae "
            "JOIN entity e ON e.id=ae.entity_id JOIN asset a ON a.id=ae.asset_id "
            "WHERE e.kind='performer' AND a.medium='video' "
            "GROUP BY e.id ORDER BY file_count DESC,e.canonical_name,e.id")]
        aliases = {}
        for entity_id, alias in connection.execute('SELECT entity_id,alias FROM entity_alias'):
            aliases.setdefault(entity_id, []).append(alias)
    for row in rows:
        row['aliases'] = aliases.get(row['entity_id'], [])
    return _decorate_index(contract, 'performers', rows, False, None)


def _selection(connection, ids):
    marks = ','.join('?' for _ in ids)
    people = connection.execute(
        f"SELECT id,canonical_name FROM entity WHERE id IN ({marks}) AND kind='performer' ORDER BY id", ids,
    ).fetchall()
    if len(people) != len(ids):
        raise UserValueError("api.performerDelete.performerGone")
    rows = connection.execute(
        "SELECT a.* FROM asset a WHERE a.medium='video' AND EXISTS "
        f"(SELECT 1 FROM asset_entity ae WHERE ae.asset_id=a.id AND ae.entity_id IN ({marks})) ORDER BY a.id",
        ids,
    ).fetchall()
    reviewed = [(row['id'], row['path'], row['mutation_revision'], row['disposal']) for row in rows]
    token = hashlib.sha256(json.dumps(
        [[(person['id'], person['canonical_name']) for person in people], reviewed], ensure_ascii=False,
    ).encode()).hexdigest()
    return people, rows, token


def q_performer_delete_plan(contract, args):
    ids = _performer_ids(str(args.get('ids', '')).split(','))
    marks = ','.join('?' for _ in ids)
    with contract.read_connection() as connection:
        people, rows, token = _selection(connection, ids)
        shared = connection.execute(
            "SELECT COUNT(DISTINCT ae.asset_id) FROM asset_entity ae "
            f"JOIN entity e ON e.id=ae.entity_id WHERE e.kind='performer' AND ae.entity_id NOT IN ({marks}) "
            f"AND ae.asset_id IN (SELECT asset_id FROM asset_entity WHERE entity_id IN ({marks})) "
            "AND ae.asset_id IN (SELECT id FROM asset WHERE medium='video')", ids + ids,
        ).fetchone()[0]
    return {'entity_ids': ids, 'performers': [{'id': p['id'], 'name': p['canonical_name']} for p in people],
            'plan': token, 'total': len(rows), 'bytes': sum(row['size'] or 0 for row in rows), 'shared': shared,
            'items': [{'id': row['id'], 'code': row['code'], 'name': row['name']} for row in rows]}


def w_performer_delete(contract, body):
    ids = _performer_ids(body.get('entity_ids'))
    if not isinstance(body.get('plan'), str) or len(body['plan']) != 64:
        raise UserValueError("api.performerDelete.planRequired")
    from .task_stages import batch_progress
    run = contract.task_runs.start('batch', trigger='manual', **batch_progress('performer-delete'))
    handle = TaskRunHandle(contract.task_runs, run.id if run else None)

    def reviewed(connection):
        _people, rows, token = _selection(connection, ids)
        if token != body['plan']:
            raise UserValueError("api.performerDelete.planChanged")
        if not rows:
            raise UserValueError("api.performerDelete.nothingToDelete")
        return rows
    try:
        with bind(contract.task_runs, handle.run_id):
            # 清单先核一次再动文件；网盘上的隔离在写事务外做，事务里再核一次清单才删行，
            # 这期间清单变了就整批放弃、文件放回原处。
            with contract.read_connection() as connection:
                rows = reviewed(connection)
            outcome = _purge_outside_lock(
                contract, rows, verify=lambda connection: (connection.execute('BEGIN IMMEDIATE'), reviewed(connection)))
            contract.cache_bust()
            result = _purge_receipt(contract, outcome, entity_ids=ids)
    except Cancelled:
        handle.finish('cancelled', summary={'cancelled_by_user': True})
        raise
    except BaseException as error:
        from .user_messages import failure_fields
        handle.finish('failed', **failure_fields(error))
        raise
    handle.finish('succeeded', summary={'operation': 'performer-delete',
                                       'changed': result['purged'], 'blocked': len(result['blocked'])})
    return result
