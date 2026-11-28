import assert from 'node:assert/strict';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { after, before, describe, it } from 'node:test';
import type { Browser } from 'playwright-core';
import { launch, layout, settle, VIEWPORTS, visit, withPageDiagnostics } from './harness.ts';
import { stubHomeDiscoveries } from './home-discoveries-fixture.ts';

describe('馆藏卡片与列表', () => {
  let browser: Browser;
  before(async () => { browser = await launch() });
  after(async () => { await browser?.close() });
  it('从首页新作上下方框选，勾与外框盖过封面，浮条不撑高横排', async () => {
    const releases = [87101, 87102].map(id => ({
      id, code: `DEMO-${id}`, title: `新作 ${id}`, has_cover: false, read: false, wanted: false,
    }));
    const writes: unknown[] = [];
    const opened = await visit(browser, '/', VIEWPORTS[0]!, async page => {
      await page.emulateMedia({ colorScheme: 'light' });
      await stubHomeDiscoveries(page, releases);
      await page.route('**/api/feeds/discovery', route => {
        writes.push(route.request().postDataJSON());
        return route.fulfill({ json: { ok: true, affected: 1 } });
      });
    });
    const { page } = opened;
    try {
      const cover = page.locator('#feedNew [data-feed-id="87102"]');
      await cover.waitFor();
      await page.locator('#grid [data-media-card][data-id]').first().waitFor();
      const nextContentGap = () => page.locator('#feedNew .feednewrow').evaluate(row =>
        document.querySelector('#grid')!.getBoundingClientRect().top - row.getBoundingClientRect().bottom);
      const initialGap = await nextContentGap();
      const mode = page.locator('#selectMode');
      await cover.locator('.feednewopen').click({ position: { x: 40, y: 40 }, modifiers: ['ControlOrMeta'] });
      await page.locator('#feedNew [data-feed-id="87102"][data-feed-selected]').waitFor();
      assert.equal(await mode.getAttribute('aria-pressed'), 'true');
      await mode.click();
      await page.locator('#feedNew [data-feed-selected]').waitFor({ state: 'detached' });
      await mode.click();
      await cover.evaluate(card => card.scrollIntoView({ block: 'center', inline: 'center' }));
      const box = (await cover.boundingBox())!;
      const hit = page.locator('#feedNew [data-feed-id="87102"][data-rectangle-hit]');
      const dragFrom = async (y: number) => {
        await page.mouse.move(box.x + 30, y);
        await page.mouse.down();
        await page.mouse.move(box.x + 75, box.y + 65);
        await hit.waitFor();
      };
      await dragFrom(box.y - 30);
      await page.keyboard.press('Escape');
      await page.mouse.up();
      await hit.waitFor({ state: 'detached' });
      assert.equal(await cover.getAttribute('data-feed-selected'), null);
      await dragFrom(box.y + box.height + 14);
      assert.equal(await cover.getAttribute('data-feed-selected'), null);
      await page.mouse.up();
      const dock = page.getByRole('group', { name: '所选新作操作' });
      await dock.waitFor();
      assert.equal(await nextContentGap(), initialGap);
      const visuals = await cover.evaluate(card => {
        const check = getComputedStyle(card.querySelector('[data-media-check]')!);
        const ring = getComputedStyle(card, '::after');
        const coverLayer = Number(getComputedStyle(card.querySelector('.pic')!).zIndex);
        const probe = document.createElement('span');
        probe.style.color = 'var(--ink)';
        card.append(probe);
        const ink = getComputedStyle(probe).color;
        probe.remove();
        return {
          checkVisible: check.display === 'grid' && Number(check.zIndex) > coverLayer,
          ringOutside: parseFloat(ring.top) < 0 && parseFloat(ring.borderTopWidth) > 0 && Number(ring.zIndex) > coverLayer,
          followsTheme: ring.borderTopColor === ink && check.backgroundColor === ink && check.color !== ink,
        };
      });
      assert.deepEqual(visuals, { checkVisible: true, ringOutside: true, followsTheme: true });
      await dock.getByRole('button', { name: '标为已看过' }).click();
      const confirmation = page.locator('dialog.ui-geist-modal');
      await confirmation.getByRole('button', { name: '标为已看过', exact: true }).click();
      await confirmation.waitFor({ state: 'detached' });
      await dock.waitFor({ state: 'hidden' });
      assert.deepEqual(writes, [{ action: 'read', ids: [87102] }]);
      await cover.locator('.feednewopen').focus();
      await page.keyboard.press('Space');
      await page.locator('#feedNew [data-feed-id="87102"][data-feed-selected]').waitFor();
      await dock.waitFor();
      const catalog = page.locator('#grid [data-media-grid] > [data-media-card][data-id]').first();
      const expected = await catalog.getAttribute('data-id');
      await page.locator(`#grid [data-media-card][data-id="${expected}"] [data-media-title]`).click();
      await page.locator(`#grid [data-media-card][data-id="${expected}"][data-selected]`).waitFor();
      await dock.waitFor({ state: 'hidden' });
      assert.equal(await cover.getAttribute('data-feed-selected'), null);
    } finally { await opened.close() }
  });

  it('封面、标题和网格旁都能开始框选，短按勾选单张，Escape 取消，Shift 追加', async () => {
    const opened = await visit(browser, '/', VIEWPORTS[0]!);
    const { page } = opened;
    try {
      const cards = page.locator('#grid [data-media-grid] > [data-media-card]');
      await cards.nth(1).waitFor();
      await page.locator('#selectMode').click();
      await cards.first().locator('[data-media-pic]').click({ position: { x: 24, y: 24 } });
      await cards.first().evaluate(card => card.scrollIntoView({ block: 'center' }));
      const move = async (start: '[data-media-pic]' | '[data-media-title]') => {
        const origin = (await cards.nth(1).locator(start).boundingBox())!;
        const x = origin.x + origin.width / 2, y = origin.y + origin.height / 2;
        await page.mouse.move(x, y);
        await page.mouse.down();
        await page.mouse.move(x + 24, y + 12, { steps: 4 });
        await page.locator('[data-card-selection-rectangle]').waitFor();
      };
      const selected = page.locator('#grid [data-media-card][data-selected]');
      await move('[data-media-pic]');
      assert.equal(await selected.count(), 1);
      const appearance = await cards.nth(1).evaluate(card => {
        const ring = getComputedStyle(card, '::after');
        const picture = getComputedStyle(card.querySelector('[data-media-pic]')!);
        const check = getComputedStyle(card.querySelector('[data-media-check]')!);
        const overlay = getComputedStyle(card.closest('[data-rectangle-area]')!.querySelector('[data-card-selection-rectangle]')!);
        const foreground = document.createElement('span');
        foreground.style.color = 'var(--color-accent-500)';
        card.append(foreground);
        const accent = getComputedStyle(foreground).color;
        foreground.remove();
        return {
          accent: overlay.borderTopColor === accent && ring.borderTopColor === accent,
          overPicture: Number(ring.zIndex) > Number(picture.zIndex) && parseFloat(ring.top) < 0 && ring.borderTopWidth === '2px',
          checkVisible: check.display === 'grid',
        };
      });
      assert.deepEqual(appearance, { accent: true, overPicture: true, checkVisible: true });
      await page.keyboard.press('Escape');
      await page.mouse.up();
      assert.equal(await page.locator('[data-card-selection-rectangle]').count(), 0);
      assert.equal(await selected.count(), 1);
      await page.keyboard.down('Shift');
      await move('[data-media-pic]');
      await page.mouse.up();
      await page.keyboard.up('Shift');
      await page.waitForFunction(() => document.querySelectorAll('#grid [data-media-card][data-selected]').length === 2);
      await move('[data-media-title]');
      await page.mouse.up();
      await page.waitForFunction(() => document.querySelectorAll('#grid [data-media-card][data-selected]').length === 1);
      assert.equal(await selected.first().getAttribute('data-id'), await cards.nth(1).getAttribute('data-id'));
      const first = (await cards.first().boundingBox())!;
      await page.mouse.move(first.x - 15, first.y + 24);
      await page.mouse.down();
      await page.mouse.move(first.x + 24, first.y + 48);
      await page.locator('[data-card-selection-rectangle]').waitFor();
      await page.mouse.up();
      await page.waitForFunction(() => {
        const card = document.querySelector('#grid [data-media-grid] > [data-media-card]');
        return card?.hasAttribute('data-selected');
      });
      assert.equal(await selected.count(), 1);
    } finally { await opened.close() }
  });

  it('触屏长按打开作品菜单，松手留在列表，滑动不打开菜单', async () => {
    const opened = await visit(browser, '/', VIEWPORTS.find(viewport => viewport.mobile)!);
    const { page } = opened;
    try {
      const card = page.locator('#grid [data-media-grid] > [data-media-card] [data-media-pic]').first();
      await card.scrollIntoViewIfNeeded();
      const box = (await card.boundingBox())!;
      const x = box.x + box.width / 2, y = box.y + box.height / 2;
      const session = await page.context().newCDPSession(page);
      const touch = (type: 'touchStart' | 'touchMove' | 'touchEnd', top = y) => session.send('Input.dispatchTouchEvent', {
        type, touchPoints: type === 'touchEnd' ? [] : [{ x, y: top }],
      });
      const menu = page.locator('[data-work-context-menu]');
      await touch('touchStart');
      await menu.waitFor();
      await touch('touchEnd');
      assert.equal(new URL(page.url()).pathname, '/');
      await page.touchscreen.tap(8, 48);
      await menu.waitFor({ state: 'hidden' });
      await touch('touchStart');
      await touch('touchMove', y - 28);
      await page.waitForTimeout(550);
      await touch('touchEnd');
      assert.equal(await menu.count(), 0);
    } finally { await opened.close() }
  });

  it('长列表的离屏标题仍可查找，键盘切换列并关闭弹层后回到触发按钮', async () => {
    const videos = Array.from({ length: 55 }, (_, index) => ({
      id: 99300 + index, name: `Catalog lookup ${index + 1}`, medium: 'video', duration: 90, has_thumb: true,
    }));
    const opened = await visit(browser, '/', VIEWPORTS[0]!, async page => {
      await page.addInitScript(() => localStorage.setItem('peach.catalog-view.v1', 'list'));
      await page.route('**/api/items?*', route => {
        const params = new URL(route.request().url()).searchParams;
        const limit = Number(params.get('limit')) || 20;
        const offset = Number(params.get('offset') || 0);
        return route.fulfill({ json: {
          items: videos.slice(offset, offset + limit), total: videos.length, has_more: offset + limit < videos.length,
        } });
      });
    });
    const { page } = opened;
    try {
      const columns = page.getByRole('button', { name: '显示列', exact: true });
      const operations = page.getByRole('columnheader', { name: '作品操作' });
      const divider = operations.locator('[data-table-column-divider]');
      await divider.waitFor();
      const line = await divider.evaluate(node => {
        const parent = node.closest('th')!;
        const rect = node.getBoundingClientRect();
        const header = parent.getBoundingClientRect();
        const handle = parent.previousElementSibling!.querySelector('.react-aria-ColumnResizer')!;
        return { width: rect.width, edge: header.right - rect.right,
          sameColor: getComputedStyle(node).backgroundColor === getComputedStyle(handle, '::after').backgroundColor };
      });
      assert.deepEqual(line, { width: 1, edge: 0, sameColor: true });
      const first = page.locator('[data-catalog-table] [data-catalog-row]').first();
      await first.evaluate(row => row.scrollIntoView({ block: 'center' }));
      const second = page.locator('[data-catalog-table] [data-catalog-row]').nth(1);
      const [start, end] = await Promise.all([first.boundingBox(), second.boundingBox()]);
      assert.ok(start && end);
      const mode = page.locator('#selectMode');
      assert.equal(await mode.getAttribute('aria-pressed'), 'false');
      await page.mouse.move(start.x + 20, start.y + 20);
      await page.mouse.down();
      await page.mouse.move(start.x + 38, end.y + 25, { steps: 4 });
      await page.locator('[data-card-selection-rectangle]').waitFor();
      await page.mouse.up();
      await page.waitForFunction(() => document.querySelector('#selectMode')?.getAttribute('aria-pressed') === 'true');
      assert.equal(await page.locator('[data-catalog-row][data-board-selected]').count(), 2);
      await mode.click();
      await page.waitForFunction(() => document.querySelector('#selectMode')?.getAttribute('aria-pressed') === 'false');
      assert.equal(await page.locator('[data-catalog-row][data-board-selected]').count(), 0);
      await columns.focus();
      await page.keyboard.press('ArrowRight');
      assert.equal(await page.getByRole('button', { name: '列布局', exact: true }).evaluate(node => node === document.activeElement), true);
      await page.keyboard.press('ArrowLeft');
      assert.equal(await columns.evaluate(node => node === document.activeElement), true);
      await page.keyboard.press('Enter');
      const dialog = page.getByRole('dialog', { name: '表格显示列' });
      await dialog.waitFor();
      const checkbox = dialog.getByRole('checkbox', { name: '媒体库', exact: true });
      await checkbox.focus();
      const before = await checkbox.isChecked();
      await page.keyboard.press('Space');
      await page.waitForFunction(({ input, checked }) => input instanceof HTMLInputElement
        && input.checked === checked, { input: await checkbox.elementHandle(), checked: !before }, { timeout: 5000 });
      await page.keyboard.press('Escape');
      await page.locator('[data-selection-placement]').waitFor({ state: 'detached' });
      await page.waitForFunction(() => document.activeElement?.getAttribute('aria-label') === '显示列');
      const pageSize = page.getByRole('button', { name: /每页显示数量/ });
      await withPageDiagnostics(page, '馆藏页大小切换', async () => {
        await pageSize.scrollIntoViewIfNeeded();
        await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
        await pageSize.click();
        await page.getByRole('option', { name: '每页 100 部', exact: true }).click({ timeout: 5000 });
      });
      const last = page.locator('[data-catalog-row][data-id="99354"]');
      await last.waitFor({ state: 'attached' });
      await page.evaluate(() => document.querySelector('[data-catalog-row]')?.scrollIntoView({ block: 'start' }));
      await page.locator('[data-catalog-row] [data-media-art]').first().waitFor({ state: 'attached' });
      assert.equal(await last.locator('[data-media-art]').count(), 0);
      const found = await page.evaluate(() => {
        const find = (window as Window & { find(value: string): boolean }).find;
        return find.call(window, 'Catalog lookup 55');
      });
      assert.equal(found, true);
      await last.locator('[data-media-art]').waitFor({ state: 'attached' });
    } finally { await opened.close() }
  });

  it('列筛选随视图切换，卡片可单独清除一项', { timeout: 60_000 }, async () => {
    const opened = await visit(browser, '/', VIEWPORTS[0]!);
    const { page } = opened;
    try {
      const videos = [1, 8].map((plays, index) => ({
        id: 99100 + index, name: `Sample ${index + 1}.mp4`, medium: 'video', duration: (index + 1) * 60, play_count: plays,
      }));
      await page.route('**/api/items?*', route => {
        const params = new URL(route.request().url()).searchParams;
        const filters = JSON.parse(params.get('column_filters') || '{}');
        const maxPlays = filters.plays?.range?.max;
        const maxDuration = filters.dur?.range?.max;
        const items = videos.filter(video => (maxPlays == null || video.play_count <= maxPlays)
          && (maxDuration == null || video.duration <= maxDuration));
        if (params.get('sort') === 'plays' && params.get('limit') === '1') {
          return route.fulfill({ json: { items: items.sort((left, right) => right.play_count - left.play_count).slice(0, 1) } });
        }
        return route.fulfill({ json: { items, total: items.length, has_more: false } });
      });
      const chooseView = (name: string) => page.getByRole('radiogroup', { name: '馆藏显示方式' })
        .locator('label').filter({ has: page.getByRole('radio', { name, exact: true }) }).click();
      const duration = page.locator('[data-sort-controls="catalog"] [data-entity-sort="dur"]');
      const limit = async (name: string, value: string, header = true) => {
        await withPageDiagnostics(page, `输入范围筛选 ${name}`, async () => {
          const trigger = header ? page.getByRole('button', { name, exact: true }) : duration;
          if (header) {
            const rows = page.getByRole('grid', { name: '作品列表' }).locator('tbody');
            await rows.locator('tr').first().focus();
            await rows.locator('tr[data-focused]').first().waitFor({ timeout: 5000 });
          }
          await trigger.scrollIntoViewIfNeeded();
          await settle(page);
          await trigger.focus();
          assert.equal(await trigger.evaluate(node => node === document.activeElement), true);
          await trigger.press('Space');
          const dialog = header ? page.getByRole('dialog', { name, exact: true }) : page.locator('[data-sort-direction-menu]');
          if (name === '筛选观看次数') {
            await dialog.locator('input[type="range"][aria-valuetext="不限"]').waitFor({ state: 'attached', timeout: 5000 });
          }
          await dialog.getByRole('textbox', { name: /^最大值/ }).fill(value);
          await dialog.getByRole('button', { name: '应用范围', exact: true }).click();
        });
      };
      await chooseView('列表');
      await limit('筛选观看次数', '3');
      await limit('筛选时长', '2');
      const rows = page.locator('#grid [data-catalog-row]');
      await page.waitForFunction(() => document.querySelectorAll('#grid [data-catalog-row]').length === 1);
      assert.equal(await rows.first().getAttribute('data-id'), '99100');
      await chooseView('卡片');
      const chips = page.getByRole('group', { name: '已启用的列筛选' });
      const removePlays = chips.getByRole('button', { name: /观看次数/ });
      const cards = page.locator('#grid [data-media-card]');
      await cards.first().waitFor();
      assert.deepEqual(await cards.evaluateAll(nodes => nodes.map(node => node.getAttribute('data-id'))), ['99100']);
      await chooseView('列表');
      await page.locator('[data-table-column-filter="plays"][data-filter-active]').waitFor();
      await chooseView('卡片');
      await removePlays.click();
      await page.waitForFunction(() => document.querySelectorAll('#grid [data-media-card]').length === 2);
      assert.equal(await removePlays.count(), 0);
      assert.equal(await chips.getByRole('button', { name: /时长/ }).count(), 1);
      await limit('时长', '1', false);
      await duration.click();
      await page.getByRole('dialog', { name: '时长', exact: true }).getByRole('button', { name: '升序', exact: true }).click();
      await page.waitForURL(url => url.searchParams.get('sort') === 'dur' && url.searchParams.get('dir') === 'asc');
      await chooseView('列表');
      await page.locator('[data-table-column-filter="dur"][data-filter-active]').waitFor();
      await page.waitForFunction(() => document.querySelectorAll('#grid [data-catalog-row]').length === 1);
      assert.equal(await rows.first().getAttribute('data-id'), '99100');
    } finally { await opened.close() }
  });
  for (const viewport of VIEWPORTS) it(`${viewport.name}：多选隐藏卡片悬浮操作，退出后恢复`, { timeout: 60000 }, async () => {
    const opened = await visit(browser, '/', viewport);
    const { page } = opened;
    try {
      await page.locator('#grid [data-media-card] [data-media-later]').first().waitFor({ state: 'attached' });
      await page.locator('#selectMode').click();
      await page.waitForFunction(() => document.querySelectorAll('#grid [data-media-card] [data-media-later]').length === 0);
      assert.equal(await page.locator('#grid [data-media-card] [data-media-seek]').count(), 0);
      assert.ok(await page.locator('#grid [data-media-check]').count() > 0);
      await page.locator('#selectMode').click();
      await page.locator('#grid [data-media-card] [data-media-later]').first().waitFor({ state: 'attached' });
      assert.deepEqual(opened.problems, []);
    } finally { await opened.close() }
  });
  for (const viewport of VIEWPORTS) {
    it(`${viewport.name} 显示切换、文件夹开关、详情与刷新保留列表`, { timeout: 90_000 }, async () => {
      const opened = await visit(browser, '/?browse=folders&loc=local', viewport);
      const { page } = opened;
      try {
        await page.locator('#grid [data-media-card]').first().waitFor({ state: 'visible' });
        const folder = page.getByRole('button', { name: '文件夹模式', exact: true });
        assert.equal(await folder.getAttribute('aria-pressed'), 'true');
        assert.equal(await folder.evaluate(node => !!node.closest('[data-entity-sorts]')), true);
        const choose = (name: string) => page.getByRole('radiogroup', { name: '馆藏显示方式' })
          .locator('label').filter({ has: page.getByRole('radio', { name, exact: true }) }).click();
        await choose('列表');
        await page.locator('[data-catalog-table] [data-catalog-row]').first().waitFor();
        await settle(page, '#grid');
        const count = await page.locator('#grid [data-catalog-row]').count();
        assert.ok(count > 0);
        const listedIds = await page.locator('#grid [data-catalog-row]').evaluateAll(rows => rows.map(row => row.getAttribute('data-id')).sort());
        assert.equal(await page.locator('#grid [data-mix-card]').count(), 0);
        const geometry = await page.locator('#grid [data-catalog-row]').first().evaluate(node => {
          const row = node.getBoundingClientRect();
          const picture = node.querySelector('[data-list-picture]')!.getBoundingClientRect();
          const title = node.querySelector('[data-list-name]')!.getBoundingClientRect();
          const people = node.querySelector('[data-list-people]');
          const cell = (selector: string) => node.querySelector(selector)?.closest('td')?.getBoundingClientRect().left ?? -1;
          return { width: row.width, height: row.height, pictureRight: picture.right, titleLeft: title.left,
            radius: getComputedStyle(node).borderBottomLeftRadius, identityAvatar: !!node.querySelector('[data-list-identity] [data-media-avatar]'),
            peopleAvatar: !!people?.querySelector('[data-media-avatar]'), nameCell: cell('[data-list-identity]'), peopleCell: cell('[data-list-people]') };
        });
        assert.ok(geometry.height <= 120 && geometry.width > geometry.height * 2, JSON.stringify(geometry));
        assert.ok(geometry.titleLeft > geometry.pictureRight, JSON.stringify(geometry));
        assert.equal(geometry.radius, '0px');
        assert.ok(!geometry.identityAvatar && geometry.peopleAvatar && geometry.peopleCell > geometry.nameCell,
          `头像与署名拆成作品列之后单独的艺人列：${JSON.stringify(geometry)}`);
        const screenshots = join('..', 'build', 'agent-verification', 'folders');
        mkdirSync(screenshots, { recursive: true });
        await page.screenshot({ path: join(screenshots, `${viewport.name}-list.png`), fullPage: false });
        await page.reload({ waitUntil: 'load' });
        await page.locator('[data-catalog-table] [data-catalog-row]').first().waitFor();
        assert.equal(await page.getByRole('radio', { name: '列表', exact: true }).isChecked(), true);
        const pageSize = page.getByRole('button', { name: /每页显示数量/ });
        await pageSize.scrollIntoViewIfNeeded();
        await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
        await pageSize.click();
        await page.getByRole('option', { name: '每页 10 部', exact: true }).click();
        await page.waitForFunction(() => document.querySelectorAll('[data-catalog-row]').length === 10);
        await page.getByRole('button', { name: '下一页', exact: true }).click();
        await page.waitForFunction(() => document.querySelectorAll('[data-catalog-row]').length === 2);
        await page.locator('#grid [data-list-open]').first().click();
        await page.waitForURL(/\/(?:assets|works)\//);
        await page.goBack();
        await page.locator('[data-catalog-table] [data-catalog-row]').first().waitFor();
        await page.waitForFunction(() => document.querySelectorAll('[data-catalog-row]').length === 2);
        assert.equal(await page.getByRole('button', { name: '第 2 页', exact: true }).getAttribute('aria-current'), 'page');
        await choose('卡片');
        await page.locator('[data-catalog-view-mode="cards"] [data-media-card]').first().waitFor();
        // 卡片首批只覆盖视口；列表的一页可能已经包含全部样本，先正常续载再比较同一集合。
        while (await page.locator('#grid [data-media-card]').count() < count) {
          const before = await page.locator('#grid [data-media-card]').count();
          if (!await page.locator('#grid [data-load-more]').count()) break;
          await page.evaluate(() => document.querySelector('#grid [data-load-more]')?.scrollIntoView());
          await page.waitForFunction(before => document.querySelectorAll('#grid [data-media-card]').length > before
            || !document.querySelector('#grid [data-load-more]'), before);
        }
        assert.equal(await page.locator('#grid [data-media-card]').count(), count);
        assert.deepEqual(await page.locator('#grid [data-media-card]').evaluateAll(cards => cards.map(card => card.getAttribute('data-id')).sort()),
          listedIds, '切换和刷新后卡片应展示列表中的同一批作品');
        if (viewport.mobile) {
          await page.evaluate(() => {
            document.documentElement.dataset.theme = 'dark';
            document.documentElement.classList.add('dark');
          });
          await page.screenshot({ path: join(screenshots, 'mobile-cards-dark.png'), fullPage: false });
        }
        const measured = await layout(page);
        assert.ok(measured.scrollWidth <= measured.viewportWidth + 1, JSON.stringify(measured));
        assert.deepEqual(opened.problems.filter(line => !line.includes('VIDEOJS')), []);
      } finally { await opened.close() }
    });
    it(`${viewport.name} 全集排序、每页数量与跨页选择`, { timeout: 90_000 }, async () => {
      const requests: URLSearchParams[] = [];
      const entries = Array.from({ length: 45 }, (_, index) => ({
        id: 9000 + index, name: `条目 ${String(index + 1).padStart(2, '0')}${index === 44 ? '超长文件名'.repeat(60) : ''}.mp4`,
        medium: 'video', location: 'local', duration: 45 - index, size: index * 1024,
      }));
      /* 导航前挂上：首屏网格的请求可能早于 load，挂晚了它会落到真实服务上。 */
      const opened = await visit(browser, '/?browse=folders&loc=local', viewport, page => page.route('**/api/items?*', route => {
        const params = new URL(route.request().url()).searchParams;
        requests.push(params);
        const direction = params.get('dir') === 'asc' ? 1 : -1;
        const sorted = [...entries].sort((a, b) => params.get('sort') === 'dur'
          ? direction * (a.duration - b.duration) : direction * a.name.localeCompare(b.name));
        const offset = Number(params.get('offset') || 0), limit = Number(params.get('limit') || 60);
        return route.fulfill({ json: { items: sorted.slice(offset, offset + limit), total: sorted.length } });
      }));
      const { page } = opened;
      try {
        await page.locator('#grid [data-media-card]').first().waitFor({ state: 'visible' });
        await page.getByRole('radiogroup', { name: '馆藏显示方式' }).locator('label')
          .filter({ has: page.getByRole('radio', { name: '列表', exact: true }) }).click();
        await withPageDiagnostics(page, '切到列表后第一页没有出现', () =>
          page.locator('[data-catalog-row][data-id="9044"]').waitFor());
        assert.equal(await page.locator('[data-catalog-row]').count(), 20);
        assert.equal(requests.at(-1)!.get('limit'), '20');
        assert.equal(requests.at(-1)!.get('loc'), 'local');
        assert.equal(requests.at(-1)!.get('browse'), 'folders');
        const expectTableTop = () => page.waitForFunction(() => {
          const header = document.querySelector('#grid [data-board-data-table] thead')?.getBoundingClientRect();
          const filter = document.querySelector('#catalogFilter [data-filter-frame]')?.getBoundingClientRect();
          const topBar = document.querySelector('header.top')?.getBoundingClientRect();
          return !!header && !!filter && !!topBar
            && header.top >= Math.max(topBar.bottom, filter.bottom) - 1
            && header.top <= topBar.bottom + filter.height + 32;
        });
        const first = page.locator('[data-catalog-row]').first();
        const firstId = await first.getAttribute('data-id');
        await page.locator('#selectMode').click();
        await first.locator('label').click();
        assert.equal(await first.getAttribute('data-board-selected'), 'true');
        await page.getByRole('button', { name: '下一页', exact: true }).click();
        await page.locator('[data-catalog-row][data-id="9024"]').waitFor();
        assert.equal(requests.at(-1)!.get('offset'), '20');
        await expectTableTop();
        await page.locator('[data-catalog-row]').first().locator('label').click();
        await page.getByRole('button', { name: '上一页', exact: true }).click();
        await page.locator(`[data-catalog-row][data-id="${firstId}"][data-board-selected]`).waitFor();
        await expectTableTop();
        await page.getByRole('button', { name: '第 2 页', exact: true }).click();
        await page.locator('[data-catalog-row][data-id="9024"][data-board-selected]').waitFor();
        await expectTableTop();
        const sortButton = page.getByRole('button', { name: /作品列表排序/ });
        await sortButton.scrollIntoViewIfNeeded();
        await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
         await withPageDiagnostics(page, '馆藏列表选择时长排序', async () => {
           await sortButton.press('ArrowDown');
           await Promise.all([
             page.waitForResponse(response => {
               const url = new URL(response.url());
               return url.pathname === '/api/items' && url.searchParams.get('sort') === 'dur' && url.searchParams.get('dir') === 'asc';
             }),
             page.getByRole('option', { name: '时长', exact: true }).click({ timeout: 5000 }),
           ]);
         });
        await page.locator('[data-catalog-row][data-id="9044"]').waitFor();
        await page.waitForFunction(() => document.querySelector('[data-catalog-row]')?.getAttribute('data-id') === '9044');
        assert.equal(requests.at(-1)!.get('sort'), 'dur');
        assert.equal(requests.at(-1)!.get('dir'), 'asc');
        assert.equal(requests.at(-1)!.get('offset'), '0');
        const pageSizeButton = page.getByRole('button', { name: /每页显示数量/ });
        await pageSizeButton.scrollIntoViewIfNeeded();
        await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
        await pageSizeButton.click();
        try { await page.getByRole('option', { name: '每页 10 部', exact: true }).click({ timeout: 5000 }) }
        catch (error) {
          console.info('分页菜单', await pageSizeButton.getAttribute('aria-expanded'),
            await page.locator('[role="option"]').allTextContents(), await pageSizeButton.boundingBox());
          await page.screenshot({ path: `../build/agent-verification/pagination-menu-${viewport.name}.png` });
          throw error;
        }
        await page.waitForFunction(() => document.querySelectorAll('[data-catalog-row]').length === 10);
        assert.equal(requests.at(-1)!.get('limit'), '10');
        if (!viewport.mobile) {
          const namedResponse = page.waitForResponse(response => {
            const url = new URL(response.url());
            return url.pathname === '/api/items' && url.searchParams.get('sort') === 'name';
          });
          await page.locator('[data-catalog-table] th[data-key="name"]').click();
          await namedResponse;
          await page.waitForFunction(() => document.querySelector('[data-catalog-row]')?.getAttribute('data-id') === '9000');
          assert.equal(requests.at(-1)!.get('dir'), 'asc');
        }
        const durationSort = page.locator('[data-entity-sort="dur"]');
        await durationSort.scrollIntoViewIfNeeded();
        const durationResponse = page.waitForResponse(response => {
          const url = new URL(response.url());
          return url.pathname === '/api/items' && url.searchParams.get('sort') === 'dur' && url.searchParams.get('dir') === 'desc';
        });
        await durationSort.click();
        await page.locator('[data-sort-direction-menu] [data-filter-option="desc"]').click();
        await durationResponse;
        await page.waitForFunction(() => document.querySelector('[data-catalog-row]')?.getAttribute('data-id') === '9000');
        assert.equal(await durationSort.getAttribute('aria-pressed'), 'true');
        assert.equal(requests.at(-1)!.get('offset'), '0');
        const measured = await layout(page);
        assert.ok(measured.scrollWidth <= measured.viewportWidth + 1, JSON.stringify(measured));
        assert.deepEqual(opened.problems.filter(line => !line.includes('VIDEOJS')), []);
      } finally { await opened.close() }
    });
  }
});
