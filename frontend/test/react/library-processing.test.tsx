/* 扫描与采集：交什么、说什么、跟到什么时候，以及两个读者怎么共用同一趟任务。
 *
 * 一份快照有两个读者——数据管理页那张卡片和目录页顶上那条横幅。它们读同一个 `queryKey`，
 * 所以这里既量单独一处的行为，也量两处同时在场时的请求数。
 * 外观（横幅的语气底色、页脚按钮的主次）由 `frontend/e2e/design-*.test.ts` 读
 * `getComputedStyle` 断言；这里只看结构、文字与请求。 */
import { act } from 'react';
import { notifyManager, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, expect, it, vi } from 'vitest';

import { queryClient } from '../../src/react/query';
import {
  currentLine, LIBRARY_PROCESSING_KEY, notesLine, prefetchLibraryProcessing, processingLine, remainingTime, type LibraryProcessingData,
} from '../../src/react/library-processing/library-processing';
import { LibraryProcessingCard } from '../../src/react/library-processing/library-processing-card';
import { LibraryProcessingNotice } from '../../src/react/library-processing/library-processing-notice';
import { setProcessingNoticeVisible } from '../../src/react/library-processing/processing-notice-visibility';
import type { LibraryProcessingProps } from '../../src/react/bundle';

import { actionOrder, buttonNamed as textButtonNamed, click, mount, mountRoot, submit } from './render';

// 取消要过真的确认框：桩里的 `confirmModal` 不画对话框。
vi.mock('@peach/legacy/ui', async (original) => ({
  ...await original<typeof import('@peach/legacy/ui')>(),
  confirmModal: (await import('../../src/ui-kit/modal')).confirmModal,
}));

const buttonNamed = (name: string, root: ParentNode = document) =>
  [...root.querySelectorAll('button')].find(button => button.getAttribute('aria-label') === name)
  ?? textButtonNamed(name, root);

// 客户端是模块级的单例（所有 React 根共用一个），用例之间不清就互相喂数据。
// 报过的任务号记在 `localStorage` 里，也要清，否则下一条用例的通知被当成重复的。
afterEach(() => {
  queryClient.clear();
  localStorage.clear();
  sessionStorage.clear();
});

/* Query 派发更新用的是它自己抓住的那个真 `setTimeout(0)`，假时钟推不动它：推完时钟
   断言到的还是上一帧的 DOM。用例里改成当场派发。 */
notifyManager.setScheduler((notify) => notify());

const LOG = 'C:\\peach-data\\state\\library-processing-one.issues.jsonl';

it('运行时待补全数量仍可见，同步菜单等待当前任务结束',async()=>{
  const {posts}=await open({status:'running',job_id:'one',new_asset_count:12});
  const host=await mount(card({toast:vi.fn()}));
  expect(host.textContent).toContain('12 部待补全');
  const menu=host.querySelector<HTMLButtonElement>('[data-split-button] [aria-haspopup="dialog"]')!;
  expect(menu.getAttribute('aria-disabled')).toBe('true');
  await click(menu);
  expect(document.querySelector('[role="dialog"][aria-label="同步方式"]')).toBeNull();
  expect(posts()).toEqual([]);
});

it('补全待处理影片只提交已登记范围，不触发文件发现',async()=>{
  const {calls}=await open({status:'idle',new_asset_count:2},
    (method)=>method==='POST'?{status:'running',job_id:'new'}:{status:'idle',new_asset_count:2});
  const host=await mount(card({toast:vi.fn()}));
  await click(host.querySelector('[data-split-button] [aria-haspopup="dialog"]'));
  await startFrom(menuItem('补全待处理影片'));
  expect(calls.filter(call=>call.method==='POST').map(call=>call.body)).toEqual([{stage:'collect',scope:'new'}]);
});

it('取消先确认，请求绑定原任务，正在取消时保留进度并禁止重发',async()=>{
  let state:LibraryProcessingData={status:'running',job_id:'one',candidates:3};
  const {calls}=await open(state,(method)=>{
    if(method==='POST') state={...state,status:'stopping'};
    return state;
  });
  const posts=()=>calls.filter(call=>call.method==='POST').map(call=>call.body);
  const host=await mount(card({toast:vi.fn()}));
  await click(buttonNamed('取消任务',host)!);
  await click(document.querySelector('[data-modal-cancel]'));
  expect(posts()).toEqual([]);
  await click(buttonNamed('取消任务',host)!);
  await click(document.querySelector('[data-modal-confirm]'));
  await vi.waitFor(()=>expect(posts()).toEqual([{action:'cancel',job_id:'one'}]));
  await vi.waitFor(()=>expect(host.textContent).toContain('正在取消'));
  expect(buttonNamed('正在取消',host)?.disabled).toBe(true);
});

type Reply = (method: string, body: unknown) => LibraryProcessingData;

/** 按方法应答同一个端点。用例拿 `calls` 数请求、看请求体。 */
function serve(reply: Reply) {
  const calls: { method: string; body: unknown }[] = [];
  const fetcher = vi.fn(async (path: string, init?: RequestInit) => {
    if (path.startsWith('/api/library-processing?')) return {
      ok: true, status: 200, json: async () => ({ traffic: {
        used_bytes: 0, estimated_min_bytes: 1024, estimated_max_bytes: 2048,
        metered_used_bytes: 0, metered_estimated_min_bytes: 1024, metered_estimated_max_bytes: 2048,
        sources: [], partial: false, unknown_files: true,
      } }),
    };
    if (path !== '/api/library-processing') throw new Error(`用例没有给 ${path} 造数据`);
    const method = init?.method ?? 'GET';
    const body = init?.body ? JSON.parse(String(init.body)) : undefined;
    calls.push({ method, body });
    const answer = reply(method, body);
    return { ok: true, status: 200, json: async () => answer };
  });
  vi.stubGlobal('fetch', fetcher);
  return { calls, fetcher, posts: () => calls.filter((call) => call.method === 'POST').map((call) => call.body) };
}

/** 走完真实的首屏路径：先 prefetch 把 `first` 落进缓存，再换上用例自己的应答。
 *  首屏那一趟不进 `calls`，断言数的就是页面挂上去之后的来往。 */
async function open(first: LibraryProcessingData, reply: Reply = () => first) {
  vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, status: 200, json: async () => first })));
  await prefetchLibraryProcessing(new AbortController().signal);
  return serve(reply);
}

const card = (props: LibraryProcessingProps) => (
  <QueryClientProvider client={queryClient}><LibraryProcessingCard {...props} /></QueryClientProvider>
);
const notice = (props: LibraryProcessingProps) => (
  <QueryClientProvider client={queryClient}><LibraryProcessingNotice {...props} /></QueryClientProvider>
);

it('隐藏任务提示后卡片提供恢复入口，恢复不提交业务请求', async () => {
  const { posts } = await open({ status: 'paused', job_id: 'restore-from-card', checked: 2, total: 10 });
  setProcessingNoticeVisible('restore-from-card', false);
  const host = await mount(card({ toast: vi.fn() }));
  await click(buttonNamed('显示进度浮窗', host));
  expect(buttonNamed('显示进度浮窗', host)).toBeNull();
  expect(posts()).toEqual([]);
});

/** 轮询是 Query 的定时器，推进时钟会引起重画，得在 act 里推。 */
const tick = (ms: number) => act(async () => { await vi.advanceTimersByTimeAsync(ms) });

const menuItem = (label: string) =>
  [...document.querySelectorAll('[role="dialog"] button')].find((item) => item.querySelector('span > span')?.textContent === label);

const startFrom = async (element: Element | null | undefined) => {
  await click(element);
  await submit(document.querySelector('dialog form'));
};

it.each([
  ['同步新增文件', '同步新增文件', '新增文件与待补全影片', {incremental:true}, {stage:'all',incremental:'1'}],
  ['仅发现新增文件', '发现新增文件', '尚未登记的新增文件', {stage:'scan',incremental:true}, {stage:'scan',incremental:'1'}],
  ['补全待处理影片', '补全待处理影片', '已登记的待补全影片', {stage:'collect',scope:'new'}, {stage:'collect',scope:'new'}],
  ['同步整个媒体库', '同步整个媒体库', '整个媒体库', {}, {stage:'all'}],
  ['仅扫描文件', '扫描全部文件', '整个媒体库', {stage:'scan'}, {stage:'scan'}],
  ['补全资料与预览', '补全已入库影片', '整个媒体库', {stage:'collect'}, {stage:'collect'}],
  ['仅补全影片资料', '仅补全影片资料', '整个媒体库', {stage:'metadata'}, {stage:'metadata'}],
  ['仅补全预览图', '仅补全预览图', '已入库的本地视频', {stage:'previews'}, {stage:'previews'}],
] as const)('%s 的确认范围、预估请求与提交保持一致', async (label, title, scope, command, estimate) => {
  const {fetcher, posts} = await open({status:'idle',new_asset_count:2});
  const host = await mount(card({toast:vi.fn()}));
  if (label === '同步新增文件') await click(buttonNamed(label,host));
  else {
    await click(host.querySelector('[data-split-button] [aria-haspopup="dialog"]'));
    await click(menuItem(label));
  }
  expect(document.querySelector('dialog')?.textContent).toContain(title);
  expect(document.querySelector('[data-processing-scope]')?.textContent).toBe(`处理范围：${scope}`);
  const requested = fetcher.mock.calls.map(([path]) => String(path)).find(path => path.includes('estimate=1'))!;
  const params = new URL(requested, 'https://peach.test').searchParams;
  expect(Object.fromEntries(params)).toEqual({estimate:'1',...estimate});
  await submit(document.querySelector('dialog form'));
  expect(posts()).toEqual([command]);
});
const chooseLow = () => act(async () => {
  const slider = document.querySelector('dialog input[type="range"]')!;
  slider.dispatchEvent(new KeyboardEvent('keydown', { key: 'Home', bubbles: true }));
  slider.dispatchEvent(new KeyboardEvent('keyup', { key: 'Home', bubbles: true }));
});

it('来源说没有只报一个数，不算问题也不提供失败重试', async () => {
  await open({
    status: 'complete',
    issue_count: 0,
    issue_preview: [],
    notes: { querying_metadata: 30, fetching_cover: 162 },
    issues_log: LOG,
  });
  const host = await mount(card({ toast: vi.fn() }));
  expect(host.textContent).toContain('外部来源没有资料 30 部、没有封面 162 部，7 天内不再问。');
  expect(host.textContent).toContain(LOG);
  /* 完整记录那一行退回灰字，它上面那条线取同一个颜色；中性 separator 是另一种灰。 */
  const record = [...host.querySelectorAll('p')].find((line) => line.textContent?.includes(LOG))!;
  expect(record.closest('.text-text-secondary')).not.toBeNull();
  expect(record.closest('.border-t')!.className).toContain('border-current/20');
  expect(host.querySelector('[role="alert"]')).toBeNull();
  expect(buttonNamed('立即重试未完成项')).toBeNull();
  expect(host.querySelector('details')).toBeNull();
});

it('已结束的部分结果提供浏览与定向重试，中断保持错误提示', async () => {
  const state: LibraryProcessingData = { status: 'failed', outcome: 'partial', job_id: 'partial',
    issue_count: 2, error: '2 项需要处理', retryable_asset_ids: [7],
    issue_preview: [{ asset_id: 7, message: '视频抽帧超时' }] };
  const served = await open(state, method => method === 'POST' ? { status: 'running', job_id: 'retry' } : state);
  const host = await mount(card({ toast: vi.fn() }));
  const banner = await mount(notice({ toast: vi.fn(), mode: 'notice' }));
  for (const surface of [host, banner]) {
    expect(surface.textContent).toContain('处理已结束，部分项目需处理');
    expect(surface.textContent).toContain('已入库的视频可在全部内容中浏览');
    expect(surface.querySelector('a[href="/?loc=&thumb=0"]')?.textContent).toBe('查看全部内容');
    expect(surface.querySelector('[role="alert"]')).toBeNull();
  }
  expect(banner.querySelector('[data-processing-tone]')?.getAttribute('data-processing-tone')).toBe('warning');
  await click(buttonNamed('立即重试未完成项', host));
  expect(served.posts()).toEqual([{ job_id: 'partial', retry: [7] }]);
  await act(async () => { queryClient.setQueryData(LIBRARY_PROCESSING_KEY,
    { ...state, outcome: 'interrupted', error: '处理被中断' }); });
  expect(banner.querySelector('[role="alert"]')?.textContent).toContain('扫描与采集已中断');
  expect(banner.querySelector('a[href="/?loc=&thumb=0"]')).toBeNull();
});

it('扫描与补全方式共用一颗主键加一个下拉，各自交自己的阶段', async () => {
  const served = await open({ status: 'idle' }, () => ({ status: 'complete' }));
  const host = await mount(card({ toast: vi.fn() }));

  await startFrom(buttonNamed('同步新增文件', host));
  await click(host.querySelector('[data-split-button] [aria-haspopup="dialog"]'));
  expect(document.querySelector('[role="group"][aria-label="全库维护"]')).not.toBeNull();
  await startFrom(menuItem('同步整个媒体库'));
  await click(host.querySelector('[data-split-button] [aria-haspopup="dialog"]'));
  await startFrom(menuItem('仅扫描文件'));
  await click(host.querySelector('[data-split-button] [aria-haspopup="dialog"]'));
  await startFrom(menuItem('补全资料与预览'));
  await click(host.querySelector('[data-split-button] [aria-haspopup="dialog"]'));
  await startFrom(menuItem('仅补全预览图'));
  await click(host.querySelector('[data-split-button] [aria-haspopup="dialog"]'));
  await startFrom(menuItem('仅补全影片资料'));

  expect(served.posts()).toEqual([{incremental:true}, {}, { stage: 'scan' }, { stage: 'collect' }, { stage: 'previews' }, { stage: 'metadata' }]);
  expect(host.querySelector('a[href="/sources"]')?.textContent).toContain('来源和凭证');
});

it('启动只提交一次，进度用 GET 读回来，完成后给出回执与复核入口', async () => {
  const toast = vi.fn();
  const served = await open(
    { status: 'idle' },
    (method) => method === 'POST'
      ? { status: 'running', job_id: 'one' }
      : { status: 'complete', job_id: 'one', scanned: 9, identified: 4, candidates: 2 },
  );
  const host = await mount(card({ toast }));
  await startFrom(buttonNamed('同步新增文件', host));

  expect(served.calls.map((call) => call.method)).toEqual(['POST', 'GET']);
  expect(host.querySelector('a[href="/review"]')).not.toBeNull();
  expect(toast).toHaveBeenCalledTimes(1);
  const receipt = host.querySelector('[role="status"]');
  expect(receipt?.textContent).toContain('处理完成');
  expect(receipt?.textContent).toContain(
    '已扫描 9 个文件，识别 4 个番号，取得 2 组作品资料，自动保存 0 条。');
  // 这一趟没补任何女优资料，回执里就不出现那句话。
  expect(receipt?.textContent).not.toContain('补齐女优资料');
});

it('补齐女优资料的读数进回执，冲突和未取得各自点名', async () => {
  const served = await open(
    { status: 'idle' },
    (method) => method === 'POST'
      ? { status: 'running', job_id: 'one' }
      : {
          status: 'complete', job_id: 'one', scanned: 9, identified: 4, candidates: 2,
          auto_applied: 2, performer_aliases: 5, performer_avatars: 3,
          performer_profile_conflicts: 1, performer_profile_failed: 2,
        },
  );
  const host = await mount(card({ toast: vi.fn() }));
  await startFrom(buttonNamed('同步新增文件', host));

  expect(served.posts()).toEqual([{incremental:true}]);
  expect(host.querySelector('[role="status"]')?.textContent).toContain(
    '补齐女优资料：别名 5 个，头像 3 张，1 项同名人物资料需要确认是否为同一人，2 张头像未取得。');
});

it('首屏读到的上一趟终态不冒充这一次的回执', async () => {
  const toast = vi.fn();
  // 任务关掉页面照样在跑，状态里常年躺着上一趟的回执；进页面时它已经结束很久了。
  const served = await open({ status: 'complete', job_id: 'old', identified: 7, candidates: 3 });
  const host = await mount(card({ toast }));

  expect(served.calls.every((call) => call.method === 'GET')).toBe(true);
  expect(toast).not.toHaveBeenCalled();
  expect(host.textContent).not.toContain('处理完成');
});

it('运行态说清当前项目、动作与等待时长，处理慢只提示不另起任务', async () => {
  const served = await open({
    status: 'running', job_id: 'one', checked: 2, total: 10, stalled: true,
    current_asset_name: 'ABW-001.mp4', current_action: 'querying_metadata', waited_seconds: 300,
  });
  const host = await mount(card({ toast: vi.fn() }));

  expect(host.textContent).toContain('当前：ABW-001.mp4 · 查询外部资料 · 已等待 5 分 0 秒');
  expect(host.textContent).toContain('处理较慢');
  // 有分母就画进度条，不再另画一组等待点：同一件事两种说法。
  expect(host.querySelectorAll('[role="progressbar"]')).toHaveLength(1);
  expect(host.querySelector('[role="progressbar"]')?.getAttribute('aria-valuenow')).toBe('2');

  await click(buttonNamed('同步新增文件', host));
  expect(served.posts()).toEqual([]);
});

it('失败时把问题清单折叠进错误提示，重试只交失败的那些项', async () => {
  const served = await open({
    status: 'failed', job_id: 'one', error: '2 项需要处理', issue_count: 23,
    issues_log: LOG, issues_truncated: true, retryable_asset_ids: [7, 8],
    issue_preview: [{ asset_id: 7, title: '样品.mp4', path: 'R:\\Media\\样品.mp4', message: '未识别到番号' }],
  }, () => ({ status: 'running', job_id: 'two' }));
  const host = await mount(card({ toast: vi.fn() }));

  const alert = host.querySelector('[role="alert"]');
  expect(alert?.textContent).toContain('2 项需要处理');
  const details = alert!.querySelector('details')!;
  expect(details.open).toBe(false);
  expect(details.querySelector('summary')?.textContent).toBe('问题清单：共 23 项，展开查看前 1 项');
  expect(details.querySelector('li a')?.getAttribute('href')).toBe('/assets/7');
  expect(details.querySelector('li')?.textContent).toContain('样品.mp4');
  expect(details.querySelector('li code')?.textContent).toBe('R:\\Media\\样品.mp4');
  // 清单自己那条滚动条走全站那份覆盖式的，不留系统灰柱子。
  const list = details.querySelector('ul')!;
  expect(list.dataset.overlayScrollbar).toBe('true');
  expect(list.parentElement?.querySelector('.ovtrack')).not.toBeNull();
  /* 同一块红底上叠着三段：结论、清单、日志地址。条与条、段与段之间各横一条线，
     不然几十条同样长短的明细连成一片，看不出哪一条结束了。 */
  expect(list.querySelector('li')!.className).toContain('border-b');
  expect(details.parentElement?.className).toContain('border-t');
  /* 完整记录是出事之后自己去翻的东西，退回灰字，清单收着也看得见；旁边是打开它和
     导出它的两颗键，导出和这份记录排在一起。 */
  const reveal = alert!.querySelector('button[aria-label="在资源管理器中显示"]')!;
  expect(details.contains(reveal)).toBe(false);
  const logRow = reveal.closest('.text-text-secondary')!;
  expect(logRow.querySelector('p')?.textContent).toBe(`完整记录：${LOG}`);
  expect(logRow.contains(buttonNamed('导出完整问题清单', host))).toBe(true);
  // 发现新增文件和原任务的定向重试分别保留入口。
  expect(buttonNamed('同步新增文件', host)?.textContent).toBe('同步新增文件');

  // 重试键属于错误提示，和别处 Note 的恢复动作一样是次级键；问题清单收起时仍可操作。
  const retry = buttonNamed('立即重试未完成项')!;
  expect(retry.textContent).toBe('立即重试');
  expect(retry.className).not.toContain('bg-button-primary');
  expect(alert!.contains(retry)).toBe(true);
  expect(details.contains(retry)).toBe(false);

  await click(retry);
  expect(served.posts()).toEqual([{ job_id: 'one', retry: [7, 8] }]);
});

it('有可重试项时主按钮仍可发现新文件，定向重试保留独立入口', async () => {
  const served = await open({
    status: 'failed', job_id: 'one', error: '2 项需要处理',
    retryable_asset_ids: [7, 8], issue_preview: [],
  }, () => ({ status: 'running', job_id: 'two' }));
  const host = await mount(card({ toast: vi.fn() }));

  await startFrom(buttonNamed('同步新增文件', host));
  expect(served.posts()).toEqual([{incremental:true}]);
});

it('失败项都不可重试时仍能发现新增文件', async () => {
  await open({
    status: 'failed', job_id: 'one', error: '1 项需要处理', issue_count: 1,
    retryable_asset_ids: [], issue_preview: [{ asset_id: 1, message: '未识别到番号' }],
  });
  const host = await mount(card({ toast: vi.fn() }));
  expect(buttonNamed('立即重试未完成项')).toBeNull();
  expect(buttonNamed('同步新增文件', host)?.textContent).toBe('同步新增文件');
});

it('读不回来时留住已有进度，只在旁边说一句连接中断', async () => {
  await open({ status: 'running', checked: 3, total: 9, stage: '采集缺失资料' });
  vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, status: 503, json: async () => ({}) })));
  vi.useFakeTimers();
  const host = await mount(card({ toast: vi.fn() }));
  await tick(2000);

  expect(host.querySelector('[role="alert"]')?.textContent).toContain('连接中断，正在重新读取处理进度');
  expect(host.querySelector('[role="progressbar"]')?.getAttribute('aria-valuenow')).toBe('3');
});

it('横幅从空闲发现后台任务，任务结束就收起、报一次完成，卸载之后不再敲库', async () => {
  vi.useFakeTimers();
  const toast = vi.fn();
  const job = { at: { status: 'running', stage: '采集缺失资料', checked: 2, total: 5 } as LibraryProcessingData };
  const served = await open({ status: 'idle' }, () => job.at);
  const mounted = await mountRoot(notice({ toast, mode: 'notice' }));

  expect(mounted.host.textContent).toBe('');
  await tick(10_000);
  expect(mounted.host.textContent).toContain('采集缺失资料');
  expect(mounted.host.querySelector('a')?.getAttribute('href')).toBe('/data-cleanup#libraryProcessing');
  expect(mounted.host.querySelector('[role="progressbar"]')?.getAttribute('aria-valuenow')).toBe('40');

  job.at = { status: 'complete', job_id: 'one', identified: 3, candidates: 2 };
  await tick(2000);
  expect(mounted.host.textContent).toBe('');
  expect(toast).toHaveBeenCalledTimes(1);

  await mounted.unmount();
  const asked = served.calls.length;
  await tick(20_000);
  expect(served.calls).toHaveLength(asked);
  expect(served.posts()).toEqual([]);
});

it('卡片被叫着盯任务时一直问，只在任务结束时报一次', async () => {
  vi.useFakeTimers();
  const toast = vi.fn();
  await open({ status: 'running', job_id: 'one' }, () => ({ status: 'complete', job_id: 'one' }));
  const onComplete = vi.fn();
  await mount(card({ toast, monitor: true, onComplete }));

  await tick(2000);
  expect(toast).toHaveBeenCalledTimes(1);
  // 复核与候选的读数归遗留层画，这一趟跑完要叫它重读一次。
  expect(onComplete).toHaveBeenCalledTimes(1);
  await tick(30_000);
  expect(toast).toHaveBeenCalledTimes(1);
});

it('刚结束的任务横幅第一次读到也报，同一个任务号只报一次', async () => {
  vi.useFakeTimers();
  const toast = vi.fn();
  const job: LibraryProcessingData = {
    status: 'complete', job_id: 'job-fresh', identified: 3, candidates: 2,
    completed_at: Date.now() / 1000,
  };
  await open(job);
  for (let round = 0; round < 2; round += 1) {
    const mounted = await mountRoot(notice({ toast, mode: 'notice' }));
    await tick(10_000);
    await mounted.unmount();
  }
  expect(toast).toHaveBeenCalledTimes(1);
  expect(toast).toHaveBeenNthCalledWith(
    1, '扫描与资料采集已完成：识别 3 个番号，取得 2 组作品资料，自动保存 0 条');
});

it('两个容器读同一趟任务：一个周期只问一次，撤掉一个另一个照常', async () => {
  vi.useFakeTimers();
  const served = await open({ status: 'running', checked: 2, total: 10, stage: '采集缺失资料' });
  const banner = await mountRoot(notice({ toast: vi.fn(), mode: 'notice' }));
  const panel = await mountRoot(card({ toast: vi.fn(), monitor: true }));

  await tick(2000);
  expect(served.calls, '两处各存一份状态的话，卡片说完成、横幅还挂着进度').toHaveLength(1);
  await tick(2000);
  expect(served.calls).toHaveLength(2);
  expect(banner.host.textContent).toContain('采集缺失资料');
  expect(panel.host.textContent).toContain('采集缺失资料');

  await panel.unmount();
  await tick(2000);
  expect(served.calls, '横幅还在页面上，节律不该跟着卡片一起停').toHaveLength(3);
});

it('两个容器的等待秒数每秒推进，不增加轮询请求，换文件和暂停时对齐快照', async () => {
  vi.useFakeTimers();
  const state: LibraryProcessingData = { status: 'running', checked: 2, total: 10,
    current_asset_id: 1, current_action: 'reading_local_cover', waited_seconds: 33 };
  const served = await open(state);
  const banner = await mountRoot(notice({ toast: vi.fn(), mode: 'notice' }));
  const panel = await mountRoot(card({ toast: vi.fn(), monitor: true }));
  expect(banner.host.textContent).toContain('已等待 33 秒');
  expect(panel.host.textContent).toContain('已等待 33 秒');
  await tick(1000);
  expect(banner.host.textContent).toContain('已等待 34 秒');
  expect(panel.host.textContent).toContain('已等待 34 秒');
  expect(served.calls).toHaveLength(0);
  await tick(1000);
  expect(banner.host.textContent).toContain('已等待 35 秒');
  expect(panel.host.textContent).toContain('已等待 35 秒');
  expect(served.calls).toHaveLength(1);
  await act(async () => {
    queryClient.setQueryData(LIBRARY_PROCESSING_KEY, { ...state, current_asset_id: 2, waited_seconds: 0 });
  });
  expect(banner.host.textContent).not.toContain('已等待 35 秒');
  await tick(1000);
  expect(banner.host.textContent).toContain('已等待 1 秒');
  expect(panel.host.textContent).toContain('已等待 1 秒');
  await act(async () => { queryClient.setQueryData(LIBRARY_PROCESSING_KEY, { ...state, status: 'paused' }) });
  expect(banner.host.textContent).not.toContain('已等待');
  expect(panel.host.textContent).not.toContain('已等待');
  await banner.unmount();
  await panel.unmount();
  const requests = served.calls.length;
  await tick(10_000);
  expect(served.calls).toHaveLength(requests);
});

it('卡片卸载之后轮询就停了', async () => {
  vi.useFakeTimers();
  const served = await open({ status: 'running', checked: 2, total: 10 });
  const panel = await mountRoot(card({ toast: vi.fn(), monitor: true }));
  await tick(2000);
  expect(served.calls).toHaveLength(1);

  await panel.unmount();
  await tick(20_000);
  expect(served.calls, '离开这一页之后那棵根还活着的话，它会照原节律接着敲库').toHaveLength(1);
});

it('来源说没有的计数带千分位，等待时长按分、时、天进位', () => {
  expect(notesLine({ querying_metadata: 1234567, fetching_cover: 0 }))
    .toBe('外部来源没有资料 1,234,567 部，7 天内不再问。');
  expect(currentLine({ status: 'running', current_action: 'fetching_cover', waited_seconds: 259200 } as LibraryProcessingData))
    .toBe('采集缺失封面 · 已等待 3 天 0 小时');
});

it('日常同步先显示流量预估，确认模式后才启动，取消不启动', async () => {
  const served = await open({ status: 'idle', speed_mode: 'standard' }, () => ({ status: 'running', job_id: 'one' }));
  const host = await mount(card({ toast: vi.fn() }));
  await click(buttonNamed('同步新增文件', host));
  expect(served.posts()).toEqual([]);
  expect(document.querySelector('dialog')?.textContent).toContain('可能让电脑变慢');
  await click(buttonNamed('取消', document.querySelector('dialog')!));
  expect(served.posts()).toEqual([]);
  await click(buttonNamed('同步新增文件', host));
  expect(document.querySelector('dialog [aria-label="流量预估"]')?.textContent).toContain('预计流量');
  expect(host.querySelector('[data-processing-controls]')).toBeNull();
  await chooseLow();
  await submit(document.querySelector('dialog form'));
  expect(served.posts()).toEqual([{ incremental:true, speed_mode: 'low' }]);
  expect(document.querySelector('dialog')).toBeNull();
});

it('暂停与继续使用同一个任务号，暂停不是完成，暂停时仍轮询', async () => {
  vi.useFakeTimers();
  const toast = vi.fn(), onComplete = vi.fn();
  let state: LibraryProcessingData = { status: 'running', job_id: 'one', checked: 2, total: 10,
    speed_mode: 'low', eta_kind: 'historical', eta_initial: true, eta_seconds_min: 1200, eta_seconds_max: 2400 };
  const served = await open(state, (method, body) => {
    if (method === 'POST') {
      const action = (body as { action: string }).action;
      state = { ...state, status: action === 'pause' ? 'pausing' : 'running' };
    }
    return state;
  });
  const host = await mount(notice({ toast, onComplete, mode: 'notice' }));
  expect(host.textContent).toContain('预计剩余约 20–40 分钟（粗估）');
  // 去任务详情的链接在左，暂停这类原地控制在右。
  const bar = actionOrder(host.querySelector('a[href="/data-cleanup#libraryProcessing"]')!.parentElement);
  expect(bar[0]).toBe('任务详情');
  expect(bar.indexOf('暂停')).toBeGreaterThan(0);
  await click(buttonNamed('暂停', host));
  expect(host.textContent).toContain('正在暂停，当前步骤结束后暂停');
  state = { ...state, status: 'paused' };
  await tick(2000);
  expect(buttonNamed('继续', host)).not.toBeNull();
  expect(host.textContent).toContain('已暂停，继续后更新预估');
  expect(onComplete).not.toHaveBeenCalled();
  expect(toast).not.toHaveBeenCalled();
  await click(buttonNamed('继续', host));
  expect(served.posts()).toEqual([{ action: 'pause', job_id: 'one' }, { action: 'resume', job_id: 'one' }]);
  expect(buttonNamed('暂停', host)).not.toBeNull();
});

it('首屏暂停状态在卡片和任务面保留进度与继续入口', async () => {
  await open({ status: 'paused', job_id: 'one', checked: 2, total: 10 });
  const host = await mount(card({ toast: vi.fn() }));
  const banner = await mount(notice({ toast: vi.fn(), mode: 'notice' }));
  expect(host.textContent).toContain('已暂停');
  expect(banner.textContent).toContain('已暂停');
  expect(buttonNamed('继续', host)).not.toBeNull();
  expect(buttonNamed('继续', banner)).not.toBeNull();
  expect(buttonNamed('标准', banner)).not.toBeNull();
  expect(host.querySelector('[role="progressbar"]')?.getAttribute('aria-valuenow')).toBe('2');
});

it('没有逐项问题的任务失败也能归档提示，可撤销，重新进来不再留那句已归档', async () => {
  const state: LibraryProcessingData = { status:'failed', job_id:'one', error:'任务未能自动恢复' };
  let archived = false;
  const served = await open(state, (method, body) => {
    if (method === 'POST') archived = (body as {action:string}).action === 'archive';
    return {...state,archived};
  });
  const toast = vi.fn();
  const host = await mount(card({toast}));
  expect(buttonNamed('导出完整问题清单',host)).toBeNull();
  const archive = buttonNamed('归档提示',host)!;
  expect(host.querySelector('[role="alert"]')!.contains(archive)).toBe(true);
  await click(archive);
  expect(served.posts()).toEqual([{action:'archive',job_id:'one'}]);
  expect(host.textContent).toContain('完整记录仍保留');
  expect(host.textContent).not.toContain('任务未能自动恢复');
  expect(toast).not.toHaveBeenCalled();
  await click(buttonNamed('撤销',host));
  expect(served.posts()).toEqual([{action:'archive',job_id:'one'},{action:'unarchive',job_id:'one'}]);
  expect(host.textContent).toContain('任务未能自动恢复');
  expect(host.textContent).not.toContain('完整记录仍保留');

  await open({...state,archived:true});
  const again = await mount(card({toast}));
  expect(again.textContent).not.toContain('任务未能自动恢复');
  expect(again.textContent).not.toContain('完整记录仍保留');
  expect(buttonNamed('撤销',again)).toBeNull();
});

it('模式切换失败保留服务端选中值和原位错误，可重试', async () => {
  await open({ status: 'running', job_id: 'one', speed_mode: 'standard' });
  vi.stubGlobal('fetch', vi.fn(async (_path: string, init?: RequestInit) => init?.method === 'POST'
    ? { ok: false, status: 409, json: async () => ({ error: '任务已变化，请刷新后重试' }) }
    : { ok: true, status: 200, json: async () => ({ status: 'running', job_id: 'one', speed_mode: 'standard' }) }));
  const host = await mount(notice({ toast: vi.fn(), mode: 'notice' }));
  await click(buttonNamed('标准', host));
  const slider = document.querySelector<HTMLInputElement>('input[type="range"]')!;
  await act(async () => {
    slider.dispatchEvent(new KeyboardEvent('keydown', { key: 'Home', bubbles: true }));
    slider.dispatchEvent(new KeyboardEvent('keyup', { key: 'Home', bubbles: true }));
  });
  expect(host.textContent).toContain('任务已变化，请刷新后重试');
  expect(buttonNamed('标准', host)).not.toBeNull();
  expect(slider.value).toBe('1');
  expect(slider.disabled).toBe(false);
});

it('预估按粗估与实测速率显示区间，缺少有效范围时等待估算', () => {
  const state: LibraryProcessingData = { status: 'running', eta_seconds_min: 1200, eta_seconds_max: 2400, eta_kind: 'historical' };
  expect(remainingTime(state)).toBe('预计剩余约 20–40 分钟（粗估）');
  expect(remainingTime({ ...state, eta_seconds_min: 600, eta_seconds_max: 900, eta_kind: 'measured', eta_scope: '资料采集' }))
    .toBe('预计剩余约 10–15 分钟 · 资料采集');
  expect(remainingTime({ ...state, eta_seconds_max: NaN })).toBe('正在估算剩余时间…');
  expect(remainingTime({ ...state, eta_seconds_min: 2500 })).toBe('正在估算剩余时间…');
  expect(remainingTime({ ...state, eta_seconds_min: 0, eta_seconds_max: 10 })).toBe('预计剩余不到 1 分钟');
  expect(remainingTime({ ...state, status: 'complete' })).toBe('');
});

it('处理较慢时各任务面显示等待进展，不沿用旧估时', async () => {
  await open({ status: 'running', job_id: 'slow', stalled: true,
    eta_seconds_min: 63, eta_seconds_max: 94, eta_kind: 'measured',
    current_action: 'reading_local', current_asset_name: '示例视频.mp4' });
  const host = await mount(card({ toast: vi.fn() }));
  const banner = await mount(notice({ toast: vi.fn(), mode: 'notice' }));
  for (const surface of [host, banner]) {
    expect(surface.textContent).toContain('等待当前文件响应，剩余时间待更新');
    expect(surface.textContent).not.toContain('预计剩余');
    expect(surface.textContent).toContain('检查配套文件');
  }
});

it('扫描总量未知时显示已发现文件数，已知阶段显示完成数', () => {
  expect(processingLine({ status: 'running', stage: '扫描文件', scanned: 12345 }))
    .toBe('扫描文件 · 已发现 12,345 个文件');
  expect(processingLine({ status: 'paused', checked: 38, total: 100 })).toBe('已暂停 · 38 / 100 项');
});

it('启动失败时提示弹窗保留模式选择和重试入口', async () => {
  await open({ status: 'idle' });
  vi.stubGlobal('fetch', vi.fn(async (_url: string, init?: RequestInit) => init?.method === 'POST'
    ? { ok: false, status: 400, json: async () => ({ error: '媒体目录不可用' }) }
    : { ok: true, status: 200, json: async () => ({ status: 'idle' }) }));
  const host = await mount(card({ toast: vi.fn() }));
  await click(buttonNamed('同步新增文件', host));
  await chooseLow();
  await submit(document.querySelector('dialog form'));
  expect(document.querySelector('dialog')?.textContent).toContain('媒体目录不可用');
  expect(document.querySelector<HTMLInputElement>('dialog input[type="range"]')?.value).toBe('0');
  expect(document.querySelector('[data-modal-confirm]')?.getAttribute('aria-busy')).toBeNull();
});
