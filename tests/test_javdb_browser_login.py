"""登录窗口的会话采集和本机接口使用替身浏览器。"""
from __future__ import annotations

import threading
import unittest
from pathlib import Path
from tempfile import TemporaryDirectory
from types import SimpleNamespace
from unittest.mock import Mock, patch

from fastapi import FastAPI
from fastapi.testclient import TestClient

from peach.javdb_browser_login import JavDBBrowserLogin
from peach.routes_auth import require_auth
from peach.routes_configuration import router
from peach.scraping_access import cookie_jar, save, values_for


def _cookie(domain, name, value, *, expires=-1, session=True):
    return {"domain": domain, "path": "/", "name": name, "value": value, "expires": expires,
            "session": session, "secure": True, "httpOnly": True}


class JavDBBrowserLoginTests(unittest.TestCase):
    def setUp(self):
        temporary = TemporaryDirectory()
        self.addCleanup(temporary.cleanup)
        self.root = Path(temporary.name).resolve() / "secrets"
        self.browser = Mock()
        self.browser.alive.return_value = True
        self.browser.socket.call.return_value = {
            "cookies": [_cookie(".javdb.com", "session", "local-test-value"),
                        _cookie("not-javdb.invalid", "session", "unrelated-value"),
                        _cookie(".javdb.com", "expired", "old", expires=1, session=False)],
        }
        self.factory = Mock(return_value=self.browser)
        self.login = JavDBBrowserLogin(self.root, find=lambda: "chrome", browser=self.factory,
                                      sleep=lambda _seconds: None)
        self.addCleanup(self.login.close)

    def finish(self):
        thread = self.login._thread
        assert thread is not None
        thread.join(timeout=5)
        self.assertFalse(thread.is_alive())
        return self.login.status()

    def test_captures_only_cookies_for_the_signed_in_official_origin(self):
        self.browser.evaluate.side_effect = [None, "https://different.invalid", "https://javdb.com"]
        self.assertEqual(self.login.start()["state"], "waiting")
        status = self.finish()
        self.assertEqual(status["state"], "done")
        profile = self.factory.call_args.args[1]
        self.assertEqual(profile.parent, self.root)
        self.assertFalse(profile.exists())
        self.browser.navigate.assert_called_once_with("https://javdb.com/login")
        self.browser.socket.call.assert_called_once_with("Network.getCookies", 5,
                                                        urls=["https://javdb.com/users/profile"])
        cookies = cookie_jar(values_for(self.root, "javdb"), "javdb")
        self.assertEqual([(c.name, c.value, c.domain) for c in cookies],
                         [("session", "local-test-value", ".javdb.com")])
        self.assertNotIn("local-test-value", str(status))
        self.browser.close.assert_called_once_with()

    def hold_capture(self):
        waiting = threading.Event()
        proceed = threading.Event()
        self.addCleanup(proceed.set)

        def prove(*_args, **_kwargs):
            waiting.set()
            if not proceed.wait(5):
                raise RuntimeError("login test never released its capture")
            return "https://javdb.com"

        self.browser.evaluate.side_effect = prove
        self.login.start()
        self.assertTrue(waiting.wait(5))
        return proceed

    def test_cancelling_while_capture_is_in_progress_never_saves_it(self):
        proceed = self.hold_capture()
        self.assertEqual(self.login.cancel()["state"], "cancelled")
        proceed.set()
        self.assertEqual(self.finish()["state"], "cancelled")
        self.assertEqual(values_for(self.root, "javdb"), {})

    def test_a_new_manual_cookie_wins_over_an_earlier_browser_login(self):
        proceed = self.hold_capture()
        save(self.root, "javdb", {"cookie": "session=manual-cookie"})
        proceed.set()
        self.assertEqual(self.finish()["state"], "cancelled")
        self.assertEqual(values_for(self.root, "javdb")["cookie"], "session=manual-cookie")


class JavDBBrowserLoginRouteTests(unittest.TestCase):
    URL = "/api/scraping/javdb-browser-login"

    def setUp(self):
        self.app = FastAPI()
        self.app.include_router(router)
        self.app.dependency_overrides[require_auth] = lambda: {}
        self.login = Mock()
        self.login.available.return_value = True
        self.app.state.web_contract = SimpleNamespace(javdb_browser_login=self.login)

    def test_remote_status_is_idle_and_launch_or_cancel_is_local_only(self):
        client = TestClient(self.app, base_url="http://127.0.0.1", client=("192.0.2.125", 4321))
        self.assertEqual(client.get(self.URL).json(), {"available": False, "state": "idle", "message": ""})
        self.assertEqual(client.post(self.URL).status_code, 403)
        self.assertEqual(client.post(f"{self.URL}/cancel").status_code, 403)
        self.assertEqual(self.login.mock_calls, [])

    def test_local_browser_controls_require_the_settings_origin(self):
        client = TestClient(self.app, base_url="http://127.0.0.1", client=("127.0.0.1", 4321))
        with patch("peach.error_reporting.local_event"):
            self.assertEqual(client.post(self.URL, headers={"Origin": "https://other.invalid"}).status_code, 403)
        self.login.start.assert_not_called()
        self.login.start.return_value = {"state": "waiting", "message": ""}
        started = client.post(self.URL, headers={"Origin": "http://127.0.0.1"})
        self.assertEqual(started.json(), {"available": True, "state": "waiting", "message": ""})
