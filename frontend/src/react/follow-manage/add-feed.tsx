/* 添加 JAV 订阅：输入女优名，到 JavDB 搜她的演员卡，勾选后登记到她名下并订上（ADR-0083）。
 *
 * 查找只是列出候选、不写任何东西：同名的人站上可能不止一位，替用户决定「就是这个」是错的。
 * 名字对得上、又只有一个人的那几张先勾上，其余的要用户自己点。地址仍由服务端按勾选的 id 拼，
 * 页面从头到尾不送地址。这位在数据库里不存在也可以订：服务端会新建她。
 *
 * 数据库里认得出、又已有 JavDB 演员页或 DMM 编号的人不必靠搜索：JavDB 冷却搜不成或搜不到时，
 * 照样给出「订阅库里的她」，和人物页的开关是同一个动作。 */
import { useState } from 'react';
import type { KeyboardEvent } from 'react';
import { RiSearchLine } from '@remixicon/react';

import { Chip } from '@/components/base/badges/chip';
import { Button } from '@/components/base/buttons/button';
import { Checkbox } from '@/components/base/checkbox/checkbox';
import { Input } from '@/components/base/input/input';

import { cardClass } from '../components/card';
import { Note } from '../components/note';
import { ExternalLink, FieldLabel, Help } from '../settings/section';
import { busyProps, useAction } from '../settings/use-action';
import { composingKey } from '../components/ime';
import { followFeedByName, followFeedEntity, lookupFeedActor, type FeedCandidate, type FeedLookup } from './follow-manage';
import { serverLabel } from '../../core/server-text';
import { joinList, t } from '../../i18n';

const PLACEHOLDER = t('follow:addJavFeed.placeholder');
const TITLE = t('follow:addJavFeed.title');

export interface AddFeedProps {
  readOnly: boolean;
  toast(message: string): void;
  /** 订上之后让清单重取。 */
  onAdded(): void;
}

/** 勾下去会登记到谁名下：先看勾选的卡已经在谁名下，再看数据库里按名字认得出谁，都没有就新建。 */
function destination(result: FeedLookup, picked: ReadonlySet<string>): { text: string; blocked: boolean } {
  const holders = new Map<number, string>();
  for (const card of result.candidates) {
    if (picked.has(card.id) && card.held_by) holders.set(card.held_by.id, card.held_by.name);
  }
  if (holders.size > 1) {
    return { text: t('follow:addJavFeed.cardsSplitAcrossPeople', { names: joinList([...holders.values()]) }), blocked: true };
  }
  const [holder] = holders.values();
  if (holder) return { text: t('follow:addJavFeed.willAddUnder', { name: holder }), blocked: false };
  if (result.known) return { text: t('follow:addJavFeed.willAddUnderKnown', { name: result.known.name }), blocked: false };
  return { text: t('follow:addJavFeed.willCreate', { name: result.q }), blocked: false };
}

function CandidateRow({ card, picked, onPick }: { card: FeedCandidate; picked: boolean; onPick(on: boolean): void }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Checkbox isSelected={picked} onChange={onPick}>
        <span className="flex min-w-0 flex-wrap items-center gap-1.5">
          <span className="min-w-0 break-words">{joinList(card.names)}</span>
          {card.record ? <Chip variant="caption" color="neutral">{card.record}</Chip> : null}
          {card.held_by ? (
            <small className="text-caption-1-regular text-text-secondary">{t('follow:addJavFeed.alreadyUnder', { name: card.held_by.name })}</small>
          ) : null}
        </span>
      </Checkbox>
      <ExternalLink href={card.url}>{card.id}</ExternalLink>
    </div>
  );
}

export function AddFeed({ readOnly, toast, onAdded }: AddFeedProps) {
  const [name, setName] = useState('');
  const [result, setResult] = useState<FeedLookup | null>(null);
  const [picked, setPicked] = useState<ReadonlySet<string>>(new Set<string>());
  const action = useAction();

  const search = () => {
    const q = name.trim();
    if (!q || readOnly) return;
    void action.run('lookup', (signal) => lookupFeedActor(q, signal), (found) => {
      setResult(found);
      setPicked(new Set(found.suggested));
    });
  };
  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter' && !composingKey(event.nativeEvent)) { event.preventDefault(); search() }
  };
  const close = () => { setResult(null); setPicked(new Set()); action.setError('') };
  const add = () => {
    if (!result) return;
    void action.run('follow', (signal) => followFeedByName(result.q, [...picked], signal), (done) => {
      toast(done.created
        ? t('follow:addJavFeed.createdAndSubscribed', { name: done.entity_name })
        : t('follow:addJavFeed.subscribed', { name: done.entity_name }));
      setName('');
      close();
      onAdded();
    });
  };

  const followKnown = () => {
    const known = result?.known;
    if (!known) return;
    void action.run('known', (signal) => followFeedEntity(known.id, signal), () => {
      toast(t('follow:addJavFeed.subscribed', { name: known.name }));
      setName('');
      close();
      onAdded();
    });
  };

  const where = result ? destination(result, picked) : null;
  /* 没有可勾的卡（搜不成或搜不到）时，库里能直接订的她就是这一次的去处。 */
  const direct = result && !result.candidates.length && result.known?.subscribable ? result.known : null;

  return (
    /* 和「添加关注」那一块同一个形：一张填充卡，标题在卡里。 */
    <section aria-label={TITLE} className={cardClass({ padding: 'none', className: 'flex flex-col gap-4 px-6 py-5 max-sm:px-4' })}>
      <h3 className="text-title-2-medium text-text-primary">{TITLE}</h3>
      <div className="flex flex-wrap items-end gap-2">
        <div className="min-w-64 grow">
          <Input aria-label={t('follow:addJavFeed.actressName')} placeholder={PLACEHOLDER} value={name} leadingIcon={RiSearchLine}
            enterKeyHint="search" isDisabled={readOnly} onChange={setName} onKeyDown={onKeyDown} />
        </div>
        <Button variant="primary" disabled={readOnly || !name.trim()} {...busyProps(action.busy === 'lookup')}
          onClick={search}>{t('follow:shared.search')}</Button>
      </div>

      {action.error ? <Note tone="error" title={t('follow:addJavFeed.notCompleted')}>{action.error}</Note> : null}

      {result ? (
        <div className="flex flex-col gap-3">
          {result.unavailable ? <Note tone="warning" title={t('follow:addJavFeed.javdbSearchFailed')}>{serverLabel(result.unavailable_code ?? '', result.unavailable, result.unavailable_params)}</Note> : null}
          <FieldLabel>{t('follow:addJavFeed.javdbCards')}</FieldLabel>
          {result.candidates.length ? result.candidates.map((card) => (
            <CandidateRow key={card.id} card={card} picked={picked.has(card.id)}
              onPick={(on) => setPicked((now) => {
                const next = new Set(now);
                if (on) next.add(card.id); else next.delete(card.id);
                return next;
              })} />
          )) : <Help>{result.unavailable ? t('follow:addJavFeed.noCardsThisTime') : t('follow:addJavFeed.noJavdbMatch')}</Help>}
          {result.candidates.length ? (
            <Help role="status">{picked.size ? where!.text : t('follow:addJavFeed.pickCardsHint')}</Help>
          ) : null}
          {direct ? (
            <Help role="status">{direct.following
              ? t('follow:addJavFeed.alreadySubscribed', { name: direct.name })
              : t('follow:addJavFeed.canSubscribeDirectly', { name: direct.name })}</Help>
          ) : null}
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="secondary" size="small" onClick={close}>{t('follow:shared.close')}</Button>
            {result.candidates.length ? (
              <Button variant="primary" size="small" disabled={readOnly || !picked.size || where!.blocked}
                {...busyProps(action.busy === 'follow')} onClick={add}>{t('follow:addJavFeed.subscribePicked', { count: picked.size })}</Button>
            ) : null}
            {direct && !direct.following ? (
              <Button variant="primary" size="small" disabled={readOnly}
                {...busyProps(action.busy === 'known')} onClick={followKnown}>{t('follow:addJavFeed.subscribeTo', { name: direct.name })}</Button>
            ) : null}
          </div>
        </div>
      ) : null}
    </section>
  );
}
