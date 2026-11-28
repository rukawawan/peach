import { useEffect, useState } from 'react';
import { RiArrowRightUpLine } from '@remixicon/react';
import { AgentThinking } from '@/components/application/agent-thinking/agent-thinking';
import { Button } from '@/components/base/buttons/button';
import { Checkbox } from '@/components/base/checkbox/checkbox';
import { Input } from '@/components/base/input/input';
import { Textarea } from '@/components/base/textarea/textarea';
import { cx } from '@/utils/cx';
import { interfaceLanguage, t } from '../../i18n';
import { Help } from '../settings/section';
import { demoCatalogue, demoDebutTag, demoSearchListing, demoSynopsis } from './assistant-demo-catalog';
import recording from './assistant-demo-recording.json';
import type { WorkTask } from './assistant-work-tasks';
import { assistantCopy as copy } from './assistant-workspace';

const result = recording.results[interfaceLanguage];
const primary = demoCatalogue['IPZZ-690'];
const visual = demoCatalogue['IDPC-032'];
const editions = demoCatalogue['IPZZ-893'];
type DemoWork = typeof primary;
type Phase = 'reading' | 'analyzing' | 'complete';

export function useRecordedTaskDemo(active: boolean) {
  const [phase, setPhase] = useState<Phase>('reading');
  const [run, setRun] = useState(0);
  useEffect(() => {
    if (!active) return;
    const analyze = window.setTimeout(() => setPhase('analyzing'), 650);
    const complete = window.setTimeout(() => setPhase('complete'), 1900);
    return () => {
      window.clearTimeout(analyze);
      window.clearTimeout(complete);
    };
  }, [active, run]);
  return { phase, run, restart: () => { setPhase('reading'); setRun(value => value + 1); } };
}

export function RecordedTaskDemo({ task, phase, run }: { task: WorkTask; phase: Phase; run: number }) {
  return <section aria-label={copy('demoCases')} className="flex min-w-0 flex-col gap-4">
    <DemoSource task={task} />
    {phase !== 'complete' ? <div aria-live="polite">
      <AgentThinking key={phase} variant={phase === 'reading' ? 'spin' : 'wave'}
        label={copy(phase === 'reading' ? 'demoReading' : 'demoAnalyzing.' + task)} />
    </div> : <div key={run} data-ai-search-reveal="" className="flex min-w-0 flex-col gap-2">
      <h2 className="text-body-medium! text-text-primary" data-copy-key="catalog.libraryAssistant.demoResult">{copy('demoResult')}</h2>
      {task === 'translate' ? <TranslationReview /> : <SuggestionReview task={task} />}
    </div>}
  </section>;
}

function DemoSource({ task }: { task: WorkTask }) {
  return <section className="flex min-w-0 flex-col gap-3 rounded-xl bg-background-primary-default p-3 wrap-anywhere">
    <h2 className="text-body-medium! text-text-primary" data-copy-key="catalog.libraryAssistant.demoSource">{copy('demoSource')}</h2>
    {task === 'organize' ? <ul className="flex flex-col gap-2">
      <li><DemoWorkIdentity work={primary}>
        <a href={demoSearchListing} target="_blank" rel="noreferrer" className="underline-offset-2 hover:underline">{copy('demoOfficialListing')}</a>
      </DemoWorkIdentity></li>
      <li><DemoWorkIdentity work={editions}>DVD IPZZ893 · Blu-ray 9IPZZ893</DemoWorkIdentity></li>
      <li><DemoWorkIdentity work={visual}>FIRST IMPRESSION 197</DemoWorkIdentity></li>
    </ul> : <>
      <DemoWorkIdentity work={task === 'vision' ? visual : primary} preview={task === 'vision'}>
        {task === 'vision' ? copy('demoOfficialCover') : null}
      </DemoWorkIdentity>
      {task === 'metadata' ? <ul className="flex flex-col gap-1.5 text-body-2-regular text-text-secondary">
        <li><strong className="text-text-primary">{copy('demoLocalRecord')}</strong> · IPZZ690 · {copy('demoMetadataMissing')}</li>
        <li><strong className="text-text-primary">{copy('demoStudioRecord')}</strong> · DVD IPZZ690 · {primary.release_date} · {copy('demoDuration')}</li>
      </ul> : null}
      {task === 'translate' || task === 'tags' ? <p lang="ja" className="text-body-2-regular text-text-secondary">{demoSynopsis}</p> : null}
      {task === 'tags' ? <Help>{copy('demoExistingTags')} · {demoDebutTag}</Help> : null}
    </>}
  </section>;
}

function DemoWorkIdentity({ work, preview = false, children }: {
  work: DemoWork; preview?: boolean; children?: React.ReactNode;
}) {
  return <div data-ai-demo-identity="" className="flex min-w-0 items-start gap-3 rounded-lg bg-background-secondary-default p-2">
    <img src={work.demoCover} alt={t('catalog:libraryAssistant.cover', { title: work.title })}
      className={cx('h-auto shrink-0 rounded-md', preview ? 'w-24 sm:w-36' : 'w-12')} />
    <div className="flex min-w-0 flex-col gap-1">
      <p className="text-caption-1-medium text-text-secondary">{work.code} · {work.release_date} · {work.studio}</p>
      <a href={work.demoSource} target="_blank" rel="noreferrer"
        data-work-card-link="" className="group flex min-w-0 items-start gap-1.5 text-body-2-medium text-text-primary">
        <span lang="ja" className="group-hover:underline group-focus-visible:underline">{work.title}</span>
        <RiArrowRightUpLine className="mt-0.5 size-4 shrink-0 text-foreground-icon-secondary" aria-hidden />
      </a>
      <p lang="ja" className="text-caption-1-medium text-text-secondary">{work.performers.join(' · ')}</p>
      {children ? <p className="text-caption-1-regular text-text-secondary">{children}</p> : null}
    </div>
  </div>;
}

function TranslationReview() {
  const [title, setTitle] = useState(result.translation.title);
  const [summary, setSummary] = useState(result.translation.summary);
  const [accepted, setAccepted] = useState(false);
  return <div className="flex min-w-0 flex-col gap-3 rounded-xl bg-background-primary-default p-3">
    <Input label={t('catalog:aiLibrary.translatedTitle')} value={title} onChange={value => { setTitle(value); setAccepted(false); }} />
    <Textarea aria-label={t('catalog:aiLibrary.translatedSummary')} rows={3} value={summary}
      onChange={value => { setSummary(value); setAccepted(false); }} />
    <div className="flex flex-wrap items-center gap-2">
      <Button size="small" variant="secondary" disabled={accepted || !title.trim() || !summary.trim()}
        onClick={() => setAccepted(true)}>{copy('demoAcceptTranslation')}</Button>
      {accepted ? <Help role="status">{copy('demoTranslationAccepted')}</Help> : null}
    </div>
  </div>;
}

function SuggestionReview({ task }: { task: Exclude<WorkTask, 'translate'> }) {
  const [selected, setSelected] = useState<string[]>([]);
  const [accepted, setAccepted] = useState<number | null>(null);
  const candidates: { id: string; title: string; evidence: string; change?: string[] }[] =
    task === 'metadata' ? result.metadata.map(row => ({
    id: row.field,
    title: copy('demoField.' + row.field),
    change: [row.before || copy('demoFieldEmpty'), row.after],
    evidence: row.evidence,
  })) : task === 'organize' ? result.organize.map(row => ({
    id: row.id,
    title: row.id + ' · ' + row.decision,
    evidence: row.evidence,
  })) : (task === 'vision' ? result.vision : result.tags).map(row => ({
    id: row.label, title: row.label, evidence: row.evidence,
  }));
  return <div className="flex min-w-0 flex-col gap-2">
    {candidates.map(row => <div key={row.id} className="flex min-w-0 flex-col gap-1 rounded-xl bg-background-primary-default p-3 wrap-anywhere">
      <Checkbox isSelected={selected.includes(row.id)} onChange={value => {
        setSelected(current => value ? [...current, row.id] : current.filter(id => id !== row.id));
        setAccepted(null);
      }}>
        <span className="text-body-2-medium text-text-primary">{row.title}</span>
      </Checkbox>
      {row.change ? <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1 pl-6 text-body-2-regular">
        <del className="text-text-secondary">{row.change[0]}</del>
        <span className="text-caption-1-medium text-text-secondary" aria-hidden="true">→</span>
        <span className="text-text-primary">{row.change[1]}</span>
      </div> : null}
      <p className="pl-6 text-caption-1-regular text-text-secondary">{row.evidence}</p>
    </div>)}
    <div className="flex flex-wrap items-center gap-2">
      <Button size="small" variant="secondary" disabled={!selected.length || accepted !== null}
        onClick={() => setAccepted(selected.length)}>{copy('demoAcceptSuggestions')}</Button>
      {accepted !== null ? <Help role="status">{t('catalog:libraryAssistant.demoSuggestionsAccepted', { count: accepted })}</Help> : null}
    </div>
  </div>;
}
