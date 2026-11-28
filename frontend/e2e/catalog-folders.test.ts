import assert from 'node:assert/strict';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { after, before, describe, it } from 'node:test';
import type { Browser } from 'playwright-core';
import { launch, layout, settle, VIEWPORTS, visit } from './harness.ts';
import { ITEM, openItemPage } from './item-fixture.ts';

describe('首页文件夹浏览', () => {
  let browser: Browser;
  before(async () => { browser = await launch() });
  after(async () => { await browser?.close() });

  it('文件浏览的框选在排序和全屏切换后保留', { timeout: 90_000 }, async () => {
    const root = { id: 'library', name: 'Library', mount: '/media/library', icon: 'film' };
    const opened = await visit(browser, '/?directory=1&directory_root=library', VIEWPORTS[0]!, async page => {
      await page.route('**/api/media-directory?*', route => {
        const params = new URL(route.request().url()).searchParams;
        const names = params.get('dir') === 'desc' ? ['sample-3.txt', 'sample-2.txt', 'sample-1.txt'] : ['sample-1.txt', 'sample-2.txt', 'sample-3.txt'];
        return route.fulfill({ json: { root: root.id, roots: [root], relative: '', state: 'ready',
          path: root.mount, total: 3, offset: 0, next_offset: null, directories: [],
          files: names.map(name => ({ name, size: 12, asset_id: null })) } });
      });
    });
    const { page } = opened;
    try {
      const dialog = page.getByRole('dialog', { name: '浏览文件', exact: true });
      const rows = dialog.locator('[data-media-directory-row]');
      await rows.first().waitFor();
      assert.equal(await dialog.locator('thead th[data-key="select"]').count(), 0);
      await dialog.getByRole('button', { name: '多选模式', exact: true }).click();
      await dialog.getByRole('button', { name: '退出多选', exact: true }).waitFor();
      await dialog.locator('thead th[data-key="select"]').waitFor();
      const first = (await rows.first().boundingBox())!;
      const second = (await rows.nth(1).boundingBox())!;
      await page.mouse.move(first.x + 86, first.y + 8);
      await page.mouse.down();
      await page.mouse.move(first.x + 117, second.y + second.height - 3, { steps: 8 });
      await page.mouse.up();
      assert.equal(await dialog.locator('[data-media-directory-row][data-board-selected]').count(), 2);
      await dialog.getByRole('button', { name: '全屏', exact: true }).click();
      assert.equal(await dialog.locator('[data-directory-fullscreen]').count(), 1);
      const header = dialog.locator('thead th[data-key="name"] [data-sort-indicator]');
      await header.click();
      await header.click();
      await page.waitForFunction(() => document.querySelector('[data-media-directory-row]')?.textContent?.includes('sample-3.txt'));
      assert.equal(await dialog.locator('[data-media-directory-row][data-board-selected]').count(), 2);
      await dialog.getByRole('button', { name: '退出全屏', exact: true }).click();
      assert.equal(await dialog.locator('[data-directory-fullscreen]').count(), 0);
      await dialog.getByRole('button', { name: '刷新目录', exact: true }).click();
      await dialog.getByText('目录已刷新', { exact: true }).waitFor();
    } finally { await opened.close() }
  });

  for (const viewport of VIEWPORTS) {
    it(`${viewport.name} 播放详情里的文件浏览可点击且先于播放器关闭`, { timeout: 90_000 }, async () => {
      const opened = await openItemPage(browser, `/assets/${ITEM.plain}`, viewport);
      const { page } = opened;
      try {
        await page.route('**/api/reveal', route => route.fulfill({ json: { ok: true, mode: 'server', id: ITEM.plain } }));
        await page.route('**/api/media-directory?*', route => route.fulfill({ json: {
          roots: [{ id: 'local', name: 'Local library', mount: '/media/local', location: 'local', icon: 'hard-drive' }],
          root: 'local', relative: '', state: 'ready', directories: [],
          files: [{ name: 'sample.mp4', asset_id: ITEM.plain, size: 1024, modified_at: 1700000000 }], next_offset: null, focus_name: 'sample.mp4',
        } }));
        const stage = page.locator('#stage[open]');
        await stage.locator('[data-item-side]').waitFor();
        const reveal = stage.locator('[data-reveal]').first();
        await reveal.click();
        const dialog = page.getByRole('dialog', { name: '浏览文件', exact: true });
        await dialog.getByText('sample.mp4', { exact: true }).waitFor();
        const hit = await dialog.evaluate(node => {
          const rect = node.getBoundingClientRect();
          return node.contains(document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2));
        });
        assert.equal(hit, true, '文件浏览应在原生播放对话框之上并可交互');
        await dialog.getByRole('button', { name: '返回上级目录', exact: true }).click();
        await page.keyboard.press('Escape');
        await dialog.waitFor({ state: 'hidden' });
        assert.equal(await stage.isVisible(), true, '关闭文件浏览不应关闭播放详情');
        assert.equal(await reveal.evaluate(node => node === document.activeElement), true);
        await reveal.click();
        await dialog.getByRole('button', { name: '关闭', exact: true }).click();
        await dialog.waitFor({ state: 'hidden' });
        assert.equal(await stage.isVisible(), true);
      } finally { await opened.close() }
    });

    it(`${viewport.name} 实际文件浏览独立于馆藏导航且不改变侧栏`, { timeout: 90_000 }, async () => {
      const longName = 'a-very-long-media-filename-'.repeat(8) + '.mp4';
      const roots = [{ id: 'local', name: 'Local library', mount: '/media/local', location: 'local', icon: 'film' }];
      let itemReads = 0;
      const opened = await visit(browser, '/', viewport, async page => {
        page.on('request', request => { if (new URL(request.url()).pathname === '/api/items') itemReads++ });
        await page.route('**/api/media-directory?*', route => {
          const root = new URL(route.request().url()).searchParams.get('root');
          return route.fulfill({ json: { roots, root, relative: '', state: root ? 'ready' : 'roots',
            directories: [], files: root ? [{ name: longName, asset_id: null, size: 1024, modified_at: 1700000000 }] : [],
            path: root ? '/media/local' : undefined, next_offset: null, read_only: true } });
        });
      });
      const { page } = opened;
      try {
        await page.locator('#grid [data-media-card]').first().waitFor();
        await settle(page);
        if (await page.locator('#filterBtn').getAttribute('aria-expanded') !== 'true') await page.locator('#filterBtn').click();
        const toggle = page.locator('[data-sidebar-kind="src"] > [data-sidebar-toggle]');
        if (await toggle.getAttribute('aria-expanded') === 'true') await toggle.click();
        const before = await page.evaluate(() => ({ url: location.href,
          sidebar: document.querySelector('#drawer')!.getBoundingClientRect().width,
          card: document.querySelector('#grid [data-media-card]')!.textContent }));
        const reads = itemReads;
        await page.getByRole('button', { name: '浏览文件', exact: true }).click();
        const dialog = page.getByRole('dialog', { name: '浏览文件', exact: true });
        const library = dialog.getByRole('row').filter({ hasText: 'Local library' });
        await library.locator('[data-source-mark="film"]').waitFor();
        const layoutButton = dialog.getByRole('button', { name: '列布局', exact: true });
        await layoutButton.click();
        const rootOrder = page.getByRole('dialog', { name: '媒体目录的列布局', exact: true });
        await rootOrder.getByRole('button', { name: '上移 挂载路径', exact: true }).click();
        await library.locator('td').first().filter({ hasText: /^\/media\/local$/ }).waitFor();
        await rootOrder.getByRole('button', { name: '重置列顺序', exact: true }).click();
        await page.keyboard.press('Escape');
        await rootOrder.waitFor({ state: 'hidden' });
        await library.click();
        await dialog.getByText(longName, { exact: true }).waitFor();
        await dialog.locator('th[data-key="modified"]').waitFor();
        await dialog.getByRole('gridcell', { name: 'MP4', exact: true }).waitFor();
        assert.equal(await dialog.locator('th[data-key="created"]').count(), 0);
        await dialog.getByRole('button', { name: '显示列', exact: true }).click();
        const columns = page.getByRole('dialog', { name: '实际目录内容显示列', exact: true });
        await columns.getByText('创建时间', { exact: true }).click();
        await page.keyboard.press('Escape');
        await columns.waitFor({ state: 'hidden' });
        await dialog.locator('th[data-key="created"]').waitFor();
        const nameHeader = dialog.locator('th[data-key="name"]');
        const typeHeader = dialog.locator('th[data-key="type"]');
        const firstColumn = dialog.locator('[data-media-directory-entries] thead th:not([data-key="select"])').first();
        if (!viewport.mobile) await page.emulateMedia({ reducedMotion: 'no-preference' });
        const nameBox = (await nameHeader.boundingBox())!;
        const typeBox = (await typeHeader.boundingBox())!;
        await page.mouse.move(typeBox.x + 12, typeBox.y + 3);
        await page.mouse.down();
        await page.mouse.move(nameBox.x + 12, nameBox.y + 3, { steps: 8 });
        if (!viewport.mobile) {
          assert.equal(await firstColumn.getAttribute('data-key'), 'name');
          await page.waitForFunction(({ left, width }) => {
            const header = document.querySelector('[data-media-directory-entries] th[data-key="name"]')!;
            return Math.abs(header.getBoundingClientRect().left - left - width) < 1;
          }, { left: nameBox.x, width: typeBox.width });
        }
        await page.mouse.up();
        if (!viewport.mobile) await page.emulateMedia({ reducedMotion: 'reduce' });
        await firstColumn.and(typeHeader).waitFor();
        assert.equal(await dialog.locator('tbody tr').first().locator('td').first().textContent(), 'MP4');
        await layoutButton.click();
        const order = page.getByRole('dialog', { name: '实际目录内容的列布局', exact: true });
        const [resetReceipt] = await Promise.all([
          page.waitForResponse(response => {
            const request = response.request();
            return new URL(response.url()).pathname === '/api/settings' && request.method() === 'POST'
              && request.postDataJSON()?.tableLayouts?.['media-directory']?.order?.length === 0;
          }),
          order.getByRole('button', { name: '重置列顺序', exact: true }).click(),
        ]);
        assert.ok(resetReceipt.ok(), '返回默认列顺序的保存请求应成功');
        await page.keyboard.press('Escape');
        await order.waitFor({ state: 'hidden' });
        await firstColumn.and(nameHeader).waitFor();
        await dialog.locator('th[data-key="created"]').waitFor();
        if (!viewport.mobile) {
          const name = dialog.locator('th[data-key="name"]');
          const width = await name.evaluate(node => node.getBoundingClientRect().width);
          const handle = await name.locator('.react-aria-ColumnResizer').boundingBox();
          assert.ok(handle);
          const x = handle.x + handle.width / 2, y = handle.y + handle.height / 2;
          await page.mouse.move(x, y);
          await page.mouse.down();
          await page.mouse.move(x + 55, y, { steps: 8 });
          await page.mouse.up();
          await page.waitForFunction(({ column, width }) => column!.getBoundingClientRect().width > width,
            { column: await name.elementHandle(), width });
          const typeHandle = (await typeHeader.locator('.react-aria-ColumnResizer').boundingBox())!;
          const typeX = typeHandle.x + typeHandle.width / 2;
          const typeY = typeHandle.y + typeHandle.height / 2;
          await page.mouse.move(typeX, typeY);
          await page.mouse.down();
          await page.mouse.move(typeX - 100, typeY, { steps: 8 });
          await page.mouse.up();
          await page.waitForFunction(column => {
            const minimum = Number(column!.querySelector('.react-aria-ColumnResizer input')!.getAttribute('min'));
            return Math.abs(column!.getBoundingClientRect().width - minimum) <= 1;
          }, await typeHeader.elementHandle());
          const typeAtMinimum = await typeHeader.evaluate(node => {
            const filter = node.querySelector('[data-table-column-filter]')!;
            const label = filter.querySelector<HTMLElement>('.truncate')!;
            const caret = filter.querySelector('svg')!.getBoundingClientRect();
            const sort = node.querySelector('[data-sort-indicator]')!.getBoundingClientRect();
            const resizer = node.querySelector('.react-aria-ColumnResizer')!;
            return {
              width: node.getBoundingClientRect().width,
              min: Number(resizer.querySelector('input')!.min),
              labelFits: label.scrollWidth === label.clientWidth,
              gaps: [caret.left - label.getBoundingClientRect().right, sort.left - caret.right,
                resizer.getBoundingClientRect().left - sort.right],
            };
          });
          assert.ok(Math.abs(typeAtMinimum.width - typeAtMinimum.min) <= 1 && typeAtMinimum.labelFits
            && typeAtMinimum.gaps.every(gap => gap >= 4), JSON.stringify(typeAtMinimum));
          const initialSort = await typeHeader.getAttribute('aria-sort');
          await typeHeader.getByRole('button', { name: '筛选类型', exact: true }).click();
          await page.getByRole('dialog', { name: '筛选类型', exact: true }).waitFor();
          assert.equal(await typeHeader.getAttribute('aria-sort'), initialSort);
          await page.keyboard.press('Escape');
          await layoutButton.click();
          await order.getByRole('button', { name: '重置列宽', exact: true }).click();
          await page.keyboard.press('Escape');
          await order.waitFor({ state: 'hidden' });
          await page.waitForFunction(({ column, width }) => Math.abs(column!.getBoundingClientRect().width - width) <= 1,
            { column: await name.elementHandle(), width });
        }
        const geometry = await dialog.evaluate(node => ({
          width: node.getBoundingClientRect().width, scroll: node.scrollWidth,
          left: node.getBoundingClientRect().left, right: node.getBoundingClientRect().right,
          top: node.getBoundingClientRect().top, bottom: node.getBoundingClientRect().bottom,
          viewport: innerWidth, height: innerHeight,
        }));
        assert.ok(geometry.scroll <= geometry.width + 1, JSON.stringify(geometry));
        assert.ok(geometry.left >= 0 && geometry.right <= geometry.viewport && geometry.top >= 0 && geometry.bottom <= geometry.height, JSON.stringify(geometry));
        await dialog.getByRole('button', { name: '返回上级目录', exact: true }).click();
        await library.waitFor();
        await dialog.getByRole('button', { name: '关闭', exact: true }).click();
        await dialog.waitFor({ state: 'hidden' });
        assert.equal(page.url(), before.url);
        assert.equal(itemReads, reads, '文件浏览不应重新请求馆藏');
        assert.equal(await page.locator('#filterBtn').getAttribute('aria-expanded'), 'true');
        assert.equal(await toggle.getAttribute('aria-expanded'), 'false');
        assert.equal(await page.locator('#drawer').evaluate(node => node.getBoundingClientRect().width), before.sidebar);
        assert.equal(await page.locator('#grid [data-media-card]').first().textContent(), before.card);
        assert.deepEqual(opened.problems.filter(line => !line.includes('VIDEOJS')), []);
      } finally { await opened.close() }
    });

    it(`${viewport.name} 关闭从文件浏览打开的详情，恢复原目录、分页和滚动位置`, { timeout: 90_000 }, async () => {
      const opened = await openItemPage(browser, '/', viewport, { ready: '#grid [data-media-card]' });
      const { page } = opened;
      const targetName = 'file-25.mp4';
      try {
        await page.route('**/api/media-directory?*', route => {
          const params = new URL(route.request().url()).searchParams;
          const root = params.get('root');
          const relative = params.get('relative') ?? '';
          const offset = Number(params.get('offset') ?? 0);
          return route.fulfill({ json: {
            roots: [{ id: 'test', name: 'Test library', mount: '/media/test', icon: 'film' }], root, relative, offset,
            state: root ? 'ready' : 'roots', path: root ? `/media/test/${relative}` : undefined,
            directories: root && !relative ? [{ name: 'Test folder', modified_at: null }] : [],
            files: offset ? Array.from({ length: 40 }, (_, index) => ({ name: `file-${index}.mp4`, size: 1024,
              modified_at: null, asset_id: index === 25 ? ITEM.plain : null })) : relative ? [{ name: 'first.mp4', asset_id: null }] : [],
            next_offset: relative && !offset ? 100 : null, total: relative ? 140 : 1,
          } });
        });
        const opener = page.getByRole('button', { name: '浏览文件', exact: true });
        if (await page.locator('#filterBtn').getAttribute('aria-expanded') !== 'true') await page.locator('#filterBtn').click();
        await opener.click();
        const dialog = page.getByRole('dialog', { name: '浏览文件', exact: true });
        await dialog.getByRole('row', { name: 'Test library', exact: true }).click();
        await dialog.getByText('Test folder', { exact: true }).click();
        await dialog.getByRole('button', { name: '下一页', exact: true }).click();
        const row = dialog.locator('tbody tr').filter({ hasText: targetName });
        await row.scrollIntoViewIfNeeded();
        await row.focus();
        const scroller = dialog.locator('[data-media-directory-body] .overflow-x-auto');
        const position = await scroller.evaluate((node, mobile) => {
          if (mobile) node.scrollLeft = 64;
          return { top: node.scrollTop, left: node.scrollLeft };
        }, viewport.mobile);
        assert.ok(position.top > 0);
        const origin = page.url();
        await page.keyboard.press('Enter');
        const stage = page.locator('#stage[open]');
        await stage.locator('[data-item-side]').waitFor();
        await dialog.waitFor({ state: 'hidden' });
        await stage.locator('#closeStage').click();
        await row.waitFor();
        await page.waitForFunction(name => document.activeElement?.getAttribute('data-key') === `file:${name}`, targetName);
        await page.waitForFunction(expected => {
          const viewport = document.querySelector('[data-media-directory-body] .overflow-x-auto');
          return viewport?.scrollTop === expected.top && viewport.scrollLeft === expected.left;
        }, position);
        assert.equal(page.url(), origin);
        await dialog.getByRole('navigation', { name: '文件夹路径', exact: true }).getByText('Test folder', { exact: true }).waitFor();
        await dialog.getByRole('button', { name: '上一页', exact: true }).waitFor();
      } finally { await opened.close() }
    });

    it(`${viewport.name} 目录范围、首页控件、用途预览和返回导航共用馆藏`, { timeout: 90_000 }, async () => {
      const opened = await visit(browser, '/?browse=folders&loc=local', viewport);
      const { page } = opened;
      try {
        const response = await page.request.get(new URL('/api/folders?loc=local', page.url()).toString());
        assert.equal(response.status(), 200);
        const tree = await response.json();
        const root = tree.roots[0];
        assert.ok(root, '演示库应有一个本地目录根');
        await page.locator('#catalogFolderHeader').getByRole('button', { name: root.name, exact: true }).click();
        await page.waitForFunction(key => new URLSearchParams(location.search).get('folder') === key, root.id);
        await page.locator('#grid [data-media-card]').first().waitFor();
        await page.getByRole('navigation', { name: '文件夹路径' }).getByText(root.name, { exact: true }).waitFor();
        await page.locator('[data-catalog-filter] [data-catalog-views]').waitFor();
        assert.ok(await page.locator('[data-catalog-filter] [data-entity-sorts]').isVisible());
        assert.equal(await page.locator('#grid [data-mix-card]').count(), 0);
        const screenshots = join('..', 'build', 'agent-verification', 'folders');
        mkdirSync(screenshots, { recursive: true });
        await page.screenshot({ path: join(screenshots, `${viewport.name}.png`), fullPage: false });
        if (viewport.mobile) {
          await page.getByRole('button', { name: '打开文件夹目录', exact: true }).click();
          const dialog = page.getByRole('dialog', { name: '文件夹目录', exact: true });
          await dialog.getByRole('treegrid', { name: '媒体目录' }).waitFor();
          await page.screenshot({ path: join(screenshots, 'mobile-tree.png'), fullPage: false });
          await dialog.getByRole('button', { name: '关闭文件夹目录' }).click();
        } else {
          await page.locator('#catalogFoldersTree').getByRole('treegrid', { name: '媒体目录' }).waitFor();
          for (const width of [1280, 1120]) {
            await page.setViewportSize({ width, height: 800 });
            await page.evaluate(async () => {
              window.scrollTo(0, 450);
              await new Promise(requestAnimationFrame);
              await new Promise(requestAnimationFrame);
            });
            const bounds = await page.evaluate(() => {
              const filter = document.querySelector('[data-catalog-frame]')!.getBoundingClientRect();
              const tree = document.getElementById('catalogFoldersTree')!.getBoundingClientRect();
              return { filterBottom: filter.bottom, treeTop: tree.top, treeBottom: tree.bottom, viewport: innerHeight };
            });
            await page.screenshot({ path: join(screenshots, `desktop-scrolled-${width}.png`), fullPage: false });
            assert.ok(bounds.treeTop >= bounds.filterBottom + 8, JSON.stringify(bounds));
            assert.ok(bounds.treeBottom <= bounds.viewport - 8, JSON.stringify(bounds));
          }
          await page.setViewportSize({ width: viewport.width, height: viewport.height });
          await page.evaluate(() => window.scrollTo(0, 0));
          const rootPage = await (await page.request.get(new URL(`/api/folders?loc=local&folder=${root.id}`, page.url()).toString())).json();
          const child = rootPage.children[0];
          if (child) {
            await page.locator('#catalogFoldersTree').getByRole('row', { name: child.name, exact: true }).click();
            await page.waitForFunction(key => new URLSearchParams(location.search).get('folder') === key, child.id);
            await page.goBack();
            await page.waitForFunction(key => new URLSearchParams(location.search).get('folder') === key, root.id);
          }
        }
        await page.getByRole('button', { name: '设置目录用途', exact: true }).click();
        const rule = page.getByRole('dialog', { name: '设置目录用途', exact: true });
        await rule.getByRole('button', { name: '预览影响', exact: true }).click();
        await rule.getByRole('region', { name: '目录用途影响范围' }).waitFor();
        await page.screenshot({ path: join(screenshots, `${viewport.name}-rule.png`), fullPage: false });
        await rule.getByRole('button', { name: '保存目录用途', exact: true }).click();
        await rule.waitFor({ state: 'hidden' });
        const saved = await (await page.request.get(new URL(`/api/folders?loc=local&folder=${root.id}`, page.url()).toString())).json();
        assert.equal(saved.rule.purpose, 'category');
        await page.getByRole('button', { name: '设置目录用途', exact: true }).click();
        await page.getByRole('dialog', { name: '设置目录用途', exact: true }).getByRole('button', { name: '移除规则', exact: true }).click();
        await page.getByRole('button', { name: '按住移除目录规则', exact: true }).press('Enter', { delay: 2100 });
        await page.getByRole('dialog', { name: '移除目录规则', exact: true }).waitFor({ state: 'hidden' });
        await page.getByRole('dialog', { name: '设置目录用途', exact: true }).waitFor({ state: 'hidden' });
        await settle(page);
        await page.getByRole('button', { name: '文件夹模式', exact: true }).click();
        await page.waitForFunction(() => !new URLSearchParams(location.search).has('browse'));
        assert.equal(await page.locator('#catalogFolderHeader').isVisible(), false);
        await page.goBack();
        await page.getByRole('navigation', { name: '文件夹路径' }).waitFor();
        assert.equal(new URL(page.url()).searchParams.get('folder'), root.id);
        await settle(page, '#catalogFolderHeader');
        const geometry = await layout(page);
        assert.ok(geometry.scrollWidth <= geometry.viewportWidth + 1, JSON.stringify(geometry));
        assert.deepEqual(opened.problems.filter(line => !line.includes('VIDEOJS')), []);
      } finally { await opened.close() }
    });
  }
});
