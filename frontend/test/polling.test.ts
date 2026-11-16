/* 轮询的共同节律：失败退避、恢复后回到常规间隔、页面隐藏时暂停、到上限就停。 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { QueryClient, QueryObserver } from '@tanstack/query-core';

import { backoffMs, failureStreak, pollUntil, visiblePause, withBackoff } from '../src/polling';

let visibility = 'visible';
Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => visibility });
afterEach(() => { vi.useRealTimers(); visibility = 'visible' });

describe('退避间隔', () => {
  it('连着失败按 4、8、16 秒拉长，封顶 30 秒', () => {
    expect([1, 2, 3, 4, 5, 9].map(backoffMs)).toEqual([4000, 8000, 16_000, 30_000, 30_000, 30_000]);
  });

  it('Query 的连续失败次数按上一次成功起算，成功一次就归零', async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: 0 } } });
    let fail = true;
    const query = () => client.getQueryCache().find({ queryKey: ['x'] })!;
    const fetchOnce = () => client.fetchQuery({ queryKey: ['x'], staleTime: 0,
      queryFn: async () => { if (fail) throw new Error('down'); return 1 } }).catch(() => undefined);
    await fetchOnce();
    expect(failureStreak(query())).toBe(1);
    await fetchOnce();
    await fetchOnce();
    expect(failureStreak(query())).toBe(3);
    fail = false;
    await fetchOnce();
    expect(failureStreak(query())).toBe(0);
    fail = true;
    await fetchOnce();
    expect(failureStreak(query()), '恢复后的下一次失败从 1 数起').toBe(1);
  });

  it('`withBackoff` 不查时照旧不查；要查时失败退避，成功回到常规间隔', () => {
    const interval = withBackoff<{ busy: boolean }>((data) => (data?.busy ? 5000 : false));
    const at = (state: object) => interval({ state } as never);
    expect(at({ data: { busy: false }, status: 'success' })).toBe(false);
    expect(at({ data: { busy: true }, status: 'success' })).toBe(5000);
    expect(at({ data: { busy: true }, status: 'error', errorUpdateCount: 2 })).toBe(8000);
    expect(at({ data: { busy: false }, status: 'error', errorUpdateCount: 2 })).toBe(false);
  });

  it('TanStack 观察者按退避间隔重取，读到了回到常规间隔', async () => {
    vi.useFakeTimers();
    const client = new QueryClient({ defaultOptions: { queries: { retry: 0 } } });
    let fail = true;
    const read = vi.fn(async () => { if (fail) throw new Error('down'); return { busy: true } });
    const observer = new QueryObserver(client, { queryKey: ['y'], queryFn: read,
      refetchInterval: withBackoff<{ busy: boolean }>(() => 2000) });
    const stop = observer.subscribe(() => {});
    await vi.advanceTimersByTimeAsync(0);
    expect(read).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(4000);
    expect(read).toHaveBeenCalledTimes(2);
    await vi.advanceTimersByTimeAsync(8000);
    expect(read).toHaveBeenCalledTimes(3);
    fail = false;
    await vi.advanceTimersByTimeAsync(16_000);
    expect(read).toHaveBeenCalledTimes(4);
    await vi.advanceTimersByTimeAsync(2000);
    expect(read, '恢复后回到两秒').toHaveBeenCalledTimes(5);
    stop();
  });
});

describe('手写的状态循环', () => {
  it('先等后读，读到终态就停', async () => {
    vi.useFakeTimers();
    const states = ['running', 'running', 'done'];
    const read = vi.fn(async () => states.shift()!);
    const applied: string[] = [];
    const finished = pollUntil({ signal: new AbortController().signal, everyMs: 1500, read,
      apply: (value) => applied.push(value), done: (value) => value === 'done' });
    await vi.advanceTimersByTimeAsync(1499);
    expect(read).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    expect(read).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(3000);
    await finished;
    expect(applied).toEqual(['running', 'running', 'done']);
    await vi.advanceTimersByTimeAsync(30_000);
    expect(read).toHaveBeenCalledTimes(3);
  });

  it('读失败按退避等，读到了回到常规间隔', async () => {
    const waits: number[] = [];
    let calls = 0;
    const failed = vi.fn();
    await pollUntil({ signal: new AbortController().signal, everyMs: 2000,
      pause: async (ms) => { waits.push(ms) },
      read: async () => { calls += 1; if (calls <= 3) throw new Error('down'); return calls },
      apply: () => {}, done: (value) => value >= 5, failed });
    expect(waits).toEqual([2000, 4000, 8000, 16_000, 2000]);
    expect(failed).toHaveBeenCalledTimes(3);
  });

  it('跑满上限或中止就停', async () => {
    vi.useFakeTimers();
    const read = vi.fn(async () => 'running');
    const controller = new AbortController();
    void pollUntil({ signal: controller.signal, everyMs: 1000, limitMs: 5000, read, apply: () => {}, done: () => false });
    await vi.advanceTimersByTimeAsync(60_000);
    expect(read.mock.calls.length).toBeLessThanOrEqual(5);
    const aborted = vi.fn(async () => 'running');
    const other = new AbortController();
    void pollUntil({ signal: other.signal, everyMs: 1000, read: aborted, apply: () => {}, done: () => false });
    await vi.advanceTimersByTimeAsync(1000);
    other.abort();
    await vi.advanceTimersByTimeAsync(10_000);
    expect(aborted).toHaveBeenCalledTimes(1);
  });

  it('页面隐藏时不读，回到前台才接着读', async () => {
    vi.useFakeTimers();
    const read = vi.fn(async () => 'running');
    void pollUntil({ signal: new AbortController().signal, everyMs: 1000, read, apply: () => {}, done: () => false });
    visibility = 'hidden';
    await vi.advanceTimersByTimeAsync(60_000);
    expect(read).not.toHaveBeenCalled();
    visibility = 'visible';
    document.dispatchEvent(new Event('visibilitychange'));
    await vi.advanceTimersByTimeAsync(0);
    expect(read).toHaveBeenCalledTimes(1);
  });

  it('`visiblePause` 中止时立即返回', async () => {
    const controller = new AbortController();
    const waiting = visiblePause(60_000, controller.signal);
    controller.abort();
    await expect(waiting).resolves.toBeUndefined();
  });
});
