"""Official Sign in with ChatGPT for a locally hosted Peach instance."""
from __future__ import annotations

import base64
import hashlib
import json
import os
import re
import secrets
import threading
import time
import uuid
from dataclasses import dataclass, field
from http.server import BaseHTTPRequestHandler, HTTPServer
from pathlib import Path
from urllib.parse import parse_qs, urlencode, urlsplit

import httpx
from cryptography.exceptions import InvalidSignature
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.asymmetric import padding, rsa
from filelock import FileLock, Timeout

from .ai_credentials import _dpapi, store_for
from .ai_inference import (
    InferenceError, InferenceResult, UsageReporter, _decode_object, _raise_http_error, report_usage, valid_model,
    validated_effort,
)
from .follow_secrets import CredentialError, CredentialStore

DEFAULT_MODEL = "gpt-6.2-sol"
RESULT_PATH = "/settings/ai/authorization"
_ENTRY = "openai-oauth"
_HOST_ENTRY = "openai-oauth-host"
_ISSUER = "https://auth.openai.com"
_AUTHORIZE = _ISSUER + "/api/accounts/authorize"
_TOKEN = _ISSUER + "/api/accounts/oauth/token"
_DISCOVERY = _ISSUER + "/.well-known/openid-configuration"
_JWKS = _ISSUER + "/.well-known/jwks.json"
_RESOURCE = "https://api.openai.com/v1"
_USAGE = "chatgpt.tokens.use.direct"
_SCOPE = "openid profile email offline_access resource.invoke " + _USAGE
_DYNAMIC_CLIENT = "dynamic_agent_client"
_CALLBACK = "/auth/callback"
_TIMEOUT = httpx.Timeout(12, connect=5)
_STREAM_TIMEOUT = httpx.Timeout(45, connect=10)
_AUTH_LIFETIME = 5 * 60
_REFRESH_MARGIN = 60
_MAX_STREAM = 1024 * 1024
_JWT_PART = re.compile(r"[A-Za-z0-9_-]+")
_TOKEN_VALUE = re.compile(r"[!-~]{1,32768}")
_CLIENT_ID = re.compile(r"[A-Za-z0-9_-]{1,128}")
_INVALID_REFRESH = frozenset({
    "invalid_grant", "invalid_refresh_token", "token_expired", "refresh_token_expired",
    "refresh_token_invalidated", "refresh_token_reused",
})
_ERROR_CODES = {
    "content_filter": "refused",
    "subscription_sharing_user_not_eligible": "unavailable",
    "subscription_sharing_usage_limit_exceeded": "quota",
    "subscription_sharing_usage_unavailable": "unavailable",
    "subscription_sharing_unsupported_capability": "unavailable",
    "subscription_sharing_route_not_supported": "unavailable",
    "subscription_sharing_invalid_user": "auth",
    "subscription_sharing_user_unavailable": "unavailable",
}


@dataclass
class _Attempt:
    state: str
    nonce: str
    verifier: str = field(repr=False)
    model: str
    client_id: str
    subject: str
    redirect_uri: str
    result_url: str
    authorization_url: str
    stop: threading.Event = field(default_factory=threading.Event, repr=False)


_LOCK = threading.RLock()
_PENDING: dict[Path, _Attempt] = {}
_ERRORS: dict[Path, str] = {}


def _encode(value: bytes) -> str:
    return base64.urlsafe_b64encode(value).rstrip(b"=").decode("ascii")


def _decode(value: str) -> bytes:
    if not _JWT_PART.fullmatch(value):
        raise ValueError("invalid base64url")
    return base64.urlsafe_b64decode(value + "=" * (-len(value) % 4))


def _protected_store(store: CredentialStore, value: dict) -> None:
    raw = json.dumps(value, ensure_ascii=False).encode("utf-8")
    fields = ({"dpapi": base64.b64encode(_dpapi(raw, protect=True)).decode("ascii")}
              if os.name == "nt" else {"session": raw.decode("utf-8")})
    store.save(_ENTRY, fields)


def _session(store: CredentialStore) -> dict:
    saved = store.load(_ENTRY)
    if saved is None:
        return {}
    try:
        fields = saved.values
        if os.name == "nt":
            raw = _dpapi(base64.b64decode(fields["dpapi"], validate=True), protect=False)
        else:
            raw = fields["session"]
        value = _decode_object(raw)
        if (not isinstance(value.get("client_id"), str) or not _CLIENT_ID.fullmatch(value["client_id"])
                or value["client_id"] == _DYNAMIC_CLIENT or not isinstance(value.get("subject"), str)
                or not isinstance(value.get("model"), str) or not valid_model(value["model"])):
            raise InferenceError("auth")
        if "access_token" in value and (
                not isinstance(value["access_token"], str) or not _TOKEN_VALUE.fullmatch(value["access_token"])
                or type(value.get("expires_at")) not in (int, float) or not isinstance(value.get("scopes"), list)):
            raise InferenceError("auth")
        return value
    except (InferenceError, OSError, KeyError, ValueError):
        raise InferenceError("auth") from None


def _credentials_lock(store: CredentialStore) -> FileLock:
    store.root.mkdir(parents=True, exist_ok=True)
    return FileLock(str(store.path_for(_ENTRY).with_suffix(".lock")), timeout=15)


def _status(store: CredentialStore) -> dict:
    pending = _PENDING.get(store.root)
    try:
        saved = _session(store)
    except (InferenceError, CredentialError):
        return {"status": "error", "configured": False, "model": DEFAULT_MODEL, "error": "auth"}
    connected = bool(saved.get("access_token") and _USAGE in saved.get("scopes", []))
    error = _ERRORS.get(store.root)
    if pending:
        status_name = "pending"
    elif error:
        status_name = "error"
    elif connected:
        status_name = "connected"
    elif saved.get("access_token"):
        status_name = "permission_required"
    elif saved:
        status_name, error = "error", "expired"
    else:
        status_name = "disconnected"
    result = {"status": status_name, "configured": connected,
              "model": pending.model if pending else saved.get("model", DEFAULT_MODEL)}
    if saved.get("email"):
        result["email"] = saved["email"]
    if error:
        result["error"] = error
    return result


def status(state) -> dict:
    with _LOCK:
        return _status(store_for(state))


def _load_host(store: CredentialStore) -> str:
    with _credentials_lock(store):
        host = store.load(_HOST_ENTRY)
        if host:
            return host.values["host_id"]
        host_id = uuid.uuid4().urn
        store.save(_HOST_ENTRY, {"host_id": host_id})
        return host_id


class _CallbackServer(HTTPServer):
    allow_reuse_address = False
    timeout = 0.25

    def get_request(self):
        connection, address = super().get_request()
        connection.settimeout(3)
        return connection, address

    def handle_error(self, _request, _address):
        # The local browser may close the connection while the code exchange completes.
        return None


def _page(handler: BaseHTTPRequestHandler, status_code: int, message: str) -> None:
    payload = message.encode("utf-8")
    handler.send_response(status_code)
    handler.send_header("Content-Type", "text/plain; charset=utf-8")
    handler.send_header("Content-Length", str(len(payload)))
    handler.send_header("Cache-Control", "no-store")
    handler.send_header("Referrer-Policy", "no-referrer")
    handler.send_header("Content-Security-Policy", "default-src 'none'; frame-ancestors 'none'")
    handler.send_header("X-Content-Type-Options", "nosniff")
    handler.end_headers()
    handler.wfile.write(payload)


def _return_to_peach(handler: BaseHTTPRequestHandler, destination: str) -> None:
    handler.send_response(303)
    handler.send_header("Location", destination)
    handler.send_header("Content-Length", "0")
    handler.send_header("Cache-Control", "no-store")
    handler.send_header("Referrer-Policy", "no-referrer")
    handler.end_headers()


def _authorization(attempt: _Attempt, host_id: str, *, retry_consent: bool) -> str:
    params = {
        "client_id": attempt.client_id, "ext_agent_host_id": host_id,
        "response_type": "code", "redirect_uri": attempt.redirect_uri, "scope": _SCOPE,
        "resource": _RESOURCE, "state": attempt.state, "nonce": attempt.nonce,
        "code_challenge_method": "S256",
        "code_challenge": _encode(hashlib.sha256(attempt.verifier.encode("ascii")).digest()),
    }
    if attempt.client_id == _DYNAMIC_CLIENT:
        params["agent_name_hint"] = "Peach"
    elif retry_consent:
        params["prompt"] = "consent"
    return _AUTHORIZE + "?" + urlencode(params)


def start(state, model: str = DEFAULT_MODEL, *, result_url: str) -> dict:
    """Bind a temporary local callback before returning the provider's authorization URL."""
    if not valid_model(model):
        raise InferenceError("provider")
    store = store_for(state)
    client = state.http_transport.client
    with _LOCK:
        existing = _PENDING.get(store.root)
        if existing is not None:
            return {**_status(store), "authorization_url": existing.authorization_url}
        try:
            saved = _session(store)
            host_id = _load_host(store)
        except (CredentialError, OSError, KeyError, Timeout):
            raise InferenceError("auth") from None

        class Callback(BaseHTTPRequestHandler):
            def log_message(self, *_args):
                # Request targets include a single-use authorization code.
                return None

            def do_GET(self):
                _callback(self, client, store, attempt)

        try:
            server = _CallbackServer(("127.0.0.1", 0), Callback)
        except OSError:
            raise InferenceError("network") from None
        attempt = _Attempt(
            state=secrets.token_urlsafe(32), nonce=secrets.token_urlsafe(32),
            verifier=secrets.token_urlsafe(48), model=model, client_id=saved.get("client_id", _DYNAMIC_CLIENT),
            subject=saved.get("subject", ""), redirect_uri=f"http://127.0.0.1:{server.server_port}{_CALLBACK}",
            result_url=result_url, authorization_url="",
        )
        attempt.authorization_url = _authorization(
            attempt, host_id, retry_consent=bool(saved.get("access_token") and _USAGE not in saved.get("scopes", [])),
        )
        _PENDING[store.root] = attempt
        _ERRORS.pop(store.root, None)
        threading.Thread(target=_listen, args=(server, store, attempt), daemon=True,
                         name="peach-openai-oauth").start()
        return {**_status(store), "authorization_url": attempt.authorization_url}


def _listen(server: _CallbackServer, store: CredentialStore, attempt: _Attempt) -> None:
    deadline = time.monotonic() + _AUTH_LIFETIME
    with server:
        while not attempt.stop.is_set() and time.monotonic() < deadline:
            server.handle_request()
        with _LOCK:
            if _PENDING.get(store.root) is attempt:
                _PENDING.pop(store.root)
                if not attempt.stop.is_set():
                    _ERRORS[store.root] = "expired"


def _callback(handler: BaseHTTPRequestHandler, client: httpx.Client,
              store: CredentialStore, attempt: _Attempt) -> None:
    try:
        target = urlsplit(handler.path)
    except ValueError:
        _page(handler, 400, "Peach")
        return
    port = handler.server.server_port
    if (target.path != _CALLBACK or target.netloc or target.scheme or attempt.stop.is_set()
            or handler.headers.get("Host") != f"127.0.0.1:{port}"):
        _page(handler, 404, "Peach")
        return
    try:
        query = parse_qs(target.query, keep_blank_values=True, max_num_fields=20)
    except ValueError:
        query = {}
    values = query.get("state", [])
    if (len(values) != 1 or not secrets.compare_digest(values[0].encode("utf-8"), attempt.state.encode("ascii"))
            or any(len(value) != 1 for value in query.values())):
        _page(handler, 400, "ChatGPT sign-in request is invalid. Return to Peach and start again.")
        return
    # Settle the attempt before the browser reads the receipt from the Peach origin.
    error = None
    try:
        _complete(client, store, attempt, {name: value[0] for name, value in query.items()})
    except InferenceError as exc:
        error = exc.code
    finally:
        with _LOCK:
            attempt.stop.set()
            if _PENDING.get(store.root) is attempt:
                del _PENDING[store.root]
                if error is not None:
                    _ERRORS[store.root] = error
    _return_to_peach(handler, attempt.result_url)


def _request(client: httpx.Client, method: str, url: str, **kwargs) -> httpx.Response:
    try:
        return client.request(method, url, timeout=_TIMEOUT, follow_redirects=False, **kwargs)
    except httpx.HTTPError:
        raise InferenceError("network") from None


def _error_code(response: httpx.Response) -> str:
    try:
        error = _decode_object(response.content).get("error")
    except InferenceError:
        return ""
    code = error.get("code") if isinstance(error, dict) else error
    return code if isinstance(code, str) else ""


def _read_json(response: httpx.Response) -> dict:
    if not response.is_success:
        code = _error_code(response)
        if code in _ERROR_CODES:
            raise InferenceError(_ERROR_CODES[code])
        _raise_http_error(response.status_code, response.content)
    return _decode_object(response.content)


def _verify_id_token(client: httpx.Client, token: str, client_id: str, nonce: str) -> dict:
    try:
        encoded_header, encoded_claims, encoded_signature = token.split(".")
        header = _decode_object(_decode(encoded_header))
        claims = _decode_object(_decode(encoded_claims))
        if header.get("alg") != "RS256" or not isinstance(header.get("kid"), str):
            raise ValueError("invalid header")
        jwks = _read_json(_request(client, "GET", _JWKS)).get("keys", [])
        key = next(key for key in jwks if key.get("kid") == header["kid"] and key.get("kty") == "RSA"
                   and key.get("alg", "RS256") == "RS256" and key.get("use", "sig") == "sig")
        exponent = int.from_bytes(_decode(key["e"]), "big")
        modulus = int.from_bytes(_decode(key["n"]), "big")
        if not 2048 <= modulus.bit_length() <= 8192:
            raise ValueError("invalid RSA key")
        public_key = rsa.RSAPublicNumbers(exponent, modulus).public_key()
        public_key.verify(_decode(encoded_signature), f"{encoded_header}.{encoded_claims}".encode("ascii"),
                          padding.PKCS1v15(), hashes.SHA256())
        aud = claims.get("aud")
        audiences = [aud] if isinstance(aud, str) else aud if isinstance(aud, list) else []
        expires = claims.get("exp")
        if (claims.get("iss") != _ISSUER or client_id not in audiences or
                (len(audiences) > 1 and claims.get("azp") != client_id) or
                ("azp" in claims and claims["azp"] != client_id) or
                type(expires) is not int or expires <= time.time() or claims.get("nonce") != nonce or
                not isinstance(claims.get("sub"), str) or not claims["sub"]):
            raise ValueError("invalid claims")
    except (AttributeError, InvalidSignature, KeyError, StopIteration, TypeError, ValueError):
        raise InferenceError("auth") from None
    return claims


def _token_fields(data: dict, previous: dict | None = None) -> dict:
    previous = previous or {}
    access, refresh = data.get("access_token"), data.get("refresh_token", previous.get("refresh_token"))
    expires = data.get("expires_in")
    scope = data.get("scope")
    token_type = data.get("token_type", "")
    if (not isinstance(access, str) or not _TOKEN_VALUE.fullmatch(access)
            or (refresh is not None and (not isinstance(refresh, str) or not _TOKEN_VALUE.fullmatch(refresh)))
            or not isinstance(token_type, str) or token_type.lower() != "bearer"
            or type(expires) is not int or not 0 < expires < 86400 * 30
            or (scope is not None and not isinstance(scope, str))):
        raise InferenceError("auth")
    return {"access_token": access, "refresh_token": refresh or "",
            "expires_at": time.time() + expires, "scopes": scope.split() if scope is not None else previous.get("scopes", [])}


def _complete(client: httpx.Client, store: CredentialStore, attempt: _Attempt, query: dict[str, str]) -> None:
    if "error" in query:
        raise InferenceError("permission_required" if query["error"] == "access_denied" else "auth")
    selected = attempt.client_id
    issued = query.get("client_id", selected)
    code = query.get("code", "")
    if (not _CLIENT_ID.fullmatch(issued) or issued == _DYNAMIC_CLIENT
            or (selected != _DYNAMIC_CLIENT and issued != selected) or not _TOKEN_VALUE.fullmatch(code)):
        raise InferenceError("auth")
    response = _request(client, "POST", _TOKEN, data={
        "grant_type": "authorization_code", "client_id": issued, "code": code,
        "code_verifier": attempt.verifier, "redirect_uri": attempt.redirect_uri, "resource": _RESOURCE,
    })
    if not response.is_success and _error_code(response) == "invalid_grant":
        raise InferenceError("auth")
    data = _read_json(response)
    token = data.get("id_token")
    if not isinstance(token, str) or not _TOKEN_VALUE.fullmatch(token):
        raise InferenceError("auth")
    fields = _token_fields(data)
    claims = _verify_id_token(client, token, issued, attempt.nonce)
    if attempt.subject and attempt.subject != claims["sub"]:
        raise InferenceError("auth")
    fields.update(client_id=issued, subject=claims["sub"], id_token=token, model=attempt.model)
    if claims.get("email_verified") is True and isinstance(claims.get("email"), str):
        fields["email"] = claims["email"]
    try:
        with _LOCK:
            if _PENDING.get(store.root) is attempt and not attempt.stop.is_set():
                with _credentials_lock(store):
                    current = _session(store)
                    if (current.get("client_id", _DYNAMIC_CLIENT), current.get("subject", "")) == (
                            attempt.client_id, attempt.subject):
                        _protected_store(store, fields)
                        return
    except (InferenceError, CredentialError, OSError, Timeout):
        pass
    _revoke(client, fields)
    raise InferenceError("auth")


def _revoke(client: httpx.Client, saved: dict) -> bool:
    if not saved.get("refresh_token"):
        return False
    try:
        configuration = _read_json(_request(client, "GET", _DISCOVERY))
        endpoint = configuration.get("revocation_endpoint")
        if configuration.get("issuer") != _ISSUER or endpoint != _ISSUER + "/api/accounts/oauth/revoke":
            return False
        response = _request(client, "POST", endpoint, data={
            "token": saved["refresh_token"], "token_type_hint": "refresh_token",
            "client_id": saved["client_id"],
        })
    except InferenceError:
        return False
    return response.status_code == 200


def disconnect(state) -> dict:
    store = store_for(state)
    with _LOCK:
        attempt = _PENDING.pop(store.root, None)
        if attempt is not None:
            attempt.stop.set()
        try:
            with _credentials_lock(store):
                try:
                    saved = _session(store)
                except (InferenceError, CredentialError):
                    saved = {}
                revoked = _revoke(state.http_transport.client, saved)
                store.clear(_ENTRY)
        except (InferenceError, CredentialError, OSError, Timeout):
            raise InferenceError("auth") from None
        _ERRORS.pop(store.root, None)
        return {**_status(store), "revoked": revoked}


def _refresh(client: httpx.Client, store: CredentialStore, saved: dict) -> dict:
    response = _request(client, "POST", _TOKEN, data={
        "grant_type": "refresh_token", "client_id": saved["client_id"],
        "refresh_token": saved["refresh_token"], "resource": _RESOURCE,
    })
    if not response.is_success and _error_code(response) in _INVALID_REFRESH:
        registration = {key: saved[key] for key in ("client_id", "subject", "email", "model") if key in saved}
        _protected_store(store, registration)
        raise InferenceError("expired")
    data = _read_json(response)
    fields = _token_fields(data, saved)
    refreshed = {**saved, **fields}
    _protected_store(store, refreshed)
    return refreshed


def _active(state) -> dict:
    store = store_for(state)
    try:
        with _credentials_lock(store):
            saved = _session(store)
            if not saved.get("access_token"):
                raise InferenceError("expired" if saved else "auth")
            if _USAGE not in saved.get("scopes", []):
                raise InferenceError("permission_required")
            if saved.get("expires_at", 0) <= time.time() + _REFRESH_MARGIN:
                if saved.get("refresh_token"):
                    saved = _refresh(state.http_transport.client, store, saved)
                elif saved.get("expires_at", 0) <= time.time():
                    raise InferenceError("expired")
            if _USAGE not in saved.get("scopes", []):
                raise InferenceError("permission_required")
            return saved
    except (CredentialError, OSError, Timeout):
        raise InferenceError("auth") from None


def models(state) -> dict:
    return {"models": _account_models(state.http_transport.client, _active(state))}


def _account_models(client: httpx.Client, saved: dict) -> list[dict[str, str]]:
    response = _request(client, "GET", _RESOURCE + "/models",
                        headers={"Authorization": "Bearer " + saved["access_token"]})
    rows = _read_json(response).get("models")
    if not isinstance(rows, list):
        raise InferenceError("invalid_output")
    return [{"id": row["slug"], "label": row["display_name"]} for row in rows
            if isinstance(row, dict) and row.get("visibility") == "list"
            and isinstance(row.get("slug"), str) and valid_model(row["slug"])
            and isinstance(row.get("display_name"), str)]


def set_model(state, model: str) -> dict:
    if not valid_model(model):
        raise InferenceError("provider")
    store = store_for(state)
    # Validate the visible model against the authorized account's own catalog.
    account = _active(state)
    if not any(row["id"] == model for row in _account_models(state.http_transport.client, account)):
        raise InferenceError("model_not_found")
    try:
        with _credentials_lock(store):
            latest = _session(store)
            if (not latest or _USAGE not in latest.get("scopes", [])
                    or latest.get("client_id") != account.get("client_id")
                    or latest.get("subject") != account.get("subject")):
                raise InferenceError("auth")
            _protected_store(store, {**latest, "model": model})
    except (CredentialError, OSError, Timeout):
        raise InferenceError("auth") from None
    return status(state)


def _completed(result: dict, model: str) -> InferenceResult:
    output = result.get("output")
    if not isinstance(output, list):
        raise InferenceError("invalid_output")
    text = []
    for item in output:
        if not isinstance(item, dict) or item.get("type") != "message":
            continue
        parts = item.get("content")
        if not isinstance(parts, list):
            raise InferenceError("invalid_output")
        for block in parts:
            if isinstance(block, dict) and block.get("type") == "refusal":
                raise InferenceError("refused")
            if isinstance(block, dict) and block.get("type") == "output_text" and isinstance(block.get("text"), str):
                text.append(block["text"])
    served = result.get("model")
    if not isinstance(served, str) or not valid_model(served):
        served = model
    return InferenceResult(served, _decode_object("".join(text)))


def _events(response: httpx.Response, model: str, on_usage: UsageReporter | None = None) -> InferenceResult:
    data = []
    total = 0
    deadline = time.monotonic() + 120
    for line in response.iter_lines():
        total += len(line) + 1
        if total > _MAX_STREAM or time.monotonic() >= deadline:
            raise InferenceError("invalid_output")
        if line.startswith("data:"):
            data.append(line[5:].lstrip(" "))
        if line or not data:
            continue
        raw = "\n".join(data)
        data.clear()
        if raw == "[DONE]":
            break
        event = _decode_object(raw)
        kind = event.get("type")
        result = event.get("response")
        result = result if isinstance(result, dict) else {}
        if on_usage is not None and kind in ("response.completed", "response.incomplete", "response.failed"):
            report_usage("openai-oauth", result, model, on_usage, completed=kind == "response.completed")
        if kind == "response.completed":
            return _completed(result, model)
        if kind == "response.incomplete":
            reason = result.get("incomplete_details")
            raise InferenceError("refused" if isinstance(reason, dict) and reason.get("reason") == "content_filter"
                                 else "invalid_output")
        if kind in ("error", "response.failed"):
            error = result.get("error", event)
            code = error.get("code") if isinstance(error, dict) else None
            raise InferenceError(_ERROR_CODES.get(code, "upstream") if isinstance(code, str) else "upstream")
    raise InferenceError("invalid_output")


def infer_oauth(state, *, system: str, text: str, image: bytes | None = None,
                schema: dict | None = None, model: str | None = None, effort: str = "default",
                on_usage: UsageReporter | None = None) -> InferenceResult:
    saved = _active(state)
    model = model or saved["model"]
    reasoning = validated_effort("openai-oauth", model, effort)
    content = [{"type": "input_text", "text": text}]
    if image is not None:
        content.append({"type": "input_image", "detail": "auto",
                        "image_url": "data:image/jpeg;base64," + base64.b64encode(image).decode("ascii")})
    format_options = ({"type": "json_schema", "name": "peach_result", "strict": True, "schema": schema}
                      if schema is not None else {"type": "json_object"})
    body = {
        "model": model, "instructions": system.rstrip() + "\nReturn exactly one JSON object.",
        "input": [{"role": "user", "content": content}], "text": {"format": format_options},
        "stream": True, "store": False,
    }
    if reasoning is not None:
        body["reasoning"] = {"effort": reasoning}
    client = state.http_transport.client
    headers = {"Accept": "text/event-stream", "Authorization": "Bearer " + saved["access_token"]}
    try:
        with client.stream("POST", _RESOURCE + "/responses", headers=headers, json=body,
                           timeout=_STREAM_TIMEOUT, follow_redirects=False) as response:
            if not response.is_success:
                response.read()
                _read_json(response)
            return _events(response, model, on_usage)
    except httpx.HTTPError:
        raise InferenceError("network") from None
