"""保存扫描已登记、尚未交给资料处理的新影片范围。"""
from contextlib import closing
import json
from pathlib import Path
import sqlite3

from filelock import FileLock
from .fsutil import atomic_write_text
from .update_tasks import state_for


def _path(db):
    return state_for(Path(db)).parent/'library-new-assets.json'


def _read(db):
    path = _path(db)
    try:
        ids = json.loads(path.read_text(encoding='utf-8'))
    except FileNotFoundError:
        legacy = path.with_name('library-processing.json')
        try:
            state = json.loads(legacy.read_text(encoding='utf-8'))
        except FileNotFoundError:
            return set()
        if state.get('status') == 'complete' and state.get('requested_stage') != 'scan':
            return set()
        ids = [value for checkpoint in state.get('scan_checkpoints', {}).values()
               for value in checkpoint.get('result', {}).get('new_ids', [])]
        completed = {int(key.split(':',1)[0]) for key in state.get('completed_metadata', [])}
        ids = [value for value in ids if value not in completed]
    if not isinstance(ids,list) or any(type(value) is not int or value<=0 for value in ids):
        raise ValueError('新入库处理范围无效，请重新扫描媒体库')
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
