/** 各页共用筛选字段和排序项的顺序。 */
export const FILTER_CONTROL_KEYS = {
  catalog: ['performer', 'studio', 'tags'],
  jav: ['performer', 'studio', 'tags'],
  follow: ['source', 'tags'],
  releases: ['performer', 'studio', 'tags'],
  discover: ['performer', 'studio', 'tags'],
  javOnline: ['performer', 'studio', 'tags'],
} as const;
export const SORT_CONTROL_KEYS = {
  catalog: [...FILTER_CONTROL_KEYS.catalog, 'rating', 'o', 'plays', 'dur', 'size', 'new', 'played', 'release'],
  jav: [...FILTER_CONTROL_KEYS.jav, 'release', 'rating', 'o', 'plays', 'dur', 'size', 'new', 'played'],
  follow: [...FILTER_CONTROL_KEYS.follow, 'new', 'hot', 'dur'],
  releases: [...FILTER_CONTROL_KEYS.releases, 'release_date', 'source_score', 'duration', 'code', 'taste'],
  discover: [...FILTER_CONTROL_KEYS.discover, 'taste', 'release_date', 'source_score', 'duration', 'code'],
  javOnline: [...FILTER_CONTROL_KEYS.javOnline, 'release', 'dur', 'code'],
} as const;

export type SortControlGroup = keyof typeof SORT_CONTROL_KEYS;
export interface SortControlPreference { order: string[]; hidden: string[] }
export type SortControls = Partial<Record<SortControlGroup, SortControlPreference>>;

export function normalizeSortControl(group: SortControlGroup, value: unknown): SortControlPreference {
  const defaults: readonly string[] = SORT_CONTROL_KEYS[group];
  const saved = value && typeof value === 'object' && !Array.isArray(value)
    ? value as Partial<SortControlPreference> : {};
  const keys = (raw: unknown): string[] => Array.isArray(raw)
    ? [...new Set(raw.filter((key): key is string => typeof key === 'string' && defaults.includes(key)))] : [];
  const order = keys(saved.order);
  const fields: readonly string[] = FILTER_CONTROL_KEYS[group];
  if (!order.some(key => fields.includes(key))) order.unshift(...fields);
  return { order: [...new Set([...order, ...defaults])], hidden: keys(saved.hidden).filter(key => !fields.includes(key)) };
}

export function normalizeSortControls(value: unknown): SortControls {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  const saved = value as Record<string, unknown>;
  return Object.fromEntries((Object.keys(SORT_CONTROL_KEYS) as SortControlGroup[])
    .filter(group => Object.hasOwn(saved, group)).map(group => [group, normalizeSortControl(group, saved[group])]));
}
