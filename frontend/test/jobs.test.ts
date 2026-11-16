import { describe, it, expect, vi, afterEach } from 'vitest';
import { queryClient } from '@peach/query';
import { watchJob, followJobProgress, type FollowJobView } from '../src/jobs';
import { RESULT_UPDATES_KEY } from '../src/running-tasks';

afterEach(() => {
  vi.useRealTimers(); sessionStorage.clear(); document.body.innerHTML = ''; queryClient.clear();
  Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'visible' });
});

/** 全站那一处（`/api/result-updates`）报出的在跑任务，写进同一份缓存。 */
const reportRunning = (...keys: string[]) => queryClient.setQueryData(RESULT_UPDATES_KEY,
  { running_tasks: keys.map((task_key, index) => ({ task_key, run_id: index + 1, status: 'running' })) });

/** 那一格最近一次要画的东西。 */
const shown = () => {
  const views: (FollowJobView | null)[] = [];
  return { views, show: (view: FollowJobView | null) => { views.push(view) }, last: () => views.at(-1) };
};
const text = (view: FollowJobView | null | undefined) =>
  !view ? '' : view.status === 'running' ? view.label : view.message;

describe('后台任务状态恢复', () => {
  it('在跑时给出真实计数与检查动画，失败原因换成错误提示并持续可见', async () => {
    reportRunning('follow-check');
    vi.useFakeTimers(); const panel = shown(); const complete = vi.fn();
    let state = { status: 'running', job_id: 'default', checked: 2, total: 5, error: '' };
    followJobProgress({ active: () => true, read: async () => state, busy: () => {}, complete, show: panel.show });
    await vi.advanceTimersByTimeAsync(0);
    expect(panel.last()).toMatchObject({ status: 'running', value: 2, total: 5, kind: 'radar' });
    state = { ...state, status: 'failed', error: '来源不可用' }; await vi.advanceTimersByTimeAsync(4000);
    expect(panel.last()).toEqual({ status: 'problem', tone: 'error', message: '来源不可用' });
    expect(complete).toHaveBeenCalledOnce();
  });
  it('往回抓那一趟按传输画', async () => {
    reportRunning('follow-check');
    vi.useFakeTimers(); const panel = shown();
    followJobProgress({ active: () => true, read: async () => ({ status: 'running', job_id: 'older', older: true }),
      busy: () => {}, complete: () => {}, show: panel.show });
    await vi.advanceTimersByTimeAsync(0);
    expect(panel.last()).toMatchObject({ status: 'running', kind: 'linear-dots', total: 0 });
  });
  it('后台阶段说明随轮询更新并保留真实计数', async () => {
    reportRunning('follow-check');
    vi.useFakeTimers(); const panel = shown();
    let state = { status: 'running', job_id: 'taste', checked: 0, total: 3, message: '分析浏览记录：已处理 0 / 3 条' };
    followJobProgress({ active: () => true, read: async () => state, busy: () => {}, complete: () => {},
      title: '读取浏览记录', show: panel.show });
    await vi.advanceTimersByTimeAsync(0);
    expect(text(panel.last())).toContain(state.message);
    state = { ...state, checked: 2, message: '分析浏览记录：已处理 2 / 3 条' };
    await vi.advanceTimersByTimeAsync(4000);
    expect(text(panel.last())).toContain(state.message);
    expect(panel.last()).toMatchObject({ value: 2, total: 3 });
  });
  it('页面重建后恢复来源进度并只接收一次完成回执', async () => {
    reportRunning('follow-check');
    vi.useFakeTimers();
    const complete = vi.fn();
    let alive = true;
    let state = { status: 'running', job_id: 'same', checked: 1, total: 3,
      current: { label: '演示来源', attempt: 3, max_attempts: 5, retry_in: 2 } };
    const mount = (active: () => boolean) => {
      const panel = shown();
      followJobProgress({ active, read: async () => state, busy: () => {}, complete, show: panel.show });
      return panel;
    };
    const first = mount(() => alive); await vi.advanceTimersByTimeAsync(0);
    expect(text(first.last())).toContain('1/3');
    expect(text(first.last())).toContain('第 3/5 次尝试');
    alive = false;
    const fresh = mount(() => true); await vi.advanceTimersByTimeAsync(0);
    expect(text(fresh.last())).toContain('演示来源');
    state = { ...state, status: 'complete', checked: 3 };
    await vi.advanceTimersByTimeAsync(4000);
    expect(complete).toHaveBeenCalledTimes(1);
    expect(fresh.last()).toBeNull();
    expect(sessionStorage.getItem('peach-follow-job')).toBeNull();
  });
  it('连接中断后继续读取相同任务直至终态', async () => {
    const states: string[] = [], waits: number[] = [];
    let calls = 0, failures = 0;
    await watchJob({ active: () => true,
      read: async () => { calls++; if (calls === 2) throw new Error('offline');
        return { status: calls < 3 ? 'running' : 'complete', job_id: 'one' }; },
      render: state => states.push(state.status),
      disconnected: () => { failures++; }, pause: async ms => { waits.push(ms); },
    });
    expect(states).toEqual(['running', 'complete']);
    expect(failures).toBe(1);
    expect(waits).toEqual([2000, 4000]);
  });
  it('离开页面后丢弃在途响应', async () => {
    let active = true, rendered = false;
    await watchJob({ active: () => active,
      read: async () => { active = false; return { status: 'running' }; },
      render: () => { rendered = true; }, disconnected: () => {},
    });
    expect(rendered).toBe(false);
  });
  it('首读恢复只交接一次运行任务', async () => {
    let calls = 0;
    await watchJob({ active: () => true, once: true,
      read: async () => { calls++; return { status: 'running' }; },
      render: () => {}, disconnected: () => {},
    });
    expect(calls).toBe(1);
  });
});

describe('任务进度那一格：闲着不读，有事才跟', () => {
  const panel = (read: () => Promise<{ status: string; job_id?: string }>, complete = vi.fn()) => {
    const view = shown();
    followJobProgress({ active: () => true, read, busy: () => {}, complete, show: view.show });
    return view;
  };

  it('没有记着的任务、全站那一处也没报追更检查时一次也不读；报出后开始跟，跟到终态就停', async () => {
    vi.useFakeTimers();
    let state = { status: 'idle', job_id: 'old' };
    const read = vi.fn(async () => state);
    const complete = vi.fn();
    const view = panel(read, complete);
    await vi.advanceTimersByTimeAsync(60_000);
    expect(read, '闲着的时候不该读').not.toHaveBeenCalled();
    // 别处起的检查不归这一格：全站那一处报出来才开始。
    reportRunning('feed-check');
    await vi.advanceTimersByTimeAsync(10_000);
    expect(read).not.toHaveBeenCalled();
    state = { status: 'running', job_id: 'new' };
    reportRunning('follow-check');
    await vi.advanceTimersByTimeAsync(0);
    expect(read).toHaveBeenCalledTimes(1);
    expect(view.last()).toMatchObject({ status: 'running' });
    await vi.advanceTimersByTimeAsync(2000);
    expect(read).toHaveBeenCalledTimes(2);
    state = { status: 'complete', job_id: 'new' };
    await vi.advanceTimersByTimeAsync(2000);
    expect(complete).toHaveBeenCalledTimes(1);
    const settled = read.mock.calls.length;
    await vi.advanceTimersByTimeAsync(60_000);
    expect(read, '跟完就停').toHaveBeenCalledTimes(settled);
  });

  it('旧服务不报 running_tasks 时进页读一次：闲着就停，不恢复空闲轮询', async () => {
    vi.useFakeTimers();
    queryClient.setQueryData(RESULT_UPDATES_KEY, { result_versions: {} });
    const read = vi.fn(async () => ({ status: 'idle', job_id: 'old' }));
    const view = panel(read);
    await vi.advanceTimersByTimeAsync(0);
    expect(read).toHaveBeenCalledTimes(1);
    expect(view.last()).toBeNull();
    await vi.advanceTimersByTimeAsync(60_000);
    expect(read, '闲着就停').toHaveBeenCalledTimes(1);
  });

  it('不报 running_tasks 的快照晚于页面到达时同样读一次，读到在跑就接着跟到终态', async () => {
    vi.useFakeTimers();
    let state = { status: 'running', job_id: 'elsewhere' };
    const read = vi.fn(async () => state);
    const complete = vi.fn();
    const view = panel(read, complete);
    await vi.advanceTimersByTimeAsync(0);
    expect(read, '快照还没读到时不读').not.toHaveBeenCalled();
    queryClient.setQueryData(RESULT_UPDATES_KEY, { busy: true });
    await vi.advanceTimersByTimeAsync(0);
    expect(read).toHaveBeenCalledTimes(1);
    expect(view.last()).toMatchObject({ status: 'running' });
    await vi.advanceTimersByTimeAsync(2000);
    expect(read).toHaveBeenCalledTimes(2);
    state = { status: 'complete', job_id: 'elsewhere' };
    await vi.advanceTimersByTimeAsync(2000);
    expect(view.last()).toBeNull();
    const settled = read.mock.calls.length;
    await vi.advanceTimersByTimeAsync(60_000);
    expect(read).toHaveBeenCalledTimes(settled);
  });

  it('本页刚发起的那一趟还没出现在状态里时接着读，直到它跑起来', async () => {
    vi.useFakeTimers();
    sessionStorage.setItem('peach-follow-job', 'mine');
    let state = { status: 'complete', job_id: 'earlier' };
    const read = vi.fn(async () => state);
    panel(read);
    await vi.advanceTimersByTimeAsync(0);
    expect(read).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(2000);
    expect(read).toHaveBeenCalledTimes(2);
    state = { status: 'running', job_id: 'mine' };
    await vi.advanceTimersByTimeAsync(2000);
    expect(read).toHaveBeenCalledTimes(3);
  });

  it('页面隐藏时暂停，回到前台再接着读', async () => {
    vi.useFakeTimers();
    let visibility = 'visible';
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => visibility });
    const read = vi.fn(async () => ({ status: 'running', job_id: 'one' }));
    reportRunning('follow-check');
    panel(read);
    await vi.advanceTimersByTimeAsync(0);
    expect(read).toHaveBeenCalledTimes(1);
    visibility = 'hidden';
    await vi.advanceTimersByTimeAsync(60_000);
    expect(read, '隐藏期间不读').toHaveBeenCalledTimes(1);
    visibility = 'visible';
    document.dispatchEvent(new Event('visibilitychange'));
    await vi.advanceTimersByTimeAsync(0);
    expect(read).toHaveBeenCalledTimes(2);
  });
});
