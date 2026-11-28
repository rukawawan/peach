"""从旧处理记录选择有明确修复判据的馆藏项目。"""
from __future__ import annotations

import json
from itertools import chain
from pathlib import Path
import re

from . import artifact_rules, junk_visual, upgrade_rules, western_artwork
from .catalog_rules import compile_code_patterns, normalise_code_key, release_code_from_filename
from .field_owners import SCAN_FILENAME, owner_of
from .images import measure_image_file
from .library_nfo import NFO_PARSER_VERSION
from .media_identity import path_key
from .platform import translate_ledger_path
from .profiles import read_settings

RECEIPT = 'stock-repair-1'
COVER = 'stock-cover-1'
METADATA = 'stock-metadata-1'
VISUAL = 'stock-visual-1'
STAGE = {COVER: 'covers', METADATA: 'metadata', VISUAL: 'visual'}


def _json(path):
    try:
        return json.loads(path.read_text(encoding='utf-8'))
    except FileNotFoundError:
        return {}


def _issue_rule(record):
    action = record.get('failed_action')
    code = record.get('message_code')
    diagnostics = record.get('diagnostics') or {}
    if action == 'fetching_cover' and code == 'errors.libraryProcessing.coverUnfetched':
        frames = diagnostics.get('frames', ())
        if (any(frame.get('function') == 'install_cover' for frame in frames)
                and any(frame.get('file') == 'body_parts.py' for frame in frames)
                and any('onnx' in error.get('message', '').lower()
                        for error in diagnostics.get('exception', ()))):
            return COVER
    if action == 'querying_metadata':
        evidence = json.dumps([diagnostics, record.get('message_code'), record.get('message_params')])
        if 'identity_ambiguous' in evidence or 'errors.javdb.identityAmbiguous' in evidence:
            return METADATA
    if action == 'generating_preview' and code == 'errors.junkVisual.ocrUnavailable':
        reason = (record.get('message_params') or {}).get('reason', '')
        if re.search(r'QRCodeDetector|checkQRInputImage|detectAndDecode', reason):
            return VISUAL
    return None


def _issue_targets(state):
    result = {rule: set() for rule in STAGE}
    current = _json(state / 'library-processing.json')
    stopped = (f"library-processing-{current.get('job_id')}.issues.jsonl"
               if current.get('status') == 'cancelled' else '')
    logs = chain(state.glob('library-processing-*.issues.jsonl'),
                 (state / 'upgrade-repairs').glob('*.issues.jsonl'))
    for path in logs:
        if path.name == stopped:
            continue
        if path.parent != state:
            checkpoint = path.with_name(path.name.removesuffix('.issues.jsonl') + '.json')
            if _json(checkpoint).get('status') == 'cancelled':
                continue
        with path.open(encoding='utf-8') as handle:
            for line in handle:
                try:
                    record = json.loads(line)
                except json.JSONDecodeError:
                    continue  # 活动日志的末行可能正在写入。
                if not isinstance(record, dict) or type(record.get('asset_id')) is not int:
                    continue
                rule = _issue_rule(record)
                if rule and isinstance(record.get('path'), str) and record['path']:
                    result[rule].add((record['asset_id'], path_key(record['path'])))
    return result


def _old_nfo_keys(state):
    folder = state / 'library-processing-items'
    index = _json(folder / 'index.json')
    for key, entry in index.get('entries', {}).items():
        if not isinstance(entry, list) or len(entry) != 2 or not isinstance(entry[1], str):
            continue
        name = entry[1]
        if Path(name).name != name:
            continue
        cached = _json(folder / name)
        local = cached.get('local')
        if isinstance(local, list) and len(local) >= 2 and local[1] and cached.get('nfo_parser') != NFO_PARSER_VERSION:
            yield key


def needs_filename_code(row, patterns=()):
    filename = row['name'] or ''
    if not any(prefix in filename.casefold() for prefix in ('cdrp', 's2mbd')):
        return False
    code = row['code'] or ''
    if owner_of(row['field_owners'], 'code') not in ('', SCAN_FILENAME):
        return False
    found = release_code_from_filename(filename, patterns=patterns)
    return (bool(found and found.startswith(('CDRP-', 'S2MBD-')))
            and code != found and (not code or normalise_code_key(code) == found))


def _cover_present(contract, row):
    name = western_artwork.artwork_key(row['id'], row['code'])
    return measure_image_file(Path(contract.cover_root) / f'{name}.jpg') is not None


def _current_preview(contract, row):
    if not row['snapshot_path'] or contract.snapshot_root is None:
        return False
    path = translate_ledger_path(row['snapshot_path'])
    return path.is_relative_to(Path(contract.snapshot_root)) and path.is_file() and artifact_rules.current(path)


def collect(connection, config, contract):
    """只安排有旧证据或可由文件名确定的项目，完成态交给现有逐片队列。"""
    state = config.directory('state')
    targets = _issue_targets(state)
    nfo_keys = set(_old_nfo_keys(state))
    miss_cache = _json(state / 'library-metadata-misses.json')
    misses = miss_cache.get('misses', {})
    vixen = (misses.get(western_artwork.SCENE_SOURCE, {})
             if miss_cache.get('western_scene_rules') != upgrade_rules.WESTERN_SCENE_MISSES else {})
    prestige = (misses.get('prestige', {})
                if miss_cache.get('prestige_sku_rules') != upgrade_rules.PRESTIGE_SKU_MISSES else {})
    incomplete = junk_visual.read(contract.database, verdict='incomplete')
    try:
        patterns = compile_code_patterns(read_settings(connection).get('codePatterns'))
    except ValueError:
        patterns = ()
    selected = {rule: [] for rule in STAGE}
    rows = connection.execute(
        "SELECT id,path,name,location,code,field_owners,size,duration,snapshot_path,"
        "studio,catalog_title,original_title,release_date,creator,region FROM asset "
        "WHERE medium='video' AND disposal IS NULL ORDER BY id")
    for raw in rows:
        row = dict(raw)
        asset_id, path = row['id'], row['path']
        key = asset_id, path_key(path)
        scene = western_artwork.scene_identity(row) if vixen else None
        if (key in targets[METADATA] or f'{asset_id}:{path}' in nfo_keys or needs_filename_code(row, patterns)
                or (row['code'] in prestige and (not row['catalog_title'] or not _cover_present(contract, row)))
                or (scene is not None and scene.cache_key in vixen
                    and (not row['catalog_title'] or not _cover_present(contract, row)))):
            selected[METADATA].append(asset_id)
        elif key in targets[COVER] and not _cover_present(contract, row):
            selected[COVER].append(asset_id)
        if (key in targets[VISUAL] or asset_id in incomplete) and _current_preview(contract, row):
            entry = incomplete.get(asset_id) or junk_visual.read(contract.database, asset_id).get(asset_id)
            if not junk_visual.current(row, entry) or entry['verdict'] == 'incomplete':
                selected[VISUAL].append(asset_id)
    return selected


def analyse_previews(contract, config, asset_ids, *, checkpoint):
    """重算已有九宫格的画面证据，保留九宫格和原媒体。"""
    from .image_ocr import ImageReader, OcrUnavailable
    from .library_processing import _library_stages
    from .media_processing_policy import metadata_only

    if metadata_only(config.directory('state')):
        return []
    stages = _library_stages(config)
    reader = ImageReader(config.directory('tools'))
    with contract.database.read_connection() as connection:
        rows = connection.execute(
            'SELECT * FROM asset WHERE disposal IS NULL AND id IN (SELECT value FROM json_each(?))',
            (json.dumps(asset_ids),)).fetchall()
    failed = []
    for row in rows:
        checkpoint()
        if 'preview' not in stages(row['path']) or not _current_preview(contract, row):
            continue
        try:
            entry = junk_visual.analyse(contract.database, row, reader, checkpoint=checkpoint)
        except OcrUnavailable:
            failed.append(row['id'])
        else:
            if entry['verdict'] == 'incomplete':
                failed.append(row['id'])
    return failed
