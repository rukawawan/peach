"""接收用户主动提交的文字与图片。"""
from __future__ import annotations

import base64
import io
import json
import platform
import threading
import time
import uuid
from collections import deque
from datetime import datetime, timezone
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import JSONResponse
from PIL import Image, ImageOps
from starlette.concurrency import run_in_threadpool

from . import __version__, feedback_github, feedback_r2
from .interface_text import template
from .remote_reporting import dsn
from .reporting_transport import transport_class
from .routes_auth import authenticated_client, require_authenticated_client, same_origin
from .reporting_identity import distribution
from .user_messages import message_fields
from .web_local_access import local_client, loopback_client

router = APIRouter()
PATH = "/api/app-feedback"
ENVIRONMENT_PATH = PATH + "/environment"
DIAGNOSTICS_PATH = PATH + "/diagnostics"
MAX_IMAGES = 4
MAX_IMAGE_BYTES = 4 * 1024 * 1024
MAX_IMAGE_EDGE = 4096
MAX_ENCODED_BYTES = 4 * ((MAX_IMAGE_BYTES + 2) // 3)
MAX_BODY_BYTES = MAX_IMAGES * MAX_ENCODED_BYTES + 32 * 1024
MAX_DESCRIPTION = 4000
MAX_TITLE = 120
GITHUB_ISSUE_TYPES = {"bug": "Bug", "feature": "Feature"}
CATEGORIES = ("bug", "feature", "question")
ISSUE_SECTIONS = {
    "bug": (
        ("bugDescription", 1300, True),
        ("reproduction", 720, True),
        ("logs", 550, False),
    ),
    "feature": (
        ("useCase", 1500, True),
        ("desiredBehavior", 1000, True),
        ("additionalContext", 750, False),
    ),
}
ENVIRONMENT_FIELDS = (
    ("environmentPeach", 100, True),
    ("environmentSystem", 160, True),
    ("environmentInstall", 100, True),
    ("environmentPython", 32, False),
    ("environmentHealth", 500, False),
)
DIAGNOSTIC_FIELDS = {"environmentHealth", "logs"}
_budget_lock = threading.Lock()


def _reject(status: int, key: str):
    return HTTPException(status, message_fields(f"api.feedback.{key}"))


def _take_budget(request: Request) -> None:
    with _budget_lock:
        state = request.app.state
        recent = getattr(state, "feedback_times", None)
        if recent is None:
            state.feedback_times = recent = deque()
        now = time.monotonic()
        while recent and now - recent[0] >= 60:
            recent.popleft()
        if len(recent) >= 5:
            raise _reject(429, "rateLimited")
        recent.append(now)


def _image(value: str) -> tuple[str, bytes]:
    raw = base64.b64decode(value, validate=True)
    if len(raw) > MAX_IMAGE_BYTES:
        raise ValueError
    with Image.open(io.BytesIO(raw), formats=("JPEG", "PNG", "WEBP")) as source:
        if max(source.size) > MAX_IMAGE_EDGE:
            raise ValueError
        lossless = source.format == "PNG"
        image = ImageOps.exif_transpose(source).convert("RGBA")
    # Flatten transparency and rebuild the attachment without EXIF, filenames or other metadata.
    flat = Image.new("RGB", image.size, "white")
    flat.paste(image, mask=image.getchannel("A"))
    with io.BytesIO() as output:
        if lossless:
            flat.save(output, format="PNG", optimize=True)
            if output.tell() <= MAX_IMAGE_BYTES:
                return "png", output.getvalue()
            output.seek(0)
            output.truncate()
        flat.save(output, format="JPEG", quality=88, subsampling=0, optimize=True)
        if output.tell() <= MAX_IMAGE_BYTES:
            return "jpeg", output.getvalue()
        output.seek(0)
        output.truncate()
        flat.save(output, format="JPEG", quality=80, optimize=True)
        if output.tell() > MAX_IMAGE_BYTES:
            raise ValueError
        return "jpeg", output.getvalue()


def _issue_label(key: str, required: bool = True) -> str:
    label = f"server:api.feedback.issueTemplate.{key}"
    separator = " / " if required else "/ "
    return separator.join(template(label, language) for language in ("zh-CN", "en"))


def _issue_description(category: str, fields: dict) -> str:
    keys = ISSUE_SECTIONS[category]
    allowed = keys + (ENVIRONMENT_FIELDS if category == "bug" else ())
    if not isinstance(fields, dict) or fields.keys() - {key for key, *_ in allowed}:
        raise ValueError
    cleaned = {}
    for key, limit, required in allowed:
        value = fields.get(key, "")
        if not isinstance(value, str):
            raise ValueError
        value = value.strip()
        if len(value) > limit or (required and not value):
            raise ValueError
        if key.startswith("environment") and key != "environmentHealth" and len(value.splitlines()) > 1:
            raise ValueError
        cleaned[key] = value

    sections = [f"## {_issue_label(key, required)}\n\n{cleaned[key]}".rstrip()
                for key, _, required in keys]
    if category == "bug":
        environment = []
        for key, _, required in ENVIRONMENT_FIELDS:
            value = cleaned[key]
            if value:
                label = _issue_label(key, required)
                if key == "environmentHealth":
                    block = "\n".join(f"      {line}" for line in value.splitlines())
                    environment.append(f"- {label}:\n\n{block}")
                else:
                    environment.append(f"- {label}: {value}")
        sections.insert(2, f"## {_issue_label('environment')}\n\n" + "\n".join(environment))
    return "\n\n".join(sections)


def _prepare_images(data: dict, publish_github: bool) -> tuple[list[tuple[str, bytes]], list[int]]:
    """校验附件边界与公开选择，再统一编码图片。"""
    images = data.get("images", [])
    if not isinstance(images, list) or len(images) > MAX_IMAGES:
        raise ValueError
    if any(not isinstance(value, str) or len(value) > MAX_ENCODED_BYTES for value in images):
        raise ValueError
    github_images = data.get("githubImages", [])
    if (not isinstance(github_images, list) or len(github_images) > len(images)
            or any(type(index) is not int or not 0 <= index < len(images) for index in github_images)
            or len(set(github_images)) != len(github_images) or (github_images and not publish_github)):
        raise ValueError
    return [_image(value) for value in images], github_images


def _prepare_descriptions(data: dict, category: str | None, title: str, publish_github: bool) -> tuple[str, str | None]:
    if "fields" not in data:
        if publish_github or "privateDiagnostics" in data or not isinstance(data.get("description"), str):
            raise ValueError
        return data["description"].strip(), None
    if not title or category not in ISSUE_SECTIONS:
        raise ValueError
    fields = data["fields"]
    description = _issue_description(category, fields)
    if "privateDiagnostics" not in data:
        return description, description if publish_github else None

    private = data["privateDiagnostics"]
    if (not publish_github or category != "bug" or not isinstance(private, dict)
            or private.keys() - DIAGNOSTIC_FIELDS or private.keys() & fields.keys()):
        raise ValueError
    return _issue_description(category, {**fields, **private}), description


def _prepare(body: bytearray) -> tuple[str, str, str | None, list[tuple[str, bytes]], str | None, list[int]]:
    data = json.loads(body)
    if not isinstance(data, dict):
        raise ValueError
    category = data.get("category")
    title = data.get("title", "")
    publish_github = data.get("publishGithub", False)
    if not isinstance(title, str) or not isinstance(publish_github, bool):
        raise ValueError
    title = title.strip()
    if len(title) > MAX_TITLE or "\n" in title or "\r" in title:
        raise ValueError
    if category is not None and category not in CATEGORIES:
        raise ValueError
    description, github_description = _prepare_descriptions(data, category, title, publish_github)
    if not description or len(description) > MAX_DESCRIPTION:
        raise ValueError
    if title and len(title) + 2 + len(description) > MAX_DESCRIPTION:
        raise ValueError
    images, github_images = _prepare_images(data, publish_github)
    return title, description, github_description, images, category, github_images


def _send(target: str, description: str, images: list[tuple[str, bytes]], category: str | None) -> tuple[str, str]:
    from sentry_sdk import Client
    from sentry_sdk.attachments import Attachment
    from sentry_sdk.envelope import Envelope, Item, PayloadRef
    from sentry_sdk.utils import format_timestamp

    identity = uuid.uuid4().hex
    stamp = format_timestamp(datetime.now(timezone.utc))
    envelope = Envelope(headers={"event_id": identity, "sent_at": stamp})
    envelope.add_item(Item(type="feedback", payload=PayloadRef(json={
        "event_id": identity, "type": "feedback", "platform": "other", "level": "info", "timestamp": stamp,
        "release": f"peach@{__version__}",
        "contexts": {"feedback": {"message": description, "source": "custom"}},
        **({"tags": {"feedback_category": category}} if category else {}),
    })))
    for index, (format_name, image) in enumerate(images, start=1):
        envelope.add_item(Attachment(bytes=image, filename=f"feedback-{index}.{format_name}",
                                     content_type=f"image/{format_name}").to_envelope_item())

    outcomes = []
    client = Client(dsn=target, transport=transport_class(lambda _: True, outcomes.append),
                    default_integrations=False, auto_enabling_integrations=False, send_client_reports=False)
    try:
        client.transport.capture_envelope(envelope)
        client.flush(timeout=8)
    finally:
        client.close(timeout=0)
    return identity, outcomes[0]["status"] if outcomes else "unknown"


def require_feedback_environment(request: Request) -> None:
    if not local_client(request) and not authenticated_client(request):
        raise HTTPException(401, "unauthorized")


def require_feedback_diagnostics(request: Request) -> bool:
    can_read_logs = loopback_client(request) or authenticated_client(request)
    if not can_read_logs and not local_client(request):
        raise HTTPException(401, "unauthorized")
    return can_read_logs


def require_feedback_submission(request: Request) -> None:
    if local_client(request):
        same_origin(request)
    else:
        require_authenticated_client(request)


@router.get(ENVIRONMENT_PATH, dependencies=[Depends(require_feedback_environment)])
def feedback_environment():
    system = platform.system()
    release = (platform.mac_ver()[0] if system == "Darwin"
               else platform.version() if system == "Windows" else platform.release())
    if system == "Linux":
        try:
            release = platform.freedesktop_os_release().get("PRETTY_NAME") or release
        except OSError:
            pass
    install = distribution()
    return {"version": __version__, "system": "macOS" if system == "Darwin" else system,
            "release": release, "architecture": platform.machine(), "distribution": install,
            **({"python": platform.python_version()} if install == "source" else {})}


@router.get(DIAGNOSTICS_PATH)
def feedback_diagnostics(request: Request, can_read_logs: Annotated[bool, Depends(require_feedback_diagnostics)]):
    from .health import app_readiness
    from .settings_file import active
    from .support_bundle import feedback_error_summary

    health = app_readiness(request.app, request.app.state.settings)
    logs = feedback_error_summary(active().directory("logs")) if can_read_logs else None
    return JSONResponse({"health": health, "logs": logs}, headers={"Cache-Control": "no-store"})


@router.post(PATH, dependencies=[Depends(require_feedback_submission)])
async def feedback(request: Request):
    sentry = dsn()
    backup = feedback_r2.destination()
    if not (sentry or backup):
        raise _reject(503, "unavailable")
    _take_budget(request)
    body = bytearray()
    async for part in request.stream():
        if len(body) + len(part) > MAX_BODY_BYTES:
            raise _reject(413, "tooLarge")
        body.extend(part)
    try:
        title, description, github_description, images, category, github_images = await run_in_threadpool(_prepare, body)
    except (ValueError, OSError, SyntaxError, Image.DecompressionBombError):
        raise _reject(400, "invalid") from None
    private_description = title + "\n\n" + description if title else description
    if sentry:
        identity, status = await run_in_threadpool(_send, sentry, private_description, images, category)
    else:
        identity, status = uuid.uuid4().hex, "failed"
    if status == "failed" and backup is not None:
        status = await run_in_threadpool(feedback_r2.store, backup, identity, private_description, images, category)
    if status != "accepted":
        raise _reject(502, "unknown" if status == "unknown" else "sendFailed")
    if github_description is not None:
        github = await run_in_threadpool(feedback_github.publish, title, github_description, GITHUB_ISSUE_TYPES[category],
                                        [images[index] for index in github_images])
        return {"id": identity, "github": github}
    return {"id": identity}
