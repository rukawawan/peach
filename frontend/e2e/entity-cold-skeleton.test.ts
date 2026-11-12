import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import { join } from 'node:path';
import type { Browser } from 'playwright-core';
import { launch, requiredEnv, VIEWPORTS } from './harness.ts';

describe('实体页冷启动等待态', () => {
  let browser: Browser;
  before(async () => { browser = await launch() });
  after(async () => { await browser.close() });
  for (const viewport of VIEWPORTS) for (const jav of [false, true]) for (const theme of ['light', 'dark']) for (const view of ['cards', 'list']) {
    it(`${viewport.name} ${theme} ${view} ${jav ? 'JAV' : '普通'}艺人直达和刷新保持形状，身份与作品独立显示`, { timeout: 60_000 }, async () => {
      const context = await browser.newContext({ viewport });
      const releases: (() => void)[] = [];
      const gate = () => new Promise<void>(resolve => { releases.push(resolve) });
      let shapes = gate(), entity = gate(), items = gate(), photos = gate();
      const name = '演示艺人';
      const shape = { id: 90001, kind: 'performer', names: [name], parts: jav ? ['facts', 'costars', 'jav'] : [] };
      try {
        await context.addInitScript(({ theme, view }) => {
          localStorage.setItem('peach.settings.v1', JSON.stringify({ theme, detailAutoplay: false }));
          localStorage.setItem('peach.catalog-view.v1', view);
          const seen: { facts: boolean; costars: boolean; jav: boolean }[] = [];
          Object.assign(window, { entityWaitingFrames: seen });
          let previous: Element | null = null;
          new MutationObserver(() => {
            const root = document.querySelector('[data-skeleton="entity/performer"]');
            if (!root || root === previous) return;
            previous = root;
            seen.push({ facts: !!root.querySelector('[data-entity-facts]'),
              costars: !!root.querySelector('[data-entity-foot]'), jav: !!root.querySelector('[aria-label="JAV 卡片版式"]') });
          }).observe(document, { childList: true, subtree: true });
        }, { theme, view });
        const page = await context.newPage();
        await page.route('**/performers/90001', async route => {
          const response = await route.fetch({ url: requiredEnv('PEACH_E2E_ORIGIN') + '/' });
          await route.fulfill({ response, body: (await response.text()).replace('</head>',
            `<script type="application/json" id="peach-entity-shape">${JSON.stringify(shape)}</script></head>`) });
        });
        await page.route('**/api/entity/shapes', async route => { await shapes; await route.fulfill({ json: { ok: true, entities: [shape] } }) });
        await page.route(/\/api\/entity\?/, async route => { await entity; await route.fulfill({ json: {
          id: shape.id, kind: shape.kind, canonical_name: name, asset_count: 1, tags: [], links: [],
          related_performers: jav ? [{ id: 90002, k: '同台艺人', rep: null }] : [],
          profile: jav ? { height: 160, birth_date: '1990-01-01', debut_date: '2010-01-01',
            active: { from: '2010', ongoing: true }, tags: ['演示标签'] } : null,
          aliases: [], metadata: {}, entry_links: [],
        } }) });
        await page.route(/\/api\/items\?/, async route => { await items; await route.fulfill({ json: {
          items: [{ id: 91001, name: '演示作品', is_jav: jav, has_thumb: false }], total: 1, has_more: false,
        } }) });
        await page.route(/\/api\/photos\?/, async route => {
          await photos;
          await route.fulfill({ json: { items: [], total: 0, sets: [], has_more: false } });
        });
        for (const mode of ['direct', 'refresh']) {
          if (mode === 'refresh') {
            shapes = gate(); entity = gate(); items = gate(); photos = gate();
            await page.reload({ waitUntil: 'load' });
          } else await page.goto(requiredEnv('PEACH_E2E_ORIGIN') + '/performers/90001', { waitUntil: 'load' });
          const root = page.locator('[data-skeleton="entity/performer"]');
          await root.waitFor();
          const first = await root.elementHandle();
          assert.equal(await root.locator('[data-entity-portrait="round"]').evaluate(node =>
            getComputedStyle(node).borderTopLeftRadius), '50%', '艺人头像等待态形状不准确');
          assert.equal(await root.locator('[data-entity-facts]').count() > 0, jav, '首次等待态资料栏不准确');
          assert.equal(await root.locator('[data-entity-foot]').count() > 0, jav, '首次等待态相关艺人不准确');
          assert.equal(await root.locator('[aria-label="JAV 卡片版式"]').count() > 0, jav && view === 'cards', '首次等待态卡片版式不准确');
          assert.equal(await root.locator('[aria-label="馆藏显示方式"]').count(), 1);
          assert.equal(await root.locator('[data-folder-mode-toggle]').count(), 1);
          await page.waitForFunction(() => !document.querySelector('[data-skeleton="entity/performer"] .skeleton-awaiting'));
          const visibility = await root.evaluate(node => {
            node.classList.add('skeleton-awaiting');
            const leaks = [node, ...node.querySelectorAll('*')].flatMap(child => ['', '::before', '::after'].filter(pseudo => {
              const css = getComputedStyle(child, pseudo || null);
              return (!pseudo || !['none', 'normal'].includes(css.content)) && css.visibility !== 'hidden';
            }).map(pseudo => `${child.tagName}${pseudo}`));
            node.classList.remove('skeleton-awaiting');
            return leaks;
          });
          assert.deepEqual(visibility, [], '等待门槛内出现了单独可见的骨架或微光');
          const controls = async () => page.locator('[data-entity-filter-glass]').evaluate(node => {
            const selectors = ['[data-filter-row="top"]','[data-filter-row="bottom"]','[data-entity-state=""]',
              '[data-entity-batch]','[data-entity-sort="rating"]','[data-folder-mode-toggle]'];
            return selectors.map(selector => {
              const el = node.querySelector(selector)!;
              const css = getComputedStyle(el), box = el.getBoundingClientRect();
              const icon = selector === '[data-entity-batch]' ? el.querySelector('svg')?.getBoundingClientRect() : null;
              return { selector, height: box.height, width: selector.includes('data-filter-row') ? 0 : box.width,
                padding: css.padding, gap: css.gap, font: css.fontSize,
                icon: icon ? { width: icon.width, height: icon.height,
                  x: icon.x + icon.width / 2 - box.x - box.width / 2,
                  y: icon.y + icon.height / 2 - box.y - box.height / 2 } : null };
            });
          });
          const waitingControls = await controls();
          const batch = waitingControls.find(control => control.selector === '[data-entity-batch]')!;
          assert.deepEqual(batch.icon, { width: 16, height: 16, x: 0, y: 0 }, '换一批图标应居中且保持 16px');
          // 筛选条里的标签取紧凑档 `--control-h-compact`，骨架与真实标签同高。
          assert.equal(await root.locator('[data-entity-tags] .skeleton').first().evaluate(node => node.getBoundingClientRect().height), 32);
          assert.ok(await root.locator('[data-entity-state]').count(), '静态观看筛选尚未显示');
          const ratio = (scope = root) => scope.locator('[style*="--skeleton-card-ratio"]').first().evaluate(node =>
            Number((node as HTMLElement).style.getPropertyValue('--skeleton-card-ratio')));
          if (view === 'cards') assert.equal(await ratio(), jav ? .75 : 16 / 9);
          if (process.env.PEACH_COLD_EVIDENCE) await page.screenshot({
            path: join(process.env.PEACH_COLD_EVIDENCE, `${viewport.name}-${jav ? 'jav' : 'ordinary'}-${mode}.png`),
            fullPage: false,
          });
          const identityResponse = page.waitForResponse(response => response.url().includes('/api/entity?'));
          for (const release of releases.splice(0, 2)) release();
          await identityResponse;
          const identity = page.locator('[data-entity-hero] [data-entity-identity] h2');
          await identity.filter({ hasText: name }).waitFor();
          await root.waitFor({ state: 'detached' });
          assert.equal(await first!.evaluate(node => node.isConnected), false, '身份已取得仍保留整页等待态');
          const hero = await page.locator('[data-entity-hero]').elementHandle();
          const body = page.locator('[data-entity-body]');
          const waitingBody = body.locator('[data-content-transition][data-pending][aria-busy="true"]');
          await waitingBody.waitFor();
          assert.equal(await body.locator('[data-media-card], [data-catalog-row]').count(), 0,
            '作品响应未放行时不应出现伪造或旧人物作品');
          if (view === 'cards') assert.equal(await ratio(waitingBody), jav ? .75 : 16 / 9,
            '身份先显示时，作品等待区仍应保持已知的卡片比例');
          else await waitingBody.locator('[data-list-skeleton]').waitFor();
          releases.shift()!();
          await body.locator('[data-media-card][data-id="91001"], [data-catalog-row][data-id="91001"]').first().waitFor();
          await waitingBody.waitFor({ state: 'detached' });
          assert.equal(await hero!.evaluate(node => node === document.querySelector('[data-entity-hero]')), true,
            '作品到达时重建了已显示的人物身份');
          assert.equal(await identity.textContent(), name, '照片仍在等待时人物身份应继续显示');
          const photoResponse = page.waitForResponse(response => response.url().includes('/api/photos?'));
          releases.shift()!();
          await photoResponse;
          assert.equal(await hero!.evaluate(node => node === document.querySelector('[data-entity-hero]')), true,
            '照片到达时重建了已显示的人物身份');
          assert.deepEqual(await controls(), waitingControls, '筛选按钮的尺寸或间距与就绪状态不一致');
          const bottom = page.locator('[data-entity-filter-glass] > [data-filter-row="bottom"]');
          const overflow = await bottom.evaluate(node => {
            const readout = node.querySelector('[data-entity-readout]')!;
            const css = getComputedStyle(readout);
            return { max: node.scrollWidth - node.clientWidth, shrink: css.flexShrink,
              width: readout.clientWidth, content: readout.scrollWidth, overflow: getComputedStyle(node).overflowX };
          });
          assert.equal(overflow.shrink, '0', '操作行读数保持完整宽度');
          assert.equal(overflow.width, overflow.content, '操作行读数完整显示');
          assert.equal(overflow.overflow, 'auto');
          if (overflow.max > 1) {
            await bottom.scrollIntoViewIfNeeded();
            const box = await bottom.boundingBox();
            await page.mouse.move(box!.x + 15, box!.y + box!.height / 2);
            await page.mouse.wheel(0, overflow.max + 100);
            await page.waitForFunction(() => {
              const row = document.querySelector('[data-entity-filter-glass] > [data-filter-row="bottom"]')!;
              return row.scrollLeft > 0 && row.scrollLeft >= row.scrollWidth - row.clientWidth - 1;
            });
            const reachable = await bottom.evaluate(node => {
              const edge = node.getBoundingClientRect(), keys = node.querySelectorAll('[data-entity-sort]');
              return keys[keys.length - 1]!.getBoundingClientRect().right <= edge.right;
            });
            assert.ok(reachable, '最后一枚排序键可以滚动到完整可见');
          }
          const frames = await page.evaluate(() =>
            (window as Window & { entityWaitingFrames: { facts: boolean; costars: boolean; jav: boolean }[] }).entityWaitingFrames);
          assert.deepEqual(frames, [{ facts: jav, costars: jav, jav: jav && view === 'cards' }], '一次打开画出了多段或不准确的等待态');
          assert.equal(await page.locator('[data-entity-facts]').count() > 0, jav);
          assert.equal(await page.locator('[data-entity-foot]').count() > 0, jav);
          await first!.dispose();
          await hero!.dispose();
        }
      } finally { releases.forEach(release => release()); await context.close() }
    });
  }
});
