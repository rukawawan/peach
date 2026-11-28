import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import type { Browser } from 'playwright-core';

import { CONFIGURATION_ROUTE, launch, layout, settle, visit, VIEWPORTS } from './harness.ts';

describe('馆藏与口味分享', () => {
  let browser: Browser;
  before(async () => { browser = await launch() });
  after(async () => { await browser?.close() });
  for (const viewport of VIEWPORTS) {
    it(`${viewport.name}：连接圆点和文字使用对应语义色，浅色和暗色可辨识`, async () => {
      const opened = await visit(browser, '/settings/library', viewport, async page => {
        await page.route(CONFIGURATION_ROUTE, async route => {
          const response = await route.fetch();
          await route.fulfill({ json: { ...await response.json(), editable: false,
            media_sources: [
              { location: 'local', root: 'R:\\Media', path: 'R:\\Media', online: false },
              { location: '115', root: 'B:\\', path: 'B:\\', online: true },
              { location: 'pikpak', root: 'A:\\', path: 'A:\\' },
            ] } });
        });
      });
      try {
        const status = opened.page.locator('[data-mount="offline"]').first();
        await status.waitFor();
        for (const theme of ['light', 'dark']) {
          await opened.page.evaluate(value => {
            document.documentElement.dataset.theme = value;
            document.documentElement.classList.toggle('dark', value === 'dark');
          }, theme);
          for (const [state, textToken, dotToken] of [
            ['offline', '--color-status-yellow-text', '--color-yellow-500'],
            ['online', theme === 'dark' ? '--color-green-400' : '--color-green-700', '--color-green-500'],
            ['unknown', '--color-text-secondary', '--color-text-tertiary'],
          ]) {
            const colors = await opened.page.locator(`[data-mount="${state}"]`).first().evaluate((element, tokens) => {
            const halo = element.firstElementChild!;
            const dot = halo.firstElementChild!;
            const probe = document.createElement('span');
            element.append(probe);
            probe.style.color = `var(${tokens[0]})`;
            const expectedText = getComputedStyle(probe).color;
            probe.style.color = `var(${tokens[1]})`;
            const expectedDot = getComputedStyle(probe).color;
            probe.remove();
            return { text: getComputedStyle(element).color, dot: getComputedStyle(dot).backgroundColor,
              halo: getComputedStyle(halo).backgroundColor, expectedText, expectedDot };
          }, [textToken, dotToken]);
            assert.equal(colors.dot, colors.expectedDot, JSON.stringify(colors));
            assert.equal(colors.text, colors.expectedText, JSON.stringify(colors));
            assert.notEqual(colors.halo, 'rgba(0, 0, 0, 0)');
          }
        }
        assert.deepEqual(opened.problems, []);
      } finally { await opened.close() }
    });
    it(`${viewport.name}：一个开关先预览两类资料，再一起确认和关闭`, async () => {
      const posts: Record<string, unknown>[] = [];
      const state = { enabled: false, available: true, schema: 4,
        fields: ['作品编号、标签、人物、评分与全部偏好维度'],
        notice: '上传馆藏与各类偏好明细。', participation: { status: 'not-attempted' } };
      const opened = await visit(browser, '/settings/library?section=' + encodeURIComponent('应用与维护'), viewport,
        async page => {
          await page.route('**/api/configuration/library-sharing/preview', route => route.fulfill({ json: {
            token: 'preview-token', schema: 4, bytes: 128, compressed_bytes: 64,
            data: { schema: 4, period: '2026-W42', library: [{ code: 'EXM-001', manual_tags: ['长标签'.repeat(500)] }],
              preferences: { performer: [] }, coverage: { uncoded_items: 0 } },
          } }));
          await page.route('**/api/configuration/seed-sharing/preview', route => route.fulfill({ json: {
            token: 'metadata-token', schema: 1, bytes: 80, data: { claims: [{ subject: 'EXM-001', field: 'title' }], omitted: 0 },
          } }));
          await page.route('**/api/configuration/community-sharing', route => {
            const writing = route.request().method() === 'POST';
            const body = writing ? route.request().postDataJSON() : { enabled: false };
            if (writing) posts.push(body);
            return route.fulfill({ json: {
              library: { ...state, enabled: body.enabled },
              metadata: { enabled: body.enabled, available: true, schema: 1, last_attempt: {} },
            } });
          });
        });
      const { page } = opened;
      try {
        const region = page.getByRole('region', { name: 'Peach 共建计划', exact: true });
        await region.waitFor();
        assert.equal(await region.getByRole('switch').count(), 1);
        const toggle = region.getByRole('switch', { name: '参与共建计划', exact: true });
        await region.getByRole('button', { name: '预览分享内容', exact: true }).waitFor();
        await settle(page);
        assert.equal(await toggle.isChecked(), false);
        const fields = region.getByText(state.fields[0], { exact: true });
        assert.equal(await fields.isVisible(), false, '字段说明默认折叠');
        const delivery = region.getByLabel('发送状态', { exact: true });
        assert.equal(await delivery.innerText(), '尚未发送');
        assert.equal(await region.getByRole('button', { name: '刷新状态', exact: true }).count(), 0);
        assert.equal(await fields.count(), 0);
        await toggle.locator('xpath=ancestor::label').click();
        const previewRegion = region.getByRole('region', { name: '分享内容预览', exact: true });
        await previewRegion.getByText('分享范围与数据明细', { exact: true }).click();
        const preview = previewRegion.getByLabel('馆藏与偏好研究预览', { exact: true });
        await preview.waitFor();
        assert.equal(posts.length, 0);
        assert.equal(await fields.isVisible(), true);
        assert.equal(await previewRegion.getByText(state.notice, { exact: true }).isVisible(), true);
        assert.equal(await region.getByText('参与回执', { exact: true }).count(), 0);
        assert.match(await preview.innerText(), /EXM-001/);
        assert.match(await preview.innerText(), /performer/);
        assert.equal(await previewRegion.locator('[data-code-block]').count(), 2);
        assert.equal(await previewRegion.getByRole('button', { name: '复制代码', exact: true }).count(), 2);
        await preview.focus();
        assert.ok(await preview.evaluate(element => element.scrollWidth > element.clientWidth), '长代码在代码块内部横向滚动');
        await settle(page);
        const measured = await layout(page);
        assert.ok(measured.scrollWidth <= measured.viewportWidth + 1, JSON.stringify(measured));
        assert.deepEqual(measured.offenders, []);
        await page.screenshot({ path: fileURLToPath(new URL(`../../build/library-sharing-${viewport.name}.png`, import.meta.url)) });
        assert.match(await previewRegion.getByLabel('公开资料候选预览', { exact: true }).innerText(), /EXM-001/);
        assert.equal(posts.length, 0);
        await region.getByRole('button', { name: '同意并参与', exact: true }).click();
        await preview.waitFor({ state: 'hidden' });
        await settle(page);
        assert.deepEqual(posts[0], { enabled: true, consent: true,
          library: { schema: 4, token: 'preview-token' }, metadata: { schema: 1, token: 'metadata-token' } });
        assert.equal(await preview.count(), 0, '同意后收起数据预览');
        assert.equal(await fields.isVisible(), false, '同意后字段说明仍保持折叠');
        assert.equal(await toggle.isChecked(), true);
        await region.getByRole('button', { name: '预览分享内容', exact: true }).click();
        await previewRegion.waitFor();
        assert.equal(posts.length, 1, '查看预览不重复保存同意');
        assert.equal(await region.getByRole('button', { name: '同意并参与', exact: true }).count(), 0);
        await region.getByRole('button', { name: '取消', exact: true }).click();
        await toggle.focus();
        const disabled = page.waitForResponse(response => response.url().endsWith('/api/configuration/community-sharing')
          && response.request().method() === 'POST');
        await toggle.press('Space');
        await disabled;
        await toggle.and(page.locator(':not(:checked)')).waitFor({ state: 'attached' });
        await settle(page);
        assert.equal(posts[1]?.enabled, false);
        assert.equal(await toggle.isChecked(), false);
        assert.deepEqual(opened.problems, []);
      } finally { await opened.close() }
    });
  }
});
