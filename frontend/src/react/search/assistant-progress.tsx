import { useEffect, useState, type ReactNode } from 'react';
import { RiCheckLine, RiErrorWarningLine, RiEyeOffLine, RiStopLine } from '@remixicon/react';
import { LogRow, useLogMotion } from '@/components/application/agent-log/agent-log';
import { AgentThinking } from '@/components/application/agent-thinking/agent-thinking';
import { Button } from '@/components/base/buttons/button';
import { cx } from '@/utils/cx';
import { interfaceLanguage } from '../../i18n';
import { Disclosure } from '../settings/section';
import { demoCatalogue, demoCollection } from './assistant-demo-catalog';
import { SearchWorks, type SearchResult, type SearchSource } from './assistant-results';
import { assistantCopy as copy } from './assistant-workspace';

export type SearchStep = { key: 'interpret' | 'fixedTask' | SearchSource; state: 'waiting' | 'running' | 'done' | 'failed' | 'stopped' };
const STEP_VARIANT = { interpret: 'wave', fixedTask: 'wave', library: 'spin', external: 'infinity' } as const;

export function SearchTrace({ steps, demo = false }: { steps: SearchStep[]; demo?: boolean }) {
  const reduce = useLogMotion();
  const started = steps.filter(step => step.state !== 'waiting');
  if (!started.length) return null;
  const complete = steps.every(step => step.state === 'done');
  const detail = <ol className="min-w-0" aria-label={copy('process')}>
    {started.map(({ key, state }, index) => {
      if (state === 'waiting') return null;
      const Icon = state === 'done' ? RiCheckLine : state === 'stopped' ? RiStopLine : RiErrorWarningLine;
      const labelKey = demo && key === 'library' ? 'demoSearchLibrary'
        : demo && key === 'external' ? 'checkingCache' : 'steps.' + key;
      return <LogRow key={key} first={index === 0} last={index === started.length - 1} reduce={reduce}>
        <div data-search-step={key} data-search-state={state} className="flex min-w-0 items-center gap-2 py-1">
          {state === 'running' ? <div className="min-w-0" data-ai-search-thinking={STEP_VARIANT[key]}
            data-copy-key={'catalog.libraryAssistant.' + labelKey}>
            <AgentThinking variant={STEP_VARIANT[key]} label={copy(labelKey)} />
          </div> : <>
            <Icon className={cx('size-4 shrink-0', state === 'done' ? 'text-notification-success-foreground'
              : state === 'failed' ? 'text-text-error-primary' : 'text-text-secondary')} aria-hidden />
            <span className="min-w-0 flex-1 text-body-2-regular text-text-primary"
              data-copy-key={'catalog.libraryAssistant.' + labelKey}>{copy(labelKey)}</span>
            <span className="shrink-0 text-caption-1-regular text-text-secondary">{copy('stepStates.' + state)}</span>
          </>}
        </div>
      </LogRow>;
    })}
  </ol>;
  return complete ? <Disclosure summary={
    <span data-copy-key="catalog.libraryAssistant.processDone">{copy('processDone')}</span>
  }>{detail}</Disclosure> : detail;
}

type DemoPhase = 'interpret' | SearchSource | 'done';
const DEMOS = {
  combined: { matches: () => true, external: true },
  unwatched: { matches: (entry: DemoEntry) => entry.unwatched, external: false },
  marked: { matches: (entry: DemoEntry) => entry.marked, external: false },
  translation: { matches: (entry: DemoEntry) => !entry.translated.includes(interfaceLanguage), external: false },
};
type DemoEntry = typeof demoCollection[number];
export type SearchDemoId = keyof typeof DEMOS;

export function SearchDemoCases({ choose, children, visible, toggle }: {
  choose(id: SearchDemoId): void; children?: ReactNode; visible: boolean; toggle(): void;
}) {
  if (!visible) return <Button type="button" size="xs" variant="ghost" onClick={toggle}>
    <span data-copy-key="catalog.libraryAssistant.showDemoCases">{copy('showDemoCases')}</span>
  </Button>;
  return <div className="flex w-full flex-col items-center gap-2">
    <div className="flex items-center gap-1">
      <p className="text-caption-1-medium text-text-secondary" data-copy-key="catalog.libraryAssistant.demoCases">{copy('demoCases')}</p>
      <Button type="button" size="xs" variant="ghost" iconOnly leadingIcon={RiEyeOffLine} data-ai-button="round"
        onClick={toggle} aria-label={copy('hideDemoCases')} title={copy('hideDemoCases')} />
    </div>
    <div role="group" aria-label={copy('demoCases')} className="flex w-full flex-wrap justify-center gap-2">
      {(Object.keys(DEMOS) as SearchDemoId[]).map(id => {
        const key = 'demos.' + id + '.prompt';
        return <Button key={id} size="small" variant="secondary" data-copy-interact=""
          data-ai-button="example" className="min-w-0 max-w-full text-left [&>span]:min-w-0 [&>span]:shrink"
          onClick={event => { if (!event.altKey) choose(id); }}>
          <span className="whitespace-normal wrap-anywhere" data-copy-key={'catalog.libraryAssistant.' + key}>{copy(key)}</span>
        </Button>;
      })}
      {children}
    </div>
  </div>;
}

function demoSteps(id: SearchDemoId, phase: DemoPhase, stopped: boolean): SearchStep[] {
  const keys: SearchStep['key'][] = ['interpret', 'library'];
  if (DEMOS[id].external) keys.push('external');
  const current = phase === 'done' ? keys.length : keys.indexOf(phase);
  return keys.map((key, index) => ({
    key, state: index < current ? 'done' : index > current ? 'waiting' : stopped ? 'stopped' : 'running',
  }));
}

export function useSearchDemo(id: SearchDemoId | null) {
  const [phase, setPhase] = useState<DemoPhase>('interpret');
  const [stopped, setStopped] = useState(false);
  const [run, setRun] = useState(0);
  useEffect(() => {
    if (!id || phase === 'done' || stopped) return;
    const next = phase === 'interpret' ? 'library' : phase === 'library' && DEMOS[id].external ? 'external' : 'done';
    const timer = window.setTimeout(() => setPhase(next), { interpret: 2300, library: 2100, external: 2650 }[phase]);
    return () => window.clearTimeout(timer);
  }, [id, phase, run, stopped]);
  const results: Partial<Record<SearchSource, SearchResult>> = {};
  if (id && (phase === 'external' || phase === 'done')) {
    const items = demoCollection.filter(DEMOS[id].matches).map(entry => entry.work);
    if (id === 'translation') items.sort((a, b) => b.release_date.localeCompare(a.release_date));
    results.library = { items };
    if (phase === 'done' && DEMOS[id].external) results.external = { items: [demoCatalogue['IDPC-032']] };
  }
  return {
    phase, results, run, stopped,
    stop: () => setStopped(true),
    restart: () => { setPhase('interpret'); setStopped(false); setRun(value => value + 1); },
  };
}

export function SearchDemo({ id, simulation }: { id: SearchDemoId; simulation: ReturnType<typeof useSearchDemo> }) {
  const { phase, results } = simulation;
  const promptKey = 'demos.' + id + '.prompt';
  return <>
    <p className="ml-auto assistant-message-width rounded-2xl rounded-br-md bg-background-primary-default px-4 py-2.5 text-body-regular text-text-primary"
      data-copy-key={'catalog.libraryAssistant.' + promptKey} data-ai-search-reveal="">{copy(promptKey)}</p>
    <p className="text-caption-1-regular text-text-secondary"
      data-copy-key="catalog.libraryAssistant.demoCatalogueStatus">{copy('demoCatalogueStatus')}</p>
    <SearchTrace steps={demoSteps(id, phase, simulation.stopped)} demo />
    {results.library || results.external ? <div data-ai-search-results="" className="flex flex-col gap-4">
      {results.library ? <SearchWorks result={results.library} source="library" localOnly title={copy('demoCollection')} /> : null}
      {results.external ? <SearchWorks result={results.external} source="external" localOnly /> : null}
    </div> : null}
  </>;
}
