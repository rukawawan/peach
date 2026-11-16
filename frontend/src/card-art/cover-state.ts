import { esc } from '@peach/legacy/core';
import { activityMotionHtml } from '@peach/legacy/ui';
import { codedText } from '../core/server-text';
import { t } from '../i18n';

/** 还没有封面的新作，封面那一格的三档（服务端 `feed_followup.cover_states`）：正在取、排在队里、
 *  取过没取到或后台不会替它取。首页新作那一行与 JAV 页「新作」「发现」共用这一份字样。 */
export type CoverState = 'fetching' | 'queued' | 'missing';

export interface CoverStateItem {
  code?: string; cover_state?: CoverState | null;
  /** 原因的 zh-CN 原文；`cover_reason_code` 与参数有译文时显示译文。 */
  cover_reason?: string; cover_reason_code?: string; cover_reason_params?: Record<string, unknown>;
}

/** 这一格说的原因，按当前界面语言。 */
export const coverReason = (item: CoverStateItem): string => codedText(item, 'cover_reason');

export const COVER_STATE_TITLE: Record<CoverState, string> = { fetching: t('catalog:feedCover.fetching'), queued: t('catalog:shared.queued'), missing: t('catalog:shared.noCover') };

/** 这一格能做的那件事：排队的插到最前当场取，取过没取到的当场再取一次；正在取的不给键。
 *  两个都走详情页「立即重试」那个接口，不进后台的队。 */
export const coverStateAction = (state: CoverState | null | undefined): string =>
  state === 'queued' ? t('catalog:feedCover.prioritize') : state === 'missing' ? t('catalog:shared.retryNow') : '';

/** 正在取这一部：传输动画加一句「抓取中」。一次请求说不出完成了几成，所以不画读数。
 *  首页新作卡与 JAV 页卡片共用这一枚；动画按卡片角标的尺寸（`data-size="card"`），随网格密度变。 */
export const coverFetchingHtml = (): string =>
  `<span class="feedcoverstate" data-feed-cover-state="fetching" role="status">${activityMotionHtml('linear-dots', { size: 'card' })}<span class="nopic">${t('catalog:feedCover.fetching')}</span></span>`;

/** 排在队里的那一格的前导：静止的 Clock。一屏几十张排队的卡同时转，正在抓的那几张反而看不出来，所以只给静帧。 */
export const coverQueuedMarkHtml = (): string => activityMotionHtml('clock', { size: 'card', still: true });

/** 首页新作卡封面格的那一段：标题、原因与动作键。没有番号或服务端没给状态就只写「无封面」。 */
export function coverStateHtml(item: CoverStateItem): string {
  const state = item.code ? item.cover_state : null;
  if (!state) return `<span class="nopic" data-feed-cover-state="missing">${t('catalog:shared.noCover')}</span>`;
  if (state === 'fetching') return coverFetchingHtml();
  const reason = coverReason(item);
  return `<span class="feedcoverstate" data-feed-cover-state="${state}">${state === 'queued' ? coverQueuedMarkHtml() : ''}<span class="nopic">${COVER_STATE_TITLE[state]}</span>${
    reason ? `<span class="feedcoverreason" title="${esc(reason)}">${esc(reason)}</span>` : ''}<button type="button" class="geist-button" data-feed-action="prioritise" data-code="${esc(item.code!)}" aria-label="${t('catalog:feedCover.coverAction', { action: coverStateAction(state), code: esc(item.code!) })}">${coverStateAction(state)}</button></span>`;
}
