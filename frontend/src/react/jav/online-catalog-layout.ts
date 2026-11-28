import { t } from '../../i18n';
import type { TableSnapshot } from '../catalog-grid/catalog-table-columns';

export const ONLINE_COLUMNS = [
  ['name', 'catalog:shared.video', 288],
  ['people', 'catalog:shared.performers', 208],
  ['studio', 'catalog:shared.label', 112],
  ['tags', 'catalog:shared.tags', 144],
  ['release', 'catalog:catalogList.releaseDate', 112],
  ['dur', 'catalog:catalogList.duration', 80],
  ['source', 'follow:searchResults.source', 112],
] as const;

export const ONLINE_TABLE_WIDTH = ONLINE_COLUMNS.reduce((total, [, , width]) => total + width, 0);

export function onlineTableSnapshot(): TableSnapshot {
  return ONLINE_COLUMNS.map(([id, label, width]) => ({ id, label: t(label), width, min: width }));
}

export const ONLINE_SORTS = [
  ['release', 'settings:sortOrder.releaseDate'],
  ['dur', 'catalog:catalogList.duration'],
  ['code', 'catalog:shared.code'],
] as const;
export type OnlineSortKey = typeof ONLINE_SORTS[number][0];

export function onlineSorting(params = new URLSearchParams(location.search)): { sort: OnlineSortKey; dir: 'asc' | 'desc' } {
  return { sort: ONLINE_SORTS.find(([key]) => key === params.get('sort'))?.[0] || 'release',
    dir: params.get('dir') === 'asc' ? 'asc' : 'desc' };
}

export const ONLINE_STATUS = [
  ['all', 'catalog:shared.all'],
  ['released', 'catalog:javOnline.released'],
  ['preOrder', 'catalog:javOnline.preOrder'],
] as const;
export type OnlineStatus = typeof ONLINE_STATUS[number][0];

export function onlineStatus(params = new URLSearchParams(location.search)): OnlineStatus {
  return ONLINE_STATUS.find(([key]) => key === params.get('status'))?.[0] || 'all';
}
