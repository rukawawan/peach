"""创作者历史投影的全库审计与逐关系修复。"""
from __future__ import annotations

import hashlib
import json
import re
import sqlite3
from collections import defaultdict

from . import interface_text
from .catalog_rules import compact_label, western_release_identity
from .classification import (is_structural_creator, is_repost_creator, creator_collection_base,
                             creator_release_identifier, numbered_cast_shape)
from .entities import normalize_entity_name, upsert_asset_entity
from .entity_classification import trusted_sql
from .field_owners import is_protected, owner_of, write_owned_fields
from .studio_sites import is_platform, normalise
from .user_messages import UserValueError

OWNER = 'script:creator-attributions'
FIELDS = ('asset_id', 'entity_id', 'current_creator', 'relation_source', 'confidence',
          'medium', 'path', 'name', 'studio', 'code', 'flat_creator', 'field_owner', 'studio_owner', 'revision',
          'verdict', 'action', 'proposed_studio', 'proposed_creator', 'studio_source_url', 'reason')


def _collection_identity(name: str, creators: dict[str, str]) -> str:
    """集合后缀只回归已存在的完整账号名，不造身份或改规范名。"""
    base = creator_collection_base(name)
    return creators.get(normalize_entity_name(base), '') if base != name else ''


def _publisher_release(row: dict, studios: dict[str, set[str]]) -> bool:
    creator = str(row['current_creator'])
    if row['studio']:
        # Tokyo Hot 的发行文件与已登记厂牌交叉核对，短目录名 Tokyo 属于这份作品投影。
        return (normalise(creator) == 'tokyo' and
                'tokyohot' in studios.get(normalise(str(row['studio'])), set()) and
                compact_label(str(row['name'])).startswith('tokyohot') and
                bool(row['code']) and compact_label(str(row['code'])) in compact_label(str(row['name'])))
    if normalise(creator) not in studios:
        return False
    parts = re.split(r'[\\/]', str(row['path']))
    publisher = re.compile(r'^' + re.escape(creator) + r'[ ._-]+\d{2,4}[-.]\d{2}[-.]\d{2}(?!\d)', re.I)
    domain = '[' + creator.casefold() + '.com]'
    return any(publisher.match(part) or domain in part.casefold() for part in parts)


def _release_title(row: dict, people: set[str]) -> bool:
    """带发行日期的场景标题；短人名与已有出演者身份交回复核。"""
    name = str(row['current_creator'])
    if normalize_entity_name(name) in people:
        return False
    key = compact_label(name)
    for part in re.split(r'[\\/]', str(row['path'])):
        identity = western_release_identity(part)
        if not identity:
            continue
        matched = re.search(r'\.(?:\d{4}|\d{2})\.\d{2}\.\d{2}\.', part)
        tail = compact_label(part[matched.end():]) if matched else ''
        if tail.startswith(key) and (len(name.split()) >= 4 or any(
                key.startswith(compact_label(person)) and key != compact_label(person)
                for person in people if len(compact_label(person)) >= 5)):
            return True
    return False


def _said(name: str, /, **params) -> str:
    """判定理由，按 zh-CN 资源渲染（`server:labels.metadataCreatorAttributions.<名字>`）。

    理由写进创作者归属复核 CSV 的 `reason` 列，那一列只存一句原文（与 `classification._said` 同一写法）。
    """
    return interface_text.text(f"server:labels.metadataCreatorAttributions.{name}", params)


def classify(row: dict, *, studios: dict[str, set[str]], people: set[str]) -> tuple[str, str, str]:
    """明确错误才提供 remove；身份冲突与目录推断只提供 review。

    轮换出演者的发行命名是实体级信号，独立来源和用户归属的关系也提示复核，但不压过修复判定。
    """
    verdict = _relation_verdict(row, studios=studios, people=people)
    shape = row.get('label_shape')
    if not shape or verdict[1] not in {'keep', 'review'}:
        return verdict
    named = (_said('shapePrefix', prefix=shape['prefix']) if shape['form'] == 'prefix'
             else _said('shapeCastNumberTitle'))
    return 'label_shape', 'review', _said('labelShape', shape=named, total=shape['total'], files=shape['files'],
                                          performers=shape['cast'])


def _relation_verdict(row: dict, *, studios: dict[str, set[str]], people: set[str]) -> tuple[str, str, str]:
    creator = str(row['current_creator'])
    source = str(row['relation_source'])
    if source != 'legacy:asset':
        return 'source_identity', 'keep', _said('sourceIdentity')
    if is_protected(str(row['field_owner'])):
        return 'protected', 'review', _said('protected')
    if re.match(r'^[a-z][a-z0-9+.-]*://', str(row['path']), re.I):
        return 'online_account', 'keep', _said('onlineAccount')
    if row.get('has_identity_evidence'):
        return 'identity_conflict', 'review', _said('identityConflict')
    if row.get('studio_source_url'):
        return 'verified_studio', 'remove', _said('verifiedStudio')
    if is_platform(creator):
        return 'platform', 'remove', _said('platform')
    if is_repost_creator(creator):
        return 'repost_site', 'remove', _said('repostSite')
    studio = str(row['studio'] or '')
    studio_names = studios.get(normalise(studio), {normalise(studio)}) if studio else set()
    if normalise(creator) and normalise(creator) in studio_names:
        return 'studio', 'remove', _said('studio', studio=studio)
    if _publisher_release(row, studios):
        return 'studio_release', 'remove', _said('studioRelease')
    identifier_verdict, identifier_reason = creator_release_identifier(
        creator,path=str(row['path']),filename=str(row['name'] or ''),code=row['code'])
    if identifier_verdict == 'release_identifier':
        return identifier_verdict, 'remove', identifier_reason
    if is_structural_creator(creator):
        return 'structural', 'remove', _said('structural')
    if _release_title(row, people):
        return 'release_title', 'remove', _said('releaseTitle')
    title = str(row.get('catalog_title') or '')
    if (len(compact_label(creator)) >= 8 and title
            and compact_label(creator) == compact_label(title)
            and normalize_entity_name(creator) not in people):
        return 'catalog_title', 'remove', _said('catalogTitle')
    if normalize_entity_name(creator) in people:
        return 'performer_overlap', 'review', _said('performerOverlap')
    if identifier_verdict:
        return identifier_verdict, 'review', identifier_reason
    return 'legacy_projection', 'review', _said('legacyProjection')


def collect(connection: sqlite3.Connection) -> list[dict]:
    """一次读取所有关系和身份来源，不逐个实体全表扫描。"""
    cursor = connection.cursor()
    cursor.row_factory = sqlite3.Row
    studio_names: dict[int, set[str]] = defaultdict(set)
    people: set[str] = set()
    for row in cursor.execute(
        "SELECT e.id,e.kind,e.canonical_name AS name FROM entity e WHERE e.kind IN ('studio','performer') "
        "UNION ALL SELECT e.id,e.kind,a.alias FROM entity e JOIN entity_alias a ON a.entity_id=e.id "
        "WHERE e.kind IN ('studio','performer')"):
        if row['kind'] == 'studio':
            studio_names[int(row['id'])].add(normalise(str(row['name'])))
        else:
            people.add(normalize_entity_name(str(row['name'])))
    studios = {name: names for names in studio_names.values() for name in names}
    evidence = {int(row[0]) for row in connection.execute(
        "SELECT entity_id FROM entity_external_ref UNION "
        "SELECT entity_id FROM entity_alias WHERE source LIKE 'user:%' OR source LIKE 'review:%' UNION "
        "SELECT entity_id FROM asset_entity WHERE role='creator' AND source<>'legacy:asset'")}
    issuers = {}
    if connection.execute("SELECT 1 FROM sqlite_schema WHERE name='entity_classification'").fetchone():
        issuers = dict(connection.execute("SELECT entity_id,min(source_url) FROM entity_classification "
            "WHERE facet='account_role' AND value='studio' AND " + trusted_sql() + " "
            "AND source_url LIKE 'https://%' GROUP BY entity_id"))
    creators = {row[1]: row[2] for row in connection.execute(
        "SELECT id,normalized_name,canonical_name FROM entity WHERE kind='creator'") if row[0] not in issuers}
    query = """SELECT a.id AS asset_id,e.id AS entity_id,e.canonical_name AS current_creator,
        ae.source AS relation_source,ae.confidence,a.medium,a.path,a.name,a.studio,a.code,a.creator AS flat_creator,
        a.catalog_title,a.field_owners,a.mutation_revision AS revision
        FROM asset_entity ae JOIN entity e ON e.id=ae.entity_id AND e.kind='creator'
        JOIN asset a ON a.id=ae.asset_id WHERE ae.role='creator' ORDER BY e.id,a.id,ae.source"""
    relations = [dict(raw) for raw in cursor.execute(query)]
    filenames: dict[int, dict[int, str]] = defaultdict(dict)
    for row in relations:
        if row['medium'] == 'video':
            filenames[int(row['entity_id'])][int(row['asset_id'])] = str(row['name'] or '')
    shapes = {entity_id: numbered_cast_shape(list(names.values()), people) for entity_id, names in filenames.items()}
    result = []
    for row in relations:
        row['label_shape'] = shapes.get(int(row['entity_id']))
        row['field_owner'] = owner_of(row['field_owners'], 'creator')
        row['studio_owner'] = owner_of(row.pop('field_owners'), 'studio')
        row['has_identity_evidence'] = int(row['entity_id']) in evidence
        row['studio_source_url'] = issuers.get(int(row['entity_id']), '')
        row['verdict'], row['action'], row['reason'] = classify(row, studios=studios, people=people)
        row['proposed_studio'] = row['current_creator'] if row['verdict'] in {'studio_release','verified_studio'} and not row['studio'] and not is_protected(row['studio_owner']) else ''
        row['proposed_creator'] = ''
        if row['verdict'] in {'legacy_projection','identifier_candidate'}:
            row['proposed_creator'] = _collection_identity(str(row['current_creator']), creators)
            if row['proposed_creator']:
                row.update(verdict='collection_identity', action='replace',
                           reason=_said('collectionIdentity'))
        result.append({field: row[field] for field in FIELDS})
    return result


def fingerprint(rows: list[dict]) -> str:
    return hashlib.sha256(json.dumps(rows, ensure_ascii=False, sort_keys=True).encode()).hexdigest()


def _asset_fields(cursor, asset_id: int) -> dict:
    return dict(cursor.execute('SELECT id,creator,studio,field_owners,mutation_revision FROM asset WHERE id=?',
                               (asset_id,)).fetchone() or {})


def _creator_relations(connection, asset_ids: list[int]) -> list[dict]:
    cursor = connection.cursor()
    cursor.row_factory = sqlite3.Row
    return [dict(row) for asset_id in asset_ids for row in cursor.execute(
        "SELECT * FROM asset_entity WHERE asset_id=? AND role='creator' ORDER BY entity_id,source", (asset_id,))]


def _land_studio(connection, cursor, row: dict) -> tuple[dict | None, dict | None]:
    if not row['proposed_studio']:
        return None, None
    asset_id = int(row['asset_id'])
    created = None
    entity = cursor.execute("SELECT id,canonical_name FROM entity WHERE kind='studio' AND normalized_name=?",
                            (normalize_entity_name(row['proposed_studio']),)).fetchone()
    if not entity:
        if row['verdict'] != 'verified_studio' or not row['studio_source_url']:
            raise UserValueError("errors.metadataCreatorAttributions.plannedLabelMissing")
        entity_id = upsert_asset_entity(connection,kind='studio',name=row['proposed_studio'],asset_id=asset_id,
            role='studio',source=OWNER,metadata={'source_url':row['studio_source_url'],'evidence':row['reason']},
            update_entity_metadata=False)
        created = dict(cursor.execute('SELECT * FROM entity WHERE id=?',(entity_id,)).fetchone())
        entity = created
    owned = cursor.execute("SELECT * FROM asset_entity WHERE asset_id=? AND entity_id=? AND role='studio' AND source=?",
                           (asset_id,entity['id'],OWNER)).fetchone()
    if created:
        added = dict(owned)
    elif connection.execute("SELECT 1 FROM asset_entity WHERE asset_id=? AND entity_id=? AND role='studio'",
                            (asset_id, entity['id'])).fetchone():
        added = None
    else:
        upsert_asset_entity(connection, kind='studio', name=entity['canonical_name'], asset_id=asset_id,
                            role='studio', source=OWNER, metadata={'evidence': row['reason'], 'source_url':row['studio_source_url']},
                            update_entity_metadata=False)
        added = dict(cursor.execute("SELECT * FROM asset_entity WHERE asset_id=? AND entity_id=? AND role='studio' AND source=?",
                                    (asset_id, entity['id'], OWNER)).fetchone())
    fields = _asset_fields(cursor, asset_id)
    write_owned_fields(connection, [asset_id], {'studio': entity['canonical_name']}, OWNER,
                       require_empty=True, expected_revision=fields['mutation_revision'])
    return added, created


def _land_creator(connection, cursor, row):
    """集合目录的作品归回已有账号；独立关系保留并避免重复署名。"""
    if not row['proposed_creator']:
        return None
    target = cursor.execute("SELECT id FROM entity WHERE kind='creator' AND canonical_name=?",
                            (row['proposed_creator'],)).fetchone()
    if not target:
        raise UserValueError("errors.metadataCreatorAttributions.plannedAccountMissing")
    if connection.execute("SELECT 1 FROM asset_entity WHERE asset_id=? AND entity_id=? AND role='creator'",
                          (row['asset_id'],target['id'])).fetchone():
        return None
    upsert_asset_entity(connection,kind='creator',name=row['proposed_creator'],asset_id=row['asset_id'],
                        role='creator',source=OWNER,metadata={'evidence':row['reason'],
                        'directory_name':row['current_creator']},update_entity_metadata=False)
    return dict(cursor.execute("SELECT * FROM asset_entity WHERE asset_id=? AND entity_id=? AND role='creator' AND source=?",
                               (row['asset_id'],target['id'],OWNER)).fetchone())


def apply_plan(connection: sqlite3.Connection, plan: list[dict]) -> dict:
    """调用方持有事务；校验整批当前判定，保留实体与其它来源断言。"""
    current = [row for row in collect(connection) if row['action'] in {'remove','replace'}]
    if fingerprint(current) != fingerprint(plan):
        raise UserValueError("errors.metadataCreatorAttributions.planOutdated")
    removed = []
    added = []
    created = []
    asset_ids = sorted({int(row['asset_id']) for row in plan})
    cursor = connection.cursor()
    cursor.row_factory = sqlite3.Row
    before_assets = {asset_id: _asset_fields(cursor, asset_id) for asset_id in asset_ids}
    for row in plan:
        key = (row['asset_id'], row['entity_id'], row['relation_source'])
        raw = cursor.execute("SELECT * FROM asset_entity WHERE asset_id=? AND entity_id=? "
                             "AND role='creator' AND source=?", key).fetchone()
        removed.append(dict(raw))
        connection.execute("DELETE FROM asset_entity WHERE asset_id=? AND entity_id=? "
                           "AND role='creator' AND source=?", key)
        studio_relation, studio_entity = _land_studio(connection, cursor, row)
        if studio_relation:
            added.append(studio_relation)
        if studio_entity:
            created.append(studio_entity)
        creator_relation = _land_creator(connection,cursor,row)
        if creator_relation:
            added.append(creator_relation)
    for asset_id, before in before_assets.items():
        names = {str(row[0]) for row in connection.execute(
            "SELECT DISTINCT e.canonical_name FROM asset_entity ae JOIN entity e ON e.id=ae.entity_id "
            "WHERE ae.asset_id=? AND ae.role='creator' AND e.kind='creator'", (asset_id,))}
        removed_names = {str(row['current_creator']) for row in plan if int(row['asset_id']) == asset_id}
        if before['creator'] not in removed_names or before['creator'] in names:
            continue
        if len(names) > 1:
            raise UserValueError("errors.metadataCreatorAttributions.multipleCreators", {"asset": asset_id})
        value = next(iter(names), None)
        current_fields = _asset_fields(cursor, asset_id)
        write_owned_fields(connection, [asset_id], {'creator': value}, OWNER,
                           expected_revision=current_fields['mutation_revision'])
        after = _asset_fields(cursor, asset_id)
        if after['creator'] != value:
            raise UserValueError("errors.metadataCreatorAttributions.creatorWriteRefused", {"asset": asset_id})
    changed = [{'before': before, 'after': _asset_fields(cursor, asset_id)}
               for asset_id, before in before_assets.items() if _asset_fields(cursor, asset_id) != before]
    return {'relations': removed, 'added_relations': added, 'created_entities':created, 'fields': changed, 'plan': plan,
            'remaining_creator_relations': _creator_relations(connection, asset_ids)}


def _remove_created_studios(connection, cursor, entities):
    """本批新建的空厂牌可撤回；任何额外资料都会阻止整批恢复。"""
    for entity in entities:
        if dict(cursor.execute('SELECT * FROM entity WHERE id=?',(entity['id'],)).fetchone() or {}) != entity:
            raise UserValueError("errors.metadataCreatorAttributions.newLabelChanged")
        for table, in connection.execute("SELECT name FROM sqlite_schema WHERE type='table' AND name NOT LIKE 'sqlite_%'"):
            if not re.fullmatch('[a-zA-Z0-9_]+',table):
                continue
            for foreign in connection.execute(f'PRAGMA foreign_key_list({table})'):
                if foreign[2]=='entity' and connection.execute(f'SELECT 1 FROM {table} WHERE {foreign[3]}=?',(entity['id'],)).fetchone():
                    raise UserValueError("errors.metadataCreatorAttributions.newLabelHasExtra")
        connection.execute('DELETE FROM entity WHERE id=?',(entity['id'],))


def restore(connection: sqlite3.Connection, manifest: dict) -> None:
    """仅在本批字段和关系未被后续操作改动时恢复整批。"""
    cursor = connection.cursor()
    cursor.row_factory = sqlite3.Row
    for item in manifest['fields']:
        after = item['after']
        current = _asset_fields(cursor, after['id'])
        if current != after:
            raise UserValueError("errors.metadataCreatorAttributions.assetChanged", {"asset": after['id']})
    asset_ids = sorted({int(row['asset_id']) for row in manifest['relations']})
    if _creator_relations(connection, asset_ids) != manifest['remaining_creator_relations']:
        raise UserValueError("errors.metadataCreatorAttributions.creatorLinksChanged")
    for row in manifest['added_relations']:
        current = cursor.execute('SELECT * FROM asset_entity WHERE asset_id=? AND entity_id=? AND role=? AND source=?',
                                 tuple(row[key] for key in ('asset_id', 'entity_id', 'role', 'source'))).fetchone()
        if not current or dict(current) != row:
            raise UserValueError("errors.metadataCreatorAttributions.labelLinksChanged")
    for row in manifest['relations']:
        if connection.execute("SELECT 1 FROM asset_entity WHERE asset_id=? AND entity_id=? AND role=? AND source=?",
                              tuple(row[key] for key in ('asset_id', 'entity_id', 'role', 'source'))).fetchone():
            raise UserValueError("errors.metadataCreatorAttributions.creatorLinkExists")
        if not connection.execute('SELECT 1 FROM entity WHERE id=?', (row['entity_id'],)).fetchone():
            raise UserValueError("errors.metadataCreatorAttributions.profileMissing")
    for row in manifest['relations']:
        columns = tuple(row)
        connection.execute(f"INSERT INTO asset_entity({','.join(columns)}) VALUES({','.join('?' for _ in columns)})",
                           tuple(row.values()))
    for row in manifest['added_relations']:
        connection.execute('DELETE FROM asset_entity WHERE asset_id=? AND entity_id=? AND role=? AND source=?',
                           tuple(row[key] for key in ('asset_id', 'entity_id', 'role', 'source')))
    _remove_created_studios(connection,cursor,manifest.get('created_entities',[]))
    for item in manifest['fields']:
        before, after = item['before'], item['after']
        owner = owner_of(before['field_owners'], 'creator') or OWNER
        write_owned_fields(connection, [before['id']], {'creator': before['creator']}, owner,
                           expected_revision=after['mutation_revision'])
        current = _asset_fields(cursor, before['id'])
        if before['studio'] != after['studio']:
            owner = owner_of(before['field_owners'], 'studio') or OWNER
            write_owned_fields(connection, [before['id']], {'studio': before['studio']}, owner,
                               expected_revision=current['mutation_revision'])
        connection.execute('UPDATE asset SET field_owners=? WHERE id=?', (before['field_owners'], before['id']))
