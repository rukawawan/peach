import { useSyncExternalStore } from 'react';
import { appSettingsStore } from '../../appearance/settings';
import { orderLibraries } from '../../library-catalog';

/** 实例顺序只用于主界面的媒体库列表，首启页的来源颜色独立加载。 */
export function useOrderedLibraries<T>(rows: readonly T[], id: (row: T) => string): T[] {
  const store = appSettingsStore();
  useSyncExternalStore(store.subscribe, store.version);
  return orderLibraries(rows, store.value.libraryOrder, id);
}
