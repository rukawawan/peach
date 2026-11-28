from __future__ import annotations

import hashlib
import json
import tempfile
import time
import unittest
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import patch
from urllib.parse import parse_qs, urlsplit

import httpx
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.asymmetric import padding, rsa

from peach import ai_openai_oauth as oauth
from peach.ai_credentials import store_for
from peach.ai_inference import InferenceError


ISSUED_CLIENT = "oaiapp_test"
CALLBACK_CODE = "oauth-code-fixture"
PEACH_RESULT_URL = "http://127.0.0.1:8080" + oauth.RESULT_PATH


def tokens(*, access="access-fixture", refresh="refresh-fixture", scope=oauth._SCOPE):
    return {"access_token": access, "refresh_token": refresh, "expires_in": 3600,
            "scope": scope, "token_type": "Bearer"}


def session(*, expires_at=None, scopes=None):
    return {"client_id": ISSUED_CLIENT, "subject": "synthetic-user", "model": oauth.DEFAULT_MODEL,
            "access_token": "access-fixture", "refresh_token": "refresh-fixture",
            "expires_at": time.time() + 3600 if expires_at is None else expires_at,
            "scopes": oauth._SCOPE.split() if scopes is None else scopes}


def sse(*events):
    body = "".join("event: " + event["type"] + "\ndata: " + json.dumps(event) + "\n\n" for event in events)
    return httpx.Response(200, text=body, headers={"content-type": "text/event-stream"})


class OpenAiOAuthTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls._private_key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
        public = cls._private_key.public_key().public_numbers()
        cls._jwks = {"keys": [{
            "kid": "test-key-id", "kty": "RSA", "alg": "RS256", "use": "sig",
            "n": oauth._encode(public.n.to_bytes(256, "big")),
            "e": oauth._encode(public.e.to_bytes(3, "big")),
        }]}

    def setUp(self):
        self.temp = self.enterContext(tempfile.TemporaryDirectory())
        self.enterContext(patch.object(oauth, "_dpapi", side_effect=lambda data, **_kwargs: data[::-1]))

    def state(self, handler):
        client = self.enterContext(httpx.Client(transport=httpx.MockTransport(handler), follow_redirects=True))
        return SimpleNamespace(settings=SimpleNamespace(secrets_root=Path(self.temp)),
                               http_transport=SimpleNamespace(client=client))

    def signed_id_token(self, nonce, **claims_override):
        header = {"kid": "test-key-id", "alg": "RS256"}
        claims = {"iss": oauth._ISSUER, "aud": ISSUED_CLIENT, "nonce": nonce,
                  "exp": int(time.time()) + 3600, "sub": "synthetic-user",
                  "email": "sample@example.test", "email_verified": True}
        claims.update(claims_override)
        parts = ".".join(oauth._encode(json.dumps(item).encode("utf-8")) for item in (header, claims))
        signature = self._private_key.sign(parts.encode("ascii"), padding.PKCS1v15(), hashes.SHA256())
        return parts + "." + oauth._encode(signature)

    def wait_for_callback(self, state):
        deadline = time.monotonic() + 5
        while time.monotonic() < deadline:
            current = oauth.status(state)
            if current["status"] != "pending":
                return current
            time.sleep(0.01)
        self.fail("authorization listener did not settle")

    def test_completes_dynamic_registration_through_loopback_and_reuses_host(self):
        metadata = {}
        exchanges = []

        def upstream(request):
            if str(request.url) == oauth._JWKS:
                return httpx.Response(200, json=self._jwks)
            self.assertEqual(str(request.url), oauth._TOKEN)
            self.assertEqual(request.method, "POST")
            form = {key: value[0] for key, value in parse_qs(request.content.decode("ascii")).items()}
            exchanges.append(form["grant_type"])
            self.assertEqual(form["client_id"], ISSUED_CLIENT)
            self.assertEqual(form["code"], CALLBACK_CODE)
            self.assertEqual(form["redirect_uri"], metadata["redirect_uri"][0])
            challenge = oauth._encode(hashlib.sha256(form["code_verifier"].encode("ascii")).digest())
            self.assertEqual(challenge, metadata["code_challenge"][0])
            self.assertEqual(form["resource"], oauth._RESOURCE)
            return httpx.Response(200, json={**tokens(), "id_token": self.signed_id_token(metadata["nonce"][0])})

        state = self.state(upstream)
        started = oauth.start(state, result_url=PEACH_RESULT_URL)
        self.assertEqual(started["status"], "pending")
        self.assertEqual(oauth.start(state, result_url=PEACH_RESULT_URL)["authorization_url"], started["authorization_url"])
        authorization = urlsplit(started["authorization_url"])
        self.assertEqual((authorization.scheme, authorization.netloc), ("https", "auth.openai.com"))
        metadata = parse_qs(authorization.query)
        self.assertEqual(metadata["client_id"], ["dynamic_agent_client"])
        self.assertEqual(metadata["agent_name_hint"], ["Peach"])
        self.assertIn(oauth._USAGE, metadata["scope"][0].split())
        redirect = metadata["redirect_uri"][0]
        self.assertEqual((urlsplit(redirect).hostname, urlsplit(redirect).path), ("127.0.0.1", "/auth/callback"))
        with httpx.Client(timeout=8, trust_env=False) as browser:
            wrong = browser.get(redirect, params={"state": "wrong", "code": CALLBACK_CODE, "client_id": ISSUED_CLIENT})
            self.assertEqual(wrong.status_code, 400)
            self.assertEqual(exchanges, [])
            correct = browser.get(redirect, params={
                "state": metadata["state"][0], "code": CALLBACK_CODE, "client_id": ISSUED_CLIENT,
            })
        self.assertEqual(correct.status_code, 303)
        self.assertEqual(correct.headers["location"], PEACH_RESULT_URL)
        self.assertEqual(correct.headers["referrer-policy"], "no-referrer")
        self.assertEqual(correct.content, b"")
        self.assertEqual(exchanges, ["authorization_code"])
        self.assertEqual(self.wait_for_callback(state), {
            "status": "connected", "configured": True, "model": oauth.DEFAULT_MODEL, "email": "sample@example.test",
        })
        self.assertNotIn("access-fixture", str(oauth.status(state)))
        next_query = parse_qs(urlsplit(oauth.start(state, result_url=PEACH_RESULT_URL)["authorization_url"]).query)
        self.assertEqual(next_query["client_id"], [ISSUED_CLIENT])
        self.assertEqual(next_query["ext_agent_host_id"], metadata["ext_agent_host_id"])
        self.assertNotEqual(next_query["state"], metadata["state"])
        self.assertNotIn("agent_name_hint", next_query)
        self.assertNotIn("id_token_hint", next_query)
        attempt = oauth._PENDING[store_for(state).root]
        attempt.stop.set()
        self.wait_for_callback(state)

    def test_declined_consent_returns_to_peach_after_recording_the_result(self):
        state = self.state(lambda _request: self.fail("declined consent must not call OpenAI"))
        started = oauth.start(state, result_url=PEACH_RESULT_URL)
        query = parse_qs(urlsplit(started["authorization_url"]).query)
        with httpx.Client(timeout=8, trust_env=False) as browser:
            declined = browser.get(query["redirect_uri"][0], params={
                "state": query["state"][0], "error": "access_denied",
            })
        self.assertEqual(declined.status_code, 303)
        self.assertEqual(declined.headers["location"], PEACH_RESULT_URL)
        self.assertEqual(oauth.status(state)["error"], "permission_required")
        self.assertFalse(oauth.status(state)["configured"])

    def test_verifies_id_token_signature_and_claims(self):
        def upstream(request):
            self.assertEqual(str(request.url), oauth._JWKS)
            return httpx.Response(200, json=self._jwks)

        client = self.state(upstream).http_transport.client
        valid = self.signed_id_token("nonce-fixture")
        self.assertEqual(oauth._verify_id_token(client, valid, ISSUED_CLIENT, "nonce-fixture")["sub"], "synthetic-user")
        header_and_claims, signature = valid.rsplit(".", 1)
        invalid_signature = ("B" if signature[0] == "A" else "A") + signature[1:]
        invalid = [
            self.signed_id_token("wrong"),
            self.signed_id_token("nonce-fixture", iss="https://example.test"),
            self.signed_id_token("nonce-fixture", aud="oaiapp_other"),
            self.signed_id_token("nonce-fixture", exp=1),
            header_and_claims + "." + invalid_signature,
        ]
        for token in invalid:
            with self.assertRaises(InferenceError) as caught:
                oauth._verify_id_token(client, token, ISSUED_CLIENT, "nonce-fixture")
            self.assertEqual(caught.exception.code, "auth")

    def test_inference_requires_granted_plan_scope(self):
        state = self.state(lambda _request: self.fail("must not make a model request"))
        oauth._protected_store(store_for(state), session(scopes=["openid"]))
        self.assertEqual(oauth.status(state)["status"], "permission_required")
        self.assertFalse(oauth.status(state)["configured"])
        with self.assertRaises(InferenceError) as caught:
            oauth.infer_oauth(state, system="Fixture", text="Fixture")
        self.assertEqual(caught.exception.code, "permission_required")

    def test_picks_and_saves_a_model_from_the_connected_account_catalog(self):
        def upstream(request):
            self.assertEqual(request.method, "GET")
            self.assertEqual(str(request.url), oauth._RESOURCE + "/models")
            return httpx.Response(200, json={"models": [
                {"slug": "picked-model", "display_name": "Picked model", "visibility": "list"},
                {"slug": "hidden-model", "display_name": "Hidden model", "visibility": "hide"},
            ]})

        state = self.state(upstream)
        store = store_for(state)
        oauth._protected_store(store, session())
        self.assertEqual(oauth.models(state), {"models": [{"id": "picked-model", "label": "Picked model"}]})
        self.assertEqual(oauth.set_model(state, "picked-model")["model"], "picked-model")
        with self.assertRaises(InferenceError) as caught:
            oauth.set_model(state, "hidden-model")
        self.assertEqual(caught.exception.code, "model_not_found")
        self.assertEqual(oauth._session(store)["model"], "picked-model")

    def test_refreshes_rotating_token_and_waits_for_completed_image_response(self):
        order = []
        schema = {"type": "object", "properties": {"tags": {"type": "array", "items": {"type": "string"}}},
                  "required": ["tags"], "additionalProperties": False}

        def upstream(request):
            if str(request.url) == oauth._TOKEN:
                form = parse_qs(request.content.decode("ascii"))
                self.assertEqual(form, {
                    "grant_type": ["refresh_token"], "client_id": [ISSUED_CLIENT],
                    "refresh_token": ["refresh-fixture"], "resource": [oauth._RESOURCE],
                })
                order.append("refresh")
                return httpx.Response(200, json=tokens(access="rotated-access", refresh="rotated-refresh"))
            self.assertEqual(str(request.url), oauth._RESOURCE + "/responses")
            self.assertEqual(request.headers["authorization"], "Bearer rotated-access")
            body = json.loads(request.content)
            self.assertTrue(body["stream"])
            self.assertFalse(body["store"])
            self.assertNotIn("max_output_tokens", body)
            self.assertEqual(body["input"][0]["content"][1]["image_url"], "data:image/jpeg;base64,AQID")
            self.assertEqual(body["text"]["format"]["schema"], schema)
            order.append("infer")
            return sse(
                {"type": "response.output_text.delta", "delta": "partial"},
                {"type": "response.completed", "response": {"model": "served-model", "output": [
                    {"type": "message", "content": [{"type": "output_text", "text": '{"tags":["glasses"]}'}]},
                ]}},
            )

        state = self.state(upstream)
        store = store_for(state)
        oauth._protected_store(store, session(expires_at=1))
        result = oauth.infer_oauth(state, system="System", text="Sample", image=b"\x01\x02\x03", schema=schema)
        self.assertEqual(result.model, "served-model")
        self.assertEqual(result.data, {"tags": ["glasses"]})
        self.assertEqual(oauth._session(store)["refresh_token"], "rotated-refresh")
        self.assertEqual(order, ["refresh", "infer"])

    def test_counts_usage_from_the_terminal_event_when_output_is_incomplete(self):
        event = {"type": "response.incomplete", "response": {"model": "served-model",
                 "usage": {"input_tokens": 65, "output_tokens": 19,
                           "output_tokens_details": {"reasoning_tokens": 3}}}}
        state = self.state(lambda _request: sse(event))
        oauth._protected_store(store_for(state), session())
        reported = []
        with self.assertRaises(InferenceError):
            oauth.infer_oauth(state, system="System", text="Sample",
                              on_usage=lambda model, usage: reported.append((model, usage.input_tokens, usage.output_tokens)))
        self.assertEqual(reported, [("served-model", 65, 19)])

    def test_inference_maps_stream_quota_and_rejects_an_incomplete_stream(self):
        for event, expected in [
            ({"type": "response.failed", "response": {"error": {
                "code": "subscription_sharing_usage_limit_exceeded",
            }}}, "quota"),
            ({"type": "response.output_text.delta", "delta": "{}"}, "invalid_output"),
        ]:
            with self.subTest(expected=expected):
                state = self.state(lambda _request, event=event: sse(event))
                oauth._protected_store(store_for(state), session())
                with self.assertRaises(InferenceError) as caught:
                    oauth.infer_oauth(state, system="System", text="Sample")
                self.assertEqual(caught.exception.code, expected)

    def test_disconnect_revokes_and_forgets_local_session(self):
        def upstream(request):
            if str(request.url) == oauth._DISCOVERY:
                return httpx.Response(200, json={
                    "issuer": oauth._ISSUER, "revocation_endpoint": oauth._ISSUER + "/api/accounts/oauth/revoke",
                })
            self.assertEqual(str(request.url), oauth._ISSUER + "/api/accounts/oauth/revoke")
            self.assertEqual(parse_qs(request.content.decode("ascii")), {
                "token": ["refresh-fixture"], "token_type_hint": ["refresh_token"], "client_id": [ISSUED_CLIENT],
            })
            return httpx.Response(200)

        state = self.state(upstream)
        store = store_for(state)
        oauth._protected_store(store, session())
        self.assertTrue(oauth.disconnect(state)["revoked"])
        self.assertEqual(oauth.status(state)["status"], "disconnected")
        self.assertIsNone(store.load(oauth._ENTRY))
