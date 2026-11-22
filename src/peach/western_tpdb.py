"""ThePornDB 的场景与长片目录。"""
from __future__ import annotations

import json
from urllib.parse import urlencode, urlsplit
from uuid import UUID

from .http import HttpRequest, public_https_url
from .user_messages import UserValueError
from .western_artwork import matches_exact_title, matches_publisher, matches_scene_text
from .western_catalog import CredentialsRejected

SOURCE = 'theporndb'
LABEL = 'ThePornDB'
HOST = 'api.theporndb.net'
BASE = f'https://{HOST}'


def request(http, key, path):
    response = http(HttpRequest('GET', BASE + path,
        {'Accept': 'application/json', 'Authorization': f'Bearer {key}'}), 20, 4 * 1024 * 1024)
    if response.status == 401:
        raise CredentialsRejected(LABEL)
    if response.status != 200:
        raise UserValueError('errors.westernCatalog.http', {'source': LABEL, 'status': response.status})
    try:
        document = json.loads(response.body)
    except (UnicodeError, ValueError):
        raise UserValueError('errors.westernCatalog.invalid', {'source': LABEL}) from None
    if not isinstance(document, dict):
        raise UserValueError('errors.westernCatalog.invalid', {'source': LABEL})
    return document


def authenticated(http, key):
    document = request(http, key, '/auth/user')
    user = document.get('data', document)
    return isinstance(user, dict) and bool(user.get('id'))


def _performers(record):
    names = []
    for appearance in record.get('performers') or []:
        person = appearance.get('parent') or appearance
        name = person.get('name') or appearance.get('name')
        if name:
            names.append(name)
    return names


def _matches(record, identity):
    site = record.get('site') or {}
    released = str(record.get('date') or '').split('T')[0]
    if len(identity.release_date) == 4:
        return (matches_publisher(identity, site.get('name', '')) and released.startswith(identity.release_date + '-')
                and matches_exact_title(identity, record.get('title')))
    aliases = [person.get('name') for person in record.get('performers') or [] if person.get('name')]
    return (matches_publisher(identity, site.get('name', ''))
            and released == identity.release_date
            and matches_scene_text(identity, record.get('title'), [*_performers(record), *aliases]))


def _complete_page(reply, rows):
    metadata = reply.get('meta') or {}
    links = reply.get('links') or {}
    if links.get('next'):
        return False
    total = metadata.get('total')
    return (type(total) is int and total == len(rows)) if total is not None else 'next' in links


def _search(http, key, identity, collection):
    terms = ' '.join(identity.title or identity.text)
    reply = request(http, key, f'/{collection}?' + urlencode({'parse': terms, 'year': identity.release_date[:4]}))
    rows = reply.get('data')
    if not isinstance(rows, list):
        raise UserValueError('errors.westernCatalog.invalid', {'source': LABEL})
    if not rows:
        return (), True
    return tuple(row['id'] for row in rows if _matches(row, identity)), _complete_page(reply, rows)


def allowed_image_url(url):
    if not isinstance(url, str) or not public_https_url(url):
        return False
    try:
        parsed = urlsplit(url)
        host = parsed.hostname or ''
        return (parsed.port in (None, 443)
                and any(host == base or host.endswith('.' + base) for base in ('theporndb.net', 'metadataapi.net')))
    except ValueError:
        return False


def _poster(record):
    sizes = record.get('posters') or {}
    urls = (record.get('poster'), sizes.get('large'), sizes.get('medium'), sizes.get('small'))
    return next((url for url in urls if allowed_image_url(url)), '')


def collect(http, key, identity):
    matches = set()
    collections = ('movies',) if len(identity.release_date) == 4 else ('scenes', 'movies')
    for collection in collections:
        ids, complete = _search(http, key, identity, collection)
        if not complete:
            return None
        matches.update((collection, value) for value in ids)
    if len(matches) != 1:
        return None
    collection, item_id = next(iter(matches))
    try:
        item_id = str(UUID(item_id))
    except (ValueError, TypeError, AttributeError):
        raise UserValueError('errors.westernCatalog.invalid', {'source': LABEL}) from None
    record = request(http, key, f'/{collection}/{item_id}').get('data')
    if not isinstance(record, dict) or record.get('id') != item_id or not _matches(record, identity):
        return None
    return dict(id=item_id, content_id=f'{collection}:{item_id}', title=record.get('title'),
                maker=record['site']['name'], release_date=str(record['date']).split('T')[0],
                actresses=_performers(record), genres=[tag['name'] for tag in record.get('tags') or []],
                source_url=f'https://theporndb.net/{collection}/{item_id}', image_url=_poster(record))
