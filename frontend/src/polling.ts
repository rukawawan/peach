/* 轮询的共同节律：失败退避、页面隐藏时暂停、到上限就停。
 *
 * 平时只留全站那一处低频检查（`/api/result-updates`），别的读取由事件触发：任务开始、请求失败、
 * 状态变化。请求失败后按 `backoffMs` 拉长间隔，成功一次就回到常规间隔；页面不可见时不查。
 * TanStack 的 `refetchInterval` 本身在页面隐藏时不发请求，这里补的是失败退避；手写的循环
 * （`watchJob`、`pollUntil`）两样都由这里给。 */

export const BACKOFF_BASE_MS = 2000;
export const BACKOFF_MAX_MS = 30_000;

/** 连着失败第 `failures` 次之后多久再问：4、8、16 秒，之后封顶 30 秒（`watchJob` 一直用的公式）。 */
export const backoffMs = (failures: number): number =>
  Math.min(BACKOFF_BASE_MS * 2 ** Math.min(Math.max(failures, 1), 4), BACKOFF_MAX_MS);

interface PolledState<T> {
  data?: T | undefined;
  status?: string;
  errorUpdateCount?: number;
}

/* Query 每发一次请求就把 `fetchFailureCount` 归零（`retry: 0` 时它只会是 0 或 1），数不出连着
   失败了几次；这里记下最近一次成功时的 `errorUpdateCount`，差值就是这一段连续失败的次数。
   没有数据时重取期间状态回到 `pending`，那不算成功，不归零。 */
const settledErrors = new WeakMap<object, number>();

/** 这个查询从上一次成功算起连着失败了几次；最近一次是成功时为 0。 */
export function failureStreak(query: { state: PolledState<unknown> }): number {
  const { errorUpdateCount = 0, status } = query.state;
  if (status === 'success') {
    settledErrors.set(query, errorUpdateCount);
    return 0;
  }
  if (status !== 'error') return 0;
  return Math.max(1, errorUpdateCount - (settledErrors.get(query) ?? 0));
}

/** 给 TanStack `refetchInterval`：`regular` 按上一份数据给常规间隔（`false` 是不查）；
 *  要查而上一次失败了，按连续失败次数退避，成功一次就回到 `regular`。 */
export function withBackoff<T>(regular: (data: T | undefined) => number | false) {
  return (query: { state: PolledState<T> }): number | false => {
    const interval = regular(query.state.data);
    if (interval === false) return false;
    const failures = failureStreak(query);
    return failures ? backoffMs(failures) : interval;
  };
}

const hidden = () => typeof document !== 'undefined' && document.visibilityState === 'hidden';

/** 等 `ms` 毫秒；到点时页面不可见就接着等到它可见。`signal` 中止时立即返回。 */
export function visiblePause(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    if (signal?.aborted) { resolve(); return }
    const finish = () => {
      clearTimeout(timer);
      document.removeEventListener('visibilitychange', shown);
      signal?.removeEventListener('abort', finish);
      resolve();
    };
    function shown() { if (!hidden()) finish() }
    const timer = setTimeout(() => {
      if (!hidden()) finish();
      else document.addEventListener('visibilitychange', shown);
    }, ms);
    signal?.addEventListener('abort', finish, { once: true });
  });
}

/** 手写的状态循环：隔 `everyMs` 读一次，读到 `done` 为真就停；失败按 `backoffMs` 退避，
 *  页面不可见时暂停，跑满 `limitMs` 也停。先等后读：调用方手里已经有当下那一份。 */
export async function pollUntil<T>(options: {
  read: (signal: AbortSignal) => Promise<T>;
  apply: (value: T) => void;
  done: (value: T) => boolean;
  signal: AbortSignal;
  everyMs: number;
  limitMs?: number;
  failed?: (error: unknown) => void;
  pause?: (ms: number, signal: AbortSignal) => Promise<void>;
}): Promise<void> {
  const { signal } = options;
  const pause = options.pause || visiblePause;
  const deadline = options.limitMs ? Date.now() + options.limitMs : Infinity;
  let failures = 0;
  while (!signal.aborted && Date.now() < deadline) {
    await pause(failures ? backoffMs(failures) : options.everyMs, signal);
    if (signal.aborted) return;
    let value: T;
    try {
      value = await options.read(signal);
    } catch (error) {
      if (signal.aborted) return;
      failures += 1;
      options.failed?.(error);
      continue;
    }
    if (signal.aborted) return;
    failures = 0;
    options.apply(value);
    if (options.done(value)) return;
  }
}
