import asyncio
import base64
import gzip
import io
import json
import os
import re
import tempfile
import unittest
from datetime import datetime, timedelta, timezone
from pathlib import Path
from unittest import mock
from zipfile import ZipFile

import httpx
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import padding, rsa
from curl_cffi import CurlOpt
from fastapi import FastAPI
from PIL import Image
from sentry_sdk.envelope import Envelope
from sentry_sdk.transport import brotli

from peach import feedback_github, feedback_r2, routes_feedback, support_bundle
from peach.config import PeachSettings


DSN = "https://public@o123.ingest.us.sentry.io/123"
R2_ENDPOINT = "https://0123456789abcdef0123456789abcdef.r2.cloudflarestorage.com"
R2_ENV = {
    "PEACH_FEEDBACK_R2_ENDPOINT": R2_ENDPOINT,
    "PEACH_FEEDBACK_R2_BUCKET": "synthetic-feedback",
    "PEACH_FEEDBACK_R2_ACCESS_KEY_ID": "test-access-key",
    "PEACH_FEEDBACK_R2_SECRET_ACCESS_KEY": "test-secret-key",
}
BUG_FIELDS = {
    "bugDescription": "The preview never opened. I expected it to appear.",
    "reproduction": "1. Open a work.\n2. Select Preview.",
    "environmentPeach": "0.62.0",
    "environmentSystem": "Windows 10.0.26100 · AMD64",
    "environmentInstall": "Standalone",
}


def image_data(color, size=(8, 6)):
    with io.BytesIO() as output:
        Image.new("RGB", size, color).save(output, "PNG")
        return base64.b64encode(output.getvalue()).decode("ascii")


class FeedbackTests(unittest.TestCase):
    def setUp(self):
        self.app = FastAPI()
        self.app.state.settings = PeachSettings()
        self.destination_loader = feedback_r2.destination
        default_destination = mock.patch.object(feedback_r2, "destination", return_value=None)
        default_destination.start()
        self.addCleanup(default_destination.stop)
        self.app.include_router(routes_feedback.router)

    def post(self, payload, origin="http://test"):
        async def send():
            transport = httpx.ASGITransport(app=self.app, client=("127.0.0.1", 1234))
            async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
                return await client.post(routes_feedback.PATH, json=payload, headers={"Origin": origin})
        return asyncio.run(send())

    def test_anonymous_diagnostics_preserve_the_local_log_boundary(self):
        async def check():
            for docker, address, status, logs in (
                ("0", "192.0.2.9", 401, None),
                ("1", "192.0.2.9", 200, None),
                ("0", "127.0.0.1", 200, "Safe error summary"),
            ):
                with self.subTest(docker=docker, address=address), \
                        mock.patch.dict(os.environ, {"PEACH_HEADLESS_MANAGED": docker, "PEACH_TRAY_MANAGED": "0"}):
                    transport = httpx.ASGITransport(app=self.app, client=(address, 1234))
                    async with httpx.AsyncClient(transport=transport, base_url="http://127.0.0.1") as client:
                        received = await client.get(routes_feedback.DIAGNOSTICS_PATH)
                    self.assertEqual(received.status_code, status, received.text)
                    if status == 200:
                        self.assertEqual(received.json(), {"health": {"ready": True}, "logs": logs})
                        self.assertEqual(received.headers["Cache-Control"], "no-store")

        with mock.patch("peach.health.app_readiness", return_value={"ready": True}), \
                mock.patch.object(support_bundle, "feedback_error_summary", return_value="Safe error summary") as summarize:
            asyncio.run(check())
        self.assertEqual(summarize.call_count, 1)

    def test_feedback_and_images_share_one_sentry_envelope(self):
        envelopes = []

        def receive(request):
            self.assertEqual(request.url.path, "/api/123/envelope/")
            content = request.content
            if request.headers.get("Content-Encoding") == "gzip":
                content = gzip.decompress(content)
            elif request.headers.get("Content-Encoding") == "br":
                content = brotli.decompress(content)
            envelopes.append(Envelope.deserialize(content))
            return httpx.Response(200)

        with mock.patch.object(feedback_r2, "destination", return_value=mock.Mock()), \
                mock.patch.object(feedback_r2, "store") as backup, \
                mock.patch.dict(os.environ, {"PEACH_REPORTING_TEST_MODE": "0"}), \
                mock.patch.object(routes_feedback, "dsn", return_value=DSN), \
                mock.patch("peach.reporting_transport.http_client", side_effect=lambda **_:
                           httpx.Client(transport=httpx.MockTransport(receive))):
            receipt = self.post({"description": "  Synthetic feedback  ", "category": "question",
                                 "images": [image_data("blue", (3840, 2160)), image_data("green")]})

        self.assertEqual(receipt.status_code, 200, receipt.text)
        backup.assert_not_called()
        envelope, = envelopes
        self.assertEqual(envelope.headers["event_id"], receipt.json()["id"])
        feedback, first, second = envelope.items
        self.assertEqual(feedback.type, "feedback")
        data = json.loads(feedback.get_bytes())
        self.assertEqual(data["contexts"]["feedback"]["message"], "Synthetic feedback")
        self.assertEqual(data["tags"], {"feedback_category": "question"})
        for number, (attachment, size) in enumerate(((first, (3840, 2160)), (second, (8, 6))), 1):
            self.assertEqual(attachment.type, "attachment")
            self.assertEqual(attachment.headers["filename"], f"feedback-{number}.png")
            with Image.open(io.BytesIO(attachment.get_bytes())) as image:
                self.assertEqual((image.format, image.size), ("PNG", size))

    def test_intake_rejects_cross_origin_and_malformed_attachments(self):
        with mock.patch.object(routes_feedback, "dsn", return_value=DSN), mock.patch.object(routes_feedback, "_send") as send:
            self.assertEqual(self.post({"description": "Example"}, origin="https://other.invalid").status_code, 403)
            for payload in ({"description": " "}, {"description": "Example", "images": ["bad"]},
                            {"description": "Example", "images": [image_data("blue", (4097, 1))]},
                            {"description": "Example", "images": [""] * 5}):
                with self.subTest(payload=payload):
                    self.assertEqual(self.post(payload).status_code, 400)
        send.assert_not_called()

    def test_github_publication_needs_only_server_credentials_and_sends_selected_images(self):
        key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
        repo = "/repos/peach-mitao/peach"
        branch = "peach-feedback-screenshots"
        path = ".peach/feedback/42/image-1.png"
        replies = {
            ("POST", "/app/installations/456/access_tokens"): (201, {"token": "app-installation"}),
            ("POST", f"{repo}/issues"): (201, {"number": 42}),
            ("GET", f"{repo}/git/ref/heads/{branch}"): (404, {}),
            ("POST", f"{repo}/git/trees"): (201, {"sha": "a" * 40}),
            ("POST", f"{repo}/git/commits"): (201, {"sha": "b" * 40}),
            ("POST", f"{repo}/git/refs"): (201, {}),
            ("PUT", f"{repo}/contents/{path}"): (201, {}),
            ("POST", f"{repo}/issues/42/comments"): (201, {}),
        }
        requests = {}

        def send(method, url, *, headers, **options):
            endpoint = url.removeprefix("https://api.github.com")
            requests[method, endpoint] = options.get("json", {})
            self.assertTrue(headers["User-Agent"].startswith("Peach-Feedback/"))
            token = headers["Authorization"].removeprefix("Bearer ")
            if endpoint.endswith("/access_tokens"):
                head, claims, signature = token.split(".")

                def decode(part):
                    return base64.urlsafe_b64decode(part + "=" * (-len(part) % 4))

                key.public_key().verify(decode(signature), f"{head}.{claims}".encode(), padding.PKCS1v15(), hashes.SHA256())
                self.assertEqual(json.loads(decode(claims))["iss"], "123")
            else:
                self.assertEqual(token, "app-installation")
            status, body = replies[method, endpoint]
            return mock.Mock(status_code=status, json=lambda: body)

        with tempfile.TemporaryDirectory() as directory:
            key_file = Path(directory) / "test.pem"
            key_file.write_bytes(key.private_bytes(serialization.Encoding.PEM, serialization.PrivateFormat.PKCS8,
                                                   serialization.NoEncryption()))
            environment = {"PEACH_REPORTING_TEST_MODE": "0", "PEACH_FEEDBACK_GITHUB_APP_ID": "123",
                           "PEACH_FEEDBACK_GITHUB_INSTALLATION_ID": "456",
                           "PEACH_FEEDBACK_GITHUB_PRIVATE_KEY_FILE": str(key_file),
                           "PEACH_FEEDBACK_GITHUB_TOKEN": "unused-legacy-token"}
            with mock.patch.dict(os.environ, environment), \
                    mock.patch.object(routes_feedback, "dsn", return_value=DSN), \
                    mock.patch.object(routes_feedback, "_send", return_value=("feedback-id", "accepted")) as private, \
                    mock.patch.object(feedback_github.curl_requests, "Session") as session, \
                    mock.patch.object(feedback_github.peach_proxy, "curl_options", return_value={}):
                session.return_value.__enter__.return_value.request.side_effect = send
                receipt = self.post({"title": "Example", "fields": BUG_FIELDS, "category": "bug",
                                     "publishGithub": True, "githubImages": [1],
                                     "images": [image_data("blue"), image_data("green")]})
        self.assertEqual(receipt.status_code, 200, receipt.text)
        self.assertEqual(receipt.json()["github"], {"status": "published", "number": 42, "images": "attached"})
        self.assertEqual(list(requests), list(replies))
        self.assertEqual(requests["POST", "/app/installations/456/access_tokens"],
                         {"repositories": ["peach"], "permissions": {"issues": "write", "contents": "write"}})
        issue = requests["POST", f"{repo}/issues"]
        self.assertEqual((issue["title"], issue["type"]), ("Example", "Bug"))
        self.assertIn("1. Open a work.\n2. Select Preview.", issue["body"])
        self.assertIn("- 安装方式 / Installation: Standalone", issue["body"])
        self.assertEqual(private.call_args.args[1], "Example\n\n" + issue["body"])
        self.assertEqual(requests["POST", f"{repo}/git/commits"]["parents"], [])
        self.assertEqual(requests["POST", f"{repo}/git/refs"]["ref"], f"refs/heads/{branch}")
        attachment = requests["PUT", f"{repo}/contents/{path}"]
        self.assertEqual(attachment["branch"], branch)
        self.assertEqual(base64.b64decode(attachment["content"]), private.call_args.args[2][1][1])
        self.assertEqual(requests["POST", f"{repo}/issues/42/comments"]["body"],
                         f"![Feedback image 1](https://raw.githubusercontent.com/peach-mitao/peach/{branch}/{path})")

    def test_feedback_stays_received_if_github_sync_is_unavailable(self):
        with mock.patch.dict(os.environ, {"PEACH_REPORTING_TEST_MODE": "0", "PEACH_FEEDBACK_GITHUB_TOKEN": "",
                                         "PEACH_FEEDBACK_GITHUB_APP_ID": "", "PEACH_FEEDBACK_GITHUB_INSTALLATION_ID": "",
                                         "PEACH_FEEDBACK_GITHUB_PRIVATE_KEY_FILE": ""}), \
                mock.patch.object(routes_feedback, "dsn", return_value=DSN), \
                mock.patch.object(routes_feedback, "_send", return_value=("feedback-id", "accepted")), \
                mock.patch.object(feedback_github.curl_requests, "Session") as session:
            receipt = self.post({"title": "Example", "fields": BUG_FIELDS, "category": "bug", "publishGithub": True})
        self.assertEqual(receipt.status_code, 200, receipt.text)
        self.assertEqual(receipt.json(), {"id": "feedback-id", "github": {"status": "unavailable"}})
        session.assert_not_called()

    def test_both_issue_bodies_use_the_repository_template_headings_in_order(self):
        directory = Path(__file__).resolve().parents[1] / ".github" / "ISSUE_TEMPLATE"
        with mock.patch.object(routes_feedback, "dsn", return_value=DSN), \
                mock.patch.object(routes_feedback, "_send", return_value=("feedback-id", "accepted")), \
                mock.patch.object(feedback_github, "publish", return_value={"status": "published", "number": 42}) as publish:
            reports = (
                ("bug_report.md", "bug", "Bug", {
                    **BUG_FIELDS, "environmentPython": "3.14.8",
                    "environmentHealth": '{\n  "ok": true\n}', "logs": "Preview error",
                }),
                ("feature_request.md", "feature", "Feature", {
                    "useCase": "I use the keyboard to browse.",
                    "desiredBehavior": "Move focus to the next result.",
                    "additionalContext": "Current workaround: use Tab twice.",
                }),
            )
            for template, category, expected_kind, fields in reports:
                with self.subTest(category=category):
                    receipt = self.post({"title": "Example", "fields": fields, "category": category, "publishGithub": True})
                    self.assertEqual(receipt.status_code, 200, receipt.text)
                    _, body, kind, images = publish.call_args.args
                    source = (directory / template).read_text(encoding="utf-8")
                    self.assertEqual(re.findall(r"^## .+$", body, re.M), re.findall(r"^## .+$", source, re.M))
                    self.assertEqual(kind, expected_kind)
                    self.assertEqual(images, [])
                    if category == "bug":
                        self.assertIn("Python version (source installs, optional): 3.14.8", body)
                        self.assertIn('  "ok": true', body)
                        self.assertTrue(body.endswith("Preview error"))
                    else:
                        self.assertTrue(body.endswith(fields["additionalContext"]))

    def test_private_diagnostics_are_only_sent_to_private_feedback(self):
        with mock.patch.object(routes_feedback, "dsn", return_value=DSN), \
                mock.patch.object(routes_feedback, "_send", return_value=("feedback-id", "accepted")) as private, \
                mock.patch.object(feedback_github, "publish", return_value={"status": "published", "number": 42}) as publish:
            response = self.post({
                "title": "Example", "fields": BUG_FIELDS, "category": "bug", "publishGithub": True,
                "privateDiagnostics": {"environmentHealth": '{"ready": true}', "logs": "Private diagnostic example"},
            })
        self.assertEqual(response.status_code, 200, response.text)
        for value in ('{"ready": true}', "Private diagnostic example"):
            self.assertIn(value, private.call_args.args[1])
            self.assertNotIn(value, publish.call_args.args[1])
        self.assertIn(BUG_FIELDS["bugDescription"], publish.call_args.args[1])

    def test_incomplete_issues_are_rejected_before_delivery(self):
        with mock.patch.object(routes_feedback, "dsn", return_value=DSN), \
                mock.patch.object(routes_feedback, "_send") as private, \
                mock.patch.object(feedback_github, "publish") as publish:
            for category, values in (
                ("bug", {"fields": {**BUG_FIELDS, "reproduction": " "}}),
                ("bug", {"fields": {**BUG_FIELDS, "environmentInstall": ""}}),
                ("feature", {"fields": {"useCase": "Shortcuts"}}),
                ("bug", {"description": "Unstructured Markdown"}),
                ("bug", {"fields": BUG_FIELDS, "privateDiagnostics": {"reproduction": "Invalid override"}}),
            ):
                with self.subTest(category=category, values=values):
                    response = self.post({"title": "Example", "category": category, "publishGithub": True, **values})
                    self.assertEqual(response.status_code, 400, response.text)
        private.assert_not_called()
        publish.assert_not_called()

    def test_feedback_diagnostics_excludes_log_messages_paths_and_old_entries(self):
        now = datetime.now(timezone.utc) - timedelta(seconds=1)
        entry = {"at": now.isoformat(), "stage": "serve", "exception": [
            {"type": "PermissionError", "message": "private text", "context": {"token": "never-send"}},
        ], "frames": [{"file": "routes_api.py", "line": 51}], "hostname": "private-host"}
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            (root / "errors-123.log").write_text("\n".join(json.dumps(row) for row in [
                entry,
                {**entry, "at": (now - timedelta(hours=1)).isoformat(), "stage": "too-old"},
                {**entry, "stage": "failed-playback", "frames": [{"file": "/synthetic-root/hidden/file.py", "line": 8}]},
            ]), encoding="utf-8")
            summary = support_bundle.feedback_error_summary(root)
        expected = f"{now:%H:%M:%S} UTC"
        self.assertEqual(
            set(summary.splitlines()),
            {f"{expected} · serve · PermissionError · routes_api.py:51",
             f"{expected} · failed-playback · PermissionError"},
        )

    def test_github_retains_issue_when_repository_rejects_attachments(self):
        environment = {"PEACH_REPORTING_TEST_MODE": "0", "PEACH_FEEDBACK_GITHUB_TOKEN": "existing-server-token",
                       "PEACH_FEEDBACK_GITHUB_APP_ID": "", "PEACH_FEEDBACK_GITHUB_INSTALLATION_ID": "",
                       "PEACH_FEEDBACK_GITHUB_PRIVATE_KEY_FILE": ""}
        with mock.patch.dict(os.environ, environment), \
                mock.patch.object(feedback_github.curl_requests, "Session") as session, \
                mock.patch.object(feedback_github.peach_proxy, "curl_options", return_value={}):
            client = session.return_value.__enter__.return_value
            client.request.side_effect = [
                mock.Mock(status_code=201, json=lambda: {"number": 42}),
                mock.Mock(status_code=403),
            ]
            result = feedback_github.publish("Example", "Example report", "Bug", [("png", b"synthetic")])
        self.assertEqual(result, {"status": "published", "number": 42, "images": "manual"})
        self.assertEqual(client.request.call_count, 2)

    def test_text_only_delivery_remains_available_and_unknown_has_no_receipt(self):
        with mock.patch.object(feedback_r2, "destination", return_value=mock.Mock()), \
                mock.patch.object(feedback_r2, "store") as backup, \
                mock.patch.object(routes_feedback, "dsn", return_value=DSN), \
                mock.patch.object(routes_feedback, "_send", side_effect=[("one", "accepted"), ("two", "unknown")]) as send:
            first = self.post({"description": "Text only"})
            second = self.post({"description": "Uncertain"})
        send.assert_has_calls([mock.call(DSN, "Text only", [], None), mock.call(DSN, "Uncertain", [], None)])
        self.assertEqual(first.json(), {"id": "one"})
        self.assertEqual(second.status_code, 502)
        self.assertNotIn("id", second.json())
        backup.assert_not_called()

    def test_sentry_rate_limit_saves_complete_report_to_r2(self):
        target = feedback_r2.Destination(R2_ENDPOINT, "synthetic-feedback", "test-access-key", "test-secret-key")
        source = io.BytesIO()
        Image.new("RGB", (1024, 768), "blue").save(source, "PNG", compress_level=0)
        payload = {"description": "Synthetic quota test", "category": "feature", "images": [
            base64.b64encode(source.getvalue()).decode("ascii"), image_data("green", (3840, 2160)),
        ]}
        with mock.patch.dict(os.environ, {"PEACH_REPORTING_TEST_MODE": "0"}), \
                mock.patch.object(feedback_r2, "destination", return_value=target), \
                mock.patch.object(routes_feedback, "dsn", return_value=DSN), \
                mock.patch("peach.reporting_transport.http_client", side_effect=lambda **_:
                           httpx.Client(transport=httpx.MockTransport(lambda _: httpx.Response(429)))), \
                mock.patch("curl_cffi.requests.Session") as session:
            upload = session.return_value.__enter__.return_value.put
            upload.return_value.status_code = 200
            receipt = self.post(payload)

        self.assertEqual(receipt.status_code, 200, receipt.text)
        upload.assert_called_once()
        identity = receipt.json()["id"]
        arguments = upload.call_args
        self.assertEqual(arguments.args, (f"{R2_ENDPOINT}/synthetic-feedback/feedback/{identity}.zip",))
        self.assertEqual(arguments.kwargs["auth"], ("test-access-key", "test-secret-key"))
        self.assertFalse(arguments.kwargs["allow_redirects"])
        self.assertEqual(session.call_args.kwargs["curl_options"][CurlOpt.AWS_SIGV4], b"aws:amz:auto:s3")
        with ZipFile(io.BytesIO(arguments.kwargs["data"])) as archive:
            metadata = json.loads(archive.read("feedback.json"))
            self.assertEqual(metadata["id"], identity)
            self.assertEqual(metadata["description"], payload["description"])
            self.assertEqual(metadata["category"], "feature")
            self.assertEqual(metadata["images"], ["feedback-1.png", "feedback-2.png"])
            self.assertLess(len(archive.read("feedback-1.png")), len(source.getvalue()))
            with Image.open(archive.open("feedback-2.png")) as image:
                self.assertEqual(image.size, (3840, 2160))

    def test_backup_rejection_does_not_return_receipt(self):
        with mock.patch.object(routes_feedback, "dsn", return_value=None), \
                mock.patch.object(feedback_r2, "destination", return_value=mock.Mock()), \
                mock.patch.object(feedback_r2, "store", side_effect=["failed", "accepted"]):
            self.assertEqual(self.post({"description": "Rejected upload"}).status_code, 502)
            self.assertEqual(self.post({"description": "Accepted upload"}).status_code, 200)

    def test_r2_configuration_requires_complete_credentials_and_r2_endpoint(self):
        with mock.patch.dict(os.environ, R2_ENV, clear=True):
            self.assertEqual(self.destination_loader().bucket, "synthetic-feedback")
            with mock.patch.dict(os.environ, {"PEACH_FEEDBACK_R2_ENDPOINT": "https://other.invalid"}):
                self.assertIsNone(self.destination_loader())
            with mock.patch.dict(os.environ, {"PEACH_FEEDBACK_R2_SECRET_ACCESS_KEY": ""}):
                self.assertIsNone(self.destination_loader())
