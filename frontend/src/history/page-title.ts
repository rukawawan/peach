import { t } from '../i18n';

/** 首页的竖屏栏。`竖屏` 是地址参数 `orient` 的取值，不是界面文案。 */
export const portraitColumn = (query: URLSearchParams) => query.get('orient') === '竖屏';

/** 首页那几栏（全部、JAV、竖屏都在 `/` 上）与搜索结果的标签页名称；不在 `/` 上是空串。 */
export function homeRouteLabel(pathname: string, search: string): string {
  if (pathname !== '/') return '';
  const query = new URLSearchParams(search);
  const term = (query.get('q') || '').trim();
  if (term) return t('navigation:pageTitle.search', { term });
  return query.get('jav') === '1' ? t('navigation:sidebar.jav') : portraitColumn(query) ? t('navigation:pageTitle.portrait') : '';
}

let presentedPost: { id: number; label: string } | null = null;
/** 关注详情画出来的那一条：标题优先，没有标题用作者。 */
export function presentPost(id: number, title: string, author = ''): void {
  presentedPost = { id, label: (title || '').trim() || (author || '').trim() };
}
/** 关注详情的标签页名称；仅使用当前地址对应的已画出条目。 */
export function postRouteLabel(pathname: string): string {
  const post = /^\/posts\/(\d+)$/.exec(pathname);
  return post && presentedPost?.id === Number(post[1]) ? presentedPost.label : '';
}

/** 媒体详情的标签页身份；仅使用当前地址对应的已呈现条目。 */
export function mediaRouteLabel(pathname: string, item: {
  id: number; display_code?: string | null; code?: string | null; name?: string | null;
} | null): string {
  const work = /^\/works\/([A-Za-z0-9_-]{2,64})$/.exec(pathname);
  if (work) return work[1]!.toUpperCase();
  if (!item || pathname !== `/assets/${item.id}`) return '';
  return [item.display_code, item.code, item.name].map(value => String(value || '').trim()).find(Boolean) || '';
}
