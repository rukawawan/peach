"""JavDB 原题与同番号来源身份的证据版本。"""
from __future__ import annotations

import re

from .source_page_words import FANZA_LIMITED_PREFIX, FANZA_PHOTO_BONUS_TITLE

RULE = 2


def fanza_regular_id(rows: list[dict]) -> str | None:
    """只识别原题仅相差 FANZA 生写真特典标记的两条发行记录。"""
    if len(rows) != 2:
        return None
    for special, regular in (rows, rows[::-1]):
        title = special.get('origin_title')
        ordinary = regular.get('origin_title')
        if not isinstance(title, str) or not isinstance(ordinary, str) or not ordinary:
            continue
        match = re.fullmatch(FANZA_PHOTO_BONUS_TITLE, title)
        if match and match[1] == ordinary and not ordinary.startswith(FANZA_LIMITED_PREFIX):
            return regular['id']
    return None


def current_evidence(payload: object) -> bool:
    return (isinstance(payload, dict) and type(payload.get('javdb_rule')) is int
            and payload['javdb_rule'] == RULE)


def current_candidate(payload: object) -> bool:
    return (current_evidence(payload) and isinstance(payload.get('source_id'), str)
            and re.fullmatch(r'[A-Za-z0-9]+', payload['source_id']) is not None)


def cache_key(key: str) -> str:
    """只隔离旧的番号身份与作品详情，明确来源ID的资源缓存继续复用。"""
    return f'javdb-{RULE}:{key}' if key.startswith(('movie-id:', 'movie:')) else key
