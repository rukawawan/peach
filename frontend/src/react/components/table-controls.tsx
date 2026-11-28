import type { RefObject } from 'react';
import type { SortingState } from '@tanstack/react-table';
import { Button } from '@/components/base/buttons/button';
import { Select, SelectItem } from './select';
import { Pagination } from './table-pagination';
import { SortDirectionIcon } from './icon-swap';
import { t } from '../../i18n';

export function DataTableSort({ label, options, sorting, onChange }: {
  label: string; options: { id: string; label: string }[]; sorting: SortingState;
  onChange(next: SortingState): void;
}) {
  const current = sorting[0];
  return <span className="flex flex-none items-center gap-2">
    <Select aria-label={t('shell:tableSort.label', { table: label })} prefix={t('shell:shared.sort')} selectedKey={current?.id ?? 'default'}
      onSelectionChange={(key) => {
        if (key !== null) onChange(key === 'default' ? [] : [{ id: String(key), desc: current?.desc ?? false }]);
      }}>
      <SelectItem id="default">{t('shell:tableSort.defaultOrder')}</SelectItem>
      {options.map((option) => <SelectItem key={option.id} id={option.id}>{option.label}</SelectItem>)}
    </Select>
    <Button variant="secondary" iconOnly disabled={!current}
      leadingIcon={SortDirectionIcon} data-icon-state={current?.desc ? 'b' : 'a'}
      aria-label={t(current?.desc ? 'shell:tableSort.toAscending' : 'shell:tableSort.toDescending', { table: label })}
      onClick={() => { if (current) onChange([{ ...current, desc: !current.desc }]); }} />
  </span>;
}

type PagePosition = { pageIndex: number; pageSize: number };

/** 范围、每页条数和页码沿用关注列表的同一行布局。 */
export function DataTableFooter({ label, total, pagination, onChange, scrollTarget, stickyHeader, unit = t('shell:dataTable.recordUnit'), pageUnit = t('shell:tablePagination.pageUnit'), pageSizes = [10, 20, 50, 100] }: {
  label: string; total: number; pagination: PagePosition;
  onChange(next: PagePosition): void;
  scrollTarget?: RefObject<HTMLElement | null>;
  stickyHeader?(): HTMLElement | null;
  unit?: string; pageUnit?: string;
  pageSizes?: readonly number[];
}) {
  const pages = Math.max(1, Math.ceil(total / pagination.pageSize));
  const pageIndex = Math.min(pagination.pageIndex, pages - 1);
  const start = total ? pageIndex * pagination.pageSize + 1 : 0;
  const end = Math.min((pageIndex + 1) * pagination.pageSize, total);
  const change = (next: PagePosition) => {
    onChange(next);
    if (!scrollTarget || (next.pageIndex === pageIndex && next.pageSize === pagination.pageSize)) return;
    requestAnimationFrame(() => {
      const target = scrollTarget.current;
      if (!target?.getClientRects().length) return;
      // 根滚动区的 scroll-padding 已给顶栏让位，有吸顶筛选栏的表再留出筛选栏的实际高度。
      const height = stickyHeader?.()?.getBoundingClientRect().height;
      const margin = target.style.scrollMarginBlockStart;
      if (height) target.style.scrollMarginBlockStart = `${height + 8}px`;
      target.scrollIntoView({ block: 'start', inline: 'nearest', behavior: 'instant' });
      if (height) target.style.scrollMarginBlockStart = margin;
    });
  };
  return <div data-table-pagination className="flex flex-wrap items-center justify-between gap-3">
    <span className="mr-auto text-body-2-regular tabular-nums text-text-secondary">
      {`${start.toLocaleString()}–${end.toLocaleString()} / ${total.toLocaleString()} ${unit}`}
    </span>
    <div data-toolbar-actions="">
    <Select aria-label={t('shell:tablePagination.pageSize')} size="sm" selectedKey={String(pagination.pageSize)}
      onSelectionChange={(key) => { if (key !== null) change({ pageIndex: 0, pageSize: Number(key) }); }}>
      {pageSizes.map((size) => <SelectItem key={size} id={String(size)}>{t('shell:tablePagination.perPage', { count: size, unit: pageUnit })}</SelectItem>)}
    </Select>
    <Pagination label={t('shell:tablePagination.label', { table: label })} page={pageIndex + 1} pages={pages}
      onPage={(page) => change({ ...pagination, pageIndex: page - 1 })} />
    </div>
  </div>;
}
