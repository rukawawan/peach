"""将用户反馈归档到部署方配置的私有 R2 存储桶。"""
from __future__ import annotations

import io
import json
import os
import re
from dataclasses import dataclass, field
from datetime import datetime, timezone
from zipfile import ZipFile

from . import __version__, peach_proxy
from .user_messages import UserValueError

_ENDPOINT = re.compile(r"https://[a-f0-9]{32}(?:\.eu|\.us|\.fedramp)?\.r2\.cloudflarestorage\.com")
_BUCKET = re.compile(r"[a-z0-9][a-z0-9-]{1,61}[a-z0-9]")


@dataclass(frozen=True)
class Destination:
    endpoint: str
    bucket: str
    access_key: str = field(repr=False)
    secret_key: str = field(repr=False)


def destination() -> Destination | None:
    endpoint = os.environ.get("PEACH_FEEDBACK_R2_ENDPOINT", "").strip().rstrip("/")
    bucket = os.environ.get("PEACH_FEEDBACK_R2_BUCKET", "").strip()
    access_key = os.environ.get("PEACH_FEEDBACK_R2_ACCESS_KEY_ID", "").strip()
    secret_key = os.environ.get("PEACH_FEEDBACK_R2_SECRET_ACCESS_KEY", "").strip()
    if not (_ENDPOINT.fullmatch(endpoint) and _BUCKET.fullmatch(bucket) and access_key and secret_key):
        return None
    return Destination(endpoint, bucket, access_key, secret_key)


def store(target: Destination, identity: str, description: str, images: list[tuple[str, bytes]],
          category: str | None) -> str:
    from curl_cffi import CurlOpt, requests as curl_requests
    from curl_cffi.requests.exceptions import RequestException

    if os.environ.get("PEACH_REPORTING_TEST_MODE") == "1":
        return "failed"
    # One PUT commits the complete report, including all of its already encoded images.
    files = [f"feedback-{index}.{format_name}" for index, (format_name, _) in enumerate(images, start=1)]
    metadata = {"id": identity, "created_at": datetime.now(timezone.utc).isoformat(),
                "version": __version__, "description": description, "images": files}
    if category:
        metadata["category"] = category
    with io.BytesIO() as output:
        with ZipFile(output, "w") as archive:
            archive.writestr("feedback.json", json.dumps(metadata, ensure_ascii=False).encode("utf-8"))
            for filename, (_, image) in zip(files, images):
                archive.writestr(filename, image)
        payload = output.getvalue()

    try:
        options = peach_proxy.curl_options()
        curl_options = options.pop("curl_options", {})
        curl_options[CurlOpt.AWS_SIGV4] = b"aws:amz:auto:s3"
        with curl_requests.Session(curl_options=curl_options, **options) as client:
            response = client.put(f"{target.endpoint}/{target.bucket}/feedback/{identity}.zip",
                                  auth=(target.access_key, target.secret_key), data=payload,
                                  headers={"Content-Type": "application/zip"}, timeout=10,
                                  allow_redirects=False)
    except RequestException:
        return "unknown"
    except UserValueError:
        return "failed"
    if response.status_code == 200:
        return "accepted"
    return "unknown" if response.status_code >= 500 else "failed"
