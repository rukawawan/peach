"""任务控制以临时账本、协作线程和本测试拥有的子进程验证。"""
from __future__ import annotations

from contextvars import copy_context
from pathlib import Path
import subprocess
import sys
import tempfile
import threading
import time
import unittest
from unittest.mock import patch

from peach import job_recovery, task_control, update_tasks
from peach.jobs import BackgroundJob
from peach.task_runs import TaskRunStore
from support.ledger import fresh_ledger


HEARTBEAT_CHILD = """
from pathlib import Path
import sys
import time
path = Path(sys.argv[1])
print('child-output', flush=True)
print('child-error', file=sys.stderr, flush=True)
for _ in range(int(sys.argv[2])):
    with path.open('ab') as handle:
        handle.write(b'x')
    time.sleep(.02)
"""


class TaskControlTests(unittest.TestCase):
    def setUp(self):
        temporary = tempfile.TemporaryDirectory()
        self.addCleanup(temporary.cleanup)
        self.root = Path(temporary.name).resolve()
        database = self.root / 'database'
        database.mkdir()
        self.db = fresh_ledger(database)
        self.store = TaskRunStore(self.db)
        self.jobs = []
        self.children = []
        self.releases = []
        self.addCleanup(self._finish_owned_work)

    def _finish_owned_work(self):
        for event in self.releases:
            event.set()
        for job in reversed(self.jobs):
            state = job.snapshot() or {}
            worker = job.thread
            if worker is not None and worker.is_alive():
                run_id = state.get('run_id')
                run = self.store.get(run_id) if run_id is not None else None
                if run is not None and run.active:
                    task_control.request(self.store, run_id, 'cancel')
                worker.join(5)
                self.assertFalse(worker.is_alive(), '本测试的后台任务没有退出')
        for child in self.children:
            if child.poll() is None:
                child.kill()
            child.communicate(timeout=5)

    def event(self):
        event = threading.Event()
        self.releases.append(event)
        return event

    def wait_until(self, predicate, message='任务没有到达预期状态', timeout=5):
        deadline = time.monotonic() + timeout
        while not predicate():
            if time.monotonic() >= deadline:
                self.fail(message)
            time.sleep(.01)

    def state(self, run_id):
        return task_control.projection(self.store, self.store.get(run_id))

    def start(self, work, *, key='control-test', recovery=None):
        job = BackgroundJob('PeachControlTest', task_key=key, runs=self.store)
        self.jobs.append(job)
        original = job.start(lambda identity: work(job, identity), recovery=recovery,
                             initial={'checked': 0, 'total': 10})
        return job, original

    def record_child(self):
        original = subprocess.Popen

        def create(*args, **kwargs):
            child = original(*args, **kwargs)
            self.children.append(child)
            return child

        return patch('peach.task_control.subprocess.Popen', side_effect=create)

    @staticmethod
    def child_command(path, count):
        return [sys.executable, '-u', '-c', HEARTBEAT_CHILD, str(path), str(count)]

    def test_pause_and_resume_keep_the_same_job_and_run_without_progress_while_paused(self):
        finish = self.event()
        progress = []

        def work(job, identity):
            while not finish.is_set():
                task_control.checkpoint()
                progress.append(identity)
                job.update(identity, checked=len(progress))
                time.sleep(.01)
            job.update(identity, status='complete')

        job, original = self.start(work)
        self.wait_until(lambda: len(progress) >= 2)
        run_id = original['run_id']
        task_control.request(self.store, run_id, 'pause')
        self.wait_until(lambda: self.state(run_id)['state'] == 'paused')
        paused_count = len(progress)
        time.sleep(.1)
        self.assertEqual(len(progress), paused_count)
        task_control.request(self.store, run_id, 'resume')
        self.wait_until(lambda: len(progress) > paused_count)
        self.assertEqual((job.snapshot()['job_id'], job.snapshot()['run_id']),
                         (original['job_id'], run_id))
        self.assertEqual([row.id for row in self.store.query()], [run_id])
        finish.set()
        job.thread.join(5)
        self.assertFalse(job.thread.is_alive())
        self.assertEqual(self.store.get(run_id).status, 'succeeded')

    def test_cancel_stays_running_until_work_exits_and_rejects_a_stale_resume(self):
        entered, reach_checkpoint = self.event(), self.event()
        unwinding, allow_exit = self.event(), self.event()

        def work(_job, _identity):
            try:
                entered.set()
                reach_checkpoint.wait(5)
                task_control.checkpoint()
            finally:
                unwinding.set()
                allow_exit.wait(5)

        job, original = self.start(work)
        self.assertTrue(entered.wait(5))
        run_id = original['run_id']
        task_control.request(self.store, run_id, 'cancel')
        self.assertEqual(self.store.get(run_id).status, 'running')
        self.assertEqual(self.state(run_id), {'state': 'cancelling', 'actions': []})
        with self.assertRaises(ValueError):
            task_control.request(self.store, run_id, 'resume')
        reach_checkpoint.set()
        self.assertTrue(unwinding.wait(5))
        self.assertEqual(self.store.get(run_id).status, 'running')
        allow_exit.set()
        job.thread.join(5)
        self.assertFalse(job.thread.is_alive())
        self.assertEqual(self.store.get(run_id).status, 'cancelled')
        self.assertEqual(job.snapshot()['status'], 'cancelled')

    def test_a_finished_parent_controls_active_grandchildren_and_later_pending_work(self):
        parent = self.store.start('parent', trigger='manual')
        child_id = self.store.enqueue_followups(parent.id, [('child:1', 'child', '子任务')])['queued'][0]
        self.store.finish(child_id, 'succeeded')
        grandchild_id = self.store.enqueue_followups(child_id, [('leaf:1', 'leaf', '孙任务')])['queued'][0]
        self.store.finish(parent.id, 'succeeded')
        task_control.request(self.store, parent.id, 'pause')
        self.assertEqual(self.state(parent.id)['state'], 'paused')
        late_id = self.store.enqueue_followups(parent.id, [('leaf:2', 'leaf', '后来排入的任务')])['queued'][0]
        self.assertIsNone(self.store.claim_followup(['leaf']))
        self.assertEqual(self.state(late_id)['state'], 'paused')
        task_control.request(self.store, parent.id, 'resume')
        self.assertEqual(self.store.claim_followup(['leaf']).id, grandchild_id)
        self.store.finish(grandchild_id, 'succeeded')
        self.assertEqual(self.store.claim_followup(['leaf']).id, late_id)
        self.store.finish(late_id, 'succeeded')
        self.assertIsNone(self.state(parent.id))

    def test_a_parent_with_many_queued_followups_is_projected_without_a_query_per_followup(self):
        """一轮补全派出上千条后继：任务中心每次轮询算父卡的控制状态，连接数不随后继条数增长。"""
        parent = self.store.start('parent', trigger='manual')
        self.store.enqueue_followups(parent.id, [(f'leaf:{n}', 'leaf', f'后继 {n}') for n in range(50)])
        self.store.finish(parent.id, 'succeeded')
        original = self.store.database.read_connection
        opened = []

        def counted():
            opened.append(1)
            return original()

        run = self.store.get(parent.id)
        with patch.object(self.store.database, 'read_connection', side_effect=counted):
            self.assertEqual(task_control.projection(self.store, run)['state'], 'running')
            running = len(opened)
            task_control.request(self.store, parent.id, 'pause')
            opened.clear()
            self.assertEqual(task_control.projection(self.store, run)['state'], 'paused')
        self.assertLessEqual(running, 2)
        self.assertLessEqual(len(opened), 3)

    def test_cancelled_parent_does_not_run_followups_enqueued_after_the_request(self):
        parent = self.store.start('parent', trigger='manual')
        first = self.store.enqueue_followups(parent.id, [('leaf:1', 'leaf', '原任务')])['queued'][0]
        self.store.finish(parent.id, 'succeeded')
        task_control.request(self.store, parent.id, 'cancel')
        self.assertEqual(self.store.get(first).status, 'cancelled')
        late = self.store.enqueue_followups(parent.id, [('leaf:2', 'leaf', '后来排入的任务')])['queued'][0]
        self.assertIsNone(self.store.claim_followup(['leaf']))
        self.assertEqual(self.store.get(late).status, 'cancelled')

    def test_resuming_a_parent_cannot_undo_an_accepted_child_cancellation(self):
        parent = self.store.start('parent', trigger='manual')
        child_id = self.store.enqueue_followups(parent.id, [('leaf:1', 'leaf', '子任务')])['queued'][0]
        self.store.finish(parent.id, 'succeeded')
        child = self.store.claim_followup(['leaf'])
        task_control.request(self.store, child_id, 'cancel')
        task_control.request(self.store, parent.id, 'pause')
        task_control.request(self.store, parent.id, 'resume')
        self.assertEqual(task_control.requested(self.db, child.id, (parent.id,)), 'cancel')
        self.assertEqual(self.state(child.id)['state'], 'cancelling')
        self.store.finish(child.id, 'cancelled')

    def test_a_pending_database_commit_prevents_another_worker_from_confirming_pause(self):
        entered, commit, finish = self.event(), self.event(), self.event()
        errors = []
        def work(job, identity):
            def peer():
                try:
                    entered.wait(5)
                    while not finish.is_set():
                        task_control.checkpoint()
                        time.sleep(.01)
                except BaseException as error:
                    errors.append(error)
            worker = threading.Thread(target=copy_context().run, args=(peer,))
            worker.start()
            try:
                with self.store.database.write_transaction() as connection:
                    connection.execute("INSERT INTO asset(location,path,name,medium) VALUES('local','sample.mp4','sample','video')")
                    entered.set()
                    commit.wait(5)
                task_control.checkpoint()
                finish.set()
            finally:
                worker.join(5)
            if errors:
                raise errors[0]
            job.update(identity, status='complete')
        job, original = self.start(work)
        self.assertTrue(entered.wait(5))
        run_id = original['run_id']
        task_control.request(self.store, run_id, 'pause')
        self.wait_until(lambda: self.state(run_id)['state'] == 'pausing')
        self.assertEqual(self.state(run_id)['state'], 'pausing')
        commit.set()
        self.wait_until(lambda: self.state(run_id)['state'] == 'paused')
        task_control.request(self.store, run_id, 'resume')
        job.thread.join(5)
        self.assertFalse(job.thread.is_alive())
        self.assertEqual(self.store.get(run_id).status, 'succeeded')

    def test_parallel_operations_are_not_paused_until_every_inflight_step_parks(self):
        entered = [self.event(), self.event()]
        release = [self.event(), self.event()]
        after_step = []
        errors = []

        def operation(index):
            try:
                with task_control.operation():
                    entered[index].set()
                    release[index].wait(5)
                task_control.checkpoint()
                after_step.append(index)
            except BaseException as error:
                errors.append(error)

        def work(job, identity):
            workers = [threading.Thread(target=copy_context().run, args=(operation, index))
                       for index in range(2)]
            for worker in workers:
                worker.start()
            for worker in workers:
                worker.join(5)
                if worker.is_alive():
                    raise RuntimeError('并行操作未退出')
            if errors:
                raise errors[0]
            job.update(identity, status='complete')

        job, original = self.start(work)
        self.assertTrue(all(event.wait(5) for event in entered))
        run_id = original['run_id']
        task_control.request(self.store, run_id, 'pause')
        release[0].set()
        self.wait_until(lambda: self.state(run_id)['state'] == 'pausing')
        self.assertEqual(after_step, [])
        release[1].set()
        self.wait_until(lambda: self.state(run_id)['state'] == 'paused')
        self.assertEqual(after_step, [])
        task_control.request(self.store, run_id, 'resume')
        job.thread.join(5)
        self.assertFalse(job.thread.is_alive())
        self.assertEqual(sorted(after_step), [0, 1])
        self.assertEqual(self.store.get(run_id).status, 'succeeded')

    def test_pause_stops_both_owned_children_and_cancel_reaps_them_before_settlement(self):
        paths = [self.root / f'heartbeat-{index}' for index in range(2)]
        errors = []

        def child_work(path):
            try:
                task_control.run(self.child_command(path, 10000), capture_output=True, timeout=10,
                                 creationflags=getattr(subprocess, 'CREATE_NO_WINDOW', 0))
            except BaseException as error:
                errors.append(error)

        def work(_job, _identity):
            workers = [threading.Thread(target=copy_context().run, args=(child_work, path)) for path in paths]
            for worker in workers:
                worker.start()
            for worker in workers:
                worker.join(10)
                if worker.is_alive():
                    raise RuntimeError('本测试的子进程管理线程未退出')
            if errors:
                raise errors[0]

        with self.record_child():
            job, original = self.start(work)
            self.wait_until(lambda: all(path.exists() and path.stat().st_size >= 2 for path in paths))
            run_id = original['run_id']
            task_control.request(self.store, run_id, 'pause')
            self.wait_until(lambda: self.state(run_id)['state'] == 'paused')
            paused_sizes = [path.stat().st_size for path in paths]
            time.sleep(.15)
            self.assertEqual([path.stat().st_size for path in paths], paused_sizes)
            task_control.request(self.store, run_id, 'resume')
            self.wait_until(lambda: all(path.stat().st_size > size for path, size in zip(paths, paused_sizes)))
            task_control.request(self.store, run_id, 'cancel')
            job.thread.join(5)
            self.assertFalse(job.thread.is_alive())
            self.assertEqual(self.store.get(run_id).status, 'cancelled')
            self.assertEqual(len(self.children), 2)
            self.assertTrue(all(child.poll() is not None for child in self.children))

    def test_child_output_is_preserved_and_user_pause_does_not_consume_its_timeout(self):
        path = self.root / 'heartbeat-finite'
        result = []

        # 托管 macOS 上短 sleep 会被系统合并拉长，心跳少留余量；暂停 5.2 秒超过超时，证明暂停不计入。
        def work(job, identity):
            result.append(task_control.run(self.child_command(path, 30), capture_output=True, timeout=5,
                                          creationflags=getattr(subprocess, 'CREATE_NO_WINDOW', 0)))
            job.update(identity, status='complete')

        with self.record_child():
            job, original = self.start(work)
            self.wait_until(lambda: path.exists() and path.stat().st_size >= 2)
            task_control.request(self.store, original['run_id'], 'pause')
            self.wait_until(lambda: self.state(original['run_id'])['state'] == 'paused')
            time.sleep(5.2)
            task_control.request(self.store, original['run_id'], 'resume')
            job.thread.join(5)
            self.assertFalse(job.thread.is_alive())
            run = self.store.get(original['run_id'])
            self.assertEqual(run.status, 'succeeded', run)
            self.assertEqual(result[0].returncode, 0)
            self.assertIn(b'child-output', result[0].stdout)
            self.assertIn(b'child-error', result[0].stderr)
            self.assertIsNotNone(self.children[0].poll())

    def test_input_and_output_survive_repeated_communicate_timeouts(self):
        run = self.store.start('input-output', trigger='manual')
        command = [sys.executable, '-u', '-c',
                   "import sys,time; data=sys.stdin.buffer.read(); time.sleep(.25); "
                   "sys.stdout.buffer.write(data); sys.stderr.buffer.write(b'diagnostic')"]
        with self.record_child(), task_control.bind(self.store, run.id):
            result = task_control.run(command, input=b'payload\nsecond line', capture_output=True, timeout=5,
                                      creationflags=getattr(subprocess, 'CREATE_NO_WINDOW', 0))
        self.assertEqual(result.stdout, b'payload\nsecond line')
        self.assertEqual(result.stderr, b'diagnostic')
        self.assertEqual(result.returncode, 0)
        self.store.finish(run.id, 'succeeded')

    def test_timeout_keeps_partial_output_and_reaps_the_owned_child(self):
        run = self.store.start('timeout-output', trigger='manual')
        command = [sys.executable, '-u', '-c',
                   "import sys,time; print('partial-output',flush=True); "
                   "print('partial-error',file=sys.stderr,flush=True); time.sleep(10)"]
        with self.record_child(), task_control.bind(self.store, run.id):
            with self.assertRaises(subprocess.TimeoutExpired) as caught:
                task_control.run(command, capture_output=True, timeout=1,
                                 creationflags=getattr(subprocess, 'CREATE_NO_WINDOW', 0))
        self.assertIn(b'partial-output', caught.exception.output or b'')
        self.assertIn(b'partial-error', caught.exception.stderr or b'')
        self.assertIsNotNone(self.children[0].poll())
        self.store.finish(run.id, 'failed')

    def test_user_paused_recoverable_work_yields_to_installation_and_resumes_the_same_run(self):
        progressed = self.event()

        def work(job, identity):
            job.checkpoint(identity, checked=1, completed_items=[7])
            progressed.set()
            while True:
                task_control.checkpoint()
                time.sleep(.01)

        first, original = self.start(work, key='feed-check', recovery={'all': True})
        self.assertTrue(progressed.wait(5))
        run_id = original['run_id']
        task_control.request(self.store, run_id, 'pause')
        self.wait_until(lambda: self.state(run_id)['state'] == 'paused')
        token = update_tasks.reserve(self.db)
        try:
            first.thread.join(5)
            self.assertFalse(first.thread.is_alive())
            self.assertTrue(update_tasks.wait_quiescent(self.db, timeout=1))
            self.assertEqual(self.store.get(run_id).status, 'pending')
        finally:
            update_tasks.release(self.db, token)
        second = BackgroundJob('PeachControlTest', task_key='feed-check', runs=self.store)
        self.jobs.append(second)
        resumed = []

        def resume(identity):
            resumed.append(second.snapshot())
            second.update(identity, status='complete')

        job_recovery.resume(self.db, {'feed-check': lambda request: second.start(
            resume, restart=True, recovery=request)})
        self.wait_until(lambda: self.state(run_id)['state'] == 'paused')
        self.assertEqual(resumed, [])
        task_control.request(self.store, run_id, 'resume')
        self.wait_until(lambda: bool(resumed))
        second.thread.join(5)
        self.assertFalse(second.thread.is_alive())
        self.assertEqual((resumed[0]['job_id'], resumed[0]['run_id'], resumed[0]['completed_items']),
                         (original['job_id'], run_id, [7]))
        self.assertEqual(self.store.get(run_id).status, 'succeeded')

    def test_shutdown_of_nonrecoverable_paused_work_does_not_leave_a_pending_resume_row(self):
        entered = self.event()

        def work(_job, _identity):
            entered.set()
            while True:
                task_control.checkpoint()
                time.sleep(.01)

        job, original = self.start(work)
        self.assertTrue(entered.wait(5))
        run_id = original['run_id']
        worker = job.thread
        task_control.request(self.store, run_id, 'pause')
        self.wait_until(lambda: self.state(run_id)['state'] == 'paused')
        token = update_tasks.reserve(self.db)
        try:
            job.stop(timeout=5)
            self.assertFalse(worker.is_alive())
            self.assertIn(self.store.get(run_id).status, ('cancelled', 'interrupted'))
            self.assertNotEqual(job_recovery.read(self.db, 'control-test').get('status'), 'active')
        finally:
            update_tasks.release(self.db, token)
