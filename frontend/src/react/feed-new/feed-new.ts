/* 未入库的新作那一行（ADR-0042）：首页那一行与资料页那一行共用的取数、查询键与写操作。
 *
 * 两行读同一个端点（`/api/feeds/discoveries`），资料页多带一个 `entity`；查询键同族
 * （`['feed-new', 实体 id | 'home']`），一处改了合集开关，按 `['feed-new']` 一次就能把两行都作废。
 * 卡片的 HTML 仍由壳拼（`feedRowHtml`）：封面取景、版次字样与那条连接方式的 Note 都是遗留层
 * 那一份，取图失败时的兜底链也直接改节点。 */
import { appSettingsStore } from '@peach/appearance';
import type { CoverState } from '@peach/card-art';
import { api } from '@peach/legacy/core';

import { withBackoff } from '../../polling';
import { queryClient } from '../query';

/** `/api/feeds/discoveries` 的回话：条目与最近一轮取封面断在连接上的部数。 */
export interface FeedDiscoveries { items?: FeedNewItem[]; cover_network?: number; error?: string }

/** 一行里的一部：判有没有、哪几部的封面还在排队（这一行的一键插队只管这几部）。 */
export interface FeedNewItem { id: number; code?: string; has_cover?: boolean; cover_url?: string | null; cover_state?: CoverState | null }

/** 新作那一行取回来的样子：条目与壳拼好的整段 HTML。 */
export interface FeedNew {
  items: FeedNewItem[];
  html: string;
  fetching?: boolean;
}

/** 壳拼的整段 HTML：连不上图片主机时的 Note 与一排卡（`feedNewCardHtml`）。 */
export type FeedRowHtml = (data: FeedDiscoveries | null, allHref?: string) => string;

/** 有封面还在取时多久重取这一行。一张图取回来要几秒，更密只是重复读到同一份。 */
export const FEED_COVER_POLL_MS = 5000;

/** 有封面还在取时五秒一次，取完就停；读失败按 4、8、16、30 秒退避。 */
export const feedNewInterval = withBackoff<FeedNew>((data) => (data?.fetching ? FEED_COVER_POLL_MS : false));

/** 资料页那一行用实体 id，首页那一行不分人。 */
export const feedNewKey = (entityId: number | null) => ['feed-new', entityId ?? 'home'] as const;

/** 拉取由定时器做，页面只读已经发现的那些：进这一页顺手发一轮请求，等于把每次刷新都变成对别人
 *  服务器的一次拉取。条目返回后立即显示文字与操作，封面在各自的图片格里继续等待。
 *  一行取几部按设置弹窗「新作显示数量」（`feedLimit`），改了由壳作废两行的查询重取。 */
export async function fetchFeedNew(entityId: number | null, rowHtml: FeedRowHtml): Promise<FeedNew> {
  const query = new URLSearchParams({ limit: String(appSettingsStore().value.feedLimit) });
  if (entityId) query.set('entity', String(entityId));
  const data = await api(`/api/feeds/discoveries?${query}`) as FeedDiscoveries;
  if (data.error) throw new Error(data.error);
  const items = data.items || [];
  // 首页那一行在行尾带「查看全部新作」，资料页那一行只列这个人的，不带。
  const html = rowHtml(data, entityId ? '' : '/jav?tab=releases');
  return { items, html, fetching: items.some(item => item.cover_state === 'fetching') };
}

export const feedNewOptions = (entityId: number | null, rowHtml: FeedRowHtml) => ({
  queryKey: feedNewKey(entityId),
  queryFn: () => fetchFeedNew(entityId, rowHtml),
  staleTime: Infinity,
  refetchInterval: feedNewInterval,
});

/** 卡上那三颗键（想要、不想看、标为已看过）。都是标记，写失败了卡片照样换样子：这一行下次取数时
 *  会按服务端的现状重排。 */
export const postFeedAction = (feedId: number, action: string): Promise<void> =>
  (api('/api/feeds/discovery', { method: 'POST', body: JSON.stringify({ action, ids: [feedId] }) }) as Promise<unknown>)
    .then(() => undefined, () => undefined);

/** 首页那一行（`feed-new` island）。宿主是 `index.html` 里那块常驻的 `#feedNew`：岛的根挂在它
 *  里面的 `.peach-react` 上，卡片 portal 回宿主本身，落在 Preflight 的范围外。 */
export interface FeedNewProps {
  host: HTMLElement;
  /** 合集开关改了就换一个代次，这一行照新的筛法重取。 */
  revision: number;
  helpers: {
    feedRowHtml: FeedRowHtml;
    /** 拖动、滚轮，按设置接自动滚动。 */
    wireFeedRow(row: Element | null): void;
  };
  actions: {
    /** 这一行有没有卡：取回来、或最后一张被收起时报一次，壳按它决定下次进首页铺不铺骨架。 */
    settled(hasItems: boolean): void;
  };
}

/** 每次进入目录页读取最新条目；图片不阻挡条目返回。 */
export async function prefetchFeedNew(props: FeedNewProps): Promise<void> {
  queryClient.removeQueries({ queryKey: feedNewKey(null) });
  await queryClient.prefetchQuery(feedNewOptions(null, props.helpers.feedRowHtml));
}
