import { islandButton, islandGlyph, islandShortcutsEntry } from './island-skeleton';
import { cardClass } from './react/components/card';
import { cardRatio, gridLayout, javLayout, JAV_LAYOUTS } from './appearance';
import { DISCOVERY_SORTS, RELEASE_SORTS } from './react/jav/discovery-sorts';
import { tierPlaceholdersHtml } from './catalog-filter-skeleton';
import { FILTER_WAITING, catalogViewSkeletonHtml, facetFilterSkeletonFields, filterControlsSkeletonHtml, sortKeysSkeletonHtml } from './filter-controls-skeleton';
import { listTableSkeletonHtml } from './catalog-content-skeleton';
import { catalogView } from './react/catalog-grid/catalog-view';
import { releaseTableSnapshot } from './react/jav/release-table-columns';
import { t } from './i18n';
import { esc } from './core';
import { ONLINE_SORTS, ONLINE_STATUS, onlineSorting, onlineStatus, onlineTableSnapshot } from './react/jav/online-catalog-layout';

const text = (width: string) => `<span data-jav-skeleton-text class="skeleton block rounded-md" style="width:${width}" aria-hidden="true"></span>`;
const cover = (classes: string) => `<span data-jav-skeleton-cover class="skeleton ${classes}"></span>`;
export const JAV_RECOMMENDATION_GRID = 'w-full min-w-0';
/** 分区正文的容器，页面与骨架同一串。上提的 14px 抵掉 `main` 的顶部内边距：正文第一行落在馆藏分区
 *  筛选条的同一高度，换分区时页头下面那条线不跳。 */
export const JAV_PAGE_BODY = '-mt-3.5 flex w-full flex-col gap-6';

/** 想要清单一行的卡面，同 `WantRow`。 */
const WANT_ROW = cardClass({ className: 'flex flex-col gap-4 max-sm:p-4' });

/** 占位复用推荐卡与想要行的宽度、封面比例和列数。想要照 `WantSection` 排：一行分组标题，下面是卡面的行。 */
export function javContentSkeleton(tab: string, layout = javLayout()): string {
  if (tab === 'wants') return `<div class="flex w-full flex-col gap-4" data-skeleton="jav-wants"><div class="flex flex-wrap items-center justify-between gap-3"><h3 class="flex min-h-lh items-center text-title-2-medium">${text('5em')}</h3></div><ul class="flex flex-col gap-4">${Array.from({ length: 3 }, () => `<li class="${WANT_ROW}"><div class="flex min-w-0 items-start gap-4 max-sm:gap-3">${cover('block w-card-cover shrink-0 aspect-card-cover rounded-2lg max-sm:w-24')}<div class="flex min-w-0 flex-1 flex-col gap-3">${text('80%')}${text('60%')}${text('40%')}</div></div></li>`).join('')}</ul></div>`;
  const ratio = cardRatio({ ...gridLayout({ active: true, home: false, portrait: false }), size: layout });
  return `<div data-media-grid class="${JAV_RECOMMENDATION_GRID}" data-skeleton="jav-discover">${discoveryCardSkeleton(ratio).repeat(6)}</div>`;
}

/** 探索卡占位里随页面变的几处：卡底几颗键的宽度、有没有头像、卡上额外的属性（处理队列页的卡带
 *  `data-queue-card`，署名排法跟着它走）与标题占几行（垃圾卡的文件名由中段截断收成一行）。 */
export interface DiscoverySkeletonShape {
  actions?: readonly string[];
  avatar?: boolean;
  attrs?: string;
  titleLines?: 1 | 2;
}

/** 一张探索卡排法的占位：封面、头像、两行标题、署名、标签与一排动作键。高清版、垃圾文件的卡也是这一副，
 *  它们没有头像（`avatar` 为假）。 */
export function discoveryCardSkeleton(ratio: number | string,
  { actions = ['w-20', 'w-12', 'w-26'], avatar = true, attrs = '', titleLines = 2 }: DiscoverySkeletonShape = {}): string {
  return `<div data-jav-skeleton-card data-media-card data-jav-card${attrs} class="flex min-w-0 flex-col gap-3">
    <span data-jav-skeleton-cover class="skeleton block w-full rounded-2lg" style="aspect-ratio:${ratio}"></span>
    <div data-media-meta>${avatar ? '<span data-jav-skeleton-avatar class="skeleton block shrink-0"></span>' : ''}<div data-media-text>
      <div data-media-title${titleLines === 2 ? '' : ' style="min-height:0"'}>${text('85%')}${titleLines === 2 ? text('65%') : ''}</div><div data-media-byline><span data-media-who>${text('6em')}</span><span data-media-facts><span data-media-release>${text('7em')}</span></span></div>
      <div data-media-tags><span class="skeleton block h-5 w-20 rounded-md"></span><span class="skeleton block h-5 w-24 rounded-md"></span></div>
    </div></div>
    <div data-jav-skeleton-actions class="flex flex-wrap gap-2">${actions.map(width => `<span data-jav-skeleton-action class="skeleton block h-9 ${width} rounded-md"></span>`).join('')}</div>
  </div>`;
}

export const onlineCatalogTiersHtml = () =>
  `<div data-catalog-tiers="" data-loading="" class="-mx-4 -mb-4" aria-hidden="true">
    <div data-catalog-tier="performers">${tierPlaceholdersHtml('performer')}</div>
    <div data-catalog-tier="studios">${tierPlaceholdersHtml('studio')}</div>
  </div>`;

export const onlineCatalogTagPlaceholdersHtml = () =>
  `<span data-catalog-placeholder="tag">${'<span></span>'.repeat(8)}</span>`;

export function onlineCatalogCardsHtml(ratio: number): string {
  return `<div data-media-grid class="${JAV_RECOMMENDATION_GRID}" data-skeleton="jav-online-cards" aria-hidden="true">${discoveryCardSkeleton(ratio, { actions: ['w-24'] }).repeat(6)}</div>`;
}

function onlineCatalogPageSkeleton(): string {
  const status = onlineStatus();
  const { sort, dir } = onlineSorting();
  const sorts = ONLINE_SORTS.map(([key, label]) => ({ key, label: t(label), ariaLabel: t(label), pressed: key === sort, dir }));
  const fields = [
    { key: 'performer', id: 'online-performer', label: t('catalog:shared.performers') },
    { key: 'studio', id: 'online-studio', label: t('catalog:shared.label') },
    { key: 'tags', id: 'online-tags', label: t('catalog:shared.tags') },
  ];
  const controls = filterControlsSkeletonHtml(sorts,
    { name: 'jav-layout', label: t('catalog:entityFilter.javCardLayout'), value: javLayout(), options: JAV_LAYOUTS },
    { folders: false, shuffle: false, fields, group: 'javOnline' });
  const body = catalogView() === 'list'
    ? `<div data-catalog-table data-release-table class="min-w-0">${listTableSkeletonHtml(onlineTableSnapshot(), '', { fixed: true, separateCode: true })}</div>`
    : onlineCatalogCardsHtml(cardRatio(gridLayout({ active: true, home: false, portrait: false })));
  return `<section data-skeleton="jav-online" aria-busy="true" aria-label="${esc(t('catalog:javTabs.online'))}" class="flex min-w-0 flex-col gap-4">
    ${onlineCatalogTiersHtml()}
    <div data-filter-glass data-glass-pane data-filter-frame data-jav-filter data-catalog-frame class="sticky top-topbar z-10 mb-5.5 flex flex-col">
      <div data-filter-row="top" class="flex h-12 min-w-0 items-center gap-1.5 overflow-visible overscroll-x-contain px-3 py-2">
        <div data-catalog-scroll><div data-catalog-views role="group" aria-label="${esc(t('catalog:javOnline.pageStatus'))}">
          ${ONLINE_STATUS.map(([key, label]) => `<button type="button" data-catalog-view="${key}" data-entity-tag="${key}" aria-pressed="${key === status}" ${FILTER_WAITING}>${esc(t(label))}</button>`).join('')}
          <span data-entity-sep="" aria-hidden="true"></span>
        </div><div data-filter-tag-strip data-loading aria-hidden="true">${onlineCatalogTagPlaceholdersHtml()}</div></div>
      </div>
      <div data-filter-row="bottom" aria-busy="true" class="flex min-h-12 min-w-0 items-center gap-3 px-3 py-2">
        <span data-catalog-summary><span data-catalog-readout><span data-skeleton="count" class="skeleton-sheen inline-block h-3.5 w-28 rounded-md"></span></span></span>
        ${controls}
      </div>
    </div>
    ${body}
  </section>`;
}

/** 分区正文等数据时的样子：按分区画各自的筛选条与卡片占位。标题、页签与筛选框在常驻页头
 *  （`JavPageHeader`）里，它随路由树先于这一张画上，不在这里重画。 */
export function javPageSkeleton(tab: string): string {
  /* 想要照 `WantList` 的静止态排：「按番号添加」那张卡不等数据，输入框与添加键原样在位，下面才是清单占位。 */
  const body = tab === 'wants' ? `<div class="flex flex-col gap-8"><div class="${cardClass({ padding: 'none', className: 'flex flex-col gap-4 px-6 py-5 max-sm:px-4' })}"><h3 class="text-title-2-medium text-text-primary">${t('catalog:wants.addByCode')}</h3><div class="flex flex-wrap items-end gap-2"><div class="min-w-64 grow max-sm:min-w-0"><span class="skeleton ui-configuration-skeleton-input"></span></div>${islandButton({ variant: 'primary', label: t('catalog:shared.add'), attrs: 'disabled data-skeleton-action' })}</div></div>${javContentSkeleton(tab)}</div>`
    : tab === 'releases' ? `<section class="flex min-w-0 flex-col gap-4">${releasesFilterSkeleton()}${catalogView() === 'list'
      ? `<div data-catalog-table>${listTableSkeletonHtml(releaseTableSnapshot())}</div>` : javContentSkeleton(tab)}</section>`
    : tab === 'online' ? onlineCatalogPageSkeleton()
    : `<section class="flex min-w-0 flex-col gap-4">${javFilterSkeleton()}${javContentSkeleton(tab)}</section>`;
  return `<div class="peach-react"><div class="${JAV_PAGE_BODY}">${body}</div></div>`;
}

/** 新作分区等数据时的两排头像与筛选条：头像、厂牌、标签用馆藏同一份占位，下排是换一批、卡片版式、卡片／列表与
 *  排序键（照地址栏里的排序按下），同 `jav-releases.tsx` 取到数据后的样子。 */
export function releasesFilterSkeleton(): string {
  const params = new URLSearchParams(location.search);
  const sort = params.get('sort') || 'release_date';
  const dir: 'asc' | 'desc' = params.get('dir') === 'asc' ? 'asc' : 'desc';
  const sorts = RELEASE_SORTS.map(([key, label, ariaLabel]) => ({ key, label, ariaLabel, pressed: key === sort,
    dir: key === sort ? dir : '' as const }));
  return `<div data-catalog-tiers="" aria-busy="true"><div data-catalog-tier="performers" data-skeleton="tiers">${tierPlaceholdersHtml('performer')}</div><div data-catalog-tier="studios">${tierPlaceholdersHtml('studio')}</div></div>
  <div data-filter-glass data-glass-pane data-filter-frame data-jav-filter data-catalog-frame class="sticky top-topbar z-10 mb-5.5 flex flex-col">
    <div data-filter-row="top" class="flex h-12 min-w-0 items-center overscroll-x-contain px-3 py-2 gap-1.5 overflow-visible">
      <div data-catalog-scroll>${catalogViewSkeletonHtml()}</div>
    </div>
    <div data-filter-row="bottom" aria-busy="true" class="flex min-h-12 min-w-0 items-center gap-3 px-3 py-2">
      <span data-catalog-readout><span data-skeleton="count" class="relative inline-block h-3.5 w-37.5 rounded-md align-middle skeleton-sheen"></span></span>
      ${filterControlsSkeletonHtml(sorts, { name: 'jav-layout', label: t('catalog:entityFilter.javCardLayout'), value: javLayout(), options: JAV_LAYOUTS }, { folders: false, views: false, fields: facetFilterSkeletonFields('jav-release'), group: 'releases' })}
    </div>
  </div>`;
}

/** 首屏筛选控件使用首页的两排容器；标签和读数依赖查询。 */
function javFilterSkeleton(): string {
  const active = new URLSearchParams(location.search).get('scope') === 'library' ? 'library' : 'external';
  const scope = (key: string, label: string) => `<button type="button" data-catalog-view="${key}" data-entity-tag="${key}" data-entity-press="" aria-pressed="${key === active}">${label}</button>`;
  const size = (value: string, glyph: string) => `<span data-glass-segment="" ${javLayout() === value ? 'data-selected="true"' : ''} class="flex size-8 flex-none items-center justify-center rounded-lg text-(--glass-text)/62">${islandGlyph(glyph, 'size-4')}</span>`;
  return `<div data-filter-glass data-glass-pane data-filter-frame data-jav-filter data-catalog-frame class="sticky top-topbar z-10 mb-5.5 flex flex-col">
    <div data-filter-row="top" class="flex h-12 min-w-0 items-center overscroll-x-contain px-3 py-2 gap-1.5 overflow-visible">
      <div data-catalog-scroll><div data-catalog-views role="group" aria-label="${esc(t('catalog:javDiscover.scopeLabel'))}">${scope('external', t('catalog:javDiscover.external'))}${scope('library', t('catalog:javDiscover.library'))}</div></div>
    </div>
    <div data-filter-row="bottom" aria-busy="true" class="flex min-h-12 min-w-0 items-center gap-3 px-3 py-2">
      <span data-catalog-readout><span data-skeleton="count" class="relative inline-block h-3.5 w-37.5 rounded-md align-middle skeleton-sheen"></span></span>
      ${islandShortcutsEntry()}
      <span data-entity-sorts><button type="button" data-entity-batch data-filter-action data-skeleton-action data-jav-metadata-update title="${t('catalog:javDiscover.updateMetadata')}" aria-label="${t('catalog:javDiscover.updateMetadata')}" disabled>${islandGlyph('refresh-cw', 'size-4')}</button><span data-entity-layout class="inline-flex w-max max-w-full flex-none items-center gap-0.5 rounded-lg">${size('big', 'maximize')}${size('small', 'layout-grid')}</span>
        <span data-entity-sep="" aria-hidden="true"></span>
        ${sortKeysSkeletonHtml(DISCOVERY_SORTS.map(([key, label, ariaLabel]) => ({ key, label, ariaLabel, pressed: key === 'taste', dir: key === 'taste' ? 'desc' : '' })), 'discover', facetFilterSkeletonFields('jav-discover'))}
      </span>
    </div>
  </div>`;
}
