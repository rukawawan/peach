import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { entityFaceImg } from '@peach/card-art';
import { entityPath, esc, firstGrapheme, fmtSize } from '@peach/legacy/core';
import { confirmModal } from '@peach/legacy/ui';
import { Button } from '@/components/base/buttons/button';
import { cx } from '@/utils/cx';

import { errorMessage } from '../../api';
import { BATCH_DELETE_TEXT } from '../../cleanup-tool-skeletons';
import { entityDisplayName, nameFallback } from '../../core/entity-names';
import { DataTable, type DataColumn } from '../components/data-table';
import { Fieldset, FieldsetTitle } from '../components/fieldset';
import { LEGACY_AVATAR_IMG } from '../components/legacy-avatar';
import { Note } from '../components/note';
import { IndexSearch } from '../index/index-search';
import { queryClient } from '../query';
import { busyProps } from '../settings/busy-props';
import { useEntityNames } from '../use-entity-names';
import { TRASH_KEY } from './data-cleanup';
import {
  deletePerformerVideos, fetchDeletePerformers, fetchDeletePlan, PERFORMER_DELETE_KEY,
  type DeletePerformer, type PerformerDeleteResult,
} from './performer-delete';

function PerformerName({ person }: { person: DeletePerformer }) {
  const name = entityDisplayName('performer', person.k, person.entity_id);
  const fallback = nameFallback('performer', person.k, person.entity_id);
  return <a href={entityPath('performer', person.k, person.entity_id)} title={fallback || name}
    className="flex min-w-0 items-center gap-3 text-text-primary">
    <span aria-hidden className={cx('relative flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-background-quaternary-default text-caption-1-medium', LEGACY_AVATAR_IMG)}
      dangerouslySetInnerHTML={{ __html: `<span>${esc(firstGrapheme(name))}</span>` + entityFaceImg({
        kind: 'performer', id: person.entity_id, hasImage: person.has_image, version: person.image_version,
        focus: person.avatar_focus, thumb: true,
      }) }} />
    <span className="min-w-0 wrap-anywhere">{name}</span>
  </a>;
}

export function PerformerDeleteCard({ toast }: { toast(message: string): void }) {
  useEntityNames();
  const query = useQuery({ queryKey: PERFORMER_DELETE_KEY, queryFn: ({ signal }) => fetchDeletePerformers(signal) });
  const [selected, setSelected] = useState<string[]>([]);
  const [search, setSearch] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<PerformerDeleteResult | null>(null);
  const [error, setError] = useState('');
  const request = useRef<AbortController | null>(null);
  useEffect(() => () => request.current?.abort(), []);

  const columns = useMemo<DataColumn<DeletePerformer>[]>(() => [
    { id: 'name', label: '女优', width: 280, min: 160, value: person => person.k,
      render: person => <PerformerName person={person} /> },
    { id: 'works', label: '影片', width: 104, min: 80, value: person => person.n,
      render: person => `${person.n.toLocaleString()} 部` },
    { id: 'files', label: '文件', width: 104, min: 80, value: person => person.file_count,
      render: person => `${person.file_count.toLocaleString()} 个` },
    { id: 'bytes', label: '登记大小', width: 136, min: 104, value: person => person.bytes,
      render: person => fmtSize(person.bytes) },
  ], []);
  const needle = search.toLocaleLowerCase();
  const items = (query.data?.items || []).filter(person => !needle || [person.k,
    entityDisplayName('performer', person.k, person.entity_id), ...person.aliases,
  ].some(name => name.toLocaleLowerCase().includes(needle)));

  const remove = async (chosen: DeletePerformer[], clear: () => void) => {
    if (busy) return;
    setBusy(true);
    setError('');
    const controller = new AbortController();
    request.current = controller;
    try {
      const plan = await fetchDeletePlan(chosen.map(person => person.entity_id), controller.signal);
      controller.signal.throwIfAborted();
      if (!plan.total) { toast('所选女优没有可删除的影片'); return }
      const names = plan.performers.map(person => entityDisplayName('performer', person.name, person.id));
      const examples = [...new Set(plan.items.map(item => item.code || item.name || `#${item.id}`))];
      const done = await confirmModal({
        title: '删除所选女优的全部影片',
        body: `将永久删除 ${names.slice(0, 5).join('、')}${names.length > 5 ? `等 ${names.length} 位女优` : ''} 关联的 ${plan.total} 个影片文件（登记大小 ${fmtSize(plan.bytes)}）。`
          + '范围包含全部来源和回收站，不受当前搜索、排序或分页影响。文件、影片资料和观看记录将永久删除，无法恢复；女优档案和照片保留。'
          + (plan.shared ? `其中 ${plan.shared} 个文件还关联了未勾选的女优，删除后也会从她们的作品中消失。` : '')
          + `涉及：${examples.slice(0, 5).join('、')}${examples.length > 5 ? `等 ${examples.length} 部作品` : ''}。`,
        confirmLabel: '永久删除影片', danger: true,
        onConfirm: () => deletePerformerVideos(plan),
      });
      if (!done.confirmed) return;
      const outcome = done.result as PerformerDeleteResult;
      setResult(outcome);
      clear();
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: PERFORMER_DELETE_KEY, exact: true }),
        queryClient.invalidateQueries({ queryKey: TRASH_KEY, exact: true }),
      ]);
      toast(`已永久删除 ${outcome.purged} 个影片文件${outcome.blocked.length ? `，${outcome.blocked.length} 个未删除` : ''}`);
    } catch (cause) {
      if (!controller.signal.aborted) setError(errorMessage(cause));
    } finally {
      if (!controller.signal.aborted) setBusy(false);
    }
  };

  const failures = result ? [
    ...result.blocked, ...result.cleanup_pending,
    ...result.cache_blocked.map(item => ({ path: item.name, reason: item.reason })),
  ] : [];
  return <section id="batch-delete" className="flex min-w-0 scroll-mt-20 flex-col gap-3" aria-label="批量删除">
    {query.isPending || query.isError ? <Fieldset layout="stack" labelledBy="batch-delete-title">
      <FieldsetTitle id="batch-delete-title">批量删除</FieldsetTitle>
      {query.isError ? <Note tone="error" title="读取女优列表失败"
        action={<Button variant="secondary" size="small" onClick={() => void query.refetch()}>重试</Button>}>
        {errorMessage(query.error)}</Note> : <p role="status" className="text-body-regular text-text-secondary">正在读取女优列表…</p>}
    </Fieldset> : <DataTable label="女优影片" title="批量删除" titleId="batch-delete-title" unit="位女优"
      description={BATCH_DELETE_TEXT} items={items} columns={columns}
      rowId={person => String(person.entity_id)} rowLabel={person => entityDisplayName('performer', person.k, person.entity_id)}
      selected={selected} onSelected={setSelected}
      toolbarActions={<IndexSearch label="搜索女优姓名或别名" value={search} onQuery={value => { setSearch(value); setSelected([]) }} />}
      actions={(chosen, clear) => <Button variant="danger" size="small" {...busyProps(busy)}
        onClick={() => void remove(chosen, clear)}>删除所选女优影片</Button>} />}
    {error ? <Note tone="error" title="未能读取删除清单">{error}</Note> : null}
    {result ? <Note tone={failures.length ? 'warning' : 'info'} title={`已永久删除 ${result.purged} 个影片文件`}
      extra={failures.length ? <div className="flex flex-col gap-2 text-body-2-regular wrap-anywhere">
        {failures.slice(0, 5).map((item, index) => <p key={index}>{item.path}（{item.reason}）</p>)}
      </div> : null}>
      {failures.length
        ? `${result.blocked.length} 个文件未能删除，馆藏记录仍保留；${result.cleanup_pending.length} 个隔离文件和 ${result.cache_blocked.length} 个缓存文件待清理。`
        : '所选影片及关联记录已删除，女优档案和照片保留。'}
    </Note> : null}
  </section>;
}
