import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import type { Browser } from 'playwright-core';

import { openFollowFeed } from './follow-fixture.ts';
import { launch, VIEWPORTS } from './harness.ts';

describe('关注与馆藏共用卡片交互', () => {
  let browser: Browser;
  before(async () => { browser = await launch() });
  after(async () => { await browser.close() });

  for (const viewport of VIEWPORTS) it(`${viewport.name}：关注标题在等待与内容态采用相同几何`, async () => {
    const opened = await openFollowFeed(browser, '/follow', viewport);
    try {
      opened.stub.hold = () => true;
      await opened.page.reload({ waitUntil: 'domcontentloaded' });
      const title = opened.page.locator('[data-follow-title]').last();
      await title.waitFor();
      const read = () => title.evaluate(node => {
        const style = getComputedStyle(node), box = node.getBoundingClientRect();
        return { size: style.fontSize, line: style.lineHeight, height: box.height, left: box.left };
      });
      const pending = await read();
      await opened.stub.release();
      await opened.page.locator('[data-follow-list] > [data-follow-item]').first().waitFor();
      assert.deepEqual(await read(), pending);
      const boxes = await opened.page.locator('[data-follow-list] > [data-follow-item]').evaluateAll(nodes =>
        nodes.slice(0, 6).map(node => {
          const card = node.getBoundingClientRect();
          const title = node.querySelector('[data-media-title]')!.getBoundingClientRect();
          const labels = node.querySelector('[data-follow-labels]')!.getBoundingClientRect();
          return { height: card.height, left: title.left, labels: labels.left + 4 };
        }));
      // 标签和首页卡一样排在文字那一栏：左缘对齐标题，不从头像底下起头。
      assert.ok(boxes.every(box => Math.abs(box.labels - box.left) <= 1), JSON.stringify(boxes));
      assert.ok(Math.max(...boxes.map(box => box.height)) - Math.min(...boxes.map(box => box.height)) <= 1, JSON.stringify(boxes));
      // 署名行和作品卡同一份零件：作者名前是人像字形，日期前是日历字形。
      const glyphs = await opened.page.locator('[data-follow-list] > [data-follow-item]').first().evaluate(node =>
        ['[data-media-who]', '[data-media-release]'].map(selector =>
          node.querySelector(`[data-media-byline] ${selector} svg use`)?.getAttribute('href')));
      assert.deepEqual(glyphs, ['#i-user-round', '#i-calendar']);
    } finally { await opened.stub.release(); await opened.close() }
  });

  for (const viewport of VIEWPORTS) it(`${viewport.name}：筛空时空态铺满整行，不缩成一列卡宽`, async () => {
    const opened = await openFollowFeed(browser, '/follow', viewport);
    try {
      const page = opened.page;
      await page.route((url) => url.pathname === '/api/follow' && !url.searchParams.has('item'), async (route) => {
        const response = await route.fetch();
        await route.fulfill({ json: { ...await response.json(), groups: [], has_more: false } });
      });
      await page.reload({ waitUntil: 'domcontentloaded' });
      const empty = page.locator('[data-follow-list] [data-follow-empty] [data-empty-state]');
      await empty.waitFor({ timeout: 15_000 });
      const widths = await empty.evaluate(node => ({
        empty: node.getBoundingClientRect().width, list: node.closest('[data-follow-list]')!.getBoundingClientRect().width,
      }));
      assert.ok(Math.abs(widths.empty - widths.list) <= 1, JSON.stringify(widths));
    } finally { await opened.close() }
  });

  it('图片瀑布流的卡片按内容定高，文字区底下不留等高网格的空白', async () => {
    const opened = await openFollowFeed(browser, '/follow?media=images', VIEWPORTS[0]!,
      { settings: { photoLayout: 'masonry', followImagesOnly: false }, ready: '[data-follow-wall][data-layout="masonry"] > [data-follow-item]' });
    try {
      const gaps = await opened.page.locator('[data-follow-wall][data-layout="masonry"] > [data-follow-item] [data-media-meta]').evaluateAll(nodes =>
        nodes.map(node => node.getBoundingClientRect().bottom - Math.max(...[...node.children].map(child => child.getBoundingClientRect().bottom))));
      assert.ok(gaps.length && gaps.every(gap => gap <= 1), JSON.stringify(gaps));
    } finally { await opened.close() }
  });

  it('创作者头像悬停显示描边，键盘焦点可见', async () => {
    const opened = await openFollowFeed(browser, '/follow', VIEWPORTS[0]!, { bindAuthors: true });
    try {
      const avatar = opened.page.locator('a[data-follow-avatar]').first();
      await avatar.hover();
      assert.notEqual(await avatar.evaluate(node => getComputedStyle(node).boxShadow), 'none');
      await avatar.focus();
      assert.notEqual(await avatar.evaluate(node => getComputedStyle(node).outlineStyle), 'none');
    } finally { await opened.close() }
  });

  for (const viewport of VIEWPORTS) it(`${viewport.name}：详情动作与接着看采用共享几何`, async () => {
    const opened = await openFollowFeed(browser, '/posts/1002', viewport,
      { ready: '#stage[open] [data-follow-detail-side]', bindAuthors: true });
    try {
      const page = opened.page;
      const creator = page.locator('[data-follow-detail-identity] a[data-id-cell]');
      await creator.hover();
      const face = creator.locator('[data-id-face]');
      assert.deepEqual(await face.evaluate(node => {
        const style = getComputedStyle(node);
        return [style.width, style.height];
      }), ['46px', '46px']);
      assert.notEqual(await face.evaluate(node => getComputedStyle(node).boxShadow), 'none');
      await creator.focus();
      assert.notEqual(await creator.evaluate(node => getComputedStyle(node).outlineStyle), 'none');
      await page.locator('[data-follow-related] [data-follow-item]').first().waitFor({ timeout: 15_000 });
      await page.locator('[data-follow-related] [data-follow-item]').first().hover();
      const hovered = await page.locator('[data-follow-related]').evaluate(section => {
        const row = section.querySelector('[data-related-row]')!.getBoundingClientRect();
        const card = section.querySelector('[data-follow-item]')!;
        const box = card.getBoundingClientRect();
        const inside = [...card.querySelectorAll('*')].every(node => {
          const rect = node.getBoundingClientRect();
          return !rect.height || rect.bottom <= box.bottom + 0.5;
        });
        return {
          inside, top: box.top - 8 >= row.top - 0.5, bottom: box.bottom + 8 <= row.bottom + 0.5,
          fill: getComputedStyle(card, '::before').backgroundColor, ground: getComputedStyle(section).backgroundColor,
        };
      });
      assert.deepEqual([hovered.inside, hovered.top, hovered.bottom], [true, true, true],
        '接着看的卡片内容与悬停面不越过横排的裁切边');
      assert.notEqual(hovered.fill, hovered.ground, '悬停面和接着看底色同色，浅色主题下看不出悬停');
      const geometry =await page.locator('[data-follow-detail-actions]').evaluate(node => {
        const styles = [...node.querySelectorAll('button, a')].map(button => {
          const style = getComputedStyle(button);
          return [style.width, style.height, style.borderRadius];
        });
        return styles;
      });
      assert.ok(geometry.length > 3);
      assert.ok(geometry.every(style => JSON.stringify(style) === JSON.stringify(geometry[0])), JSON.stringify(geometry));
      const row = page.locator('[data-follow-related] [data-related-row]');
      const scroll = await row.evaluate(node => {
        node.scrollLeft = 100;
        return { width: node.clientWidth, content: node.scrollWidth, left: node.scrollLeft };
      });
      assert.ok(scroll.content > scroll.width && scroll.left > 0, JSON.stringify(scroll));
      assert.equal(await page.locator('[data-follow-related] [data-follow-item]').evaluateAll(nodes =>
        nodes.some(node => node.getAttribute('data-follow-item') === '1002')), false);
      const next = page.locator('[data-follow-related] [data-follow-item]').first();
      const id = await next.getAttribute('data-follow-item');
      const singleRequests: string[] = [];
      page.on('request', request => {
        const url = new URL(request.url());
        if (url.pathname === '/api/follow' && url.searchParams.has('item')) singleRequests.push(url.searchParams.get('item')!);
      });
      await next.locator('[data-follow-open]').click();
      await page.waitForFunction(id => location.pathname === `/posts/${id}`, id);
      await page.locator('#stage [data-follow-detail-name]').filter({ hasText: `演示更新 ${id}` }).waitFor();
      assert.deepEqual(singleRequests, [], '接着看已有条目缓存却再次单条取数');
      await page.locator('#closeStage').click();
      await page.waitForFunction(() => location.pathname === '/follow');
    } finally { await opened.close() }
  });
});
