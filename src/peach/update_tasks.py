"""同一数据目录内，任务起跑与安装准备共用进程间闸门。"""
from __future__ import annotations

from contextlib import ExitStack, contextmanager
from contextvars import ContextVar
import json
import logging
import os
from pathlib import Path
import socket
import uuid
import threading
import time
from weakref import WeakValueDictionary

from filelock import FileLock, Timeout

from . import interface_text
from .fsutil import atomic_write_text
from .user_messages import UserFacingError


class UpdateBusy(UserFacingError, ValueError):
    """任务或安装事务占用数据目录，调用方应保留当前程序。"""


class GateBusy(UpdateBusy):
    """闸门锁等满超时：不是在装更新，只是别人拿着锁，过一会儿再试就好。"""


def state_for(db: Path) -> Path:
    parent = Path(db).resolve().parent
    data = parent.parent if parent.name == "database" else parent
    return data / "state" / "update-tasks"


_locks = WeakValueDictionary()
_locks_guard = threading.Lock()
current_db = ContextVar('peach_task_database', default=None)
LOGGER = logging.getLogger(__name__)

#: 本进程里关心安装预约的人（任务恢复服务）：预约撤下（`released`）、本进程看见活着的预约
#: （`pausing`）时各收到一次 `(闸门目录, 事件)`。回调在调用方线程里、可能还持着闸门锁，只登记就返回。
_listeners: list = []


def subscribe(callback) -> None:
    _listeners.append(callback)


def unsubscribe(callback) -> None:
    if callback in _listeners:
        _listeners.remove(callback)


def _announce(root: Path, event: str) -> None:
    for callback in tuple(_listeners):
        try:
            callback(root, event)
        except Exception:
            LOGGER.exception('update task listener failed')


def _mutex(root: Path) -> FileLock:
    root.mkdir(parents=True, exist_ok=True)
    with _locks_guard:
        lock = _locks.get(root)
        if lock is None:
            lock = FileLock(root / "admission.lock", timeout=10)
            _locks[root] = lock
        return lock


def _read(path: Path) -> dict:
    try:
        value = json.loads(path.read_text(encoding="utf-8"))
    except FileNotFoundError:
        return {}
    except (OSError, ValueError) as exc:
        raise UpdateBusy("errors.updateTasks.stateUnreadable") from exc
    if not isinstance(value, dict):
        raise UpdateBusy("errors.updateTasks.stateInvalid")
    return value


def _busy(data: dict, code: str) -> UpdateBusy:
    """预约期间拒绝新任务：预约者写下了自己的那句话（`reserve(busy=<code>)`）就用它，否则用 `code`。
    旧版写下的是原文（`busy`），照转。"""
    if isinstance(data.get("busy_code"), str) and interface_text.has(f"server:{data['busy_code']}"):
        return UpdateBusy(data["busy_code"])
    if data.get("busy"):
        return UpdateBusy("errors.updateTasks.reservedBusy", {"message": str(data["busy"])})
    return UpdateBusy(code)


def _alive(data: dict) -> bool:
    from .jobs import process_alive
    pid = data.get("pid")
    return isinstance(pid, int) and process_alive(pid)


def _maintenance(root: Path) -> dict:
    path = root / "install.json"
    data = _read(path)
    if data and not _alive(data):
        path.unlink(missing_ok=True)
        _announce(root, 'released')
        return {}
    return data


@contextmanager
def gate(root: Path):
    """取闸门锁；等满超时按「忙」报 `GateBusy`，调用方本来就把 `UpdateBusy` 当成这一轮先不做。

    裸 `filelock.Timeout` 没有调用方接，曾直接打死后继通道线程。
    """
    stack = ExitStack()
    try:
        stack.enter_context(_mutex(root))
    except Timeout:
        raise GateBusy("errors.updateTasks.gateBusy") from None
    with stack:
        yield


@contextmanager
def admission(db: Path):
    """持锁完成任务登记；安装取得预约后不接受新任务。"""
    root = state_for(db)
    with gate(root):
        if data := _maintenance(root):
            # 被挡下的任务会存成「等安装结束」，恢复服务要等预约撤下再接回它。
            _announce(root, 'pausing')
            raise _busy(data, "errors.updateTasks.preparingInstall")
        yield


def register(db: Path, label: str) -> Path:
    """登记线程任务或 CLI；文件在执行结束时撤下，死进程由预检回收。"""
    with admission(db):
        path = state_for(db) / "active" / (uuid.uuid4().hex + ".json")
        atomic_write_text(path, json.dumps({"pid": os.getpid(), "label": label}, ensure_ascii=False))
        return path


@contextmanager
def activity(db: Path, label: str):
    path = register(db, label)
    context = current_db.set(Path(db))
    try:
        yield
    finally:
        current_db.reset(context)
        with _mutex(path.parent.parent):
            path.unlink(missing_ok=True)


def reserve(db: Path, *, owner: int | None = None, busy: str | None = None) -> str:
    """接受安装预约并通知所有服务保存进度、暂停任务。

    `busy` 是预约期间拒绝新任务时给人看的那句话的 code（`server` 命名空间）；账本恢复也借这把闸门挡新任务。
    """
    root = state_for(db)
    with _mutex(root):
        if data := _maintenance(root):
            raise _busy(data, "errors.updateTasks.installInProgress")
        token = uuid.uuid4().hex
        atomic_write_text(root / "install.json", json.dumps({
            "pid": owner if owner is not None else os.getpid(), "token": token,
            **({"busy_code": busy} if busy else {})}, ensure_ascii=False))
        from .job_recovery import request_pause
        request_pause(db)
        return token


def is_pausing(db: Path) -> bool:
    """有没有活着的安装预约。每个任务检查点都问，所以不取闸门锁。

    `install.json` 只经原子替换写入，无锁读到的不是旧版就是新版。预约者已死只答「否」，
    文件留给持锁的 `admission`／`reserve` 清：无锁删可能删掉刚写进来的新预约。读文件出错
    （Windows 替换瞬间的共享冲突）才回到持锁路径，不按「正在暂停」处理。
    """
    root = state_for(db)
    try:
        data = json.loads((root / "install.json").read_text(encoding="utf-8"))
    except FileNotFoundError:
        return False
    except (OSError, ValueError):
        data = None
    if not isinstance(data, dict):
        with gate(root):
            pausing = bool(_maintenance(root))
    else:
        pausing = bool(data) and _alive(data)
    if pausing:
        # 预约可能是别的进程（安装助手、安装器）下的：本进程看见了，恢复服务才知道要等它撤下。
        _announce(root, 'pausing')
    return pausing


def check_pause(db: Path | None) -> None:
    if db is not None and is_pausing(db):
        from .jobs import JobPaused
        raise JobPaused('errors.updateTasks.pausedForInstall')


def running(db: Path, *, own_files=(), own_runs=(), task_rows: bool = True) -> list[str]:
    """数据目录里还在跑的任务，给人看的名字。

    `own_files`／`own_runs` 是调用方自己那一轮的登记文件与 `task_run` 行，不算在内。
    `task_rows` 为假时不读 `task_run`：账本坏了读不出来，那时只看登记文件与锁。
    """
    return _running(db, own_files=own_files, own_runs=own_runs, task_rows=task_rows)


def _running(db: Path, *, own_files=(), own_runs=(), task_rows: bool = True) -> list[str]:
    from .jobs import process_alive
    from .runtime_prepare import task_gate
    root = state_for(db)
    own = {Path(path).name for path in own_files}
    with _mutex(root):
        labels = []
        for path in (root / "active").glob("*.json"):
            if path.name in own:
                continue
            data = _read(path)
            if _alive(data):
                labels.append(str(data.get("label") or interface_text.text("server:labels.updateTasks.unnamedTask")))
            else:
                path.unlink(missing_ok=True)
        if task_rows:
            gate = task_gate(db, host=socket.gethostname(), alive=process_alive)
            if gate.error:
                labels.append(interface_text.text("server:labels.updateTasks.stateUnknown"))
            labels.extend(run.describe() for run in (*gate.blocking, *gate.resumable)
                          if run.status == "running" and run.id not in own_runs
                          and (run.pid is None or process_alive(run.pid)))
        # 旧版 CLI 已有 PID 锁，预检同时兼容这些仍在运行的批次。
        legacy = [root.parent / name for name in ('.probe.lock', '.sheets.lock', '.creator-boards.lock')]
        for path in legacy:
            if not path.exists():
                continue
            try:
                pid = int(path.read_text(encoding="ascii").strip())
            except (OSError, ValueError):
                raise UpdateBusy("errors.updateTasks.batchStateUnknown") from None
            paused = _read(root / 'paused' / f'{pid}.json')
            if process_alive(pid) and not paused:
                labels.append(path.stem)
        library_lock = root.parent / 'library-processing.json.lock'
        try:
            with FileLock(library_lock, timeout=0):
                pass
        except Timeout:
            labels.append(interface_text.text("server:labels.updateTasks.libraryProcessing"))
        return list(dict.fromkeys(labels))


def wait_quiescent(db: Path, timeout: float = 30) -> bool:
    """等在途步骤保存进度；期限到后由安装入口停止自己拥有的服务。"""
    deadline = time.monotonic() + timeout
    while _running(db):
        if time.monotonic() >= deadline:
            return False
        time.sleep(.1)
    return True


def wait_for_installation(db: Path) -> None:
    """源码批处理保留 PID 锁，在安装期间暂停，结束后由原进程接着执行。"""
    path = state_for(db) / 'paused' / f'{os.getpid()}.json'
    atomic_write_text(path, json.dumps({'pid': os.getpid()}))
    try:
        while is_pausing(db):
            time.sleep(.25)
    finally:
        path.unlink(missing_ok=True)


def transfer(db: Path, token: str, owner: int) -> None:
    """把安装预约交给更新助手或安装器，避免托盘退出产生空档。"""
    root = state_for(db)
    with _mutex(root):
        data = _read(root / "install.json")
        if not token or data.get("token") != token:
            raise UpdateBusy("errors.updateTasks.reservationExpired")
        atomic_write_text(root / "install.json", json.dumps({"pid": owner, "token": token}))


def release(db: Path, token: str) -> None:
    root = state_for(db)
    with _mutex(root):
        if _read(root / "install.json").get("token") == token:
            (root / "install.json").unlink(missing_ok=True)
            _announce(root, 'released')


def release_owner(db: Path, owner: int) -> None:
    root = state_for(db)
    with _mutex(root):
        data = _read(root / 'install.json')
        if data.get('pid') == owner:
            release(db, data['token'])
