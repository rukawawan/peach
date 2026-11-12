/* 媒体库列表的页内共享：壳的媒体库切换器每次加载都取一次 `/api/libraries`，取到后交到这里，
 * 卡片的来源色与列表行的媒体库名直接读这一份，不再各自请求。来源色以服务端配置为准
 * （`media.library_catalog`，ADR-0116）；本机只缓存上一次的颜色，让首屏卡片不等接口就有色。 */

export interface LibraryRow {
  id: string; name: string; icon?: string; color?: string; policy?: string;
  roots?: { root_id?: string; location: string }[];
}

/** 新建媒体库接在自定义顺序末尾，已删除的 ID 不参与显示。 */
export function orderLibraries<T>(rows: readonly T[], keys: readonly string[], id: (row: T) => string): T[] {
  const rank = new Map(keys.map((key, index) => [key, index]));
  return [...rows].sort((a, b) => (rank.get(id(a)) ?? keys.length) - (rank.get(id(b)) ?? keys.length));
}

const CACHE_KEY = 'peach.library-colors.v1';
let rows: readonly LibraryRow[] | null = null;
const listeners = new Set<(rows: readonly LibraryRow[]) => void>();

/** 上一次服务端给的颜色 `{library_id: 强调色键}`，只作首屏用。 */
export function cachedLibraryColors(): Record<string, string> {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(CACHE_KEY) || '{}');
    return value && typeof value === 'object' ? value as Record<string, string> : {};
  } catch {
    return {};
  }
}

export function publishLibraries(next: readonly LibraryRow[]): void {
  rows = next;
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(Object.fromEntries(next.filter(row => row.color).map(row => [row.id, row.color]))));
  } catch { /* 存不下时下次首屏等接口再上色。 */ }
  listeners.forEach(listener => listener(next));
}

export function publishedLibraries(): readonly LibraryRow[] | null {
  return rows;
}

export function onLibraries(listener: (rows: readonly LibraryRow[]) => void): () => void {
  listeners.add(listener);
  return () => { listeners.delete(listener) };
}
