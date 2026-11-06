"""AVBase 的作品搜索页。

（2026-09-14 实测）`/works?q=<番号>` 是 Next.js 页，`__NEXT_DATA__` 里 `props.pageProps.works[]`
就是命中的作品，每部带 `work_id`、日文 `title`、`actors[]`，以及它在各家店铺的商品 `products[]`
（`source` 为 `fanza`、`duga` 等，各自给 `image_url`、`maker`、`label`、`series`、`date`、
`iteminfo.director`）。一次请求就够，不必再进作品页。商品里可能混着收录这段内容的合集
（素人系常见），合集的标题和番号都对不上本作，按这两条筛掉。

它不给时长，`runtime` 留空。拒绝访问时回的是 Cloudflare 验证页，状态码可能是 403，也可能是 200：
403 由 `SourceTransport` 整站冷却，200 的那张由 `parse` 认成 `cloudflare_challenge`，经 `holding()`
进同一份冷却记录（上限 `scraping_access.SOURCES['avbase']['blocked_pause']`）。

女优页 `/talents/<名字>`（2026-11-04 实测）也是 Next.js 页，`props.pageProps.talent` 是这位：`actors[]`
是站上归到她名下的全部名义，`meta.basic_info` 是社区编辑的资料。补女优资料后继拿它作 minnano-av 的
备援（ADR-0136），解析在 `talent_profile`；名字站上没有时回 404。
"""
from __future__ import annotations

import json
import re
import urllib.parse

from ..catalog_rules import same_release_code
from ..jav_cover_fetch import THUMBNAIL, is_cross_product_cover
from ..metadata import identifies_code
from .base import FailureReason, Page, Session, SiteConfig, SiteRecord, SiteSource, SourceFailure, challenge_page

#: 主机间隔用默认的 2 秒，不带 Cookie：免登录可读，拒绝访问由 Cloudflare 按出口 IP 判。
AVBASE = SiteConfig(name="avbase", label="AVBase", provider="avbase-search",
                    base_url="https://www.avbase.net", domains=("avbase.net",), stage="community")

#: 同一部作品在多家店铺上架时，资料先取 FANZA 那条：它与 r18.dev 同源，写法和账本最接近。
#: 店铺名用 AVBase 自己在 `products[].source` 里写的值（2026-09-16 实测 `fanza`、
#: `mgstage`、`duga`）；写错的名字不会报错，只是那家店排到末位。
PRODUCT_ORDER = ("fanza", "mgstage", "duga")
#: 页面结构对不上时的那一句。Cloudflare 验证页与站点改版都走这一句，细档分开记。
UNRECOGNISED = "AVBase 页面结构未识别，可能在验证访问"

_NEXT_DATA = re.compile(r'<script id="__NEXT_DATA__" type="application/json">(.*?)</script>', re.S)
_DATE = re.compile(r"^[A-Za-z]{3} ([A-Za-z]{3}) (\d{1,2}) (\d{4})")
_MONTHS = {name: index for index, name in enumerate(
    ("Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"), 1)}


def listing_date(raw: object) -> str:
    """`Fri May 26 2023 09:00:00 GMT+0900` 是日本时间，日期直接取字面。"""
    found = _DATE.match(str(raw or ""))
    if not found or found.group(1) not in _MONTHS:
        return ""
    return f"{found.group(3)}-{_MONTHS[found.group(1)]:02d}-{int(found.group(2)):02d}"


def _named(value: object) -> str:
    return str(value.get("name") or "").strip() if isinstance(value, dict) else ""


def own_products(code: str, work: dict) -> list[dict]:
    """本作自己的商品条目，按 `PRODUCT_ORDER` 排。

    商品号认得出这个番号的说了算，标题相等只是退路。AVBase 的作品标题取自名寄せ里的
    某一件商品，而那一件可能是收录本作的合集：259LUXU-1514 的作品标题就是 FANZA 合集
    `118sng013` 的『FIRST CLASS ファーストクラス File/006』，按标题相等收下它，片名、
    厂牌、系列和发行日就全成了那张合集的（正确的是 MGStage 那条『ラグジュTV 1485』，
    2021-11-19）。一件商品号都认不出时才比标题——DUGA 的 `prestige-6584` 这类自编号
    与番号无关，那时只有标题能认。
    """
    products = [product for product in work.get("products") or [] if isinstance(product, dict)]
    named = [product for product in products
             if identifies_code(code, {"content_id": product.get("product_id")})]
    if not named:
        title = str(work.get("title") or "").strip()
        named = [product for product in products
                 if str(product.get("title") or "").strip() == title]
    rank = {source: index for index, source in enumerate(PRODUCT_ORDER)}
    return sorted(named, key=lambda product: rank.get(product.get("source"), len(rank)))


def _covers(code: str, products: list[dict]) -> tuple[str, ...]:
    urls = (str(product.get("image_url") or "").strip() for product in products)
    return tuple(dict.fromkeys(url for url in urls if url.startswith("https://")
                               and not THUMBNAIL.search(url) and not is_cross_product_cover(code, url)))


class AVBaseSource(SiteSource):
    DEFAULT = AVBASE

    def search_url(self, code: str) -> str:
        return f"{self.config.base_url}/works?q={urllib.parse.quote(code)}"

    def work_url(self, work: dict) -> str:
        key = f"{work['prefix']}:{work['work_id']}" if work.get("prefix") else str(work.get("work_id"))
        return f"{self.config.base_url}/works/{urllib.parse.quote(key, safe=':')}"

    def fetch(self, code: str, *, session: Session) -> Page:
        return session.get(self.search_url(code), config=self.config)

    def parse(self, page: Page, code: str) -> SiteRecord:
        text = page.text
        found = _NEXT_DATA.search(text)
        try:
            props = json.loads(found.group(1))["props"]["pageProps"] if found else None
        except (ValueError, KeyError, TypeError):
            props = None
        if not isinstance(props, dict):
            reason = FailureReason.CLOUDFLARE_CHALLENGE if challenge_page(text) else FailureReason.PARSE_ERROR
            raise SourceFailure(reason, UNRECOGNISED)
        works = [work for work in props.get("works") or []
                 if isinstance(work, dict) and same_release_code(code, str(work.get("work_id") or ""))]
        if not works:
            raise SourceFailure(FailureReason.NOT_FOUND, "AVBase 没有这个番号")
        work = works[0]
        products = own_products(code, work)
        first = lambda pick: next((value for value in map(pick, products) if value), "")
        info = lambda key: lambda product: str((product.get("iteminfo") or {}).get(key) or "").strip()
        return SiteRecord(
            source=self.config.name, provenance=self.config.provider,
            code=str(work.get("work_id") or code), source_url=self.work_url(work),
            title=first(lambda product: str(product.get("title") or "").strip())
            or str(work.get("title") or "").strip(),
            performers=tuple({"japanese_name": _named(actor)} for actor in work.get("actors") or [] if _named(actor)),
            studio=first(lambda product: _named(product.get("maker"))),
            label=first(lambda product: _named(product.get("label"))),
            series=first(lambda product: _named(product.get("series"))),
            director=first(info("director")),
            release_date=listing_date(products[0].get("date") if products else work.get("min_date")),
            cover_urls=_covers(code, products))


# -- 女优页 ------------------------------------------------------------------

TALENT_PAGE = "https://www.avbase.net/talents/{name}"
_BLOOD_TYPES = frozenset({"A", "B", "O", "AB"})
_CUP = re.compile(r"[A-Z]{1,2}")
_FIRST_NUMBER = re.compile(r"\d+")


def talent_url(name: str) -> str:
    return TALENT_PAGE.format(name=urllib.parse.quote(name, safe=""))


def _page_props(html: str) -> dict | None:
    found = _NEXT_DATA.search(html or "")
    try:
        props = json.loads(found.group(1))["props"]["pageProps"] if found else None
    except (ValueError, KeyError, TypeError):
        return None
    return props if isinstance(props, dict) else None


def compact_talent_page(html: str) -> str:
    """只留女优页里解析会读到的那两项，再包回 `__NEXT_DATA__`；认不出的页原样交回。

    整页有 650～750 KB，多半是嵌在里面的作品表，补女优资料的页面缓存按人一页，整页存下来
    一千位就是六七百 MB。验证页、404 页没有 `talent`，原样交回，撞墙判定照常看得到它们。
    """
    props = _page_props(html)
    if props is None or not isinstance(props.get("talent"), dict):
        return html
    kept = {"talent": props["talent"],
            "talents": [{"id": item.get("id")} for item in props.get("talents") or []
                        if isinstance(item, dict)]}
    data = json.dumps({"props": {"pageProps": kept}}, ensure_ascii=False).replace("</", "<\\/")
    return f'<script id="__NEXT_DATA__" type="application/json">{data}</script>'


def _date(value: object) -> str | None:
    from datetime import date

    text = str(value or "").strip()
    try:
        return date.fromisoformat(text).isoformat() if len(text) == 10 else None
    except ValueError:
        return None


def _centimetres(value: object) -> int | None:
    """`159`、`159.5` 取整数部分；空串、`0` 与没有数字的都是没填。"""
    found = _FIRST_NUMBER.search(str(value or ""))
    return int(found.group()) or None if found else None


def _text(value: object) -> str | None:
    return value.strip() or None if isinstance(value, str) else None


def talent_profile(html: str) -> dict | None:
    """女优页上的资料，列与 `minnano_av.PROFILE_COLUMNS` 对齐；不是女优页返回 None。

    另有 `talent_id`、`names`（`actors[]` 的名义，加上 `primary` 里不在其中的那个）、`talents`
    （同名 talent 有几位）与 `raw`（`basic_info`、各名义的 FANZA 资料、SNS 原样）。

    资料只取 `meta.basic_info`。同一页 `actors[].meta.fanza` 另有一份官方资料，两份可以不一致
    （三上悠亜 B90/H 对 B84/F，FANZA 那份是旧值），不拿它补空格，只留在 `raw`。出道年、活动期、
    出道作、博客与官网站上没有，留空。`primary.image_url` 是 DMM `actjpgs` 的 125×125，不作头像。
    """
    props = _page_props(html)
    talent = props.get("talent") if props else None
    if not isinstance(talent, dict) or talent.get("id") is None:
        return None
    meta = talent.get("meta") if isinstance(talent.get("meta"), dict) else {}
    basic = meta.get("basic_info") if isinstance(meta.get("basic_info"), dict) else {}
    actors = [actor for actor in talent.get("actors") or [] if isinstance(actor, dict)]
    primary = talent.get("primary") if isinstance(talent.get("primary"), dict) else {}
    names = list(dict.fromkeys(name for name in map(_named, [*actors, primary]) if name))
    cup = str(basic.get("cup") or "").strip().upper()
    blood = str(basic.get("blood_type") or "").strip().upper()
    return {
        "talent_id": str(talent["id"]), "names": names, "talents": len(props.get("talents") or []),
        "kana": _text(primary.get("ruby")), "romaji": None,
        "birth_date": _date(basic.get("birthday")),
        "height_cm": _centimetres(basic.get("height")), "bust_cm": _centimetres(basic.get("bust")),
        "cup": cup if _CUP.fullmatch(cup) else None,
        "waist_cm": _centimetres(basic.get("waist")), "hip_cm": _centimetres(basic.get("hip")),
        "blood_type": blood if blood in _BLOOD_TYPES else None,
        "birthplace": _text(basic.get("prefectures")), "hobbies": _text(basic.get("hobby")),
        "debut_year": None, "active_until": None, "debut_title": None, "debut_date": None,
        "blog_url": None, "site_url": None, "tags": [],
        "raw": {"basic_info": basic, "sns": meta.get("sns") or [],
                "fanza": {_named(actor): actor["meta"].get("fanza") for actor in actors
                          if isinstance(actor.get("meta"), dict) and _named(actor)}},
    }
