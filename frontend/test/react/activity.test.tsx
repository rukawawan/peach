/* 活动页的行为：三段怎么分、轮询多久一次、失败时留下什么。
 *
 * 外观（状态徽章的三档颜色、失败卡的框线）是设计决定，由 `frontend/e2e/design-*.test.ts`
 * 读 `getComputedStyle` 断言；这里只看结构、文字与请求。 */
import { act } from 'react';
import { notifyManager, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, expect, it, vi } from 'vitest';

import { ActivityPage } from '../../src/react/activity/activity-page';
import { BACKGROUND_ISSUES_URL, type BackgroundIssue } from '../../src/react/activity/background-issues';
import { DOWNLOADS_URL } from '../../src/react/activity/downloads-panel';
import { ErrorExcerpt } from '../../src/react/activity/error-excerpt';
import {
  elapsedText, errorHeadline, followupDetail, hasResultProblems, isRoutine, prefetchTasks, progressText, summaryItems, summaryText, TASKS_URL,
} from '../../src/react/activity/tasks';
import type { ActivityData, FinishedPage, TaskResourcesPayload, TaskRunPayload } from '../../src/react/activity/tasks';
import type { DownloadsSnapshot } from '../../src/react/bundle';
import { queryClient } from '../../src/react/query';

import { buttonNamed, click, mount, mountRoot, pending, settle } from './render';

vi.mock('@peach/legacy/ui', async (original) => ({
  ...await original<typeof import('@peach/legacy/ui')>(),
  confirmModal: (await import('../../src/ui-kit/modal')).confirmModal,
}));

// 客户端是模块级的单例（所有 React 根共用一个），用例之间不清就互相喂数据。
afterEach(() => queryClient.clear());

/* Query 派发更新用的是它自己抓住的那个真 `setTimeout(0)`，假时钟推不动它：推完时钟
   断言到的还是上一帧的 DOM。用例里改成当场派发。 */
notifyManager.setScheduler((notify) => notify());

const run = (overrides: Partial<TaskRunPayload> = {}): TaskRunPayload => ({
  id: 1,
  task_key: 'follow-check',
  task_label: '追更检查',
  trigger: 'manual',
  status: 'running',
  host: 'desk',
  started_at: '2026-09-11T10:00:00Z',
  finished_at: null,
  elapsed_seconds: 75,
  progress_current: 3,
  progress_total: 12,
  progress_label: '正在查第三个来源',
  result_summary: {},
  error: '',
  parent_run_id: null,
  root_run_id: null,
  followup_key: '',
  followup_depth: 0,
  ...overrides,
});

/** 一条后继（ADR-0040）：跑完的一行，挂在 `parent` 那一轮下面。 */
const followup = (parent: number, overrides: Partial<TaskRunPayload> = {}): TaskRunPayload =>
  run({
    id: 90, task_key: 'entity-avatar', task_label: '资料图片补全', status: 'succeeded',
    progress_total: null, progress_current: null, progress_label: '资料图片补全：涼森れむ',
    finished_at: '2026-09-11T10:04:00Z', parent_run_id: parent, root_run_id: parent,
    followup_key: 'entity-avatar:performer:12', followup_depth: 1,
    result_summary: { outcome: '已装上' }, ...overrides,
  });

const payload = (overrides: Partial<ActivityData> = {}): ActivityData => ({
  available: true, running: [], skipped: [], finished: [], ...overrides,
});
const resources = (overrides: Partial<TaskResourcesPayload> = {}): TaskResourcesPayload => ({
  cpu: { state: 'ready', percent: 12.5, high: false },
  gpu: { state: 'ready', percent: 0, high: false },
  network: { state: 'ready', bytes_per_second: 2 * 1024 * 1024, high: false },
  sampled_at: '2026-10-31T08:00:00Z', ...overrides,
});

/* 云下载段自己取 `/api/downloads`，「需要处理」自己取 `/api/background-issues`。这里的用例只数
   任务中心的请求，那两路另答：云下载回空表、后台问题回 `issues` 当前那一份（默认没有），两段就不画。 */
const DOWNLOADS_IDLE: DownloadsSnapshot = { available: true, providers: [], tasks: [] };
let issues: BackgroundIssue[] = [];
const issuePosts: string[] = [];
afterEach(() => { issues = []; issuePosts.length = 0 });
function stubFetch(tasks: (input: string, init?: RequestInit) => Promise<unknown>) {
  vi.stubGlobal('fetch', (input: string, init?: RequestInit) => {
    if (input.startsWith(DOWNLOADS_URL)) return Promise.resolve({ ok: true, status: 200, json: async () => DOWNLOADS_IDLE });
    if (input.startsWith(BACKGROUND_ISSUES_URL)) return Promise.resolve({ ok: true, status: 200, json: async () => ({ issues }) });
    if (input.endsWith('/schedule/run')) {
      issuePosts.push(input);
      issues = issues.filter((issue) => issue.retry !== input);
      return Promise.resolve({ ok: true, status: 200, json: async () => ({ running: true }) });
    }
    return tasks(input, init);
  });
}

/** 依次回这几份数据，最后一份之后一直回它。`null` 那一份回 500。 */
function serve(...responses: (ActivityData | null)[]) {
  let at = 0;
  const fetcher = vi.fn(async (_input: string, _init?: RequestInit) => {
    const body = responses[Math.min(at, responses.length - 1)] ?? null;
    at += 1;
    return body
      ? { ok: true, status: 200, json: async () => body }
      : { ok: false, status: 500, json: async () => ({ message: '数据库当前只能浏览' }) };
  });
  stubFetch(fetcher);
  return fetcher;
}

const page = () => <QueryClientProvider client={queryClient}><ActivityPage /></QueryClientProvider>;
const controlButton = (name: string, root: ParentNode = document) =>
  root.querySelector<HTMLButtonElement>(`button[aria-label="${name}"]`);
const confirmTaskCancellation = () => click(document.querySelector('[data-modal-confirm]'));

it('扫描各阶段已结束且留有问题时显示部分结果状态', async () => {
  serve(payload({ finished: [run({ task_key: 'library-processing', task_label: '扫描与采集',
    status: 'failed', finished_at: '2026-09-11T10:04:00Z',
    result_summary: { outcome: 'partial', issue_count: 2 }, error: '2 项需要处理' })] }));
  const host = await mount(page());
  expect(host.textContent).toContain('部分项目需处理');
  expect(host.textContent).toContain('2 项需要处理');
  expect(host.querySelector('[data-task-key="library-processing"] > div > ul')?.textContent).not.toContain('partial');
});

it('追更检查的问题详情绑定任务快照并提供来源入口', async () => {
  serve(payload({ finished: [run({ status: 'succeeded', result_summary: { source_failed: 1,
    issues: [{ source: 7, label: '示例作者', provider: '示例站点', kind: '检查失败', error: 'HTTP 403' }] } })] }));
  await prefetchTasks(new AbortController().signal);
  const host = await mount(page());
  expect(host.querySelector('[data-task-issues]')?.textContent).toContain('示例作者 · 示例站点 · 检查失败');
  expect(host.querySelector('[data-task-issues]')?.textContent).toContain('HTTP 403');
  expect(host.querySelector('[data-task-issues]')?.closest('details')?.open).toBe(false);
  expect(host.querySelector('a[href="/subscriptions"]')?.textContent).toContain('查看关注来源');
});

it('扫描与采集只有最新那一轮失败才去卡片上重试未完成项', async () => {
  const scan = (overrides: Partial<TaskRunPayload>) => run({ task_key: 'library-processing', task_label: '扫描与采集',
    status: 'failed', progress_total: null, error: '768 项需要处理，其中 533 项是来源限流，等一会儿再跑；其余可重试未完成的部分。',
    ...overrides });
  // 卡片上的失败集合只属于最新那一轮：更早的失败点过去对不上任何东西。
  serve(payload({ finished: [
    scan({ id: 5, finished_at: '2026-09-11T10:05:00Z' }),
    scan({ id: 4, status: 'succeeded', error: '', finished_at: '2026-09-11T09:05:00Z' }),
    scan({ id: 3, finished_at: '2026-09-11T08:05:00Z' }),
    // amane 桥的处理入口在页顶「需要处理」那一行，卡上不放。
    run({ id: 2, task_key: 'amane-bridge', task_label: 'amane 桥重建', status: 'failed',
          progress_total: null, finished_at: '2026-09-11T07:05:00Z', error: '重建未完成' }),
  ] }));
  await prefetchTasks(new AbortController().signal);
  const host = await mount(page());
  const links = [...host.querySelectorAll('[data-task-key=library-processing] a, [data-task-key=amane-bridge] a')];
  expect(links.map((link) => [link.closest('[data-run-id]')?.getAttribute('data-run-id'),
    link.getAttribute('href'), link.textContent])).toEqual([['5', '/data-cleanup#libraryProcessing', '查看未完成项']]);
});

/** 走完真实的首屏路径：先 prefetch 落进缓存，再挂载。 */
async function open(...responses: (ActivityData | null)[]) {
  const fetcher = serve(...responses);
  await prefetchTasks(new AbortController().signal).catch(() => {});
  return { fetcher, host: await mount(page()) };
}

const sections = (host: HTMLElement) => [...host.querySelectorAll('section')]
  .map((section) => section.querySelector('h3')?.textContent);

/** 轮询是组件里的定时器，推进时钟会引起重画，得在 act 里推。 */
const tick = (ms: number) => act(async () => { await vi.advanceTimersByTimeAsync(ms) });

it('首屏用 prefetch 落进缓存的那一份画出来，挂载时不再请求一次', async () => {
  const { fetcher, host } = await open(payload({ running: [run()] }));
  expect(fetcher).toHaveBeenCalledTimes(1);
  expect(fetcher.mock.calls[0]?.[0]).toBe(TASKS_URL);
  expect(host.querySelector('[data-task-key=follow-check]')).not.toBeNull();
});

const issue = (overrides: Partial<BackgroundIssue> = {}): BackgroundIssue => ({
  key: 'tunnel', title: '公网入口连接失败', href: '/settings/network#tunnel', link_label: '打开公网入口设置',
  since: null, noticed_at: '2026-10-22T07:00:00Z', retry: null, retry_available: false, ...overrides,
});

it('后台问题排在最前，每项只写是什么、从什么时候起和写明去处的链接，能原地修的另给立即重试', async () => {
  issues = [
    issue(),
    issue({ key: 'follow-schedule', title: '关注自动检查失败', href: '/settings/subscriptions#followScheduleSetting',
      link_label: '打开关注调度', since: '2026-10-22T06:00:00Z', retry: '/api/follow/schedule/run', retry_available: true }),
  ];
  const { host } = await open(payload({ running: [run()] }));
  await vi.waitFor(() => { if (!host.querySelector('[role="alert"]')) throw new Error('需要处理还没画出来') });
  expect(sections(host)).toEqual(['需要处理', '正在进行']);
  const [tunnel, follow] = [...host.querySelectorAll('[role="alert"]')];
  expect(tunnel?.textContent).toContain('公网入口连接失败');
  expect(tunnel?.textContent).toContain('发现于');
  expect(tunnel?.querySelector('a')?.getAttribute('href')).toBe('/settings/network#tunnel');
  expect(tunnel?.querySelector('a')?.textContent).toContain('打开公网入口设置');
  expect(buttonNamed('立即重试', tunnel!)).toBeNull();
  expect(follow?.textContent).toContain('自 ');
  expect(follow?.textContent).toContain(' 起');
  // 任务卡带锚点，「查看失败记录」这类链接能滚到那张卡。
  expect(host.querySelector('#run-1')?.getAttribute('data-run-id')).toBe('1');
  // 链接在左、重试在右。
  const [first, second] = [...follow!.querySelectorAll('[data-note-action] a, [data-note-action] button')];
  expect([first?.textContent, second?.textContent]).toEqual([expect.stringContaining('打开关注调度'), '立即重试']);

  await click(buttonNamed('立即重试', follow!));
  await vi.waitFor(() => { if (host.querySelectorAll('[role="alert"]').length !== 1) throw new Error('重试后那一项还在') });
  expect(issuePosts).toEqual(['/api/follow/schedule/run']);
});

it('没有后台问题时不画「需要处理」', async () => {
  const { host } = await open(payload());
  await settle();
  expect(host.textContent).not.toContain('需要处理');
  expect(host.querySelector('[role="alert"]')).toBeNull();
});

it('在跑的那一轮给出真实计数的进度条与已跑时长', async () => {
  const { host } = await open(payload({ running: [run()] }));
  const bar = host.querySelector('[role=progressbar]')!;
  expect(bar.getAttribute('aria-valuenow')).toBe('3');
  expect(bar.getAttribute('aria-valuemax')).toBe('12');
  expect(host.textContent).toContain('3 / 12 项');
  expect(host.textContent).toContain('已跑 1 分 15 秒');
  expect(host.querySelector('strong')?.textContent).toBe('追更检查');
});

it('总量未知时不画假进度条，只说正在做什么', async () => {
  const { host } = await open(payload({ running: [run({ progress_total: null, progress_current: null })] }));
  expect(host.querySelector('[role=progressbar]')).toBeNull();
  expect(host.querySelector('[role=status]')?.textContent).toContain('正在查第三个来源');
});

it('活动主任务和后继持续显示各自的CPU、GPU与实测网速', async () => {
  const child = followup(1, { status: 'running', resources: resources({
    cpu: { state: 'ready', percent: 3, high: false },
    network: { state: 'ready', bytes_per_second: 1024, high: false },
  }) });
  const { host } = await open(payload({ running: [run({ resources: resources() }), child] }));
  const main = host.querySelector('[data-task-resources="1"]')!;
  const nested = host.querySelector('[data-task-resources="90"]')!;
  expect(main.querySelector('[data-task-resource="cpu"]')?.textContent).toBe('CPU 12.5%');
  expect(main.querySelector('[data-task-resource="gpu"]')?.textContent).toBe('GPU 未使用');
  expect(main.querySelector('[data-task-resource="network"]')?.textContent).toBe('网络 2 MB/s');
  expect(nested.querySelector('[data-task-resource="cpu"]')?.textContent).toBe('CPU 3%');
  expect(nested.querySelector('[data-task-resource="network"]')?.textContent).toBe('网络 1 KB/s');
  expect(main.querySelector('[data-task-resource="cpu"]')?.getAttribute('title')).toContain('容器按可见 CPU 配额计算');
  expect(main.querySelector('[data-task-resource="gpu"]')?.getAttribute('title')).toContain('最忙的 GPU 引擎');
  expect(main.querySelector('[data-task-resource="network"]')?.getAttribute('title')).toContain('该任务已观测的下载速度');
  expect([...main.querySelectorAll('[data-task-resource]')].every(node => node.getAttribute('tabindex') === '0')).toBe(true);
});

it('资源采样中和未取得分别显示，原因优先说明，不把null填成零', async () => {
  const { host } = await open(payload({ running: [run({ resources: resources({
    cpu: { state: 'sampling', percent: null, high: false, reason: '正在建立采样基线' },
    gpu: { state: 'unavailable', percent: null, high: false, reason: '当前系统无法归属GPU引擎' },
    network: { state: 'unavailable', bytes_per_second: null, high: false, reason: '挂载盘传输无法准确归属' },
  }) })] }));
  const metrics = host.querySelector('[data-task-resources="1"]')!;
  expect(metrics.querySelector('[data-task-resource="cpu"]')?.textContent).toBe('CPU 采样中');
  expect(metrics.querySelector('[data-task-resource="gpu"]')?.textContent).toBe('GPU 未取得');
  expect(metrics.querySelector('[data-task-resource="network"]')?.textContent).toBe('网络 未取得');
  expect(metrics.textContent).not.toContain('0%');
  expect(metrics.textContent).not.toContain('0 B/s');
  expect(metrics.querySelector('[data-task-resource="network"]')?.getAttribute('title')).toMatch(/^挂载盘传输无法准确归属/);
});

it('从网盘挂载读取时网络写网盘读取，仍不报告零值', async () => {
  const { host } = await open(payload({ running: [run({ resources: resources({
    network: { state: 'unavailable', bytes_per_second: null, high: false, via: 'cloud',
      reason: '网盘挂载的缓存与预读无法按任务取得实际网速' },
  }) })] }));
  const network = host.querySelector('[data-task-resources="1"] [data-task-resource="network"]')!;
  expect(network.textContent).toBe('网络 网盘读取');
  expect(network.hasAttribute('data-resource-idle')).toBe(false);
  expect(network.getAttribute('title')).toMatch(/^网盘挂载的缓存与预读/);
});

it('真实零读数写成未使用，高占用由该指标的真实high状态强调', async () => {
  const { host } = await open(payload({ running: [run({ resources: resources({
    cpu: { state: 'ready', percent: 0, high: false },
    gpu: { state: 'ready', percent: 70.1, high: true },
    network: { state: 'ready', bytes_per_second: 0, high: false },
  }) })] }));
  const metrics = host.querySelector('[data-task-resources="1"]')!;
  expect(metrics.querySelector('[data-task-resource="cpu"]')?.textContent).toBe('CPU 未使用');
  expect(metrics.querySelector('[data-task-resource="network"]')?.textContent).toBe('网络 未使用');
  expect(metrics.querySelector('[data-task-resource="cpu"]')?.hasAttribute('data-resource-idle')).toBe(true);
  const gpu = metrics.querySelector('[data-task-resource="gpu"]')!;
  expect(gpu.textContent).toBe('GPU 70.1%');
  expect(gpu.getAttribute('title')).toContain('当前为高占用');
  expect(gpu.getAttribute('data-resource-high')).toBe('true');
  expect(metrics.querySelector('[data-task-resource="cpu"]')?.hasAttribute('data-resource-high')).toBe(false);
});

it('父任务已结束而后继仍在活动时展示后端聚合读数，历史终态不展示旧采样', async () => {
  const parent = run({ id: 1, status: 'succeeded', resources: resources({ detail: '统计这轮仍在活动的全部后继' }) });
  const historical = run({ id: 2, status: 'cancelled', resources: resources() });
  const { host } = await open(payload({ running: [followup(1, { status: 'pending' })],
    finished: [parent, historical], followup_counts: { '1': { pending: 100 } } }));
  expect(host.querySelector('[data-task-resources="1"]')).not.toBeNull();
  expect(host.querySelector('[data-task-resources="1"] [data-task-resource="cpu"]')?.getAttribute('title'))
    .toContain('全部后继');
  expect(host.querySelector('[data-task-resources="2"]')).toBeNull();
});

it('旧快照未提供resources时不伪造资源指标', async () => {
  const { host } = await open(payload({ running: [run()] }));
  expect(host.querySelector('[data-task-resources]')).toBeNull();
});

it('活动任务按服务端给出的动作暂停、继续和取消，并重新读取进度', async () => {
  const posts: [string, unknown][] = [];
  let current = run({ control: { state: 'running', actions: ['pause', 'cancel'] } });
  stubFetch(async (input, init) => {
    if (init?.method === 'POST') {
      const body = JSON.parse(String(init.body));
      posts.push([input, body]);
      current = body.action === 'pause'
        ? { ...current, control: { state: 'paused', actions: ['resume', 'cancel'] } }
        : body.action === 'resume'
          ? { ...current, control: { state: 'running', actions: ['pause', 'cancel'] } }
          : { ...current, control: { state: 'cancelling', actions: [] } };
    }
    return { ok: true, status: 200, json: async () => payload({ running: [current] }) };
  });
  await prefetchTasks(new AbortController().signal);
  const host = await mount(page());
  await click(controlButton('暂停', host));
  await vi.waitFor(() => expect(controlButton('继续', host)).not.toBeNull());
  expect(host.querySelector('[data-run-id="1"]')?.textContent).toContain('已暂停');
  expect(host.querySelector('[role="progressbar"]')?.getAttribute('aria-valuenow')).toBe('3');
  await click(controlButton('继续', host));
  await vi.waitFor(() => expect(controlButton('暂停', host)).not.toBeNull());
  await click(controlButton('取消', host));
  await confirmTaskCancellation();
  await vi.waitFor(() => expect(host.querySelector('[data-run-id="1"]')?.textContent).toContain('正在取消'));
  expect(host.textContent).not.toContain('已取消');
  expect(host.querySelector('[data-task-controls]')).toBeNull();
  expect(posts).toEqual([
    ['/api/tasks/1/control', { action: 'pause' }],
    ['/api/tasks/1/control', { action: 'resume' }],
    ['/api/tasks/1/control', { action: 'cancel' }],
  ]);
});

it('主任务和后继使用带准确名称、提示和编辑键的图标控制', async () => {
  const child = followup(1, { status: 'running', finished_at: null,
    control: { state: 'paused', actions: ['resume', 'cancel'] } });
  const { host } = await open(payload({ running: [run({ control: { state: 'running', actions: ['pause', 'cancel'] } }), child] }));
  for (const [identity, labels] of [[1, ['暂停', '取消']], [90, ['继续', '取消']]] as const) {
    const controls = host.querySelector(`[data-task-controls="${identity}"]`)!;
    for (const label of labels) {
      const button = controlButton(label, controls)!;
      expect(button).not.toBeNull();
      expect(button.textContent).toBe('');
      expect(button.querySelector('svg')).not.toBeNull();
      expect(button.getAttribute('title')).toBe(label);
      expect(button.getAttribute('data-tooltip-copy-key')).toMatch(/^tasks\.control\.action\./);
      expect(button.hasAttribute('data-copy-key')).toBe(false);
    }
  }
});

it('取消任务先复用确认框，初始聚焦取消，未确认或关闭弹窗都不提交', async () => {
  const posts: unknown[] = [];
  const current = run({ control: { state: 'running', actions: ['pause', 'cancel'] } });
  stubFetch(async (_input, init) => {
    if (init?.method === 'POST') posts.push(JSON.parse(String(init.body)));
    return { ok: true, status: 200, json: async () => payload({ running: [current] }) };
  });
  await prefetchTasks(new AbortController().signal);
  const host = await mount(page());
  await click(controlButton('取消', host));
  const dialog = document.querySelector<HTMLDialogElement>('dialog')!;
  expect(dialog.open).toBe(true);
  expect(dialog.querySelector('h3')?.textContent).toBe('取消任务「追更检查」');
  expect(dialog.textContent).toContain('已保存的资料和结果会保留');
  expect(dialog.textContent).toContain('取消后不能继续');
  expect(document.activeElement).toBe(dialog.querySelector('[data-modal-cancel]'));
  expect(posts).toEqual([]);
  await click(dialog.querySelector('[data-modal-cancel]'));
  expect(document.querySelector('dialog')).toBeNull();
  expect(posts).toEqual([]);
  await click(controlButton('取消', host));
  await confirmTaskCancellation();
  await vi.waitFor(() => expect(posts).toEqual([{ action: 'cancel' }]));
  await vi.waitFor(() => expect(document.querySelector('dialog')).toBeNull());
});

it('确认取消的请求忙态阻止重复提交，失败留在弹窗内供重试', async () => {
  const answer = pending<{ ok: boolean; status: number; json: () => Promise<unknown> }>();
  let attempts = 0;
  const current = run({ control: { state: 'running', actions: ['pause', 'cancel'] } });
  stubFetch(async (_input, init) => {
    if (init?.method === 'POST') {
      attempts += 1;
      return attempts === 1 ? answer.answer : { ok: true, status: 200, json: async () => ({ ok: true }) };
    }
    return { ok: true, status: 200, json: async () => payload({ running: [current] }) };
  });
  await prefetchTasks(new AbortController().signal);
  const host = await mount(page());
  await click(controlButton('取消', host));
  const dialog = document.querySelector<HTMLDialogElement>('dialog')!;
  const confirm = dialog.querySelector<HTMLButtonElement>('[data-modal-confirm]')!;
  await click(confirm);
  expect(confirm.getAttribute('aria-busy')).toBe('true');
  expect(confirm.hasAttribute('disabled')).toBe(false);
  await click(confirm);
  await click(dialog.querySelector('[data-modal-cancel]'));
  expect(attempts).toBe(1);
  expect(dialog.open).toBe(true);
  await answer.release({ ok: false, status: 409, json: async () => ({ message: '任务暂时无法停止' }) });
  await vi.waitFor(() => expect(dialog.querySelector('[data-modal-error]')?.textContent).toContain('任务暂时无法停止'));
  expect(dialog.open).toBe(true);
  await click(confirm);
  await vi.waitFor(() => expect(attempts).toBe(2));
  await vi.waitFor(() => expect(document.querySelector('dialog')).toBeNull());
});

it('已结束父任务的取消确认明确覆盖全部正在处理和排队的后继', async () => {
  const parent = run({ status: 'succeeded', control: { state: 'paused', actions: ['resume', 'cancel'] } });
  const child = followup(1, { status: 'pending', finished_at: null });
  const { fetcher, host } = await open(payload({ running: [child], finished: [parent],
    followup_counts: { '1': { pending: 1200 } } }));
  await click(controlButton('取消后续任务', host));
  const dialog = document.querySelector<HTMLDialogElement>('dialog')!;
  expect(dialog.querySelector('h3')?.textContent).toBe('取消「追更检查」的全部后续任务');
  expect(dialog.textContent).toContain('全部后续任务，包括正在处理和排队的项目');
  expect(dialog.querySelector('[data-modal-confirm]')?.textContent).toBe('取消后续任务');
  expect(fetcher.mock.calls.filter(([, init]) => init?.method === 'POST')).toHaveLength(0);
  await click(dialog.querySelector('[data-modal-cancel]'));
});

it.each(['pause', 'resume'] as const)('取消优先于在途的 %s 请求，迟到回执不覆盖真实取消结果', async (action) => {
  const changeResponse = pending<{ ok: boolean; status: number; json: () => Promise<unknown> }>();
  const cancelResponse = pending<{ ok: boolean; status: number; json: () => Promise<unknown> }>();
  const posts: string[] = [];
  let current = run({ control: { state: action === 'pause' ? 'running' : 'paused', actions: [action, 'cancel'] } });
  stubFetch(async (_input, init) => {
    if (init?.method === 'POST') {
      const body = JSON.parse(String(init.body));
      posts.push(body.action);
      return body.action === 'cancel' ? cancelResponse.answer : changeResponse.answer;
    }
    return { ok: true, status: 200, json: async () => payload(current.status === 'cancelled'
      ? { finished: [current] } : { running: [current] }) };
  });
  await prefetchTasks(new AbortController().signal);
  const host = await mount(page());
  await click(controlButton(action === 'pause' ? '暂停' : '继续', host));
  expect(controlButton('取消', host)?.getAttribute('aria-disabled')).toBeNull();
  await click(controlButton('取消', host));
  expect(posts).toEqual([action]);
  await confirmTaskCancellation();
  expect(posts).toEqual([action, 'cancel']);
  current = { ...current, control: { state: 'cancelling', actions: [] } };
  await cancelResponse.release({ ok: true, status: 200, json: async () => ({ ok: true }) });
  await vi.waitFor(() => expect(host.querySelector('#run-1')?.textContent).toContain('正在取消'));
  expect(host.querySelector('#run-1')?.getAttribute('data-status')).toBe('running');
  current = { ...current, status: 'cancelled', control: undefined, finished_at: '2026-10-31T07:00:00Z' };
  await changeResponse.release({ ok: false, status: 409,
    json: async () => ({ message: '任务正在取消，不能再暂停或继续' }) });
  await vi.waitFor(() => expect(host.querySelector('#run-1')?.getAttribute('data-status')).toBe('cancelled'));
  expect(host.querySelector('#run-1')?.textContent).toContain('已取消');
  expect(host.querySelector('[data-task-control-feedback]')).toBeNull();
  expect(sections(host)).toContain('最近完成');
});

it('取消请求未被接受时，任务自然完成和原卡卸载后仍保留原因', async () => {
  const response = pending<{ ok: boolean; status: number; json: () => Promise<unknown> }>();
  let current = run({ control: { state: 'running', actions: ['pause', 'cancel'] } });
  stubFetch(async (_input, init) => {
    if (init?.method === 'POST') return response.answer;
    return { ok: true, status: 200, json: async () => payload(current.status === 'succeeded'
      ? { finished: [current] } : { running: [current] }) };
  });
  await prefetchTasks(new AbortController().signal);
  const host = await mount(page());
  await click(controlButton('取消', host));
  await confirmTaskCancellation();
  current = { ...current, status: 'succeeded', control: undefined, finished_at: '2026-10-31T07:00:00Z' };
  await act(async () => { await queryClient.invalidateQueries({ queryKey: ['tasks'] }) });
  expect(host.querySelector('[data-task-controls]')).toBeNull();
  await response.release({ ok: false, status: 409, json: async () => ({ message: '这轮任务已经结束' }) });
  await vi.waitFor(() => expect(host.querySelector('[data-task-control-feedback]')?.textContent).toContain('取消未完成'));
  expect(host.querySelector('[data-task-control-feedback]')?.textContent).toContain('这轮任务已经结束');
  expect(host.querySelector('#run-1')?.textContent).toContain('已完成');
  expect(host.querySelector('#run-1')?.textContent).not.toContain('已取消');
});

it('父任务的后继取消后在卡片上直接显示取消状态及数量', async () => {
  const parent = run({ status: 'succeeded', finished_at: '2026-10-31T07:00:00Z' });
  const child = followup(parent.id, { status: 'cancelled' });
  const { host } = await open(payload({ finished: [parent, child], followup_counts: { '1': { cancelled: 120 } } }));
  const card = host.querySelector('#run-1')!;
  expect(card.textContent).toContain('后续任务已取消');
  expect(card.textContent).toContain('后续任务已取消 120 项');
  expect(card.querySelector('details')?.open).toBe(false);
  expect(card.querySelector('[data-task-controls]')).toBeNull();
  expect(card.getAttribute('data-status')).toBe('succeeded');
});

it.each([
  ['pausing', '正在暂停', ['resume', 'cancel']],
  ['paused', '已暂停', ['resume', 'cancel']],
  ['cancelling', '正在取消', []],
] as const)('未知总量的任务处于 %s 时展示真实状态，不显示推进动画', async (state, label, actions) => {
  const { host } = await open(payload({ running: [run({ progress_total: null, progress_current: null,
    control: { state, actions: [...actions] } })] }));
  expect(host.querySelector('[data-run-id="1"]')?.textContent).toContain(label);
  expect(host.querySelector('[role="status"]')).toBeNull();
  expect(controlButton('暂停', host)).toBeNull();
  expect(Boolean(controlButton('继续', host))).toBe(state !== 'cancelling');
});

it('任务控制请求等待时保持按钮焦点并阻止重复提交', async () => {
  const response = pending<{ ok: boolean; status: number; json: () => Promise<unknown> }>();
  const posts: string[] = [];
  const current = run({ control: { state: 'running', actions: ['pause', 'cancel'] } });
  stubFetch(async (input, init) => {
    if (init?.method === 'POST') {
      posts.push(input);
      return response.answer;
    }
    return { ok: true, status: 200, json: async () => payload({ running: [current] }) };
  });
  await prefetchTasks(new AbortController().signal);
  const host = await mount(page());
  const pause = controlButton('暂停', host)!;
  pause.focus();
  await click(pause);
  expect(pause.hasAttribute('disabled')).toBe(false);
  expect(pause.getAttribute('aria-busy')).toBe('true');
  expect(document.activeElement).toBe(pause);
  await click(pause);
  expect(posts).toEqual(['/api/tasks/1/control']);
  await response.release({ ok: true, status: 200, json: async () => ({ ok: true }) });
});

it('任务控制失败保留原状态和原因，可以在原位重试', async () => {
  let attempts = 0;
  const current = run({ control: { state: 'running', actions: ['pause', 'cancel'] } });
  stubFetch(async (_input, init) => {
    if (init?.method === 'POST') {
      attempts += 1;
      return { ok: false, status: 409, json: async () => ({ message: '任务已变化，请刷新后重试' }) };
    }
    return { ok: true, status: 200, json: async () => payload({ running: [current] }) };
  });
  await prefetchTasks(new AbortController().signal);
  const host = await mount(page());
  await click(controlButton('暂停', host));
  await vi.waitFor(() => expect(host.querySelector('[data-task-control-feedback] [role="alert"]')?.textContent).toContain('任务已变化'));
  expect(controlButton('继续', host)).toBeNull();
  await click(controlButton('暂停', host));
  expect(attempts).toBe(2);
});

it('后继任务使用自身任务号控制，服务端未提供能力的父任务没有控制按钮', async () => {
  const child = followup(1, { id: 90, status: 'pending', finished_at: null,
    control: { state: 'paused', actions: ['resume', 'cancel'] } });
  const ended = run({ status: 'succeeded' });
  const posts: string[] = [];
  stubFetch(async (input, init) => {
    if (init?.method === 'POST') posts.push(input);
    return { ok: true, status: 200, json: async () => payload({ running: [child], finished: [ended] }) };
  });
  await prefetchTasks(new AbortController().signal);
  const host = await mount(page());
  expect(host.querySelector('[data-task-controls="1"]')).toBeNull();
  const controls = host.querySelector('[data-task-controls="90"]')!;
  expect(controls).not.toBeNull();
  await click(controlButton('继续', controls));
  expect(posts).toEqual(['/api/tasks/90/control']);
});

it('父任务结束后仍可控制整批后继，未展示的后继也属于同一操作范围', async () => {
  const posts: [string, unknown][] = [];
  let parent = run({ status: 'succeeded',
    control: { state: 'running', actions: ['pause', 'cancel'] } });
  const child = followup(1, { status: 'pending', finished_at: null });
  stubFetch(async (input, init) => {
    if (init?.method === 'POST') {
      const body = JSON.parse(String(init.body));
      posts.push([input, body]);
      parent = { ...parent, control: body.action === 'pause'
        ? { state: 'paused', actions: ['resume', 'cancel'] }
        : body.action === 'resume' ? { state: 'running', actions: ['pause', 'cancel'] }
          : { state: 'cancelling', actions: [] } };
    }
    return { ok: true, status: 200, json: async () => payload({ running: [child], finished: [parent],
      followup_counts: { '1': { pending: 1000 } } }) };
  });
  await prefetchTasks(new AbortController().signal);
  const host = await mount(page());
  expect(host.querySelector('#run-1')?.textContent).toContain('列出其中 1 项');
  await click(controlButton('暂停后续任务', host));
  await vi.waitFor(() => expect(controlButton('继续后续任务', host)).not.toBeNull());
  expect(host.querySelector('#run-1')?.textContent).toContain('已暂停');
  await click(controlButton('继续后续任务', host));
  await vi.waitFor(() => expect(controlButton('暂停后续任务', host)).not.toBeNull());
  await click(controlButton('取消后续任务', host));
  await confirmTaskCancellation();
  await vi.waitFor(() => expect(host.querySelector('#run-1')?.textContent).toContain('正在取消'));
  expect(posts).toEqual([
    ['/api/tasks/1/control', { action: 'pause' }],
    ['/api/tasks/1/control', { action: 'resume' }],
    ['/api/tasks/1/control', { action: 'cancel' }],
  ]);
});

it('同类父任务有独立控制范围时分别显示，按钮只提交对应的父任务号', async () => {
  const first = run({ id: 1, status: 'succeeded',
    control: { state: 'paused', actions: ['resume', 'cancel'] } });
  const second = run({ id: 2, status: 'succeeded',
    control: { state: 'running', actions: ['pause', 'cancel'] } });
  const children = [followup(1, { id: 90, status: 'pending' }), followup(2, { id: 91, status: 'pending' })];
  const posts: string[] = [];
  stubFetch(async (input, init) => {
    if (init?.method === 'POST') posts.push(input);
    return { ok: true, status: 200, json: async () => payload({ running: children, finished: [second, first] }) };
  });
  await prefetchTasks(new AbortController().signal);
  const host = await mount(page());
  expect(host.querySelectorAll('[data-task-key="follow-check"]')).toHaveLength(2);
  await click(controlButton('继续后续任务', host.querySelector('#run-1')!));
  await click(controlButton('暂停后续任务', host.querySelector('#run-2')!));
  expect(posts).toEqual(['/api/tasks/1/control', '/api/tasks/2/control']);
});

it('同类父任务控制状态相同时并成一张卡，一次操作提交给每一批', async () => {
  const batch = (id: number) => run({ id, task_key: 'upgrade-repairs', task_label: '自动修复', status: 'succeeded',
    control: { state: 'running', actions: ['pause', 'cancel'] } });
  const children = [followup(1, { id: 90, status: 'pending' }), followup(2, { id: 91, status: 'pending' })];
  const posts: string[] = [];
  stubFetch(async (input, init) => {
    if (init?.method === 'POST') posts.push(input);
    return { ok: true, status: 200, json: async () => payload({ running: children, finished: [batch(2), batch(1)] }) };
  });
  await prefetchTasks(new AbortController().signal);
  const host = await mount(page());
  const cards = host.querySelectorAll('[data-task-key="upgrade-repairs"]');
  expect(cards).toHaveLength(1);
  expect(cards[0]!.textContent).toContain('2 批');
  await click(controlButton('暂停后续任务', cards[0]!));
  await vi.waitFor(() => expect(posts).toEqual(['/api/tasks/2/control', '/api/tasks/1/control']));
});

it('服务端未给出控制能力时不按任务种类自行增加按钮', async () => {
  const { host } = await open(payload({ running: [run()] }));
  expect(host.querySelector('[data-task-controls]')).toBeNull();
});

it('被挡下的那一轮单独成段，不在最近完成里再出现一次', async () => {
  const blocked = run({
    id: 7, status: 'cancelled', trigger: 'scheduled', progress_total: null,
    finished_at: '2026-09-11T10:05:00Z', elapsed_seconds: null,
    result_summary: { blocked_by: 3 }, error: '与第 3 轮（手动触发）冲突，本次跳过',
  });
  const { host } = await open(payload({ skipped: [blocked], finished: [blocked] }));
  expect(sections(host)).toEqual(['正在进行', '本次未执行']);
  expect(host.querySelectorAll('li')).toHaveLength(1);
  // 原因落在卡片底部的说明区，状态由徽章说。
  expect(host.querySelector('[data-status=cancelled]')?.textContent).toContain('与第 3 轮');
  expect(host.querySelector('[data-status=cancelled] span')?.textContent).toBe('已取消');
});

it('跑完那一轮显示摘要，失败那一轮显示原因', async () => {
  const { host } = await open(payload({ finished: [
    run({ id: 2, status: 'succeeded', finished_at: '2026-09-11T10:02:00Z',
          progress_total: null, result_summary: { checked: 7, results: [1, 2] } }),
    run({ id: 3, status: 'failed', task_label: '扫描与采集', finished_at: '2026-09-11T10:03:00Z',
          progress_total: null, error: 'RuntimeError: 上游挡回来了' }),
  ] }));
  expect(host.querySelector('[data-status=succeeded]')?.textContent).toContain('已检查 7');
  expect(host.querySelector('[data-status=failed]')?.textContent).toContain('上游挡回来了');
  expect(host.querySelector('[data-status=succeeded] span')?.textContent).toBe('已完成');
  // 跑成功那张没有说明区：没有原因可写时不留一条空条子。只有一句摘要时不加项目符号。
  expect([...host.querySelectorAll('[data-status=succeeded] p')].map((node) => node.textContent))
    .toEqual([expect.stringContaining('手动'), '已检查 7']);
  expect(host.querySelector('[data-status=succeeded] ul')).toBeNull();
});

it('做完的几批派发并成一张卡，摘要说一共处理了几项、失败几项，失败的明细排在前面', async () => {
  const batch = (id: number, minute: number) => run({
    id, task_key: 'upgrade-repairs', task_label: '自动修复', trigger: 'scheduled', status: 'succeeded',
    progress_total: null, finished_at: `2026-10-28T08:${minute}:00Z`, result_summary: { outcome: '已安排 64 项处理' } });
  const child = (id: number, parent: number, status: string) => followup(parent, {
    id, task_key: 'upgrade-library', task_label: '资料自动修复', status,
    result_summary: { outcome: '影片升级补全完成', name: `ABC-${id}` }, followup_key: `upgrade-library:x:${id}` });
  const { host } = await open(payload({
    finished: [batch(3, 43), batch(2, 42), batch(1, 41), child(31, 3, 'succeeded'), child(21, 2, 'failed'), child(11, 1, 'succeeded')],
    followup_counts: { 1: { succeeded: 64 }, 2: { succeeded: 62, failed: 2 }, 3: { succeeded: 63, failed: 1 } },
  }));
  const cards = host.querySelectorAll('[data-task-key=upgrade-repairs]');
  expect(cards).toHaveLength(1);
  const card = cards[0]!;
  expect(card.textContent).toContain('近 3 轮');
  expect(card.querySelector('span')?.textContent).toBe('发现问题');
  expect([...card.querySelectorAll(':scope > div:first-child ul > li')].map((node) => node.textContent))
    .toEqual(['共处理 192 项', '其中 3 项失败']);
  expect(card.querySelector('summary')?.textContent).toBe('任务明细 · 192 项');
  expect(card.querySelector('[data-followup-key]')?.getAttribute('data-status')).toBe('failed');
});

it('派出几十条后继的几批合成一张进行中的卡，进度按计数，正在跑的排最前，排队的不给空的技术详情', async () => {
  const parent = (id: number, finished_at: string) => run({
    id, task_key: 'upgrade-repairs', task_label: '自动修复', trigger: 'scheduled', status: 'succeeded',
    progress_total: null, started_at: finished_at, finished_at, result_summary: { outcome: '已安排 64 项处理' } });
  const child = (id: number, parentId: number, status: string) => followup(parentId, {
    id, task_key: 'upgrade-library', task_label: '资料自动修复', status, finished_at: null,
    progress_label: status === 'running' ? 'ABC-001 · 采集缺失资料' : 'ABC-00' + id, result_summary: {},
    followup_key: `upgrade-library:x:${id}` });
  const { host } = await open(payload({
    running: [child(12, 2, 'pending'), child(11, 1, 'running')],
    finished: [parent(2, '2026-10-28T09:03:00Z')],
    // 更早的那一批不在「最近完成」这一页上，接口单独给。
    working_parents: [parent(1, '2026-10-28T09:02:00Z')],
    followup_counts: { 1: { succeeded: 60, failed: 2, running: 1, pending: 1 }, 2: { pending: 64 } },
  }));
  expect(sections(host)).toEqual(['正在进行']);
  const cards = host.querySelectorAll('[data-task-key=upgrade-repairs]');
  expect(cards).toHaveLength(1);
  const card = cards[0]!;
  expect(card.querySelector('span')?.textContent).toBe('进行中');
  expect(card.textContent).toContain('2 批');
  expect(card.textContent).toContain('已处理 62 / 128 项 · 其中 2 项失败');
  expect(card.querySelector('summary')?.textContent).toBe('任务明细 · 128 项');
  expect(card.textContent).toContain('列出其中 2 项，正在处理的排在前面');
  const rows = [...card.querySelectorAll('[data-followup-key]')];
  expect(rows.map((row) => row.getAttribute('data-status'))).toEqual(['running', 'pending']);
  expect(rows[0]!.textContent).toContain('ABC-001 · 采集缺失资料');
  expect(rows.some((row) => row.textContent?.includes('技术详情'))).toBe(false);
});

it('链接检查显示失效和访问失败数量，技术详情使用可复制代码块', async () => {
  const summary = { checked: 1218, total: 1218, gone_count: 5, unclear_count: 54 };
  const writeText = vi.fn(async () => {});
  vi.stubGlobal('navigator', { clipboard: { writeText } });
  const { host } = await open(payload({ finished: [run({ task_key: 'link-check',
    task_label: '链接检查', status: 'succeeded', result_summary: summary })] }));
  const card = host.querySelector('[data-task-key=link-check]')!;
  expect(card.querySelector('span')?.textContent).toBe('发现问题');
  expect([...card.querySelectorAll('ul > li')].map(node => node.textContent))
    .toEqual(['已检查 1,218', '总数 1,218', '链接已失效 5', '链接访问失败 54']);
  await click(card.querySelector('summary')!);
  expect(card.querySelector('[data-code-block] code')?.textContent).toBe(JSON.stringify(summary, null, 2));
  await click(buttonNamed('复制代码', host)!);
  expect(writeText).toHaveBeenCalledWith(JSON.stringify(summary, null, 2));
});

it('含问题的定时结果单独显示，普通成功轮次仍可折叠', async () => {
  const hourly = (id: number, result_summary = {}) => run({ id, task_key: 'link-check',
    status: 'succeeded', trigger: 'scheduled', result_summary });
  const { host } = await open(payload({ finished: [hourly(4), hourly(3),
    hourly(2, { unclear_count: 1 }), hourly(1, { unclear_count: 1 })] }));
  expect(shownIds(host)).toEqual([4, 2, 1]);
  expect(host.querySelector('[data-run-id="4"]')?.textContent).toContain('近 2 轮');
  expect(host.querySelector('[data-run-id="2"] span')?.textContent).toBe('发现问题');
});

it('处理任务的成功、失败与清理结果都可读', () => {
  expect(summaryItems({ repaired: 3, failed: 2, missing_tool: 1, moved: 8, restored: 4,
    purged: 9, cache_blocked_count: 2, bytes_reclaimed: 1024 }))
    .toEqual(['已修复 3', '失败 2', '缺少修复工具 1', '已整理文件 8', '已还原 4',
      '已删除记录 9', '缓存清理失败 2', '已释放空间 1 KB']);
  expect(summaryItems({ result: '高清封面已保存' })).toEqual(['高清封面已保存']);
  expect(summaryItems({ incomplete: 1 })).toEqual(['资料或封面未取得 1']);
  for (const result_summary of [{ incomplete: 1 }, { source_failed: 2 }, { failed: 3 },
    { missing: 1 }, { cache_blocked_count: 1 }, { warning_count: 1 }]) {
    const task = run({ status: 'succeeded', trigger: 'scheduled', result_summary });
    expect(hasResultProblems(task)).toBe(true);
    expect(isRoutine(task)).toBe(false);
  }
});

it('后继挂在派出它的那一轮下面，不另占一张卡', async () => {
  const parent = run({ id: 4, status: 'succeeded', task_label: '扫描与采集',
                       progress_total: null, finished_at: '2026-09-11T10:03:00Z',
                       result_summary: { followups: 1 } });
  const { host } = await open(payload({ finished: [parent, followup(parent.id)] }));
  expect(host.querySelectorAll('[data-task-key]')).toHaveLength(1);
  const row = host.querySelector('[data-followup-key]')!;
  expect(host.querySelector('[data-task-key=follow-check]')!.contains(row)).toBe(true);
  expect(row.textContent).toContain('资料图片补全');
  expect(row.textContent).toContain('已完成');
  expect(row.textContent).toContain('涼森れむ · 已保存资料图片');
  expect(host.textContent).toContain('已安排 1 项补充任务');
});

it('完成的任务明细默认收起，展开和收起不丢失后继结果', async () => {
  const parent = run({ id: 4, status: 'succeeded', finished_at: '2026-09-11T10:03:00Z' });
  const { host } = await open(payload({ finished: [parent, followup(parent.id)] }));
  const details = host.querySelector('details')!;
  const trigger = details.querySelector('summary')!;
  expect(trigger.textContent).toBe('任务明细 · 1 项');
  expect(trigger.getAttribute('aria-expanded')).toBe('false');
  await click(trigger);
  expect(trigger.getAttribute('aria-expanded')).toBe('true');
  expect(details.open).toBe(true);
  expect(details.textContent).toContain('涼森れむ · 已保存资料图片');
  await click(trigger);
  expect(trigger.getAttribute('aria-expanded')).toBe('false');
});

it('进行中的后继明细默认展开，失败的后继明细默认收起', async () => {
  for (const status of ['running', 'failed']) {
    queryClient.clear();
    const parent = run({ id: 4, status: 'succeeded', finished_at: '2026-09-11T10:03:00Z' });
    const child = followup(parent.id, { status });
    const { host } = await open(payload({ finished: [parent, child] }));
    expect(host.querySelector('details')?.open).toBe(status === 'running');
    expect(host.querySelector('summary')?.getAttribute('aria-expanded')).toBe(String(status === 'running'));
  }
});

it('后继还在跑时，派出它的那一轮整张卡留在正在进行，那一行只说做到哪一部', async () => {
  const parent = run({ id: 4, status: 'succeeded', task_label: '订阅源拉取',
                       progress_total: null, finished_at: '2026-09-11T10:03:00Z',
                       result_summary: { followups: 1 } });
  const scraping = followup(parent.id, {
    task_key: 'feed-scrape', task_label: '新作资料采集', status: 'running', finished_at: null,
    progress_label: '新作资料采集：MIZD-441', progress_current: 13, progress_total: 22,
    followup_key: 'feed-scrape:MIZD-441', result_summary: {} });
  const { host } = await open(payload({ running: [scraping], finished: [parent] }));
  expect(sections(host)).toEqual(['正在进行']);
  const row = host.querySelector('[data-followup-key]')!;
  expect(row.textContent).toContain('新作资料采集');
  expect(row.textContent).toContain('进行中');
  expect(row.textContent).toContain('MIZD-441 · 13 / 22 项');
});

it('连着几轮什么也没发生的定时任务按种类各并成一张卡，有事的那一轮截断并单独摆', async () => {
  const hourly = (id: number, overrides: Partial<TaskRunPayload> = {}) => done(id, {
    trigger: 'scheduled', result_summary: { checked: 83, total: 83 }, ...overrides });
  const feed = (id: number, overrides: Partial<TaskRunPayload> = {}) => hourly(id, {
    task_key: 'feed-check', task_label: '订阅源拉取', result_summary: { checked: 2, added: 0 }, ...overrides });
  const { host } = await open(payload({ finished: [
    hourly(9), feed(8), hourly(7), feed(6), hourly(5),
    feed(4, { result_summary: { checked: 2, added: 3 } }),
    hourly(3), hourly(2),
  ] }));
  expect(shownIds(host)).toEqual([9, 8, 4, 3]);
  const first = host.querySelector('[data-run-id="9"]')!;
  expect(first.textContent).toContain('定时 · 近 3 轮 · ');
  expect([...first.querySelectorAll('ul > li')].map((node) => node.textContent)).toEqual(['已检查 83', '总数 83']);
  expect(host.querySelector('[data-run-id="8"]')!.textContent).toContain('近 2 轮');
  expect(host.querySelector('[data-run-id="4"]')!.textContent).toContain('新增 3');
  expect(host.querySelector('[data-run-id="3"]')!.textContent).toContain('近 2 轮');
});

it('父任务不在这一屏上时，后继照常单独摆出来', async () => {
  const { host } = await open(payload({ finished: [followup(4)] }));
  expect(host.querySelectorAll('[data-task-key=entity-avatar]')).toHaveLength(1);
  expect(host.querySelector('[data-followup-key]')).toBeNull();
});

it('一条记录都没有时给空态，不是一片白', async () => {
  const { host } = await open(payload());
  expect(host.querySelector('h3')?.textContent).toBe('还没有任务记录');
  // 任务中心那三段都不画；云下载没有任务，也不画。
  expect(sections(host)).toEqual([]);
});

it('数据库上还没有这张表时说清怎么办，不当成故障', async () => {
  const { host } = await open(payload({
    available: false, message: '数据库缺少任务记录表，请按运行文档检查备份后执行 peach migrate upgrade --yes' }));
  expect(host.querySelector('[role=note]')?.textContent).toContain('migrate upgrade --yes');
  expect(host.querySelector('[role=alert]')).toBeNull();
});

it('首屏取数就失败时只剩一条错误，不画空的三段', async () => {
  const { host } = await open(null);
  // 文案走遗留层的 `requestErrorMessage`：服务端给了中文原因就用它，页面不另说一遍。
  expect(host.querySelector('[role=alert]')?.textContent).toContain('数据库当前只能浏览');
  expect(host.querySelector('section')).toBeNull();
});

it('轮询间隔跟着内容走：有东西在跑两秒一次，全是终态十秒一次', async () => {
  vi.useFakeTimers();
  const fetcher = serve(payload({ running: [run()] }), payload({ finished: [run({ status: 'succeeded' })] }));
  await prefetchTasks(new AbortController().signal);
  await mount(page());
  expect(fetcher).toHaveBeenCalledTimes(1);

  await tick(2000);
  expect(fetcher, '有任务在跑时两秒一次').toHaveBeenCalledTimes(2);

  // 这一份全是终态，下一轮要等十秒。
  await tick(2000);
  expect(fetcher, '没东西在跑还两秒敲一次库').toHaveBeenCalledTimes(2);
  await tick(8000);
  expect(fetcher).toHaveBeenCalledTimes(3);
});

it('一轮请求失败不擦掉上一份数据，只在页内多一条原因', async () => {
  vi.useFakeTimers();
  const fetcher = serve(payload({ finished: [run({ id: 5, status: 'succeeded', task_label: '扫描与采集' })] }), null);
  await prefetchTasks(new AbortController().signal);
  const host = await mount(page());

  await tick(10_000);
  expect(fetcher).toHaveBeenCalledTimes(2);
  expect(host.querySelector('[role=alert]')?.textContent).toContain('数据库当前只能浏览');
  expect(host.textContent, '失败一次就把上一份结果擦掉，页面比原来知道得更少').toContain('扫描与采集');
});

it('卸载之后不再敲库：轮询跟着这棵根一起走', async () => {
  vi.useFakeTimers();
  const fetcher = serve(payload({ running: [run()] }));
  await prefetchTasks(new AbortController().signal);
  const mounted = await mountRoot(page());

  await tick(2000);
  expect(fetcher).toHaveBeenCalledTimes(2);
  await mounted.unmount();
  await tick(60_000);
  expect(fetcher, '卸载之后还在轮询').toHaveBeenCalledTimes(2);
});

/** 结束于 10:mm 的一轮。分钟越大越新，id 顺着分钟走。 */
const done = (minute: number, overrides: Partial<TaskRunPayload> = {}) => run({
  id: minute, status: 'succeeded', progress_total: null, progress_current: null,
  finished_at: `2026-09-11T10:${String(minute).padStart(2, '0')}:00.000Z`, ...overrides,
});

/** 轮询与往前翻各有一串回话：地址里带游标的走 `pages`，其余走 `polls`。`null` 那一份回 500。 */
function route(polls: ActivityData[], pages: (FinishedPage | null)[]) {
  let polled = 0, paged = 0;
  const fetcher = vi.fn(async (input: string, _init?: RequestInit) => {
    if (!input.includes('before_id=')) {
      const body = polls[Math.min(polled, polls.length - 1)];
      polled += 1;
      return { ok: true, status: 200, json: async () => body };
    }
    const body = pages[Math.min(paged, pages.length - 1)] ?? null;
    paged += 1;
    return body
      ? { ok: true, status: 200, json: async () => body }
      : { ok: false, status: 500, json: async () => ({ message: '数据库当前只能浏览' }) };
  });
  stubFetch(fetcher);
  return fetcher;
}

const shownIds = (host: HTMLElement) =>
  [...host.querySelectorAll('[data-run-id]')].map((node) => Number(node.getAttribute('data-run-id')));

const cursorOf = (fetcher: ReturnType<typeof route>, call: number) =>
  new URL(fetcher.mock.calls[call]![0], 'http://peach').searchParams;

it('「加载更早」以最旧那一行为游标往后接一页，到头就不再给这个键', async () => {
  const fetcher = route(
    [payload({ finished: [done(9), done(8)], finished_has_more: true })],
    [{ finished: [done(7), done(6)], finished_has_more: true },
     { finished: [done(5)], finished_has_more: false }]);
  await prefetchTasks(new AbortController().signal);
  const host = await mount(page());
  expect(shownIds(host)).toEqual([9, 8]);

  await click(buttonNamed('加载更早', host));
  await settle();
  expect(cursorOf(fetcher, 1).get('before_id')).toBe('8');
  expect(cursorOf(fetcher, 1).get('before_finished_at')).toBe('2026-09-11T10:08:00.000Z');
  expect(shownIds(host)).toEqual([9, 8, 7, 6]);

  await click(buttonNamed('加载更早', host));
  await settle();
  expect(cursorOf(fetcher, 2).get('before_id')).toBe('6');
  expect(shownIds(host)).toEqual([9, 8, 7, 6, 5]);
  expect(buttonNamed('加载更早', host), '已经到头还留着「加载更早」').toBeNull();
});

it('第一页之后没有更早的就不给「加载更早」', async () => {
  const { host } = await open(payload({ finished: [done(9)], finished_has_more: false }));
  expect(buttonNamed('加载更早', host)).toBeNull();
});

it('轮询刷新之后翻过的行还在，被新完成挤出第一页的那一轮也不丢、不重复', async () => {
  vi.useFakeTimers();
  route(
    [payload({ finished: [done(9), done(8)], finished_has_more: true }),
     // 10:10 又结束了一轮，第一页末尾的 8 被挤了出去。
     payload({ finished: [done(10), done(9)], finished_has_more: true }),
     payload({ finished: [done(11), done(10)], finished_has_more: true }),
     // 翻页之后才进第一页的 10 也要留住：它被挤出去时，哪一页的回话里都没有它。
     payload({ finished: [done(12), done(11)], finished_has_more: true })],
    [{ finished: [done(7), done(6)], finished_has_more: true }]);
  await prefetchTasks(new AbortController().signal);
  const host = await mount(page());
  await click(buttonNamed('加载更早', host));
  await settle();
  expect(shownIds(host)).toEqual([9, 8, 7, 6]);

  await tick(10_000);
  expect(shownIds(host)).toEqual([10, 9, 8, 7, 6]);
  await tick(10_000);
  await tick(10_000);
  expect(shownIds(host)).toEqual([12, 11, 10, 9, 8, 7, 6]);
  expect(buttonNamed('加载更早', host), '刷新一次就把往前翻的进度丢了').not.toBeNull();
});

it('往前翻失败时原位说原因，已有的行不动，再点一次照常接上', async () => {
  route([payload({ finished: [done(9)], finished_has_more: true })],
        [null, { finished: [done(7)], finished_has_more: false }]);
  await prefetchTasks(new AbortController().signal);
  const host = await mount(page());

  await click(buttonNamed('加载更早', host));
  await settle();
  expect(host.querySelector('[role=alert]')?.textContent).toContain('数据库当前只能浏览');
  expect(shownIds(host)).toEqual([9]);

  await click(buttonNamed('加载更早', host));
  await settle();
  expect(host.querySelector('[role=alert]')).toBeNull();
  expect(shownIds(host)).toEqual([9, 7]);
});

it('时长与摘要的折算各自成立', () => {
  expect(elapsedText(0)).toBe('0 秒');
  expect(elapsedText(59)).toBe('59 秒');
  expect(elapsedText(75)).toBe('1 分 15 秒');
  expect(elapsedText(3725)).toBe('1 小时 2 分');
  // 满 48 小时按天说：「73 小时 1 分」读不出是三天。
  expect(elapsedText(47 * 3600 + 59 * 60)).toBe('47 小时 59 分');
  expect(elapsedText(73 * 3600 + 60)).toBe('3 天 1 小时');
  expect(elapsedText(null)).toBe('');
  expect(summaryText({ checked: 1234567 })).toBe('已检查 1,234,567');
  // 进度按总数封顶，带千分位。
  expect(progressText(1500, 1000)).toBe('1,000 / 1,000');
  expect(progressText(-3, 10)).toBe('0 / 10');
  expect(progressText(null, null)).toBe('0 / 0');
  // 明细与「谁挡的」不进这一行：前者太长，后者已经写在错误那一句里了。
  expect(summaryText({ checked: 7, operation: 'like', rows: [1], blocked_by: 3 }))
    .toBe('已检查 7 · 操作：标记喜欢');
  // 追更检查结算时带着整份状态字典，簿记字段不能漏到卡片上。
  expect(summaryText({
    status: 'complete', run_id: 351, started_at: 1790138114.86, checked: 83, total: 83,
    request_id: '417dab8d', completed_at: 1790138495.48,
  })).toBe('已检查 83 · 总数 83');
});

it('任务主摘要使用中文结果，内部字段保留给技术详情', () => {
  expect(summaryItems({ followups: 9, stage: 'finished', requested_stage: 'all',
    eta_seconds_min: 0, entity_watermark: 9936, performer_aliases: 7, auto_rejected: 0 }))
    .toEqual(['已安排 9 项补充任务', '女优别名 7']);
  expect(followupDetail(followup(4, { task_key: 'performer-profile', task_label: '女优资料补全',
    progress_label: '补女优资料：演示人物', result_summary: { name: '演示人物', outcome: 'avwikidb 绑定；javdb 绑定' } })))
    .toBe('演示人物 · 已关联 AVWikiDB 资料页；已关联 JavDB 资料页');
});

it('报错在列表里只露一行：traceback 取最后一行，别的取第一行非空', () => {
  const stack = 'Traceback (most recent call last):\n  File "x.py", line 1, in <module>\nValueError: 坏了';
  expect(errorHeadline(stack)).toBe('ValueError: 坏了');
  expect(errorHeadline('\n  连接超时\n详情见日志')).toBe('连接超时');
  expect(errorHeadline('')).toBe('');
  expect(errorHeadline(null)).toBe('');
});

it('报错摘要平时只露一行，「查看详情」展开全文、再点收起；只有一行时不给这颗键', async () => {
  const stack = 'Traceback (most recent call last):\n  File "x.py", line 1\nValueError: 坏了';
  const host = await mount(<ErrorExcerpt text={stack} />);
  expect(host.textContent).toBe('坏了查看详情');
  await click(buttonNamed('查看详情', host));
  expect(host.textContent).toContain('File "x.py", line 1');
  expect(host.querySelector('[data-error-details] [role="region"]')?.getAttribute('aria-label')).toBe('完整错误详情');
  expect(buttonNamed('收起详情', host)?.getAttribute('aria-expanded')).toBe('true');
  await click(buttonNamed('收起详情', host));
  expect(host.textContent).toBe('坏了查看详情');

  const single = await mount(<ErrorExcerpt text="只有一行" />);
  expect(single.textContent).toBe('只有一行');
  expect(buttonNamed('查看详情', single)).toBeNull();
});

it('缺人脸模型跑完的后继标成发现问题，不是已完成', async () => {
  const down = { outcome: '图库里没有这个名字，人脸模型不可用：取人脸模型失败：断网', face_match_unavailable: true };
  const settled = followup(4, { result_summary: down });
  expect(hasResultProblems(settled)).toBe(true);
  expect(isRoutine(run({ status: 'succeeded', trigger: 'scheduled', result_summary: down }))).toBe(false);
  expect(hasResultProblems(followup(4, { result_summary: { face_match_unavailable: false } }))).toBe(false);
  // 结论本身没写原因时补一句，写了就不重复。
  expect(summaryItems({ outcome: '图库 2 张彼此认不出同一个人', face_match_unavailable: true }))
    .toEqual(['图库 2 张彼此认不出同一个人', '人脸模型不可用，未做人脸核对']);
  expect(summaryItems(down)).toEqual([down.outcome]);
  const parent = run({ id: 4, status: 'succeeded', task_label: '扫描与采集', progress_total: null,
                       finished_at: '2026-09-11T10:03:00Z', result_summary: { followups: 1 } });
  const { host } = await open(payload({ finished: [parent, settled] }));
  expect([...host.querySelectorAll('[data-followup-key] > div:first-child > div:first-child > span')].map((node) => node.textContent))
    .toEqual(['资料图片补全', '发现问题', `涼森れむ · ${down.outcome}`]);
});

it('人脸模型取不到的那一轮只记失败与原因，重试在页顶「需要处理」', async () => {
  const { host } = await open(payload({ finished: [run({
    id: 9, task_key: 'face-models', task_label: '人脸模型下载', trigger: 'scheduled', status: 'failed',
    progress_total: null, progress_current: null, finished_at: '2026-09-11T10:05:00Z',
    error: '取人脸模型失败：getaddrinfo failed' })] }));
  const card = host.querySelector('[data-task-key=face-models]')!;
  expect(card.getAttribute('data-status')).toBe('failed');
  expect(card.textContent).toContain('取人脸模型失败：getaddrinfo failed');
  expect(card.querySelectorAll('a')).toHaveLength(0);
  expect([...card.querySelectorAll('button')].some((button) => /重试|下载/.test(button.textContent || ''))).toBe(false);
});
