import { useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { RiCloseLine } from '@remixicon/react';
import { Heading } from 'react-aria-components';
import { Button, ButtonLink } from '@/components/base/buttons/button';
import { Checkbox } from '@/components/base/checkbox/checkbox';
import { Select, SelectItem } from '@/components/base/select/select';
import { Input } from '@/components/base/input/input';
import { Textarea } from '@/components/base/textarea/textarea';
import { apiGet, apiSend, errorMessage } from '../../api';
import { interfaceLanguage, t } from '../../i18n';
import { seekVideoBy } from '../../player/playback';
import { aiConnectionLabel, AI_CONNECTIONS_KEY, AI_CONNECTIONS_URL, type AIConnections } from '../settings/ai-library-settings';
import { aiModelLabel, AI_ASSET_TASKS, preferredAIConnection } from '../settings/use-ai-models';
import { ErrorText, Help } from '../settings/section';
import { busyProps, useAction } from '../settings/use-action';
import { ModalFrame } from '../components/modal-frame';
import { spriteGlyph } from '../components/sprite-glyph';

const LANGUAGES = ['zh-TW', 'zh-CN', 'en'] as const;
const AssistantIcon = spriteGlyph('bot-orb');
export type TranslationLanguage = typeof LANGUAGES[number];
type Language = TranslationLanguage;
type AssetTask = typeof AI_ASSET_TASKS[number];
interface Translation { title: string; summary: string; language: Language; provider: string; model: string; quality: 'human' | 'machine' }
interface AssetAI { translations: Translation[]; source_summary: string; official_samples: number }
interface FrameEvidence { frame: number; seconds: number | null }
interface TimelineCoverage { source: string; available: number; usable: number; sent: number; analyzed: number; error?: string }
type Candidate = Partial<Translation> & {
  token: string; task: AssetTask;
  tags?: { tag: string; evidence: string; frames?: FrameEvidence[] }[];
  poses?: (FrameEvidence & { posture: string; camera: string })[];
  coverage?: TimelineCoverage;
};

export function LibraryAIPanel({ id, code, cover, onSaved, initialTask = 'translate', initialLanguage, inlineLabel }: {
  id: number; code?: string | null; cover: string; onSaved(): void;
  initialTask?: AssetTask; initialLanguage?: Language; inlineLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const inline = inlineLabel !== undefined;
  const autoRequested = useRef(false);
  const client = useQueryClient();
  const [task, setTask] = useState<AssetTask>(initialTask);
  const [language, setLanguage] = useState<Language>(initialLanguage ?? (interfaceLanguage === 'en' ? 'en' : 'zh-TW'));
  const [image, setImage] = useState('timeline');
  const [candidate, setCandidate] = useState<Candidate | null>(null);
  const [translation, setTranslation] = useState<{ title: string; summary: string } | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const action = useAction();
  const path = '/api/ai-library/assets/' + id;
  const connectionQuery = { queryKey: AI_CONNECTIONS_KEY,
    queryFn: ({ signal }: { signal: AbortSignal }) => apiGet<AIConnections>(AI_CONNECTIONS_URL, signal) };
  const assetQuery = { queryKey: ['ai-library-asset', id],
    queryFn: ({ signal }: { signal: AbortSignal }) => apiGet<AssetAI>(path, signal) };
  const connections = useQuery({ ...connectionQuery, enabled: open });
  const source = useQuery({ ...assetQuery, enabled: open });
  const options = connections.data?.providers.filter(row => row.configured) || [];
  const profile = connections.data?.task_profiles?.[task];
  const active = profile?.provider ? options.find(row => row.id === profile.provider) : preferredAIConnection(options);
  const taskModel = active?.id === profile?.provider ? profile?.model : active?.model;
  const taskEffort = (active?.id === profile?.provider ? profile?.effort : active?.default_efforts?.[task]) ?? 'default';
  const clear = () => { setCandidate(null); setTranslation(null); setSelected([]); };
  const showCandidate = (result: Candidate) => {
    setCandidate(result);
    if (result.task === 'translate') setTranslation({ title: result.title || '', summary: result.summary || '' });
  };
  const requestCandidate = (signal: AbortSignal, requestedTask = task) => apiSend<Candidate>(path, {
    task: requestedTask, language, prompt_language: interfaceLanguage, ...(requestedTask === 'vision' && {
      image: /^(cover|timeline|official)$/.test(image) ? image : Number(image),
    }),
  }, 'POST', signal);
  const openAssistant = () => {
    setOpen(true);
    const requestedTask = inline ? task : 'translate';
    if (requestedTask === 'vision' || autoRequested.current || action.busy || (inline && connections.data && !active)) return;
    void action.run('generate', async signal => {
      const [setup, record] = await Promise.all([client.fetchQuery(connectionQuery), client.fetchQuery(assetQuery)]);
      const preferred = setup.task_profiles?.[requestedTask]?.provider;
      if (!setup.providers.some(row => row.configured && (!preferred || row.id === preferred))
        || (requestedTask === 'translate' && record.translations.some(row => row.language === language))) return null;
      autoRequested.current = true;
      return requestCandidate(signal, requestedTask);
    }, result => { if (result) showCandidate(result); });
  };
  const generate = () => {
    if (!active) return;
    clear();
    void action.run('generate', requestCandidate, showCandidate);
  };
  const approve = () => {
    if (!candidate) return;
    void action.run('approve', signal => apiSend(path + '/approve', { token: candidate.token, tags: selected, translation }, 'POST', signal), () => {
      clear();
      void source.refetch();
      onSaved();
    });
  };
  const busy = Boolean(action.busy);
  const isVision = task === 'vision';
  const isTimeline = isVision && image === 'timeline';
  const isOfficial = isVision && image === 'official';
  const sourceHelp = isOfficial ? 'officialHelp' : 'timelineHelp';
  const sharing = isOfficial ? 'shareOfficial' : isTimeline ? 'shareTimeline' : isVision ? 'shareImage' : 'shareText';
  const alreadySaved = task === 'translate' && source.data?.translations.some(row => row.language === language);
  const showGenerate = active && (!inline || isVision || Boolean(action.error) || (autoRequested.current && !candidate && !busy && !alreadySaved));
  const content = <>
    {action.busy === 'generate' && (task === 'translate' || inline) ? <Help role="status">
      {t(task === 'translate' ? 'catalog:aiLibrary.translating' : 'catalog:aiLibrary.generating')}
    </Help> : null}
    {source.data?.translations.filter(row => !inline || (task === 'translate' && row.language === language))
      .map(row => <TranslationResult key={row.language} row={row} />)}
    {connections.isLoading || source.isLoading ? <Help role="status">{t('settings:aiLibrary.loading')}</Help> : null}
    {connections.error || source.error ? <ErrorText>{errorMessage(connections.error || source.error)}</ErrorText> : null}
    {connections.data && (inline ? !active && !alreadySaved : !options.length) ? <div className="flex flex-wrap items-center gap-2">
      {inline ? <Help role="status">{t('settings:aiLibrary.taskConnectionMissing')}</Help> : null}
      <ButtonLink variant={inline ? 'primary' : 'secondary'} size="small" href="/settings/ai">{t('catalog:aiLibrary.configure')}</ButtonLink>
    </div> : null}
    {source.data && !inline ? <>
      <Select aria-label={t('catalog:aiLibrary.task')} selectedKey={task} isDisabled={busy}
        onSelectionChange={key => { setTask(key as AssetTask); clear(); }}>
        {AI_ASSET_TASKS.map(name => <SelectItem key={name} id={name}>{t('catalog:aiLibrary.' + name)}</SelectItem>)}
      </Select>
      {taskModel ? <Help>{t('catalog:aiLibrary.modelForTask', {
        model: aiModelLabel(taskModel), effort: t('settings:aiLibrary.effortOptions.' + taskEffort),
      })}</Help> : options.length ? <div><Help>{t('settings:aiLibrary.taskConnectionMissing')}</Help>
        <ButtonLink variant="secondary" size="small" href="/settings/ai">{t('catalog:aiLibrary.configure')}</ButtonLink></div> : null}
    </> : null}
    {source.data ? <>
      {task === 'translate' && !inline ? <Select aria-label={t('catalog:aiLibrary.target')} selectedKey={language} isDisabled={busy}
        onSelectionChange={key => { setLanguage(key as Language); clear(); }}>
        {LANGUAGES.map(name => <SelectItem key={name} id={name}>{t('catalog:aiLibrary.' + name)}</SelectItem>)}
      </Select> : null}
      {isVision && (!inline || active) ? <>
        <Select aria-label={t('catalog:aiLibrary.image')} selectedKey={image} isDisabled={busy}
          onSelectionChange={key => { setImage(String(key)); clear(); }}>
          <SelectItem id="timeline">{t('catalog:aiLibrary.timeline')}</SelectItem>
          {source.data.official_samples ? <SelectItem id="official">{t('catalog:aiLibrary.official')}</SelectItem> : null}
          <SelectItem id="cover">{t('catalog:aiLibrary.cover')}</SelectItem>
          {Array.from({ length: 9 }, (_, cell) => <SelectItem key={cell} id={String(cell)}>
            {t('catalog:aiLibrary.frame', { number: cell + 1 })}
          </SelectItem>)}
        </Select>
        {!isTimeline && !isOfficial ? <img className="max-h-48 w-fit max-w-full rounded-md object-contain" loading="lazy"
          src={image === 'cover' ? cover : '/poster?id=' + id + '&c=' + image}
          alt={t('catalog:aiLibrary.image')} /> :
          <Help><span data-copy-key={'catalog.aiLibrary.' + sourceHelp}>{t('catalog:aiLibrary.' + sourceHelp)}</span></Help>}
      </> : null}
      {active ? <Help><span data-copy-key={'catalog.aiLibrary.' + sharing}>
        {t('catalog:aiLibrary.' + sharing, {
          provider: active.base_url ? `${aiConnectionLabel(active)} · ${active.base_url}` : aiConnectionLabel(active),
        })}
      </span></Help> : null}
      {task === 'translate' && !inline && source.data.source_summary ? <details>
        <summary>{t('catalog:aiLibrary.originalSummary')}</summary>
        <p className="whitespace-pre-wrap">{source.data.source_summary}</p>
      </details> : null}
      {action.error ? <ErrorText>{action.error}</ErrorText> : null}
      {showGenerate ? <div><Button size="small" disabled={busy || Boolean(alreadySaved)} onClick={generate}
        {...busyProps(action.busy === 'generate')}><span data-copy-key="catalog.aiLibrary.generate">
          {t('catalog:aiLibrary.generate')}</span></Button></div> : null}
    </> : null}
    {translation ? <div className="flex min-w-0 flex-col gap-2">
      <Help>{t('catalog:aiLibrary.reviewTranslation')}</Help>
      {candidate?.title ? <Input label={t('catalog:aiLibrary.translatedTitle')} value={translation.title}
        isDisabled={busy} onChange={title => setTranslation({ ...translation, title })} /> : null}
      {candidate?.summary ? <Textarea aria-label={t('catalog:aiLibrary.translatedSummary')} value={translation.summary}
        isDisabled={busy} rows={3} onChange={summary => setTranslation({ ...translation, summary })} /> : null}
    </div> : null}
    {candidate?.coverage ? <TimelineResult coverage={candidate.coverage} poses={candidate.poses || []}
      officialCode={candidate.coverage.source === 'official' ? code : undefined} /> : null}
    {candidate?.tags?.map(row => <div key={row.tag} className="flex min-w-0 flex-col gap-1">
      <Checkbox isDisabled={busy} isSelected={selected.includes(row.tag)}
        onChange={checked => setSelected(before => checked ? [...before, row.tag] : before.filter(tag => tag !== row.tag))}>
        <span>{row.tag}</span><span className="block text-text-secondary">{row.evidence}</span>
      </Checkbox>
      {row.frames ? <div className="flex flex-wrap gap-1 pl-5">
        {row.frames.map(frame => <EvidencePoint key={frame.frame} frame={frame}
          officialCode={candidate.coverage?.source === 'official' ? code : undefined} />)}
      </div> : null}
    </div>)}
    {candidate?.tags?.length === 0 ? <Help role="status">{t('catalog:aiLibrary.noTags')}</Help> : null}
    {candidate && candidate.tags?.length !== 0 ? <div className="flex flex-wrap gap-2">
      <Button size="small" disabled={busy || (candidate.task !== 'translate' && !selected.length)} onClick={approve}
        {...busyProps(action.busy === 'approve')}>{t(translation ? 'catalog:aiLibrary.saveTranslation' : 'catalog:aiLibrary.approve')}</Button>
      <Button size="small" variant="secondary" disabled={busy} onClick={clear}>{t('catalog:aiLibrary.discard')}</Button>
    </div> : null}
  </>;
  if (inline) return <div className="flex w-full min-w-0 flex-col items-end gap-2">
    <Button size="small" variant="secondary" disabled={busy} aria-expanded={open} onClick={openAssistant}>
      {inlineLabel}
    </Button>
    {open ? <section aria-label={inlineLabel} className="flex w-full min-w-0 flex-col gap-2 rounded-xl bg-background-primary-default p-3 wrap-anywhere">
      {content}
    </section> : null}
  </div>;
  return <>
    <button type="button" aria-haspopup="dialog" aria-expanded={open}
      aria-label={t('catalog:aiLibrary.title')} title={t('catalog:aiLibrary.openTranslation')} onClick={openAssistant}>
      <AssistantIcon />
    </button>
    <ModalFrame isOpen={open} onOpenChange={setOpen} width="form" fitVisualViewport>
      <header className="sticky top-0 z-1 flex items-center justify-between gap-3 border-b border-separator-border bg-background-full px-5 py-3">
        <Heading slot="title" className="text-title-2-medium text-text-primary">
          <span data-copy-key="catalog.aiLibrary.title">{t('catalog:aiLibrary.title')}</span>
        </Heading>
        <Button variant="ghost" size="small" iconOnly leadingIcon={RiCloseLine}
          aria-label={t('catalog:shared.close')} onClick={() => setOpen(false)} />
      </header>
      <div className="flex min-w-0 flex-col gap-3 p-5 wrap-anywhere">{content}</div>
    </ModalFrame>
  </>;
}

function EvidencePoint({ frame, officialCode }: { frame: FrameEvidence; officialCode?: string | null }) {
  const [unavailable, setUnavailable] = useState(false);
  if (officialCode) return <ButtonLink size="small" variant="ghost" target="_blank" rel="noopener noreferrer"
    href={'/sample-image?' + new URLSearchParams({ code: officialCode, n: String(frame.frame) })}>
    {t('catalog:aiLibrary.officialNumber', { number: frame.frame })}
  </ButtonLink>;
  if (frame.seconds === null) return <Help>{t('catalog:aiLibrary.frame', { number: frame.frame })}</Help>;
  const seconds = Math.floor(frame.seconds);
  const time = [Math.floor(seconds / 3600), Math.floor(seconds / 60) % 60, seconds % 60]
    .map(value => String(value).padStart(2, '0')).join(':');
  return <div className="min-w-0">
    <Button size="small" variant="ghost" aria-label={t('catalog:aiLibrary.jumpEvidence', { time })}
      onClick={event => {
        const stage = event.currentTarget.closest('[data-stage]')?.querySelector('[data-item-detail]');
        const video = stage?.querySelector<HTMLVideoElement>('[data-stage-media] video');
        if (!video || video.readyState < 1) { setUnavailable(true); return; }
        stage?.querySelector<HTMLButtonElement>('[data-item-picture] [data-jav-preview-toggle]')?.click();
        seekVideoBy(video, frame.seconds! - video.currentTime);
        video.scrollIntoView({ block: 'nearest' });
        setUnavailable(false);
      }}>{time}</Button>
    {unavailable ? <Help role="status">{t('catalog:aiLibrary.evidenceStartPlayer')}</Help> : null}
  </div>;
}

function TimelineResult({ coverage, poses, officialCode }: {
  coverage: TimelineCoverage; poses: NonNullable<Candidate['poses']>; officialCode?: string | null;
}) {
  const source = coverage.source === 'official' ? 'official' : coverage.source === 'snapshot' ? 'snapshot' : 'timeline';
  return <div className="flex flex-col gap-2">
    <Help><span data-copy-key={'catalog.aiLibrary.coverage.' + source}>
      {t('catalog:aiLibrary.coverage.' + source, { ...coverage })}
    </span></Help>
    {coverage.error ? <ErrorText>{t('catalog:aiLibrary.coverage.partial')}</ErrorText> : null}
    {poses.length ? <details>
      <summary className="text-body-medium text-text-primary">
        <span data-copy-key="catalog.aiLibrary.poseObservations">{t('catalog:aiLibrary.poseObservations')}</span>
      </summary>
      <div className="flex flex-col gap-1 pt-1">
        {[...poses].sort((a, b) => a.frame - b.frame).map(row => <div key={row.frame} className="flex flex-wrap items-baseline gap-x-2">
          <EvidencePoint frame={row} officialCode={officialCode} />
          <Help>{[row.posture, row.camera].filter(Boolean).join(' · ')}</Help>
        </div>)}
      </div>
    </details> : null}
  </div>;
}

function TranslationResult({ row }: { row: Partial<Translation> }) {
  return <div className="rounded-md border border-separator-border p-2">
    <p className="text-body-2-regular text-text-secondary">{t(row.quality === 'human' ? 'catalog:aiLibrary.human' : 'catalog:aiLibrary.machine', {
      language: t('catalog:aiLibrary.' + row.language), model: row.model ? aiModelLabel(row.model) : '',
    })}</p>
    {row.title ? <p>{row.title}</p> : null}
    {row.summary ? <p className="whitespace-pre-wrap">{row.summary}</p> : null}
  </div>;
}
