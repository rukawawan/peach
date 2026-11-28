import { useEffect, useMemo, useRef, useState, useSyncExternalStore, type CSSProperties, type MouseEvent } from 'react';
import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query';
import { VisuallyHidden } from 'react-aria-components';
import { RiCompassLine, RiExternalLinkLine } from '@remixicon/react';
import { fmtDur } from '@peach/legacy/core';
import { appSettingsStore, cardRatio, gridLayout, javLayout, JAV_LAYOUTS, storeJavLayout } from '@peach/appearance';
import { Chip } from '@/components/base/badges/chip';
import { Button } from '@/components/base/buttons/button';
import { Checkbox } from '@/components/base/checkbox/checkbox';
import { LinkButton } from '@/components/base/buttons/link-button';
import { Input } from '@/components/base/input/input';
import { Table, TableBody, TableCell, TableColumn, TableHeader, TableRow } from '@/components/base/table/table';
import { apiGet, errorMessage } from '../../api';
import { relayoutCovers } from '../../card-art/framing';
import { textLang } from '../../core/text-lang';
import { JAV_RECOMMENDATION_GRID, onlineCatalogCardsHtml, onlineCatalogTagPlaceholdersHtml, onlineCatalogTiersHtml } from '../../jav-skeleton';
import { catalogListSkeletonCellHtml } from '../../catalog-content-skeleton';
import { entityDisplayName } from '../../core/entity-names';
import { JavGlassSearch } from './jav-header';
import { t } from '../../i18n';
import { columnRangeKinds, readColumnFilters, withinColumnRange, writeColumnFilters, type ColumnRange } from '../../column-filters';
import { CatalogViewToggle } from '../catalog-grid/catalog-view-toggle';
import { useCatalogView } from '../catalog-grid/catalog-view';
import { ArtSlot } from '../components/art-slot';
import { DataTableFrame } from '../components/data-table-frame';
import { EmptyState } from '../components/empty-state';
import { ColumnFilterAvatar, ColumnFilterStudioAvatar } from '../components/column-filter-avatar';
import { FilterChoiceList, FilterDropdown } from '../components/filter-dropdown';
import { FilterGlassRows, FilterTagStrip, FilterToolbarControls, useFilterScope } from '../components/filter-glass';
import { MenuDialog } from '../components/menu-dialog';
import { Note } from '../components/note';
import { Select, SelectItem } from '../components/select';
import { SiteLabel } from '../components/source-label';
import { ColumnFilterPopover } from '../components/table-column-filter';
import { columnRangeSummary, outsideTableDateBound, TableRangeFields } from '../components/table-column-range';
import { Pagination } from '../components/table-pagination';
import { useHorizontalScroller } from '../components/use-horizontal-scroller';
import { useViewGlide } from '../components/use-view-glide';
import { Combo, Segments, SortKeys } from '../entity-filter/entity-filter-page';
import type { EntityComboItem } from '../entity-filter/entity-filter';
import { useEntityNames } from '../use-entity-names';
import { DiscoveryCard } from './discovery-card';
import { DiscoveryCastMore, DiscoveryFaces, DiscoveryPerformerName, type DiscoveryPerson } from './discovery-faces';
import { countJavFacets, PerformerFacet, StudioFacet, StudioListLabel } from './jav-facets';
import { JavCodeFilter, matchesJavCode } from './jav-code-filter';
import { useJavRectangle, useJavSelection, useVisibleJavWorks } from './jav-selection';
import { ONLINE_COLUMNS, ONLINE_SORTS, ONLINE_STATUS, ONLINE_TABLE_WIDTH,
  onlineSorting, onlineStatus, type OnlineSortKey, type OnlineStatus } from './online-catalog-layout';
import { discoveryArtwork, writeJavQuery, type Discovery, type ReleaseFacetStudio } from './jav';
import { useDatalistSuggest } from '../search/datalist-suggest';
import { librarySuggest } from '../search/library-suggest';

const PERFORMER_SUGGEST = librarySuggest(['performer']);

interface CatalogTag { id: string; name: string; source_name: string }
type CatalogStudio = CatalogTag & Omit<ReleaseFacetStudio, 'count'>;
type CatalogPerson = DiscoveryPerson & { dmm_id: string; source_url: string };

interface CatalogWork {
  id: string; code: string; title: string; date: string; pre_order: boolean; url: string; cover_url: string;
  people: CatalogPerson[]; studio: CatalogStudio | null; tags: CatalogTag[]; duration: number | null;
}
const EMPTY_WORKS: CatalogWork[] = [];

interface CatalogPage {
  items: CatalogWork[]; total: number; page: number; pages: number; size: number;
  performer_options: { id: string; name: string }[]; selected_actress?: string;
  coverUnverified?: boolean;
  coverOmitted?: boolean;
}

async function withAvailableCovers(page: CatalogPage, signal: AbortSignal): Promise<CatalogPage> {
  let coverUnverified = false;
  const items = await Promise.all(page.items.map(async work => {
    if (!work.cover_url) return null;
    try {
      const response = await fetch(work.cover_url, { method: 'HEAD', signal });
      if (response.ok && response.headers.get('content-type')?.startsWith('image/')) return work;
      if (response.status === 404 || response.status === 410) return null;
    } catch (error) {
      if (signal.aborted) throw error;
    }
    coverUnverified = true;
    return null;
  }));
  const covered = items.filter((work): work is CatalogWork => work !== null);
  return { ...page, items: covered, coverUnverified, coverOmitted: covered.length < page.items.length };
}

function catalogFilters() {
  const params = new URLSearchParams(location.search);
  return { performer: params.get('performer') || '', actress: params.get('actress') || '', date: params.get('date') || '',
    maker: params.get('maker') || '', genre: params.get('genre') || '',
    page: Math.max(1, Math.floor(Number(params.get('page'))) || 1) };
}

type Filters = ReturnType<typeof catalogFilters>;
type CatalogItem = Discovery & { catalogId: string; preOrder: boolean; studioOption: CatalogStudio | null; tagOptions: CatalogTag[] };

const RANGE_FIELDS = ['release', 'dur'] as const;
type RangeKey = typeof RANGE_FIELDS[number];
type SortState = ReturnType<typeof onlineSorting>;
const codeOrder = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });

function sortCatalogPage(works: CatalogWork[], { sort, dir }: SortState) {
  if (sort === 'release' && dir === 'desc') return works;
  const value = (work: CatalogWork) => sort === 'dur' ? work.duration : sort === 'code' ? work.code : work.date;
  return [...works].sort((a, b) => {
    const left = value(a), right = value(b);
    if (!left || !right) return Number(!left) - Number(!right);
    const comparison = typeof left === 'number' && typeof right === 'number'
      ? left - right : codeOrder.compare(String(left), String(right));
    return dir === 'asc' ? comparison : -comparison;
  });
}

function genresFromAddress(genre: string): string[] {
  return genre ? genre.split(',') : [];
}

type Facet<T> = ReturnType<typeof countJavFacets<CatalogWork, T>>[number];

function CatalogPerformerFilter({ filters, data, people, selected, go, close }: {
  filters: Filters; data?: CatalogPage; people: Facet<CatalogPerson>[]; selected: string; go(next: Filters): void; close(): void;
}) {
  const [name, setName] = useState(filters.performer);
  // 敲名字时给馆藏里的女优候选（名字与别名都认），提交方式不变。
  const suggestions = useDatalistSuggest('online-performer', name, PERFORMER_SUGGEST);
  const choose = (performer: string, actress: string) => {
    go({ ...filters, performer, actress, page: 1 });
    close();
  };
  return <MenuDialog aria-label={t('follow:addJavFeed.actressName')} className="py-3 outline-none">
    <form className="flex flex-col gap-3 px-3" onSubmit={event => {
      event.preventDefault();
      const performer = name.trim();
      choose(performer, performer === filters.performer ? filters.actress : '');
    }} data-copy-interact="">
      <Input size="small" label={t('follow:addJavFeed.actressName')} value={name} onChange={setName} maxLength={120} ref={suggestions.bind} />
      {suggestions.list}
      {data && data.performer_options.length > 1 ? <Select size="sm" aria-label={t('catalog:javOnline.performerPage')}
        prefix={t('catalog:javOnline.performerPage')} selectedKey={data.selected_actress}
        onSelectionChange={key => { if (key !== null) choose(filters.performer, String(key)) }}>
        {data.performer_options.map(option => <SelectItem key={option.id} id={option.id}>{option.name}</SelectItem>)}
      </Select> : null}
      <div className="flex justify-end gap-2">
        {filters.performer || filters.actress ? <Button size="small" variant="ghost" type="button"
          onClick={() => choose('', '')}>{t('catalog:rangeFilter.clear')}</Button> : null}
        <Button size="small" type="submit">{t('follow:shared.search')}</Button>
      </div>
    </form>
    {people.length ? <div className="mt-2">
      <p className="mb-1 px-3 text-caption-1-regular text-text-secondary">{t('catalog:javOnline.facetScope')}</p>
      <FilterChoiceList choices={people.map(({ id, value, count }) => ({
        id, count, label: entityDisplayName('performer', value.name, value.id), selected: id === selected,
        leading: <ColumnFilterAvatar person={value} />,
      }))} onSelect={id => {
        const person = people.find(option => option.id === id)?.value;
        if (person) choose(id === selected ? '' : person.name, id === selected ? '' : id);
      }} />
    </div> : null}
  </MenuDialog>;
}

function OnlineCatalogTable({ items, waiting, javImage, filters, sorting, onSort, onFilter, onStudio, onTag }: {
  items: CatalogItem[]; waiting: boolean; javImage: unknown; filters: Filters; onFilter(person: DiscoveryPerson): void;
  onStudio(id: string): void; onTag(id: string): void;
  sorting: SortState; onSort(key: OnlineSortKey): void;
}) {
  const genres = genresFromAddress(filters.genre);
  const selection = useJavSelection();
  const selectable = !waiting && items.some(item => item.code);
  return <div data-catalog-table="" data-release-table="" className="min-w-0">
    <DataTableFrame follow onRectangle={selectable ? selection?.selectRectangle : undefined}
      onRowClick={selectable && selection?.mode ? key => {
        const item = items.find(row => row.catalogId === key);
        if (item?.code) selection.toggle(item);
      } : undefined}>
      <Table size="sm" aria-label={t('catalog:javTabs.online')} className="min-w-(--online-table-width) table-fixed"
        style={{ '--online-table-width': `${ONLINE_TABLE_WIDTH + (selection?.mode ? 44 : 0)}px` } as CSSProperties}
        sortDescriptor={sorting.sort === 'code' ? undefined : { column: sorting.sort, direction: sorting.dir === 'asc' ? 'ascending' : 'descending' }}
        onSortChange={next => onSort(next.column === 'dur' ? 'dur' : 'release')}>
        <TableHeader>
          {selection?.mode ? <TableColumn id="selection" className="w-11" aria-label={t('catalog:javReleases.selectVideos')}>
            <Checkbox slot={null} aria-label={t('catalog:catalogList.selectAllOnPage')} isSelected={selection.all}
              isIndeterminate={selection.mixed} isDisabled={!selectable} onChange={selection.selectPage} />
          </TableColumn> : null}
          {ONLINE_COLUMNS.map(([id, label, width]) => <TableColumn key={id} id={id}
            className="w-(--online-column-width)" style={{ '--online-column-width': `${width}px` } as CSSProperties}
            isRowHeader={id === 'name'} allowsSorting={id === 'release' || id === 'dur'}>{t(label)}</TableColumn>)}
        </TableHeader>
        <TableBody>
          {waiting ? Array.from({ length: 6 }, (_, index) => <TableRow key={`skeleton-${index}`} id={`skeleton-${index}`} data-list-skeleton-row="" aria-hidden="true">
            {selection?.mode ? <TableCell /> : null}
            {ONLINE_COLUMNS.map(([id]) => <TableCell key={id}><span dangerouslySetInnerHTML={{ __html: catalogListSkeletonCellHtml(id, true) }} /></TableCell>)}
          </TableRow>) : items.map(item => {
            const artwork = discoveryArtwork(item, 'small', javImage);
            const people = item.performer_refs || [];
            const lead = people[0];
            const leadName = lead ? entityDisplayName('performer', lead.name, lead.id) : '';
            const href = item.code ? `/works/${encodeURIComponent(item.code)}` : item.link;
            const target = item.code ? {} : { target: '_blank', rel: 'noopener noreferrer' };
            const picked = !!item.code && selection?.selected.has(item.code);
            const pickLink = (event: MouseEvent<HTMLAnchorElement>) => {
              if (!item.code || !selection?.mode) return;
              event.preventDefault();
              selection.toggle(item, event.shiftKey);
            };
            return <TableRow key={item.catalogId} id={item.catalogId} data-catalog-row="" data-release-row=""
              data-rectangle-key={item.code || undefined} data-rectangle-disabled={!item.code || undefined}
              data-board-selected={picked || undefined}>
              {selection?.mode ? <TableCell>{item.code ? <Checkbox slot={null} aria-label={t('catalog:javDiscovery.select', { code: item.code })}
                isSelected={!!picked} onChange={() => selection.toggle(item)} /> : null}</TableCell> : null}
              <TableCell><div data-list-identity="">
                <a data-list-open="" href={href} onClick={pickLink} tabIndex={-1} aria-hidden {...target}>
                  <span data-list-picture="">{artwork
                    ? <ArtSlot artwork={{ kind: 'cover', html: artwork }} relayout={node => relayoutCovers(node, 'small')} />
                    : <span>{t('catalog:shared.noCover')}</span>}</span>
                </a>
                <span data-list-text=""><a data-list-work-link="" href={href} onClick={pickLink}
                  title={item.code ? `${item.code} · ${item.title}` : item.title} {...target}>
                  {item.code ? <span data-list-code="" className="text-body-2-regular text-text-primary">{item.code}</span> : null}
                  <span data-list-name="" lang={textLang(item.title)}>{item.title}</span>
                </a></span>
              </div></TableCell>
              <TableCell>{lead ? <div data-list-people="">
                <DiscoveryFaces item={item} limit={1} />
                <div className="flex min-w-0 flex-1 flex-col items-start gap-1">
                  <div data-list-person-line="" className="flex w-full min-w-0 items-center gap-2">
                    <DiscoveryPerformerName person={lead} name={leadName} title={leadName} onFilter={onFilter} />
                  </div>
                  <DiscoveryCastMore people={people} onFilter={onFilter} />
                </div>
              </div> : '—'}</TableCell>
              <TableCell>{item.studioOption ? <button type="button" className="max-w-full cursor-pointer hover:underline"
                aria-pressed={filters.maker === item.studioOption.id} onClick={() => onStudio(item.studioOption!.id)}>
                <StudioListLabel name={item.studio} studio={item.studioOption} />
              </button> : '—'}</TableCell>
              <TableCell>{item.tagOptions.length ? <div data-media-tags="" data-list-tags="">
                {item.tagOptions.map(tag => <button type="button" key={tag.id} data-media-tag=""
                  aria-pressed={genres.includes(tag.id)} onClick={() => onTag(tag.id)}>{tag.source_name}</button>)}
              </div> : '—'}</TableCell>
              <TableCell><div className="flex flex-col gap-1">
                {item.release_date ? <time dateTime={item.release_date}>{item.release_date}</time> : '—'}
                {item.preOrder ? <span className="text-caption-1-regular text-text-secondary">{t('catalog:javOnline.preOrder')}</span> : null}
              </div></TableCell>
              <TableCell>{fmtDur(item.duration)}</TableCell>
              <TableCell><LinkButton href={item.link} target="_blank" rel="noopener noreferrer" title={item.link}
                size="small" trailingIcon={RiExternalLinkLine}><SiteLabel site="dmm" label="DMM" /></LinkButton></TableCell>
            </TableRow>;
          })}
        </TableBody>
      </Table>
    </DataTableFrame>
  </div>;
}

export function OnlineCatalog({ navigate, query: keyword = '' }: { navigate(path: string): void; query?: string }) {
  useEntityNames();
  const [filters, setFilters] = useState(catalogFilters);
  const [sorting, setSorting] = useState(onlineSorting);
  const [code, setCode] = useState(() => new URLSearchParams(location.search).get('code') || '');
  const [ranges, setRanges] = useState(() => {
    const { release, dur } = readColumnFilters(new URLSearchParams(location.search).get('column_filters') || undefined);
    return { release, dur };
  });
  const [status, setStatus] = useState(onlineStatus);
  const [conditionNames, setConditionNames] = useState<Record<string, string>>({});
  const [openFacet, setOpenFacet] = useState('');
  const settings = appSettingsStore();
  useSyncExternalStore(settings.subscribe, settings.version, settings.version);
  const view = useCatalogView();
  const layout = javLayout();
  const ratio = cardRatio(gridLayout({ active: true, home: false, portrait: false }));
  const label = t('catalog:javTabs.online');
  const performerLabel = t('catalog:shared.performers');
  const studioLabel = t('catalog:shared.label');
  const tagsLabel = t('catalog:shared.tags');
  const dateLabel = t('catalog:catalogList.releaseDate');
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ['jav-catalog', filters], retry: false, refetchOnWindowFocus: false, staleTime: 300_000,
    placeholderData: keepPreviousData,
    queryFn: async ({ signal }) => withAvailableCovers(
      await apiGet<CatalogPage>(`/api/jav/catalog?${new URLSearchParams({ ...filters, page: String(filters.page) })}`, signal), signal),
  });
  const waiting = query.isPending || query.isPlaceholderData;
  const initialLoading = query.isPending;
  useEffect(() => {
    const data = query.data;
    if (waiting || !data || data.page === filters.page) return;
    const next = { ...filters, page: data.page };
    queryClient.setQueryData(['jav-catalog', next], data);
    setFilters(next);
    writeJavQuery({ page: data.page > 1 ? String(data.page) : '' });
  }, [filters, query.data, queryClient, waiting]);
  const go = (next: Filters, query: Record<string, string> = {}) => {
    setFilters(next);
    writeJavQuery({ ...next, ...query, page: next.page > 1 ? String(next.page) : '' });
  };
  const sortBy = (sort: OnlineSortKey, dir: SortState['dir']) => {
    setSorting({ sort, dir });
    writeJavQuery({ sort: sort === 'release' ? '' : sort, dir: dir === 'asc' ? 'asc' : '' });
  };
  const peopleRef = useHorizontalScroller<HTMLDivElement>();
  const studiosRef = useHorizontalScroller<HTMLDivElement>();
  const scrollRef = useHorizontalScroller<HTMLDivElement>();
  const viewRow = useRef<HTMLSpanElement>(null);
  const viewPane = useRef<HTMLSpanElement>(null);
  const scope = useFilterScope(status);
  const chooseStatus = (next: OnlineStatus) => {
    setStatus(next);
    writeJavQuery({ status: next === 'all' ? '' : next });
  };
  const hasPerformer = !!(filters.performer || filters.actress);
  const activeFacet = hasPerformer ? 'online-performer'
    : filters.maker ? 'online-studio' : filters.genre ? 'online-tags' : '';
  const anchor = openFacet || activeFacet;
  const glide = useViewGlide(viewPane, viewRow, '[data-glide-anchor]', anchor);
  const viewTrigger = (id: string) => ({
    anchor: anchor === id, onPointerEnter: glide.hover,
    onOpenChange: (open: boolean) => setOpenFacet(current => open ? id : current === id ? '' : current),
  });
  const actress = filters.actress || (waiting ? '' : query.data?.selected_actress || '');
  /* 目录站自己不认关键词：页头那个框只在取回的这一页里按番号、片名、女优、厂牌与标签筛。 */
  const fetched = query.data?.items ?? EMPTY_WORKS;
  const works = useMemo(() => {
    const needle = keyword.toLocaleLowerCase();
    return needle ? fetched.filter(work => [work.code, work.title, work.studio?.name ?? '', ...work.people.map(person => person.name),
      ...work.tags.map(tag => tag.name)].join(' ').toLocaleLowerCase().includes(needle)) : fetched;
  }, [fetched, keyword]);
  const genres = genresFromAddress(filters.genre);
  const people = countJavFacets(works, work => work.people, person => person.dmm_id, [actress]);
  const studios = countJavFacets(works, work => work.studio ? [work.studio] : [], studio => studio.id, [filters.maker]);
  const tags = countJavFacets(works, work => work.tags, tag => tag.id, genres);
  const tagChoices = tags.map(({ id, value, count }) => ({ id, label: value.source_name, searchTerms: [value.name],
    count, selected: genres.includes(id) }));
  const activePerson = people.find(option => option.id === actress)?.value;
  const personLabel = activePerson ? entityDisplayName('performer', activePerson.name, activePerson.id)
    : query.data?.performer_options.find(option => option.id === actress)?.name || filters.performer || actress;
  const studioName = studios.find(option => option.id === filters.maker)?.value.name
    || conditionNames[`studio:${filters.maker}`] || filters.maker;
  const genreName = (id: string) =>
    tags.find(option => option.id === id)?.value.source_name || conditionNames[`tag:${id}`] || id;
  const choosePerson = (person: DiscoveryPerson) => {
    const active = person.dmm_id === actress;
    go({ ...filters, performer: active ? '' : person.name, actress: active ? '' : person.dmm_id || '', page: 1 });
  };
  const chooseStudio = (id: string) => {
    const value = studios.find(option => option.id === id)?.value;
    if (value) setConditionNames(current => ({ ...current, [`studio:${id}`]: value.name }));
    go({ ...filters, maker: id === filters.maker ? '' : id, page: 1 });
  };
  const chooseTag = (id: string) => {
    const selected = genres.includes(id);
    if (id && !selected) setConditionNames(current => ({ ...current, [`tag:${id}`]: genreName(id) }));
    const next = !id ? [] : selected ? genres.filter(value => value !== id) : [...genres, id];
    go({ ...filters, genre: next.join(','), page: 1 });
  };
  const dateRange = filters.date ? { range: { min: filters.date, max: filters.date } } : ranges.release;
  const changeRanges = (next: typeof ranges, nextFilters?: Filters) => {
    setRanges(next);
    const query = { column_filters: writeColumnFilters({ release: next.release }, 'dur', next.dur) };
    if (nextFilters) go(nextFilters, query);
    else writeJavQuery(query);
  };
  const changeRange = (key: RangeKey, value: ColumnRange | undefined) => {
    const exactDate = key === 'release' && value?.range.min === value?.range.max ? String(value?.range.min || '') : '';
    changeRanges({ ...ranges, [key]: exactDate ? undefined : value },
      key === 'release' && exactDate !== filters.date ? { ...filters, date: exactDate, page: 1 } : undefined);
  };
  const changeCode = (value: string) => { setCode(value); writeJavQuery({ code: value }) };
  const clearFilter = (key: string) => {
    if (key === 'performer') go({ ...filters, performer: '', actress: '', page: 1 });
    else if (key === 'maker') go({ ...filters, maker: '', page: 1 });
    else if (key === 'release' || key === 'dur') changeRange(key, undefined);
    else if (key === 'code') changeCode('');
  };
  const combo: EntityComboItem[] = [];
  if (hasPerformer) combo.push({ kind: 'clear', key: 'performer', label: `${performerLabel} ${personLabel}` });
  if (filters.maker) combo.push({ kind: 'clear', key: 'maker', label: `${studioLabel} ${studioName}` });
  for (const key of RANGE_FIELDS) {
    const range = key === 'release' ? dateRange : ranges.dur;
    if (range) combo.push({ kind: 'clear', key,
      label: `${key === 'release' ? dateLabel : t('catalog:catalogList.duration')} ${columnRangeSummary(columnRangeKinds[key], range.range)}` });
  }
  if (code) combo.push({ kind: 'clear', key: 'code', label: `${t('catalog:shared.code')} ${code}` });
  for (const id of genres) combo.push({ kind: 'untag', key: id, label: genreName(id) });
  const pageFiltered = status !== 'all' || !!(code || ranges.dur || (!filters.date && ranges.release));
  const items = useMemo<CatalogItem[]>(() => {
    if (waiting) return [];
    const showing = pageFiltered ? works.filter(work => (status === 'all' || work.pre_order === (status === 'preOrder'))
      && (!code || matchesJavCode(work.code, code))
      && (filters.date || !ranges.release || withinColumnRange('date', ranges.release.range, work.date))
      && (!ranges.dur || withinColumnRange('duration', ranges.dur.range, work.duration))) : works;
    return sortCatalogPage(showing, sorting).map((work, index) => ({
      id: index + 1, catalogId: work.id, code: work.code, title: work.title, performer_refs: work.people,
      performers: '', studio: work.studio?.name || '', studio_ref: work.studio || undefined, studioOption: work.studio,
      tagOptions: work.tags, tags: [...new Set(work.tags.map(tag => tag.source_name))], duration: work.duration,
      release_date: work.date, link: work.url, cover_url: work.cover_url,
      online_cover_url: work.cover_url, has_cover: false, wanted: false, preOrder: work.pre_order,
    }));
  }, [waiting, pageFiltered, works, status, code, filters.date, ranges.release, ranges.dur, sorting]);
  const selectable = useMemo(() => items.filter(item => item.code), [items]);
  useVisibleJavWorks(selectable);
  const rectangle = useJavRectangle(!waiting && selectable.length > 0);
  const localOrder = sorting.sort !== 'release' || sorting.dir === 'asc';
  return <section aria-label={label} aria-busy={waiting} className="flex min-w-0 flex-col gap-4">
    {initialLoading ? <div className="contents" dangerouslySetInnerHTML={{ __html: onlineCatalogTiersHtml() }} />
      : people.length || studios.length ? <div data-catalog-tiers="" className="-mx-4 -mb-4">
      {people.length ? <div ref={peopleRef} data-catalog-tier="performers" role="group" aria-label={t('catalog:javReleases.filterByActress')}>
        {people.map(({ id, value, count }) => <PerformerFacet key={id} person={value} count={count}
          pressed={id === actress} onClick={() => choosePerson(value)} />)}
      </div> : null}
      {studios.length ? <div ref={studiosRef} data-catalog-tier="studios" role="group" aria-label={t('catalog:javReleases.filterByLabel')}>
        {studios.map(({ id, value, count }) => <StudioFacet key={id} studio={value} count={count}
          pressed={id === filters.maker} onClick={() => chooseStudio(id)} showCount={false} />)}
      </div> : null}
    </div> : null}
    <FilterGlassRows label={t('catalog:catalogFilter.filterAndSort')} topLabel={t('catalog:catalogFilter.viewsAndTags')}
      attrs={{ 'data-filter-frame': '', 'data-jav-filter': '', 'data-catalog-frame': '' }}
      topClassName="gap-1.5 overflow-visible" bottomClassName="min-h-12"
      busy={waiting}
      panes={<>{scope.pane}<span ref={viewPane} data-view-glide="" aria-hidden="true" /></>}
      top={<div ref={scrollRef} data-catalog-scroll="">
        {scope.choices(t('catalog:javOnline.pageStatus'), ONLINE_STATUS.map(([key, label]) =>
          ({ key, label: t(label), attrs: { 'data-online-status': key } })), chooseStatus)}
        {initialLoading ? <div data-filter-tag-strip="" data-loading="" aria-hidden
          dangerouslySetInnerHTML={{ __html: onlineCatalogTagPlaceholdersHtml() }} />
          : <FilterTagStrip choices={tagChoices} onSelect={chooseTag} />}
      </div>} bottom={<>
        <span data-catalog-summary=""><span data-catalog-readout="">{waiting ? <span data-skeleton="count" aria-hidden
          className="skeleton-sheen inline-block h-3.5 w-28 rounded-md" /> : query.data && (query.data.coverOmitted || pageFiltered)
          ? t('catalog:javOnline.coveredCount', { shown: items.length, total: query.data.total })
          : t('catalog:countLabel.works', { count: query.data?.total || 0 })}</span>
        {localOrder ? <span className="whitespace-nowrap text-caption-1-regular text-text-secondary">{t('catalog:javOnline.localSort')}</span> : null}
        {pageFiltered ? <span className="whitespace-nowrap text-caption-1-regular text-text-secondary">{t('catalog:javOnline.pageFilters')}</span> : null}
        <JavGlassSearch tab="online" />
        </span>
        <FilterToolbarControls tools={<>
          {view === 'cards' ? <Segments label={t('catalog:entityFilter.javCardLayout')} value={layout} options={JAV_LAYOUTS} onChange={storeJavLayout} /> : null}
          <CatalogViewToggle />
        </>} fieldGroup={{ ref: viewRow, role: 'group', 'aria-label': t('catalog:javDiscover.filtersLabel'), onPointerLeave: glide.leave }}
          fields={<>
            <ColumnFilterPopover id="online-performer" orderKey="performer" view={viewTrigger('online-performer')} label={performerLabel} active={hasPerformer}>
              {close => <CatalogPerformerFilter filters={filters} data={query.data} people={people} selected={actress} go={go} close={close} />}
            </ColumnFilterPopover>
            <FilterDropdown id="online-studio" orderKey="studio" view={viewTrigger('online-studio')} label={studioLabel} active={!!filters.maker}
              hint={t('catalog:javOnline.facetScope')} onSelect={chooseStudio} onClear={filters.maker ? () => chooseStudio('') : undefined}
              choices={studios.map(({ id, value, count }) => ({ id, label: value.name, searchTerms: [value.source_name],
                count, selected: id === filters.maker, leading: <ColumnFilterStudioAvatar studio={value} /> }))} />
            <FilterDropdown id="online-tags" orderKey="tags" view={viewTrigger('online-tags')} label={tagsLabel} active={!!filters.genre}
              hint={t('catalog:javOnline.facetScope')} onSelect={chooseTag} onClear={genres.length ? () => chooseTag('') : undefined}
              choices={tagChoices} />
          </>} sorts={<SortKeys group="javOnline" sorts={ONLINE_SORTS.map(([key, label]) => ({
            key, label: t(label), ariaLabel: t(label), pressed: sorting.sort === key, dir: sorting.dir,
          }))} onSort={(key, dir) => sortBy(key as OnlineSortKey, dir)}
            filters={{
              release: { active: !!dateRange, required: true, shouldCloseOnInteractOutside: outsideTableDateBound,
                render: close => <TableRangeFields label={dateLabel} kind="date" value={dateRange}
                  rangeValues={works.map(work => work.date)}
                  onChange={value => { changeRange('release', value); close() }} /> },
              dur: { active: !!ranges.dur,
                render: close => <TableRangeFields label={t('catalog:catalogList.duration')} kind="duration" value={ranges.dur}
                  onChange={value => { changeRange('dur', value); close() }} /> },
              code: { active: !!code, render: close => <JavCodeFilter value={code}
                onChange={value => { changeCode(value); close() }} /> },
            }} />} />
      </>} />
    {combo.length ? <Combo items={combo} hidden={false}
      actions={{ toggleTag: chooseTag, clearFilter,
        clearAll: () => {
          setCode('');
          setRanges({ release: undefined, dur: undefined });
          go({ performer: '', actress: '', maker: '', genre: '', date: '', page: 1 }, { code: '', column_filters: '' });
        } }} /> : null}
    {waiting ? <VisuallyHidden role="status">{t('catalog:javOnline.loading')}</VisuallyHidden> : null}
    {query.error ? <Note tone="error" title={t('catalog:javOnline.failed')}
      action={<Button variant="secondary" onClick={() => void query.refetch()}>{t('catalog:shared.retryNow')}</Button>}>
      {errorMessage(query.error)}
    </Note> : null}
    {query.data?.coverUnverified && !waiting ? <Note tone="neutral"
      action={<Button variant="secondary" onClick={() => void query.refetch()}>{t('catalog:shared.retryNow')}</Button>}>
      {t('catalog:javOnline.coverUnverified')}
    </Note> : null}
    {query.data && !waiting && !items.length && !query.error && !query.data.coverUnverified ? <EmptyState icon={RiCompassLine}
      title={t(works.length ? 'catalog:javOnline.noPageMatches'
        : query.data.total ? 'catalog:javOnline.noCoveredWorks' : 'catalog:javOnline.noMatches')}
      actions={works.length ? <Button size="small" onClick={() => { setStatus('all'); setCode(''); setRanges({ release: undefined, dur: undefined }); writeJavQuery({ status: '', code: '', column_filters: '' }) }}>
        {t('catalog:shared.clearFilters')}</Button> : null}>{null}</EmptyState> : null}
    {view === 'list' && (waiting || items.length > 0) ? <OnlineCatalogTable items={items} waiting={waiting} javImage={settings.value.javImage}
      filters={filters} sorting={sorting} onSort={key => sortBy(key, key === sorting.sort && sorting.dir === 'desc' ? 'asc' : 'desc')}
      onFilter={choosePerson} onStudio={chooseStudio} onTag={chooseTag} /> : null}
    {view === 'cards' && waiting ? <div className="contents" dangerouslySetInnerHTML={{ __html: onlineCatalogCardsHtml(ratio) }} /> : null}
    {view === 'cards' && items.length > 0 ? <div data-media-grid="" className={JAV_RECOMMENDATION_GRID} style={{ '--card-ratio': ratio } as CSSProperties} {...rectangle}>
        {items.map(item => <DiscoveryCard key={item.catalogId} item={item} layout={layout} javImage={settings.value.javImage}
          readOnly navigate={navigate} onFilterPerson={choosePerson} tag={genres.map(genreName)}
          onTag={name => {
            const option = item.tagOptions.find(option => option.source_name === name);
            if (!name || option) chooseTag(option?.id || '');
          }}
          studioFilter={item.studioOption
            ? { selected: filters.maker === item.studioOption.id, onPress: () => chooseStudio(item.studioOption!.id) }
            : undefined}
          badge={item.preOrder ? <Chip variant="caption" color="neutral">{t('catalog:javOnline.preOrder')}</Chip> : undefined} />)}
      </div> : null}
    {query.data && !waiting && query.data.pages > 1 ? <div className="flex flex-wrap items-center justify-end gap-x-4 gap-y-2">
      {query.data.total > query.data.pages * query.data.size ? <span data-copy-key="jav.online.pageLimit"
        className="text-caption-1-regular text-text-secondary">
        {t('catalog:javOnline.pageLimit', { count: query.data.pages })}
      </span> : null}
      <Pagination label={label} page={query.data.page} pages={query.data.pages}
        onPage={page => go({ ...filters, page })} />
    </div> : null}
  </section>;
}
