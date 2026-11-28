import { useState, useSyncExternalStore } from 'react';
import type { PaginationState } from '@tanstack/react-table';
import { appSettingsStore } from '../../appearance/settings';

export function rememberedPageSize(id: string, fallback = 20): number {
  return appSettingsStore().value.pageSizes[id] ?? fallback;
}

export function rememberPageSize(id: string, size: number): void {
  const store = appSettingsStore();
  store.value.pageSizes[id] = size;
  store.save();
}

export function useRememberedPageSize(id: string, fallback = 20) {
  const pageSize = useSyncExternalStore(appSettingsStore().subscribe, () => rememberedPageSize(id, fallback));
  return [pageSize, (size: number) => { if (size !== pageSize) rememberPageSize(id, size) }] as const;
}

export function useRememberedPagination(id: string) {
  const [pageIndex, setIndex] = useState(0);
  const [pageSize, setSize] = useRememberedPageSize(id);
  const pagination = { pageIndex, pageSize };
  const change = (update: PaginationState | ((value: PaginationState) => PaginationState)) => {
    const next = typeof update === 'function' ? update(pagination) : update;
    setIndex(next.pageIndex);
    setSize(next.pageSize);
  };
  return [pagination, change] as const;
}
