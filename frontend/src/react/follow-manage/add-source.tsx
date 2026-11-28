/* 添加关注：把一条链接、一个名字或一个 id 变成已关注的来源。
 *
 * 查找只是列出候选、不写任何东西：发现要联网，结果也可能不止一个，替用户决定「就是
 * 这个」是错的。真正登记仍然要在候选里点。
 *
 * 查找那一趟在后台跑，页面关掉也还在跑。首屏读到的旧终态不冒充新结果：只有本次点过
 * 查找、或者本次亲眼见过它在跑，结果才摆出来（ADR-0031）。 */
import { useState } from 'react';
import { RiFilter3Line } from '@remixicon/react';
import { useMutation } from '@tanstack/react-query';

import { Button } from '@/components/base/buttons/button';

import { errorMessage } from '../../api';
import { useBackgroundJob } from '../background-job';
import { cardClass } from '../components/card';
import { Note } from '../components/note';
import { TaskProgress } from '../components/task-progress';
import { activityKind } from '../../activity-kinds';
import { SelectionPopover } from '../components/selection-popover';
import { busyProps } from '../settings/use-action';
import { ExternalLink, FieldLabel, Help } from '../settings/section';
import {
  addSource, fetchResolveJob, fetchSuggestions, FOLLOW_RESOLVE_KEY,
  reloadFollowManage, startCheck, startResolve,
  type CredentialData, type FollowData, type ResolveCandidate, type ResolveJob, type ResolveRow,
} from './follow-manage';
import { SourceIcon } from './source-view';
import { FollowSearch, type SuggestOption } from './follow-search';
import { SearchResults } from './search-results';
import { codedText, jobText, serverLabel } from '../../core/server-text';
import { joinList, t } from '../../i18n';

const PLACEHOLDER = t('follow:addCreatorSource.placeholder');
const TITLE = t('follow:addCreatorSource.title');
// 索引下载的提醒只在真按名字查时出现；常驻成一句说明就是噪音。
const BY_NAME_HINT = t('follow:addCreatorSource.searchingByName');
const BY_LINK_HINT = t('follow:addCreatorSource.recognizing');
const NO_CANDIDATE = t('follow:addCreatorSource.noSourceFound');

export interface AddSourceProps {
  data: FollowData;
  credentials: CredentialData;
  readOnly: boolean;
  toast(message: string): void;
}

/** 凭据配在「来源与订阅」设置里；候选行的凭据链接指到那里。 */
const CREDENTIALS_PATH = '/settings/subscriptions';

/** 候选的身份是它的地址：同一次查找里同一个地址只会出现一次。 */
const candidateKey = (row: number, candidate: ResolveCandidate) => `${row}:${candidate.url}`;

async function creatorSuggestions(term: string, signal: AbortSignal): Promise<SuggestOption[]> {
  const { groups } = await fetchSuggestions(term, signal);
  return groups.flatMap(group => group.items.map(item => ({
    value: item.value, matched: serverLabel(item.matched_code ?? '', item.matched || ''), n: item.n,
    group: serverLabel(group.label_code ?? '', group.label),
    portrait: group.kind === 'tag' ? undefined : { source_avatar_url: item.avatar_url ?? undefined },
  })));
}

/** 来源筛选：列出全部可关注的站，默认全选。取消勾选的站，其查找结果行不显示、也不进
 *  「添加选中」。 */
function SourceFilter(
  { credentials, hidden, onHidden }:
  {
    credentials: CredentialData; hidden: ReadonlySet<string>;
    onHidden(next: Set<string>): void;
  },
) {
  const rows = (credentials.providers || []).filter((row) => row.followable);
  const shown = rows.filter((row) => !hidden.has(row.provider)).length;
  const label = shown === rows.length ? t('follow:addCreatorSource.allSources') : t('follow:addCreatorSource.shownSources', { shown, count: rows.length });
  const toggle = (provider: string, on: boolean) => {
    const next = new Set(hidden);
    if (on) next.delete(provider); else next.add(provider);
    onHidden(next);
  };
  return <SelectionPopover label={t('follow:addCreatorSource.sourceFilter')} triggerLabel={label} leadingIcon={RiFilter3Line}
    empty={t('follow:addCreatorSource.noSources')}
    items={rows.map(row => ({ id: row.provider, selected: !hidden.has(row.provider),
      label: <span className="flex min-w-0 items-center gap-1.5"><SourceIcon provider={row.provider} />{row.provider_label}</span> }))}
    onChange={toggle}
    actions={[
      { label: t('follow:shared.selectAll'), disabled: !rows.length, onPress: () => onHidden(new Set()) },
      { label: t('follow:shared.selectNone'), disabled: !rows.length, onPress: () => onHidden(new Set(rows.map(row => row.provider))) },
      { label: t('follow:addCreatorSource.credentialSettings'), href: CREDENTIALS_PATH },
    ]} />;
}

/** 一个检索词的候选、来源故障与站外入口。 */
function PickRow({ row, at, hidden, unpicked, onPick }: {
  row: ResolveRow; at: number; hidden: ReadonlySet<string>; unpicked: ReadonlySet<string>;
  onPick(key: string, on: boolean): void;
}) {
  if (row.kind === 'error') {
    return <Note tone="error" title={row.line}>{jobText(row, 'error') || t('follow:addCreatorSource.searchFailed')}</Note>;
  }
  const candidates = (row.candidates || []).filter(candidate => !hidden.has(candidate.provider));
  const searches = (row.external_searches || []).filter(search => !hidden.has(search.provider));
  const failedSources = Object.entries(row.failures || {});
  const failures = failedSources.filter(([name]) =>
    !hidden.has(name) && !searches.some(search => search.provider === name));
  const hasResults = row.candidates?.length || row.external_searches?.length || failedSources.length;
  const failureText = (name: string, reason: string) =>
    serverLabel(row.failure_codes?.[name]?.code ?? '', reason, row.failure_codes?.[name]?.params);
  return <div className="flex min-w-0 flex-col gap-2">
    <b className="text-body-medium text-text-primary">{row.line}</b>
    {candidates.length ? <SearchResults label={t('follow:addCreatorSource.results')} items={candidates.map(candidate => {
      const id = candidateKey(at, candidate);
      return {
        id, name: codedText(candidate, 'label'), provider: candidate.provider, providerLabel: candidate.provider_label,
        url: candidate.url, avatar: candidate.avatar_url, selectable: !candidate.known,
        picked: !candidate.known && !unpicked.has(id),
        details: candidate.known ? t('follow:addCreatorSource.alreadyFollowing') : codedText(candidate, 'evidence'),
      };
    })} onPick={onPick} /> : null}
    {!candidates.length && !searches.length && !failures.length
      ? <Help>{hasResults ? t('follow:searchResults.hiddenByFilter') : NO_CANDIDATE}</Help> : null}
    {searches.map(search => {
      const failure = row.failures?.[search.provider];
      return <div key={search.url} className="flex flex-wrap items-center gap-2">
        <Help>{failure ? failureText(search.provider, failure) : codedText(search, 'evidence')}</Help>
        <ExternalLink href={search.url}>{t('follow:shared.labeled', { label: codedText(search, 'label'), value: search.query })}</ExternalLink>
      </div>;
    })}
    {failures.map(([name, reason]) => <Help key={name}>{t('follow:shared.labeled', {
      label: name, value: failureText(name, reason),
    })}</Help>)}
  </div>;
}

export function AddSource({ data, credentials, readOnly, toast }: AddSourceProps) {
  const [line, setLine] = useState('');
  const [asked, setAsked] = useState('');
  const [hidden, setHidden] = useState<ReadonlySet<string>>(new Set<string>());
  const [unpicked, setUnpicked] = useState<ReadonlySet<string>>(new Set<string>());
  const [problem, setProblem] = useState('');
  const [added, setAdded] = useState(0);

  const { job, running, outcome, start: resolve, dismiss } = useBackgroundJob<ResolveJob, string>({
    queryKey: FOLLOW_RESOLVE_KEY,
    queryFn: ({ signal }) => fetchResolveJob(signal),
    start: (text) => startResolve([text]),
    onStarted: () => setUnpicked(new Set()),
    onError: (cause) => setProblem(errorMessage(cause)),
    onFinish: (state) => {
      if (state.status === 'failed') setProblem(jobText(state, 'error') || t('follow:addCreatorSource.searchFailed'));
    },
  });

  const search = (query: string) => {
    if (readOnly || running || resolve.isPending) return;
    setProblem('');
    setAsked(query);
    setLine(query);
    resolve.mutate(query);
  };

  const rows = outcome?.results || [];
  const picked = rows.flatMap((row, at) => (row.candidates || [])
    .filter((candidate) => !candidate.known && !hidden.has(candidate.provider))
    .map((candidate) => ({ candidate, key: candidateKey(at, candidate) }))
    .filter((item) => !unpicked.has(item.key)));

  const register = useMutation({
    mutationFn: async (items: { candidate: ResolveCandidate }[]) => {
      const failures: string[] = [];
      const sources: number[] = [];
      setAdded(0);
      for (const item of items) {
        try {
          const done = await addSource(item.candidate);
          sources.push(done.source);
        } catch (cause) {
          // 一条失败不该把其余的一起丢掉，逐条报。
          failures.push(t('follow:shared.labeled', { label: item.candidate.label, value: errorMessage(cause) }));
        }
        setAdded((now) => now + 1);
      }
      // 新来源登记时按 `defer_check` 跳过了检查，登记完一次性起一趟。
      if (sources.length) {
        try { await startCheck(sources) } catch (cause) { failures.push(errorMessage(cause)) }
      }
      return { failures, sources };
    },
    onSuccess: (result) => {
      void reloadFollowManage();
      if (result.failures.length) { setProblem(joinList(result.failures)); return }
      setProblem('');
      dismiss();
      toast(t('follow:addCreatorSource.sourcesAdded', { count: result.sources.length }));
    },
    onError: (cause) => setProblem(errorMessage(cause)),
  });

  const guesses = data.suggestions || [];
  const byName = !asked.includes('/');

  return (
    /* 旧 `.followmanage .fmain>.fsec`：一块分区就是一张填充卡，标题在卡里。 */
    <section aria-label={TITLE} className={cardClass({ padding: 'none', className: 'flex flex-col gap-4 px-6 py-5 max-sm:px-4' })}>
      <h3 className="text-title-2-medium text-text-primary">{TITLE}</h3>

      <FollowSearch label={t('follow:addCreatorSource.inputLabel')} placeholder={PLACEHOLDER}
        suggestionsLabel={t('follow:addCreatorSource.suggestions')} value={line} setValue={setLine} search={search}
        kind="creator" suggest={creatorSuggestions} readOnly={readOnly} busy={running || resolve.isPending}
        actions={<SourceFilter credentials={credentials} hidden={hidden} onHidden={setHidden} />} />

      <div aria-live="polite" className="flex flex-col gap-3 empty:hidden">
        {running || resolve.isPending ? <TaskProgress embedded kind={activityKind('follow-resolve')}
          label={jobText(job) || (job?.total ? t('follow:addCreatorSource.searchProgress', { checked: job.checked || 0, count: job.total }) : byName ? BY_NAME_HINT : BY_LINK_HINT)}
          value={job?.checked} total={job?.total} /> : null}
        {problem ? <Note tone="error" title={t('follow:addJavFeed.notCompleted')}>{problem}</Note> : null}
      </div>

      {rows.length ? (
        <div className="flex flex-col gap-3">
          <FieldLabel>{t('follow:addCreatorSource.results')}</FieldLabel>
          {rows.map((row, at) => (
            <PickRow key={`${row.line}-${at}`} row={row} at={at} hidden={hidden} unpicked={unpicked}
              onPick={(key, on) => setUnpicked(now => {
                const next = new Set(now);
                if (on) next.delete(key); else next.add(key);
                return next;
              })} />
          ))}
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="secondary" size="small"
              onClick={() => dismiss()}>{t('follow:shared.close')}</Button>
            <Button variant="primary" size="small" disabled={readOnly || !picked.length}
              {...busyProps(register.isPending)}
              onClick={() => register.mutate(picked)}>{t('follow:addCreatorSource.addSelected', { count: picked.length })}</Button>
            {register.isPending ? (
              <span role="status" className="text-body-2-regular text-text-secondary">
                {t('follow:addCreatorSource.addingProgress', { added, count: picked.length })}
              </span>
            ) : null}
          </div>
        </div>
      ) : null}

      {guesses.length ? (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-body-2-regular text-text-secondary">{t('follow:addCreatorSource.suggested')}</span>
          {guesses.map((guess) => (
            <Button key={guess.name} variant="secondary" size="small" disabled={readOnly}
              title={guess.origin ? t('follow:addCreatorSource.historyVisitsFrom', { count: guess.visits, origin: guess.origin }) : t('follow:addCreatorSource.historyVisits', { count: guess.visits })}
              onClick={() => search(guess.name)}>{guess.name}</Button>
          ))}
        </div>
      ) : null}
    </section>
  );
}
