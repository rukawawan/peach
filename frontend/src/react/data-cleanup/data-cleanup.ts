/* 数据管理页的数据契约。
 *
 * 这一页是「库里已经有的东西怎么收拾」的唯一入口。顶上一排读数各是一条内容在库里的经过：
 * 先把它说清楚（人工复核、高清版），再把不该留的挑出去（重复文件、垃圾文件），最后是删掉的
 * 东西还在哪儿（回收站）。
 *
 * 五份读数里有两份不归这一页所有：高清版读 `QUALITY_GOALS_KEY`、重复文件读 `DUPLICATES_KEY`，
 * 同一个数在两页上永远是同一份。这里只声明人工复核的计数、垃圾文件与回收站。
 * 复核计数不读 `REVIEW_KEY`：那一把是整条队列，这里只要 `?counts=1` 那几个数，响应形状不同，
 * 是另一份资源。
 *
 * 各卡各自失败各自算：复核接口出错不该把回收站那张卡也变成「读取失败」，所以是五个
 * `useQuery`，不是一次 `Promise.all`。 */
import type { QueryKey } from '@tanstack/react-query';
import type { CleanupToolKey } from '../../cleanup-tools';

import { apiGet } from '../../api';
import { DUPLICATES_KEY, fetchDuplicates } from '../duplicates/duplicates';
import { prefetchLibraryProcessing } from '../library-processing/library-processing';
import { prefetchMediaRepair } from '../media-repair/media-repair';
import { prefetchMediaSources } from '../media-sources';
import { fetchQualityGoals, QUALITY_GOALS_KEY } from '../quality-goals/quality-goals';
import { queryClient } from '../query';
import { REVIEW_LABELS, type ReviewCategory } from '../review/review';
import {
  fetchLinkCheck, fetchLinkPrune, fetchLinkStats, LINK_CHECK_KEY, LINK_PRUNE_KEY, LINKS_KEY,
} from './links';
import { prefetchOrganize } from './organize';
import { fetchOrphanRecords, ORPHAN_RECORDS_KEY } from './orphan-records';
import { prefetchResourceSync } from './resource-sync';
import { fetchDeletePerformers, PERFORMER_DELETE_KEY } from './performer-delete';
import { t } from '../../i18n';

export const REVIEW_COUNTS_URL = '/api/review?counts=1';
export const REVIEW_COUNTS_KEY = ['review', 'counts'] as const;

/** 垃圾文件：只要待判断的总数与分项，一条都不用取回来。 */
export const JUNK_URL = '/api/ads?limit=1';
export const JUNK_KEY = ['junk-summary'] as const;

/** 回收站：目录那张网格的同一条端点，钉死 `state=trash` 只为拿总数与占用。 */
export const TRASH_URL = '/api/items?state=trash&limit=1';
export const TRASH_KEY = ['trash-summary'] as const;

/** 垃圾判断的分类与界面上的名字。次序就是分项那一行的次序（遗留层 `JUNK_KIND_OPTIONS`）。 */
export const JUNK_KINDS: [string, string][] = [
  ['video', t('cleanup:junk.kindVideos')], ['image', t('cleanup:junk.kindImages')], ['archive', t('cleanup:junk.kindArchives')],
  ['audio', t('cleanup:junk.kindAudio')], ['url', t('cleanup:junk.kindUrls')], ['other', t('cleanup:junk.kindOther')],
];

export interface ReviewCounts { counts: Partial<Record<ReviewCategory, number>> }

export interface JunkSummary {
  pending_total: number;
  dismissed_total: number;
  counts: Record<string, number>;
}

export interface TrashSummary { total: number; bytes: number }

export const fetchReviewCounts = (signal?: AbortSignal) => apiGet<ReviewCounts>(REVIEW_COUNTS_URL, signal);
export const fetchJunkSummary = (signal?: AbortSignal) => apiGet<JunkSummary>(JUNK_URL, signal);
/** 回收站计数跟着侧栏选中的媒体库走，和目录网格同一个口径：遗留层 `api()` 取 `/api/items`
 *  时会补上 `library=`，`apiGet` 不补，这里自己接上。 */
export const fetchTrashSummary = (signal?: AbortSignal) => {
  const library = sessionStorage.getItem('peach.library');
  const url = library ? `${TRASH_URL}&library=${encodeURIComponent(library)}` : TRASH_URL;
  return apiGet<TrashSummary>(url, signal);
};

const count = (value: number | undefined) => Number(value || 0).toLocaleString();

/** 复核那张卡：总数与前三类，剩下的合成「其余 N」——卡片是入口，不是复核队列本身。 */
export function reviewSummary(data: ReviewCounts | undefined): { figure: string; meta: string } {
  const labels = REVIEW_LABELS as Record<string, string>;
  const counts = Object.entries(data?.counts ?? {})
    .map(([key, value]) => [labels[key] || key, Number(value) || 0] as const)
    .filter(([, value]) => value > 0)
    .sort((a, b) => b[1] - a[1]);
  const total = counts.reduce((sum, [, value]) => sum + value, 0);
  const top = counts.slice(0, 3).map(([label, value]) => `${label} ${value.toLocaleString()}`);
  const rest = counts.slice(3).reduce((sum, [, value]) => sum + value, 0);
  if (rest) top.push(t('cleanup:overview.reviewOther', { count: rest }));
  return { figure: t('cleanup:overview.reviewPending', { count: total }), meta: top.join(' · ') };
}

/** 垃圾文件那张卡的分项：只列真的有东西的类别，已忽略的接在后面。 */
export function junkBreakdown(summary: JunkSummary | undefined): string {
  if (!summary) return '';
  const parts = JUNK_KINDS
    .filter(([key]) => Number(summary.counts?.[key]) > 0)
    .map(([key, label]) => `${label} ${count(summary.counts[key])}`);
  if (Number(summary.dismissed_total) > 0) parts.push(t('cleanup:overview.junkExcluded', { count: Number(summary.dismissed_total || 0) }));
  return parts.join(' · ');
}

/** 状态摘要独立读取；某一份失败时只影响对应入口的读数。 */
const LAZY_QUERIES: [QueryKey, (context: { signal: AbortSignal }) => Promise<unknown>][] = [
  [REVIEW_COUNTS_KEY, ({ signal }) => fetchReviewCounts(signal)],
  [QUALITY_GOALS_KEY, ({ signal }) => fetchQualityGoals(signal)],
  [TRASH_KEY, ({ signal }) => fetchTrashSummary(signal)],
  [JUNK_KEY, ({ signal }) => fetchJunkSummary(signal)],
  [DUPLICATES_KEY, ({ signal }) => fetchDuplicates(signal)],
];

/** 首页各份摘要和扫描状态独立读取，不阻挡已就绪的卡片与维护入口。 */
export async function prefetchDataCleanup(signal: AbortSignal): Promise<void> {
  for (const [queryKey, queryFn] of LAZY_QUERIES) {
    void queryClient.prefetchQuery({ queryKey, queryFn: () => queryFn({ signal }) });
  }
  void prefetchLibraryProcessing(signal).catch(() => {});
}

/** 进入维护工具时才读取它的状态、配置与结果。 */
export async function prefetchDataCleanupTool(tool: CleanupToolKey, signal: AbortSignal): Promise<void> {
  switch (tool) {
    case 'organize': await prefetchOrganize(signal); break;
    case 'media-repair': await prefetchMediaRepair(signal); break;
    case 'resource-sync': await prefetchMediaSources(signal); await prefetchResourceSync(signal); break;
    case 'orphan-records':
      await queryClient.prefetchQuery({ queryKey: ORPHAN_RECORDS_KEY, queryFn: () => fetchOrphanRecords(signal) }); break;
    case 'batch-delete':
      await queryClient.prefetchQuery({ queryKey: PERFORMER_DELETE_KEY, queryFn: () => fetchDeletePerformers(signal) }); break;
    case 'links':
      void queryClient.prefetchQuery({ queryKey: LINK_CHECK_KEY, queryFn: () => fetchLinkCheck(signal) });
      void queryClient.prefetchQuery({ queryKey: LINK_PRUNE_KEY, queryFn: () => fetchLinkPrune(signal) });
      await queryClient.prefetchQuery({ queryKey: LINKS_KEY, queryFn: () => fetchLinkStats(signal) }); break;
  }
}
