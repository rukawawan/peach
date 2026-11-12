import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import type { Browser } from 'playwright-core';
import { openFollowManage } from './design-fixture.ts';
import { launch, settle, visit, VIEWPORTS } from './harness.ts';
import { mockJavDetail } from './jav-detail-fixture.ts';

describe('已设计动效的实际触发', () => {
  let browser: Browser;
  before(async () => { browser = await launch() });
  after(async () => { await browser.close() });
  for (const viewport of VIEWPORTS) {
    it(`${viewport.name}：换批等待保留箭头并传递描线周期`, async () => {
      const opened = await visit(browser, '/', viewport);
      let release!: () => void;
      const gate = new Promise<void>(resolve => { release = resolve });
      try {
        const { page } = opened;
        await settle(page);
        await page.emulateMedia({ reducedMotion: 'no-preference' });
        await page.route(/\/api\/items\?/, async route => { await gate; await route.fallback() });
        const button = page.getByRole('button', { name: '换一批', exact: true });
        const icon = await button.locator('svg').elementHandle();
        await button.click();
        await page.waitForFunction(() => document.querySelector('[data-entity-batch]')?.getAttribute('aria-busy') === 'true');
        const busy = await button.evaluate((node, original) => {
          const svg = node.querySelector('svg')!;
          return { stable: svg === original, shuffle: !!svg?.querySelector('use[href="#i-shuffle"]'),
            cycle: svg ? getComputedStyle(svg).getPropertyValue('--strand-cycle').trim() : '' };
        }, icon);
        assert.deepEqual(busy, { stable: true, shuffle: true, cycle: '2.2s' });
        await page.emulateMedia({ reducedMotion: 'reduce' });
        assert.equal(await page.locator('#i-shuffle .strand').first().evaluate(node => getComputedStyle(node).animationName), 'none');
        release();
        await page.waitForFunction(() => document.querySelector('[data-entity-batch]')?.getAttribute('aria-busy') !== 'true');
        assert.equal(await button.evaluate((node, original) => node.querySelector('svg') === original, icon), true);
        assert.deepEqual(opened.problems, []);
      } finally { release(); await opened.close() }
    });

    it(`${viewport.name}：排序立即改变方向且两枚箭头原位交接`, async () => {
      const opened = await openFollowManage(browser, viewport);
      try {
        const { page } = opened;
        await page.emulateMedia({ reducedMotion: 'no-preference' });
        const button = page.getByRole('button', { name: /^按.+排序$/ });
        const icon = button.locator('[data-icon-swap]');
        assert.equal(await icon.count(), 1);
        const handle = await icon.elementHandle();
        const initial = await button.getAttribute('data-icon-state');
        const label = await button.getAttribute('aria-label');
        await button.click();
        assert.notEqual(await button.getAttribute('aria-label'), label);
        assert.notEqual(await button.getAttribute('data-icon-state'), initial);
        const state = await icon.evaluate((node, original) => ({ stable: node === original,
          duration: getComputedStyle(node.querySelector('[data-icon]')!).transitionDuration }), handle);
        assert.equal(state.stable, true); assert.notEqual(state.duration, '0s');
        await button.click(); await button.click();
        await page.waitForFunction(marker => {
          if (!marker) return false;
          const opacity = [...marker.querySelectorAll('[data-icon]')].map(node => getComputedStyle(node).opacity);
          return opacity.filter(value => value === '1').length === 1
            && opacity.every(value => value === '0' || value === '1')
            && marker.getAnimations({ subtree: true }).length === 0;
        }, handle, { timeout: 5000 });
        assert.equal(await icon.locator('[data-icon]').evaluateAll(nodes => nodes.filter(node => getComputedStyle(node).opacity === '1').length), 1);
        await page.emulateMedia({ reducedMotion: 'reduce' });
        assert.equal(await icon.locator('[data-icon]').first().evaluate(node => getComputedStyle(node).transitionDuration), '0s');
        assert.deepEqual(opened.problems, []);
      } finally { await opened.close() }
    });

    it(`${viewport.name}：JAV 详情标题与元信息实际播放揭示并清理`, async () => {
      const opened = await visit(browser, '/works/EXM-001', viewport, async page => {
        await mockJavDetail(page);
        await page.emulateMedia({ reducedMotion: 'no-preference' });
        await page.addInitScript(() => {
          const state = window as unknown as { javReveals: string[] };
          state.javReveals = [];
          document.addEventListener('transitionrun', event => {
            const node = event.target;
            if (node instanceof Element && node.matches('[data-reveal-line]') && node.closest('[data-jav-detail]'))
              state.javReveals.push(node.hasAttribute('data-stage-title') ? 'title' : 'meta');
          }, true);
        });
      });
      try {
        await opened.page.waitForFunction(() => {
          const state = window as unknown as { javReveals: string[] };
          return state.javReveals.includes('title') && state.javReveals.includes('meta');
        }, undefined, { timeout: 5000 });
        await opened.page.locator('[data-jav-detail] .revealline').first().waitFor({ state: 'detached' });
        assert.equal(await opened.page.locator('[data-jav-detail] [data-reveal-line]').count(), 2);
        assert.deepEqual(opened.problems, []);
      } finally { await opened.close() }
    });
  }
});
