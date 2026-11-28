/* 每部视频的字幕会话；详情、小窗和沉浸播放共享服务端记忆。 */
import type { VjsPlayer } from './types';
import { playerMemory, type PlayerMemoryPatch } from './memory';
import { t } from '../i18n';

export const MAX_SUBTITLE_OFFSET_MS = 60_000;

export class SubtitleSession {
  private cleanup = new AbortController();
  private imported = new Map<string, { node: HTMLTrackElement; url: string }>();
  private selected: string | null | undefined;
  private offsets: Record<string, number> = {};
  private cueTimes = new WeakMap<TextTrackCue, [number, number]>();
  private memory;
  readonly ready: Promise<void>;
  error = '';

  constructor(private player: VjsPlayer, private video: HTMLVideoElement, private changed = () => {}) {
    this.memory = playerMemory(player);
    const signal = this.cleanup.signal;
    video.textTracks.addEventListener('addtrack', () => { this.apply(); this.changed() }, { signal });
    video.addEventListener('loadedmetadata', () => this.apply(), { signal });
    video.addEventListener('load', event => {
      if (event.target instanceof HTMLTrackElement) this.applyOffset(event.target.track);
    }, { capture: true, signal });
    player.on('dispose', () => {
      this.cleanup.abort();
      this.imported.forEach(({ url }) => URL.revokeObjectURL(url)); this.imported.clear();
    });
    this.ready = this.restore();
  }
  tracks() { return [...this.video.textTracks].filter(track => ['subtitles', 'captions'].includes(track.kind)) }
  has(key: string) { return this.imported.has(key) }
  private key(track: TextTrack) {
    return /^(sidecar|file|subtitlecat):/.test(track.id) ? track.id
      : `native:${track.kind}:${track.language}:${track.id || track.label}`;
  }
  offset(track: TextTrack) { return this.offsets[this.key(track)] ?? 0 }
  previewOffset(track: TextTrack, offset: number) {
    this.offsets[this.key(track)] = offset;
    this.applyOffset(track);
  }
  setOffset(track: TextTrack, offset: number) {
    this.previewOffset(track, offset);
    return this.save({ subtitle_offsets: { [this.key(track)]: offset } });
  }
  private applyOffset(track: TextTrack) {
    const shift = this.offset(track) / 1000;
    for (const cue of Array.from(track.cues ?? [])) {
      let times = this.cueTimes.get(cue);
      if (!times) {
        if (!shift) continue;
        times = [cue.startTime, cue.endTime];
        this.cueTimes.set(cue, times);
      }
      const start = Math.max(0, times[0] + shift), end = Math.max(0, times[1] + shift);
      if (cue.startTime !== start) cue.startTime = start;
      if (cue.endTime !== end) cue.endTime = end;
    }
  }
  selectImported(key: string) { this.select(this.imported.get(key)!.node.track) }
  select(track: TextTrack | null) {
    this.selected = track ? this.key(track) : null;
    this.apply(); this.changed();
    void this.save({ selected: this.selected }).catch(error => this.failed(error));
  }
  private apply() {
    if (this.selected === undefined) return;
    const aliases = [...this.video.querySelectorAll<HTMLTrackElement>('track[data-subtitle-alias]')];
    const selected = this.tracks().find(track => this.key(track) === this.selected
      || aliases.some(node => node.track === track && node.dataset.subtitleAlias === this.selected));
    this.tracks().forEach(track => {
      const mode = track === selected ? 'showing' : 'disabled';
      if (track.mode !== mode) track.mode = mode;
      if (track === selected) this.applyOffset(track);
    });
  }
  private failed(error: unknown) {
    if (this.cleanup.signal.aborted) return;
    this.error = error instanceof Error ? error.message : t('catalog:subtitleMemory.saveFailed');
    this.changed();
  }
  private save(value: PlayerMemoryPatch) {
    return this.memory.save(value).then(() => {
      const hadError = !!this.error;
      this.error = ''; if (hadError && !this.cleanup.signal.aborted) this.changed();
    });
  }
  private async restore() {
    const signal = this.cleanup.signal;
    try {
      const saved = await this.memory.load();
      if (signal.aborted) return;
      this.offsets = { ...saved.subtitle_offsets, ...this.offsets };
      if (this.selected === undefined) this.selected = saved.selected;
      this.apply();
      let failure: unknown;
      for (const track of saved.tracks) {
        if (signal.aborted) return;
        try {
          if (this.has(track.key)) continue;
          const response = await fetch(track.src, { signal });
          if (!response.ok) throw new Error(t('catalog:subtitleMemory.restoreFailed', { name: track.name }));
          await this.attach(await response.text(), track.name, track.key, signal);
        } catch (error) { failure = error }
      }
      if (signal.aborted) return;
      if (failure) throw failure;
      this.error = ''; this.apply(); this.changed();
    } catch (error) { if (!signal.aborted) this.failed(error) }
  }
  async retry() {
    await this.restore();
    if (!this.error && this.selected !== undefined) {
      await this.save({ selected: this.selected }).catch(error => this.failed(error));
    }
    this.changed();
  }
  async import(text: string, name: string, key: string, signal: AbortSignal) {
    await this.ready;
    if (signal.aborted) return;
    await this.save({ selected: key, track: { key, name, text } });
    if (signal.aborted) return;
    await this.attach(text, name, key, signal);
    this.selectImported(key);
  }
  private async attach(text: string, name: string, key: string, signal: AbortSignal) {
    if (this.imported.has(key)) return;
    const url = URL.createObjectURL(new Blob([text], { type: 'text/vtt' }));
    const node = document.createElement('track'); node.id = key; node.kind = 'subtitles'; node.label = name; node.src = url;
    try {
      await new Promise<void>((resolve, reject) => {
        const timer = setTimeout(() => finish(new Error(t('catalog:subtitleMemory.timedOut'))), 15_000);
        const finish = (error?: Error) => {
          clearTimeout(timer); node.removeEventListener('load', loaded); node.removeEventListener('error', failed); signal.removeEventListener('abort', aborted);
          if (error) reject(error); else resolve();
        };
        const loaded = () => finish(), failed = () => finish(new Error(t('catalog:subtitleMemory.unreadable', { name })));
        const aborted = () => finish(new DOMException(t('catalog:subtitleMemory.canceled'), 'AbortError'));
        node.addEventListener('load', loaded); node.addEventListener('error', failed); signal.addEventListener('abort', aborted, { once: true });
        if (signal.aborted) { aborted(); return }
        this.video.append(node); node.track.mode = 'hidden';
      });
      if (signal.aborted || this.player.isDisposed()) throw new DOMException(t('catalog:subtitleMemory.canceled'), 'AbortError');
      this.imported.set(key, { node, url }); this.apply(); this.changed();
    } catch (error) { node.remove(); URL.revokeObjectURL(url); throw error }
  }
}
