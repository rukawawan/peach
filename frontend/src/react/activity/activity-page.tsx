/* 活动页：任务中心那张表的唯一界面。
 *
 * 这一屏要回答三个问题，顺序就是它们的紧迫程度：现在有什么在跑、有哪一轮被挡下了、
 * 刚跑完的那些怎么样。三段共用 `/api/tasks` 一次请求的结果。最前面的「需要处理」是后台服务
 * 此刻的问题，末尾的「云下载」段是网盘离线任务，两者各自取数与轮询（`background-issues.tsx`、
 * `downloads-panel.tsx`），和这三段互不牵连。
 *
 * 轮询交给 Query 的 `refetchInterval`：间隔按上一次拿到的内容算，有东西在跑两秒一次，
 * 全是终态十秒一次。它是后台刷新，不写 `aria-busy`——页面上的内容一直是完整的，写了
 * 等于告诉辅助技术和冒烟用例「这一屏还没好」。取数失败只在页内报一条，上一份数据留着：
 * 服务重启的那几秒里，把整页换成一句错误比留着十秒前的进度更难用。
 *
 * 各段使用统一分页，最近完成按服务端页码读取，轮询刷新当前页。 */
import { Children, useId, useState } from 'react';
import type { ReactNode } from 'react';
import { RiArrowRightLine, RiHistoryLine } from '@remixicon/react';
import { useQuery } from '@tanstack/react-query';

import { Chip } from '@/components/base/badges/chip';
import { LinkButton } from '@/components/base/buttons/link-button';

import { apiGet, errorMessage } from '../../api';
import { cardClass } from '../components/card';
import { CodeBlock } from '../components/code-block';
import { EmptyState } from '../components/empty-state';
import { IssueRow } from '../components/issue-row';
import { NameLink } from '../components/name-link';
import { Note } from '../components/note';
import { Page } from '../components/page';
import { TaskProgress } from '../components/task-progress';
import { activityKind } from '../../activity-kinds';
import { DataTableFooter } from '../components/table-controls';
import { Disclosure } from '../settings/section';
import { BackgroundIssues } from './background-issues';
import { DownloadsPanel } from './downloads-panel';
import { ErrorDetails, ErrorExcerpt } from './error-excerpt';
import { TaskControlFeedback, TaskControls } from './task-controls';
import { TaskIcon } from './task-icon';
import { TaskResources } from './task-resources';
import {
  elapsedText, fetchTasks, foldByKind, foldRoutine, followupDetail, followupTally, groupFollowups, isActive,
  hasResultProblems, isRoutine, latestOfKind, momentText, pollInterval, problemDestination, progressText, RUNNING_POLL_MS,
  progressLabel, readableErrorHeadline, runError, statusLabel, summaryItems, taskIssues, taskName, taskSubject, TASKS_KEY, TRIGGER_LABELS, type FollowupCounts, type TaskControlState, type TaskRunPayload,
} from './tasks';
import { withBackoff } from '../../polling';
import { t } from '../../i18n';

/** 整页那一份：有东西在跑两秒、全是终态十秒，读失败按 4、8、16、30 秒退避。 */
const tasksInterval = withBackoff(pollInterval);
/** 展开的后继明细：有在跑的才问，失败同样退避。 */
const followupsInterval = (active: boolean | undefined) => withBackoff(() => (active ? RUNNING_POLL_MS : false));

/** 自己只负责派发后继的任务：一轮只是「安排了几项」，要看的是那几项的结果。 */
const DISPATCHERS = new Set(['upgrade-repairs']);
/** 开跑时写进摘要、指明这一轮处理哪部作品的两项（`taskSubject`）。 */
const SUBJECT_KEYS = new Set(['asset_id', 'name']);

/* 完成绿、失败与已取消红、进行中蓝、意外中断黄，排队为中性。 */
const BADGE_COLORS: Record<string, 'lime' | 'rose' | 'yellow' | 'blue' | 'neutral'> = {
  succeeded: 'lime', failed: 'rose', cancelled: 'rose', interrupted: 'yellow', running: 'blue', pending: 'neutral',
};

const CONTROL_LABELS: Record<TaskControlState, string> = {
  running: t('manage:taskStatus.running'), pausing: t('manage:taskStatus.pausing'), paused: t('manage:taskStatus.paused'), cancelling: t('manage:taskStatus.canceling'),
};

function StatusBadge({ run }: { run: TaskRunPayload }) {
  const control = run.control?.state;
  if (control && (control !== 'running' || !isActive(run))) {
    return <Chip color={control === 'running' ? 'blue' : 'neutral'}>
      <span data-copy-key={`tasks.control.state.${control}`}>{CONTROL_LABELS[control]}</span>
    </Chip>;
  }
  const partial = run.status === 'failed' && run.task_key === 'library-processing'
    && run.result_summary?.outcome === 'partial';
  const problems = partial || run.status === 'succeeded' && hasResultProblems(run);
  return <Chip color={problems ? 'yellow' : BADGE_COLORS[run.status] ?? 'neutral'}>
    {partial ? t('manage:taskStatus.partial') : problems ? t('manage:taskStatus.issuesFound') : statusLabel(run.status)}
  </Chip>;
}

/** 一轮任务派出的后继（ADR-0040）。挂在父任务卡里，一条一行。
 *
 * 后继是独立的一轮，有自己的状态和结果，但单独摆出来就读不出「它是谁派的」——
 * 而那恰恰是这一屏上唯一需要解释的东西：用户没点过补头像，它却在跑。
 * 条间线写在每个 li 自己身上，第一条那根同时充当与卡片正文的分隔。 */
function FollowupList({ rows }: { rows: TaskRunPayload[] }) {
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 20 });
  const { pageSize } = pagination;
  const current = Math.min(pagination.pageIndex, Math.max(0, Math.ceil(rows.length / pageSize) - 1));
  return (<>
    <ul className="-mr-5 flex min-w-0 flex-col">
      {rows.slice(current * pageSize, (current + 1) * pageSize).map((row) => {
        const detail = followupDetail(row);
        return (
          <li key={row.id} data-status={row.status} data-followup-key={row.followup_key}
            className="flex min-w-0 flex-col gap-1 border-t border-separator-border py-2.5 pr-10 pl-5">
            <div className="flex min-w-0 flex-wrap items-start justify-between gap-3">
              <div className="flex min-w-0 flex-1 basis-40 flex-wrap items-center gap-x-2 gap-y-1">
                <TaskIcon taskKey={row.task_key} className="size-4 shrink-0 text-text-secondary" />
                <span className="min-w-0 break-words text-caption-1-regular text-text-primary">
                  {taskName(row)}
                </span>
                <StatusBadge run={row} />
                {detail
                  ? <span className="min-w-0 break-words text-caption-1-regular text-text-secondary">{detail}</span>
                  : null}
              </div>
              <TaskControls run={row} />
            </div>
            <TaskResources run={row} />
            {/* 排队中的那些还没有结果：空的「技术详情」展开只有一对花括号。 */}
            {Object.keys(row.result_summary || {}).length
              ? <div className="w-full min-w-0">
                  <Disclosure summary={t('manage:taskCenter.technicalDetails')} contentClassName="pb-2.5">
                    <CodeBlock code={JSON.stringify(row.result_summary, null, 2)} language="json"
                      label={t('manage:taskCenter.taskTechnicalDetails', { task: taskName(row) })} />
                  </Disclosure>
                </div>
              : null}
          </li>
        );
      })}
    </ul>
    <DataTableFooter label={t('manage:taskCenter.taskDetails')} total={rows.length} pagination={{ ...pagination, pageIndex: current }}
      onChange={setPagination} />
  </>);
}

/** 一轮任务一张卡。失败时整张卡的框线换成 danger 色，不给结束原因那行字上色——
 *  一屏十几行里逐行读红字，比看一眼哪张卡的框是红的慢得多。 */
function RunCard(
  { run, meta, children, error, issues, followups, followupTotal = 0, badge, resourceActive, controlled }:
  { run: TaskRunPayload; meta: string; children?: ReactNode; error?: string; issues?: ReactNode;
    followups?: TaskRunPayload[]; followupTotal?: number; badge?: ReactNode; resourceActive?: boolean;
    controlled?: TaskRunPayload[] },
) {
  const [detailOpen, setDetailOpen] = useState(Boolean(followups?.some(isActive)));
  const parentIds = (controlled || [run]).map((parent) => parent.id);
  const needsDetails = followupTotal > (followups?.length || 0);
  const detail = useQuery({
    queryKey: [...TASKS_KEY, 'followups', parentIds],
    enabled: detailOpen && needsDetails,
    queryFn: async ({ signal }) => {
      const snapshots = await Promise.all(parentIds.map((id) =>
        apiGet<{ followups: TaskRunPayload[] }>(`/api/tasks/${id}`, signal)));
      return snapshots.flatMap((snapshot) => snapshot.followups);
    },
    refetchInterval: followupsInterval(resourceActive),
  });
  const rank = (row: TaskRunPayload) => (row.status === 'running' ? 3 : row.status === 'pending' ? 2
    : row.status === 'failed' || row.status === 'interrupted' ? 1 : 0);
  const listed = [...((needsDetails ? detail.data : undefined) || followups || [])].sort((a, b) =>
    rank(b) - rank(a) || b.id - a.id);
  const shown = listed.length;
  const total = Math.max(followups?.length || 0, followupTotal);
  const subject = taskSubject(run);
  const errorFull = String(error || '').trim();
  const errorHead = readableErrorHeadline(errorFull);
  return (
    // `id` 让「需要处理」那一行的「查看失败记录」能直接滚到这张卡。
    <li id={`run-${run.id}`} data-status={run.status} data-task-key={run.task_key} data-run-id={run.id}
      className={cardClass({
        padding: 'none', bordered: run.status === 'failed' ? 'error' : undefined, className: 'flex flex-col',
      })}>
      {/* 卡片标题比分段标题（「正在进行」）低一档，标题、时间与摘要之间同一个行距。 */}
      <div className="flex flex-col gap-2 px-5 py-4">
        <div className="flex min-w-0 flex-wrap items-start justify-between gap-3">
          <div className="flex min-w-0 flex-1 basis-48 flex-wrap items-center gap-2">
            <TaskIcon taskKey={run.task_key} className="size-5 shrink-0 text-text-secondary" />
            <strong className="min-w-0 break-words text-title-3-medium text-text-primary">{taskName(run)}</strong>
            {badge ?? <StatusBadge run={run} />}
          </div>
          <TaskControls run={run} runs={controlled} />
        </div>
        <p className="text-caption-1-regular text-text-secondary">{meta}</p>
        <TaskResources run={run} active={resourceActive} />
        {/* 文件名常有上百字：单行末尾省略，番号在开头，完整名称在悬停提示里。不用 data-middle-truncate：
            它按 Canvas 量宽，不计中西文自动间距，中日文夹英文的名字会被裁掉末尾几个像素。 */}
        {subject ? <NameLink href={subject.href} data-task-subject={run.id} title={subject.label}
          className="min-w-0 max-w-full self-start truncate text-text-primary">
          {subject.label}
        </NameLink> : null}
        {/* 结束原因是这一轮的结论，和摘要一样写在正文里；全文是明细，收进下面的「错误详情」。 */}
        {errorHead ? <p data-task-error="" className="text-caption-1-regular text-text-secondary wrap-anywhere">{errorHead}</p> : null}
        {children}
      </div>
      {/* 问题详情、错误详情、任务明细、技术详情都是可展开的明细，同样排成卡片底部带分隔线的一行，按这个顺序。 */}
      {issues ? <div className="border-t border-separator-border">{issues}</div> : null}
      {errorHead && errorFull !== errorHead ? <div className="border-t border-separator-border">
        <Disclosure row summary={t('manage:taskCenter.errorDetails')} contentClassName="pb-5">
          <ErrorDetails label={t('manage:taskCenter.taskErrorDetails', { task: taskName(run) })}>{errorFull}</ErrorDetails>
        </Disclosure>
      </div> : null}
      {total ? <div className="border-t border-separator-border">
        <Disclosure row summary={t('manage:taskCenter.taskDetailsCount', { count: total })}
          contentClassName="pb-5"
          isOpen={detailOpen} onOpenChange={setDetailOpen}>
          {detail.error ? <Note tone="error">{errorMessage(detail.error)}</Note> : null}
          {shown < total
            ? <p className="text-caption-1-regular text-text-secondary">{t('manage:taskCenter.showingCount', { count: shown })}</p>
            : null}
          <FollowupList rows={listed} />
        </Disclosure>
      </div> : null}
      {/* 摘要里只有开跑时写下的作品时，它已经链接在卡片上，不再单列一块技术详情。 */}
      {Object.keys(run.result_summary || {}).some((key) => !(subject && SUBJECT_KEYS.has(key)))
        ? <div className="border-t border-separator-border">
        <Disclosure row summary={t('manage:taskCenter.technicalDetails')} contentClassName="pb-5">
          <CodeBlock code={JSON.stringify(run.result_summary, null, 2)} language="json"
            label={t('manage:taskCenter.taskTechnicalDetails', { task: taskName(run) })} />
        </Disclosure>
      </div> : null}
    </li>
  );
}

function RunningRun({ run, followups, followupTotal }:
  { run: TaskRunPayload; followups?: TaskRunPayload[]; followupTotal?: number }) {
  const total = run.progress_total || 0;
  const current = run.progress_current || 0;
  const control = run.control?.state;
  const stopping = control && control !== 'running';
  const label = stopping ? CONTROL_LABELS[control] : progressLabel(run) || t('manage:taskCenter.inProgress');
  const elapsed = elapsedText(run.elapsed_seconds);
  const meta = [TRIGGER_LABELS[run.trigger] || run.trigger, elapsed && t('manage:taskCenter.runningFor', { elapsed })]
    .filter(Boolean).join(' · ');
  return (
    <RunCard run={run} meta={meta} followups={followups} followupTotal={followupTotal}>
      {/* 暂停、取消这些控制态不是在推进：有总量照画停住的横条，没有总量只写状态，不画动画。 */}
      {stopping && !(total > 0) ? <p data-copy-key={`tasks.control.state.${control}`}
            className="text-caption-1-regular text-text-secondary">{label}</p>
        : <TaskProgress embedded kind={activityKind(run.task_key, String(run.progress_params?.stage || '') || null)}
            label={total > 0 ? `${label} · ${t('manage:taskCenter.progressItems', { progress: progressText(current, total) })}` : label}
            value={Math.min(current, total)} total={total} />}
    </RunCard>
  );
}

/** 跑完的一轮。`runs` 多于一条时是折叠起来的几轮例行任务：时间写成从最早到最新那一段，
 *  摘要取最新那一轮——例行轮次的摘要本来就一样，逐条列出来只是同一行抄 N 遍。
 *  任务卡只记这一轮的历史：此刻还没解决的问题和「立即重试」在页顶「需要处理」那一块。
 *  `latest` 说它是不是同一种任务最新的那一轮：有些任务只有那一轮还有处理入口。 */
function SettledRun(
  { run, followups, runs, latest, followupTotal, followupFailed = 0, followupCancelled = 0 }:
  { run: TaskRunPayload; followups?: TaskRunPayload[]; runs?: TaskRunPayload[]; latest: boolean;
    followupTotal?: number; followupFailed?: number; followupCancelled?: number },
) {
  /* 几批派发并成一张时，最新那一批的「已安排 64 项」说不清整件事：改说一共处理了几项、失败几项，
     有失败时徽章写发现问题，失败的那几条在任务明细里排在前面。 */
  const batches = Boolean(runs && runs.length > 1 && followupTotal);
  const summary = batches
    ? [t('manage:taskCenter.processedTotal', { count: followupTotal! }), followupFailed ? t('manage:taskCenter.failedCount', { count: followupFailed }) : '']
        .filter(Boolean)
    // 作品链接已写出文件名，摘要不再列「名称」。
    : summaryItems(taskSubject(run) ? { ...run.result_summary, name: '' } : run.result_summary)
        // 结束原因由卡片单独写一行，摘要里同一句不再重复。
        .filter((line) => line !== runError(run) && line !== readableErrorHeadline(runError(run)));
  const issues = taskIssues(run);
  const destination = problemDestination(run, latest);
  const elapsed = elapsedText(run.elapsed_seconds);
  const oldest = runs && runs.length > 1 ? runs[runs.length - 1] : undefined;
  const meta = (oldest
    ? [TRIGGER_LABELS[run.trigger] || run.trigger, t('manage:taskCenter.lastRuns', { count: runs!.length }),
       `${momentText(oldest.finished_at)} – ${momentText(run.finished_at)}`]
    : [TRIGGER_LABELS[run.trigger] || run.trigger, momentText(run.finished_at),
       elapsed && t('manage:taskCenter.took', { elapsed })]).filter(Boolean).join(' · ');
  return (
    <RunCard run={run} meta={meta} error={runError(run)} followups={followups} followupTotal={followupTotal} controlled={runs}
      issues={issues.length ? <Disclosure row summary={t('manage:taskCenter.issueDetailsCount', { count: issues.length })} contentClassName="pb-5">
        <ErrorDetails label={t('manage:taskCenter.issueDetails')}>
        {/* 与数据管理的问题清单同一种分层：名字一层，来源与问题类别跟在名字后面用次级色，原因再低一档。 */}
        <ul className="flex min-w-0 flex-col whitespace-normal" data-task-issues="">
          {issues.map((issue, index) => <IssueRow key={`${issue.source}-${index}`} title={<>
              {issue.label}
              {issue.provider || issue.kind
                ? <span className="text-body-2-regular text-text-secondary"> · {[issue.provider, issue.kind].filter(Boolean).join(' · ')}</span>
                : null}
            </>}>
            <ErrorExcerpt text={issue.error} className="text-caption-1-regular text-text-secondary" />
          </IssueRow>)}
        </ul>
        </ErrorDetails>
      </Disclosure> : undefined}
      badge={followupCancelled && run.status === 'succeeded'
        ? <Chip color="rose"><span data-copy-key={`tasks.followups.cancelled.${followupCancelled === followupTotal ? 'all' : 'partial'}`}>
            {followupCancelled === followupTotal ? t('manage:taskCenter.followupsCanceled') : t('manage:taskCenter.someFollowupsCanceled')}
          </span></Chip>
        : batches && followupFailed ? <Chip color="yellow">{t('manage:taskStatus.issuesFound')}</Chip> : undefined}>
      {followupCancelled ? <p className="text-caption-1-regular text-text-secondary">
        {t('manage:taskCenter.followupsCanceledCount', { count: followupCancelled })}
      </p> : null}
      {/* 只有一句摘要时不加项目符号：单独一个圆点读起来像漏了下文。 */}
      {summary.length === 1
        ? <p className="text-caption-1-regular text-text-secondary wrap-anywhere">{summary[0]}</p>
        : summary.length ? <ul className="flex list-disc flex-col gap-1 pl-5 text-caption-1-regular text-text-secondary wrap-anywhere">
            {summary.map((line, index) => <li key={index}>{line}</li>)}
          </ul> : null}
      {!issues.length && hasResultProblems(run) && ['follow-check', 'feed-check'].includes(run.task_key)
        ? <p className="text-body-2-regular text-text-secondary">{t('manage:taskCenter.noIssueDetails')}</p> : null}
      {destination
        ? <LinkButton href={destination.href} size="small" trailingIcon={RiArrowRightLine}
            className="self-start">
            {destination.label}
          </LinkButton> : null}
    </RunCard>
  );
}

/** 自己已经跑完、派出的后继还没做完的几轮，同一种任务合成一张卡。
 *
 * 父任务那一轮只是「安排」，几秒就结束；用户关心的是安排下去的那批做到哪了。所以徽章写进行中，
 * 进度条按全部后继的计数走，而不是按页面上列出的那几行。 */
function WorkingRun(
  { runs, followups, counts }:
  { runs: TaskRunPayload[]; followups: TaskRunPayload[]; counts: FollowupCounts | undefined },
) {
  const run = runs[0]!;
  const oldest = runs[runs.length - 1]!;
  const tally = followupTally(counts, runs);
  const total = Math.max(tally.total, followups.length);
  const settled = tally.total ? tally.settled : followups.filter((row) => !isActive(row)).length;
  const failed = tally.total ? tally.failed
    : followups.filter((row) => row.status === 'failed' || row.status === 'interrupted').length;
  const meta = [TRIGGER_LABELS[run.trigger] || run.trigger,
    runs.length > 1 ? t('manage:taskCenter.batches', { count: runs.length }) : '',
    t('manage:taskCenter.startedAt', { time: momentText(oldest.started_at || oldest.finished_at) })].filter(Boolean).join(' · ');
  return (
    <RunCard run={run} meta={meta} followups={followups} followupTotal={total} resourceActive controlled={runs}
      badge={run.control ? <StatusBadge run={run} /> : <Chip color="blue">{t('manage:taskStatus.running')}</Chip>}>
      <TaskProgress embedded kind={activityKind(run.task_key)} value={settled} total={total}
        label={`${t('manage:taskCenter.processedProgress', { progress: progressText(settled, total) })}${failed ? t('manage:taskCenter.failedSuffix', { count: failed }) : ''}`} />
    </RunCard>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  const id = useId();
  return (
    <section aria-labelledby={id} className="flex min-w-0 flex-col gap-3">
      <h3 id={id} className="text-title-2-medium text-text-primary">{title}</h3>
      {children}
    </section>
  );
}

function RunList({ live = false, paginate = true, children }: { live?: boolean; paginate?: boolean; children: ReactNode }) {
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 20 });
  const rows = Children.toArray(children);
  const { pageSize } = pagination;
  const current = Math.min(pagination.pageIndex, Math.max(0, Math.ceil(rows.length / pageSize) - 1));
  return <>
    <ul aria-live={live ? 'polite' : undefined} className="flex min-w-0 flex-col gap-3">
      {paginate ? rows.slice(current * pageSize, (current + 1) * pageSize) : rows}
    </ul>
    {paginate ? <DataTableFooter label={t('manage:taskCenter.taskList')} total={rows.length}
      pagination={{ ...pagination, pageIndex: current }} onChange={setPagination} /> : null}
  </>;
}

export function ActivityPage() {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const tasks = useQuery({
    queryKey: page === 1 && pageSize === 20 ? TASKS_KEY : [...TASKS_KEY, 'page', page, pageSize],
    queryFn: ({ signal }) => fetchTasks(signal, page, pageSize),
    refetchInterval: tasksInterval,
    placeholderData: (previous) => previous,
  });
  const [lastData, setLastData] = useState(tasks.data);
  if (tasks.data && tasks.data !== lastData) setLastData(tasks.data);
  const data = tasks.data || lastData;
  const problem = tasks.error ? errorMessage(tasks.error) : '';
  // 首屏就没拿到数据：只剩这一条，不画空的三段。
  if (!data) return <Page><Note tone="error">{problem || t('manage:taskCenter.loadFailed')}</Note></Page>;

  const allFinished = data.finished || [];
  const parents = data.working_parents || [];
  const allRuns = [...(data.running || []), ...(data.skipped || []), ...allFinished, ...parents];
  // 后继挂到派出它的那张卡下面。父任务不在这一屏上（已经被 prune 掉）时照常单独摆出来
  // ——挂不上去就不显示，等于让一条在跑的任务凭空消失。
  const byParent = groupFollowups(allRuns);
  const visible = new Set(allRuns.map((run) => run.id));
  const topLevel = (rows: TaskRunPayload[]) => rows.filter(
    (run) => !(run.followup_key && run.parent_run_id != null && visible.has(run.parent_run_id)));
  const settled = topLevel(allFinished);
  const counts: FollowupCounts = data.followup_counts || {};
  const childrenOf = (runs: TaskRunPayload[]) => runs.flatMap((run) => byParent.get(run.id) || []);
  // 自己跑完、派出的后继还在跑的那一轮算「正在进行」：整件事还没完，放进「最近完成」
  // 就是一张卡上一个已完成、一个进行中。页面上只列得到一部分后继，所以先看计数。
  const working = [...settled, ...topLevel(parents)].filter((run) => followupTally(counts, [run]).active > 0
    || byParent.get(run.id)?.some(isActive)).sort((a, b) => b.id - a.id);
  const running = topLevel(data.running || []);
  const skipped = topLevel(data.skipped || []);
  // 同一轮不在「最近完成」里再出现一次：一屏两行说的是同一件事，读起来像跑了两轮。
  const finished = settled.filter((run) => !working.includes(run)
    && !skipped.some((row) => row.id === run.id));
  // 每小时一轮的定时检查什么也没发生时一条条摆出来，一页就被同一句「已检查 83」占满。
  // 派了后继的那一轮，后继全部顺利做完才算例行，有一条失败就单独摆出来。只负责派发的那种
  // （自动修复每分钟一批）例外：同一件事的几批照样并成一张，失败数写在卡上。
  const quietChildren = (run: TaskRunPayload) => {
    const children = byParent.get(run.id) || [];
    return children.every((row) => row.status === 'succeeded' && !hasResultProblems(row))
      && followupTally(counts, [run]).failed === 0;
  };
  const folds = foldRoutine(finished, (run) => isRoutine(run)
    && (quietChildren(run) || DISPATCHERS.has(run.task_key)));
  // 控制状态相同的几批合成一张，卡上的暂停、继续、取消对其中每一批都发一次；
  // 状态不同的（一批已暂停、一批在跑）分开摆，按钮才说得清作用在哪批上。
  const workingGroups = foldByKind(working, (run) => run.control?.state || '')
    .sort((left, right) => right.run.id - left.run.id);
  const newest = latestOfKind(allRuns);
  const quiet = !running.length && !working.length && !skipped.length && !finished.length;
  return (
    <Page>
      {problem ? <Note tone="error">{problem}</Note> : null}
      <TaskControlFeedback />
      {data.available === false
        ? <Note tone="warning">{data.message || t('manage:taskCenter.tableNotReady')}</Note>
        : null}
      {/* 后台服务此刻的问题排在最前：它们不会自己跑完，要人去处理。 */}
      <BackgroundIssues />
      {quiet
        ? <EmptyState icon={RiHistoryLine} title={t('manage:taskCenter.emptyTitle')}>
            {t('manage:taskCenter.emptyText')}
          </EmptyState>
        : <>
            <Section title={t('manage:taskCenter.inProgress')}>
              {running.length || working.length
                ? <RunList live>
                    {running.map((run) => (
                      <RunningRun key={run.id} run={run} followups={byParent.get(run.id)}
                        followupTotal={followupTally(counts, [run]).total} />))}
                    {workingGroups.map(({ run, runs }) => (
                      <WorkingRun key={run.id} runs={runs} followups={childrenOf(runs)} counts={counts} />))}
                  </RunList>
                : <Note tone="neutral">{t('manage:taskCenter.noneRunning')}</Note>}
            </Section>
            {/* 「刚才那一轮为什么没跑」只有这一段答得出：定时触发撞上在跑的那一轮会
                安静跳过，不留记录的话它在界面上和从没触发过一模一样。 */}
            {skipped.length
              ? <Section title={t('manage:taskCenter.skipped')}>
                  <RunList>{skipped.map((run) => (
                    <SettledRun key={run.id} run={run} latest={newest.has(run.id)} followups={byParent.get(run.id)} />))}</RunList>
                </Section>
              : null}
            {finished.length || Boolean(data.finished_total)
              ? <Section title={t('manage:taskCenter.recentlyCompleted')}>
                  {finished.length
                    ? <RunList paginate={false}>{folds.map(({ run, runs }) => {
                        const tally = followupTally(counts, runs);
                        return <SettledRun key={run.id} run={run} runs={runs} latest={newest.has(run.id)}
                          followups={childrenOf(runs)} followupTotal={tally.total} followupFailed={tally.failed}
                          followupCancelled={tally.cancelled} />;
                      })}</RunList>
                    : null}
                  <DataTableFooter label={t('manage:taskCenter.recentlyCompleted')} total={data.finished_total ?? settled.length} unit={t('manage:taskCenter.footerUnit')} pageUnit={t('manage:taskCenter.footerPageUnit')}
                    pagination={{ pageIndex: (data.finished_page || page) - 1, pageSize }}
                    onChange={(next) => {
                      if (next.pageIndex + 1 === page && next.pageSize === pageSize) void tasks.refetch();
                      else { setPage(next.pageIndex + 1); setPageSize(next.pageSize) }
                    }} />
                </Section>
              : null}
          </>}
      {/* 离线下载跑在网盘那头，自己一张表、自己轮询；任务中心为空时它照样在。 */}
      <DownloadsPanel />
    </Page>
  );
}
