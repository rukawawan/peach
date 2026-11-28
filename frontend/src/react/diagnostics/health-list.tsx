import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { RiEyeLine, RiEyeOffLine, RiFileCopyLine, RiFileListLine, RiPlayLine } from '@remixicon/react';
import { Button } from '@/components/base/buttons/button';
import { LinkButton } from '@/components/base/buttons/link-button';
import { fmtDur, fmtSize, LOC } from '@peach/legacy/core';
import { DataTable, type DataColumn } from '../components/data-table';
import { EmptyState } from '../components/empty-state';
import { ItemLibrary } from '../components/library-label';
import { useLibraryTints } from '../components/library-tint';
import { Note } from '../components/note';
import { Disclosure, Stack } from '../settings/section';
import { busyProps, useAction } from '../settings/use-action';
import { DIAGNOSTICS_KEY, type LibraryGroup, type LibraryItem } from './diagnostics';
import { codedText } from '../../core/server-text';
import { t } from '../../i18n';
import { apiGet, apiSend } from '../../api';
import type { TableFilters } from '../components/use-table-filters';
import { useLibraryFilterOptions } from '../components/library-filter-options';

const identity = (item: LibraryItem) => item.title || item.name || item.code || t('manage:healthList.videoFallback', { id: item.id });
const listText = (items: LibraryItem[], libraryName: (item: LibraryItem) => string) => [
  [t('manage:shared.video'), t('manage:shared.code'), t('manage:shared.fileName'), t('manage:shared.library'), t('manage:shared.path'), t('manage:healthList.durationSeconds'), t('manage:healthList.sizeBytes')],
  ...items.map(item => [identity(item), item.code ?? '', item.name, libraryName(item),
    item.path, item.duration ?? '', item.size ?? '']),
].map(row => row.map(value => String(value ?? '').replace(/[\t\r\n]+/g, ' ')).join('\t')).join('\n');

export function HealthList({ group: original, groupKey, openItem, receipt }: {
  group: LibraryGroup; groupKey: string; openItem(id: number): void; receipt(message: string): void;
}) {
  const [filters, setFilters] = useState<TableFilters>({});
  const [ignored, setIgnored] = useState(false);
  const queryClient = useQueryClient();
  const encoded = JSON.stringify(filters);
  const query = useQuery({ queryKey: ['diagnostics-library', groupKey, encoded, ignored], enabled: ignored || encoded !== '{}',
    queryFn: ({ signal }) => apiGet<LibraryGroup>(`/api/diagnostics/library?${new URLSearchParams({
      group: groupKey, column_filters: encoded, view: ignored ? 'ignored' : 'active',
    })}`, signal) });
  const group = query.data ?? (ignored ? { ...original, items: [], count: original.ignored_count ?? 0 } : original);
  const libraryOptions = useLibraryFilterOptions();
  const action = useAction();
  const label = codedText(group, 'label');
  const [selected, setSelected] = useState<string[]>([]);
  const tints = useLibraryTints({ names: true });
  const libraryName = (item: LibraryItem) => tints.get(item.library_id || '')?.name || LOC[item.location] || item.location;
  const copy = (items: LibraryItem[]) => void action.run('copy',
    () => navigator.clipboard.writeText(listText(items, libraryName)), () => receipt(t('manage:healthList.copied')));
  const changeIgnored = (items: LibraryItem[]) => void action.run('ignore', async (signal) => {
    await apiSend('/api/diagnostics/library/ignored', { group: groupKey, ids: items.map(item => item.id), ignore: !ignored }, 'POST', signal);
    setSelected([]);
    await Promise.all([queryClient.invalidateQueries({ queryKey: DIAGNOSTICS_KEY }),
      queryClient.invalidateQueries({ queryKey: ['diagnostics-library', groupKey] })]);
  }, () => receipt(t(ignored ? 'manage:healthList.restored' : 'manage:healthList.ignored')));
  const ignoreLabel = t(ignored ? 'manage:healthList.restoreIssue' : 'manage:healthList.ignoreIssue');
  const columns: DataColumn<LibraryItem>[] = [
    /* 标题与作品列表同一个截法：从头读起，长了折到第二行再截尾，全名在悬停提示里。 */
    { id: 'title', label: t('manage:shared.video'), value: identity, width: 172, min: 160, render: item => <span className="flex min-w-0 flex-col items-start gap-1">
      <LinkButton variant="primary" title={identity(item)} data-health-title=""
        className="max-w-full justify-start whitespace-normal text-left"
        onClick={() => openItem(item.id)}><span className="line-clamp-2 wrap-anywhere">{identity(item)}</span></LinkButton>
      {item.name && item.name !== identity(item)
        ? <span data-middle-truncate title={item.name} className="block min-w-0 max-w-full text-caption-1-regular text-text-secondary">{item.name}</span> : null}
    </span> },
    { id: 'actions', label: t('manage:healthList.actions'), width: 128, min: 128, required: true, render: item =>
      <Button size="small" variant="secondary" data-health-ignore={item.id}
        aria-label={t(ignored ? 'manage:healthList.restoreRow' : 'manage:healthList.ignoreRow', { name: identity(item) })}
        disabled={query.isFetching || !!action.busy} onClick={() => changeIgnored([item])}>{ignoreLabel}</Button> },
    { id: 'code', label: t('manage:shared.code'), width: 144, value: item => item.code || '',
      render: item => <span className="whitespace-nowrap">{item.code || t('manage:shared.unrecognized')}</span> },
    { id: 'location', label: t('manage:shared.library'), width: 160, value: libraryName,
      filter: { values: item => item.library_id || 'none', option: id => libraryOptions.get(id) ?? { label: id === 'none' ? t('cleanup:shared.none') : id } },
      render: item => <ItemLibrary libraryId={item.library_id} location={item.location} fallback={t('manage:shared.notFound')} /> },
    { id: 'path', label: t('manage:healthList.filePath'), width: 320, min: 180, value: item => item.path,
      render: item => <span data-middle-truncate title={item.path}
        className="block min-w-0 w-full text-body-2-regular text-text-secondary">{item.path || t('manage:shared.notFound')}</span> },
    { id: 'duration', label: t('manage:shared.duration'), width: 112, value: item => item.duration ?? 0,
      filter: { range: 'duration', value: item => item.duration || null },
      render: item => item.duration && item.duration > 0 ? fmtDur(item.duration) : t('manage:shared.notFound') },
    { id: 'size', label: t('manage:shared.size'), width: 112, value: item => item.size ?? 0,
      filter: { range: 'size', value: item => item.size },
      render: item => item.size !== null ? fmtSize(item.size) : t('manage:shared.notFound') },
  ];
  const count = ignored ? original.count : group.count;
  return <Disclosure summary={count === null ? `${label} · ${t('manage:shared.notFound')}` : t('manage:healthList.groupSummary', { label, count })}>
    {group.count === null ? <Note tone="neutral">{t('manage:healthList.listNotFound')}</Note> : <Stack>
        {original.ignored_count || ignored ? <Button size="small" variant="secondary" className="self-start"
          disabled={action.busy === 'ignore'} onClick={() => { setIgnored(!ignored); setSelected([]); setFilters({}) }}>
          {ignored ? t('manage:healthList.showActive') : t('manage:healthList.showIgnored', { count: original.ignored_count })}
        </Button> : null}
        {action.error ? <Note tone="error">{action.error}</Note> : null}
        {query.isError ? <Note tone="error">{String(query.error)}</Note> : null}
        {!group.items.length && !query.isFetching && encoded === '{}' && !query.isError
          ? <EmptyState icon={RiFileListLine} title={t(ignored ? 'manage:healthList.noIgnored' : 'manage:healthList.emptyTitle')}
            size="compact">{ignored ? null : t('manage:healthList.emptyBody')}</EmptyState>
          : <>
        <div className="flex flex-wrap items-center justify-between gap-2">
          {group.truncated ? <span className="text-body-2-regular text-text-secondary">
            {t('manage:healthList.loadedCount', { loaded: group.items.length, count: group.count })}
          </span> : null}
          <Button size="small" variant="secondary" {...busyProps(action.busy === 'copy')}
            onClick={() => copy(group.items)}>{t('manage:healthList.copyList')}</Button>
        </div>
        {action.error ? <Note tone="error">{action.error}</Note> : null}
        {query.isError ? <Note tone="error">{String(query.error)}</Note> : null}
        <DataTable preferenceId={`diagnostics-health-${groupKey}`} label={label} title={t('manage:healthList.tableTitle')} unit={t('manage:healthList.tableUnit')} panel={false}
          busy={query.isFetching}
          filters={{ values: filters, facets: group.column_facets ?? {}, onChange: setFilters }}
          items={group.items} columns={columns} rowId={item => String(item.id)} rowLabel={identity}
          selected={selected} onSelected={setSelected}
          contextOperations={item => [
            { id: 'open', label: t('catalog:mediaActions.open'), icon: RiPlayLine, run: () => openItem(item.id) },
            { id: 'copy', label: t('manage:healthList.copyRow'), icon: RiFileCopyLine,
              disabled: action.busy === 'copy', run: () => copy([item]) },
            { id: 'ignore', label: ignoreLabel, icon: ignored ? RiEyeLine : RiEyeOffLine,
              disabled: action.busy === 'ignore' || query.isFetching, run: () => changeIgnored([item]) },
          ]}
          actions={() => []} controls={items => <>
            <Button size="small" variant="secondary" {...busyProps(action.busy === 'copy')}
              onClick={() => copy(items)}>{t('manage:healthList.copySelected')}</Button>
            <Button size="small" variant="secondary" disabled={query.isFetching} {...busyProps(action.busy === 'ignore')}
              onClick={() => changeIgnored(items)}>{ignoreLabel}</Button>
          </>} />
        </>}
      </Stack>}
  </Disclosure>;
}
