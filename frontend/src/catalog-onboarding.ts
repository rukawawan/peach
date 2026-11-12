import { emptyStateHtml } from '@peach/legacy/ui';
import { esc } from '@peach/legacy/core';

type Request = (url: string) => Promise<any>;
const FILTERS = ['loc', 'creator', 'performer', 'studio', 'series', 'agency', 'tag', 'tag_match', 'len', 'dur_min', 'dur_max', 'orient', 'region', 'year', 'state', 'jav', 'thumb'];

/** 清除馆藏条件，保留当前页面、视图与本地或在线范围。 */
export function clearCatalogAddress(address = typeof location === 'undefined' ? '/' : location.href): string {
  const url = new URL(address, 'http://localhost');
  for (const key of [...FILTERS, 'q', 'category', 'cat']) url.searchParams.delete(key);
  url.searchParams.set('thumb', '0');
  return url.pathname + (url.search ? url.search : '') + url.hash;
}

/** 推荐与当前列表共用筛选，只留在当前筛选里搜得出东西的词。
 *
 * 筛选项本来就是按当前筛选数出来的，`n` 大于零的名字搜索必然有命中（搜索认同一批实体名）；
 * 样本里的番号和文件名取自当前列表本身。所以不再逐词发一次带总数的搜索：那是每次点开搜索框
 * 十次不走缓存的全表计数。 */
export async function catalogSuggestions(state: Record<string, string>, request: Request): Promise<string[]> {
  const params = new URLSearchParams();
  for (const key of FILTERS) if (state[key]) params.set(key, state[key]);
  const [facets, sample] = await Promise.all([
    request('/api/facets?' + params), request('/api/items?' + params + '&limit=5&count=0'),
  ]);
  const counted = (rows: { k?: unknown; n?: unknown }[] | undefined) =>
    (rows || []).filter(row => Number(row.n) > 0).map(row => String(row.k || ''));
  return [...new Set<string>([
    ...counted(facets.creators), ...counted(facets.tagperformers), ...counted(facets.tags),
    ...(sample.items || []).map((row: { code?: string; name?: string }) => row.code || row.name || ''),
  ])].filter(value => value.length > 1).slice(0, 10);
}

/** 空馆藏、筛选无结果与资料尚未建立分别给出可执行入口。 */
export function catalogEmptyHtml({ kind = 'catalog', filtered = false, jav = false, configurable: _configurable = false, online = false } = {}): string {
  const add = '<a class="geist-button primary" href="/settings/library">添加媒体</a>';
  const follow = '<a class="geist-button' + (online ? ' primary' : '') + '" href="/subscriptions?tab=add">添加关注</a>';
  if (filtered || jav) return emptyStateHtml('search', jav ? '还没有符合条件的 JAV 作品' : '没有符合条件的内容',
    jav ? '已扫描但尚未补充发行资料的视频可在全部内容中查看。' : '清除筛选或搜索条件后查看全部内容。',
    { actions: jav
      ? '<a class="geist-button primary" href="/?loc=&thumb=0">查看全部内容</a><a class="geist-button" href="/data-cleanup#libraryProcessing">补全影片资料</a>'
      : `<a class="geist-button primary" href="${filtered ? esc(clearCatalogAddress()) : '/?loc=&thumb=0'}">${filtered ? '清除筛选' : '查看全部内容'}</a>` });
  if (kind !== 'catalog') {
    const labels: Record<string, string> = { tags: '标签', performers: '艺人', creators: '卖家', studios: '厂牌', agencies: '事务所', series: '系列' };
    // 在线那一档数的是来源上的东西，名字也跟着来源的说法：艺人页在线摆的是关注来源里的创作者。
    const onlineLabels: Record<string, string> = { tags: '标签', performers: '创作者' };
    const label = (online ? onlineLabels[kind] : '') || labels[kind] || '资料';
    return emptyStateHtml(kind === 'tags' ? 'tags' : 'user-round', '还没有' + label,
      online ? '添加关注来源并获取内容后，这里会显示来源上的' + label + '。' : '添加内容并补充资料后，这里会显示对应信息。',
      { actions: online ? follow : add + follow });
  }
  return emptyStateHtml('play', '还没有视频', '添加媒体目录或关注来源，开始建立你的馆藏。', { actions: add + follow });
}
