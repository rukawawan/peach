"""欧美作品资料：按文件指纹与文件名向 ThePornDB 查场景，补标题、厂牌、发行日、演员、标签与封面。

Peach 的番号链（`metadata_routes`）把欧美作品归为 `other`，一家都不问；这一模块是给这类作品
单独开的一条路，只处理没有番号的视频，不进番号链。

查法与判据（参考 ThePornDB 官方工具 namer 的查询方式）：

1. 先按 OpenSubtitles 哈希（`oshash`：文件大小加首尾各 64 KiB）查 `/scenes?hash=…&hashType=OSHASH`。
   哈希只认同一个文件，命中唯一一条就采用。
2. 哈希不中再按文件名查 `/scenes?parse=…`。搜索结果不是身份判定：只有厂牌出现在文件名里、
   并且发行日与文件名日期一致或至少一位演员名出现在文件名里，才算这部片；多条同分不采用。

写入只走自动写入者的权限（`auto:theporndb`）：用户编辑或复核过的字段不会被覆盖。封面只在
这部作品还没有封面时安装。每部作品查过的结论记在 `state/western-tpdb.json`，下次跳过；
「重新查」会清掉没查到的记录再跑一遍。
"""
from __future__ import annotations

import json
import re
import struct
import threading
import time
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import quote

from .catalog_rules import western_release_identity
from .config import SECRETS_DIR, STATE_DIR
from .field_owners import auto_owner, write_owned_fields
from .fsutil import atomic_write_text
from .http import HttpRequest, HttpxTransport, public_https_url
from .platform import translate_ledger_path
from .user_agent import USER_AGENT

API = 'https://api.theporndb.net'
PROVIDER = 'theporndb'
OWNER = auto_owner(PROVIDER)
TAG_SOURCE = 'auto:theporndb'
TOKEN_FILE = 'theporndb.json'
STATE_FILE = 'western-tpdb.json'
REQUEST_INTERVAL = 1.2
COVER_MAX_BYTES = 16 * 1024 * 1024
TIMEOUT = 30
MAX_BYTES = 8 * 1024 * 1024
#: 欧美片站文件名：至少两个连字符或下划线连起来的拉丁词（与 `metadata_routes._WESTERN_SLUG` 同一把尺）。
_WESTERN_SLUG = re.compile(r'(?<![a-z])(?:[a-z]{2,}[-_]){2,}', re.I)
_EXTENSION = re.compile(r'\.(?:mp4|mkv|avi|wmv|mov|m4v|ts|webm|flv|mpg|mpeg)$', re.I)
#: 发布组常见的尾巴：分辨率、编码、来源标签与 XXX。查询前去掉，免得淹没真正的场景名。
_NOISE = frozenset({'xxx', '2160p', '1080p', '720p', '480p', '4k', 'uhd', 'hd', 'sd', 'mp4', 'webdl', 'web', 'dl',
                    'webrip', 'hevc', 'x264', 'x265', 'h264', 'h265', 'aac', 'prt', 'ktr', 'p2p', 'xleech', 'rarbg',
                    'split', 'scenes'})
_TOKEN_SEP = re.compile(r'[\s._\-\[\]()]+')


def compact(value: object) -> str:
    return re.sub(r'[^a-z0-9]', '', str(value or '').casefold())


# ---------------------------------------------------------------- 令牌与进度

def token_path(secrets_root: Path = SECRETS_DIR) -> Path:
    return Path(secrets_root) / TOKEN_FILE


def read_token(secrets_root: Path = SECRETS_DIR) -> str:
    try:
        return str(json.loads(token_path(secrets_root).read_text(encoding='utf-8')).get('token') or '').strip()
    except (OSError, ValueError, AttributeError):
        return ''


def save_token(token: str, secrets_root: Path = SECRETS_DIR) -> None:
    token = str(token or '').strip()
    if len(token) > 512 or any(ord(char) < 33 for char in token):
        raise ValueError('API Token 格式不对')
    path = token_path(secrets_root)
    if not token:
        path.unlink(missing_ok=True)
        return
    path.parent.mkdir(parents=True, exist_ok=True)
    atomic_write_text(path, json.dumps({'token': token}))


def _state_path(state_root: Path) -> Path:
    return Path(state_root) / STATE_FILE


def load_state(state_root: Path = STATE_DIR) -> dict[str, dict]:
    try:
        value = json.loads(_state_path(state_root).read_text(encoding='utf-8'))
        return value if isinstance(value, dict) else {}
    except (OSError, ValueError):
        return {}


def save_state(state: dict, state_root: Path = STATE_DIR) -> None:
    path = _state_path(state_root)
    path.parent.mkdir(parents=True, exist_ok=True)
    atomic_write_text(path, json.dumps(state, ensure_ascii=False))


# ---------------------------------------------------------------- 文件与候选

def oshash(path: Path) -> str:
    """OpenSubtitles 哈希：文件大小加首尾各 64 KiB 的 64 位小端整数和，16 位十六进制。"""
    chunk = 65536
    size = path.stat().st_size
    if size < chunk * 2:
        raise ValueError('文件太小，无法计算 oshash')
    value = size
    with path.open('rb') as handle:
        for offset in (0, size - chunk):
            handle.seek(offset)
            data = handle.read(chunk)
            for (word,) in struct.iter_unpack('<Q', data):
                value = (value + word) & 0xFFFFFFFFFFFFFFFF
    return f'{value:016x}'


def is_western_name(name: str) -> bool:
    """文件名是欧美片站或发布组的写法。"""
    return bool(western_release_identity(name) or _WESTERN_SLUG.search(_EXTENSION.sub('', name or '')))


def candidates(connection, *, include_region: bool = True) -> list[dict]:
    """没有番号、没进回收站的视频里，文件名像欧美片或产地已判为欧美的那些。"""
    rows = connection.execute(
        "SELECT id,name,path,studio,release_date,catalog_title,region FROM asset "
        "WHERE medium='video' AND disposal IS NULL AND COALESCE(code,'')='' ORDER BY id").fetchall()
    found = []
    for row in rows:
        item = dict(row)
        if is_western_name(item.get('name') or '') or (include_region and item.get('region') == 'west'):
            found.append(item)
    return found


def query_text(name: str) -> str:
    """把文件名整理成 ThePornDB `parse` 认得的写法：厂牌.日期.场景名，用句点连接。"""
    stem = _EXTENSION.sub('', str(name or ''))
    tokens = [token for token in _TOKEN_SEP.split(stem) if token and token.casefold() not in _NOISE]
    return '.'.join(tokens)[:200]


# ---------------------------------------------------------------- 查询与判定

class TpdbError(ValueError):
    pass


class TpdbClient:
    def __init__(self, token: str, transport=None, *, interval: float = REQUEST_INTERVAL):
        if not token:
            raise TpdbError('还没有填写 ThePornDB 的 API Token')
        self.token = token
        self.transport = transport or HttpxTransport()
        self.interval = interval
        self._last = 0.0

    def get(self, path: str) -> dict:
        wait = self._last + self.interval - time.monotonic()
        if wait > 0:
            time.sleep(wait)
        self._last = time.monotonic()
        headers = {'Authorization': f'Bearer {self.token}', 'Accept': 'application/json', 'User-Agent': USER_AGENT}
        response = self.transport(HttpRequest('GET', API + path, headers), TIMEOUT, MAX_BYTES)
        if response.status in (401, 403):
            raise TpdbError('ThePornDB 拒绝了这个 API Token，请检查是否填写正确')
        if response.status == 429:
            raise TpdbError('ThePornDB 请求过于频繁，稍后再试')
        if response.status != 200:
            raise TpdbError(f'ThePornDB 返回 HTTP {response.status}')
        try:
            return json.loads(response.body.decode('utf-8'))
        except (UnicodeError, ValueError) as error:
            raise TpdbError('ThePornDB 返回的不是 JSON') from error

    def check(self) -> None:
        self.get('/scenes?parse=test&limit=1')

    def by_hash(self, value: str) -> list[dict]:
        return _scenes(self.get(f'/scenes?hash={quote(value)}&hashType=OSHASH'))

    def scene(self, scene_id: str) -> dict | None:
        found = _scenes(self.get(f'/scenes/{quote(str(scene_id))}'))
        return found[0] if found else None

    def by_name(self, text: str) -> list[dict]:
        return _scenes(self.get(f'/scenes?parse={quote(text)}&limit=10'))


def _scenes(payload: dict) -> list[dict]:
    data = payload.get('data') if isinstance(payload, dict) else None
    if isinstance(data, dict):
        return [data]
    return [item for item in data or [] if isinstance(item, dict)]


def performer_names(scene: dict) -> list[str]:
    """出演者的规范名（`parent` 是 ThePornDB 合并后的本人）；男演员不收。"""
    names = []
    for raw in scene.get('performers') or []:
        if not isinstance(raw, dict):
            continue
        parent = raw.get('parent') if isinstance(raw.get('parent'), dict) else {}
        extras = parent.get('extras') if isinstance(parent.get('extras'), dict) else {}
        extra = raw.get('extra') if isinstance(raw.get('extra'), dict) else {}
        gender = str(extras.get('gender') or extra.get('gender') or '').casefold()
        if gender == 'male':
            continue
        name = str(parent.get('name') or raw.get('name') or '').strip()
        if name and name not in names:
            names.append(name)
    return names


def match_score(scene: dict, name: str) -> int:
    """搜索结果与文件名的吻合程度；0 表示不能认作同一部片。"""
    text = compact(_EXTENSION.sub('', name))
    site = scene.get('site') if isinstance(scene.get('site'), dict) else {}
    sites = [compact(site.get(key)) for key in ('name', 'short_name')]
    sites += [compact((site.get(key) or {}).get('name')) for key in ('parent', 'network') if isinstance(site.get(key), dict)]
    site_hit = any(value and len(value) >= 3 and value in text for value in sites)
    if not site_hit:
        return 0
    identity = western_release_identity(name)
    date = str(scene.get('date') or '')[:10]
    date_hit = bool(identity and date and identity.endswith('.' + date))
    if identity and date and not date_hit:
        return 0
    people = sum(1 for person in performer_names(scene) if len(compact(person)) >= 4 and compact(person) in text)
    title = compact(scene.get('title'))
    title_hit = bool(title and len(title) >= 6 and title in text)
    if not (date_hit or people or title_hit):
        return 0
    return 1 + 4 * date_hit + 2 * people + 3 * title_hit


def choose(scenes: list[dict], name: str) -> dict | None:
    scored = sorted(((match_score(scene, name), index) for index, scene in enumerate(scenes)), reverse=True)
    if not scored or scored[0][0] <= 0:
        return None
    if len(scored) > 1 and scored[1][0] == scored[0][0]:
        return None
    return scenes[scored[0][1]]


def lookup(client: TpdbClient, item: dict) -> tuple[dict | None, str]:
    """返回（场景，匹配方式）；没查到时场景为 None。"""
    local = translate_ledger_path(item['path']) if item.get('path') else None
    if local is not None:
        try:
            if local.is_file():
                hits = client.by_hash(oshash(local))
                if len(hits) == 1:
                    return hits[0], 'oshash'
        except (OSError, ValueError):
            pass
    text = query_text(item.get('name') or '')
    if not text:
        return None, ''
    scene = choose(client.by_name(text), item.get('name') or '')
    return (scene, 'filename') if scene else (None, '')


# ---------------------------------------------------------------- 写入

def cover_url(scene: dict) -> str:
    background = scene.get('background') if isinstance(scene.get('background'), dict) else {}
    posters = scene.get('posters') if isinstance(scene.get('posters'), dict) else {}
    for value in (background.get('large'), background.get('full'), scene.get('image'),
                  posters.get('large'), scene.get('poster')):
        if isinstance(value, str) and public_https_url(value):
            return value
    return ''


def apply_scene(connection, asset_id: int, scene: dict, *, now: str) -> dict:
    """在调用方的事务里写入一部作品；返回实际写了哪些东西。"""
    from .entities import upsert_asset_entity
    site = scene.get('site') if isinstance(scene.get('site'), dict) else {}
    values = {}
    title = str(scene.get('title') or '').strip()
    if title:
        values['catalog_title'] = title[:500]
    studio = str(site.get('name') or '').strip()
    if studio:
        values['studio'] = studio[:200]
    date = str(scene.get('date') or '')[:10]
    if re.fullmatch(r'\d{4}-\d{2}-\d{2}', date):
        values['release_date'] = date
    values['region'] = 'west'
    result = write_owned_fields(connection, [asset_id], values, OWNER)
    performers = performer_names(scene)
    for name in performers:
        connection.execute('INSERT OR IGNORE INTO asset_tag(asset_id,tag,confidence,source) VALUES(?,?,?,?)',
                           (asset_id, '演员:' + name, 0.9, TAG_SOURCE))
        upsert_asset_entity(connection, kind='performer', name=name, asset_id=asset_id, role='performer',
                            source=TAG_SOURCE, confidence=0.9, now=now)
    tags = []
    for raw in scene.get('tags') or []:
        tag = str(raw.get('name') if isinstance(raw, dict) else raw or '').strip()
        if tag and len(tag) <= 80 and tag not in tags:
            tags.append(tag)
    for tag in tags[:40]:
        connection.execute('INSERT OR IGNORE INTO asset_tag(asset_id,tag,confidence,source) VALUES(?,?,?,?)',
                           (asset_id, tag, 0.9, TAG_SOURCE))
    return {'fields': list(result.written),
            'performers': performers, 'tags': len(tags)}


def cover_target(cover_root: Path, asset_id: int) -> Path:
    from .western_artwork import artwork_key
    return Path(cover_root) / f'{artwork_key(asset_id, None)}.jpg'


def install_scene_cover(cover_root: Path, asset_id: int, scene: dict, transport) -> bool:
    """这部作品还没有封面时装 ThePornDB 的剧照；已有封面原样保留。取图或安装失败抛 `TpdbError`。"""
    from .avatar_picker import PickerError, accept_image
    from .cover_artwork import install_cover
    target = cover_target(cover_root, asset_id)
    url = cover_url(scene)
    if target.exists() or not url:
        return False
    try:
        response = transport(HttpRequest('GET', url, {'Accept': 'image/*', 'User-Agent': USER_AGENT}),
                             TIMEOUT, COVER_MAX_BYTES)
    except Exception as error:  # noqa: BLE001 — 网络层什么都可能抛
        raise TpdbError(f'封面下载失败：{error}') from error
    if response is None or response.status != 200:
        raise TpdbError(f'封面下载失败：HTTP {getattr(response, "status", "无响应")}')
    try:
        inspected = accept_image(response.body)
        install_cover(target, target.stem, response.body, (inspected.width, inspected.height),
                      evidence={'provider': PROVIDER, 'source': TAG_SOURCE, 'source_url': url,
                                'scene_id': scene.get('id'), 'asset_id': asset_id})
    except (PickerError, OSError, ValueError) as error:
        raise TpdbError(f'封面安装失败：{error}') from error
    return True


# ---------------------------------------------------------------- 后台任务

class WesternScrapeJob:
    """一次只跑一轮；进度在内存里，结论落 `state/western-tpdb.json`，中断后再点开始会接着跑。"""

    def __init__(self):
        self._lock = threading.Lock()
        self._thread: threading.Thread | None = None
        self._cancel = threading.Event()
        self.status: dict = {'status': 'idle'}

    def snapshot(self) -> dict:
        with self._lock:
            return dict(self.status)

    def _set(self, **values) -> None:
        with self._lock:
            self.status.update(values)

    def cancel(self) -> None:
        self._cancel.set()

    def start(self, contract, *, retry_missing: bool = False, transport=None,
              secrets_root: Path = SECRETS_DIR, state_root: Path = STATE_DIR) -> dict:
        with self._lock:
            if self._thread is not None and self._thread.is_alive():
                raise ValueError('欧美资料刮削已经在运行')
            token = read_token(secrets_root)
            if not token:
                raise ValueError('还没有填写 ThePornDB 的 API Token')
            self._cancel.clear()
            self.status = {'status': 'running', 'checked': 0, 'total': 0, 'matched': 0, 'missing': 0,
                           'failed': 0, 'covers': 0, 'cover_failed': 0, 'cover_error': '',
                           'current': '', 'error': '',
                           'started_at': datetime.now(timezone.utc).isoformat()}
            self._thread = threading.Thread(
                target=self._run, name='western-tpdb', daemon=True,
                args=(contract, token, retry_missing, transport, state_root))
            self._thread.start()
            return dict(self.status)

    def _run(self, contract, token, retry_missing, transport, state_root) -> None:
        own_transport = transport is None
        transport = transport or HttpxTransport()
        state = None
        try:
            client = TpdbClient(token, transport)
            state = load_state(state_root)
            if retry_missing:
                state = {key: value for key, value in state.items() if value.get('status') == 'matched'}
            with contract.read_connection() as connection:
                pending = [item for item in candidates(connection) if str(item['id']) not in state]
            # 已匹配却没装上封面的，按记下的场景号补一次封面，不重新判定身份。
            uncovered = [int(key) for key, value in state.items()
                         if value.get('status') == 'matched' and value.get('scene_id')
                         and not cover_target(contract.cover_root, int(key)).exists()]
            self._set(total=len(pending) + len(uncovered))
            if not self._backfill_covers(contract, client, transport, state, uncovered, state_root):
                return
            offset = len(uncovered)
            for index, item in enumerate(pending, 1):
                if self._cancel.is_set():
                    self._set(status='cancelled')
                    return
                self._set(current=item.get('name') or '')
                now = datetime.now(timezone.utc).isoformat()
                try:
                    scene, how = lookup(client, item)
                except TpdbError as error:
                    if 'Token' in str(error) or '频繁' in str(error):
                        raise
                    state[str(item['id'])] = {'status': 'error', 'error': str(error), 'at': now}
                    self._bump('failed')
                    continue
                if scene is None:
                    state[str(item['id'])] = {'status': 'missing', 'at': now}
                    self._bump('missing')
                else:
                    with contract.write_transaction() as connection:
                        apply_scene(connection, int(item['id']), scene, now=now)
                    state[str(item['id'])] = {'status': 'matched', 'via': how, 'scene_id': scene.get('id'),
                                              'title': scene.get('title'), 'at': now}
                    self._cover(contract, int(item['id']), scene, transport, state)
                    contract.cache_bust()
                    self._bump('matched')
                self._set(checked=offset + index)
                if index % 10 == 0:
                    save_state(state, state_root)
            self._set(status='succeeded', current='')
        except Exception as error:  # noqa: BLE001 — 写进状态给页面看
            self._set(status='failed', error=str(error), current='')
        finally:
            if state is not None:
                try:
                    save_state(state, state_root)
                except OSError:
                    pass
            if own_transport and hasattr(transport, 'close'):
                transport.close()

    def _backfill_covers(self, contract, client, transport, state, uncovered, state_root) -> bool:
        """给已匹配、缺封面的作品补封面；被取消时返回 False。"""
        for index, asset_id in enumerate(uncovered, 1):
            if self._cancel.is_set():
                self._set(status='cancelled')
                return False
            record = state[str(asset_id)]
            self._set(current=f'补封面：{record.get("title") or asset_id}')
            try:
                scene = client.scene(record['scene_id'])
            except TpdbError as error:
                if 'Token' in str(error) or '频繁' in str(error):
                    raise
                record['cover_error'] = str(error)
                self._bump('cover_failed')
                scene = None
            if scene is not None:
                self._cover(contract, asset_id, scene, transport, state)
            self._set(checked=index)
        if uncovered:
            contract.cache_bust()
            save_state(state, state_root)
        return True

    def _cover(self, contract, asset_id: int, scene: dict, transport, state: dict) -> None:
        """装封面；失败记进这部作品的状态和本轮计数，资料照样算匹配。"""
        record = state.setdefault(str(asset_id), {})
        try:
            if install_scene_cover(contract.cover_root, asset_id, scene, transport):
                self._bump('covers')
            record.pop('cover_error', None)
        except TpdbError as error:
            record['cover_error'] = str(error)
            self._bump('cover_failed')
            self._set(cover_error=str(error))

    def _bump(self, key: str) -> None:
        with self._lock:
            self.status[key] = int(self.status.get(key) or 0) + 1


JOB = WesternScrapeJob()


def summary(contract, *, secrets_root: Path = SECRETS_DIR, state_root: Path = STATE_DIR) -> dict:
    state = load_state(state_root)
    with contract.read_connection() as connection:
        total = len(candidates(connection))
    counts = {'matched': 0, 'missing': 0, 'error': 0, 'no_cover': 0}
    for key, value in state.items():
        counts[value.get('status', 'error')] = counts.get(value.get('status', 'error'), 0) + 1
        if (value.get('status') == 'matched' and key.isdigit()
                and not cover_target(contract.cover_root, int(key)).exists()):
            counts['no_cover'] += 1
    return {'configured': bool(read_token(secrets_root)), 'candidates': total,
            'done': counts, 'job': JOB.snapshot()}
