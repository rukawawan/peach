"""qBittorrent Web API provider：登录、提交、状态、取消与失败分类。"""
from __future__ import annotations

import unittest
from urllib.parse import parse_qs

import httpx

from peach.downloads import DONE, ERROR, MISSING, RUNNING, DownloadError, DownloadTask, parse_magnet
from peach.downloads_qbittorrent import QbittorrentProvider, check

HASH = "c9e15763f722f23e98a29decdfae341b98d53056"
MAGNET = f"magnet:?xt=urn:btih:{HASH}&dn=ABC-123"
TARGET = "/vol1/media/Peach"


def _form(request: httpx.Request) -> dict[str, list[str]]:
    return parse_qs(request.content.decode("utf-8"), keep_blank_values=True)


def _torrent(**patch) -> dict:
    row = {"hash": HASH, "name": "ABC-123", "state": "downloading", "progress": 0.42,
           "save_path": TARGET}
    row.update(patch)
    return row


class _Handler:
    """按路径回包，并记下每次请求。"""

    def __init__(self, *, torrents=(), login="Ok.", add="Ok.", delete="Ok."):
        self.requests: list[httpx.Request] = []
        self.torrents = list(torrents)
        self.login, self.add, self.delete = login, add, delete

    def __call__(self, request: httpx.Request) -> httpx.Response:
        self.requests.append(request)
        path = request.url.path
        if path == "/api/v2/auth/login":
            return httpx.Response(200, text=self.login, headers={"set-cookie": "SID=test-only"})
        if path == "/api/v2/app/version":
            return httpx.Response(200, text="v4.6.4")
        if path == "/api/v2/app/webapiVersion":
            return httpx.Response(200, text="2.9.3")
        if path == "/api/v2/app/preferences":
            return httpx.Response(200, json={"save_path": TARGET})
        if path == "/api/v2/torrents/info":
            return httpx.Response(200, json=self.torrents)
        if path == "/api/v2/torrents/add":
            return httpx.Response(200, text=self.add)
        if path == "/api/v2/torrents/delete":
            return httpx.Response(200, text=self.delete)
        return httpx.Response(404)

    def calls(self, path: str) -> list[httpx.Request]:
        return [request for request in self.requests if request.url.path == path]


class CheckTests(unittest.TestCase):
    def test_check_reports_version_and_default_save_path_without_echoing_the_password(self):
        handler = _Handler()
        report = check("192.0.2.10:8085", "admin", "test-only-password",
                       transport=httpx.MockTransport(handler))
        self.assertTrue(report["ok"])
        self.assertEqual(report["address"], "http://192.0.2.10:8085")
        self.assertEqual((report["version"], report["webapi_version"]), ("v4.6.4", "2.9.3"))
        self.assertEqual(report["save_path"], TARGET)
        self.assertNotIn("test-only-password", str(report))

    def test_check_without_credentials_does_not_call_qbittorrent(self):
        handler = _Handler()
        report = check("http://192.0.2.10:8085", "", "", transport=httpx.MockTransport(handler))
        self.assertFalse(report["ok"])
        self.assertIn("用户名和密码", report["problems"][0])
        self.assertEqual(handler.requests, [])


class ProviderTests(unittest.TestCase):
    def provider(self, handler):
        return QbittorrentProvider("http://192.0.2.10:8085", "admin", "test-only-password",
                                   transport=httpx.MockTransport(handler))

    def test_submit_adds_the_magnet_with_an_explicit_save_path(self):
        handler = _Handler()
        status = self.provider(handler).submit(parse_magnet(MAGNET), TARGET)
        self.assertEqual(status.state, RUNNING)
        self.assertEqual(status.name, "ABC-123")
        add = handler.calls("/api/v2/torrents/add")[0]
        form = _form(add)
        self.assertEqual(form["urls"], [MAGNET])
        self.assertEqual(form["savepath"], [TARGET])
        self.assertEqual(form["autoTMM"], ["false"])
        self.assertEqual(form["tags"], ["peach"])
        self.assertEqual(form["paused"], ["false"])
        self.assertEqual(form["stopped"], ["false"])
        self.assertEqual(form["contentLayout"], ["Original"])
        self.assertEqual(add.headers["Referer"], "http://192.0.2.10:8085")

    def test_an_existing_torrent_is_adopted_without_adding_or_charging_again(self):
        handler = _Handler(torrents=[_torrent(state="uploading", progress=1)])
        status = self.provider(handler).submit(parse_magnet(MAGNET), TARGET)
        self.assertTrue(status.adopted)
        self.assertEqual(status.state, DONE)
        self.assertEqual(status.target, TARGET)
        self.assertEqual(handler.calls("/api/v2/torrents/add"), [])

    def test_an_adopted_torrent_reports_the_save_path_it_already_uses(self):
        handler = _Handler(torrents=[_torrent(save_path="/vol1/media/Peach/Other")])
        status = self.provider(handler).submit(parse_magnet(MAGNET), TARGET)
        self.assertTrue(status.adopted)
        self.assertEqual(status.target, "/vol1/media/Peach/Other")

    def test_a_failed_existing_torrent_is_replaced(self):
        handler = _Handler(torrents=[_torrent(state="error", progress=0)])
        self.provider(handler).submit(parse_magnet(MAGNET), TARGET)
        self.assertEqual(len(handler.calls("/api/v2/torrents/delete")), 1)
        self.assertEqual(len(handler.calls("/api/v2/torrents/add")), 1)

    def test_status_maps_running_complete_error_and_missing(self):
        task = DownloadTask(1, HASH, "qbittorrent", MAGNET, "ABC-123", TARGET, "submitted")
        cases = {
            "downloading": (RUNNING, 0.42),
            "uploading": (DONE, 1.0),
            "error": (ERROR, 0.0),
        }
        for state, (expected, progress) in cases.items():
            with self.subTest(state=state):
                handler = _Handler(torrents=[_torrent(state=state, progress=progress)])
                status = self.provider(handler).status(task)
                self.assertEqual((status.state, status.progress), (expected, progress))
        missing = self.provider(_Handler()).status(task)
        self.assertEqual(missing.state, MISSING)

    def test_cancel_deletes_the_torrent_but_keeps_files(self):
        handler = _Handler()
        task = DownloadTask(1, HASH, "qbittorrent", MAGNET, "ABC-123", TARGET, "remote_running")
        self.provider(handler).cancel(task)
        request = handler.calls("/api/v2/torrents/delete")[0]
        self.assertEqual(_form(request), {"hashes": [HASH], "deleteFiles": ["false"]})

    def test_full_progress_waits_for_files_to_finish_moving_or_checking(self):
        task = DownloadTask(1, HASH, "qbittorrent", MAGNET, "ABC-123", TARGET, "remote_running")
        for state in ("moving", "checkingUP", "checkingDL", "checkingResumeData", "unknown"):
            with self.subTest(state=state):
                handler = _Handler(torrents=[_torrent(state=state, progress=1)])
                self.assertEqual(self.provider(handler).status(task).state, RUNNING)
        handler = _Handler(torrents=[_torrent(state="stoppedUP", progress=1)])
        self.assertEqual(self.provider(handler).status(task).state, DONE)

    def test_incomplete_content_can_remain_in_the_downloaders_temporary_directory(self):
        handler = _Handler(torrents=[_torrent(
            content_path="/temporary/ABC-123.mp4", state="downloading", progress=0.42)])
        task = DownloadTask(1, HASH, "qbittorrent", MAGNET, "ABC-123", TARGET, "remote_running")
        status = self.provider(handler).status(task)
        self.assertEqual((status.state, status.target, status.progress), (RUNNING, TARGET, 0.42))

    def test_a_bad_password_is_a_config_error(self):
        handler = _Handler(login="Fails.")
        with self.assertRaises(DownloadError) as caught:
            self.provider(handler).status(
                DownloadTask(1, HASH, "qbittorrent", MAGNET, "ABC-123", TARGET, "submitted"))
        self.assertEqual(caught.exception.failure, "config")
        self.assertNotIn("test-only-password", caught.exception.detail)

    def test_a_network_failure_is_retryable(self):
        def handler(request: httpx.Request):
            raise httpx.ConnectError("test-only-down", request=request)

        with self.assertRaises(DownloadError) as caught:
            self.provider(handler).status(
                DownloadTask(1, HASH, "qbittorrent", MAGNET, "ABC-123", TARGET, "submitted"))
        self.assertEqual(caught.exception.failure, "network")
        self.assertTrue(caught.exception.retryable)

    def test_renamed_torrent_uses_the_actual_content_path_for_landing(self):
        handler = _Handler(torrents=[_torrent(
            name="My display label", content_path=TARGET + "/ABC-123.mp4",
            state="uploading", progress=1)])
        task = DownloadTask(1, HASH, "qbittorrent", MAGNET, "ABC-123", TARGET, "remote_running")
        status = self.provider(handler).status(task)
        self.assertEqual((status.name, status.target), ("ABC-123.mp4", TARGET))

    def test_content_outside_the_save_directory_cannot_be_imported(self):
        for content in (TARGET, TARGET + "/../other.mp4", "/other/file.mp4"):
            with self.subTest(content=content):
                handler = _Handler(torrents=[_torrent(content_path=content, state="uploading", progress=1)])
                with self.assertRaises(DownloadError) as caught:
                    self.provider(handler).submit(parse_magnet(MAGNET), TARGET)
                self.assertEqual(caught.exception.failure, "mismatch")

    def test_an_invalid_save_path_is_refused_before_calling_qbittorrent(self):
        handler = _Handler()
        with self.assertRaises(DownloadError) as caught:
            self.provider(handler).submit(parse_magnet(MAGNET), "/")
        self.assertEqual(caught.exception.failure, "config")
        self.assertEqual(handler.calls("/api/v2/torrents/add"), [])


if __name__ == "__main__":
    unittest.main()
