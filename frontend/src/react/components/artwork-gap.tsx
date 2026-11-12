/* 作品卡封面格里没有图时的那一块：缺的是哪种图、为什么缺，能当场补的给一颗按钮。
 *
 * 两种来路：卡片本来就没有可画的图（`missingArtwork`，按条目字段推），或者有图但取失败了
 * （`failedArtwork`，再取一次读服务端说的原因）。补图的判据跟着服务端（`preview_readable`）：
 * 在线来源、STRM 与 ISO 不抽帧；开了流量保护的目录同步时跳过，卡上点「补全预览」先弹一次确认，
 * 确认后这一部带着授权抽帧。番号作品的官方封面走「当场取这一部」（`/api/jav/cover`，详情页
 * 「立即重试」同一个接口）。 */
import { useEffect, useState, type MouseEvent } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/base/buttons/button';

import { apiSend } from '../../api';
import { patchCatalogItems } from '../catalog-grid/catalog-grid';
import type { MediaItem } from '../catalog-grid/types';
import {
  fetchLibraryProcessing, LIBRARY_PROCESSING_KEY, pollInterval, processingActive,
} from '../library-processing/library-processing';
import { confirmMeteredPreviews, startPreviews } from '../library-processing/metered-previews';
import { queryClient } from '../query';
import { busyProps, useAction } from '../settings/use-action';

/** 能当场补的办法：取官方封面、给这一部抽帧、重新取一次图；空串是补不了。 */
export type ArtworkFix = 'cover' | 'previews' | 'retry' | '';

export interface ArtworkGap {
  /** 文案键的末段，同时长角标的 `media.duration.<key>`。 */
  key: string;
  title: string;
  reason: string;
  fix: ArtworkFix;
}

type GapItem = Pick<MediaItem, 'is_jav' | 'code' | 'location' | 'duration' | 'name' | 'cost'> & { path?: string; is_strm?: boolean };

/** 卡上一张图都没有。番号作品缺的是官方封面（竖屏格除外，那里只用视频帧），其余缺的是抽帧。
 *  右下角时长角标已经写了「尚未探查」那类状态，这里说的是图为什么没有。 */
export function missingArtwork(item: GapItem, frameOnly: boolean): ArtworkGap {
  if (item.is_jav && item.code && !frameOnly) return { key: 'cover-missing', title: '无封面', reason: '还没取到官方封面', fix: 'cover' };
  const path = String(item.path || item.name || '').toLowerCase();
  const none = (key: string, reason: string, fix: ArtworkFix = ''): ArtworkGap => ({ key, title: '无预览', reason, fix });
  if (item.is_strm || path.endsWith('.strm')) return none('strm', 'STRM 不抽帧');
  if (path.endsWith('.iso')) return none('iso', 'ISO 不抽帧');
  if (item.location === 'online') return none('online', '在线来源不抽帧');
  if (item.cost === 'metered') return none('metered', '流量保护 · 同步时不抽帧', 'previews');
  if (Number(item.duration) < 0) return none('probe-failed', '探查失败，没能抽帧', 'previews');
  return none('pending', '还没抽帧', 'previews');
}

/** `/poster` 取不到时服务端交出的那一步（`PreviewUnavailable` 的原文）。 */
const POSTER_REASONS: Record<string, string> = {
  'snapshot unavailable': '预览帧文件缺失',
  'ffmpeg unavailable': '没找到 FFmpeg',
  'ffmpeg generation failed': '生成预览图失败',
  'snapshot changed during preview generation': '预览帧正在更新',
};

/** 有图但取失败了：同源的图再取一次，按状态码和服务端给的原因说话；别人站点上的图读不到原因。 */
export async function failedArtwork(src: string, kind: string): Promise<ArtworkGap> {
  const cover = kind === 'cover';
  const title = cover ? '封面未取得' : '预览未取得';
  const gap = (key: string, reason: string, fix: ArtworkFix): ArtworkGap => ({ key, title, reason, fix });
  const url = new URL(src, location.href);
  if (url.origin !== location.origin) return gap('remote-image', '来源站点没有返回图片', 'retry');
  try {
    const response = await fetch(url, { cache: 'no-store' });
    if (response.ok) return gap('interrupted', '图片加载中断', 'retry');
    if (url.pathname === '/cover') return gap('cover-file', '封面文件缺失', 'cover');
    const body = await response.json().catch(() => ({})) as { reason?: string };
    const reason = POSTER_REASONS[String(body.reason || '')];
    if (body.reason === 'snapshot unavailable') return gap('snapshot', reason!, 'previews');
    return gap('server', reason || `服务返回 ${response.status}`, 'retry');
  } catch {
    return gap('offline', '连不上 Peach 服务', 'retry');
  }
}

const PREVIEWS_OFF = '请先在媒体库设置中开启视频预览生成';
const PREVIEWS_BUSY = '当前处理任务结束后可补全';

/** 灰底上的标题、原因和按钮。按钮点了不打开详情；补图成功后由目录缓存换上新图，
 *  `onRetry` 让失败过的那张图按新地址再取一次。 */
export function ArtworkGapView({ gap, item, onRetry }: { gap: ArtworkGap; item: MediaItem; onRetry(): void }) {
  const action = useAction();
  const [note, setNote] = useState('');
  const fix = gap.fix === 'previews' && item.location === 'online' ? '' : gap.fix === 'cover' && !item.code ? 'retry' : gap.fix;
  const stop = (event: MouseEvent) => event.stopPropagation();
  const cover = () => action.run('cover', signal => apiSend<CoverNow>('/api/jav/cover', { code: item.code }, 'POST', signal), result => {
    if (!result.has_cover) { setNote(result.message || '没有找到可用的官方封面'); return }
    const code = item.code;
    patchCatalogItems(row => row.code === code, {
      has_cover: true, cover_version: result.cover_version, cover_frame: result.cover_frame, poster_box: result.poster_box,
    } as Partial<MediaItem>);
    onRetry();
  });
  const why = action.error || note || gap.reason;
  return <div data-artwork-gap={gap.key} onClick={stop}
    className="relative z-10 flex max-w-full flex-col items-center gap-1.5 px-4 text-center">
    <span data-media-nopic="" data-copy-key={`media.artwork.${gap.key}`}>{gap.title}</span>
    <span className="line-clamp-2 text-caption-1-regular text-text-secondary" title={why}>{why}</span>
    {fix === 'cover' ? <Button size="small" variant="secondary" className="mt-1" {...busyProps(action.busy === 'cover')}
      onClick={() => { if (!action.busy) void cover() }}>{action.busy === 'cover' ? '抓取中' : '抓取封面'}</Button> : null}
    {fix === 'previews'
      ? <PreviewsButton id={item.id} metered={item.cost === 'metered'} onDone={onRetry} onProblem={setNote} /> : null}
    {fix === 'retry' ? <Button size="small" variant="secondary" className="mt-1" onClick={onRetry}>重试</Button> : null}
  </div>;
}

interface CoverNow {
  has_cover: boolean; cover_version: string; message: string;
  cover_frame?: MediaItem['cover_frame']; poster_box?: MediaItem['poster_box'];
}

/** 只给这一部抽帧。处理任务同一时刻只有一个：别的任务在跑时服务端不接新范围，按钮先停着；
 *  预览生成关着时同补全提示一样说明去哪开。自己发起的那一趟结束后刷新目录，换上新图。
 *  开了流量保护的目录先确认一次，确认才带 `allow_metered`，服务端只对点名影片的补全预览认它。 */
function PreviewsButton({ id, metered, onDone, onProblem }: {
  id: number; metered: boolean; onDone(): void; onProblem(text: string): void;
}) {
  const [started, setStarted] = useState<string | null>(null);
  const job = useQuery({ queryKey: LIBRARY_PROCESSING_KEY, queryFn: ({ signal }) => fetchLibraryProcessing(signal),
    staleTime: 15_000, refetchInterval: query => started ? pollInterval(query.state.data, true) : false }, queryClient);
  const action = useAction();
  const state = job.data;
  const mine = !!started && state?.job_id === started;
  useEffect(() => {
    if (!mine || processingActive(state)) return;
    setStarted(null);
    if (state?.status === 'failed') onProblem(state.error || '补全未完成');
    void queryClient.invalidateQueries({ queryKey: ['catalog-grid'] });
    onDone();
  }, [mine, state, onDone, onProblem]);
  useEffect(() => { if (action.error) onProblem(action.error) }, [action.error, onProblem]);
  const running = mine && processingActive(state);
  const blocked = state?.metadata_only ? PREVIEWS_OFF : !running && processingActive(state) ? PREVIEWS_BUSY : '';
  /* 别的任务在跑时服务端原样交回那一趟的状态，不起新任务：同一个任务号就是没接。 */
  const start = (before = state?.job_id) => action.run('previews', signal => startPreviews([id], metered, signal), next => {
    queryClient.setQueryData(LIBRARY_PROCESSING_KEY, next);
    if (next.job_id && next.job_id !== before) {
      if (processingActive(next)) { setStarted(next.job_id); return }
      void queryClient.invalidateQueries({ queryKey: ['catalog-grid'] });
      onDone();
      return;
    }
    onProblem(PREVIEWS_BUSY);
  });
  const busy = running || action.busy === 'previews';
  const click = async () => {
    if (busy) return;
    if (metered && !await confirmMeteredPreviews(1)) return;
    void start();
  };
  return <Button size="small" variant="secondary" className="mt-1" disabled={!!blocked} title={blocked || undefined}
    {...busyProps(busy)} onClick={() => { void click() }}>{busy ? '补全中' : '补全预览'}</Button>;
}
