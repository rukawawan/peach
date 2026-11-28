/* 首页和 AI 助手是跨馆藏入口，随后是关注、JAV、实体索引和已标记，管理放在底部。
   默认和可选入口与 `src/peach/web_settings.py` 的同名常量保持一致。 */
export const DEFAULT_SIDEBAR_ORDER: readonly string[] = ['', 'ai', 'follow', 'jav', 'performers', 'tags', 'studios', 'flagged', 'manage'];
export const OPTIONAL_SIDEBAR_KEYS: readonly string[] = ['playlists', 'immerse', 'stats', 'review', 'data-cleanup', 'trash', 'follow-manage', 'quality'];
const KNOWN_SIDEBAR_KEYS = new Set([...DEFAULT_SIDEBAR_ORDER, ...OPTIONAL_SIDEBAR_KEYS]);
/* 垃圾文件与重复文件两页并进了数据管理，存过的旧键换成它。 */
const sidebarKeyAlias = (key: string) => (key === 'ads' || key === 'dupes' ? 'data-cleanup' : key);

/** 当前可见入口按默认次序重排，额外入口接在其后。 */
export function resetSidebarOrder(order: readonly string[]): string[] {
  return [...DEFAULT_SIDEBAR_ORDER.filter(key => order.includes(key)),
    ...order.filter(key => !DEFAULT_SIDEBAR_ORDER.includes(key))];
}

/** 本机或数据库里读到的侧栏顺序：认旧键、去重、丢掉这一版没有的入口；一项不剩时回到默认顺序。 */
export function normalizeSidebarOrder(value: unknown): string[] {
  const keys = Array.isArray(value) ? value.filter((key): key is string => typeof key === 'string') : [];
  const order = [...new Set(keys.map(sidebarKeyAlias))].filter((key) => KNOWN_SIDEBAR_KEYS.has(key));
  return order.length ? order : [...DEFAULT_SIDEBAR_ORDER];
}

/** 侧栏筛选属于当前地址对应的内容集合；其余页面的侧栏只有导航。 */
export function sidebarHasCatalogContent(path: string): boolean {
  return ['/', '/unseen', '/watch-later', '/flagged', '/trash', '/junk-files'].includes(path)
    || /^\/assets\//.test(path)
    || /^\/(performers|studios|creators|series|agencies|tags)\/.+/.test(path);
}

/** 一条内容的同名标签只计一次。调用者传入当前实际展示的媒体。 */
export function sidebarTagCounts(items: { tags?: string[] }[]): [string, number][] {
  const counts = new Map<string, number>();
  for (const item of items) {
    for (const tag of new Set(item.tags || [])) counts.set(tag, (counts.get(tag) || 0) + 1);
  }
  return [...counts].sort((a, b) => b[1] - a[1]).slice(0, 30);
}
