"""可选密码、会话期限与本机管理边界。"""
import tempfile
import unittest
from dataclasses import replace
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import patch

import httpx
from fastapi import FastAPI, Depends

from peach import access, routes_auth, routes_configuration


class AccessTests(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.path = Path(self.tmp.name).resolve() / "access.json"
        self.app = FastAPI()
        self.app.state.settings = SimpleNamespace(token="internal-test-token", access_path=self.path, configured=True, mdns_name="peach")
        self.app.include_router(routes_auth.router)
        self.app.include_router(routes_configuration.router)
        @self.app.get("/private")
        def private(_=Depends(routes_auth.require_auth)):
            return {"ok": True}
        @self.app.post("/private")
        def write_private(_=Depends(routes_auth.require_auth)):
            return {"ok": True}
        self.client = httpx.AsyncClient(transport=httpx.ASGITransport(app=self.app, client=("127.0.0.1", 1234)), base_url="http://localhost")
        self.addAsyncCleanup(self.client.aclose)
        routes_auth._ATTEMPTS.clear()

    async def login(self, password="correct-password", days=7):
        return await self.client.post("/login", data={"token": password, "days": str(days)})

    async def test_open_access_accepts_first_visit_without_exposing_internal_token(self):
        access.save(self.path, "")
        self.assertEqual((await self.client.get("/private")).status_code, 200)
        page = await self.client.get("/login")
        self.assertEqual(page.status_code, 303)
        self.assertNotIn("internal-test-token", page.text)
        self.assertFalse(self.client.cookies)
        self.assertEqual((await self.client.post("/private", headers={"Origin": "https://evil.example"})).status_code, 403)

    async def test_same_origin_normalizes_default_ports_and_preserves_cross_origin_rejection(self):
        access.save(self.path, '')
        for address, origin in (('http://nas.example:80', 'http://nas.example'),
                                ('http://nas.example', 'http://nas.example:80'),
                                ('https://nas.example:443', 'https://nas.example'),
                                ('https://nas.example', 'https://nas.example:443')):
            with self.subTest(address=address, origin=origin):
                async with httpx.AsyncClient(transport=httpx.ASGITransport(app=self.app), base_url=address) as client:
                    self.assertEqual((await client.post('/private', headers={'Origin': origin})).status_code, 200)
                    for refused in ('https://evil.example', 'http://nas.example:8080'):
                        response = await client.post('/private', headers={'Origin': refused})
                        self.assertEqual(response.status_code, 403)
                    response = await client.post('/private', headers={'Origin': origin, 'Sec-Fetch-Site': 'cross-site'})
                    self.assertEqual(response.status_code, 403)

    async def test_browser_asserted_same_origin_wins_over_a_rewritten_host_and_leaves_evidence(self):
        """本机软件改写 Host、浏览器发 `Origin: null` 时以 Sec-Fetch-Site 为准；对不上的形态写本机取证。"""
        access.save(self.path, '')
        with patch.object(routes_auth, '_MISMATCH_SEEN', {}), patch('peach.error_reporting.local_event') as event:
            for origin in ('http://127.0.0.1:8900', 'null'):
                response = await self.client.post('/private', headers={
                    'Origin': origin, 'Sec-Fetch-Site': 'same-origin', 'User-Agent': 'UnitBrowser/1'})
                self.assertEqual(response.status_code, 200, origin)
            for refused in ({'Origin': 'https://evil.example', 'Sec-Fetch-Site': 'same-site'},
                            {'Sec-Fetch-Site': 'cross-site'}):
                self.assertEqual((await self.client.post('/private', headers=refused)).status_code, 403)
            self.assertEqual((await self.client.post('/private', headers={'Origin': 'http://localhost'})).status_code, 200)
        rows = [call.kwargs for call in event.call_args_list]
        self.assertEqual([(row['accepted'], row['origin_class']) for row in rows],
                         [(True, 'url'), (True, 'null'), (False, 'url'), (False, 'absent')])
        rewritten = rows[0]
        self.assertEqual(rewritten['origin'], {'scheme': 'http', 'host_kind': 'loopback', 'port': 8900})
        self.assertEqual(rewritten['server'], {'scheme': 'http', 'host_kind': 'hostname', 'port': None})
        self.assertEqual((rewritten['scheme_match'], rewritten['host_match'], rewritten['port_match']), (True, False, False))
        self.assertEqual((rewritten['fetch_site'], rewritten['user_agent']), ('same-origin', 'UnitBrowser/1'))
        self.assertNotIn('evil.example', repr(rows), '只记主机类别，不记 Origin 原文')

    async def test_password_sessions_expire_on_server_and_survive_independent_app_reads(self):
        access.save(self.path, "correct-password")
        self.assertEqual((await self.client.get("/private")).status_code, 401)
        self.assertEqual((await self.login("incorrect")).status_code, 401)
        response = await self.login()
        self.assertEqual(response.status_code, 303)
        self.assertIn("Max-Age=604800", response.headers["set-cookie"])
        self.assertNotIn("internal-test-token", response.headers["set-cookie"])
        self.assertEqual((await self.client.get("/private")).status_code, 200)
        with patch.object(access.time, "time", return_value=access.time.time() + 604801):
            self.assertEqual((await self.client.get("/private")).status_code, 401)

    async def test_browser_session_has_no_persistent_cookie_and_twelve_hour_limit(self):
        policy = access.save(self.path, "correct-password")
        response = await self.login(days=0)
        session_header = next(header for header in response.headers.get_list("set-cookie") if header.startswith(access.COOKIE))
        self.assertNotIn("Max-Age", session_header)
        self.assertIn("HttpOnly", session_header)
        session = self.client.cookies.get(access.COOKIE)
        with patch.object(access.time, "time", return_value=access.time.time() + 43201):
            self.assertFalse(access.valid_session(policy, session))

    async def test_custom_duration_and_unchecked_remember_control(self):
        access.save(self.path, "correct-password")
        response = await self.login(days=17)
        self.assertIn("Max-Age=1468800", response.headers["set-cookie"])
        self.client.cookies.clear()
        response = await self.client.post("/login", data={"token": "correct-password"})
        session_header = next(header for header in response.headers.get_list("set-cookie") if header.startswith(access.COOKIE))
        self.assertNotIn("Max-Age", session_header)
        self.assertEqual((await self.login(days=366)).status_code, 400)

    async def test_the_login_page_is_a_shell_around_the_page_bundle(self):
        """登录页由页面包画：壳里只有 `next`、口令错误的标记与页面包，表单字段由页面包按原名提交。

        `next` 经净化与 HTML 转义写进挂载点；主题预读排在任何样式之前，手动选的深浅色才能在首绘前定下来。
        控件的外观、`aria-invalid`、`role="alert"` 与焦点归 vitest 与截图验收。
        """
        access.save(self.path, "correct-password")
        page = await self.client.get("/login", params={"next": '/stats?x=1&y="<b>'})
        self.assertEqual(page.status_code, 200)
        self.assertIn('<div id="peach-page" data-page="login" data-next="/stats?x=1&amp;y=&quot;&lt;b&gt;">',
                      page.text)
        self.assertIn('<link rel="stylesheet" href="/dist/peach-pages.css">', page.text)
        self.assertIn('<script type="module" src="/dist/peach-pages.js"></script>', page.text)
        self.assertNotIn("<style", page.text)
        self.assertNotIn("<form", page.text)
        self.assertLess(page.text.index("dataset.theme=c"), page.text.index('<link rel="stylesheet"'),
                        "主题预读要排在任何样式之前")
        for unsafe in ("//evil.example/", "https://evil.example/"):
            with self.subTest(unsafe):
                page = await self.client.get("/login", params={"next": unsafe})
                self.assertIn('data-page="login" data-next="/">', page.text)
        wrong = await self.client.post("/login", data={"token": "incorrect", "next": "/stats", "days": "30"})
        self.assertEqual(wrong.status_code, 401)
        self.assertIn('data-page="login" data-next="/stats" data-invalid="true">', wrong.text)
        self.assertFalse(self.client.cookies)
        accepted = await self.client.post("/login", data={"token": "correct-password", "next": "/stats", "days": "30"})
        self.assertEqual(accepted.status_code, 303)
        self.assertEqual(accepted.headers["location"], "/stats")

    async def test_password_change_revokes_sessions_and_disable_is_explicit(self):
        policy = access.save(self.path, "correct-password")
        await self.login()
        old_cookie = self.client.cookies.get(access.COOKIE)
        body = {"revision": policy["revision"], "action": "set", "password": "new-password", "confirmation": "new-password", "current_password": "wrong"}
        self.assertEqual((await self.client.post("/api/configuration/access", json=body)).status_code, 400)
        body["current_password"] = "correct-password"
        response = await self.client.post("/api/configuration/access", json=body)
        self.assertEqual(response.status_code, 200, response.text)
        self.assertFalse(access.valid_session(access.load(self.path), old_cookie))
        self.assertEqual((await self.client.get("/private")).status_code, 200)
        body = {"revision": response.json()["revision"], "action": "disable", "current_password": "new-password"}
        self.assertEqual((await self.client.post("/api/configuration/access", json=body)).status_code, 400)
        body["confirm_disable"] = True
        self.assertEqual((await self.client.post("/api/configuration/access", json=body)).status_code, 200)
        self.client.cookies.clear()
        self.assertEqual((await self.client.get("/private")).status_code, 200)

    async def test_management_rejects_foreign_origin_remote_peer_and_stale_revision(self):
        policy = access.save(self.path, "")
        body = {"revision": policy["revision"], "action": "set", "password": "correct-password", "confirmation": "correct-password"}
        self.assertEqual((await self.client.post("/api/configuration/access", json=body, headers={"Origin": "https://evil.example"})).status_code, 403)
        async with httpx.AsyncClient(transport=httpx.ASGITransport(app=self.app, client=("192.0.2.2", 1)), base_url="http://localhost") as remote:
            self.assertEqual((await remote.post("/api/configuration/access", json=body)).status_code, 403)
        body["revision"] = "stale"
        self.assertEqual((await self.client.post("/api/configuration/access", json=body)).status_code, 409)

    async def test_existing_token_cookie_can_configure_without_copying_token_again(self):
        self.assertEqual((await self.client.get("/private")).status_code, 401)
        self.client.cookies.set("tok", "internal-test-token")
        response = await self.client.post("/api/configuration/access", json={"revision": "legacy", "action": "set", "password": "correct-password", "confirmation": "correct-password"})
        self.assertEqual(response.status_code, 200, response.text)
        self.client.cookies.clear()
        self.client.cookies.set("tok", "internal-test-token")
        self.assertEqual((await self.client.get("/private")).status_code, 401)

    async def test_corrupt_policy_fails_closed_and_password_is_not_stored_or_returned(self):
        policy = access.save(self.path, "correct-password")
        self.assertNotIn("correct-password", self.path.read_text())
        self.assertEqual(set(access.public(policy)), {"mode", "revision"})
        self.path.write_text("invalid", encoding="utf-8")
        self.assertEqual((await self.client.get("/private")).status_code, 401)

    async def test_login_duration_tampering_and_repeated_guesses_are_rejected(self):
        access.save(self.path, "correct-password")
        self.assertEqual((await self.login(days=9999)).status_code, 400)
        for _ in range(9):
            await self.login("wrong")
        self.assertEqual((await self.login("wrong")).status_code, 429)

    def test_first_setup_initializes_optional_password_but_keeps_existing_policy(self):
        from peach import onboarding, settings_file
        config = settings_file.load_config(environ={"PEACH_DATA_ROOT": str(self.path.parent)})
        path = config.directory("secrets") / "access.json"
        tree = SimpleNamespace(token_created=True)
        with patch.object(onboarding, "configure", return_value=config), patch.object(onboarding, "create_data_tree", return_value=tree), patch.object(settings_file, "write", return_value=config.path):
            onboarding.apply(config, None, windows=True, access_password="correct-password")
            self.assertTrue(access.verify(access.load(path), "correct-password"))
            onboarding.apply(config, None, windows=True)
            self.assertTrue(access.verify(access.load(path), "correct-password"))
            path.unlink()
            onboarding.apply(config, None, windows=True)
            self.assertEqual(access.load(path)["mode"], "open")


CHROME_WINDOWS = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0 Safari/537.36"
SAFARI_IPHONE = ("Mozilla/5.0 (iPhone; CPU iPhone OS 19_0 like Mac OS X) AppleWebKit/605.1.15 "
                 "(KHTML, like Gecko) Version/19.0 Mobile/15E148 Safari/604.1")


class DeviceSessionTests(unittest.IsolatedAsyncioTestCase):
    """每台登录过的浏览器在访问策略旁记一行，可以逐台撤销。"""

    async def asyncSetUp(self):
        await AccessTests.asyncSetUp(self)
        self.policy = access.save(self.path, "correct-password")

    def device(self, user_agent, peer=("127.0.0.1", 1234)):
        client = httpx.AsyncClient(transport=httpx.ASGITransport(app=self.app, client=peer),
                                   base_url="http://localhost", headers={"User-Agent": user_agent})
        self.addAsyncCleanup(client.aclose)
        return client

    async def sign_in(self, client, days=30):
        response = await client.post("/login", data={"token": "correct-password", "days": str(days)})
        self.assertEqual(response.status_code, 303, response.text)
        return client

    async def listing(self, client):
        response = await client.get("/api/configuration/access/sessions")
        self.assertEqual(response.status_code, 200, response.text)
        return response.json()

    async def revoke(self, client, **body):
        return await client.post("/api/configuration/access/sessions/revoke",
                                 json={"revision": access.load(self.path)["revision"], **body})

    def legacy_token(self, expires):
        """升级前 `issue` 签出的形状：载荷只有代次与到期时间。"""
        from itsdangerous import URLSafeSerializer
        return URLSafeSerializer(self.policy["key"], salt="peach-browser-access").dumps(
            {"revision": self.policy["revision"], "expires": expires})

    async def test_each_login_is_its_own_row_and_the_file_keeps_only_digests(self):
        desk = await self.sign_in(self.device(CHROME_WINDOWS))
        with patch.object(access.time, "time", return_value=access.time.time()):
            phone = await self.sign_in(self.device(SAFARI_IPHONE, ("198.51.100.20", 5000)))
            twin = await self.sign_in(self.device(SAFARI_IPHONE, ("198.51.100.21", 5000)))
        self.assertNotEqual(phone.cookies.get(access.COOKIE), twin.cookies.get(access.COOKIE),
                            "同一秒、同一时长的两次登录也是两个令牌")
        listing = await self.listing(desk)
        rows = listing["sessions"]
        self.assertEqual(len(rows), 3)
        self.assertEqual((rows[0]["device"], rows[0]["current"], rows[0]["network"]), ("Chrome · Windows", True, "loopback"))
        self.assertEqual({row["device"] for row in rows[1:]}, {"Safari · iPhone"})
        self.assertEqual({row["network"] for row in rows[1:]}, {"198.51.100.0/24"})
        self.assertTrue(listing["manageable"])
        stored = access.sessions_path(self.path).read_text(encoding="utf-8")
        for client in (desk, phone, twin):
            value = client.cookies.get(access.COOKIE)
            self.assertNotIn(value, stored)
            self.assertIn(access.digest(value), stored)
        self.assertNotIn("Mozilla", stored, "User-Agent 原文不落盘")

    async def test_revoking_one_device_signs_out_only_that_device(self):
        desk = await self.sign_in(self.device(CHROME_WINDOWS))
        phone = await self.sign_in(self.device(SAFARI_IPHONE, ("198.51.100.20", 5000)))
        rows = (await self.listing(desk))["sessions"]
        own, other = rows[0]["id"], rows[1]["id"]
        self.assertFalse((await self.listing(phone))["manageable"])
        self.assertEqual((await self.revoke(desk, id=own)).status_code, 400, "本机不在这里撤")
        self.assertEqual((await self.revoke(phone, id=own)).status_code, 403, "撤销只在运行 Peach 的电脑上做")
        self.assertEqual((await self.revoke(desk, id=other, revision="stale")).status_code, 409)
        response = await self.revoke(desk, id=other)
        self.assertEqual(response.status_code, 200, response.text)
        self.assertEqual(response.json()["removed"], 1)
        self.assertEqual([row["id"] for row in response.json()["sessions"]], [own])
        self.assertEqual((await phone.get("/private")).status_code, 401)
        self.assertEqual((await desk.get("/private")).status_code, 200)
        self.assertEqual((await self.revoke(desk, id=other)).status_code, 404)

    async def test_revoke_others_keeps_this_browser(self):
        desk = await self.sign_in(self.device(CHROME_WINDOWS))
        phones = [await self.sign_in(self.device(SAFARI_IPHONE, (f"198.51.100.{n}", 5000))) for n in (20, 21)]
        response = await self.revoke(desk, scope="others")
        self.assertEqual(response.json()["removed"], 2)
        self.assertEqual([row["current"] for row in response.json()["sessions"]], [True])
        for phone in phones:
            self.assertEqual((await phone.get("/private")).status_code, 401)
        self.assertEqual((await desk.get("/private")).status_code, 200)

    async def test_expired_sessions_are_refused_and_dropped_on_the_next_write(self):
        short = await self.sign_in(self.device(SAFARI_IPHONE), days=1)
        later = access.time.time() + 86401
        with patch.object(access.time, "time", return_value=later):
            self.assertEqual((await short.get("/private")).status_code, 401)
            desk = await self.sign_in(self.device(CHROME_WINDOWS))
            self.assertEqual([row["device"] for row in (await self.listing(desk))["sessions"]], ["Chrome · Windows"])
        self.assertNotIn(access.digest(short.cookies.get(access.COOKIE)),
                         access.sessions_path(self.path).read_text(encoding="utf-8"))

    async def test_password_change_revokes_every_device_and_lists_only_the_new_session(self):
        desk = await self.sign_in(self.device(CHROME_WINDOWS))
        phone = await self.sign_in(self.device(SAFARI_IPHONE, ("198.51.100.20", 5000)))
        response = await desk.post("/api/configuration/access", json={
            "revision": self.policy["revision"], "action": "set", "current_password": "correct-password",
            "password": "another-password", "confirmation": "another-password"})
        self.assertEqual(response.status_code, 200, response.text)
        self.assertEqual((await phone.get("/private")).status_code, 401)
        self.assertEqual((await desk.get("/private")).status_code, 200)
        rows = (await self.listing(desk))["sessions"]
        self.assertEqual([(row["device"], row["current"]) for row in rows], [("Chrome · Windows", True)])

    async def test_tokens_from_before_the_upgrade_are_adopted_once_and_stay_revoked(self):
        legacy = self.device(SAFARI_IPHONE, ("198.51.100.20", 5000))
        legacy.cookies.set(access.COOKIE, self.legacy_token(int(access.time.time()) + 86400 * 20))
        self.assertEqual((await legacy.get("/private")).status_code, 200, "升级不把已登录的设备登出")
        desk = await self.sign_in(self.device(CHROME_WINDOWS))
        rows = (await self.listing(desk))["sessions"]
        adopted = next(row for row in rows if not row["current"])
        self.assertEqual((adopted["device"], adopted["legacy"]), ("Safari · iPhone", True))
        self.assertEqual((await self.revoke(desk, id=adopted["id"])).status_code, 200)
        for _ in range(2):
            self.assertEqual((await legacy.get("/private")).status_code, 401, "撤销后不会被重新补登")
        self.assertEqual(len((await self.listing(desk))["sessions"]), 1)
        stranger = self.device(SAFARI_IPHONE)
        stranger.cookies.set(access.COOKIE, access.issue(self.policy, 30)[0])
        self.assertEqual((await stranger.get("/private")).status_code, 401, "新令牌不在记录里就不认，不补登")

    async def test_recent_activity_is_written_at_most_once_a_minute(self):
        desk = await self.sign_in(self.device(CHROME_WINDOWS))
        first = (await self.listing(desk))["sessions"][0]["last_seen"]
        start = access.time.time()
        with patch.object(access.time, "time", return_value=start + 30), \
                patch.object(access, "atomic_write_text", side_effect=AssertionError("一分钟内不写盘")):
            self.assertEqual((await desk.get("/private")).status_code, 200)
        with patch.object(access.time, "time", return_value=start + 61):
            self.assertEqual((await desk.get("/private")).status_code, 200)
            self.assertGreater((await self.listing(desk))["sessions"][0]["last_seen"], first)

    async def test_unreadable_record_refuses_new_tokens_instead_of_trusting_them(self):
        desk = await self.sign_in(self.device(CHROME_WINDOWS))
        access.sessions_path(self.path).write_text("{broken", encoding="utf-8")
        self.assertEqual((await desk.get("/private")).status_code, 401)
        await self.sign_in(desk)
        self.assertEqual((await desk.get("/private")).status_code, 200, "重新登录写回一份完整记录")

    def test_device_names_and_networks_keep_only_short_forms(self):
        cases = {
            CHROME_WINDOWS: "Chrome · Windows",
            SAFARI_IPHONE: "Safari · iPhone",
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 15_0) AppleWebKit/605.1.15 Version/19.0 Safari/605.1.15": "Safari · macOS",
            "Mozilla/5.0 (Windows NT 10.0) AppleWebKit/537.36 Chrome/150.0 Safari/537.36 Edg/150.0": "Edge · Windows",
            "Mozilla/5.0 (Linux; Android 16) AppleWebKit/537.36 Chrome/150.0 Mobile Safari/537.36": "Chrome · Android",
            "Mozilla/5.0 (Linux; Android 16; SM-X910) AppleWebKit/537.36 Chrome/150.0 Safari/537.36": "Chrome · Android 平板",
            "Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0": "Firefox · Linux",
            "python-httpx/0.28": "",
        }
        for agent, name in cases.items():
            with self.subTest(agent=agent):
                self.assertEqual(access.device_name(agent), name)
        self.assertEqual(access.network_of("198.51.100.20"), "198.51.100.0/24")
        self.assertEqual(access.network_of("::ffff:192.0.2.7"), "192.0.2.0/24")
        self.assertEqual(access.network_of("2001:db8:1:2:3:4:5:6"), "2001:db8:1:2::/64")
        self.assertEqual(access.network_of("::1"), "loopback")
        self.assertEqual(access.network_of("unknown"), "")


class ConfigurationPageCase(unittest.IsolatedAsyncioTestCase):
    """用真的 `PeachSettings`：换口令时服务端用 `dataclasses.replace` 换掉运行设置。"""

    async def asyncSetUp(self):
        from peach import auth
        from peach.config import PeachSettings

        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.secrets = Path(self.tmp.name).resolve()
        self.path = self.secrets / "access.json"
        self.old = auth.write_token(self.secrets)
        self.app = FastAPI()
        self.app.state.settings = replace(
            PeachSettings(), token=self.old, token_file=auth.token_path(self.secrets), access_path=self.path,
            configured=True, mdns_name="peach", review_writer_origin="", secrets_root=self.secrets)
        self.app.state.review_mirror = SimpleNamespace(token=self.old)
        self.app.include_router(routes_auth.router)
        self.app.include_router(routes_configuration.router)

        @self.app.get("/private")
        def private(_=Depends(routes_auth.require_auth)):
            return {"ok": True}
        routes_auth._ATTEMPTS.clear()

    def device(self, user_agent=CHROME_WINDOWS, peer=("127.0.0.1", 1234)):
        client = httpx.AsyncClient(transport=httpx.ASGITransport(app=self.app, client=peer),
                                   base_url="http://localhost", headers={"User-Agent": user_agent})
        self.addAsyncCleanup(client.aclose)
        return client

    async def sign_in(self, client, secret="correct-password"):
        response = await client.post("/login", data={"token": secret, "days": "30"})
        self.assertEqual(response.status_code, 303, response.text)
        return client


class TokenRotationTests(ConfigurationPageCase):
    """配置页换访问口令：运行中的服务当场改用新口令，只登出确实靠口令登录的浏览器。"""

    async def rotate(self, client, **headers):
        return await client.post("/api/configuration/access/token/rotate", json={}, headers=headers)

    async def test_password_mode_keeps_every_browser_and_swaps_the_token_in_place(self):
        from peach import auth
        access.save(self.path, "correct-password")
        desk = await self.sign_in(self.device())
        phone = await self.sign_in(self.device(SAFARI_IPHONE, ("198.51.100.20", 5000)))
        before = access.sessions_path(self.path).read_text(encoding="utf-8")
        script = self.device()
        self.assertEqual((await script.get("/private", headers={"X-Token": self.old})).status_code, 200)

        response = await self.rotate(desk)
        self.assertEqual(response.status_code, 200, response.text)
        body = response.json()
        new = body["token"]
        self.assertNotEqual(new, self.old)
        self.assertEqual((body["mode"], body["signed_out"]), ("password", 0))
        self.assertEqual(response.headers["cache-control"], "no-store")
        self.assertEqual(auth.read_token(self.secrets), new, "口令文件换成新值，下次启动读到同一份")
        self.assertEqual(self.app.state.review_mirror.token, new, "复核镜像发的也是新口令")
        self.assertEqual((await script.get("/private", headers={"X-Token": self.old})).status_code, 401, "不用重启旧口令就失效")
        self.assertEqual((await script.get("/private", headers={"X-Token": new})).status_code, 200)
        for browser in (desk, phone):
            self.assertEqual((await browser.get("/private")).status_code, 200, "用访问密码登录的浏览器不受影响")
        self.assertEqual(access.sessions_path(self.path).read_text(encoding="utf-8"), before, "设备记录原样保留")

    async def test_legacy_mode_signs_out_other_browsers_and_keeps_this_one(self):
        desk = await self.sign_in(self.device(), self.old)
        phone = await self.sign_in(self.device(SAFARI_IPHONE, ("198.51.100.20", 5000)), self.old)
        response = await self.rotate(desk)
        self.assertEqual(response.status_code, 200, response.text)
        self.assertEqual((response.json()["mode"], response.json()["signed_out"]), ("legacy", 1))
        self.assertEqual((await phone.get("/private")).status_code, 401, "口令就是登录凭据：其他浏览器退出")
        self.assertEqual((await desk.get("/private")).status_code, 200, "本机当场补签，不被自己登出")
        rows = (await desk.get("/api/configuration/access/sessions")).json()["sessions"]
        self.assertEqual([row["current"] for row in rows], [True], "失效设备的记录一并清掉")
        await self.sign_in(phone, response.json()["token"])

    async def test_rotation_is_refused_off_this_machine_cross_origin_and_for_overridden_tokens(self):
        access.save(self.path, "")
        self.assertEqual((await self.rotate(self.device(peer=("192.0.2.2", 1)))).status_code, 403)
        self.assertEqual((await self.rotate(self.device(), Origin="https://evil.example")).status_code, 403)
        settings = self.app.state.settings
        for changed, reason in (({"token_file": None}, "PEACH_TOKEN"), ({"token": "", "token_file": None}, "没有使用访问口令")):
            with self.subTest(reason=reason):
                self.app.state.settings = replace(settings, **changed)
                response = await self.rotate(self.device())
                self.assertEqual(response.status_code, 409)
                self.assertIn(reason, response.text)
        self.app.state.settings = settings
        state = routes_configuration.api_token_payload(SimpleNamespace(app=self.app))
        self.assertEqual(state, {"rotatable": True, "reason": "", "paired": routes_configuration.REPLICATION_ENABLED})


def _ca_pem(with_key: bool = False) -> bytes:
    """测试用的自签 CA，用 cryptography 现场生成，不依赖 openssl。"""
    from datetime import datetime, timedelta, timezone
    from cryptography import x509
    from cryptography.hazmat.primitives import hashes, serialization
    from cryptography.hazmat.primitives.asymmetric import ec
    from cryptography.x509.oid import NameOID

    key = ec.generate_private_key(ec.SECP256R1())
    name = x509.Name([x509.NameAttribute(NameOID.COMMON_NAME, "Peach Local CA")])
    now = datetime.now(timezone.utc)
    cert = (x509.CertificateBuilder().subject_name(name).issuer_name(name).public_key(key.public_key())
            .serial_number(1).not_valid_before(now).not_valid_after(now + timedelta(days=3650))
            .add_extension(x509.BasicConstraints(ca=True, path_length=0), critical=True)
            .sign(key, hashes.SHA256()))
    pem = cert.public_bytes(serialization.Encoding.PEM)
    if with_key:
        pem += key.private_bytes(serialization.Encoding.PEM, serialization.PrivateFormat.PKCS8,
                                 serialization.NoEncryption())
    return pem


class CertificateTrustTests(ConfigurationPageCase):
    """其他设备装本机 CA：只下发公开证书，手机凭限时签名下载，不用先登录。"""

    async def asyncSetUp(self):
        await super().asyncSetUp()
        self.app.state.settings = replace(self.app.state.settings, tls_enabled=True, mdns_port=443)
        access.save(self.path, "correct-password")
        self.ca = self.secrets / "tls" / "peach-local-ca.crt"
        self.ca.parent.mkdir()
        self.ca.write_bytes(_ca_pem(with_key=True))

    async def test_fingerprint_matches_and_the_download_never_carries_a_private_key(self):
        from cryptography import x509
        from cryptography.hazmat.primitives import hashes
        desk = await self.sign_in(self.device())
        response = await desk.get("/api/configuration/certificate")
        self.assertEqual(response.status_code, 200, response.text)
        payload = response.json()
        expected = x509.load_pem_x509_certificate(self.ca.read_bytes()).fingerprint(hashes.SHA256()).hex().upper()
        self.assertEqual(payload["fingerprint"].replace(":", ""), expected)
        self.assertRegex(payload["fingerprint"], r"^([0-9A-F]{2}:){31}[0-9A-F]{2}$")
        self.assertTrue(payload["phone_url"].startswith("https://peach.local/api/configuration/certificate/peach-local-ca.crt?k="),
                        "从回环打开配置页时，手机地址换成 mDNS 名字")
        self.assertTrue(payload["qr"] and set("".join(payload["qr"])) <= {"0", "1"})
        self.assertEqual(len(payload["qr"]), len(payload["qr"][0]), "二维码是方阵")
        download = await desk.get(payload["download"])
        self.assertEqual(download.status_code, 200)
        self.assertEqual(download.headers["content-type"], "application/x-x509-ca-cert")
        self.assertIn('filename="peach-local-ca.crt"', download.headers["content-disposition"])
        self.assertIn(b"BEGIN CERTIFICATE", download.content)
        self.assertNotIn(b"PRIVATE KEY", download.content, "文件里拼了私钥也不外发")

    async def test_phone_downloads_with_the_signed_link_and_nothing_else_without_login(self):
        desk = await self.sign_in(self.device())
        path = (await desk.get("/api/configuration/certificate")).json()["phone_url"].removeprefix("https://peach.local")
        phone = self.device(SAFARI_IPHONE, ("198.51.100.20", 5000))
        self.assertEqual((await phone.get(path)).status_code, 200, "扫码下载不用先登录")
        self.assertEqual((await phone.get("/api/configuration/certificate/peach-local-ca.crt")).status_code, 401)
        self.assertEqual((await phone.get(path + "x")).status_code, 403)
        self.assertEqual((await phone.get("/api/configuration/certificate")).status_code, 401)
        await self.sign_in(phone)
        self.assertEqual((await phone.get("/api/configuration/certificate")).status_code, 403,
                         "指纹与二维码只在运行 Peach 的电脑上给")
        with patch.object(routes_configuration, "_LINK_AGE", -1):
            stranger = self.device(SAFARI_IPHONE, ("198.51.100.21", 5000))
            self.assertEqual((await stranger.get(path)).status_code, 403, "过期的二维码不认")

    async def test_no_https_service_or_no_ca_means_no_section(self):
        desk = await self.sign_in(self.device())
        self.app.state.settings = replace(self.app.state.settings, tls_enabled=False)
        self.assertIsNone(routes_configuration.certificate_payload(SimpleNamespace(app=self.app)))
        self.assertEqual((await desk.get("/api/configuration/certificate/peach-local-ca.crt")).status_code, 404)
        self.app.state.settings = replace(self.app.state.settings, tls_enabled=True)
        self.ca.unlink()
        self.assertEqual((await desk.get("/api/configuration/certificate")).status_code, 404)


class DockerFirstAccessTests(ConfigurationPageCase):
    """Docker 还没有访问策略时，登录页换成访问设置；只收本机与私有网络、不带转发头的来源（ADR-0149）。"""

    DOCKER = {"PEACH_DISTRIBUTION": "docker", "PEACH_HEADLESS_MANAGED": "1"}

    async def asyncSetUp(self):
        await super().asyncSetUp()
        environment = patch.dict("os.environ", self.DOCKER)
        environment.start()
        self.addCleanup(environment.stop)

    @staticmethod
    def mode(page):
        import re
        mount = re.search(r'<div id="peach-page" data-page="login"[^>]*>', page.text).group(0)
        found = re.search(r' data-mode="([a-z]+)"', mount)
        return found.group(1) if found else "password"

    async def submit(self, client, **body):
        return await client.post("/api/configuration/access/first", json=body)

    async def test_docker_without_a_policy_opens_access_setup_for_local_and_private_peers(self):
        for peer in ("127.0.0.1", "198.51.100.1", "192.0.2.20", "fd00::5"):
            with self.subTest(peer=peer):
                page = await self.device(peer=(peer, 1)).get("/login", params={"next": "/stats"})
                self.assertEqual(page.status_code, 200)
                self.assertEqual(self.mode(page), "setup")
                self.assertIn("<title>Peach · 访问设置</title>", page.text)

    async def test_public_peers_and_forwarded_requests_get_the_explanation_and_cannot_submit(self):
        body = {"mode": "password", "password": "correct-password", "confirmation": "correct-password"}
        cases = ((("8.8.8.8", 1), {}), (("192.0.2.20", 1), {"X-Forwarded-For": "8.8.8.8"}),
                 (("127.0.0.1", 1), {"Forwarded": "for=8.8.8.8"}), (("198.51.100.1", 1), {"CF-Connecting-IP": "8.8.8.8"}))
        for peer, headers in cases:
            with self.subTest(peer=peer, headers=headers):
                client = self.device(peer=peer)
                client.headers.update(headers)
                page = await client.get("/login")
                self.assertEqual(self.mode(page), "denied")
                refused = await self.submit(client, **body)
                self.assertEqual(refused.status_code, 403)
                self.assertEqual(refused.json()["detail"], routes_auth.FIRST_ACCESS_DENIED)
        foreign = await self.device().post("/api/configuration/access/first", json=body,
                                           headers={"Origin": "https://evil.example"})
        self.assertEqual(foreign.status_code, 403)
        self.assertFalse(self.path.exists())

    async def test_setting_a_password_writes_the_policy_and_lets_this_browser_in(self):
        desk = self.device(peer=("192.0.2.20", 1))
        self.assertEqual((await self.submit(desk, mode="password", password="short", confirmation="short")).json()["detail"]["errors"],
                         {"password": "访问密码需为 8–256 个字符"})
        mismatch = await self.submit(desk, mode="password", password="correct-password", confirmation="other-password")
        self.assertEqual(set(mismatch.json()["detail"]["errors"]), {"confirmation"})
        self.assertEqual((await self.submit(desk, password="correct-password")).status_code, 400)
        self.assertFalse(self.path.exists())
        accepted = await self.submit(desk, mode="password", password="correct-password",
                                     confirmation="correct-password", next="/stats")
        self.assertEqual(accepted.status_code, 200, accepted.text)
        self.assertEqual(accepted.json(), {"url": "/stats"})
        self.assertNotIn("correct-password", self.path.read_text(encoding="utf-8"))
        policy = access.load(self.path)
        self.assertEqual(policy["mode"], "password")
        self.assertTrue(access.verify(policy, "correct-password"))
        self.assertEqual((await desk.get("/private")).status_code, 200)
        stranger = self.device(peer=("192.0.2.30", 1))
        self.assertEqual((await stranger.get("/private")).status_code, 401)
        self.assertEqual(self.mode(await stranger.get("/login")), "password")
        again = await self.submit(stranger, mode="open")
        self.assertEqual(again.status_code, 409)
        self.assertEqual(access.load(self.path)["revision"], policy["revision"])

    async def test_choosing_no_password_writes_an_open_policy(self):
        desk = self.device(peer=("198.51.100.1", 1))
        accepted = await self.submit(desk, mode="open", next="//evil.example/")
        self.assertEqual(accepted.json(), {"url": "/"})
        self.assertEqual(access.load(self.path)["mode"], "open")
        self.assertEqual((await self.device(peer=("192.0.2.30", 1)).get("/private")).status_code, 200)

    async def test_the_token_still_works_and_other_deployments_keep_the_token_login(self):
        remote = self.device(peer=("8.8.8.8", 1))
        self.assertEqual((await remote.get("/private", headers={"X-Token": self.old})).status_code, 200)
        self.assertEqual((await remote.get("/private", params={"t": self.old})).status_code, 200)
        await self.sign_in(remote, self.old)
        self.assertEqual((await remote.get("/private")).status_code, 200)
        with patch.dict("os.environ", {"PEACH_DISTRIBUTION": "source"}):
            page = await self.device().get("/login")
            self.assertEqual(self.mode(page), "legacy")
            self.assertIn("<title>登录 Peach</title>", page.text)
            wrong = await self.device().post("/login", data={"token": "wrong", "next": "/"})
            self.assertEqual((wrong.status_code, self.mode(wrong)), (401, "legacy"))
            body = {"mode": "open"}
            self.assertEqual((await self.submit(self.device(), **body)).status_code, 404)
        self.assertFalse(self.path.exists())
