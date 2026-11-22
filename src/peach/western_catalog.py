"""跨厂牌的 StashDB 场景查询与详情核对。"""
from __future__ import annotations

import json
from urllib.parse import urlsplit
from uuid import UUID

from .http import HttpRequest, public_https_url
from .user_messages import UserValueError
from .western_artwork import matches_publisher, matches_scene_text

SOURCE = 'stashdb'
LABEL = 'StashDB'
ENDPOINT = 'https://stashdb.org/graphql'
LIMIT = 25
_IDENTITY = 'id title date studio{name} performers{performer{name} as}'
_SEARCH = f'''query PeachSearch($term:String!, $limit:Int!){{
searchScenes(term:$term, per_page:$limit){{count scenes{{{_IDENTITY}}}}}}}'''
_DETAIL = f'''query PeachScene($id:ID!){{
findScene(id:$id){{{_IDENTITY} tags{{name}} images{{url width}}}}}}'''


class CredentialsRejected(UserValueError):
    def __init__(self, label=LABEL):
        super().__init__('errors.westernCatalog.keyRejected', {'source': label})


def request(http, key, query, variables=None):
    """向已登记的端点发送 GraphQL 请求；错误信息仅保留状态。"""
    response = http(HttpRequest('POST', ENDPOINT,
        {'Content-Type': 'application/json', 'Accept': 'application/json', 'ApiKey': key},
        json.dumps({'query': query, 'variables': variables or {}}).encode()), 20, 4 * 1024 * 1024)
    if response.status == 401:
        raise CredentialsRejected()
    if response.status != 200:
        raise UserValueError('errors.westernCatalog.http', {'source': LABEL, 'status': response.status})
    try:
        body = json.loads(response.body)
    except (UnicodeError, ValueError):
        raise UserValueError('errors.westernCatalog.invalid', {'source': LABEL}) from None
    if not isinstance(body, dict):
        raise UserValueError('errors.westernCatalog.invalid', {'source': LABEL})
    errors = body.get('errors') or []
    if isinstance(errors, list) and any(isinstance(error, dict)
            and str(error.get('message', '')).strip().casefold() == 'not authorized' for error in errors):
        raise CredentialsRejected()
    if errors or not isinstance(body.get('data'), dict):
        raise UserValueError('errors.westernCatalog.invalid', {'source': LABEL})
    return body['data']


def authenticated(http, key):
    user = request(http, key, 'query PeachCredentials{me{id}}').get('me')
    return isinstance(user, dict) and bool(user.get('id'))


def _names(scene):
    return [appearance['performer']['name'] for appearance in scene.get('performers') or []]


def _matches(scene, identity):
    studio = scene.get('studio') or {}
    names = [*_names(scene), *(appearance.get('as') for appearance in scene.get('performers') or [])]
    return (scene.get('date') == identity.release_date and matches_publisher(identity, studio.get('name', ''))
            and matches_scene_text(identity, scene.get('title'), names))


def _scene_ids(http, key, identity):
    searched = set()
    matched = set()
    supported = set()
    for words in (identity.title or identity.text, identity.text[:2]):
        term = ' '.join(words)
        if term in searched:
            continue
        searched.add(term)
        result = request(http, key, _SEARCH, {'term': term, 'limit': LIMIT}).get('searchScenes')
        if (not isinstance(result, dict) or not isinstance(result.get('scenes'), list)
                or type(result.get('count')) is not int or result['count'] < len(result['scenes'])):
            raise UserValueError('errors.westernCatalog.invalid', {'source': LABEL})
        ids = {scene['id'] for scene in result['scenes'] if _matches(scene, identity)}
        matched.update(ids)
        if result['count'] == len(result['scenes']):
            supported.update(ids)
    return matched if matched == supported else set()


def allowed_image_url(url):
    if not isinstance(url, str) or not public_https_url(url):
        return False
    try:
        parsed = urlsplit(url)
        host = parsed.hostname or ''
        return parsed.port in (None, 443) and (host == 'stashdb.org' or host.endswith('.stashdb.org'))
    except ValueError:
        return False


def _image(scene):
    images = [image for image in scene.get('images') or [] if allowed_image_url(image.get('url'))]
    return max(images, key=lambda image: image.get('width') or 0)['url'] if images else ''


def collect(http, key, identity):
    """一条确切场景才取得详情，保留数据库自己的场景 ID。"""
    matched = _scene_ids(http, key, identity)
    if len(matched) != 1:
        return None
    try:
        scene_id = str(UUID(next(iter(matched))))
    except (ValueError, TypeError, AttributeError):
        raise UserValueError('errors.westernCatalog.invalid', {'source': LABEL}) from None
    scene = request(http, key, _DETAIL, {'id': scene_id}).get('findScene')
    if not isinstance(scene, dict) or scene.get('id') != scene_id or not _matches(scene, identity):
        return None
    return dict(id=scene_id, content_id=scene_id, title=scene.get('title'), maker=scene['studio']['name'],
                release_date=scene['date'], actresses=_names(scene),
                genres=[tag['name'] for tag in scene.get('tags') or []],
                source_url=f'https://stashdb.org/scenes/{scene_id}', image_url=_image(scene))
