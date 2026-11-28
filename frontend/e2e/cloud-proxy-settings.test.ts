import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import type { Browser } from 'playwright-core';
import { CONFIGURATION_ROUTE, launch, layout, settle, visit, VIEWPORTS } from './harness.ts';

describe('CloudDrive 代理设置', () => {
  let browser: Browser;
  before(async () => { browser = await launch() });
  after(async () => { await browser?.close() });
  for (const viewport of VIEWPORTS) {
    it(`${viewport.name}：读取、保存、聚焦同步和冲突处理`, async () => {
      let account = { id: 'one', name: '示例网盘', cloud: '115open', path: '/drive1', revision: '1', writable: true,
        libraries: [{ name: '我的媒体库', root: 'A:\\Movies', location: '115' }],
        api: { mode: 'direct', host: '', port: 0, username: '', password_set: false },
        data: { mode: 'http', host: 'localhost', port: 7890, username: '', password_set: true } };
      const posts: Record<string, unknown>[] = [];
      let reads = 0;
      const opened = await visit(browser, '/settings/library', viewport, async page => {
        await page.route(CONFIGURATION_ROUTE, async route => {
          const data = await (await route.fetch()).json();
          await route.fulfill({ json: { ...data, media_sources: [{ location: '115', root: 'A:\\Movies', path: 'A:\\Movies', cost: 'metered' }] } });
        });
        await page.route('**/api/configuration/cloud-proxies', async route => {
          if (route.request().method() === 'GET') {
            reads++;
            return route.fulfill({ json: { accounts: [account] } });
          }
          const body = route.request().postDataJSON();
          posts.push(body);
          if (body.revision !== account.revision) return route.fulfill({ status: 409, json: { detail: 'CloudDrive2 配置已变化，请重新读取后保存' } });
          account = { ...account, ...body, revision: String(Number(account.revision) + 1) };
          return route.fulfill({ json: account });
        });
      });
      const { page } = opened;
      try {
        const section = page.getByRole('region', { name: 'CloudDrive 代理', exact: true });
        const form = section.getByRole('form', { name: '我的媒体库 代理', exact: true });
        const dataSelect = () => form.locator('button[aria-haspopup="listbox"]').first();
        await form.getByRole('textbox', { name: '数据代理端口', exact: true }).fill('7891');
        await form.getByRole('button', { name: '保存配置', exact: true }).click();
        await page.waitForFunction(() => [...document.querySelectorAll('form[aria-label="我的媒体库 代理"] button')].some(button => button.textContent === '保存配置' && (button as HTMLButtonElement).disabled));
        assert.equal(posts.length, 1);
        assert.equal((posts[0].data as { port: number }).port, 7891);
        assert.equal('api' in posts[0], false);
        assert.equal('password' in (posts[0].data as object), false);
        account = { ...account, revision: '3', data: { ...account.data, mode: 'system' } };
        await page.evaluate(() => window.dispatchEvent(new Event('focus')));
        await page.waitForFunction(() => document.querySelector('[aria-label="数据代理"]')?.textContent?.includes('跟随系统'));
        await dataSelect().scrollIntoViewIfNeeded();
        await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
        await dataSelect().click();
        await page.getByRole('option', { name: '直连', exact: true }).click();
        const before = reads;
        account = { ...account, revision: '4', data: { ...account.data, mode: 'socks5' } };
        await page.evaluate(() => window.dispatchEvent(new Event('focus')));
        await page.waitForTimeout(150);
        assert.equal(reads, before);
        assert.ok((await dataSelect().innerText()).includes('直连'));
        await form.getByRole('button', { name: '保存配置', exact: true }).click();
        await form.getByText('CloudDrive2 配置已变化，请重新读取后保存', { exact: true }).waitFor();
        await section.getByRole('button', { name: '重新读取', exact: true }).click();
        await page.waitForFunction(() => document.querySelector('[aria-label="数据代理"]')?.textContent?.includes('SOCKS5'));
        await settle(page);
        assert.deepEqual((await layout(page)).offenders, []);
        await section.screenshot({ path: `../build/cloud-proxy-${viewport.name}.png` });
        assert.deepEqual(opened.problems.filter(message => !message.includes('409')), []);
      } finally { await opened.close() }
    });
  }
  it('未填 CloudDrive2 地址时显示设置入口，不报错', async () => {
    const opened = await visit(browser, '/settings/library', VIEWPORTS[0], async page => {
      await page.route(CONFIGURATION_ROUTE, async route => {
        const data = await (await route.fetch()).json();
        await route.fulfill({ json: { ...data, media_sources: [{ location: '115', root: 'B:/', path: '', cost: 'metered' }] } });
      });
      await page.route('**/api/configuration/cloud-proxies', route =>
        route.fulfill({ json: { accounts: [], unlinked: [], configured: false } }));
    });
    const { page } = opened;
    try {
      const section = page.getByRole('region', { name: 'CloudDrive 代理', exact: true });
      await section.getByText('填写 CloudDrive2 地址和 API 令牌后，在这里设置各网盘账号的代理。').waitFor();
      assert.equal(await section.getByRole('link', { name: '下载设置', exact: true }).getAttribute('href'), '/settings/downloads');
      assert.equal(await section.getByText('没有读取配置').count(), 0);
      assert.equal(await section.getByText('还没有使用 CloudDrive 的媒体库。').count(), 0);
      assert.deepEqual(opened.problems, []);
    } finally { await opened.close() }
  });
});
