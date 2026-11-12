"""按真实磁盘余量和本机容量设置保护媒体任务。

磁盘余量每次实时查；数据与缓存总量要逐文件统计，只在后台线程里做，请求读最近一次读数。
超限时按修改时间从旧到新清理可重建的播放缓存与缩略图，清完仍超限才暂停写入。
"""
from __future__ import annotations

from dataclasses import asdict, dataclass
from functools import lru_cache
import json
import logging
import os
from pathlib import Path
import shutil
import stat
import tempfile
import threading
import time

from filelock import FileLock

from .fsutil import atomic_write_text
from .jobs import DiskSpaceDenied
from .platform import system_volume

GIB = 1024 ** 3
POLICY_NAME = 'storage-policy.json'
STATUS_NAME = 'storage-budget-status.json'
READINGS_NAME = 'storage-budget-readings.json'
SCAN_SECONDS = 30
#: 后台统计间隔按变化速度分开：缓存约一万个文件、几秒一遍，几分钟统计一次；
#: 整个数据目录可达几十万个文件、一遍要几分钟，而它按天增长，每天统计一次。
REFRESH_SECONDS = {'cache': 300, 'data': 86400}
#: 统计失败或途中余量触线后的重试间隔，不让一次失败占住整个统计周期。
RETRY_SECONDS = 60
#: 进程启动后先等这么久再统计整个数据目录，不和启动、首屏抢磁盘；期间沿用保存的读数。
DATA_START_DELAY = 300
#: 清理后仍不够时，这段时间内不再重走缓存目录；新读数发布前反复清也清不出东西。
CLEAN_RETRY_SECONDS = 300
#: 最近这么久内写过或命中过的缓存视为在用，自动清理跳过。
RECENT_SECONDS = 600
_PROCESS_STARTED = time.time()
_LOCK = threading.RLock()
_SCANS: dict[tuple, tuple[float, dict]] = {}
#: 本进程的读数 {measured_at, started_at, usage}、开始统计的时间与失败 (时间, 原因)，按 `_reading_key` 分开。
_READINGS: dict[str, dict] = {}
_STARTED: dict[str, float] = {}
_FAILURES: dict[str, tuple[float, str]] = {}
_REFRESH_GUARD = threading.Lock()
#: 读数作废的时间：开始早于它的统计结果不发布。手动清理、迁移与自动清理都会推进它。
_INVALIDATED = [0.0]
_CLEANING = threading.Lock()
_CLEAN_EXHAUSTED = [0.0]
_LAST_STATUS: list = [None, 0.0]
_UNKNOWN = {'cache_bytes': None, 'data_bytes': None, 'external_cache_bytes': None}
_FIELDS = {'cache': ('cache_bytes', 'external_cache_bytes'), 'data': ('data_bytes',)}


@dataclass(frozen=True)
class StoragePolicy:
    enabled: bool = True
    minimum_free_gib: int = 0
    data_max_gib: int = 0
    cache_max_gib: int = 0
    auto_clean: bool = True
    external_cache_path: str = ''
    external_cache_max_gib: int = 0


def validate(raw: object, *, check_path=True) -> StoragePolicy:
    if not isinstance(raw, dict) or set(raw) - set(asdict(StoragePolicy())):
        raise ValueError('容量设置包含不支持的字段')
    values = {**asdict(StoragePolicy()), **raw}
    for key in ('minimum_free_gib', 'data_max_gib', 'cache_max_gib', 'external_cache_max_gib'):
        value = values[key]
        minimum = 0
        if type(value) is not int or not minimum <= value <= 1_048_576:
            raise ValueError(f'{key} 必须是 {minimum} 到 1048576 之间的整数 GiB')
    for key in ('enabled', 'auto_clean'):
        if type(values[key]) is not bool:
            raise ValueError(f'{key} 必须是开关值')
    raw_path = values['external_cache_path']
    if not isinstance(raw_path, str):
        raise ValueError('外部缓存目录必须是路径')
    if raw_path:
        path = Path(raw_path)
        if check_path and values['enabled'] and (not path.is_absolute() or not path.is_dir()):
            raise ValueError('外部缓存目录必须是本机可读取的绝对目录')
        if check_path and path.is_absolute():
            values['external_cache_path'] = str(path.absolute())
    return StoragePolicy(**values)


def load_policy(config) -> StoragePolicy:
    try:
        raw = json.loads((config.directory('state') / POLICY_NAME).read_text(encoding='utf-8'))
    except FileNotFoundError:
        return StoragePolicy()
    except (OSError, ValueError) as error:
        raise ValueError(f'容量设置未取得：{error}') from error
    return validate(raw, check_path=False)


def save_policy(config, raw) -> StoragePolicy:
    policy = validate(raw)
    if policy.external_cache_path:
        external = Path(policy.external_cache_path).resolve()
        from .settings_file import DIRECTORY_KEYS
        for managed in (config.data_root, *(config.directory(name) for name in DIRECTORY_KEYS)):
            managed = managed.resolve()
            if external.is_relative_to(managed) or managed.is_relative_to(external):
                raise ValueError('外部缓存目录必须独立于 Peach 数据及各配置目录')
    path = config.directory('state') / POLICY_NAME
    path.parent.mkdir(parents=True, exist_ok=True)
    with FileLock(str(path) + '.lock'):
        atomic_write_text(path, json.dumps(asdict(policy), ensure_ascii=False))
    # 读数按统计范围分键，只改上限数值时旧读数照样能用，不必重新统计整个数据目录。
    return policy


def invalidate_measurements(config=None):
    """手动清理、迁移后旧读数作废；传入配置时同时作废保存的读数，别的进程在途的统计也不再发布。"""
    now = time.time()
    with _REFRESH_GUARD:
        _INVALIDATED[0] = max(_INVALIDATED[0], now)
        _SCANS.clear()
        _READINGS.clear()
        _STARTED.clear()
        _FAILURES.clear()
    _CLEAN_EXHAUSTED[0] = 0.0
    if config is not None:
        _update_saved(config, lambda marker, _readings: (max(marker, now), {}))


def _parts(policy) -> tuple[str, ...]:
    """设了哪类上限才统计哪类：缓存与外部缓存同一轮，数据目录单独一轮。"""
    parts = []
    if policy.cache_max_gib or policy.external_cache_max_gib:
        parts.append('cache')
    if policy.data_max_gib:
        parts.append('data')
    return tuple(parts)


def _identity(config) -> dict:
    """读数归属的目录身份：数据根与各配置目录。不含临时目录，托盘、服务与命令行的 TEMP 不同也共用读数。"""
    paths = layout(config)['paths']
    paths.pop('temporary', None)
    return paths


def _reading_key(config, policy, part, identity=None) -> str:
    """统计范围的身份：目录、类别，以及缓存一类实际统计了哪些目录；与上限数值无关。"""
    scope = ([bool(policy.cache_max_gib), policy.external_cache_path if policy.external_cache_max_gib else '']
             if part == 'cache' else [])
    return json.dumps([part, identity or _identity(config), scope], sort_keys=True)


def _valid_entry(entry) -> bool:
    return (isinstance(entry, dict) and all(isinstance(entry.get(name), (int, float)) and not isinstance(entry.get(name), bool)
                                            for name in ('measured_at', 'started_at'))
            and isinstance(entry.get('usage'), dict)
            and all(value is None or (type(value) is int and value >= 0) for value in entry['usage'].values()))


def _load_saved(config) -> tuple[float, dict]:
    """读保存的读数；格式不对的条目丢掉，不让坏文件挡住检查。"""
    try:
        raw = json.loads((config.directory('state') / READINGS_NAME).read_text(encoding='utf-8'))
    except (OSError, ValueError):
        return 0.0, {}
    if not isinstance(raw, dict):
        return 0.0, {}
    marker = raw.get('invalidated_at')
    marker = float(marker) if isinstance(marker, (int, float)) and not isinstance(marker, bool) else 0.0
    readings = raw.get('readings')
    return marker, {key: entry for key, entry in readings.items() if _valid_entry(entry)} if isinstance(readings, dict) else {}


def _update_saved(config, change) -> bool:
    """在文件锁里读改写保存的读数；不持有进程内锁，等文件锁时不挡请求。"""
    path = config.directory('state') / READINGS_NAME
    try:
        path.parent.mkdir(parents=True, exist_ok=True)
        with FileLock(str(path) + '.lock', timeout=5):
            marker, readings = change(*_load_saved(config))
            atomic_write_text(path, json.dumps({'invalidated_at': marker, 'readings': readings}, ensure_ascii=False))
        return True
    except (OSError, TimeoutError) as error:
        logging.getLogger(__name__).warning('容量读数未保存（%s）', type(error).__name__)
        return False


def _publish(config, key, entry) -> bool:
    """发布一份统计结果。开始早于最近一次作废（手动或自动清理、迁移）的统计不发布；
    文件里已有更新的读数也不覆盖。顺手丢掉不属于当前目录身份的旧条目。"""
    if entry['started_at'] <= _INVALIDATED[0]:
        return False
    current = json.dumps(_identity(config), sort_keys=True)
    accepted = [True]
    def change(marker, readings):
        if entry['started_at'] <= marker:
            accepted[0] = False
            return marker, readings
        existing = readings.get(key)
        if existing is None or existing['measured_at'] <= entry['measured_at']:
            readings[key] = entry
        return marker, {name: value for name, value in readings.items()
                        if json.dumps(json.loads(name)[1], sort_keys=True) == current}
    _update_saved(config, change)
    if not accepted[0]:
        return False
    with _REFRESH_GUARD:
        existing = _READINGS.get(key)
        if existing is None or existing['measured_at'] <= entry['measured_at']:
            _READINGS[key] = entry
    return True


def refresh_usage(config, policy=None, parts=None) -> dict:
    """同步统计并发布读数；后台线程与需要即时读数的调用方共用。"""
    policy = policy or load_policy(config)
    result = {}
    for part in (parts or _parts(policy)):
        key = _reading_key(config, policy, part)
        started_at = time.time()
        try:
            usage = _measure_part(config, policy, part)
        except (OSError, ValueError) as error:
            with _REFRESH_GUARD:
                _FAILURES[key] = (time.time(), str(error))
            raise
        with _REFRESH_GUARD:
            _FAILURES.pop(key, None)
        _publish(config, key, {'measured_at': time.time(), 'started_at': started_at, 'usage': usage})
        result.update(usage)
    return result


def _refresh_in_background(config, policy, part):
    def run():
        lock = FileLock(str(config.directory('state') / f'storage-measure-{part}.lock'))
        try:
            config.directory('state').mkdir(parents=True, exist_ok=True)
            # 同一数据目录只让一个进程统计；别的进程正在统计就跳过，等它发布读数。
            lock.acquire(timeout=0)
        except (OSError, TimeoutError):
            return
        try:
            refresh_usage(config, policy, (part,))
        except DiskSpaceDenied as error:
            # 统计途中余量触线：按短间隔重试；这段时间由请求侧的实时余量检查拦写入。
            with _REFRESH_GUARD:
                _FAILURES[_reading_key(config, policy, part)] = (time.time(), str(error))
        except (OSError, ValueError) as error:
            logging.getLogger(__name__).warning('容量统计未取得（%s）', type(error).__name__)
        finally:
            lock.release()
    threading.Thread(target=run, name=f'PeachCapacityMeasure-{part}', daemon=True).start()


def latest_usage(config, policy, *, reload=False) -> dict:
    """请求只读最近一次总量读数，不展开目录。

    读数先找本进程，过期或 `reload` 时再找状态目录里别的进程或上次运行留下的；没有或已到该类的
    统计间隔就交后台重算，同一类同时只跑一份，失败后按短间隔重试。还没有读数时按未知处理，只由
    实时磁盘余量把关。统计失败的类别记进 `errors`，字段保持未知，不把未知当成零。
    """
    usage = {**_UNKNOWN, 'measured_at': None, 'errors': {}}
    now = time.time()
    identity = _identity(config) if _parts(policy) else None
    saved = None
    for part in _parts(policy):
        key = _reading_key(config, policy, part, identity)
        with _REFRESH_GUARD:
            reading = _READINGS.get(key)
        if reload or reading is None or now - reading['measured_at'] >= REFRESH_SECONDS[part]:
            saved = _load_saved(config)[1] if saved is None else saved
            stored = saved.get(key)
            if stored is not None and (reading is None or stored['measured_at'] >= reading['measured_at']):
                reading = stored
                with _REFRESH_GUARD:
                    _READINGS[key] = stored
        stale = reading is None or now - reading['measured_at'] >= REFRESH_SECONDS[part]
        with _REFRESH_GUARD:
            failure, started = _FAILURES.get(key), _STARTED.get(key)
            wait = RETRY_SECONDS if failure else REFRESH_SECONDS[part]
            due = (stale and (started is None or now - started >= wait)
                   and not (part == 'data' and now - _PROCESS_STARTED < DATA_START_DELAY))
            if due:
                _STARTED[key] = now
        if due:
            _refresh_in_background(config, policy, part)
        if failure is not None and (reading is None or failure[0] > reading['measured_at']):
            usage['errors'][part] = failure[1]
        elif reading is not None:
            usage.update({name: reading['usage'].get(name) for name in _FIELDS[part]})
            usage['measured_at'] = min(filter(None, (usage['measured_at'], reading['measured_at'])))
    return usage


def _remember_cleanup(config, policy, freed):
    """自动清理后把释放量从读数里扣掉，并作废在途统计（它们数的是清理前）；缓存也算在数据目录里。"""
    now = time.time()
    keys = {part: _reading_key(config, policy, part) for part in ('cache', 'data')}
    with _REFRESH_GUARD:
        _INVALIDATED[0] = max(_INVALIDATED[0], now)
        memory = {part: _READINGS.get(key) for part, key in keys.items()}
    def deducted(entry, name):
        if entry is None or entry['usage'].get(name) is None:
            return entry
        return {**entry, 'usage': {**entry['usage'], name: max(0, entry['usage'][name] - freed)}}
    updated = {}
    def change(marker, readings):
        for part, name in (('cache', 'cache_bytes'), ('data', 'data_bytes')):
            entry = deducted(readings.get(keys[part]) or memory[part], name)
            if entry is not None:
                readings[keys[part]] = updated[keys[part]] = entry
        return max(marker, now), readings
    if not _update_saved(config, change):
        updated = {keys[part]: deducted(memory[part], name)
                   for part, name in (('cache', 'cache_bytes'), ('data', 'data_bytes')) if memory[part] is not None}
    with _REFRESH_GUARD:
        _READINGS.update(updated)


def snapshot(config, *, usage=None) -> dict:
    try:
        loaded = load_policy(config)
        policy = asdict(loaded)
    except ValueError as error:
        return {'policy': None, 'last_check': None, 'error': str(error)}
    try:
        status = json.loads((config.directory('state') / STATUS_NAME).read_text(encoding='utf-8'))
    except FileNotFoundError:
        status = None
    except (OSError, ValueError) as error:
        return {'policy': policy, 'last_check': None, 'error': f'容量检查记录未取得：{error}'}
    try:
        if status is not None and status.get('layout') != layout(config, loaded):
            status = None
    except OSError as error:
        return {'policy': policy, 'last_check': None, 'error': f'容量目录未取得：{error}'}
    from .capacity_history import project
    history = project(config)
    return {'policy': policy, 'last_check': status, 'recommendation_state': 'population_model_not_available',
            'history': history, 'error': ''}


def _history_due(config):
    from .capacity_history import sample_due
    try:
        return sample_due(config)
    except (OSError, ValueError) as error:
        logging.getLogger(__name__).warning('容量历史未取得（%s）', type(error).__name__)
        return False


def record_history(config, *, data_bytes, cache_bytes, cleaned_bytes=0):
    """研究记录失败独立于容量闸门；不因记录失败取消磁盘保护。"""
    from .capacity_history import record_sample
    try:
        record_sample(config, data_bytes, cache_bytes, cleaned_bytes)
    except (OSError, ValueError) as error:
        logging.getLogger(__name__).warning('容量历史未取得（%s）', type(error).__name__)


@lru_cache(maxsize=1)
def _compressed_file_size():
    import ctypes
    from ctypes import wintypes
    function = ctypes.WinDLL('kernel32', use_last_error=True).GetCompressedFileSizeW
    function.argtypes = (wintypes.LPCWSTR, ctypes.POINTER(wintypes.DWORD))
    function.restype = wintypes.DWORD
    return function


def allocated_bytes(path: Path, info: os.stat_result) -> int:
    """稀疏缓存按实际占盘计量，不把文件逻辑长度当作分配量。"""
    if os.name != 'nt':
        return info.st_blocks * 512
    import ctypes
    from ctypes import wintypes
    function = _compressed_file_size()
    high = wintypes.DWORD()
    ctypes.set_last_error(0)
    low = function(str(path), ctypes.byref(high))
    error = ctypes.get_last_error()
    if low == 0xFFFFFFFF and error:
        raise ctypes.WinError(error)
    return (high.value << 32) | low


def _files(root: Path, skipped=None):
    """不跟随文件或目录链接。

    统计期间被删、被占用或正在删除的单个文件与子目录跳过并计入 `skipped`，几十万个文件里
    总有正在变的，不能让一个文件作废整轮统计；根目录本身读不到照常抛出。
    """
    if root.is_symlink() or root.is_junction():
        return
    stack = [root]
    while stack:
        folder = stack.pop()
        try:
            with os.scandir(folder) as entries:
                for entry in entries:
                    try:
                        if entry.is_symlink() or Path(entry.path).is_junction():
                            continue
                        if entry.is_dir(follow_symlinks=False):
                            stack.append(Path(entry.path))
                        else:
                            info = file_stat(entry)
                            if stat.S_ISREG(info.st_mode):
                                yield Path(entry.path), info
                    except (FileNotFoundError, PermissionError):
                        if skipped is not None:
                            skipped[0] += 1
        except FileNotFoundError:
            continue
        except PermissionError:
            if folder == root:
                raise
            if skipped is not None:
                skipped[0] += 1


def _roots(paths):
    selected = []
    for path in sorted({Path(value).resolve() for value in paths}, key=lambda value: len(value.parts)):
        if not any(path.is_relative_to(parent) for parent in selected):
            selected.append(path)
    return selected


def cache_roots(config):
    from .previews import cover_thumb_root, entity_thumb_root
    generated = config.directory('generated')
    return _roots((generated / 'transcodes', generated / 'stream-segments', generated / 'remote-media',
                   cover_thumb_root(generated / 'covers'), entity_thumb_root(generated / 'avatars')))


def data_roots(config):
    from .settings_file import DIRECTORY_KEYS
    return _roots((config.data_root, *(config.directory(name) for name in DIRECTORY_KEYS)))


def layout(config, policy=None):
    """统计绑定当前配置与挂载身份，迁移或重挂载后不复用旧读数。"""
    from .settings_file import DIRECTORY_KEYS
    paths = {'data': config.data_root, **{name: config.directory(name) for name in DIRECTORY_KEYS},
             'temporary': Path(tempfile.gettempdir())}
    if policy is not None and policy.external_cache_path:
        paths['external'] = Path(policy.external_cache_path)
    result = {'version': 1, 'paths': {}}
    for name, raw in paths.items():
        path = Path(raw).resolve()
        existing = _existing(path)
        info = existing.stat()
        result['paths'][name] = [str(path), str(existing), info.st_dev, info.st_ino]
    return result


def count_file(info, seen):
    """同一硬链接文件只计一次；文件系统未提供身份时不伪造分配量。"""
    if info.st_nlink <= 1:
        return True
    if not info.st_ino:
        raise OSError('文件系统未提供硬链接身份，分配量未取得')
    key = info.st_dev, info.st_ino
    if key in seen:
        return False
    seen.add(key)
    return True


def file_stat(entry):
    """Windows DirEntry 的设备、文件号与链接数均为空，按路径读取完整身份。"""
    return os.stat(entry.path, follow_symlinks=False) if os.name == 'nt' else entry.stat(follow_symlinks=False)


def cache_usage(config, policy=None, *, managed=True, external=True, check=lambda: None):
    policy = policy or load_policy(config)
    binding = layout(config, policy)
    key = ('cache', json.dumps(binding, sort_keys=True), managed, external)
    cached = _SCANS.get(key)
    if cached and time.monotonic() - cached[0] < SCAN_SECONDS:
        return dict(cached[1])
    result = {'managed_cache_bytes': None, 'external_cache_bytes': None}
    if managed:
        result['managed_cache_bytes'] = _allocated(cache_roots(config), check)
    if external and policy.external_cache_path:
        root = Path(policy.external_cache_path)
        if not root.is_absolute():
            raise OSError('外部缓存路径不适用于当前系统，请更新路径')
        root = root.resolve()
        if not root.is_dir():
            raise OSError('外部缓存目录不可访问')
        result['external_cache_bytes'] = _allocated((root,), check)
    if layout(config, policy) != binding:
        raise OSError('缓存目录在统计期间发生变化，请重新统计')
    _SCANS[key] = (time.monotonic(), result)
    return dict(result)


def data_usage(config, *, check=lambda: None):
    binding = layout(config)
    amount = _allocated(data_roots(config), check)
    if layout(config) != binding:
        raise OSError('数据目录在统计期间发生变化，请重新统计')
    return amount


def _allocated(roots, check):
    total = 0
    seen = set()
    skipped = [0]
    for root in roots:
        for path, info in _files(root, skipped):
            check()
            if count_file(info, seen):
                try:
                    total += allocated_bytes(path, info)
                except (FileNotFoundError, PermissionError):
                    skipped[0] += 1
    if skipped[0]:
        logging.getLogger(__name__).info('容量统计跳过 %d 个正在变化的文件或目录', skipped[0])
    return total


def _free_space_check(config, policy, interval_secs=2):
    """长遍历按间隔复查余量，触线就中断，不在磁盘快满时继续读分配量。"""
    next_check = 0.0
    def check_free():
        nonlocal next_check
        now = time.monotonic()
        if now < next_check:
            return
        next_check = now + interval_secs
        reasons = _exceeded(policy, dict(_UNKNOWN), _disks(config, policy))
        if reasons:
            raise DiskSpaceDenied('扫描期间磁盘余量触线，已暂停当前写入，请清理或重试：' + '；'.join(reasons))
    return check_free


def _measure_part(config, policy, part) -> dict:
    """后台分类统计：数据目录一类，缓存与外部缓存一类；统计期间目录变化则不发布。"""
    binding = layout(config, policy)
    check_free = _free_space_check(config, policy)
    if part == 'data':
        usage = {'data_bytes': data_usage(config, check=check_free)}
    else:
        cache = cache_usage(config, policy, managed=bool(policy.cache_max_gib),
                            external=bool(policy.external_cache_max_gib), check=check_free)
        usage = {'cache_bytes': cache['managed_cache_bytes'], 'external_cache_bytes': cache['external_cache_bytes']}
    if layout(config, policy) != binding:
        raise OSError('容量目录在统计期间发生变化，请重新统计')
    # 容量历史按天记：数据每天统计一次照记；缓存每 5 分钟一次，只记当天第一份，
    # 否则清理后回填的每次波动都会被算成增长。
    if part == 'data' or _history_due(config):
        record_history(config, data_bytes=usage.get('data_bytes'), cache_bytes=usage.get('cache_bytes'))
    return usage


def reserve_bytes(policy, total):
    if not policy.enabled:
        return 0
    return policy.minimum_free_gib * GIB if policy.minimum_free_gib else max(GIB, min(40 * GIB, total // 20))


def _exceeded(policy, usage, disks):
    reasons = [f'{path} 可用空间 {free / GIB:.2f} GiB，低于保留值 {reserve_bytes(policy, total) / GIB:.2f} GiB'
               for path, free, total in disks if free < reserve_bytes(policy, total)]
    for name, key, limit in (('Peach 数据', 'data_bytes', policy.data_max_gib),
                             ('Peach 缓存', 'cache_bytes', policy.cache_max_gib),
                             ('外部缓存', 'external_cache_bytes', policy.external_cache_max_gib)):
        amount = usage[key]
        if limit and amount is not None and amount >= limit * GIB:
            reasons.append(f'{name} {amount / GIB:.2f} GiB，达到上限 {limit} GiB')
    return reasons


def _disks(config, policy, *, strict=True, playback=False):
    """各写入目录所在卷的余量。

    `playback=True` 只看播放缓存实际会写的卷：系统盘（08-15 事故里 CloudDrive 把它写满）、
    `generated` 与临时目录；别的卷快满不该挡播放。`strict=False` 时跳过不可访问的外部缓存目录。
    """
    from .settings_file import DIRECTORY_KEYS
    if playback:
        paths = [system_volume(), config.directory('generated'), Path(tempfile.gettempdir())]
    else:
        paths = [system_volume(), config.data_root, *(config.directory(name) for name in DIRECTORY_KEYS),
                 Path(tempfile.gettempdir())]
    if policy.external_cache_path and not playback:
        external = Path(policy.external_cache_path)
        if external.is_absolute() and external.is_dir():
            paths.append(external)
        elif strict:
            raise OSError('外部缓存目录不可访问，迁移后请更新容量设置中的路径')
    devices, result = set(), []
    for path in dict.fromkeys(paths):
        target = _existing(path)
        device = target.stat().st_dev
        if device not in devices:
            disk = shutil.disk_usage(target)
            result.append((str(path), disk.free, disk.total))
            devices.add(device)
    return result


def _existing(path):
    target = Path(path)
    while not target.exists() and target != target.parent:
        target = target.parent
    return target


def _rebuildable(config):
    """可自动清理的已完成产物，按清理先后分层：HLS 分段、转码副本、本机原图可重算的缩略图。

    分段按需逐段重生成，最便宜，先清；转码副本重建要几分钟；缩略图量多且浏览时马上要用，最后清。
    转码与分段写入时用 `.tmp.` 临时名，完成后才改名，临时文件不在清理之列；命中时会刷新修改时间，
    所以「最旧」就是最久没用过。预览图、下载的封面与资料重建代价高或取不回来，不自动清理。
    """
    from . import artifact_rules
    from .data_storage import _TRANSCODE
    from .previews import cover_thumb_root, entity_thumb_root
    generated = config.directory('generated')
    for path, info in _files(generated / 'stream-segments'):
        if path.suffix == '.ts' and not path.name.endswith('.tmp.ts'):
            yield 0, path, info, False
    for path, info in _files(generated / 'transcodes'):
        if _TRANSCODE.match(path.name) and not path.name.endswith('.tmp.mp4'):
            yield 1, path, info, False
    for root in (cover_thumb_root(generated / 'covers'), entity_thumb_root(generated / 'avatars')):
        for path, info in _files(root):
            if path.suffix.lower() == '.webp' and artifact_rules.current(path, source_required=True):
                yield 2, path, info, True


def _clean_rebuildable(config, needed):
    """分层、层内按修改时间从旧到新删，凑够 `needed` 字节为止。

    最近 `RECENT_SECONDS` 内写过或命中过的视为在用，跳过（删掉正在播的副本只会立刻重转一遍）；
    删不掉的也跳过。
    """
    from .previews import _generate_lock
    freed = 0
    recent = time.time() - RECENT_SECONDS
    for _, _, path, thumbnail in sorted((tier, info.st_mtime, path, thumbnail)
                                        for tier, path, info, thumbnail in _rebuildable(config)
                                        if info.st_mtime < recent):
        if freed >= needed:
            break
        lock = _generate_lock(path) if thumbnail else None
        if lock is not None and not lock.acquire(blocking=False):
            continue
        try:
            current = path.stat(follow_symlinks=False)
            amount = allocated_bytes(path, current) if current.st_nlink == 1 else 0
            path.unlink()
            freed += amount
            if thumbnail:
                Path(str(path) + '.rule').unlink(missing_ok=True)
        except OSError:
            continue
        finally:
            if lock is not None:
                lock.release()
    return freed


class CapacityGuard:
    """容量闸门。

    后台任务（刮削、补修、抽帧等让数据增长的工作）遇到任一上限或余量不足都暂停。
    `foreground=True` 用于播放与浏览：总量上限只触发清理，不挡请求；只有磁盘余量真的
    不够才拒绝写缓存；检查本身出错时放行并记下原因，不让保护机制挡住播放。
    """

    def __init__(self, config, interval_secs=2, *, foreground=False):
        self.config = config
        self.interval_secs = interval_secs
        self.foreground = foreground
        self.next_check = 0.0
        self._reservation_started = False
        self._reserved_data = None
        self._denied = None

    def _projected_reasons(self, policy, usage, disks, required_bytes, destination):
        projected = dict(usage)
        checked = list(disks)
        if required_bytes:
            target = _existing(destination or self.config.data_root)
            disk = shutil.disk_usage(target)
            checked.append((f'{target} 预计写入后', disk.free - required_bytes, disk.total))
            if projected['data_bytes'] is not None:
                self._reserved_data = max(self._reserved_data or 0, projected['data_bytes'] + required_bytes)
                projected['data_bytes'] = self._reserved_data
        return _exceeded(policy, projected, checked)

    def _cleanup_target(self, policy, usage, required_bytes, destination):
        generated = _existing(self.config.directory('generated'))
        disk = shutil.disk_usage(generated)
        needed = max(0, reserve_bytes(policy, disk.total) - disk.free)
        if required_bytes and _existing(destination or self.config.data_root).stat().st_dev == generated.stat().st_dev:
            needed = max(needed, reserve_bytes(policy, disk.total) - disk.free + required_bytes)
        for key, limit in (('cache_bytes', policy.cache_max_gib), ('data_bytes', policy.data_max_gib)):
            if limit and usage[key] is not None:
                extra = required_bytes if key == 'data_bytes' else 0
                needed = max(needed, usage[key] + extra - limit * GIB + 1)
        return needed

    def _usage(self, policy, disks):
        """余量已触线就不读总量；其余一律读最近一次读数，请求与任务检查点里都不展开目录。"""
        unknown = {**_UNKNOWN, 'measured_at': None, 'errors': {}}
        if _exceeded(policy, unknown, disks):
            return unknown
        return latest_usage(self.config, policy)

    def _clean(self, policy, required_bytes=0, destination=None) -> tuple[int, dict | None]:
        """拿到跨进程清理锁后，按最新读数（含别的进程刚扣掉的）重算缺口再清，并发检查不会各清一遍。

        返回释放量与清理后的最新读数。清完仍不够时记下时间，`CLEAN_RETRY_SECONDS` 内不再重走缓存目录。
        """
        if time.time() - _CLEAN_EXHAUSTED[0] < CLEAN_RETRY_SECONDS:
            return 0, None
        state = self.config.directory('state')
        state.mkdir(parents=True, exist_ok=True)
        with FileLock(str(state / 'storage-auto-clean.lock')):
            usage = latest_usage(self.config, policy, reload=True)
            needed = self._cleanup_target(policy, usage, required_bytes, destination)
            if needed <= 0:
                return 0, usage
            # 多清 1 MiB 余量，免得每次只差几个字节就再清一轮。
            freed = _clean_rebuildable(self.config, needed + GIB // 1024)
            if freed < needed:
                _CLEAN_EXHAUSTED[0] = time.time()
            if freed:
                _remember_cleanup(self.config, policy, freed)
                usage = {**usage, **{name: None if usage[name] is None else max(0, usage[name] - freed)
                                     for name in ('cache_bytes', 'data_bytes')}}
        if freed:
            record_history(self.config, data_bytes=None, cache_bytes=None, cleaned_bytes=freed)
        return freed, usage

    def _clean_later(self, policy):
        """前台只排一次后台清理，不在播放请求里走缓存目录；同一时刻只跑一份。"""
        if not _CLEANING.acquire(blocking=False):
            return
        def run():
            try:
                self._clean(policy)  # 结论由后台检查点按新读数自己下
            except (OSError, ValueError, TimeoutError) as error:
                logging.getLogger(__name__).warning('自动清理未完成（%s）', type(error).__name__)
            finally:
                _CLEANING.release()
        threading.Thread(target=run, name='PeachCapacityClean', daemon=True).start()

    def _write_status(self, status):
        """检查结论没变就不重写状态文件；各后台任务每个检查点都会走到这里。"""
        path = self.config.directory('state') / STATUS_NAME
        stable = (str(path), {key: value for key, value in status.items() if key not in ('checked_at', 'volumes')})
        with _LOCK:
            if _LAST_STATUS[0] == stable and time.time() - _LAST_STATUS[1] < 60 and path.is_file():
                return
            atomic_write_text(path, json.dumps(status, ensure_ascii=False))
            _LAST_STATUS[:] = [stable, time.time()]

    def check(self, force=False, *, required_bytes=0, destination=None):
        from .update_tasks import check_pause, current_db
        check_pause(current_db.get())
        now = time.monotonic()
        if not force and not required_bytes and now < self.next_check:
            if self._denied is not None:
                raise self._denied
            return None
        self.next_check = now + self.interval_secs
        try:
            policy = load_policy(self.config)
            if not policy.enabled:
                self._denied = None
                return {'enabled': False, 'paused': False, 'reasons': [], 'freed_bytes': 0,
                        'data_bytes': None, 'cache_bytes': None, 'external_cache_bytes': None,
                        'checked_at': time.time()}
            disks = _disks(self.config, policy, strict=not self.foreground, playback=self.foreground)
            usage = self._usage(policy, disks)
            reasons = self._projected_reasons(policy, usage, disks, required_bytes, destination)
            freed = 0
            if reasons and policy.auto_clean and self._cleanup_target(policy, usage, required_bytes, destination) > 0:
                if self.foreground:
                    self._clean_later(policy)
                else:
                    freed, fresh = self._clean(policy, required_bytes, destination)
                    if fresh is not None:
                        disks = _disks(self.config, policy)
                        if _exceeded(policy, dict(_UNKNOWN), disks):
                            fresh = {**fresh, **_UNKNOWN}
                        usage = fresh
                        if self._reserved_data is not None:
                            self._reserved_data = max(0, self._reserved_data - freed)
                        reasons = self._projected_reasons(policy, usage, disks, required_bytes, destination)
            status = {**usage, 'checked_at': time.time(), 'reasons': reasons,
                      'freed_bytes': freed, 'paused': bool(reasons or usage.get('errors')),
                      'required_bytes': required_bytes,
                      'volumes': [{'path':path,'free_bytes':free,'reserve_bytes':reserve_bytes(policy,total)}
                                  for path, free, total in disks]}
            if self.foreground:
                # 前台不写状态文件：设置页的「已暂停」只说后台任务，由后台检查点写。
                blocking = _exceeded(policy, dict(_UNKNOWN), disks)
                if blocking:
                    raise DiskSpaceDenied('；'.join(blocking) + '；磁盘空间不足，已停止写入缓存，请清理后重试')
                self._denied = None
                return status
            status['layout'] = layout(self.config, policy)
            self._write_status(status)
            if usage.get('errors'):
                raise OSError('容量统计未取得：' + '；'.join(usage['errors'].values()))
            if reasons:
                raise DiskSpaceDenied('；'.join(reasons) + '；已停止领取新项，请调整容量或清理后重试')
            self._denied = None
            return status
        except DiskSpaceDenied as error:
            self._denied = error
            raise
        except (OSError, ValueError, TimeoutError) as error:
            if self.foreground:
                logging.getLogger(__name__).warning('容量检查未取得，播放照常（%s）', type(error).__name__)
                self._denied = None
                return {'paused': False, 'reasons': [], 'error': str(error), 'checked_at': time.time()}
            self._denied = DiskSpaceDenied(f'容量保护检查未取得，已暂停：{error}')
            raise self._denied from error
