"""任务中心的接线：后台任务、批量操作、读取端点与 409。

服务层自己的不变量在 `test_task_runs.py`。这里只管「各域有没有真的接上去」——
最容易坏的正是这一层：服务写得再对，没人调用它，活动页上就是一片空白。
"""
from __future__ import annotations

import json
import sqlite3
import tempfile
import threading
import types
import unittest
import unittest.mock
from pathlib import Path

from peach import web_contract, web_tasks
from peach.jobs import BackgroundJob, TaskRunConflict
from peach.routes_api import api_get, api_post, task_run_detail, task_run_control
from peach.repository import LedgerDatabase
from peach.task_runs import TaskRunStore
from support.ledger import fresh_ledger


class BackgroundJobTaskRunTests(unittest.TestCase):
    """`BackgroundJob` 每一轮都要在表里留下开始、进度与结束。"""

    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.db = fresh_ledger(self.tmp.name)
        self.store = TaskRunStore(LedgerDatabase(self.db), host="test-host")

    def job(self, task_key="demo", **kwargs):
        return BackgroundJob("PeachDemoJob", task_key=task_key, runs=self.store,
                             **kwargs)

    def test_a_finished_round_leaves_one_succeeded_row_with_its_counts(self):
        job = self.job()
        done = threading.Event()

        def work(job_id):
            job.update(job_id, checked=3, total=7, stage="正在查", results=[1, 2, 3])
            job.update(job_id, status="complete", checked=7)
            done.set()

        job.start(work)
        self.assertTrue(done.wait(5))
        job.thread.join(5)
        runs = self.store.query(task_key="demo")
        self.assertEqual(len(runs), 1)
        self.assertEqual(runs[0].status, "succeeded")
        self.assertEqual(runs[0].trigger, "manual")
        # 明细不进摘要，标量才进：活动页上那一行要一眼看完。
        self.assertEqual(runs[0].result_summary["checked"], 7)
        self.assertNotIn("results", runs[0].result_summary)

    def test_the_state_carries_the_run_id_so_the_page_can_link_to_it(self):
        job = self.job()
        job.start(lambda job_id: job.update(job_id, status="complete"))
        job.thread.join(5)
        self.assertEqual(job.snapshot()["run_id"], self.store.query()[0].id)

    def test_domain_results_retain_counts_without_copying_private_detail_lists(self):
        cases = [
            ('link-check', {'gone': [{'url': 'private'}], 'unclear': [1, 2]},
             {'gone_count': 1, 'unclear_count': 2}),
            ('resource-scan', {'result': {'missing': 5, 'purge': 3, 'vanish': 2,
                'empty': 8, 'unreadable': 1, 'cache': {'files': 9, 'bytes': 2048}}},
             {'missing': 5, 'purge': 3, 'vanish': 2, 'empty': 8, 'unreadable': 1,
              'cache_files': 9, 'cache_bytes': 2048}),
            ('follow-check', {'results': [{'ok': True, 'added': 3, 'updated': 1},
                                         {'ok': False, 'error': 'private'}]},
             {'source_failed': 1, 'source_warning': 0, 'added': 3, 'updated': 1}),
            ('feed-check', {'added': 7, 'results': [{'ok': False},
                            {'ok': True, 'added': 2, 'backfill_error': 'private'}]},
             {'source_failed': 1, 'source_warning': 1, 'added': 7}),
            ('follow-resolve', {'results': [{'kind': 'error'},
                {'kind': 'term', 'candidates': [1, 2], 'failures': ['private']}]},
             {'resolve_failed': 1, 'sources_found': 2, 'source_failed': 1}),
            ('taste-refresh', {'warnings': ['private'], 'refresh': [{}, {}]},
             {'warning_count': 1, 'profiles_checked': 2}),
            ('resource-apply', {'cache_blocked': ['private'], 'blocked_count': 2},
             {'cache_blocked_count': 1, 'blocked_count': 2}),
            ('organize', {'counts': {'skip': 3}, 'moved': 4, 'failed': 1},
             {'skipped': 3, 'moved': 4, 'failed': 1}),
        ]
        for key, state, expected in cases:
            with self.subTest(key=key):
                job = self.job(key)
                job.start(lambda job_id, current=job: current.update(job_id, status='complete'), initial=state)
                job.thread.join(5)
                self.assertFalse(job.thread.is_alive())
                summary = self.store.query(task_key=key)[0].result_summary
                self.assertEqual({field: summary[field] for field in expected}, expected)
                self.assertNotIn('private', json.dumps(summary))

    def test_progress_updates_land_in_the_table(self):
        job = self.job()
        holding = threading.Event()
        release = threading.Event()

        def work(job_id):
            job.update(job_id, checked=2, total=5, stage="第二个")
            holding.set()
            release.wait(5)
            job.update(job_id, status="complete")

        job.start(work)
        self.assertTrue(holding.wait(5))
        live = self.store.query(status="active")[0]
        self.assertEqual((live.progress_current, live.progress_total), (2, 5))
        self.assertEqual(live.progress_label, "第二个")
        release.set()
        job.thread.join(5)

    def test_source_issues_keep_the_round_identity_and_readable_reason(self):
        job = self.job('follow-check')
        job.start(lambda job_id: job.update(job_id, status='complete'), initial={
            'results': [
                {'source': 17, 'label': '示例作者', 'provider_label': '示例站点',
                 'ok': False, 'error': 'HTTP 403', 'url': 'private'},
                {'source': 18, 'label': '另一来源', 'ok': True, 'backfill_error': '连接超时'},
            ],
        })
        job.thread.join(5)
        summary = self.store.query(task_key='follow-check')[0].result_summary
        self.assertEqual(summary['source_failed'], 1)
        self.assertEqual(summary['source_warning'], 1)
        self.assertEqual(summary['issues'], [
            {'source': 17, 'label': '示例作者', 'provider': '示例站点', 'kind': '检查失败', 'error': 'HTTP 403'},
            {'source': 18, 'label': '另一来源', 'provider': '', 'kind': '补查失败', 'error': '连接超时'},
        ])
        self.assertNotIn('private', json.dumps(summary))

    def test_a_locked_ledger_during_progress_does_not_fail_the_round(self):
        """进度写不进去只丢这一次进度：这一轮照常跑完，结算照常落地。"""
        job = self.job()
        blocker = sqlite3.connect(self.db, isolation_level=None, check_same_thread=False)
        self.addCleanup(blocker.close)
        reached = []

        def work(job_id):
            blocker.execute("BEGIN IMMEDIATE")
            try:
                job.update(job_id, checked=1, total=2, stage="数据库被别的写入者占着")
            finally:
                blocker.execute("ROLLBACK")
            reached.append(job_id)
            job.update(job_id, status="complete", checked=2)

        with unittest.mock.patch("peach.task_runs.PROGRESS_LOCK_TIMEOUT", 0.05), \
                self.assertLogs("peach.task_runs", "WARNING"):
            started = job.start(work)
            job.thread.join(5)
        self.assertEqual(reached, [started["job_id"]])
        self.assertEqual(job.snapshot()["status"], "complete")
        run = self.store.query(task_key="demo")[0]
        self.assertEqual(run.status, "succeeded")
        self.assertEqual(run.result_summary["checked"], 2)

    def test_a_failing_round_is_recorded_as_failed_with_its_reason(self):
        job = self.job()

        def work(_job_id):
            raise RuntimeError("上游挡回来了")

        job.start(work)
        job.thread.join(5)
        run = self.store.query()[0]
        self.assertEqual(run.status, "failed")
        self.assertIn("上游挡回来了", run.error)

    def test_manual_restart_over_a_foreign_run_is_a_conflict(self):
        """表里那一轮不是这个进程开的，本类自己的锁看不见它，只有互斥键看得见。"""
        blocking = self.store.start("demo", trigger="cli", mutex_key="demo")
        job = self.job()
        with self.assertRaises(TaskRunConflict) as caught:
            job.start(lambda job_id: None)
        self.assertEqual(caught.exception.blocking_run_id, blocking.id)
        # 冲突之后这个任务必须回到没跑过的样子，否则界面会卡在一个假的「进行中」。
        self.assertIsNone(job.snapshot())

    def test_a_scheduled_trigger_that_finds_the_job_busy_records_the_skip(self):
        job = self.job()
        holding = threading.Event()
        release = threading.Event()

        def work(job_id):
            holding.set()
            release.wait(5)
            job.update(job_id, status="complete")

        job.start(work)
        self.assertTrue(holding.wait(5))
        job.start(lambda job_id: None, trigger="scheduled")
        release.set()
        job.thread.join(5)
        skipped = [run for run in self.store.query() if run.trigger == "scheduled"]
        self.assertEqual(len(skipped), 1)
        self.assertEqual(skipped[0].status, "cancelled")
        self.assertIn("跳过", skipped[0].error)

    def test_a_superseded_round_is_settled_instead_of_hanging_on_the_mutex(self):
        """被顶掉的那一轮也得有人收尾，否则互斥键堵到下次重启。"""
        job = self.job()
        release = threading.Event()
        job.start(lambda job_id: release.wait(5))
        first_thread = job.thread
        first_id = job.snapshot()["run_id"]
        job.update(job.snapshot()["job_id"], status="complete")
        job.start(lambda job_id: job.update(job_id, status="complete"), restart=True)
        release.set()
        first_thread.join(5)
        job.thread.join(5)
        self.assertFalse(first_thread.is_alive())
        self.assertEqual(self.store.get(first_id).status, "succeeded")
        self.assertEqual(len(self.store.query(status="active")), 0)

    def test_a_restart_right_after_a_round_returns_waits_for_its_row_to_close(self):
        """上一轮的线程正在把表里那一行写成结束，紧跟着的手动重来不能撞它的互斥键。"""
        job = self.job()
        closing = threading.Event()
        finish = self.store.finish

        def slow_finish(run_id, status, **kwargs):
            closing.set()
            threading.Event().wait(0.3)
            return finish(run_id, status, **kwargs)

        with unittest.mock.patch.object(self.store, "finish", side_effect=slow_finish):
            job.start(lambda job_id: job.update(job_id, status="complete"))
            self.assertTrue(closing.wait(5))
            job.start(lambda job_id: job.update(job_id, status="complete"), restart=True)
            job.thread.join(5)
        self.assertEqual([run.status for run in self.store.query()], ["succeeded", "succeeded"])

    def test_shutdown_marks_the_round_cancelled_not_failed(self):
        job = self.job()
        release = threading.Event()
        job.start(lambda job_id: release.wait(5))
        self.addCleanup(job.thread.join, 5)
        self.addCleanup(release.set)
        run_id = job.snapshot()["run_id"]
        job.stop(timeout=0.1)
        run = self.store.get(run_id)
        self.assertEqual(run.status, "cancelled")
        self.assertIn("关停", run.error)

    def test_a_job_without_a_store_still_runs(self):
        """裸 `BackgroundJob`（测试与老调用点）不带 store，一切照旧。"""
        job = BackgroundJob("PeachBareJob")
        job.start(lambda job_id: job.update(job_id, status="complete"))
        job.thread.join(5)
        self.assertEqual(job.snapshot()["status"], "complete")


class ContractWiringTests(unittest.TestCase):
    """契约装配起来之后，每个后台任务都要有自己的 `task_key`。"""

    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.db = fresh_ledger(self.tmp.name)
        self.contract = web_contract.WebContract(self.db)

    def test_every_background_job_is_attached_to_the_task_center(self):
        jobs = [value for value in vars(self.contract).values()
                if isinstance(value, BackgroundJob)]
        self.assertGreaterEqual(len(jobs), 9)
        for job in jobs:
            self.assertIs(job.runs, self.contract.task_runs, job.name)
            self.assertTrue(job.task_key, job.name)
            # task_key 是活动页上的身份，不能是类名那种实现细节。
            self.assertNotEqual(job.task_key, job.name)
        self.assertEqual(len({job.task_key for job in jobs}), len(jobs))

    def test_a_batch_operation_leaves_one_row(self):
        # `with` 只提交，不关连接：Windows 上那个还开着的句柄会让临时目录删不掉。
        connection = sqlite3.connect(self.db)
        try:
            with connection:
                connection.execute(
                    "INSERT INTO asset(id,location,path,name,medium) "
                    "VALUES(1,'local','R:\\Media\\a.mp4','a.mp4','video')")
        finally:
            connection.close()
        web_contract.w_batch(self.contract, {"ids": [1], "operation": "like"})
        run = self.contract.task_runs.query(task_key="batch")[0]
        self.assertEqual(run.status, "succeeded")
        self.assertEqual(run.result_summary["operation"], "like")
        self.assertEqual(run.progress_total, 1)

    def test_a_rejected_batch_is_recorded_as_failed(self):
        with self.assertRaises(ValueError):
            web_contract.w_batch(self.contract, {"ids": [999], "operation": "like"})
        run = self.contract.task_runs.query(task_key="batch")[0]
        self.assertEqual(run.status, "failed")
        self.assertIn("assets not found", run.error)


class TasksEndpointTests(unittest.TestCase):
    def test_complete_summaries_do_not_load_the_recovery_detail_file(self):
        run = self.store.start('link-check', trigger='manual')
        summary = {'gone_count': 1, 'unclear_count': 2}
        self.store.finish(run.id, 'succeeded', summary=summary)
        with unittest.mock.patch('peach.job_recovery.read', side_effect=AssertionError('不需要读取明细')):
            self.assertEqual(web_tasks.q_task(self.contract, run.id)['run']['result_summary'], summary)

    def test_saved_results_enrich_only_the_matching_finished_round_without_writes(self):
        from peach import job_recovery

        older = self.store.start('link-check', trigger='manual')
        self.store.finish(older.id, 'succeeded', summary={'checked': 12})
        latest = self.store.start('link-check', trigger='manual')
        original = {'checked': 20}
        self.store.finish(latest.id, 'succeeded', summary=original)
        job_recovery.save(self.db, 'link-check', 'saved', {}, run_id=latest.id)
        job_recovery.checkpoint(self.db, 'link-check', 'saved',
                               {'gone': [{'url': 'private'}], 'unclear': [1, 2]})
        job_recovery.finish(self.db, 'link-check', 'saved', 'complete')

        for args, field in [({}, 'finished'), ({'task_key': 'link-check'}, 'runs')]:
            rows = {row['id']: row for row in web_tasks.q_tasks(self.contract, args)[field]}
            self.assertEqual(rows[latest.id]['result_summary'],
                             {'checked': 20, 'gone_count': 1, 'unclear_count': 2})
            self.assertEqual(rows[older.id]['result_summary'], {'checked': 12})
        self.assertEqual(web_tasks.q_task(self.contract, latest.id)['run']['result_summary'],
                         {'checked': 20, 'gone_count': 1, 'unclear_count': 2})
        self.assertEqual(self.store.get(latest.id).result_summary, original)
        job_recovery.save(self.db, 'link-check', 'active', {}, run_id=older.id)
        job_recovery.checkpoint(self.db, 'link-check', 'active', {'gone': [1]})
        self.assertEqual(web_tasks.q_task(self.contract, older.id)['run']['result_summary'],
                         {'checked': 12})

    def test_result_versions_track_committed_fields_and_candidates_without_task_heartbeats(self):
        from pathlib import Path
        self.contract.candidate_root = Path(self.tmp.name) / 'candidates'
        self.contract.candidate_root.mkdir()
        before = web_tasks.q_tasks(self.contract, {})['result_versions']
        run = self.store.start('library-processing', trigger='manual')
        self.store.progress(run.id, current=1, label='读取资料')
        self.assertEqual(web_tasks.q_tasks(self.contract, {})['result_versions'], before)
        with self.contract.write_transaction() as connection:
            connection.execute("INSERT INTO asset(path,name,location,medium) VALUES('A:/one.mp4','one.mp4','local','video')")
        committed = web_tasks.q_tasks(self.contract, {})['result_versions']
        self.assertNotEqual(committed['catalog'], before['catalog'])
        self.assertEqual(committed['follow'], before['follow'])
        (self.contract.candidate_root / 'sample.csv').write_text('item_key\nasset:1:title\n', encoding='utf-8')
        self.assertNotEqual(web_tasks.q_tasks(self.contract, {})['result_versions']['review'], committed['review'])

    def test_the_page_wide_poll_carries_versions_and_notices_without_the_task_list(self):
        """每个页面常驻的那份轮询只带结果版本、入库通知和忙不忙，和任务中心那份版本一致。"""
        from pathlib import Path
        self.contract.candidate_root = Path(self.tmp.name) / 'candidates'
        self.contract.candidate_root.mkdir()
        idle = web_tasks.q_result_updates(self.contract, {})
        self.assertEqual(set(idle), {'ok', 'result_versions', 'ingest_notices', 'busy'})
        self.assertFalse(idle['busy'])
        self.assertEqual(idle['result_versions'], web_tasks.q_tasks(self.contract, {})['result_versions'])
        run = self.store.start('library-processing', trigger='manual')
        self.assertTrue(web_tasks.q_result_updates(self.contract, {})['busy'])
        self.store.finish(run.id, 'succeeded')
        self.assertFalse(web_tasks.q_result_updates(self.contract, {})['busy'])

    def _insert_asset(self, name, *, background):
        from peach.repository import in_background

        def write():
            with self.contract.write_transaction() as connection:
                connection.execute("INSERT INTO asset(path,name,location,medium) VALUES(?,?,'local','video')",
                                   (f'A:/{name}', name))
        worker = threading.Thread(target=in_background(write) if background else write)
        worker.start()
        worker.join(5)

    def test_background_writes_change_the_page_wide_versions_at_most_every_interval(self):
        """批处理每几秒提交一次；页面两秒轮询一次，版本一变就整组重取，有任务在跑时要按住。"""
        now = [1000.0]
        run = self.store.start('library-processing', trigger='manual')
        with unittest.mock.patch('peach.web_tasks.time.monotonic', lambda: now[0]):
            first = web_tasks.q_result_updates(self.contract, {})['result_versions']
            self._insert_asset('one.mp4', background=True)
            now[0] += 2
            self.assertEqual(web_tasks.q_result_updates(self.contract, {})['result_versions'], first)
            now[0] += web_tasks.RESULT_UPDATE_INTERVAL
            held = web_tasks.q_result_updates(self.contract, {})['result_versions']
            self.assertNotEqual(held['catalog'], first['catalog'])
            # 用户自己点的写入立即放出。
            self._insert_asset('two.mp4', background=False)
            now[0] += 2
            mine = web_tasks.q_result_updates(self.contract, {})['result_versions']
            self.assertNotEqual(mine['catalog'], held['catalog'])
            # 空闲时不节流。
            self.store.finish(run.id, 'succeeded')
            self._insert_asset('three.mp4', background=True)
            now[0] += 2
            self.assertNotEqual(web_tasks.q_result_updates(self.contract, {})['result_versions']['catalog'],
                                mine['catalog'])

    def test_a_refresh_landing_only_moves_the_keys_whose_tables_it_read(self):
        """写回一份只读关注表的结果，不让馆藏那一组页面也跟着重取。"""
        before = web_tasks.q_result_updates(self.contract, {})['result_versions']
        with self.contract.cache_lock:
            self.contract.cache_landed['follow_item'] = 1
        after = web_tasks.q_result_updates(self.contract, {})['result_versions']
        self.assertNotEqual(after['follow'], before['follow'])
        self.assertEqual(after['catalog'], before['catalog'])
        self.assertEqual(after['discoveries'], before['discoveries'])

    def test_finished_runs_are_listed_without_a_query_per_row(self):
        """最近完成那一页两百来条大多早已结束：控制状态与资源占用只问还有活动的那几条，连接数不随页长增长。"""
        from unittest import mock
        for _ in range(30):
            self.store.finish(self.store.start('library-processing', trigger='manual').id, 'succeeded')
        parent = self.store.start('parent', trigger='manual')
        self.store.enqueue_followups(parent.id, [('leaf:1', 'leaf', '还在排的后继')])
        self.store.finish(parent.id, 'succeeded')
        original = self.store.database.read_connection
        opened = []

        def counted():
            opened.append(1)
            return original()

        with mock.patch.object(self.store.database, 'read_connection', side_effect=counted):
            payload = web_tasks.q_tasks(self.contract, {'limit': '100'})
        controlled = [row['id'] for row in (*payload['finished'], *payload['working_parents']) if 'control' in row]
        self.assertEqual(controlled, [parent.id])
        self.assertLess(len(opened), 20, f'连接数：{len(opened)}')

    def test_ingest_notices_ride_along_with_the_task_list(self):
        from unittest import mock

        from peach.ingest_notices import IngestNotices
        notices = IngestNotices()
        notices.add('download', 7, 'SSIS-057')
        notices.add('discovered', 0, '无效编号不记')
        with mock.patch.object(web_tasks, 'NOTICES', notices):
            payload = web_tasks.q_tasks(self.contract, {})['ingest_notices']
        self.assertEqual(payload['epoch'], notices.epoch)
        self.assertEqual([(item['id'], item['kind'], item['asset_id'], item['label']) for item in payload['items']],
                         [(1, 'download', 7, 'SSIS-057')])

    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.db = fresh_ledger(self.tmp.name)
        self.contract = web_contract.WebContract(self.db)
        self.store = self.contract.task_runs

    def test_the_default_payload_answers_the_three_questions_at_once(self):
        running = self.store.start("follow-check", trigger="manual",
                                   mutex_key="follow-check", total=4)
        self.store.progress(running.id, current=2, label="第二个来源")
        self.store.start("follow-check", trigger="scheduled",
                         mutex_key="follow-check", conflict="skip")
        done = self.store.start("batch", trigger="manual")
        self.store.finish(done.id, "succeeded", summary={"changed": 3})
        payload = web_tasks.q_tasks(self.contract, {})
        self.assertTrue(payload["available"])
        self.assertEqual([row["id"] for row in payload["running"]], [running.id])
        self.assertEqual(payload["running"][0]["progress_current"], 2)
        self.assertEqual(payload["running"][0]["task_label"], "追更检查")
        self.assertIsNotNone(payload["running"][0]["elapsed_seconds"])
        self.assertEqual([row["result_summary"]["blocked_by"]
                          for row in payload["skipped"]], [running.id])
        self.assertIn(done.id, [row["id"] for row in payload["finished"]])

    def test_filters_switch_the_payload_to_a_flat_list(self):
        self.store.start("batch", trigger="manual")
        self.store.start("follow-check", trigger="manual")
        payload = web_tasks.q_tasks(self.contract, {"task_key": "batch"})
        self.assertTrue(payload["filtered"])
        self.assertEqual([row["task_key"] for row in payload["runs"]], ["batch"])

    def _settled(self, finished_at: str) -> int:
        """跑完一轮并把结束时刻钉成给定值：同一毫秒里结算的几轮分不出先后。"""
        run = self.store.start("batch", trigger="manual")
        self.store.finish(run.id, "succeeded")
        with self.store.database.write_transaction(notify=False) as connection:
            connection.execute("UPDATE task_run SET finished_at=? WHERE id=?",
                               (finished_at, run.id))
        return run.id

    def test_recent_runs_page_back_by_finish_time_without_repeats_or_gaps(self):
        early = [self._settled(f"2026-09-11T10:0{minute}:00.000Z") for minute in range(5)]
        # 开跑最早、结束最晚的那一轮：按 id 排它会沉到最后一页，按结束时刻它排第一。
        slow = self.store.start("batch", trigger="manual")
        late = self._settled("2026-09-11T10:05:00.000Z")
        self.store.finish(slow.id, "succeeded")
        with self.store.database.write_transaction(notify=False) as connection:
            connection.execute("UPDATE task_run SET finished_at=? WHERE id=?",
                               ("2026-09-11T10:06:00.000Z", slow.id))

        first = web_tasks.q_tasks(self.contract, {"limit": "3"})
        self.assertEqual([row["id"] for row in first["finished"]], [slow.id, late, early[4]])
        self.assertTrue(first["finished_has_more"])
        seen = [row["id"] for row in first["finished"]]
        page = first
        while page["finished_has_more"]:
            oldest = page["finished"][-1]
            page = web_tasks.q_tasks(self.contract, {
                "limit": "3", "before_finished_at": oldest["finished_at"],
                "before_id": str(oldest["id"])})
            self.assertNotIn("running", page, "往前翻的那一页不该再带一份在跑的快照")
            seen += [row["id"] for row in page["finished"]]
        self.assertEqual(seen, [slow.id, late, *reversed(early)])

    def test_recent_page_numbers_support_totals_and_clamp_to_the_last_page(self):
        ids = [self._settled(f"2026-09-11T10:0{minute}:00.000Z") for minute in range(5)]
        page = web_tasks.q_tasks(self.contract, {"limit": "2", "page": "2"})
        self.assertEqual([row['id'] for row in page['finished']], [ids[2], ids[1]])
        self.assertEqual(page['finished_total'], 5)
        self.assertEqual(page['finished_page'], 2)
        last = web_tasks.q_tasks(self.contract, {"limit": "2", "page": "99"})
        self.assertEqual([row['id'] for row in last['finished']], [ids[0]])
        self.assertEqual(last['finished_page'], 3)
        for value in ('0', '-1', 'invalid'):
            with self.assertRaises(ValueError):
                web_tasks.q_tasks(self.contract, {'page': value})

    def test_a_page_counts_top_level_runs_and_brings_their_followups_along(self):
        """一轮派出二十条后继时，按行数翻页会让后继把派出它们的那一轮挤出第一页。"""
        parent = self.store.start("feed-check", trigger="manual")
        self.store.finish(parent.id, "succeeded")
        queued = self.store.enqueue_followups(
            parent.id, [(f"feed-scrape:C-{n}", "feed-scrape", f"C-{n}") for n in range(4)])["queued"]
        for run_id in queued:
            self.store.finish(run_id, "succeeded")
        newer = self._settled("2999-01-01T00:00:00.000Z")

        first = web_tasks.q_tasks(self.contract, {"limit": "2"})
        self.assertEqual([row["id"] for row in first["finished"]], [newer, parent.id, *queued])
        self.assertFalse(first["finished_has_more"])

    def test_a_running_parent_brings_its_settled_followups(self):
        parent = self.store.start("follow-check", trigger="manual")
        queued = self.store.enqueue_followups(
            parent.id, [("entity-avatar:performer:1", "entity-avatar", "补头像")])["queued"]
        self.store.finish(queued[0], "succeeded")
        payload = web_tasks.q_tasks(self.contract, {})
        self.assertEqual([row["id"] for row in payload["running"]], [parent.id])
        self.assertEqual([row["id"] for row in payload["finished"]], queued)

    def test_a_running_parent_sends_only_its_latest_settled_followups_with_the_full_count(self):
        """任务中心两秒取一次；一轮派出上千条后继时只下发最近那几条，总数看计数。"""
        parent = self.store.start("follow-check", trigger="manual")
        queued = self.store.enqueue_followups(
            parent.id, [(f"entity-avatar:performer:{n}", "entity-avatar", f"补头像 {n}")
                        for n in range(5)])["queued"]
        for run_id in queued:
            self.store.finish(run_id, "succeeded")
        with unittest.mock.patch("peach.task_runs.SETTLED_FOLLOWUP_LIMIT", 2):
            payload = web_tasks.q_tasks(self.contract, {})
        self.assertEqual([row["id"] for row in payload["finished"]], queued[-2:])
        self.assertEqual(payload["followup_counts"][str(parent.id)], {"succeeded": 5})

    def test_a_dispatch_with_dozens_of_followups_stays_one_working_parent_with_counts(self):
        """自动修复每批派几十条；接口只下发最近几条排队的，但在跑的、父任务与总数都不能丢。"""
        older = self.store.start("upgrade-repairs", trigger="scheduled", mutex_key="upgrade-repairs")
        self.store.finish(older.id, "succeeded", summary={"outcome": "已安排 30 项处理"})
        first = self.store.enqueue_followups(
            older.id, [(f"upgrade-library:x:{n}", "upgrade-library", f"ABC-{n:03}") for n in range(30)])["queued"]
        self.store.finish(first[0], "succeeded")
        claimed = self.store.claim_followup(("upgrade-library",))
        newer = [self._settled(f"2026-10-28T09:{minute:02}:00.000Z") for minute in range(4)]

        payload = web_tasks.q_tasks(self.contract, {"limit": "3"})

        # 在跑的那条下发了，哪怕比它新的排队项有二十多条；排队的只取最近三条。
        running_ids = [row["id"] for row in payload["running"]]
        self.assertIn(claimed.id, running_ids)
        self.assertEqual(len(running_ids), 4)
        # 父任务比「最近完成」这一页还早，也不进这一页，单独作为进行中的父任务下发。
        self.assertNotIn(older.id, [row["id"] for row in payload["finished"]])
        self.assertEqual([row["id"] for row in payload["working_parents"]], [older.id])
        self.assertEqual(payload["followup_counts"][str(older.id)],
                         {"succeeded": 1, "running": 1, "pending": 28})
        self.assertEqual([row["id"] for row in payload["finished"]], list(reversed(newer))[:3])

    def test_a_parent_returns_to_recent_runs_once_its_followups_are_done(self):
        parent = self.store.start("upgrade-repairs", trigger="scheduled")
        self.store.finish(parent.id, "succeeded")
        queued = self.store.enqueue_followups(
            parent.id, [("upgrade-library:x:1", "upgrade-library", "ABC-001")])["queued"]
        self.assertEqual(web_tasks.q_tasks(self.contract, {})["finished"], [])
        self.store.finish(queued[0], "succeeded")
        payload = web_tasks.q_tasks(self.contract, {})
        self.assertEqual([row["id"] for row in payload["finished"]], [parent.id, *queued])
        self.assertEqual(payload["working_parents"], [])
        self.assertEqual(payload["followup_counts"][str(parent.id)], {"succeeded": 1})

    def test_a_short_history_says_there_is_nothing_earlier(self):
        self._settled("2026-09-11T10:00:00.000Z")
        self.assertFalse(web_tasks.q_tasks(self.contract, {})["finished_has_more"])

    def test_runs_sharing_a_finish_moment_are_split_by_id(self):
        same = "2026-09-11T10:00:00.000Z"
        ids = [self._settled(same) for _ in range(3)]
        page = web_tasks.q_tasks(self.contract, {
            "before_finished_at": same, "before_id": str(ids[2])})
        self.assertEqual([row["id"] for row in page["finished"]], [ids[1], ids[0]])
        self.assertFalse(page["finished_has_more"])

    def test_a_malformed_cursor_is_a_bad_request(self):
        for args in ({"before_id": "3"},
                     {"before_finished_at": "2026-09-11T10:00:00.000Z"},
                     {"before_finished_at": "昨天", "before_id": "3"},
                     {"before_finished_at": "2026-09-11T10:00:00.000Z", "before_id": "0"},
                     {"before_finished_at": "2026-09-11T10:00:00.000Z", "before_id": "3",
                      "task_key": "batch"}):
            with self.subTest(args=args), self.assertRaises(ValueError):
                web_tasks.q_tasks(self.contract, args)

    def test_an_unknown_status_is_a_bad_request_not_an_empty_list(self):
        with self.assertRaises(ValueError):
            web_tasks.q_tasks(self.contract, {"status": "沉睡"})

    def test_a_ledger_without_the_table_reports_itself_instead_of_failing(self):
        """迁移是单独一步，升级后第一次打开活动页撞上这张表不存在是正常路径。"""
        bare = Path(self.tmp.name) / "bare.db"
        sqlite3.connect(bare).close()
        contract = web_contract.WebContract(bare)
        payload = web_tasks.q_tasks(contract, {})
        self.assertFalse(payload["available"])
        self.assertEqual(payload["running"], [])
        self.assertIn("migrate", payload["message"])

    def test_one_run_reads_back_by_id(self):
        run = self.store.start("batch", trigger="cli")
        self.assertEqual(web_tasks.q_task(self.contract, run.id)["run"]["id"], run.id)
        with self.assertRaises(KeyError):
            web_tasks.q_task(self.contract, run.id + 1000)

    def test_the_list_endpoint_is_registered_on_the_read_contract(self):
        self.assertIs(web_contract.GET_HANDLERS["/api/tasks"], web_tasks.q_tasks)


def _request(contract):
    """routes_api 的端点只用到 `request.app.state` 里的这几样。"""
    state = types.SimpleNamespace(web_contract=contract, sync=None)
    return types.SimpleNamespace(app=types.SimpleNamespace(state=state))


class ConflictStatusTests(unittest.TestCase):
    """撞上在跑的那一轮是 409，不是 500，而且要说清是谁挡的。"""

    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.db = fresh_ledger(self.tmp.name)
        self.contract = web_contract.WebContract(self.db)
        self.request = _request(self.contract)

    def test_a_manual_post_onto_a_running_round_returns_409(self):
        blocking = self.contract.task_runs.start(
            "follow-check", trigger="cli", mutex_key="follow-check")
        response = api_post(self.request, "follow/check", {}, {})
        self.assertEqual(response.status_code, 409)
        body = response.body.decode("utf-8")
        self.assertIn(f'"blocking_run_id":{blocking.id}', body)
        self.assertIn("follow-check", body)
        # 机器读的是 `error` 与 `task_key`，人读的是 `message`：后者里不留英文任务键。
        self.assertIn("追更检查已有一轮在进行", json.loads(body)["message"])

    def test_a_get_that_conflicts_returns_409_too(self):
        error = TaskRunConflict("demo", 7)

        def boom(_contract, _args):
            raise error

        with unittest.mock.patch.dict(web_contract.GET_HANDLERS,
                                      {"/api/tasks": boom}):
            response = api_get(self.request, "tasks", {})
        self.assertEqual(response.status_code, 409)
        self.assertIn('"blocking_run_id":7', response.body.decode("utf-8"))

    def test_the_detail_route_answers_by_id_and_404s_for_the_rest(self):
        run = self.contract.task_runs.start("batch", trigger="manual")
        self.assertEqual(task_run_detail(self.request, run.id, {})["run"]["id"], run.id)
        self.assertEqual(
            task_run_detail(self.request, run.id + 1000, {}).status_code, 404)

    def test_control_endpoint_exposes_pending_pause_and_resumes_the_same_row(self):
        parent = self.contract.task_runs.start('parent', trigger='manual')
        child = self.contract.task_runs.enqueue_followups(parent.id, [('leaf:1', 'leaf', '子任务')])['queued'][0]
        self.contract.task_runs.finish(parent.id, 'succeeded')
        with unittest.mock.patch.object(self.contract.followups, 'wake') as wake:
            paused = task_run_control(self.request, child, {'action': 'pause'}, {})
            self.assertEqual(paused['run']['control'], {'state': 'paused',
                             'actions': ['resume', 'cancel', 'set_speed'], 'speed_mode': 'standard'})
            continued = task_run_control(self.request, child, {'action': 'resume'}, {})
            self.assertEqual(continued['run']['id'], child)
            self.assertEqual(continued['run']['control']['state'], 'running')
            self.assertEqual(wake.call_count, 2)

    def test_task_speed_endpoint_changes_only_the_selected_run(self):
        from peach.web_settings import q_settings
        run = self.contract.task_runs.start('scan', trigger='manual')
        other = self.contract.task_runs.start('probe', trigger='manual')
        with unittest.mock.patch.object(self.contract.followups, 'wake'):
            response = task_run_control(self.request, run.id,
                                        {'action': 'set_speed', 'speed_mode': 'low'}, {})
        self.assertEqual(response['run']['control']['speed_mode'], 'low')
        self.assertEqual(task_run_detail(self.request, other.id, {})['run']['control']['speed_mode'], 'standard')
        self.assertEqual(q_settings(self.contract)['taskSpeedMode'], 'standard')
        invalid = task_run_control(self.request, run.id, {'action': 'set_speed', 'speed_mode': 'fast'}, {})
        self.assertEqual(invalid.status_code, 409)

    def test_control_endpoint_rejects_unknown_finished_foreign_and_read_only_runs(self):
        run = self.contract.task_runs.start('control-test', trigger='manual')
        self.assertEqual(task_run_control(self.request, run.id + 1000, {'action': 'pause'}, {}).status_code, 404)
        self.assertEqual(task_run_control(self.request, run.id, {'action': 'delete'}, {}).status_code, 409)
        self.contract.task_runs.enabled = False
        self.assertEqual(task_run_control(self.request, run.id, {'action': 'pause'}, {}).status_code, 403)
        self.contract.task_runs.enabled = True
        foreign = TaskRunStore(self.db, host='other-host').start('elsewhere', trigger='manual')
        self.assertEqual(task_run_control(self.request, foreign.id, {'action': 'cancel'}, {}).status_code, 403)
        self.contract.task_runs.finish(run.id, 'succeeded')
        self.assertEqual(task_run_control(self.request, run.id, {'action': 'pause'}, {}).status_code, 409)


if __name__ == "__main__":
    unittest.main()
