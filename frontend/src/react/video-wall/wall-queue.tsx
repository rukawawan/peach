import { cardArtwork } from '@peach/card-art';
import { fmtDur } from '@peach/legacy/core';
import { ArtSlot } from '../components/art-slot';
import { MixQueue, MixQueueRow } from '../components/mix-queue';
import { editionLabel, partLabel, type QueueItem } from '../item-detail/item-detail';
import { t } from '../../i18n';

/** 分卷、版次与墙内作品切换共用详情的队列行。 */
export function WallQueue({ items, activeId, kind, label, choose, close }: {
  items: readonly QueueItem[]; activeId: number; kind: string;
  label(item: QueueItem): string; choose(item: QueueItem): void; close(): void;
}) {
  return <div data-wall-queue="" id="wall-queue">
    <MixQueue kind={kind} title={kind === 'parts' ? t('catalog:detailQueue.parts') : kind === 'editions' ? t('catalog:detailQueue.editions') : t('catalog:shared.video')} summary={t('catalog:wallQueue.videoCount', { count: items.length })} onClose={close}>
      {items.map(item => <MixQueueRow key={item.id} current={item.id === activeId} data-wall-source={item.id}
        aria-label={[editionLabel(item), partLabel(item), label(item)].filter(Boolean).join(' · ')}
        onClick={() => choose(item)} pic={<ArtSlot artwork={cardArtwork(item, 'small', true, 'cover')} />}>
        <b>{label(item)}</b><span>{[editionLabel(item), partLabel(item), fmtDur(item.duration)].filter(Boolean).join(' · ')}</span>
      </MixQueueRow>)}
    </MixQueue>
  </div>;
}
