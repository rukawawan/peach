"""源码改字的构建、托盘交接与生效状态。"""
from __future__ import annotations

import json
import os
from pathlib import Path
import shutil
import socket
import subprocess
import sys
import tempfile
import threading
import time
import uuid

from filelock import FileLock, Timeout

from . import dev_copy
from .diagnostic_browser import BUNDLE_CHUNK_NAME
from .fsutil import atomic_write_bytes, atomic_write_text
from .jobs import process_alive

ACTIVE = {'building', 'waiting_restart', 'restarting'}
BUNDLES = ('peach-app.js', 'peach-app.css', 'peach-pages.js', 'peach-pages.css')


def _directory(root: Path) -> Path:
    return root / 'build/copy-editor'


def _write(root: Path, data: dict) -> dict:
    atomic_write_text(_directory(root) / 'apply.json', json.dumps(data, ensure_ascii=False))
    return data


def _read_status(path: Path) -> dict:
    """Windows 原子替换期间短暂占用可重读；持续拒绝访问仍交给调用方。"""
    for attempt in range(5):
        try:
            return json.loads(path.read_text(encoding='utf-8'))
        except FileNotFoundError:
            return {}
        except PermissionError:
            if attempt == 4:
                raise
            time.sleep(.02)
    return {}


def status(root: Path) -> dict:
    data = _read_status(_directory(root) / 'apply.json')
    if data.get('state') in ACTIVE:
        if data['state'] == 'waiting_restart':
            if time.time() - data['updated'] > 30:
                return {**data, 'state': 'error', 'message': '未连接源码托盘，启动托盘后可重试生效'}
        elif not process_alive(data['pid']):
            return {**data, 'state': 'error', 'message': '生效任务已中断，可以重试'}
    return data


def _start(root: Path, saved: dict) -> dict:
    state = 'building' if saved['needs_build'] else 'waiting_restart' if saved['file'].endswith('.py') else 'ready'
    job = _write(root, {'id': uuid.uuid4().hex, 'state': state, 'file': saved['file'],
                        'needs_build': saved['needs_build'], 'pid': os.getpid(), 'updated': time.time(),
                        'message': {'building': '已保存，正在构建…', 'waiting_restart': '已保存，等待重载服务…',
                                    'ready': '已保存，正在刷新…'}[state]})
    if state == 'building':
        try:
            threading.Thread(target=_build, args=(root, job), daemon=True, name='PeachCopyBuild').start()
        except RuntimeError as exc:
            job = _write(root, {**job, 'state': 'error', 'message': str(exc)})
    return job


def submit(root: Path, body: dict, *, retry: bool = False) -> dict:
    directory = _directory(root)
    directory.mkdir(parents=True, exist_ok=True)
    try:
        with FileLock(directory / 'apply.lock', timeout=0):
            current = status(root)
            if current.get('state') in ACTIVE:
                raise ValueError('文案正在生效，请稍后再编辑')
            if retry:
                if not isinstance(body, dict) or current.get('id') != body.get('id') or current.get('state') != 'error':
                    raise ValueError('没有可重试的生效任务')
                return {'ok': True, 'apply': _start(root, current)}
            saved = dev_copy.save(root, body)
            return {**saved, 'apply': _start(root, saved)}
    except Timeout as exc:
        raise ValueError('正在保存其他文案，请稍后重试') from exc


def _chunks(folder: Path) -> list[str]:
    """主包按页拆出的 chunk（ADR-0118），名字带内容哈希，不在 `BUNDLES` 的固定名单里。"""
    return sorted(path.name for path in folder.glob('*.js') if BUNDLE_CHUNK_NAME.fullmatch(path.name))


def build_frontend(root: Path) -> None:
    npm = shutil.which('npm.cmd' if os.name == 'nt' else 'npm')
    if not npm:
        raise ValueError('未找到 npm，请安装项目所需的 Node.js')
    directory = _directory(root)
    directory.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(prefix='build-', dir=directory) as temporary:
        stage = Path(temporary).resolve()
        result = subprocess.run([npm, '--prefix', str(root / 'frontend'), 'run', 'build'],
            cwd=root, env={**os.environ, 'PEACH_FRONTEND_OUT_DIR': str(stage)},
            stdin=subprocess.DEVNULL, capture_output=True, text=True, encoding='utf-8', errors='replace',
            **({'creationflags': subprocess.CREATE_NO_WINDOW} if os.name == 'nt' else {}))
        atomic_write_text(directory / 'build.log', (result.stdout or '') + (result.stderr or ''))
        if result.returncode:
            raise ValueError('构建失败：' + ((result.stderr or result.stdout or '').strip()[-600:] or str(result.returncode)))
        if any(not (stage / name).is_file() for name in BUNDLES):
            raise ValueError('构建产物不完整，详情见 build/copy-editor/build.log')
        destination = root / 'web/dist'
        fresh = _chunks(stage)
        stale = [name for name in _chunks(destination) if name not in fresh]
        # chunk 先于入口写入：新入口一生效就能取到它指着的 chunk；旧 chunk 等全部写完再删。
        published = [*fresh, *BUNDLES]
        previous = {name: (destination / name).read_bytes() if (destination / name).exists() else None for name in published}
        try:
            for name in published:
                atomic_write_bytes(destination / name, (stage / name).read_bytes())
        except OSError:
            for name, content in previous.items():
                if content is not None:
                    atomic_write_bytes(destination / name, content)
                else:
                    (destination / name).unlink(missing_ok=True)
            raise
        for name in stale:
            (destination / name).unlink(missing_ok=True)


def _build(root: Path, job: dict) -> None:
    try:
        build_frontend(root)
        _write(root, {**job, 'state': 'ready', 'message': '构建完成，正在刷新…'})
    except Exception as exc:
        _write(root, {**job, 'state': 'error', 'message': str(exc)})


def poll(tray, root: Path) -> None:
    """由拥有子服务的源码托盘接管重载，任务门槛通过后才停服务。"""
    if getattr(sys, 'frozen', False):
        return
    directory = _directory(root)
    if not (directory / 'apply.json').exists():
        return
    try:
        with FileLock(directory / 'apply.lock', timeout=0):
            job = status(root)
            if job.get('state') != 'waiting_restart' or not tray._action_lock.acquire(blocking=False):
                return
            try:
                job = _write(root, {**job, 'state': 'restarting', 'pid': os.getpid(),
                                    'message': '已保存，正在重载服务…'})
            except OSError:
                tray._action_lock.release()
                raise
    except Timeout:
        return

    def reload_services():
        # 先释放托盘动作锁再写终态，读到终态的一方据此可以立即发起下一次托盘动作。
        outcome = {'state': 'ready', 'message': '服务已重载，正在刷新…'}
        try:
            from .config import DATABASE_PATH
            from .runtime_prepare import task_gate
            gate = task_gate(DATABASE_PATH, host=socket.gethostname(), alive=process_alive)
            if gate.refused:
                raise ValueError(gate.refusal())
            if not tray.manager.restart(reason="源码改字构建完成，重载服务"):
                raise ValueError('服务尚未恢复，请查看托盘日志')
            readiness = tray._readiness()
            if readiness.problem:
                raise ValueError(readiness.message)
        except Exception as exc:
            outcome = {'state': 'error', 'message': str(exc)}
        finally:
            tray._action_lock.release()
        _write(root, {**job, **outcome})
    try:
        threading.Thread(target=reload_services, daemon=True, name='PeachCopyReload').start()
    except RuntimeError as exc:
        tray._action_lock.release()
        _write(root, {**job, 'state': 'error', 'message': str(exc)})
