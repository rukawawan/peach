/* 活动页「云下载」段：提交过的离线下载任务。提交在各页原地的弹层里（`cloud-download-dialog.tsx`）。
 *
 * 任务表是 `/api/downloads` 自己的一份，不并进 `/api/tasks`：离线任务跑在网盘那头，一跑
 * 几小时到几天，是一条带远端编号的提交记录，不是这台电脑上的一轮批处理。所以这一段自己取数、
 * 自己轮询：有任务还在远端跑或等着落盘时五秒一次，全是终态三十秒一次。后台的对账节律由
 * 服务端定（提交后约十秒查一次，之后退避），这里只是把它查到的结果读出来。
 *
 * 一条任务都没有时整段不画。失败的任务给中文原因；失败、取消与停滞的可以重新提交，被判
 * 违规的不给（服务端也会拒）。每张卡都能复制磁力：接口失效时退回手动添加。 */
import { useId, useState, type CSSProperties } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { showToast } from '../toaster';

import { Chip } from '@/components/base/badges/chip';
import { Button } from '@/components/base/buttons/button';

import { apiGet, apiSend, errorMessage } from '../../api';
import { javTitleParts } from '../../core/jav-title';
import { codedText, serverLabel } from '../../core/server-text';
import { entityDisplayName } from '../../core/entity-names';
import { useEntityNames } from '../use-entity-names';
import type { DownloadsSnapshot, DownloadTask } from '../bundle';
import { cardClass } from '../components/card';
import { Note } from '../components/note';
import { Progress } from '../components/progress';
import { DataTableFooter } from '../components/table-controls';
import { CollapseRegion } from '../components/collapse-region';
import { ErrorText } from '../settings/section';
import { busyProps, useAction } from '../settings/use-action';
import { momentText } from './tasks';
import { withBackoff } from '../../polling';
import { SourceLabel } from '../components/source-label';
import { ArtSlot } from '../components/art-slot';
import { avatarInner, coverImage, relayoutCovers } from '@peach/card-art';
import { entityPath } from '@peach/legacy/core';
import { COVER_FRONT_RATIO } from '@peach/appearance';
import { joinList, t } from '../../i18n';

export const DOWNLOADS_URL = '/api/downloads';
export const DOWNLOADS_KEY = ['downloads'] as const;
const CANCEL_URL = '/api/downloads/cancel';
const POSTPROCESS_URL = '/api/downloads/postprocess';

export const downloadPollInterval = (data: DownloadsSnapshot | undefined) =>
  data?.tasks.some((task) => task.cancellable || task.postprocess_active) ? 5_000 : 30_000;
/** 给 `refetchInterval`：常规节律同上，读失败按 4、8、16、30 秒退避。 */
export const downloadsInterval = withBackoff(downloadPollInterval);

const STATE_COLORS: Record<string, 'lime' | 'rose' | 'yellow' | 'blue' | 'neutral'> = {
  ingested: 'lime', failed: 'rose', cancelled: 'neutral', stalled: 'yellow',
  remote_running: 'blue', remote_done: 'lime', landed: 'lime', submitted: 'neutral', submit_pending: 'yellow',
};

const taskName = (task: DownloadTask) => {
  const code = task.display_code || task.code || '';
  const { title } = javTitleParts({
    is_jav: Boolean(code), code, name: task.display_title ?? task.title ?? task.display_name ?? task.remote_name,
  });
  return [code, title].filter(Boolean).join(' · ') || t('manage:downloadsPanel.magnetHash', { hash: task.info_hash?.slice(0, 8) ?? task.id });
};

/** 状态、失败类别与整理状态按 id 取当前界面语言；没有译文的照用服务端的中文名。
 *  整理状态排了自动重试时服务端给 `postprocess_label_code`（第几次），优先用它。 */
const stateLabel = (task: DownloadTask) => serverLabel(`download.state.${task.state}`, task.state_label);
const postprocessLabel = (task: DownloadTask) =>
  serverLabel(task.postprocess_label_code || `download.postprocess.${task.postprocess_state}`, task.postprocess_label,
    task.postprocess_label_params);

export const failureText = (task: DownloadTask) => {
  if (!task.failure_label) return '';
  const label = serverLabel(`download.failure.${task.failure}`, task.failure_label);
  return task.failure_detail ? t('shell:format.labelValue', { label, value: codedText(task, 'failure_detail') }) : label;
};

// 入库后处理说明按 code 取当前语言（旧任务只有中文原文）；中文里的两句内部用语换成用户读得懂的说法。
const postprocessDetail = (task: DownloadTask) => codedText(task, 'postprocess_detail')
  .replace('正片已绑定', '已确认主视频对应的作品') // i18n-exempt: 改写服务端返回的中文说明
  .replace('整理跳过：', '未整理文件：'); // i18n-exempt: 改写服务端返回的中文说明

export function DownloadsPanel() {
  const id = useId();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const query = useQuery({
    queryKey: [...DOWNLOADS_KEY, 'page', page, pageSize],
    queryFn: ({ signal }) => apiGet<DownloadsSnapshot>(`${DOWNLOADS_URL}?limit=${pageSize}&page=${page}`, signal),
    refetchInterval: downloadsInterval,
    placeholderData: (previous) => previous,
  });
  const [lastData, setLastData] = useState(query.data);
  if (query.data && query.data !== lastData) setLastData(query.data);
  const data = query.data || lastData;
  const tasks = data?.tasks || [];
  if (!tasks.length && !query.error) return null;
  return (
    <section id="cloudDownloads" aria-labelledby={id} className="flex min-w-0 flex-col gap-3">
      <h3 id={id} className="text-title-2-medium text-text-primary">{t('manage:downloadsPanel.title')}</h3>
      {query.error ? <Note tone="error">{errorMessage(query.error)}</Note> : null}
      {(data?.channel_alerts || []).map((alert) => (
        // 配置失效与连不上要用户动手，按错误显示；空间与额度等着腾出来，按提醒显示。
        <Note key={alert.provider} tone={alert.failure === 'config' || alert.failure === 'network' ? 'error' : 'warning'}
          title={t('shell:format.labelValue', { label: alert.provider_label,
            value: serverLabel(`download.failure.${alert.failure}`, alert.failure) })}>
          {t('manage:downloadsPanel.channelAlert', {
            detail: serverLabel(alert.message_code, alert.message, alert.message_params) })}
        </Note>
      ))}
      {tasks.length
        ? <ul aria-live="polite" className="flex min-w-0 flex-col gap-3">
            {tasks.map((task) => <TaskCard key={task.id} task={task} writable={data?.available ?? false} />)}
          </ul>
        : null}
      <DataTableFooter label={t('manage:downloadsPanel.title')} total={data?.total ?? tasks.length}
        pagination={{ pageIndex: (data?.page || page) - 1, pageSize }}
        onChange={(next) => {
          if (next.pageIndex + 1 === page && next.pageSize === pageSize) void query.refetch();
          else { setPage(next.pageIndex + 1); setPageSize(next.pageSize) }
        }} />
    </section>
  );
}

function TaskCard({ task, writable }: { task: DownloadTask; writable: boolean }) {
  useEntityNames();
  const client = useQueryClient();
  const action = useAction();
  const [fullTitle, setFullTitle] = useState(false);
  const titleId = useId();
  /* 还在对账的任务没有失败分类：暂时性故障只记下原因、退避后再查，底栏照样把它读出来。 */
  const reason = failureText(task)
    || (task.cancellable && task.failure_detail ? t('manage:downloadsPanel.retryLater', { detail: codedText(task, 'failure_detail') }) : '');
  const artwork = task.artwork;
  const people = artwork?.performer_entities || [];
  const detailHref = task.state === 'ingested' && task.asset_id ? `/assets/${task.asset_id}` : undefined;
  const failed = task.state === 'failed' || task.postprocess_state === 'failed';
  const meta = [task.display_code || task.code ? '' : t('manage:downloadsPanel.codeUnrecognized'), task.target, momentText(task.submitted_at)]
    .filter(Boolean).join(' · ');
  const refresh = () => { void client.invalidateQueries({ queryKey: DOWNLOADS_KEY }) };

  const cancel = () => {
    void action.run('cancel', (signal) => apiSend(CANCEL_URL, { id: task.id }, 'POST', signal), refresh);
  };
  const resubmit = () => {
    const body = { magnet: task.source_uri, provider: task.provider, target: task.target,
      code: task.code, title: task.title, origin: task.origin };
    void action.run('resubmit', (signal) => apiSend(DOWNLOADS_URL, body, 'POST', signal), refresh);
  };
  const copy = () => {
    void navigator.clipboard.writeText(task.source_uri).then(
      () => showToast(`download-copy-${task.id}`, { html: t('manage:downloadsPanel.magnetCopied'), alert: false, timeout: 4000, action: null }),
      () => showToast(`download-copy-${task.id}`, { html: t('manage:downloadsPanel.copyFailed'), alert: true, timeout: 6000, action: null }));
  };
  const retryPostprocess = () => {
    void action.run('postprocess', (signal) => apiSend(
      POSTPROCESS_URL, { id: task.id }, 'POST', signal), refresh);
  };

  return (
    <li data-download-state={task.state} data-download-id={task.id}
      className={cardClass({
        padding: 'none', bordered: failed ? 'error' : undefined, className: 'flex flex-col',
      })}>
      <div className="flex items-stretch gap-3 px-5 pt-5 pb-4">
        <div data-download-cover="" data-media-pic=""
          style={{ '--card-ratio': String(COVER_FRONT_RATIO) } as CSSProperties}
          className="w-20 shrink-0 self-start text-caption-1-regular text-text-secondary sm:w-32">
          {!artwork?.has_cover ? <span data-media-nopic="">{t('manage:shared.noCover')}</span> : null}
          {artwork?.has_cover ? <ArtSlot artwork={{ kind: 'cover', html: coverImage(artwork, 'big') }}
            relayout={(root) => relayoutCovers(root, 'big')} /> : null}
          {detailHref ? <a data-download-cover-link="" href={detailHref} aria-label={t('manage:downloadsPanel.openVideo', { title: taskName(task) })}
            className="absolute inset-0 z-1 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-border-focus-ring" /> : null}
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <div className="flex min-w-0 flex-col items-start gap-1 sm:flex-row sm:items-center sm:gap-2">
          <strong className="min-w-0 w-full flex-1 truncate text-title-1-medium text-text-primary sm:w-auto" title={taskName(task)}>
            {detailHref ? <a data-download-title-link="" href={detailHref}
              className="block truncate rounded-sm outline-none hover:underline focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-border-focus-ring">{taskName(task)}</a> : taskName(task)}
          </strong>
          <div className="flex shrink-0 items-center gap-2">
            <Chip color={STATE_COLORS[task.state] ?? 'neutral'}>{stateLabel(task)}</Chip>
            {task.state === 'ingested'
            ? <Chip color={task.postprocess_state === 'complete' ? 'lime'
              : task.postprocess_state === 'failed' ? 'rose' : task.postprocess_state === 'running' ? 'blue' : 'neutral'}>{postprocessLabel(task)}</Chip>
            : null}
          </div>
        </div>
        <div className="flex min-w-0 items-center gap-2 text-caption-1-regular text-text-secondary"><span className="flex shrink-0"><SourceLabel source={task.provider} label={task.provider_label} /></span><span className="min-w-0 truncate" title={meta}>{meta}</span></div>
        {people.length ? <div className="flex min-w-0 items-center gap-2">
          <div className="flex shrink-0 items-center gap-1">
            {people.slice(0, 3).map((person) => <a key={person.id || person.name} data-media-avatar=""
              href={entityPath('performer', person.name, person.id)} aria-label={t('manage:downloadsPanel.openActress', { name: entityDisplayName('performer', person.name, person.id) })} title={entityDisplayName('performer', person.name, person.id)}
              dangerouslySetInnerHTML={{ __html: avatarInner(person.name, person, null) }} />)}
          </div>
          <span className="min-w-0 truncate text-caption-1-regular text-text-secondary"
            title={joinList(people.map((person) => entityDisplayName('performer', person.name, person.id)))}>{joinList(people.map((person) => entityDisplayName('performer', person.name, person.id)))}{(artwork?.performer_total || 0) > people.length ? t('manage:downloadsPanel.performerTotal', { total: artwork!.performer_total, count: artwork!.performer_total! - people.length }) : ''}</span>
        </div> : null}
        {task.state === 'remote_running' && task.progress != null
          ? <Progress label={t('manage:downloadsPanel.remoteProgress')} value={Math.round(task.progress * 100)} max={100} />
          : null}
        {task.ledger_path
          ? <p className="min-w-0 truncate text-caption-1-regular text-text-secondary" title={task.ledger_path}>{task.ledger_path}</p>
          : null}
        {action.error ? <ErrorText>{action.error}</ErrorText> : null}
        {/* 辅助的（看标题、抄磁力）靠左，改动这条任务的靠右，最右是这张卡此刻的主动作。 */}
        <div data-download-actions="" className="flex flex-wrap items-center gap-2 pt-1 sm:mt-auto">
          <Button variant="ghost" size="small" aria-expanded={fullTitle} aria-controls={titleId}
            onClick={() => setFullTitle(!fullTitle)}>{fullTitle ? t('manage:downloadsPanel.collapseTitle') : t('manage:downloadsPanel.expandTitle')}</Button>
          <Button variant="ghost" size="small" onClick={copy}>{t('manage:downloadsPanel.copyMagnet')}</Button>
          {writable && (task.cancellable || task.resubmittable || task.postprocess_retryable)
            ? <div className="ml-auto flex flex-wrap items-center gap-2">
                {task.cancellable
                  ? <Button variant="secondary" size="small" {...busyProps(action.busy === 'cancel')} onClick={cancel}>{t('manage:downloadsPanel.cancelDownload')}</Button>
                  : null}
                {task.resubmittable
                  ? <Button variant="secondary" size="small" {...busyProps(action.busy === 'resubmit')} onClick={resubmit}>{t('manage:downloadsPanel.resubmit')}</Button>
                  : null}
                {task.postprocess_retryable
                  ? <Button variant="secondary" size="small" {...busyProps(action.busy === 'postprocess')}
                      onClick={retryPostprocess}>{t('manage:downloadsPanel.retryPostprocess')}</Button>
                  : null}
              </div>
            : null}
        </div>
        </div>
      </div>
      <CollapseRegion open={fullTitle} id={titleId}>
        <p data-download-title-full className="wrap-anywhere px-5 pb-4 text-body-2-regular text-text-secondary">{taskName(task)}</p>
      </CollapseRegion>
      {reason || task.postprocess_detail
        ? <div className="flex min-h-14 flex-col justify-center rounded-b-2xl border-t border-separator-border bg-card-footer px-5 py-3">
            <p className="wrap-anywhere text-caption-1-regular text-text-secondary">{reason || postprocessDetail(task)}</p>
          </div>
        : null}
    </li>
  );
}
