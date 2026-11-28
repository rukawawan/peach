import { useEffect, useMemo, useRef, useState } from 'react';
import { useMutationState, useQuery } from '@tanstack/react-query';
import type { ResizableTableContainerProps } from 'react-aria-components';
import type { ColumnVisibilityState, OnChangeFn } from '@tanstack/react-table';
import { clearLegacyTableLayout, orderTableColumns, readLegacyTableLayout, type LegacyTableKeys,
  type TableLayout, type TableLayoutChange } from '../../table-column-order';
import { errorMessage } from '../../api';
import { esc } from '../../core';
import { t } from '../../i18n';
import { queryClient } from '../query';
import { fetchSettings, SETTINGS_KEY, settingsMutationKey, useSaveSettings, type SettingsPatch } from '../settings-panel/settings-data';
import { showToast } from '../toaster';

export interface TableColumnSpec {
  id: string; label: string; width?: number; min?: number; max?: number; required?: boolean; visible?: boolean; flex?: boolean;
}

const LAYOUT_SCOPE = 'table-layouts';
const NO_LAYOUT: TableLayout = {};

function useInstanceTableLayout(id: string, legacyKeys?: LegacyTableKeys) {
  const legacyId = legacyKeys?.order ?? id;
  const legacy = useMemo(() => readLegacyTableLayout(id, legacyKeys), [id, legacyId, legacyKeys?.widths, legacyKeys?.visibility]);
  const query = useQuery({ queryKey: SETTINGS_KEY, queryFn: ({ signal }) => fetchSettings(signal) }, queryClient);
  const save = useSaveSettings(LAYOUT_SCOPE);
  const pending = useMutationState<TableLayoutChange | undefined>({
    filters: { mutationKey: settingsMutationKey(LAYOUT_SCOPE), exact: true, status: 'pending' },
    select: mutation => (mutation.state.variables as SettingsPatch | undefined)?.tableLayouts?.[id],
  }, queryClient);
  const remote = query.data?.tableLayouts?.[id] ?? NO_LAYOUT;
  const migration = useRef<'attempted' | 'done' | null>(null);
  const hasLegacy = Object.keys(legacy).length > 0;
  const legacyMissing = (Object.keys(legacy) as (keyof TableLayout)[]).some(field => remote[field] === undefined);
  useEffect(() => {
    if (migration.current === 'done' || !hasLegacy || query.data?.tableLayouts === undefined) return;
    if (!legacyMissing) {
      clearLegacyTableLayout(id, legacyKeys);
      migration.current = 'done';
      return;
    }
    if (migration.current || pending.some(Boolean)) return;
    migration.current = 'attempted';
    save.mutate({ tableLayouts: { [id]: { legacy } } });
  }, [hasLegacy, id, legacy, legacyKeys, legacyMissing, pending, query.data?.tableLayouts, save.mutate]);

  const layout: TableLayout = { ...legacy, ...remote };
  for (const change of pending) Object.assign(layout, change);
  const commit = (patch: TableLayout) => save.mutate({
    tableLayouts: { [id]: { ...patch, ...(legacyMissing && { legacy }) } },
  }, {
    onError: cause => showToast(`table-layout-${id}`, {
      html: esc(t('shell:tableColumns.saveFailed', { error: errorMessage(cause) })), alert: true, timeout: 6000, action: null,
    }),
  });
  return { layout, commit };
}

/** 列偏好跟实例的用户设置走，列宽拖动中的草稿只保留在当前页面。 */
export function useTablePreferences<Column extends TableColumnSpec>(id: string, columns: readonly Column[], keys?: LegacyTableKeys) {
  const { layout, commit } = useInstanceTableLayout(id, keys);
  const [viewportWidth, setViewportWidth] = useState(0);
  const columnSizes = useMemo(() => Object.fromEntries(columns.map(column => [column.id, {
    width: column.width ?? 180, min: column.min ?? 96, max: column.max ?? (column.flex ? 2000 : 800), flex: column.flex,
  }])), [columns]);
  const visibleCount = columns.filter(column => column.id !== 'select' && (column.required
    || (layout.visibility?.[column.id] ?? column.visible !== false))).length;
  // 窄屏给下一列留一点可见区域。实例存的像素宽度在宽屏回来后照原值显示。
  const viewportMax = viewportWidth > 0 && viewportWidth <= 600 && visibleCount > 1 ? Math.max(96, viewportWidth - 56) : Infinity;
  const sizes = Object.fromEntries(Object.entries(columnSizes).map(([key, size]) => [key, {
    ...size, min: Math.min(size.min, viewportMax), max: Math.min(size.max, viewportMax), width: Math.min(size.width, viewportMax),
  }]));
  const bounded = (value: Record<string, unknown>): Record<string, number | '1fr'> => Object.fromEntries(Object.entries(sizes).map(([key, size]) => {
    const width = value[key];
    return [key, typeof width === 'number' && Number.isFinite(width) ? Math.max(size.min, Math.min(size.max, width))
      : size.flex ? '1fr' : size.width];
  }));
  const [draftWidths, setDraftWidths] = useState<Record<string, number | '1fr'> | null>(null);
  // 旧版会保存整张表的默认像素值。默认名称宽度仍采用自适应。
  const savedWidths = Object.fromEntries(Object.entries(layout.widths ?? {}).filter(([key, width]) =>
    !columnSizes[key]?.flex || columnSizes[key].width !== width));
  const widths = draftWidths ?? bounded(savedWidths);
  const resize: NonNullable<ResizableTableContainerProps['onResize']> = values =>
    setDraftWidths(bounded({ ...savedWidths, ...Object.fromEntries(values) }));
  const save = (values: Parameters<NonNullable<ResizableTableContainerProps['onResizeEnd']>>[0], column?: string) => {
    setDraftWidths(null);
    if (!column || typeof values.get(column) !== 'number') return;
    const width = bounded(Object.fromEntries(values))[column];
    if (typeof width === 'number') commit({ widths: { ...savedWidths, [column]: width } });
  };
  const reset = () => { setDraftWidths(null); commit({ widths: {} }) };

  const validVisibility = (value?: ColumnVisibilityState): ColumnVisibilityState => Object.fromEntries(columns
    .filter(column => !column.required)
    .map(column => [column.id, value?.[column.id] ?? column.visible !== false]));
  const visibility = validVisibility(layout.visibility);
  const change: OnChangeFn<ColumnVisibilityState> = updater =>
    commit({ visibility: validVisibility(typeof updater === 'function' ? updater(visibility) : updater) });
  const orderedColumns = useMemo(() => orderTableColumns(columns, layout.order), [columns, layout.order]);
  const columnOrder = useMemo(() => orderedColumns.map(column => column.id), [orderedColumns]);
  const defaultOrder = columns.map(column => column.id);
  const changeOrder = (next: string[]) => commit({ order: orderTableColumns(columns, next).map(column => column.id) });
  const resetOrder = () => commit({ order: [] });
  const flexible = columns.some(column => column.flex && visibility[column.id] !== false && widths[column.id] === '1fr');
  return { widths, resize, save, reset, setViewportWidth, visibility, change, columns: orderedColumns, columnOrder, defaultOrder, changeOrder, resetOrder,
    spaceWidth: flexible ? 0 : '1fr' as const,
    // 自适应列只承接多出来的空间，手动调整前使用默认宽度作为下限。
    columnProps: (column: string) => widths[column] === '1fr'
      ? { width: '1fr' as const, minWidth: sizes[column]!.width, maxWidth: undefined }
      : { width: widths[column], minWidth: sizes[column]!.min, maxWidth: sizes[column]!.max },
    canResize: (column: string) => sizes[column]!.max > sizes[column]!.min,
  };
}
export type TablePreferences = ReturnType<typeof useTablePreferences>;
