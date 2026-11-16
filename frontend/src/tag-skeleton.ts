/* 标签页与管理页共用一页正文和分页的占位。 */
import { t } from './i18n';

export const TAG_PAGE_SIZE = 100;
export const TAG_PAGE_SIZES = [50, 100, 200] as const;

export function tagSkeletonHtml({ mode = 'cloud', pageSize = TAG_PAGE_SIZE }: { mode?:string; pageSize?:number } = {}):string {
  const size = Math.max(1, Math.min(200, Math.floor(pageSize)));
  const chips = Array.from({ length:size }, (_, at) => {
    const seed = Math.imul(at + 1, 2654435761) >>> 0;
    const width = 58 + seed % 153;
    return `<span data-tag-skeleton-cell class="skeleton block rounded-lg" style="height:34px;width:${width}px;max-width:100%"></span>`;
  }).join('');
  const alpha = Array.from({ length:Math.min(2,size) }, (_, group) => {
    const count = Math.floor(size / 2) + (group === 0 ? size % 2 : 0);
    return `<section class="min-w-0 bg-background-secondary-default rounded-2xl px-5 pt-4 pb-3"><span class="skeleton mb-2 block w-20" style="height:24px"></span><div class="index-tag-list gap-x-4 gap-y-0.5">${Array.from({ length:count }, () => '<span data-tag-skeleton-cell class="flex h-9 min-w-0 items-center gap-3 px-2.5"><span class="skeleton w-32 max-w-full rounded-md" style="height:16px"></span><span class="skeleton ml-auto w-8 rounded-md" style="height:12px"></span></span>').join('')}</div></section>`;
  }).join('');
  return `<div data-skeleton="tags/${mode==='alphabet'?'alphabet':'cloud'}/${size}" role="status" aria-label="${t('catalog:tagSkeleton.loading')}" aria-busy="true"><span class="sr-only">${t('catalog:tagSkeleton.loading')}</span><div aria-hidden="true">${mode === 'alphabet' ? `<div class="flex flex-col gap-4">${alpha}</div>` : `<div class="flex flex-wrap gap-1.75">${chips}</div>`}<div class="mt-5 flex flex-wrap items-center justify-between gap-3" data-tag-pagination-skeleton><span class="skeleton block w-32" style="height:16px"></span><div class="flex items-center gap-2"><span class="skeleton block w-28 rounded-md" style="height:32px"></span><span class="skeleton block w-40 rounded-md" style="height:32px"></span></div></div></div></div>`;
}
