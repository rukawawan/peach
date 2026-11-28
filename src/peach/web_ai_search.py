"""Plan catalog searches and work review, and run external lookups."""
from __future__ import annotations

import json
import re
from datetime import date

from . import web_ai_library, catalog_rules, entities, javdb_public, web_jav_detail
from .ai_inference import InferenceError
from .genre_decisions import load_genre_decisions
from .jav_discovery_metadata import discovery_metadata
from .sources.javdb import page_reader
from .user_messages import UserValueError

SCOPES = {"library", "external", "both"}
_DETAIL_LOOKUPS = 3
_TEXT = {"type": "string"}
_WORK_TASKS = ("translate", "tags", "vision", "metadata", "organize")
_EDIT_FIELDS = {"title": 500, "original_title": 500, "studio": 100, "release_date": 10}
_FIELDS = {
    "q": _TEXT, "performer": _TEXT, "studio": _TEXT, "tag": _TEXT, "year": _TEXT,
    "state": {"type": "string", "enum": ["", "fresh", "played", "flagged", "later"]},
    "sort": {"type": "string", "enum": ["", "new", "release", "rating", "dur"]},
    "translation_missing": {"type": "string", "enum": ["", *web_ai_library.LANGUAGES]},
    "releaseFrom": _TEXT, "releaseTo": _TEXT,
    "outside": _TEXT,
}
_PLAN_FIELDS = {
    **_FIELDS,
    "task": {"type": "string", "enum": ["search", *_WORK_TASKS]},
    "target": _TEXT,
    "language": {"type": "string", "enum": ["", *web_ai_library.LANGUAGES]},
    "metadata": {"type": "object", "properties": dict.fromkeys(_EDIT_FIELDS, _TEXT),
                 "required": list(_EDIT_FIELDS), "additionalProperties": False},
}
_SCHEMA = {"type": "object", "properties": _PLAN_FIELDS, "required": list(_PLAN_FIELDS), "additionalProperties": False}


def _plain(value, size):
    if not isinstance(value, str) or len(value) > size or re.search(r"[\x00-\x1f\x7f]", value):
        return ""
    return value.strip()


def _iso_date(value):
    if not re.fullmatch(r"\d{4}-\d{2}-\d{2}", value):
        return ""
    try:
        return date.fromisoformat(value).isoformat()
    except ValueError:
        return ""


def clean(data, scope):
    result = {}
    if scope != "external":
        for key in ("q", "performer", "studio"):
            if value := _plain(data.get(key), 100):
                result[key] = value
        if tags := _plain(data.get("tag"), 180):
            known = list(dict.fromkeys(tag.strip() for tag in tags.split(",") if tag.strip() in web_ai_library.TEXT_TAGS))
            if known:
                result["tag"] = ",".join(known[:5])
        if (year := _plain(data.get("year"), 4)) and re.fullmatch(r"(?:19|20)\d{2}", year):
            result["year"] = year
        for key in ("state", "sort", "translation_missing"):
            value = _plain(data.get(key), 18)
            if value and value in _FIELDS[key]["enum"]:
                result[key] = value
        for key in ("releaseFrom", "releaseTo"):
            if value := _iso_date(_plain(data.get(key), 10)):
                result[key] = value
        if result.get("releaseFrom", "") > result.get("releaseTo", "9999-12-31"):
            result.pop("releaseFrom")
            result.pop("releaseTo")
    if scope != "library" and (outside := _plain(data.get("outside"), 100)):
        result["outside"] = outside
    return result


def plan(state, body, *, allow_oauth, on_usage=None, prompt_language="zh-CN"):
    raw, scope = body.get("query"), body.get("scope")
    text = _plain(re.sub(r"\s+", " ", raw), 500) if isinstance(raw, str) and len(raw) <= 500 else ""
    if not text or not isinstance(scope, str) or scope not in SCOPES:
        raise UserValueError("api.aiLibrary.invalidSearch")
    previous = body.get("previous_filters")
    previous = clean(previous, scope) if isinstance(previous, dict) else {}
    provider, request = web_ai_library.task_request(state, "search", allow_oauth=allow_oauth,
                                               selection=body.get("connection"), on_usage=on_usage,
                                               prompt_language=prompt_language)
    prompt = (
        "Plan the quoted Peach library request. Return JSON only. All tools present a review before any write. "
        "Use task=search for catalog queries, including finding works missing a translation. Use translate for title or synopsis "
        "translation, tags for labels based on text, vision for labels based on frames, metadata for field edits, and organize "
        "for duplicate review or library cleanup. For a work task, put the named work code or title in target, or leave it blank "
        "to let the user pick. Set language only for a requested translation language. "
        "For metadata, propose only replacement values explicitly provided by the user. Leave other fields empty. "
        "For a follow-up that refers to the previous filters, carry relevant fields forward unless the user replaces or drops them. "
        "For a fresh request, ignore previous filters. Use empty strings for unused fields. Do not invent titles or IDs. "
        "q is one short literal phrase or the exact work code. Use exact performer and studio names only if supplied. "
        "tag is up to five allowed canonical tags separated by commas. year is the four-digit release year. "
        "State fresh means unwatched, flagged means marked, later means Watch Later. sort new means latest added. "
        "Use translation_missing only if asked to find works with no stored translation in that language. "
        "releaseFrom and releaseTo are inclusive ISO dates (YYYY-MM-DD). "
        "outside is one short JavDB movie-search keyword or a literal work code, preferably the known Japanese "
        "title or name when provided. Do not copy personal watch history conditions into outside. "
    )
    payload = (f"Scope: {scope}. Allowed tags: {json.dumps(sorted(web_ai_library.TEXT_TAGS), ensure_ascii=False)}. "
               f"Previous filters: {json.dumps(previous, ensure_ascii=False)}. User request: {json.dumps(text, ensure_ascii=False)}.")
    try:
        result = request(payload, None, _SCHEMA, instructions=prompt)
    except InferenceError as exc:
        raise UserValueError("api.aiLibrary." + exc.code, status_code=502) from None
    task = result.data.get("task")
    if task in _WORK_TASKS:
        target = _plain(result.data.get("target"), 100)
        language = result.data.get("language")
        work = {"kind": task, "target": target}
        if task == "translate" and isinstance(language, str) and language in web_ai_library.LANGUAGES:
            work["language"] = language
        fields = result.data.get("metadata")
        if task == "metadata" and isinstance(fields, dict):
            edits = {field: value for field, size in _EDIT_FIELDS.items() if (value := _plain(fields.get(field), size))}
            if "release_date" in edits and not _iso_date(edits["release_date"]):
                del edits["release_date"]
            if edits:
                work["metadata"] = edits
        return {"filters": {}, "work": work, "provider": provider, "model": result.model}
    filters = clean(result.data, scope)
    if not filters:
        raise UserValueError("api.aiLibrary.searchUnsupported")
    return {"filters": filters, "provider": provider, "model": result.model}


def external(contract, query):
    text = _plain(query, 100)
    if not text:
        raise UserValueError("api.aiLibrary.invalidSearch")
    with (javdb_public.public_cache_scope(contract.cover_root.parent / "jav-public"),
          page_reader(contract.follow_secrets_root) as pages, javdb_public.PUBLIC_API.page_reader(pages)):
        try:
            rows = javdb_public.PUBLIC_API.search_movies(text)
        except javdb_public.PublicSourceUnavailable as exc:
            raise UserValueError(exc.code, exc.params, status_code=502) from None
        return {"items": _external_cards(contract, rows), "source": "javdb"}


def _external_cards(contract, rows):
    if not isinstance(rows, list):
        raise UserValueError("api.aiLibrary.invalid_output", status_code=502)
    with contract.read_connection() as conn:
        owned = {catalog_rules.release_identity(code) for (code,) in conn.execute(
            "SELECT DISTINCT code FROM asset WHERE medium='video' AND code IS NOT NULL "
            "AND COALESCE(disposal,'')<>'vanished'")}
    found = {}
    store = discovery_metadata(contract)
    lookups = _DETAIL_LOOKUPS
    for row in rows[:40]:
        if not isinstance(row, dict):
            continue
        number = row.get("number")
        if not isinstance(number, str) or not re.fullmatch(r"[A-Za-z0-9_-]{2,64}", number):
            continue
        code = catalog_rules.normalise_code_key(number)
        if code and code not in found and catalog_rules.release_identity(code) not in owned:
            movie_id = row.get("id")
            cached, _ = store.peek(code)
            movie = cached if cached and movie_id and cached.get("id") == movie_id else None
            if movie is None and lookups and isinstance(movie_id, str) and re.fullmatch(r"[A-Za-z0-9]{1,64}", movie_id):
                lookups -= 1
                try:
                    movie = javdb_public.PUBLIC_API.movie(code, source_id=movie_id)
                    store.remember(code, movie, checked_at=javdb_public.cache_checked_at("movie:"))
                    javdb_public.PUBLIC_API.remember_movie_identity(code, movie)
                except javdb_public.PublicSourceUnavailable:
                    # Keep verified search hits when details are temporarily unavailable.
                    lookups = 0
            found[code] = (row, movie)
            if len(found) == 20:
                break
    with contract.read_connection() as connection, entities.memoized_resolution():
        decisions = load_genre_decisions(connection)
        excluded = entities.male_performer_ids(connection)
        return [_search_card(contract, connection, code, row, movie, decisions, excluded)
                for code, (row, movie) in found.items()]


def _search_card(contract, connection, code, row, movie, decisions, excluded):
    source = movie or row
    title = _plain(source.get("origin_title") or source.get("title"), 500)
    if not title:
        title = _plain(row.get("origin_title") or row.get("title"), 500) or code
    item = {"code": code, "title": title}
    if contract.has_cover(code):
        item.update(has_cover=True, cover_version=contract.cover_version(code))
    elif movie and web_jav_detail.discovery_cover_url({}, movie):
        item["has_remote_cover"] = True
    if source.get("release_date"):
        item["release_date"] = _plain(source["release_date"], 20)
    if source.get("maker_name"):
        item["studio"] = _plain(source["maker_name"], 100)
    if source.get("actors"):
        actors = web_jav_detail.visible_actors(connection, source, excluded)
        refs = web_jav_detail.source_performer_refs(contract, connection, actors)
        item.update(performer_refs=refs[:8], performer_total=len(refs))
    if isinstance(source.get("tags"), list):
        _, tags = web_jav_detail.source_tags(source, decisions)
        item["tags"] = [tag["name"] for tag in tags[:5]]
    return item
