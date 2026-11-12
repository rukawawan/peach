import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { cardArtwork, frameArtwork } from '@peach/card-art';

import { Button } from '@/components/base/buttons/button';
import { LinkButton } from '@/components/base/buttons/link-button';
import { RiArrowRightLine } from '@remixicon/react';
import { cx } from '@/utils/cx';

import { apiSend, errorMessage } from '../../api';
import type { MediaItem } from '../catalog-grid/types';
import { Note } from '../components/note';
import { queryClient } from '../query';
import {
  DISCONNECTED_TEXT, fetchLibraryProcessing, LIBRARY_PROCESSING_KEY, LIBRARY_PROCESSING_URL,
  pollInterval, processingActive, type LibraryProcessingCommand, type LibraryProcessingData,
} from './library-processing';
import { ProcessingActions } from './processing-actions';
import { confirmMeteredPreviews, startPreviews } from './metered-previews';
import { busyProps } from '../settings/use-action';

/** 缺图判据与卡面一致；没开流量保护的影片可抽帧，有番号的影片可补发行封面。 */
type PreviewItem = Pick<MediaItem, 'id' | 'name' | 'medium' | 'disposal' | 'location' | 'cost' | 'code' | 'is_jav'
  | 'has_cover' | 'cover_key' | 'has_thumb' | 'has_local_poster' | 'follow_thumb_url'>;

/** 卡面画不画得出来。`frames` 是竖屏格（竖屏带与筛竖屏的网格）：那里番号作品也只用视频帧，
 *  不借官方封面，判据同 `media-card.tsx` 的 `frameOnly`。 */
const pictured = (item: PreviewItem, javImage: string, frames: boolean) =>
  Boolean((frames && item.is_jav ? frameArtwork(item, false) : cardArtwork(item, 'small', false, javImage)).html);

/** 同步能补上图的缺图影片。番号作品补得到发行封面，所以 STRM 与流量保护目录里的也算；竖屏格
 *  要的是视频帧，封面画不进去，番号就不再替它们开脱。 */
export function missingPreviewIds(items: PreviewItem[], javImage: string, frames = false): number[] {
  const cover = (item: PreviewItem) => !frames && !!item.code;
  return [...new Set(items.filter(item => (!item.medium || item.medium === 'video')
    && (!/\.(strm|iso)$/i.test(item.name || '') || cover(item))
    && !item.disposal && item.location !== 'online' && (item.cost !== 'metered' || cover(item))
    && !pictured(item, javImage, frames)).map(item => item.id))];
}

/** 这一屏里没有图、开了流量保护的影片：同步时不读，单独一批、确认后才补预览。 */
export function meteredPreviewIds(items: PreviewItem[], javImage: string, frames = false): number[] {
  return [...new Set(items.filter(item => (!item.medium || item.medium === 'video')
    && !/\.(strm|iso)$/i.test(item.name || '')
    && !item.disposal && item.location !== 'online' && item.cost === 'metered'
    && !pictured(item, javImage, frames)).map(item => item.id))];
}

/** 单独一行；`className` 交给所在布局定外边距，列表页由父级间距负责。`meteredIds` 是开了流量保护、
 *  同步不读的那一批，和可同步的那批合在同一条里，多一颗先确认再只为它们补预览的次要按钮。 */
export function LibraryCompletionPrompt({ assetIds, meteredIds = [], onComplete, className = 'mb-4' }: {
  assetIds: number[]; meteredIds?: number[]; onComplete?(): void; className?: string;
}) {
  if (!assetIds.length && !meteredIds.length) return null;
  return <Completion assetIds={assetIds} meteredIds={meteredIds} onComplete={onComplete} className={className} />;
}

function Completion({ assetIds, meteredIds, onComplete, className }: {
  assetIds: number[]; meteredIds: number[]; onComplete?(): void; className: string;
}) {
  const job = useQuery({ queryKey: LIBRARY_PROCESSING_KEY,
    queryFn: ({ signal }) => fetchLibraryProcessing(signal),
    refetchInterval: query => pollInterval(query.state.data, true) });
  const [started, setStarted] = useState<string | null>(null);
  const [outcome, setOutcome] = useState('');
  const completed = useRef<string | null>(null);
  const start = useMutation({
    mutationFn: (command: LibraryProcessingCommand | 'metered') => command === 'metered'
      ? startPreviews(meteredIds, true)
      : apiSend<LibraryProcessingData>(LIBRARY_PROCESSING_URL, { ...command, asset_ids: assetIds }),
    onSuccess: next => {
      setStarted(next.job_id || null);
      queryClient.setQueryData(LIBRARY_PROCESSING_KEY, next);
      void queryClient.invalidateQueries({ queryKey: LIBRARY_PROCESSING_KEY });
    },
  });
  const state = job.data;
  useEffect(() => {
    if (!state || !started || state.job_id !== started || processingActive(state)
      || completed.current === started) return;
    completed.current = started;
    if (state.status === 'complete') {
      setOutcome(`补全完成：取得 ${state.covers || 0} 张封面，生成 ${state.previews || 0} 部视频预览。`);
    }
    void queryClient.invalidateQueries({ queryKey: ['catalog-grid'] });
    onComplete?.();
  }, [state, started, onComplete]);
  // 运行时保留缺图数量；新范围等待当前任务结束，不隐式追加或替换。
  const busy = start.isPending || processingActive(state);
  const problem = start.error ? errorMessage(start.error) : job.error ? DISCONNECTED_TEXT
    : started && state?.job_id === started && state.status === 'failed' ? state.error || '补全未完成' : '';
  const later = processingActive(state) ? '当前任务结束后可单独补全。' : '';
  const total = new Set([...assetIds, ...meteredIds]).size.toLocaleString();
  const metered = meteredIds.length.toLocaleString();
  const summary = !assetIds.length
    ? `这批影片中有 ${metered} 部暂无预览，都在流量保护目录，同步时不抽帧，${later || '可单独补全预览。'}`
    : meteredIds.length
      ? `这批影片中有 ${total} 部暂无预览，其中 ${metered} 部在流量保护目录，${later || '可补全资料与图片。'}`
      : `这批影片中有 ${total} 部暂无预览，${later || '可补全资料与图片。'}`;
  const message = problem || (start.isPending ? '正在启动补全…' : outcome || summary);
  const meteredRun = async () => {
    if (busy || !await confirmMeteredPreviews(meteredIds.length)) return;
    setOutcome('');
    start.mutate('metered');
  };
  const blocked = state?.metadata_only ? '请先在媒体库设置中开启视频预览生成' : '';
  // 主按钮在最右：两批都有时「同步这些影片」是主操作，流量保护那批是它左边的次要按钮。
  return <section aria-label="补全预览" aria-live="polite" data-library-completion="" className={cx('@container', className)}>
    <Note tone={problem ? 'warning' : 'neutral'} action={<div className="flex flex-wrap items-center gap-2">
      {meteredIds.length ? <Button variant={assetIds.length ? 'secondary' : 'primary'} disabled={!!blocked}
        title={blocked || undefined} {...busyProps(busy)} onClick={() => { void meteredRun() }}>
        {assetIds.length ? `补全流量保护的 ${metered} 部` : `补全这 ${metered} 部的预览`}</Button> : null}
      {assetIds.length ? <ProcessingActions busy={busy} metadataOnly={state?.metadata_only} onRun={command => {
        if (busy) return;
        setOutcome('');
        start.mutate(command);
      }} /> : null}
    </div>}>
      {message}{' '}<LinkButton href="/data-cleanup#libraryProcessing" size="small" trailingIcon={RiArrowRightLine}>
      {problem ? '打开扫描与采集' : '查看处理详情'}
    </LinkButton></Note>
  </section>;
}
