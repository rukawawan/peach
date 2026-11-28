import { useSyncExternalStore } from 'react';
import { appSettingsStore } from '../../appearance/settings';

export type CatalogView = 'cards' | 'list';
export function catalogView(): CatalogView {
  return appSettingsStore().value.catalogView;
}

export function setCatalogView(view: string) {
  const store = appSettingsStore();
  store.value.catalogView = view === 'list' ? 'list' : 'cards';
  store.save();
}

export const useCatalogView = () => useSyncExternalStore(appSettingsStore().subscribe, catalogView, () => 'cards' as const);
