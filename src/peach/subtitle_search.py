"""SubtitleCat 字幕搜索与单文件读取：按界面语言找字幕，中文界面找简繁中文，英文界面找英文。"""
from __future__ import annotations

import base64
import binascii
import re
from urllib.parse import unquote, urljoin, urlsplit

import httpx
from bs4 import BeautifulSoup

from . import subtitles
from .catalog_rules import code_query_variants, release_code_from_text, same_release_code
from .feeds import scan_code
from .user_messages import UserFacingError
from .user_agent import USER_AGENT

MAX_BYTES = 4 * 1024 * 1024
SITE = "https://www.subtitlecat.com"
PAGE_SIZE = 6
#: 界面语言 → SubtitleCat 文件名末尾的语言后缀与回给前端的语言标签（BCP 47），语言名由前端按界面语言显示。
TARGETS = {"zh": (("zh-CN", "zh-Hans"), ("zh-TW", "zh-Hant")), "en": (("en", "en"),)}


class SubtitleSearchError(UserFacingError, ValueError):
    """字幕搜索、读取与转换的报错；带 code，界面按语言显示。"""


class SubtitleLanguageError(SubtitleSearchError):
    """请求的字幕语言不在支持范围内；带 code，界面按语言显示。"""


def _url(value: str, suffix: str) -> str:
    try:
        url = urlsplit(urljoin(SITE + "/", value))
        valid = url.port in (None, 443)
    except ValueError as error:
        raise SubtitleSearchError("errors.subtitleSearch.urlUnsupported") from error
    path = unquote(url.path)
    if not valid or url.scheme != "https" or url.hostname != "www.subtitlecat.com" or url.username or url.password \
            or url.query or url.fragment or not re.fullmatch(r"/subs/\d+/[^/\\\x00-\x1f]+" + re.escape(suffix), path):
        raise SubtitleSearchError("errors.subtitleSearch.urlUnsupported")
    return url.geturl()


def _get(client: httpx.Client, url: str, *, suffix: str = "", params: dict | None = None) -> bytes:
    try:
        for _ in range(4):
            with client.stream("GET", url, params=params) as response:
                if response.is_redirect:
                    url = _url(str(response.url.join(response.headers.get("location", ""))), suffix)
                    params = None
                    continue
                response.raise_for_status()
                data = bytearray()
                for chunk in response.iter_bytes():
                    data.extend(chunk)
                    if len(data) > MAX_BYTES:
                        raise SubtitleSearchError("errors.subtitleSearch.responseTooLarge")
                return bytes(data)
    except httpx.HTTPError as error:
        raise SubtitleSearchError("errors.subtitleSearch.unreachable") from error
    raise SubtitleSearchError("errors.subtitleSearch.tooManyRedirects")


def _client() -> httpx.Client:
    from .peach_proxy import http_client
    return http_client(timeout=8, headers={"User-Agent": USER_AGENT})


def _id(url: str) -> str:
    return base64.urlsafe_b64encode(urlsplit(url).path.encode()).decode().rstrip("=")


def _detail(subtitle_id: str) -> str:
    if not re.fullmatch(r"[A-Za-z0-9_-]{1,1600}", subtitle_id):
        raise SubtitleSearchError("errors.subtitleSearch.idInvalid")
    try:
        path = base64.b64decode(subtitle_id + "=" * (-len(subtitle_id) % 4), altchars=b"-_", validate=True).decode()
    except (ValueError, UnicodeError, binascii.Error) as error:
        raise SubtitleSearchError("errors.subtitleSearch.idInvalid") from error
    return _url(path, ".html")


def _targets(language: str) -> tuple[tuple[str, str], ...]:
    if language not in TARGETS:
        raise SubtitleLanguageError("subtitles.unsupportedLanguage")
    return TARGETS[language]


def _files(client: httpx.Client, url: str, language: str) -> list[dict]:
    targets = _targets(language)
    page = BeautifulSoup(_get(client, url, suffix=".html"), "html.parser")
    rows = {}
    for link in page.select("a[href]"):
        href = str(link["href"])
        found = next(((suffix, tag) for suffix, tag in targets if href.endswith(f"-{suffix}.srt")), None)
        if found:
            try:
                download = _url(href, ".srt")
            except SubtitleSearchError:
                continue
            rows.setdefault(found[0], {"name": unquote(urlsplit(download).path.rsplit("/", 1)[-1]),
                                       "language": found[1], "url": download})
    return [dict(index=index, playable=True, **rows[suffix])
            for index, (suffix, _tag) in enumerate(targets) if suffix in rows]


def _matches(title: str, code: str) -> bool:
    if same_release_code(scan_code(title), code):
        return True
    for variant in code_query_variants(code):
        if not same_release_code(variant, code):
            continue
        pattern = r"(?<![A-Za-z0-9])" + re.escape(variant).replace(r"\-", r"[-_ ]?") + r"(?![A-Za-z0-9])"
        if any(same_release_code(match.group(), code) for match in re.finditer(pattern, title, re.I)):
            return True
    return False


def search(query: str, offset: int = 0, language: str = "zh") -> dict:
    _targets(language)
    query = query.strip()
    if not 3 <= len(query) <= 200 or not 0 <= offset < 60 or offset % PAGE_SIZE:
        raise SubtitleSearchError("errors.subtitleSearch.queryInvalid")
    code = release_code_from_text(query)
    query = code or query
    with _client() as client:
        page = BeautifulSoup(_get(client, SITE + "/index.php", params={"search": query}), "html.parser")
        table = page.select_one("table.sub-table")
        if table is None:
            raise SubtitleSearchError("errors.subtitleSearch.searchPageMissing")
        candidates = {}
        for link in table.select("a[href]"):
            title = link.get_text(" ", strip=True)
            if code and not _matches(title, code):
                continue
            try:
                url = _url(str(link["href"]), ".html")
            except SubtitleSearchError:
                continue
            candidates.setdefault(url, title)
        results = []
        for url, title in list(candidates.items())[offset:offset + PAGE_SIZE]:
            files = _files(client, url, language)
            if files:
                results.append({"id": _id(url), "title": title,
                                "languages": [row["language"] for row in files], "format": "SRT"})
    return {"results": results, "more": offset + PAGE_SIZE < min(len(candidates), 60), "source": "SubtitleCat"}


def files(subtitle_id: str, language: str = "zh") -> dict:
    with _client() as client:
        rows = _files(client, _detail(subtitle_id), language)
    return {"files": [{key: value for key, value in row.items() if key != "url"} for row in rows]}


def load(subtitle_id: str, index: int, language: str = "zh") -> str:
    with _client() as client:
        row = next((row for row in _files(client, _detail(subtitle_id), language) if row["index"] == index), None)
        if row is None:
            raise SubtitleSearchError("errors.subtitleSearch.fileMissing")
        return convert(_get(client, row["url"], suffix=".srt"), "srt")


def convert(data: bytes, fmt: str) -> str:
    if len(data) > MAX_BYTES:
        raise SubtitleSearchError("errors.subtitleSearch.fileTooLarge")
    if not data or not subtitles.is_playable_format(fmt):
        raise SubtitleSearchError("errors.subtitleSearch.formatUnsupported")
    text = subtitles.to_webvtt(data, fmt)
    if "-->" not in text:
        raise SubtitleSearchError("errors.subtitleSearch.noTimeline")
    return text
