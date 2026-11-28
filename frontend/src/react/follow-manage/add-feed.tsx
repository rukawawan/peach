/* 添加 JAV 订阅：JavDB、DMM 和已关联的订阅页一起显示。 */
import { useEffect, useRef, useState } from 'react';

import { Chip } from '@/components/base/badges/chip';
import { Button } from '@/components/base/buttons/button';

import { apiGet } from '../../api';
import type { FaceRef } from '../../card-art/markup';
import { cardClass } from '../components/card';
import { Note } from '../components/note';
import { TaskProgress } from '../components/task-progress';
import { FieldLabel, Help } from '../settings/section';
import { busyProps, useAction } from '../settings/use-action';
import { followFeedPages, lookupFeedActor, suggestFeedActors, type FeedLookup, type FeedSubscription } from './follow-manage';
import { FollowSearch, type SuggestOption } from './follow-search';
import { SearchResults, type SearchResult } from './search-results';
import { FeedPageAlias } from './source-view';
import { serverLabel } from '../../core/server-text';
import { joinList, t } from '../../i18n';

const PLACEHOLDER = t('follow:addJavFeed.placeholder');
const TITLE = t('follow:addJavFeed.title');

export interface AddFeedProps {
  readOnly: boolean;
  initialName?: string;
  toast(message: string): void;
  /** 订上之后让清单重取。 */
  onAdded(): void;
}

type FeedRow = SearchResult & { sourceId: string; provider: 'javdb' | 'dmm'; owner?: { id: number; name: string } };

/** 根据勾选的来源与已关联身份确定登记对象。 */
function destination(result: FeedLookup, pages: FeedRow[]): { text: string; blocked: boolean } {
  const holders = new Map<number, string>();
  for (const { owner } of pages) {
    if (owner) holders.set(owner.id, owner.name);
  }
  if (holders.size > 1) {
    return { text: t('follow:addJavFeed.cardsSplitAcrossPeople', { names: joinList([...holders.values()]) }), blocked: true };
  }
  const [holder] = holders.values();
  if (holder) return { text: t('follow:addJavFeed.willAddUnder', { name: holder }), blocked: false };
  if (result.known) return { text: t('follow:addJavFeed.willAddUnderKnown', { name: result.known.name }), blocked: false };
  return { text: t('follow:addJavFeed.willCreate', { name: result.q }), blocked: false };
}

async function performerSuggestions(term: string, signal: AbortSignal): Promise<SuggestOption[]> {
  type Performer = FaceRef & { value: string; matched?: string; entity_id: number };
  const params = new URLSearchParams({ q: term, kind: 'performer', limit: '8' });
  const { groups } = await apiGet<{ groups: { items: Performer[] }[] }>(`/api/suggest?${params}`, signal);
  return groups.flatMap(group => group.items.map(item => ({
    group: t('follow:addJavFeed.librarySuggestions'), value: item.value, matched: item.matched,
    portrait: { ...item, id: item.entity_id },
  })));
}

async function onlineSuggestions(term: string, signal: AbortSignal): Promise<SuggestOption[]> {
  const { items } = await suggestFeedActors(term, signal);
  return items.map(item => ({
    group: t('follow:addJavFeed.onlineSuggestions'), value: item.name,
    matched: item.provider, portrait: { source_avatar_url: item.avatar_url, name: item.name },
  }));
}

function PageDetails({ name, names, record, subscription }: {
  name: string; names: string[]; record?: string; subscription: FeedSubscription;
}) {
  const aliases = names.filter(written => written !== name);
  const label = subscription === 'enabled' ? t('follow:addJavFeed.sourceSubscribed')
    : subscription === 'paused' ? t('follow:shared.paused') : t('follow:addJavFeed.sourceNotSubscribed');
  return <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
    {aliases.length ? <FeedPageAlias name={joinList(aliases)} /> : null}
    {record ? <Chip variant="caption" color="neutral">{record}</Chip> : null}
    <Chip variant="caption" color={subscription === 'enabled' ? 'lime' : 'neutral'}>{label}</Chip>
  </div>;
}

function feedResults(result: FeedLookup, picked: ReadonlySet<string>): FeedRow[] {
  const known = result.known;
  const linked = new Map((known?.sources || []).map(source => [source.url, source]));
  const confirmed: FeedRow[] = [];
  const other: FeedRow[] = [];
  const online = [
    ...result.candidates.map(card => ({ ...card, provider: 'javdb' as const, providerLabel: 'JavDB' })),
    ...(result.dmm_candidates ?? []).map(card => ({ ...card, provider: 'dmm' as const, providerLabel: 'DMM', record: '' })),
  ];
  for (const card of online) {
    const id = `${card.provider}:${card.id}`;
    const name = card.held_by?.name || card.names[0] || card.id;
    const names = card.names.length ? card.names : linked.get(card.url)?.names || [];
    const linkedCard = linked.delete(card.url) || (known && card.held_by?.id === known.id);
    (linkedCard ? confirmed : other).push({
      id, sourceId: card.id, owner: card.held_by ?? undefined, name,
      selectionName: [names[0] || name, card.record].filter(Boolean).join(' · '),
      provider: card.provider, providerLabel: card.providerLabel, url: card.url,
      avatar: card.avatar_url, portrait: card.portrait ?? undefined,
      selectable: card.subscription !== 'enabled', picked: card.subscription === 'enabled' || picked.has(id),
      details: <PageDetails name={name} names={names} record={card.record} subscription={card.subscription} />,
    });
  }
  if (known) {
    for (const source of linked.values()) {
      const id = `${source.provider}:${source.id}`;
      confirmed.push({
        ...source, id, sourceId: source.id, owner: known, name: known.name, selectionName: source.names[0] || source.id,
        portrait: known.portrait, providerLabel: source.provider === 'dmm' ? 'DMM' : 'JavDB',
        selectable: source.subscription !== 'enabled', picked: source.subscription === 'enabled' || picked.has(id),
        details: <PageDetails name={known.name} names={source.names} subscription={source.subscription} />,
      });
    }
  }
  return [...confirmed, ...other];
}

export function AddFeed({ readOnly, toast, onAdded, initialName = '' }: AddFeedProps) {
  const [name, setName] = useState(initialName);
  const [result, setResult] = useState<FeedLookup | null>(null);
  const [picked, setPicked] = useState<ReadonlySet<string>>(new Set<string>());
  const action = useAction();
  const section = useRef<HTMLElement>(null);
  const opened = useRef('');

  const search = (q: string) => {
    setResult(null);
    setPicked(new Set());
    void action.run('lookup', (signal) => lookupFeedActor(q, signal), (found) => {
      setResult(found);
      const suggested = new Set(found.suggested);
      const linkedCards = found.known?.sources.filter(source => source.provider === 'javdb') ?? [];
      setPicked(new Set(found.candidates
        .filter(card => card.subscription !== 'enabled' && suggested.has(card.id)
          && (!linkedCards.length || card.held_by?.id === found.known?.id || linkedCards.some(source => source.url === card.url)))
        .map(card => `javdb:${card.id}`)));
    });
  };
  const close = () => { setResult(null); setPicked(new Set()); action.setError('') };
  useEffect(() => {
    if (!initialName || opened.current === initialName) return;
    opened.current = initialName;
    section.current?.scrollIntoView({ block: 'start' });
    setName(initialName);
    search(initialName);
  }, [initialName]); // eslint-disable-line react-hooks/exhaustive-deps
  const add = () => {
    if (!result || !where || where.blocked) return;
    const ids = selected.filter(row => row.provider === 'javdb').map(row => row.sourceId);
    const dmmIds = selected.filter(row => row.provider === 'dmm').map(row => row.sourceId);
    void action.run('follow', signal => followFeedPages(result.q, ids, dmmIds, result.dmm_selection, signal), (done) => {
      toast(done.created
        ? t('follow:addJavFeed.createdAndSubscribed', { name: done.entity_name })
        : t('follow:addJavFeed.subscribed', { name: done.entity_name }));
      setName('');
      close();
      onAdded();
    });
  };

  const rows = result ? feedResults(result, picked) : [];
  const selected = rows.filter(row => row.selectable && row.picked);
  const where = result && selected.length ? destination(result, selected) : null;
  const canSelect = rows.some(row => row.selectable);

  return (
    /* 和「添加关注」那一块同一个形：一张填充卡，标题在卡里。 */
    <section id="add-jav-subscription" ref={section} aria-label={TITLE}
      className={cardClass({ padding: 'none', className: 'flex scroll-mt-24 flex-col gap-4 px-6 py-5 max-sm:px-4' })}>
      <h3 className="text-title-2-medium text-text-primary">{TITLE}</h3>
      <FollowSearch label={t('follow:addJavFeed.actressName')} placeholder={PLACEHOLDER}
        suggestionsLabel={t('follow:addJavFeed.suggestions')} value={name} setValue={setName} search={search}
        kind="performer" suggest={performerSuggestions} suggestOnline={onlineSuggestions}
        readOnly={readOnly} busy={Boolean(action.busy)} />

      {action.busy === 'lookup' ? <TaskProgress embedded kind="radar" label={t('follow:addJavFeed.searching')} /> : null}

      {action.error ? <Note tone="error" title={t('follow:addJavFeed.notCompleted')}>{action.error}</Note> : null}

      {result ? (
        <div className="flex flex-col gap-3">
          {result.unavailable ? <Note tone="warning" title={t('follow:addJavFeed.javdbSearchFailed')}>{serverLabel(result.unavailable_code ?? '', result.unavailable, result.unavailable_params)}</Note> : null}
          {result.dmm_unavailable ? <Note tone="warning" title={t('follow:addJavFeed.dmmSearchFailed')}>
            {serverLabel(result.dmm_unavailable.error_code ?? '', result.dmm_unavailable.error, result.dmm_unavailable.error_params)}
          </Note> : null}
          {rows.length ? <>
            <FieldLabel>{t('follow:addCreatorSource.results')}</FieldLabel>
            <SearchResults label={t('follow:addJavFeed.searchResults')} items={rows} onPick={(id, on) => setPicked(now => {
              const next = new Set(now);
              if (on) next.add(id); else next.delete(id);
              return next;
            })} />
          </> : !result.unavailable && !result.dmm_unavailable ? <Help>{t('follow:addJavFeed.noMatch')}</Help> : null}
          {canSelect ? <Help role="status">{where?.text ?? t('follow:addJavFeed.pickCardsHint')}</Help> : null}
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="secondary" size="small" onClick={close}>{t('follow:shared.close')}</Button>
            {canSelect ? (
              <Button variant="primary" size="small" disabled={readOnly || !where || where.blocked}
                {...busyProps(action.busy === 'follow')} onClick={add}>{t('follow:addJavFeed.subscribePicked', { count: selected.length })}</Button>
            ) : null}
          </div>
        </div>
      ) : null}
    </section>
  );
}
