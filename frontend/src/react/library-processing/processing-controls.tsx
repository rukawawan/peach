import { useRef } from 'react';
import { Button } from '@/components/base/buttons/button';
import { RiPauseLine, RiPlayLine, RiStopLine } from '@remixicon/react';
import { confirmModal } from '@peach/legacy/ui';

import { apiSend } from '../../api';
import { ProcessingMode } from './processing-effort';
import { queryClient } from '../query';
import { busyProps, useAction } from '../settings/use-action';
import {
  LIBRARY_PROCESSING_KEY, LIBRARY_PROCESSING_URL, processingActive,
  type LibraryProcessingData, type ProcessingControlCommand,
} from './library-processing';
import { t } from '../../i18n';

/** 控制只作用于快照里的任务号；状态由服务端确认后交给所有入口。
 * 与任务中心的取消是同一个动作：同一枚图标、同一套说法，先确认再发。 */
export function ProcessingControls({ state, disabled = false }: {
  state: LibraryProcessingData; disabled?: boolean;
}) {
  const action = useAction();
  const confirming = useRef(false);
  const active = processingActive(state);
  const stopping = state.status === 'stopping';
  const controlLabel = state.status === 'paused' ? t('manage:shared.resume') : state.status === 'pausing' ? t('manage:taskStatus.pausing') : t('manage:shared.pause');
  const cancelLabel = stopping ? t('manage:taskStatus.canceling') : t('manage:shared.cancelTask');
  const change = (command: ProcessingControlCommand) => {
    if (disabled || action.busy) return;
    void action.run(command.action, signal =>
      apiSend<LibraryProcessingData>(LIBRARY_PROCESSING_URL, command, 'POST', signal), next => {
        queryClient.setQueryData(LIBRARY_PROCESSING_KEY, next);
        void queryClient.invalidateQueries({ queryKey: LIBRARY_PROCESSING_KEY });
      });
  };
  const cancel = () => {
    const jobId = state.job_id;
    if (!jobId || disabled || action.busy || confirming.current) return;
    confirming.current = true;
    void confirmModal({
      title: t('manage:processingControls.cancelTitle'),
      body: t('manage:processingControls.cancelBody'),
      confirmLabel: t('manage:shared.cancelTask'),
      danger: true,
    }).then(({ confirmed }) => { if (confirmed) change({ action: 'cancel', job_id: jobId }) })
      .finally(() => { confirming.current = false });
  };
  return <div className="flex min-w-0 flex-col gap-2" data-processing-controls="">
    <div className="flex flex-wrap items-center gap-2">
      <ProcessingMode value={state.speed_mode || 'standard'} busy={disabled || !!action.busy || stopping}
        animate={state.status !== 'paused' && state.status !== 'pausing'}
        onChange={speed_mode => change({ action: 'set_speed', speed_mode, ...(active ? { job_id: state.job_id } : {}) })} />
      {active ? <Button size="small" variant="secondary" iconOnly
        leadingIcon={state.status === 'paused' ? RiPlayLine : RiPauseLine}
        aria-label={controlLabel} title={controlLabel}
        disabled={disabled || !state.job_id || state.status === 'pausing' || stopping}
        {...busyProps(action.busy === 'pause' || action.busy === 'resume')}
        onClick={() => {
          if (state.job_id) change({ action: state.status === 'paused' ? 'resume' : 'pause', job_id: state.job_id });
        }} /> : null}
      {active ? <Button size="small" variant="secondary" iconOnly leadingIcon={RiStopLine}
        aria-label={cancelLabel} title={cancelLabel} disabled={disabled || !state.job_id || stopping}
        {...busyProps(action.busy === 'cancel')} onClick={cancel} /> : null}
    </div>
    {action.error ? <p role="alert" className="text-caption-1-regular text-text-error-primary">{action.error}</p> : null}
  </div>;
}
