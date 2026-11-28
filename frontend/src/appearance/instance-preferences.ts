import { apiSend, errorMessage } from '../api';
import { t } from '../i18n';
import type { SettingsStore } from '../settings-store';
import type { HomeGlow } from './home-glow';

export interface BrowsePreferences {
  catalogView: 'cards' | 'list';
  photoLayout: string;
  followLayout: string;
  defaultSort: string;
  defaultSortDirection: string;
  batchSize: number;
  followPageSize: number;
  feedNewRows: boolean;
  feedLimit: number;
  homeShortsLimit: number;
  homeTiers: boolean;
  homePreviewOnly: boolean;
  autoChineseSubtitles: boolean;
  recentTags: string[];
  queueSort: Record<string, { sort: string; dir: string } | null>;
  pageSizes: Record<string, number>;
  theme: string;
  accent: string;
  homeGlow: HomeGlow;
}

type Patch = Partial<BrowsePreferences>;
type Settings = BrowsePreferences & { localAppearance: boolean };
type Key = keyof BrowsePreferences;
const APPEARANCE: readonly Key[] = ['theme', 'accent', 'homeGlow'];
const KEYS: readonly Key[] = ['catalogView', 'photoLayout', 'followLayout', 'defaultSort', 'defaultSortDirection', 'batchSize',
  'followPageSize', 'feedNewRows', 'feedLimit', 'homeShortsLimit', 'homeTiers', 'homePreviewOnly', 'autoChineseSubtitles',
  'recentTags', 'queueSort', 'pageSizes', ...APPEARANCE];
const MAPS = ['queueSort', 'pageSizes'] as const;
const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

function snapshot(settings: BrowsePreferences): Patch {
  return structuredClone(Object.fromEntries(KEYS.map(key => [key, settings[key]]))) as Patch;
}

function changedEntries(before: Patch, next: Patch): Patch {
  const patch = Object.fromEntries(KEYS.filter(key => !same(before[key], next[key])).map(key => [key, next[key]])) as Patch;
  for (const key of MAPS) {
    if (!(key in patch)) continue;
    Object.assign(patch, { [key]: Object.fromEntries(Object.entries(next[key] ?? {}).filter(([id, value]) =>
      !same((before[key] as Record<string, unknown> | undefined)?.[id], value))) });
  }
  return patch;
}

function merge(base: Patch, next: Patch): Patch {
  const result = { ...base, ...next };
  for (const key of MAPS) {
    if (key in next) Object.assign(result, { [key]: { ...base[key], ...next[key] } });
  }
  return result;
}

export function instancePreferences(store: SettingsStore<Settings>, defaults: BrowsePreferences) {
  let previous = snapshot(store.value);
  const legacy = changedEntries(snapshot(defaults), previous);
  if (store.value.localAppearance) for (const key of APPEARANCE) delete legacy[key];
  let cached: Patch = {};
  let queued: Patch = {};
  let active: Patch = {};
  let ready = false;
  let sending = false;
  let applying = false;
  let local = store.value.localAppearance;
  let notify: (keys: Key[]) => void = () => {};

  const apply = (restoreAppearance = false) => {
    const values = merge(merge(merge(legacy, cached), active), queued);
    const keys = KEYS.filter(key => {
      if (store.value.localAppearance && APPEARANCE.includes(key)) return false;
      return (key in values || (restoreAppearance && APPEARANCE.includes(key)))
        && !same(store.value[key], key in values ? values[key] : defaults[key]);
    });
    if (!keys.length) return;
    applying = true;
    try {
      for (const key of keys) Object.assign(store.value, { [key]: structuredClone(key in values ? values[key] : defaults[key]) });
      previous = snapshot(store.value);
      store.save();
    } finally { applying = false }
    notify(keys);
  };

  const send = async (imported?: Patch) => {
    if (sending || !ready) return;
    sending = true;
    try {
      do {
        active = queued;
        queued = {};
        try {
          const saved = await apiSend<{ browsePreferences: Patch }>('/api/settings',
            { browsePreferences: { ...active, ...(imported && { legacy: imported }) } });
          cached = saved.browsePreferences;
          active = {};
          apply();
        } catch (cause) {
          if (Object.keys(active).length) window.dispatchEvent(new CustomEvent('peach:preferences-save-failed',
            { detail: t('settings:preferencesPanel.instanceSaveFailed', { error: errorMessage(cause) }) }));
          active = {};
        }
        imported = undefined;
      } while (Object.keys(queued).length);
    } finally { sending = false }
  };

  store.subscribe(() => {
    if (applying) return;
    const next = snapshot(store.value);
    const patch = changedEntries(previous, next);
    previous = next;
    const ceasedOverride = local && !store.value.localAppearance;
    local = store.value.localAppearance;
    if (local || ceasedOverride) for (const key of APPEARANCE) delete patch[key];
    if (Object.keys(patch).length) { queued = merge(queued, patch); void send() }
    if (ceasedOverride) apply(true);
  });

  return (remote: Patch, changed: (keys: Key[]) => void) => {
    const first = !ready;
    notify = changed;
    cached = remote;
    ready = true;
    apply();
    // 服务端只为缺失字段导入旧偏好，来自另一浏览器的实例值优先。
    const missing = first && Object.keys(legacy).some(key => !(key in remote) || MAPS.some(map => map === key
      && Object.keys(legacy[map] ?? {}).some(id => !(id in (remote[map] ?? {})))));
    if (missing || Object.keys(queued).length) void send(missing ? legacy : undefined);
  };
}
