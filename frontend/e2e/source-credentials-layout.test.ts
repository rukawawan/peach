import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import type { Browser } from 'playwright-core';
import { launch, layout, settle, visit, VIEWPORTS } from './harness.ts';

describe('来源链接与凭据布局', () => {
  let browser: Browser;
  before(async () => { browser = await launch(); });
  after(async () => { await browser?.close(); });
  for (const viewport of VIEWPORTS) {
    it(`目录只列分类，站点深链展开表单且保留草稿（${viewport.name}）`, { timeout: 60_000 }, async () => {
      const opened = await visit(browser, '/sources', viewport);
      const { page } = opened;
      try {
        const nav = page.getByRole('navigation', { name: '本页目录', exact: true });
        await nav.waitFor();
        await settle(page);
        const anchors = await nav.locator('a').evaluateAll(links => links.map(link => link.getAttribute('href')));
        assert.deepEqual(anchors, ['#source-group-western', '#source-group-japanese', '#source-group-fc2',
          '#source-group-people', '#source-group-resources', '#source-tools']);
        const headingSizes = await page.evaluate(() => {
          const size = (selector: string) => parseFloat(getComputedStyle(document.querySelector(selector)!).fontSize);
          return { western: size('#source-group-western > h3'), tools: size('#source-tools > h3'),
            check: size('#check-all > p') };
        });
        assert.equal(headingSizes.western, headingSizes.tools);
        assert.ok(headingSizes.tools > headingSizes.check, JSON.stringify(headingSizes));
        const western = page.getByRole('region', { name: '欧美影视', exact: true });
        const stash = western.locator('#source-stashdb summary');
        assert.equal(await stash.getAttribute('aria-expanded'), 'false');
        await stash.scrollIntoViewIfNeeded();
        await page.waitForFunction(() =>
          Boolean(document.querySelector<HTMLImageElement>('#source-stashdb summary img')?.naturalWidth));
        const code = page.getByRole('textbox', { name: '馆藏番号', exact: true });
        await code.fill('DEMO-001');
        await nav.locator('a[href="#source-group-japanese"]').focus();
        await page.keyboard.press('Enter');
        await page.waitForFunction(() => {
          const target = document.getElementById('source-group-japanese')!;
          const offset = parseFloat(getComputedStyle(target).scrollMarginTop)
            + parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop);
          return Math.abs(target.getBoundingClientRect().top - offset) <= 2
            && document.querySelector('[data-section-toc] [aria-current]')?.getAttribute('href') === '#source-group-japanese';
        });
        assert.equal(await code.inputValue(), 'DEMO-001');
        await page.evaluate(() => { location.hash = '#source-javdb' });
        await page.waitForFunction(() => document.querySelector<HTMLDetailsElement>('#source-javdb details')?.open);
        assert.equal(await page.locator('#source-javdb summary').getAttribute('aria-expanded'), 'true');
        assert.ok(await page.locator('#source-dmm summary').isVisible(), '跳转后其余来源入口被隐藏');
        assert.equal(await page.locator('#source-dmm summary').getAttribute('aria-expanded'), 'false');
        if (viewport.mobile) {
          await page.waitForFunction(() => {
            const summary = document.querySelector('#source-javdb summary')!;
            const toc = document.querySelector('[data-section-toc]')!;
            return summary.getBoundingClientRect().top >= toc.getBoundingClientRect().bottom;
          });
          await nav.evaluate(node => { node.scrollLeft = 0 });
          const before = await page.evaluate(() => scrollY);
          await nav.hover();
          await page.mouse.wheel(0, 5000);
          await page.waitForFunction(() => {
            const node = document.querySelector('[data-section-toc]')!;
            return node.scrollWidth - node.clientWidth - node.scrollLeft <= 2;
          });
          assert.equal(await page.evaluate(() => scrollY), before, '目录滚轮带动了正文');
          await page.mouse.wheel(0, -5000);
          await page.waitForFunction(() => document.querySelector('[data-section-toc]')!.scrollLeft <= 2);
          assert.equal(await page.evaluate(() => scrollY), before, '反向目录滚轮带动了正文');
        }
        await page.evaluate(() => { location.hash = '#source-sukebei' });
        await page.locator('#source-sukebei details[open]').waitFor();
        await page.locator('#source-manko summary').click();
        await page.locator('#source-manko details[open]').waitFor();
        const cards = await page.evaluate(() => {
          const first = document.querySelector('#source-manko > div')!;
          const second = document.querySelector('#source-sukebei > div')!;
          const bottom = (node: Element) => getComputedStyle(node).borderBottomLeftRadius;
          const corners = [first, second].map(card => ({
            card: bottom(card), footer: bottom(card.querySelector('form > div:last-child')!),
          }));
          return { gap: second.getBoundingClientRect().top - first.getBoundingClientRect().bottom, corners };
        });
        assert.ok(cards.gap > 0);
        for (const { card, footer } of cards.corners) {
          assert.ok(parseFloat(card) > 0);
          assert.equal(footer, card);
        }
        const dimensions = await layout(page);
        assert.ok(dimensions.scrollWidth <= dimensions.viewportWidth + 1, JSON.stringify(dimensions));
        assert.deepEqual(opened.problems, []);
      } finally { await opened.close(); }
    });
    it(`自定义来源可试查、保存且表单无横向溢出（${viewport.name}）`, { timeout: 60_000 }, async () => {
      const opened = await visit(browser, '/sources', viewport);
      const page = opened.page;
      const items: unknown[] = [];
      await page.route('**/api/custom-metadata', async route => {
        const body = route.request().method() === 'POST' ? route.request().postDataJSON() : null;
        if (body?.action === 'preview') {
          assert.equal(body.code, 'DEMO-001');
          await route.fulfill({ json: { record: { code: 'DEMO-001', title: '接口试查结果' } } });
          return;
        }
        if (body) items.push({ ...body, id: 'custom-demo' });
        await route.fulfill({ json: { items } });
      });
      try {
        await page.reload();
        const region = page.getByRole('region', { name: '自定义元数据来源', exact: true });
        const add = region.getByRole('button', { name: '添加来源', exact: true });
        const assertClosedCard = async () => {
          await add.waitFor(); await settle(page);
          const geometry = await add.evaluate(button => {
            const row = button.parentElement!;
            const card = button.closest('section')!.lastElementChild!;
            return { divider: parseFloat(getComputedStyle(row).borderTopWidth),
              radius: parseFloat(getComputedStyle(card).borderTopLeftRadius),
              top: button.getBoundingClientRect().top - card.getBoundingClientRect().top };
          });
          assert.equal(geometry.divider, 0, JSON.stringify(geometry));
          assert.ok(geometry.radius > 0 && geometry.top >= 12 && geometry.top <= 18, JSON.stringify(geometry));
        };
        await assertClosedCard();
        await page.getByRole('button', { name: '添加来源', exact: true }).click();
        const form = page.getByRole('form', { name: '元数据来源配置', exact: true });
        await form.getByRole('button', { name: '取消', exact: true }).click();
        await form.waitFor({ state: 'detached' });
        await assertClosedCard();
        await region.screenshot({ path: `../build/agent-verification/browser/custom-source-closed-${viewport.name}.png` });
        await add.click();
        const editorGeometry = await region.evaluate(node => {
          const card = node.lastElementChild!.getBoundingClientRect();
          const input = node.querySelector('form label')!.getBoundingClientRect();
          const form = node.querySelector('form')!.getBoundingClientRect();
          const footer = node.querySelector('form button[type="submit"]')!.parentElement!.getBoundingClientRect();
          return { top: input.top - card.top, left: footer.left - card.left, right: card.right - footer.right, bottom: form.bottom - footer.bottom };
        });
        assert.ok(editorGeometry.top >= 14 && editorGeometry.top <= 18, JSON.stringify(editorGeometry));
        assert.ok(Math.abs(editorGeometry.left) <= 1 && Math.abs(editorGeometry.right) <= 1 && Math.abs(editorGeometry.bottom) <= 1, JSON.stringify(editorGeometry));
        await form.getByRole('textbox', { name: '来源名称', exact: true }).fill('公开演示元数据');
        await form.getByRole('textbox', { name: 'JSON 接口地址', exact: true }).fill('https://example.com/api/{code}');
        const code = form.getByRole('textbox', { name: '试查番号（回车查询）', exact: true });
        await code.fill('DEMO-001');
        await code.press('Enter');
        await form.locator('pre').filter({ hasText: '接口试查结果' }).waitFor();
        const dimensions = await layout(page);
        assert.ok(dimensions.scrollWidth <= dimensions.viewportWidth + 1, JSON.stringify(dimensions));
        assert.deepEqual(dimensions.offenders, []);
        await page.getByRole('region', { name: '自定义元数据来源', exact: true }).screenshot({
          path: `../build/agent-verification/browser/custom-source-${viewport.name}.png`,
        });
        await form.getByRole('button', { name: '保存来源', exact: true }).click();
        await form.waitFor({ state: 'detached' });
        const savedSource = region.getByText('公开演示元数据', { exact: true }).locator('..');
        await savedSource.locator('[data-status-tone="neutral"]').filter({ hasText: '已停用' }).waitFor();
        assert.equal(items.length, 1);
        assert.equal(await add.evaluate(button => parseFloat(getComputedStyle(button.parentElement!).borderTopWidth)), 1);
        assert.deepEqual(opened.problems, []);
      } finally { await opened.close(); }
    });
    it(`GitHub 标识、网址和外链箭头居中对齐（${viewport.name}）`, async () => {
      const opened = await visit(browser, '/sources', viewport);
      try {
        await opened.page.route('**/api/scraping/amane-bridge', route => route.fulfill({ json: {
          installed: true, installed_version: '0.17.0', version: '0.17.0',
          repository: 'https://github.com/sgzw-x/amane', license: 'GPL-3.0', sites: [], job: { status: 'idle' },
        } }));
        await opened.page.reload();
        const link = opened.page.locator('section[aria-label="amane"] a');
        await link.waitFor(); await settle(opened.page);
        const positions = await link.evaluate(node => {
          const boxes = [node.querySelector('img')!, node.querySelector('span')!, node.querySelector('svg')!].map(el => {
            const r = el.getBoundingClientRect(); return { center: r.y + r.height / 2, width: r.width };
          });
          return boxes;
        });
        assert.equal(positions.length, 3);
        assert.ok(positions.every(p => p.width > 0));
        assert.ok(Math.max(...positions.map(p => p.center)) - Math.min(...positions.map(p => p.center)) <= 1);
        const dimensions = await layout(opened.page);
        assert.ok(dimensions.scrollWidth <= dimensions.viewportWidth);
      } finally { await opened.close(); }
    });
    it(`凭据的每个输入字段占满正文宽度（${viewport.name}）`, async () => {
      const opened = await visit(browser, '/settings/library?section='+encodeURIComponent('来源与订阅'), viewport);
      try {
        await opened.page.route('**/api/follow/credentials', route => route.fulfill({ json: {
          root: '', providers: [{ provider: 'simpcity', provider_label: 'SimpCity', followable: true,
            requirement: 'required', needs: ['cookie', 'user_agent'], fields: [], missing: ['cookie', 'user_agent'], why: '来源登录说明' }],
        } }));
        await opened.page.reload();
        const field = opened.page.getByLabel('cookie', { exact: true });
        await field.waitFor(); await settle(opened.page);
        const labels = await opened.page.evaluate(() => ['来源凭据', '作品资料站点'].map(name => {
          const section = document.querySelector(`[aria-label="${name}"]`)!;
          const label = section.querySelector('p')!;
          return { x: label.getBoundingClientRect().x, size: getComputedStyle(label).fontSize, weight: getComputedStyle(label).fontWeight };
        }));
        assert.deepEqual(labels[0], labels[1], '配置分区标题对齐且使用相同排版');
        for (const name of ['cookie', 'user_agent']) {
          const geometry = await opened.page.getByLabel(name, { exact: true }).evaluate(node => {
            const wrapper = node.closest('[data-input-size]')!;
            return { width: wrapper.getBoundingClientRect().width, available: wrapper.parentElement!.getBoundingClientRect().width };
          });
          assert.ok(Math.abs(geometry.width - geometry.available) <= 1, JSON.stringify(geometry));
        }
        const dimensions = await layout(opened.page);
        assert.ok(dimensions.scrollWidth <= dimensions.viewportWidth);
      } finally { await opened.close(); }
    });
  }
});
