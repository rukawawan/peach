"""Select and review a bounded set of frames from existing playback previews."""
from __future__ import annotations

import io
import json
import time
from dataclasses import dataclass
from math import ceil

from PIL import Image, ImageDraw, ImageFont, ImageOps

from . import catalog_rules, sample_images, timeline_sheets, web_timeline_thumbnails
from .ai_inference import InferenceError
from .catalog_vocabulary import NON_VISUAL_APPEARANCE, VISION_SETTINGS, VISION_SINGLE_FRAME_TAGS
from .follow_faces import Signature

INITIAL_FRAMES = 18
MAX_FRAMES = 24
OFFICIAL_FRAMES = 12
_BATCH = 6
_SCAN_LIMIT = 720
_EXTERNAL_LIMIT = 120
_INTERACTION_WINDOW = 45
_TEMPORAL_TAGS = catalog_rules.POSITION_TAGS - VISION_SINGLE_FRAME_TAGS
_STRING = {"type": "string"}
_FRAME_LIST = {"type": "array", "items": {"type": "integer"}}


def _object(**properties):
    return {"type": "object", "properties": properties, "required": list(properties),
            "additionalProperties": False}


_SCHEMA = _object(
    tags={"type": "array", "items": _object(tag=_STRING, evidence=_STRING, frames=_FRAME_LIST)},
    poses={"type": "array", "items": _object(frame={"type": "integer"}, posture=_STRING, camera=_STRING)},
    needs_context=_FRAME_LIST,
)


@dataclass(frozen=True)
class Frame:
    number: int
    seconds: float | None
    jpeg: bytes
    signature: Signature
    quality: float


@dataclass(frozen=True)
class Timeline:
    source: str
    total: int
    frames: list[Frame]


def allowed_tags():
    return (catalog_rules.APPEARANCE_TAGS - NON_VISUAL_APPEARANCE) | catalog_rules.POSITION_TAGS | VISION_SETTINGS


def _indices(total, limit):
    if total <= limit:
        return range(total)
    return [round(index * (total - 1) / (limit - 1)) for index in range(limit)]


def _frame(index, seconds, image):
    image = ImageOps.exif_transpose(image).convert("RGB")
    image.thumbnail((384, 240), Image.Resampling.LANCZOS)
    gray = image.resize((48, 32), Image.Resampling.BOX).convert("L")
    low, high = gray.getextrema()
    if high < 22 or high - low < 10:
        return None
    pixels = bytes(gray.getdata())
    edge = sum(abs(pixels[i] - pixels[i - 48]) for i in range(48, len(pixels))) / (len(pixels) - 48)
    output = io.BytesIO()
    image.save(output, "JPEG", quality=89)
    return Frame(index + 1, seconds, output.getvalue(), Signature.of(image), min(1.0, edge / 20))


def _tiles(image, count, columns, rows, start=0, interval=0, offset=0, limit=None):
    for slot in range(count):
        index = start + slot
        if limit is not None and index not in limit:
            continue
        col, row = slot % columns, slot // columns
        box = (image.width * col // columns, image.height * row // rows,
               image.width * (col + 1) // columns, image.height * (row + 1) // rows)
        if (frame := _frame(index, offset + index * interval if interval else None, image.crop(box))) is not None:
            yield frame


def read(contract, item, asset_id):
    """Use the same source preference as the seek previews, with no video decoding."""
    external = web_timeline_thumbnails.external_timeline(contract, asset_id)
    if external is not None:
        frames = []
        deadline = time.monotonic() + 25
        for index in _indices(len(external.frames), _EXTERNAL_LIMIT):
            if time.monotonic() >= deadline:
                break
            data = web_timeline_thumbnails.external_frame(contract, external, index)
            if not data:
                continue
            try:
                with Image.open(io.BytesIO(data)) as image:
                    frame = _frame(index, external.frames[index].start, image)
            except (OSError, ValueError, Image.DecompressionBombError):
                continue
            if frame is not None:
                frames.append(frame)
        if len(frames) >= 2:
            return Timeline(external.source, len(external.frames), frames)

    meta = timeline_sheets.read_meta(contract.timeline_root, asset_id)
    if meta and not meta.get("invalidated_by"):
        total, interval = int(meta.get("frames") or 0), int(meta.get("interval") or 0)
        columns, rows = timeline_sheets.COLUMNS, timeline_sheets.ROWS
        per = columns * rows
        sampled = set(_indices(total, _SCAN_LIMIT))
        frames = []
        if interval > 0:
            pages = sorted({index // per for index in sampled})
            for page in pages:
                try:
                    with Image.open(timeline_sheets.sheet_path(contract.timeline_root, asset_id, page)) as image:
                        count = min(total - page * per, per)
                        frames.extend(_tiles(image, count, columns, ceil(count / columns), page * per,
                                             interval, max(0, item["duration"] or 0) * timeline_sheets.EDGE_MARGIN,
                                             sampled))
                except (OSError, ValueError, Image.DecompressionBombError):
                    continue
        if len(frames) >= 2:
            return Timeline("peach", total, frames)

    snapshot = contract.snapshot_file(item["snapshot_path"])
    if (snapshot is not None and contract.snapshot_root is not None
            and snapshot.resolve().is_relative_to(contract.snapshot_root.resolve())):
        try:
            with Image.open(snapshot) as image:
                frames = list(_tiles(image, 9, 3, 3))
            if frames:
                return Timeline("snapshot", 9, frames)
        except (OSError, ValueError, Image.DecompressionBombError):
            pass
    return Timeline("none", 0, [])


def official_samples(contract, cache, code):
    """Use publisher stills with image numbers and no video timing claims."""
    with contract.read_connection() as conn:
        refs = sample_images.official_refs(conn, code)
    frames = []
    download = sample_images.downloader(contract.follow_secrets_root)
    deadline = time.monotonic() + 25
    for index in _indices(len(refs), OFFICIAL_FRAMES):
        number, url = refs[index]
        path = cache.cached(code, number, thumb=True) or cache.cached(code, number, thumb=False)
        if path is None and time.monotonic() < deadline:
            path = cache.fetch(code, number, url, download, thumb=True)
        if path is None:
            continue
        try:
            with Image.open(path) as image:
                frame = _frame(number - 1, None, image)
        except (OSError, ValueError, Image.DecompressionBombError):
            continue
        if frame is not None:
            frames.append(frame)
    return Timeline("official", len(refs), frames)


def _distance(one, other):
    parity, color = one.signature.distances(other.signature)
    return parity / 64 * .60 + min(color / 100, 1) * .40


def _duplicate(one, other):
    parity, color = one.signature.distances(other.signature)
    return parity <= 3 and color <= 6


def select(frames, limit=INITIAL_FRAMES):
    if not frames:
        return []
    selected = []
    # Seed multiple regions before allocating the remaining budget to visual changes.
    regions = min(9, len(frames), limit)
    changes = [_distance(previous, frame) if previous else 0
               for previous, frame in zip([None, *frames[:-1]], frames)]
    extent = frames[-1].number - frames[0].number + 1
    for region in range(regions):
        candidates = [(frame, change) for frame, change in zip(frames, changes)
                      if (frame.number - frames[0].number) * regions // extent == region]
        for frame, _ in sorted(candidates, key=lambda pair: pair[0].quality + pair[1] * .6, reverse=True):
            if not any(_duplicate(frame, previous) for previous in selected):
                selected.append(frame)
                break
    candidates = [(frame, change, min(_distance(frame, previous) for previous in selected))
                  for frame, change in zip(frames, changes)
                  if not any(_duplicate(frame, previous) for previous in selected)]
    while candidates and len(selected) < limit:
        picked, _, _ = max(candidates, key=lambda row: row[2] + .35 * row[1] + .15 * row[0].quality)
        selected.append(picked)
        candidates = [(frame, change, min(nearest, _distance(frame, picked))) for frame, change, nearest in candidates
                      if not _duplicate(frame, picked)]
    return sorted(selected, key=lambda frame: frame.number)


def _neighbor_groups(timeline, anchors, initial):
    frames = {frame.number: frame for frame in timeline.frames}
    unused = set(frames) - {frame.number for frame in initial}
    groups = []
    for number in dict.fromkeys(anchors):
        anchor = frames[number]
        if anchor.seconds is None:
            continue
        nearby = [frame for frame in timeline.frames if frame.number in unused and frame.seconds is not None
                  and 0 < abs(frame.seconds - anchor.seconds) <= 35 and not _duplicate(frame, anchor)]
        before = max((frame for frame in nearby if frame.seconds < anchor.seconds),
                     key=lambda frame: frame.seconds, default=None)
        after = min((frame for frame in nearby if frame.seconds > anchor.seconds),
                    key=lambda frame: frame.seconds, default=None)
        group = [frame for frame in (before, anchor, after) if frame is not None]
        if len(group) >= 2:
            groups.append(group)
            unused.difference_update(frame.number for frame in group)
            if len(groups) == 2:
                break
    return groups


def _sheet(frames):
    width, height = 384, 270
    image = Image.new("RGB", (3 * width, ceil(len(frames) / 3) * height), "#151515")
    draw = ImageDraw.Draw(image)
    font = ImageFont.load_default(size=20)
    for index, frame in enumerate(frames):
        x, y = index % 3 * width, index // 3 * height
        with Image.open(io.BytesIO(frame.jpeg)) as thumbnail:
            image.paste(thumbnail, (x + (width - thumbnail.width) // 2, y + (240 - thumbnail.height) // 2))
        draw.text((x + 10, y + 242), f"#{frame.number}", font=font, fill="white")
    output = io.BytesIO()
    image.save(output, "JPEG", quality=86)
    return output.getvalue()


def _evidence(frame):
    return {"frame": frame.number, "seconds": frame.seconds}


def _text(value):
    return value.strip()[:240] if isinstance(value, str) else ""


def _record_poses(rows, by_number, poses):
    for row in rows[:_BATCH]:
        if not isinstance(row, dict) or type(number := row.get("frame")) is not int or number not in by_number:
            continue
        posture, camera = _text(row.get("posture")), _text(row.get("camera"))
        if posture or camera:
            poses[number] = {**_evidence(by_number[number]), "posture": posture, "camera": camera}


def _record_tags(rows, allowed, by_number, scopes, tags, anchors):
    for row in rows[:8]:
        if not isinstance(row, dict) or not isinstance(tag := row.get("tag"), str) or tag not in allowed:
            continue
        evidence, numbers = _text(row.get("evidence")), row.get("frames")
        if not evidence or not isinstance(numbers, list):
            continue
        numbers = list(dict.fromkeys(n for n in numbers[:_BATCH] if type(n) is int and n in by_number))
        if not numbers:
            continue
        if tag in _TEMPORAL_TAGS:
            relevant = [sorted((by_number[n] for n in numbers if n in group and by_number[n].seconds is not None),
                               key=lambda frame: frame.seconds) for group in scopes]
            pair = next(((a.number, b.number) for group in relevant for a, b in zip(group, group[1:])
                         if b.seconds - a.seconds <= _INTERACTION_WINDOW), None)
            if pair is None:
                anchors.extend(numbers[:1])
                continue
            numbers = list(pair)
        if tag not in tags or (len(numbers) > len(tags[tag]["frames"])):
            tags[tag] = {"tag": tag, "evidence": evidence, "frames": [_evidence(by_number[n]) for n in numbers[:3]]}


def analyze(timeline, allowed, request):
    """Analyze diverse thumbnails, then spend any additional calls on nearby evidence."""
    initial = select(timeline.frames)
    if not initial:
        raise InferenceError("noImage")
    batches = [[initial[start:start + _BATCH]] for start in range(0, len(initial), _BATCH)]
    tags, poses, analyzed = {}, {}, set()
    anchors = []
    served_model = None
    sent, interrupted = 0, None

    def run(groups):
        nonlocal sent, served_model
        frames = [frame for group in groups for frame in group]
        by_number = {frame.number: frame for frame in frames}
        scopes = [[frame.number for frame in group] for group in groups]
        prompt = (
            "Review the numbered video previews for media cataloging. Use the catalog tag exactly as listed. "
            "Treat posture, body orientation, clothing and camera angle independently. "
            "For visible posture describe standing, sitting, kneeling, lying or crouching, torso orientation, "
            "support and the relative arrangement of clearly visible people. Keep posture observations separate "
            "from tag claims about a pose or an interaction. A change of camera angle "
            "does not prove the posture changed. Overhead alone does not imply a first-person camera. "
            "Distinguish visible objects from their use. Do not infer identity, age, consent, or plot. "
            "Record brief posture and viewpoint observations for clear frames. "
            "For an interaction or change use multiple close frames within the same listed group; "
            "give needs_context frame numbers for unclear but useful visual evidence. "
            "Skip uncertain tags, use only supplied frame numbers and return at most 8 tags. "
            "Keep evidence in concise Chinese when labels are Chinese."
        )
        if timeline.source == "official":
            prompt += " These are publisher promotional stills with no timeline. Do not infer sequence, timing, or interactions."
        sent += len(frames)
        payload = f"Frame groups: {json.dumps(scopes)}. Allowed tags: {json.dumps(sorted(allowed), ensure_ascii=False)}."
        result = request(payload, _sheet(frames), _SCHEMA, instructions=prompt)
        if any(not isinstance(result.data.get(key), list) for key in ("tags", "poses", "needs_context")):
            raise InferenceError("invalid_output")
        if served_model is not None and result.model != served_model:
            raise InferenceError("invalid_output")
        served_model = result.model
        analyzed.update(by_number)
        anchors.extend(number for number in result.data["needs_context"][:_BATCH]
                       if type(number) is int and number in by_number)
        _record_poses(result.data["poses"], by_number, poses)
        _record_tags(result.data["tags"], allowed, by_number, scopes, tags, anchors)

    try:
        for groups in batches:
            run(groups)
        refinement = _neighbor_groups(timeline, anchors, initial)
        if refinement:
            run(refinement)
    except InferenceError as exc:
        if served_model is None:
            raise
        interrupted = exc.code

    return served_model, {
        "tags": list(tags.values())[:24], "poses": list(poses.values()),
                "coverage": {"source": timeline.source, "available": timeline.total, "usable": len(timeline.frames),
                     "sent": sent, "analyzed": len(analyzed), "error": interrupted},
    }
