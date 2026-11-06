/** 目录与筛选查询共用当前媒体库；显式查询范围优先。 */
export function libraryScopedPath(path: string): string {
  if (!/^\/api\/(items|facets|search\/recommendations)([?#]|$)/.test(path)) return path;
  const fragment = path.indexOf('#');
  const address = fragment < 0 ? path : path.slice(0, fragment);
  const suffix = fragment < 0 ? '' : path.slice(fragment);
  const query = address.indexOf('?');
  if (new URLSearchParams(query < 0 ? '' : address.slice(query + 1)).has('library')) return path;
  const library = sessionStorage.getItem('peach.library');
  if (!library) return path;
  const separator = query < 0 ? '?' : address.endsWith('?') || address.endsWith('&') ? '' : '&';
  return `${address}${separator}library=${encodeURIComponent(library)}${suffix}`;
}
