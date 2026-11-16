"""顶栏搜索空着时那一栏推荐：五份本机读接口在服务端一次取齐。

页面挂上之后空闲时就要预取这一栏。分五个请求去打 `/api/items`、`/api/follow` 这些共用接口的话，
每开一页都多出一串和这一页无关的请求，和首页、标签页、关注页自己的取数挤在一起；合成一个
请求，预取只占一条，`/api/follow` 那份几百 KB、这一栏用不上的筛选项也不必下发。

每份照各自接口的口径原样取，前端照常拼成各组。某一份取不到只缺那一组，不拖垮整栏。
"""
from __future__ import annotations

import logging
import random

from . import web_entity, web_feeds, web_follow, web_jav_discovery
from .web_catalog import q_items

LOGGER = logging.getLogger(__name__)

#: 每组一次取一池，「换一批」在池里翻页。取二十条与取五条耗时相当。
POOL = 20
#: 作者名册有缓存，多取几位不加成本。
AUTHOR_POOL = 24
#: 关注页这一份里推荐栏用不上的键：筛选项与别名建议只有关注页自己画。
FOLLOW_UNUSED = ("facets", "author_facets", "suggestions", "alias_suggestions", "counts")
#: 推荐池复用多久（秒）。
RECOMMENDATION_TTL = 300


def _part(name, read):
    try:
        return read()
    except Exception:  # noqa: BLE001 - 一组取不到只缺那一组，原因记日志
        LOGGER.exception("Search suggestions group \"%s\" unavailable", name)
        return None


def _words(items: list[dict], jav: list[dict]) -> list[str]:
    """占位里轮换的推荐词：番号、女优与创作者名，都是馆藏搜索认得的词。关注作者的名字不在馆藏
    搜索里，不收。聚焦时页面另按当前筛选取一份核过命中的词池，这一份只管还没聚焦的那段时间。"""
    seen: list[str] = []
    for row in items:
        performers = row.get("performers") or []
        for value in (row.get("code"), performers[0] if performers else "", row.get("creator")):
            text = str(value or "").strip()
            if len(text) > 1 and text not in seen:
                seen.append(text)
    for row in jav:
        for ref in row.get("performer_refs") or []:
            text = str(ref.get("name") or "").strip()
            if len(text) > 1 and text not in seen:
                seen.append(text)
    return seen[:POOL]


def q_search_recommendations(contract, args) -> dict:
    """推荐池按 `RECOMMENDATION_TTL` 复用，每次请求在池里重新洗牌。

    每开一页都要预取这一栏，而凑齐一池要好几秒；后台任务频繁写账本时，每页都重算一遍会和页面
    自己的取数抢服务进程。推荐只是随手一翻的入口，晚几分钟换池无妨。
    """
    library = str(args.get("library") or "")
    pool = contract.cached_for(f"search-recommendations:{library}", lambda: _bundle(contract, library),
                               ttl=RECOMMENDATION_TTL)
    return _shuffled(pool)


def _shuffled(pool: dict) -> dict:
    """同一池换个顺序：「换一批」在池里翻页，打开时看到的第一页每次不同。缓存里那份不动。"""
    bundle = dict(pool)
    for key in ("items", "jav", "follow", "feeds", "authors"):
        part = bundle.get(key)
        if isinstance(part, dict) and isinstance(part.get("items"), list):
            bundle[key] = {**part, "items": random.sample(part["items"], len(part["items"]))}
    bundle["words"] = random.sample(pool["words"], len(pool["words"]))
    return bundle


def _bundle(contract, library: str) -> dict:
    items_args = {"sort": "rand", "limit": str(POOL), **({"library": library} if library else {})}
    items = _part("items", lambda: q_items(contract, items_args))
    jav = _part("jav", lambda: web_jav_discovery.q_jav_discoveries(
        contract, {"scope": "library", "limit": str(POOL)}))
    follow = _part("follow", lambda: web_follow.q_follow(
        contract, {"limit": str(POOL), "sort": "rand", "seed": str(random.getrandbits(31))}))
    if follow:
        follow = {key: value for key, value in follow.items() if key not in FOLLOW_UNUSED}
    feeds = _part("feeds", lambda: web_feeds.q_feed_discoveries(contract, {"limit": str(POOL)}))
    authors = _part("authors", lambda: web_follow.q_follow_authors(contract, {"limit": str(AUTHOR_POOL)}))
    ids = []
    for row in (jav or {}).get("items") or []:
        for ref in row.get("performer_refs") or []:
            if ref.get("id") and ref["id"] not in ids:
                ids.append(ref["id"])
    latest = _part("latest", lambda: web_entity.q_entity_latest(
        contract, {"ids": ",".join(str(value) for value in ids)}))
    return {"items": items, "jav": jav, "follow": follow, "feeds": feeds, "authors": authors,
            "latest": (latest or {}).get("items") or {},
            "words": _words((items or {}).get("items") or [], (jav or {}).get("items") or [])}
