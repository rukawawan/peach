"""任务中心的本机控制意图、安全停点和所属媒体子进程。"""
from __future__ import annotations

import json
import os
import signal
import subprocess
import sys
import threading
import time
import uuid
from functools import wraps
from contextlib import contextmanager
from contextvars import ContextVar

import psutil

from .fsutil import atomic_write_text
from .update_tasks import state_for

CURRENT = ContextVar('peach_task_control', default=None)
_LIVE = {}
_LOCK = threading.RLock()


class Cancelled(KeyboardInterrupt):
    """用户取消整轮任务；领域内的单项失败处理不能吞掉取消。"""


def _root(db):
    return state_for(db).parent / 'task-controls'


def _read(path, attempts=20):
    for attempt in range(attempts):
        try:
            return json.loads(path.read_text(encoding='utf-8'))
        except FileNotFoundError:
            return {}
        except PermissionError:
            # Windows 上写入端 os.replace 换文件的那一瞬间，读方打开会报拒绝访问；稍等即可读到新文件。
            if os.name != 'nt' or attempt == attempts - 1:
                raise
            time.sleep(.05)


def _key(db, run_id):
    return (str(db.resolve()), run_id)


def intent(db, run_id, ancestors=()):
    commands = [_read(_root(db) / f'{identity}.request.json')
                for identity in dict.fromkeys((run_id, *ancestors)) if identity is not None]
    cancelled = [command for command in commands if command.get('action') == 'cancel']
    if cancelled:
        commands = cancelled
    return max(commands, key=lambda value: value.get('at', 0), default={})


def requested(db, run_id, ancestors=()):
    return intent(db, run_id, ancestors).get('action', 'resume')


def projection(store, run):
    if not store.enabled or run.host != store.host:
        return None
    # 自己已结束的父任务，有后代还在排或在跑才算可控；这里只问有没有。
    if not run.active and not store.active_descendants(run.id, limit=1):
        return None
    command = intent(store.database.db_path, run.id, (run.parent_run_id, run.root_run_id))
    action = command.get('action', 'resume')
    observed = _read(_root(store.database.db_path) / f'{run.id}.observed.json')
    if action == 'cancel':
        state, actions = 'cancelling', []
    elif action == 'pause':
        acknowledged = observed.get('command') == command.get('id') and observed.get('state') == 'paused'
        if not run.active:
            # 暂停是否已落到每个后代：只有这里要整行，一次查询取回。
            children = store.active_descendants(run.id)
            acknowledged = bool(children) and all(
                (projection(store, child) or {}).get('state') == 'paused' for child in children)
        state = 'paused' if run.status == 'pending' or acknowledged else 'pausing'
        actions = ['resume', 'cancel']
    else:
        state, actions = 'running', ['pause', 'cancel']
    return {'state': state, 'actions': actions}


def request(store, run_id, action):
    from .update_tasks import _mutex
    with _mutex(state_for(store.database.db_path)):
        return _request(store, run_id, action)


def _request(store, run_id, action):
    if action not in ('pause', 'resume', 'cancel'):
        raise ValueError('请选择暂停、继续或取消')
    run = store.get(run_id)
    if run is None:
        raise KeyError('任务未取得，请刷新后重试')
    if not store.enabled or run.host != store.host:
        raise PermissionError('请在执行这轮任务的写入端操作')
    if projection(store, run) is None:
        raise ValueError('这轮任务已经结束')
    db = store.database.db_path
    current = requested(db, run.id, (run.parent_run_id, run.root_run_id))
    if current == 'cancel':
        if action != 'cancel':
            raise ValueError('任务正在取消，不能再暂停或继续')
        return run
    if current == action:
        return run
    # 父任务的控制覆盖已经派出的后继；尚未派出的工作在父任务结算前经过停点。
    with store.database.read_connection() as connection:
        descendants = connection.execute(
            'WITH RECURSIVE family(id) AS (SELECT ? UNION ALL '
            'SELECT t.id FROM task_run t JOIN family f ON t.parent_run_id=f.id) '
            "SELECT id FROM task_run WHERE id IN (SELECT id FROM family) AND status IN ('pending','running')",
            (run_id,)).fetchall()
    command = {'id': uuid.uuid4().hex, 'action': action, 'at': time.time_ns()}
    atomic_write_text(_root(db) / f'{run.id}.request.json', json.dumps(command))
    for row in descendants:
        identity = int(row[0])
        child = store.get(identity)
        if child is None or child.host != store.host:
            continue
        if action != 'cancel' and requested(db, child.id, (child.parent_run_id, child.root_run_id)) == 'cancel':
            continue
        atomic_write_text(_root(db) / f'{identity}.request.json', json.dumps(command))
        if child.status == 'pending' and action == 'cancel':
            store.finish(identity, 'cancelled', summary={'cancelled_by_user': True})
            from .job_recovery import read, cancel
            saved = read(db, child.task_key)
            if saved.get('run_id') == identity:
                cancel(db, child.task_key)
    return store.get(run_id)


def _suspend_tree(process, suspended):
    """暂停仍存活的媒体进程树，逐个登记供退出停点时恢复。"""
    try:
        owner = psutil.Process(process.pid)
    except psutil.NoSuchProcess:
        return False
    try:
        children = owner.children(recursive=True)
    except psutil.NoSuchProcess:
        children = []
    for child in [owner, *children]:
        try:
            child.suspend()
            suspended.append(child)
        except psutil.NoSuchProcess:
            pass
    return True


class Control:
    def __init__(self, store, run_id, *, recoverable=False):
        self.store, self.run_id = store, run_id
        self.recoverable = recoverable
        self.db = store.database.db_path
        self.stopping = threading.Event()
        self.lock = threading.RLock()
        self.operations = {}
        self.owners = {}
        self._paused_seconds = 0.0
        self._paused_at = None
        run = store.get(run_id)
        self.ancestors = (run.parent_run_id, run.root_run_id)
        self._observed = None
        from .task_resources import Usage
        self.usage = Usage(self.db, run_id)

    @property
    def paused_seconds(self):
        with self.lock:
            return self._paused_seconds + (time.monotonic() - self._paused_at
                                           if self._paused_at is not None else 0.0)

    def _publish(self, command, state):
        value = {'command': command.get('id'), 'state': state, 'pid': os.getpid()}
        with self.lock:
            if value != self._observed:
                atomic_write_text(_root(self.db) / f'{self.run_id}.observed.json', json.dumps(value))
                self._observed = value

    def check_item(self):
        self.checkpoint()

    def checkpoint(self, process=None):
        started = None
        suspended = []
        parked = []
        try:
            while True:
                self.usage.publish()
                from .update_tasks import check_pause
                check_pause(self.db if self.recoverable else None)
                if self.stopping.is_set():
                    from .jobs import JobPaused
                    if self.recoverable:
                        raise JobPaused('服务正在关闭，已保存的进度留待恢复')
                    raise Cancelled()
                command = intent(self.db, self.run_id, self.ancestors)
                action = command.get('action', 'resume')
                if action == 'cancel':
                    raise Cancelled()
                if action != 'pause':
                    with self.lock:
                        if self._paused_at is not None:
                            self._paused_seconds += time.monotonic() - self._paused_at
                            self._paused_at = None
                    self._publish(command, 'running')
                    return time.monotonic() - started if started is not None else 0.0
                if started is None:
                    started = time.monotonic()
                    with self.lock:
                        if self._paused_at is None:
                            self._paused_at = started
                    if process is not None and process.poll() is None:
                        if not _suspend_tree(process, suspended):
                            return
                    with self.lock:
                        parked = [key for key, owner in self.owners.items()
                                  if owner == threading.get_ident()]
                        for key in parked:
                            self.operations[key] = True
                with self.lock:
                    quiet = all(self.operations.values())
                self._publish(command, 'paused' if quiet else 'pausing')
                self.store.heartbeat(self.run_id)
                self.stopping.wait(.1)
        finally:
            for child in reversed(suspended):
                try:
                    child.resume()
                except psutil.NoSuchProcess:
                    pass
            with self.lock:
                for key in parked:
                    if key in self.operations:
                        self.operations[key] = False


@contextmanager
def bind(store, run_id, *, recoverable=False):
    if run_id is None or not store.enabled:
        yield None
        return
    control = Control(store, run_id, recoverable=recoverable)
    key = _key(control.db, run_id)
    with _LOCK:
        _LIVE[key] = control
    token = CURRENT.set(control)
    control.usage.enter_thread()
    try:
        control.checkpoint()
        yield control
    finally:
        try:
            control.usage.leave_thread()
        finally:
            control.usage.close()
            CURRENT.reset(token)
            with _LOCK:
                _LIVE.pop(key, None)


def shutdown(db, run_id):
    with _LOCK:
        control = _LIVE.get(_key(db, run_id))
    if control is not None:
        control.stopping.set()


def checkpoint():
    control = CURRENT.get()
    if control is not None:
        control.checkpoint()


def controlled(function):
    @wraps(function)
    def call(*args, **kwargs):
        with operation():
            result = function(*args, **kwargs)
        checkpoint()
        return result
    return call


@contextmanager
def operation():
    """有界网络请求等在途步骤退出后，才确认整轮已经暂停。"""
    control = CURRENT.get()
    if control is None:
        yield
        return
    marker = object()
    control.usage.enter_thread()
    with control.lock:
        control.operations[id(marker)] = False
        control.owners[id(marker)] = threading.get_ident()
    try:
        checkpoint()
        yield
    finally:
        with control.lock:
            control.operations.pop(id(marker), None)
            control.owners.pop(id(marker), None)
        control.usage.leave_thread()


@contextmanager
def committing():
    """已进入文件替换等短提交步骤时，先完整提交，再响应下一次控制请求。"""
    checkpoint()
    with operation():
        token = CURRENT.set(None)
        try:
            yield
        finally:
            CURRENT.reset(token)


@controlled
def run(command, *, capture_output=False, timeout=None, check=False, input=None, **kwargs):
    """执行当前任务拥有的子进程；暂停保留进程，取消回收后才向外结算。"""
    control = CURRENT.get()
    if control is None:
        return subprocess.run(command, capture_output=capture_output, timeout=timeout,
                              check=check, input=input, **kwargs)
    checkpoint()
    if capture_output:
        kwargs.update(stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    if input is not None:
        kwargs['stdin'] = subprocess.PIPE
    if os.name != 'nt':
        kwargs['start_new_session'] = True
    from .process_job import assign_to_job, close_job, create_kill_on_close_job
    job = create_kill_on_close_job()
    try:
        process = subprocess.Popen(command, **kwargs)
    except BaseException:
        close_job(job)
        raise
    assign_to_job(job, process)
    with control.lock:
        control.operations[id(process)] = False
        control.owners[id(process)] = threading.get_ident()
    started = time.monotonic()
    paused = 0.0
    timeout_error = None
    try:
        control.usage.enter_process(process)
        while True:
            paused += control.checkpoint(process) or 0.0
            try:
                stdout, stderr = process.communicate(input=input, timeout=.1)
                break
            except subprocess.TimeoutExpired as error:
                input = None
                elapsed = time.monotonic() - started - paused
                if timeout is not None and elapsed >= timeout:
                    timeout_error = subprocess.TimeoutExpired(command, timeout, output=error.output, stderr=error.stderr)
                    raise timeout_error from None
        checkpoint()
        result = subprocess.CompletedProcess(command, process.returncode, stdout, stderr)
        if check:
            result.check_returncode()
        return result
    finally:
        try:
            if process.poll() is None:
                try:
                    children = psutil.Process(process.pid).children(recursive=True)
                except psutil.NoSuchProcess:
                    children = []
                for child in reversed(children):
                    try:
                        child.kill()
                    except psutil.NoSuchProcess:
                        pass
                try:
                    process.kill()
                except ProcessLookupError:
                    pass
        finally:
            if os.name != 'nt':
                try:
                    os.killpg(process.pid, signal.SIGKILL)
                except ProcessLookupError:
                    pass
                except PermissionError:
                    # 进程组由 start_new_session 自建；macOS 上组内只剩未回收的僵尸时 killpg 报 EPERM。
                    if sys.platform != 'darwin':
                        raise
            close_job(job)
            try:
                stdout, stderr = process.communicate()
                if timeout_error is not None:
                    timeout_error.output = stdout
                    timeout_error.stderr = stderr
            finally:
                with control.lock:
                    control.operations.pop(id(process), None)
                    control.owners.pop(id(process), None)
                control.usage.leave_process(process)
