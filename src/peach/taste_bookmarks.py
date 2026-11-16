"""浏览器书签的私有快照、文件导入与口味证据。"""
from __future__ import annotations

import hashlib
import json
import sqlite3
import tempfile
from contextlib import closing
from datetime import UTC, datetime, timedelta
from pathlib import Path
from urllib.parse import urlsplit

from bs4 import BeautifulSoup

from .user_messages import UserValueError, message_fields


def _date(value, *, chromium=False, firefox=False) -> str:
    if not value:
        return ""
    try:
        seconds = float(value) / (1_000_000 if chromium or firefox else 1)
        moment = (datetime(1601, 1, 1, tzinfo=UTC) + timedelta(seconds=seconds)
                  if chromium else datetime.fromtimestamp(seconds, UTC))
        return moment.isoformat() if moment.year >= 1970 else ""
    except (ValueError, TypeError, OverflowError, OSError):
        return ""


def _rows(values):
    unique = {}
    for url, title, added_at in values:
        if not isinstance(url, str):
            continue
        try:
            parsed = urlsplit(url)
            if parsed.scheme not in {"http", "https"} or not parsed.hostname:
                continue
        except ValueError:
            continue
        unique.setdefault(url, (url, str(title or ""), added_at))
    return list(unique.values())


def read_bookmarks(path: Path, *, engine: str | None = None):
    """读取 Netscape HTML、Chromium JSON 或 Firefox 一致快照。"""
    if engine == "firefox":
        from .taste_history import _readonly_uri
        with closing(sqlite3.connect(_readonly_uri(path), uri=True)) as db:
            # 部分历史导出只含访问表，不含书签表。
            if not db.execute("SELECT 1 FROM sqlite_master WHERE name='moz_bookmarks'").fetchone():
                return []
            return _rows((url, title, _date(added, firefox=True)) for url, title, added in db.execute(
                "SELECT p.url,b.title,b.dateAdded FROM moz_bookmarks b "
                "JOIN moz_places p ON p.id=b.fk WHERE b.type=1"))
    if path.stat().st_size > 64 * 1024 * 1024:
        raise UserValueError("errors.tasteBookmarks.tooLarge")
    raw = path.read_bytes()
    if raw.lstrip(b"\xef\xbb\xbf \r\n\t").startswith(b"{"):
        payload = json.loads(raw)
        if not isinstance(payload, dict) or not isinstance(payload.get("roots"), dict):
            raise UserValueError("errors.tasteBookmarks.missingRoots")
        nodes = list(payload["roots"].values())
        values = []
        while nodes:
            node = nodes.pop()
            if not isinstance(node, dict):
                raise UserValueError("errors.tasteBookmarks.invalidNode")
            if node.get("type") == "url":
                values.append((node.get("url"), node.get("name"), _date(node.get("date_added"), chromium=True)))
            children = node.get("children", [])
            if not isinstance(children, list):
                raise UserValueError("errors.tasteBookmarks.invalidFolder")
            nodes.extend(reversed(children))
        return _rows(values)
    # 通用 HTML 解析交给项目已固定的 BeautifulSoup；不执行脚本或读取外链。
    try:
        markup = raw.decode("utf-8")
    except UnicodeDecodeError:
        markup = raw
    soup = BeautifulSoup(markup, "html.parser")
    from bs4 import Doctype
    if not any(isinstance(item, Doctype) and str(item).casefold() == "netscape-bookmark-file-1" for item in soup.contents):
        raise UserValueError("errors.tasteBookmarks.unsupportedFile")
    return _rows((link.get("href"), link.get_text(), _date(link.get("add_date")))
                 for link in soup.find_all("a", href=True))


def is_bookmark_export(path: Path) -> bool:
    if path.suffix.casefold() in {".html", ".htm"}:
        return True
    if path.suffix.casefold() in {".json", ""}:
        # 已上传的文件带摘要前缀，格式由内容决定。
        with path.open("rb") as handle:
            head = handle.read(4096)
        return b'"roots"' in head and head.lstrip(b"\xef\xbb\xbf \r\n\t").startswith(b"{")
    return False


#: 书签来源在私有历史库里的资料名后缀。它进了 `history_source.profile` 与来源键的哈希，换掉会把同一份书签
#: 拆成两个来源，所以存储里保持原值；返回给界面的结果另给 `kind`，由界面按语言写「书签」。
BOOKMARK_PROFILE_SUFFIX = " · 书签"


def refresh_bookmarks(sources, store_path: Path, *, host=None, progress=None, strict=False):
    from .taste_history import HistorySource, _consistent_copy, _open_history_store, _source_key, failure_row
    results = []
    for index, source in enumerate(sources):
        if progress:
            progress(stage="bookmarks", checked=index, total=len(sources),
                     **message_fields("jobMessage.tasteBookmarks.reading"))
        try:
            if source.engine == "firefox":
                with tempfile.TemporaryDirectory(prefix="peach-bookmarks-") as directory:
                    snapshot = Path(directory).resolve() / "places.sqlite"
                    _consistent_copy(source.path, snapshot)
                    rows = read_bookmarks(snapshot, engine="firefox")
            else:
                rows = read_bookmarks(source.path)
        except (OSError, ValueError, TypeError, sqlite3.DatabaseError, TimeoutError):
            if strict:
                raise UserValueError("errors.tasteBookmarks.unreadable") from None
            results.append({"browser": source.browser, "profile": source.profile, "kind": "bookmarks",
                            "bookmarks": 0, "added": 0, "status": "failed",
                            **failure_row("errors.tasteBookmarks.browserBookmarksNotRead")})
            continue
        with _open_history_store(store_path, host) as (store, resolved_host, now):
            from .taste_browsers import browser_snapshot_allowed
            if not browser_snapshot_allowed(store, source):
                continue
            tagged = HistorySource(source.browser, source.profile + BOOKMARK_PROFILE_SUFFIX, source.path)
            key = _source_key(tagged, resolved_host)
            path_hash = hashlib.sha256(str(source.path.resolve()).encode()).hexdigest()
            store.execute("INSERT INTO history_source VALUES(?,?,?,?,?,?,?) "
                          "ON CONFLICT(source_key) DO UPDATE SET last_seen_at=excluded.last_seen_at",
                          (key, tagged.browser, tagged.profile, resolved_host, path_hash, now, now))
            from .taste_browsers import bind_browser_snapshot
            bind_browser_snapshot(store, key, source)
            previous = {row[0] for row in store.execute("SELECT url FROM history_bookmark WHERE source_key=?", (key,))}
            # 书签是当前快照，来源中移除的条目不再贡献偏好。
            store.execute("DELETE FROM history_bookmark WHERE source_key=?", (key,))
            store.executemany("INSERT INTO history_bookmark(source_key,url,title,added_at) VALUES(?,?,?,?)",
                              ((key, url, title, added) for url, title, added in rows))
            store.commit()
            results.append({"browser": tagged.browser, "profile": source.profile, "kind": "bookmarks", "bookmarks": len(rows),
                            "added": sum(url not in previous for url, _, _ in rows)})
    return results


def bookmark_rows(store: sqlite3.Connection):
    """兼容尚未采集书签的私有历史库，读取不迁移。"""
    if not store.execute("SELECT 1 FROM sqlite_master WHERE name='history_bookmark'").fetchone():
        return []
    return list(store.execute("SELECT source_key,added_at,url,title FROM history_bookmark"))
