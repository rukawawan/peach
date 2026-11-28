"""实例级浏览与外观偏好的请求校验和合并。"""
from __future__ import annotations

import re

from .user_messages import UserValueError

_CHOICES = {
    "catalogView": {"cards", "list"},
    "followLayout": {"default", "table"},
    "photoLayout": {"fixed", "masonry"},
    "defaultSort": {"seed", "rating", "o", "plays", "dur", "size", "new", "played", "release"},
    "defaultSortDirection": {"", "asc", "desc"},
    "theme": {"system", "light", "dark"},
    "accent": set("red orange amber lime emerald teal sky blue indigo violet fuchsia rose".split()),
}
_SWITCHES = {"feedNewRows", "homeTiers", "homePreviewOnly", "autoChineseSubtitles"}
_BOUNDS = {"batchSize": (1, 200), "feedLimit": (1, 100), "followPageSize": (1, 200), "homeShortsLimit": (6, 60)}
_QUEUE_KEYS = {"junk-files": {"size", "new"}, "quality-goals": {"size", "dur", "new"}, "duplicates": {"size"}}
_MAPS = {"queueSort", "pageSizes"}
_GLOW_RANGES = {"strength": 100, "noise": 100, "speed": 300, "soften": 100, "size": 100}
_SPOTS = {"spot1", "spot2", "spot3"}
_ID = re.compile(r"[a-zA-Z0-9_-]{1,80}")
_COLOR = re.compile(r"#[0-9a-fA-F]{6}")


def _count(value, low, high):
    return type(value) is int and low <= value <= high


def _valid_glow(value):
    return (isinstance(value, dict) and set(value) == _GLOW_RANGES.keys() | _SPOTS | {"on", "preset"}
            and isinstance(value["on"], bool) and isinstance(value["preset"], str)
            and _ID.fullmatch(value["preset"]) is not None
            and all(_count(value[key], 0, maximum) for key, maximum in _GLOW_RANGES.items())
            and all(isinstance(value[key], dict) and set(value[key]) == {"color", "alpha"}
                    and isinstance(value[key]["color"], str) and _COLOR.fullmatch(value[key]["color"])
                    and _count(value[key]["alpha"], 0, 100) for key in _SPOTS))


def _valid_queue(page, value):
    return page in _QUEUE_KEYS and (value is None or (
        isinstance(value, dict) and set(value) == {"sort", "dir"}
        and isinstance(value["sort"], str) and value["sort"] in _QUEUE_KEYS[page]
        and isinstance(value["dir"], str) and value["dir"] in ("", "asc", "desc")))


def _valid(key, value):
    if key in _CHOICES:
        return isinstance(value, str) and value in _CHOICES[key]
    if key in _SWITCHES:
        return isinstance(value, bool)
    if key in _BOUNDS:
        return (key == "homeShortsLimit" and type(value) is int and value == 0) or _count(value, *_BOUNDS[key])
    if key == "queueSort":
        return isinstance(value, dict) and all(_valid_queue(page, choice) for page, choice in value.items())
    if key == "pageSizes":
        return isinstance(value, dict) and len(value) <= 128 and all(
            isinstance(table, str) and _ID.fullmatch(table) and _count(size, 1, 200) for table, size in value.items())
    if key == "recentTags":
        return isinstance(value, list) and len(value) <= 12 and all(
            isinstance(tag, str) and 0 < len(tag) <= 512 for tag in value)
    return key == "homeGlow" and _valid_glow(value)


def stored(raw):
    return {key: value for key, value in raw.items() if _valid(key, value)} if isinstance(raw, dict) else {}


def patch(raw):
    if not isinstance(raw, dict) or not raw:
        raise UserValueError("api.settings.browsePreferencesInvalid")
    legacy = raw.get("legacy", {})
    if (not isinstance(legacy, dict) or len(stored(legacy)) != len(legacy)
            or any(not _valid(key, value) for key, value in raw.items() if key != "legacy")):
        raise UserValueError("api.settings.browsePreferencesInvalid")
    return raw


def merge(current, changes):
    legacy = changes.get("legacy", {})
    current = stored(current)
    explicit = {key: value for key, value in changes.items() if key != "legacy"}
    result = {**legacy, **current, **explicit}
    for key in _MAPS & result.keys():
        result[key] = {**legacy.get(key, {}), **current.get(key, {}), **explicit.get(key, {})}
    if len(result.get("pageSizes", {})) > 128:
        raise UserValueError("api.settings.browsePreferencesInvalid")
    return result
