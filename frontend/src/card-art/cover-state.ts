import { esc } from '@peach/legacy/core';
import { gaugeHtml } from '@peach/legacy/ui';

/** 还没有封面的新作，封面那一格的三档（服务端 `feed_followup.cover_states`）：正在取、排在队里、
 *  取过没取到或后台不会替它取。首页新作那一行与 JAV 页「新作」「发现」共用这一份字样。 */
export type CoverState = 'fetching' | 'queued' | 'missing';

export interface CoverStateItem { code?: string; cover_state?: CoverState | null; cover_reason?: string }

export const COVER_STATE_TITLE: Record<CoverState, string> = { fetching: '抓取中', queued: '排队中', missing: '无封面' };

/** 这一格能做的那件事：排队的插到最前当场取，取过没取到的当场再取一次；正在取的不给键。
 *  两个都走详情页「立即重试」那个接口，不进后台的队。 */
export const coverStateAction = (state: CoverState | null | undefined): string =>
  state === 'queued' ? '优先处理' : state === 'missing' ? '立即重试' : '';

/** 正在取这一部：Geist Gauge 的不定档加一句「抓取中」。一次请求说不出完成了几成，所以不画读数。
 *  首页新作卡与 JAV 页卡片共用这一枚。 */
export const coverFetchingHtml = (): string =>
  `<span class="feedcoverstate" data-feed-cover-state="fetching">${gaugeHtml('正在取封面', 0, 1, { indeterminate: true })}<span class="nopic">抓取中</span></span>`;

/** 首页新作卡封面格的那一段：标题、原因与动作键。没有番号或服务端没给状态就只写「无封面」。 */
export function coverStateHtml(item: CoverStateItem): string {
  const state = item.code ? item.cover_state : null;
  if (!state) return '<span class="nopic" data-feed-cover-state="missing">无封面</span>';
  if (state === 'fetching') return coverFetchingHtml();
  const reason = item.cover_reason || '';
  return `<span class="feedcoverstate" data-feed-cover-state="${state}"><span class="nopic">${COVER_STATE_TITLE[state]}</span>${
    reason ? `<span class="feedcoverreason" title="${esc(reason)}">${esc(reason)}</span>` : ''}<button type="button" class="geist-button" data-feed-action="prioritise" data-code="${esc(item.code!)}" aria-label="${coverStateAction(state)} ${esc(item.code!)} 的封面">${coverStateAction(state)}</button></span>`;
}
