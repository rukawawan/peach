"""任务中心「需要处理」的数据源：每个后台服务各自的判据、时间口径与互不牵连。"""
from __future__ import annotations

import json
import sqlite3
import sys
import tempfile
import unittest
from contextlib import contextmanager
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))
sys.path.insert(0, str(Path(__file__).resolve().parent))

from peach import background_issues  # noqa: E402
from peach.background_issues import IssueLog  # noqa: E402
from peach.follow_scheduler import FollowUpdateScheduler  # noqa: E402
from peach.metadata_amane import bridge_python  # noqa: E402
from peach.tunnel import TunnelSnapshot  # noqa: E402
from support.amane import write_amane_metadata  # noqa: E402


class Clock:
    def __init__(self):
        self.now = 1_790_000_000.0

    def __call__(self):
        return self.now


def keys(rows):
    return [row["key"] for row in rows]


def write_bridge_python(tools):
    python = bridge_python(tools)
    python.parent.mkdir(parents=True)
    python.write_bytes(b"")


class BackgroundIssueTests(unittest.TestCase):
    def setUp(self):
        temporary = tempfile.TemporaryDirectory()
        self.addCleanup(temporary.cleanup)
        self.root = Path(temporary.name)
        self.clock = Clock()
        self.log = IssueLog(self.clock)
        # amane 桥装好的样子，其余用例才不会被它多出来的一项干扰。
        self.tools = self.root / "tools"
        write_bridge_python(self.tools)
        write_amane_metadata(self.tools, ready=True)
        self.contract = SimpleNamespace(tools_root=self.tools, follow_scheduler=None,
                                        feed_scheduler=None, downloads=None)
        self.state = SimpleNamespace()

    def collect(self, config=None):
        return self.log.collect(self.state, self.contract, config)

    def test_nothing_assembled_means_nothing_to_handle(self):
        self.assertEqual(self.log.collect(SimpleNamespace(), SimpleNamespace(), None), [])
        self.assertEqual(self.collect(), [])

    def test_a_failing_scheduler_carries_its_own_start_and_a_retry(self):
        scheduler = FollowUpdateScheduler(
            self.root / "state", lambda: {"ok": True, "checked": 1, "results": [{"ok": False}]},
            available=True)
        self.contract.follow_scheduler = scheduler
        scheduler._run()
        scheduler._run()
        [row] = self.collect()
        self.assertEqual({key: row[key] for key in ("key", "href", "link_label", "retry", "retry_available")}, {
            "key": "follow-schedule", "href": "/settings/subscriptions#followScheduleSetting",
            "link_label": "打开关注调度", "retry": "/api/follow/schedule/run", "retry_available": True})
        self.assertEqual(row["since"], scheduler.status()["failing_since"])
        self.assertNotIn("1 个来源检查失败", json.dumps(row, ensure_ascii=False))

        scheduler.run_check = lambda: {"ok": True, "checked": 1, "results": [{"ok": True}]}
        scheduler._run()
        self.assertEqual(self.collect(), [])

    def test_services_without_their_own_clock_report_when_this_process_noticed(self):
        self.state.network_reachability = SimpleNamespace(summary=lambda: {"state": "offline"})
        self.state.automatic_updates = SimpleNamespace(snapshot=lambda: {"error": "下载没有启动"})
        [network, updates] = self.collect()
        self.assertEqual((network["key"], network["href"], network["link_label"], network["retry"], network["since"]),
                         ("network", "/settings/network#peachProxy", "打开 Peach 代理设置",
                          "/api/network-status/check", None))
        noticed = network["noticed_at"]
        self.clock.now += 600
        self.assertEqual([row["noticed_at"] for row in self.collect()], [noticed, noticed])
        # 消失过一次再出现，是新的一段：重新计。
        self.state.network_reachability = SimpleNamespace(summary=lambda: {"state": "online"})
        self.assertEqual(keys(self.collect()), ["automatic-updates"])
        self.clock.now += 60
        self.state.network_reachability = SimpleNamespace(summary=lambda: {"state": "offline"})
        self.assertNotEqual(self.collect()[0]["noticed_at"], noticed)
        # 要改设置才修得好的只给链接，不给重试。
        self.assertEqual((updates["retry"], updates["link_label"]), (None, "打开自动更新设置"))

    def test_a_disabled_tunnel_with_a_leftover_error_is_not_a_problem(self):
        self.state.tunnel = SimpleNamespace(snapshot=lambda: TunnelSnapshot(state="stopped", error="上一次没有正常收尾"))
        config = SimpleNamespace(tunnel=SimpleNamespace(enabled=False))
        only = (background_issues._tunnel,)
        self.assertEqual(self.log.collect(self.state, self.contract, config, only), [])
        config.tunnel.enabled = True
        self.assertEqual(keys(self.log.collect(self.state, self.contract, config, only)), ["tunnel"])

    def test_downloads_count_tracked_tasks_waiting_out_a_transient_failure(self):
        connection = sqlite3.connect(":memory:")
        self.addCleanup(connection.close)
        connection.execute("CREATE TABLE download_task(state TEXT, failure_detail TEXT)")
        connection.executemany("INSERT INTO download_task VALUES(?, ?)", [
            ("remote_running", "查询进度时连不上 CloudDrive2：timeout"), ("submitted", "连不上 PikPak"),
            ("remote_running", None), ("failed", "远端拒收")])

        @contextmanager
        def read_connection():
            yield connection
        self.contract.downloads = SimpleNamespace(available=True)
        self.contract.database = SimpleNamespace(read_connection=read_connection)
        [row] = self.collect()
        self.assertEqual((row["key"], row["title"], row["href"]),
                         ("downloads", "2 个云下载任务对账暂时失败", "/tasks#cloudDownloads"))
        # 界面按 code 取当前语言：英文界面拿到的是英文。
        from peach import interface_text
        self.assertEqual(interface_text.text(f"server:{row['title_code']}", row["title_params"], "en"),
                         "Couldn't reconcile 2 cloud download tasks for now")
        self.assertEqual(interface_text.text(f"server:{row['link_label_code']}", None, "en"), "View cloud downloads")
        self.contract.downloads.available = False
        self.assertEqual(self.collect(), [])

    def test_push_discovery_reports_ingest_failures_and_a_stopped_watcher_only_when_enabled(self):
        snapshot = {"enabled": True, "watch_local": True, "local_running": False,
                    "local_message": "文件监视启动失败：权限不足",
                    "queue": {"failed": 1, "last_error": "database is locked"}}
        self.state.push_discovery = SimpleNamespace(snapshot=lambda: snapshot)
        self.assertEqual(keys(self.collect()), ["push-discovery", "push-discovery-watch"])
        snapshot["enabled"] = False
        self.assertEqual(self.collect(), [])

    def test_library_sharing_reads_this_weeks_failed_attempt(self):
        config = SimpleNamespace(tunnel=SimpleNamespace(enabled=False))
        attempts = iter([{"last_attempt": {"status": "failed"}}, {"last_attempt": {}}])
        with patch("peach.library_sharing.snapshot", lambda _config: next(attempts)):
            self.assertEqual(keys(self.log.collect(self.state, self.contract, config)), ["library-sharing"])
            self.assertEqual(self.log.collect(self.state, self.contract, config), [])

    def test_a_missing_amane_bridge_can_be_rebuilt_in_place_unless_a_rebuild_is_running(self):
        self.contract.tools_root = self.root / "empty-tools"
        job = {"status": "idle"}
        self.contract.amane_bridge_job = SimpleNamespace(snapshot=lambda: job)
        [row] = self.collect()
        self.assertEqual((row["key"], row["href"], row["link_label"], row["retry"], row["retry_available"]),
                         ("amane-bridge", "/sources#amane", "打开 amane 设置",
                          "/api/scraping/amane-bridge/rebuild", True))
        job["status"] = "running"
        self.assertFalse(self.collect()[0]["retry_available"])
        job["status"] = "idle"
        self.state.sync = SimpleNamespace(read_only=True)
        self.assertFalse(self.collect()[0]["retry_available"])

    def test_a_venv_left_by_a_failed_rebuild_still_needs_the_bridge(self):
        self.contract.tools_root = self.root / "half-built-tools"
        write_bridge_python(self.contract.tools_root)
        self.assertEqual(keys(self.collect()), ["amane-bridge"])

    def test_a_failed_face_model_download_points_at_its_card_and_can_be_retried(self):
        latest: list = []
        self.contract.task_runs = SimpleNamespace(query=lambda **_: list(latest), available=lambda: True)
        # 还没取过：下次用到时会自己去取，不算问题。
        self.assertEqual(self.collect(), [])
        latest.append(SimpleNamespace(id=42, active=False, status="failed",
                                      finished_at="2026-10-22T08:00:00Z", error="连不上 GitHub"))
        [row] = self.collect()
        self.assertEqual({key: row[key] for key in ("key", "href", "link_label", "since", "retry", "retry_available")}, {
            "key": "face-models", "href": "/tasks#run-42", "link_label": "查看失败记录",
            "since": "2026-10-22T08:00:00Z", "retry": "/api/face-models", "retry_available": True})
        self.assertNotIn("连不上 GitHub", json.dumps(row, ensure_ascii=False))
        # 重新下载在跑时这一行先收起。
        latest[0] = SimpleNamespace(id=43, active=True, status="running", finished_at=None, error="")
        self.assertEqual(self.collect(), [])

    def test_one_broken_service_does_not_hide_the_others(self):
        def broken():
            raise RuntimeError("state file is unreadable")
        self.state.automatic_updates = SimpleNamespace(snapshot=broken)
        self.state.network_reachability = SimpleNamespace(summary=lambda: {"state": "offline"})
        with self.assertLogs("peach.background_issues", level="ERROR"):
            self.assertEqual(keys(self.collect()), ["network"])


if __name__ == "__main__":
    unittest.main()
