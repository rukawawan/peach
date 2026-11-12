/* 资料还在补：资料页与作品详情共用的那一枚状态标签。列出在跑与排队的那几项，补完由页面重取后自己消失。 */
import { StatusLabel } from './status-label';

/** 接口里 `pending_work` 的一项：还在排队或正在跑的资料补全。 */
export interface PendingWorkItem { task_key: string; label: string; status: 'pending' | 'running' | string }

/** 资料还在补全时多久重取一次。补完就停，不在后台标签页里轮询。 */
export const PENDING_REFETCH_MS = 4000;

/** 给 `useQuery` 的 `refetchInterval`：这一份还有在补的就隔一会儿再取，没有就停。 */
export const pendingRefetch = ({ state }: { state: { data?: { pending_work?: PendingWorkItem[] } } }) =>
  state.data?.pending_work?.length ? PENDING_REFETCH_MS : false as const;

export function PendingWork({ work }: { work: readonly PendingWorkItem[] | undefined }) {
  if (!work?.length) return null;
  const running = work.some((item) => item.status === 'running');
  const labels = [...new Set(work.map((item) => item.label))].join('、');
  return (
    <div data-pending-work="" role="status" className="flex min-w-0 max-w-full overflow-hidden">
      <StatusLabel tone="progress">{`${running ? '正在补全' : '等待补全'}：${labels}`}</StatusLabel>
    </div>
  );
}
