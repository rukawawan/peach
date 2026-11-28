/* 记住这台浏览器上最近一次调过的音量，新开的播放器从这个音量起播。
 *
 * 按浏览器记、不按视频记：音量跟着设备走，手机外放和电脑耳机各有合适的值，存在服务端会让一台设备
 * 的音量带到另一台。音量为 0 也照常保存；静音按钮只改 `muted`，这里不碰。
 * iOS Safari 的 `video.volume` 只读，写入无效也不报错，那里沿用系统音量。 */
const KEY = 'peach.player-volume.v1';

export function savedVolume(): number | null {
  try {
    const raw = localStorage.getItem(KEY);
    const value = raw?.trim() ? Number(raw) : NaN;
    return Number.isFinite(value) && value >= 0 && value <= 1 ? value : null;
  } catch { return null }
}

export function mountVolumeMemory(video: HTMLVideoElement, signal: AbortSignal): void {
  const saved = savedVolume();
  if (saved !== null) video.volume = saved;
  // 恢复与静音也会触发 volumechange；只有滑块的实际音量变更才回写。
  let previous = video.volume;
  video.addEventListener('volumechange', () => {
    const value = video.volume;
    if (value === previous || !(value >= 0 && value <= 1)) return;
    previous = value;
    try { localStorage.setItem(KEY, String(value)) } catch { /* 隐私模式写不进去时只影响下一次起播音量。 */ }
  }, { signal });
}
