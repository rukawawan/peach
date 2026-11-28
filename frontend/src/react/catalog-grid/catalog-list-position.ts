import { useSyncExternalStore, type Dispatch, type SetStateAction } from 'react';
import type { PaginationState, SortingState } from '@tanstack/react-table';
import { useRememberedPageSize } from '../components/page-size-preferences';

export interface CatalogListPosition {
  sorting: SortingState;
  pagination: PaginationState;
  filters: Record<string, string>;
}

const defaultPosition: CatalogListPosition = { sorting: [], pagination: { pageIndex: 0, pageSize: 20 }, filters: {} };
const positions = new Map<string, CatalogListPosition>();
const listeners = new Set<() => void>();

export const getCatalogListPosition = (scope: string) => positions.get(scope) ?? defaultPosition;

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => { listeners.delete(listener) };
}

export function useCatalogListPosition(scope: string) {
  const saved = useSyncExternalStore(subscribe, () => getCatalogListPosition(scope), () => defaultPosition);
  const [pageSize, rememberSize] = useRememberedPageSize('catalog');
  const position = saved.pagination.pageSize === pageSize ? saved : { ...saved, pagination: { pageIndex: 0, pageSize } };
  const setPosition: Dispatch<SetStateAction<CatalogListPosition>> = update => {
    const current = getCatalogListPosition(scope);
    const value = current.pagination.pageSize === pageSize ? current : { ...current, pagination: { pageIndex: 0, pageSize } };
    const next = typeof update === 'function' ? update(value) : update;
    positions.set(scope, next);
    rememberSize(next.pagination.pageSize);
    listeners.forEach(listener => listener());
  };
  return [position, setPosition] as const;
}
