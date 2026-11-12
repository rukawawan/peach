import { useState, useSyncExternalStore, type ReactNode } from 'react';
import { entityPath } from '@peach/legacy/core';
import { RiExternalLinkLine } from '@remixicon/react';
import { Button, ButtonLink } from '@/components/base/buttons/button';
import { relayoutCovers } from '../../card-art/framing';
import { textLang } from '../../core/text-lang';
import { ArtSlot } from '../components/art-slot';
import { busyProps, useAction } from '../settings/use-action';
import { DiscoveryFaces } from './discovery-faces';
import { useJavSelection } from './jav-selection';
import { suppressShiftTextSelection } from '../components/row-click';
import { COVER_STATE_TITLE, coverFetchingHtml, coverStateAction, coverUrl } from '@peach/card-art';
import type { DownloadPrefill } from '../activity/cloud-download-dialog';
import { coverArrived, coverFetching, discoveryArtwork, fetchCoverNow, type Discovery } from './jav';

/** 「查找资源」弹窗的预填：本机有封面用本机那张，否则用来源地址。 */
export const resourcePrefill = (item: Discovery): DownloadPrefill =>
  ({ ...item, cover: item.has_cover ? coverUrl(item, true) : item.cover_url, origin: `${item.asset_id ? 'asset' : 'feed'}:${item.id}` });

const COVER_BOX = 'relative inline-grid place-items-center overflow-hidden rounded-2lg bg-background-tertiary-default';

/** 还没有封面的那一格：在等什么、为什么没有，排队的可以「优先处理」，取过没取到的可以「立即重试」，
 *  都是当场取这一部（`fetchCoverNow`），取到就把卡换成本机那张。字样与首页新作那一行同一份。 */
function CoverWait({ item, readOnly }: { item: Discovery; readOnly: boolean }) {
  const action = useAction();
  const [reason, setReason] = useState('');
  useSyncExternalStore(coverFetching.subscribe, coverFetching.revision);
  const state = item.cover_state;
  if (!state) return <span data-media-nopic="">无封面</span>;
  // 后台那一批正在取，或者这一部正当场取着（卡上点的、整批插队里轮到的）：不定进度圆环加一句「抓取中」。
  if (state === 'fetching' || coverFetching.has(item.code)) return <span dangerouslySetInnerHTML={{ __html: coverFetchingHtml() }} />;
  const retry = () => { void action.run('cover', signal => fetchCoverNow(item.code, signal), result => {
    if (result.has_cover) coverArrived(item.code, result); else setReason(result.message || '没有找到可用的官方封面');
  }) };
  // 当场取过一次没取到，这一格就按这一次的结论说话：标题换成「无封面」，键换成「立即重试」。
  const shown = reason || action.error ? 'missing' : state;
  const why = action.error || reason || item.cover_reason;
  return <div data-cover-state={shown} className="flex max-w-full flex-col items-center gap-1.5 px-4 text-center">
    <span data-media-nopic="">{COVER_STATE_TITLE[shown]}</span>
    {why ? <span className="line-clamp-3 text-caption-1-regular text-text-secondary" title={why}>{why}</span> : null}
    {readOnly ? null : <Button size="small" variant="secondary" className="mt-1" onClick={retry}>
      {coverStateAction(shown)}</Button>}
  </div>;
}

/** 「发现」与「新作」共用的库外作品卡：封面、出演、发行日、标签与想要／查找资源。
 *  `badge` 是标签行最前面那一枚（发现分区放推荐分），没有就不占位。 */
export function DiscoveryCard({ item, layout, javImage, readOnly, navigate, tag, onTag, wanting, onWant, onResource, badge }: {
  item: Discovery; layout: 'big' | 'small'; javImage: unknown; readOnly: boolean; navigate(path: string): void;
  tag: string; onTag(tag: string): void; wanting: boolean; onWant(): void; onResource(): void; badge?: ReactNode;
}) {
  const selection = useJavSelection();
  const selected = selection?.selected.has(item.code);
  const compact = Boolean(selection?.dense);
  const performers = item.performer_refs?.length ? item.performer_refs.map(person => person.name).join('、') : item.performers;
  const artwork = discoveryArtwork(item, layout, javImage);
  const href = item.asset_id ? `/assets/${item.asset_id}` : `/works/${encodeURIComponent(item.code)}`;
  return <article data-media-card="" data-jav-card="" data-selected={selected ? '' : undefined} onMouseDown={suppressShiftTextSelection}
    onClickCapture={event => {
      if (selection && (selection.mode || event.shiftKey || event.ctrlKey || event.metaKey)) {
        event.preventDefault(); event.stopPropagation(); selection.toggle(item, event.shiftKey);
      }
    }} onClick={event => {
    if (!(event.target as HTMLElement).closest('a,button,input')) navigate(href);
  }}>
    {artwork ? <a href={href} aria-label={`查看 ${item.code} 详情`}
      onClick={event => { if (!event.ctrlKey && !event.metaKey && !event.shiftKey && event.button === 0) { event.preventDefault(); navigate(href) } }}
      data-media-pic="" data-jav-cover-box="" className={COVER_BOX}>
      <ArtSlot artwork={{ kind: 'cover', html: artwork }} identity={discoveryArtwork(item, 'small', javImage)}
        relayout={root => relayoutCovers(root, layout)} />
    </a>
      // 没有图时这一格放状态与动作键，不能是链接：键放在 `<a>` 里一按就跟着跳进详情。点空处仍由卡片自己进详情。
      : <div data-media-pic="" data-jav-cover-box="" className={COVER_BOX}><CoverWait item={item} readOnly={readOnly} /></div>}
    {selection?.mode ? <button type="button" data-media-check="" aria-label={`选择 ${item.code}`} aria-pressed={Boolean(selected)}>
      <svg viewBox="0 0 24 24" aria-hidden="true"><use href="#i-check" /></svg></button> : null}
    <div data-media-meta="">
      <DiscoveryFaces item={item} />
      <div data-media-text="">
        <h3 data-jav-title="" data-media-title="" title={`${item.code} · ${item.title || '标题未取得'}`}><b>{item.code}</b> {item.title ? <span lang={textLang(item.title)}>{item.title}</span> : '标题未取得'}</h3>
        <div data-media-byline="">
          {item.performer_refs?.[0]?.id ? <a data-media-who="" href={entityPath('performer', item.performer_refs[0].name)} title={performers}>
            <svg viewBox="0 0 24 24" aria-hidden="true"><use href="#i-user-round" /></svg><span>{item.performer_refs[0].name}</span></a>
            : <span data-media-who="" title={performers}><svg viewBox="0 0 24 24" aria-hidden="true"><use href="#i-user-round" /></svg><span>{item.performer_refs?.[0]?.name || performers}</span></span>}
          {(item.performer_refs?.length || 0) > 1 ? <span data-media-who-more="">等 {item.performer_refs!.length} 人</span> : null}
          {item.release_date ? <span data-media-facts=""><time data-media-release="" dateTime={item.release_date}><svg viewBox="0 0 24 24" aria-hidden="true"><use href="#i-calendar" /></svg>{item.release_date}</time></span> : null}
        </div>
        <div data-jav-tags="" data-media-tags="">
          {badge}
          {(item.tags || []).slice(0, 4).map(name =>
            <button type="button" data-media-tag="" key={name} aria-pressed={tag === name} onClick={() => onTag(tag === name ? '' : name)}>{name}</button>)}
        </div>
      </div>
    </div>
    {!selection?.mode ? <div data-jav-actions="" data-compact={compact ? '' : undefined} data-has-source={item.link ? '' : undefined} className="flex flex-wrap gap-2">
      {item.link ? <ButtonLink data-button-link="" data-jav-source="" variant="secondary" size={compact ? 'small' : 'medium'}
        iconOnly={compact} aria-label="作品来源" title="作品来源" leadingIcon={compact ? RiExternalLinkLine : undefined}
        trailingIcon={compact ? undefined : RiExternalLinkLine} href={item.link} target="_blank" rel="noopener noreferrer">{compact ? null : '作品来源'}</ButtonLink> : null}
      <Button variant="ghost" size={compact ? 'small' : 'medium'} disabled={readOnly || item.wanted || !!item.asset_id} {...busyProps(wanting)} onClick={onWant}>
        {item.asset_id ? '已入库' : item.wanted ? '已想要' : '想要'}</Button>
      <Button variant="secondary" size={compact ? 'small' : 'medium'} onClick={onResource}>查找资源</Button>
    </div> : null}
  </article>;
}
