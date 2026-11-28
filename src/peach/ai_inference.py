"""Direct JSON inference with user-provided keys and provider-compatible endpoints."""
from __future__ import annotations

import base64
import json
import re
from collections.abc import Callable
from dataclasses import dataclass
from urllib.parse import quote, urlencode

import httpx
from curl_cffi.requests.exceptions import CurlError

from .user_agent import AI_USER_AGENT
from .ai_endpoints import pinned_target
from .ai_usage import TokenUsage, response_usage
from .public_http import address_session


@dataclass(frozen=True)
class ProviderSpec:
    label: str
    default_model: str
    endpoint: str
    models_endpoint: str
    key_url: str

    @property
    def base_url(self) -> str:
        return self.models_endpoint.removesuffix("/models")

    def inference_url(self, base_url: str) -> str:
        return base_url + self.endpoint.removeprefix(self.base_url) if base_url else self.endpoint


PROVIDERS = {
    "anthropic": ProviderSpec("Claude", "claude-haiku-5-5", "https://api.anthropic.com/v1/messages",
                              "https://api.anthropic.com/v1/models", "https://platform.claude.com/settings/keys"),
    "openai": ProviderSpec("OpenAI", "gpt-6-luna", "https://api.openai.com/v1/chat/completions",
                           "https://api.openai.com/v1/models", "https://platform.openai.com/api-keys"),
    "deepseek": ProviderSpec("DeepSeek", "deepseek-flash", "https://api.deepseek.com/chat/completions",
                             "https://api.deepseek.com/models", "https://platform.deepseek.com/api_keys"),
}
_MAX_TOKENS = 4096
_MAX_RESPONSE_BYTES = 1024 * 1024
_TIMEOUT = httpx.Timeout(90.0, connect=10.0)
_VERIFY_TIMEOUT = httpx.Timeout(10.0, connect=5.0)
_MODEL_ID = re.compile(r"[A-Za-z0-9][A-Za-z0-9_.:/-]{0,127}")
_KEY = re.compile(r"[!-~]{1,2048}")
_REFUSAL_CODES = frozenset({"content_filter", "content_policy_violation", "safety_refusal"})
_QUOTA_CODES = frozenset({"insufficient_quota", "billing_hard_limit_reached", "enforced_spend_limit_reached"})


@dataclass(frozen=True)
class InferenceResult:
    model: str
    data: dict[str, object]


UsageReporter = Callable[[str, TokenUsage | None], None]


def report_usage(provider: str, response: dict, model: str, notify: UsageReporter,
                 *, completed: bool = True) -> None:
    usage = response_usage(provider, response)
    if not completed and usage is None:
        return
    served = response.get("model")
    notify(served if isinstance(served, str) and valid_model(served) else model, usage)


class InferenceError(Exception):
    def __init__(self, code: str):
        super().__init__(code)
        self.code = code


_STANDARD_EFFORTS = ("low", "medium", "high")
_GPT_EXTENDED_EFFORTS = (*_STANDARD_EFFORTS, "xhigh", "max")
_GPT_EFFORTS_WITH_OFF = ("none", *_GPT_EXTENDED_EFFORTS)
_EFFORT_MODELS = {
    "anthropic": {
        "claude-haiku-5-5": _GPT_EXTENDED_EFFORTS,
        "claude-sonnet-5": _GPT_EXTENDED_EFFORTS,
        "claude-sonnet-5-5": _GPT_EXTENDED_EFFORTS,
        "claude-opus-5-5": _GPT_EXTENDED_EFFORTS,
        "claude-fable-5-2": _GPT_EXTENDED_EFFORTS,
        "claude-fable-5-1": _GPT_EXTENDED_EFFORTS,
        "claude-fable-5": _GPT_EXTENDED_EFFORTS,
        "claude-opus-5": _GPT_EXTENDED_EFFORTS,
        "claude-opus-4-8": _GPT_EXTENDED_EFFORTS,
        "claude-opus-4-7": _GPT_EXTENDED_EFFORTS,
        "claude-opus-4-6": (*_STANDARD_EFFORTS, "max"),
        "claude-sonnet-4-6": (*_STANDARD_EFFORTS, "max"),
    },
    "openai": {
        "gpt-5-mini": ("low", "medium", "high"),
        "gpt-5.4-mini": ("none", *_STANDARD_EFFORTS, "xhigh"),
        "gpt-5.6-luna": _GPT_EFFORTS_WITH_OFF,
        "gpt-5.6-terra": _GPT_EFFORTS_WITH_OFF,
        "gpt-6-luna": _GPT_EFFORTS_WITH_OFF,
        "gpt-6.1-terra": _GPT_EFFORTS_WITH_OFF,
        "gpt-6-sol": _GPT_EFFORTS_WITH_OFF,
        "gpt-6-astra": _GPT_EXTENDED_EFFORTS,
        "gpt-6.1-sol": _GPT_EXTENDED_EFFORTS,
        "gpt-6.2-sol": _GPT_EXTENDED_EFFORTS,
        "gpt-6.2-astra": _GPT_EXTENDED_EFFORTS,
    },
    "openai-oauth": {
        "gpt-6-luna": _GPT_EFFORTS_WITH_OFF,
        "gpt-6.2-sol": _GPT_EXTENDED_EFFORTS,
        "gpt-6.2-astra": _GPT_EXTENDED_EFFORTS,
        "gpt-6.1-terra": _GPT_EFFORTS_WITH_OFF,
        "gpt-6.1-sol": _STANDARD_EFFORTS,
    },
    "deepseek": {
        "deepseek-flash": ("none", "low", "high", "max"),
        "deepseek-v4-pro": ("none", "low", "high", "max"),
    },
}


def effort_choices(provider: str, model: str) -> tuple[str, ...]:
    for family, levels in _EFFORT_MODELS.get(provider, {}).items():
        if model == family or model.startswith(family + "-20"):
            return ("default", *levels)
    return ("default",)


def external_effort_choices(protocol: str) -> tuple[str, ...]:
    return ("default", *(_GPT_EXTENDED_EFFORTS if protocol == "anthropic" else _GPT_EFFORTS_WITH_OFF))


def validated_effort(provider: str, model: str, effort: str, *, external: bool = False) -> str | None:
    choices = external_effort_choices(provider) if external else effort_choices(provider, model)
    if effort not in choices:
        raise InferenceError("invalid")
    return None if effort == "default" else effort


def valid_model(model: str) -> bool:
    return bool(_MODEL_ID.fullmatch(model))


def valid_key(key: str) -> bool:
    return bool(_KEY.fullmatch(key))


def _request_body(provider: str, model: str, system: str, text: str, image: bytes | None,
                  schema: dict | None, effort: str | None, *, compatible: bool = False) -> dict:
    system = system.rstrip() + "\nReturn exactly one JSON object."
    encoded = base64.b64encode(image).decode("ascii") if image is not None else None
    if provider == "anthropic":
        content = [{"type": "text", "text": text}]
        if encoded is not None:
            content.append({"type": "image", "source": {
                "type": "base64", "media_type": "image/jpeg", "data": encoded,
            }})
        body = {
            "model": model, "system": system, "max_tokens": _MAX_TOKENS,
            "messages": [{"role": "user", "content": content}],
        }
        if schema is not None:
            body["output_config"] = {"format": {"type": "json_schema", "schema": schema}}
        if effort is not None:
            body.setdefault("output_config", {})["effort"] = effort
        return body

    content = text
    if encoded is not None:
        content = [
            {"type": "text", "text": text},
            {"type": "image_url", "image_url": {"url": "data:image/jpeg;base64," + encoded}},
        ]
    body = {
        "model": model,
        "messages": [{"role": "system", "content": system}, {"role": "user", "content": content}],
        "response_format": {"type": "json_object"},
    }
    if provider == "openai" and not compatible:
        body.update(max_completion_tokens=_MAX_TOKENS, store=False)
        if effort is not None:
            body["reasoning_effort"] = effort
        if schema is not None:
            body["response_format"] = {"type": "json_schema", "json_schema": {
                "name": "peach_result", "strict": True, "schema": schema,
            }}
    else:
        body["max_tokens"] = _MAX_TOKENS
        if effort is not None:
            body["reasoning_effort"] = effort
    return body


def _decode_object(raw: bytes | bytearray | str) -> dict:
    try:
        value = json.loads(raw)
    except (ValueError, RecursionError):
        raise InferenceError("invalid_output") from None
    if not isinstance(value, dict):
        raise InferenceError("invalid_output")
    return value


def _raise_http_error(status: int, raw: bytes | bytearray) -> None:
    if status in (401, 403):
        raise InferenceError("auth")
    if status == 402:
        raise InferenceError("quota")
    try:
        detail = _decode_object(raw).get("error")
    except InferenceError:
        detail = None
    if isinstance(detail, dict):
        extra = detail.get("details")
        nested_code = extra.get("error_code") if isinstance(extra, dict) else None
        codes = {value for value in (detail.get("code"), detail.get("type"), nested_code) if isinstance(value, str)}
        if codes & _REFUSAL_CODES:
            raise InferenceError("refused")
        if codes & _QUOTA_CODES:
            raise InferenceError("quota")
    raise InferenceError("rate_limit" if status == 429 else "upstream")


def _request(client: httpx.Client, endpoint: str, headers: dict, body: dict | None = None) -> dict:
    lookup = body is None
    try:
        with client.stream("GET" if lookup else "POST", endpoint, headers=headers, json=body,
                           timeout=_VERIFY_TIMEOUT if lookup else _TIMEOUT, follow_redirects=False) as response:
            if lookup and response.status_code == 404:
                raise InferenceError("model_not_found")
            raw = bytearray()
            for block in response.iter_bytes(chunk_size=64 * 1024):
                raw.extend(block)
                if len(raw) > _MAX_RESPONSE_BYTES:
                    raise InferenceError("invalid_output" if response.is_success else "upstream")
            if not response.is_success:
                _raise_http_error(response.status_code, raw)
    except httpx.HTTPError:
        raise InferenceError("network") from None
    return _decode_object(raw)


def _custom_request(endpoint: str, headers: dict, body: dict | None = None) -> dict:
    lookup = body is None
    try:
        target = pinned_target(endpoint)
    except ValueError:
        raise InferenceError("endpoint") from None
    try:
        with address_session(*target) as client:
            with client.stream("GET" if lookup else "POST", endpoint, headers={"User-Agent": AI_USER_AGENT, **headers}, json=body,
                               timeout=(5, 10) if lookup else (10, 90), allow_redirects=False) as response:
                status = response.status_code
                if lookup and status == 404:
                    raise InferenceError("model_not_found")
                successful = 200 <= status < 300
                raw = bytearray()
                for block in response.iter_content():
                    raw.extend(block)
                    if len(raw) > _MAX_RESPONSE_BYTES:
                        raise InferenceError("invalid_output" if successful else "upstream")
                if not successful:
                    _raise_http_error(status, raw)
    except CurlError:
        raise InferenceError("network") from None
    return _decode_object(raw)


def _headers(provider: str, api_key: str, *, external: bool = False) -> dict[str, str]:
    if not valid_key(api_key):
        raise InferenceError("auth")
    if external and provider == "anthropic":
        return {"Accept": "application/json", "x-api-key": api_key, "anthropic-version": "2023-06-01"}
    headers = {"Accept": "application/json", "Authorization": "Bearer " + api_key}
    if provider == "anthropic":
        headers["anthropic-version"] = "2026-10-21"
    return headers


def verify_model(client: httpx.Client, provider: str, model: str, api_key: str, *, base_url: str = "",
                 external: bool = False) -> str:
    """Check catalog access with a read-only authenticated request."""
    spec = PROVIDERS.get(provider)
    if spec is None or not valid_model(model):
        raise InferenceError("provider")
    if base_url:
        if not any(row["id"] == model for row in list_models(client, provider, api_key, base_url=base_url,
                                                            external=external)):
            raise InferenceError("model_not_found")
        return model
    headers = _headers(provider, api_key)
    if provider != "deepseek":
        result = _request(client, spec.models_endpoint + "/" + quote(model, safe=""), headers)
        model_id = result.get("id")
        if not isinstance(model_id, str) or not valid_model(model_id):
            raise InferenceError("invalid_output")
        return model_id
    result = _request(client, spec.models_endpoint, headers)
    models = result.get("data")
    if not isinstance(models, list):
        raise InferenceError("invalid_output")
    if not any(isinstance(item, dict) and item.get("id") == model for item in models):
        raise InferenceError("model_not_found")
    return model


def _model_capabilities(item: dict) -> dict:
    metadata = {}
    levels = item.get("reasoning_levels")
    if not isinstance(levels, list):
        levels = item.get("supported_reasoning_levels")
    if isinstance(levels, list):
        reported = [entry.get("effort") if isinstance(entry, dict) else entry for entry in levels]
        allowed = _GPT_EFFORTS_WITH_OFF
        metadata["reasoning_levels"] = [level for level in allowed if level in reported]
    modalities = item.get("modalities")
    inputs = modalities.get("input") if isinstance(modalities, dict) else modalities
    if isinstance(inputs, list) and "text" in inputs:
        metadata["vision"] = "image" in inputs
    return metadata


def list_models(client: httpx.Client, provider: str, api_key: str, *, base_url: str = "",
                external: bool = False) -> list[dict]:
    """Return the vendor's model IDs and display names using a catalog request."""
    spec = PROVIDERS.get(provider)
    if spec is None:
        raise InferenceError("provider")
    headers = _headers(provider, api_key, external=external)
    rows: dict[str, dict] = {}
    cursors: set[str] = set()
    models_endpoint = base_url + "/models" if base_url else spec.models_endpoint
    endpoint = models_endpoint
    for _ in range(16):
        result = _custom_request(endpoint, headers) if base_url else _request(client, endpoint, headers)
        data = result.get("data")
        if not isinstance(data, list):
            raise InferenceError("invalid_output")
        for item in data:
            if not isinstance(item, dict):
                continue
            model = item.get("id")
            if not isinstance(model, str) or not valid_model(model):
                continue
            name = item.get("display_name") or (item.get("name") if external else None)
            label = name[:160] if isinstance(name, str) and name.strip() else model
            rows[model] = {"id": model, "label": label, **_model_capabilities(item)}
        if provider != "anthropic" or result.get("has_more") is not True:
            break
        cursor = result.get("last_id")
        if not isinstance(cursor, str) or not valid_model(cursor) or cursor in cursors:
            raise InferenceError("invalid_output")
        cursors.add(cursor)
        endpoint = models_endpoint + "?" + urlencode({"after_id": cursor})
    else:
        raise InferenceError("invalid_output")
    return [row for _, row in sorted(rows.items())]


def _response_text(provider: str, response: dict) -> str:
    if provider == "anthropic":
        reason = response.get("stop_reason")
        if reason == "refusal":
            raise InferenceError("refused")
        blocks = response.get("content")
        if reason != "end_turn" or not isinstance(blocks, list):
            raise InferenceError("invalid_output")
        return "".join(block["text"] for block in blocks
                       if isinstance(block, dict) and block.get("type") == "text"
                       and isinstance(block.get("text"), str))

    choices = response.get("choices")
    if not isinstance(choices, list) or not choices or not isinstance(choices[0], dict):
        raise InferenceError("invalid_output")
    choice = choices[0]
    message = choice.get("message")
    reason = choice.get("finish_reason")
    if reason == "content_filter" or (isinstance(message, dict) and message.get("refusal")):
        raise InferenceError("refused")
    if reason != "stop" or not isinstance(message, dict) or not isinstance(message.get("content"), str):
        raise InferenceError("invalid_output")
    return message["content"]


def infer(client: httpx.Client, provider: str, model: str, api_key: str, *,
          system: str, text: str, image: bytes | None = None,
          schema: dict | None = None, effort: str | None = None,
          on_usage: UsageReporter | None = None, base_url: str = "", external: bool = False) -> InferenceResult:
    """Send one inference request and report usage before validating the generated output."""
    spec = PROVIDERS.get(provider)
    if spec is None or not valid_model(model):
        raise InferenceError("provider")
    if effort is None and provider == "deepseek":
        reasoning = "none"
    else:
        custom_effort = bool(base_url and provider in ("openai", "anthropic"))
        reasoning = validated_effort(provider, model, effort or "default", external=custom_effort)
    compatible = bool(base_url and provider == "openai")
    if (compatible or external) and schema is not None:
        system += "\nThe JSON object must match this schema: " + json.dumps(schema, ensure_ascii=False)
    body = _request_body(provider, model, system, text, image, None if external else schema, reasoning, compatible=compatible)
    if external and provider == "openai":
        body.pop("response_format", None)
    headers = _headers(provider, api_key, external=external)
    response = (_custom_request(spec.inference_url(base_url), headers, body) if base_url
                else _request(client, spec.endpoint, headers, body))
    if on_usage is not None:
        report_usage(provider, response, model, on_usage)
    returned_model = response.get("model")
    if not isinstance(returned_model, str) or not valid_model(returned_model):
        returned_model = model
    return InferenceResult(returned_model, _decode_object(_response_text(provider, response)))
