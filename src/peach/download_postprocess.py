"""云下载落地后的幂等处理：认正片、写番号、隔离广告、采集资料并按模板整理。"""
from __future__ import annotations

import time
import json
from pathlib import Path

from . import junk, ledger_backups, organize, settings_file
from .catalog_rules import same_release_code
from .downloads import (INGESTED, POSTPROCESS_COMPLETE,
                        POSTPROCESS_PENDING, POSTPROCESS_QUEUED, POSTPROCESS_RUNNING,
                        DownloadStore, iso)
from .field_owners import SCAN_FILENAME, write_owned_fields
from .followups import FollowupType, register
from .ingest_notices import NOTICES
from .jobs import JobDeferred
from .library_processing import COLLECT_STAGE, _ffprobe_path, process_library
from .media_probe import probe_unmeasured
from .task_runs import declared_rows
from .task_retry import RetryableTaskError

TASK_KEY = "download-postprocess"
TASK_LABEL = "云下载后处理"


def followup_key(task_id: int) -> str:
    return f"{TASK_KEY}:{int(task_id)}"


def _task_id(key: str) -> int:
    prefix, separator, raw = str(key).partition(":")
    if prefix != TASK_KEY or not separator or not raw.isdigit():
        raise ValueError("云下载后处理任务编号无效")
    return int(raw)


def enqueue(contract, task) -> int | None:
    """由下载对账线程声明一个父任务，再按 ADR-0040 派发持久后继。"""
    fresh = DownloadStore(contract.database).get(task.id)
    if fresh is None or fresh.state != INGESTED or fresh.postprocess_state != POSTPROCESS_PENDING:
        return None
    from .downloads import parse_iso
    if fresh.next_check_at and parse_iso(fresh.next_check_at) > contract.downloads.clock():
        return None
    parent = contract.task_runs.start(
        TASK_KEY, trigger="scheduled", mutex_key=f"download-ingest:{task.id}",
        conflict="skip", label=f"下载已入库：{task.code or task.display_name or task.id}")
    if parent is None:
        return None
    result = contract.task_runs.enqueue_followups(parent.id, [(
        followup_key(task.id), TASK_KEY,
        f"{TASK_LABEL}：{task.code or task.display_name or task.id}")])
    active = contract.task_runs.blocking(followup_key(task.id))
    run_id = result["queued"][0] if result["queued"] else (active.id if active else None)
    contract.task_runs.finish(parent.id, "succeeded", summary={"followups": len(result["queued"])})
    if run_id is not None:
        DownloadStore(contract.database).postprocess(
            task.id, POSTPROCESS_QUEUED, detail="等待识别正片并整理", run_id=run_id)
        contract.followups.wake()
    return run_id


def _bind_main(contract, task) -> tuple[int, str, list[int]]:
    if not task.ledger_path:
        raise ValueError("下载任务没有落地路径")
    store = DownloadStore(contract.database)
    rows = store.assets_under(task.location, task.ledger_path)
    with contract.database.read_connection() as connection:
        bound = connection.execute(
            "SELECT id FROM asset WHERE id=? AND location=? AND medium='video' AND disposal IS NULL",
            (task.asset_id, task.location)).fetchone()
    main = int(bound['id']) if bound else store.asset_under(task.location, task.ledger_path, task.code)
    if main is None:
        raise ValueError("落地目录里没有可识别的视频")
    wrote_code = False
    with contract.database.write_transaction(notify=False) as connection:
        existing = connection.execute("SELECT code FROM asset WHERE id=?", (main,)).fetchone()[0]
        if task.code and existing and not same_release_code(task.code, existing):
            raise ValueError(f"正片已绑定其他番号：{existing}")
        if task.code and not existing:
            write_owned_fields(connection, [main], {"code": task.code},
                               SCAN_FILENAME, require_empty=True)
            wrote_code = True
        connection.execute("UPDATE download_task SET asset_id=? WHERE id=? AND asset_id IS NOT ?",
                           (main, task.id, main))
        path = connection.execute("SELECT path FROM asset WHERE id=?", (main,)).fetchone()[0]
    if wrote_code:
        contract.cache_bust()
    return main, str(path), list(dict.fromkeys([main, *(int(row['id']) for row in rows)]))


def _isolate_ads(contract, main: int, folder_ids: list[int]) -> int:
    """只自动隔离既有垃圾规则达到自动线的附属资产；文件数本身不作为证据。"""
    return junk.isolate(contract.database, asset_ids=folder_ids, protected_ids=[main])['isolated']


def _probe_folder(contract, task, main, folder_ids, *, on_junk=lambda result: None):
    """只为该下载范围补允许自动读取的媒体属性，正片身份在整个阶段都受保护。"""
    config = settings_file.active()
    if not config.configured or Path(contract.db_path).resolve() != (
            config.directory('database') / 'ledger.db').resolve():
        raise ValueError('当前馆藏与媒体配置不一致，不能探测下载媒体')
    return probe_unmeasured(contract.db_path, _ffprobe_path(config), task.location, task.ledger_path,
                            asset_ids=folder_ids, config=config, protected_ids=[main], on_junk=on_junk)


def _collect(contract, main: int, handle) -> dict:
    config = settings_file.active()
    if not config.configured or Path(contract.db_path).resolve() != (
            config.directory("database") / "ledger.db").resolve():
        raise ValueError("当前馆藏与媒体配置不一致，不能采集下载资料")
    state_file = config.directory('state') / 'download-processing' / f'{main}.json'
    try:
        previous = json.loads(state_file.read_text(encoding='utf-8'))
    except FileNotFoundError:
        previous = None
    state = process_library(
        config, contract.db_path, contract.candidate_root, contract.cover_root,
        retry_ids=[main], stage=COLLECT_STAGE, database=contract.database,
        state_file=state_file, resume_state=previous, protected_ids=[main],
        report=lambda state: handle.progress(
            current=int(state.get("checked") or 0), total=int(state.get("total") or 0),
            label=str(state.get("stage") or TASK_LABEL)))
    if state.get("status") == "failed":
        # 问题全是来源限流或拒绝访问时，其余资料已经落库，等的是那一站放开；文件照常整理，
        # 不为一项暂缺的资料把整条下载卡在云下载目录里。
        issues, paused = int(state.get("issue_count") or 0), int(state.get("paused_count") or 0)
        if not issues or paused < issues:
            message = str(state.get("error") or "资料采集失败")
            delay = _collection_retry_delay(state, main)
            if delay is not None:
                raise RetryableTaskError(message, after=delay)
            raise RuntimeError(message)
        state = {**state, "paused_pending": [str(row.get("message") or "") for row in state.get("issue_preview") or ()]}
    return state


def _collection_retry_delay(state: dict, main: int) -> float | None:
    """只重试采集器明确记录的暂时故障；登录、解析和手动跳过不进入自动队列。"""
    path = state.get('issues_log')
    if not path or not state.get('issue_count'):
        return None
    delays = []
    with Path(path).open(encoding='utf-8') as stream:
        for line in stream:
            issue = json.loads(line)
            if issue.get('asset_id') != main or issue.get('severity') == 'info':
                continue
            if not issue.get('retryable') or issue.get('failed_action') == 'skipped':
                return None
            if issue.get('failed_action') == 'network_offline':
                delays.append(0.0)
                continue
            diagnostics = issue.get('diagnostics') or {}
            failures = diagnostics.get('failures') or [diagnostics]
            transient = [row['automatic_retry_delay'] for row in failures
                         if row.get('automatic_retry_delay') is not None]
            if not transient:
                return None
            delays.append(max(transient))
    return max(delays) if delays else None


def _organize(contract, task, main: int) -> dict:
    templates = contract.download_organize_templates().get(task.location, {})
    if not templates:
        return {"moved": 0, "skipped": "未配置整理模板"}
    if organize.unverified_location(task.location):
        return {"moved": 0, "skipped": f"{task.location} 缺少官方核验改名通道"}
    with contract.database.read_connection() as connection:
        plan = organize.build_plan(
            connection, location=task.location, file_template=templates.get("file", ""),
            dir_template=templates.get("dir", ""), asset_ids=[main])
    movable = [row for row in plan["rows"] if row.get("action") in {"rename", "move"}]
    blocked = [row for row in plan['rows'] if row.get('reason') in {
        organize.SKIP_TARGET_EXISTS, organize.SKIP_OFFLINE, organize.SKIP_TOO_LONG}]
    if blocked:
        message = '文件整理未完成：' + '；'.join(str(row['reason']) for row in blocked)
        if all(row['reason'] == organize.SKIP_OFFLINE for row in blocked):
            raise RetryableTaskError(message)
        raise RuntimeError(message)
    if not movable:
        return {"moved": 0, "skipped": next(iter(plan["reasons"]), "无需整理")}
    name = f"ledger.pre-download-{task.id}-{time.strftime('%Y%m%d-%H%M%S')}.db"
    with ledger_backups.organize_backup(Path(contract.db_path), contract.candidate_root,
                                        name) as backup, \
            contract.database.write_transaction() as connection:
        integrity = connection.execute('PRAGMA integrity_check').fetchone()[0]
        if integrity != 'ok':
            raise RuntimeError(f'整理前 ledger 校验失败：integrity={integrity}')
        baseline = {tuple(row) for row in connection.execute('PRAGMA foreign_key_check')}
        result = organize.apply_plan(connection, movable, generated_root=contract.candidate_root)
        integrity = connection.execute('PRAGMA integrity_check').fetchone()[0]
        introduced = {tuple(row) for row in connection.execute('PRAGMA foreign_key_check')} - baseline
        if integrity != 'ok' or introduced:
            raise RuntimeError(f'整理后 ledger 校验失败：integrity={integrity} new_foreign_keys={len(introduced)}')
    if result.get('failed'):
        reasons = '；'.join(str(row['reason']) for row in result.get('failures', ()))
        if all(row.get('retryable') for row in result.get('failures', ())):
            raise RetryableTaskError(f'文件整理未完成：{reasons}',
                                     after=max(row.get('retry_after') or 0 for row in result['failures']))
        raise RuntimeError(f'文件整理未完成：{reasons}')
    return {**result, 'backup': str(backup), 'existing_foreign_keys': len(baseline)}


def run(contract, key: str, handle) -> dict:
    task_id = _task_id(key)
    store = DownloadStore(contract.database)
    task = store.get(task_id)
    if task is None or task.state != INGESTED:
        raise ValueError("云下载任务尚未入库")
    if task.postprocess_state == POSTPROCESS_COMPLETE:
        return {"task_id": task_id, "already_complete": True}
    store.postprocess(task_id, POSTPROCESS_RUNNING, detail="正在识别正片")
    try:
        main, _path, folder_ids = _bind_main(contract, task)
        handle.progress(label="隔离推广附件", throttle=0)
        isolated = _isolate_ads(contract, main, folder_ids)
        handle.progress(label='读取下载媒体属性', throttle=0)
        measured_junk = []
        probed = _probe_folder(contract, task, main, folder_ids, on_junk=measured_junk.append)
        isolated += sum(result['isolated'] for result in measured_junk)
        isolated += _isolate_ads(contract, main, folder_ids)
        handle.progress(label="采集作品资料", throttle=0)
        metadata = _collect(contract, main, handle)
        isolated += int(metadata.get('junk_isolated') or 0)
        isolated += _isolate_ads(contract, main, folder_ids)
        task = store.get(task_id)
        handle.progress(label="按模板整理文件", throttle=0)
        organized = _organize(contract, task, main)
        rows = declared_rows(metadata.get('followups'))
        if rows and getattr(handle, 'run_id', None) is not None:
            contract.task_runs.enqueue_followups(handle.run_id, rows)
    except JobDeferred as error:
        # 给扫描与采集让路：后继回到队列，路让回来后从头续跑，这次不算失败。
        store.postprocess(task_id, POSTPROCESS_QUEUED, detail=str(error))
        raise
    except Exception as error:
        store.fail_postprocess(task_id, error, now=contract.downloads.clock())
        contract.downloads.wake()
        raise
    detail = (f"正片已绑定，资料已采集；整理跳过：{organized['skipped']}"
              if organized.get('skipped') else "正片已绑定，资料已采集并完成整理")
    pending = metadata.get('paused_pending')
    if pending:
        detail += "；部分资料等来源恢复后重新采集：" + "；".join(filter(None, pending))[:300]
    store.postprocess(task_id, POSTPROCESS_COMPLETE, detail=detail, finished=iso(time.time()))
    contract.cache_bust()
    NOTICES.add("download", int(main), task.code or task.display_name)
    return {"task_id": task_id, "asset_id": main, "ads_isolated": isolated, 'probed': probed,
            "metadata_candidates": int(metadata.get("candidates") or 0),
            "moved": int(organized.get("moved") or 0),
            'existing_foreign_keys': int(organized.get('existing_foreign_keys') or 0),
            "organize_skipped": str(organized.get("skipped") or "")}


TYPE = register(FollowupType(task_key=TASK_KEY, label=TASK_LABEL,
                             writes_ledger=True, run=run, jumps_queue=True))
