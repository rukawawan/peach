"""用本机安装的 Jasna 给选定影片去码：排队、在任务中心显示进度，成品放回原文件夹并登记入库。

Jasna 是独立安装的显卡程序（https://github.com/Kruk2/jasna），Peach 只调用它的命令行，不携带它的
代码与模型。一次只处理一部；成品先写进原文件夹下的 `@peach-jasna` 工作目录（扫描跳过 `@` 开头的
目录），成功后改名为 `<原文件名>-去码.mkv` 放回原文件夹，再按扫描的同一口径登记、补资料。
原片不动，删不删由用户在详情页决定。
"""
from __future__ import annotations

import json
import os
import re
import shlex
import subprocess
import threading
import time
from collections import deque
from datetime import datetime, timezone
from pathlib import Path, PureWindowsPath

from .config import STATE_DIR
from .fsutil import atomic_write_text

TASK_KEY = 'jasna-restore'
TASK_LABEL = 'Jasna 去码'
CONFIG_FILE = 'jasna.json'
STATE_FILE = 'jasna-jobs.json'
WORK_DIR = '@peach-jasna'
SUFFIX = '-去码'
MODELS = ('basicvsrpp', 'ltx-basic', 'ltx', 'ltx-4step', 'ltx-8step', 'ltx-undistilled')
EXE_NAMES = frozenset({'jasna.exe', 'jasna'})
_PERCENT = re.compile(r'(\d{1,3}(?:\.\d+)?)%')
LOG_TAIL_BYTES = 64 * 1024
_STATE_LOCK = threading.RLock()


# ---------------------------------------------------------------- 设置与记录

def read_config(state_root: Path = STATE_DIR) -> dict:
    try:
        value = json.loads((Path(state_root) / CONFIG_FILE).read_text(encoding='utf-8'))
    except (OSError, ValueError):
        value = {}
    if not isinstance(value, dict):
        value = {}
    return {'exe': str(value.get('exe') or ''),
            'model': value.get('model') if value.get('model') in MODELS else 'basicvsrpp',
            'extra': str(value.get('extra') or '')}


def check_exe(exe: str) -> Path:
    """只接受名为 jasna.exe（或 Linux 的 jasna）且确实存在的文件，页面不能借此运行别的程序。"""
    path = Path(str(exe or '').strip().strip('"'))
    if not str(path) or path.name.casefold() not in EXE_NAMES:
        raise ValueError('还没设置 Jasna：到「管理 → 数据管理 → Jasna 去码」填写 jasna.exe 的完整路径，例如 D:\\Jasna\\jasna.exe')
    if not path.is_file():
        raise ValueError(f'找不到 {path}，请确认 Jasna 已解压到这个位置')
    return path


def extra_args(text: str) -> list[str]:
    try:
        return shlex.split(text or '', posix=os.name != 'nt')
    except ValueError as error:
        raise ValueError(f'附加参数格式不对：{error}') from error


def save_config(values: dict, state_root: Path = STATE_DIR) -> dict:
    exe = check_exe(values.get('exe', ''))
    model = values.get('model') or 'basicvsrpp'
    if model not in MODELS:
        raise ValueError('不支持的 Jasna 修复模型')
    extra = str(values.get('extra') or '').strip()
    extra_args(extra)
    config = {'exe': str(exe), 'model': model, 'extra': extra}
    root = Path(state_root)
    root.mkdir(parents=True, exist_ok=True)
    atomic_write_text(root / CONFIG_FILE, json.dumps(config, ensure_ascii=False, indent=2))
    return config


def version(exe: Path) -> str:
    """跑一次 `jasna.exe --version`，确认程序能启动。"""
    try:
        result = subprocess.run([str(exe), '--version'], cwd=str(exe.parent), capture_output=True,
                                timeout=300, **_hidden_window())
    except (OSError, subprocess.SubprocessError) as error:
        raise ValueError(f'Jasna 启动失败：{error}') from error
    text = (result.stdout or b'').decode('utf-8', 'replace').strip() or \
        (result.stderr or b'').decode('utf-8', 'replace').strip()
    if result.returncode != 0:
        raise ValueError(f'Jasna 启动失败（退出码 {result.returncode}）：{text[-300:]}')
    return text.splitlines()[-1] if text else ''


def load_state(state_root: Path = STATE_DIR) -> dict:
    try:
        value = json.loads((Path(state_root) / STATE_FILE).read_text(encoding='utf-8'))
    except (OSError, ValueError):
        return {}
    return value if isinstance(value, dict) else {}


def save_state(state: dict, state_root: Path = STATE_DIR) -> None:
    root = Path(state_root)
    root.mkdir(parents=True, exist_ok=True)
    atomic_write_text(root / STATE_FILE, json.dumps(state, ensure_ascii=False, indent=2))


def update_record(asset_id: int, values: dict, state_root: Path = STATE_DIR) -> None:
    """改一部的记录；队列线程与请求线程都会写，读改写在同一把锁里。"""
    with _STATE_LOCK:
        state = load_state(state_root)
        state[str(asset_id)] = {**state.get(str(asset_id), {}), **values,
                                'at': datetime.now(timezone.utc).isoformat()}
        save_state(state, state_root)


def output_name(name: str) -> str:
    """`ABP-327.mp4` → `ABP-327-去码.mkv`：番号仍在最前，扫描照样认得出。"""
    return PureWindowsPath(name).stem + SUFFIX + '.mkv'


def is_restored(name: str) -> bool:
    return PureWindowsPath(str(name or '')).stem.endswith(SUFFIX)


def progress_of(log: Path) -> float | None:
    """读日志末尾最后一个百分比；Jasna 的进度条用回车覆盖同一行。"""
    try:
        with log.open('rb') as handle:
            handle.seek(0, os.SEEK_END)
            size = handle.tell()
            handle.seek(max(0, size - LOG_TAIL_BYTES))
            tail = handle.read().decode('utf-8', 'replace')
    except OSError:
        return None
    found = _PERCENT.findall(tail)
    if not found:
        return None
    value = float(found[-1])
    return value if 0 <= value <= 100 else None


def log_tail(log: Path, lines: int = 8) -> str:
    try:
        text = log.read_bytes()[-LOG_TAIL_BYTES:].decode('utf-8', 'replace')
    except OSError:
        return ''
    rows = [row.strip() for row in re.split(r'[\r\n]+', text) if row.strip()]
    return '\n'.join(rows[-lines:])


def _hidden_window() -> dict:
    if os.name == 'nt':
        return {'creationflags': getattr(subprocess, 'CREATE_NO_WINDOW', 0)}
    return {}


# ---------------------------------------------------------------- 队列与执行

class JasnaQueue:
    """一次只跑一部；排队的作品与结果记在 `state/jasna-jobs.json`，重启后排队的接着跑。"""

    def __init__(self):
        self._lock = threading.Lock()
        self._queue: deque[int] = deque()
        self._thread: threading.Thread | None = None
        self.current: dict = {}

    def snapshot(self) -> dict:
        with self._lock:
            return {'queue': list(self._queue), 'current': dict(self.current)}

    def enqueue(self, contract, asset_id: int, *, state_root: Path = STATE_DIR) -> dict:
        config = read_config(state_root)
        check_exe(config['exe'])
        with contract.database.read_connection() as connection:
            row = connection.execute(
                "SELECT id,name,path,medium,disposal FROM asset WHERE id=?", (asset_id,)).fetchone()
        if row is None or row['medium'] != 'video':
            raise ValueError('只能给视频去码')
        if row['disposal']:
            raise ValueError('这部影片在回收站里')
        if is_restored(row['name'] or row['path']):
            raise ValueError('这已经是去码后的文件')
        with self._lock:
            if asset_id in self._queue or self.current.get('asset_id') == asset_id:
                raise ValueError('这部影片已经在去码队列里')
            self._queue.append(asset_id)
            update_record(asset_id, {'status': 'queued', 'name': row['name'], 'error': '',
                                     'output': '', 'restored_id': None}, state_root)
            if self._thread is None or not self._thread.is_alive():
                self._thread = threading.Thread(target=self._work, args=(contract, state_root),
                                                name='peach-jasna', daemon=True)
                self._thread.start()
        return self.snapshot()

    def _work(self, contract, state_root: Path) -> None:
        while True:
            with self._lock:
                if not self._queue:
                    self.current = {}
                    return
                asset_id = self._queue.popleft()
                self.current = {'asset_id': asset_id, 'progress': 0.0}
            outcome = run_one(contract, asset_id, state_root=state_root,
                              report=lambda value: self._report(asset_id, value))
            update_record(asset_id, outcome, state_root)

    def _report(self, asset_id: int, value: float) -> None:
        with self._lock:
            if self.current.get('asset_id') == asset_id:
                self.current['progress'] = value


def run_one(contract, asset_id: int, *, state_root: Path = STATE_DIR, report=lambda value: None) -> dict:
    """处理一部；返回写进记录的结论。异常都折成 `failed`，队列接着跑下一部。"""
    from .task_control import Cancelled, bind
    from .task_runs import TaskRunHandle
    with contract.database.read_connection() as connection:
        row = connection.execute("SELECT id,name,path,location,code FROM asset WHERE id=?",
                                 (asset_id,)).fetchone()
    name = (row['name'] if row else '') or f'影片 {asset_id}'
    run = contract.task_runs.start(TASK_KEY, trigger='manual', total=100, label=f'{TASK_LABEL} · {name}')
    handle = TaskRunHandle(contract.task_runs, run.id if run else None)
    update_record(asset_id, {'status': 'running', 'name': name}, state_root)
    try:
        with bind(contract.task_runs, handle.run_id) as control:
            if row is None:
                raise ValueError('影片已不在馆藏里')
            result = _restore(contract, row, read_config(state_root), state_root, control, handle, report)
        handle.finish('succeeded', summary={'outcome': f'已生成 {result["output"]}', **result})
        return {'status': 'succeeded', **result}
    except Cancelled:
        handle.finish('cancelled', error='已取消')
        return {'status': 'cancelled'}
    except Exception as error:  # noqa: BLE001 — 写进任务中心与记录，队列继续
        handle.finish('failed', error=str(error))
        return {'status': 'failed', 'error': str(error)}


def _restore(contract, row, config: dict, state_root: Path, control, handle, report) -> dict:
    from .platform import translate_ledger_path
    exe = check_exe(config['exe'])
    source = translate_ledger_path(row['path'])
    if not source.is_file():
        raise ValueError(f'找不到原文件：{source}')
    final = source.with_name(output_name(source.name))
    if final.exists():
        raise ValueError(f'已经有去码文件：{final.name}')
    work = source.parent / WORK_DIR
    work.mkdir(exist_ok=True)
    partial = work / final.name
    log_root = Path(state_root) / 'jasna-logs'
    log_root.mkdir(parents=True, exist_ok=True)
    log = log_root / f'{row["id"]}.log'
    command = [str(exe), '--input', str(source), '--output', str(partial),
               '--restoration-model-name', config['model'], *extra_args(config['extra'])]
    handle.progress(current=0, total=100, label=f'{TASK_LABEL} · 启动 Jasna（首次使用要准备模型，可能很久）')
    try:
        _execute(command, cwd=exe.parent, log=log, control=control, handle=handle, report=report,
                 name=row['name'] or source.name)
    except BaseException:
        _discard(partial, work)
        raise
    if not partial.is_file() or partial.stat().st_size == 0:
        raise RuntimeError('Jasna 结束了，但没有生成文件：' + log_tail(log))
    os.replace(partial, final)
    try:
        work.rmdir()
    except OSError:
        pass
    handle.progress(current=100, total=100, label=f'{TASK_LABEL} · 登记入库')
    new_id = _ingest(contract, row, final)
    return {'output': final.name, 'restored_id': new_id}


def _execute(command, *, cwd, log: Path, control, handle, report, name: str, label: str = TASK_LABEL,
             tool: str = 'Jasna') -> None:
    from .process_job import assign_to_job, close_job, create_kill_on_close_job
    job = create_kill_on_close_job()
    with log.open('wb') as sink:
        try:
            process = subprocess.Popen(command, cwd=str(cwd), stdout=sink, stderr=subprocess.STDOUT,
                                       stdin=subprocess.DEVNULL, **_hidden_window())
        except OSError as error:
            close_job(job)
            raise RuntimeError(f'{tool} 启动失败：{error}') from error
        assign_to_job(job, process)
        if control is not None:
            control.usage.enter_process(process)
        try:
            last = -1.0
            while process.poll() is None:
                if control is not None:
                    control.checkpoint(process)
                value = progress_of(log)
                if value is not None and value != last:
                    last = value
                    report(value)
                    handle.progress(current=int(value), total=100,
                                    label=f'{label} · {name} · {value:.0f}%')
                time.sleep(1)
        finally:
            if process.poll() is None:
                process.kill()
                process.wait()
            if control is not None:
                control.usage.leave_process(process)
            close_job(job)
    if process.returncode != 0:
        raise RuntimeError(f'{tool} 处理失败（退出码 {process.returncode}）：' + log_tail(log))
    final = progress_of(log)
    if final is not None:
        report(final)


def _discard(partial: Path, work: Path) -> None:
    """失败或取消时删掉没做完的成品，不留半截文件。"""
    try:
        partial.unlink(missing_ok=True)
        work.rmdir()
    except OSError:
        pass


def _ingest(contract, row, final: Path) -> int | None:
    """按扫描口径登记成品；文件名认不出番号时沿用原片的番号，再补资料。"""
    from .config import LOCATION_ROOT_DECLARATIONS
    from .field_owners import SCAN_FILENAME, write_owned_fields
    from .platform import location_mounts
    from .scan import ingest_path
    ledger_path = str(PureWindowsPath(row['path']).with_name(final.name))
    result = ingest_path(contract.db_path, row['location'], ledger_path,
                         declared_roots=LOCATION_ROOT_DECLARATIONS, mounts=location_mounts())
    new_id = result.asset_id
    if new_id is not None and row['code']:
        with contract.database.write_transaction() as connection:
            current = connection.execute("SELECT code FROM asset WHERE id=?", (new_id,)).fetchone()
            if current is not None and not current[0]:
                write_owned_fields(connection, [new_id], {'code': row['code']}, SCAN_FILENAME,
                                   require_empty=True)
    contract.cache_bust()
    if new_id is not None:
        try:
            from .download_postprocess import _collect
            _collect(contract, int(new_id), _QuietHandle())
        except Exception:  # noqa: BLE001 — 补资料失败不影响成品，下次同步会补
            pass
        label_restored(contract, int(row['id']), int(new_id))
        contract.cache_bust()
    return new_id


LABEL = '（去码）'


def label_restored(contract, original_id: int, restored_id: int) -> bool:
    """成品的标题沿用原片并加「（去码）」，卡片上一眼分得出来；以用户归属写入，刮削不会改回去。"""
    from .field_owners import write_owned_fields
    with contract.database.write_transaction() as connection:
        rows = {int(row['id']): row for row in connection.execute(
            "SELECT id,name,catalog_title FROM asset WHERE id IN (?,?)", (original_id, restored_id))}
        restored = rows.get(restored_id)
        if restored is None or str(restored['catalog_title'] or '').endswith(LABEL):
            return False
        source = rows.get(original_id) or restored
        base = str(source['catalog_title'] or PureWindowsPath(str(source['name'] or '')).stem).strip()
        write_owned_fields(connection, [restored_id], {'catalog_title': base + LABEL}, 'user:jasna')
    return True


class _QuietHandle:
    def progress(self, *args, **kwargs) -> None:
        pass


QUEUE = JasnaQueue()


def summary(contract, *, state_root: Path = STATE_DIR) -> dict:
    config = read_config(state_root)
    state = load_state(state_root)
    live = QUEUE.snapshot()
    active = set(live['queue']) | ({live['current']['asset_id']} if live['current'] else set())
    jobs = []
    for key, value in state.items():
        if not key.isdigit():
            continue
        item = {**value, 'id': int(key)}
        # 服务重启后内存里的队列没了：记录还写着排队或进行中的，按中断显示，可重新开始。
        if item.get('status') in ('queued', 'running') and int(key) not in active:
            item['status'] = 'interrupted'
        jobs.append(item)
    jobs = sorted(jobs, key=lambda item: item.get('at') or '', reverse=True)[:30]
    labelled = False
    for item in jobs:
        if item.get('status') == 'succeeded' and item.get('restored_id'):
            try:
                labelled = label_restored(contract, item['id'], int(item['restored_id'])) or labelled
            except Exception:  # noqa: BLE001 — 补标签失败不影响读取状态
                pass
    if labelled:
        contract.cache_bust()
    return {'config': config, 'models': list(MODELS), 'configured': bool(config['exe']),
            'jobs': jobs, **live}
