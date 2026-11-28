import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import type { Browser } from 'playwright-core';
import { launch, layout, settle, visit, VIEWPORTS } from './harness.ts';
import { ITEM, openItemPage } from './item-fixture.ts';

describe('JAV 推荐与加载结构', () => {
  let browser: Browser;
  before(async () => { browser = await launch(); });
  after(async () => { await browser?.close(); });
  it('在线目录核验封面，列表显示完整番号及对应艺人', { timeout: 60_000 }, async () => {
    const opened = await visit(browser, '/', VIEWPORTS[0]!);
    const { page } = opened;
    const catalog = Promise.withResolvers<void>();
    try {
      const code = 'SAMPLE-012345';
      const cast = Array.from({ length: 80 }, (_, index) => ({
        name: index ? `演员 ${index + 1}` : '首位演员', dmm_id: String(index + 100),
        source_url: `https://www.dmm.co.jp/digital/videoa/-/list/=/article=actress/id=${index + 100}/`,
        source_avatar_url: `/img/cast-${index}.png`,
      }));
      const works = ['unpublished', 'missing', 'available', 'issued'].map(id => ({
        id, code: id === 'available' ? code : id.toUpperCase(), title: id, date: '2026-12-01', pre_order: id !== 'issued',
        url: `https://video.dmm.co.jp/av/content/?id=${id}`,
        cover_url: id === 'unpublished' ? '' : `/cover-image?catalog=${id}`,
        people: id === 'available' ? cast : [], studio: null, tags: [], duration: null,
      }));
      const probes: string[] = [];
      await page.route('**/img/cast-*.png', route => route.fulfill({ contentType: 'image/svg+xml',
        body: '<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32"><rect width="32" height="32" fill="gray"/></svg>' }));
      await page.route('**/api/jav/catalog?*', async route => {
        await catalog.promise;
        await route.fulfill({ json: { items: works, total: 4, page: 1, pages: 1, size: 24, performer_options: [] } });
      });
      await page.route('**/cover-image?catalog=*', route => {
        const id = new URL(route.request().url()).searchParams.get('catalog')!;
        if (route.request().method() === 'HEAD') probes.push(id);
        return id === 'missing' ? route.fulfill({ status: 404 }) : route.fulfill({ status: 200, contentType: 'image/jpeg' });
      });
      const mode = (value: 'cards' | 'list') => page.locator(`[data-filter-row="bottom"] label:has(input[value="${value}"])`);
      await page.goto(new URL('/jav?tab=online', page.url()).href, { waitUntil: 'domcontentloaded' });
      await page.locator('[data-online-status="all"]').waitFor();
      if (!(await mode('cards').locator('input').isChecked())) await mode('cards').click();
      const skeletonCard = page.locator('[data-skeleton="jav-online-cards"] [data-jav-skeleton-card]').first();
      await skeletonCard.waitFor();
      assert.equal(await skeletonCard.locator('[data-jav-skeleton-action]').count(), 1);
      await mode('list').click();
      const skeletonRow = page.locator('[data-catalog-table] [data-list-skeleton-row]').first();
      await skeletonRow.waitFor();
      const columnWidths = () => page.locator('[data-catalog-table] th').evaluateAll(
        cols => cols.map(col => Math.round(col.getBoundingClientRect().width)));
      const waitingWidths = await columnWidths();
      assert.equal(waitingWidths.length, 7);
      catalog.resolve();
      await page.locator('[data-catalog-table] [data-release-row]').first().waitFor();
      assert.deepEqual(await columnWidths(), waitingWidths);
      await mode('cards').click();
      await page.getByText('available', { exact: true }).first().waitFor();
      for (const filter of ['online-performer', 'online-studio', 'online-tags']) {
        await page.locator(`[data-filter-row="bottom"] [data-table-column-filter="${filter}"]`).waitFor();
      }
      await page.locator('[data-filter-row="bottom"] [data-sort-controls="javOnline"]').waitFor();
      const release = page.locator('[data-filter-row="bottom"]').getByRole('button', { name: '发行时间', exact: true });
      assert.equal(await release.count(), 1);
      await release.click();
      const dateMenu = page.locator('[data-sort-direction-menu]');
      await dateMenu.getByRole('button', { name: '开始日期', exact: true }).waitFor();
      await dateMenu.getByRole('button', { name: '结束日期', exact: true }).waitFor();
      await dateMenu.locator('[data-filter-option="asc"]').waitFor();
      await page.keyboard.press('Escape');
      assert.deepEqual(probes.sort(), ['available', 'issued', 'missing']);
      assert.equal(await page.getByText('missing', { exact: true }).count(), 0);
      assert.equal(await page.getByText('unpublished', { exact: true }).count(), 0);
      await page.locator('[data-online-status="released"]').click();
      await page.getByText('issued', { exact: true }).first().waitFor();
      assert.equal(await page.getByText('available', { exact: true }).count(), 0);
      await page.locator('[data-online-status="preOrder"]').click();
      await page.getByText('available', { exact: true }).first().waitFor();
      assert.equal(await page.getByText('issued', { exact: true }).count(), 0);
      assert.equal(probes.length, 3);
      await mode('list').click();
      const row = page.locator('[data-release-row]').filter({ has: page.getByText(code, { exact: true }) });
      await row.waitFor();
      const geometry = await row.evaluate(el => {
        const code = el.querySelector<HTMLElement>('[data-list-code]')!;
        const person = el.querySelector<HTMLElement>('[data-media-who]')!;
        const avatars = [...el.querySelectorAll('[data-media-avatar]')];
        return { fullCode: code.scrollWidth <= code.clientWidth + 1,
          oneLine: code.getBoundingClientRect().height <= parseFloat(getComputedStyle(code).lineHeight) + 1,
          separate: avatars[0]!.getBoundingClientRect().right <= person.getBoundingClientRect().left,
          count: avatars.length, photo: avatars[0]!.querySelector('img')?.getAttribute('src'), person: person.textContent };
      });
      assert.deepEqual(geometry, { fullCode: true, oneLine: true, separate: true, count: 1, photo: '/img/cast-0.png', person: '首位演员' });
      await row.getByRole('button', { name: /等 80 人/ }).click();
      const names = page.getByRole('dialog', { name: '艺人', exact: true }).locator('li');
      assert.equal(await names.count(), 80);
      assert.match(await names.last().innerText(), /演员 80/);
      await page.keyboard.press('Escape');
      await names.first().waitFor({ state: 'hidden' });
      await row.evaluate(element => element.scrollIntoView({ block: 'center' }));
      const bounds = await row.boundingBox();
      assert.ok(bounds);
      await page.mouse.move(bounds.x + 20, bounds.y + 16);
      await page.mouse.down();
      await page.mouse.move(bounds.x + 40, bounds.y + 46, { steps: 4 });
      await page.locator('[data-card-selection-rectangle]').waitFor();
      await page.mouse.up();
      const checked = row.getByRole('checkbox', { name: new RegExp(code) });
      await checked.waitFor();
      assert.equal(await checked.isChecked(), true);
      await mode('cards').click();
      const card = page.locator(`[data-jav-card][data-rectangle-key="${code}"]`);
      assert.equal(await card.locator('[data-media-check]').getAttribute('aria-pressed'), 'true');
      await page.keyboard.press('Escape');
      await card.locator('[data-media-check]').waitFor({ state: 'detached' });
    } finally {
      catalog.resolve();
      await opened.close();
    }
  });
  for (const viewport of VIEWPORTS) it(`${viewport.name}：关闭馆藏详情保留探索页与筛选位置`, { timeout: 60_000 }, async () => {
    const opened = await openItemPage(browser, '/', viewport, { ready: '[data-media-grid]' });
    const { page } = opened;
    const reads: string[] = [];
    try {
      await page.route('**/api/result-updates', route => route.fulfill({ json: { result_versions: {} } }));
      await page.route('**/api/taste?*', route => route.fulfill({ json: { summary: {}, rankings: {} } }));
      await page.route('**/api/jav/discoveries?*', route => {
        reads.push(route.request().url());
        return route.fulfill({ json: { items: Array.from({ length: 24 }, (_, index) => ({
          id: index + 100, asset_id: ITEM.plain, code: `PCH-${index + 100}`, title: '探索作品',
          performers: '来源原名', performer_refs: [{ id: 42, name: '规范姓名', has_image: false }],
          has_cover: false, wanted: false, tags: ['恋足'], taste_score: 0.8, release_date: '2024-06-03',
        })) } });
      });
      await page.goto(new URL('/jav?tab=discover', page.url()).href);
      const section = page.getByRole('region', { name: '为你推荐', exact: true });
      const search = page.getByRole('combobox', { name: '筛选推荐', exact: true });
      await section.locator('[data-jav-card]').first().waitFor();
      const top = section.locator('[data-filter-row="top"]');
      const bottom = section.locator('[data-filter-row="bottom"]');
      assert.equal(await top.locator('[data-table-column-filter]').count(), 0);
      assert.equal(await top.locator('[data-catalog-view]').count(), 2);
      assert.deepEqual(await bottom.locator('[data-table-column-filter]').evaluateAll(nodes =>
        nodes.map(node => node.getAttribute('data-table-column-filter'))),
      ['jav-discover-performers', 'jav-discover-studios', 'jav-discover-tags']);
      await top.getByRole('button', { name: '馆藏探索', exact: true }).click();
      await page.getByRole('button', { name: '按发行日期排序', exact: true }).click();
      await page.locator('[data-sort-direction-menu] [data-filter-option="desc"]').click();
      await section.locator('[data-table-column-filter="jav-discover-tags"]').click();
      await page.locator('[data-filter-option="恋足"]').click();
      await search.fill('PCH');
      await section.evaluate(node => { (node as HTMLElement).dataset.returnProbe = 'kept' });
      const count = reads.length;
      const drawer = () => page.evaluate(() => document.body.classList.contains('drawer-open'));
      const drawerOpen = await drawer();
      // 页内改地址与详情撤下都不重画页面，导航时冻住的文档高度与滚动锚定要随之放开。
      const released = () => page.waitForFunction(() => {
        const root = document.documentElement;
        return !root.hasAttribute('data-page-navigation-pending') && !root.style.minHeight && !root.style.overflowAnchor;
      });
      await page.waitForFunction(() => new URLSearchParams(location.search).get('q') === 'PCH');
      await released();
      for (const exit of ['close', 'escape', 'back']) {
        const link = section.locator('[data-jav-card]').nth(8).locator('[data-jav-cover-box]');
        await link.scrollIntoViewIfNeeded();
        // 参照点取详情打开那一刻：跳过去的那几张卡首次排版会长高，滚动锚定随之把位置补上，点下去时才定。
        await page.evaluate(() => {
          const probe = window as typeof window & { stageOpenedAt?: number };
          delete probe.stageOpenedAt;
          const observer = new MutationObserver(() => {
            if (!document.body.hasAttribute('data-detail-open')) return;
            probe.stageOpenedAt = window.scrollY;
            observer.disconnect();
          });
          observer.observe(document.body, { attributes: true, attributeFilter: ['data-detail-open'] });
        });
        await link.click();
        await page.locator('#stage[open] [data-item-side]').waitFor();
        const top = await page.evaluate(() => (window as typeof window & { stageOpenedAt?: number }).stageOpenedAt);
        assert.equal(typeof top, 'number', `${exit} 打开详情时没有记下位置`);
        assert.equal(await section.getAttribute('data-return-probe'), 'kept');
        if (exit === 'close') await page.locator('#closeStage').click();
        else if (exit === 'escape') await page.keyboard.press('Escape');
        else await page.goBack();
        await page.waitForFunction(() => location.pathname === '/jav' && !document.querySelector('#stage[open]'));
        assert.equal(await drawer(), drawerOpen, `${exit} 关闭详情时侧栏不能跟着收起`);
        assert.equal(await search.inputValue(), 'PCH');
        assert.equal(await section.locator('[data-catalog-view="library"]').getAttribute('aria-pressed'), 'true');
        await section.locator('[data-table-column-filter="jav-discover-tags"]').click();
        assert.equal(await page.locator('[data-filter-option="恋足"]').getAttribute('aria-pressed'), 'true');
        await page.keyboard.press('Escape');
        assert.equal(await section.locator('[data-entity-sort="release_date"]').getAttribute('aria-pressed'), 'true');
        assert.equal(await section.getAttribute('data-return-probe'), 'kept');
        assert.equal(reads.length, count, JSON.stringify(reads));
        await released();
        await page.waitForFunction(previous => Math.abs(window.scrollY - previous!) < 2, top);
      }
      assert.deepEqual(opened.problems.filter(line => !line.includes('VIDEOJS')), []);
    } finally { await opened.close() }
  });
  for (const viewport of VIEWPORTS) it(`${viewport.name}：探索卡进视口前后高度不变`, { timeout: 90_000 }, async () => {
    const opened = await visit(browser, '/?jav=1', viewport);
    const { page } = opened;
    try {
      await settle(page);
      await page.route('**/api/result-updates', route => route.fulfill({ json: { result_versions: {} } }));
      await page.route('**/api/taste?*', route => route.fulfill({ json: { summary: {}, rankings: {} } }));
      // 三种署名：多位出演者、没有发行日、一位出演者带日期；推荐分分三档，标签名有长有短。
      await page.route('**/api/jav/discoveries?*', route => route.fulfill({ json: { items: Array.from({ length: 30 }, (_, index) => ({
        id: index + 300, code: `PCH-${index + 300}`, title: index % 4 === 0 ? '很长的作品标题用于检查两行截断'.repeat(4) : '探索作品',
        performers: '来源原名', has_cover: false, wanted: false, score: 1,
        performer_refs: (index % 3 === 0 ? ['规范姓名', '第二位女优', '第三位女优'] : ['规范姓名']).map((name, ref) => ({ id: 42 + ref, name, has_image: false })),
        ...(index % 3 === 1 ? {} : { release_date: '2024-06-03' }),
        tags: index % 2 ? ['恋足', '单体作品', '高画质'] : ['很长的标签名称一枚', '巨乳'], taste_score: [0.95, 0.6, 0.3][index % 3],
      })) } }));
      for (const density of ['roomy', 'dense']) {
        await page.goto(new URL('/jav?tab=discover', page.url()).href);
        const cards = page.getByRole('region', { name: '为你推荐', exact: true }).locator('article');
        await cards.first().waitFor();
        await page.evaluate(value => { document.body.dataset.density = value; window.scrollTo(0, 0) }, density);
        const frame = () => page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
        const heights = () => cards.evaluateAll(nodes => nodes.map(node => Math.round(node.getBoundingClientRect().height * 10) / 10));
        await frame();
        const before = await heights();
        assert.equal(before.length, 30);
        for (const card of await cards.all()) { await card.scrollIntoViewIfNeeded(); await frame(); }
        await page.evaluate(() => window.scrollTo(0, 0));
        await frame();
        const shown = await heights();
        assert.deepEqual(shown, before, `${density}：屏外卡进视口后长高或变矮`);
      }
      assert.deepEqual(opened.problems.filter(line => !line.includes('/api/links/check')), []);
    } finally { await opened.close() }
  });
  for (const viewport of VIEWPORTS) it(`${viewport.name}：按实体身份推荐，封面骨架占据卡片尺寸`, { timeout: 60_000 }, async () => {
    const opened = await visit(browser, '/?jav=1', viewport);
    const { page } = opened;
    let release!: () => void;
    const responseReady = new Promise<void>(resolve => { release = resolve; });
    try {
      await settle(page);
      await page.context().addInitScript(() => localStorage.setItem('peach.settings.v1', JSON.stringify({ detailAutoplay: false, theme: 'dark', javLayout: 'big' })));
      await page.route('**/api/taste?*', async route => {
        await responseReady;
        await route.fulfill({ json: { summary: { history_visits: 20 }, rankings: {
          peach_performers: [{ entity_id: 42, name: '规范姓名', score: 8 }],
        } } });
      });
      await page.route('**/api/jav/discoveries?*', async route => {
        await responseReady;
        await route.fulfill({ json: { items: [
          { id: 777, code: 'DEMO-777', title: '演示新作', performers: '來源姓名' },
          { id: 778, code: 'DEMO-778', title: '很长的作品标题用于检查截断与卡片等高'.repeat(8), performers: '來源姓名' },
          { id: 779, code: 'DEMO-779', title: '短标题', performers: '來源姓名' },
        ].map((item, index) => ({ ...item, performer_refs: [{ id: 42, name: '规范姓名', has_image: false }],
          link: 'https://example.com/work', release_date: '2010-10-01', has_cover: false, wanted: false,
          score: 1, tags: ['恋足'], reasons: ['常看的女优：规范姓名'],
          ...(index === 0 ? { has_cover: true } : index === 1 ? { cover_url: 'https://example.com/sleeve.svg' } : {}),
          poster_box: { x0: 800, y0: 50, x1: 1460, y1: 950, px: [1480, 1000], method: 'manual' },
        })) } });
      });
      const sleeve = '<svg xmlns="http://www.w3.org/2000/svg" width="1480" height="1000"><rect width="1480" height="1000" fill="#135590"/><rect x="800" y="50" width="660" height="900" fill="#f4ad43"/><text x="1050" y="500" font-size="100">FRONT</text></svg>';
      await page.route('**/cover?*', route => route.fulfill({ contentType: 'image/svg+xml', body: sleeve }));
      await page.route('**/cover-image?code=*', route => route.fulfill({ contentType: 'image/svg+xml', body: sleeve }));
      await page.goto(new URL('/jav?tab=discover', page.url()).href, { waitUntil: 'load' });
      await page.locator('[data-jav-skeleton-cover]').first().waitFor();
      const cover = await page.locator('[data-jav-skeleton-cover]').first().boundingBox();
      assert.ok(cover && cover.width >= 100 && cover.height >= 60, JSON.stringify(cover));
      assert.ok(cover && Math.abs(cover.width / cover.height - 0.75) < 0.02, '大图封面占位应与馆藏正封同一比例');
      const skeletonWidth = await page.locator('[data-skeleton="jav-discover"]').first().boundingBox();
      const skeletonCard = await page.locator('[data-jav-skeleton-card]').first().boundingBox();
      const main = await page.locator('#main').boundingBox();
      assert.ok(skeletonWidth && main && skeletonWidth.width >= main.width - 40);
      const pendingFilter = await page.locator('[data-jav-filter]').boundingBox();
      const pendingBottom = await page.locator('[data-jav-filter] [data-filter-row="bottom"]').boundingBox();
      const pendingSize = await page.locator('[data-jav-filter] [data-entity-layout]').boundingBox();
      const pendingShortcut = await page.locator('[data-jav-filter] [data-shortcuts-trigger]').boundingBox();
      assert.ok(pendingShortcut && pendingShortcut.width === 32 && pendingShortcut.height === 32, JSON.stringify(pendingShortcut));
      const filterTrigger = page.locator('[data-jav-filter] [data-table-column-filter="jav-discover-tags"]');
      const pendingTagHeight = await filterTrigger.evaluate(node => node.getBoundingClientRect().height);
      const avatarShape = await page.locator('[data-jav-skeleton-avatar]').first().evaluate(node => {
        const style = getComputedStyle(node); return { width: style.width, height: style.height, radius: style.borderRadius };
      });
      assert.deepEqual(avatarShape, { width: '38px', height: '38px', radius: '50%' });
      assert.deepEqual(await page.locator('[data-jav-skeleton-actions]').first().locator('.skeleton').evaluateAll(nodes => nodes.map(node => getComputedStyle(node).height)), ['36px', '36px', '36px']);
      // 标题两条各占一行、条高 1em（14px），之间留缝；署名两条按行高。
      assert.deepEqual(await page.locator('[data-jav-skeleton-card]').first().locator('[data-jav-skeleton-text]').evaluateAll(nodes => nodes.map(node => getComputedStyle(node).height)), ['14px', '14px', '18px', '18px']);
      assert.equal(await page.locator('[data-jav-skeleton-cover]').first().evaluate(node => getComputedStyle(node).borderRadius),
        await page.locator('#main').evaluate(node => getComputedStyle(node).getPropertyValue('--surface-radius').trim()));
      assert.equal(await page.locator('[data-jav-filter] [data-entity-sep]').count(), 1);
      assert.equal(await page.locator('[data-jav-filter] [data-entity-sort]').count(), 5);
      assert.equal(await page.locator('[data-jav-filter]').getByText('正在读取', { exact: true }).count(), 0);
      await page.screenshot({ path: `../build/jav-discover-pending-${viewport.name}.png` });
      release();
      await page.getByRole('heading', { name: 'DEMO-777 演示新作', exact: true }).waitFor();
      const search = page.getByRole('combobox', { name: '筛选推荐', exact: true });
      const cards = page.getByRole('region', { name: '为你推荐', exact: true }).locator('article');
      assert.equal(await cards.count(), 3);
      assert.equal(await cards.first().locator('[data-media-who]').textContent(), '规范姓名');
      assert.equal(await cards.first().locator('[data-media-who]').getAttribute('title'), '规范姓名');
      assert.equal(await cards.first().locator('[data-media-release]').textContent(), '2010-10-01');
      const metadata = await cards.first().locator('[data-media-meta]').boundingBox();
      const title = await cards.first().locator('h3').boundingBox();
      const face = await cards.first().locator('[data-media-avatar]').boundingBox();
      const inset = await cards.first().locator('[data-media-meta]').evaluate(node => parseFloat(getComputedStyle(node).paddingTop));
      assert.ok(metadata && title && face && title.x >= face.x + face.width && Math.abs(title.y - metadata.y - inset) < 2, JSON.stringify({ metadata, title, face, inset }));
      await page.screenshot({ path: `../build/jav-layout-${viewport.name}.png` });
      const refresh = page.locator('[data-jav-filter] [data-jav-metadata-update]');
      assert.equal(await refresh.count(), 1);
      assert.equal(await refresh.textContent(), '');
      assert.equal(await cards.first().locator('[data-jav-taste-score]').textContent(), '强烈推荐');
      const tierBox = await cards.first().locator('[data-jav-taste-score]').boundingBox();
      const tagsBox = await cards.first().locator('[data-jav-tags]').boundingBox();
      const contentTag = await cards.first().locator('[data-media-tag]').first().boundingBox();
      assert.ok(tierBox && tagsBox && contentTag && Math.abs(tierBox.y - contentTag.y) <= 4
        && tierBox.x + tierBox.width <= contentTag.x, '推荐档位与内容标签同行，排在内容标签前');
      const recommendation = cards.first().getByRole('button', { name: '推荐分 100，强烈推荐', exact: true });
      await recommendation.focus();
      await page.getByRole('tooltip').filter({ hasText: '常看的女优：规范姓名' }).waitFor({ state: 'visible' });
      await recommendation.evaluate(node => (node as HTMLButtonElement).blur());
      for (const cover of await cards.locator('img.poster').all()) await cover.scrollIntoViewIfNeeded();
      await page.waitForFunction(() => [...document.querySelectorAll<HTMLImageElement>('[data-jav-card] img.poster')].every(img => img.complete && img.naturalWidth > 0));
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.screenshot({ path: `../build/jav-discover-${viewport.name}.png` });
      const frames = await cards.evaluateAll(nodes => nodes.slice(0, 2).map(node => {
        const pic = node.querySelector('[data-jav-cover-box]')!.getBoundingClientRect();
        const img = node.querySelector<HTMLImageElement>('img.poster')!;
        const bounds = img.getBoundingClientRect();
        const scale = bounds.width / img.naturalWidth;
        return { center: bounds.left + (800 + 660 / 2) * scale, expected: pic.left + pic.width / 2,
          top: bounds.top + 50 * scale, y: pic.top, height: 900 * scale, expectedHeight: pic.height,
          position: getComputedStyle(img).position, slot: getComputedStyle(img.parentElement!).position };
      }));
      for (const frame of frames) {
        assert.equal(frame.position, 'absolute');
        assert.equal(frame.slot, 'absolute');
        assert.ok(Math.abs(frame.center - frame.expected) <= 1, JSON.stringify(frame));
        assert.ok(Math.abs(frame.top - frame.y) <= 1 && Math.abs(frame.height - frame.expectedHeight) <= 1, JSON.stringify(frame));
      }
      const liveFilter = await page.locator('[data-jav-filter]').boundingBox();
      const liveBottom = await page.locator('[data-jav-filter] [data-filter-row="bottom"]').boundingBox();
      const liveSize = await page.locator('[data-jav-filter] [data-entity-layout]').boundingBox();
      const liveShortcut = await page.locator('[data-jav-filter] [data-shortcuts-trigger]').boundingBox();
      for (const [pending, live] of [[pendingFilter, liveFilter], [pendingBottom, liveBottom], [pendingSize, liveSize], [pendingShortcut, liveShortcut]]) {
        assert.ok(pending && live && Math.abs(pending.y - live.y) <= 1 && Math.abs(pending.height - live.height) <= 1, JSON.stringify({ pending, live, pendingBottom, liveBottom, pendingSize, liveSize, pendingShortcut, liveShortcut }));
      }
      const controls = await page.locator('[data-jav-filter] [data-entity-sorts]').boundingBox();
      assert.ok(liveSize && controls && liveSize.x >= controls.x && liveSize.x + liveSize.width <= controls.x + controls.width);
      assert.equal(await filterTrigger.evaluate(node => node.getBoundingClientRect().height), pendingTagHeight);
      const heights = await cards.evaluateAll(nodes => nodes.map(node => node.getBoundingClientRect().height));
      if (!viewport.mobile) assert.ok(Math.max(...heights) - Math.min(...heights) <= 1, JSON.stringify(heights));
      if (viewport.mobile) {
        assert.ok(skeletonCard && skeletonCard.height >= Math.min(...heights) - 2
          && skeletonCard.height <= Math.max(...heights) + 2, JSON.stringify({ skeletonCard, heights }));
      } else {
        assert.ok(skeletonCard && Math.abs(skeletonCard.height - heights[0]!) <= 2, JSON.stringify({ skeletonCard, heights }));
      }
      assert.equal(await page.locator('[data-jav-filter] [data-filter-search]').count(), 1, '发现分区的查找在筛选浮层里');
      assert.equal(await page.locator('#javLibraryHeader [data-index-search]').count(), 0, '有浮层的分区页头不再另摆筛选框');
      assert.equal(await cards.nth(1).locator('h3').evaluate(node => getComputedStyle(node).webkitLineClamp), '2');
      const lookup = page.getByRole('button', { name: '查找资源', exact: true }).first();
      assert.notEqual(await lookup.evaluate(node => getComputedStyle(node).backgroundColor),
        await cards.first().getByRole('button', { name: '查找资源', exact: true }).evaluate(node => getComputedStyle(node).backgroundColor));
      const avatar = cards.first().getByRole('link', { name: '打开女优页：规范姓名', exact: true });
      assert.equal(await avatar.getAttribute('href'), '/performers/42');
      assert.equal(await avatar.locator('.ini').textContent(), '规');
      const avatarBox = await avatar.boundingBox();
      assert.ok(avatarBox && avatarBox.width === 38 && avatarBox.height === 38, JSON.stringify(avatarBox));
      if (!viewport.mobile) {
        const before = await avatar.evaluate(node => getComputedStyle(node).boxShadow);
        await avatar.hover();
        await page.waitForFunction(() => {
          const face = document.querySelector('[data-jav-card] [data-media-avatar]');
          return face && getComputedStyle(face).boxShadow !== 'none';
        });
        assert.notEqual(await avatar.evaluate(node => getComputedStyle(node).boxShadow), before);
        await cards.first().hover();
        assert.notEqual(await cards.first().evaluate(node => getComputedStyle(node).boxShadow), 'none');
      }
      const source = cards.first().getByRole('link', { name: '作品来源', exact: true });
      const buttonShape = (node: Element) => {
        const style = getComputedStyle(node);
        return { height: style.height, border: style.borderWidth, radius: style.borderRadius,
          background: style.backgroundColor };
      };
      assert.deepEqual(await source.evaluate(buttonShape),
        await cards.first().getByRole('button', { name: '查找资源', exact: true }).evaluate(buttonShape));
      assert.equal(await source.getAttribute('target'), '_blank');
      assert.equal(await source.locator('svg').count(), 1);
      await search.fill('DEMO-777');
      await search.press('Enter');
      assert.equal(await cards.count(), 1);
      await search.fill('');
      await page.waitForFunction(() => document.querySelectorAll('[aria-label="为你推荐"] article').length === 3);
      await page.locator('label:has(input[aria-label="小图"])').click();
      const smallCover = await cards.first().locator('[data-jav-cover-box]').boundingBox();
      assert.ok(smallCover && Math.abs(smallCover.width / smallCover.height - 16 / 9) < 0.02);
      assert.equal(await cards.first().locator('img.poster').evaluate(node => getComputedStyle(node).objectFit), 'contain');
      await page.locator('label:has(input[aria-label="大图"])').click();
      await cards.first().getByRole('button', { name: '恋足', exact: true }).click();
      await page.getByRole('button', { name: '清除筛选', exact: true }).click();
      assert.equal(await cards.count(), 3);
      await cards.first().getByRole('button', { name: '查找资源', exact: true }).click();
      await page.getByRole('dialog').getByRole('button', { name: '关闭资源面板', exact: true }).click();
      await page.getByRole('dialog').waitFor({ state: 'hidden' });
      await settle(page);
      assert.equal(await page.locator('[data-jav-skeleton-cover]').count(), 0);
      await search.fill('规范姓名');
      await search.press('Enter');
      await page.getByRole('heading', { name: 'DEMO-777 演示新作', exact: true }).waitFor();
      const geometry = await layout(page);
      assert.ok(geometry.scrollWidth <= geometry.viewportWidth + 1);
      assert.deepEqual(geometry.offenders, []);
      assert.deepEqual(opened.problems.filter(line => !line.includes('/api/links/check')), []);
      await cards.first().locator('[data-media-meta]').scrollIntoViewIfNeeded();
      await page.screenshot({ path: `../build/jav-card-${viewport.name}.png` });
      await page.evaluate(() => { (document.activeElement as HTMLElement)?.blur(); window.scrollTo(0, 0) });
      await page.screenshot({ path: `../build/jav-discover-${viewport.name}.png` });
    } finally { release(); await opened.close(); }
  });

  for (const viewport of VIEWPORTS) {
    it(`换分区时页头是同一棵：页签底板滑过去，标题与页签原地不动（${viewport.name}）`, { timeout: 60_000 }, async () => {
      const opened = await visit(browser, '/jav', viewport, async page => {
        await page.route('**/api/jav/releases?*', route => route.fulfill({ json: {
          items: [], total: 0, candidate_total: 0, page: 1, size: 24, facets: { performers: [], studios: [], tags: [] } } }));
      });
      const { page } = opened;
      try {
        const header = page.locator('#javLibraryHeader');
        const selected = (name: string) => header.getByRole('tab', { name, exact: true, selected: true });
        await selected('馆藏').waitFor();
        await settle(page);
        // 冒烟默认减少动态效果；底板的过渡要在正常设置下读。
        await page.emulateMedia({ reducedMotion: 'no-preference' });
        await page.evaluate(() => {
          const list = document.querySelector('#javLibraryHeader [role="tablist"]')!;
          list.setAttribute('data-kept', '');
          list.querySelector('[data-pill-thumb]')!.setAttribute('data-kept', '');
        });
        const read = () => page.evaluate(() => {
          const shown = (node: Element) => node.getClientRects().length > 0;
          const titles = [...document.querySelectorAll('h2[data-page-title]')].filter(node => shown(node) && node.textContent === 'JAV');
          const list = [...document.querySelectorAll('[role="tablist"][aria-label="JAV 分区"]')].filter(shown);
          const thumb = list[0]?.querySelector<HTMLElement>(':scope > [data-pill-thumb]');
          return {
            titles: titles.length, title: Math.round(titles[0]?.getBoundingClientRect().top ?? -1),
            lists: list.length, tabs: Math.round(list[0]?.getBoundingClientRect().top ?? -1),
            kept: !!list[0]?.hasAttribute('data-kept') && !!thumb?.hasAttribute('data-kept'),
            glides: !!thumb && parseFloat(getComputedStyle(thumb).transitionDuration) > 0,
          };
        });
        const home = await read();
        assert.deepEqual({ titles: home.titles, lists: home.lists, kept: home.kept, glides: home.glides },
          { titles: 1, lists: 1, kept: true, glides: true });
        for (const [name, path] of [['新作', '/jav?tab=releases'], ['发现', '/jav?tab=discover'], ['想要', '/jav?tab=wants'], ['馆藏', '/?jav=1']] as const) {
          await header.getByRole('tab', { name, exact: true }).click();
          await page.waitForURL(url => url.pathname + url.search === path);
          await selected(name).waitFor();
          assert.deepEqual(await read(), home, `点了「${name}」就该是同一排页签、同一个位置，不等正文`);
          await page.waitForFunction(() => !document.querySelector('#stats [data-skeleton^="board"]') && scrollY === 0);
          assert.deepEqual(await read(), home, `「${name}」正文落地后页头不动`);
          assert.equal(await header.locator('[data-index-search]').count(), name === '想要' ? 1 : 0, `「${name}」页头的筛选框：只有没有筛选浮层的分区留在页头`);
        }
      } finally { await opened.close(); }
    });
  }
});
