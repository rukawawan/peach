from __future__ import annotations

import json
import unittest
from unittest.mock import patch

import httpx

from peach import ai_endpoints, ai_inference
from peach.ai_usage import TokenUsage


KEY = "test-key"
SYSTEM = "Return the approved fields only."
TEXT = "Synthetic catalog entry"


def reply(provider: str, content: str, *, reason: str | None = None) -> dict:
    if provider == "anthropic":
        return {"model": "served-model", "stop_reason": reason or "end_turn",
                "content": [{"type": "text", "text": content}]}
    return {"model": "served-model", "choices": [{
        "finish_reason": reason or "stop", "message": {"content": content},
    }]}


class InferenceTests(unittest.TestCase):
    def test_external_anthropic_uses_compatible_auth_and_prompt_schema(self):
        base = "https://gateway.example/v1"

        def request(endpoint, headers, body=None):
            self.assertEqual(headers["x-api-key"], KEY)
            self.assertNotIn("Authorization", headers)
            self.assertEqual(headers["anthropic-version"], "2023-06-01")
            if body is None:
                self.assertEqual(endpoint, base + "/models")
                return {"data": [{"id": "requested-model"}]}
            self.assertEqual(endpoint, base + "/messages")
            self.assertIn('"type": "object"', body["system"])
            self.assertEqual(body["output_config"], {"effort": "high"})
            return reply("anthropic", "{}")

        with patch.object(ai_inference, "_custom_request", side_effect=request), httpx.Client() as client:
            ai_inference.verify_model(client, "anthropic", "requested-model", KEY, base_url=base, external=True)
            ai_inference.infer(client, "anthropic", "requested-model", KEY, system=SYSTEM, text=TEXT,
                               schema={"type": "object"}, effort="high", base_url=base, external=True)

    def test_custom_api_uses_the_same_base_for_catalog_verification_and_inference(self):
        base = "http://127.0.0.1:11434/v1"
        paths = []

        def request(endpoint, headers, body=None):
            paths.append(endpoint)
            self.assertEqual(headers["Authorization"], "Bearer " + KEY)
            if body is None:
                return {"data": [{"id": "requested-model"}]}
            self.assertEqual(body["response_format"], {"type": "json_object"})
            return reply("openai", "{}")

        with patch.object(ai_inference, "_custom_request", side_effect=request), httpx.Client() as client:
            self.assertEqual(ai_inference.verify_model(client, "openai", "requested-model", KEY, base_url=base),
                             "requested-model")
            ai_inference.infer(client, "openai", "requested-model", KEY,
                               system=SYSTEM, text=TEXT, base_url=base)
        self.assertEqual(paths, [base + "/models", base + "/chat/completions"])

    def test_custom_api_resolves_remote_names_and_pins_the_checked_port(self):
        base = ai_endpoints.normalize_base("https://example.com:443/proxy/v1/", "8443")
        self.assertEqual(base, "https://example.com:8443/proxy/v1")
        with patch.object(ai_endpoints, "host_addresses", return_value=("1.1.1.1", "8.8.8.8")):
            self.assertEqual(ai_endpoints.pinned_target(base + "/models"), ("example.com", "1.1.1.1", 8443))
        with patch.object(ai_endpoints, "host_addresses", return_value=("1.1.1.1", "127.0.0.1")):
            with self.assertRaises(ValueError):
                ai_endpoints.pinned_target(base + "/models")
        with self.assertRaises(ValueError):
            ai_endpoints.normalize_base("http://example.com")

    def test_usage_includes_claude_cache_tokens_without_double_counting_chat_completions(self):
        cases = (
            ("anthropic", {"input_tokens": 70, "cache_creation_input_tokens": 20,
                           "cache_read_input_tokens": 10, "output_tokens": 7}, TokenUsage(100, 7)),
            ("openai", {"prompt_tokens": 100, "prompt_tokens_details": {"cached_tokens": 20},
                        "completion_tokens": 7}, TokenUsage(100, 7)),
            ("deepseek", {"prompt_tokens": 100, "prompt_cache_hit_tokens": 20,
                          "completion_tokens": 7}, TokenUsage(100, 7)),
            ("deepseek", {"prompt_tokens": False, "completion_tokens": 7}, None),
        )
        for provider, usage, expected in cases:
            with self.subTest(provider=provider, usage=usage):
                reported = []
                response = {**reply(provider, "{}"), "usage": usage}
                self.infer(provider, lambda _, response=response: httpx.Response(200, json=response),
                           on_usage=lambda model, counts, reported=reported: reported.append((model, counts)))
                self.assertEqual(reported, [("served-model", expected)])

    def test_verification_looks_up_models_without_sending_metadata(self):
        for provider, path in (("anthropic", "/v1/models/configured-model"),
                               ("openai", "/v1/models/configured-model"), ("deepseek", "/models")):
            with self.subTest(provider=provider):
                def handler(request, path=path, provider=provider):
                    self.assertEqual(request.method, "GET")
                    self.assertEqual(request.url.path, path)
                    self.assertEqual(request.content, b"")
                    self.assertEqual(request.headers["authorization"], "Bearer " + KEY)
                    model = {"id": "configured-model"}
                    result = {"data": [model]} if provider == "deepseek" else model
                    return httpx.Response(200, json=result)

                with httpx.Client(transport=httpx.MockTransport(handler)) as client:
                    self.assertEqual(ai_inference.verify_model(client, provider, "configured-model", KEY),
                                     "configured-model")

    def test_verification_distinguishes_missing_model(self):
        response = {"data": [{"id": "different-model"}]}
        with httpx.Client(transport=httpx.MockTransport(lambda _: httpx.Response(200, json=response))) as client:
            with self.assertRaises(ai_inference.InferenceError) as error:
                ai_inference.verify_model(client, "deepseek", "configured-model", KEY)
        self.assertEqual(error.exception.code, "model_not_found")

    def test_catalog_uses_each_vendor_and_follows_claude_pagination(self):
        for provider, path in (("anthropic", "/v1/models"), ("openai", "/v1/models"), ("deepseek", "/models")):
            with self.subTest(provider=provider):
                cursors = []

                def handler(request, path=path, provider=provider, cursors=cursors):
                    self.assertEqual(request.method, "GET")
                    self.assertEqual(request.url.path, path)
                    self.assertEqual(request.content, b"")
                    self.assertEqual(request.headers["authorization"], "Bearer " + KEY)
                    cursor = request.url.params.get("after_id")
                    cursors.append(cursor)
                    if provider == "anthropic" and cursor is None:
                        return httpx.Response(200, json={"data": [{"id": "another-model"}],
                                                        "has_more": True, "last_id": "another-model"})
                    return httpx.Response(200, json={"data": [{"id": "test-model", "display_name": "Test Model"},
                                                              {"id": "invalid id"}]})

                with httpx.Client(transport=httpx.MockTransport(handler)) as client:
                    models = ai_inference.list_models(client, provider, KEY)
                expected = [{"id": "test-model", "label": "Test Model"}]
                if provider == "anthropic":
                    expected.insert(0, {"id": "another-model", "label": "another-model"})
                self.assertEqual(models, expected)
                self.assertEqual(cursors, [None, "another-model"] if provider == "anthropic" else [None])

    def infer(self, provider: str, handler, **options):
        with httpx.Client(transport=httpx.MockTransport(handler), follow_redirects=True) as client:
            return ai_inference.infer(client, provider, "requested-model", KEY,
                                      system=SYSTEM, text=TEXT, **options)

    def test_routes_text_to_each_official_endpoint(self):
        endpoints = {
            "anthropic": "https://api.anthropic.com/v1/messages",
            "openai": "https://api.openai.com/v1/chat/completions",
            "deepseek": "https://api.deepseek.com/chat/completions",
        }
        for provider, endpoint in endpoints.items():
            with self.subTest(provider=provider):
                def handler(request, endpoint=endpoint, provider=provider):
                    self.assertEqual(request.method, "POST")
                    self.assertEqual(str(request.url), endpoint)
                    self.assertEqual(request.headers["authorization"], "Bearer " + KEY)
                    body = json.loads(request.content)
                    self.assertEqual(body["model"], "requested-model")
                    if provider == "anthropic":
                        self.assertEqual(request.headers["anthropic-version"], "2026-10-21")
                        self.assertIn("JSON", body["system"])
                        self.assertEqual(body["messages"], [
                            {"role": "user", "content": [{"type": "text", "text": TEXT}]},
                        ])
                    else:
                        self.assertEqual(body["response_format"], {"type": "json_object"})
                        self.assertIn("JSON", body["messages"][0]["content"])
                        self.assertEqual(body["messages"][1], {"role": "user", "content": TEXT})
                        if provider == "openai":
                            self.assertIs(body["store"], False)
                        else:
                            self.assertEqual(body["reasoning_effort"], "none")
                    return httpx.Response(200, json=reply(provider, '{"tags":[]}'))

                self.assertEqual(self.infer(provider, handler),
                                 ai_inference.InferenceResult("served-model", {"tags": []}))

    def test_sends_the_jpeg_in_the_vendor_message(self):
        for provider in ai_inference.PROVIDERS:
            with self.subTest(provider=provider):
                def handler(request, provider=provider):
                    body = json.loads(request.content)
                    image = body["messages"][-1]["content"][-1]
                    if provider == "anthropic":
                        self.assertEqual(image, {"type": "image", "source": {
                            "type": "base64", "media_type": "image/jpeg", "data": "AQID",
                        }})
                    else:
                        self.assertEqual(image, {"type": "image_url", "image_url": {
                            "url": "data:image/jpeg;base64,AQID",
                        }})
                    return httpx.Response(200, json=reply(provider, '{"tags": ["Glasses"]}'))

                self.assertEqual(self.infer(provider, handler, image=b"\x01\x02\x03").data,
                                 {"tags": ["Glasses"]})

    def test_uses_each_vendors_supported_structured_output_format(self):
        schema = {"type": "object", "properties": {"title": {"type": "string"}},
                  "required": ["title"], "additionalProperties": False}
        for provider in ai_inference.PROVIDERS:
            with self.subTest(provider=provider):
                def handler(request, provider=provider):
                    body = json.loads(request.content)
                    if provider == "anthropic":
                        self.assertEqual(body["output_config"], {
                            "format": {"type": "json_schema", "schema": schema},
                        })
                    elif provider == "openai":
                        self.assertEqual(body["response_format"], {
                            "type": "json_schema", "json_schema": {
                                "name": "peach_result", "strict": True, "schema": schema,
                            },
                        })
                    else:
                        self.assertEqual(body["response_format"], {"type": "json_object"})
                    return httpx.Response(200, json=reply(provider, '{"title":"Translated"}'))

                self.assertEqual(self.infer(provider, handler, schema=schema).data, {"title": "Translated"})

    def test_reasoning_effort_is_encoded_for_the_selected_model_and_provider(self):
        for provider, model in (("anthropic", "claude-haiku-5-5"), ("openai", "gpt-6-luna"),
                                ("openai", "gpt-6.1-terra"),
                                ("deepseek", "deepseek-flash")):
            with self.subTest(provider=provider):
                def handler(request, provider=provider):
                    body = json.loads(request.content)
                    if provider == "anthropic":
                        self.assertEqual(body["output_config"]["effort"], "low")
                    else:
                        self.assertEqual(body["reasoning_effort"], "low")
                    return httpx.Response(200, json=reply(provider, '{"tags":[]}'))

                with httpx.Client(transport=httpx.MockTransport(handler)) as client:
                    ai_inference.infer(client, provider, model, KEY, system=SYSTEM, text=TEXT, effort="low")
                    with self.assertRaises(ai_inference.InferenceError):
                        ai_inference.infer(client, provider, model, KEY, system=SYSTEM, text=TEXT, effort="unsupported")

    def test_classifies_http_errors_without_exposing_upstream_details(self):
        cases = [
            (401, "invalid_api_key", "auth"),
            (402, "", "quota"),
            (429, "insufficient_quota", "quota"),
            (429, "", "rate_limit"),
            (400, "content_policy_violation", "refused"),
            (500, "", "upstream"),
        ]
        for status, upstream_code, code in cases:
            with self.subTest(status=status, upstream_code=upstream_code):
                def handler(_request, status=status, upstream_code=upstream_code):
                    return httpx.Response(status, json={"error": {"code": upstream_code, "message": KEY}})

                with self.assertRaises(ai_inference.InferenceError) as context:
                    self.infer("openai", handler)
                self.assertEqual(context.exception.code, code)
                self.assertNotIn(KEY, str(context.exception))

    def test_treats_claude_monthly_spend_cap_as_quota(self):
        def handler(_request):
            return httpx.Response(429, json={"error": {
                "type": "rate_limit_error", "details": {"error_code": "enforced_spend_limit_reached"},
            }})

        with self.assertRaises(ai_inference.InferenceError) as context:
            self.infer("anthropic", handler)
        self.assertEqual(context.exception.code, "quota")

    def test_distinguishes_refusal_truncation_and_invalid_json_from_empty_results(self):
        cases = [
            ("anthropic", "refusal", "{}", "refused"),
            ("openai", "content_filter", "{}", "refused"),
            ("deepseek", "length", "{}", "invalid_output"),
            ("anthropic", "max_tokens", "{}", "invalid_output"),
            ("deepseek", "stop", "    ", "invalid_output"),
            ("openai", "stop", "[]", "invalid_output"),
        ]
        for provider, reason, content, code in cases:
            with self.subTest(provider=provider, reason=reason, content=content):
                response = reply(provider, content, reason=reason)
                with self.assertRaises(ai_inference.InferenceError) as context:
                    self.infer(provider, lambda _, response=response: httpx.Response(200, json=response))
                self.assertEqual(context.exception.code, code)

    def test_does_not_forward_request_on_redirect(self):
        requests = []

        def handler(request):
            requests.append(str(request.url))
            return httpx.Response(307, headers={"Location": "https://example.net/request"})

        with self.assertRaises(ai_inference.InferenceError) as context:
            self.infer("deepseek", handler, image=b"private")
        self.assertEqual(context.exception.code, "upstream")
        self.assertEqual(requests, ["https://api.deepseek.com/chat/completions"])

    def test_maps_transport_failure_without_retry(self):
        def handler(request):
            raise httpx.ReadTimeout(KEY, request=request)

        with self.assertRaises(ai_inference.InferenceError) as context:
            self.infer("anthropic", handler)
        self.assertEqual(context.exception.code, "network")
        self.assertNotIn(KEY, str(context.exception))
