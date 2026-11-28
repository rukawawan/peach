/* 侧栏开合的运行期约束：过渡中不重画玻璃贴图，停下后按终态尺寸补画，主区落在让出的位置上。
 *
 * 冒烟默认按减少动态效果打开页面，那时过渡是 0s，这些约束无从观察；这里在页面里切回有动效。 */
import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';

import type { Browser, Page } from 'playwright-core';

import { expectBody, launch, settle, visit, VIEWPORTS } from './harness.ts';

const DESKTOP = VIEWPORTS.find((viewport) => !viewport.mobile)!;

interface Toggle {
  /** 第一段过渡结束那一刻，已经画过几张位移贴图。 */
  mapsDuring: number;
  /** 两段过渡都结束、补画之后，抽屉那张位移贴图的宽度（同尺寸的贴图会复用，不一定重画）。 */
  mapWidth: number;
  drawerClientWidth: number;
  opticDuring: string;
  opticAfter: string;
  open: boolean;
  drawerWidth: number;
  drawerRight: number;
  mainLeft: number;
  mainRight: number;
  railW: number;
  viewport: number;
  /** 从点击起主线程连续占住多久：跨过点击那一刻的长动画帧（LoAF）里最晚的结束时刻减去点击时刻；没有就是 0。 */
  blockedFromClick: number;
}

interface LongFrame {
  startTime: number;
  duration: number;
}

/** 点一下左上角的切换键，等 `body` 的 `padding-left` 与抽屉的 `width` 两段过渡都停下。 */
async function toggle(page: Page): Promise<Toggle> {
  return page.evaluate(() => new Promise<Toggle>((resolve, reject) => {
    const counter = window as unknown as { __maps: number };
    const drawer = document.querySelector<HTMLElement>('#drawer')!;
    const start = counter.__maps;
    const pending = new Set(['padding-left', 'width']);
    let mapsDuring = -1;
    let opticDuring = '';
    const timer = setTimeout(() => reject(new Error(`过渡没有结束，还差 ${[...pending].join('、')}`)), 5_000);
    /* 主线程占用按长动画帧（LoAF，单帧超过 50ms 才记）量：一帧从它第一个任务算到样式、布局做完，
       不含合成与光栅。按墙钟数出了几帧会把无头 Chrome 软件光栅的停顿也算进来：本机空闲时
       收起过渡中就有 130～260ms 不出帧、主线程却空着的间隙，几个浏览器并行时这段能盖住整个
       300ms，而主线程并没有被占住。 */
    let clicked = 0;
    const longFrames: LongFrame[] = [];
    const observer = new PerformanceObserver((list) => {
      longFrames.push(...list.getEntries().map(({ startTime, duration }) => ({ startTime, duration })));
    });
    observer.observe({ type: 'long-animation-frame' });
    const window300 = new Promise<void>((done) => setTimeout(done, 320));
    const onEnd = (event: TransitionEvent) => {
      const key = event.target === document.body && event.propertyName === 'padding-left' ? 'padding-left'
        : event.target === drawer && event.propertyName === 'width' ? 'width' : '';
      if (!key || !pending.delete(key)) return;
      if (mapsDuring < 0) {
        mapsDuring = counter.__maps - start;
        opticDuring = drawer.style.getPropertyValue('--glass-optic');
      }
      if (pending.size) return;
      clearTimeout(timer);
      window.removeEventListener('transitionend', onEnd, true);
      void window300.then(() => requestAnimationFrame(() => requestAnimationFrame(() => {
        longFrames.push(...observer.takeRecords().map(({ startTime, duration }) => ({ startTime, duration })));
        observer.disconnect();
        const blockedFromClick = Math.max(0, ...longFrames
          .filter((frame) => frame.startTime <= clicked)
          .map((frame) => frame.startTime + frame.duration - clicked));
        const drawerBox = drawer.getBoundingClientRect();
        const mainBox = document.querySelector('#main')!.getBoundingClientRect();
        resolve({
          mapsDuring,
          mapWidth: Number(document.getElementById(/#(peach-optic-\d+)/.exec(drawer.style.getPropertyValue('--glass-optic'))?.[1] || '')
            ?.querySelector('feImage')?.getAttribute('width')),
          drawerClientWidth: Math.round(drawer.clientWidth),
          opticDuring,
          opticAfter: drawer.style.getPropertyValue('--glass-optic'),
          open: drawer.classList.contains('open'),
          drawerWidth: Math.round(drawerBox.width),
          drawerRight: drawerBox.right,
          mainLeft: mainBox.left,
          mainRight: mainBox.right,
          railW: parseFloat(getComputedStyle(document.body).paddingLeft),
          viewport: document.documentElement.clientWidth,
          blockedFromClick: Math.round(blockedFromClick),
        });
      })));
    };
    // 挂在 window 的捕获阶段：比页面挂在 document 上的补画先拿到这一次结束。
    window.addEventListener('transitionend', onEnd, true);
    clicked = performance.now();
    document.querySelector<HTMLElement>('#filterBtn')!.click();
  }));
}

describe('侧栏开合', () => {
  let browser: Browser;

  before(async () => {
    browser = await launch();
  });

  after(async () => {
    await browser.close();
  });

  it('过渡中玻璃退成纯模糊不重画贴图，停下后按终态补画，主区左缘落在让出的位置', { timeout: 60_000 }, async () => {
    const opened = await visit(browser, '/', DESKTOP);
    try {
      const { page } = opened;
      await expectBody(page, '/', [page.locator('#drawer.open')]);
      await settle(page);
      await page.waitForFunction(() => document.querySelector<HTMLElement>('#drawer')?.dataset.opticGlass === 'true');
      assert.ok(await page.evaluate(() => PerformanceObserver.supportedEntryTypes.includes('long-animation-frame')),
        '浏览器不支持长动画帧计时，量不了主线程占用');
      await page.emulateMedia({ reducedMotion: 'no-preference' });      await page.evaluate(() => {
        const counter = window as unknown as { __maps: number };
        counter.__maps = 0;
        const native = HTMLCanvasElement.prototype.toDataURL;
        HTMLCanvasElement.prototype.toDataURL = function (this: HTMLCanvasElement, ...args: Parameters<HTMLCanvasElement['toDataURL']>) {
          counter.__maps++;
          return native.apply(this, args);
        };
      });

      const collapsed = await toggle(page);
      const expanded = await toggle(page);
      for (const [name, state] of [['收起', collapsed], ['展开', expanded]] as const) {
        assert.equal(state.mapsDuring, 0, `${name}过渡中重画了 ${state.mapsDuring} 张玻璃贴图`);
        assert.equal(state.opticDuring, 'blur(14px)', `${name}过渡中抽屉仍挂着旧尺寸的位移贴图`);
        assert.equal(state.mapWidth, state.drawerClientWidth, `${name}停下后贴图宽 ${state.mapWidth}，没有按终态尺寸 ${state.drawerClientWidth} 补上`);
        assert.match(state.opticAfter, /url\("#peach-optic-\d+"\)/, `${name}停下后抽屉没有恢复位移滤镜`);
        assert.ok(Math.abs(state.mainLeft - state.railW) <= .5, `${name}后主区左缘 ${state.mainLeft}，应落在 --railW ${state.railW}`);
        assert.ok(Math.abs(state.mainRight - state.viewport) <= 1, `${name}后主区右缘 ${state.mainRight} 没有贴到视口右缘 ${state.viewport}`);
        assert.ok(state.drawerRight <= state.mainLeft, `${name}后抽屉右缘 ${state.drawerRight} 压进了主区`);
        /* 只拦「整段过渡被一次长任务吞掉、直接跳到终态」：点击之后主线程不能连续占住整个
           300ms 过渡。本机无头 Chrome 点击那一帧 50～65ms，CPU 降速 6 倍约 300ms，CI 的慢机
           落在这两档之间；在点击里塞一段 400ms 忙等，这里量到约 440ms。 */
        assert.ok(state.blockedFromClick < 300, `${name}后主线程连续占住 ${state.blockedFromClick}ms，整段过渡被吞掉`);
      }
      assert.equal(collapsed.open, false);
      assert.equal(expanded.open, true);
      assert.ok(collapsed.drawerWidth < expanded.drawerWidth, `收起 ${collapsed.drawerWidth}px 不比展开 ${expanded.drawerWidth}px 窄`);
      assert.ok(collapsed.railW < expanded.railW, '收起后主区没有往左让回来');
      assert.deepEqual(opened.problems, []);
    } finally {
      await opened.close();
    }
  });
});
