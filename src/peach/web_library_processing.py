"""统一处理任务的启动、只读状态查询与失败项重试。"""
import json
import hashlib
import logging

from . import settings_file
from .library_processing import (ALL_STAGES, COLLECT_STAGE, SCAN_STAGE, STAGES,
                                METADATA_STAGE, PREVIEWS_STAGE, _asset_selection,
                                decorate, issues_path, process_library, snapshot)
from .processing_control import control_for, initial_estimate, valid_mode, mode_ratio

ACTIVE = ('running', 'pausing', 'paused', 'stopping')
LOGGER = logging.getLogger(__name__)

#: 回给页面的状态字段：`frontend/src/react/library-processing/library-processing.ts` 的
#: `LibraryProcessingData`，加上对应任务中心那一行的 `run_id` 与发起方式 `trigger`。状态文件里另有续跑用的 `local_metadata`（带完整媒体路径）、
#: `asset_ids`、`completed_metadata` 等大字段，页面一个都不读；照发的话每页每 10 秒轮询一次
#: 就是两兆多，还把媒体路径交给了浏览器。续跑与重试读的是 `_current()`，不经过这里。
PUBLIC_FIELDS = frozenset({
    'run_id', 'metadata_only', 'status', 'outcome', 'speed_mode', 'eta_seconds_min', 'eta_seconds_max', 'eta_kind',
    'eta_scope', 'eta_initial', 'job_id', 'stage', 'requested_stage', 'steps', 'checked', 'total',
    'scanned', 'scanned_bytes', 'identified', 'candidates', 'auto_applied', 'covers', 'previews',
    'performer_aliases', 'performer_avatars', 'performer_profile_conflicts',
    'performer_profile_failed', 'error', 'issue_count', 'paused_count', 'issue_preview',
    'issues_log', 'issues_truncated', 'retryable_asset_ids', 'notes', 'current_asset_id',
    'current_asset_name', 'current_action', 'current_started_at', 'last_progress_at', 'stalled',
    'waited_seconds', 'completed_at', 'current_source', 'skip_requested', 'archived', 'new_asset_count', 'trigger',
})


def public_state(state):
    """任务状态的页面投影：只留 `PUBLIC_FIELDS`。"""
    return {key: value for key, value in state.items() if key in PUBLIC_FIELDS}


def _current(contract):
    live = contract.library_processing_job.snapshot()
    thread = getattr(contract.library_processing_job, 'thread', None)
    if live and live.get('status') in ('cancelled', 'failed', 'complete') and thread is not None and thread.is_alive():
        return {**live, 'status':'stopping'}
    if live and live.get('status') in ACTIVE:
        return live
    stored = snapshot(settings_file.active())
    from .job_recovery import read
    recovery = read(contract.db_path, 'library-processing')
    if recovery.get('status') == 'active' and recovery.get('job_id') == stored.get('job_id'):
        stored['run_id'] = recovery.get('run_id')
    if live and live.get('job_id') == stored.get('job_id'):
        return {**stored, **live}
    if live and live.get('started_at', 0) > stored.get('started_at', 0):
        # 抢处理锁之前失败时还未写进度文件，不能再用上一轮终态遮住这次错误。
        return live
    return stored


def _active_run(contract, state):
    """进行中这一轮在任务中心的那一行。

    命令行那一轮没有恢复记录，状态里也就没有 `run_id`：按任务键找还在跑的那一行。
    """
    if state.get('run_id') is not None:
        return contract.task_runs.get(state['run_id'])
    if not getattr(contract.task_runs, 'enabled', True):
        return None
    runs = contract.task_runs.query(status='active', task_key='library-processing', limit=1)
    return runs[0] if runs else None


def q_library_processing(contract, _args):
    if _args.get('estimate') == '1':
        config = settings_file.active()
        body = {'stage': _args.get('stage') or ALL_STAGES}
        if 'incremental' in _args:
            body['incremental'] = _args['incremental'] == '1'
        if 'scope' in _args:
            body['scope'] = _args['scope']
        if 'asset_ids' in _args:
            body['asset_ids'] = json.loads(_args['asset_ids'])
        _, asset_ids, stage = _processing_request(contract, config, {}, body)
        from .processing_inventory import preview
        return {'traffic': preview(config, contract.db_path, stage, asset_ids, _args.get('inventory'),
                                   incremental=body.get('incremental', False))}
    state = _current(contract)
    run = _active_run(contract, state) if state.get('status') in ACTIVE else None
    if run is not None:
        # 忙碌回执要说清这一轮是谁发起的：托盘保存设置后起的扫描在网页上看不出来源。
        state['trigger'] = run.trigger
    if run is not None and state.get('run_id') is not None:
        from .task_control import projection
        control_state = projection(contract.task_runs, run)
        if control_state is not None:
            status = control_state['state']
            state['status'] = 'stopping' if status == 'cancelling' else status
    state = decorate(state)
    control = control_for(settings_file.active())
    control.refresh(force=True)
    state['speed_mode'] = control.mode
    state['skip_requested'] = (state.get('status') == 'running' and state.get('current_asset_id') is not None
                               and control.skip_asset_id == state.get('current_asset_id'))
    from .media_processing_policy import metadata_only
    state['metadata_only'] = metadata_only(settings_file.active().directory('state'))
    from .job_recovery import read
    recovery = read(contract.db_path, 'library-processing')
    if control.job_id == state.get('job_id') and control.cancelled and state.get('status') in ACTIVE:
        state.update(status='stopping', eta_seconds_min=None, eta_seconds_max=None)
    if recovery.get('status') == 'cancelled' and recovery.get('job_id') == state.get('job_id'):
        state.update(status='cancelled', outcome='cancelled', error='')
    state['retryable_asset_ids'] = _remaining_retry_ids(contract, state)
    from .library_new_assets import pending
    state['new_asset_count'] = len(pending(contract.db_path))
    if state.get('status') not in ACTIVE and recovery.get('status') == 'blocked':
        state.update(status='failed', outcome='interrupted', error=f"任务未能自动恢复：{recovery.get('error') or '请重新发起任务'}")
    # 上一趟任务的状态文件里没有这个字段，而它那份完整清单还在磁盘上：按 job_id
    # 推出地址补回去，界面才有得可给。
    if state.get('issue_count') and state.get('job_id') and not state.get('issues_log'):
        path = issues_path(settings_file.active(), str(state['job_id']))
        if path.is_file():
            state['issues_log'] = str(path)
    return public_state(state)


def _request_skip(control, previous, body):
    asset_id = body.get('asset_id')
    if (isinstance(asset_id, bool) or not isinstance(asset_id, int)
            or previous.get('status') != 'running'
            or previous.get('current_asset_id') != asset_id
            or previous.get('current_action') not in ('querying_metadata', 'fetching_cover')):
        raise ValueError('当前影片已变化或不在采集外部资料，请刷新后重试')
    control.skip_current(str(body['job_id']), asset_id)


def _archive_notice(contract, config, body, archived):
    """归档与撤销归档只翻这一趟的 `archived`，问题记录和任务历史原样留着。"""
    previous = _current(contract)
    if not body.get('job_id') or body['job_id'] != previous.get('job_id'):
        raise ValueError('任务已变化，请刷新页面后重试')
    if previous.get('status') in ACTIVE:
        raise ValueError('任务结束后才能归档提示')
    from .library_processing import _save, state_path
    saved = json.loads(state_path(config).read_text(encoding='utf-8'))
    if saved.get('job_id') != body['job_id']:
        raise ValueError('任务已变化，请刷新页面后重试')
    _save(state_path(config), {**saved, 'archived':archived})
    return q_library_processing(contract, {})


def _cancel_processing(contract, config, control, previous, job_id):
    control.request('cancel', job_id)
    _announce_control(contract.library_processing_job, job_id, 'stopping')
    live = contract.library_processing_job.snapshot()
    thread = getattr(contract.library_processing_job, 'thread', None)
    if not (live and thread is not None and thread.is_alive()) and not _writer_active(config):
        from .job_recovery import finish
        from .library_processing import _save, state_path
        previous.update(status='cancelled', outcome='cancelled', stage='已停止', error='')
        _save(state_path(config), previous)
        finish(contract.db_path, 'library-processing', job_id, 'cancelled')
        if previous.get('run_id') is not None:
            contract.library_processing_job.runs.finish(previous['run_id'], 'cancelled')
        contract.library_processing_job.update(job_id, **{
            key:value for key,value in previous.items() if key!='job_id'})
    return q_library_processing(contract, {})


def _set_processing_speed(contract, control, previous, body):
    mode = valid_mode(body.get('speed_mode'))
    control.request('set_speed', mode=mode)
    if previous.get('status') in ACTIVE:
        ratio = mode_ratio(mode, previous.get('speed_mode') or 'standard')
        fields = dict(speed_mode=mode, eta_initial=True)
        if previous.get('speed_mode') != mode:
            for key in ('eta_seconds_min', 'eta_seconds_max'):
                if isinstance(previous.get(key), (int, float)):
                    fields[key] = max(0, int(previous[key] * ratio))
        contract.library_processing_job.update(previous['job_id'], **fields)
    return q_library_processing(contract, {})


def _controllable(contract, state) -> bool:
    """进度文件在跑，或任务中心那一轮还挂着（安装更新时暂停、进度文件已不是进行中）。

    后一种不放行的话，那一轮在任务中心一直显示「已暂停」，继续和停止都点不动。
    """
    if state.get('status') in ACTIVE:
        return True
    run = contract.task_runs.get(state['run_id']) if state.get('run_id') is not None else None
    return run is not None and run.active and run.task_key == 'library-processing'


def _control_action(contract, config, body):
    action = body['action']
    if action in ('archive', 'unarchive'):
        return _archive_notice(contract, config, body, action == 'archive')
    if action not in ('pause', 'resume', 'set_speed', 'skip_current', 'cancel'):
        raise ValueError('处理动作无效')
    previous = _current(contract)
    job_id = body.get('job_id')
    if action != 'set_speed' and not job_id:
        raise ValueError('请选择正在处理的任务')
    if job_id and str(job_id) != str(previous.get('job_id') or ''):
        raise ValueError('任务已变化，请刷新页面后重试')
    if action != 'set_speed' and not _controllable(contract, previous):
        raise ValueError('当前没有可暂停或继续的任务')
    control = control_for(config)
    control.refresh(force=True)
    if job_id:
        control.select_job(str(job_id))
    if action == 'cancel':
        if previous.get('run_id') is not None:
            from .task_control import request
            request(contract.task_runs, previous['run_id'], action)
        return _cancel_processing(contract, config, control, previous, str(job_id))
    if previous.get('status') == 'stopping':
        raise ValueError('正在等待任务停止，请稍后重试')
    if action == 'skip_current':
        _request_skip(control, previous, body)
        return q_library_processing(contract, {})
    if action == 'set_speed':
        return _set_processing_speed(contract, control, previous, body)
    if previous.get('run_id') is not None:
        from .task_control import request
        request(contract.task_runs, previous['run_id'], action)
    status = ('paused' if previous.get('status') == 'paused' else 'pausing') if action == 'pause' else 'running'
    _announce_control(contract.library_processing_job, str(job_id), status)
    control.request(action, str(job_id))
    live = contract.library_processing_job.snapshot()
    thread = getattr(contract.library_processing_job, 'thread', None)
    if action == 'resume' and not (live and thread is not None and thread.is_alive()) and not _writer_active(config):
        from .job_recovery import read, current_job_id, current_run
        recovery = read(contract.db_path, 'library-processing')
        identity = current_job_id.set(str(job_id))
        run = current_run.set(recovery.get('run_id'))
        try:
            return w_library_processing(contract, {
                'stage': previous.get('requested_stage') or ALL_STAGES,
                **({'incremental': True} if previous.get('incremental') else
                   {'asset_ids': previous['asset_ids']} if previous.get('asset_ids') else {}),
                'speed_mode': control.mode}, resume=True)
        finally:
            current_job_id.reset(identity)
            current_run.reset(run)
    result = q_library_processing(contract, {})
    if not live and result.get('status') in ACTIVE:
        result['status'] = status
    return result


def _announce_control(job, job_id, status):
    with job.editing(job_id) as state:
        if state is not None and state.get('status') in ACTIVE:
            state['status'] = status


def _writer_active(config):
    from filelock import FileLock, Timeout
    from .library_processing import state_path
    try:
        with FileLock(str(state_path(config)) + '.lock', timeout=0):
            return False
    except Timeout:
        return True


def q_library_processing_issues(contract, args):
    state = _current(contract)
    job_id = str(args.get('job_id') or '')
    if not job_id or job_id != str(state.get('job_id') or ''):
        raise ValueError('任务已变化，请刷新页面后重试')
    path = issues_path(settings_file.active(), job_id)
    if path.is_file():
        raw = path.read_text(encoding='utf-8')
        rows = [json.loads(line) for line in raw.splitlines() if line.strip()]
    else:
        rows = []
        if state.get('issue_count'):
            from .library_processing import state_path
            saved = json.loads(state_path(settings_file.active()).read_text(encoding='utf-8'))
            rows = saved.get('issues', [])
            if not rows:
                raise ValueError('未取得完整问题记录，请导出诊断日志')
        raw = json.dumps(rows, ensure_ascii=False)
    revision = hashlib.sha256(raw.encode()).hexdigest()
    if args.get('revision') and args['revision'] != revision:
        raise ValueError('问题记录已变化，请重新导出')
    offset = max(0, int(args.get('offset') or 0))
    limit = max(1, min(200, int(args.get('limit') or 50)))
    return {'job_id': job_id, 'revision':revision, 'total': len(rows), 'offset': offset,
            'rows': rows[offset:offset + limit]}


def _remaining_retry_ids(contract, previous):
    ids = list(previous.get('retryable_asset_ids') or [])
    if not ids:
        return []
    remaining = set()
    with contract.database.read_connection() as connection:
        for offset in range(0, len(ids), 900):
            batch = ids[offset:offset+900]
            remaining.update(row[0] for row in connection.execute(
                'SELECT id FROM asset WHERE disposal IS NULL AND id IN ('+','.join('?'*len(batch))+')',batch))
    return [value for value in ids if value in remaining]


def _retry_ids(previous, body):
    """请求带 `retry` 时按上一任务的失败集合重试；普通启动仍处理整个馆藏。

    返回 `None` 表示全量任务；返回列表表示只处理这些资产。空列表由调用方
    按「没有可重试项」处理，不允许滑回全库重跑。
    """
    if not body or 'retry' not in body:
        return None
    job_id = str(body.get('job_id') or '')
    if not job_id or job_id != str(previous.get('job_id') or ''):
        raise ValueError('原任务已变化，请刷新页面后重试')
    requested = body.get('retry')
    if not isinstance(requested, list):
        raise ValueError('重试项目格式无效')
    allowed = list(previous.get('retryable_asset_ids') or [])
    if not requested:
        return allowed
    chosen = []
    for value in requested:
        if isinstance(value, bool) or not isinstance(value, int) or value not in allowed:
            raise ValueError('重试项目不属于原任务的失败集合')
        chosen.append(value)
    return chosen


def _expand_new_scope(db_path, body):
    """校验增量发现与待补全集合的互斥关系，并冻结已登记的范围。"""
    if 'incremental' in body:
        if type(body['incremental']) is not bool:
            raise ValueError('新增文件范围必须为开关值')
        if body['incremental'] and any(key in body for key in ('asset_ids', 'retry', 'scope')):
            raise ValueError('新增文件发现不能与其他处理范围同时使用')
    if 'scope' in body:
        if body['scope'] != 'new' or 'asset_ids' in body or 'retry' in body:
            raise ValueError('新入库范围不能与其他处理范围同时使用')
        from .library_new_assets import pending
        ids = pending(db_path)
        if not ids:
            raise ValueError('暂无待处理的新入库影片')
        body['asset_ids'] = ids


def _processing_request(contract, config, previous, body):
    """校验馆藏、阶段与互斥的处理范围。"""
    if not config.configured or not config.locations:
        raise ValueError('请先添加媒体目录')
    if contract.db_path.resolve() != (config.directory('database') / 'ledger.db').resolve():
        raise ValueError('当前馆藏与媒体配置不一致')
    body = dict(body or {})
    _expand_new_scope(contract.db_path, body)
    retry_ids = _retry_ids(previous, body)
    if 'asset_ids' in (body or {}) and body['asset_ids'] is None:
        raise ValueError('请选择有效的视频项目')
    asset_ids = _asset_selection(contract.db_path, (body or {}).get('asset_ids'))
    if asset_ids is not None and retry_ids is not None:
        raise ValueError('选择项目与失败重试不能同时使用')
    stage = str((body or {}).get('stage') or
                (previous.get('requested_stage') if retry_ids is not None else None) or ALL_STAGES)
    if stage not in STAGES:
        raise ValueError('处理阶段无效')
    if body.get('incremental') and stage not in (ALL_STAGES, SCAN_STAGE):
        raise ValueError('新增文件发现只支持扫描或同步')
    from .media_processing_policy import metadata_only
    if stage == PREVIEWS_STAGE and metadata_only(config.directory('state')):
        raise ValueError('视频预览生成已关闭，请先在媒体库设置中开启')
    return retry_ids, asset_ids, stage


def retry_after_network_recovery(contract, sync=None):
    """外网判回联网时，上一趟因断网跳过的外部资料自动补一次，等于替人点「立即重试」。

    只认最近一趟以失败收尾、记过断网跳过（`offline_skipped`）且还有可重试项的；只是别的原因
    失败的不碰。任务还在跑时回 `False`，探测器据此把这次恢复留到下一次判回联网再通知：断网
    那一趟可能正在收尾。只读端（`sync.read_only`）不发起，路由层会拒的写入从探测线程绕进来也不该做。
    由 `NetworkReachability.on_recovered` 在探测线程里调，这里的任何异常都只记日志。
    """
    if sync is not None and sync.read_only:
        return None
    try:
        previous = _current(contract)
        if previous.get('status') in ACTIVE:
            return False
        if (previous.get('status') != 'failed' or not previous.get('offline_skipped')
                or not previous.get('retryable_asset_ids')):
            return None
        return w_library_processing(contract, {'job_id': previous.get('job_id'), 'retry': []})
    except Exception:
        LOGGER.warning('联网恢复后自动重试未完成项失败', exc_info=True)
        return None


def w_library_processing(contract, body, *, resume=False):
    config = settings_file.active()
    if (body or {}).get('action'):
        return _control_action(contract, config, body)
    previous = _current(contract)
    if previous.get('status') in ACTIVE and not resume:
        return public_state(previous)
    if (body or {}).get('retry') is not None:
        previous['retryable_asset_ids'] = _remaining_retry_ids(contract, previous)
    retry_ids, asset_ids, stage = _processing_request(contract, config, previous, body)
    incremental = (body or {}).get('incremental', False)
    if (body or {}).get('scope') == 'new':
        from .library_new_assets import remember
        remember(contract.db_path, asset_ids)
    if retry_ids is not None and not retry_ids:
        return public_state(previous)
    mode = valid_mode(control_for(config).mode if resume else
                      (body or {}).get('speed_mode') or control_for(config).mode)
    control_for(config).request('set_speed', mode=mode)
    def work(job_id):
        try:
            result = process_library(config, contract.db_path, contract.candidate_root, contract.cover_root,
                job_id=job_id, retry_ids=retry_ids, stage=stage, asset_ids=asset_ids, incremental=incremental,
                # 自动落库与页面写的是同一个 `LedgerDatabase`：进程内写锁在实例上，
                # 另建一个就是在同一个进程里开第二条写入路径。
                database=contract.database,
                resume_state=previous if resume else None,
                speed_mode=control_for(config).mode,
                network=getattr(contract, 'network_reachability', None),
                active=lambda:(contract.library_processing_job.snapshot() or {}).get('job_id') == job_id,
                report=lambda state: contract.library_processing_job.update(job_id, **{
                    key: value for key, value in state.items() if key != 'job_id'}))
            contract.library_processing_job.update(job_id, **{key: value for key, value in result.items() if key != 'job_id'})
        finally:
            contract.cache_bust()
    # 起步那行字按这一趟真正要做的事写：点了「只扫描」却看到「读取本地资料」，
    # 人会以为点错了。
    labels = {ALL_STAGES: '准备处理', SCAN_STAGE: '准备扫描文件', COLLECT_STAGE: '准备采集资料',
              METADATA_STAGE: '准备采集资料', PREVIEWS_STAGE: '准备生成预览图'}
    estimate_ids = asset_ids if asset_ids is not None else retry_ids
    if incremental:
        from .library_new_assets import pending
        estimate_ids = pending(contract.db_path)
    return public_state(contract.library_processing_job.start(
        work, restart=True, initial={'stage': labels[stage], 'requested_stage': stage,
                                    **initial_estimate(config, contract.db_path, stage, estimate_ids, mode)},
        recovery={'stage': stage, 'speed_mode': mode, 'incremental': incremental,
                  **({'asset_ids': asset_ids or retry_ids}
                                    if asset_ids is not None or retry_ids is not None else {})}))
