import { emptyStateHtml } from '@peach/legacy/ui';
import { unfilteredWallAddress } from './wall-route';
import { catalogEmptyHtml } from '../../catalog-onboarding';
import { t } from '../../i18n';

/** 媒体库、筛选结果与封面各自表达当前的空状态。 */
export function wallEmptyHtml({ libraryEmpty, matches, hasMore, catalogEmpty }: {
  libraryEmpty: boolean; matches: number; hasMore: boolean; catalogEmpty?: string;
}): string {
  if (libraryEmpty) return catalogEmpty || catalogEmptyHtml();
  if (!matches) return emptyStateHtml('search', t('catalog:wallEmpty.noMatches'), t('catalog:wallEmpty.noMatchesHint'), {
    actions: `<a class="geist-button primary" href="${unfilteredWallAddress()}">${t('catalog:shared.clearFilters')}</a>`,
  });
  return emptyStateHtml('image', t('catalog:wallEmpty.noCovers'), hasMore
    ? t('catalog:wallEmpty.loadMoreHint') : t('catalog:wallEmpty.addCoversHint'), {
    actions: `<a class="geist-button primary" href="/data-cleanup">${t('catalog:wallEmpty.fillCovers')}</a>`
      + (hasMore ? `<button type="button" class="geist-button" data-wall-load-more>${t('catalog:wallEmpty.loadMoreButton')}</button>` : ''),
  });
}
