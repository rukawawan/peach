/* 播放音量与静音状态跨会话记住：每个播放器创建时恢复，用户调节后写回本机浏览器存储。 */
const KEY = 'peach.player.volume.v1';

interface StoredVolume { volume: number; muted: boolean }

const read = (): StoredVolume | null => {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (!value || typeof value !== 'object') return null;
    const { volume, muted } = value as Record<string, unknown>;
    if (typeof volume !== 'number' || !Number.isFinite(volume)) return null;
    return { volume: Math.min(1, Math.max(0, volume)), muted: muted === true };
  } catch { return null }
};

/** 恢复上次音量，并在之后每次 `volumechange` 时保存；存储不可用时保持浏览器默认。 */
export const rememberVolume = (video: HTMLVideoElement, signal: AbortSignal): void => {
  const stored = read();
  if (stored) { video.volume = stored.volume; video.muted = stored.muted }
  let pending: ReturnType<typeof setTimeout> | undefined;
  video.addEventListener('volumechange', () => {
    if (pending) clearTimeout(pending);
    pending = setTimeout(() => {
      try { localStorage.setItem(KEY, JSON.stringify({ volume: video.volume, muted: video.muted })) } catch { /* 本次会话仍按当前音量播放。 */ }
    }, 200);
  }, { signal });
};
