import { JAV_RELEASE_SORT } from '../../sort-preferences';
import { t } from '../../i18n';

export const DISCOVERY_SORTS = [
  ['taste', t('catalog:javSort.taste'), t('catalog:javSort.byTaste')],
  ['release_date', JAV_RELEASE_SORT[1], t('catalog:javSort.byReleaseDate')],
  ['source_score', t('catalog:javSort.siteRating'), t('catalog:javSort.bySiteRating')],
  ['duration', t('catalog:catalogList.duration'), t('catalog:javSort.byDuration')],
  ['code', t('catalog:shared.code'), t('catalog:javSort.byCode')],
] as const;
export type DiscoverySort = typeof DISCOVERY_SORTS[number][0];
/** 新作分区的排序：发行时间打头（默认），其余同「发现」；`random` 是「换一批」，没有对应的排序键。 */
export const RELEASE_SORTS = [
  ['release_date', JAV_RELEASE_SORT[1], t('catalog:javSort.byReleaseDate')],
  ['source_score', t('catalog:javSort.siteRating'), t('catalog:javSort.bySiteRating')],
  ['duration', t('catalog:catalogList.duration'), t('catalog:javSort.byDuration')],
  ['code', t('catalog:shared.code'), t('catalog:javSort.byCode')],
  ['taste', t('catalog:javSort.taste'), t('catalog:javSort.byTaste')],
] as const;
export type ReleaseSort = typeof RELEASE_SORTS[number][0] | 'random';
export type DiscoveryDirection = 'asc' | 'desc';

export function discoveryScore(value: number | null | undefined): string {
  return typeof value === 'number' && Number.isFinite(value) ? value.toFixed(3) : '—';
}

/** 口味相关度使用固定百分制；未知读数保留空值。 */
export function recommendationScore(value: number | null | undefined) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return { score: '—', label: t('catalog:javScore.noMetadata'), color: 'neutral' as const };
  const score = Math.round(Math.max(0, Math.min(1, value)) * 100);
  const tier = score >= 75 ? { label: t('catalog:javScore.highlyRecommended'), color: 'lime' as const }
    : score >= 50 ? { label: t('catalog:javScore.recommended'), color: 'blue' as const }
    : score >= 25 ? { label: t('catalog:javScore.worthALook'), color: 'yellow' as const }
    : { label: t('catalog:javScore.explore'), color: 'neutral' as const };
  return { score: String(score), ...tier };
}
