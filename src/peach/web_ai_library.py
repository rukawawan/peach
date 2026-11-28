"""馆藏 AI 任务。推理返回待复核结果，确认走现有标签事务。"""
from __future__ import annotations

import hashlib
import io
import json
import logging
import re
import secrets
import sqlite3
from urllib.parse import urlsplit

from itsdangerous import BadData, URLSafeTimedSerializer
from PIL import Image, ImageOps

from . import (ai_credentials, ai_openai_oauth, ai_prompts, web_ai_timeline, ai_usage, catalog_rules, cover_artwork, genre_decisions,
               genre_taxonomy, sample_images, web_catalog)
from .ai_endpoints import normalize_base
from .ai_inference import (
    PROVIDERS, InferenceError, effort_choices, external_effort_choices, infer, list_models, valid_key, valid_model, verify_model,
)
from .jav_discovery_metadata import discovery_metadata
from .previews import PreviewUnavailable
from .user_messages import UserValueError

LANGUAGES = {"zh-TW": "Traditional Chinese (Taiwan)", "zh-CN": "Simplified Chinese (mainland China)", "en": "English"}
ASSET_TASKS = ("translate", "tags", "vision")
TASKS = (*ASSET_TASKS, "search")
_OPENAI_TASK_MODELS = {
    "translate": ("gpt-6-luna", "gpt-6.1-terra"),
    "tags": ("gpt-6-luna", "gpt-6.1-terra"),
    "vision": ("gpt-6.1-terra", "gpt-6.2-sol", "gpt-6-luna", "gpt-6.2-astra"),
    "search": ("gpt-6.2-sol", "gpt-6-luna", "gpt-6.1-terra"),
}
_SUGGESTED_MODELS = {
    "anthropic": {
        "translate": ("claude-haiku-5-5", "claude-sonnet-5-5"),
        "tags": ("claude-haiku-5-5", "claude-sonnet-5-5"),
        "vision": ("claude-sonnet-5-5", "claude-haiku-5-5", "claude-opus-5-5", "claude-fable-5-2"),
        "search": ("claude-sonnet-5-5", "claude-haiku-5-5", "claude-opus-5-5"),
    },
    "openai": _OPENAI_TASK_MODELS,
    "openai-oauth": _OPENAI_TASK_MODELS,
    "deepseek": {**dict.fromkeys(TASKS, ("deepseek-flash", "deepseek-v4-pro")), "vision": ("deepseek-flash",)},
}
_EFFORT_ORDER = {
    "translate": ("none", "low", "medium", "high", "xhigh", "max"),
    "tags": ("low", "none", "medium", "high", "xhigh", "max"),
    "vision": ("medium", "high", "low", "xhigh", "max"),
    "search": ("medium", "low", "high", "none", "xhigh", "max"),
}
# 按翻译、文本标签、画面标签、搜索给出 Peach 的建议。最终档位仍以模型的可用档位为准。
_MODEL_EFFORTS = {
    "gpt-5-mini": ("low", "low", "medium", "low"),
    "gpt-5.4-mini": ("none", "low", "medium", "low"),
    "gpt-5.6-luna": ("none", "low", "medium", "low"),
    "gpt-5.6-terra": ("low", "low", "medium", "medium"),
    "gpt-6-luna": ("none", "low", "medium", "low"),
    "gpt-6-sol": ("low", "low", "medium", "medium"),
    "gpt-6-astra": ("low", "medium", "high", "medium"),
    "gpt-6.1-terra": ("low", "low", "medium", "medium"),
    "gpt-6.1-sol": ("low", "low", "medium", "medium"),
    "gpt-6.2-sol": ("low", "low", "medium", "medium"),
    "gpt-6.2-astra": ("low", "medium", "high", "medium"),
    "claude-haiku-5-5": ("low", "low", "medium", "low"),
    "claude-sonnet-4-6": ("low", "low", "medium", "medium"),
    "claude-sonnet-5": ("low", "low", "medium", "medium"),
    "claude-sonnet-5-5": ("low", "low", "medium", "medium"),
    "claude-opus-4-6": ("low", "medium", "high", "medium"),
    "claude-opus-4-7": ("low", "medium", "high", "medium"),
    "claude-opus-4-8": ("low", "medium", "high", "medium"),
    "claude-opus-5": ("low", "medium", "high", "medium"),
    "claude-opus-5-5": ("low", "medium", "medium", "medium"),
    "claude-fable-5": ("low", "medium", "high", "medium"),
    "claude-fable-5-1": ("low", "medium", "high", "medium"),
    "claude-fable-5-2": ("low", "medium", "high", "medium"),
    "deepseek-flash": ("none", "low", "high", "low"),
    "deepseek-v4-pro": ("none", "low", "default", "high"),
}
VISUAL_TAGS = catalog_rules.APPEARANCE_TAGS | catalog_rules.POSITION_TAGS | catalog_rules.SCENE_TAGS
TEXT_TAGS = VISUAL_TAGS | catalog_rules.STORY_TAGS | catalog_rules.ROLE_TAGS | catalog_rules.RELATIONSHIP_TAGS
_CANDIDATES = URLSafeTimedSerializer(secrets.token_bytes(32), salt="asset-ai-review")
_LOGGER = logging.getLogger(__name__)
_CUSTOM_PROTOCOLS = ("openai", "anthropic")
_STRING = {"type": "string"}
_TRANSLATION_SCHEMA = {"type": "object", "properties": {"title": _STRING, "summary": _STRING},
                       "required": ["title", "summary"], "additionalProperties": False}
_TAGS_SCHEMA = {
    "type": "object", "required": ["tags"], "additionalProperties": False,
    "properties": {"tags": {"type": "array", "items": {
        "type": "object", "required": ["tag", "evidence"], "additionalProperties": False,
        "properties": {"tag": _STRING, "evidence": _STRING},
    }}},
}


def connections(state):
    store = ai_credentials.store_for(state)
    providers = []
    for name, spec in PROVIDERS.items():
        credential = store.load(name)
        values = credential.values if credential else {}
        model = values.get("model") or spec.default_model
        base = values.get("base_url", "")
        providers.append({"id": name, "label": spec.label, "model": model,
                          "host": urlsplit(spec.endpoint).hostname, "key_url": spec.key_url,
                          "base_url": base, "default_base_url": spec.base_url,
                          "configured": ai_credentials.is_configured(values),
                          **connection_choices(name, model, protocol=_effort_protocol(name, base))})
    for credential in _custom_connections(store):
        name, values = credential.provider, credential.values
        providers.append({"id": name, "label": values["label"], "model": values["model"], "custom": True,
                          "protocol": values["protocol"], "base_url": values["base_url"],
                          "manual_model": values.get("manual_model") == "true",
                          "configured": ai_credentials.is_configured(values),
                          **connection_choices(name, values["model"], protocol=values["protocol"])})
    return {"providers": providers, "task_profiles": task_profiles(state)}


def _effort_protocol(protocol: str, base: str) -> str:
    return protocol if base and protocol in _CUSTOM_PROTOCOLS else ""


def model_choices(provider: str, model: str, *, protocol: str = "", reported: list[str] | None = None) -> dict:
    choices = external_effort_choices(protocol) if protocol else effort_choices(provider, model)
    if reported is not None:
        choices = tuple(level for level in choices if level == "default" or level in reported)
    known = not protocol or reported is not None
    model_name = model.rsplit("/", 1)[-1] if protocol else model
    family = re.sub(r"-20[0-9]{2}-[0-9]{2}-[0-9]{2}$", "", model_name)
    preferred = dict(zip(TASKS, _MODEL_EFFORTS.get(family, ())))
    defaults = {
        task: next((level for level in (preferred.get(task), *levels) if known and level in choices), "default")
        for task, levels in _EFFORT_ORDER.items()
    }
    return {"efforts": choices, "effort_reported": known, "default_efforts": defaults}


def connection_choices(provider: str, model: str, *, protocol: str = "") -> dict:
    return {**model_choices(provider, model, protocol=protocol), "suggested_models": _SUGGESTED_MODELS.get(provider, {})}


def catalog_choices(provider: str, models: list[dict], *, protocol: str = "") -> list[dict]:
    rows = []
    visual_models = _SUGGESTED_MODELS.get(provider, {}).get("vision", ())
    for row in models:
        model = row["id"]
        result = {"id": model, "label": row["label"],
                  **model_choices(provider, model, protocol=protocol, reported=row.get("reasoning_levels"))}
        if "vision" in row:
            result["vision"] = row["vision"]
        elif model in visual_models:
            result["vision"] = True
        elif provider == "deepseek" and model == "deepseek-v4-pro":
            result["vision"] = False
        rows.append(result)
    return rows


def oauth_model_catalog(state):
    return {"models": catalog_choices("openai-oauth", ai_openai_oauth.models(state)["models"])}


def _task_profile(store, task):
    item = store.load("task-" + task)
    if not item:
        return {}
    values = item.values
    provider = values.get("provider")
    if provider in PROVIDERS or ai_credentials.is_custom(provider):
        record = store.load(provider)
        if not record or any(record.values.get(field, "") != values.get(field, "")
                             for field in ("base_url", "protocol")):
            return {}
    return {key: values[key] for key in ("provider", "model", "effort")}


def _known_provider(provider):
    return isinstance(provider, str) and (provider in _SUGGESTED_MODELS or ai_credentials.is_custom(provider))


def _custom_connections(store):
    records = [record for name in ai_credentials.custom_ids(store) if (record := store.load(name))]
    return sorted(records, key=lambda record: record.values["label"].casefold())


def task_profiles(state):
    store = ai_credentials.store_for(state)
    return {task: _task_profile(store, task) for task in TASKS}


def configure_task(state, body, *, allow_oauth: bool):
    task = body.get("task")
    if task not in TASKS:
        raise UserValueError("api.aiLibrary.invalid")
    store = ai_credentials.store_for(state)
    if body.get("remove") is True:
        store.clear("task-" + task)
        return {"task_profiles": task_profiles(state)}
    fields = validate_task_selection(state, body, allow_oauth=allow_oauth)
    store.save("task-" + task, fields)
    return {"task_profiles": task_profiles(state)}


def validate_task_selection(state, body, *, allow_oauth):
    store = ai_credentials.store_for(state)
    provider, model, effort = (body.get(name) for name in ("provider", "model", "effort"))
    if (not _known_provider(provider)
            or not isinstance(model, str) or not valid_model(model)
            or not isinstance(effort, str)):
        raise UserValueError("api.aiLibrary.invalid")
    values = {}
    if provider == "openai-oauth":
        available = allow_oauth and ai_openai_oauth.status(state)["configured"]
    else:
        record = store.load(provider)
        available = record and ai_credentials.is_configured(record.values)
        values = record.values if record else {}
    if not available:
        raise UserValueError("api.aiLibrary.unconfigured")
    protocol = _effort_protocol(values.get("protocol", provider), values.get("base_url", ""))
    choices = model_choices(provider, model, protocol=protocol)["efforts"]
    if effort not in choices:
        raise UserValueError("api.aiLibrary.invalid")
    fields = {"provider": provider, "model": model, "effort": effort}
    fields.update({field: values[field] for field in ("base_url", "protocol") if values.get(field)})
    return fields


def configure(state, body):
    name = _provider_name(body)
    store = ai_credentials.store_for(state)
    before = None if name == "custom" else store.revision(name)
    saved = _connection_record(store, name)
    if body.get("remove") is True:
        if name == "custom":
            raise UserValueError("api.aiLibrary.invalid")
        store.clear(name)
        return connections(state)
    model, key = _connection_input(body)
    protocol, base = _connection_target(name, body, saved, key)
    if not key and not (saved and ai_credentials.is_configured(saved.values)):
        raise UserValueError("api.aiLibrary.unconfigured")
    try:
        fields = ai_credentials.protected_fields(model, key) if key else {**saved.values, "model": model}
    except OSError:
        raise UserValueError("api.aiLibrary.auth") from None
    if base:
        fields["base_url"] = base
    if name not in PROVIDERS:
        label = body.get("label", saved.values.get("label", "") if saved else "")
        if (not isinstance(label, str) or not 1 <= len(label.strip()) <= 80
                or not label.strip().isprintable()):
            raise UserValueError("api.aiLibrary.customLabel")
        manual = body.get("manual_model", saved and saved.values.get("manual_model") == "true") is True
        fields.update(label=label.strip(), protocol=protocol, manual_model="true" if manual else "false")
        if name == "custom":
            name = "custom-" + secrets.token_hex(16)
    if not store.save_if_unchanged(name, fields, before):
        raise UserValueError("api.aiLibrary.changed", status_code=409)
    return connections(state)


def _provider_name(body):
    name = body.get("provider")
    if not isinstance(name, str) or (name not in PROVIDERS and name != "custom" and not ai_credentials.is_custom(name)):
        raise UserValueError("api.aiLibrary.invalid")
    return name


def _connection_record(store, provider):
    record = None if provider == "custom" else store.load(provider)
    if ai_credentials.is_custom(provider) and not record:
        raise UserValueError("api.aiLibrary.unconfigured")
    return record


def _key_input(body):
    key = body.get("api_key", "")
    if not isinstance(key, str) or (key.strip() and not valid_key(key.strip())):
        raise UserValueError("api.aiLibrary.invalid")
    return key.strip()


def _connection_input(body):
    model = body.get("model")
    if not isinstance(model, str) or not valid_model(model):
        raise UserValueError("api.aiLibrary.invalid")
    return model, _key_input(body)


def _connection_target(provider, body, saved, key):
    values = saved.values if saved else {}
    previous = values.get("base_url", "")
    external = provider not in PROVIDERS
    prior_protocol = values.get("protocol")
    protocol = body.get("protocol", prior_protocol) if external else provider
    if external and protocol not in _CUSTOM_PROTOCOLS:
        raise UserValueError("api.aiLibrary.invalid")
    raw = body.get("base_url", previous)
    port = body.get("port", "")
    if not isinstance(raw, str) or not isinstance(port, str):
        raise UserValueError("api.aiLibrary.endpoint")
    default = "" if external else PROVIDERS[provider].base_url
    try:
        base = normalize_base(raw.strip() or default, port.strip())
    except ValueError:
        raise UserValueError("api.aiLibrary.endpoint") from None
    base = "" if base == default else base
    if saved and (base != previous or (external and protocol != prior_protocol)) and not key:
        raise UserValueError("api.aiLibrary.endpointKey")
    return protocol, base


def _transport_options(provider, base):
    options = {"base_url": base} if base else {}
    if provider not in PROVIDERS:
        options["external"] = True
    return options


def _saved_key(credential):
    try:
        key = ai_credentials.read_key(credential.values) if credential else ""
    except (OSError, ValueError):
        raise UserValueError("api.aiLibrary.auth") from None
    if not key:
        raise UserValueError("api.aiLibrary.unconfigured")
    return key


def verify_connection(state, body):
    provider = _provider_name(body)
    model, key = _connection_input(body)
    saved = _connection_record(ai_credentials.store_for(state), provider)
    protocol, base = _connection_target(provider, body, saved, key)
    key = key or _saved_key(saved)
    try:
        model_id = verify_model(state.http_transport.client, protocol, model, key, **_transport_options(provider, base))
    except InferenceError as exc:
        raise UserValueError("api.aiLibrary." + exc.code, status_code=502) from None
    return {"model": model_id}


def connection_models(state, body):
    provider = _provider_name(body)
    key = _key_input(body)
    saved = _connection_record(ai_credentials.store_for(state), provider)
    protocol, base = _connection_target(provider, body, saved, key)
    if (saved and saved.values.get("manual_model") == "true"
            and not any(field in body for field in ("base_url", "port", "protocol")) and not key):
        model = saved.values["model"]
        return {"models": catalog_choices(provider, [{"id": model, "label": model}], protocol=protocol)}
    key = key or _saved_key(saved)
    try:
        models = list_models(state.http_transport.client, protocol, key, **_transport_options(provider, base))
        return {"models": catalog_choices(provider, models, protocol=_effort_protocol(protocol, base))}
    except InferenceError as exc:
        raise UserValueError("api.aiLibrary." + exc.code, status_code=502) from None


def _source(contract, asset_id):
    with contract.read_connection() as conn:
        item = conn.execute(
            "SELECT code, original_title, catalog_title, mutation_revision, duration, snapshot_path "
            "FROM asset WHERE id=? AND medium='video' AND disposal IS NULL", (asset_id,),
        ).fetchone()
        if item is None:
            raise UserValueError("api.aiLibrary.notFound", status_code=404)
        decisions = genre_decisions.load_genre_decisions(conn)
        visible = {row[0] for row in conn.execute("SELECT tag FROM asset_tag WHERE asset_id=?", (asset_id,))}
        hidden = {row[0] for row in conn.execute(
            "SELECT normalized_tag FROM asset_tag_preference WHERE asset_id=? AND hidden=1", (asset_id,)
        )}
    catalog_title = item["catalog_title"] or ""
    title = item["original_title"] or catalog_title
    source, _ = discovery_metadata(contract).peek(item["code"]) if item["code"] else (None, None)
    source = source or {}
    snapshots = _cached_sources(contract, item["code"])
    summary = source.get("summary") or next(
        (text for row in snapshots if isinstance(text := row.get("description"), str) and text.strip()), "",
    )
    summary = summary[:6000] if isinstance(summary, str) else ""
    genres = {}
    for row in [source, *snapshots]:
        terms = row.get("genres") or row.get("tags")
        if isinstance(terms, list):
            genres.update({term[:100]: None for term in terms[:100] if isinstance(term, str) and term.strip()})
    raw_genres = [term for term in list(genres)[:100]
                  if genre_taxonomy.resolve_genre(term, decisions) == genre_taxonomy.UNMAPPED]
    return item, {"title": title[:1000], "summary": summary, "genres": raw_genres}, visible | hidden


def _cached_sources(contract, code):
    key = catalog_rules.normalise_code_key(code)
    if not re.fullmatch(r"[A-Za-z0-9_-]{1,80}", key):
        return []
    snapshots = cover_artwork.metadata_snapshots(contract.follow_sources_root / "library-metadata", key)
    return [payload for _, payload in snapshots]


def _digest(record):
    payload = json.dumps([record["title"], record["summary"]], ensure_ascii=False)
    return hashlib.sha256(payload.encode()).hexdigest()


def detail(contract, asset_id):
    item, source, _ = _source(contract, asset_id)
    with contract.read_connection() as conn:
        rows = conn.execute(
            "SELECT language,title,summary,provider,model,quality FROM asset_content_translation "
            "WHERE asset_id=? AND source_digest=? ORDER BY language", (asset_id, _digest(source)),
        )
        return {"translations": [dict(row) for row in rows], "source_summary": source["summary"],
                "official_samples": len(sample_images.official_refs(conn, item["code"]))}


def _image(state, item, asset_id, image):
    if image == "cover":
        path = state.web_contract.cover_path(item["code"])
    elif type(image) is int and 0 <= image <= 8:
        try:
            path = state.preview_service.poster(asset_id, image)
        except PreviewUnavailable:
            path = None
    else:
        raise UserValueError("api.aiLibrary.invalid")
    if path is None:
        raise UserValueError("api.aiLibrary.noImage")
    try:
        with Image.open(path) as original:
            frame = ImageOps.exif_transpose(original)
            frame.thumbnail((1024, 1024), Image.Resampling.LANCZOS)
            result = io.BytesIO()
            frame.convert("RGB").save(result, "JPEG", quality=86)
            return result.getvalue()
    except (OSError, Image.DecompressionBombError):
        raise UserValueError("api.aiLibrary.noImage") from None


def _default_provider(state, store, allow_oauth):
    configured = {name: record.values for name in PROVIDERS if (record := store.load(name))
                  and ai_credentials.is_configured(record.values)}
    official = next((name for name, values in configured.items() if not values.get("base_url")), None)
    if official:
        return official
    if allow_oauth and ai_openai_oauth.status(state)["configured"]:
        return "openai-oauth"
    if configured:
        return next(iter(configured))
    return next((record.provider for record in _custom_connections(store)
                 if ai_credentials.is_configured(record.values)), None)


def _task_selection(selection):
    if not isinstance(selection, dict):
        raise UserValueError("api.aiLibrary.invalid")
    provider, model, effort = (selection.get(name) for name in ("provider", "model", "effort"))
    if (not _known_provider(provider)
            or not isinstance(model, str) or not valid_model(model)
            or not isinstance(effort, str)):
        raise UserValueError("api.aiLibrary.invalid")
    return provider, model, effort


def task_request(state, task, provider=None, *, allow_oauth=True, selection=None, on_usage=None, prompt_scope=None,
                 prompt_language="zh-CN", selection_target=None):
    if selection is not None:
        provider, model, effort = _task_selection(selection)
    store = ai_credentials.store_for(state)
    profile = _task_profile(store, task) if task in TASKS else {}
    if provider is None:
        provider = profile.get("provider") or _default_provider(state, store, allow_oauth)
    if provider is None:
        raise UserValueError("api.aiLibrary.unconfigured")
    if not _known_provider(provider):
        raise UserValueError("api.aiLibrary.invalid")
    oauth = provider == "openai-oauth"
    effort_protocol = ""
    if oauth:
        if not allow_oauth:
            raise UserValueError("api.configuration.openOnHost", status_code=403)
        status = ai_openai_oauth.status(state)
        if not status["configured"]:
            raise UserValueError("api.aiLibrary.unconfigured")
        connected_model = status["model"]
    else:
        connected = store.load(provider)
        if not connected:
            raise UserValueError("api.aiLibrary.unconfigured")
        connected_model = connected.values["model"] if ai_credentials.is_custom(provider) else (
            connected.values.get("model") or PROVIDERS[provider].default_model
        )
        protocol = connected.values.get("protocol", provider)
        base = connected.values.get("base_url", "")
        if selection_target is not None and any(
            connected.values.get(field, "") != selection_target.get(field, "") for field in ("base_url", "protocol")
        ):
            raise UserValueError("api.aiLibrary.customTaskConnection")
        effort_protocol = _effort_protocol(protocol, base)
        transport_options = _transport_options(provider, base)
        key = _saved_key(connected)
    if selection is None:
        if profile.get("provider") == provider:
            model, effort = profile["model"], profile["effort"]
        else:
            model = connected_model
            effort = model_choices(provider, model, protocol=effort_protocol)["default_efforts"].get(task, "default")
    elif effort not in model_choices(provider, model, protocol=effort_protocol)["efforts"]:
        raise UserValueError("api.aiLibrary.invalid")
    contract = state.web_contract

    def record_usage(served, usage):
        if on_usage is not None:
            on_usage(usage)
        try:
            ai_usage.record(contract.follow_state_root, provider, served, task, usage)
        except (OSError, sqlite3.Error):
            _LOGGER.exception("Could not record library AI usage")

    def request(payload, image, schema, *, instructions):
        system = ai_prompts.instructions(state, prompt_scope or task, instructions, prompt_language)
        options = {"system": system, "text": payload, "image": image, "effort": effort,
                   "schema": schema, "on_usage": record_usage}
        if oauth:
            return ai_openai_oauth.infer_oauth(state, model=model, **options)
        return infer(state.http_transport.client, protocol, model, key, **options, **transport_options)

    return provider, request


def _suggest_timeline(state, item, source, excluded, asset_id, mode, provider, request):
    contract = state.web_contract
    timeline = (web_ai_timeline.official_samples(contract, state.sample_cache, item["code"]) if mode == "official"
                else web_ai_timeline.read(contract, item, asset_id))
    if not timeline.frames:
        raise UserValueError("api.aiLibrary.noOfficialImages" if mode == "official" else "api.aiLibrary.noImage")
    excluded = {tag.casefold() for tag in excluded}
    allowed = {tag for tag in web_ai_timeline.allowed_tags() if tag.casefold() not in excluded}
    try:
        served, values = web_ai_timeline.analyze(timeline, allowed, request)
    except InferenceError as exc:
        raise UserValueError("api.aiLibrary." + exc.code, status_code=502) from None
    review = {"id": asset_id, "task": "vision", "source_digest": _digest(source), "language": None,
              "image": timeline.source, "provider": provider, "model": served,
              "revision": item["mutation_revision"], "tags": values["tags"]}
    return {**review, **values, "token": _CANDIDATES.dumps(review)}


def _tag_suggestions(result, task, source, allowed):
    values, seen = {"tags": []}, set()
    tags = result.data.get("tags")
    if not isinstance(tags, list):
        raise UserValueError("api.aiLibrary.invalid_output", status_code=502)
    for row in tags[:8]:
        if not isinstance(row, dict):
            continue
        tag, evidence = row.get("tag"), row.get("evidence")
        if (not isinstance(tag, str) or tag not in allowed or tag in seen
                or not isinstance(evidence, str) or not 1 <= len(evidence.strip()) <= 240):
            continue
        if task == "tags" and not any(evidence in text for text in (source["title"], source["summary"], *source["genres"])):
            continue
        values["tags"].append({"tag": tag, "evidence": evidence})
        seen.add(tag)
    return values


def suggest(state, asset_id, body, *, allow_oauth=True, prompt_language="zh-CN"):
    task = body.get("task")
    if task not in ASSET_TASKS:
        raise UserValueError("api.aiLibrary.invalid")
    mode = body.get("image")
    prompt_scope = mode if task == "vision" and mode in ("timeline", "official") else task
    provider, request = task_request(state, task, body.get("provider"), allow_oauth=allow_oauth,
                                     prompt_scope=prompt_scope, prompt_language=prompt_language)
    contract = state.web_contract
    item, source, excluded = _source(contract, asset_id)

    if task == "vision" and mode in ("timeline", "official"):
        return _suggest_timeline(state, item, source, excluded, asset_id, mode, provider, request)

    image, language, allowed = None, None, set()
    if task == "translate":
        language = body.get("language")
        if not isinstance(language, str) or language not in LANGUAGES or not (source["title"] or source["summary"]):
            raise UserValueError("api.aiLibrary.invalid")
        prompt = f"Translate only the original title and summary to {LANGUAGES[language]}. "
        prompt += 'Return JSON {"title":"...","summary":"..."}. Keep empty inputs empty and preserve identifiers.'
        payload = json.dumps({k: source[k] for k in ("title", "summary")}, ensure_ascii=False)
    else:
        excluded = {s.casefold() for s in excluded}
        allowed = {s for s in (VISUAL_TAGS if task == "vision" else TEXT_TAGS) if s.casefold() not in excluded}
        prompt = 'Return JSON {"tags":[{"tag":"exact term","evidence":"observable feature or exact source excerpt"}]}. '
        prompt += "Use only allowed terms with direct evidence. Output at most 8. Return an empty list when uncertain. "
        if task == "vision":
            image = _image(state, item, asset_id, body.get("image"))
            prompt += ("Use the frame alone. Classify posture, clothing and camera angle independently. "
                       "The same pose can appear from different angles. A camera angle does not prove a pose. "
                       "An overhead shot is not a first-person view. Separate glasses worn on the face from "
                       "background objects, and clothing actually worn from decorations or lettering. "
                       "Skip occluded features. Do not infer identity, age, consent or storyline.")
        else:
            prompt += "Copy evidence verbatim from a supplied title, synopsis or source genre. "
        payload = json.dumps({"source": source if task == "tags" else None, "allowed_tags": sorted(allowed)}, ensure_ascii=False)
    try:
        result = request(payload, image, _TRANSLATION_SCHEMA if task == "translate" else _TAGS_SCHEMA, instructions=prompt)
    except InferenceError as exc:
        raise UserValueError("api.aiLibrary." + exc.code, status_code=502) from None
    if task == "translate":
        values = {k: result.data.get(k) if source[k] else "" for k in ("title", "summary")}
        if any(not isinstance(v, str) or len(v) > 10000 or (source[k] and not v.strip()) for k, v in values.items()):
            raise UserValueError("api.aiLibrary.invalid_output", status_code=502)
    else:
        values = _tag_suggestions(result, task, source, allowed)
    evidence_image = body.get("image") if task == "vision" else None
    review = {"id": asset_id, "task": task, "source_digest": _digest(source), "language": language,
              "image": evidence_image,
              "provider": provider, "model": result.model, "revision": item["mutation_revision"], **values}
    return {**review, "token": _CANDIDATES.dumps(review)}


def _save_translation(conn, asset_id, review, source, edited):
    original = {field: review[field] for field in ("title", "summary")}
    values = edited if edited is not None else original
    if (not isinstance(values, dict) or set(values) != set(original)
            or any(not isinstance(v, str) or len(v) > 10000
                   or bool(v.strip()) != bool(source[k]) for k, v in values.items())):
        raise UserValueError("api.aiLibrary.invalid")
    quality = "human" if values != original else "machine"
    result = conn.execute(
        "INSERT INTO asset_content_translation(asset_id,language,title,summary,source_digest,provider,model,quality) "
        "VALUES(?,?,?,?,?,?,?,?) ON CONFLICT(asset_id,language) DO UPDATE SET "
        "title=excluded.title,summary=excluded.summary,source_digest=excluded.source_digest,"
        "provider=excluded.provider,model=excluded.model,quality=excluded.quality,updated_at=CURRENT_TIMESTAMP "
        "WHERE asset_content_translation.source_digest<>excluded.source_digest",
        (asset_id, review["language"], values["title"], values["summary"],
         review["source_digest"], review["provider"], review["model"], quality),
    )
    if not result.rowcount:
        raise UserValueError("api.aiLibrary.alreadySaved", status_code=409)


def approve(contract, asset_id, body):
    token = body.get("token")
    try:
        review = _CANDIDATES.loads(token, max_age=3600) if isinstance(token, str) and len(token) <= 32000 else {}
    except BadData:
        review = {}
    if review.get("id") != asset_id:
        raise UserValueError("api.aiLibrary.expired")
    _, source, existing = _source(contract, asset_id)
    if review["source_digest"] != _digest(source):
        raise UserValueError("api.aiLibrary.changed", status_code=409)
    with contract.write_transaction() as conn:
        row = conn.execute("SELECT mutation_revision FROM asset WHERE id=? AND disposal IS NULL", (asset_id,)).fetchone()
        if row is None or row[0] != review["revision"]:
            raise UserValueError("api.aiLibrary.changed", status_code=409)
        if review["task"] == "translate":
            _save_translation(conn, asset_id, review, source, body.get('translation'))
        else:
            selected, candidates = body.get("tags"), {v["tag"]: v for v in review["tags"]}
            if (not isinstance(selected, list) or not selected
                    or any(not isinstance(tag, str) or tag not in candidates for tag in selected)):
                raise UserValueError("api.aiLibrary.invalid")
            if any(tag in existing for tag in selected):
                raise UserValueError("api.aiLibrary.changed", status_code=409)
            for tag in dict.fromkeys(selected):
                candidate = candidates[tag]
                web_catalog.write_item_tag(conn, asset_id, "add", tag, ai_review={
                    "provider": review["provider"], "model": review["model"], "task": review["task"],
                    "evidence": candidate["evidence"], "image": review["image"],
                    **({"frames": candidate["frames"]} if "frames" in candidate else {}),
                })
    return {"ok": True}
