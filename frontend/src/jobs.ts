import { t } from './i18n';
import { jobText } from './core/server-text';
import { backoffMs, visiblePause } from './polling';
import { activityKind, type ActivityKind } from './activity-kinds';
import { FOLLOW_CHECK_TASK, onTaskChange, runningTask, whenTasksUnreported } from './running-tasks';

/** 后台任务查询只重试读状态；启动和写入请求由调用方单次提交。 */
export interface JobState {
  status: string;
  job_id?: string;
  checked?: number;
  total?: number;
  older?: boolean;
  error?: string;
  message?: string;
  /** `message` 与 `error` 的 code 和参数（ADR-0159）；有译文时显示译文。 */
  message_code?: string;
  message_params?: Record<string, unknown>;
  error_code?: string;
  error_params?: Record<string, unknown>;
  current?: { label?: string; provider?: string; attempt?: number;
    max_attempts?: number; retry_in?: number };
}

/** 任务在跑时多久读一次状态。 */
export const JOB_WATCH_MS = 2000;

/** 跟一趟任务到终态：在跑时每 `JOB_WATCH_MS` 读一次，读失败按 4、8、16、30 秒退避，页面不可见时暂停。
 *  `keepWatching` 为真（或按这一份状态返回真）时不在跑也接着读。 */
export async function watchJob<T extends JobState>(options: {
  read: (signal: AbortSignal) => Promise<T>;
  active: () => boolean;
  render: (state: T) => void;
  disconnected: (error: unknown) => void;
  keepWatching?: boolean | ((state: T) => boolean);
  once?: boolean;
  pause?: (ms: number) => Promise<void>;
}): Promise<void> {
  const pause = options.pause || (ms => visiblePause(ms));
  const keep = (state: T) => (typeof options.keepWatching === 'function'
    ? options.keepWatching(state) : !!options.keepWatching);
  let failures = 0;
  while (options.active()) {
    let state: T;
    try {
      state = await options.read(AbortSignal.timeout(15000));
    } catch (error) {
      if (!options.active()) return;
      failures++;
      options.disconnected(error);
      await pause(backoffMs(failures));
      continue;
    }
    if (!options.active()) return;
    failures = 0;
    options.render(state);
    if (options.once) return;
    if (state.status !== 'running' && !keep(state)) return;
    await pause(JOB_WATCH_MS);
  }
}

/** 那一格此刻要画的东西，由页面用 `TaskProgress` 与 `Note` 画，和其他后台任务同一套样子：
 *  在跑时是说明、计数与语义动画类别；读不到、跑失败、记着的那一趟已过期时是一条提示。 */
export type FollowJobView =
  | { status: 'running'; label: string; value: number; total: number; kind: ActivityKind }
  | { status: 'problem'; tone: 'error' | 'warning' | 'neutral'; message: string };

/** 页面上那一格任务进度。闲着不读：本页发起过（`sessionStorage` 里记着在跟的任务号），或全站那一处
 *  （`/api/result-updates` 的 `running_tasks`）报出 `taskKey` 在排在跑时才开始跟，跟到终态就停。
 *  旧服务不报 `running_tasks` 时退回进页读一次：在跑就接着跟，闲着就停，不恢复空闲时的轮询。 */
export function followJobProgress(options: {
  active: () => boolean;
  read: (signal: AbortSignal) => Promise<JobState>;
  busy: (running: boolean) => void;
  complete: (state: JobState) => void;
  /** 画这一格；`null` 是收起。 */
  show: (view: FollowJobView | null) => void;
  storageKey?: string;
  title?: string;
  /** 任务中心登记这种任务用的 `task_key`，默认是追更检查。 */
  taskKey?: string;
}): void {
  const storageKey = options.storageKey || 'peach-follow-job';
  let tracked: string | undefined = sessionStorage.getItem(storageKey) || undefined;
  let settled = false;
  let watching = false;
  const taskKey = options.taskKey || FOLLOW_CHECK_TASK;
  const alive = () => !settled && options.active();
  const follow = () => {
    if (watching || !alive()) return;
    watching = true;
    void watchJob({ read: options.read, active: alive, render, disconnected,
      // 记着的那一趟还没出现在状态里（刚起、还在排）时接着读，等它跑起来或过期。
      keepWatching: () => !!tracked })
      .finally(() => { watching = false });
  };
  const stop = onTaskChange([taskKey], (tasks) => {
    if (!alive()) { stop(); unreported(); return }
    if (runningTask(taskKey, tasks)) follow();
  });
  const unreported = whenTasksUnreported(follow);
  if (tracked || runningTask(taskKey)) follow();
  const finish = () => { settled = true; stop(); unreported() };
  function render(state: JobState) {
    const running = state.status === 'running';
    options.busy(running);
    if (running) {
      tracked = state.job_id;
      if (tracked) sessionStorage.setItem(storageKey, tracked);
      const current = state.current;
      const attempt = (current?.attempt || 1) > 1
        ? ` · ${current?.retry_in
          ? t('manage:jobProgress.attemptRetry', { attempt: current?.attempt, max: current?.max_attempts, count: current.retry_in })
          : t('manage:jobProgress.attempt', { attempt: current?.attempt, max: current?.max_attempts })}` : '';
      const titled = options.title && (state.total
        ? t('manage:jobProgress.titledProgress', { title: options.title, checked: state.checked || 0, total: state.total }) : options.title);
      const label = (jobText(state) || titled || (state.total
        ? t(state.older ? 'manage:jobProgress.historySources' : 'manage:jobProgress.updateSources', { checked: state.checked || 0, count: state.total })
        : t('manage:jobProgress.preparing')))
        + (current ? ` · ${current.label || current.provider || ''}${attempt}` : '');
      // 往回抓是在搬历史条目，算传输；检查更新是在问来源，算检查。
      options.show({ status: 'running', label, value: state.checked || 0, total: state.total || 0,
        kind: state.older ? activityKind('feed-scrape') : activityKind(taskKey) });
    } else if (tracked && tracked === state.job_id) {
      tracked = undefined;
      finish();
      sessionStorage.removeItem(storageKey);
      options.show(state.status === 'failed'
        ? { status: 'problem', tone: 'error', message: jobText(state, 'error') || t('manage:jobProgress.checkFailed') } : null);
      options.complete(state);
    } else {
      if (tracked && state.status === 'idle') {
        options.show({ status: 'problem', tone: 'neutral', message: t('manage:jobProgress.stateExpired') });
        sessionStorage.removeItem(storageKey);
        tracked = undefined;
        finish();
        return;
      }
      options.show(null);
    }
  }
  function disconnected() {
    options.show({ status: 'problem', tone: 'warning', message: t('manage:jobProgress.reconnecting') });
  }
}
