import { notifyManager } from '@tanstack/react-query';
import { vi } from 'vitest';
import { queryClient } from '../../src/react/query';
import type { SettingsPatch } from '../../src/react/settings-panel/settings-data';
import type { TableLayout } from '../../src/table-column-order';

notifyManager.setScheduler(notify => notify());

export function serveTableLayouts() {
  queryClient.clear();
  const layouts: Record<string, TableLayout> = {};
  vi.stubGlobal('fetch', vi.fn(async (url: string, init?: RequestInit) => {
    if (url !== '/api/settings') throw new Error(`用例没有给 ${url} 造数据`);
    const changes: SettingsPatch = init?.body ? JSON.parse(String(init.body)) : {};
    for (const [id, { legacy, ...patch }] of Object.entries(changes.tableLayouts ?? {})) {
      layouts[id] = { ...legacy, ...layouts[id], ...patch };
    }
    const settings = { tableLayouts: structuredClone(layouts) };
    return { ok: true, json: async () => settings };
  }));
  return layouts;
}
