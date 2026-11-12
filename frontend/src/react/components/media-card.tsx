/* 馆藏里的一张作品卡：目录网格、资料页作品区、竖屏带与详情页的接着看都是它。
 *
 * 形状：封面格在上，下面一行头像、两行标题、一行署名与大小，再一行
 * 标签。封面格里是来源角标、分卷／版本计数、时长、观看进度；悬停或键盘聚焦时角标淡出，
 * 右上角一圈倒计时、右下角「稍后看」，
 * 停够了居中三颗快退、快进与打开详情。叠层纸边说明这张卡代表不止一条（分卷或版次）。
 *
 * 结构与样式钩子全用 `data-media-*`，不沿用旧类名：旧样式表不分层、排在后面，同名规则会
 * 落到这张卡上。样式写在 `./media-card.css`。
 *
 * 封面、头像与悬停预览取自 `@peach/card-art`，它们在这张卡上做三件 React 看不见的事，状态
 * 因此都写成属性而不是类名（类名归 React 管，重画一次就被冲掉）：
 * - 悬停预览（`wireHover`）往封面格里插 `video.hv`／`img.ui-hvframes`，在卡上切
 *   `data-previewing`／`data-longhover`，并在卡上挂 `_stopHover` 让滚动与换页时收掉。
 * - 封面取景（`coverAnchor`）改的是封面格里那张图，所以图以 HTML 片段交给封面格；
 *   大图／小图也在那张图上原地换，见 `./art-slot.tsx`。
 * - 图片微光（`PENDING_IMAGES`）在 `[data-media-art]` 上加 `imgwait`／`ui-imgdone`。
 *
 * 点击的分流：多选与修饰键优先，然后是打开、实体链接、未归属、
 * 标签，其余落到整张卡上就是打开。 */
import { memo, useCallback, useRef, useState, type CSSProperties, type MouseEvent, type ReactNode } from 'react';
import { cardRatio as layoutRatio } from '@peach/appearance';
import {
  cardArtwork, cardIdentity, entityAvatar, frameArtwork, performerLabel, relayoutCovers, releaseHover, wireHover,
} from '@peach/card-art';
import { esc, fmtDur, fmtSize } from '@peach/legacy/core';
import { spinnerHtml } from '@peach/legacy/ui';
import { entityDisplayName } from '../../core/entity-names';
import { useEntityNames } from '../use-entity-names';

import type { MediaCardActions, MediaCardHelpers, MediaCardLayout, MediaItem } from '../catalog-grid/types';
import { ArtSlot } from './art-slot';
import { ArtworkGapView, failedArtwork, missingArtwork, type ArtworkGap } from './artwork-gap';
import { CardDate, CardTags, Icon, WhoLabel } from './card-meta';
import { RecommendationReason } from './recommendation-reason';
import { useLibraryTints } from './library-tint';
import { suppressShiftTextSelection } from './row-click';

/** 竖屏一律同一个比例，不按每条视频的实际宽高：竖屏条与竖屏网格才高低一致。 */
const PORTRAIT_RATIO = 9 / 16;

export type MediaCardVariant = 'grid' | 'short' | 'next' | 'resource';

/** 片名空着时卡片标题与读屏名的兜底，资源卡那一档是「未命名资源」。 */
const UNNAMED = '未命名视频';


const RESOURCE_LABELS: Record<string, string> = { image: '图片', audio: '音频', archive: '压缩包', other: '其它文件' };
const DISPOSAL_LABELS = { manual: '手动', junk: '垃圾', duplicate: '重复', missing: '文件缺失' };

function DisposalReason({ item }: { item: MediaItem }) {
  if (item.disposal !== 'trash') return null;
  const label = (item.disposal_reason && DISPOSAL_LABELS[item.disposal_reason]) || '原因未记录';
  return <span data-media-disposal-reason="" title={`归入原因：${label}`}>{label}</span>;
}

/** 视频与资源共用回收站操作，失败原因留在卡片上供重试。 */
function ResourceAction({ item, actions }: { item: MediaItem; actions: MediaCardActions }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const operation = item.disposal === 'trash' ? 'restore' : 'dispose';
  const label = operation === 'restore' ? '还原' : '移入回收站';
  const run = (event: MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    if (busy) return;
    setBusy(true);
    setError('');
    void actions.resourceOperation(item, operation)
      .catch((cause: unknown) => setError(cause instanceof Error ? cause.message : '操作失败，请重试'))
      .finally(() => setBusy(false));
  };
  return <>
    <button type="button" data-media-resource-action={operation} aria-label={`${label} ${item.name || '未命名资源'}`}
      title={label} onClick={run} aria-busy={busy || undefined} aria-disabled={busy || undefined}>
      {busy ? <><span dangerouslySetInnerHTML={{ __html: spinnerHtml(`正在${label}`) }} /><span>{`正在${label}`}</span></>
        : <span>{label}</span>}
    </button>
    {error ? <span data-media-operation-error="" role="alert">{error}</span> : null}
  </>;
}

/** 一个列表里的画面框等高：竖屏带一律竖屏比例，其余按版式取外观应用层那一份（`@peach/appearance`
 *  的 `cardRatio`，骨架读的也是它）。 */
export function cardRatio(_item: MediaItem, variant: MediaCardVariant, layout: MediaCardLayout): number {
  return variant === 'short' ? PORTRAIT_RATIO : layoutRatio(layout);
}

export interface MediaCardProps {
  item: MediaItem;
  variant: MediaCardVariant;
  layout: MediaCardLayout;
  selected: boolean;
  selectMode: boolean;
  seekSeconds: number;
  helpers: MediaCardHelpers;
  actions: MediaCardActions;
  /** 点这张卡打开什么。竖屏带点进沉浸模式，回收站里的资源按类型分流，其余打开详情。 */
  onOpen(item: MediaItem, anchor: HTMLElement): void;
  /** 这张卡代表整组分卷或版本（「合并分卷与版本」开着）。关着时一卷一张卡，卡面只写这一个文件的
   *  名字、时长与大小，不标整组卷数；打开时照旧按条目上的分组进分卷或版本队列。默认开。 */
  grouped?: boolean;
}

/** 署名：头像和名字落到同一个身份上（`cardIdentity`）。共演只写第一位再给总人数。 */
export function identityParts(item: MediaItem): { avatar: ReactNode; who: ReactNode } {
  const { kind, name, coStarred, performers, refs, total } = cardIdentity(item);
  const performer = performers[0] || '';
  const label = performerLabel(item);
  const avatar = coStarred
    ? (
      <div data-media-avatars="" style={{ '--media-avatar-count': Math.min(5, performers.length) } as CSSProperties}>
        {performers.slice(0, 5).map((nm, index) => (
          <button key={`${nm}:${index}`} type="button" data-media-avatar="" data-entity-kind="performer"
            data-entity-name={nm} title={`打开${label}页：${entityDisplayName('performer', nm, refs[index]?.id)}`}
            style={{ '--media-avatar-index': index } as CSSProperties}
            dangerouslySetInnerHTML={{ __html: entityAvatar(nm, refs[index] ?? null, 'performer') }} />
        ))}
      </div>
    )
    : kind
      ? (
        <button type="button" data-media-avatar="" data-entity-kind={kind} data-entity-name={name}
          title={`打开${kind === 'performer' ? label : '资料'}页`}
          dangerouslySetInnerHTML={{
            __html: entityAvatar(name, kind === 'performer' ? refs[0] ?? null : item.creator_entity ?? null, kind),
          }} />
      )
      : <span data-media-avatar="" dangerouslySetInnerHTML={{ __html: entityAvatar(name, null, '') }} />;
  const who = coStarred
    ? (
      <>
        <button type="button" data-media-who="" data-entity-kind="performer" data-entity-name={performer} title={entityDisplayName('performer', performer)}><WhoLabel name={entityDisplayName('performer', performer)} /></button>
        <span data-media-who-more="">{`等 ${total} 人`}</span>
      </>
    )
    : kind
      ? <button type="button" data-media-who="" data-entity-kind={kind} data-entity-name={name} title={entityDisplayName(kind, name)}><WhoLabel name={entityDisplayName(kind, name)} /></button>
      /* 没有署名人的那批是馆藏里的一类，点得开，和女优名、厂牌名一样。 */
      : <button type="button" data-media-who="" data-open-unowned=""><WhoLabel name={name} /></button>;
  return { avatar, who };
}

/** 悬停时右上角那一圈倒计时，走完就放大；点它直接打开。 */
function PreviewCounter() {
  return (
    <button type="button" data-media-preview="" data-open="" title="打开预览" aria-label="打开预览">
      <svg viewBox="-18 -18 36 36" aria-hidden="true"><circle r="17" /><circle r="17" /></svg>
      <svg data-media-ring-play="" viewBox="0 0 24 24" aria-hidden="true"><use href="#i-play" /></svg>
    </button>
  );
}

/** 「稍后看」写 ledger，只由点击触发；做完给一颗撤销键，撤销回来时按钮跟着回去。
 *  按下态先认这张卡上刚写成的结果，没写过就认条目本身：同一条被重取之后照新值画。 */
function LaterButton({ item, actions, on, onChange }: {
  item: MediaItem; actions: MediaCardActions; on: boolean; onChange(on: boolean): void;
}) {
  const [busy, setBusy] = useState(false);
  const click = (event: MouseEvent) => {
    event.stopPropagation();
    if (busy) return;
    setBusy(true);
    void actions.watchLater(item, onChange).finally(() => setBusy(false));
  };
  return (
    <div data-media-later="">
      <button type="button" data-later="" aria-pressed={on} title="稍后看" aria-label="稍后看" onClick={click}
        aria-busy={busy || undefined} aria-disabled={busy || undefined}>
        <Icon name={on ? 'check' : 'bookmark-plus'} />
      </button>
    </div>
  );
}

/** 快退、快进跳的是悬停预览那段视频本身，不打开详情。 */
function seekPreview(card: HTMLElement | null, delta: number) {
  const video = card?.querySelector<HTMLVideoElement & { _hop?: ReturnType<typeof setInterval> | null }>('video.hv');
  if (!video || !Number.isFinite(video.duration)) return;
  if (video._hop) { clearInterval(video._hop); video._hop = null }
  video.currentTime = Math.max(0, Math.min(video.duration, video.currentTime + delta));
}

function VideoCard({ item, variant, layout, selected, selectMode, seekSeconds, helpers, actions, onOpen, grouped = true }: MediaCardProps) {
  useEntityNames();
  const card = useRef<HTMLElement | null>(null);
  const [written, setWritten] = useState<{ id: number; on: boolean } | null>(null);
  const later = written?.id === item.id ? written.on : !!item.watch_later;
  const tints = useLibraryTints();
  const library = item.library_id && tints.get(item.library_id)?.color ? item.library_id : undefined;
  const flaggedBy = [Number(item.liked) > 0 ? '喜欢' : '', Number(item.o_count) > 0 ? '有高潮记录' : ''].filter(Boolean);
  const latest = useRef(item);
  latest.current = item;
  /* 资源身份或缩略图能力变化时重绑；wireHover 先清理旧事件，避免虚拟卡片复用旧资源。 */
  const attach = useCallback((el: HTMLElement | null) => {
    const current = latest.current;
    if (card.current && card.current !== el) releaseHover(card.current);
    card.current = el;
    if (el && (!current.medium || current.medium === 'video')) wireHover(el, current);
  }, [item.id, item.location, item.has_thumb, item.medium]);

  /* 按画幅筛的列表里，接口只算同画幅的卷与版本，组可能只剩一卷或一个版本：那张卡就是这一个
     文件自己，不叠纸边、不标卷数或版本数。 */
  const parts = grouped && Number(item.part_group?.count) > 1 ? item.part_group || null : null;
  const editions = grouped && Number(item.edition_group?.count) > 1 ? item.edition_group || null : null;
  const stacked = !!(parts || editions);
  const jav = layout.active && !!item.is_jav;
  const ratio = cardRatio(item, variant, layout);
  const size = jav ? layout.size : 'small';
  /* 竖屏格（竖屏带与筛竖屏的网格）只展示竖屏比例的视频，卡面只用视频自己的帧图；番号作品也
     不走官方封面，「JAV 默认封面」设置在这里不起作用：那张封面是整部作品的宣传图，多是横图，
     和这一卷竖屏视频不是同一个画面。没有图时写缺的是什么、为什么缺（`./artwork-gap.tsx`）。 */
  const frameOnly = ratio === PORTRAIT_RATIO && !!item.is_jav;
  const drawn = frameOnly ? frameArtwork(item, false) : cardArtwork(item, size, false, layout.javImage);
  const identity = frameOnly || size === 'small' ? drawn.html : cardArtwork(item, 'small', false, layout.javImage).html;
  /* 取失败记在当时那段片段上：换了图（补到封面、改了「JAV 默认封面」）就不再算失败。重试给地址
     添一个序号，身份跟着变，`ArtSlot` 才会换一个新元素重新取。 */
  const [failure, setFailure] = useState<{ html: string; gap: ArtworkGap | null } | null>(null);
  const [attempt, setAttempt] = useState(0);
  const failed = failure?.html === drawn.html ? failure : null;
  const artwork = attempt ? { ...drawn, html: drawn.html.replace(/ src="([^"]*)"/, (_all, src: string) =>
    ` src="${src}${src.includes('?') ? '&amp;' : '?'}r=${attempt}"`) } : drawn;
  const onFailed = useCallback((src: string) => {
    const html = drawn.html;
    setFailure({ html, gap: null });
    void failedArtwork(src.replace(/&r=\d+$/, ''), drawn.kind).then(gap =>
      setFailure(current => current?.html === html ? { html, gap } : current));
  }, [drawn.html, drawn.kind]);
  const retry = useCallback(() => { setFailure(null); setAttempt(count => count + 1) }, []);
  const gap = !artwork.html ? missingArtwork(item, frameOnly) : failed
    ? failed.gap || { key: 'checking', title: drawn.kind === 'cover' ? '封面未取得' : '预览未取得', reason: '正在查原因', fix: '' as const }
    : null;
  const rawName = parts?.title || item.name || '';
  const shownName = helpers.displayName(item, rawName).trim() || UNNAMED;
  const titleHtml = helpers.titleHtml(item, rawName).trim() || esc(UNNAMED);
  const shownSize = parts?.total_size ?? item.size;
  const shownDuration = parts?.total_duration ?? item.duration;
  const watched = !parts && Number(item.play_seconds) > 0 && Number(item.duration) > 0
    ? Math.min(Number(item.play_seconds) / Number(item.duration), 1) : 0;
  const { avatar, who } = identityParts(item);
  const tags = (item.follow_tags || item.tags || []).slice(0, 3);

  const click = (event: MouseEvent<HTMLElement>) => {
    const target = event.target as HTMLElement;
    if (target.closest('[data-media-reason-dialog]')) return;
    const el = card.current;
    if (!el) return;
    if (selectMode || event.shiftKey || event.ctrlKey || event.metaKey) {
      event.preventDefault();
      actions.toggleSelection(item.id, event.shiftKey);
      return;
    }
    if (target.closest('[data-open]')) { onOpen(item, el); return }
    const entity = target.closest<HTMLElement>('[data-entity-kind]');
    if (entity && el.contains(entity)) {
      actions.openEntity(entity.dataset.entityKind || '', entity.dataset.entityName || '');
      return;
    }
    const unowned = target.closest('[data-open-unowned]');
    if (unowned && el.contains(unowned)) { actions.openUnowned(); return }
    const tag = target.closest<HTMLElement>('[data-tag]');
    if (tag && el.contains(tag)) { actions.toggleTag(tag.dataset.tag || ''); return }
    onOpen(item, el);
  };

  const pic = (
    <div data-media-pic="" data-pic-portrait={ratio === PORTRAIT_RATIO ? '' : undefined}
      style={{ '--card-ratio': String(ratio) } as CSSProperties}>
      {gap
        ? <ArtworkGapView gap={gap} item={item} onRetry={retry} />
        : <ArtSlot artwork={artwork} identity={`${identity}#${attempt}`} relayout={(root) => relayoutCovers(root, size)}
          onFailed={onFailed} />}
      <div data-media-badge="" dangerouslySetInnerHTML={{ __html: helpers.badgeHtml(item.location || '', item.cost || '') }} />
      <span data-media-check=""><Icon name="check" /></span>
      <span data-media-trash-mark=""><Icon name="trash" /><b>回收站</b></span>
      {parts && !editions ? <span data-media-group="">{`${Number(parts.count).toLocaleString()} 卷`}</span> : null}
      {editions
        ? <span data-media-group="" title={editions.editions.join(' · ')}>{`${Number(editions.count).toLocaleString()} 个版本`}</span>
        : null}
      {Number(shownDuration) > 0 ? <span data-media-duration="">{fmtDur(shownDuration)}</span> : null}
      {!selectMode && item.disposal === 'trash' ? <ResourceAction item={item} actions={actions} /> : null}
      {watched > 0
        ? (
          <div data-media-progress="" role="progressbar" aria-label="观看进度" aria-valuemin={0} aria-valuemax={100}
            aria-valuenow={Math.round(watched * 100)}>
            <i style={{ '--media-fill': `${(watched * 100).toFixed(1)}%` } as CSSProperties} />
          </div>
        )
        : item.leave_ratio != null
          ? (
            <div data-media-scrub="">
              <i style={{ '--media-fill': `${Math.round(item.leave_ratio * 100)}%` } as CSSProperties} />
            </div>
          )
          : null}
      <PreviewCounter />
      {later || flaggedBy.length
        ? (
          <div data-media-status="">
            {later ? <span data-status="later" title="稍后看" aria-label="稍后看"><Icon name="bookmark" /></span> : null}
            {flaggedBy.length
              ? <span data-status="flagged" title={`已标记：${flaggedBy.join('、')}`} aria-label={`已标记：${flaggedBy.join('、')}`}><Icon name="heart" /></span>
              : null}
          </div>
        )
        : null}
      {!selectMode ? <LaterButton item={item} actions={actions} on={later} onChange={on => setWritten({ id: item.id, on })} /> : null}
      {!selectMode ? <div data-media-seek="">
        <button type="button" onClick={(event) => { event.stopPropagation(); seekPreview(card.current, -seekSeconds) }}
          title={`后退 ${seekSeconds} 秒`} aria-label={`后退 ${seekSeconds} 秒`}><Icon name="rotate-ccw" /></button>
        <button type="button" onClick={(event) => { event.stopPropagation(); seekPreview(card.current, seekSeconds) }}
          title={`前进 ${seekSeconds} 秒`} aria-label={`前进 ${seekSeconds} 秒`}><Icon name="rotate-cw" /></button>
        <button type="button" data-open="" title="打开详情" aria-label="打开详情"><Icon name="expand" /></button>
      </div> : null}
    </div>
  );

  return (
    <article ref={attach} data-media-card="" data-id={item.id} data-variant={variant}
      data-guide-video={item.location !== 'online' && !String(item.name || '').toLowerCase().endsWith('.iso') ? '' : undefined}
      data-watch-later={later ? '' : undefined} data-library={library}
      data-jav-item={item.is_jav ? '' : undefined}
      data-part-seed={parts ? parts.seed_id : undefined} data-stacked={stacked ? '' : undefined}
      data-pending-delete={item.disposal === 'trash' ? '' : undefined} data-selected={selected ? '' : undefined}
      onClick={click} onMouseDown={suppressShiftTextSelection}>
      <button type="button" data-media-open="" data-open=""
        aria-label={`打开 ${shownName}${editions ? '版本' : parts ? '分卷' : '详情'}`} />
      {stacked ? <div data-media-stack="">{pic}</div> : pic}
      <div data-media-meta="">
        {avatar}
        <div data-media-text="">
          <button type="button" data-media-title="" data-open=""
            dangerouslySetInnerHTML={item.disposal === 'trash' ? undefined : { __html: titleHtml }}>
            {item.disposal === 'trash' ? <span data-media-title-text="" dangerouslySetInnerHTML={{ __html: titleHtml }} /> : null}
          </button>
          <div data-media-byline="">
            {who}
            {item.why && variant !== 'next' ? <span data-media-why="" title={item.why}>{item.why}</span> : null}
            <span data-media-facts="">
              {item.is_jav && item.release_date ? <CardDate value={item.release_date} label={item.release_date} /> : null}
              <span data-media-size=""><Icon name="hard-drive" />{Number(shownSize) > 0 ? fmtSize(Number(shownSize)) : '大小未知'}</span>
            </span>
          </div>
          {variant === 'next' ? <RecommendationReason reasons={item.why ? item.why.split(' · ') : []}
            tags={(item.why_tags || []).map(helpers.tagLabel)} /> : tags.length || item.disposal === 'trash'
            ? <CardTags tags={tags} label={helpers.tagLabel} readOnly={!!item.follow_item_id} />
            : null}
          <DisposalReason item={item} />
        </div>
      </div>
    </article>
  );
}

/** 回收站里不是视频的那些：图片、音频、压缩包和网址快捷方式。卡上只有一枚「还原」或
 *  「移入回收站」，点了就写 ledger，做完给一颗撤销键。 */
function ResourceCard({ item, selected, selectMode, helpers, actions, onOpen }: MediaCardProps) {
  const card = useRef<HTMLElement | null>(null);
  const image = item.medium === 'image' && item.location !== 'online';
  const name = String(item.name || '');
  const label = name.toLowerCase().endsWith('.url') ? '网址快捷方式' : RESOURCE_LABELS[item.medium || ''] || '其它文件';
  const glyph = image ? 'pics' : label === '网址快捷方式' ? 'globe' : 'hard-drive';
  const click = (event: MouseEvent<HTMLElement>) => {
    if (!card.current) return;
    if (selectMode || event.shiftKey || event.ctrlKey || event.metaKey) {
      event.preventDefault();
      actions.toggleSelection(item.id, event.shiftKey);
      return;
    }
    onOpen(item, card.current);
  };
  return (
    <article ref={card} data-media-card="" data-id={item.id} data-variant="resource" data-medium={item.medium || 'other'}
      data-pending-delete={item.disposal === 'trash' ? '' : undefined} data-selected={selected ? '' : undefined}
      onClick={click} onMouseDown={suppressShiftTextSelection}>
      <div data-media-pic="" style={{ '--card-ratio': String(16 / 9) } as CSSProperties}>
        <span data-media-glyph=""><Icon name={glyph} /><b>{label}</b></span>
        {image
          ? <span data-media-art="thumb" dangerouslySetInnerHTML={{
            __html: `<img class="poster" src="/photo-thumb?id=${item.id}" width="640" height="360" alt="" loading="lazy" data-drop="self">`,
          }} />
          : null}
        <div data-media-badge="" dangerouslySetInnerHTML={{ __html: helpers.badgeHtml(item.location || '', item.cost || '') }} />
        <span data-media-check=""><Icon name="check" /></span>
        <span data-media-trash-mark=""><Icon name="trash" /><b>回收站</b></span>
        {!selectMode ? <ResourceAction item={item} actions={actions} /> : null}
      </div>
      <div data-media-meta="">
        <span data-media-avatar="" data-media-kind-glyph="" aria-hidden="true"><Icon name={glyph} /></span>
        <div data-media-text="">
          <span data-media-title="" data-middle-truncate="" title={name}
            dangerouslySetInnerHTML={{ __html: esc(name || '未命名资源') }} />
          <div data-media-byline="">
            <span data-media-who="">{label}</span>
            {item.why ? <span data-media-why="">{item.why}</span> : null}
            <span data-media-size="">{Number(item.size) > 0 ? fmtSize(Number(item.size)) : '大小未知'}</span>
          </div>
          {item.disposal === 'trash' ? <div data-media-tags="" /> : null}
          <DisposalReason item={item} />
        </div>
      </div>
    </article>
  );
}

function MediaCardView(props: MediaCardProps) {
  if (props.variant === 'resource') return <ResourceCard {...props} />;
  return <VideoCard {...props} />;
}

/** 一屏几十上百张，选择与版式之外的重画不该连带每一张：比较的都是引用，壳递进来的
 *  助手与动作身份不变。 */
export const MediaCard = memo(MediaCardView);
