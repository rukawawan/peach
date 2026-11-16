"""任务中心的领域结果：明细留在原处，摘要保留可读的数量。"""
from __future__ import annotations

from . import interface_text


RESULT_FIELDS = {
    'link-check': ('gone_count', 'unclear_count'),
    'resource-scan': ('missing', 'unreadable', 'cache_files'),
    'resource-apply': ('cache_blocked_count',),
    'follow-check': ('source_failed', 'source_warning', 'issues'),
    'feed-check': ('source_failed', 'source_warning', 'issues'),
    'follow-resolve': ('resolve_failed', 'sources_found', 'source_failed'),
    'taste-refresh': ('warning_count', 'profiles_checked'),
    'organize': ('skipped',),
}


def _resource_scan_counts(result: dict) -> dict:
    """资源扫描的文件、目录与缓存数量。"""
    summary = {field: result[field] for field in ('missing', 'purge', 'vanish', 'empty', 'unreadable')
               if isinstance(result.get(field), int)}
    cache = result.get('cache') if isinstance(result.get('cache'), dict) else {}
    summary.update({f'cache_{field}': cache[field] for field in ('files', 'bytes')
                    if isinstance(cache.get(field), int)})
    return summary


def _coded(key: str, code: str) -> dict:
    """一句不带参数的显示文字：`<key>` 是 zh-CN 原句（旧前端读它），`<key>_code` 给界面取译文。"""
    return {key: interface_text.text(f'server:{code}'), f'{key}_code': code}


def _issue_reason(row: dict, field: str) -> dict:
    """一条问题的原因：`error` 是 zh-CN 原句；结果行带 code 的另给 `error_parts`（按段渲染，
    订阅检查顺延的那句接在后面），界面按当前语言拼。"""
    if not row.get(field):
        return {**_coded('error', 'labels.taskResults.noResult'),
                'error_parts': [{'code': 'labels.taskResults.noResult'}]}
    reason = {'error': str(row[field])}
    code = row.get(f'{field}_code')
    if isinstance(code, str) and code:
        parts = [{'code': code, 'params': dict(row.get(f'{field}_params') or {})}]
        note = row.get('deferred_note_code') if field == 'error' else None
        if isinstance(note, str) and note:
            parts += [{'code': 'outcome.semicolon'}, {'code': note, 'params': dict(row.get('deferred_note_params') or {})}]
        reason['error_parts'] = parts
    return reason


def _source_check_counts(state: dict) -> dict:
    """来源检查的成功、新增与补查失败数量。"""
    rows = [row for row in state['results'] if isinstance(row, dict)]
    summary = {
        'source_failed': sum(row.get('ok') is False for row in rows),
        'source_warning': sum(bool(row.get('backfill_error')) for row in rows),
        'issues': [],
    }
    for row in rows:
        source = row.get('source')
        if not isinstance(source, int) or isinstance(source, bool) or source <= 0:
            continue
        for field, kind in (('error', 'check'), ('backfill_error', 'backfill')):
            if (field == 'error' and row.get('ok') is False) or row.get(field):
                summary['issues'].append({
                    'source': source, 'label': str(row.get('label') or row.get('name') or row.get('ref') or source),
                    'provider': str(row.get('provider_label') or row.get('provider') or ''),
                    **_coded('kind', f'labels.taskResults.kind.{kind}'), **_issue_reason(row, field),
                })
    for field in ('added', 'updated', 'discovered', 'without_code'):
        if field not in state and any(field in row for row in rows):
            summary[field] = sum(row.get(field, 0) for row in rows
                                 if isinstance(row.get(field, 0), int))
    return summary


def result_counts(task_key: str, state: dict) -> dict:
    """只折算已知的结果结构；缺失的明细不推断成零。"""
    summary = {}
    if task_key == 'link-check':
        for field in ('gone', 'unclear'):
            if isinstance(state.get(field), list):
                summary[f'{field}_count'] = len(state[field])
    elif task_key == 'resource-scan' and isinstance(state.get('result'), dict):
        summary.update(_resource_scan_counts(state['result']))
    elif task_key == 'resource-apply' and isinstance(state.get('cache_blocked'), list):
        summary['cache_blocked_count'] = len(state['cache_blocked'])
    elif task_key in ('follow-check', 'feed-check') and isinstance(state.get('results'), list):
        summary.update(_source_check_counts(state))
    elif task_key == 'follow-resolve' and isinstance(state.get('results'), list):
        rows = [row for row in state['results'] if isinstance(row, dict)]
        summary['resolve_failed'] = sum(row.get('kind') == 'error' for row in rows)
        summary['source_failed'] = sum(len(row.get('failures') or []) for row in rows)
        summary['sources_found'] = sum(len(row.get('candidates') or []) for row in rows)
    elif task_key == 'taste-refresh':
        if isinstance(state.get('warnings'), list):
            summary['warning_count'] = len(state['warnings'])
        if isinstance(state.get('refresh'), list):
            summary['profiles_checked'] = len(state['refresh'])
    elif task_key == 'organize' and isinstance(state.get('counts'), dict):
        counts = state['counts']
        if isinstance(counts.get('skip'), int):
            summary['skipped'] = counts['skip']
    return summary
