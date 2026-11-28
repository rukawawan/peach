import { esc } from './core';
import { islandGlyph } from './island-skeleton';
import type { EntitySortKey, SegmentOption } from './react/entity-filter/entity-filter';
import { SEGMENTED_GLASS_TRACK, SEGMENT_GLASS } from './react/components/segmented';
import { catalogView } from './react/catalog-grid/catalog-view';
import { t } from './i18n';
import { appSettingsStore } from './appearance/settings';
import { normalizeSortControl, type SortControlGroup } from './sort-controls';

interface FilterSkeletonField { key: string; id: string; label: string }

interface Layout { name: string; label: string; value: string; options: readonly SegmentOption[] }
const icon = (name: string) => name.startsWith('ri-')
  ? `<svg class="size-4 shrink-0" viewBox="0 0 24 24" fill="currentColor" stroke="none" aria-hidden="true"><use href="#${name}"/></svg>`
  : islandGlyph(name, 'size-4 shrink-0');
export const FILTER_WAITING = 'inert aria-disabled="true" tabindex="-1" data-skeleton-control';
export const filterDropdownSkeletonHtml = (id: string, label: string): string =>
  `<button type="button" data-catalog-view="${esc(id)}" data-table-column-filter="${esc(id)}" data-filter-field="" ${FILTER_WAITING}>${esc(label)}</button>`;
export const facetFilterSkeletonFields = (prefix: string): FilterSkeletonField[] => [
  { key: 'performer', id: `${prefix}-performers`, label: t('catalog:shared.performers') },
  { key: 'studio', id: `${prefix}-studios`, label: t('catalog:shared.label') },
  { key: 'tags', id: `${prefix}-tags`, label: t('catalog:shared.tags') },
];
const segments = (label: string, value: string, options: readonly SegmentOption[]) =>
  `<span data-entity-layout="" class="${SEGMENTED_GLASS_TRACK}" role="radiogroup" aria-label="${esc(label)}">${options.map(([key, text, glyph]) =>
    `<span class="${SEGMENT_GLASS}" role="radio" aria-label="${esc(text)}" aria-checked="${key === value}" data-glass-segment=""${key === value ? ' data-selected=""' : ''} ${FILTER_WAITING}>${icon(glyph)}</span>`).join('')}</span>`;

export const catalogViewSkeletonHtml = () => segments(t('catalog:catalogList.viewMode'), catalogView(),
  [['cards', t('catalog:catalogList.viewCards'), 'ri-layout-grid-line'], ['list', t('catalog:catalogList.viewList'), 'ri-list-unordered']]);

/** 已知的控件保留文字、字形与按下态；等待接线时不能执行动作。`folders` 为假时不画文件夹开关
 *  （JAV 新作分区没有文件夹浏览，其余换一批、卡片版式、卡片／列表与排序键照画）；`shuffle` 为假时
 *  不画换一批（回收站与处理队列页）；`views` 为假时不画卡片／列表（重复文件）。 */
export function filterControlsSkeletonHtml(sorts: readonly EntitySortKey[], layout: Layout | null,
  { folders = true, shuffle = true, views = true, fields = [], group = layout?.name === 'jav-layout' ? 'jav' : 'catalog' }:
  { folders?: boolean; shuffle?: boolean; views?: boolean; fields?: FilterSkeletonField[]; group?: SortControlGroup } = {}): string {
  const view = catalogView();
  const params = new URLSearchParams(location.search);
  const sizes = layout && view === 'cards' ? segments(layout.label, layout.value, layout.options) : '';
  const folder = folders ? `<button type="button" data-folder-mode-toggle="" aria-label="${t('catalog:catalogFolders.folderMode')}" aria-pressed="${params.get('browse') === 'folders' || !!params.get('folder')}" ${FILTER_WAITING}>${icon('ri-folder-3-line')}</button>` : '';
  const batch = shuffle ? `<button type="button" data-entity-batch="" data-filter-action="" aria-label="${t('catalog:entityFilter.shuffle')}" ${FILTER_WAITING}>${icon('shuffle')}</button>` : '';
  const toggle = views ? catalogViewSkeletonHtml() : '';
  const divider = fields.length ? '<span data-entity-sep="" aria-hidden="true"></span>' : '';
  return `<span data-entity-sorts="">${batch}${sizes}${toggle}${folder}${divider}${sortKeysSkeletonHtml(sorts, group, fields)}</span>`;
}

export function sortKeysSkeletonHtml(sorts: readonly EntitySortKey[], group: SortControlGroup, fields: readonly FilterSkeletonField[] = []): string {
  const preference = normalizeSortControl(group, appSettingsStore().value.sortControls[group]);
  const buttons = preference.order.map(key => {
    const field = fields.find(item => item.key === key);
    if (field) return filterDropdownSkeletonHtml(field.id, field.label);
    const sort = sorts.find(item => item.key === key);
    if (!sort || preference.hidden.includes(key)) return '';
    return `<button type="button" data-entity-sort="${esc(key)}" aria-pressed="${sort.pressed}" ${FILTER_WAITING}>${esc(sort.label)}${sort.pressed && sort.dir ? icon(sort.dir === 'asc' ? 'arrow-up' : 'arrow-down') : ''}</button>`;
  }).join('');
  return `<span data-sort-controls="${group}"${fields.length ? ' data-filter-fields' : ''}>${buttons}</span>`
    + `<button type="button" data-filter-action="" data-sort-settings="${group}" aria-label="${t('catalog:sortControls.customize')}" ${FILTER_WAITING}>${icon('ellipsis')}</button>`;
}
