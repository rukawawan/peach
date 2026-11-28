import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import type { Browser, Page } from 'playwright-core';
import { launch, requiredEnv, settle, visit, VIEWPORTS } from './harness.ts';

/** 标题行里搜索框、放大镜与版式开关的竖向落位和尺寸，取整到像素；图标连同线宽一起比。 */
const headControls = (page: Page, selectors: { search: string; icon: string; layout: string }) =>
  page.evaluate((selectors) => {
    const box = (selector: string) => {
      const node = document.querySelector(selector);
      if (!node) return null;
      const { y, width, height } = node.getBoundingClientRect();
      return { y: Math.round(y), width: Math.round(width), height: Math.round(height) };
    };
    const icon = document.querySelector(selectors.icon);
    const search = box(selectors.search);
    return {
      search: search && { y: search.y, height: search.height },
      icon: icon && { ...box(selectors.icon)!, stroke: getComputedStyle(icon).strokeWidth },
      layout: box(selectors.layout),
    };
  }, selectors);

describe('本地与在线艺人共用名册布局', () => {
  let browser: Browser;
  before(async () => { browser = await launch() });
  after(async () => { await browser?.close() });
  for (const path of ['/tags', '/tags?scope=online', '/performers', '/performers?scope=online', '/creators', '/studios', '/agencies', '/series']) {
    it(`索引标题和操作同排，搜索框按可用空间收缩（${path}）`, { timeout: 60_000 }, async () => {
      const opened = await visit(browser, path, VIEWPORTS[0]);
      try {
        const page = opened.page;
        await settle(page);
        if (await page.locator('#drawer.open').count()) await page.locator('#filterBtn').click();
        for (const width of [1280, 761, 760, 640, 390, 320]) {
          await page.setViewportSize({ width, height: 844 });
          await settle(page);
          const read = () => page.locator('[data-index-head]').evaluate(head => {
            const title = head.querySelector('h2')!.getBoundingClientRect();
            const search = head.querySelector('[data-index-search]')?.getBoundingClientRect();
            const controls = [...head.querySelectorAll('[data-shortcuts-trigger],[data-tag-mode],[data-index-layout]')];
            return {
              searchWidth: search?.width ?? null,
              centers: [...(search ? [search] : []), ...controls.map(node => node.getBoundingClientRect())].map(box => (box.top + box.bottom - title.top - title.bottom) / 2),
              contained: controls.every(node => { const box = node.getBoundingClientRect(); return box.left >= 0 && box.right <= innerWidth }),
              overflow: document.documentElement.scrollWidth > innerWidth,
            };
          });
          for (const managing of path.startsWith('/tags') ? [false, true] : [false]) {
            if (managing) await page.locator('[data-tag-mode]').click();
            await settle(page);
            const shown = await read();
            assert.ok(shown.centers.every(delta => Math.abs(delta) < 1), `${width}px 操作或搜索框没有和标题同排：${JSON.stringify(shown)}`);
            // 标签页的查找在筛选浮层里，页头没有搜索框。
            if (path.startsWith('/tags')) assert.equal(shown.searchWidth, null);
            else assert.ok(shown.searchWidth !== null && shown.searchWidth >= 64 && shown.searchWidth <= 320, `${width}px 搜索框没有保持可输入宽度：${shown.searchWidth}`);
            assert.equal(shown.contained, true);assert.equal(shown.overflow, false);
            if (managing) await page.locator('[data-tag-mode]').click();
          }
        }
        assert.deepEqual(opened.problems, []);
      } finally { await opened.close() }
    });
  }
  for (const viewport of VIEWPORTS) {
    it(`订阅标记在两种名册版式中可见（${viewport.name}）`, { timeout: 60_000 }, async () => {
      const opened = await visit(browser, '/performers', viewport);
      try {
        const page = opened.page;
        let following = true;
        await page.route('**/api/index?**', route => route.fulfill({ json: {
          items: [
            { k: '已订阅人物', n: 3, entity_id: 901, following, has_image: true },
            { k: '停用订阅人物', n: 2, entity_id: 902, following: false },
            { k: '没有订阅人物', n: 1, entity_id: 903 },
          ], has_more: false,
        } }));
        await page.route('**/entity-image?**', route => route.fulfill({
          contentType: 'image/svg+xml',
          body: '<svg xmlns="http://www.w3.org/2000/svg" width="180" height="190"><rect width="180" height="190" fill="#888"/></svg>',
        }));
        await page.reload({ waitUntil: 'load' });
        for (const label of ['紧凑 · 圆形头像', '大图 · 竖幅头像']) {
          await page.getByRole('radio', { name: label, exact: true }).press('Space');
          const marker = page.locator('#index [data-k="已订阅人物"]').getByRole('img', { name: '已订阅新作', exact: true });
          await marker.waitFor({ timeout: 5_000 });
          await page.waitForFunction(() => {
            const image = document.querySelector<HTMLImageElement>('#index [data-k="已订阅人物"] img');
            return image?.complete && image.naturalWidth > 0;
          });
          assert.equal(await page.locator('#index [data-index-feed]').count(), 1);
          for (const dark of [false, true]) {
            await page.evaluate(dark => {
              document.documentElement.dataset.theme = dark ? 'dark' : 'light';
              document.documentElement.classList.toggle('dark', dark);
            }, dark);
            const tone = await marker.evaluate(node => {
              const badge = node.firstElementChild!;
              const probe = document.createElement('span');
              probe.style.color = 'var(--feed-mark)'; node.append(probe);
              const orange = getComputedStyle(probe).color; probe.remove();
              return { foreground: getComputedStyle(badge).color, orange, background: getComputedStyle(badge).backgroundColor };
            });
            assert.equal(tone.foreground, tone.orange);
            assert.notEqual(tone.background, 'rgba(0, 0, 0, 0)');
          }
          assert.equal(await marker.evaluate(node => {
            const a = node.getBoundingClientRect(), b = node.closest('[data-index-cell]')!.getBoundingClientRect();
            return a.width >= 16 && a.height >= 16 && a.left >= b.left && a.right <= b.right && a.top >= b.top && a.bottom <= b.bottom;
          }), true);
          assert.equal(await marker.evaluate(node => {
            const box = node.getBoundingClientRect();
            return [box.top + 3, (box.top + box.bottom) / 2, box.bottom - 3].every(y => {
              const hit = document.elementFromPoint((box.left + box.right) / 2, y);
              return hit === node || (hit !== null && node.contains(hit));
            });
          }), true, 'RSS 标记应完整显示在头像上方');
          assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
          await page.locator('#index [data-index-grid]').screenshot({
            path: `../build/continuation-rss/rss-${viewport.name}-${label.startsWith('紧凑') ? 'compact' : 'big'}.png`,
          });
        }
        following = false;
        await page.reload({ waitUntil: 'load' });
        await page.locator('#index [data-k="已订阅人物"]').waitFor({ timeout: 15_000 });
        assert.equal(await page.locator('#index [data-index-feed]').count(), 0);
        assert.deepEqual(opened.problems, []);
      } finally { await opened.close() }
    });
  }
  for (const viewport of VIEWPORTS) {
    for (const [path, selected] of [['/performers', '艺人'], ['/creators', '卖家'],
      ['/performers?scope=online', '在线']] as const) {
      it(`加载占位页使用同级名册入口（${selected} · ${viewport.name}）`, { timeout: 60_000 }, async () => {
        const context = await browser.newContext({
          viewport: { width: viewport.width, height: viewport.height }, isMobile: viewport.mobile,
        });
        const page = await context.newPage();
        let release!: () => void;
        const gate = new Promise<void>(resolve => { release = resolve });
        await page.route(url => url.pathname === '/api/index' || url.pathname === '/api/follow/authors', async route => {
          await gate;
          await route.continue();
        });
        try {
          // 主模块先铺索引骨架，首屏数据暂缓；标题行与名册入口在等待时已经完整可见。
          await page.goto(requiredEnv('PEACH_E2E_ORIGIN') + path, { waitUntil: 'commit' });
          await page.locator('#index [data-skeleton]').first().waitFor();
          assert.equal(await page.locator('#index [role="tablist"]').count(), 1);
          assert.deepEqual(await page.locator('#index [role="tab"]').allTextContents(), ['艺人', '卖家', '在线']);
          assert.deepEqual(await page.locator('#index [role="tab"][aria-selected="true"]').allTextContents(), [selected]);
          assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
          const waiting = await headControls(page, {
            search: '#index [data-index-search] [data-rac]', icon: '#index [data-index-search] svg', layout: '#index .ihead .iconswitch' });
          release();
          await page.locator('#index [data-index-page]').waitFor();
          assert.deepEqual(await page.locator('#index [role="tab"]').allTextContents(), ['艺人', '卖家', '在线']);
          const ready = await headControls(page, {
            search: '#index [data-index-search] [data-rac]', icon: '#index [data-index-search] svg',
            layout: '#index [data-index-layout]' });
          // 标题行的搜索框与版式开关接管时原地换下：框高、竖向落位、图标与开关宽度都不跳。
          // 横向位置跟着计数读数的字宽走，骨架那条占位条量不出真数字，不比。
          assert.deepEqual(waiting, ready, '骨架与接管后的标题行控件几何不同');
        } finally { release(); await context.close() }
      });
    }
    it(`两种版式的卡片尺寸一致，长名字留在卡片内（${viewport.name}）`, { timeout: 60_000 }, async () => {
      const opened = await visit(browser, '/performers', viewport);
      try {
        const page = opened.page;
        const names = ['Jul3D', 'LazyProcrastinator', 'Suzutaru 3D (鈴太郎3D)', '很长的艺人名称'.repeat(6)];
        await page.route('**/api/index?**', route => route.fulfill({ json: {
          items: names.map(k => ({ k, n: 3 })), has_more: false,
        } }));
        await page.route('**/api/follow/authors?**', route => route.fulfill({ json: {
          items: names.map(k => ({ k, key: k, n: 3, avatar: '', avatar_fallback: '', providers: [] })), has_more: false,
        } }));
        await page.reload({ waitUntil: 'load' });
        const cell = page.locator('#index [data-index-cell]').first();
        await cell.waitFor({ timeout: 15_000 });
        const measure = () => page.locator('#index [data-index-cell]').evaluateAll(elements => elements.map(element => {
          const style = getComputedStyle(element);
          const rect = element.getBoundingClientRect();
          const name = element.querySelector('[data-index-name]')!.getBoundingClientRect();
          return { width: rect.width, padding: style.padding, radius: style.borderRadius,
            whiteSpace: style.whiteSpace, font: style.font, gap: style.gap,
            contained: name.left >= rect.left && name.right <= rect.right,
          };
        }));
        for (const label of ['紧凑 · 圆形头像', '大图 · 竖幅头像']) {
          await page.getByRole('tab', { name: '艺人', exact: true }).click();
          await page.getByRole('radio', { name: label, exact: true }).press('Space');
          const layout = label.startsWith('紧凑') ? 'compact' : 'big';
          await page.locator(`#index [data-index-grid][data-layout="${layout}"]`).waitFor();
          await settle(page);
          const local = await measure();
          await page.getByRole('tab', { name: '在线', exact: true }).click();
          await page.locator('#index [data-follow-author][data-index-cell]').first().waitFor();
          await settle(page);
          const online = await measure();
          assert.deepEqual(online, local, '在线卡片与本地卡片的布局不同');
          assert.ok(online.every(item => item.width >= 150 && item.contained && item.whiteSpace === 'normal'));
          assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
          assert.equal(await page.locator('#index [role="tablist"]').count(), 1);
          assert.deepEqual(await page.locator('#index [role="tab"]').allTextContents(), ['艺人', '卖家', '在线']);
          await page.getByRole('tab', { name: '卖家', exact: true }).click();
          await page.locator('#index [data-index-cell]').first().waitFor();
          await settle(page);
          assert.equal(await page.locator('#index [role="tablist"]').count(), 1);
          assert.equal(await page.locator('#index [aria-label="身份分类"]').count(), 0);
          assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
        }
        assert.deepEqual(opened.problems, []);
      } finally { await opened.close() }
    });
  }
  it('卖家动画作者的旧链接就地落到艺人分类，地址、标题和历史只留一条', { timeout: 60_000 }, async () => {
    const opened = await visit(browser, '/performers', VIEWPORTS[0]);
    try {
      const page = opened.page;
      await page.locator('#index [data-index-page]').waitFor({ timeout: 15_000 });
      const before = await page.evaluate(() => history.length);
      const requests: string[] = [];
      page.on('request', request => {
        const url = new URL(request.url());
        if (url.pathname === '/api/index') requests.push(url.search);
      });
      await page.goto(requiredEnv('PEACH_E2E_ORIGIN') + '/creators?category=animation', { waitUntil: 'load' });
      await page.waitForURL(url => url.pathname === '/performers', { timeout: 15_000 });
      await page.locator('#index [data-index-page]').waitFor({ timeout: 15_000 });
      await settle(page);
      assert.equal(new URL(page.url()).searchParams.get('category'), 'animation');
      assert.equal(await page.evaluate(() => history.length), before + 1, '规范化不该多压一条历史');
      assert.equal(await page.evaluate(() => document.body.dataset.surface), '/performers');
      assert.match(await page.title(), /^艺人/);
      assert.deepEqual(await page.locator('#index [role="tab"][aria-selected="true"]').allTextContents(), ['艺人']);
      assert.equal(requests.length, 1, `名册只取一次：${requests.join(' | ')}`);
      assert.match(requests[0], /kind=performers/);
      assert.match(requests[0], /category=animation/);
      assert.deepEqual(opened.problems, []);
    } finally { await opened.close() }
  });
  it('名册过滤框在手机上弹出的软键盘回车键标成「搜索」', { timeout: 60_000 }, async () => {
    const opened = await visit(browser, '/performers', VIEWPORTS[1]);
    let release = () => {};
    try {
      const pending = new Promise<void>(resolve => { release = resolve });
      await opened.page.route('**/api/index?**', async route => { await pending; await route.fallback() });
      await opened.page.reload({ waitUntil: 'commit' });
      const input = opened.page.locator('#index [data-index-search] input');
      await opened.page.locator('#index [data-index-search] input[readonly]').waitFor({ timeout: 15_000 });
      assert.equal(await input.getAttribute('enterkeyhint'), 'search');
      release();
      await opened.page.locator('#index [data-index-search] input:not([readonly])').waitFor({ timeout: 15_000 });
      assert.equal(await input.getAttribute('enterkeyhint'), 'search');
      assert.deepEqual(opened.problems, []);
    } finally { release(); await opened.close() }
  });
});
