import type { CSSProperties, RefObject } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { fmtDur, requestErrorMessage } from '@peach/legacy/core';
import { spinnerHtml } from '@peach/legacy/ui';
import type { MediaItem } from '../catalog-grid/types';
import { busyProps } from '../settings/busy-props';
import { useWallPlayback } from './use-wall-playback';
import { WALL_CONTROLS_REVEAL } from './wall-motion';
import { t } from '../../i18n';

/** 时间更新只重画控制条，海报和块内布局保持挂载。 */
export function WallControls({ item, playing, frame, starting, pendingGroup, grouped, queueOpen, queueReady,
  hasPrevious, hasNext, later, laterBusy, play, previous, next, queue, watchLater, details, ended, error }: {
  item: MediaItem; playing: number | null; frame: RefObject<HTMLDivElement | null>;
  starting: boolean; pendingGroup: boolean; grouped: boolean; queueOpen: boolean; queueReady: boolean;
  hasPrevious: boolean; hasNext: boolean; later: boolean; laterBusy: boolean;
  play(): Promise<void>; previous(): void; next(): void; queue(): void; watchLater(): void; details(): void;
  ended(): void; error(message: string): void;
}) {
  const reduce = useReducedMotion();
  const transport = useWallPlayback(playing, frame, ended);
  const duration = transport.duration || Number(item.duration) || 0;
  const busy = starting || pendingGroup, paused = !playing || transport.paused;
  const toggle = async () => {
    if (busy || (grouped && !queueReady)) return;
    try { if (playing === item.id) await transport.toggle(); else await play() }
    catch (failure) { error(requestErrorMessage(failure)) }
  };
  return <motion.div data-wall-focus-actions="" initial={reduce ? false : { opacity:0, transform:'translateY(12px)' }}
    animate={{ opacity:1, transform:'translateY(0px)' }} transition={reduce ? { duration:0 } : WALL_CONTROLS_REVEAL}>
    <div data-wall-control-row="">
      <button type="button" data-wall-play="" data-wall-pause={!paused ? '' : undefined} {...busyProps(busy)}
        aria-label={starting ? t('catalog:wallControls.opening') : pendingGroup ? t('catalog:wallControls.loadingEditions') : paused ? t('catalog:shared.play') : t('catalog:shared.pause')}
        title={paused ? t('catalog:shared.play') : t('catalog:shared.pause')} onClick={() => void toggle()}>
        {busy ? <span dangerouslySetInnerHTML={{ __html:spinnerHtml() }} /> : <svg viewBox="0 0 24 24" aria-hidden="true"><use href={paused ? '#i-play' : '#i-player-pause'} /></svg>}
      </button>
      <button type="button" aria-label={t('catalog:wallControls.previousVideo')} title={t('catalog:wallControls.previousVideo')} disabled={!hasPrevious} onClick={previous}><svg viewBox="0 0 24 24" aria-hidden="true"><use href="#i-chevron-left" /></svg></button>
      <button type="button" aria-label={grouped ? t('catalog:wallControls.switchPartOrEdition') : t('catalog:wallControls.switchVideo')} title={grouped ? t('catalog:wallControls.partsAndEditions') : t('catalog:catalogList.listLabel')}
        aria-expanded={queueOpen} aria-controls="wall-queue" disabled={!queueReady} onClick={queue}>
        <svg viewBox="10.4 10.5 259.2 259.2" aria-hidden="true"><use href="#i-playlist" /></svg>
      </button>
      <button type="button" aria-label={t('catalog:wallControls.nextVideo')} title={t('catalog:wallControls.nextVideo')} disabled={!hasNext} onClick={next}><svg viewBox="0 0 24 24" aria-hidden="true"><use href="#i-chevron-right" /></svg></button>
      <button type="button" {...busyProps(laterBusy)} aria-label={later ? t('catalog:wallControls.removeFromWatchLater') : t('catalog:shared.watchLater')} title={t('catalog:shared.watchLater')} aria-pressed={later} onClick={watchLater}>
        {laterBusy ? <span dangerouslySetInnerHTML={{ __html:spinnerHtml() }} /> : <svg viewBox="0 0 24 24" aria-hidden="true"><use href="#i-bookmark" /></svg>}
      </button>
      <span data-wall-time="">{transport.time > 0 ? fmtDur(transport.time) : '00:00'} / {duration > 0 ? fmtDur(duration) : '00:00'}</span>
      <button type="button" aria-label={t('catalog:shared.details')} title={t('catalog:wallControls.openDetails')} onClick={details}><svg viewBox="0 0 24 24" aria-hidden="true"><use href="#i-info" /></svg></button>
    </div>
    <input data-wall-seek="" type="range" aria-label={t('catalog:wallControls.seek')} min={0} max={duration || 1} step={.1} value={Math.min(transport.time, duration)}
      disabled={!playing || !transport.duration} onChange={event => transport.seek(Number(event.target.value))}
      style={{ '--wall-seek':`${duration ? Math.min(100, transport.time / duration * 100) : 0}%` } as CSSProperties} />
  </motion.div>;
}
