/* 统计页：数据库此刻的样子。
 *
 * 一屏回答两层问题。上面四张卡既是读数也是页签——馆藏、看过、内容标签、使用空间，点哪张
 * 就在下面展开哪一层的细节；再下面那块按维度排：内容标签排行、最近看过、标签来源。
 * 四张卡同时当页签是因为这一页没有别的主动作，读数本身就是入口。
 *
 * 页签走 React Aria 的 `Tabs`：`role=tablist`／`tab`／`tabpanel`、左右方向键与游标式
 * `tabindex` 都由它给，注册表里的 `tabs` 条目是页面级导航，不是这种同页切块。
 * 体积与来源名共用 `src/core/index.ts` 的口径；标签的界面名称由遗留层的 `tagLabel` 递进来。 */
import {
  RiDatabase2Line, RiEyeLine, RiHardDrive2Line, RiHistoryLine, RiPriceTag3Line, RiVideoLine,
} from '@remixicon/react';
import { useQuery } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { Tab, TabList, TabPanel, Tabs } from 'react-aria-components';

import { fmtSize, LOC } from '@peach/legacy/core';
import { MEDIA_SOURCE_ICONS } from '@peach/legacy/ui';

import { settingsPath } from '@peach/history';
import { ButtonLink } from '@/components/base/buttons/button';

import { errorMessage } from '../../api';
import type { StatsProps } from '../bundle';
import { BarCard } from '../charts/bar-card';
import { CHART_COLORS } from '../charts/chart-card';
import { ActivityHeat } from '../charts/heat-card';
import { cardClass } from '../components/card';
import { EmptyState } from '../components/empty-state';
import { ExpandableRanking } from '../components/expandable-ranking';
import { Note } from '../components/note';
import { ConnectionStatus } from '../components/connection-status';
import { StatusLabel } from '../components/status-label';
import { Page } from '../components/page';
import { Progress } from '../components/progress';
import { SEGMENT, SEGMENTED_TRACK, SegmentedTabList } from '../components/segmented';
import { StatCard, statCardClass, STAT_STRIP } from '../components/stat-card';
import { RadialCard } from './radial-card';
import {
  bandRows, fetchStats, fmtCount, known, lengthRows, mediumRows, percentText, playedFor, playedItemUrl,
  reachedShare, replayRows, STATS_KEY, watchedShare, watchNote,
  type Attribution, type Count, type RecentPlay, type StatsData, type StorageVolume, type TagSource, type TopTag,
} from './stats';
import { codedText } from '../../core/server-text';
import { t } from '../../i18n';

/** 空馆藏与没有存储来源时「添加媒体」去的那一栏设置。 */
const MEDIA_SETTINGS = settingsPath('library');

/** 收起时露这么多条排行。三十条一次铺开会把下面两个面板整个顶到屏外。 */
const RANKING_PREVIEW = 10;

/** 图表色跟着上面那张读数卡的强调色走：馆藏是 `chart-6`，看过是 `chart-5`（`StatCard` 的 `accent`）。 */
const INVENTORY_COLOR = CHART_COLORS[5];
const VIEWING_COLOR = CHART_COLORS[4];

const CARD = `${cardClass()} flex flex-col gap-4`;

/** 图表页头大数旁的单位，按数量取单复数。 */
const VIDEO_UNIT = (count: number) => t('manage:radialCard.videoUnit', { count });
const VIEWING_UNIT = (count: number) => t('manage:stats.viewingUnit', { count });

const NO_VIDEO_HINT = t('manage:stats.noVideoHint');
const NO_TAG_HINT = t('manage:stats.noTagHint');
const NO_WATCH_HINT = t('manage:stats.noWatchHint');
const NO_TAG_SOURCE_HINT = t('manage:stats.noTagSourceHint');
const NO_VOLUME_HINT = t('manage:stats.noVolumeHint');
const NO_LIBRARY_HINT = t('manage:stats.noLibraryHint');
const NO_LENGTH_HINT = t('manage:stats.noLengthHint');
const NO_QUALITY_HINT = t('manage:stats.noQualityHint');
const NO_PLAY_TIME_HINT = t('manage:stats.noPlayTimeHint');
const NO_REPLAY_HINT = t('manage:stats.noReplayHint');

/** 进度条的读数：超出总数时按满格画，读屏值也不越过上限。 */
const within = (value: number, max: number) => Math.min(Math.max(value, 0), max);

/** 一格事实：一个名字配一个数。面取浮层那一档（旧 `.insightfacts .kv` 的 `--surface`），
 *  比卡面亮一级。 */
function Fact({ term, value }: { term: string; value: Count }) {
  return (
    <div className="flex min-h-16 min-w-0 flex-col gap-1.5 rounded-2lg bg-background-primary-default p-3">
      <span className="text-caption-1-regular text-text-secondary">{term}</span>
      <b className="text-title-3-medium tabular-nums text-text-primary">{fmtCount(value)}</b>
    </div>
  );
}

/** 一条带进度的覆盖率：读数、占比与那条条共用同一对分子分母。 */
function Coverage({ term, value, total }: { term: string; value: Count; total: number }) {
  const max = Math.max(total, 1);
  return (
    <div className="flex flex-col gap-1.5 border-b border-separator-border py-3 last:border-b-0">
      <p className="flex items-baseline justify-between gap-3 text-body-2-regular text-text-primary">
        <span>{term}</span>
        <b className="tabular-nums">
          {fmtCount(value)}
          {known(value)
            ? <span className="ml-1.5 text-caption-1-regular text-text-secondary">{percentText(value, total)}</span>
            : null}
        </b>
      </p>
      <Progress meter label={t('manage:shared.termProgress', { term, value: fmtCount(value), total: total.toLocaleString() })}
        value={known(value) ? within(value, max) : 0} max={max} />
    </div>
  );
}

/** 详情那一格的左栏：一句分类、一个大数、一句它的单位。
 *
 * 两栏之间不画线：旧 `board.css` 专门把 `.insightcopy` 的 `border-right` 清成 `border:0`，
 * 一张填充卡里再切一刀，看起来就是两张卡挤在一起。 */
function Headline({ term, figure, unit }: { term: string; figure: string; unit: string }) {
  return (
    <div className="flex shrink-0 flex-col gap-0.5 pb-5 md:w-64 md:pr-6 md:pb-0">
      <span className="text-caption-1-regular text-text-secondary">{term}</span>
      <b className="text-display-4-medium tabular-nums text-text-primary">{figure}</b>
      <span className="text-body-2-regular text-text-secondary">{unit}</span>
    </div>
  );
}

/** 详情那一格：左边一个读数，右边它的展开。 */
function Detail({ headline, children }: { headline: ReactNode; children: ReactNode }) {
  return (
    <div className={`${CARD} md:flex-row md:gap-6`}>
      {headline}
      <div className="min-w-0 grow">{children}</div>
    </div>
  );
}

function InventoryDetail({ data }: { data: StatsData } & StatsProps) {
  const videos = data.by_loc.reduce((sum, row) => sum + row.videos, 0);
  if (!videos) {
    return (
      <EmptyState icon={RiVideoLine} title={t('manage:stats.noVideosTitle')} actions={
        <>
          <ButtonLink variant="secondary" href="/subscriptions?tab=add" size="small">{t('manage:stats.newFollow')}</ButtonLink>
          <ButtonLink variant="primary" href={MEDIA_SETTINGS} size="small">{t('manage:shared.addMedia')}</ButtonLink>
        </>
      }>{NO_VIDEO_HINT}</EmptyState>
    );
  }
  return (
    <div className="flex flex-col gap-5">
      <div className="inline-grid w-full gap-5 md:grid-cols-2">
        <RadialCard title={t('manage:stats.cloudAndLocal')} empty={NO_VIDEO_HINT} rows={data.by_loc.map((row) => (
          { name: LOC[row.k] ?? row.k, value: row.videos, bytes: row.bytes, mark: MEDIA_SOURCE_ICONS[row.k] || 'database' }))} />
        <RadialCard title={t('manage:shared.library')} empty={NO_LIBRARY_HINT} rows={data.by_library.map((row) => (
          { name: row.name, value: row.videos, bytes: row.bytes, mark: MEDIA_SOURCE_ICONS[row.icon] || row.icon || 'database' }))} />
      </div>
      <div className="inline-grid w-full gap-5 md:grid-cols-2 xl:grid-cols-3">
        <BarCard title={t('manage:shared.duration')} unit={VIDEO_UNIT} series={t('manage:processingTraffic.sourceVideos')} color={INVENTORY_COLOR}
          rows={lengthRows(data.by_length)} empty={NO_LENGTH_HINT} />
        <BarCard title={t('manage:shared.quality')} unit={VIDEO_UNIT} series={t('manage:processingTraffic.sourceVideos')} color={INVENTORY_COLOR}
          rows={bandRows(data.by_quality)} empty={NO_QUALITY_HINT} />
        <BarCard title={t('manage:stats.fileTypes')} unit={(count) => t('manage:stats.itemsUnit', { count })} series={t('manage:stats.itemsSeries')} color={INVENTORY_COLOR} layout="horizontal"
          rows={mediumRows(data.by_medium)} empty={NO_VIDEO_HINT} />
      </div>
    </div>
  );
}

/** 看过那一层的图：最近一次播放落在什么时候，和每个作品播了几次。 */
function ViewingCharts({ data }: { data: StatsData }) {
  return (
    <>
      <ActivityHeat activity={data.play_activity} title={t('manage:stats.playTimes')} dailyTitle={t('manage:stats.dailyPlays')}
        words={{ unit: VIEWING_UNIT, series: t('manage:shared.video'), cell: (count) => t('manage:stats.viewingCell', { count }) }} tone={5} empty={NO_PLAY_TIME_HINT} />
      <BarCard title={t('manage:stats.plays')} unit={VIEWING_UNIT} series={t('manage:shared.video')} color={VIEWING_COLOR}
        rows={replayRows(data.replays)} empty={NO_REPLAY_HINT} />
    </>
  );
}

function CoverageDetail({ attribution }: { attribution: Attribution }) {
  const videos = attribution.videos;
  return (
    <div className="flex flex-col">
      <Coverage term={t('manage:stats.hasCreator')} value={attribution.creator} total={videos} />
      <Coverage term={t('manage:stats.hasCode')} value={attribution.code} total={videos} />
      <Coverage term={t('manage:stats.hasLabel')} value={attribution.studio} total={videos} />
      <Coverage term={t('manage:stats.framesExtracted')} value={attribution.thumb} total={videos} />
      <Coverage term={t('manage:stats.durationProbed')} value={attribution.duration} total={videos} />
    </div>
  );
}

/** 一个卷一行，与覆盖率同一个节律：名字配已用量与占比，下面一条进度，再下面一行小字
 *  写它挂在哪、还剩多少。取不到容量的卷不画进度，读数那一格换成它的状态。 */
function VolumeRow({ volume }: { volume: StorageVolume }) {
  const total = volume.total;
  const used = volume.used ?? 0;
  const label = codedText(volume, 'label');
  return (
    <article className="flex min-w-0 flex-col gap-1.5 border-b border-separator-border py-3 last:border-b-0">
      <header className="flex items-baseline justify-between gap-3 text-body-2-regular text-text-primary">
        <h3 className="min-w-0 break-words">{label}</h3>
        {total != null ? (
          <b className="whitespace-nowrap tabular-nums">
            {fmtSize(used)}
            <span className="ml-1.5 text-caption-1-regular text-text-secondary">{percentText(used, total)}</span>
          </b>
        ) : volume.online ? <StatusLabel>{t('manage:stats.capacityNotFound')}</StatusLabel> : <ConnectionStatus online={false} />}
      </header>
      {total != null
        ? <Progress meter label={t('manage:stats.volumeUsage', { volume: label })} value={within(used, Math.max(total, 1))} max={Math.max(total, 1)} />
        : null}
      <p className="flex justify-between gap-3 text-caption-1-regular text-text-secondary">
        <span className="min-w-0 break-words">{volume.root ?? t('manage:stats.notMapped')}</span>
        {total != null
          ? <span className="whitespace-nowrap tabular-nums">{t('manage:stats.volumeFreeTotal', { free: fmtSize(volume.free ?? 0), total: fmtSize(total) })}</span>
          : null}
      </p>
    </article>
  );
}

function StorageDetail({ volumes }: { volumes: StorageVolume[] } & StatsProps) {
  if (!volumes.length) {
    return (
      <EmptyState icon={RiHardDrive2Line} title={t('manage:stats.noStorageTitle')} actions={
        <ButtonLink variant="primary" href={MEDIA_SETTINGS} size="small">{t('manage:shared.addMedia')}</ButtonLink>
      }>{NO_VOLUME_HINT}</EmptyState>
    );
  }
  return (
    <div className="flex flex-col">
      {volumes.map((volume) => <VolumeRow key={`${volume.kind}:${volume.label}`} volume={volume} />)}
    </div>
  );
}

function TagRanking({ tags, tagLabel, onTag, hasMedia }: { tags: TopTag[]; hasMedia: boolean } & StatsProps) {
  if (!tags.length) {
    return (
      <EmptyState icon={RiPriceTag3Line} title={t('manage:stats.noContentTagsTitle')}
        actions={<ButtonLink variant="secondary" href={hasMedia ? '/data-cleanup' : '/settings/library'} size="small">{hasMedia ? t('manage:shared.fillInMetadata') : t('manage:shared.addMedia')}</ButtonLink>}>{NO_TAG_HINT}</EmptyState>
    );
  }
  return (
    <ExpandableRanking previewCount={RANKING_PREVIEW}
      className="inline-grid w-full gap-x-6 gap-y-1 sm:grid-cols-2">
        {tags.map((tag, index) => (
          <li key={`${tag.k}:${index}`} className="min-w-0">
            <button type="button" onClick={() => onTag(tag.k)}
              className="flex min-h-11 w-full min-w-0 cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2 text-left outline-none focus-visible:ring-2 focus-visible:ring-border-focus-ring">
              <span className="w-6 shrink-0 text-caption-1-regular tabular-nums text-text-secondary">{index + 1}</span>
              <span className="min-w-0 grow text-body-2-regular break-words text-text-primary">{tagLabel(tag.k)}</span>
              <b className="text-body-2-medium tabular-nums text-text-secondary">{tag.n.toLocaleString()}</b>
            </button>
          </li>
        ))}
    </ExpandableRanking>
  );
}

function RecentWatches({ rows, hasMedia }: { rows: RecentPlay[]; hasMedia: boolean }) {
  if (!rows.length) {
    return (
      <EmptyState icon={RiHistoryLine} title={t('manage:stats.noWatchHistoryTitle')}
        actions={<ButtonLink variant="secondary" href={hasMedia ? '/' : '/settings/library'} size="small">{hasMedia ? t('manage:shared.browseCollection') : t('manage:shared.addMedia')}</ButtonLink>}>{NO_WATCH_HINT}</EmptyState>
    );
  }
  return (
    <div className="flex flex-col gap-5">
      {rows.map((row) => {
        const real = watchedShare(row);
        return (
          <article key={`${row.kind}:${row.id}`} className="flex flex-wrap items-center gap-x-6 gap-y-2">
            <div className="min-w-0 grow basis-64">
              <h3 className="min-w-0 text-body-2-medium text-text-primary">
                <a href={playedItemUrl(row)} data-middle-truncate
                  className="block max-w-full overflow-hidden whitespace-nowrap hover:underline">{row.name}</a>
              </h3>
              <p className="flex flex-wrap gap-3 text-caption-1-regular text-text-secondary">
                {row.creator ? <span className="min-w-0 wrap-anywhere">{row.creator}</span> : null}
                <span>{watchNote(row)}</span>
              </p>
            </div>
            <div className="min-w-0 basis-40">
              <Progress meter label={t('manage:stats.watchedShare', { percent: real.toFixed(0) })} value={real} />
              <small className="mt-1.5 block text-caption-1-regular text-text-secondary">
                {t('manage:stats.watchedReached', { watched: real.toFixed(0), reached: reachedShare(row).toFixed(0) })}
              </small>
            </div>
          </article>
        );
      })}
    </div>
  );
}

function TagSources({ sources, videos }: { sources: TagSource[]; videos: number }) {
  if (!sources.length) {
    return (
      <EmptyState icon={RiPriceTag3Line} title={t('manage:stats.noTagSourcesTitle')}
        actions={<ButtonLink variant="secondary" href={videos ? '/data-cleanup' : '/settings/library'} size="small">{videos ? t('manage:shared.fillInMetadata') : t('manage:shared.addMedia')}</ButtonLink>}>{NO_TAG_SOURCE_HINT}</EmptyState>
    );
  }
  return (
    <div className="inline-grid w-full gap-x-8 gap-y-6 sm:grid-cols-2">
      {sources.map((source) => (
        <article key={source.k} className="flex min-w-0 flex-col gap-1.5">
          <header className="flex items-baseline justify-between gap-3">
            <h3 className="min-w-0 text-body-2-medium break-words text-text-primary">{source.k}</h3>
            <b className="text-body-2-medium whitespace-nowrap text-text-primary">
              {source.assets.toLocaleString()}
              <small className="ml-1 text-caption-1-regular font-normal text-text-secondary">{VIDEO_UNIT(source.assets)}</small>
            </b>
          </header>
          <Progress meter label={t('manage:stats.tagSourceCoverage', { source: source.k })} value={within(source.assets, Math.max(videos, 1))}
            max={Math.max(videos, 1)} />
          <small className="text-caption-1-regular text-text-secondary">{t('manage:stats.tagsCount', { count: source.n })}</small>
        </article>
      ))}
    </div>
  );
}

/** 一张既是读数也是页签的卡。选中态是换一档卡面再压一圈 2px 内描边，不靠加粗或换字色。 */
function MetricTab(
  { id, label, figure, detail, icon: Icon, accent }:
  { id: string; label: string; figure: string; detail: string; icon: typeof RiEyeLine; accent: number },
) {
  return (
    <Tab id={id} className={statCardClass({ interactive: true, selectable: true })}>
      <StatCard label={label} icon={Icon} accent={accent} figure={figure} footer={detail} />
    </Tab>
  );
}

export function StatsPage(props: StatsProps) {
  const stats = useQuery({ queryKey: STATS_KEY, queryFn: ({ signal }) => fetchStats(signal) });
  const data = stats.data;
  if (!data) {
    return (
      <Page>
        <Note tone="error" title={t('manage:stats.loadFailedTitle')}>{stats.error ? errorMessage(stats.error) : t('manage:stats.loadFailedHint')}</Note>
      </Page>
    );
  }
  const consumption = data.consumption;
  const storage = data.storage_summary;
  const videos = data.by_loc.reduce((sum, row) => sum + row.videos, 0);
  const bytes = data.by_loc.reduce((sum, row) => sum + row.bytes, 0);
  const coverage = known(data.tag_cov) ? percentText(data.tag_cov, data.attribution.videos) : t('manage:shared.notFound');
  const covered = `${fmtCount(data.tag_cov)} / ${data.attribution.videos.toLocaleString()}`;
  return (
    <Page>
      <Tabs defaultSelectedKey="inventory" className="flex flex-col gap-4">
        <TabList aria-label={t('manage:stats.viewsLabel')} className={STAT_STRIP}>
          <MetricTab id="inventory" label={t('manage:statsSkeleton.collection')} icon={RiDatabase2Line} accent={0}
            figure={videos.toLocaleString()} detail={fmtSize(bytes)} />
          <MetricTab id="viewing" label={t('manage:shared.watched')} icon={RiEyeLine} accent={1}
            figure={fmtCount(consumption.played)} detail={playedFor(consumption.play_seconds)} />
          <MetricTab id="coverage" label={t('manage:statsSkeleton.contentTags')} icon={RiPriceTag3Line} accent={2}
            figure={coverage} detail={covered} />
          <MetricTab id="storage" label={t('manage:statsSkeleton.spaceUsed')} icon={RiHardDrive2Line} accent={3}
            figure={t('manage:stats.volumeCount', { count: storage.online })}
            detail={storage.measured ? t('manage:stats.usedSize', { size: fmtSize(storage.used) }) : t('manage:stats.capacityNotFound')} />
        </TabList>
        <TabPanel id="inventory"><InventoryDetail data={data} {...props} /></TabPanel>
        <TabPanel id="viewing" className="flex flex-col gap-5">
          <Detail headline={<Headline term={t('manage:stats.watchedTerm')} figure={fmtCount(consumption.played)} unit={t('manage:stats.videosWithPlays', { count: consumption.played ?? 0 })} />}>
            <div className="inline-grid w-full gap-3 sm:grid-cols-2">
              <Fact term={t('manage:stats.watchedInCollection')} value={consumption.library_played} />
              <Fact term={t('manage:stats.watchedOnline')} value={consumption.online_played} />
              <Fact term={t('manage:stats.climaxCount')} value={consumption.o_total} />
              <Fact term={t('manage:stats.skimmed')} value={consumption.skimmed} />
              <Fact term={t('manage:shared.like')} value={consumption.liked} />
              <Fact term={t('manage:stats.disliked')} value={consumption.dislike} />
              <Fact term={t('manage:stats.seenIt')} value={consumption.seen} />
              <Fact term={t('manage:managePages.trash')} value={consumption.trash} />
            </div>
          </Detail>
          <ViewingCharts data={data} />
        </TabPanel>
        <TabPanel id="coverage">
          <Detail headline={<Headline term={t('manage:stats.contentTagCoverage')} figure={coverage} unit={covered} />}>
            <CoverageDetail attribution={data.attribution} />
          </Detail>
        </TabPanel>
        <TabPanel id="storage">
          <Detail headline={<Headline term={t('manage:statsSkeleton.spaceUsed')} figure={storage.measured.toLocaleString()} unit={t('manage:stats.volumesMeasured', { count: storage.measured })} />}>
            <StorageDetail volumes={data.storage_volumes} {...props} />
          </Detail>
        </TabPanel>
      </Tabs>
      {/* 旧 `.insightpanel`：整块一张 16px 的填充卡，页签是卡内顶上那条分段控件。 */}
      <Tabs defaultSelectedKey="tags" className={`${cardClass({ padding: 'none' })} flex flex-col`}>
        <div className="px-4 pt-3">
          <SegmentedTabList aria-label={t('manage:stats.breakdownsLabel')} className={SEGMENTED_TRACK}>
            <Tab id="tags" className={SEGMENT}>{t('manage:statsSkeleton.contentTags')}</Tab>
            <Tab id="recent" className={SEGMENT}>{t('manage:stats.recentlyWatched')}</Tab>
            <Tab id="sources" className={SEGMENT}>{t('manage:stats.tagSources')}</Tab>
          </SegmentedTabList>
        </div>
        <TabPanel id="tags" className="px-4 pt-3.5 pb-4"><TagRanking tags={data.top_tags} hasMedia={videos > 0} {...props} /></TabPanel>
        <TabPanel id="recent" className="px-4 pt-3.5 pb-4"><RecentWatches rows={data.recent} hasMedia={videos > 0} /></TabPanel>
        <TabPanel id="sources" className="px-4 pt-3.5 pb-4">
          <TagSources sources={data.tag_source} videos={data.attribution.videos} />
        </TabPanel>
      </Tabs>
    </Page>
  );
}
