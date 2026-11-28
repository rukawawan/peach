/* 文件面板独立于页面路由；打开、浏览与关闭不重建背后的馆藏。 */
const initial = new URLSearchParams(window.location.search);
let revision = 0;
let current: { search: string; revision: number } | null = initial.get('directory') === '1'
  ? { search: initial.toString(), revision } : null;
const listeners = new Set<() => void>();
export const directorySnapshot = () => current;
export function subscribeDirectory(listener: () => void) {
  listeners.add(listener);
  return () => { listeners.delete(listener) };
}
export function closeMediaDirectory() {
  current = null;
  listeners.forEach(listener => listener());
}

export function openMediaDirectory(asset?: number) {
  const params = new URLSearchParams();
  if (asset != null) params.set('directory_asset', String(asset));
  current = { search: params.toString(), revision: ++revision };
  listeners.forEach(listener => listener());
}
