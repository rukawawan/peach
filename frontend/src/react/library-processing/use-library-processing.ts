/* 卡片与任务面共用的那一份读取与状态迁移判断。
 *
 * 几处读同一个 `queryKey`，轮询只由任务面（`mode: 'notice'`，壳里常驻的停靠栏）一处驱动：
 * 在跑时两秒一次，闲着不问，后台自己起的那一趟由全站那一处读到的 `running_tasks` 带来，
 * 停靠栏据此重取一次再接上。卡片只读缓存。这里额外盯住「这一趟是不是在本次眼前跑完的」。
 * 任务关掉页面照样在跑，状态里常年躺着上一趟的回执：首屏读到的终态没有上一个状态，
 * 所以它不会被当成刚刚跑完，也不发回执。 */
import { useEffect, useRef, useState } from 'react';
import { useQuery, type UseQueryResult } from '@tanstack/react-query';

import type { LibraryProcessingProps } from '../bundle';
import { queryClient } from '../query';
import { runningTask, useRefetchOnTask } from '../running-tasks';
import {
  announceCompletion, fetchLibraryProcessing, LIBRARY_PROCESSING_KEY, LIBRARY_PROCESSING_TASK, pollInterval,
  processingActive, type LibraryProcessingData,
} from './library-processing';

/** 全站那一处报出这一种任务在跑、缓存里却还不是在跑：重取一次，接上两秒的轮询。 */
const startedElsewhere = (tasks: Parameters<typeof runningTask>[1]) =>
  runningTask(LIBRARY_PROCESSING_TASK, tasks)?.status === 'running'
  && !processingActive(queryClient.getQueryData<LibraryProcessingData>(LIBRARY_PROCESSING_KEY));

export interface LibraryProcessingJob {
  job: UseQueryResult<LibraryProcessingData>;
  /** 本次亲眼看着跑完的那一趟。首屏读到的旧终态不会走到这里。 */
  settled: LibraryProcessingData | null;
  /** 又发起了一趟：上一趟的结论不再留在屏幕上。 */
  forget(): void;
}

export function useLibraryProcessingJob(
  { toast, mode }: LibraryProcessingProps,
): LibraryProcessingJob {
  const driver = mode === 'notice';
  const job = useQuery({
    queryKey: LIBRARY_PROCESSING_KEY,
    queryFn: ({ signal }) => fetchLibraryProcessing(signal),
    refetchInterval: driver ? pollInterval : false,
  });
  useRefetchOnTask([LIBRARY_PROCESSING_TASK], LIBRARY_PROCESSING_KEY, { enabled: driver, needed: startedElsewhere });
  const [settled, setSettled] = useState<LibraryProcessingData | null>(null);
  const previous = useRef<string | undefined>(undefined);
  const state = job.data;
  useEffect(() => {
    if (!state) return;
    const was = previous.current;
    previous.current = state.status;
    const witnessed = !!was && ['running', 'pausing', 'paused', 'stopping'].includes(was) && !processingActive(state);
    if (witnessed) setSettled(state);
    /* 任务面还要认「刚结束」：首次引导那一趟常在跳到目录页之前就跑完，它从没见过
       「运行中」。卡片只认自己看着跑完的那一趟。 */
    if (witnessed || mode === 'notice') announceCompletion(state, toast, witnessed);
  }, [state, mode, toast]);

  return { job, settled, forget: () => setSettled(null) };
}
