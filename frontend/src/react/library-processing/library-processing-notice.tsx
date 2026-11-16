/* 常驻任务面：状态、计数与控件共用服务端快照。位置由全站通知栈管理。 */
import { useEffect, useId, useRef, useState } from 'react';
import { VisuallyHidden } from 'react-aria';
import { RiArrowRightLine, RiCheckLine, RiCheckboxBlankCircleLine, RiCloseLine, RiErrorWarningLine, RiInformationLine } from '@remixicon/react';
import { Button } from '@/components/base/buttons/button';
import { LinkButton } from '@/components/base/buttons/link-button';
import { cx } from '@/utils/cx';
import { errorMessage } from '../../api';
import type { LibraryProcessingProps } from '../bundle';
import { ALL_CONTENT_URL, DISCONNECTED_TEXT, PARTIAL_RESULT_TEXT, processingActive, processingHasPartialResult, remainingTime, slowItem, type LibraryProcessingData } from './library-processing';
import { SlowItemInline } from './slow-item';
import { ProcessingControls } from './processing-controls';
import { useLibraryProcessingJob } from './use-library-processing';
import { ProcessingLine } from './processing-line';
import { CollapseChevron, CollapseRegion } from '../components/collapse-region';
import { TrafficProgress } from './processing-traffic';
import { t } from '../../i18n';
import { codedText, jobText, stageText } from '../../core/server-text';
import { activityKind, stepActivityKind } from '../../activity-kinds';
import { ActivityMotion } from '../components/activity-motion';
import { ProgressRing } from '../components/progress-ring';

const COLLAPSE_KEY = 'peach.library-processing.collapsed';
function expandedFor(jobId?: string): boolean {
  try { return !jobId || sessionStorage.getItem(COLLAPSE_KEY) !== jobId } catch { return true }
}

export function ProcessingNoticePanel({ state, problem = '', measure = false, onHide }: {
  state?: LibraryProcessingData; problem?: string; measure?: boolean; onHide?(): void;
}) {
  const [expanded, setExpanded] = useState(() => expandedFor(state?.job_id));
  /* 通知栈里展开的卡连同底下的小窗、多选条和上面的回执装不进视口时，先收起明细；不记进会话，
     腾出空间后按原来的开合显示。这时用户再点展开就照办，直到装不下的情形过去又重来。 */
  const [crowded, setCrowded] = useState(false);
  const override = useRef(false);
  const fullHeight = useRef(0);
  const open = expanded && !crowded;
  const openRef = useRef(open); openRef.current = open;
  const bodyId = useId();
  const [trafficExpanded, setTrafficExpanded] = useState(false);
  const panel = useRef<HTMLElement>(null);
  const partial = !problem && processingHasPartialResult(state);
  const failed = state?.status === 'failed' && !partial;
  const active = processingActive(state);
  useEffect(() => { setExpanded(expandedFor(state?.job_id)); setTrafficExpanded(false) }, [state?.job_id]);
  const toggle = () => {
    // 腾空间时暂收的卡，用户点展开就照办；自己收起过的卡展开时同样越过这次暂收。
    if (crowded) { override.current = true; setCrowded(false); if (expanded) return }
    try {
      if (expanded && state?.job_id) sessionStorage.setItem(COLLAPSE_KEY, state.job_id);
      else sessionStorage.removeItem(COLLAPSE_KEY);
    } catch { /* 会话存储不可用时当前页面仍可收起 */ }
    if (expanded) setTrafficExpanded(false);
    setExpanded(!expanded);
  };
  useEffect(() => {
    if (!measure || !panel.current) return;
    const node = panel.current;
    const root = document.documentElement;
    let disposed = false;
    const px = (name: string) => parseFloat(getComputedStyle(root).getPropertyValue(name)) || 0;
    const update = () => {
      if (disposed || !node.isConnected) return;
      const height = node.getBoundingClientRect().height;
      const space = `${height + 12}px`;
      if (root.style.getPropertyValue('--processing-toast-space') !== space) root.style.setProperty('--processing-toast-space', space);
      /* 展开时的高度按上次展开时量到的实高算：收起后折叠区是 0，量不到。 */
      if (openRef.current) fullHeight.current = height;
      const full = Math.max(height, fullHeight.current);
      // 与 `../toaster.tsx` 的底边同一算法：默认边距、多选条、下角小窗取最高的那个。
      const floor = Math.max(innerWidth <= 600 ? 16 : 24, px('--selection-dock-space'), px('--miniplayer-space'));
      const receipts = Math.max(0, ...[...document.querySelectorAll('#toasts [data-sonner-toast]:not(.processing-task-toast)')]
        .map(toast => toast.getBoundingClientRect().height));
      const tight = floor + full + 12 + (receipts ? receipts + 8 : 0) > innerHeight - (px('--topH') || 56);
      if (!tight) override.current = false;
      setCrowded(tight && !override.current);
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(node);
    /* 小窗、多选条与任务卡自己都把占位写在根节点的 style 上；回执进出看通知栈的子节点。 */
    const changes = new MutationObserver(update);
    changes.observe(root, { attributes: true, attributeFilter: ['style'] });
    const toasts = document.getElementById('toasts');
    if (toasts) changes.observe(toasts, { childList: true, subtree: true });
    window.addEventListener('resize', update);
    return () => {
      disposed = true; observer.disconnect(); changes.disconnect();
      window.removeEventListener('resize', update);
      root.style.removeProperty('--processing-toast-space');
    };
  }, [measure]);
  if (state?.archived && !problem) return null;
  if (!problem && !active && !failed && !partial) return null;
  const slow = problem ? null : slowItem(state);
  const warning = !!problem || !!state?.stalled || partial || !!slow;
  const title = partial ? t('manage:taskOutcome.partial') : failed ? t('manage:processingNotice.interrupted') : state?.status === 'paused' ? t('manage:processingNotice.paused') : t('manage:scanFetch.title');
  return <aside ref={panel} data-processing-dock="" data-processing-tone={failed ? 'error' : warning ? 'warning' : 'neutral'}
    aria-label={t('manage:processingNotice.panelLabel')} role={failed ? 'alert' : 'status'}
    className={cx('flex min-w-0 flex-col border bg-background-primary-default p-4',
      failed ? 'border-current/35 text-text-error-primary'
        : warning ? 'border-current/35 text-status-yellow-text'
          : 'border-border-button-default text-text-primary')}>
    <div className="flex min-w-0 flex-col gap-3">
    <div className="flex min-w-0 items-center gap-3">
      {/* 图标位：进行中时旁边是标题加预估两行，环形与语义动画按两行高（`lead`）；有总量是当前阶段完成率的小环形，
          没有总量是那一阶段的语义动画。 */}
      {active && state?.total ? <ProgressRing size="lead" label={t('manage:processingNotice.stageProgress')} value={state.checked || 0} max={state.total} />
        : active && !warning ? <ActivityMotion size="lead" kind={activityKind('library-processing', state?.stage_code)} still={state?.status === 'paused'} />
        : failed || warning ? <RiErrorWarningLine aria-hidden className="size-5 shrink-0" />
          : <RiInformationLine aria-hidden className="size-5 shrink-0" />}
      <div className="min-w-0 flex-1">
        <p className="text-body-medium">{title}</p>
        {active ? <p data-processing-eta="" className="text-caption-1-regular text-text-secondary tabular-nums wrap-anywhere">{remainingTime(state!)}</p> : null}
      </div>
      <Button size="small" variant="secondary" iconOnly leadingIcon={CollapseChevron} data-processing-toggle="" data-collapse-upward=""
        aria-label={open ? t('manage:processingNotice.collapseDetails') : t('manage:processingNotice.expandDetails')} aria-expanded={open} aria-controls={bodyId} onClick={toggle} />
      {onHide ? <Button size="small" variant="secondary" iconOnly leadingIcon={RiCloseLine}
        aria-label={t('manage:processingNotice.hide')} onClick={onHide} /> : null}
    </div>
    {/* 收起时只留标题与文件计数；预估、步骤、原因与入口都在折叠区里。 */}
    <TrafficProgress traffic={state?.traffic} compact={!open} detailsOpen={trafficExpanded} onDetailsChange={setTrafficExpanded} />
    {/* 收起时也露在外面：要人当场拿主意的事不能藏进折叠区。 */}
    {slow ? <SlowItemInline state={state!} slow={slow} /> : null}
    </div>
    <CollapseRegion id={bodyId} open={open} data-processing-body=""><div className="pt-3"><div className={cx('flex min-w-0 flex-col gap-2 border-t pt-3',
      failed ? 'border-border-error-default/20' : warning ? 'border-current/20' : 'border-separator-border')}>
      {state?.steps?.length ? <ol aria-label={t('manage:processingNotice.steps')} className="flex min-w-0 flex-col gap-1.5">
        {state.steps.map(step => <li key={step.id} data-processing-step={step.status}
          aria-current={step.status === 'current' ? 'step' : undefined}
          className={cx('flex min-h-8 items-center gap-2 text-body-2-regular',
            step.status === 'current' ? 'text-text-primary' : 'text-text-tertiary')}>
          {step.status === 'complete' ? <RiCheckLine aria-hidden className="size-(--icon-inline) shrink-0" />
            /* 当前那一步画它在做的那类事，与用户脚本的阶段清单同一个做法；暂停时停在静帧。 */
            : step.status === 'current' && active ? <ActivityMotion kind={stepActivityKind(step.id)} still={state?.status === 'paused'} />
            : <RiCheckboxBlankCircleLine aria-hidden className={cx('size-(--icon-inline) shrink-0', step.status === 'current' && 'text-border-focus-ring')} />}
          <VisuallyHidden>{step.status === 'complete' ? t('manage:processingNotice.stepDone') : step.status === 'current' ? t('manage:processingNotice.stepCurrent') : t('manage:processingNotice.stepPending')}</VisuallyHidden>
          {step.status === 'complete' ? <s className="wrap-anywhere">{codedText(step, 'label')}</s> : <span className="wrap-anywhere">{codedText(step, 'label')}</span>}
        </li>)}
      </ol> : null}
      <p className="text-body-2-regular wrap-anywhere">{problem || (failed || partial ? jobText(state, 'error') || t('manage:processingNotice.reviewUnfinished') : <ProcessingLine state={state!} />)}</p>
      {partial ? <p className="text-body-2-regular wrap-anywhere">{PARTIAL_RESULT_TEXT}</p> : null}
      {active && state?.stage && !state.steps?.length ? <p className="text-caption-1-regular text-text-tertiary">{t('manage:processingNotice.currentStageName', { stage: stageText(state) })}</p> : null}
      {state?.stalled && !problem && !slow ? <p className="text-caption-1-regular">{t('manage:processingNotice.stalled')}</p> : null}
    </div>
    <div className="flex flex-wrap items-center justify-between gap-2 pt-3">
      <LinkButton href="/data-cleanup#libraryProcessing" variant="secondary" size="small" trailingIcon={RiArrowRightLine}>
        {problem || failed || partial ? t('manage:completionPrompt.openScanFetch') : t('manage:processingNotice.taskDetails')}
      </LinkButton>
      {partial ? <LinkButton href={ALL_CONTENT_URL} size="small" trailingIcon={RiArrowRightLine}>{t('manage:scanFetch.viewAllContent')}</LinkButton> : null}
      {active ? <ProcessingControls state={state!} disabled={!!problem} /> : null}
    </div></div></CollapseRegion>
  </aside>;
}

/** 独立任务面与数据管理卡片共享缓存和完成通知。 */
export function LibraryProcessingNotice(props: LibraryProcessingProps) {
  const { job } = useLibraryProcessingJob(props);
  return <ProcessingNoticePanel state={job.data} problem={job.isError ? (job.data ? DISCONNECTED_TEXT : errorMessage(job.error)) : ''} />;
}
