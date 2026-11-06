import { act } from 'react';
import { afterEach, expect, it, vi } from 'vitest';
import { QueryClientProvider, notifyManager } from '@tanstack/react-query';
import { queryClient } from '../../src/react/query';
import { JavPage } from '../../src/react/jav/jav-page';
import { JavHeader } from '../../src/react/jav/jav-header';
import { discoveryKey, prefetchJav } from '../../src/react/jav/jav';
import { WANTS_KEY } from '../../src/react/wants/wants';
import { actionOrder, buttonNamed, click, mount, settle, type } from './render';

notifyManager.setScheduler(notify => notify());
afterEach(() => queryClient.clear());

/** 页头筛选框是名册页那个 `IndexSearch`：停手 300 毫秒才交出文字。 */
async function search(host: ParentNode, text: string) {
  await type(host.querySelector('[data-index-search] input'), text);
  await act(() => new Promise(resolve => { setTimeout(resolve, 320) }));
}

it('发现已有结果即时呈现，陈旧推荐在后台更新', async () => {
  const cached = { items: [{ id: 1, code: 'ABC-001' }], candidate_total: 1, limited: false };
  queryClient.setQueryData(discoveryKey('external'), cached, { updatedAt: Date.now() - 60_000 });
  let finish!: (response: Response) => void;
  vi.stubGlobal('fetch', vi.fn(() => new Promise<Response>(resolve => { finish = resolve })));
  const loaded = prefetchJav('discover', new AbortController().signal);
  const result = await Promise.race([loaded.then(() => 'ready'), new Promise(resolve => setTimeout(() => resolve('waiting'), 40))]);
  expect(result).toBe('ready');
  expect(queryClient.getQueryData(discoveryKey('external'))).toEqual(cached);
  finish({ ok: true, status: 200, json: async () => cached } as Response);
  await loaded;
});

it('想要已有清单立即返回，陈旧数据在后台更新', async () => {
  const cached = { items: [], counts: {}, scraping: false };
  queryClient.setQueryData(WANTS_KEY, cached, { updatedAt: Date.now() - 60_000 });
  let finish!: (response: Response) => void;
  const request = new Promise<Response>(resolve => { finish = resolve });
  const fetcher = vi.fn(() => request);
  vi.stubGlobal('fetch', fetcher);
  await prefetchJav('wants', new AbortController().signal);
  expect(queryClient.getQueryData(WANTS_KEY)).toEqual(cached);
  expect(fetcher).toHaveBeenCalledOnce();
  finish({ ok: true, status: 200, json: async () => cached } as Response);
  await settle();
  await prefetchJav('wants', new AbortController().signal);
  expect(fetcher).toHaveBeenCalledOnce();
});

it('JAV 分区导航有馆藏、新作、发现、想要四个入口，馆藏使用目录搜索', async () => {
  const navigate = vi.fn(), find = vi.fn();
  const host = await mount(<JavHeader tab="library" navigate={navigate} find={find} />);
  const tabs = [...host.querySelectorAll('[role="tab"]')];
  expect(tabs.map(tab => tab.textContent?.trim())).toEqual(['馆藏', '新作', '发现', '想要']);
  expect(tabs[0]?.getAttribute('aria-selected')).toBe('true');
  expect(host.querySelector('input')).toBeNull();
  await click(tabs[1]);
  expect(navigate).toHaveBeenLastCalledWith('/jav?tab=releases');
  await click(tabs[2]);
  expect(navigate).toHaveBeenLastCalledWith('/jav?tab=discover');
  await click(tabs[3]);
  expect(navigate).toHaveBeenLastCalledWith('/jav?tab=wants');
  await click(buttonNamed('查找资源', host));
  expect(find).toHaveBeenCalledOnce();
});

it('从想要分区返回馆藏时打开 JAV 目录', async () => {
  const navigate = vi.fn();
  const host = await mount(<JavHeader tab="wants" navigate={navigate} find={vi.fn()} />);
  expect(host.querySelector('[role="tab"][aria-selected="true"]')?.textContent?.trim()).toBe('想要');
  await click(host.querySelector('[role="tab"]'));
  expect(navigate).toHaveBeenCalledWith('/?jav=1');
});

it('发现按范围读取，清除文字和标签恢复列表，卡片打开对应详情', async () => {
  const navigate = vi.fn();
  const common = { title: '示例作品', performers: '女优', studio: '厂牌', has_cover: false,
    release_date: '2010-01-01', wanted: false, reasons: ['常看的厂牌：厂牌'] };
  const fetcher = vi.fn(async (url: string) => ({ ok: true, status: 200, json: async () => ({
    items: url.includes('scope=library') ? [{ ...common, id: 22, asset_id: 22, code: 'ABC-022', tags: ['恋足'] }]
      : [{ ...common, id: 1, code: 'ABC-001', score: 1, tags: ['恋足'], link: 'https://example.test/work' },
        { ...common, id: 2, code: 'ABC-002', score: 2, tags: ['剧情'] }],
  }) }));
  vi.stubGlobal('fetch', fetcher);
  const host = await mount(<QueryClientProvider client={queryClient}><JavPage tab="discover" readOnly navigate={navigate} receipt={vi.fn()} /></QueryClientProvider>);
  await settle();
  expect(host.querySelectorAll('[data-jav-card]')).toHaveLength(2);
  expect(actionOrder(host.querySelector('[data-jav-card] [data-jav-actions]'))).toEqual(['作品来源', '想要', '查找资源']);
  expect(host.querySelector('[data-jav-card] h3')?.textContent).toContain('ABC-001');
  await click(host.querySelector('[data-jav-card] [data-media-tag]'));
  expect(host.querySelectorAll('[data-jav-card]')).toHaveLength(1);
  await click(buttonNamed('清除筛选', host));
  expect(host.querySelectorAll('[data-jav-card]')).toHaveLength(2);
  await search(host, 'ABC-001');
  expect(host.querySelectorAll('[data-jav-card]')).toHaveLength(1);
  await search(host, '');
  expect(host.querySelectorAll('[data-jav-card]')).toHaveLength(2);
  await click(host.querySelector('[data-jav-card] h3'));
  expect(navigate).toHaveBeenLastCalledWith('/works/ABC-001');
  await click(buttonNamed('馆藏探索', host));
  await settle();
  expect(fetcher.mock.calls.some(([url]) => url.includes('scope=library'))).toBe(true);
  await click(host.querySelector('[data-jav-card] h3'));
  expect(navigate).toHaveBeenLastCalledWith('/assets/22');
  expect(buttonNamed('已入库', host)?.disabled).toBe(true);
});

it('新作分区的女优、厂牌、标签只列接口给的订阅新作筛选项，点了在本分区里筛并回到第 1 页', async () => {
  const before = location.pathname + location.search;
  history.replaceState(null, '', '/jav?tab=releases&page=2');
  const facets = { performers: [{ name: '女优甲', count: 2, id: 7, has_image: false }],
    studios: [{ name: '厂牌甲', count: 1, has_logo: false }], tags: [{ name: '中出内射', count: 1 }] };
  const fetcher = vi.fn(async (url: string) => ({ ok: true, status: 200, json: async () => ({
    items: [{ id: 1, code: 'ABC-001', title: '示例作品', performers: '女优甲', studio: '厂牌甲', has_cover: false,
      release_date: '2026-11-10', wanted: false, tags: ['中出内射'] }],
    total: 30, candidate_total: 30, page: Number(new URL(url, location.origin).searchParams.get('page')), size: 24, facets }) }));
  vi.stubGlobal('fetch', fetcher);
  const navigate = vi.fn();
  const host = await mount(<QueryClientProvider client={queryClient}><JavPage tab="releases" readOnly navigate={navigate} receipt={vi.fn()} /></QueryClientProvider>);
  await settle();
  const asked = () => new URL(String(fetcher.mock.calls.at(-1)?.[0]), location.origin).searchParams;
  expect(asked().get('page')).toBe('2');
  expect([...host.querySelectorAll('[data-tier-performer]')].map(node => node.textContent)).toEqual(['女女优甲']);
  expect([...host.querySelectorAll('[data-tier-studio]')].map(node => node.textContent)).toEqual(['厂牌厂牌甲1']);
  expect([...host.querySelectorAll('[data-catalog-tag]')].map(node => node.textContent)).toEqual(['中出内射1']);
  expect(host.querySelector('nav[aria-label="新作分页"] [aria-current="page"]')?.textContent).toBe('2');
  await click(host.querySelector('[data-tier-performer]'));
  await settle();
  expect([asked().get('performer'), asked().get('page')]).toEqual(['女优甲', '1']);
  expect(new URLSearchParams(location.search).get('performer')).toBe('女优甲');
  expect(host.querySelector('[data-tier-performer]')?.getAttribute('aria-pressed')).toBe('true');
  await click(host.querySelector('[data-jav-card] h3'));
  expect(navigate).toHaveBeenLastCalledWith('/works/ABC-001');
  history.replaceState(null, '', before);
});

it('新作分区切到列表：作品、艺人、厂牌各占一列，表头点时长按时长排序', async () => {
  const before = location.pathname + location.search;
  history.replaceState(null, '', '/jav?tab=releases');
  localStorage.setItem('peach.catalog-view.v1', 'list');
  const fetcher = vi.fn(async (_url: string) => ({ ok: true, status: 200, json: async () => ({
    items: [{ id: 1, code: 'ABC-001', title: '示例作品', performers: '女优甲', studio: '厂牌甲', has_cover: false, release_date: '2026-11-10',
      wanted: false, tags: ['中出内射'], duration: 7200, source_score: 4.5, performer_refs: [{ id: 7, name: '女优甲', has_image: false }] }],
    total: 1, candidate_total: 1, page: 1, size: 24,
    facets: { performers: [], studios: [{ name: '厂牌甲', count: 1, has_logo: false }], tags: [] } }) }));
  vi.stubGlobal('fetch', fetcher);
  try {
    const navigate = vi.fn();
    const host = await mount(<QueryClientProvider client={queryClient}><JavPage tab="releases" readOnly navigate={navigate} receipt={vi.fn()} /></QueryClientProvider>);
    await settle();
    expect(host.querySelector('[data-jav-card]')).toBeNull();
    const row = host.querySelector('[data-release-row]')!;
    expect(row.querySelector('[data-list-identity] [data-media-avatar]')).toBeNull();
    expect(row.querySelector('[data-list-people] [data-media-avatar]')).not.toBeNull();
    expect(row.querySelector('[data-list-people]')?.textContent).toContain('女优甲');
    expect(row.querySelector('[data-list-library]')?.textContent).toBe('厂厂牌甲');
    await click(host.querySelector('[role="columnheader"][data-key="dur"]'));
    await settle();
    const asked = new URL(String(fetcher.mock.calls.at(-1)?.[0]), location.origin).searchParams;
    expect(asked.get('sort')).toBe('duration');
    await click(row.querySelector('[data-list-name]'));
    expect(navigate).toHaveBeenLastCalledWith('/works/ABC-001');
  } finally {
    localStorage.removeItem('peach.catalog-view.v1');
    history.replaceState(null, '', before);
    vi.unstubAllGlobals();
  }
});

it('新作分区默认按发行时间倒序，排序键再点翻方向，换一批按新种子重排且不按下排序键', async () => {
  const before = location.pathname + location.search;
  history.replaceState(null, '', '/jav?tab=releases');
  const fetcher = vi.fn(async (_url: string) => ({ ok: true, status: 200, json: async () => ({ items: [], total: 0, candidate_total: 0, page: 1, size: 24,
    facets: { performers: [], studios: [], tags: [] } }) }));
  vi.stubGlobal('fetch', fetcher);
  const host = await mount(<QueryClientProvider client={queryClient}><JavPage tab="releases" readOnly navigate={vi.fn()} receipt={vi.fn()} /></QueryClientProvider>);
  await settle();
  const asked = () => new URL(String(fetcher.mock.calls.at(-1)?.[0]), location.origin).searchParams;
  expect([...host.querySelectorAll('[data-entity-sort]')].map(node => node.textContent)).toEqual(['发行时间', '来源评分', '时长', '番号', '口味']);
  expect([asked().get('sort'), asked().get('direction')]).toEqual(['release_date', 'desc']);
  await click(host.querySelector('[data-entity-sort="source_score"]'));
  await settle();
  expect([asked().get('sort'), asked().get('direction')]).toEqual(['source_score', 'desc']);
  await click(host.querySelector('[data-entity-sort="source_score"]'));
  await settle();
  expect([asked().get('sort'), asked().get('direction')]).toEqual(['source_score', 'asc']);
  await click(host.querySelector('[data-entity-batch]'));
  await settle();
  expect(asked().get('sort')).toBe('random');
  expect(asked().get('seed')).toBeTruthy();
  expect(host.querySelector('[data-entity-sort][aria-pressed="true"]')).toBeNull();
  history.replaceState(null, '', before);
});

it('没有推荐时空态的查看口味在左，主入口在右', async () => {
  vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, status: 200, json: async () => ({ items: [] }) })));
  const host = await mount(<QueryClientProvider client={queryClient}><JavPage tab="discover" readOnly navigate={vi.fn()} receipt={vi.fn()} /></QueryClientProvider>);
  await settle();
  expect(actionOrder(host.querySelector('[data-empty-state]'))).toEqual(['查看口味', '浏览馆藏']);
  const main = [...host.querySelectorAll('[data-empty-state] a')].find((link) => link.textContent === '浏览馆藏');
  expect(main?.className).toContain('bg-button-primary');
});

it('发现页读取作品资料的进度单独成框', async () => {
  history.replaceState(null, '', '/jav?tab=discover');
  vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, status: 200, json: async () => ({ items: [], candidate_total: 0, limited: false,
    metadata_job: { job_id: 'm', status: 'running', completed: 37, total: 100, failed: 0, requests: 0, bytes: 0 } }) })));
  const host = await mount(<QueryClientProvider client={queryClient}><JavPage tab="discover" readOnly navigate={vi.fn()} receipt={vi.fn()} /></QueryClientProvider>);
  await settle();
  const progress = host.querySelector('[data-task-progress]');
  expect(progress?.getAttribute('data-task-progress')).toBe('framed');
  expect(progress?.querySelector('[role="progressbar"]')?.getAttribute('aria-valuenow')).toBe('37');
});
