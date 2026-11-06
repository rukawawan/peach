import { useEffect, useRef, useState, useSyncExternalStore, type CSSProperties } from 'react';
import { useQuery } from '@tanstack/react-query';
import { RiCompassLine } from '@remixicon/react';
import { Button, ButtonLink } from '@/components/base/buttons/button';
import { Chip } from '@/components/base/badges/chip';
import { appSettingsStore, javLayout, storeJavLayout, JAV_LAYOUTS, cardRatio, gridLayout } from '@peach/appearance';
import { wireHorizontalScroller } from '../../ui-kit/scroll';
import { javContentSkeleton, javTagSkeleton, JAV_RECOMMENDATION_GRID } from '../../jav-skeleton';
import { errorMessage } from '../../api';
import { CloudDownloadDialog, type DownloadPrefill } from '../activity/cloud-download-dialog';
import { Note } from '../components/note';
import { EmptyState } from '../components/empty-state';
import { WantList } from '../wants/want-list';
import { addWant, invalidateWants } from '../wants/wants';
import { busyProps, useAction } from '../settings/use-action';
import { discoveryKey, fetchDiscoveries, writeJavQuery, type DiscoveryScope } from './jav';
import { DiscoveryCard, resourcePrefill } from './discovery-card';
import { Releases } from './jav-releases';
import { JavHeader } from './jav-header';
import { IndexSearch } from '../index/index-search';
import { spriteGlyph } from '../components/sprite-glyph';
import { FilterGlassRows, FilterIconButton, FilterPill, GlassPill } from '../components/filter-glass';
import { LibraryShortcuts } from '../library-shortcuts/shortcut-controls';
import { Segments, SortKeys } from '../entity-filter/entity-filter-page';
import { TaskProgress } from '../components/task-progress';
import { DISCOVERY_SORTS, discoveryScore, recommendationScore, type DiscoverySort } from './discovery-sorts';

const MetadataStopGlyph = spriteGlyph('x');
const MetadataRefreshGlyph = spriteGlyph('refresh-cw');
const SEARCH_LABELS: Record<string, string> = { releases: '筛选新作', discover: '筛选推荐', wants: '筛选想要' };

export function JavPage({ tab, readOnly, navigate, receipt }: {
  tab: string; readOnly: boolean; navigate(path: string): void; receipt(message: string): void;
}) {
  const [download, setDownload] = useState<DownloadPrefill | null>(null);
  const [text, changeText] = useState(() => new URLSearchParams(location.search).get('q') || '');
  const setText = (value: string) => { changeText(value); writeJavQuery({ q: value }) };
  return <div className="flex w-full flex-col gap-6">
    <JavHeader tab={tab} navigate={navigate} find={() => setDownload({})}
      search={<IndexSearch label={SEARCH_LABELS[tab] || '筛选'} value={text} onQuery={setText} />} />
    {tab === 'releases'
      ? <Releases readOnly={readOnly} receipt={receipt} resource={setDownload} query={text.trim()} navigate={navigate} clearText={() => setText('')} />
      : tab === 'discover'
      ? <Discover readOnly={readOnly} receipt={receipt} resource={setDownload} query={text.trim()} navigate={navigate} clearText={() => setText('')} />
      : <WantList readOnly={readOnly} toast={receipt} query={text.trim()} clearQuery={() => setText('')} />}
    <CloudDownloadDialog prefill={download} close={() => setDownload(null)} receipt={receipt} />
  </div>;
}

function Discover({ readOnly, receipt, resource, query, navigate, clearText }: {
  readOnly: boolean; receipt(message: string): void; resource(work: DownloadPrefill): void; query: string;
  navigate(path: string): void; clearText(): void;
}) {
  const params = new URLSearchParams(location.search);
  const [scope, changeScope] = useState<DiscoveryScope>(() => params.get('scope') === 'library' ? 'library' : 'external');
  const [tag, changeTag] = useState(() => params.get('tag') || '');
  const [sort, changeSort] = useState<DiscoverySort>(() => DISCOVERY_SORTS.some(([key]) => key === params.get('sort'))
    ? params.get('sort') as DiscoverySort : 'taste');
  const [ascending, changeAscending] = useState(() => params.get('dir') === 'asc');
  const setScope = (value: DiscoveryScope) => { changeScope(value); writeJavQuery({ scope: value === 'external' ? '' : value }) };
  const setTag = (value: string) => { changeTag(value); writeJavQuery({ tag: value }) };
  const setSort = (value: DiscoverySort) => { changeSort(value); writeJavQuery({ sort: value === 'taste' ? '' : value }) };
  const setAscending = (value: boolean) => { changeAscending(value); writeJavQuery({ dir: value ? 'asc' : '' }) };
  const section = useRef<HTMLElement>(null);
  useEffect(() => {
    const rows = section.current?.querySelectorAll('[data-catalog-scroll],[data-catalog-tags],[data-filter-row="bottom"]');
    const scrollers = [...(rows || [])].map(row => wireHorizontalScroller(row, { drag: true }));
    return () => scrollers.forEach(scroller => scroller.destroy());
  }, []);
  const settings = appSettingsStore();
  useSyncExternalStore(settings.subscribe, settings.version, settings.version);
  const layout = javLayout();
  const ratio = cardRatio(gridLayout({ active: true, home: false, portrait: false }));
  const metadataJobs = useRef<Partial<Record<DiscoveryScope, string>>>({});
  const refreshMetadata = useRef(false);
  const cancelMetadata = useRef(false);
  const direction = ascending ? 'asc' : 'desc';
  const discoveries = useQuery({ queryKey: discoveryKey(scope, sort, direction), retry: false, refetchOnWindowFocus: false,
    queryFn: ({ signal }) => {
      const refresh = refreshMetadata.current;
      const cancel = cancelMetadata.current;
      refreshMetadata.current = false;
      cancelMetadata.current = false;
      return fetchDiscoveries(scope, signal, { sort, direction, jobId: refresh ? undefined : metadataJobs.current[scope], refreshMetadata: refresh, cancelMetadata: cancel });
    },
    refetchInterval: current => current.state.data?.metadata_job?.status === 'running'
      ? Math.max(1000, current.state.data.poll_after_ms || 3000) : false,
  });
  const metadata = discoveries.data?.metadata_job;
  useEffect(() => { if (metadata?.job_id) metadataJobs.current[scope] = metadata.job_id }, [scope, metadata?.job_id]);
  const action = useAction();
  const metadataAction = useAction();
  const updateMetadata = (key: 'stop' | 'update' | 'retry') => {
    void metadataAction.run(key, async () => {
      cancelMetadata.current = key === 'stop';
      refreshMetadata.current = key !== 'stop';
      return discoveries.refetch({ cancelRefetch: true, throwOnError: true });
    }, () => {});
  };
  const all = discoveries.data?.items || [];
  const tags = [...new Set(all.flatMap(item => item.tags || []))];
  const items = all.filter(item => (!tag || item.tags?.includes(tag)) &&
    (!query || [item.code, item.title, item.performers, item.studio, ...(item.tags || []), ...(item.performer_refs || []).map(ref => ref.name)].join(' ').toLocaleLowerCase().includes(query.toLocaleLowerCase())));
  const waiting = discoveries.isPending;
  return <section ref={section} aria-label="为你推荐" aria-busy={waiting} className="flex min-w-0 flex-col gap-4">
    <FilterGlassRows label="发现筛选与排序" topLabel="发现范围与标签" attrs={{ 'data-filter-frame': '', 'data-jav-filter': '', 'data-catalog-frame': '' }}
      busy={waiting} topClassName="gap-1.5 overflow-visible" bottomClassName="min-h-12" top={<div data-catalog-scroll="">
      <div data-catalog-views="">
        {([['external', '库外发现'], ['library', '馆藏探索']] as const).map(([key, label]) =>
          <FilterPill key={key} data-entity-tag={key} data-entity-press="" pressed={scope === key} onPress={() => { setScope(key); setTag('') }}>{label}</FilterPill>)}
        <span data-entity-sep="" aria-hidden="true" />
      </div><div data-catalog-tags="" dangerouslySetInnerHTML={waiting ? { __html: javTagSkeleton() } : undefined}>
        {waiting ? null : tags.map(name => <FilterPill key={name} data-catalog-tag={name} data-entity-press="" pressed={tag === name} onPress={() => setTag(tag === name ? '' : name)}>
          {name}<span data-count-badge="">{all.filter(item => item.tags?.includes(name)).length}</span>
        </FilterPill>)}
      </div></div>} bottom={<>
        <span data-catalog-readout="">{waiting ? <span data-skeleton="count" aria-hidden className="relative inline-block h-3.5 w-37.5 rounded-md align-middle skeleton-sheen" /> : `${items.length} 部`}</span>
        <LibraryShortcuts currentHref={() => location.pathname + location.search} />
        {query || tag ? <GlassPill onPress={() => { setTag(''); clearText() }}>清除筛选</GlassPill> : null}
        <span data-entity-sorts="">
        {scope === 'external' ? <FilterIconButton data-entity-batch="" data-jav-metadata-update=""
          label={metadata?.status === 'running' ? '停止读取' : '更新资料'}
          disabled={waiting} data-skeleton-action={waiting ? '' : undefined} busy={!!metadataAction.busy}
          icon={metadata?.status === 'running' ? MetadataStopGlyph : MetadataRefreshGlyph}
          onPress={() => updateMetadata(metadata?.status === 'running' ? 'stop' : 'update')} /> : null}
        <Segments label="JAV 卡片版式" value={layout} options={JAV_LAYOUTS} onChange={storeJavLayout} />
        <SortKeys sorts={DISCOVERY_SORTS.map(([key, label, ariaLabel]) => ({ key, label, ariaLabel,
          pressed: key === sort, dir: direction }))} onSort={key => {
          if (key === sort) setAscending(!ascending); else { setSort(key as DiscoverySort); setAscending(key === 'code') }
        }} /></span>
      </>} />
    {waiting ? <div role="status" aria-label="正在读取推荐" dangerouslySetInnerHTML={{ __html: javContentSkeleton('discover', layout) }} /> : null}
    {discoveries.error ? <Note tone="error" title="推荐未取得">{errorMessage(discoveries.error)}</Note> : null}
    {scope === 'external' && metadata?.status === 'running' ? <div data-jav-metadata="" className="min-w-0"><TaskProgress
        label={`正在读取作品资料 · ${metadata.completed} / ${metadata.total} 部`} value={metadata.completed} total={metadata.total} /></div> : null}
    {metadata && metadata.status !== 'running' && (metadata.status !== 'complete' || metadata.failed > 0)
      ? <Note tone="neutral" action={<Button variant="secondary" {...busyProps(metadataAction.busy === 'retry')}
        aria-label="立即重试读取作品资料" onClick={() => updateMetadata('retry')}>立即重试</Button>}>{metadata.message || `作品资料 ${metadata.completed} / ${metadata.total} 部`}</Note> : null}
    {metadataAction.error ? <Note tone="error">{metadataAction.error}</Note> : null}
    {!waiting && !discoveries.error && !items.length ? <EmptyState icon={RiCompassLine} title={query || tag ? '没有符合条件的推荐' : '暂无匹配口味的作品'}
      actions={<><ButtonLink size="small" href="/taste" variant="secondary">查看口味</ButtonLink>
        {query || tag ? <Button variant="primary" size="small" onClick={() => { clearText(); changeTag(''); writeJavQuery({ q: '', tag: '' }) }}>清除筛选</Button>
        : scope === 'library' ? <ButtonLink variant="primary" size="small" href="/">浏览馆藏</ButtonLink>
        : <Button variant="primary" size="small" onClick={() => resource({})}>查找作品</Button>}</>}>
      {query || tag ? '清除筛选后查看其他作品。' : scope === 'library' ? '观看或标记作品后，可以探索少看的馆藏。' : '可以查找番号，或更新关注来源。'}
    </EmptyState> : null}
    {action.error ? <Note tone="error">{action.error}</Note> : null}
    <div data-media-grid="" className={JAV_RECOMMENDATION_GRID} style={{ '--card-ratio': ratio } as CSSProperties}>
      {items.map(item => {
        const recommendation = recommendationScore(item.taste_score ?? item.score);
        const scoreDetails = [recommendation.label, `口味 ${discoveryScore(item.taste_score ?? item.score)}`,
          discoveries.data?.ranking_method === 'mmr' && item.ranking_score != null ? `排序 ${discoveryScore(item.ranking_score)}` : '',
          item.source_score != null ? `来源评分 ${item.source_score.toFixed(1)} / 5` : '', ...(item.reasons || [])].filter(Boolean).join(' · ');
        return <DiscoveryCard key={item.id} item={item} layout={layout} javImage={settings.value.javImage} readOnly={readOnly}
          navigate={navigate} tag={tag} onTag={setTag} wanting={action.busy === String(item.id)}
          onWant={() => { void action.run(String(item.id), signal => addWant({ code: item.code }, signal), () => {
            receipt('已加入想要'); void invalidateWants(); void discoveries.refetch();
          }) }}
          onResource={() => resource(resourcePrefill(item))}
          badge={<button data-jav-taste-score="" type="button" title={scoreDetails} aria-label={`推荐分 ${recommendation.score}，${recommendation.label}`}
            className="rounded-md outline-none focus-visible:ring-2 focus-visible:ring-border-focus-ring">
            <Chip color={recommendation.color}>{recommendation.label}</Chip>
          </button>} />;
      })}
    </div>
  </section>;
}
