/* 后台推进的语义动画：排队用 Clock、搜索检查用 Radar、传输用 LinearDots、写入入库用 Gather、
 * 整理分析用 Blocks。选哪一种查 `../activity-kinds.ts` 那张对照表，这里只管画。
 *
 * 移植自 loading.dev（npm 包 `loading-dev` 0.3.6，仓库 https://github.com/jakubkrehel/loading，
 * revision 755235bf7eea3dfb05ec4c3661088e3521ee2d75，MIT，原文见 `web/vendor/loading-dev-LICENSE.txt`），
 * 与用户脚本 peach-jav 用的是同一 revision、同一次移植。保留 SVG 路径、形状、周期与关键帧；改动：
 * - React 组件改成 HTML 字符串，遗留层直接插，React 用 `dangerouslySetInnerHTML` 插同一份；
 * - 错相不写内联 `--ld-step`，由 `activity-motion.css` 的 `:nth-child()` 写死 `animation-delay`；
 * - 尺寸不用固定像素，`--ld-size` 跟所在那一行的字号走（`data-size`：行内、区块、卡片）；
 * - 颜色取强调色，LinearDots 的三颗点在正方形画框里居中，与同一行的图标等宽；
 * - `still` 出静帧（排队中的卡片），减少动效时全局规则同样停在静帧；Clock 的静帧换成表盘加指针。
 * 只出 `aria-hidden` 的动画节点；读屏的状态文字由外层（`activityStatusHtml` 或 React 的
 * `ActivityStatus`）给。 */
import { esc } from '../core';

export type ActivityKind = 'clock' | 'radar' | 'linear-dots' | 'gather' | 'blocks';
/** `inline`：状态行、横幅、按钮旁，与旁边的图标同为 `--icon-inline`；`block`：区块正中的等待，大一档；
 *  `card`：封面格里，按卡片角标的尺寸，随网格密度变；`lead`：标题加一行说明的两行图标位（扫描与采集通知卡），
 *  与两行文字同高（`--icon-lead`）。 */
export type ActivitySize = 'inline' | 'block' | 'card' | 'lead';

export const ACTIVITY_KINDS: readonly ActivityKind[] = ['clock', 'radar', 'linear-dots', 'gather', 'blocks'];

/** 静帧是表盘加两根指针（Peach 自加）：上游的扇形停下来像一张饼图，看不出是在排队等。 */
const CLOCK = '<svg viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="8" fill="currentColor" opacity=".1"/>'
  + '<g class="ui-activity-face" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">'
  + '<circle cx="8" cy="8" r="5.75"/><path d="M8 4.75V8l2.25 1.5"/></g>'
  + '<path class="ui-activity-spin" fill="currentColor" d="M11.1937 2.92061C10.5206 2.49739 9.77304 2.21397 8.9954 2.08314C8.45076 1.99151 8 2.44772 8 3V7.20324C8 7.49211 8.12492 7.76686 8.34259 7.95677L11.8999 11.0603C12.3287 11.4344 12.9913 11.378 13.2643 10.8787C13.6356 10.1998 13.8736 9.45248 13.9617 8.67713C14.0892 7.55433 13.8971 6.41834 13.4074 5.39993C12.9177 4.38152 12.1503 3.5221 11.1937 2.92061Z"/></svg>';

/** 渐变要有页面内唯一的 id：同一屏可能同时有好几枚 Radar。 */
let radarId = 0;
const radar = () => {
  const id = `peach-radar-${++radarId}`;
  return `<svg viewBox="0 0 16 16" fill="none"><defs><radialGradient id="${id}" cx="8" cy="8" r="8" gradientUnits="userSpaceOnUse">`
    + '<stop offset=".3334" stop-color="currentColor"/><stop offset="1" stop-color="currentColor" stop-opacity="0"/></radialGradient></defs>'
    + '<circle cx="8" cy="8" r="8" fill="currentColor" opacity=".2"/><circle cx="8" cy="8" r="5.5" stroke="currentColor" opacity=".2"/>'
    + `<path class="ui-activity-spin" fill="url(#${id})" d="M8 0C9.50657 0 10.9824 0.425672 12.2578 1.22754C13.5333 2.02953 14.557 3.17533 15.21 4.5332C15.8629 5.89107 16.1193 7.40626 15.9492 8.90332C15.7791 10.4001 15.1896 11.8184 14.249 12.9951L10.4707 9.69922C10.8037 9.21598 11 8.63123 11 8C11 6.34315 9.65685 5 8 5V0Z"/>`
    + '<circle cx="8" cy="8" r="2" fill="currentColor"/></svg>';
};

const cells = (count: number) => '<i></i>'.repeat(count);

/** 画法本身：不含外层节点。React 与遗留层都经 `activityMotionHtml` 拿完整节点。 */
function drawing(kind: ActivityKind): string {
  switch (kind) {
    case 'clock': return CLOCK;
    case 'radar': return radar();
    case 'linear-dots': return cells(3);
    case 'gather': return `<span>${cells(4)}</span>`;
    case 'blocks': return cells(9);
  }
}

/** 一枚语义动画。`still` 时停在第一帧不动：封面网格里排队的卡片一屏几十张，只让正在抓的那几张动。 */
export function activityMotionHtml(kind: ActivityKind, { size = 'inline', still = false }:
  { size?: ActivitySize; still?: boolean } = {}): string {
  const shape = ACTIVITY_KINDS.includes(kind) ? kind : 'linear-dots';
  return `<span class="ui-activity" data-activity="${shape}" data-size="${esc(size)}"${still ? ' data-still=""' : ''} aria-hidden="true">${drawing(shape)}</span>`;
}

/** 遗留层的一行后台状态：动画在前、文字在后，文字就是读屏读到的状态。动画已经在动，文字不带省略号。 */
export function activityStatusHtml(kind: ActivityKind, label: string, { className = '' } = {}): string {
  return `<span class="ui-activity-status${className ? ` ${esc(className)}` : ''}" role="status">${activityMotionHtml(kind)}<span>${esc(label)}</span></span>`;
}
