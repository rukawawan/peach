import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import type { Browser } from 'playwright-core';
import { launch, visit, settle, VIEWPORTS, layout } from './harness.ts';
import { verifyColumnContentWidth } from './table-preferences-fixture.ts';

describe('链接检查身份与断链动效', () => {
  let browser: Browser;
  before(async () => { browser = await launch(); });
  after(async () => { await browser?.close(); });
  for (const viewport of VIEWPORTS) {
    it(`两种结果保留资料入口，断链短线只在检查执行时闪烁（${viewport.name}）`, async () => {
      let phase = 'complete';
      const opened = await visit(browser, '/data-cleanup/links', viewport, async page => {
        await page.emulateMedia({ reducedMotion: 'no-preference' });
        const row = { id: 1, entity: '示例作者', entity_id: 31, entity_kind: 'performer',
          face: { id: 31, name: '示例作者', has_image: true }, link_kind: 'official', label: '示例事务所',
          url: `https://example.com/profile/${'long-address-'.repeat(30)}`, note: 'HTTP 404' };
        await page.route('**/api/links/check', route => {
          if (!route.request().postDataJSON()?.status_only) phase = 'running';
          return route.fulfill({ json: {
          status: phase, check_id: 'test', checked: 2, total: 2,
          gone: [row], unclear: [{ ...row, id: 2, note: 'HTTP 403\n站点拒绝本次访问，暂时无法确认链接是否失效。链接保留，可稍后重试。' }], scope: 'all',
        } }); });
        for (const pattern of ['**/entity-image?**', '**/link-mark?**']) {
          await page.route(pattern, route => route.fulfill({ contentType: 'image/svg+xml',
            body: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="gray"/></svg>' }));
        }
      });
      try {
        const { page } = opened;
        await page.locator('[data-link-check-rays]').waitFor();
        for (const title of ['地址已失效', '本次未访问成功']) {
          const table = page.getByRole('grid', { name: title, exact: true });
          await table.waitFor();
          assert.equal(await table.locator('[data-link-identity]').getAttribute('href'), '/performers/31');
          assert.equal(await table.locator('[data-link-identity] img').count(), 1);
          assert.equal(await table.locator('[data-link-address] img').count(), 1);
          assert.equal(await table.locator('[data-link-name] img').count(), 0);
          assert.ok((await table.innerText()).includes('Peach 资料'));
          assert.ok((await table.innerText()).includes('链接名称'));
          await verifyColumnContentWidth(table, 'url', '[data-link-address]');
          await verifyColumnContentWidth(table, 'note', '[data-link-result]');
        }
        const sections = await page.evaluate(() => {
          const gone = document.querySelector('[data-link-results="gone"]')!;
          const unclear = document.querySelector('[data-link-results="unclear"]')!;
          const action = [...gone.querySelectorAll('button')].find(node => node.textContent?.includes('条失效链接'))!;
          const text = document.querySelector('[data-link-result="unclear"] p')!;
          return { deletionBottom: action.getBoundingClientRect().bottom, unclearTop: unclear.getBoundingClientRect().top,
            textBackground: getComputedStyle(text).backgroundColor,
            footerBackground: getComputedStyle(action.parentElement!).backgroundColor,
            panelBackground: getComputedStyle(gone).backgroundColor };
        });
        assert.ok(sections.deletionBottom < sections.unclearTop);
        assert.equal(sections.textBackground, 'rgba(0, 0, 0, 0)');
        assert.equal(sections.footerBackground, sections.panelBackground);
        assert.equal(await page.locator('[data-link-results="gone"] [data-link-code]').innerText(), 'HTTP 404');
        assert.equal(await page.locator('[data-link-results="unclear"] [data-link-code]').count(), 0);
        await page.locator('[data-link-results="unclear"]').getByRole('button', { name: '查看详情', exact: true }).click();
        await page.getByText('暂时无法确认链接是否失效', { exact: false }).waitFor();
        assert.equal(await page.locator('[data-link-check-rays]').evaluate(node => getComputedStyle(node).animationName), 'none');
        await page.locator('[data-link-check]').click();
        await page.waitForFunction(() => document.querySelector('[data-link-check]')?.getAttribute('aria-busy') === 'true');
        const motion = await page.locator('[data-link-check-icon]').evaluate(svg => {
          const rays = svg.querySelector('[data-link-check-rays]')!;
          const css = getComputedStyle(rays);
          const animation = rays.getAnimations()[0]!;
          animation.pause(); animation.currentTime = 0;
          const bright = getComputedStyle(rays).opacity;
          animation.currentTime = 600;
          return { count: rays.children.length, name: css.animationName,
            iterations: css.animationIterationCount, bright, dim: getComputedStyle(rays).opacity,
            body: [...svg.querySelectorAll(':scope > path')].map(path => ({
              animation: getComputedStyle(path).animationName, transform: getComputedStyle(path).transform,
            })) };
        });
        assert.equal(motion.count, 4); assert.equal(motion.name, 'peach-link-blink');
        assert.equal(motion.iterations, 'infinite'); assert.ok(Number(motion.dim) < Number(motion.bright));
        assert.deepEqual(motion.body, [{ animation: 'none', transform: 'none' }, { animation: 'none', transform: 'none' }]);
        await page.emulateMedia({ reducedMotion: 'reduce' });
        assert.equal(await page.locator('[data-link-check-rays]').evaluate(node => getComputedStyle(node).animationName), 'none');
        phase = 'complete';
        await page.waitForFunction(() => !document.querySelector('[data-link-check]')?.hasAttribute('aria-busy'), undefined, { timeout: 10_000 });
        await page.emulateMedia({ reducedMotion: 'no-preference' });
        assert.equal(await page.locator('[data-link-check-rays]').evaluate(node => getComputedStyle(node).animationName), 'none');
        await settle(page);
        const geometry = await layout(page);
        assert.ok(geometry.scrollWidth <= geometry.viewportWidth);
        assert.deepEqual(geometry.offenders, []);
        assert.deepEqual(opened.problems, []);
      } finally { await opened.close(); }
    });

    it(`默认头像与两类 HTTP 结果在明暗主题均可辨识（${viewport.name}）`, async () => {
      const opened = await visit(browser, '/data-cleanup/links', viewport, async page => {
        const row = { id: 1, entity: '示例作者', entity_id: 31, entity_kind: 'performer',
          face: { has_image: false }, link_kind: 'social', label: '示例站点', url: 'https://example.com', note: 'HTTP 404' };
        await page.route('**/api/links/check', route => route.fulfill({ json: { status: 'complete', check_id: 'contrast',
          gone: [row], unclear: [{ ...row, id: 2, note: 'HTTP 502' }], checked: 2, total: 2 } }));
        await page.route('**/link-mark?**', route => route.fulfill({ contentType: 'image/svg+xml',
          body: '<svg xmlns="http://www.w3.org/2000/svg"/>' }));
      });
      try {
        const { page } = opened;
        await page.locator('[data-link-avatar]').first().waitFor();
        for (const dark of [false, true]) {
          await page.evaluate(dark => {
            document.documentElement.dataset.theme = dark ? 'dark' : 'light';
            document.documentElement.classList.toggle('dark', dark);
          }, dark);
          const contrasts = await page.locator('[data-link-avatar],[data-link-code]').evaluateAll(nodes => {
            const canvas = document.createElement('canvas'); canvas.width = canvas.height = 1;
            const ctx = canvas.getContext('2d')!;
            const rgba = (color: string) => {
              ctx.clearRect(0, 0, 1, 1); ctx.fillStyle = color; ctx.fillRect(0, 0, 1, 1);
              return [...ctx.getImageData(0, 0, 1, 1).data];
            };
            const luminance = (color: number[]) => color.slice(0, 3).map(value => {
              const v = value / 255; return v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4;
            }).reduce((sum, value, i) => sum + value * [0.2126, 0.7152, 0.0722][i], 0);
            return nodes.map(node => {
              const layers: number[][] = [];
              for (let parent: Element | null = node; parent; parent = parent.parentElement) layers.unshift(rgba(getComputedStyle(parent).backgroundColor));
              let background = [255, 255, 255];
              for (const layer of layers) background = background.map((v, i) => layer[i] * layer[3] / 255 + v * (1 - layer[3] / 255));
              const foreground = rgba(getComputedStyle(node).color);
              const front = luminance(foreground), back = luminance(background);
              return (Math.max(front, back) + .05) / (Math.min(front, back) + .05);
            });
          });
          assert.ok(contrasts.length >= 4);
          assert.ok(contrasts.every(ratio => ratio >= 4.5), JSON.stringify({ dark, contrasts }));
        }
        assert.deepEqual(opened.problems, []);
      } finally { await opened.close() }
    });

    it(`关注列表空状态有背景边框且添加入口位于框内（${viewport.name}）`, async () => {
      const opened = await visit(browser, '/subscriptions', viewport, async page => {
        await page.route('**/api/follow?summary=1', route => route.fulfill({ json: { sources: [] } }));
      });
      try {
        const { page } = opened;
        const empty = page.locator('[data-empty-state]').filter({ hasText: '还没有关注来源' });
        await empty.waitFor();
        const face = await empty.evaluate(node => {
          const style = getComputedStyle(node);
          return { background: style.backgroundColor, border: style.borderTopWidth,
            action: node.querySelector('button')?.textContent };
        });
        assert.notEqual(face.background, 'rgba(0, 0, 0, 0)');
        assert.equal(face.border, '1px'); assert.equal(face.action, '添加关注');
        await settle(page);
        const geometry = await layout(page);
        assert.ok(geometry.scrollWidth <= geometry.viewportWidth);
        assert.deepEqual(geometry.offenders, []); assert.deepEqual(opened.problems, []);
        const timeOrigin = await page.evaluate(() => performance.timeOrigin);
        await empty.getByRole('button', { name: '添加关注', exact: true }).click();
        await page.getByRole('combobox', { name: '来源链接、名字或 id', exact: true }).waitFor();
        assert.equal(new URL(page.url()).searchParams.get('tab'), 'add');
        assert.equal(await page.evaluate(() => performance.timeOrigin), timeOrigin);
      } finally { await opened.close(); }
    });
  }
});
