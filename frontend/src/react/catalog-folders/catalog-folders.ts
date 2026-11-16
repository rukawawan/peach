import { apiGet } from '../../api';
import { t } from '../../i18n';

export interface MediaFolder {
  id: string; location: string; path: string; name: string; parent: string | null; root: string;
  videos: number; files: number; has_children: boolean;
}
export type FolderPurpose = 'category' | 'creator' | 'performer' | 'seller' | 'studio';
export interface FolderRule {
  id: string; location: string; path: string; purpose: FolderPurpose; name: string;
  entity_id: number | null; recursive: boolean; future: boolean;
}
export interface FolderPage {
  roots: MediaFolder[]; children: MediaFolder[]; ancestors: MediaFolder[];
  selected: MediaFolder | null; matches: MediaFolder[]; rule: FolderRule | null;
  rules_revision: number; rules: FolderRule[];
  conflicts: { id: number; name: string; reason: string; reason_code?: string }[];
}
export interface FolderScope { loc?: string; library?: string }
export const PURPOSES: Record<FolderPurpose, string> = {
  category: t('catalog:folderRule.purposeCategory'), creator: t('catalog:folderRule.purposeCreator'), performer: t('catalog:folderRule.purposePeople'), seller: t('catalog:shared.sellers'), studio: t('catalog:shared.label'),
};
export function folderQuery(scope: FolderScope, folder = '', search = '') {
  const query = new URLSearchParams({ ...scope, folder, ...(search ? { q: search } : {}) });
  return {
    queryKey: ['catalog-folders', query.toString()], staleTime: 30_000,
    queryFn: ({ signal }: { signal: AbortSignal }) => apiGet<FolderPage>(`/api/folders?${query}`, signal),
  };
}

export function folderHref(address: { pathname: string; search: string }, patch: Record<string, string | null>) {
  const params = new URLSearchParams(address.search);
  for (const [key, value] of Object.entries(patch)) {
    if (value) params.set(key, value); else params.delete(key);
  }
  return address.pathname + (params.size ? `?${params}` : '');
}
