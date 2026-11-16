/* 「有什么任务在跑」只由一处去查：全站常驻的 `/api/result-updates`（`react/result-updates.tsx`）
 * 带回 `running_tasks`，每种在排或在跑的任务一项。各页面读这份缓存决定要不要开始盯自己那份
 * 进度，闲着时不各自轮询。遗留层与 React 共用这一个模块，读的是同一个 QueryClient。 */
import { queryClient } from '@peach/query';
import { apiGet } from './api';

export const RESULT_UPDATES_KEY = ['result-updates'] as const;

/** 追更检查登记在任务中心的 `task_key`。 */
export const FOLLOW_CHECK_TASK = 'follow-check';

/** `running_tasks` 的一项：在跑时 `run_id` 是在跑的最新一轮，只在排队时是最新排进来的那一轮。 */
export interface RunningTask { task_key: string; run_id: number; status: 'pending' | 'running' | string }

export interface ResultUpdatesPayload {
  result_versions?: Record<string, string>;
  ingest_notices?: { epoch: string; items: { id: number; kind: 'download' | 'discovered'; asset_id: number; label: string; at: number }[] };
  busy?: boolean;
  running_tasks?: RunningTask[];
}

export const fetchResultUpdates = (signal?: AbortSignal) =>
  apiGet<ResultUpdatesPayload>('/api/result-updates', signal);

/** 缓存里最近一次读到的在排在跑任务。全站那一处还没读到时是空的。 */
export const runningTasks = (): RunningTask[] =>
  queryClient.getQueryData<{ running_tasks?: RunningTask[] }>(RESULT_UPDATES_KEY)?.running_tasks || [];

/** 全站那一处读到的快照里有没有 `running_tasks`：还没读到是 `undefined`；旧服务或前后端版本错位时
 *  后端不报这个字段，是 `false`。 */
export function tasksReported(): boolean | undefined {
  const data = queryClient.getQueryData<ResultUpdatesPayload>(RESULT_UPDATES_KEY);
  return data === undefined ? undefined : Array.isArray(data.running_tasks);
}

/** 后端不报 `running_tasks` 时调一次 `listener`：靠它决定「什么时候开始盯进度」的页面退回进页查一次。
 *  已经读到快照时当场判断，还没读到时等第一份；报了这个字段就什么都不做。返回取消订阅。 */
export function whenTasksUnreported(listener: () => void): () => void {
  const known = tasksReported();
  if (known !== undefined) {
    if (!known) listener();
    return () => {};
  }
  const stop = queryClient.getQueryCache().subscribe((event) => {
    if (event.type !== 'updated' || event.query.queryKey[0] !== RESULT_UPDATES_KEY[0]) return;
    const reported = tasksReported();
    if (reported === undefined) return;
    stop();
    if (!reported) listener();
  });
  return stop;
}

/** 这一种任务在排或在跑的那一项。 */
export const runningTask = (taskKey: string, tasks: readonly RunningTask[] = runningTasks()) =>
  tasks.find((task) => task.task_key === taskKey);

const signature = (taskKeys: readonly string[], tasks: readonly RunningTask[]) =>
  taskKeys.map((key) => {
    const task = runningTask(key, tasks);
    return task ? `${key}:${task.run_id}:${task.status}` : '';
  }).join('|');

/** 这几种任务开始、换了一轮、从排队转成在跑或结束时调一次 `listener`。返回取消订阅。 */
export function onTaskChange(taskKeys: readonly string[],
  listener: (tasks: RunningTask[]) => void): () => void {
  let last = signature(taskKeys, runningTasks());
  return queryClient.getQueryCache().subscribe((event) => {
    if (event.type !== 'updated' || event.query.queryKey[0] !== RESULT_UPDATES_KEY[0]) return;
    const tasks = runningTasks();
    const next = signature(taskKeys, tasks);
    if (next === last) return;
    last = next;
    listener(tasks);
  });
}
