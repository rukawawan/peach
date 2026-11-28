/* 新作那一行的卡片区，首页与资料页共用：画进壳留好的 `section.feednew` 宿主里，卡片是壳拼的
 * 那一份模板（`feedNewCardHtml`）。忽略的那条当场消失，已看过的留在原位只是变淡，想要那颗键
 * 按下去换成填实的星；三样都直接改这一行的节点，不重画整行——重画会把横滚的位置和自动滚动
 * 一起打回起点。一条都没有就整块不出。 */
import { useContext, useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore, type MouseEvent, type KeyboardEvent } from 'react';
import { RiEyeLine, RiEyeOffLine, RiPlayLine, RiStarLine } from '@remixicon/react';
import { createPortal } from 'react-dom';
import { ShellActionsContext } from '../router/router';
import { SourceAvatar } from '../components/source-avatar';
import { coverImage, coverStateHtml } from '@peach/card-art';
import { fitSkeleton } from '@peach/legacy/ui';
import { feedNewSkeletonHtml } from '../../feed-new-skeleton';
import { RetryNote } from '../components/grid-reveal';
import { CoverQueue } from '../components/cover-queue';
import { fetchCoverNow, type CoverNow } from '../jav/jav';

import type { FeedNew } from './feed-new';
import { t } from '../../i18n';
import { useWorkContextMenu, type WorkContextOperation } from '../components/work-context-menu';
import { Button } from '@/components/base/buttons/button';
import { selectMode, selected, followSelected, subscribeShell } from '@peach/shell';
import { useRectangleSelection } from '../components/rectangle-selection';
import { SelectionDock } from '../components/selection-dock';
import type { BulkAction } from '../components/bulk-action';
import { applyFeedBatch } from './feed-new';

const readSelectMode = () => selectMode;
const mediaSelectionCount = () => selected.size + followSelected.size;

/** 封面格的「优先处理」「立即重试」：不进后台那条队，当场取这一部的封面，等的时候是不定进度圆环。
 *  取完只换这一格，不重画整行；没取到就落成「无封面」，原因换成这一次的。回这一部取没取到。 */
async function prioritise(code: string, slot: Element, card: Element): Promise<boolean> {
  const waiting = document.createElement('span');
  waiting.innerHTML = coverStateHtml({ code, cover_state: 'fetching' });
  slot.replaceWith(...waiting.childNodes);
  const placeholder = card.querySelector('[data-feed-cover-state="fetching"]')!;
  const result = await fetchCoverNow(code).catch((error: unknown): CoverNow =>
    ({ has_cover: false, cover_version: '', message: error instanceof Error ? error.message : '' }));
  placeholder.outerHTML = result.has_cover
    ? coverImage({ code, has_cover: true, cover_version: result.cover_version, cover_frame: result.cover_frame,
      poster_box: result.poster_box, title: card.querySelector('.t')?.textContent || '' }, 'big')
    : coverStateHtml({ code, cover_state: 'missing', cover_reason: result.message || t('follow:newReleasesRow.noOfficialCover') });
  return result.has_cover;
}

export function FeedNewRow({ feedNew, host, wire, act, settled, error, retry }: {
  feedNew: FeedNew | null;
  error?: string;
  retry?(): void;
  host: HTMLElement;
  /** 拖动、滚轮，按设置接自动滚动。 */
  wire(row: Element | null): void;
  /** 卡上那三颗键的写操作。 */
  act(feedId: number, action: string): Promise<void>;
  /** 有没有卡：画出来、或最后一张被收起时报一次。 */
  settled?(hasItems: boolean): void;
}) {
  const actions = useContext(ShellActionsContext);
  const menu = useWorkContextMenu();
  const box = useRef<HTMLDivElement>(null);
  const [sourceFaces, setSourceFaces] = useState<HTMLElement[]>([]);
  const html = feedNew?.items.length ? feedNew.html : '';
  const selecting = useSyncExternalStore(subscribeShell, readSelectMode);
  const mediaCount = useSyncExternalStore(subscribeShell, mediaSelectionCount);
  const [picked, setPicked] = useState<ReadonlySet<number>>(new Set());
  useEffect(() => {
    if (!selecting || mediaCount) setPicked(current => current.size ? new Set() : current);
  }, [selecting, mediaCount]);
  const rectangle = useRectangleSelection(html ? (keys, add) => {
    if (keys.length) actions?.clearMediaSelection?.();
    setPicked(current => new Set([...(add ? current : []), ...keys.map(Number)]));
  } : undefined, { selecting, items: '[data-feed-id][data-rectangle-key]', start: '.feednewrow' });
  useLayoutEffect(() => {
    for (const card of box.current?.querySelectorAll<HTMLElement>('[data-feed-id]') ?? []) {
      card.dataset.rectangleKey = card.dataset.feedId!;
      const on = picked.has(Number(card.dataset.feedId));
      card.toggleAttribute('data-feed-selected', selecting && on);
      const link = card.querySelector('.feednewopen');
      if (selecting) {
        if (link && !link.hasAttribute('data-feed-open-label')) link.setAttribute('data-feed-open-label', link.getAttribute('aria-label') || '');
        link?.setAttribute('role', 'button');
        link?.setAttribute('aria-pressed', String(on));
        link?.setAttribute('aria-label', t('shell:feedNew.selectNamed', { name: card.querySelector('.t')?.textContent?.trim() || '' }));
      } else {
        link?.removeAttribute('role');
        link?.removeAttribute('aria-pressed');
        if (link?.hasAttribute('data-feed-open-label')) {
          link.setAttribute('aria-label', link.getAttribute('data-feed-open-label')!);
          link.removeAttribute('data-feed-open-label');
        }
      }
    }
  }, [html, picked, selecting]);
  const [reserve] = useState(() => host.getAttribute('aria-busy') === 'true');
  /* 这一行里已经当场处理过的番号（点了单张的、整批里轮到的）：卡片已原地换过样子，一键插队不再数它们。
     取回新的一行就清空，按服务端的现状重数。 */
  const [handled, setHandled] = useState<ReadonlySet<string>>(new Set());
  useEffect(() => { setHandled(new Set()) }, [html]);
  const cover = async (code: string) => {
    const card = [...box.current?.querySelectorAll<HTMLElement>('[data-feed-id]') ?? []]
      .find(node => node.querySelector(`[data-feed-action="prioritise"][data-code="${CSS.escape(code)}"]`));
    const slot = card?.querySelector('[data-feed-cover-state]');
    const got = card && slot ? await prioritise(code, slot, card) : false;
    setHandled(current => new Set(current).add(code));
    return got;
  };
  const queued = (feedNew?.items || []).filter(item => item.code && item.cover_state === 'queued' && !item.cover_url
    && !handled.has(item.code)).map(item => item.code!);
  useLayoutEffect(() => {
    if (!feedNew && reserve && !error) {
      host.setAttribute('aria-busy', 'true');
      host.hidden = false;
      fitSkeleton(host);
      return;
    }
    host.removeAttribute('aria-busy');
    host.hidden = !html && !error;
    if (feedNew) settled?.(!!html);
  }, [host, html, feedNew, settled, reserve, error]);
  useEffect(() => {
    if (html) wire(box.current?.querySelector('.feednewrow') ?? null);
  }, [wire, html, selecting]);
  useEffect(() => {
    setSourceFaces([...box.current?.querySelectorAll<HTMLElement>('[data-feed-source-avatar]') ?? []]);
  }, [html]);
  const click = async (event: MouseEvent<HTMLDivElement>) => {
    const selectedCard = (event.target as Element).closest<HTMLElement>('[data-feed-id]');
    if (selecting && selectedCard) {
      event.preventDefault();
      const id = Number(selectedCard.dataset.feedId);
      actions?.clearMediaSelection?.();
      setPicked(current => {
        const next = new Set(current);
        if (!next.delete(id)) next.add(id);
        return next;
      });
      return;
    }
    const link = (event.target as Element).closest<HTMLAnchorElement>('a.feednewopen, a.feednewall');
    if (link && actions && !event.button && !event.metaKey && !event.ctrlKey && !event.altKey && !event.shiftKey) {
      event.preventDefault(); actions.navigate(link.getAttribute('href')!); return;
    }
    const button = (event.target as Element).closest<HTMLButtonElement>('[data-feed-action]');
    const card = button?.closest<HTMLElement>('[data-feed-id]');
    if (!button || !card) return;
    const action = button.dataset.feedAction || '';
    if (action === 'prioritise') {
      await cover(button.dataset.code || '');
      return;
    }
    await act(Number(card.dataset.feedId), action);
    if (action === 'want' || action === 'unwant') {
      // 想要是开关：同一颗键换成另一头，卡片不收起也不变淡。
      const wanted = action === 'want';
      button.dataset.feedAction = wanted ? 'unwant' : 'want';
      button.setAttribute('aria-pressed', String(wanted));
      button.title = wanted ? t('follow:wantToggle.remove') : t('follow:wantToggle.want');
      return;
    }
    if (action === 'ignore') card.remove();
    else card.classList.add('isread');
    if (!box.current?.querySelector('[data-feed-id]')) {
      host.hidden = true;
      settled?.(false);
    }
  };
  const context = (event: MouseEvent<HTMLDivElement> | KeyboardEvent<HTMLDivElement>) => {
    if (selecting && 'key' in event && event.key === ' ' && (event.target as Element).matches('.feednewopen')) {
      event.preventDefault();
      (event.target as HTMLElement).click();
      return;
    }
    const card = (event.target as Element).closest<HTMLElement>('[data-feed-id]');
    if (!card) return;
    const link = card.querySelector<HTMLAnchorElement>('a.feednewopen');
    const operations: WorkContextOperation[] = [];
    if (link && actions) operations.push({ id: 'open', label: t('catalog:mediaActions.open'), icon: RiPlayLine,
      run: () => actions.navigate(link.getAttribute('href')!) });
    const want = card.querySelector<HTMLButtonElement>('[data-feed-action="want"],[data-feed-action="unwant"]');
    if (want) operations.push({ id: 'want', label: t(want.dataset.feedAction === 'unwant' ? 'follow:wantToggle.remove' : 'follow:wantToggle.want'),
      icon: RiStarLine, disabled: want.disabled, run: () => want.click() });
    const seen = card.querySelector<HTMLButtonElement>('[data-feed-action="read"]');
    if (seen) operations.push({ id: 'read', label: t('shell:feedNew.markRead'), icon: RiEyeLine,
      disabled: card.classList.contains('isread') || seen.disabled, run: () => seen.click() });
    const ignore = card.querySelector<HTMLButtonElement>('[data-feed-action="ignore"]');
    if (ignore) operations.push({ id: 'ignore', label: t('shell:feedNew.ignore'), icon: RiEyeOffLine,
      disabled: ignore.disabled, run: () => ignore.click() });
    const target = { key: card.dataset.feedId!, operations };
    if (event.type === 'contextmenu') menu.onContextMenu(event as MouseEvent<HTMLDivElement>, target, card);
    else menu.onKeyDown(event as KeyboardEvent<HTMLDivElement>, target, card);
  };
  const pickedCards = [...box.current?.querySelectorAll<HTMLElement>('[data-feed-id]') ?? []]
    .filter(card => picked.has(Number(card.dataset.feedId)));
  const bulkAction = (key: 'read' | 'want' | 'ignore', label: string, undo?: string): BulkAction<number> => ({
    key, label, reversal: undo ? 'undo' : 'irreversible',
    confirm: ids => ({ title: label, body: t(key === 'ignore' ? 'shell:feedNew.ignoreSelectedConfirm' : 'shell:feedNew.applyToSelected',
      { count: ids.length, action: label }) }),
    run: async ids => {
      await applyFeedBatch(key, ids);
      if (undo) return () => applyFeedBatch(undo, ids);
    },
    receipt: ids => t('shell:feedNew.batchDone', { count: ids.length }),
  });
  const bulk = [
    { action: bulkAction('read', t('shell:feedNew.markRead'), 'unread'), cards: pickedCards.filter(card => !card.classList.contains('isread')) },
    { action: bulkAction('want', t('catalog:javSelection.addToWants'), 'unwant'), cards: pickedCards.filter(card => card.querySelector('[data-feed-action="want"]')) },
    { action: bulkAction('ignore', t('shell:feedNew.ignore')), cards: pickedCards },
  ];
  // 这一行显示着、封面还在排队的那几部一键插队：首页与女优页各是一行，各管自己的。宿主在 Tailwind 作用域外，
  // 提示条与进度条套一层 `peach-react` 进去（与骨架同一个写法）。
  if (error) return <RetryNote message={error} onRetry={() => retry?.()} />;
  if (!feedNew && reserve) return <div dangerouslySetInnerHTML={{ __html: feedNewSkeletonHtml() }} />;
  return html ? <><div className="peach-react" data-feed-cover-queue><CoverQueue scope={t('follow:newReleasesRow.coverQueueScope')} codes={queued} fetchOne={cover} /></div>
    {menu.menu}<div ref={box} data-feed-selection="" className="contents" {...rectangle}
    onClick={(event) => { void click(event) }} onContextMenu={context} onKeyDown={context} dangerouslySetInnerHTML={{ __html: html }} />
    {/* 浮条留在新作横排的样式范围内，由浏览器顶层定位。 */}
    {actions ? <div className="peach-react contents"><SelectionDock visible={selecting && !mediaCount && !!pickedCards.length}
      label={t('shell:feedNew.selectionActions')} count={t('catalog:javSelection.selectedCount', { count: pickedCards.length })}
      actions={bulk.map(({ action, cards }) => ({ action, items: cards.map(card => Number(card.dataset.feedId)),
        host: { receipt: actions.receipt, failure: error => actions.failure(action.label, error) }, done: () => setPicked(new Set()) }))}>
      <Button size="small" variant="ghost" onClick={() => setPicked(new Set())}>{t('shell:dataTable.clearSelection')}</Button>
    </SelectionDock></div> : null}
    {sourceFaces.map((face, index) => createPortal(
      <SourceAvatar code={face.dataset.code!} person={{ name: face.dataset.name!, source_actor_id: face.dataset.actor! }} />,
      face, `${html.length}:${index}`))}</> : null;
}
