"""按已测尺寸修正自动画质分档，并保留可撤回的原值。"""
from __future__ import annotations

import json

from .display_dimensions_repair import generation
from .media_probe import context_fields

KEY = 'quality-resolution-1'
SOURCE = 'upgrade:quality-resolution'


def settle(connection) -> dict:
    """只改仍符合原探测规则的值；尺寸缺失或不符合旧规则的值保持原样。"""
    changed = []
    rows = connection.execute("SELECT id,location,path,size,mtime,width,height,ctx_quality FROM asset "
                              "WHERE medium='video' AND width>0 AND height>0 AND ctx_quality IS NOT NULL")
    for row in rows.fetchall():
        asset_id, width, height, previous = row['id'], row['width'], row['height'], row['ctx_quality']
        longest = max(width, height)
        if longest < 900:
            continue
        old = ('4K' if longest >= 3000 else '2K' if longest >= 1900 else '1080P' if longest >= 1300
               else '720P')
        quality = context_fields(width, height, 0)[2]
        if previous != old or quality == previous:
            continue
        connection.execute('UPDATE asset SET ctx_quality=? WHERE id=?', (quality, asset_id))
        changed.append({'asset_id': asset_id, 'generation': generation(row), 'width': width, 'height': height,
                        'previous': previous, 'quality': quality})
    return {'assets': changed}


def planned_revert(connection, source: str, batch: str = '') -> list[dict]:
    """只计划撤回仍保持原尺寸和补修结果的资产。"""
    if source != SOURCE or (batch and batch != KEY):
        return []
    receipt = connection.execute('SELECT result_json FROM ledger_upgrade_repair WHERE id=?', (KEY,)).fetchone()
    if receipt is None:
        return []
    planned = []
    for item in json.loads(receipt[0]).get('assets', []):
        current = connection.execute('SELECT id,location,path,size,mtime,width,height,ctx_quality '
                                     'FROM asset WHERE id=? AND medium=?',
                                     (item['asset_id'], 'video')).fetchone()
        if (current and generation(current) == item['generation']
                and (current['width'], current['height'], current['ctx_quality'])
                == (item['width'], item['height'], item['quality'])):
            planned.append({**item, 'batch': KEY})
    return planned


def revert(connection, planned: list[dict]) -> int:
    """按条件还原原值，跳过计划后又变化的行。"""
    restored = 0
    for item in planned:
        current = connection.execute('SELECT id,location,path,size,mtime FROM asset WHERE id=?',
                                     (item['asset_id'],)).fetchone()
        if current is None or generation(current) != item['generation']:
            continue
        restored += connection.execute(
            "UPDATE asset SET ctx_quality=? WHERE id=? AND medium='video' AND width=? AND height=? AND ctx_quality=?",
            (item['previous'], item['asset_id'], item['width'], item['height'], item['quality'])).rowcount
    return restored
