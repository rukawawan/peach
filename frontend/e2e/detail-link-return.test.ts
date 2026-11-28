import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import type { Browser } from 'playwright-core';
import { launch, layout, settle, VIEWPORTS } from './harness.ts';
import { FAILED_JOB } from './design-fixture.ts';
import { ITEM, openItemPage } from './item-fixture.ts';

describe('详情返回', () => {
  let browser: Browser;
  before(async () => { browser = await launch() });
  after(async () => { await browser?.close() });
  it('作品详情关闭与浏览器后退保留馆藏卡片原来的位置和焦点', { timeout: 60_000 }, async () => {
    const viewport = VIEWPORTS.find(view => view.mobile)!;
    const opened = await openItemPage(browser, '/unseen', viewport, { ready: '#grid [data-media-card] [data-media-title]' });
    const { page } = opened;
    try {
      const button = page.locator('#grid [data-media-card] button[data-media-title]').last();
      await button.evaluate(element => {
        element.scrollIntoView({ block: 'center', behavior: 'instant' });
        element.focus({ preventScroll: true });
      });
      const source = await page.evaluate(() => scrollY);
      assert.ok(source > 0);
      const close = page.locator('#stage[open] #closeStage');
      for (const previous of [false, true]) {
        await page.keyboard.press('Enter');
        await close.waitFor();
        if (previous) await page.goBack();
        else await close.click();
        await page.waitForURL('**/unseen');
        await close.waitFor({ state: 'hidden' });
        await settle(page);
        assert.ok(Math.abs(await page.evaluate(() => scrollY) - source) <= 2);
        assert.equal(await button.evaluate(element => element === document.activeElement), true);
      }
    } finally { await opened.close(); }
  });
  for (const viewport of VIEWPORTS) {
    it(`${viewport.name}：退出详情保留数据管理页、展开的清单与来源地址`, { timeout: 60_000 }, async () => {
      const opened = await openItemPage(browser, '/', viewport, { ready: '#grid [data-media-card]' });
      const { page } = opened;
      try {
        await page.route('**/api/library-processing{,?*}', route => route.fulfill({ json: {
          ...FAILED_JOB, issue_preview: [{ ...FAILED_JOB.issue_preview[0], asset_id: ITEM.plain }],
        } }));
        const source = '/data-cleanup?view=issues#libraryProcessing';
        await page.goto(new URL(source, page.url()).href);
        const summary = page.locator('#libraryProcessing summary');
        await summary.click();
        const link = page.locator(`#libraryProcessing a[href^="/assets/${ITEM.plain}"]`);
        const requests: string[] = [];
        page.on('request', request => { if (request.isNavigationRequest()) requests.push(request.url()) });
        await link.scrollIntoViewIfNeeded();
        const sourceScroll = await page.evaluate(() => scrollY);
        await link.click();
        await page.locator('#stage[open] [data-item-side]').waitFor();
        assert.deepEqual(requests, [], '站内打开详情保持当前文档');
        await page.locator('#closeStage').click();
        await page.waitForFunction(expected => location.pathname + location.search + location.hash === expected, source);
        await link.waitFor({ state: 'visible' });
        assert.equal(await summary.getAttribute('aria-expanded'), 'true');
        assert.ok(Math.abs(await page.evaluate(() => scrollY) - sourceScroll) < 2, '关闭详情保留原来的滚动位置');
        await link.evaluate(element => { element.setAttribute('href', element.getAttribute('href') + '?t=1') });
        await link.click();
        await page.waitForFunction(() => location.search === '?t=1');
        await page.locator('#stage[open] [data-item-side]').waitFor();
        assert.deepEqual(await page.evaluate(() => history.state?.usr?.backgroundLocation), {
          pathname: '/data-cleanup', search: '?view=issues', hash: '#libraryProcessing',
        });
        await page.goBack();
        await page.waitForFunction(expected => location.pathname + location.search + location.hash === expected, source);
        await summary.waitFor({ state: 'visible' });
        await page.goForward();
        await page.locator('#stage[open] [data-item-side]').waitFor();
        await page.locator('#closeStage').click();
        await page.waitForFunction(expected => location.pathname + location.search + location.hash === expected, source);
        await summary.waitFor({ state: 'visible' });
        assert.deepEqual(requests, []);
        const geometry = await layout(page);
        assert.ok(geometry.scrollWidth <= geometry.viewportWidth, JSON.stringify(geometry));
        assert.deepEqual(geometry.offenders, []);
        assert.deepEqual(opened.problems.filter(line => !line.includes('VIDEOJS')), []);
      } finally { await opened.close() }
    });
  }
});
