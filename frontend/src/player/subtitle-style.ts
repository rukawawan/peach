/* 字幕外观持久化与 TextTrack 时间轴显示。 */
import type { playerMemory } from './memory';
import { t } from '../i18n';
export const CAPTION_OPTIONS = {
  font: { label: t('catalog:subtitleStyle.font'), values: [['sans', t('catalog:subtitleStyle.sansSerif')], ['mono', t('catalog:subtitleStyle.monoSansSerif')], ['serif', t('catalog:subtitleStyle.serif')], ['mono-serif', t('catalog:subtitleStyle.monoSerif')], ['casual', t('catalog:subtitleStyle.casual')], ['cursive', t('catalog:subtitleStyle.cursive')], ['small-caps', t('catalog:subtitleStyle.smallCaps')]] },
  size: { label: t('catalog:subtitleStyle.fontSize'), values: ['50', '75', '100', '150', '200', '300', '400'].map(value => [value, `${value}%`]) },
  color: { label: t('catalog:subtitleStyle.fontColor'), values: [['white', t('catalog:subtitleStyle.white')], ['yellow', t('catalog:subtitleStyle.yellow')], ['green', t('catalog:subtitleStyle.green')], ['cyan', t('catalog:subtitleStyle.cyan')], ['blue', t('catalog:subtitleStyle.blue')], ['magenta', t('catalog:subtitleStyle.magenta')], ['red', t('catalog:subtitleStyle.red')], ['black', t('catalog:subtitleStyle.black')]] },
  opacity: { label: t('catalog:subtitleStyle.fontOpacity'), values: ['25', '50', '75', '100'].map(value => [value, `${value}%`]) },
  background: { label: t('catalog:subtitleStyle.backgroundColor'), values: [['black', t('catalog:subtitleStyle.black')], ['white', t('catalog:subtitleStyle.white')], ['red', t('catalog:subtitleStyle.red')], ['green', t('catalog:subtitleStyle.green')], ['blue', t('catalog:subtitleStyle.blue')], ['yellow', t('catalog:subtitleStyle.yellow')], ['magenta', t('catalog:subtitleStyle.magenta')], ['cyan', t('catalog:subtitleStyle.cyan')]] },
  backgroundOpacity: { label: t('catalog:subtitleStyle.backgroundOpacity'), values: ['0', '25', '50', '75', '100'].map(value => [value, `${value}%`]) },
  window: { label: t('catalog:subtitleStyle.windowColor'), values: [['black', t('catalog:subtitleStyle.black')], ['white', t('catalog:subtitleStyle.white')], ['red', t('catalog:subtitleStyle.red')], ['green', t('catalog:subtitleStyle.green')], ['blue', t('catalog:subtitleStyle.blue')], ['yellow', t('catalog:subtitleStyle.yellow')], ['magenta', t('catalog:subtitleStyle.magenta')], ['cyan', t('catalog:subtitleStyle.cyan')]] },
  windowOpacity: { label: t('catalog:subtitleStyle.windowOpacity'), values: ['0', '25', '50', '75', '100'].map(value => [value, `${value}%`]) },
  edge: { label: t('catalog:subtitleStyle.edgeStyle'), values: [['none', t('catalog:subtitleStyle.none')], ['raised', t('catalog:subtitleStyle.raised')], ['depressed', t('catalog:subtitleStyle.depressed')], ['outline', t('catalog:subtitleStyle.outline')], ['shadow', t('catalog:subtitleStyle.dropShadow')]] },
} as const;
export type CaptionKey = keyof typeof CAPTION_OPTIONS;
export type CaptionStyle = Record<CaptionKey, string>;
const DEFAULTS: CaptionStyle = { font: 'sans', size: '100', color: 'white', opacity: '100', background: 'black', backgroundOpacity: '75', window: 'black', windowOpacity: '0', edge: 'shadow' };
const KEY = 'peach.caption-style.v1';
const COLORS: Record<string, string> = { white: '255,255,255', yellow: '255,255,0', green: '0,255,0', cyan: '0,255,255', blue: '0,0,255', magenta: '255,0,255', red: '255,0,0', black: '0,0,0' };
const FONTS: Record<string, string> = { sans: 'Arial,sans-serif', mono: 'Consolas,monospace', serif: 'Georgia,serif', 'mono-serif': '"Courier New",monospace', casual: '"Comic Sans MS",sans-serif', cursive: 'cursive', 'small-caps': 'Arial,sans-serif' };
const EDGES: Record<string, string> = { none: 'none', raised: '-1px -1px 0 #ddd,1px 1px 0 #222', depressed: '1px 1px 0 #ddd,-1px -1px 0 #222', outline: '-1px -1px 0 #000,1px -1px 0 #000,-1px 1px 0 #000,1px 1px 0 #000', shadow: '2px 2px 3px #000' };

export function readCaptionStyle(): CaptionStyle {
  let saved: Partial<CaptionStyle> = {};
  try { saved = JSON.parse(localStorage.getItem(KEY) || '{}') || {} } catch { /* 使用默认外观 */ }
  return Object.fromEntries(Object.entries(DEFAULTS).map(([key, fallback]) => [key,
    CAPTION_OPTIONS[key as CaptionKey].values.some(([value]) => value === saved[key as CaptionKey]) ? saved[key as CaptionKey] : fallback])) as CaptionStyle;
}

export function mountCaptionStyle(root: HTMLElement, video: HTMLVideoElement, signal: AbortSignal,
  memory?: ReturnType<typeof playerMemory>) {
  let style = readCaptionStyle();
  const touched = new Set<CaptionKey>();
  const overlay = document.createElement('div'); overlay.className = 'vjs-peach-captions'; overlay.setAttribute('aria-hidden', 'true');
  const window = document.createElement('div'); window.className = 'vjs-peach-caption-window'; overlay.append(window);
  root.querySelector('media-container')!.append(overlay);
  // 网页层字幕只在页面内播放时可见；iOS 原生全屏与画中画由系统绘制画面，那时交还原生字幕轨道。
  const presentation = () => {
    const native = video as HTMLVideoElement & { webkitDisplayingFullscreen?: boolean; webkitPresentationMode?: string };
    const outside = !!native.webkitDisplayingFullscreen || (native.webkitPresentationMode ?? 'inline') !== 'inline'
      || document.pictureInPictureElement === video;
    if (outside) delete root.dataset.peachCaptions; else root.dataset.peachCaptions = '';
  };
  for (const event of ['webkitbeginfullscreen', 'webkitendfullscreen', 'webkitpresentationmodechanged', 'enterpictureinpicture', 'leavepictureinpicture'])
    video.addEventListener(event, presentation, { signal });
  presentation();
  const paintStyle = () => {
    const rgba = (color: string, opacity: string) => `rgba(${COLORS[color]},${Number(opacity) / 100})`;
    root.style.setProperty('--peach-caption-font', FONTS[style.font]!);
    root.style.setProperty('--peach-caption-scale', String(Number(style.size) / 100));
    root.style.setProperty('--peach-caption-color', rgba(style.color, style.opacity));
    root.style.setProperty('--peach-caption-background', rgba(style.background, style.backgroundOpacity));
    root.style.setProperty('--peach-caption-window', rgba(style.window, style.windowOpacity));
    root.style.setProperty('--peach-caption-edge', EDGES[style.edge]!);
    root.style.setProperty('--peach-caption-variant', style.font === 'small-caps' ? 'small-caps' : 'normal');
  };
  const render = () => {
    window.replaceChildren();
    for (const track of video.textTracks) {
      if (track.mode !== 'showing' || !['subtitles', 'captions'].includes(track.kind)) continue;
      for (const cue of Array.from(track.activeCues || [])) {
        const line = document.createElement('span'); line.className = 'vjs-peach-caption-line';
        if (cue instanceof VTTCue) line.append(cue.getCueAsHTML());
        window.append(line);
      }
    }
    overlay.hidden = !window.childNodes.length;
  };
  const bound = new WeakSet<TextTrack>();
  const bind = () => {
    for (const track of video.textTracks) if (!bound.has(track)) { bound.add(track); track.addEventListener('cuechange', render, { signal }) }
    render();
  };
  video.textTracks.addEventListener('addtrack', bind, { signal });
  video.textTracks.addEventListener('removetrack', bind, { signal });
  video.textTracks.addEventListener('change', render, { signal });
  paintStyle(); bind();
  if (memory) memory.restore(saved => {
    if (signal.aborted) return;
    if (saved.caption_style) {
      const restored = { ...DEFAULTS, ...saved.caption_style };
      for (const key of Object.keys(DEFAULTS) as CaptionKey[]) if (!touched.has(key)) style[key] = restored[key];
      paintStyle();
    } else {
      // 浏览器里保存的外观作为这部视频的初始值，服务端清单承载持久记忆。
      let legacy = false;
      try { legacy = !!localStorage.getItem(KEY) } catch { /* 使用默认外观 */ }
      if (legacy && !touched.size) void memory.save({ caption_style: style }).catch(() => {});
    }
  });
  return {
    current: () => style,
    set(key: CaptionKey, value: string) {
      if (!CAPTION_OPTIONS[key].values.some(([option]) => option === value)) return;
      touched.add(key); style = { ...style, [key]: value }; paintStyle();
      void memory?.save({ caption_style: { [key]: value } }).catch(() => {});
    },
    reset() { (Object.keys(DEFAULTS) as CaptionKey[]).forEach(key => touched.add(key)); style = { ...DEFAULTS }; paintStyle(); void memory?.save({ caption_style: style }).catch(() => {}) },
  };
}
