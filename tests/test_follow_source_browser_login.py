"""来源登录把已验证的会话保存到现有连接器读取的凭据文件。"""
from __future__ import annotations

import json
import threading
import unittest
from pathlib import Path
from tempfile import TemporaryDirectory
from types import SimpleNamespace
from unittest.mock import Mock, patch

import httpx
from bs4 import BeautifulSoup
from fastapi import FastAPI
from fastapi.testclient import TestClient

from peach.follow_secrets import CredentialStore
from peach.follow_sources import FanboxConnector, F95ZoneConnector, IwaraConnector, SimpCityConnector
from peach.http import HttpResponse
from peach.routes_auth import require_auth
from peach.routes_configuration import router
from peach.scraping_access import cookie_jar, save, values_for
from peach.source_browser_login import SourceBrowserLogin
from peach.web_follow import q_follow_credentials, w_follow_credential
import test_follow_sources as follow_fixtures
from test_follow_sources import (
    F95_HTML, FANBOX_DETAIL_JSON, FANBOX_JSON, GOFILE_JSON, SIMPCITY_FIRST_HTML, SIMPCITY_LAST_HTML,
)


def _cookie(domain, name, value, **fields):
    return {"domain": domain, "path": "/", "name": name, "value": value, "expires": -1,
            "session": True, "secure": True, "httpOnly": True, **fields}


def _token_events(url, request_id, *, status=200):
    return [
        {"method": "Network.responseReceived", "params": {
            "requestId": request_id, "response": {"url": url, "status": status, "mimeType": "application/json"}}},
        {"method": "Network.loadingFinished", "params": {"requestId": request_id}},
    ]


class SourceBrowserLoginTests(unittest.TestCase):
    def setUp(self):
        temporary = TemporaryDirectory()
        self.addCleanup(temporary.cleanup)
        self.root = Path(temporary.name).resolve() / "secrets"
        self.store = CredentialStore(self.root)
        self.contract = SimpleNamespace(follow_secrets_root=self.root, follow_shared_root=None,
                                        source_browser_logins={})

    def login(self, source):
        browser = Mock()
        browser.alive.return_value = True
        factory = Mock(return_value=browser)
        login = SourceBrowserLogin(self.root, source, find=lambda: "chrome", browser=factory,
                                  sleep=lambda _seconds: None)
        self.contract.source_browser_logins[source] = login
        self.addCleanup(login.close)
        return login, browser, factory

    def finish(self, login, state="done"):
        assert login._thread is not None
        login._thread.join(5)
        self.assertFalse(login._thread.is_alive())
        self.assertEqual(login.status()["state"], state)
        return login.status()

    def test_follow_lists_sources_with_a_login_window(self):
        providers = q_follow_credentials(self.contract, {})["providers"]
        self.assertEqual({row["provider"] for row in providers if row["browser_login"]},
                         {"simpcity", "f95zone", "iwara", "fanbox"})

    def test_xenforo_uses_the_signed_in_page_cookie_prefix_and_the_thread_connector_reads_it(self):
        html = BeautifulSoup(SIMPCITY_FIRST_HTML, "html.parser")
        assert html.html is not None
        prefix = html.html["data-cookie-prefix"]
        for source, origin, cookie_prefix, connector, ref in (
            ("simpcity", "https://simpcity.cr", prefix, SimpCityConnector, "4242"),
            ("f95zone", "https://f95zone.to", "xf_", F95ZoneConnector, "50685"),
        ):
            with self.subTest(source=source):
                login, browser, factory = self.login(source)
                browser.evaluate.side_effect = [None, {"origin": "https://wrong.invalid", "prefix": cookie_prefix},
                                                {"origin": origin, "prefix": cookie_prefix}]
                host = origin.removeprefix("https://")
                browser.socket.call.return_value = {
                    "cookies": [_cookie(host, f"{cookie_prefix}session", "fixture-session"),
                                _cookie(host, f"{cookie_prefix}user", "fixture-account"),
                                _cookie(host, f"{cookie_prefix}csrf", "csrf-token"),
                                _cookie(host, "cf_clearance", "challenge-token"),
                                _cookie("unrelated.invalid", f"{cookie_prefix}session", "wrong-site")],
                }
                self.assertEqual(login.start()["state"], "waiting")
                status = self.finish(login)
                self.assertNotIn("fixture-session", json.dumps(status))
                browser.navigate.assert_called_once_with(origin + "/login/")
                browser.socket.call.assert_called_once_with("Network.getCookies", 5, urls=[origin + "/"])
                profile = factory.call_args.args[1]
                self.assertEqual(profile.parent, self.root)
                self.assertFalse(profile.exists())
                seen = []

                def transport(request, *_, fixture_source=source, requests=seen):
                    requests.append(request)
                    if fixture_source == "f95zone":
                        return HttpResponse(200, {}, F95_HTML)
                    html = SIMPCITY_LAST_HTML if "/page-" in request.url else SIMPCITY_FIRST_HTML
                    return HttpResponse(200, {}, html)

                credential = self.store.load(source)
                result = connector(credential=credential, transport=transport).fetch(ref)
                self.assertTrue(result.candidates)
                self.assertTrue(all(request.headers["Cookie"]
                                    == f"{cookie_prefix}session=fixture-session; {cookie_prefix}user=fixture-account"
                                    for request in seen))

    def test_iwara_uses_the_completed_first_party_access_token_on_profile_and_video_reads(self):
        login, browser, _factory = self.login("iwara")

        def navigate(_url):
            api = "https://apiq.iwara.tv/user/"
            for url, request_id, status in (
                (api + "login", "login", 200),
                (api + "token", "rejected", 401),
                ("https://iwara.invalid/user/token", "unrelated", 200),
            ):
                for message in _token_events(url, request_id, status=status):
                    browser.socket.on_event(message)
            browser.socket.on_event(_token_events(api + "token", "access")[0])

        def page(*_args, **_kwargs):
            if browser.evaluate.call_count == 2:
                browser.socket.on_event(_token_events("https://apiq.iwara.tv/user/token", "access")[1])
            return {"origin": "https://www.iwara.tv"}

        browser.navigate.side_effect = navigate
        browser.evaluate.side_effect = page
        browser.socket.call.return_value = {
            "body": '{"accessToken":"test.access.token","refreshToken":"do-not-save"}', "base64Encoded": False,
        }
        login.start()
        self.finish(login)
        browser.socket.call.assert_called_once_with("Network.getResponseBody", 5, requestId="access")
        credential = self.store.load("iwara")
        self.assertEqual(credential.values, {"access_token": "test.access.token"})
        seen = []

        def transport(request, *_):
            seen.append(request)
            payload = (follow_fixtures.IwaraConnectorTests.PROFILE if "/profile/" in request.url
                       else {"results": [follow_fixtures.IwaraConnectorTests.VIDEO]})
            return HttpResponse(200, {}, json.dumps(payload).encode())

        result = IwaraConnector(credential=credential, transport=transport).fetch("creator")
        self.assertTrue(result.candidates)
        self.assertEqual([request.headers.get("Authorization") for request in seen],
                         ["Bearer test.access.token"] * 2)

    def test_fanbox_waits_for_pixiv_sso_and_sends_only_a_fanbox_account_session(self):
        login, browser, _factory = self.login("fanbox")
        origin = {"origin": "https://www.fanbox.cc"}
        browser.evaluate.side_effect = [origin, {"origin": "https://accounts.pixiv.net"}, origin]
        browser.socket.call.side_effect = [
            {"cookies": [_cookie(".fanbox.cc", "FANBOXSESSID", "0_guest")]},
            {"cookies": [_cookie(".pixiv.net", "PHPSESSID", "pixiv-sso"),
                        _cookie(".fanbox.cc", "FANBOXSESSID", "42_test-session")]},
        ]
        login.start()
        self.finish(login)
        self.assertEqual(browser.socket.call.call_count, 2)
        seen = []

        def transport(request, *_):
            seen.append(request)
            if "api.gofile.io" in request.url:
                return HttpResponse(200, {}, GOFILE_JSON)
            return HttpResponse(200, {}, FANBOX_DETAIL_JSON if "post.info" in request.url else FANBOX_JSON)

        result = FanboxConnector(credential=self.store.load("fanbox"), transport=transport).fetch("ffxivinitiala")
        self.assertTrue(result.candidates)
        requests = [request for request in seen if "api.fanbox.cc" in request.url]
        self.assertTrue(requests)
        self.assertTrue(all(request.headers.get("Cookie") == "FANBOXSESSID=42_test-session" for request in requests))
        self.assertIsNone(self.store.load("pixiv"))

    def test_fc2cmadb_writes_the_authenticated_article_cookie_jar(self):
        save(self.root, "fc2cmadb", {"network": "direct"})
        login, browser, _factory = self.login("fc2cmadb")
        browser.evaluate.side_effect = [None, {"origin": "https://fc2cmadb.com"}]
        browser.socket.call.return_value = {"cookies": [
            _cookie(".fc2cmadb.com", "fc2cmadb-session", "test-session%3D"),
            _cookie(".fc2cmadb.com", "XSRF-TOKEN", "csrf-token"),
            _cookie(".fc2cmadb.com", "another-session", "another-token"),
            _cookie(".fc2ppvdb.com", "fc2cmadb-session", "different-site"),
        ]}
        login.start()
        self.finish(login)
        browser.navigate.assert_called_once_with("https://fc2cmadb.com/login")
        browser.socket.call.assert_called_once_with("Network.getCookies", 5, urls=["https://fc2cmadb.com/articles/"])
        values = values_for(self.root, "fc2cmadb")
        self.assertEqual(values["network"], "direct")
        self.assertIsNone(self.store.load("fc2cmadb"))
        with httpx.Client(cookies=cookie_jar(values, "fc2cmadb")) as client:
            request = client.build_request("GET", "https://fc2cmadb.com/articles/1234567")
        self.assertEqual(request.headers["Cookie"], "fc2cmadb-session=test-session%3D")

    def hold_capture(self):
        login, browser, _factory = self.login("f95zone")
        entered = threading.Event()
        proceed = threading.Event()
        self.addCleanup(proceed.set)

        def evaluate(*_args, **_kwargs):
            entered.set()
            if not proceed.wait(5):
                raise RuntimeError("test did not release the browser login")
            return {"origin": "https://f95zone.to", "prefix": "xf_"}

        browser.evaluate.side_effect = evaluate
        browser.socket.call.return_value = {"cookies": [_cookie("f95zone.to", "xf_user", "old-attempt")]}
        login.start()
        self.assertTrue(entered.wait(5))
        return login, proceed

    def test_manual_revoke_cancels_a_waiting_flow_even_when_there_is_no_file(self):
        login, proceed = self.hold_capture()
        self.assertTrue(w_follow_credential(self.contract, {"provider": "f95zone", "values": {}})["cleared"])
        proceed.set()
        self.finish(login, "cancelled")
        self.assertIsNone(self.store.load("f95zone"))

    def test_a_new_credential_file_wins_over_a_waiting_flow(self):
        login, proceed = self.hold_capture()
        self.store.save("f95zone", {"cookie": "xf_user=manual"})
        proceed.set()
        self.finish(login, "cancelled")
        self.assertEqual(self.store.load("f95zone").values, {"cookie": "xf_user=manual"})


class SourceBrowserLoginRouteTests(unittest.TestCase):
    URL = "/api/source-browser-login/f95zone"

    def setUp(self):
        app = FastAPI()
        app.include_router(router)
        app.dependency_overrides[require_auth] = lambda: {}
        self.login = Mock()
        self.login.available.return_value = True
        self.login.start.return_value = {"message": "", "state": "waiting"}
        self.login.cancel.return_value = {"message": "", "state": "cancelled"}
        app.state.web_contract = SimpleNamespace(source_browser_logins={"f95zone": self.login})
        self.local = TestClient(app, base_url="http://127.0.0.1", client=("127.0.0.1", 4321))
        self.remote = TestClient(app, base_url="http://127.0.0.1", client=("192.0.2.125", 4321))

    def test_remote_and_cross_origin_requests_cannot_launch_or_cancel(self):
        self.assertEqual(self.remote.get(self.URL).json(), {"available": False, "state": "idle", "message": ""})
        self.assertEqual(self.remote.post(self.URL).status_code, 403)
        self.assertEqual(self.remote.post(f"{self.URL}/cancel").status_code, 403)
        with patch("peach.error_reporting.local_event"):
            self.assertEqual(self.local.post(self.URL, headers={"Origin": "https://different.invalid"}).status_code, 403)
        self.assertEqual(self.login.mock_calls, [])

    def test_local_same_origin_controls_and_unknown_source(self):
        self.assertEqual(self.local.get("/api/source-browser-login/unknown").status_code, 404)
        headers = {"Origin": "http://127.0.0.1"}
        self.assertEqual(self.local.post(self.URL, headers=headers).json(),
                         {"available": True, "state": "waiting", "message": ""})
        self.assertEqual(self.local.post(f"{self.URL}/cancel", headers=headers).json(),
                         {"available": True, "state": "cancelled", "message": ""})
