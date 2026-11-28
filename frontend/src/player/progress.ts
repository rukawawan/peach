/* 实例记录精确的续播位置，浏览器只缓存尚未确认写入的记录。 */
import { realDuration } from '@peach/legacy/core';
import { apiGet } from '../api';

import type { PlayerItem } from './types';

const KEY = 'peach.playback-position.v1';
const tracking = new WeakMap<HTMLVideoElement, () => void>();
const SYNC_MS = 15_000;
interface Position { seconds: number; updated_at: number }
const inFlight = new Map<string, number>();
let lastStamp = 0;

export function stopPlaybackPosition(video: HTMLVideoElement): void {
  tracking.get(video)?.();
  tracking.delete(video);
}

export function playbackKey(kind: 'item' | 'follow', item: PlayerItem, media: number | null = null): string {
  const follow = kind === 'follow' ? item.id : item.location === 'online' ? item.follow_item_id : null;
  return follow ? `follow:${follow}:${media ?? 'main'}` : `item:${item.id}`;
}

function storedPosition(key: string): Position | null {
  try {
    const raw = localStorage.getItem(`${KEY}:${key}`);
    if (!raw?.trim()) return null;
    const value: unknown = JSON.parse(raw);
    if (typeof value === 'number') return validPosition({ seconds: value, updated_at: 1 });
    return validPosition(value);
  } catch { return null }
}

function validPosition(raw: unknown): Position | null {
  if (!raw || typeof raw !== 'object') return null;
  const { seconds, updated_at } = raw as Partial<Position>;
  return typeof seconds === 'number' && seconds >= 0 && seconds <= 604800
    && typeof updated_at === 'number' && Number.isSafeInteger(updated_at) && updated_at > 0
    ? { seconds, updated_at } : null;
}

const memoryUrl = (key: string) => `/api/player/memory?${new URLSearchParams({ video: key })}`;

function clearConfirmed(key: string, at: number) {
  try {
    const pending = storedPosition(key);
    if (pending && pending.updated_at <= at) localStorage.removeItem(`${KEY}:${key}`);
  } catch { /* 已确认的位置仍可从实例读取。 */ }
}

function syncPosition(key: string, position: Position) {
  if ((inFlight.get(key) ?? 0) >= position.updated_at) return;
  inFlight.set(key, position.updated_at);
  return fetch(memoryUrl(key), { method: 'PUT', keepalive: true, headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ position }) })
    .then(async response => {
      if (!response.ok) return 0;
      const confirmed = validPosition((await response.json()).position);
      if (confirmed) clearConfirmed(key, confirmed.updated_at);
      return confirmed?.updated_at ?? 0;
    }).catch(() => 0)
    .finally(() => { if (inFlight.get(key) === position.updated_at) inFlight.delete(key) });
}

/** 打开时从哪一秒接着播。离片尾不到 `restartPercent`% 的算看完，从头播：停在片尾字幕前关掉的，
 *  下次不会落在片尾。时长未知时照原位置接。 */
export function playbackPosition(key: string, item: PlayerItem, restartPercent = 0, preferred?: Position): number {
  const duration = realDuration(item.duration);
  const ratio = Number(item.leave_ratio);
  const time = (preferred ?? storedPosition(key))?.seconds ?? (ratio > 0 && ratio < 1 ? ratio * duration : 0);
  return restartPercent > 0 && duration > 0 && time >= duration * (1 - restartPercent / 100) ? 0 : time;
}

export async function resolvePlaybackPosition(key: string, item: PlayerItem, restartPercent = 0, signal?: AbortSignal): Promise<number> {
  try {
    const limit = AbortSignal.timeout(1500);
    const memory = await apiGet<{ position?: Position }>(memoryUrl(key), signal ? AbortSignal.any([signal, limit]) : limit);
    const remote = validPosition(memory.position);
    const local = storedPosition(key);
    if (remote && (!local || remote.updated_at >= local.updated_at)) {
      clearConfirmed(key, remote.updated_at);
      return playbackPosition(key, item, restartPercent, remote);
    }
    if (local) syncPosition(key, local);
  } catch { /* 实例暂不可达时，现有缓存仍可续播。 */ }
  return playbackPosition(key, item, restartPercent);
}

/** 元数据加载且定位完成后才登记，换源与销毁产生的零位置不覆盖续播状态。 */
export function trackPlaybackPosition(key: string, video: HTMLVideoElement): void {
  stopPlaybackPosition(video);
  let ready = video.readyState >= 1;
  let started = !video.paused;
  let record: Position | null = null;
  let sent = 0;
  let confirmed = 0;
  const save = (immediate = false) => {
    if (!ready || !started || !Number.isFinite(video.currentTime)) return;
    const time = video.ended ? 0 : Math.max(0, video.currentTime);
    if (record?.seconds !== time) {
      lastStamp = Math.max(Date.now(), lastStamp + 1);
      record = { seconds: time, updated_at: lastStamp };
      try { localStorage.setItem(`${KEY}:${key}`, JSON.stringify(record)) }
      catch { /* 存储不可用不阻断播放。 */ }
    }
    if (record && record.updated_at > confirmed && (immediate || Date.now() - sent >= SYNC_MS)) {
      sent = Date.now();
      void syncPosition(key, record)?.then(at => { confirmed = Math.max(confirmed, at) });
    }
  };
  const progress = () => save();
  const flush = () => save(true);
  const played = () => { started = true };
  const loaded = () => { ready = true };
  const empty = () => { ready = false };
  video.addEventListener('play', played);
  video.addEventListener('loadedmetadata', loaded);
  video.addEventListener('emptied', empty);
  video.addEventListener('timeupdate', progress);
  for (const event of ['seeked', 'pause', 'ended']) video.addEventListener(event, flush);
  window.addEventListener('pagehide', flush);
  document.addEventListener('visibilitychange', flush);
  tracking.set(video, () => {
    flush();
    video.removeEventListener('play', played);
    video.removeEventListener('loadedmetadata', loaded);
    video.removeEventListener('emptied', empty);
    video.removeEventListener('timeupdate', progress);
    for (const event of ['seeked', 'pause', 'ended']) video.removeEventListener(event, flush);
    window.removeEventListener('pagehide', flush);
    document.removeEventListener('visibilitychange', flush);
  });
}
