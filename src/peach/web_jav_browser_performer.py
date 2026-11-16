"""用户脚本的女优页订阅：认出这一页是哪位女优，查和改她的「订阅新作」。

订阅本身和人物页开关、订阅源页签是同一套（ADR-0083）：地址由服务端按她的 JavDB 演员 id 与
DMM 女优编号现拼，这里只负责从女优页认人。认人先看页面地址里的站内编号，再看名字：

- **JavDB 演员页** `/actors/<id>`：id 已在谁名下就是谁；没人持有时按页面上的名字认，
  认不出就新建她，再把这个 id 绑上（与「添加 JAV 订阅」勾选一张卡同一条路）。
- **DMM 女优片单** `?actress=<编号>` 或旧版 `article=actress/id=<编号>`：编号已在谁名下
  （`dmm`、`r18dev` 同一套编号）就是谁；没人持有时按页面名字认，页面没给名字就向 DMM
  问她的名字，认不出就新建并绑上编号。
- **MISSAV 女优页** `/actresses/<名字>`：只有名字。库里认得出、又已有编号的直接订；
  否则按名字到 JavDB 搜演员卡，只有名字对得上、又能确认是同一个人的那几张才登记并订，
  同名不止一位或搜不到时不猜，请用户到她的 JavDB 演员页订。
"""
from __future__ import annotations

import re
from urllib.parse import parse_qs, unquote, urlsplit

from . import entities, feeds, web_feeds
from .jav_browser import source_site
from .performer_profile_followup import bind
from .user_messages import UserValueError
from .web_jav_browser_people import entity_avatar

JAVDB_ACTOR = re.compile(r"^/actors/([A-Za-z0-9]{1,16})/?$")
DMM_ARTICLE = re.compile(r"/article=actress/id=([0-9]{1,12})/")
MISSAV_ACTRESS = re.compile(r"^/(?:dm[0-9]+/)?(?:(?:en|ja|zh|cn|tw|ko)/)?actresses/([^/]+)/?$")
DMM_ID = re.compile(r"^[0-9]{1,12}$")
NAME_LIMIT = 60
NAMES_LIMIT = 6


def _names(values) -> list[str]:
    """页面给的名字：JavDB 标题栏常把几种写法用逗号连成一串，MISSAV 写成「现名（旧名）」。"""
    found: list[str] = []
    for value in values or ():
        if not isinstance(value, str) or len(value) > 4 * NAME_LIMIT:
            raise UserValueError("api.javBrowserPerformer.invalidName")
        for part in re.split(r"[,，、]", value):
            base = re.sub(r"[（(][^（）()]*[）)]", "", part).strip()
            for name in (base, *(inner.strip() for inner in re.findall(r"[（(]([^（）()]+)[）)]", part))):
                if name and len(name) <= NAME_LIMIT and name not in found:
                    found.append(name)
    return found[:NAMES_LIMIT]


def performer_page(source_url: str, names=()) -> dict:
    """女优页地址 → 站点、站内编号与页面上的名字；不是支持的女优页时报 ValueError。"""
    try:
        parts = urlsplit(str(source_url or ""))
    except ValueError as error:
        raise UserValueError("api.javBrowserPerformer.invalidSourceUrl") from error
    host = (parts.hostname or "").lower()
    site = source_site(host) if parts.scheme == "https" and host else None
    page = {"site": site["id"] if site else "", "javdb": "", "dmm": "", "names": _names(names)}
    if page["site"] == "javdb" and (match := JAVDB_ACTOR.match(parts.path)):
        page["javdb"] = match.group(1)
    elif page["site"] == "dmm":
        actress = parse_qs(parts.query).get("actress", [""])[0] if parts.path.rstrip("/") == "/av/list" else ""
        article = DMM_ARTICLE.search(parts.path + "/")
        page["dmm"] = actress if DMM_ID.match(actress) else article.group(1) if article else ""
    elif page["site"] == "missav" and (match := MISSAV_ACTRESS.match(parts.path)):
        page["names"] = _names([unquote(match.group(1)), *page["names"]])
    if not (page["javdb"] or page["dmm"] or (page["site"] == "missav" and page["names"])):
        raise UserValueError("api.javBrowserPerformer.unsupportedPage")
    return page


def _holder(connection, providers: tuple[str, ...], external_id: str):
    marks = ",".join("?" * len(providers))
    return connection.execute(
        "SELECT e.id,e.canonical_name FROM entity_external_ref r JOIN entity e ON e.id=r.entity_id"
        f" WHERE r.provider IN ({marks}) AND r.external_kind='performer' AND r.external_id=?"
        " AND e.kind='performer' ORDER BY e.id LIMIT 1", (*providers, external_id)).fetchone()


def _resolve(connection, page: dict):
    """站内编号的持有者优先，其次按页面名字认正名或唯一别名。"""
    if page["javdb"] and (held := _holder(connection, ("javdb",), page["javdb"])):
        return held
    if page["dmm"] and (held := _holder(connection, tuple(feeds.DMM_ACTRESS_PROVIDERS), page["dmm"])):
        return held
    for name in page["names"]:
        if found := entities.resolve_entity(connection, "performer", name):
            return found
    return None


def performer_status(contract, preview, source_url: str, names=()) -> dict:
    """这一页是哪位、订没订着；库里认不出时只回页面上的名字。"""
    page = performer_page(source_url, names)
    with contract.database.read_connection() as connection:
        found = _resolve(connection, page)
        following = feeds.entity_following(connection, int(found["id"])) if found else False
    avatar = entity_avatar(contract, preview, int(found["id"])) if found else ""
    return {"ok": True, "site": page["site"],
            "name": str(found["canonical_name"]) if found else (page["names"] or [""])[0],
            "entity_id": int(found["id"]) if found else None,
            "following": following, **({"avatar": avatar} if avatar else {})}


def _dmm_name(contract, actress_id: str) -> str:
    """按编号向 DMM 问她的名字：走订阅拉片单的同一条请求、限流与冷却。"""
    from .sources.base import Session, SourceFailure
    from .sources.dmm import DmmSource

    site, session = DmmSource(), Session(web_feeds._transport(contract))
    try:
        with site.holding(session):
            return site.actress_works(actress_id, session=session, limit=1).name
    except SourceFailure as error:
        raise UserValueError("api.javBrowserPerformer.dmmLookupFailed", {"error": error.message}) from error
    except Exception as error:  # noqa: BLE001 - 断网、超时同样只是这一次没问到
        raise UserValueError("api.javBrowserPerformer.dmmLookupFailed", {"error": str(error)}) from error


def _follow_dmm(contract, page: dict) -> None:
    names = page["names"] or [name for name in (_dmm_name(contract, page["dmm"]),) if name]
    with contract.database.write_transaction() as connection:
        found = _resolve(connection, {**page, "names": names})
        if found is not None:
            entity_id, canonical = int(found["id"]), str(found["canonical_name"])
        elif names:
            canonical = entities.canonicalize_entity_name("performer", names[0])
            entity_id = web_feeds.create_followed_performer(connection, canonical)
        else:
            raise UserValueError("api.javBrowserPerformer.nameMissing")
        bind(connection, entity_id, "dmm", page["dmm"], {"source": web_feeds.FOLLOW_SOURCE})
        sources = web_feeds.subscribe_performer(connection, entity_id, canonical)
    web_feeds.fetch_new_sources(contract, sources)


def _follow_by_search(contract, page: dict, found) -> None:
    """只有名字的页：按名字到 JavDB 搜，名字对得上、又能确认是同一个人的卡才登记并订。"""
    names = list(dict.fromkeys([*([str(found["canonical_name"])] if found else []), *page["names"]]))
    for name in names:
        result = web_feeds.q_feed_lookup(contract, {"q": name})
        if result["suggested"]:
            web_feeds.w_feed_source(contract, {"action": "follow-name", "ids": result["suggested"],
                                               "name": str(found["canonical_name"]) if found else name})
            return
    raise UserValueError("api.javBrowserPerformer.javdbUnconfirmed", {"name": names[0]})


def follow_performer(contract, preview, body: dict) -> dict:
    """订阅或取消订阅这一页的女优，回订阅后的状态。"""
    enabled = body.get("enabled")
    if not isinstance(enabled, bool):
        raise UserValueError("api.javBrowserPerformer.invalidEnabled")
    names = body.get("names") if isinstance(body.get("names"), list) else []
    page = performer_page(body.get("source_url"), names)
    with contract.database.read_connection() as connection:
        found = _resolve(connection, page)
        ready = found is not None and web_feeds.subscribable(connection, found)
    if not enabled:
        if found is None:
            raise UserValueError("api.javBrowserPerformer.notInLibrary")
        web_feeds.w_feed_source(contract, {"action": "follow", "entity_id": int(found["id"]), "enabled": False})
    elif ready:
        web_feeds.w_feed_source(contract, {"action": "follow", "entity_id": int(found["id"]), "enabled": True})
    elif page["javdb"]:
        if not (found or page["names"]):
            raise UserValueError("api.javBrowserPerformer.nameMissing")
        web_feeds.w_feed_source(contract, {"action": "follow-name", "ids": [page["javdb"]],
                                           "name": str(found["canonical_name"]) if found else page["names"][0]})
    elif page["dmm"]:
        _follow_dmm(contract, page)
    else:
        _follow_by_search(contract, page, found)
    return performer_status(contract, preview, body.get("source_url"), names)
