import { useState, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button, ButtonLink } from '@/components/base/buttons/button';
import { Input } from '@/components/base/input/input';
import { ApiError, apiGet, apiSend, errorMessage } from '../../api';
import { diagnosticHeaders } from '../../browser-diagnostics';
import { withBackoff } from '../../polling';
import { ActionSpinner } from '../components/action-spinner';
import { Fieldset, FieldsetTitle } from '../components/fieldset';
import { Note } from '../components/note';
import { TaskProgress } from '../components/task-progress';
import { activityKind } from '../../activity-kinds';
import { queryClient } from '../query';
import { busyProps, useAction } from '../settings/use-action';
import { t } from '../../i18n';
import { stageText } from '../../core/server-text';

const URL = '/api/diagnostics/exports';
const KEY = ['diagnostic-export'] as const;
interface ExportState {
  job_id?: string; kind?: 'support' | 'scraping';
  status: 'idle' | 'running' | 'cancelling' | 'complete' | 'cancelled' | 'failed';
  stage?: string; stage_code?: string; done?: number; total?: number; files?: number; rows?: number; bytes?: number;
  download_url?: string; error?: string;
}
/** 导出在跑或在取消时每秒读一次进度，结束就停；读失败按连续失败次数退避。 */
export const exportInterval = withBackoff<ExportState>((data) =>
  (['running', 'cancelling'].includes(data?.status || '') ? 1000 : false));

/** 导出按钮与它的进度、回执。刮削记录在卡片底栏里，进度复用卡片；诊断报告摆在页头，进度自己带框，
 *  `children` 是页头同一排的其他按钮。 */
export function DiagnosticExportAction({ kind, codes = '', children }: {
  kind: 'support' | 'scraping'; codes?: string; children?: ReactNode;
}) {
  const action = useAction();
  const query = useQuery({ queryKey: KEY, queryFn: ({ signal }) => apiGet<ExportState>(URL, signal),
    refetchInterval: exportInterval });
  const state = query.data;
  const starting = action.busy === 'start';
  const cancelling = action.busy === 'cancel';
  const ownState = !starting && state?.kind === kind ? state : undefined;
  const active = state?.status === 'running' || state?.status === 'cancelling';
  const stopping = ownState?.status === 'cancelling';
  const total = stopping ? 0 : ownState?.total;
  const label = kind === 'support' ? t('manage:diagnosticsExport.downloadReport') : t('manage:diagnosticsExport.exportFetchLog');
  const update = (next: ExportState) => { queryClient.setQueryData(KEY, next) };
  const start = () => void action.run('start', async signal => {
    const response = await fetch(URL, { method: 'POST', signal, credentials: 'same-origin',
      headers: { ...await diagnosticHeaders(), 'Content-Type': 'application/json' }, body: JSON.stringify({ kind, codes }) });
    const result = await response.json().catch(() => null);
    if (!response.ok) throw new ApiError(result?.detail || result?.error || t('manage:diagnosticsExport.startFailed'), response.status, result);
    if (!result || !result.job_id) throw new Error(t('manage:diagnosticsExport.statusNotFound'));
    return result as ExportState;
  }, update);
  const exportButton = <Button type="button" variant="secondary" disabled={!state || active}
    leadingIcon={starting ? ActionSpinner : undefined} {...busyProps(starting)} onClick={start}>{label}</Button>;
  return <div className="flex w-full min-w-0 flex-col gap-3">
    <div className="flex flex-wrap justify-end gap-2">
      {kind === 'support' ? exportButton : null}
      {ownState && active ? <Button type="button" variant="secondary" disabled={stopping}
        leadingIcon={cancelling ? ActionSpinner : undefined} {...busyProps(cancelling)}
        onClick={() => void action.run('cancel', signal => apiSend<ExportState>(
          `${URL}/${ownState.job_id}/cancel`, {}, 'POST', signal), update)}>{t('manage:diagnosticsExport.cancelExport')}</Button> : null}
      {ownState?.status === 'complete' && ownState.download_url ? <ButtonLink variant="secondary"
        href={ownState.download_url}>{t('manage:diagnosticsExport.downloadFile')}</ButtonLink> : null}
      {kind === 'scraping' ? exportButton : null}
      {children}
    </div>
    {ownState && active ? <TaskProgress embedded={kind === 'scraping'} kind={activityKind('diagnostic-export', ownState.stage_code)} value={ownState.done || 0} total={total}
      label={total ? t('manage:diagnosticsExport.progress', { stage: stageText(ownState), done: ownState.done || 0, count: total })
        : [stageText(ownState) || t('manage:diagnosticsExport.preparing'),
          !stopping && ownState.rows ? t('manage:diagnosticsExport.candidateCount', { count: ownState.rows }) : '',
          !stopping && ownState.files ? t('manage:diagnosticsExport.fileCount', { count: ownState.files }) : ''].filter(Boolean).join(' · ')} /> : null}
    {ownState?.status === 'complete' ? <p role="status" className="text-right text-body-2-regular text-text-secondary">
      {t('manage:diagnosticsExport.completedSize', { size: ((ownState.bytes || 0) / 1024 / 1024).toFixed(2) })}</p> : null}
    {ownState?.status === 'cancelled' ? <Note tone="neutral">{t('manage:diagnosticsExport.canceled')}</Note> : null}
    {query.isError ? <Note tone="error" title={t('manage:diagnosticsExport.progressNotFound')}
      action={<Button type="button" variant="secondary" {...busyProps(query.isFetching)}
        onClick={() => { void query.refetch() }}>{t('manage:diagnosticsExport.reload')}</Button>}>
      {errorMessage(query.error)}</Note> : null}
    {action.error || ownState?.status === 'failed' ? <Note tone="error">{action.error || ownState?.error}</Note> : null}
  </div>;
}

export function ScrapingExport() {
  const [codes, setCodes] = useState('');
  return <Fieldset layout="stack" labelledBy="scraping-export-title" footer={<DiagnosticExportAction kind="scraping" codes={codes} />}>
    <div className="flex min-w-0 flex-col gap-4" aria-label={t('manage:diagnosticsExport.exportFetchLog')}>
      <FieldsetTitle id="scraping-export-title">{t('manage:diagnosticsExport.fetchLogTitle')}</FieldsetTitle>
      <p className="text-body-2-regular text-text-secondary">{t('manage:diagnosticsExport.fetchLogHint')}</p>
      <Input label={t('manage:diagnosticsExport.codesLabel')} name="scraping-codes" value={codes} onChange={setCodes}
        autoComplete="off" spellCheck="false" maxLength={1300}
        placeholder={t('manage:diagnosticsExport.codesPlaceholder')} hint={t('manage:diagnosticsExport.codesHint')} />
    </div>
  </Fieldset>;
}
