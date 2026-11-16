/* 单部影片等待外部资料时可跳过，已有结果保留，未完成项留待重试。
 *
 * 数据管理页卡片用 Note 承载，常驻任务面本身已是黄色警示面，提示与操作直接呈现。
 * 卡在哪一部、等了多久由上方的进度行说，这里不再重复。 */
import { Button } from '@/components/base/buttons/button';

import { apiSend } from '../../api';
import { Note } from '../components/note';
import { queryClient } from '../query';
import { busyProps, useAction } from '../settings/use-action';
import {
  LIBRARY_PROCESSING_KEY, LIBRARY_PROCESSING_URL, slowItemText,
  type LibraryProcessingData, type ProcessingControlCommand, type SlowItem,
} from './library-processing';
import { t } from '../../i18n';

function SlowItemActions({ state }: { state: LibraryProcessingData }) {
  const action = useAction();
  const send = (command: ProcessingControlCommand) => {
    if (action.busy) return;
    void action.run(command.action, signal =>
      apiSend<LibraryProcessingData>(LIBRARY_PROCESSING_URL, command, 'POST', signal), next => {
        queryClient.setQueryData(LIBRARY_PROCESSING_KEY, next);
        void queryClient.invalidateQueries({ queryKey: LIBRARY_PROCESSING_KEY });
      });
  };
  return <div className="flex min-w-0 flex-col gap-2">
    <div className="flex flex-wrap items-center gap-2">
      <Button size="small" variant="secondary" disabled={state.skip_requested} {...busyProps(action.busy === 'skip_current')}
        onClick={() => {
          if (state.job_id && state.current_asset_id != null)
            send({ action: 'skip_current', job_id: state.job_id, asset_id: state.current_asset_id });
        }}>{state.skip_requested ? t('manage:slowItem.skipping') : t('manage:slowItem.skip')}</Button>
    </div>
    {state.skip_requested ? <p role="status" className="text-caption-1-regular">{t('manage:slowItem.skipPending')}</p> : null}
    {action.error ? <p role="alert" className="text-caption-1-regular text-text-error-primary">{action.error}</p> : null}
  </div>;
}

/** 数据管理页卡片外那一列提示里的一条。 */
export function SlowItemNote({ state, slow }: { state: LibraryProcessingData; slow: SlowItem }) {
  return <Note tone="warning"
    action={<SlowItemActions state={state} />}>
    {slowItemText(slow)}
  </Note>;
}

/** 常驻任务面里的那一段：面板已经是警示色，正文与按钮直接摆。 */
export function SlowItemInline({ state, slow }: { state: LibraryProcessingData; slow: SlowItem }) {
  return <div data-processing-slow="" className="flex min-w-0 flex-wrap items-center justify-between gap-3">
    <p className="min-w-0 flex-auto text-body-2-regular wrap-anywhere">{slowItemText(slow)}</p>
    <SlowItemActions state={state} />
  </div>;
}
