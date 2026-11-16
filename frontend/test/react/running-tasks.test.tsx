/* 「有什么任务在跑」只由一处去查：全站常驻的 `/api/result-updates` 带回 `running_tasks`，
 * 其余页面只读缓存，闲着不各自轮询，任务开始时才接上自己那份进度。
 *
 * 逐条量：常驻那一处的节律（有任务五秒、闲着十秒）、失败退避与恢复、读缓存的观察者不发请求、
 * 任务信号触发重取、页面隐藏时不发请求。 */
import { act } from 'react';
import { notifyManager, QueryClientProvider, useQuery } from '@tanstack/react-query';
import { afterEach, expect, it, vi } from 'vitest';

import { useBackgroundJob } from '../../src/react/background-job';
import { pendingRefetch, PENDING_REFETCH_MS, usePendingWorkRefetch, type PendingWorkItem } from '../../src/react/components/pending-work';
import { queryClient } from '../../src/react/query';
import { ResultUpdates } from '../../src/react/result-updates';
import { RESULT_UPDATES_KEY, useRunningTasks } from '../../src/react/running-tasks';
import { mountRoot } from './render';

notifyManager.setScheduler((notify) => notify());
let visibility = 'visible';
Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => visibility });
afterEach(() => { queryClient.clear(); visibility = 'visible' });

const tick = (ms: number) => act(async () => { await vi.advanceTimersByTimeAsync(ms) });
const wrap = (node: React.ReactNode) => <QueryClientProvider client={queryClient}>{node}</QueryClientProvider>;
const report = (...tasks: { task_key: string; run_id: number; status: string }[]) => act(async () => {
  queryClient.setQueryData(RESULT_UPDATES_KEY, { running_tasks: tasks });
});

/** 按地址应答；`/api/result-updates` 由用例给的函数决定是成是败、忙不忙。 */
function serve(routes: Record<string, () => unknown>) {
  const fetcher = vi.fn(async (input: string) => {
    const path = String(input).split('?')[0]!;
    const answer = routes[path];
    if (!answer) throw new Error(`用例没有给 ${path} 造数据`);
    const body = answer();
    return body instanceof Error ? { ok: false, status: 503, json: async () => ({}) } : { ok: true, status: 200, json: async () => body };
  });
  vi.stubGlobal('fetch', fetcher);
  const calls = (path: string) => fetcher.mock.calls.filter(([input]) => String(input).split('?')[0] === path).length;
  return { fetcher, calls };
}

it('常驻那一处：闲着十秒一次，有任务五秒一次，带回在跑的任务', async () => {
  vi.useFakeTimers();
  let busy = false;
  const running = [{ task_key: 'library-processing', run_id: 3, status: 'running' }];
  const { calls } = serve({ '/api/result-updates': () => ({ result_versions: {}, busy, running_tasks: busy ? running : [] }) });
  await mountRoot(wrap(<ResultUpdates openItem={vi.fn()} />));
  expect(calls('/api/result-updates')).toBe(1);
  await tick(9999);
  expect(calls('/api/result-updates')).toBe(1);
  await tick(1);
  expect(calls('/api/result-updates'), '闲着十秒一次').toBe(2);
  busy = true;
  await tick(10_000);
  expect(calls('/api/result-updates')).toBe(3);
  await tick(5000);
  expect(calls('/api/result-updates'), '有任务五秒一次').toBe(4);
  expect(queryClient.getQueryData<{ running_tasks: unknown[] }>(RESULT_UPDATES_KEY)?.running_tasks).toEqual(running);
});

it('常驻那一处读失败按 4、8、16、30 秒退避，恢复后回到常规间隔', async () => {
  vi.useFakeTimers();
  let down = true;
  const { calls } = serve({ '/api/result-updates': () => (down ? new Error('down') : { result_versions: {}, busy: false }) });
  await mountRoot(wrap(<ResultUpdates openItem={vi.fn()} />));
  const steps = [4000, 8000, 16_000, 30_000, 30_000];
  for (const [index, wait] of steps.entries()) {
    await tick(wait - 1);
    expect(calls('/api/result-updates'), `第 ${index + 1} 次失败后还没到 ${wait} 毫秒`).toBe(index + 1);
    await tick(1);
  }
  expect(calls('/api/result-updates')).toBe(steps.length + 1);
  down = false;
  await tick(30_000);
  const recovered = calls('/api/result-updates');
  await tick(10_000);
  expect(calls('/api/result-updates'), '恢复后十秒一次').toBe(recovered + 1);
});

it('页面不可见时常驻那一处也不发请求，回到前台再接上', async () => {
  vi.useFakeTimers();
  const { calls } = serve({ '/api/result-updates': () => ({ result_versions: {}, busy: false }) });
  await mountRoot(wrap(<ResultUpdates openItem={vi.fn()} />));
  visibility = 'hidden';
  await tick(60_000);
  expect(calls('/api/result-updates')).toBe(1);
  visibility = 'visible';
  await tick(10_000);
  expect(calls('/api/result-updates')).toBe(2);
});

it('读在跑任务的组件只读缓存，挂多少个都不发请求', async () => {
  vi.useFakeTimers();
  const { fetcher } = serve({});
  function Reader() {
    const tasks = useRunningTasks();
    return <p>{tasks.map((task) => task.task_key).join(',') || '无'}</p>;
  }
  const first = await mountRoot(wrap(<Reader />));
  const second = await mountRoot(wrap(<Reader />));
  await tick(60_000);
  expect(fetcher).not.toHaveBeenCalled();
  expect(first.host.textContent).toBe('无');
  await report({ task_key: 'taste-refresh', run_id: 1, status: 'running' });
  expect(second.host.textContent).toBe('taste-refresh');
  expect(fetcher).not.toHaveBeenCalled();
});

it('后台任务闲着不问，全站那一处报出它在跑才重取并接上两秒的轮询', async () => {
  vi.useFakeTimers();
  let status = 'idle';
  const { calls } = serve({ '/api/job': () => ({ status }) });
  function Job() {
    const job = useBackgroundJob<{ status: string }>({ queryKey: ['job-test'], taskKey: 'taste-refresh',
      queryFn: async ({ signal }) => (await fetch('/api/job', { signal }) as Response).json(), start: async () => ({ status: 'running' }) });
    return <p>{job.job?.status}</p>;
  }
  const { host } = await mountRoot(wrap(<Job />));
  await tick(0);
  expect(calls('/api/job')).toBe(1);
  await tick(60_000);
  expect(calls('/api/job'), '闲着不问').toBe(1);
  await report({ task_key: 'feed-check', run_id: 1, status: 'running' });
  expect(calls('/api/job'), '别的任务不相干').toBe(1);
  status = 'running';
  await report({ task_key: 'taste-refresh', run_id: 2, status: 'running' });
  await tick(0);
  expect(calls('/api/job')).toBe(2);
  expect(host.textContent).toBe('running');
  await tick(2000);
  expect(calls('/api/job')).toBe(3);
  status = 'complete';
  await tick(2000);
  await report();
  await tick(60_000);
  expect(calls('/api/job'), '跑完就停').toBe(4);
});

it('资料补全全是排队时不轮询，排队那项开跑时重取一次，接上四秒的节律', async () => {
  vi.useFakeTimers();
  let work: PendingWorkItem[] = [{ task_key: 'performer-profile', label: '女优资料补全', status: 'pending' }];
  const { calls } = serve({ '/api/entity': () => ({ pending_work: work }) });
  function Entity() {
    const entity = useQuery({ queryKey: ['entity', 'pending-test'], refetchInterval: pendingRefetch,
      queryFn: async ({ signal }) => (await fetch('/api/entity', { signal }) as Response).json() as Promise<{ pending_work: PendingWorkItem[] }> });
    usePendingWorkRefetch(entity.data?.pending_work, ['entity', 'pending-test']);
    return null;
  }
  await mountRoot(wrap(<Entity />));
  await tick(0);
  expect(calls('/api/entity')).toBe(1);
  await tick(60_000);
  expect(calls('/api/entity'), '全是排队时不问').toBe(1);
  work = [{ ...work[0]!, status: 'running' }];
  await report({ task_key: 'performer-profile', run_id: 9, status: 'running' });
  await tick(0);
  expect(calls('/api/entity')).toBe(2);
  await tick(PENDING_REFETCH_MS);
  expect(calls('/api/entity'), '在跑时四秒一次').toBe(3);
});
