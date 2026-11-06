/* 首页那一行新作（`feed-new` 岛）：卡上两颗键、收完整块藏起、换筛选保留、合集开关改了重取。
 *
 * 骨架与它在哪些页面上出现在 `home-loading.test.ts`、`smoke.test.ts`；封面取景在 `feed-cover.test.ts`；
 * 资料页那一行与它同一个组件，取数与「刚订上等那一轮跑完再重取」在 `test/react/entity-page.test.tsx`。 */
import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';

import type { Browser, Page } from 'playwright-core';

import { expectBody, launch, settle, visit, VIEWPORTS, type Visit } from './harness.ts';
import { openPanel, stubServer, type Server } from './settings-fixture.ts';

const DESKTOP = VIEWPORTS.find((viewport) => !viewport.mobile)!;

const item = (id: number) => ({
  id, code: `EXM-${String(id).padStart(3, '0')}`, title: `示例新作 ${id}`, link: null, cover_url: null,
  has_cover: false, cover_frame: null, poster_box: null, release_date: '2026-09-30',
  studio: null, performers: null, read: false, ignored: false, scrape_error: null,
});

interface Feed { reads: string[]; writes: Record<string, unknown>[]; items: number[] }

/** 发现列表与两颗键的写接口各给一份桩；首页挂上桩之后重载一次，从第一趟取数起就接住。 */
async function openHome(browser: Browser): Promise<Visit & { feed: Feed; server: Server }> {
  const opened = await visit(browser, '/', DESKTOP);
  const { page } = opened;
  const feed: Feed = { reads: [], writes: [], items: [1, 2] };
  await page.route(/\/api\/feeds\/discoveries\?/, (route) => {
    feed.reads.push(new URL(route.request().url()).search);
    return route.fulfill({ json: { ok: true, more: false, items: feed.items.map(item) } });
  });
  await page.route((url) => url.pathname === '/api/feeds/discovery', (route) => {
    feed.writes.push(JSON.parse(route.request().postData() || '{}'));
    return route.fulfill({ json: { ok: true } });
  });
  const server = await stubServer(page);
  await page.reload({ waitUntil: 'load' });
  await expectBody(page, '/', [page.locator('#feedNew [data-feed-id="2"]')]);
  await settle(page);
  return { ...opened, feed, server };
}

/** 卡上那两颗键藏在悬停工具里：先移上去再点。 */
async function press(page: Page, id: number, action: string): Promise<void> {
  const card = page.locator(`#feedNew [data-feed-id="${id}"]`);
  await card.hover();
  await card.locator(`[data-feed-action="${action}"]`).click();
}

async function until(page: Page, condition: () => boolean, message: string): Promise<void> {
  for (let tries = 0; tries < 100 && !condition(); tries += 1) await page.waitForTimeout(50);
  assert.ok(condition(), message);
}

describe('首页新作那一行', () => {
  let browser: Browser;
  before(async () => { browser = await launch() });
  after(async () => { await browser?.close() });

  it('标为已看过留在原位变淡，不想看当场消失，收完整块藏起；请求体只带这一条', { timeout: 60_000 }, async () => {
    const opened = await openHome(browser);
    const { page, feed } = opened;
    try {
      // 进页那几步里目录可能连画两遍（设置、片库名单晚到），每一遍都可能重取一趟；只量取的是哪一份。
      assert.ok(feed.reads.length >= 1, '首页那一行没有取数');
      assert.deepEqual(new Set(feed.reads), new Set(['?limit=12']), '首页那一行不分人，只带条数');
      await press(page, 2, 'read');
      await page.locator('#feedNew [data-feed-id="2"].isread').waitFor({ timeout: 5_000 });
      await press(page, 1, 'ignore');
      await page.locator('#feedNew [data-feed-id="1"]').waitFor({ state: 'detached', timeout: 5_000 });
      assert.equal(await page.locator('#feedNew').isHidden(), false, '还剩一张就不该藏起');
      assert.deepEqual(feed.writes, [{ action: 'read', ids: [2] }, { action: 'ignore', ids: [1] }]);
      await press(page, 2, 'ignore');
      await page.locator('#feedNew').waitFor({ state: 'hidden', timeout: 5_000 });
      assert.equal(await page.locator('#feedNew [data-feed-id]').count(), 0);
      assert.deepEqual(opened.problems, []);
    } finally {
      await opened.close();
    }
  });

  it('在目录页里换筛选保留新作与宿主；设置里改了合集开关重取一次', { timeout: 60_000 }, async () => {
    const opened = await openHome(browser);
    const { page, feed, server } = opened;
    try {
      const host = await page.locator('#feedNew').elementHandle();
      const booted = feed.reads.length;
      feed.items = [1, 2, 3];
      await page.evaluate(() => {
        history.pushState({}, '', '/?state=fresh');
        window.dispatchEvent(new PopStateEvent('popstate'));
      });
      await settle(page);
      assert.equal(feed.reads.length, booted, '目录筛选不改变新作范围');
      assert.deepEqual(await page.locator('#feedNew [data-feed-id]').evaluateAll(nodes =>
        nodes.map(node => node.getAttribute('data-feed-id'))), ['1', '2']);
      assert.equal(await page.locator('#feedNew .feednewskeleton').count(), 0, '同在目录页里不该再铺骨架');
      assert.equal(await host!.evaluate((node) => node.isConnected && node.id === 'feedNew'), true);

      feed.items = [4];
      await openPanel(page, 'JAV 与新作');
      const toggle = page.locator('#feedHideGroupSetting');
      const was = await toggle.isChecked();
      await toggle.click();
      await until(page, () => server.posts.some((post) => post.path === '/api/settings'
        && post.body.feedHideGroupCompilations === !was), '合集开关没有写回服务端');
      await until(page, () => feed.reads.length === booted + 1,
        `改了合集开关应重取一次，实际 ${feed.reads.length - booted} 次`);
      await page.locator('#feedNew [data-feed-id="4"]').waitFor({ state: 'attached', timeout: 5_000 });
      assert.equal(await page.locator('#feedNew [data-feed-id]').count(), 1);
      assert.deepEqual(opened.problems, []);
    } finally {
      await opened.close();
    }
  });

  it('封面格说清在等什么；「优先处理」只当场取这一部、不跳详情，没取到换成这一次的原因；没认出的头像也能悬停抬起', { timeout: 60_000 }, async () => {
    const opened = await openHome(browser);
    const { page } = opened;
    const covers: unknown[] = [];
    try {
      // 后挂的桩先接：把这一行换成两档状态，再重载从第一趟取数起接住。
      await page.route(/\/api\/feeds\/discoveries\?/, (route) => route.fulfill({ json: { ok: true, more: false, items: [
        { ...item(1), cover_state: 'queued', cover_reason: '排在新作资料采集后面，资料取完就取封面', performers: '未登记、已登记',
          performer_refs: [{ id: null, name: '未登记', has_image: false }, { id: 42, name: '已登记', has_image: false }] },
        { ...item(2), cover_state: 'missing', cover_reason: '上次没取到：官方图片主机都连不上' }] } }));
      await page.route((url) => url.pathname === '/api/jav/cover', (route) => {
        covers.push(JSON.parse(route.request().postData() || '{}'));
        return route.fulfill({ json: { ok: true, has_cover: false, cover_version: '', message: '官方封面地址都没有取到图片' } });
      });
      await page.reload({ waitUntil: 'load' });
      const first = page.locator('#feedNew [data-feed-id="1"]');
      await first.locator('[data-feed-cover-state="queued"]').waitFor({ timeout: 5_000 });
      await settle(page);
      assert.equal(await page.locator('#feedNew [data-feed-id="2"] [data-feed-cover-state="missing"] .feedcoverreason').textContent(),
        '上次没取到：官方图片主机都连不上');
      const unknown = first.locator('.mavstack span.mav');
      await unknown.hover();
      assert.equal(await unknown.evaluate((node) => node.matches(':hover')), true, '没认出的头像接不住指针，叠放头像抬不起来');
      await first.locator('[data-feed-action="prioritise"]').click();
      await first.locator('[data-feed-cover-state="missing"]').waitFor({ timeout: 5_000 });
      assert.equal(await first.locator('.feedcoverreason').textContent(), '官方封面地址都没有取到图片');
      assert.equal(await first.locator('[data-feed-action="prioritise"]').textContent(), '立即重试');
      assert.deepEqual(covers, [{ code: 'EXM-001' }]);
      assert.equal(new URL(page.url()).pathname, '/', '按键不该跟着跳进详情');
      assert.deepEqual(opened.problems, []);
    } finally {
      await opened.close();
    }
  });
});
