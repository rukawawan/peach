/* 任务动作由服务端逐轮给出；收到控制请求不代表后台已经停稳，状态仍以轮询为准。 */
import { useRef } from 'react';
import { RiPauseLine, RiPlayLine, RiStopLine } from '@remixicon/react';
import { useMutation, useMutationState, useQueryClient } from '@tanstack/react-query';
import { confirmModal } from '@peach/legacy/ui';

import { Button } from '@/components/base/buttons/button';

import { errorMessage } from '../../api';
import { Note } from '../components/note';
import { busyProps } from '../settings/use-action';
import { ProcessingMode } from '../library-processing/processing-effort';
import type { ProcessingSpeed } from '../library-processing/library-processing';
import { controlTask, setTaskSpeed, isActive, taskName, TASKS_KEY, type TaskControlAction, type TaskRunPayload } from './tasks';
import { t } from '../../i18n';

const CONTROL_KEY = ['task-control'] as const;
const ICONS = { pause: RiPauseLine, resume: RiPlayLine, cancel: RiStopLine };
const LABELS = { pause: t('manage:shared.pause'), resume: t('manage:shared.resume'), cancel: t('manage:taskControls.cancelTask') };
const FOLLOWUP_LABELS = { pause: t('manage:taskControls.pauseFollowups'), resume: t('manage:taskControls.resumeFollowups'), cancel: t('manage:taskControls.cancelFollowups') };

interface ControlCommand { id: number; label: string; action: TaskControlAction; followups: boolean }

/** 请求结果属于任务中心，任务转入终态、卸载原卡片后仍保留未接受的操作及原因。 */
export function TaskControlFeedback() {
  const mutations = useMutationState({
    filters: { mutationKey: CONTROL_KEY },
    select: (mutation) => ({
      id: mutation.mutationId,
      command: mutation.state.variables as ControlCommand | undefined,
      status: mutation.state.status,
      error: mutation.state.error,
    }),
  });
  const latest = new Map<number, { id: number; command: ControlCommand; status: string; error: unknown }>();
  for (const mutation of mutations) {
    const command = mutation.command;
    if (!command) continue;
    const previous = latest.get(command.id);
    if (!previous || previous.id < mutation.id) latest.set(command.id, { ...mutation, command });
  }
  const failed = [...latest.values()].filter((mutation) => mutation.status === 'error');
  if (!failed.length) return null;
  return <div data-task-control-feedback="" className="flex min-w-0 flex-col gap-2">
    {failed.map(({ command, error }) => <Note key={command.id} tone="error"
      title={t('manage:taskControls.actionFailed', { task: command.label, action: (command.followups ? FOLLOWUP_LABELS : LABELS)[command.action] })}>
      {errorMessage(error)}
    </Note>)}
  </div>;
}

/** `runs` 是并在同一张卡里的几批，按钮对每一批各发一次；不给就只管 `run` 这一轮。 */
export function TaskControls({ run, runs = [run] }: { run: TaskRunPayload; runs?: TaskRunPayload[] }) {
  const client = useQueryClient();
  const pending = useRef({ change: false, cancel: false, confirmation: false });
  const refresh = () => { void client.invalidateQueries({ queryKey: TASKS_KEY }) };
  // 一批被拒不拦后面几批：并卡期间较早那批可能刚好跑完，其余几批照样要停；有被拒的照常报出来。
  const send = async (command: ControlCommand) => {
    let failure: unknown = null;
    for (const row of runs) {
      try {
        await controlTask(row.id, command.action);
      } catch (error) {
        failure ??= error;
      }
    }
    if (failure !== null) throw failure;
  };
  const change = useMutation({
    mutationKey: [...CONTROL_KEY, run.id, 'change'],
    mutationFn: send,
    onSettled: () => { pending.current.change = false; refresh() },
  });
  const cancellation = useMutation({
    mutationKey: [...CONTROL_KEY, run.id, 'cancel'],
    mutationFn: send,
    onSettled: () => { pending.current.cancel = false; refresh() },
  });
  const speed = useMutation({
    mutationFn: async (mode: ProcessingSpeed) => {
      const results = await Promise.allSettled(runs.map((row) => setTaskSpeed(row.id, mode)));
      const failure = results.find((result) => result.status === 'rejected');
      if (failure?.status === 'rejected') throw failure.reason;
    },
    onSettled: refresh,
  });
  const actions = (run.control?.actions || []).filter((action): action is TaskControlAction => action !== 'set_speed');
  const canSetSpeed = Boolean(run.control?.actions.includes('set_speed') && run.control.speed_mode);
  const followups = !isActive(run);
  const cancelling = cancellation.isPending || cancellation.isSuccess;
  if (!actions.length && !canSetSpeed) return null;

  const submit = (action: TaskControlAction) => {
    const command = { id: run.id, label: taskName(run), action, followups };
    if (action === 'cancel') {
      if (pending.current.cancel || pending.current.confirmation || cancellation.isSuccess) return;
      pending.current.confirmation = true;
      void confirmModal({
        title: followups ? t('manage:taskControls.cancelFollowupsTitle', { task: taskName(run) }) : t('manage:taskControls.cancelTaskTitle', { task: taskName(run) }),
        body: !followups ? t('manage:taskControls.cancelTaskBody')
          : runs.length > 1 ? t('manage:taskControls.cancelBatchFollowupsBody', { count: runs.length })
          : t('manage:taskControls.cancelFollowupsBody'),
        confirmLabel: followups ? t('manage:taskControls.cancelFollowups') : t('manage:shared.cancelTask'),
        danger: true,
        onConfirm: async () => {
          pending.current.cancel = true;
          return await cancellation.mutateAsync(command);
        },
      }).finally(() => { pending.current.confirmation = false });
    } else {
      if (pending.current.change || pending.current.cancel || cancelling) return;
      pending.current.change = true;
      change.mutate(command);
    }
  };

  return (
    <div className="ml-auto min-w-0" data-task-controls={run.id}>
      <div role="group" aria-label={t(followups ? 'manage:taskControls.followupsGroupLabel' : 'manage:taskControls.groupLabel', { task: taskName(run) })}
        className="flex flex-wrap items-center justify-end gap-2">
        {canSetSpeed ? <ProcessingMode value={run.control!.speed_mode!}
          busy={speed.isPending || cancelling} animate={run.control?.state === 'running'}
          onChange={(mode) => speed.mutate(mode)} /> : null}
        {actions.map((action) => {
          const label = (followups ? FOLLOWUP_LABELS : LABELS)[action];
          const busy = action === 'cancel' ? cancellation.isPending : change.isPending && change.variables?.action === action;
          const unavailable = action === 'cancel' ? cancelling : change.isPending || cancelling;
          return <Button key={action} type="button" variant="secondary" size="small" iconOnly
            leadingIcon={ICONS[action]} aria-label={label} title={label}
            {...busyProps(busy)} aria-disabled={unavailable || undefined}
            onClick={() => submit(action)}
            data-tooltip-copy-key={`tasks.control.action.${followups ? 'followups.' : ''}${action}`} />;
        })}
      </div>
      {speed.error ? <Note tone="error">{errorMessage(speed.error)}</Note> : null}
    </div>
  );
}
