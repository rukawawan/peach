import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import type { Browser, Page } from 'playwright-core';
import { configurationBody, expectBody, launch, layout, settle, visit, VIEWPORTS } from './harness.ts';

const measure = (page: Page, names = ['媒体库与目录']) => page.locator('.ui-configpage').evaluate((root, names) => {
  const rect = (el: Element) => {
    const r = el.getBoundingClientRect();
    return { x: r.x, y: r.y, width: r.width, height: r.height };
  };
  const sections = names.map(name => root.querySelector(`[aria-label="${name}"]`)!);
  return {
    nav: rect(root.querySelector('.ui-board-local-nav')!),
    selected: root.querySelector('.ui-board-local-nav [aria-selected="true"]')?.textContent,
    sections: sections.map(section => ({
      label: rect(section.firstElementChild!),
      card: rect(section.lastElementChild!),
      // 保存键在卡片页脚，取分区里最后一个按钮：Select 的触发器也是 button。
      save: rect([...section.querySelectorAll('button')].at(-1)!),
    })),
  };
}, names);

async function openEditableConfiguration(browser: Browser, viewport: (typeof VIEWPORTS)[number]) {
  const opened = await visit(browser, '/', viewport);
  try {
    // 每例在导航前读取真实配置快照，页面等待与接管由响应门闩控制。
    const response = await opened.page.request.get(new URL('/api/configuration', opened.page.url()).href);
    assert.equal(response.status(), 200);
    const configuration = await response.json();
    await opened.page.route('**/api/configuration', async route => {
      if (route.request().method() !== 'GET') return route.continue();
      await route.fulfill({ json: { ...configuration, editable: true } });
    });
    await opened.page.goto(new URL('/settings/library', opened.page.url()).href, { waitUntil: 'load' });
    return { ...opened, configuration };
  } catch (error) {
    await opened.close();
    throw error;
  }
}

describe('配置页等待态', () => {
  let browser: Browser;
  before(async () => { browser = await launch() });
  after(async () => { await browser?.close() });
  for (const viewport of VIEWPORTS) {
    it(`${viewport.name} 的分类导航适配方向并保留未保存输入`, { timeout: 60_000 }, async () => {
      const opened = await openEditableConfiguration(browser, viewport);
      try {
        const { page } = opened;
        await expectBody(page, '/settings/library', configurationBody(page));
        await settle(page);
        const nav = page.getByRole('tablist', { name: '配置分区' });
        assert.equal(await nav.getAttribute('aria-orientation'), viewport.mobile ? 'horizontal' : 'vertical');
        const geometry = await measure(page);
        assert.ok(viewport.mobile
          ? geometry.nav.y + geometry.nav.height <= geometry.sections[0].label.y
          : geometry.nav.x + geometry.nav.width <= geometry.sections[0].label.x);
        await nav.getByRole('tab', { name: '来源与订阅', exact: true }).click();
        // 切到别的页签后这一栏所在的面板隐藏，值仍要留在原处。
        const input = page.getByRole('textbox', { name: 'JavDB 地址', exact: true, includeHidden: true });
        await input.fill('example.invalid');
        const general = nav.getByRole('tab', { name: '媒体库与入库', exact: true });
        await general.click();
        await page.keyboard.press('ArrowRight');
        assert.equal(await nav.getByRole('tab', { name: '来源与订阅', exact: true }).getAttribute('aria-selected'), 'true');
        await page.keyboard.press('End');
        assert.equal(await nav.getByRole('tab', { name: '系统诊断' }).getAttribute('aria-selected'), 'true');
        await page.keyboard.press('Home');
        assert.equal(await input.inputValue(), 'example.invalid');
        const bounds = await layout(page);
        assert.ok(bounds.scrollWidth <= bounds.viewportWidth);
        assert.deepEqual(bounds.offenders, []);
        await page.setViewportSize({ width: viewport.mobile ? 1280 : 390, height: 844 });
        await page.waitForFunction(expected => document.querySelector('[role="tablist"][aria-label="配置分区"]')?.getAttribute('aria-orientation') === expected,
          viewport.mobile ? 'vertical' : 'horizontal');
        assert.equal(await general.getAttribute('aria-selected'), 'true');
        assert.equal(await input.inputValue(), 'example.invalid');
        assert.deepEqual(opened.problems, []);
      } finally { await opened.close() }
    });
    it(`${viewport.name} 的分类导航与媒体标题在接管时保持位置`, { timeout: 60_000 }, async () => {
      const opened = await openEditableConfiguration(browser, viewport);
      let release = () => {};
      try {
        await expectBody(opened.page, '/settings/library', configurationBody(opened.page));
        await settle(opened.page);
        const pending = new Promise<void>(resolve => { release = resolve });
        await opened.page.route('**/api/configuration', async route => {
          if (route.request().method() !== 'GET') return route.continue();
          await pending;
          await route.fulfill({ json: { ...opened.configuration, editable: true, startup: {
            available: true, enabled: true, silent: true, desktop: true, desktop_message: '', message: '',
          }, automatic_updates: { mode: 'check', interval_hours: 24, available: true, download_available: false } } });
        });
        await opened.page.reload({ waitUntil: 'load' });
        await opened.page.locator('[data-skeleton="board/settings/library"]').waitFor();
        const skeleton = await measure(opened.page);
        const waitingLayout = await layout(opened.page);
        release();
        await expectBody(opened.page, '/settings/library', configurationBody(opened.page));
        await settle(opened.page);
        const live = await measure(opened.page);
        assert.equal(skeleton.selected, live.selected);
        const pairs = [[skeleton.nav, live.nav], ...skeleton.sections.map((section, i) =>
          [section.label, live.sections[i].label])];
        for (const [a, b] of pairs) for (const key of ['x', 'y', 'width', 'height'] as const) {
          assert.ok(Math.abs(a[key] - b[key]) <= 1, `${key}: skeleton=${a[key]}, content=${b[key]}`);
        }
        assert.ok(waitingLayout.scrollWidth <= waitingLayout.viewportWidth);
        assert.deepEqual(waitingLayout.offenders, []);
        assert.deepEqual(opened.problems, []);
      } finally {
        release();
        await opened.close();
      }
    });
  }
  /* 来源与订阅有四块另取数据的分区：整页骨架、分区骨架与读回后的终态画的是同一套结构，来源凭据的
     站点行取自静态登记，行数与终态一致。各块的位置与高度允许细小出入，不允许超过一行（40px）的位移。
     本机没有记录（冷启动）与正常再开两种都测：随配置变化的部分在冷启动时按最小结构画。 */
  for (const cold of [true, false]) it(`来源与订阅的整页骨架、分区骨架与读回的分区结构一致、位移不超过一行（${cold ? '本机没有记录' : '再次打开'}）`, { timeout: 90_000 }, async () => {
    const opened = await visit(browser, '/settings/subscriptions', VIEWPORTS[0]);
    let release = () => {};
    let mount = () => {};
    try {
      const { page } = opened;
      const names = ['来源凭据', '关注采集', '资源搜索', '作品资料站点'];
      /* 骨架淡出时新旧两份 `.ui-configpage` 可能同时在：取最后挂上的那一份。 */
      const sections = () => page.locator('.ui-configpage').last().evaluate((root, names) => names.map((name) => {
        const section = root.querySelector(`[aria-label="${name}"]`);
        if (!section) return null;
        const r = section.getBoundingClientRect();
        return { name, y: r.y, height: r.height, sites: section.querySelectorAll('b').length };
      }), names);
      const done = () => page.waitForFunction(() => document.querySelector('.ui-configpage section[aria-label="来源凭据"]')
        && !document.querySelector('.ui-configpage [data-skeleton]'), null, { timeout: 30_000 });
      await done();
      await settle(page);
      if (cold) await page.evaluate(() => localStorage.removeItem('peach.configuration.shape.v1'));
      /* 两道门：配置读回之前是整页骨架；配置放行、分区自己的数据还压着时是分区骨架。 */
      const configuration = new Promise<void>((resolve) => { mount = resolve });
      const held = new Promise<void>((resolve) => { release = resolve });
      await page.route('**/api/configuration', async (route) => { await configuration; await route.continue() });
      for (const url of ['**/api/follow/credentials', '**/api/configuration/indexers', '**/api/follow/schedule', '**/api/feeds/schedule']) {
        await page.route(url, async (route) => { await held; await route.continue() });
      }
      await page.reload({ waitUntil: 'commit' });
      await page.locator('[data-skeleton="board/settings/subscriptions"]').waitFor();
      const pageSkeleton = await sections();
      mount();
      await page.getByLabel('正在读取来源凭据', { exact: true }).waitFor();
      const sectionSkeleton = await sections();
      release();
      await done();
      await settle(page);
      const live = await sections();
      for (const [phase, shape] of [['整页骨架', pageSkeleton], ['分区骨架', sectionSkeleton]] as const) {
        shape.forEach((section, i) => {
          const end = live[i]!;
          assert.ok(section && Math.abs(section.y - end.y) <= 40 && Math.abs(section.height - end.height) <= 40,
            `${phase}「${names[i]}」${JSON.stringify(section)}，读回后 ${JSON.stringify(end)}`);
        });
        assert.equal(shape[0]!.sites, live[0]!.sites, `${phase}的来源凭据站点行数`);
      }
      assert.deepEqual(opened.problems, []);
    } finally {
      mount();
      release();
      await opened.close();
    }
  });
  for (const path of ['/settings/library', '/review']) {
    it(`${path} 的明暗主题使用透明容器与灰色 Pills 选中底色`, { timeout: 60_000 }, async () => {
      const opened = await visit(browser, path, VIEWPORTS[0]);
      try {
        const { page } = opened;
        const nav = page.locator('#stats [data-section-nav]:not([data-skeleton] *)');
        await nav.locator('[aria-selected=true]').waitFor();
        await settle(page);
        if (path === '/review') {
          assert.equal(await nav.getByRole('heading', { name: '复核分类' }).count(), 1);
          assert.equal(await nav.getByRole('tablist').getAttribute('aria-orientation'), 'vertical');
        }
        for (const dark of [false, true]) {
          await page.evaluate(dark => {
            document.documentElement.dataset.theme = dark ? 'dark' : 'light';
            document.documentElement.classList.toggle('dark', dark);
          }, dark);
          const colors = await nav.evaluate(node => {
            const selected = getComputedStyle(node.querySelector('[aria-selected=true]')!);
            const selection = getComputedStyle(node.querySelector('[data-pill-thumb]')!);
            const inactive = getComputedStyle(node.querySelector('[aria-selected=false]')!);
            return {
              surface: getComputedStyle(node).backgroundColor,
              selected: selection.backgroundColor,
              border: selected.borderWidth,
              radius: selection.borderRadius,
              text: selected.color,
              inactive: inactive.color,
              inactiveBackground: inactive.backgroundColor,
            };
          });
          assert.equal(colors.surface, 'rgba(0, 0, 0, 0)');
          assert.notEqual(colors.selected, 'rgba(0, 0, 0, 0)');
          assert.equal(colors.border, '0px');
          assert.notEqual(colors.radius, '0px');
          assert.notEqual(colors.text, colors.inactive);
          assert.equal(colors.inactiveBackground, 'rgba(0, 0, 0, 0)');
        }
        assert.deepEqual(opened.problems, []);
      } finally { await opened.close() }
    });
  }
});
