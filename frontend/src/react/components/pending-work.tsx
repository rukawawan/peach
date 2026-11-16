/* 资料还在补：资料页与作品详情共用的那一枚状态标签。列出在跑与排队的那几项，补完由页面重取后自己消失。 */
import type { QueryKey } from '@tanstack/react-query';

import { withBackoff } from '../../polling';
import { useRefetchOnTask } from '../running-tasks';
import { StatusLabel } from './status-label';
import { joinList, t } from '../../i18n';

/** 接口里 `pending_work` 的一项：还在排队或正在跑的资料补全。 */
export interface PendingWorkItem { task_key: string; label: string; status: 'pending' | 'running' | string }

/** 资料正在补时多久重取一次。补完就停，不在后台标签页里轮询。 */
export const PENDING_REFETCH_MS = 4000;

type PendingData = { pending_work?: PendingWorkItem[] };

/** 给 `useQuery` 的 `refetchInterval`：有一项正在跑就隔一会儿再取，读失败退避；全是排队时不问，
 *  排队那几项开跑或结束由全站那一处带来（`usePendingWorkRefetch`），写下的资料由结果版本作废这一份。 */
export const pendingRefetch = withBackoff<PendingData>((data) =>
  (data?.pending_work?.some((item) => item.status === 'running') ? PENDING_REFETCH_MS : false));

/** 全是排队时这一份不轮询：排队那几种任务开跑或结束时重取一次，接上 `pendingRefetch` 的节律。 */
export function usePendingWorkRefetch(work: readonly PendingWorkItem[] | undefined, queryKey: QueryKey) {
  const keys = [...new Set((work || []).map((item) => item.task_key))];
  const queued = !!work?.length && !work.some((item) => item.status === 'running');
  useRefetchOnTask(keys, queryKey, { enabled: queued });
}

export function PendingWork({ work }: { work: readonly PendingWorkItem[] | undefined }) {
  if (!work?.length) return null;
  const running = work.some((item) => item.status === 'running');
  const tasks = joinList([...new Set(work.map((item) => item.label))]);
  return (
    <div data-pending-work="" role="status" className="flex min-w-0 max-w-full overflow-hidden">
      <StatusLabel tone="progress">{t(running ? 'shell:pendingWork.running' : 'shell:pendingWork.waiting', { tasks })}</StatusLabel>
    </div>
  );
}
