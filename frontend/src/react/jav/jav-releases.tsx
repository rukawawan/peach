/* JAV 页「新作」分区：订阅发现、还没入库的全部新作，按发行日期倒序分页。
 * 女优、厂牌两排与标签条只列这批新作里出现过的（`/api/jav/releases` 的 facets），点了在本分区里筛，
 * 不跳实体页；筛选与页码都写进地址栏。 */
import { useEffect, useRef, useState, useSyncExternalStore, type CSSProperties } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { RiRssLine } from '@remixicon/react';
import { Button, ButtonLink } from '@/components/base/buttons/button';
import { esc, firstGrapheme, leadingGraphemes } from '@peach/legacy/core';
import { appSettingsStore, javLayout, storeJavLayout, JAV_LAYOUTS, cardRatio, gridLayout } from '@peach/appearance';
import { entityFaceImg, facePos, logoUrl } from '@peach/card-art';
import { wireHorizontalScroller } from '../../ui-kit/scroll';
import { javContentSkeleton, javTagSkeleton, JAV_RECOMMENDATION_GRID } from '../../jav-skeleton';
import { tierPlaceholdersHtml } from '../../catalog-filter-skeleton';
import { errorMessage } from '../../api';
import { entityDisplayName } from '../../core/entity-names';
import type { DownloadPrefill } from '../activity/cloud-download-dialog';
import { Note } from '../components/note';
import { CoverQueue } from '../components/cover-queue';
import { TaskProgress } from '../components/task-progress';
import { EmptyState } from '../components/empty-state';
import { Pagination } from '../components/table-pagination';
import { FilterGlassRows, FilterPill, GlassPill } from '../components/filter-glass';
import { Segments, Shuffle, SortKeys } from '../entity-filter/entity-filter-page';
import { Chip } from '@/components/base/badges/chip';
import { recommendationScore, RELEASE_SORTS, type DiscoveryDirection, type ReleaseSort } from './discovery-sorts';
import { addWant, invalidateWants } from '../wants/wants';
import { useAction } from '../settings/use-action';
import { useEntityNames } from '../use-entity-names';
import { DiscoveryCard, resourcePrefill } from './discovery-card';
import { coverArrived, fetchCoverNow, fetchReleases, releaseFilters, releaseKey, RELEASE_PAGE_SIZE, type Discovery, type ReleaseFacetPerformer, type ReleaseFacetStudio,
  type ReleaseFilters, writeJavQuery } from './jav';
import { ReleaseTable } from './jav-release-table';
import { CatalogViewToggle } from '../catalog-grid/catalog-view-toggle';
import { useCatalogView } from '../catalog-grid/catalog-view';

type Facet = 'performer' | 'studio' | 'tag';
/** 等数据时两排头像的占位，与路由骨架（`releasesFilterSkeleton`）同一份。 */
const TIER_PLACEHOLDERS = `<div data-catalog-tier="performers" data-skeleton="tiers">${tierPlaceholdersHtml('performer')}</div><div data-catalog-tier="studios">${tierPlaceholdersHtml('studio')}</div>`;

const performerRing = (person: ReleaseFacetPerformer) =>
  `<span data-tier-initial>${esc(firstGrapheme(entityDisplayName('performer', person.name, person.id)))}</span>${entityFaceImg({
    id: person.id, hasImage: person.has_image, version: person.image_version, style: facePos(person.avatar_focus),
    focus: person.avatar_focus, standIn: person.avatar_stand_in })}`;

/** 按口味排时卡上那枚推荐档，与「发现」同一套分档。 */
function TasteChip({ value }: { value?: number | null }) {
  const recommendation = recommendationScore(value);
  return <span data-jav-taste-score="" title={`口味 ${recommendation.score}`}><Chip color={recommendation.color}>{recommendation.label}</Chip></span>;
}

function StudioMark({ studio }: { studio: ReleaseFacetStudio }) {
  const [broken, setBroken] = useState(false);
  return <span data-tier-mark="">
    {studio.has_logo && !broken ? <img src={logoUrl(studio.name, 'icon', studio.logo_version)} alt="" width={28} height={28}
      loading="lazy" decoding="async" onError={() => setBroken(true)} /> : leadingGraphemes(studio.name, 2)}
  </span>;
}

/** 本页一键插队当场取一部：取到就补进已取回的数据（`coverArrived`），卡片换成本机那张。 */
const fetchReleaseCover = (code: string) => fetchCoverNow(code).then(result => {
  if (result.has_cover) coverArrived(code, result);
  return result.has_cover;
});

export function Releases({ readOnly, receipt, resource, query, navigate, clearText }: {
  readOnly: boolean; receipt(message: string): void; resource(work: DownloadPrefill): void; query: string;
  navigate(path: string): void; clearText(): void;
}) {
  useEntityNames();
  const [filters, setFilters] = useState<ReleaseFilters>(() => releaseFilters(location.search));
  /* 页头的 `IndexSearch` 停手 300 毫秒才交出文字，这里换了就回第 1 页重问服务端。 */
  useEffect(() => {
    if (query === filters.q) return;
    setFilters(current => ({ ...current, q: query, page: 1 }));
    writeJavQuery({ page: '' });
  }, [query, filters.q]);
  const choose = (facet: Facet, value: string) => {
    const next = filters[facet] === value ? '' : value;
    setFilters(current => ({ ...current, [facet]: next, page: 1 }));
    writeJavQuery({ [facet]: next, page: '' });
  };
  const section = useRef<HTMLElement>(null);
  const goPage = (page: number) => {
    setFilters(current => ({ ...current, page }));
    writeJavQuery({ page: page > 1 ? String(page) : '' });
    section.current?.scrollIntoView({ block: 'start' });
  };
  const clear = () => {
    setFilters(current => ({ ...current, performer: '', studio: '', tag: '', q: '', page: 1 }));
    writeJavQuery({ performer: '', studio: '', tag: '', page: '' });
    clearText();
  };
  /* 点选中的那一枚翻方向；换一枚时番号默认正序，其余倒序（同「发现」）。 */
  const sortBy = (key: ReleaseSort) =>
    setSort(key, key === filters.sort ? (filters.dir === 'asc' ? 'desc' : 'asc') : key === 'code' ? 'asc' : 'desc');
  /* 列表模式的表头直接给出方向。 */
  const setSort = (key: ReleaseSort, dir: DiscoveryDirection) => {
    setFilters(current => ({ ...current, sort: key, dir, seed: '', page: 1 }));
    writeJavQuery({ sort: key === 'release_date' ? '' : key, dir: dir === 'asc' ? 'asc' : '', seed: '', page: '' });
  };
  /* 换一批：同一批新作按新种子重排，翻页时顺序不变；排序键都不再按下。 */
  const reshuffle = () => {
    const seed = Math.random().toString(36).slice(2, 10);
    setFilters(current => ({ ...current, sort: 'random', dir: 'desc', seed, page: 1 }));
    writeJavQuery({ sort: 'random', dir: '', seed, page: '' });
  };
  useEffect(() => {
    const rows = section.current?.querySelectorAll('[data-catalog-tier],[data-catalog-tags],[data-filter-row="bottom"]');
    const scrollers = [...(rows || [])].map(row => wireHorizontalScroller(row, { drag: true }));
    return () => scrollers.forEach(scroller => scroller.destroy());
  }, []);
  const settings = appSettingsStore();
  useSyncExternalStore(settings.subscribe, settings.version, settings.version);
  const layout = javLayout();
  /* 卡片／列表与馆藏同一个开关（`peach.catalog-view.v1`）：JAV 页的馆藏与新作一起切。 */
  const view = useCatalogView();
  const ratio = cardRatio(gridLayout({ active: true, home: false, portrait: false }));
  /* 还没读过来源资料的那几部由服务端起一轮读取：跑着就按它给的间隔轮询，跑完再取一次，标签与筛选项补全。 */
  const metadataJob = useRef('');
  const releases = useQuery({ queryKey: releaseKey(filters), queryFn: ({ signal }) => fetchReleases(filters, signal, metadataJob.current),
    placeholderData: keepPreviousData, retry: false, refetchOnWindowFocus: false,
    refetchInterval: current => current.state.data?.metadata_job?.status === 'running'
      ? Math.max(1000, current.state.data.poll_after_ms || 3000) : false });
  const metadata = releases.data?.metadata_job;
  const reading = metadata?.status === 'running';
  const wasReading = useRef(false);
  useEffect(() => { if (metadata?.job_id) metadataJob.current = metadata.job_id }, [metadata?.job_id]);
  useEffect(() => {
    if (wasReading.current && !reading) void releases.refetch();
    wasReading.current = reading;
  }, [reading, releases]);
  const action = useAction();
  const want = (item: Discovery) => { void action.run(String(item.id), signal => addWant({ code: item.code }, signal), () => {
    receipt('已加入想要'); void invalidateWants(); void releases.refetch();
  }) };
  const data = releases.data;
  const waiting = releases.isPending;
  const filtered = !!(filters.performer || filters.studio || filters.tag || filters.q);
  const pages = Math.max(1, Math.ceil((data?.total || 0) / RELEASE_PAGE_SIZE));
  return <section ref={section} aria-label="订阅新作" aria-busy={waiting || releases.isFetching} className="flex min-w-0 scroll-mt-24 flex-col gap-4">
    {waiting ? <div data-catalog-tiers="" aria-busy="true" dangerouslySetInnerHTML={{ __html: TIER_PLACEHOLDERS }} /> : null}
    {data && (data.facets.performers.length || data.facets.studios.length) ? <div data-catalog-tiers="" data-release-tiers="">
      {data.facets.performers.length ? <div data-catalog-tier="performers" role="group" aria-label="按女优筛选">
        {data.facets.performers.map(person => <button key={person.name} type="button" data-tier-performer=""
          aria-pressed={filters.performer === person.name} title={`${entityDisplayName('performer', person.name, person.id)} · ${person.count} 部`}
          onClick={() => choose('performer', person.name)}>
          <span data-tier-ring="" dangerouslySetInnerHTML={{ __html: performerRing(person) }} />
          <span data-tier-name="">{entityDisplayName('performer', person.name, person.id)}</span>
        </button>)}
      </div> : null}
      {data.facets.studios.length ? <div data-catalog-tier="studios" role="group" aria-label="按厂牌筛选">
        {data.facets.studios.map(studio => <button key={studio.name} type="button" data-tier-studio=""
          aria-pressed={filters.studio === studio.name} title={`${studio.name} · ${studio.count} 部`} onClick={() => choose('studio', studio.name)}>
          <StudioMark studio={studio} />{studio.name}<span data-count-badge="">{studio.count}</span>
        </button>)}
      </div> : null}
    </div> : null}
    <FilterGlassRows label="新作筛选" topLabel="新作标签" attrs={{ 'data-filter-frame': '', 'data-jav-filter': '', 'data-catalog-frame': '' }}
      busy={waiting} topClassName="gap-1.5 overflow-visible" bottomClassName="min-h-12" top={<div data-catalog-scroll="">
        <div data-catalog-tags="" dangerouslySetInnerHTML={waiting ? { __html: javTagSkeleton() } : undefined}>
          {waiting ? null : data?.facets.tags.map(row => <FilterPill key={row.name} data-catalog-tag={row.name} data-entity-press=""
            pressed={filters.tag === row.name} onPress={() => choose('tag', row.name)}>
            {row.name}<span data-count-badge="">{row.count}</span>
          </FilterPill>)}
        </div></div>} bottom={<>
        <span data-catalog-readout="">{waiting ? <span data-skeleton="count" aria-hidden className="relative inline-block h-3.5 w-37.5 rounded-md align-middle skeleton-sheen" />
          : filtered ? `${data?.total || 0} / ${data?.candidate_total || 0} 部` : `${data?.total || 0} 部`}</span>
        {filtered ? <GlassPill onPress={clear}>清除筛选</GlassPill> : null}
        <span data-entity-sorts="">
          <Shuffle onPress={reshuffle} busy={filters.sort === 'random' && releases.isFetching} />
          {view === 'cards' ? <Segments label="JAV 卡片版式" value={layout} options={JAV_LAYOUTS} onChange={storeJavLayout} /> : null}
          <CatalogViewToggle />
          <SortKeys sorts={RELEASE_SORTS.map(([key, label, ariaLabel]) => ({ key, label, ariaLabel, pressed: key === filters.sort, dir: filters.dir }))}
            onSort={key => sortBy(key as ReleaseSort)} />
        </span>
      </>} />
    {waiting && view === 'cards' ? <div role="status" aria-label="正在读取新作" dangerouslySetInnerHTML={{ __html: javContentSkeleton('discover', layout) }} /> : null}
    {releases.error ? <Note tone="error" title="新作未取得">{errorMessage(releases.error)}</Note> : null}
    {reading && metadata ? <div data-jav-metadata="" className="min-w-0"><TaskProgress
      label={`正在读取作品资料 · ${metadata.completed} / ${metadata.total} 部`} value={metadata.completed} total={metadata.total} /></div> : null}
    {readOnly ? null : <CoverQueue scope="本页" fetchOne={fetchReleaseCover}
      codes={(data?.items || []).filter(item => item.cover_state === 'queued' && !item.cover_url).map(item => item.code)}
      settled={(got, total) => {
        receipt(got === total ? `已取到 ${total} 部封面` : `已取到 ${got} / ${total} 部封面，没取到的在卡上写了原因`);
        void releases.refetch();
      }} />}
    {!waiting && !releases.error && !data?.items.length ? <EmptyState icon={RiRssLine} title={filtered ? '没有符合条件的新作' : '暂无未入库的新作'}
      actions={filtered ? <Button size="small" onClick={clear}>清除筛选</Button>
        : <ButtonLink size="small" href="/subscriptions?tab=add">添加订阅</ButtonLink>}>
      {filtered ? '清除筛选后查看全部新作。' : '订阅女优或厂牌后，还没入库的新作会出现在这里。'}
    </EmptyState> : null}
    {action.error ? <Note tone="error">{action.error}</Note> : null}
    {view === 'list' ? waiting || data?.items.length ? <ReleaseTable items={data?.items || []} waiting={waiting} filters={filters}
      studios={data?.facets.studios || []} javImage={settings.value.javImage} readOnly={readOnly} navigate={navigate}
      onTag={value => choose('tag', value || filters.tag)} onSort={setSort} wanting={item => action.busy === String(item.id)}
      onWant={want} onResource={item => resource(resourcePrefill(item))} /> : null
    : <div data-media-grid="" className={JAV_RECOMMENDATION_GRID} style={{ '--card-ratio': ratio } as CSSProperties}>
      {(data?.items || []).map(item => <DiscoveryCard key={item.id} item={item} layout={layout} javImage={settings.value.javImage}
        readOnly={readOnly} navigate={navigate} tag={filters.tag} onTag={value => choose('tag', value || filters.tag)}
        wanting={action.busy === String(item.id)} onWant={() => want(item)}
        onResource={() => resource(resourcePrefill(item))} badge={filters.sort === 'taste' ? <TasteChip value={item.taste_score} /> : undefined} />)}
    </div>}
    <div className="flex justify-center"><Pagination page={filters.page} pages={pages} onPage={goPage} label="新作分页" /></div>
  </section>;
}
