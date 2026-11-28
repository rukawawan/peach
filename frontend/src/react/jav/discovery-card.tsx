import { useState, useSyncExternalStore, type ReactNode } from 'react';
import { hasSelectionModifier } from '../../selection';
import { RiExternalLinkLine } from '@remixicon/react';
import { Button, ButtonLink } from '@/components/base/buttons/button';
import { fmtDur } from '@peach/legacy/core';
import { relayoutCovers } from '../../card-art/framing';
import { entityDisplayName } from '../../core/entity-names';
import { textLang } from '../../core/text-lang';
import { ArtSlot } from '../components/art-slot';
import { busyProps, useAction } from '../settings/use-action';
import { DiscoveryCastMore, DiscoveryFaces, DiscoveryPerformerName, type DiscoveryPerson } from './discovery-faces';
import { SiteLabel } from '../components/source-label';
import { useJavSelection } from './jav-selection';
import { suppressShiftTextSelection } from '../components/row-click';
import { COVER_STATE_TITLE, coverFetchingHtml, coverReason, coverStateAction, coverUrl } from '@peach/card-art';
import { ActivityMotion } from '../components/activity-motion';
import type { DownloadPrefill } from '../activity/cloud-download-dialog';
import { coverArrived, coverFetching, discoveryArtwork, fetchCoverNow, type Discovery } from './jav';
import { joinList, t } from '../../i18n';
import { useWorkContextMenu } from '../components/work-context-menu';
import { useEntityNames } from '../use-entity-names';
import { discoveryContext } from './discovery-context';
import { StudioFilterLabel } from './jav-facets';

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
  if (!state) return <span data-media-nopic="">{t('catalog:shared.noCover')}</span>;
  // 后台那一批正在取，或者这一部正当场取着（卡上点的、整批插队里轮到的）：传输动画加一句「抓取中」。
  if (state === 'fetching' || coverFetching.has(item.code)) return <span dangerouslySetInnerHTML={{ __html: coverFetchingHtml() }} />;
  const retry = () => { void action.run('cover', signal => fetchCoverNow(item.code, signal), result => {
    if (result.has_cover) coverArrived(item.code, result); else setReason(result.message || t('catalog:javDiscovery.noOfficialCover'));
  }) };
  // 当场取过一次没取到，这一格就按这一次的结论说话：标题换成「无封面」，键换成「立即重试」。
  const shown = reason || action.error ? 'missing' : state;
  const why = action.error || reason || coverReason(item);
  return <div data-cover-state={shown} className="flex max-w-full flex-col items-center gap-1.5 px-4 text-center">
    {/* 排队的只给静帧：一屏几十张排队的卡同时转，正在抓的那几张反而看不出来。 */}
    {shown === 'queued' ? <ActivityMotion kind="clock" size="card" still /> : null}
    <span data-media-nopic="">{COVER_STATE_TITLE[shown]}</span>
    {why ? <span className="line-clamp-3 text-caption-1-regular text-text-secondary" title={why}>{why}</span> : null}
    {readOnly ? null : <Button size="small" variant="secondary" className="mt-1" onClick={retry}>
      {coverStateAction(shown)}</Button>}
  </div>;
}

/** 「发现」与「新作」共用的库外作品卡：封面、出演、发行日、标签与想要／查找资源。
 *  `badge` 是标签行最前面那一枚（发现分区放推荐分），没有就不占位。 */
export function DiscoveryCard({ item, layout, javImage, readOnly, navigate, tag = '', onTag, wanting, onWant, onResource, badge,
  onFilterPerson, studioFilter }: {
  item: Discovery; layout: 'big' | 'small'; javImage: unknown; readOnly: boolean; navigate(path: string): void;
  tag?: string | readonly string[]; onTag?(tag: string): void; wanting?: boolean; onWant?(): void; onResource?(): void;
  badge?: ReactNode; onFilterPerson?(person: DiscoveryPerson): void;
  studioFilter?: { selected: boolean; onPress(): void };
}) {
  useEntityNames();
  const online = !!onFilterPerson;
  const worksSelection = useJavSelection();
  const selection = item.code ? worksSelection : null;
  const context = useWorkContextMenu();
  const menuContext = !online && onWant && onResource
    ? discoveryContext(item, { selection, readOnly, wanting: !!wanting, navigate, onWant, onResource }) : null;
  const selected = selection?.selected.has(item.code);
  const compact = !online && Boolean(worksSelection?.dense);
  const performers = item.performer_refs?.length ? joinList(item.performer_refs.map(person => person.name)) : item.performers;
  const person = item.performer_refs?.[0];
  const name = person ? entityDisplayName('performer', person.name, person.id) : performers.split(/[,，、;/]/)[0] || '';
  const duration = online && item.duration ? fmtDur(item.duration) : '';
  const artwork = discoveryArtwork(item, layout, javImage);
  const href = item.asset_id ? `/assets/${item.asset_id}` : item.code ? `/works/${encodeURIComponent(item.code)}` : item.link;
  const external = !item.code && !!item.link;
  const open = () => {
    if (external) window.open(href, '_blank', 'noopener');
    else navigate(href);
  };
  return <article data-media-card="" data-jav-card="" data-rectangle-key={item.code || undefined} data-selected={selected ? '' : undefined} onMouseDown={suppressShiftTextSelection}
    onContextMenu={menuContext ? event => context.onContextMenu(event, menuContext) : undefined}
    onKeyDown={menuContext ? event => context.onKeyDown(event, menuContext) : undefined}
    onClickCapture={event => {
      if ((event.target as Element).closest('[data-work-context-menu]')) return;
      if (selection && (selection.mode || hasSelectionModifier(event))) {
        event.preventDefault(); event.stopPropagation(); selection.toggle(item, event.shiftKey);
      }
    }} onClick={event => {
    if (!(event.target as HTMLElement).closest('a,button,input,[role="dialog"]')) open();
  }}>
    {context.menu}
    {artwork ? <a href={href} aria-label={t('catalog:javDiscovery.viewDetails', { code: item.code || item.title })}
      {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
      onClick={event => { if (!external && !event.ctrlKey && !event.metaKey && !event.shiftKey && event.button === 0) { event.preventDefault(); open() } }}
      data-media-pic="" data-jav-cover-box="" className={COVER_BOX}>
      <ArtSlot artwork={{ kind: 'cover', html: artwork }} identity={discoveryArtwork(item, 'small', javImage)}
        relayout={root => relayoutCovers(root, layout)} />
      {duration ? <span data-media-duration="">{duration}</span> : null}
    </a>
      // 没有图时这一格放状态与动作键，不能是链接：键放在 `<a>` 里一按就跟着跳进详情。点空处仍由卡片自己进详情。
      : <div data-media-pic="" data-jav-cover-box="" className={COVER_BOX}><CoverWait item={item} readOnly={readOnly} /></div>}
    {selection?.mode ? <button type="button" data-media-check="" aria-label={t('catalog:javDiscovery.select', { code: item.code })} aria-pressed={Boolean(selected)}>
      <svg viewBox="0 0 24 24" aria-hidden="true"><use href="#i-check" /></svg></button> : null}
    <div data-media-meta="">
      <DiscoveryFaces item={item} limit={online ? 3 : undefined} />
      <div data-media-text="">
        <h3 data-jav-title="" data-media-title="" title={`${item.code} · ${item.title || t('catalog:javDiscovery.titleNotFound')}`}><b>{item.code}</b> {item.title ? <span lang={textLang(item.title)}>{item.title}</span> : t('catalog:javDiscovery.titleNotFound')}</h3>
        <div data-media-byline="">
          <DiscoveryPerformerName person={person} name={name} title={performers} onFilter={onFilterPerson} icon />
          <DiscoveryCastMore people={item.performer_refs || []} onFilter={onFilterPerson} />
          {item.release_date || studioFilter && item.studio_ref ? <span data-media-facts="">
            {item.release_date ? <time data-media-release="" dateTime={item.release_date}><svg viewBox="0 0 24 24" aria-hidden="true"><use href="#i-calendar" /></svg>{item.release_date}</time> : null}
            {studioFilter && item.studio_ref ? <button data-media-who="" type="button" aria-pressed={studioFilter.selected}
              title={item.studio_ref.name} onClick={studioFilter.onPress}><StudioFilterLabel studio={item.studio_ref} /></button> : null}
          </span> : null}
        </div>
        <div data-jav-tags="" data-media-tags="">
          {badge}
          {(item.tags || []).slice(0, 4).map(name =>
            <button type="button" data-media-tag="" key={name} aria-pressed={typeof tag === 'string' ? tag === name : tag.includes(name)}
              onClick={() => onTag?.(tag === name ? '' : name)}>{name}</button>)}
        </div>
      </div>
    </div>
    {!selection?.mode ? <div data-jav-actions="" data-compact={compact ? '' : undefined} data-has-source={item.link ? '' : undefined} className="flex flex-wrap gap-2">
      {item.link ? <ButtonLink data-button-link="" data-jav-source="" variant="secondary" size={compact ? 'small' : 'medium'}
        iconOnly={compact} aria-label={t('catalog:shared.viewOnSite')} title={t('catalog:shared.viewOnSite')} leadingIcon={compact ? RiExternalLinkLine : undefined}
        trailingIcon={compact ? undefined : RiExternalLinkLine} href={item.link} target="_blank" rel="noopener noreferrer">
        {compact ? null : online ? <SiteLabel site="dmm" label="DMM" /> : t('catalog:shared.viewOnSite')}
      </ButtonLink> : null}
      {onWant ? <Button variant="ghost" size={compact ? 'small' : 'medium'} disabled={readOnly || item.wanted || !!item.asset_id} {...busyProps(!!wanting)} onClick={onWant}>
        {item.asset_id ? t('catalog:javWant.imported') : item.wanted ? t('catalog:javWant.wanted') : t('catalog:javWant.want')}</Button> : null}
      {onResource ? <Button variant="secondary" size={compact ? 'small' : 'medium'} onClick={onResource}>{t('catalog:shared.searchTorrents')}</Button> : null}
    </div> : null}
  </article>;
}
