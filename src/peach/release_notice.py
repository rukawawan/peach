"""更新后给使用者看的公告：判定新安装、上一版升级与跳版升级，按平台和本机数据挑条目。

已读版本记在账本的个人设置里（与教程进度同一份），一个部署只弹一次，换设备不重复。
0.57.0 之前没有这份记录：老用户第一次升到带公告的版本时，按迁移记录粗略推断原来的版本，
推断结果只给下界，界面把「错过的版本」写成「最近几版」。
"""
from __future__ import annotations

import json
import sys
import time
from datetime import datetime, timezone

from . import __version__, distribution
from .profiles import DEFAULT_PROFILE_ID, read_settings
from . import interface_text
from .release_notices import NOTICES

KEY = 'release_notice'
#: 跳版升级时最多补列几版的要点，更早的看 Release 页。
MISSED_LIMIT = 3
#: 新安装时所有迁移在同一次启动里应用完；跨度超过这个秒数就是升级过的账本。
FRESH_INSTALL_SPREAD = 3600
#: 某个迁移最早随哪一版发布。用来给没有已读记录的老账本推断原版本的下界。
MIGRATION_FLOOR = ((50, '0.51.0'), (48, '0.50.0'), (47, '0.45.0'), (46, '0.40.0'))
#: `platforms` 可用的取值：系统与安装方式。
PLATFORM_TOKENS = frozenset({'windows', 'macos', 'linux', 'docker', 'standalone', 'source'})
#: `when` 可用的条件，由调用方按本机数据给出。
FACTS = frozenset({'display_reprobe', 'system_files', 'garbled_performers', 'javdb_entries',
                   'display_cloud_pending'})
RELEASES_URL = 'https://github.com/peach-mitao/peach/releases/tag/v'


def version_key(version: str) -> tuple[int, ...]:
    return tuple(int(part) for part in version.split('.'))


def platform() -> set[str]:
    system = {'win32': 'windows', 'darwin': 'macos'}.get(sys.platform, 'linux')
    install = 'docker' if distribution.docker() else 'standalone' if distribution.standalone() else 'source'
    return {system, install}


def applies(item: dict, tokens: set[str], facts: dict) -> bool:
    wanted = item.get('platforms')
    if wanted and not any(set(token.split('+')) <= tokens for token in wanted):
        return False
    return not item.get('when') or bool(facts.get(item['when']))


def _text(version: str, key: str) -> str:
    """这一版公告的文字：`server:releaseNotes.v<版本，点换成连字符>.<key>`（ADR-0159）。"""
    return interface_text.text(f"server:releaseNotes.v{version.replace('.', '-')}.{key}")


def _items(version, rows, tokens, facts):
    shown = []
    for row in rows or []:
        if applies(row, tokens, facts):
            item = {key: row[key] for key in ('id', 'icon', 'route') if row.get(key)}
            item['title'] = _text(version, f"items.{row['id']}.title")
            item['body'] = _text(version, f"items.{row['id']}.body")
            if isinstance(facts.get(row.get('when')), dict):
                item['progress'] = facts[row['when']]
            shown.append(item)
    return shown


def _estimated_previous(connection) -> tuple[str | None, bool]:
    """返回 (原版本下界, 是否新安装)。没有迁移记录的库按新安装处理。"""
    rows = connection.execute('SELECT version, applied_at FROM schema_migration').fetchall()
    if not rows:
        return None, True
    stamps = sorted(_epoch(row[1]) for row in rows)
    if stamps[-1] - stamps[0] < FRESH_INSTALL_SPREAD:
        return None, True
    latest = stamps[-1]
    earlier = [int(row[0]) for row in rows if latest - _epoch(row[1]) >= FRESH_INSTALL_SPREAD]
    last = max(earlier) if earlier else 0
    for number, version in MIGRATION_FLOOR:
        if last >= number:
            return version, False
    return None, False


def _epoch(value) -> float:
    stamp = datetime.fromisoformat(str(value))
    return (stamp if stamp.tzinfo else stamp.replace(tzinfo=timezone.utc)).timestamp()


def snapshot(connection, *, facts: dict | None = None, tokens: set[str] | None = None,
             current: str = __version__) -> dict:
    facts, tokens = facts or {}, tokens or platform()
    record = read_settings(connection).get(KEY) or {}
    seen = record.get('seen')
    estimated = False
    if seen:
        kind = 'seen' if version_key(seen) >= version_key(current) else 'upgrade'
        floor = seen
    else:
        floor, fresh = _estimated_previous(connection)
        kind = 'new-install' if fresh else 'upgrade'
        estimated = True
    notice = NOTICES.get(current)
    missed = []
    if kind == 'upgrade':
        lower = version_key(floor) if floor else (0,)
        older = sorted((version for version in NOTICES if lower < version_key(version) < version_key(current)),
                       key=version_key, reverse=True)
        for version in older:
            rows = _items(version, NOTICES[version].get('features'), tokens, facts)
            if NOTICES[version].get('level') == 'notice' and rows:
                missed.append({'version': version, 'headline': _text(version, 'headline'), 'features': rows})
        missed = missed[:MISSED_LIMIT]
        if missed and not estimated:
            kind = 'skipped'
    show = kind in ('upgrade', 'skipped') and notice is not None and notice.get('level') == 'notice'
    payload = {'current': current, 'kind': kind, 'show': show, 'previous': floor, 'estimated': estimated,
               'release_url': RELEASES_URL + current, 'missed': missed}
    if notice is not None:
        payload['notice'] = {
            'level': notice.get('level', 'notice'), 'headline': _text(current, 'headline'),
            'features': _items(current, notice.get('features'), tokens, facts),
            'automatic': _items(current, notice.get('automatic'), tokens, facts),
            'attention': _items(current, notice.get('attention'), tokens, facts),
        }
    return payload


def acknowledge(connection, version: str = __version__) -> None:
    """写下已读版本；只前进不后退，旧标签页晚到的确认不覆盖新版本。"""
    settings = read_settings(connection)
    record = settings.get(KEY) if isinstance(settings.get(KEY), dict) else {}
    if record.get('seen') and version_key(record['seen']) >= version_key(version):
        return
    record.update(seen=version, acknowledged_at=time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime()))
    settings[KEY] = record
    updated = connection.execute(
        'UPDATE profile SET settings_json=?,updated_at=? WHERE id=?',
        (json.dumps(settings, ensure_ascii=False), record['acknowledged_at'], DEFAULT_PROFILE_ID)).rowcount
    if not updated:
        raise ValueError('current profile settings do not exist')
