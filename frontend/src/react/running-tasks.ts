/* React 这边读「有什么任务在跑」：同一个 `RESULT_UPDATES_KEY`，只读缓存，不另发请求。
 * 查的那一处是 `result-updates.tsx`；这里的观察者不带 `queryFn` 的节律，也不在挂载时取数。 */
import { useEffect, useRef } from 'react';
import { useQuery, type QueryKey } from '@tanstack/react-query';

import {
  fetchResultUpdates, onTaskChange, RESULT_UPDATES_KEY, runningTask, type ResultUpdatesPayload, type RunningTask,
} from '../running-tasks';
import { queryClient } from './query';

export { RESULT_UPDATES_KEY, runningTask, type RunningTask };

const NONE: RunningTask[] = [];

/** 全站那一处最近读到的在排在跑任务。观察者关着（`enabled: false`）：只读缓存，不发请求；
 *  `queryFn` 照给同一个，失效重取时不管落到哪个观察者的选项上都取得到。 */
export function useRunningTasks(): RunningTask[] {
  const query = useQuery({
    queryKey: RESULT_UPDATES_KEY,
    queryFn: ({ signal }) => fetchResultUpdates(signal),
    enabled: false,
    select: (data: ResultUpdatesPayload) => data.running_tasks || NONE,
  });
  return query.data || NONE;
}

/** 这几种任务开始、换了一轮或结束时，让 `queryKey` 重取一次：页面闲着不轮询，任务的起止由
 *  全站那一处带来。`needed` 返回 false 时这次不取，比如缓存里已经是在跑、自己的轮询接着就会读到。 */
export function useRefetchOnTask(taskKeys: readonly string[], queryKey: QueryKey, options: {
  enabled?: boolean; needed?: (tasks: RunningTask[]) => boolean;
} = {}) {
  const { enabled = true } = options;
  const latest = useRef({ queryKey, needed: options.needed });
  useEffect(() => { latest.current = { queryKey, needed: options.needed } });
  const keys = taskKeys.join('\u0000');
  useEffect(() => {
    if (!enabled) return undefined;
    return onTaskChange(keys.split('\u0000'), (tasks) => {
      const { queryKey: current, needed } = latest.current;
      if (needed && !needed(tasks)) return;
      void queryClient.invalidateQueries({ queryKey: current, exact: true });
    });
  }, [keys, enabled]);
}
