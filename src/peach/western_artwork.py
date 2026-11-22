"""西方出演者的图库候选与发行方作品封面。"""
from __future__ import annotations

import json
import hashlib
import re
from dataclasses import dataclass
from datetime import date
from pathlib import Path, PureWindowsPath
from urllib.parse import quote, urljoin, urlsplit, urlunsplit

from bs4 import BeautifulSoup

from .catalog_rules import normalise_code_key
from .http import HttpRequest, HttpTransport, public_https_url, response_text
from . import interface_text
from .user_agent import USER_AGENT
from .user_messages import UserValueError

SITES = frozenset(('tushy', 'tushyraw', 'vixen', 'blacked', 'blackedraw',
                   'deeper', 'slayed', 'milfy', 'wifey'))
PUBLISHERS = dict(tushy='Tushy', tushyraw='Tushy Raw', vixen='Vixen', blacked='Blacked',
                  blackedraw='Blacked Raw', deeper='Deeper', slayed='Slayed', milfy='Milfy', wifey='Wifey')
SCENE_SOURCE = 'vixen-network'
_SCENE_FILENAME = re.compile(
    r'^(?P<site>[a-z0-9]+(?:[._ -][a-z0-9]+){0,4}?)[._ -]'
    r'(?P<year>(?:19|20)\d{2}|\d{2})[._ -](?P<month>\d{2})[._ -](?P<day>\d{2})[._ -]+(?P<scene>.+)$',
    re.I,
)
_MOVIE_FILENAME = re.compile(r'^(?P<site>.+?)\s+-\s+(?P<title>.+?)\s+\((?P<year>(?:19|20)\d{2})\)$')
_RELEASE_SUFFIX = re.compile(
    r'\b(?:[248]k|[1-8]\d{2,3}p|uhd|web(?:[ -]?(?:dl|rip))?|[hx][ .]?26[45]|hevc|avc|aac|hdr|sdr)\b', re.I)
SOURCE = 'auto:western-artwork'
PAGE_LIMIT = 4 * 1024 * 1024
TIMEOUT = 20
SEARCH_LIMIT = 30
SEARCH_QUERY = '''query PeachSearch($query:String!,$site:Site!,$first:Int){
searchVideos(input:{query:$query,site:$site,first:$first}){edges{node{
title slug releaseDate models{name} }}}}'''
SCENE_QUERY = '''query PeachScene($videoSlug:String,$site:Site){
findOneVideo(input:{slug:$videoSlug,site:$site}){
slug title releaseDate models{name} categories{name} images{poster{src width}}}}'''


def artwork_key(asset_id: int, code: str | None) -> str:
    """番号封面共用一份；没有番号的作品使用资产键，不改真相字段。"""
    return normalise_code_key(code) or f'ASSET-ID-{int(asset_id)}'


def artwork_cast_size(cover: Path, ledger_count: int) -> int:
    """发行方的完整出演名单也参与合演保护，不靠馆藏名单推断只有一个人。"""
    try:
        evidence = json.loads(cover.with_suffix('.scraping.json').read_text(encoding='utf8'))
    except (OSError, ValueError):
        return ledger_count
    names = (evidence.get('performers') if isinstance(evidence, dict)
             and evidence.get('provider') in ('western-official', 'western-catalog') else None)
    if not isinstance(names, list):
        return ledger_count
    return max(ledger_count, len({_name(n) for n in names if isinstance(n, str) and _name(n)}))


def _name(name: str) -> str:
    return re.sub(r'[\W_]+', '', str(name).casefold())


def babepedia_page(http: HttpTransport, name: str, aliases=(), *, profile_url: str = '') -> tuple:
    """读取与名字栏或别名明确相符的档案。"""
    url = profile_url or 'https://www.babepedia.com/babe/' + quote(name.replace(' ', '_'))
    parsed_profile = urlsplit(url)
    if (not public_https_url(url) or parsed_profile.hostname not in ('www.babepedia.com', 'babepedia.com')
            or not parsed_profile.path.startswith('/babe/')):
        raise UserValueError('errors.westernArtwork.babepediaUrlMismatch')
    response = http(HttpRequest('GET', url, {'User-Agent': USER_AGENT}), TIMEOUT, PAGE_LIMIT)
    if response.status != 200:
        raise UserValueError('errors.westernArtwork.babepediaHttp', {'status': response.status})
    soup = BeautifulSoup(response_text(response), 'html.parser')
    heading = soup.select_one('h1#babename')
    found = heading.get_text(' ', strip=True) if heading else ''
    known = {_name(n) for n in (name, *aliases)}
    aka = soup.select_one('h2#aka')
    if aka:
        for label in aka.select('small, #aliasinfobtn'):
            label.decompose()
    alias_names = [n.strip() for n in aka.get_text(' ', strip=True).split(' - ') if n.strip()] if aka else []
    listed = {_name(n) for n in alias_names}
    if not found or not (known & {_name(found), *listed}):
        raise UserValueError('errors.westernArtwork.babepediaIdentityMismatch')
    final = response.url or url
    if urlsplit(final).hostname not in ('www.babepedia.com', 'babepedia.com'):
        raise UserValueError('errors.westernArtwork.babepediaHostMismatch')
    return soup, final, found, alias_names


def babepedia_portraits(http: HttpTransport, name: str, aliases=(), *, profile_url: str = '') -> list[dict]:
    """主图与本人档案图库作为候选；推荐人物不参与。"""
    soup, final, found, _ = babepedia_page(http, name, aliases, profile_url=profile_url)
    portraits = []
    seen = set()
    for link in soup.select('#profbox2 a.img[href], .useruploads2 a.img[href]'):
        image = urljoin(final, str(link['href']))
        parsed = urlsplit(image)
        primary = parsed.path.startswith('/pics/') and link.find_parent(id='profbox2') is not None
        thumbnail = link.find('img')
        gallery = (parsed.path.startswith('/user-uploads/') and thumbnail is not None
                   and _name(thumbnail.get('alt', '')) == _name(found)
                   and link.find_parent(class_='useruploads2') is not None)
        if (parsed.hostname not in ('www.babepedia.com', 'babepedia.com')
                or parsed.port not in (None, 443)
                or not (primary or gallery) or not public_https_url(image)
                or image in seen):
            continue
        image = urlunsplit((parsed.scheme, parsed.netloc, quote(parsed.path, safe='/%'), parsed.query, ''))
        seen.add(image)
        portraits.append({'provider': 'babepedia', 'source_kind': 'external_media_library',
                          'upstream_url': image, 'profile_url': final,
                          'external_id': f'babepedia:{found}', 'matched_name': found,
                          'name_source': 'babepedia-profile', 'identity_verified': True,
                          'automatic_install': primary})
        if len(portraits) == 48:
            break
    return portraits


def face_matched_portrait(fetched: list, covers: list, matcher) -> tuple:
    """Babepedia 图里哪一张是她：与她单人作品封面比上脸才算（ADR-0056），名字相同不算。

    `fetched` 是 `[(origin, body, inspected)]`，主图在前；`covers` 是
    `avatar_cover_face.faces` 截到的封面脸。没有封面参照、模型不可用或比不上时只留候选，
    返回 `(None, {}, 原因)`；比上时返回 `(Candidate, 比对证据, '')`。
    """
    from .avatar_followup import Candidate, match_gallery
    from .task_outcomes import render

    found, candidates = [], {}
    for origin, body, inspected in fetched:
        choice = {'ref': origin['upstream_url'], 'label': 'Babepedia'}
        found.append(choice)
        candidates[choice['ref']] = Candidate(choice, body, origin, inspected)
    if not covers:
        return None, {}, interface_text.text('server:labels.westernArtwork.noSoloCovers')
    result = match_gallery(found, covers, matcher, lambda choice: candidates.get(choice['ref']))
    if result.winner is None or not result.evidence.get('covers'):
        return None, {}, (render(result.reason) if result.reason
                          else interface_text.text('server:labels.westernArtwork.noCoverMatch'))
    return result.winner, result.evidence, ''


def planned_covers(cover_root: Path, source: str, batch: str) -> list[Path]:
    """边车写着这个来源与批次的无番号作品封面；撤回删掉封面与同组边车。"""
    if source != SOURCE:
        return []
    found = []
    for sidecar in sorted(Path(cover_root).glob('ASSET-ID-*.scraping.json')):
        try:
            record = json.loads(sidecar.read_text(encoding='utf8'))
        except (OSError, ValueError):
            continue
        if isinstance(record, dict) and record.get('source') == source and (not batch or record.get('batch') == batch):
            found.append(sidecar.with_name(sidecar.name.removesuffix('.scraping.json') + '.jpg'))
    return found


def filename_date(name: str, site: str) -> str:
    """发行方前缀后的日期，限定 2000 年后的发行日期格式。"""
    match = re.match(rf'^{re.escape(site)}[._ -](\d{{2}}|20\d{{2}})[._ -](\d{{2}})[._ -](\d{{2}})[._ -]',
                     name, re.I)
    if not match:
        return ''
    year, month, day = map(int, match.groups())
    try:
        return date(year + 2000 if year < 100 else year, month, day).isoformat()
    except ValueError:
        return ''


def _words(value):
    return tuple(re.findall(r'[^\W_]+', str(value or '').casefold()))


@dataclass(frozen=True)
class WesternScene:
    site: str
    release_date: str
    text: tuple[str, ...]
    title: tuple[str, ...]

    @property
    def cache_key(self):
        query = json.dumps((self.site, self.release_date, self.text, self.title), ensure_ascii=False)
        return 'western-' + hashlib.sha256(query.encode()).hexdigest()[:24]


def scene_identity(row) -> WesternScene | None:
    """用结构化文件名或已有厂牌、发行日期和片名识别场景。"""
    name = PureWindowsPath(str(row.get('name') or row.get('path') or '')).stem
    matched = _SCENE_FILENAME.fullmatch(name)
    if matched is None:
        return _movie_identity(name) or _registered_identity(row)
    site = _name(matched['site'])
    if not 2 <= len(site) <= 48 or not any(char.isalpha() for char in site):
        return None
    year = int(matched['year'])
    if year < 100:
        year += 2000 if year < 70 else 1900
    try:
        released = date(year, int(matched['month']), int(matched['day'])).isoformat()
    except ValueError:
        return None
    text = _words(_RELEASE_SUFFIX.split(matched['scene'], maxsplit=1)[0])
    if len(text) < 2 or len(text) > 40:
        return None
    title = _words(row.get('original_title') or row.get('catalog_title'))
    # 文件名可能曾作为展示标题。只利用可与文件名中的连续词序互证的已有标题。
    if len(title) < 2 or not any(text[start:start + len(title)] == title for start in range(len(text))):
        title = ()
    return WesternScene(site, released, text, title)


def _registered_identity(row):
    site = _name(row.get('studio') or '')
    title = _words(row.get('original_title') or row.get('catalog_title'))
    released = str(row.get('release_date') or '')
    if (not re.fullmatch(r'[a-z0-9]{2,48}', site) or not any(char.isalpha() for char in site)
            or not 2 <= len(title) <= 40 or not all(word.isascii() for word in title)):
        return None
    try:
        if date.fromisoformat(released).isoformat() != released:
            return None
    except ValueError:
        return None
    return WesternScene(site, released, title, title)


def _movie_identity(name):
    match = _MOVIE_FILENAME.fullmatch(_RELEASE_SUFFIX.split(name, maxsplit=1)[0].strip(' ._-'))
    if match is None:
        return None
    site = _name(match['site'])
    title = _words(match['title'])
    if not re.fullmatch(r'[a-z0-9]{2,48}', site) or not 2 <= len(title) <= 40:
        return None
    return WesternScene(site, match['year'], title, title)


def _graphql(http: HttpTransport, site: str, query: str, variables: dict) -> dict:
    if site not in SITES:
        raise ValueError('unsupported publisher')
    variables = {**variables, 'site': site.upper()}
    response = http(HttpRequest('POST', f'https://www.{site}.com/graphql',
                               {'User-Agent': USER_AGENT, 'Content-Type': 'application/json',
                                'Accept': 'application/json', 'Referer': f'https://www.{site}.com/'},
                               json.dumps({'query': query, 'variables': variables}).encode()),
                    TIMEOUT, PAGE_LIMIT)
    if response.status != 200:
        raise UserValueError('errors.westernArtwork.officialCoverHttp', {'status': response.status})
    data = json.loads(response.body)
    if not isinstance(data, dict) or data.get('errors') or not isinstance(data.get('data'), dict):
        raise UserValueError('errors.westernArtwork.officialCoverInvalid')
    return data['data']


def official_scene(http: HttpTransport, site: str, performer: str, released: str) -> dict | None:
    """搜索不是身份判定：名字与发行日期同时精确匹配，唯一结果才取详情。"""
    date.fromisoformat(released)
    def matches(node):
        return (str(node.get('releaseDate') or '').split('T')[0] == released
                and _name(performer) in {_name(m.get('name', '')) for m in node.get('models') or []})
    scene = _verified_scene(http, site, released, (performer,), matches)
    return scene if scene and scene.get('image_url') else None


def collect_scene(http: HttpTransport, identity: WesternScene) -> dict | None:
    """用准确场景标题，或片名中的完整艺名加准确场景标题核对同日作品。"""
    def matches(node):
        return (str(node.get('releaseDate') or '').split('T')[0] == identity.release_date
                and matches_scene_text(identity, node.get('title'),
                                       (model.get('name') for model in node.get('models') or [])))

    query = ' '.join(identity.title or identity.text)
    artist_query = ' '.join(identity.text[:2])
    return _verified_scene(http, identity.site, identity.release_date,
                           tuple(dict.fromkeys((query, artist_query))), matches)


def matches_scene_text(identity: WesternScene, title, performers) -> bool:
    title_words = _words(title)
    names = {_words(name) for name in performers}
    if identity.text in names:
        return True
    if len(title_words) < 2:
        return False
    if title_words in (identity.title, identity.text):
        return True
    length = len(title_words)
    prefix = identity.text[:-length]
    return len(prefix) >= 2 and identity.text[-length:] == title_words and prefix in names


def matches_publisher(identity: WesternScene, name: str) -> bool:
    return _name(name) == identity.site


def matches_exact_title(identity: WesternScene, title) -> bool:
    return _words(title) == (identity.title or identity.text)


def _validate_scene_node(node):
    """身份字段不完整是接口失败，不能作为没有作品的证据。"""
    if (not isinstance(node, dict)
            or any(not isinstance(node.get(key), str) or not node[key].strip()
                   for key in ('title', 'slug', 'releaseDate'))
            or not isinstance(node.get('models'), list)
            or any(not isinstance(model, dict) or not isinstance(model.get('name'), str)
                   or not model['name'].strip() for model in node['models'])):
        raise UserValueError('errors.westernArtwork.officialCoverInvalid')
    try:
        date.fromisoformat(node['releaseDate'].split('T')[0])
    except ValueError as error:
        raise UserValueError('errors.westernArtwork.officialCoverInvalid') from error


def _search_nodes(search):
    """只有显式的 edges 空列表才说明这一问没有结果。"""
    connection = search.get('searchVideos')
    if not isinstance(connection, dict) or not isinstance(connection.get('edges'), list):
        raise UserValueError('errors.westernArtwork.officialCoverInvalid')
    nodes = []
    for edge in connection['edges']:
        node = edge.get('node') if isinstance(edge, dict) else None
        _validate_scene_node(node)
        nodes.append(node)
    return nodes


def _verified_scene(http, site, released, queries, matches):
    hits = set()
    complete_hits = set()
    for query in queries:
        search = _graphql(http, site, SEARCH_QUERY, {'query': query, 'first': SEARCH_LIMIT})
        nodes = _search_nodes(search)
        found = set()
        for node in nodes:
            if not matches(node):
                continue
            slug = node.get('slug')
            if isinstance(slug, str) and re.fullmatch(r'[a-zA-Z0-9][a-zA-Z0-9_-]*', slug):
                found.add(slug)
        hits.update(found)
        # 接口未提供 pageInfo；顶到查询上限的结果不能单独证明唯一性。
        if len(nodes) < SEARCH_LIMIT:
            complete_hits.update(found)
    if len(hits) != 1 or hits != complete_hits:
        return None
    slug = next(iter(hits))
    scene = _graphql(http, site, SCENE_QUERY, {'videoSlug': slug}).get('findOneVideo')
    _validate_scene_node(scene)
    if scene.get('slug') != slug or not matches(scene):
        return None
    return _public_scene(scene, site, slug, released)


def _public_scene(scene, site, slug, released):
    """提取已核对的官方字段，并限定海报地址在发行方域名下。"""
    images = [image for image in (scene.get('images') or {}).get('poster') or []
              if public_https_url(str(image.get('src') or ''))
              and (urlsplit(image['src']).hostname or '').endswith('.' + site + '.com')
              and isinstance(image.get('width'), (int, float))]
    return {'title': scene.get('title'), 'date': released, 'site': site, 'scene_id': f'{site}:{slug}',
            'performers': [m['name'] for m in scene.get('models') or [] if m.get('name')],
            'genres': [category['name'] for category in scene.get('categories') or [] if category.get('name')],
            'source_url': f'https://www.{site}.com/videos/{quote(slug)}',
            'image_url': max(images, key=lambda image: image['width'])['src'] if images else ''}
