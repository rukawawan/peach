/* 筛选框的候选来源：馆藏补全接口（`/api/suggest`，名字与别名都认），以及从页面已经取回的那批数据里现抽。 */
import { apiGet } from '../../api';
import type { FaceRef } from '../../card-art/markup';
import type { SuggestKind, SuggestOption } from '../follow-manage/follow-search';
import type { SuggestResponse } from './search';

const LIMIT = 8;

/** 名册页的六类与补全接口的 `kind` 一一对应。 */
export const SUGGEST_KIND_OF: Record<string, SuggestKind> = {
  performers: 'performer', creators: 'creator', studios: 'studio', agencies: 'agency', series: 'series', tags: 'tag',
};

/** 向馆藏补全接口要这几类的候选；多类时用接口给的组名分组，单类不分组。作品那一类填番号。 */
export const librarySuggest = (kinds: readonly string[]) => async (term: string, signal: AbortSignal): Promise<SuggestOption[]> => {
  const params = new URLSearchParams({ q: term, kind: kinds.join(','), limit: String(LIMIT) });
  const { groups = [] } = await apiGet<SuggestResponse>(`/api/suggest?${params}`, signal);
  return groups.flatMap(group => group.items.map(item => {
    const value = group.kind === 'asset' ? item.code || item.value : item.value;
    const face = item as unknown as FaceRef & { entity_id?: number };
    return {
      value, matched: item.matched || (group.kind === 'asset' ? item.title || undefined : undefined), n: item.n,
      group: kinds.length > 1 ? group.label : undefined,
      portrait: face.entity_id ? { ...face, id: face.entity_id } : undefined,
    };
  })).filter(option => option.value);
};

/** 从已经在本机的一批记录里抽候选：每条记录交出若干个词（番号、人名、厂牌、标签），按出现次数排，前缀命中的排前面。 */
export function localSuggest<T>(rows: () => readonly T[], words: (row: T) => readonly (string | undefined | null)[]) {
  return async (term: string): Promise<SuggestOption[]> => {
    const needle = term.toLocaleLowerCase();
    const counts = new Map<string, number>();
    for (const row of rows()) {
      for (const word of new Set(words(row))) {
        const text = (word || '').trim();
        if (text && text.toLocaleLowerCase().includes(needle)) counts.set(text, (counts.get(text) || 0) + 1);
      }
    }
    const lead = (text: string) => (text.toLocaleLowerCase().startsWith(needle) ? 0 : 1);
    return [...counts].sort((a, b) => lead(a[0]) - lead(b[0]) || b[1] - a[1] || a[0].localeCompare(b[0]))
      .slice(0, LIMIT).map(([value, n]) => ({ value, n: n > 1 ? n : undefined }));
  };
}
