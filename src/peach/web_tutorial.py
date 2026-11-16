"""教程邀请与阅读进度随本机账本保存，各设备按动作更新同一份状态。"""
from __future__ import annotations

import json
import re
import time

from .profiles import DEFAULT_PROFILE_ID, read_settings
from .user_messages import UserValueError

# 只有明确需要重新介绍新教程的版本才修改；不跟随应用版本号递增。
CAMPAIGN = 'tutorial-center-1'
KEY = 'tutorial_progress'


def _snapshot(settings):
    stored = settings.get(KEY, {})
    return {'version': 1, 'campaign': CAMPAIGN,
            'invited': stored.get('invited_campaign') == CAMPAIGN,
            'completed': stored.get('completed_campaign') == CAMPAIGN,
            'chapters': stored.get('chapters', {})}


def q_tutorial_progress(contract, _args=None):
    with contract.read_connection() as connection:
        return _snapshot(read_settings(connection))


def _identifier(body, key):
    value = body.get(key)
    if not isinstance(value, str) or not re.fullmatch(r'[a-zA-Z0-9_-]{1,80}', value):
        raise UserValueError('api.tutorial.invalidIdentifier')
    return value


def w_tutorial_progress(contract, body):
    if body.get('campaign') != CAMPAIGN:
        raise UserValueError('api.tutorial.campaignChanged')
    action = body.get('action')
    if action not in {'dismiss', 'reopen', 'complete', 'position', 'step'}:
        raise UserValueError('api.tutorial.unsupportedAction')
    if action in {'position', 'step'}:
        chapter = _identifier(body, 'chapter')
        position = body.get('next')
        if type(position) is not int or not 0 <= position <= 200:
            raise UserValueError('api.tutorial.invalidPosition')
        if action == 'step':
            step = _identifier(body, 'step')
            if type(body.get('skipped')) is not bool:
                raise UserValueError('api.tutorial.invalidSkipped')
    with contract.write_transaction() as connection:
        settings = read_settings(connection)
        stored = settings.setdefault(KEY, {})
        if action == 'dismiss':
            stored['invited_campaign'] = CAMPAIGN
        elif action == 'reopen':
            stored.update(invited_campaign=CAMPAIGN, completed_campaign=None)
        elif action == 'complete':
            stored.update(invited_campaign=CAMPAIGN, completed_campaign=CAMPAIGN)
        else:
            chapters = stored.setdefault('chapters', {})
            if chapter not in chapters and len(chapters) >= 100:
                raise UserValueError('api.tutorial.tooManyChapters')
            row = chapters.setdefault(chapter, {'next': 0, 'read': [], 'skipped': []})
            row['next'] = position
            if action == 'step':
                if step not in row['read'] + row['skipped'] and len(row['read']) + len(row['skipped']) >= 200:
                    raise UserValueError('api.tutorial.tooManySteps')
                row['read'] = [value for value in row['read'] if value != step]
                row['skipped'] = [value for value in row['skipped'] if value != step]
                row['skipped' if body['skipped'] else 'read'].append(step)
        updated = connection.execute(
            'UPDATE profile SET settings_json=?,updated_at=? WHERE id=?',
            (json.dumps(settings, ensure_ascii=False), time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime()),
             DEFAULT_PROFILE_ID)).rowcount
        if not updated:
            raise UserValueError('api.tutorial.profileMissing')
        return _snapshot(settings)
