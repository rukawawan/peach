import { useState, useSyncExternalStore } from 'react';
import { useQuery } from '@tanstack/react-query';
import { RiAddLine, RiArrowGoBackLine, RiCloseLine, RiDeleteBinLine, RiHistoryLine } from '@remixicon/react';
import { Button, ButtonLink } from '@/components/base/buttons/button';
import { ApiError, apiGet, apiSend, errorMessage } from '../../api';
import { validRange, writeColumnFilters } from '../../column-filters';
import { appSettingsStore } from '../../appearance/settings';
import { interfaceLanguage, t } from '../../i18n';
import { onLibraries, publishedLibraries } from '../../library-catalog';
import { AI_CONNECTIONS_KEY, AI_CONNECTIONS_URL, type AIConnections, type TaskProfile } from '../settings/ai-library-settings';
import { CUSTOM_TASKS_URL, useCustomTasks } from '../settings/ai-custom-tasks';
import { cardClass } from '../components/card';
import { Disclosure, ErrorText, Help } from '../settings/section';
import { useAction } from '../settings/use-action';
import { preferredAIConnection } from '../settings/use-ai-models';
import { AssistantFooter, AssistantWorkspace, ConfigureAIButton, SearchComposer, SearchWelcome, assistantCopy as copy } from './assistant-workspace';
import { ConversationUsagePopover, DemoReplayButton, DemoStatus, EMPTY_USAGE, SearchLibraryPicker, type ConversationUsage, type TokenUsage } from './assistant-footer';
import { SearchDemo, SearchDemoCases, SearchTrace, useSearchDemo, type SearchDemoId, type SearchStep } from './assistant-progress';
import { SearchWorks, snapshotSearchResult, type SearchResult, type SearchSource } from './assistant-results';
import { RecordedTaskDemo, useRecordedTaskDemo } from './assistant-recorded-demo';
import { AssistantWorkTask, WorkTaskButtons, WorkTaskMenu, WorkTaskWorkspace, type WorkTask, type WorkTaskPlan } from './assistant-work-tasks';
import { SEARCH_FIELDS as FIELDS, SEARCH_SCOPES as SCOPES, SearchConditionPicker, SearchModelPicker,
  type SearchField as Field, type SearchFilters as Filters, type SearchScope as Scope } from './assistant-options';
const DEMOS_HIDDEN_KEY = 'peach.ai-assistant.demos-hidden';
const PRESET_KEY = 'peach.ai-search.presets.v1';
const RECENT_KEY = 'peach.ai-search.recent.v1';
const CHAT_STORAGE_LIMIT = 1_500_000;
const DEMO_USAGE: ConversationUsage = { requests: 1, measured: 1, input_tokens: 672, output_tokens: 94 };
interface Preset { name: string; scope: Scope; filters: Filters }
type Results = Partial<Record<SearchSource, SearchResult>>;
type Turn = { id: string; text: string; scope: Scope; library?: string; automatic?: boolean; fixedTask?: string };
type SavedTurn = { turn: Turn; filters: Filters | null; results: Results; work?: WorkTaskPlan; stopped?: boolean; answer?: string };
type Recent = Preset & { id: string; messages?: SavedTurn[]; usage?: ConversationUsage };
type SearchPlan = { filters: Filters; work?: WorkTaskPlan; answer?: string };
function readSearches(): Preset[];
function readSearches(recent: true): Recent[];
function readSearches(recent = false): Preset[] {
  try {
    const rows = JSON.parse(localStorage.getItem(recent ? RECENT_KEY : PRESET_KEY) || '[]');
    const oldFilterTitles = ['zh-CN', 'en'].map(lng => t('catalog:libraryAssistant.conditions', { lng }));
    return Array.isArray(rows) ? rows.filter(row => typeof row?.name === 'string'
      && SCOPES.includes(row.scope) && row.filters && typeof row.filters === 'object'
      && (!recent || (typeof row.id === 'string'
        && (!oldFilterTitles.includes(row.name) || Array.isArray(row.messages))))).slice(0, recent ? 50 : 12) : [];
  } catch { return []; }
}

const currentLibrary = () => sessionStorage.getItem('peach.library') || '';
const newTurn = (text: string, scope: Scope, library: string): Turn => ({
  id: globalThis.crypto?.randomUUID?.() ?? Date.now().toString(36) + '-' + Math.random().toString(36).slice(2), text, scope, library,
});

function searchTargets(scope: Scope, filters: Filters, library: string) {
  const params = new URLSearchParams();
  if (scope !== 'external') {
    for (const key of FIELDS) {
      const value = filters[key];
      if (key !== 'outside' && key !== 'releaseFrom' && key !== 'releaseTo' && typeof value === 'string' && value.trim()) params.set(key, value.trim());
    }
    const range = { min: filters.releaseFrom || undefined, max: filters.releaseTo || undefined };
    if (validRange('date', range)) params.set('column_filters', writeColumnFilters({}, 'release', { range }));
    if (params.size) params.set('library', library);
  }
  const outside = scope !== 'library' && typeof filters.outside === 'string' ? filters.outside.trim() : '';
  return { params, outside };
}

function searchSteps(turn: Turn | null, filters: Filters | null, results: Results, state: 'busy' | 'stopped' | 'error' | 'settled') {
  if (!turn) return [];
  const steps: SearchStep[] = [];
  if (turn.automatic) {
    steps.push({ key: turn.fixedTask ? 'fixedTask' : 'interpret', state: filters ? 'done' : state === 'busy' ? 'running'
      : state === 'stopped' ? 'stopped' : state === 'error' ? 'failed' : 'waiting' });
  }
  if (!filters) return steps;
  const { params, outside } = searchTargets(turn.scope, filters, turn.library ?? '');
  for (const source of (['library', 'external'] as const)) {
    const result = results[source];
    if (!result && !(source === 'library' ? params.size : outside)) continue;
    steps.push({ key: source, state: result ? result.error ? 'failed' : 'done'
      : state === 'busy' ? 'running' : state === 'stopped' ? 'stopped' : 'waiting' });
  }
  return steps;
}

export function LibraryAssistant() {
  const [query, setQuery] = useState(() => new URLSearchParams(location.search).get('ask')?.slice(0, 500) || '');
  const [scope, setScope] = useState<Scope>('library');
  const [libraryChoice, setLibraryChoice] = useState(currentLibrary);
  const libraries = useSyncExternalStore(onLibraries, publishedLibraries);
  const library = libraries && !libraries.some(row => row.id === libraryChoice) ? '' : libraryChoice;
  const [conditions, setConditions] = useState<Filters>({});
  const [optionsOpen, setOptionsOpen] = useState(false);
  const [chatId, setChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<SavedTurn[]>([]);
  const [usage, setUsage] = useState(EMPTY_USAGE);
  const [modelChoice, setModelChoice] = useState<TaskProfile | null>(null);
  const [demoId, setDemoId] = useState<SearchDemoId | null>(null);
  const [showDemos, setShowDemos] = useState(() => {
    try { return localStorage.getItem(DEMOS_HIDDEN_KEY) !== '1'; }
    catch { return true; }
  });
  const [fixedId, setFixedId] = useState('');
  const fixedTasks = useCustomTasks();
  const fixed = fixedTasks.data?.tasks.find(row => row.id === fixedId);
  const [workTask, setWorkTask] = useState<WorkTask | null>(null);
  const [workTaskDemo, setWorkTaskDemo] = useState(true);
  const taskPlayback = useRecordedTaskDemo(workTask !== null && workTaskDemo);
  const demo = demoId !== null;
  const simulation = useSearchDemo(demoId);
  const [turn, setTurn] = useState<Turn | null>(null);
  const [filters, setFilters] = useState<Filters | null>(null);
  const [results, setResults] = useState<Results>({});
  const [plannedWork, setPlannedWork] = useState<WorkTaskPlan>();
  const [stopped, setStopped] = useState(false);
  const [presets, setPresets] = useState(() => readSearches());
  const [recent, setRecent] = useState(() => readSearches(true));
  const settings = appSettingsStore();
  useSyncExternalStore(settings.subscribe, settings.version);
  const historyLimit = settings.value.searchHistoryLimit;
  const action = useAction();
  const setup = useQuery({
    queryKey: AI_CONNECTIONS_KEY, queryFn: ({ signal }) => apiGet<AIConnections>(AI_CONNECTIONS_URL, signal),
  });
  const searchProfile = setup.data?.task_profiles?.search;
  const providers = setup.data?.providers ?? [];
  const connections = providers.filter(row => row.configured);
  const provider = searchProfile?.provider ? connections.find(row => row.id === searchProfile.provider)
    : preferredAIConnection(connections);
  const fallback = provider && { provider: provider.id, model: searchProfile?.model || provider.model,
    effort: searchProfile?.effort ?? provider.default_efforts?.search ?? 'default' };
  const selection = modelChoice && connections.some(row => row.id === modelChoice.provider) ? modelChoice : null;
  const setupAction = !setup.isPending && !connections.length ? <div className="flex flex-col items-center gap-2">
    {setup.error ? <p role="status" className="text-body-regular text-text-secondary"
      data-copy-key={setup.error instanceof ApiError && setup.error.status === 403 ? 'api.aiLibrary.privateAccess' : undefined}>
      {errorMessage(setup.error)}
    </p> : null}
    <ConfigureAIButton />
  </div> : null;
  const hasPlanner = Boolean(selection || fallback);
  const seeds = Object.fromEntries(Object.entries(conditions).filter(([, value]) => value?.trim()));
  const seedTargets = searchTargets(scope, seeds, library);
  const invalidPeriod = (input: Filters) => Boolean(input.releaseFrom && input.releaseTo && input.releaseFrom > input.releaseTo);
  const conditionsOnly = !query.trim() && Boolean(seedTargets.params.size || seedTargets.outside);
  const fixedConnection = fixed?.provider ? connections.find(row => row.id === fixed.provider) : preferredAIConnection(connections);
  const canSubmit = fixed ? Boolean(fixedConnection) : (scope === 'external' || !invalidPeriod(seeds))
    && (conditionsOnly || (!setup.isPending && Boolean(query.trim()) && (hasPlanner || scope === 'library')));
  const busy = Boolean(action.busy);
  const planning = busy && Boolean(turn?.automatic) && filters === null;
  const searching = busy && filters !== null && !turn?.fixedTask;
  const answer = messages.find(entry => entry.turn.id === turn?.id)?.answer;
  const resultKey = Object.keys(results).join(',');
  const visibleMessages = messages.filter(entry => entry.turn.id !== turn?.id);
  const panelFilters = { ...(turn?.scope === scope ? filters : {}), ...conditions };
  const panelTargets = searchTargets(scope, panelFilters, library);
  const panelCanSearch = Boolean(panelTargets.params.size || panelTargets.outside) && (scope === 'external' || !invalidPeriod(panelFilters));

  const updateRecent = (next: Recent[]) => {
    const bounded = [...next];
    let stored = JSON.stringify(bounded);
    while (stored.length > CHAT_STORAGE_LIMIT && bounded.length > 1) {
      bounded.pop();
      stored = JSON.stringify(bounded);
    }
    try { localStorage.setItem(RECENT_KEY, stored); }
    catch { /* 本地存储不可用时本次搜索仍能继续。 */ }
    setRecent(bounded);
  };
  const record = (entry: SavedTurn, measured: ConversationUsage) => {
    if (!entry.turn.text) return;
    const id = chatId ?? entry.turn.id;
    const savedResults = Object.fromEntries(Object.entries(entry.results).map(([source, result]) => [source, snapshotSearchResult(result)]));
    const next = [...messages, { ...entry, results: savedResults }].slice(-12);
    setChatId(id);
    setMessages(next);
    if (!historyLimit) return;
    const name = recent.find(entry => entry.id === id)?.name ?? entry.turn.text;
    updateRecent([{ id, name, scope: entry.turn.scope, filters: entry.filters ?? {}, messages: next, usage: measured },
      ...recent.filter(row => row.id !== id)].slice(0, historyLimit));
  };
  const reset = () => {
    setWorkTask(null);
    setFixedId('');
    setDemoId(null); setTurn(null); setQuery(''); setScope('library'); setConditions({}); setModelChoice(null);
    setLibraryChoice(currentLibrary()); setUsage(EMPTY_USAGE);
    setStopped(false); setPlannedWork(undefined);
    setFilters(null); setResults({}); setChatId(null); setMessages([]); setOptionsOpen(false); action.setError('');
  };
  const changeScope = (key: Scope) => {
    if (key === scope) return;
    setScope(key);
  };

  const runSearch = (submitted: Turn, choosePlan: (signal: AbortSignal, report: (tokens?: TokenUsage | null) => void) => SearchPlan | Promise<SearchPlan>) => {
    setTurn(submitted);
    setFilters(null);
    setResults({});
    setStopped(false);
    setPlannedWork(undefined);
    let measured = usage;
    const updateUsage = (next: ConversationUsage) => {
      measured = next;
      setUsage(next);
      if (chatId && historyLimit) updateRecent(recent.map(entry => entry.id === chatId ? { ...entry, usage: next } : entry));
    };
    void action.run('search', async signal => {
      if (submitted.automatic) updateUsage({ ...usage, requests: usage.requests + 1 });
      const plan = await choosePlan(signal, tokens => {
        if (!tokens || signal.aborted) return;
        updateUsage({ ...measured, measured: measured.measured + 1,
          input_tokens: measured.input_tokens + tokens.input_tokens, output_tokens: measured.output_tokens + tokens.output_tokens });
      });
      signal.throwIfAborted();
      const { filters: chosen, work, answer } = plan;
      setFilters(chosen);
      if (answer !== undefined) return { turn: submitted, filters: chosen, results: {}, answer };
      if (work) return { turn: submitted, filters: chosen, results: {}, work };
      const { params, outside } = searchTargets(submitted.scope, chosen, submitted.library ?? '');
      const requests: { key: 'library' | 'external'; url: string }[] = [];
      if (params.size) {
        params.set('limit', '20');
        params.set('count', '0');
        requests.push({ key: 'library', url: '/api/items?' + params });
      }
      if (outside) requests.push({ key: 'external', url: '/api/ai-library/external-search?' + new URLSearchParams({ q: outside }) });
      const reply = Object.fromEntries(await Promise.all(requests.map(async ({ key, url }) => {
        const reply = await apiGet<SearchResult>(url, signal).catch(cause => ({ items: [], error: errorMessage(cause) }));
        if (!signal.aborted) setResults(previous => ({ ...previous, [key]: reply }));
        return [key, reply] as const;
      })));
      return { turn: submitted, filters: chosen, results: reply };
    }, (entry: SavedTurn) => {
      setResults(entry.results);
      setPlannedWork(entry.work);
      record(entry, measured);
    }, cause => {
      action.setError(errorMessage(cause));
    });
  };
  const submitQuery = () => {
    const text = query.trim();
    if (busy || !canSubmit) return;
    if (fixed) {
      setQuery('');
      runSearch({ ...newTurn(text || fixed.name, scope, library), automatic: true, fixedTask: fixed.name }, async (signal, report) => {
        const result = await apiSend<{ answer: string; usage?: TokenUsage | null }>(CUSTOM_TASKS_URL + '/run', {
          id: fixed.id, text, prompt_language: interfaceLanguage,
        }, 'POST', signal).catch(cause => {
          if (cause instanceof ApiError) report((cause.body as { usage?: TokenUsage } | null)?.usage);
          throw cause;
        });
        report(result.usage);
        return { filters: {}, answer: result.answer };
      });
      return;
    }
    if (conditionsOnly) {
      runSearch(newTurn('', scope, library), () => ({ filters: seeds }));
      return;
    }
    setQuery('');
    if (!hasPlanner) {
      runSearch(newTurn(text, scope, library), () => ({ filters: { ...seeds, q: text } }));
      return;
    }
    runSearch({ ...newTurn(text, scope, library), automatic: true }, async (signal, report) => {
      const previous = [...messages].reverse().find(entry => !entry.work && !entry.stopped && entry.filters
        && Object.keys(entry.filters).length && (entry.turn.library ?? '') === library)?.filters;
      const result = await apiSend<SearchPlan & { usage?: TokenUsage | null }>('/api/ai-library/search-plan', {
        prompt_language: interfaceLanguage,
        query: text, scope, ...(selection && { connection: selection }),
        ...(previous && { previous_filters: previous }),
      }, 'POST', signal).catch(cause => {
        if (cause instanceof ApiError) report((cause.body as { usage?: TokenUsage } | null)?.usage);
        throw cause;
      });
      report(result.usage);
      if (result.work) return { filters: {}, work: result.work };
      return { filters: scope === 'external' ? result.filters : { ...result.filters, ...seeds } };
    });
  };
  const search = () => {
    if (busy || !panelCanSearch) return;
    setOptionsOpen(false);
    runSearch(newTurn('', scope, library), () => ({ filters: panelFilters }));
  };
  const stop = () => {
    if (demo) { simulation.stop(); return; }
    if (!turn || !busy) return;
    action.cancel();
    setStopped(true);
    record({ turn, filters, results, stopped: true }, usage);
  };
  const restore = (entry: Recent) => {
    setFixedId('');
    setWorkTask(null);
    setDemoId(null);
    const saved: SavedTurn[] = Array.isArray(entry.messages) ? entry.messages
      : [{ turn: { id: entry.id, text: entry.name, scope: entry.scope }, filters: entry.filters, results: {} }];
    const last = saved.at(-1);
    if (!last) return;
    setChatId(entry.id); setMessages(saved); setTurn(last.turn);
    setScope(last.turn.scope); setConditions({}); setFilters(last.filters); setQuery(''); setResults(last.results);
    setLibraryChoice(last.turn.library ?? currentLibrary());
    setPlannedWork(last.work);
    setStopped(Boolean(last.stopped));
    setUsage(entry.usage ?? { ...EMPTY_USAGE, requests: saved.filter(message => message.turn.automatic).length });
    setOptionsOpen(false); action.setError('');
  };
  const updatePresets = (next: Preset[]) => {
    try { localStorage.setItem(PRESET_KEY, JSON.stringify(next)); }
    catch { action.setError(copy('saveFailed')); return; }
    setPresets(next);
  };
  const saved = presets.some(row => row.scope === scope && JSON.stringify(row.filters) === JSON.stringify(panelFilters));
  const changeFilter = (field: Field, value: string) => setConditions(before => ({ ...before, [field]: value }));
  const clearFilters = () => setConditions(Object.fromEntries(FIELDS.map(field => [field, ''])));
  const playDemo = (id: SearchDemoId) => {
    simulation.restart();
    setDemoId(id);
  };
  const openWorkTask = (task: WorkTask, playback: boolean) => {
    if (playback) taskPlayback.restart();
    setWorkTaskDemo(playback);
    setWorkTask(task);
  };
  const toggleDemos = () => {
    const next = !showDemos;
    setShowDemos(next);
    try { localStorage.setItem(DEMOS_HIDDEN_KEY, next ? '0' : '1'); } catch { /* 当前页面仍可切换。 */ }
  };
  const compose = <SearchComposer
    fixedTask={demo ? undefined : fixed?.name}
    query={demo ? '' : query} setQuery={setQuery} busy={busy} submit={submitQuery} stop={stop} demo={demo}
    loading={demo ? !simulation.stopped && simulation.phase !== 'done' : planning || searching} canSubmit={canSubmit}
    conditions={fixed && !demo ? <Button type="button" size="xs" variant="secondary" trailingIcon={RiCloseLine}
      data-ai-button="round" className="min-w-0 max-w-2/5 [&>span]:min-w-0"
      aria-label={copy('clearFixedTask')} title={fixed.name} disabled={busy} onClick={() => setFixedId('')}>
      <span className="block truncate">{fixed.name}</span>
    </Button> : <SearchConditionPicker scope={demo ? 'both' : scope} filters={demo ? {} : panelFilters} disabled={busy || demo}
      open={optionsOpen} setOpen={setOptionsOpen} onScope={changeScope} onChange={changeFilter}
      clear={clearFilters} actions={<>
        {scope !== 'external' && invalidPeriod(panelFilters) ? <ErrorText>{copy('invalidPeriod')}</ErrorText> : null}
        <div className="flex flex-wrap gap-1">
          <Button size="small" disabled={!panelCanSearch} onClick={search}>{copy('execute')}</Button>
          <Button size="small" variant="ghost" disabled={saved || !panelCanSearch} onClick={() => updatePresets([
            { name: query.trim() || panelFilters.q || panelFilters.outside || copy('scopes.' + scope), scope, filters: panelFilters },
            ...presets,
          ].slice(0, 12))}>{copy(saved ? 'saved' : 'save')}</Button>
          {panelTargets.params.size ? <ButtonLink href={'/?' + new URLSearchParams({ ...Object.fromEntries(panelTargets.params), loc: '', thumb: '0' })}
            size="small" variant="ghost">{copy('openLibrary')}</ButtonLink> : null}
        </div>
        {presets.length ? <div className="flex flex-col gap-1">
          <p className="text-caption-1-medium text-text-secondary" data-copy-key="catalog.libraryAssistant.presets">{copy('presets')}</p>
          {presets.map((entry, index) => <div key={index} className="flex min-w-0 items-center gap-1">
            <Button size="small" variant="ghost" className="min-w-0 flex-1 justify-start" onClick={() => {
              setScope(entry.scope); setConditions({ ...Object.fromEntries(FIELDS.map(field => [field, ''])), ...entry.filters });
            }}><span className="truncate">{entry.name}</span></Button>
            <Button size="xs" variant="ghost" iconOnly leadingIcon={RiDeleteBinLine}
              aria-label={copy('removeEntry') + ' ' + entry.name} onClick={() => updatePresets(presets.filter((_, position) => position !== index))} />
          </div>)}
        </div> : null}
      </>} />}
    model={fixed && !demo ? null : <SearchModelPicker providers={providers} fallback={fallback} value={selection} onChange={setModelChoice} disabled={busy || demo || setup.isPending} />}
    status={demo ? <>
      <DemoStatus />
      <div className="ml-auto flex flex-wrap items-center gap-1">
        {simulation.phase === 'done' || simulation.stopped ? <DemoReplayButton onReplay={simulation.restart} /> : null}
        <Button type="button" size="xs" variant="ghost" leadingIcon={RiArrowGoBackLine}
          data-ai-button="footer" onClick={() => setDemoId(null)}>
          <span data-copy-key="catalog.libraryAssistant.exitDemo">{copy('exitDemo')}</span>
        </Button>
        <ConversationUsagePopover usage={simulation.phase === 'interpret' ? { ...EMPTY_USAGE, requests: 1 } : DEMO_USAGE}
          demo pending={simulation.phase === 'interpret' && !simulation.stopped} />
      </div>
    </> : <>
      {!fixed ? <SearchLibraryPicker libraries={libraries} library={library} change={setLibraryChoice} disabled={busy || scope === 'external'} /> : null}
      <div className="ml-auto flex flex-wrap items-center gap-1">
        <WorkTaskMenu choose={task => { setFixedId(''); openWorkTask(task, false); }} disabled={busy}
          fixedTasks={fixedTasks.data?.tasks} selected={fixed?.id}
          chooseFixed={id => { setFixedId(id); setOptionsOpen(false); action.setError(''); }} />
        <ConversationUsagePopover usage={usage} pending={planning} provider={fixed ? fixedConnection?.id : (selection ?? fallback)?.provider} />
      </div>
      {turn && setupAction ? <div className="basis-full px-1.5">{setupAction}</div> : null}
      {fixed && !fixedConnection ? <p className="basis-full px-1.5 text-caption-1-regular text-text-secondary">
        {t('settings:aiLibrary.taskConnectionMissing')}
      </p> : !fixed && hasPlanner ? <p className="basis-full px-1.5 text-caption-1-regular text-text-secondary"
        data-copy-key={scope === 'library' ? 'catalog.libraryAssistant.share' : 'catalog.libraryAssistant.shareExternal'}>
        {copy(scope === 'library' ? 'share' : 'shareExternal')}
      </p> : null}
    </>} />;
  const history = (close?: () => void) => <SearchHistory recent={recent.slice(0, historyLimit)} historyEnabled={historyLimit > 0}
    active={chatId ?? undefined} busy={busy}
    create={() => { reset(); close?.(); }}
    openRecent={entry => { restore(entry); close?.(); }}
    removeRecent={entry => {
      updateRecent(recent.filter(row => row.id !== entry.id));
      if (chatId === entry.id) reset();
    }} />;
  const steps = searchSteps(turn, filters, results, stopped ? 'stopped' : action.error ? 'error' : busy ? 'busy' : 'settled');
  const demoResultKey = simulation.phase === 'done' ? (simulation.results.external ? 'external' : 'library') : '';
  const taskFooter = workTaskDemo ? <AssistantFooter>
    <DemoStatus />
    {taskPlayback.phase === 'complete' ? <DemoReplayButton onReplay={taskPlayback.restart} /> : null}
  </AssistantFooter> : null;
  return <AssistantWorkspace active={Boolean(turn || workTask) || demo}
    focusKey={workTask ? workTask + '-' + taskPlayback.run : (demo ? 'demo-' + simulation.run : turn?.id || '')}
    resultKey={workTask ? '' : demo ? demoResultKey : searching ? '' : answer ? 'fixed-answer' : resultKey} compose={workTask ? taskFooter : compose} history={history}
    onBack={workTask || demo ? () => { setWorkTask(null); setDemoId(null); } : undefined}>
    {workTask ? <WorkTaskWorkspace key={workTask} task={workTask} library={library}>
      {workTaskDemo ? <RecordedTaskDemo task={workTask} phase={taskPlayback.phase} run={taskPlayback.run} /> : null}
    </WorkTaskWorkspace>
      : demoId ? <SearchDemo key={simulation.run} id={demoId} simulation={simulation} /> : <>
    {!turn ? <SearchWelcome setupAction={setupAction}
      demoCases={<SearchDemoCases choose={playDemo} visible={showDemos} toggle={toggleDemos}>
      <WorkTaskButtons choose={task => openWorkTask(task, true)} />
    </SearchDemoCases>} /> : null}
    {visibleMessages.map(entry => <div key={entry.turn.id} className="flex min-w-0 flex-col gap-3">
      <SearchMessage text={entry.turn.text} task={entry.turn.fixedTask} />
      <SearchTrace steps={searchSteps(entry.turn, entry.filters, entry.results, entry.stopped ? 'stopped' : 'settled')} />
      {entry.answer ? <FixedTaskAnswer answer={entry.answer} /> : null}
      {entry.work ? <Disclosure summary={<span data-copy-key={'catalog.libraryAssistant.workTask.' + entry.work.kind}>
        {copy('workTask.' + entry.work.kind)}</span>}>
        <AssistantWorkTask plan={entry.work} library={entry.turn.library ?? ''} />
      </Disclosure> : null}
      {Object.entries(entry.results).map(([source, result]) => <SearchWorks key={source} source={source as SearchSource} result={result} historical />)}
    </div>)}
    {turn ? <div data-ai-search-current="" className="flex min-w-0 flex-col gap-4">
      {turn.text ? <SearchMessage text={turn.text} task={turn.fixedTask} /> : null}
      <SearchTrace key={turn.id} steps={steps} />
      {answer ? <FixedTaskAnswer answer={answer} /> : null}
      {plannedWork ? <AssistantWorkTask key={turn.id} plan={plannedWork} library={turn.library ?? ''} /> : null}
    </div> : null}
    {action.error ? <div className={cardClass({ variant: 'outlined', padding: 'none', className: 'p-3' })}>
      <ErrorText>{action.error}</ErrorText>
    </div> : null}
    {stopped ? <Help role="status"><span data-copy-key="catalog.libraryAssistant.stopped">{copy('stopped')}</span></Help> : null}
    {resultKey ? <div data-ai-search-results="" className="flex min-w-0 flex-col gap-4">
      {results.library ? <SearchWorks result={results.library} source="library" /> : null}
      {results.external ? <SearchWorks result={results.external} source="external" /> : null}
    </div> : null}
    </>}
  </AssistantWorkspace>;
}

function SearchMessage({ text, task }: { text: string; task?: string }) {
  return <div data-ai-chat-message="" className="ml-auto assistant-message-width rounded-2xl rounded-br-md bg-background-primary-default px-4 py-2.5 text-body-regular wrap-anywhere text-text-primary">
    {task && task !== text ? <p className="text-caption-1-medium text-text-secondary">{task}</p> : null}
    <p>{text}</p>
  </div>;
}

function FixedTaskAnswer({ answer }: { answer: string }) {
  return <p data-ai-fixed-answer="" className="text-body-regular whitespace-pre-wrap wrap-anywhere text-text-primary">{answer}</p>;
}

function SearchHistory({ recent, historyEnabled, active, busy, create, openRecent, removeRecent }: {
  recent: Recent[]; historyEnabled: boolean; active?: string; busy: boolean; create(): void;
  openRecent(entry: Recent): void; removeRecent(entry: Recent): void;
}) {
  const row = (name: string, key: string, current: boolean, open: () => void, remove: () => void) =>
    <li key={key} className="group flex min-w-0 items-center gap-1 rounded-lg">
      <Button size="small" variant="ghost" leadingIcon={RiHistoryLine}
        className="min-w-0 flex-1 justify-start" title={name} aria-current={current ? 'true' : undefined}
        disabled={busy} onClick={open}><span className="truncate">{name}</span></Button>
      <Button size="xs" variant="ghost" iconOnly leadingIcon={RiDeleteBinLine} data-ai-search-history-remove=""
        aria-label={copy('removeEntry') + ' ' + name} title={copy('removeEntry')} disabled={busy} onClick={remove} />
    </li>;
  return <div data-ai-search-history="" className="flex min-w-0 flex-col gap-4">
    <Button size="small" variant="ghost" leadingIcon={RiAddLine} className="w-full justify-start"
      disabled={busy} onClick={create}><span data-copy-key="catalog.libraryAssistant.newSearch">{copy('newSearch')}</span></Button>
    {historyEnabled ? <section aria-label={copy('recent')} className="flex min-w-0 flex-col gap-2">
      <h2 className="px-2 text-caption-1-medium! text-text-secondary" data-copy-key="catalog.libraryAssistant.recent">{copy('recent')}</h2>
      {recent.length ? <ul className="flex min-w-0 flex-col gap-1">
        {recent.map(entry => row(entry.name, entry.id, active === entry.id, () => openRecent(entry), () => removeRecent(entry)))}
      </ul> : <p className="px-2 text-caption-1-regular text-text-secondary" data-copy-key="catalog.libraryAssistant.historyEmpty">{copy('historyEmpty')}</p>}
    </section> : null}
  </div>;
}
