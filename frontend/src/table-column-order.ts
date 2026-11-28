import { queryClient } from '@peach/query';

export const PROFILE_SETTINGS_KEY = ['settings'] as const;
export interface TableLayout { widths?: Record<string, number>; visibility?: Record<string, boolean>; order?: string[] }
export interface TableLayoutChange extends TableLayout { legacy?: TableLayout }
export interface LegacyTableKeys { widths: string; visibility: string; order?: string }

export const legacyTableKeys = (id: string) => ({
  widths: `peach.table.${id}.widths.v1`, visibility: `peach.table.${id}.visibility.v1`, order: `peach.table.${id}.order.v1`,
});

function read(key?: string): unknown {
  try { return key ? JSON.parse(localStorage.getItem(key) ?? 'null') : null }
  catch { return null }
}

const validKey = (value: unknown): value is string => typeof value === 'string' && /^[a-zA-Z0-9_-]{1,80}$/.test(value);
function readMap<T>(raw: unknown, valid: (value: unknown) => value is T): Record<string, T> | undefined {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return undefined;
  const entries = Object.entries(raw).filter((entry): entry is [string, T] => validKey(entry[0]) && valid(entry[1])).slice(0, 64);
  return entries.length ? Object.fromEntries(entries) : undefined;
}

export function readLegacyTableLayout(id: string, keys?: LegacyTableKeys): TableLayout {
  const { widths, visibility, order } = { ...legacyTableKeys(id), ...keys };
  const savedWidths = readMap(read(widths), (value): value is number => typeof value === 'number' && value > 0 && value <= 10000);
  const savedVisibility = readMap(read(visibility), (value): value is boolean => typeof value === 'boolean');
  const rawOrder = read(order);
  const savedOrder = Array.isArray(rawOrder) ? [...new Set(rawOrder.filter(validKey))].slice(0, 64) : [];
  return {
    ...(savedWidths && { widths: savedWidths }),
    ...(savedVisibility && { visibility: savedVisibility }),
    ...(savedOrder.length > 0 && { order: savedOrder }),
  };
}

export function clearLegacyTableLayout(id: string, keys?: LegacyTableKeys) {
  try {
    for (const key of Object.values({ ...legacyTableKeys(id), ...keys })) if (key) localStorage.removeItem(key);
  } catch { /* 实例设置在读取时优先。 */ }
}

export function tableLayoutSnapshot(id: string, keys?: LegacyTableKeys): TableLayout {
  const settings = queryClient.getQueryData<{ tableLayouts?: Record<string, TableLayout> }>(PROFILE_SETTINGS_KEY);
  return { ...readLegacyTableLayout(id, keys), ...settings?.tableLayouts?.[id] };
}

/** 勾选列固定在开头。新列按默认顺序补在末尾，已移除的列忽略。 */
export function orderTableColumns<T extends { id: string }>(columns: readonly T[], order: unknown): T[] {
  if (!Array.isArray(order)) return [...columns];
  const remaining = new Map(columns.map(column => [column.id, column]));
  const ordered: T[] = [];
  for (const id of ['select', ...order]) {
    const column = remaining.get(id);
    if (!column) continue;
    ordered.push(column);
    remaining.delete(id);
  }
  return [...ordered, ...remaining.values()];
}
