import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import type { Browser, Page } from 'playwright-core';
import { launch, requiredEnv } from './harness.ts';

/* 语义动画的尺寸、颜色与减少动效要看真实样式表的计算结果，jsdom 算不出 em 与变量。
   节点照 `src/ui-kit/activity-motion.ts` 的输出摆进真实页面，量的是 `web/dist/peach-app.css`。 */
const motion = (kind: string, size = 'inline', still = false) => `<span class="ui-activity" data-activity="${kind}" data-size="${size}"${still ? ' data-still=""' : ''} aria-hidden="true">${
  kind === 'linear-dots' ? '<i></i>'.repeat(3) : kind === 'gather' ? `<span>${'<i></i>'.repeat(4)}</span>` : kind === 'blocks' ? '<i></i>'.repeat(9)
    : '<svg viewBox="0 0 16 16"><path class="ui-activity-spin" d="M8 0V8Z"/></svg>'}</span>`;

async function open(browser: Browser, reducedMotion: 'reduce' | 'no-preference'): Promise<{ page: Page; close(): Promise<void> }> {
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 }, reducedMotion });
  const page = await context.newPage();
  await page.goto(requiredEnv('PEACH_E2E_ORIGIN') + '/stats', { waitUntil: 'load' });
  await page.evaluate((html) => {
    const host = document.createElement('div');
    host.id = 'motionProbe';
    host.innerHTML = html;
    document.body.append(host);
  }, [
    `<p data-row="12" style="font-size:12px">${motion('blocks')}</p>`,
    `<p data-row="14" style="font-size:14px">${motion('radar')}${motion('linear-dots')}</p>`,
    `<div data-row="block" style="font-size:16px">${motion('gather', 'block')}</div>`,
    `<div data-row="card">${motion('linear-dots', 'card')}${motion('clock', 'card', true)}</div>`,
    '<span class="skeleton" data-row="sheen" style="width:80px"></span>',
  ].join(''));
  return { page, close: () => context.close() };
}

const box = (page: Page, selector: string) => page.locator(selector).evaluate((element) => {
  const rect = element.getBoundingClientRect();
  return { width: rect.width, height: rect.height };
});

describe('后台推进的语义动画', () => {
  let browser: Browser;
  before(async () => { browser = await launch() });
  after(async () => { await browser?.close() });

  it('尺寸跟所在那一行的字号走：行内 1.2em，区块大一档，卡片随网格密度变', { timeout: 60_000 }, async () => {
    const opened = await open(browser, 'no-preference');
    try {
      const { page } = opened;
      for (const [row, font] of [['12', 12], ['14', 14]] as const) {
        const size = await box(page, `#motionProbe [data-row="${row}"] .ui-activity:first-child`);
        assert.ok(Math.abs(size.width - font * 1.2) < .5 && Math.abs(size.height - font * 1.2) < .5,
          `${font}px 那一行的动画是 ${size.width}×${size.height}，应与 --icon-inline 一样大`);
      }
      const dots = await box(page, '#motionProbe [data-row="14"] [data-activity="linear-dots"]');
      assert.ok(Math.abs(dots.width - 14 * 1.2) < .5, 'LinearDots 在正方形画框里居中，与同一行的图标等宽');
      const block = await box(page, '#motionProbe [data-row="block"] .ui-activity');
      assert.ok(Math.abs(block.width - 16 * 2.4) < .5, `区块级是行内的两倍：${block.width}`);
      const card = await box(page, '#motionProbe [data-row="card"] .ui-activity:first-child');
      assert.ok(Math.abs(card.width - 24) < .5, `卡片上按封面格状态字的两倍：${card.width}`);
      await page.evaluate(() => document.body.setAttribute('data-density', 'dense'));
      const dense = await box(page, '#motionProbe [data-row="card"] .ui-activity:first-child');
      assert.ok(dense.width < card.width && Math.abs(dense.width - 18) < .5, `密集网格小一档：${dense.width}`);
    } finally {
      await opened.close();
    }
  });

  it('颜色是用户的强调色，换强调色跟着换', { timeout: 60_000 }, async () => {
    const opened = await open(browser, 'no-preference');
    try {
      const { page } = opened;
      const read = () => page.evaluate(() => {
        const probe = document.createElement('i');
        probe.style.color = 'var(--color-accent-500)';
        document.body.append(probe);
        const accent = getComputedStyle(probe).color;
        probe.remove();
        return { accent, motion: getComputedStyle(document.querySelector('#motionProbe .ui-activity')!).color };
      });
      const blue = await read();
      assert.equal(blue.motion, blue.accent);
      await page.evaluate(() => { document.documentElement.dataset.accent = 'rose' });
      const rose = await read();
      assert.equal(rose.motion, rose.accent);
      assert.notEqual(rose.motion, blue.motion);
    } finally {
      await opened.close();
    }
  });

  it('只有在动的才动：排队的静帧不动；减少动效时动画与遗留骨架的微光都停下', { timeout: 60_000 }, async () => {
    const names = (page: Page) => page.evaluate(() => ({
      blocks: getComputedStyle(document.querySelector('#motionProbe [data-row="12"] i')!).animationName,
      spin: getComputedStyle(document.querySelector('#motionProbe [data-row="14"] .ui-activity-spin')!).animationName,
      queued: getComputedStyle(document.querySelector('#motionProbe [data-still] .ui-activity-spin')!).animationName,
      sheen: getComputedStyle(document.querySelector('#motionProbe [data-row="sheen"]')!, '::after').animationName,
    }));
    const moving = await open(browser, 'no-preference');
    try {
      const running = await names(moving.page);
      assert.notEqual(running.blocks, 'none');
      assert.notEqual(running.spin, 'none');
      assert.notEqual(running.sheen, 'none');
      assert.equal(running.queued, 'none', '排队的卡片只给静帧');
    } finally {
      await moving.close();
    }
    const still = await open(browser, 'reduce');
    try {
      assert.deepEqual(await names(still.page), { blocks: 'none', spin: 'none', queued: 'none', sheen: 'none' });
    } finally {
      await still.close();
    }
  });
});
