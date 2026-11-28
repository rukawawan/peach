import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { after, before, describe, it } from 'node:test';
import type { Browser, Page } from 'playwright-core';
import { launch, layout, settle, visit, VIEWPORTS } from './harness.ts';

/** 这台机器的媒体处理偏好：页面写进来的值留在这一份里，重新载入读回的就是它。 */
function mediaProcessing() {
  const state = { disabled: false, timeline: 'coarse', previewAcceleration: 'auto', playbackAcceleration: 'auto' };
  const writes: unknown[] = [];
  const route = async (page: Page) => {
    await page.route('**/api/media-processing', async route => {
      if (route.request().method() === 'POST') {
        const body = route.request().postDataJSON();
        writes.push(body);
        if ('metadata_only' in body) {
          state.disabled = body.metadata_only;
          if (state.disabled) state.timeline = 'off';
        }
        if ('preview_acceleration' in body) state.previewAcceleration = body.preview_acceleration;
        if ('playback_acceleration' in body) state.playbackAcceleration = body.playback_acceleration;
      }
      await route.fulfill({ json: { metadata_only: state.disabled,
        preview_acceleration: state.previewAcceleration, playback_acceleration: state.playbackAcceleration } });
    });
    await page.route('**/api/thumbnail-jobs', route => route.fulfill({ json: { mode: state.timeline, status: 'idle' } }));
  };
  return { state, writes, route };
}

describe('视频预览设置', () => {
  let browser: Browser;
  before(async () => { browser = await launch() });
  after(async () => { await browser?.close() });
  for (const viewport of VIEWPORTS) {
    it(`${viewport.name}：总开关持久化并控制时间轴设置，重新开启后时间轴由用户选择`, async () => {
      const { state, writes, route } = mediaProcessing();
      const opened = await visit(browser, '/settings/library', viewport, route);
      const { page } = opened;
      try {
        const toggle = page.getByRole('switch', { name: '生成视频预览', exact: true });
        const interval = page.locator('#videoThumbnailSetting button');
        await toggle.waitFor();
        await settle(page);
        assert.equal(await toggle.isChecked(), true);
        assert.equal(await interval.isDisabled(), false);
        await page.locator('label').filter({ has: toggle }).click();
        await page.getByText('已关闭视频预览生成', { exact: true }).waitFor();
        assert.equal(await toggle.isChecked(), false);
        assert.equal(await interval.isDisabled(), true);
        await page.reload();
        await toggle.waitFor();
        await settle(page);
        assert.equal(await toggle.isChecked(), false);
        assert.equal(await interval.isDisabled(), true);
        assert.match(await interval.innerText(), /关闭/);
        await toggle.focus();
        await page.keyboard.press('Space');
        await page.getByText('已开启视频预览生成', { exact: true }).waitFor();
        assert.equal(await interval.isDisabled(), false);
        assert.match(await interval.innerText(), /关闭/);
        assert.deepEqual(writes, [{ metadata_only: true }, { metadata_only: false }]);
        const preview = page.locator('#previewAccelerationSetting button');
        await preview.click();
        await page.getByRole('option', { name: '软件解码', exact: true }).click();
        await page.getByText('已保存抽帧解码方式', { exact: true }).waitFor();
        assert.equal(state.previewAcceleration, 'software');
        assert.equal(state.playbackAcceleration, 'auto');
        assert.deepEqual(writes.slice(-1), [{ preview_acceleration: 'software' }]);
        assert.ok(await page.getByRole('region', { name: '视频播放', exact: true }).isVisible());
        await page.reload();
        await preview.waitFor();
        await settle(page);
        assert.match(await preview.innerText(), /软件解码/);
        const measured = await layout(page);
        assert.ok(measured.scrollWidth <= measured.viewportWidth, JSON.stringify(measured));
        assert.deepEqual(measured.offenders, []);
        const artifacts = path.resolve('..', 'build', 'agent-verification', 'media-processing');
        await mkdir(artifacts, { recursive: true });
        await page.screenshot({ path: path.join(artifacts, `${viewport.name}.png`), fullPage: true });
        assert.deepEqual(opened.problems, []);
      } finally { await opened.close() }
    });

    it(`${viewport.name}：「媒体库与入库 → 视频播放」里改转码方式，只写这一项，重新载入读回`, async () => {
      const { state, writes, route } = mediaProcessing();
      const opened = await visit(browser, '/settings/library', viewport, route);
      const { page } = opened;
      try {
        const section = page.getByRole('region', { name: '视频播放', exact: true });
        const trigger = section.locator('#playbackAccelerationSetting button');
        await trigger.waitFor({ state: 'visible' });
        await page.waitForFunction(() => document.querySelector('#playbackAccelerationSetting button')?.hasAttribute('disabled') === false);
        await settle(page);
        assert.match(await trigger.innerText(), /自动/);
        /* 这张卡排在首屏以下。先滚到位、等两帧让滚动事件派发完：下拉打开之后再收到触发框所在页面的
           滚动，React Aria 会把它合上。 */
        await trigger.scrollIntoViewIfNeeded();
        await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
        await trigger.click();
        await page.getByRole('option', { name: '软件编解码', exact: true }).click();
        await page.getByText('已保存转码方式', { exact: true }).waitFor();
        assert.equal(state.playbackAcceleration, 'software');
        assert.equal(state.previewAcceleration, 'auto');
        assert.deepEqual(writes, [{ playback_acceleration: 'software' }]);
        const order = await page.locator('.ui-board-group-active').evaluate((group) =>
          [...group.querySelectorAll('section[aria-label], form[aria-label]')].map((node) => node.getAttribute('aria-label')));
        assert.ok(order.indexOf('视频预览') >= 0 && order.indexOf('视频播放') === order.indexOf('视频预览') + 1, JSON.stringify(order));
        await page.reload();
        await trigger.waitFor({ state: 'visible' });
        await page.waitForFunction(() => /软件编解码/.test(document.querySelector('#playbackAccelerationSetting button')?.textContent || ''));
        const measured = await layout(page);
        assert.ok(measured.scrollWidth <= measured.viewportWidth, JSON.stringify(measured));
        assert.deepEqual(measured.offenders, []);
        assert.deepEqual(opened.problems, []);
      } finally { await opened.close() }
    });
  }
});
