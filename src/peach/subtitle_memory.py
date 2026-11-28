"""按视频保存播放偏好和字幕；文件锁和原子替换复用本机状态存储。"""
from __future__ import annotations

import hashlib
import json
import re
import time
from pathlib import Path

from filelock import FileLock

from .fsutil import atomic_write_bytes, atomic_write_text
from .user_messages import UserValueError

MAX_BYTES = 8 * 1024 * 1024
VIDEO_KEY = re.compile(r"(?:item:[1-9][0-9]*|follow:[1-9][0-9]*:(?:main|[0-9]+))")
COLORS = {"white", "yellow", "green", "cyan", "blue", "magenta", "red", "black"}
CAPTION_VALUES = {
    "font": {"sans", "mono", "serif", "mono-serif", "casual", "cursive", "small-caps"},
    "size": {"50", "75", "100", "150", "200", "300", "400"},
    "color": COLORS, "opacity": {"25", "50", "75", "100"},
    "background": COLORS, "backgroundOpacity": {"0", "25", "50", "75", "100"},
    "window": COLORS, "windowOpacity": {"0", "25", "50", "75", "100"},
    "edge": {"none", "raised", "depressed", "outline", "shadow"},
}
MAX_OFFSET_MS = 60_000
PREFERENCES = {"rotation", "rate", "caption_style", "position", "subtitle_offsets", "quality_pixels"}


def _validate_resume_position(position) -> None:
    if (not isinstance(position, dict) or set(position) != {"seconds", "updated_at"}
            or type(position["seconds"]) not in (int, float) or not 0 <= position["seconds"] <= 604800
            or type(position["updated_at"]) is not int
            or not 0 < position["updated_at"] <= int(time.time() * 1000) + 600_000):
        raise UserValueError("errors.subtitleMemory.invalidPosition")


def _track_details(track):
    if not isinstance(track, dict):
        raise UserValueError("errors.subtitleMemory.invalidTrack")
    key, name, text = (track.get(field) for field in ("key", "name", "text"))
    if (not isinstance(key, str) or not key or len(key) > 1024
            or not isinstance(name, str) or not name or len(name) > 512
            or not isinstance(text, str) or not text.startswith("WEBVTT")
            or len(text.encode("utf-8")) > MAX_BYTES):
        raise UserValueError("errors.subtitleMemory.invalidTrackContent")
    return key, name, text


def _validate_subtitle_offsets(offsets) -> None:
    if not isinstance(offsets, dict) or any(
        not isinstance(key, str) or not 0 < len(key) <= 1024
        or not key.startswith(("native:", "sidecar:", "file:", "subtitlecat:"))
        or type(offset) is not int or abs(offset) > MAX_OFFSET_MS
        for key, offset in offsets.items()
    ):
        raise UserValueError("errors.subtitleMemory.invalidOffsets")


def _validate_patch(patch: dict) -> None:
    """校验补丁字段与播放设置取值，字幕内容单独检查。"""
    if not isinstance(patch, dict) or not patch or patch.keys() - (PREFERENCES | {"selected", "track"}):
        raise UserValueError("errors.subtitleMemory.invalidFields")
    if "track" in patch and "selected" not in patch:
        raise UserValueError("errors.subtitleMemory.chooseSubtitle")
    if "rotation" in patch and (type(patch["rotation"]) is not int or patch["rotation"] not in (0, 90, 180, 270)):
        raise UserValueError("errors.subtitleMemory.invalidRotation")
    if "rate" in patch and (type(patch["rate"]) not in (int, float) or not .25 <= patch["rate"] <= 3):
        raise UserValueError("errors.subtitleMemory.invalidRate")
    if "quality_pixels" in patch and (type(patch["quality_pixels"]) is not int or not 0 <= patch["quality_pixels"] <= 16384):
        raise UserValueError("errors.subtitleMemory.invalidQuality")
    if "caption_style" in patch:
        style = patch["caption_style"]
        if not isinstance(style, dict) or any(
                key not in CAPTION_VALUES or not isinstance(value, str) or value not in CAPTION_VALUES[key]
                for key, value in style.items()):
            raise UserValueError("errors.subtitleMemory.invalidCaptionStyle")
    if "position" in patch:
        _validate_resume_position(patch["position"])
    if "subtitle_offsets" in patch:
        _validate_subtitle_offsets(patch["subtitle_offsets"])
    selected = patch.get("selected")
    if selected is not None and (not isinstance(selected, str) or len(selected) > 1024):
        raise UserValueError("errors.subtitleMemory.invalidSelection")


class SubtitleMemory:
    """偏好按视频隔离，字幕内容与播放设置共用一份原子提交的清单。"""

    def __init__(self, root: Path, video: str):
        if not VIDEO_KEY.fullmatch(video):
            raise UserValueError("errors.subtitleMemory.invalidVideoKey")
        self.root = root / video.replace(":", "-")
        self.manifest = self.root / "subtitles.json"

    def read(self) -> dict:
        if not self.manifest.exists():
            return {"selected": None, "tracks": [], "selection_explicit": False}
        value = json.loads(self.manifest.read_text(encoding="utf-8"))
        return {"selected": value["selected"], "tracks": value["tracks"],
                "selection_explicit": value.get("selection_explicit", True),
                **{key: value[key] for key in PREFERENCES if key in value}}

    def update(self, selected: str | None, track: dict | None = None) -> dict:
        return self.patch({"selected": selected, **({"track": track} if track is not None else {})})

    def patch(self, patch: dict) -> dict:
        _validate_patch(patch)
        selected, track = patch.get("selected"), patch.get("track")
        details = _track_details(track) if track is not None else None
        self.root.mkdir(parents=True, exist_ok=True)
        with FileLock(str(self.manifest) + ".lock"):
            value = self.read()
            if ("position" in patch and
                    patch["position"]["updated_at"] <= value.get("position", {}).get("updated_at", 0)):
                patch = {key: entry for key, entry in patch.items() if key != "position"}
                if not patch:
                    return value
            if selected is not None and not selected.startswith("native:") and not re.fullmatch(r"sidecar:(?:[1-9][0-9]*|local:[a-f0-9]{64})", selected) and not (
                    details is not None and selected == details[0]) and not any(
                    row["key"] == selected for row in value["tracks"]):
                raise UserValueError("errors.subtitleMemory.selectionNotSaved")
            if details is not None:
                key, name, text = details
                filename = hashlib.sha256(key.encode()).hexdigest() + ".vtt"
                atomic_write_bytes(self.root / filename, text.encode("utf-8"))
                value["tracks"] = [row for row in value["tracks"] if row["key"] != key]
                value["tracks"].append({"key": key, "name": name, "file": filename})
            if "selected" in patch:
                value["selected"] = selected
                value["selection_explicit"] = True
            for field in PREFERENCES & patch.keys():
                if field == "caption_style":
                    value[field] = {**value.get(field, {}), **patch[field]}
                elif field == "subtitle_offsets":
                    offsets = {**value.get(field, {}), **patch[field]}
                    value[field] = {key: offset for key, offset in offsets.items() if offset}
                else:
                    value[field] = patch[field]
            atomic_write_text(self.manifest, json.dumps(value, ensure_ascii=False))
            return value

    def track_path(self, filename: str) -> Path | None:
        if not re.fullmatch(r"[a-f0-9]{64}\.vtt", filename):
            return None
        if not any(row["file"] == filename for row in self.read()["tracks"]):
            return None
        path = self.root / filename
        return path if path.is_file() else None
