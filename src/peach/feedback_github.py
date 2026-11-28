"""以 GitHub App 身份代发反馈，只公开用户单独选中的图片。"""
from __future__ import annotations

import base64
import json
import os
import re
import time
from pathlib import Path

from curl_cffi import requests as curl_requests
from curl_cffi.requests.exceptions import RequestException

from . import __version__, peach_proxy
from .user_messages import UserValueError

REPO = "peach-mitao/peach"
BRANCH = "peach-feedback-screenshots"
API = "https://api.github.com"
REST_ERRORS = (RequestException, ValueError, KeyError, TypeError)


def _jwt(app_id: str, key_file: str) -> str:
    from cryptography.hazmat.primitives import hashes, serialization
    from cryptography.hazmat.primitives.asymmetric import padding, rsa

    def encode(value: bytes) -> bytes:
        return base64.urlsafe_b64encode(value).rstrip(b"=")

    now = int(time.time())
    claims = json.dumps({"iat": now - 60, "exp": now + 480, "iss": app_id}, separators=(",", ":")).encode()
    unsigned = encode(b'{"alg":"RS256","typ":"JWT"}') + b"." + encode(claims)
    key = serialization.load_pem_private_key(Path(key_file).read_bytes(), password=None)
    if not isinstance(key, rsa.RSAPrivateKey):
        raise ValueError("GitHub App requires an RSA key")
    signature = key.sign(unsigned, padding.PKCS1v15(), hashes.SHA256())
    return (unsigned + b"." + encode(signature)).decode("ascii")


def _request(client, method: str, path: str, token: str, **kwargs):
    return client.request(method, API + path, headers={
        "Authorization": f"Bearer {token}",
        "Accept": "application/vnd.github+json",
        "User-Agent": f"Peach-Feedback/{__version__}",
        "X-GitHub-Api-Version": "2026-03-10",
    }, timeout=8, allow_redirects=False, **kwargs)


def _installation_token(client, installation_id: str, jwt: str, has_images: bool) -> str | None:
    permissions = {"issues": "write"}
    if has_images:
        permissions["contents"] = "write"
    response = _request(client, "POST", f"/app/installations/{installation_id}/access_tokens", jwt,
                        json={"repositories": [REPO.split("/")[1]], "permissions": permissions})
    if response.status_code != 201:
        return None
    token = response.json()["token"]
    return token if isinstance(token, str) and token.strip() else None


def _ensure_branch(client, token: str) -> bool:
    repo = f"/repos/{REPO}"
    ref = f"{repo}/git/ref/heads/{BRANCH}"
    status = _request(client, "GET", ref, token).status_code
    if status != 404:
        return status == 200
    tree = _request(client, "POST", f"{repo}/git/trees", token, json={"tree": [{
        "path": "README.md", "mode": "100644", "type": "blob", "content": "Peach public feedback attachments.\n",
    }]})
    if tree.status_code != 201:
        return False
    commit = _request(client, "POST", f"{repo}/git/commits", token, json={
        "message": "Initialize Peach feedback attachment storage", "tree": tree.json()["sha"], "parents": [],
    })
    if commit.status_code != 201:
        return False
    created = _request(client, "POST", f"{repo}/git/refs", token, json={
        "ref": f"refs/heads/{BRANCH}", "sha": commit.json()["sha"],
    })
    # Only re-read on a response that can mean another report created the same branch.
    return created.status_code == 201 or (
        created.status_code == 422 and _request(client, "GET", ref, token).status_code == 200
    )


def _attach_images(client, token: str, number: int, images: list[tuple[str, bytes]]) -> str:
    try:
        if not _ensure_branch(client, token):
            return "manual"
        links = []
        for index, (extension, image) in enumerate(images, start=1):
            path = f".peach/feedback/{number}/image-{index}.{extension}"
            endpoint = f"/repos/{REPO}/contents/{path}"
            payload = {"message": f"Attach feedback image for #{number}", "branch": BRANCH,
                       "content": base64.b64encode(image).decode("ascii")}
            uploaded = _request(client, "PUT", endpoint, token, json=payload)
            if uploaded.status_code == 409:
                uploaded = _request(client, "PUT", endpoint, token, json=payload)
            if uploaded.status_code == 201:
                links.append(f"![Feedback image {index}](https://raw.githubusercontent.com/{REPO}/{BRANCH}/{path})")
        if not links:
            return "manual"
        comment = _request(client, "POST", f"/repos/{REPO}/issues/{number}/comments", token,
                           json={"body": "\n\n".join(links)})
        if comment.status_code == 201:
            return "attached" if len(links) == len(images) else "unconfirmed"
        return "manual" if 400 <= comment.status_code < 500 else "unconfirmed"
    except REST_ERRORS:
        return "unconfirmed"


def publish(title: str, description: str, issue_type: str, images: list[tuple[str, bytes]]) -> dict:
    if os.environ.get("PEACH_REPORTING_TEST_MODE") == "1":
        return {"status": "unavailable"}
    app_id = os.environ.get("PEACH_FEEDBACK_GITHUB_APP_ID", "").strip()
    installation_id = os.environ.get("PEACH_FEEDBACK_GITHUB_INSTALLATION_ID", "").strip()
    key_file = os.environ.get("PEACH_FEEDBACK_GITHUB_PRIVATE_KEY_FILE", "").strip()
    app_configured = any((app_id, installation_id, key_file))
    token = os.environ.get("PEACH_FEEDBACK_GITHUB_TOKEN", "").strip()
    if not app_configured and not token:
        return {"status": "unavailable"}
    if app_configured:
        if not (re.fullmatch(r"[1-9][0-9]{0,19}", app_id)
                and re.fullmatch(r"[1-9][0-9]{0,19}", installation_id) and key_file):
            return {"status": "unavailable"}
        try:
            jwt = _jwt(app_id, key_file)
        except (OSError, ValueError, TypeError):
            return {"status": "failed"}

    try:
        with curl_requests.Session(**peach_proxy.curl_options()) as client:
            if app_configured:
                try:
                    token = _installation_token(client, installation_id, jwt, bool(images))
                except REST_ERRORS:
                    return {"status": "failed"}
                if not token:
                    return {"status": "failed"}
            response = _request(client, "POST", f"/repos/{REPO}/issues", token,
                                json={"title": title, "body": description, "type": issue_type})
            if 400 <= response.status_code < 500:
                return {"status": "failed"}
            if response.status_code == 201:
                number = response.json()["number"]
                if type(number) is int and number > 0:
                    result = {"status": "published", "number": number}
                    if images:
                        result["images"] = _attach_images(client, token, number, images)
                    return result
    except UserValueError:
        return {"status": "failed"}
    except REST_ERRORS:
        pass
    return {"status": "unconfirmed"}
