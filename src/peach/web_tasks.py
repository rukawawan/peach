"""任务中心的读取端点：活动页要的那一份，一次请求拿全。

页面一屏上要同时回答三件事——谁在跑、刚才跑完的怎么样、有哪一轮被挡掉了。分成三个
端点意味着三次轮询、三份各自可能过期的快照，还得在前端再拼一次时间线。所以
`/api/tasks` 不带筛选时直接把这三段一起下发；带 `status`／`task_key` 时才退回成一张
普通的筛选列表，留给排查用。

「最近完成」按结束时刻从新到旧排，一页数的是顶层那几轮，后继随父任务一起下发；
`finished_has_more` 说它后面还有没有更早的。往前翻
带上当前最旧那一行的 `before_finished_at` 与 `before_id`，只回 `finished` 与
`finished_has_more` 这一页：在跑那段和被挡下那段由轮询那一份负责，翻页时再下发一遍
只会让两份快照互相打架。
"""
from __future__ import annotations

import sqlite3
from datetime import datetime

from .ingest_notices import NOTICES
from .task_runs import ACTIVE_STATUSES, TERMINAL_STATUSES
from .task_results import RESULT_FIELDS, result_counts
from .web_result_versions import result_versions

#: 不带筛选时「最近完成」那一段每页的默认条数。一屏看得完，更早的往前翻。
RECENT_LIMIT = 20

#: 账本还没跑到 0028 时页面上显示这一句。迁移是单独一步，升级后第一次打开活动页
#: 撞上没有这张表是正常路径，不该是一个 500。
NO_TABLE = "数据库缺少任务记录表，请按运行文档检查备份后执行 peach migrate upgrade --yes"


def q_result_updates(contract, _args):
    """每个页面常驻的轻量轮询：结果版本、入库通知与有没有任务在排或在跑，不组装任务列表。

    全局组件只用这三样，却曾每两秒取一次完整的 `/api/tasks`；任务一多，那份组装就把服务进程
    占满，所有页面一起变慢。完整列表只留给任务中心页。
    """
    try:
        busy = any(contract.task_runs.query(status=status, limit=1) for status in ACTIVE_STATUSES)
    except sqlite3.OperationalError:
        busy = False
    return {"ok": True, "result_versions": result_versions(contract),
            "ingest_notices": NOTICES.snapshot(), "busy": busy}


def q_tasks(contract, args):
    try:
        return _tasks(contract, args)
    except sqlite3.OperationalError:
        # 只可能是这张表还不存在——这个函数别的地方不碰库。
        return {"ok": True, "filtered": False, "available": False,
                "message": NO_TABLE, "running": [], "skipped": [], "finished": [],
                "finished_has_more": False,
                "statuses": {"active": list(ACTIVE_STATUSES),
                             "finished": list(TERMINAL_STATUSES)}}


def _tasks(contract, args):
    payload = _payload_reader(contract)
    status = str((args or {}).get("status") or "").strip()
    task_key = str((args or {}).get("task_key") or "").strip()
    limit = _limit(args)
    before = _before(args)
    if before is not None and (status or task_key):
        raise ValueError("before_finished_at／before_id 只用于最近完成那一段，不和 status、task_key 同用")
    if status or task_key:
        rows = contract.task_runs.query(status=status, task_key=task_key, limit=limit)
        return {"ok": True, "filtered": True, "available": True,
                "runs": [payload(row) for row in rows]}
    finished, has_more = contract.task_runs.finished_page(before=before, limit=limit)
    if before is not None:
        return {"ok": True, "filtered": False, "available": True,
                "finished": [payload(row) for row in finished],
                "finished_has_more": has_more,
                "followup_counts": _parent_counts(contract, finished)}
    running = _active(contract, limit)
    # 还在跑的那一轮已经跑完的后继：它们挂在「正在进行」那张卡下面，不在哪一页里。
    finished += contract.task_runs.settled_followups(
        [row.id for row in running if not row.followup])
    # 后继还在排或在跑、自己已经结束的父任务：它可能比「最近完成」这一页还早，不单独下发的话，
    # 它派出的后继在页面上找不到父卡，会一条条散开。它不进 `finished`，翻页游标才不会跳过中间那段。
    shown = {row.id for row in (*running, *finished)}
    working = [row for row in contract.task_runs.active_parents() if row.id not in shown]
    return {
        "ok": True,
        "filtered": False,
        "available": True,
        "result_versions": result_versions(contract),
        # 逐部到来的入库通知，页面常驻的任务轮询拿去弹 toast（`ingest_notices`）。
        "ingest_notices": NOTICES.snapshot(),
        "running": [payload(row) for row in running],
        # 被挡掉的那些也在 `finished` 里（它们是 `cancelled`），这里单独再挑一份：
        # 「为什么没跑」是用户来这一页的主要问题，不该让他在完成列表里自己找。
        "skipped": [payload(row) for row in finished
                    if row.status == "cancelled" and "blocked_by" in row.result_summary],
        "finished": [payload(row) for row in finished],
        "finished_has_more": has_more,
        "working_parents": [payload(row) for row in working],
        "followup_counts": _parent_counts(contract, (*running, *finished, *working)),
        "statuses": {"active": list(ACTIVE_STATUSES), "finished": list(TERMINAL_STATUSES)},
    }


def _active(contract, limit: int) -> list:
    """正在跑的一条不落，排队的取最近几条：一轮派出上千条后继时，按 id 取最近的只剩排队那些，
    真正在跑的那条反而被挤掉。"""
    started = contract.task_runs.query(status="running", limit=500)
    queued = contract.task_runs.query(status="pending", limit=limit)
    return sorted({row.id: row for row in (*started, *queued)}.values(), key=lambda row: row.id, reverse=True)


def _parent_counts(contract, rows) -> dict[str, dict[str, int]]:
    """后继只下发了一部分，父任务做到哪一步、还算不算在进行，按这份计数回答。"""
    counts = contract.task_runs.followup_counts(row.id for row in rows if not row.followup)
    return {str(parent): states for parent, states in counts.items()}


def q_task(contract, run_id):
    payload = _payload_reader(contract)
    run = contract.task_runs.get(int(run_id))
    if run is None:
        # KeyError 在 API 层被翻成 404；ValueError 会变成 400，那是参数错，不是这里的事。
        raise KeyError(f"没有第 {run_id} 轮任务")
    # 父子两头都给：从后继那一行点进来的人要知道它是哪一轮派出来的，从父任务点进来的
    # 要知道派出去的几条跑成什么样（ADR-0040）。父只给一层，链根在 `root_run_id` 上。
    parent = (contract.task_runs.get(run.parent_run_id)
              if run.parent_run_id else None)
    followups = [payload(child) for child in contract.task_runs.children(run.id)]
    return {"ok": True, "run": payload(run),
            "parent": payload(parent) if parent else None,
            "followups": followups,
            "followup_counts": _counts(followups)}


def _payload_reader(contract):
    """同一轮的完成检查点可补充摘要，读取不回写任务记录。"""
    from .job_recovery import read

    saved = {}
    from .task_resources import Monitor
    if not hasattr(contract, 'task_resource_monitor'):
        with contract.cache_lock:
            if not hasattr(contract, 'task_resource_monitor'):
                contract.task_resource_monitor = Monitor(contract.task_runs)
    # 控制状态与资源占用只对自己或后代还在排在跑的那几条有内容；其余的不逐条再问。
    live = contract.task_runs.live_ids()

    def payload(row):
        result = row.payload()
        if row.id not in live:
            return _with_checkpoint(row, result)
        from .task_control import projection
        control = projection(contract.task_runs, row)
        if control is not None:
            result['control'] = control
        resources = contract.task_resource_monitor.for_run(row)
        if resources is not None:
            result['resources'] = resources
        return _with_checkpoint(row, result)

    def _with_checkpoint(row, result):
        if row.task_key not in RESULT_FIELDS or row.status not in ('succeeded', 'failed'):
            return result
        if all(field in row.result_summary for field in RESULT_FIELDS[row.task_key]):
            return result
        if row.task_key not in saved:
            saved[row.task_key] = read(contract.task_runs.database.db_path, row.task_key)
        recovery = saved[row.task_key]
        if recovery.get('run_id') != row.id or recovery.get('status') not in ('complete', 'failed'):
            return result
        checkpoint = recovery.get('checkpoint')
        if not isinstance(checkpoint, dict):
            return result
        counts = result_counts(row.task_key, checkpoint)
        result['result_summary'] = {**counts, **result['result_summary']}
        return result

    return payload


def _counts(rows) -> dict:
    """后继按状态数一遍。折叠着的父任务据此标出有没有失败，不必展开整层。"""
    counts: dict[str, int] = {}
    for row in rows:
        counts[row["status"]] = counts.get(row["status"], 0) + 1
    return counts


def _before(args) -> tuple[str, int] | None:
    """往前翻的游标：两个参数成对出现，缺一个就是参数错，不悄悄退回第一页。"""
    moment = str((args or {}).get("before_finished_at") or "").strip()
    raw_id = str((args or {}).get("before_id") or "").strip()
    if not moment and not raw_id:
        return None
    if not moment or not raw_id:
        raise ValueError("before_finished_at 与 before_id 要一起给")
    # 只核对写法；比较仍用原文，与库里 `stamp()` 写下的文本逐字对齐。
    datetime.fromisoformat(moment.replace("Z", "+00:00"))
    run_id = int(raw_id)
    if run_id < 1:
        raise ValueError("before_id 必须是正整数")
    return moment, run_id


def _limit(args) -> int:
    raw = (args or {}).get("limit")
    if raw in (None, ""):
        return RECENT_LIMIT
    return max(1, min(int(raw), 500))
