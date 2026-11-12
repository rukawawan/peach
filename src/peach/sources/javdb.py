"""javdb 的作品页。

搜索页 `/search?q=<番号>&f=all` 的结果卡片带番号，只在对应唯一来源 ID 时进详情页；详情页
`?locale=zh` 下面板字段是 `番號`、`日期`、`片商`、`發行`、`系列`、`導演`、`演員`，
演员里女优带 `actor-female`，类别保留链接里的原词。它按出口 IP 计配额，限速与封禁的处理在 `scraping_access`
和调用方的主机间隔里，这里只管取页与解析。几家的值常有出入：ABW-358 在 javdb 上发行日期是
MGS 的 5/23、标题带 MGS 附注、演员里有男优，各字段按 Peach 的来源策略结算。
有隐藏 `origin-title` 时用作原标题，`current-title` 单独保存为显示标题；两者不互相改写。

一部分页面要登录才给，回的是登入页而不是 401/403（`peach.javdb.LOGIN`），搜索页与详情页都要认。

刮削不读详情页，走 `JavDBPublicSource` 的匿名接口（ADR-0144）：不带 Cookie，不占 javdb.com
的出口配额，字段投影成与详情页同形的记录。详情页解析留给视频预览。
"""
from __future__ import annotations

import dataclasses
import re
import time
import urllib.parse

from bs4 import BeautifulSoup

from ..catalog_rules import same_release_code
from ..javdb import LOGIN, clean
from ..javdb_genres import page_genres
from ..javdb_identity import RULE
from ..javdb_public import actor_gender, public_image_url
from .base import FailureReason, Page, Session, SiteConfig, SiteRecord, SiteSource, SourceFailure

#: 主机间隔由用户定（2026-09-22 定为 3 秒，每分钟 20 页）。参照面：每分钟 40～50 页会招来 3～7 天
#: 的封 IP。页面与图分别落在 `javdb.com` 与 `jdbstatic.com` 两个主机上，间隔要一起管。
JAVDB = SiteConfig(name="javdb", label="javdb", provider="javdb-page",
                   base_url="https://javdb.com", domains=("javdb.com", "jdbstatic.com", "jdbimgs.com"),
                   stage="community", interval=3.0, cookie=True)
#: 刮削那一问的配置。来源名、域名与 Cookie 仍是 `javdb` 这一站的（视频预览照旧读详情页，
#: 冷却按这个名字记）；解析器名另起，候选与账本证据分得清是哪一种取法。接口自己的间隔、冷却与
#: 请求预算在 `peach.javdb_public`，这一问不经会话的传输。
JAVDB_PUBLIC = dataclasses.replace(JAVDB, provider="javdb-api")
#: 一问的请求上限：签名常量两次（一天一次）、搜索、最多两份发行详情，再留两次换接口主机。
PUBLIC_REQUESTS = 7
#: 会话没有动作截止时刻时，一问最多等这么久。
PUBLIC_SECONDS = 90.0

_BOX = re.compile(r'<a href="(/v/[A-Za-z0-9]+)" class="box" title="[^"]*">.*?<strong>([^<]+)</strong>', re.S)
_PANEL = re.compile(r'<div class="panel-block[^"]*">\s*<strong>([^<:：]+)[:：]</strong>\s*(?:&nbsp;)?\s*'
                    r'<span class="value">(.*?)</span>', re.S)
#: 详情页那张封面。认标签、再从标签里取 `src`，不把属性挨着写死：站上 `class` 与 `src` 的先后
#: 两种写法都出现过，中间还可能夹着 `width`、`height` 与 `fetchpriority`。
_COVER = re.compile(r'<img\b[^>]*\bclass="video-cover"[^>]*>')
_IMG_SRC = re.compile(r'\bsrc="(https://[^"]+)"')
_ACTRESS = re.compile(r'<a\s([^>]*)>([^<]+)</a>')
#: 演員一栏里每个人名都挂着自己的资料页。那串 id 正是人物页 JavDB 入口要的东西，
#: 取名字时顺手带出来——另走一趟演员页只是把同一页再取一遍，而 javdb 的配额最紧。
_ACTOR_HREF = re.compile(r'href="/actors/([A-Za-z0-9]+)"')
_JAPANESE = re.compile(r"[぀-ヿ一-鿿]")


def actresses(value: str) -> list[dict]:
    """演員一栏里的女优：名字，以及她在 javdb 的演员 id。

    男优挂的是同样的 `/actors/` 链接，靠 `actor-female` 分开。href 与 class 在标签里的
    先后不固定，所以先取整段属性再判，不假设它们的次序。
    """
    found = []
    for attributes, name in _ACTRESS.findall(value):
        if "actor-female" not in attributes:
            continue
        actor = _ACTOR_HREF.search(attributes)
        found.append({"japanese_name": clean(name), "profile_source": "javdb",
                      "external_id": actor.group(1) if actor else ""})
    return found


def maker_writing(value: str) -> str:
    """片商一栏并列英文与日文（`PRESTIGE,プレステージ`），取日文那一种。"""
    parts = [part.strip() for part in value.split(",") if part.strip()]
    return next((part for part in parts if _JAPANESE.search(part)), parts[0] if parts else "")


class JavDBSource(SiteSource):
    DEFAULT = JAVDB

    def search_url(self, code: str) -> str:
        return f"{self.config.base_url}/search?q={urllib.parse.quote(code)}&f=all"

    def _page(self, url: str, *, session: Session) -> Page:
        page = session.get(url, config=self.config)
        if LOGIN.search(page.text):
            raise SourceFailure(FailureReason.AUTH_REQUIRED, "javdb 要求登录")
        return page

    def fetch(self, code: str, *, session: Session) -> Page:
        search = self._page(self.search_url(code), session=session)
        paths = list(dict.fromkeys(path for path, shown in _BOX.findall(search.text)
                                  if same_release_code(code, clean(shown))))
        if not paths:
            raise SourceFailure(FailureReason.NOT_FOUND, "javdb 没有这个番号")
        if len(paths) > 1:
            raise SourceFailure(FailureReason.PARSE_ERROR, "javdb 同番号对应多个作品，请核对来源身份：" + '、'.join(paths),
                                detail='identity_ambiguous')
        path = paths[0]
        detail = self._page(self.config.base_url + path + "?locale=zh", session=session)
        # `source_url` 记不带界面语言参数的详情页地址。
        return Page(self.config.base_url + path, detail.body)

    def parse(self, page: Page, code: str) -> SiteRecord:
        text = page.text
        panel = {clean(label): value for label, value in _PANEL.findall(text)}
        shown = clean(panel.get("番號", "")).replace(" ", "")
        if not same_release_code(code, shown):
            raise SourceFailure(FailureReason.PARSE_ERROR, "javdb 详情页的番号与搜索结果不一致")
        runtime = re.search(r"\d+", clean(panel.get("時長", "")))
        soup = BeautifulSoup(text, "html.parser")
        title = soup.select_one('strong.current-title')
        original = soup.select_one('.origin-title')
        display_title = clean(title.get_text(' ', strip=True)) if title else ''
        origin_title = clean(original.get_text(' ', strip=True)) if original else ''
        tag = _COVER.search(text)
        cover = _IMG_SRC.search(tag.group(0)) if tag else None
        genres = tuple(dict.fromkeys(
            clean(link.get_text(" ", strip=True))
            for link in BeautifulSoup(panel.get("類別", ""), "html.parser").find_all("a")
            if clean(link.get_text(" ", strip=True))))
        return SiteRecord(
            source=self.config.name, provenance=self.config.provider, code=shown, source_url=page.url,
            title=origin_title or display_title,
            performers=tuple(actresses(panel.get("演員", ""))),
            studio=maker_writing(clean(panel.get("片商", ""))), label=clean(panel.get("發行", "")),
            series=clean(panel.get("系列", "")), director=clean(panel.get("導演", "")),
            release_date=clean(panel.get("日期", "")), runtime=int(runtime.group()) if runtime else None,
            tags=genres,
            cover_urls=(cover.group(1),) if cover else (),
            extra={'origin_title': origin_title, 'display_title': display_title,
                   'source_id': urllib.parse.urlsplit(page.url).path.rsplit('/', 1)[-1], 'javdb_rule': RULE})


def public_record(movie: dict) -> SiteRecord:
    """匿名接口的作品资料，投影成与详情页同形的记录。

    `origin_title` 对应详情页隐藏的原题，`title` 是显示标题；女优按接口的明确性别字段认。
    FC2 作品（`type` 3）的 `maker_name` 是卖家：按 `peach.sources.fc2` 的约定记进只作证据的
    `label`，不进厂牌。类别按 id 换回详情页原词，有表外 id 时不给标签（`javdb_genres.page_genres`）。
    """
    movie_id = str(movie.get("id") or "")
    fc2 = movie.get("type") == 3
    maker = maker_writing(clean(str(movie.get("maker_name") or "")))
    origin = clean(str(movie.get("origin_title") or ""))
    display = clean(str(movie.get("title") or ""))
    duration = movie.get("duration")
    cover = movie.get("cover_url")
    performers = tuple(
        {"japanese_name": clean(str(actor.get("name"))), "profile_source": "javdb",
         "external_id": str(actor.get("id") or "")}
        for actor in movie.get("actors") or []
        if isinstance(actor, dict) and actor_gender(actor) == "female" and clean(str(actor.get("name") or "")))
    return SiteRecord(
        source=JAVDB_PUBLIC.name, provenance=JAVDB_PUBLIC.provider, code=clean(str(movie.get("number") or "")),
        source_url=f"{JAVDB.base_url}/v/{movie_id}", title=origin or display, performers=performers,
        studio="" if fc2 else maker,
        label=clean(str(movie.get("publisher_name") or "")) or (maker if fc2 else ""),
        series=clean(str(movie.get("series_name") or "")), director=clean(str(movie.get("director_name") or "")),
        release_date=clean(str(movie.get("release_date") or "")),
        runtime=duration if type(duration) is int and duration > 0 else None,
        tags=page_genres(movie), cover_urls=(cover,) if public_image_url(cover) else (),
        extra={"origin_title": origin, "display_title": display, "source_id": movie_id, "javdb_rule": RULE})


class JavDBPublicSource(JavDBSource):
    """刮削的 javdb 一问：匿名接口取资料，失败按缺失、歧义、冷却与未取得分档。

    接口的问题不写 `javdb` 的来源冷却：那份冷却管的是详情页那条路（视频预览），
    接口自己按 `PUBLIC_API` 的冷却停下，这里翻成 `SourcePaused`，本趟记作没轮到。
    """

    DEFAULT = JAVDB_PUBLIC

    def query(self, code: str, *, session: Session) -> SiteRecord:
        from ..javdb_public import (PUBLIC_API, PublicBudgetExceeded, PublicIdentityAmbiguous, PublicNotFound,
                                    PublicRequestBudget, PublicSourcePaused, PublicSourceUnavailable)
        from ..scraping_access import SourcePaused
        seconds = PUBLIC_SECONDS if session.deadline is None else session.deadline - time.monotonic()
        budget = PublicRequestBudget(max_requests=PUBLIC_REQUESTS, max_seconds=max(1.0, seconds))
        with self.holding(session):
            try:
                with PUBLIC_API.request_budget(budget):
                    movie = PUBLIC_API.movie(code)
            except PublicIdentityAmbiguous as error:
                raise SourceFailure(FailureReason.PARSE_ERROR, f"javdb {error}", detail="identity_ambiguous") from None
            except PublicNotFound:
                raise SourceFailure(FailureReason.NOT_FOUND, "javdb 没有这个番号") from None
            except PublicSourcePaused as error:
                raise SourcePaused(f"javdb：{error}") from None
            except PublicBudgetExceeded:
                raise SourceFailure(FailureReason.TIMEOUT, "javdb 作品资料在本次预算内未取得") from None
            except PublicSourceUnavailable as error:
                raise SourceFailure(FailureReason.NETWORK, f"javdb：{error}") from None
            return public_record(movie)


_COMMENT_LINK = re.compile(r"(?:magnet:\?[^\s<>\"']+|ed2k://\|file\|[^\r\n<>]+?\|/|https?://[^\s<>\"']+)", re.I)
_ED2K = re.compile(r"ed2k://\|file\|([^|]+)\|(\d+)\|([a-f0-9]{32})\|(?:[^\r\n]*?\|)?/", re.I)


def parse_comment_text(text: str, origin: str, date: str = "") -> list[dict]:
    """匿名评论正文里的磁链、ed2k 与网页链接；正文中的 URL 都不会被服务器追踪请求。"""
    return comment_resources(_COMMENT_LINK.findall(text), origin, date)


def comment_resources(links: list[str], origin: str, date: str) -> list[dict]:
    from ..downloads import parse_magnet

    found = []
    for uri in links:
        uri = uri.strip()
        item = {"id": "", "protocol": "url", "info_hash": "", "uri": uri,
                "name": uri, "size": "", "files": "", "date": date,
                "attributes": [], "source": "JavDB 评论", "source_url": origin, "origins": [origin]}
        if uri.lower().startswith('magnet:'):
            try:
                magnet = parse_magnet(uri)
            except ValueError:
                continue
            item.update(id="magnet:" + magnet.info_hash, protocol="magnet", info_hash=magnet.info_hash,
                        name=magnet.name or magnet.info_hash, uri=magnet.uri)
        elif uri.lower().startswith('ed2k:'):
            match = _ED2K.fullmatch(uri)
            if not match:
                continue
            name, size, digest = match.groups()
            item.update(id=f"ed2k:{digest.lower()}:{int(size)}", protocol="ed2k",
                        name=urllib.parse.unquote(name), size=f"{int(size):,} B")
        else:
            try:
                url = urllib.parse.urlsplit(uri)
                if url.scheme.lower() not in {'http', 'https'} or not url.hostname or url.username or url.password:
                    continue
                canonical = urllib.parse.urlunsplit((url.scheme.lower(), url.netloc.lower(), url.path or '/', url.query, url.fragment))
            except ValueError:
                continue
            item.update(id="url:" + canonical, uri=canonical)
        found.append(item)
    return merge_resources(found)


def merge_resources(items: list[dict]) -> list[dict]:
    """同一资源保留完整属性，并收集它在资源区和评论中的全部出处。"""
    unique: dict[str, dict] = {}
    for item in items:
        if item['id'] not in unique:
            unique[item['id']] = {**item, "origins": list(item['origins'])}
            continue
        current = unique[item['id']]
        current['origins'] = list(dict.fromkeys([*current['origins'], *item['origins']]))
        current['attributes'] = list(dict.fromkeys([*current['attributes'], *item['attributes']]))
        for key in ('size', 'files'):
            if not current[key]:
                current[key] = item[key]
    return list(unique.values())
