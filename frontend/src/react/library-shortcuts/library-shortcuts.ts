import { useMutation, useQuery } from '@tanstack/react-query';
import { apiGet, apiSend } from '../../api';
import { queryClient } from '../query';
import { entityPath } from '@peach/legacy/core';

export interface Favorite { key?: string; entity_id?: number; scope?: 'local' | 'online'; tag_id?: string; kind: string; name: string; favorite?: boolean; image_url?: string; image_label?: string; image_label_code?: string; image_label_params?: Record<string, unknown>; image_fallbacks?: string[] }
export interface SavedFilter { id: string; name: string; href: string }
export interface Shortcuts { favorites: Favorite[]; filters: SavedFilter[] }
export const SHORTCUTS_KEY = ['library-shortcuts'] as const;
const URL = '/api/library-shortcuts';

export function useShortcuts(enabled = true) {
  return useQuery({ queryKey: SHORTCUTS_KEY, queryFn: ({ signal }) => apiGet<Shortcuts>(URL, signal),
    enabled, refetchOnMount: enabled ? 'always' : false });
}
export function useShortcutWrite() {
  return useMutation({ mutationKey: SHORTCUTS_KEY,
    mutationFn: (body: Record<string, unknown>) => apiSend<Shortcuts>(URL, body),
    onSuccess: (data, body) => {
      queryClient.setQueryData(SHORTCUTS_KEY, data);
      if (body.action === 'favorite' && body.scope === 'online') {
        void queryClient.invalidateQueries({ queryKey: ['follow', 'tags'] });
        void queryClient.invalidateQueries({ queryKey: ['tag-management'] });
      }
    },
  });
}
export function isFavorite(rows: Favorite[], item: Favorite): boolean {
  return rows.some((row) => item.scope === 'online'
    ? row.scope === 'online' && row.tag_id === item.tag_id
    : row.scope !== 'online' && (item.entity_id ? row.entity_id === item.entity_id : row.kind === item.kind && row.name === item.name));
}
export function favoriteHref(item: Favorite): string {
  if (item.scope === 'online') return `/follow?${new URLSearchParams({ tag: item.name })}`;
  return entityPath(item.kind, item.name, item.entity_id);
}
