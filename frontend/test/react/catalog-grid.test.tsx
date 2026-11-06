/* 馆藏卡片网格：一屏卡片怎么排（取数的查询串、折叠、Mix 落位、竖屏带落点），以及一张卡
 * 画出什么、点哪里去哪里。 */
import { act, useState } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { describe, expect, it, vi } from 'vitest';

import { MediaCard, cardRatio, type MediaCardVariant } from '../../src/react/components/media-card';
import { CatalogGridPage, LoadMore } from '../../src/react/catalog-grid/catalog-grid-page';
import type { CatalogGridProps } from '../../src/react/catalog-grid/types';
import {
  MIX_SLOT, SHORTS_BATCH, arrangeTiles, catalogParams, collapseGroups, fetchCatalogPage, latestCatalogPages, mixSeed, nextOffset,
  shortsBoundaries, shortsParams, replaceCatalogItem, type GridPage,
} from '../../src/react/catalog-grid/catalog-grid';
import type { MediaCardActions, MediaCardHelpers, MediaCardLayout, MediaItem } from '../../src/react/catalog-grid/types';

import { click, mount, settle } from './render';
import { queryClient } from '../../src/react/query';

const SMALL: MediaCardLayout = { active: false, size: 'small', portrait: false, javImage: 'cover' };

const item = (id: number, extra: Partial<MediaItem> = {}): MediaItem => ({ id, name: `作品 ${id}`, has_thumb: true, ...extra });
const page = (items: MediaItem[], offset = 0, extra: Partial<GridPage> = {}): GridPage => ({ items, offset, ...extra });

describe('目录取数', () => {
  it('详情修改同步到卡片分页和表格页，同页其它作品保持原值', () => {
    const cardKey = ['catalog-grid', 'catalog', 'cache-test', 0];
    const tableKey = ['catalog-grid', 'table', 'cache-test', 0];
    queryClient.setQueryData(cardKey, { pages: [page([item(100), item(101)], 0)], pageParams: [0] });
    queryClient.setQueryData(tableKey, { items: [item(100), item(101)], total: 2 });
    replaceCatalogItem(100, { feedback: 'seen', watch_later: true });
    const cards = queryClient.getQueryData<{ pages: GridPage[] }>(cardKey)!.pages[0]!.items;
    const rows = queryClient.getQueryData<{ items: MediaItem[] }>(tableKey)!.items;
    for (const items of [cards, rows]) {
      expect(items[0]).toMatchObject({ id: 100, feedback: 'seen', watch_later: true });
      expect(items[1]!.feedback).toBeUndefined();
    }
    queryClient.removeQueries({ queryKey: cardKey });
    queryClient.removeQueries({ queryKey: tableKey });
  });
  it('刷新代次认领同一集合的完整分页，筛选不同不共用', () => {
    const old = { pages: [page([item(801)]), page([item(802)], 60)], pageParams: [0,60] };
    queryClient.setQueryData(['catalog-grid','catalog','q=wall-retain',1], old);
    const retained = latestCatalogPages(['catalog-grid','catalog','q=wall-retain',2]);
    expect(retained).toBe(old);
    expect(retained?.pages).toHaveLength(2);
    expect(latestCatalogPages(['catalog-grid','catalog','q=another-wall',2])).toBeUndefined();
    queryClient.removeQueries({ queryKey: ['catalog-grid','catalog','q=wall-retain'] });
  });
  it('查询串只带有值的筛选，排除竖屏只在壳说要排除时加', () => {
    expect(catalogParams({ sort: 'seed', q: '', tag: '苗条' }, false)).toBe('sort=seed&tag=%E8%8B%97%E6%9D%A1');
    expect(new URLSearchParams(catalogParams({ sort: 'seed' }, true)).get('exclude_vertical')).toBe('1');
    expect(new URLSearchParams(catalogParams({ q: '竖屏' }, false)).has('exclude_vertical')).toBe(false);
  });

  it('一页取「每批条数」那么多，往后的页不数总数', async () => {
    const fetcher = vi.fn(async (_url: string) => ({ ok: true, status: 200, json: async () => ({ items: [item(1)], has_more: true }) }));
    vi.stubGlobal('fetch', fetcher);
    await fetchCatalogPage('sort=seed', 0, 48, false, new AbortController().signal);
    await fetchCatalogPage('sort=seed', 48, 48, false, new AbortController().signal);
    const first = new URL(fetcher.mock.calls[0]![0], 'http://peach.test').searchParams;
    const second = new URL(fetcher.mock.calls[1]![0], 'http://peach.test').searchParams;
    expect([first.get('limit'), first.get('offset'), first.has('count')]).toEqual(['48', '0', false]);
    expect([second.get('limit'), second.get('offset'), second.get('count')]).toEqual(['48', '48', '0']);
  });

  it('第一页为空时再问一次整个馆藏是不是空的，回收站不问', async () => {
    const fetcher = vi.fn(async (_url: string) => ({ ok: true, status: 200, json: async () => ({ items: [], total: 0 }) }));
    vi.stubGlobal('fetch', fetcher);
    const result = await fetchCatalogPage('tag=x', 0, 60, false, new AbortController().signal);
    expect(fetcher.mock.calls[1]![0]).toBe('/api/items?limit=1&thumb=0');
    expect(result.libraryEmpty).toBe(true);

    fetcher.mockClear();
    await fetchCatalogPage('state=trash', 0, 60, true, new AbortController().signal);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it('下一页从哪儿取：第一页看总数，往后看 has_more', () => {
    const next = nextOffset(60);
    expect(next(page([item(1)], 0, { total: 100 }))).toBe(60);
    expect(next(page([item(1)], 0, { total: 1 }))).toBeUndefined();
    expect(next(page([item(1)], 60, { has_more: true }))).toBe(120);
    expect(next(page([item(1)], 60, { has_more: false }))).toBeUndefined();
  });

  it('竖屏带跟着主列表的筛选走，一条取一批竖屏', () => {
    const params = new URLSearchParams(shortsParams({ sort: 'seed', tag: '' }, 36));
    expect(Object.fromEntries(params)).toEqual({ sort: 'seed', orient: '竖屏', limit: String(SHORTS_BATCH), offset: '36' });
  });
});

/** 测试环境没有相交观察：记下每个观察器和它正看着的元素，由用例决定哨兵此刻在不在视口附近。 */
class FakeObserver {
  static all: FakeObserver[] = [];
  readonly watched = new Set<Element>();
  observations = 0;
  constructor(private readonly callback: IntersectionObserverCallback) { FakeObserver.all.push(this) }
  observe(target: Element) { this.watched.add(target); this.observations += 1 }
  unobserve(target: Element) { this.watched.delete(target) }
  disconnect() { this.watched.clear() }
  takeRecords() { return [] }
  /** 哨兵在视口附近：照真观察器的样子，对正看着的每个元素报一次相交。 */
  near() {
    const entries = [...this.watched].map((target) => ({ target, isIntersecting: true }) as unknown as IntersectionObserverEntry);
    return act(async () => { this.callback(entries, this as unknown as IntersectionObserver) });
  }
  static latest() { return FakeObserver.all[FakeObserver.all.length - 1]! }
}

describe('续页', () => {
  type Reply = { ok: boolean; status: number; json(): Promise<unknown> };
  const reply = (body: unknown): Reply => ({ ok: true, status: 200, json: async () => body });

  /** 每页 3 张、共 9 张的目录；`hold` 打开后第一页那一问停在路上，模拟结果版本变化触发的整列重读。 */
  function catalogServer() {
    const held: Array<() => void> = [];
    let hold = false;
    const fetcher = vi.fn((input: string, init?: RequestInit) => {
      const url = new URL(String(input), 'http://peach.test');
      const offset = Number(url.searchParams.get('offset') || 0);
      const body = { items: [1, 2, 3].map((n) => item(offset + n)), total: 9, has_more: offset + 3 < 9 };
      if (!hold || offset !== 0) return Promise.resolve(reply(body));
      return new Promise<Reply>((resolve, reject) => {
        held.push(() => resolve(reply(body)));
        init?.signal?.addEventListener('abort', () => { reject(new DOMException('已中止', 'AbortError')) });
      });
    });
    vi.stubGlobal('fetch', fetcher);
    const offsets = () => fetcher.mock.calls.map(([input]) => new URL(String(input), 'http://peach.test').searchParams.get('offset'));
    return { offsets, holdFirstPage: () => { hold = true }, release: () => { for (const settle of held.splice(0)) settle() } };
  }

  const props = (filters: Record<string, string>): CatalogGridProps => ({
    mode: 'catalog', layout: SMALL, selectMode: false, selected: new Set(), seekSeconds: 10, revision: 0,
    helpers: { badgeHtml: () => '', titleHtml: (_it, raw) => raw, displayName: (_it, raw) => raw, tagLabel: (tag) => tag },
    actions: {
      open: vi.fn(), openResource: vi.fn(), openShort: vi.fn(), openShorts: vi.fn(), openMix: vi.fn(),
      openEntity: vi.fn(), openUnowned: vi.fn(), toggleTag: vi.fn(), toggleSelection: vi.fn(),
      watchLater: vi.fn(async () => {}), rate: vi.fn(async () => {}), resourceOperation: vi.fn(async () => {}),
      mixRelated: vi.fn(async () => []), canFlip: () => true,
    },
    skeletonHtml: () => '', wireDrag: vi.fn(), settled: vi.fn(), filters, batchSize: 3, groupCollapse: true,
    excludeVertical: false, mix: false, shorts: false, onCount: vi.fn(), emptyHtml: () => '', canLoadMore: () => true,
  });
  const cards = (host: ParentNode) => host.querySelectorAll('[data-media-grid] > [data-media-card]').length;
  /** 请求链上有 fetch、json、查询缓存与重画几段：一拍一拍放行，直到条件成立。 */
  async function until(ok: () => boolean, what: string) {
    for (let step = 0; step < 200; step += 1) {
      if (ok()) return;
      await act(async () => { await new Promise((resolve) => { setTimeout(resolve, 0) }) });
    }
    throw new Error(`一直没等到：${what}`);
  }

  it('结果版本变化引起的整列重读还在路上时滚到底：续页先停掉重读、当场取下一页', async () => {
    vi.stubGlobal('IntersectionObserver', FakeObserver);
    const server = catalogServer();
    const filters = { sort: 'seed', q: '续页压过重读' };
    const host = await mount(<QueryClientProvider client={queryClient}><CatalogGridPage {...props(filters)} /></QueryClientProvider>);
    await until(() => cards(host) === 3, '第一页');
    expect(host.querySelector('[data-load-more]')?.textContent, '三颗点已经在动，字不带省略号').toBe('载入中');
    await FakeObserver.latest().near();
    await until(() => cards(host) === 6, '第二页');

    server.holdFirstPage();
    await act(async () => { void queryClient.invalidateQueries({ queryKey: ['catalog-grid'] }, { cancelRefetch: false }) });
    await until(() => server.offsets().at(-1) === '0', '整列重读从第一页取起，停在路上');
    await FakeObserver.latest().near();
    await until(() => cards(host) === 9, '续页不等整列重读取完，当场接上第三页');
    expect(server.offsets().filter((offset) => offset === '6')).toHaveLength(1);
    server.release();
    await settle();
    queryClient.removeQueries({ queryKey: ['catalog-grid'] });
  });

  it('竖屏带与主网格同一个「合并分卷与版本」：开着一组分卷只出一张整组卡，关着各卷各自成卡、不标卷数', async () => {
    vi.stubGlobal('IntersectionObserver', FakeObserver);
    const group = { key: 'FC2-PPV-3189161', seed_id: 41, count: 2, title: 'FC2-PPV-3189161', total_duration: 1200 };
    const strip = [item(41, { part_group: group, duration: 600 }), item(43), item(42, { part_group: group, duration: 600 })];
    vi.stubGlobal('fetch', vi.fn((input: string) => {
      const url = new URL(String(input), 'http://peach.test');
      const body = url.searchParams.get('orient') === '竖屏'
        ? { items: strip, total: strip.length, has_more: false }
        : { items: [1, 2, 3].map((n) => item(n)), total: 3, has_more: false };
      return Promise.resolve(reply(body));
    }));
    const shorts = (host: ParentNode) => [...host.querySelectorAll<HTMLElement>('[data-shorts-row] [data-media-card]')];
    for (const collapse of [true, false]) {
      const host = await mount(<QueryClientProvider client={queryClient}>
        <CatalogGridPage {...props({ sort: 'seed', q: `竖屏带折叠 ${collapse}` })} shorts groupCollapse={collapse} />
      </QueryClientProvider>);
      await until(() => shorts(host).length > 0, '竖屏带插进网格');
      const cardsInStrip = shorts(host);
      const badges = cardsInStrip.map((card) => card.querySelector('[data-media-group]')?.textContent || '');
      if (collapse) {
        expect(cardsInStrip.map((card) => card.dataset.id)).toEqual(['41', '43']);
        expect(badges).toEqual(['2 卷', '']);
      } else {
        expect(cardsInStrip.map((card) => card.dataset.id)).toEqual(['41', '43', '42']);
        expect(badges.every((text) => !text), '各卷各自成卡，卡上不标整组卷数').toBe(true);
        expect(cardsInStrip[0]!.querySelector('[data-media-duration]')?.textContent, '时长是这一卷自己的').toBe('10:00');
      }
    }
    queryClient.removeQueries({ queryKey: ['catalog-grid'] });
  });

  /* `orient=竖屏` 的接口形状（`attach_multipart_groups` 按画幅收窄）：FC2-PPV-3189161 五卷里只有
     后两卷竖屏，组写 2 卷与两卷的合计；FC2-PPV-9 三卷里只有一卷竖屏，组只剩这一卷。 */
  const mixedGroup = { key: 'FC2-PPV-3189161', seed_id: 1, count: 2, title: 'FC2-PPV-3189161', total_duration: 1500, total_size: 2500 };
  const loneGroup = { key: 'FC2-PPV-9', seed_id: 7, count: 1, title: 'FC2-PPV-9', total_duration: 300, total_size: 700 };
  const portraitParts = [
    item(4, { part_group: mixedGroup, duration: 600, size: 1000 }), item(43),
    item(5, { part_group: mixedGroup, duration: 900, size: 1500 }),
    item(9, { name: 'FC2-PPV-9 part3', part_group: loneGroup, duration: 300, size: 700 }),
  ];
  const groupBadges = (cards: HTMLElement[]) => cards.map((card) => [
    card.dataset.id, card.querySelector('[data-media-group]')?.textContent || '',
    card.querySelector('[data-media-duration]')?.textContent || '', card.hasAttribute('data-stacked'),
  ]);

  it('竖屏带的整组卡照接口按竖屏卷计卷数与时长；组里只剩一卷竖屏就是普通单卷卡', async () => {
    vi.stubGlobal('IntersectionObserver', FakeObserver);
    vi.stubGlobal('fetch', vi.fn((input: string) => {
      const url = new URL(String(input), 'http://peach.test');
      const body = url.searchParams.get('orient') === '竖屏'
        ? { items: portraitParts, total: portraitParts.length, has_more: false }
        : { items: [1, 2, 3].map((n) => item(n)), total: 3, has_more: false };
      return Promise.resolve(reply(body));
    }));
    const shorts = (host: ParentNode) => [...host.querySelectorAll<HTMLElement>('[data-shorts-row] [data-media-card]')];
    for (const collapse of [true, false]) {
      const host = await mount(<QueryClientProvider client={queryClient}>
        <CatalogGridPage {...props({ sort: 'seed', q: `竖屏带只算竖屏卷 ${collapse}` })} shorts groupCollapse={collapse} />
      </QueryClientProvider>);
      await until(() => shorts(host).length > 0, '竖屏带插进网格');
      if (collapse) {
        expect(groupBadges(shorts(host))).toEqual([
          ['4', '2 卷', '25:00', true], ['43', '', '尚未探查', false], ['9', '', '5:00', false],
        ]);
      } else {
        expect(groupBadges(shorts(host)), '合并关着各竖屏卷各自成卡').toEqual([
          ['4', '', '10:00', false], ['43', '', '尚未探查', false], ['5', '', '15:00', false], ['9', '', '5:00', false],
        ]);
      }
    }
    queryClient.removeQueries({ queryKey: ['catalog-grid'] });
  });

  it('一趟续页没接上新页时，哨兵按它此刻的位置再判一遍，还在视口附近就接着取', async () => {
    vi.stubGlobal('IntersectionObserver', FakeObserver);
    const load = vi.fn(async () => {});
    await mount(<LoadMore entity={false} load={load} enabled={() => true} />);
    const observer = FakeObserver.latest();
    expect(observer.observations).toBe(1);
    await observer.near();
    await settle();
    expect(load).toHaveBeenCalledTimes(1);
    expect(observer.observations, '取完重新观察一次，真观察器会就此再报一次相交').toBe(2);
    await observer.near();
    await settle();
    expect(load).toHaveBeenCalledTimes(2);
  });
});

describe('一屏卡片的排法', () => {
  const parts = (key: string, seed: number) => ({ key, seed_id: seed, count: 2 });
  const editions = (key: string, seed: number) => ({ key, seed_id: seed, count: 2, editions: ['原版', '无码'] });

  it('分卷与版次各自折叠，跨页也只留第一次出现的那张；开关关掉就不折', () => {
    const seen = { parts: new Set<string>(), editions: new Set<string>() };
    const first = [item(1, { part_group: parts('P', 1) }), item(2, { part_group: parts('P', 1) }), item(3, { edition_group: editions('E', 3) })];
    expect(collapseGroups(first, seen, true).map((x) => x.id)).toEqual([1, 3]);
    expect(collapseGroups([item(4, { edition_group: editions('E', 3) }), item(5)], seen, true).map((x) => x.id)).toEqual([5]);
    expect(collapseGroups(first, { parts: new Set(), editions: new Set() }, false).map((x) => x.id)).toEqual([1, 2, 3]);
  });

  it('每一页够 8 张就在第 8 位插一张 Mix；翻页重复出现的条目只画一次', () => {
    const named = (id: number) => item(id, { creator: `作者 ${id}` });
    const first = Array.from({ length: 20 }, (_, index) => named(index + 1));
    const second = [named(20), ...Array.from({ length: 9 }, (_, index) => named(index + 21))];
    const { tiles, pageStarts } = arrangeTiles([page(first), page(second, 20)], { collapse: true, mix: true, javImage: 'cover' });
    expect(tiles[MIX_SLOT]?.kind).toBe('mix');
    expect(pageStarts).toEqual([0, 21]);
    const ids = tiles.flatMap((tile) => (tile.kind === 'card' ? [tile.item.id] : []));
    expect(ids.filter((id) => id === 20)).toHaveLength(1);
    expect(tiles[pageStarts[1]! + MIX_SLOT]?.kind).toBe('mix');
    expect(arrangeTiles([page(first)], { collapse: true, mix: false, javImage: 'cover' }).tiles.some((tile) => tile.kind === 'mix')).toBe(false);
  });

  it('Mix 的种子不取它挨着的那张：从 Mix 位往下隔一屏找有图有署名的，都没署名就取末尾', () => {
    const visible = Array.from({ length: 20 }, (_, index) => item(index + 1, { creator: `作者 ${index + 1}` }));
    expect(mixSeed(visible, 'cover')?.id).toBe(MIX_SLOT + 9);
    const anonymous = Array.from({ length: 20 }, (_, index) => item(index + 1, { has_thumb: false }));
    expect(mixSeed(anonymous, 'cover')?.id).toBe(20);
  });

  it('竖屏带落在这一页新增那几行的行边界上，两端各留至少一行', () => {
    expect(shortsBoundaries(20, 0, 4)).toEqual([4, 8, 12, 16]);
    expect(shortsBoundaries(20, 10, 4)).toEqual([12, 16]);
    expect(shortsBoundaries(4, 0, 4)).toEqual([]);
  });
});

describe('比例', () => {
  const jav = item(1, { is_jav: true, code: 'ABC-001', has_cover: true });
  const ratio = (target: MediaItem, variant: MediaCardVariant, layout: Partial<MediaCardLayout>) =>
    cardRatio(target, variant, { ...SMALL, ...layout });

  it('一个列表里的卡等高：比例只由语境决定，不看单条视频的宽高', () => {
    expect(ratio(item(2, { width: 1080, height: 1920 }), 'grid', {})).toBeCloseTo(16 / 9);
    expect(ratio(item(2), 'short', {})).toBeCloseTo(9 / 16);
    expect(ratio(item(2), 'grid', { portrait: true })).toBeCloseTo(9 / 16);
  });

  it('大图统一所有作品的画面框，未启用的视图使用横框', () => {
    expect(ratio(jav, 'grid', { active: true, size: 'big' })).toBe(0.75);
    expect(ratio(item(2), 'grid', { active: true, size: 'big' })).toBe(0.75);
    expect(ratio(jav, 'grid', { active: false, size: 'big' })).toBeCloseTo(16 / 9);
    expect(ratio(jav, 'grid', { active: true, size: 'small' })).toBeCloseTo(16 / 9);
  });
});

describe('作品卡', () => {
  const helpers: MediaCardHelpers = {
    badgeHtml: (location) => `<span>${location}</span>`,
    titleHtml: (_it, raw) => raw,
    displayName: (_it, raw) => raw,
    tagLabel: (tag) => `#${tag}`,
  };
  const actionsFor = (): MediaCardActions => ({
    open: vi.fn(), openResource: vi.fn(), openShort: vi.fn(), openShorts: vi.fn(), openMix: vi.fn(),
    openEntity: vi.fn(), openUnowned: vi.fn(), toggleTag: vi.fn(), toggleSelection: vi.fn(),
    watchLater: vi.fn(async (_it: MediaItem, onChange: (on: boolean) => void) => onChange(true)),
    rate: vi.fn(async () => {}),
    resourceOperation: vi.fn(async () => {}), mixRelated: vi.fn(async () => []), canFlip: () => true,
  });
  const render = async (target: MediaItem, options: { variant?: MediaCardVariant; selectMode?: boolean; layout?: MediaCardLayout } = {}) => {
    const actions = actionsFor();
    const onOpen = vi.fn();
    const host = await mount(
      <MediaCard item={target} variant={options.variant || 'grid'} layout={options.layout || SMALL} selected={false}
        selectMode={!!options.selectMode} seekSeconds={10} helpers={helpers} actions={actions} onOpen={onOpen} />,
    );
    return { host, actions, onOpen, card: host.querySelector<HTMLElement>('[data-media-card]')! };
  };

  it.each([
    [{ duration: null }, '尚未探查'],
    [{ duration: -1 }, '探查错误'],
    [{ duration: 0 }, '时长未取得'],
    [{ duration: null, cost: 'metered' }, '流量保护 · 未探查'],
    [{ duration: -1, cost: 'metered' }, '探查错误'],
    [{ duration: null, is_strm: true }, 'STRM 不自动探查'],
    [{ duration: null, name: '作品.ISO' }, 'ISO 不自动探查'],
    [{ duration: null, location: 'online' }, '来源未提供时长'],
    [{ duration: 60 }, '1:00'],
  ] as [Partial<MediaItem>, string][])('时长角标按已有记录区分缺失原因 %j', async (fields, expected) => {
    const { host } = await render(item(7, fields));
    expect(host.querySelector('[data-media-duration]')?.textContent).toBe(expected);
  });

  it('点标题打开，点署名进资料页，点「未归属」进那一批，点标签在这一屏筛它', async () => {
    const credited = await render(item(7, { creator: '某某', tags: ['苗条'] }));
    await click(credited.host.querySelector('[data-media-title]'));
    expect(credited.onOpen).toHaveBeenCalledWith(expect.objectContaining({ id: 7 }), credited.card);
    await click(credited.host.querySelector('[data-media-who]'));
    expect(credited.actions.openEntity).toHaveBeenCalledWith('creator', '某某');
    await click(credited.host.querySelector('[data-media-tag]'));
    expect(credited.actions.toggleTag).toHaveBeenCalledWith('苗条');
    expect(credited.onOpen).toHaveBeenCalledTimes(1);

    const unowned = await render(item(8));
    await click(unowned.host.querySelector('[data-open-unowned]'));
    expect(unowned.actions.openUnowned).toHaveBeenCalledTimes(1);
    expect(unowned.onOpen).not.toHaveBeenCalled();
  });

  it('多选模式或按着修饰键时，点哪里都是切换选中；Shift 是连选', async () => {
    const plain = await render(item(9));
    const title = plain.card.querySelector<HTMLElement>('[data-media-title]')!;
    await act(async () => { title.dispatchEvent(new MouseEvent('click', { bubbles: true, shiftKey: true })) });
    expect(plain.actions.toggleSelection).toHaveBeenCalledWith(9, true);
    const selecting = await render(item(10), { selectMode: true });
    expect(selecting.card.querySelector('[data-media-later]')).toBeNull();
    expect(selecting.card.querySelector('[data-media-seek]')).toBeNull();
    expect(selecting.card.querySelector('[data-media-check]')).not.toBeNull();
    expect(plain.card.querySelector('[data-media-later]')).not.toBeNull();
    await click(selecting.host.querySelector('[data-media-title]'));
    expect(selecting.actions.toggleSelection).toHaveBeenCalledWith(10, false);
    expect([plain.onOpen, selecting.onOpen].every((fn) => fn.mock.calls.length === 0)).toBe(true);
  });

  it('片名空着时标题与读屏名写「未命名视频」', async () => {
    const { host } = await render(item(12, { name: '' }));
    expect(host.querySelector('[data-media-title]')?.textContent).toBe('未命名视频');
    expect(host.querySelector('[data-media-open]')?.getAttribute('aria-label')).toBe('打开 未命名视频详情');
  });

  it('大小未知和作品标签各自显示，观看次数不占卡片正文', async () => {
    const { host } = await render(item(11, { size: 0, play_count: 3, performers: ['甲'], tags: ['a', 'b', 'c', 'd'] }));
    expect(host.querySelector('[data-media-size]')?.textContent).toBe('大小未知');
    expect(host.querySelector('[data-media-watch-count]')).toBeNull();
    expect([...host.querySelectorAll('[data-media-tag]')].map((tag) => tag.textContent)).toEqual(['#a', '#b', '#c']);
  });

  it('悬停控件各用只代表自己的那枚字形：快退、快进是转向箭头，打开详情是摊开', async () => {
    const { host } = await render(item(13));
    const glyphs = [...host.querySelectorAll('[data-media-seek] button')]
      .map((button) => [button.getAttribute('aria-label'), button.querySelector('use')?.getAttribute('href')]);
    expect(glyphs).toEqual([
      [expect.stringContaining('后退'), '#i-rotate-ccw'],
      [expect.stringContaining('前进'), '#i-rotate-cw'],
      ['打开详情', '#i-expand'],
    ]);
  });

  it('关注来源保存的条目用来源的缩略图和标签，标签不可点', async () => {
    const { host } = await render(item(12, { follow_thumb_url: 'https://example.test/t.jpg', follow_item_id: 5, tags: ['本地'], follow_tags: ['来源'] }));
    expect(host.querySelector('[data-media-art] img')?.getAttribute('src')).toBe('https://example.test/t.jpg');
    const tag = host.querySelector('[data-media-tag]');
    expect([tag?.textContent, tag?.tagName, tag?.hasAttribute('data-tag')]).toEqual(['#来源', 'SPAN', false]);
  });

  it('看到一半的画一条进度，分卷组不画；比例写进封面格', async () => {
    const { host } = await render(item(13, { duration: 600, play_seconds: 150 }));
    const bar = host.querySelector('[data-media-progress]');
    expect([bar?.getAttribute('role'), bar?.getAttribute('aria-label'), bar?.getAttribute('aria-valuenow')]).toEqual(['progressbar', '观看进度', '25']);
    expect(host.querySelector<HTMLElement>('[data-media-pic]')!.style.getPropertyValue('--card-ratio')).toBe(String(16 / 9));

    const group = await render(item(14, { duration: 600, play_seconds: 150, part_group: { key: 'P', seed_id: 14, count: 2 } }));
    expect(group.host.querySelector('[data-media-progress]')).toBeNull();
    expect(group.card.dataset.partSeed).toBe('14');
    expect(group.card.hasAttribute('data-stacked')).toBe(true);
    expect(group.host.querySelector('[data-media-group]')?.textContent).toBe('2 卷');
    const versions = await render(item(16, {
      part_group: { key: 'P', seed_id: 14, count: 2 },
      edition_group: { key: 'E', seed_id: 13, count: 2, editions: ['1080p', '4K 修复'] },
    }));
    expect([...versions.host.querySelectorAll('[data-media-group]')].map((node) => node.textContent)).toEqual(['2 个版本']);
    expect(versions.host.querySelector('[data-media-open]')?.getAttribute('aria-label')).toMatch(/版本$/);

    /* 按画幅筛时版本组只剩同画幅的那一个版本：照它的分卷组画，不标版本数。 */
    const oneVersion = await render(item(17, {
      part_group: { key: 'P', seed_id: 14, count: 2 },
      edition_group: { key: 'E', seed_id: 13, count: 1, editions: ['4K 修复'] },
    }));
    expect([...oneVersion.host.querySelectorAll('[data-media-group]')].map((node) => node.textContent)).toEqual(['2 卷']);
  });

  it('竖屏格的番号作品只用视频帧图，不用番号封面：没有帧图就是「无预览」；横格照旧按封面设置出图', async () => {
    const cover = { is_jav: true, code: 'FC2-PPV-3189161', has_cover: true, has_thumb: false };
    const pictureOf = (host: ParentNode) => {
      const img = host.querySelector('[data-media-art] img');
      return img ? img.getAttribute('src') : host.querySelector('[data-media-nopic]')?.textContent;
    };
    const portraitGrid = { ...SMALL, portrait: true };
    expect(pictureOf((await render(item(20, cover), { variant: 'short' })).host)).toBe('无预览');
    expect(pictureOf((await render(item(21, cover), { layout: portraitGrid })).host), '显式筛竖屏的网格也是竖屏格').toBe('无预览');
    expect(pictureOf((await render(item(23, { ...cover, has_thumb: true }), { variant: 'short' })).host),
      '封面设置为官方封面时竖屏格照样用帧图').toBe('/poster?id=23&c=4');
    expect(pictureOf((await render(item(22, cover))).host)).toMatch(/^\/cover\?code=FC2-PPV-3189161/);
  });

  it('不合并分卷时一卷一张卡：名字、时长写这一卷自己的，不叠纸边、不标卷数，打开时条目原样交出', async () => {
    const actions = actionsFor();
    const onOpen = vi.fn();
    const part = item(18, { name: 'FC2-PPV-1 part2', duration: 600, part_group: { key: 'P', seed_id: 17, count: 3, title: 'FC2-PPV-1', total_duration: 1800 } });
    const host = await mount(<MediaCard item={part} variant="grid" layout={SMALL} selected={false} selectMode={false}
      seekSeconds={10} helpers={helpers} actions={actions} onOpen={onOpen} grouped={false} />);
    const card = host.querySelector<HTMLElement>('[data-media-card]')!;
    expect(host.querySelector('[data-media-group]')).toBeNull();
    expect([card.hasAttribute('data-stacked'), card.dataset.partSeed]).toEqual([false, undefined]);
    expect(host.querySelector('[data-media-title]')?.textContent).toBe('FC2-PPV-1 part2');
    expect(host.querySelector('[data-media-duration]')?.textContent).toBe('10:00');
    await click(host.querySelector('[data-media-title]'));
    expect(onOpen).toHaveBeenCalledWith(expect.objectContaining({ id: 18, part_group: expect.objectContaining({ seed_id: 17 }) }), card);
  });

  it('待删的作品留在原位，标上回收站', async () => {
    const { card, host } = await render(item(15, { disposal: 'trash' }));
    expect(card.hasAttribute('data-pending-delete')).toBe(true);
    expect(host.querySelector('[data-media-trash-mark]')?.textContent).toBe('回收站');
  });

  it('稍后看只写这一条，不打开详情；写成后按钮按下', async () => {
    const { host, actions, onOpen } = await render(item(16));
    await click(host.querySelector('[data-later]'));
    expect(actions.watchLater).toHaveBeenCalledWith(expect.objectContaining({ id: 16 }), expect.any(Function));
    expect(onOpen).not.toHaveBeenCalled();
    expect(host.querySelector('[data-later]')?.getAttribute('aria-pressed')).toBe('true');
  });

  it('回收站里的资源按类型起名，卡上那枚键还原这一条，不打开它', async () => {
    const archive = await render(item(17, { medium: 'archive', name: '资料.zip', disposal: 'trash' }), { variant: 'resource' });
    expect(archive.host.querySelector('[data-media-who]')?.textContent).toBe('压缩包');
    await click(archive.host.querySelector('[data-media-resource-action]'));
    expect(archive.actions.resourceOperation).toHaveBeenCalledWith(expect.objectContaining({ id: 17 }), 'restore');
    expect(archive.onOpen).not.toHaveBeenCalled();

    const shortcut = await render(item(18, { medium: 'other', name: '入口.URL' }), { variant: 'resource' });
    expect(shortcut.host.querySelector('[data-media-who]')?.textContent).toBe('网址快捷方式');
    expect(shortcut.host.querySelector('[data-media-resource-action]')?.getAttribute('title')).toBe('移入回收站');
  });

  it('换大图／小图留着原来那张封面，原地换取景；换了作品才换图', async () => {
    const BIG: MediaCardLayout = { active: true, size: 'big', portrait: false, javImage: 'cover' };
    let show!: (next: { layout: MediaCardLayout; code: string }) => void;
    function Harness() {
      const [state, set] = useState({ layout: BIG, code: 'ABC-001' });
      show = set;
      return <MediaCard item={item(19, { is_jav: true, code: state.code, has_cover: true })} variant="grid"
        layout={state.layout} selected={false} selectMode={false} seekSeconds={10} helpers={helpers}
        actions={actionsFor()} onOpen={vi.fn()} />;
    }
    const host = await mount(<Harness />);
    const cover = host.querySelector<HTMLImageElement>('[data-media-art] img')!;
    const firstSrc = cover.getAttribute('src');
    expect([cover.classList.contains('front'), cover.dataset.javImageLayout]).toEqual([true, 'big']);

    await act(async () => show({ layout: { ...BIG, size: 'small' }, code: 'ABC-001' }));
    expect(host.querySelector('[data-media-art] img')).toBe(cover);
    expect([cover.classList.contains('whole'), cover.classList.contains('front'), cover.dataset.javImageLayout]).toEqual([true, false, 'small']);
    expect(cover.getAttribute('src')).toBe(firstSrc);
    expect(host.querySelector<HTMLElement>('[data-media-pic]')!.style.getPropertyValue('--card-ratio')).toBe(String(16 / 9));

    await act(async () => show({ layout: { ...BIG, size: 'small' }, code: 'ABC-002' }));
    expect(host.querySelector('[data-media-art] img')).not.toBe(cover);
    expect(host.querySelector('[data-media-art] img')?.getAttribute('src')).toContain('ABC-002');
  });
});
