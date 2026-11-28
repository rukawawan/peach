"""本地下载：qB 保存目录到账本目录的映射、配置校验与提交目标。"""
from __future__ import annotations

import tempfile
import unittest
from pathlib import Path
from types import SimpleNamespace

from peach import downloads as dl
from peach.follow_secrets import CredentialStore
from peach.repository import LedgerDatabase
from support.ledger import fresh_ledger

HASH = "c9e15763f722f23e98a29decdfae341b98d53056"
MAGNET = f"magnet:?xt=urn:btih:{HASH}&dn=ABC-123"
QB_ROOT = "R:\\media\\Peach"
QB_SAVE = "/vol1/media/Peach"


class FakeProvider:
    key = "qbittorrent"

    def __init__(self):
        self.submitted: list[tuple[str, str]] = []
        self.status_result = dl.RemoteStatus(dl.RUNNING, name="ABC-123", progress=0.1)
        self.adopt_target = ""

    def submit(self, magnet, target):
        self.submitted.append((magnet.info_hash, target))
        if self.adopt_target:
            return dl.RemoteStatus(dl.RUNNING, name=magnet.name, adopted=True,
                                   target=self.adopt_target)
        return dl.RemoteStatus(dl.RUNNING, name=magnet.name)

    def status(self, task):
        return self.status_result

    def landed(self, task):
        return False

    def cancel(self, task):
        pass


class Clock:
    def __init__(self, now=1_800_000_000.0):
        self.now = now

    def __call__(self):
        return self.now

    def advance(self, seconds):
        self.now += seconds


class ConfigTests(unittest.TestCase):
    def test_qbittorrent_paths_are_saved_and_loaded(self):
        with tempfile.TemporaryDirectory() as directory:
            settings = dl.DownloadSettings(Path(directory))
            config = settings.save({
                "qbittorrent_address": "http://192.0.2.10:8085",
                "qbittorrent_save_path": QB_SAVE,
                "qbittorrent_media_root": QB_ROOT,
            }, {"local": (QB_ROOT,)})
            self.assertEqual((config.qbittorrent_address, config.qbittorrent_save_path,
                              config.qbittorrent_media_root),
                             ("http://192.0.2.10:8085", QB_SAVE, QB_ROOT))
            loaded = settings.load()
            self.assertEqual(loaded.payload()["qbittorrent_save_path"], QB_SAVE)

    def test_an_undeclared_media_root_is_refused(self):
        with tempfile.TemporaryDirectory() as directory:
            settings = dl.DownloadSettings(Path(directory))
            with self.assertRaises(ValueError):
                settings.save({
                    "qbittorrent_save_path": QB_SAVE,
                    "qbittorrent_media_root": "S:\\other",
                }, {"local": (QB_ROOT,)})

    def test_local_target_rejects_root_and_parent_segments(self):
        for value in ("", "/", "/vol1/../media"):
            with self.subTest(value=value), self.assertRaises(ValueError):
                dl.normalise_local_target(value)
        self.assertEqual(dl.normalise_local_target("vol1//media/Peach/"),
                         "/vol1/media/Peach")


class LandingTests(unittest.TestCase):
    def setUp(self):
        self.push = SimpleNamespace(config=SimpleNamespace(prefixes=()), mounts={},
                                    declared_roots={"local": (QB_ROOT,)})
        self.landing = dl.Landing(self.push, declared_roots={"local": (QB_ROOT,)}, mounts={})
        self.landing.channel_catalog = lambda: {"providers": [{
            "key": "qbittorrent", "kind": "local", "root": QB_ROOT,
            "local_root": QB_SAVE, "target": QB_SAVE, "configured": True,
        }], "problems": []}

    def test_a_qbittorrent_path_maps_into_the_declared_media_root(self):
        task = dl.DownloadTask(1, HASH, "qbittorrent", MAGNET, "ABC-123", QB_SAVE,
                               dl.REMOTE_DONE, remote_name="ABC-123/ABC-123.mp4")
        self.assertEqual(self.landing.ledger_path(task, dl.DownloadConfig()),
                         ("local", "R:\\media\\Peach\\ABC-123\\ABC-123.mp4"))

    def test_a_path_outside_the_qbittorrent_root_is_not_mapped(self):
        task = dl.DownloadTask(1, HASH, "qbittorrent", MAGNET, "ABC-123", "/other",
                               dl.REMOTE_DONE, remote_name="ABC-123.mp4")
        self.assertIsNone(self.landing.ledger_path(task, dl.DownloadConfig()))

    def test_task_location_is_local(self):
        task = dl.DownloadTask(1, HASH, "qbittorrent", MAGNET, "ABC-123", QB_SAVE, dl.SUBMITTED)
        self.assertEqual(task.location, "local")
        self.assertEqual(task.payload()["provider_label"], "qBittorrent")


class SubmitTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.root = Path(self.tmp.name).resolve()
        self.provider = FakeProvider()
        self.clock = Clock()
        self.push = SimpleNamespace(config=SimpleNamespace(prefixes=()), mounts={},
                                    declared_roots={"local": (QB_ROOT,)})
        self.service = dl.DownloadService(
            database=LedgerDatabase(fresh_ledger(self.root)),
            state_root=self.root / "state", credentials=CredentialStore(self.root / "secrets"),
            providers=lambda key: self.provider, clock=self.clock,
            landing=dl.Landing(self.push, declared_roots={"local": (QB_ROOT,)}, mounts={}))
        self.service.channel_catalog = lambda: {"providers": [{
            "key": "qbittorrent", "label": "Peach · qBittorrent", "configured": True,
            "target": QB_SAVE, "kind": "local", "local_root": QB_SAVE, "root": QB_ROOT,
        }], "problems": []}
        self.service.save_settings({
            "qbittorrent_address": "http://192.0.2.10:8085",
            "qbittorrent_save_path": QB_SAVE,
            "qbittorrent_media_root": QB_ROOT,
        }, {"local": (QB_ROOT,)})

    def test_a_local_submission_uses_the_qbittorrent_channel(self):
        result = dl.submit_offline_download(self.service, magnet=MAGNET, provider="qbittorrent")
        self.assertEqual(result["outcome"], "submitted")
        self.assertEqual(result["task"]["target"], QB_SAVE)
        self.assertEqual(self.provider.submitted, [(HASH, QB_SAVE)])

    def test_a_target_outside_the_channel_is_refused(self):
        with self.assertRaises(ValueError):
            dl.submit_offline_download(self.service, magnet=MAGNET, provider="qbittorrent",
                                       target="/other/Peach")
        self.assertEqual(self.provider.submitted, [])

    def test_an_incomplete_local_task_that_disappears_is_not_imported(self):
        result = dl.submit_offline_download(self.service, magnet=MAGNET, provider="qbittorrent")
        task = self.service.store.get(result["task"]["id"])
        task.state, task.remote_id, task.progress = dl.REMOTE_RUNNING, HASH, 0.4
        task.next_check_at = dl.iso(self.clock.now)
        self.service.store.save(task)
        self.provider.status_result = dl.RemoteStatus(dl.MISSING)
        self.clock.advance(dl.MISSING_GRACE + 1)
        self.service.poll_once()
        task = self.service.store.get(result["task"]["id"])
        self.assertEqual(task.state, dl.FAILED)
        self.assertEqual(task.failure, "removed")
        self.assertIsNone(task.asset_id)

    def test_a_changed_remote_save_directory_stays_within_the_mapping(self):
        for state in (dl.REMOTE_RUNNING, dl.STALLED):
            with self.subTest(state=state):
                result = dl.submit_offline_download(self.service, magnet=MAGNET, provider="qbittorrent")
                task = self.service.store.get(result["task"]["id"])
                task.state = state
                task.finished_at = dl.iso(self.clock.now) if state == dl.STALLED else None
                task.next_check_at = dl.iso(self.clock.now)
                self.service.store.save(task)
                self.provider.status_result = dl.RemoteStatus(
                    dl.DONE, HASH, "ABC-123.mp4", 1.0, target="/other/Peach")
                self.service.poll_once()
                task = self.service.store.get(task.id)
                self.assertNotEqual(task.state, dl.REMOTE_DONE)
                self.assertIsNone(task.asset_id)
                self.assertEqual(task.target, QB_SAVE)

    def test_a_completed_task_moved_to_a_mapped_subfolder_updates_its_target(self):
        result = dl.submit_offline_download(self.service, magnet=MAGNET, provider="qbittorrent")
        task = self.service.store.get(result["task"]["id"])
        task.next_check_at = dl.iso(self.clock.now)
        self.service.store.save(task)
        self.provider.status_result = dl.RemoteStatus(
            dl.DONE, HASH, "ABC-123.mp4", 1.0, target=QB_SAVE + "/Finished")
        self.service.poll_once()
        task = self.service.store.get(task.id)
        self.assertEqual(task.state, dl.REMOTE_DONE)
        self.assertEqual(task.target, QB_SAVE + "/Finished")

    def test_a_local_task_polls_at_most_a_minute_apart(self):
        result = dl.submit_offline_download(self.service, magnet=MAGNET, provider="qbittorrent")
        task = self.service.store.get(result["task"]["id"])
        task.state, task.checks = dl.REMOTE_RUNNING, 7
        task.next_check_at = dl.iso(self.clock.now)
        self.service.store.save(task)
        self.clock.advance(1)
        self.service.poll_once()
        task = self.service.store.get(result["task"]["id"])
        self.assertEqual(dl.parse_iso(task.next_check_at) - self.clock.now,
                         dl.LOCAL_POLL_CEILING)

    def test_an_adopted_task_records_the_actual_save_path(self):
        self.provider.adopt_target = QB_SAVE + "/Other"
        result = dl.submit_offline_download(self.service, magnet=MAGNET, provider="qbittorrent")
        self.assertEqual(result["outcome"], "adopted_remote")
        self.assertEqual(result["task"]["target"], QB_SAVE + "/Other")

    def test_an_adopted_task_outside_the_download_directory_fails(self):
        self.provider.adopt_target = "/other/Peach"
        result = dl.submit_offline_download(self.service, magnet=MAGNET, provider="qbittorrent")
        self.assertEqual(result["outcome"], "failed")
        self.assertEqual(result["task"]["failure"], "mismatch")
        self.assertIn("/other/Peach", result["task"]["failure_detail"])


if __name__ == "__main__":
    unittest.main()
