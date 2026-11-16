"""来源录制回放：`tests/fixtures/source-replay/` 里每份录制离线跑一遍真实的 `query`，结局与录制当日逐项一致。

录制由 `scripts/record_source_fixtures.py` 联网取得；这里只回放。回放期间套接字的建连与域名解析一律抛错，
任何一条请求漏到网络上都会让用例失败，而不是悄悄联网。
"""
import importlib.util
import io
import json
import os
import re
import sys
import tempfile
import unittest
from contextlib import redirect_stderr
from pathlib import Path
from unittest.mock import Mock, patch

from PIL import Image

from peach.catalog_rules import same_release_code
from peach.http import HttpRequest, HttpResponse
from peach.sources import SITE_SOURCES, FailureReason, JavBusSource, Session, SourceFailure
from peach.sources.replay import (REDACTED, Cassette, RecordingTransport, ReplayMiss, ReplayTransport,
                                  decode_response, encode_response, minimize, normalize_url, outcome_of,
                                  redact, secret_pieces)

ROOT = Path(__file__).resolve().parents[1]
FIXTURES = ROOT / "tests" / "fixtures" / "source-replay"
SCRIPT = ROOT / "scripts" / "record_source_fixtures.py"
DATE = re.compile(r"\d{4}-\d{2}-\d{2}")


def _offline(*_args, **_kwargs):
    raise AssertionError("回放用例不许联网")


class OfflineTestCase(unittest.TestCase):
    def setUp(self):
        for target in ("socket.socket.connect", "socket.create_connection", "socket.getaddrinfo"):
            patcher = patch(target, _offline)
            patcher.start()
            self.addCleanup(patcher.stop)


def cassettes() -> list[Path]:
    return sorted(FIXTURES.glob("*/*.json"))


class RecordedSampleTests(OfflineTestCase):
    def test_every_recording_replays_to_the_outcome_it_was_recorded_with(self):
        """每份录制回放出同一个结局：成功的 payload 逐键相同，失败的细档与措辞相同；交互一条不多一条不少。"""
        for path in cassettes():
            cassette = Cassette.load(path)
            with self.subTest(sample=f"{cassette.source}/{cassette.code}"):
                self.assertEqual(path.parent.name, cassette.source)
                self.assertEqual(path.stem, cassette.code)
                transport = ReplayTransport(cassette)
                outcome, payload, failure = outcome_of(cassette.source, cassette.code, transport)
                self.assertEqual(transport.misses, [])
                self.assertEqual(transport.unused(), [], "录了却没问到的交互：解析器少取了一页，录制要重录")
                self.assertEqual(outcome, cassette.outcome)
                self.assertEqual(failure, cassette.failure)
                self.assertEqual(payload, cassette.payload)

    def test_successful_recordings_carry_the_fields_the_ledger_needs(self):
        """golden 是录制当日解析器的输出；这几条不变量由人核过，挡住把错形状的值一起录进 golden。"""
        for path in cassettes():
            cassette = Cassette.load(path)
            if cassette.outcome != "ok":
                continue
            with self.subTest(sample=f"{cassette.source}/{cassette.code}"):
                payload = cassette.payload
                self.assertTrue(same_release_code(cassette.code, payload["id"]), payload["id"])
                self.assertTrue(payload["title"].strip())
                self.assertRegex(payload["release_date"], DATE)
                self.assertTrue(payload["actresses"])
                self.assertTrue(all(row["japanese_name"].strip() for row in payload["actresses"]))
                self.assertTrue(payload["maker"].strip())
                self.assertTrue(payload["cover_urls"])
                for url in payload["cover_urls"]:
                    self.assertIsInstance(url, str)
                    self.assertTrue(url.startswith("https://"), url)
                self.assertEqual(payload["cover_url"], payload["cover_urls"][0])

    def test_recordings_cover_the_main_sources_and_a_missing_work(self):
        recorded = [Cassette.load(path) for path in cassettes()]
        succeeded = {cassette.source for cassette in recorded if cassette.outcome == "ok"}
        self.assertGreaterEqual(len(succeeded), 3, succeeded)
        self.assertLessEqual(succeeded, set(SITE_SOURCES))
        self.assertTrue(any(cassette.outcome == FailureReason.NOT_FOUND.value for cassette in recorded))

    def test_recordings_keep_no_credentials_or_account_identifiers(self):
        for path in cassettes():
            text = path.read_text(encoding="utf-8")
            with self.subTest(path=path.name):
                self.assertNotRegex(text, r"(?i)set-cookie|mdl=logout|\buid=[1-9]")
                self.assertNotRegex(text, r"[A-Za-z]:\\\\(?:Users|Desktop)")


class ReplayTransportTests(OfflineTestCase):
    def cassette(self, *rows) -> Cassette:
        cassette = Cassette(source="javbus", code="ABC-123")
        for request, response in rows:
            cassette.add(request, response)
        return cassette

    def test_matching_ignores_headers_query_order_host_case_and_fragment(self):
        recorded = HttpRequest("GET", "https://Example.test/works?b=2&a=1", {"Cookie": "x"})
        transport = ReplayTransport(self.cassette((recorded, HttpResponse(200, {"content-type": "text/html"},
                                                                          b"<p>ok</p>", recorded.url))))
        asked = HttpRequest("GET", "https://example.test/works?a=1&b=2#top", {"Accept-Language": "zh-CN"})
        self.assertEqual(transport(asked, 5, 0).body, b"<p>ok</p>")
        self.assertEqual(transport(asked, 5, 0).body, b"<p>ok</p>")
        self.assertEqual(transport.unused(), [])

    def test_a_request_body_that_differs_from_the_recording_is_a_miss(self):
        recorded = HttpRequest("POST", "https://api.example.test/graphql", {}, b'{"id":"a"}')
        transport = ReplayTransport(self.cassette((recorded, HttpResponse(200, {}, b"{}", recorded.url))))
        with self.assertRaises(ReplayMiss):
            transport(HttpRequest("POST", recorded.url, {}, b'{"id":"b"}'), 5, 0)
        with self.assertRaises(ReplayMiss):
            transport(HttpRequest("GET", recorded.url, {}), 5, 0)
        self.assertEqual(len(transport.misses), 2)
        self.assertEqual(transport.unused(), [("POST", normalize_url(recorded.url), transport.cassette
                                               .interactions[0]["body_sha256"])])

    def test_a_miss_is_not_swallowed_as_a_site_failure(self):
        """站的 `holding()` 只翻译站点分档；失配原样抛出，测试不会把它当成「这一站没有」放过。"""
        with self.assertRaises(ReplayMiss):
            outcome_of("javbus", "ABC-123", ReplayTransport(self.cassette()))

    def test_images_keep_only_their_shape_and_replay_as_a_same_size_stand_in(self):
        buffer = io.BytesIO()
        Image.new("RGB", (800, 538), (10, 200, 30)).save(buffer, format="JPEG")
        row = encode_response(HttpResponse(200, {"Content-Type": "image/jpeg"}, buffer.getvalue(), "https://x.test/a.jpg"))
        self.assertNotIn("base64", row)
        self.assertNotIn("text", row)
        self.assertEqual((row["image"]["width"], row["image"]["height"], row["image"]["format"]), (800, 538, "JPEG"))
        with Image.open(io.BytesIO(decode_response(row).body)) as image:
            self.assertEqual(image.size, (800, 538))
        self.assertEqual(encode_response(HttpResponse(200, {"content-type": "video/mp4"}, b"\0" * 64)),
                         {"status": 200, "url": "", "content_type": "video/mp4", "video": {"bytes": 64}})

    def test_recording_keeps_the_inner_chain_for_cooldown_writes(self):
        """验证页一类细档由 `holding()` 沿 `.inner` 找到 `SourceTransport.hold`；套了录制这一层照样写得到。"""
        inner = Mock()
        transport = RecordingTransport(inner, Cassette(source="javbus", code="ABC-123"))
        with self.assertRaises(SourceFailure):
            with JavBusSource().holding(Session(transport)):
                raise SourceFailure(FailureReason.CLOUDFLARE_CHALLENGE, "errors.base.cloudflareUpdateCookie",
                                    {"label": "JavBus"})
        inner.hold.assert_called_once_with("javbus", "blocked")

    def test_recording_stores_responses_but_no_request_headers(self):
        inner = Mock(return_value=HttpResponse(200, {"content-type": "text/html", "set-cookie": "s=1"},
                                               b"<p>ok</p>", "https://example.test/a"))
        cassette = Cassette(source="javbus", code="ABC-123")
        RecordingTransport(inner, cassette)(HttpRequest("GET", "https://example.test/a",
                                                        {"Cookie": "session=abcdefgh1234"}), 5, 0)
        self.assertNotIn("abcdefgh1234", cassette.dump())
        self.assertNotIn("set-cookie", cassette.dump().lower())
        self.assertEqual(cassette.interactions[0]["response"]["text"], "<p>ok</p>")


class RedactionTests(unittest.TestCase):
    NETSCAPE = ("# Netscape HTTP Cookie File\n"
                ".javbus.com\tTRUE\t/\tFALSE\t1893456000\texistmag\tmag\n"
                ".javbus.com\tTRUE\t/\tTRUE\t1893456000\tsessionid\tq8w7e6r5t4y3u2i1\n")

    def test_cookie_values_are_found_in_header_and_netscape_forms_but_domains_are_not(self):
        pieces = secret_pieces([self.NETSCAPE, "PHPSESSID=0123456789abcdef; lang=zh"])
        self.assertIn("q8w7e6r5t4y3u2i1", pieces)
        self.assertIn("0123456789abcdef", pieces)
        self.assertNotIn(".javbus.com", pieces)
        self.assertNotIn("mag", pieces)

    def test_redact_replaces_secrets_csrf_tokens_and_account_ids(self):
        page = ('<meta name="csrf-token" content="tok123456">'
                '<img src="https://uc.example.test/avatar.php?uid=123456&size=small">'
                '<a href="/x?formhash=a1b2c3d4">q8w7e6r5t4y3u2i1</a>')
        text = redact(page, ["q8w7e6r5t4y3u2i1"])
        self.assertEqual(text, f'<meta name="csrf-token" content="{REDACTED}">'
                               '<img src="https://uc.example.test/avatar.php?uid=0&size=small">'
                               f'<a href="/x?formhash={REDACTED}">{REDACTED}</a>')

    def test_minimize_drops_scripts_and_styles_but_keeps_embedded_json(self):
        page = ('<html><head><style>a{}</style><script src="/a.js"></script><link rel="x" href="/y">'
                '<script id="__NEXT_DATA__" type="application/json">{"props":1}</script></head>'
                '<body><!-- c --><script>var a=1</script><p>keep</p></body></html>')
        self.assertEqual(minimize(page), '<html><head><script id="__NEXT_DATA__" type="application/json">'
                                         '{"props":1}</script></head><body><p>keep</p></body></html>')


_spec = importlib.util.spec_from_file_location("record_source_fixtures", SCRIPT)
record_script = importlib.util.module_from_spec(_spec)
sys.modules["record_source_fixtures"] = record_script
_spec.loader.exec_module(record_script)


class RecordScriptTests(unittest.TestCase):
    def test_ci_only_replays(self):
        with patch.dict(os.environ, {"GITHUB_ACTIONS": "true"}), patch.object(record_script, "record") as record, \
                redirect_stderr(io.StringIO()):
            self.assertEqual(record_script.main(["javbus:ABC-123"]), 2)
        record.assert_not_called()

    def test_scratch_secrets_leave_cookies_behind_unless_asked_and_keep_the_cooldown(self):
        with tempfile.TemporaryDirectory() as folder:
            secrets = Path(folder) / "secrets"
            (secrets / "follow").mkdir(parents=True)
            (secrets / "follow" / "scraping-javbus.json").write_text(json.dumps(
                {"cookie": "sessionid=q8w7e6r5t4y3u2i1", "cookies_text": RedactionTests.NETSCAPE,
                 "network": "direct"}), encoding="utf-8")
            (secrets / "follow" / "peach-proxy.json").write_text('{"mode": "environment"}', encoding="utf-8")
            (secrets / "scraping-javbus.cooldown.json").write_text('{"until": 1}', encoding="utf-8")
            for credentials, cookie in ((False, False), (True, True)):
                with self.subTest(credentials=credentials):
                    root, pieces = record_script.scratch_secrets(secrets, "javbus", credentials=credentials)
                    try:
                        kept = json.loads((root / "follow" / "scraping-javbus.json").read_text(encoding="utf-8"))
                        self.assertEqual(kept["network"], "direct")
                        self.assertEqual("cookie" in kept, cookie)
                        self.assertEqual("q8w7e6r5t4y3u2i1" in pieces, cookie)
                        self.assertTrue((root / "follow" / "peach-proxy.json").is_file())
                        self.assertTrue((root / "scraping-javbus.cooldown.json").is_file())
                    finally:
                        record_script.shutil.rmtree(root, ignore_errors=True)


if __name__ == "__main__":
    unittest.main()
