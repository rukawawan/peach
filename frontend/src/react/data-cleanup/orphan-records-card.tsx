/* 数据管理页上的「孤儿记录」：文件已不在盘上、带着个人记录的作品（ADR-0087）。
 *
 * 每行一条已消失的作品：快照图供认片，后面是它带的记录、在库里可能是它新版本的文件。
 * 选一个文件接过去，记录搬到那个文件上、旧行删掉，整批可按批次号撤回；彻底删除连记录一起
 * 删，过危险档确认弹层。没有已消失的作品时整块不出现。 */
import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { confirmModal } from '@peach/legacy/ui';
import { LOC } from '@peach/legacy/core';

import { Button } from '@/components/base/buttons/button';
import { Select, SelectItem } from '../components/select';

import { errorMessage } from '../../api';
import { ORPHAN_RECORDS_TEXT } from '../../cleanup-tool-skeletons';
import { DataTable, type DataColumn } from '../components/data-table';
import { Fieldset, FieldsetTitle } from '../components/fieldset';
import { Note } from '../components/note';
import { spriteGlyph } from '../components/sprite-glyph';
import { queryClient } from '../query';
import { busyProps } from '../settings/use-action';
import {
  attachOrphan, candidateText, fetchOrphanRecords, ORPHAN_RECORDS_KEY, purgeOrphan, recordsText,
  type OrphanRecord,
} from './orphan-records';

const PLAY = spriteGlyph('play');

const refresh = () => queryClient.invalidateQueries({ queryKey: ORPHAN_RECORDS_KEY, exact: true });

function OrphanActions({ item, toast }: { item: OrphanRecord; toast(message: string): void }) {
  const [target, setTarget] = useState<number | null>(item.candidates[0]?.id ?? null);
  const attach = useMutation({
    mutationFn: () => attachOrphan(item.id, Number(target)),
    onSuccess: () => {
      const destination = item.candidates.find((candidate) => candidate.id === target);
      toast(`已将「${item.name}」的个人记录转移到「${destination?.name ?? '所选文件'}」`);
      void refresh();
    },
    onError: (error) => toast(errorMessage(error)),
  });
  const purge = useMutation({
    mutationFn: () => purgeOrphan(item.id),
    onSuccess: (data) => {
      toast(data.blocked.length
        ? `「${item.name}」的文件已恢复，记录未删除；下次扫描后恢复为在库状态`
        : `已删除「${item.name}」的作品记录及个人记录`);
      void refresh();
    },
  });
  const remove = () => {
    void confirmModal({
      title: '删除记录',
      body: `将删除「${item.name}」的作品记录${recordsText(item.records) ? `及其个人记录（${recordsText(item.records)}）` : ''}。此操作不可撤销。`,
      confirmLabel: '删除记录',
      danger: true,
      onConfirm: () => purge.mutateAsync(),
    });
  };
  const busy = attach.isPending || purge.isPending;
  return (
    <span className="flex min-w-0 flex-wrap items-center gap-2">
        <Button variant="danger" size="small" {...busyProps(busy)} onClick={remove}>删除记录</Button>
        {item.candidates.length
          ? <Select aria-label={`选择接收 ${item.name} 个人记录的文件`} prefix="接收" className="w-52" selectedKey={target}
              onSelectionChange={(key) => { if (key !== null) setTarget(Number(key)) }}>
              {item.candidates.map((candidate) => (
                <SelectItem key={candidate.id} id={candidate.id} textValue={candidateText(candidate)}>
                  {candidateText(candidate)}
                </SelectItem>
              ))}
            </Select>
          : null}
        {item.candidates.length
          ? <Button variant="primary" size="small" disabled={target === null} {...busyProps(busy)}
              onClick={() => attach.mutate()}>转移记录</Button>
          : null}
    </span>
  );
}

function OrphanIdentity({ item }: { item: OrphanRecord }) {
  return (
        <span className="flex min-w-0 items-center gap-3">
          {/* 快照图供认片；没有图或取不到时留一格带描边的占位，和重复文件页的封面格同一个样子。
              窄屏收起，把宽度让给名字与记录。 */}
          <span className="relative inline-grid aspect-16/10 w-24 flex-none place-items-center max-cleanup-tight:hidden overflow-hidden rounded-lg border border-separator-border bg-background-tertiary-default text-text-tertiary">
            <PLAY aria-hidden className="size-5" />
            {item.has_thumb
              ? <img src={`/thumb?id=${item.id}&c=4`} alt="" loading="lazy"
                  onError={(event) => event.currentTarget.remove()}
                  className="absolute inset-0 size-full object-contain" />
              : null}
          </span>
          <span className="flex min-w-0 flex-1 flex-col gap-0.5">
            <span title={item.name} className="truncate text-body-regular text-text-primary">{item.name}</span>
            <small className="truncate text-caption-1-regular text-text-secondary">
              {[item.code, LOC[item.location] || item.location].filter(Boolean).join(' · ')}
            </small>
          </span>
        </span>
  );
}

export function OrphanRecordsCard({ toast }: { toast(message: string): void }) {
  const [selected, setSelected] = useState<string[]>([]);
  const query = useQuery({ queryKey: ORPHAN_RECORDS_KEY, queryFn: ({ signal }) => fetchOrphanRecords(signal) });
  const items = query.data?.items ?? [];
  const purge = useMutation({
    mutationFn: (ids: number[]) => purgeOrphan(ids),
    onSuccess: (data) => {
      toast(`已删除 ${data.purged} 条作品记录及其个人记录${data.blocked.length ? `；${data.blocked.length} 条文件已恢复，记录未删除` : ''}`);
      setSelected([]); void refresh();
    },
  });
  const removeSelected = (chosen: OrphanRecord[]) => void confirmModal({
    title: '删除所选记录',
    body: `将删除以下 ${chosen.length} 条作品记录及其全部个人记录。此操作不可撤销。`,
    items: chosen.map((item) => item.name),
    confirmLabel: '删除所选记录', danger: true,
    onConfirm: () => purge.mutateAsync(chosen.map((item) => item.id)),
  });
  const columns: DataColumn<OrphanRecord>[] = [
    { id: 'item', label: '作品', width: 480, min: 320, value: (item) => item.name, render: (item) => <OrphanIdentity item={item} /> },
    { id: 'records', label: '个人记录', width: 176, min: 144, value: (item) => recordsText(item.records),
      render: (item) => <span className="block min-w-0 whitespace-normal wrap-anywhere">{recordsText(item.records) || '无'}</span> },
    { id: 'target', label: '操作', width: items.some(item => item.candidates.length) ? 360 : 128, min: 128, value: (item) => item.candidates.length,
      render: (item) => <OrphanActions item={item} toast={toast} /> },
  ];
  return (
    <section id="orphan-records" aria-labelledby="orphan-records-title" className="flex scroll-mt-20 flex-col gap-4">
        {query.isError
          ? <Fieldset layout="stack" labelledBy="orphan-records-title">
              <FieldsetTitle id="orphan-records-title">文件已丢失的记录</FieldsetTitle>
              <Note tone="error" title="读取文件已丢失的记录失败">{errorMessage(query.error)}</Note>
            </Fieldset>
          : <DataTable label="文件已消失的作品" items={items} columns={columns}
              title="文件已丢失的记录" titleId="orphan-records-title" unit="条作品"
              description={ORPHAN_RECORDS_TEXT}
              rowId={(item) => String(item.id)} rowLabel={(item) => item.name}
              selected={selected} onSelected={setSelected}
              actions={(chosen) => <Button variant="danger" size="small" disabled={!chosen.length}
                {...busyProps(purge.isPending)} onClick={() => removeSelected(chosen)}>
                {`删除所选记录（${chosen.length}）`}
              </Button>} />}
    </section>
  );
}
