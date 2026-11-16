"""保存扫描已登记、尚未交给资料处理的新影片范围。"""
from contextlib import closing
import json
import logging
import os
from pathlib import Path
import sqlite3

from filelock import FileLock
from .fsutil import atomic_write_text
from .update_tasks import state_for

LOGGER = logging.getLogger(__name__)


def _path(db):
    return state_for(Path(db)).parent/'library-new-assets.json'


def _valid(ids):
    return isinstance(ids,list) and all(type(value) is int and value>0 for value in ids)


def _set_aside(path):
    """损坏或无效的范围文件改名留证，之后按没有待处理的新影片继续；下次扫描重新登记。"""
    target = path.with_name(path.name+'.invalid')
    try:
        os.replace(path, target)
    except OSError as error:
        LOGGER.warning('Invalid new-asset scope file, and renaming it for inspection failed: %s', error)
        return
    LOGGER.warning('Invalid new-asset scope file, renamed to %s; rescanning the library registers new videos again', target.name)


def _legacy(path):
    """旧版处理状态里的扫描检查点；读不出或结构不对就当没有。"""
    try:
        state = json.loads(path.read_text(encoding='utf-8'))
        if not isinstance(state, dict) or (state.get('status') == 'complete'
                                           and state.get('requested_stage') != 'scan'):
            return set()
        ids = [value for checkpoint in state.get('scan_checkpoints', {}).values()
               for value in checkpoint.get('result', {}).get('new_ids', [])]
        completed = {int(key.split(':',1)[0]) for key in state.get('completed_metadata', [])}
    except (OSError, ValueError, AttributeError, TypeError):
        return set()
    ids = [value for value in ids if value not in completed]
    return set(ids) if _valid(ids) else set()


def _read(db):
    path = _path(db)
    try:
        ids = json.loads(path.read_text(encoding='utf-8'))
    except FileNotFoundError:
        return _legacy(path.with_name('library-processing.json'))
    except ValueError:
        ids = None
    if not _valid(ids):
        _set_aside(path)
        return set()
    return set(ids)


def _lock(path):
    return FileLock(str(path)+'.lock')


def pending(db):
    # `remember` 持锁原子替换；Windows 上替换瞬间的读取会撞上共享冲突，读也等同一把锁。
    path = _path(db)
    if not path.parent.is_dir():
        return []
    with _lock(path):
        wanted = sorted(_read(db))
    return _active_videos(db, wanted)


def _active_videos(db, wanted):
    result = []
    if wanted:
        with closing(sqlite3.connect(Path(db).resolve().as_uri()+'?mode=ro',uri=True)) as connection:
            for offset in range(0,len(wanted),900):
                batch = wanted[offset:offset+900]
                result.extend(row[0] for row in connection.execute(
                    "SELECT id FROM asset WHERE medium='video' AND disposal IS NULL AND id IN ("
                    +','.join('?'*len(batch))+') ORDER BY id',batch))
    return result


def remember(db, ids=(), *, completed=()):
    path = _path(db)
    path.parent.mkdir(parents=True,exist_ok=True)
    with _lock(path):
        previous = _read(db)
        updated = set(_active_videos(db, sorted(previous | set(ids)))) - set(completed)
        if updated != previous or (updated and not path.exists()):
            atomic_write_text(path,json.dumps(sorted(updated)))
