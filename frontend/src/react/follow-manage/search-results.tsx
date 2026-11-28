import type { ReactNode } from 'react';
import { RiExternalLinkLine } from '@remixicon/react';
import { createColumnHelper, flexRender, rowSelectionFeature, tableFeatures, useTable, type RowSelectionState } from '@tanstack/react-table';

import { LinkButton } from '@/components/base/buttons/link-button';
import { Checkbox } from '@/components/base/checkbox/checkbox';
import { Table, TableBody, TableCell, TableColumn, TableHeader, TableRow } from '@/components/base/table/table';
import type { FaceRef } from '../../card-art/markup';
import { t } from '../../i18n';
import { ColumnFilterAvatar } from '../components/column-filter-avatar';
import { DataTableFrame } from '../components/data-table-frame';
import { SiteIcon } from '../components/source-label';
import { TableSelectionHeader } from '../components/table-selection-header';
import { SourceIcon } from './source-view';

export interface SearchResult {
  id: string;
  name: string;
  selectionName?: string;
  provider: string;
  providerLabel: string;
  url: string;
  details?: ReactNode;
  portrait?: FaceRef;
  avatar?: string | null;
  selectable?: boolean;
  picked?: boolean;
}

const features = tableFeatures({ rowSelectionFeature });
const column = createColumnHelper<typeof features, SearchResult>();
const columns = column.columns([
  column.display({ id: 'select',
    cell: ({ row }) => <Checkbox slot={null}
      aria-label={t('follow:shared.selectNamed', {
        name: `${row.original.providerLabel} · ${row.original.selectionName ?? row.original.name}`,
      })}
      isSelected={row.getIsSelected()} isDisabled={!row.getCanSelect()} onChange={value => row.toggleSelected(value)} /> }),
  column.display({ id: 'name', header: () => t('follow:searchResults.name'),
    cell: ({ row: { original: item } }) => <div className="flex min-w-0 items-center gap-2">
      <ColumnFilterAvatar size="medium" person={{ ...item.portrait, name: item.name, source_avatar_url: item.avatar ?? undefined }} />
      <div className="flex min-w-0 flex-col gap-0.5">
        <span className="text-body-medium wrap-anywhere text-text-primary">{item.name}</span>
        {item.details ? <div className="text-caption-1-regular wrap-anywhere text-text-secondary">{item.details}</div> : null}
      </div>
    </div> }),
  column.display({ id: 'provider', header: () => t('follow:searchResults.source'),
    cell: ({ row: { original: item } }) => <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
      {item.provider === 'javdb' || item.provider === 'dmm'
        ? <SiteIcon site={item.provider} /> : <SourceIcon provider={item.provider} />}{item.providerLabel}
    </span> }),
  column.display({ id: 'address', header: () => t('follow:searchResults.address'),
    cell: ({ row: { original: { url } } }) => <LinkButton href={url} target="_blank" rel="noopener noreferrer"
      size="small" trailingIcon={RiExternalLinkLine} title={url} aria-label={url} className="min-w-0 justify-start [&>span]:min-w-0">
      <span data-middle-truncate="" className="block truncate">{url.replace(/^https?:\/\//, '')}</span>
    </LinkButton> }),
]);

export function SearchResults({ label, items, onPick }: {
  label: string; items: SearchResult[]; onPick?(id: string, value: boolean): void;
}) {
  const rowSelection: RowSelectionState = Object.fromEntries(items.filter(item => item.picked).map(item => [item.id, true]));
  const table = useTable({
    features, data: items, columns, getRowId: item => item.id, state: { rowSelection },
    enableRowSelection: row => row.original.selectable !== false,
    onRowSelectionChange: updater => {
      const next = typeof updater === 'function' ? updater(rowSelection) : updater;
      for (const item of items) {
        const value = Boolean(next[item.id]);
        if (item.selectable !== false && value !== Boolean(rowSelection[item.id])) onPick?.(item.id, value);
      }
    },
  });
  const hasSelectable = items.some(item => item.selectable !== false);
  return (
    <DataTableFrame follow onRowClick={onPick ? id => table.getRow(id).toggleSelected() : undefined}
      onRectangle={onPick && hasSelectable ? (keys, add) => table.setRowSelection({
        ...(add ? rowSelection : {}), ...Object.fromEntries(keys.map(key => [key, true])),
      }) : undefined}>
      <Table aria-label={label} size="sm" className="min-w-144 table-fixed">
        <TableHeader>
          {table.getHeaderGroups()[0]!.headers.filter(header => onPick || header.id !== 'select').map(header => (
            <TableColumn key={header.id} id={header.id} isRowHeader={header.id === 'name'}
              className={header.id === 'select' ? 'w-12' : header.id === 'provider' ? 'w-36' : header.id === 'address' ? 'w-52' : undefined}>
              {header.id === 'select'
                ? <TableSelectionHeader table={table} label={t('shell:dataTable.selectAll', { label })} disabled={!hasSelectable} />
                : <span className="text-body-2-semibold">{flexRender(header.column.columnDef.header, header.getContext())}</span>}
            </TableColumn>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows.map(row => (
            <TableRow key={row.id} id={row.id} data-board-selected={row.getIsSelected() || undefined}
              data-rectangle-disabled={!row.getCanSelect() || undefined}>
              {row.getAllCells().filter(cell => onPick || cell.column.id !== 'select').map(cell => (
                <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </DataTableFrame>
  );
}
