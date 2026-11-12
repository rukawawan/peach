"""分片完成报告与完成后的进程回收。"""
from __future__ import annotations

import json
import math
from pathlib import Path


EXIT_GRACE_SECONDS = 15.0


def read_report(path: Path) -> dict:
    try:
        report = json.loads(path.read_text(encoding='utf8'))
        if (not isinstance(report, dict) or report.get('complete') is not True
                or type(report.get('success')) is not bool
                or type(report.get('count')) is not int or report['count'] < 0
                or not isinstance(report.get('timings', []), list)
                or not isinstance(report.get('files', {}), dict)
                or not isinstance(report.get('results', []), list)):
            raise ValueError('分片报告字段无效')
        if not all(isinstance(row, dict) and isinstance(row.get('id'), str)
                   and row.get('outcome') in {'pass', 'skip', 'fail', 'error'}
                   for row in report.get('results', ())):
            raise ValueError('分片结果无效')
        if report['success'] and any(row['outcome'] in {'fail', 'error'} for row in report.get('results', ())):
            raise ValueError('分片整体结果与用例结果不符')
        if not all(isinstance(row, list) and len(row) == 2 and duration(row[0])
                   and isinstance(row[1], str) for row in report.get('timings', ())):
            raise ValueError('分片耗时无效')
        if not all(isinstance(name, str) and duration(seconds)
                   for name, seconds in report.get('files', {}).items()):
            raise ValueError('文件耗时无效')
        return report
    except (OSError, ValueError, UnicodeError, RecursionError) as error:
        return {'success': False, 'count': 0, 'timings': [], 'files': {}, 'results': [],
                'report_error': f'{type(error).__name__}: {error}'}


def duration(value):
    return type(value) in (float, int) and math.isfinite(value) and value >= 0


def stop_process_tree(process):
    """只回收调用方创建的进程及其当前子进程。"""
    import psutil
    try:
        children = psutil.Process(process.pid).children(recursive=True)
    except (psutil.NoSuchProcess, psutil.AccessDenied):
        children = []
    for child in reversed(children):
        try:
            child.terminate()
        except psutil.NoSuchProcess:
            pass
    try:
        process.terminate()
    except ProcessLookupError:
        pass
    _, alive = psutil.wait_procs(children, timeout=2)
    for child in alive:
        try:
            child.kill()
        except psutil.NoSuchProcess:
            pass
    process.wait(timeout=15)


def completed_processes(running, folder: Path, completed_at: dict, *, now: float,
                        forced: set | None = None) -> list[int]:
    finished = []
    for index, (process, _) in running.items():
        if process.poll() is not None:
            finished.append(index)
            continue
        report = read_report(folder / f'{index}.json')
        if report.get('complete') is True:
            completed_at.setdefault(index, now)
            if now - completed_at[index] >= EXIT_GRACE_SECONDS:
                if forced is not None:
                    forced.add(index)
                print(f'分片 {index + 1} 已写出完成报告，正在回收其未退出的进程。', flush=True)
                stop_process_tree(process)
                finished.append(index)
    return finished
