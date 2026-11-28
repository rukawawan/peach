import { useRef, useState, type ReactNode } from 'react';
import { Button } from '@/components/base/buttons/button';
import { CloudDownloadDialog, type DownloadPrefill } from '../activity/cloud-download-dialog';
import { JAV_TABS, javPath, javTab, useJavAddress, writeJavQuery, type Discovery } from './jav';
import { queryClient } from '../query';
import { WANTS_KEY, type Want } from '../wants/wants';
import { librarySuggest, localSuggest } from '../search/library-suggest';
import type { SuggestOption } from '../follow-manage/follow-search';
import { JAV_SEARCH_LABELS } from './jav-navigation';
import { SortableBoardTabs } from '../components/navigation-order';
import { IndexSearch } from '../index/index-search';
import { FilterSearch } from '../components/filter-glass';
import { t } from '../../i18n';

/** 页头一行：标题、分区自己的筛选框（同名册页的 `IndexSearch`，靠右）、查找资源。有筛选浮层的分区
 *  查找在浮层里（`JavGlassSearch`），不传；馆藏用目录那条浮层的。 */
export function JavHeader({ tab, navigate, find, search }: {
  tab: string; navigate(path: string): void; find(): void; search?: ReactNode;
}) {
  return <div className="flex w-full flex-col gap-4">
    <div className="flex min-w-0 flex-wrap items-center gap-3 max-board-narrow:gap-x-2">
      <h2 data-page-title="" className="text-display-4-medium text-text-primary max-board-narrow:text-title-1-medium">JAV</h2>
      {search}
      <Button variant="primary" className={search ? 'flex-none' : 'ml-auto flex-none'} onClick={find}>{t('catalog:shared.searchTorrents')}</Button>
    </div>
    <SortableBoardTabs group="jav" tabs={JAV_TABS.map(([value, label]) => ({ value, label }))} value={tab}
      label={t('catalog:javTabs.label')} className="" onChange={key => navigate(javPath(key))} />
  </div>;
}

/* 各分区筛选框的候选：新作由服务端按女优与厂牌筛，候选取馆藏补全；发现与想要的数据已经整份在本机，
   从取回的那一批里抽番号、人名、厂牌与标签。 */
const cached = <T,>(key: readonly unknown[]) => queryClient.getQueriesData<{ items?: T[] }>({ queryKey: key }).flatMap(([, data]) => data?.items ?? []);
const JAV_SUGGEST: Record<string, (term: string, signal: AbortSignal) => Promise<SuggestOption[]>> = {
  releases: librarySuggest(['performer', 'studio']),
  discover: localSuggest(() => cached<Discovery>(['jav-discoveries']),
    work => [work.code, work.studio, ...(work.performer_refs?.map(ref => ref.name) ?? work.performers.split(/[,，、;/]/)), ...(work.tags ?? [])]),
  wants: localSuggest(() => cached<Want>(WANTS_KEY), want => [want.code, want.studio, ...(want.performers || '').split(/[,，、;/]/)]),
};
const NO_SUGGEST = async () => [] as SuggestOption[];

/** 没有筛选浮层的分区，查找留在页头。 */
const HEADER_SEARCH = new Set(['wants']);

/** 新作、发现、在线目录浮层下排的查找：词就是地址里的 `q`，候选同原来页头那一枚。 */
export function JavGlassSearch({ tab }: { tab: string }) {
  const shown = useJavAddress();
  return <FilterSearch label={JAV_SEARCH_LABELS[tab] || ''} value={new URLSearchParams(shown.search).get('q') || ''}
    onQuery={q => writeJavQuery({ q })} suggest={JAV_SUGGEST[tab] ? { key: `jav-${tab}`, load: JAV_SUGGEST[tab]! } : undefined} />;
}

/** 五个分区共用的常驻页头：换分区时这一棵不拆，页签的选中底板从上一格滑到下一格，标题原地不动。
 *  分区取自地址（详情压在上面时取它下面那一页），筛选词就是地址里的 `q`；显隐由壳按表面切。
 *  地址不在 JAV 上时页头藏着，选中的那一格停在离开时的分区：回到同一个分区时底板不必再滑一次。 */
export function JavPageHeader({ navigate, receipt }: { navigate(path: string): void; receipt(message: string): void }) {
  const [download, setDownload] = useState<DownloadPrefill | null>(null);
  const shown = useJavAddress();
  const params = new URLSearchParams(shown.search);
  const last = useRef('library');
  if (shown.pathname === '/jav') last.current = javTab(params.get('tab'));
  else if (shown.pathname === '/' && params.get('jav') === '1') last.current = 'library';
  const tab = last.current;
  const label = shown.pathname === '/jav' && HEADER_SEARCH.has(tab) ? JAV_SEARCH_LABELS[tab] : undefined;
  return <>
    <JavHeader tab={tab} navigate={navigate} find={() => setDownload({})}
      search={label ? <IndexSearch key={tab} label={label} value={params.get('q') || ''} onQuery={q => writeJavQuery({ q })}
        suggest={{ key: `jav-${tab}`, load: JAV_SUGGEST[tab] ?? NO_SUGGEST }} /> : undefined} />
    <CloudDownloadDialog prefill={download} close={() => setDownload(null)} receipt={receipt} />
  </>;
}
