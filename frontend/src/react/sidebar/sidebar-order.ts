/* 导航排序共用本地即时保存和数据库同步，侧栏与管理菜单分别保存自己的顺序。
 *
 * 顺序跟数据库走，不跟浏览器走：在 Windows 上排好，Mac 上就该是同一份。改完先落进本地那份
 * （`store.save()` 通知订阅者，侧栏当场按它重排），再写 `/api/settings`。写服务端失败不回滚也不
 * 打断：只读端会回 409，本地顺序照样已经生效，只是这次改动不跨机同步——那是只读端的既定约束，
 * 不是操作失败。 */
import { useCallback } from 'react';

import type { SettingsStore } from '../../settings-store';
import { useSaveSettings } from '../settings-panel/settings-data';

export function useCommitNavigationOrder(store: SettingsStore<{ sidebarOrder?: string[]; manageOrder?: string[] }>,
  key: 'sidebarOrder' | 'manageOrder' = 'sidebarOrder') {
  const save = useSaveSettings('navigation-order');
  const { mutate } = save;
  return useCallback((next: string[]) => {
    store.value[key] = next;
    store.save();
    mutate({ [key]: next }, { onError: () => {} });
  }, [store, mutate, key]);
}

/** 把 `key` 挪到 `target` 前面或后面；挪不了（同一项、任一项不在顺序里）时是 null。 */
export function moveSidebarKey(order: readonly string[], key: string, target: string, after: boolean): string[] | null {
  if (key === target) return null;
  const next = [...order];
  const from = next.indexOf(key);
  if (from < 0) return null;
  next.splice(from, 1);
  const at = next.indexOf(target);
  if (at < 0) return null;
  next.splice(at + (after ? 1 : 0), 0, key);
  return next;
}
