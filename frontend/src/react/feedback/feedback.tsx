import { RiChat3Line, RiCloseLine, RiImageAddLine, RiLoader4Line, RiPencilLine, RiScreenshot2Line } from '@remixicon/react';
import { useEffect, useImperativeHandle, useLayoutEffect, useRef, useState, useSyncExternalStore, type FormEvent, type Ref } from 'react';
import { createPortal, flushSync } from 'react-dom';
import { createRoot } from 'react-dom/client';
import { DropZone } from 'react-aria-components';
import { Button, ButtonLink } from '@/components/base/buttons/button';
import { Checkbox } from '@/components/base/checkbox/checkbox';
import { Input } from '@/components/base/input/input';
import { Radio, RadioGroup } from '@/components/base/radio/radio';
import { Textarea } from '@/components/base/textarea/textarea';
import { ApiError, apiGet, apiSend } from '../../api';
import { appSettingsStore } from '../../appearance/settings';
import { t } from '../../i18n';
import { pageRuntime } from '../client-updates';
import { CollapseRegion } from '../components/collapse-region';
import { ModalFrame } from '../components/modal-frame';
import { overlayHost } from '../components/overlay-host';
import { InterfaceLocale } from '../interface-locale';
import { Providers } from '../providers';
import { PhotoLightbox } from '../photo-lightbox/photo-lightbox-dialog';
import { loadSwiper, type LightboxSlide, type SwiperConstructor } from '../photo-lightbox/photo-lightbox';
import {
  canCaptureFeedbackTab, captureDesktopViewport, captureFeedbackTab, capturePage, desktopCaptureHost, encodeImage, IMAGE_LIMIT,
  prepareImage, warmPageCapture, WrongFeedbackTab,
  type FeedbackImage,
} from './capture';
import { FeedbackImageEditor } from './image-editor';
import './feedback.css';

type Session = {
  tabTitle: string;
  capture?: Promise<FeedbackImage>;
  frame?: Promise<void>;
  formPainted?(shown: boolean): void;
  portal?: Element;
};
type PageCapture = Required<Pick<Session, 'capture' | 'formPainted'>> & Omit<Session, 'capture' | 'formPainted' | 'portal'>;
type Attachment = FeedbackImage & { screenshot?: 'page' | 'tab'; name?: string; publicGithub?: boolean };
type Preview = { index: number; slides: LightboxSlide[]; Swiper: SwiperConstructor; attachments: Attachment[] };
const ISSUE_FIELDS = {
  bug: [
    ['bugDescription', 1300, true],
    ['reproduction', 720, true],
  ],
  feature: [
    ['useCase', 1500, true],
    ['desiredBehavior', 1000, true],
    ['additionalContext', 750, false],
  ],
} as const;
const ENVIRONMENT_FIELDS = [
  ['environmentPeach', 100, true],
  ['environmentSystem', 160, true],
  ['environmentInstall', 100, true],
  ['environmentPython', 32, false],
] as const;
const CATEGORIES = ['bug', 'feature'] as const;
type Category = typeof CATEGORIES[number];
type IssueField = typeof ISSUE_FIELDS[Category][number][0] | typeof ENVIRONMENT_FIELDS[number][0] | 'environmentHealth' | 'logs';
type Publication = { status: 'published'; number: number; images?: 'attached' | 'manual' | 'unconfirmed' }
  | { status: 'unavailable' | 'failed' | 'unconfirmed' };
type FeedbackEnvironment = {
  version: string;
  system: string;
  release: string;
  architecture: string;
  distribution: 'windows-app' | 'macos-app' | 'packaged' | 'docker' | 'wheel' | 'source';
  python?: string;
};
type FeedbackDiagnostics = {
  health: { ready: boolean; checks: Record<string, boolean>; setup?: boolean; background_deferred: boolean };
  logs: string | null;
};
const GITHUB_ISSUES = 'https://github.com/peach-mitao/peach/issues';
const TOP_LAYERS = 'dialog:modal, [data-modal-surface], [data-settings-panel], [role=dialog][aria-modal=true]';
const TITLE_LIMIT = 120;
const IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp'];
const message = (key: string) => t(`shell:feedback.${key}`);
const copy = (key: string) => <span data-copy-key={`feedback.${key}`}>{message(key)}</span>;

function useImageUrl(image: Blob): string {
  const [url, setUrl] = useState('');
  useEffect(() => {
    const next = URL.createObjectURL(image);
    setUrl(next);
    return () => URL.revokeObjectURL(next);
  }, [image]);
  return url;
}

function ImageSize({ image }: { image: FeedbackImage }) {
  return <span className="whitespace-nowrap text-caption-2-regular tabular-nums text-text-secondary">{image.width} × {image.height}</span>;
}

function attachmentLabel(item: Attachment, number: number): string {
  if (item.name) return item.name;
  if (item.screenshot) return message(item.screenshot === 'tab' ? 'tabScreenshot' : 'screenshot');
  return t('shell:feedback.imageNumber', { number });
}

function AttachmentTile({ item, label, disabled, publishGithub, show, remove, selectPublic }: {
  item: Attachment; label: string; disabled: boolean; show(button: HTMLButtonElement): void; remove(): void;
  publishGithub: boolean; selectPublic(selected: boolean): void;
}) {
  const url = useImageUrl(item.blob);
  return <li className="flex w-28 min-w-0 shrink-0 flex-col gap-1" data-feedback-screenshot={item.screenshot}>
    <div className="relative h-14 overflow-hidden rounded-xl">
      <Button type="button" variant="secondary" data-feedback-action="" className="absolute inset-0 h-full w-full"
        aria-label={t('shell:feedback.viewImage', { label })} title={label} onClick={event => show(event.currentTarget)}>
        {url && <img src={url} alt="" className="absolute inset-0 h-full w-full object-contain" />}
      </Button>
      <div className="absolute end-0.5 top-0.5 size-6 overflow-hidden rounded-full">
        <Button type="button" variant="secondary" size="xs" iconOnly leadingIcon={RiCloseLine} data-feedback-action=""
          disabled={disabled} onClick={remove} aria-label={t('shell:feedback.removeImage', { label })} />
      </div>
    </div>
    <span title={label} className="truncate text-center text-caption-2-regular text-text-primary">{label}</span>
    <div className="text-center">
      <ImageSize image={item} />
      <CollapseRegion open={publishGithub}>
        <div className="pt-1">
          <Checkbox size="sm" className="whitespace-nowrap" isDisabled={disabled} isSelected={!!item.publicGithub}
            aria-label={t('shell:feedback.githubPublishImageLabel', { label })} onChange={selectPublic}>
            {copy('githubPublishImage')}
          </Checkbox>
        </div>
      </CollapseRegion>
    </div>
  </li>;
}

function DownloadGithubImage({ image, number }: { image: Attachment; number: number }) {
  const url = useImageUrl(image.blob);
  return <ButtonLink href={url} download={`feedback-${number}.${image.blob.type === 'image/png' ? 'png' : 'jpg'}`}
    variant="secondary" data-feedback-action="" size="small">
    {t('shell:feedback.githubDownloadImage', { number })}
  </ButtonLink>;
}

function FeedbackDialog({ session, open, close, exited, startTab }: {
  session: Session; open: boolean; close(): void; exited(): void; startTab: Ref<() => void>;
}) {
  const [title, setTitle] = useState('');
  const [fields, setFields] = useState<Partial<Record<IssueField, string>>>({});
  const [environment, setEnvironment] = useState<Partial<Record<IssueField, string>>>(() => ({
    environmentPeach: pageRuntime()?.version,
  }));
  const [environmentStatus, setEnvironmentStatus] = useState<'loading' | 'ready' | 'failed'>('loading');
  const [category, setCategory] = useState<Category>('bug');
  const [diagnostics, setDiagnostics] = useState<FeedbackDiagnostics | null>();
  const [includeDiagnostics, setIncludeDiagnostics] = useState(true);
  const [publishDiagnostics, setPublishDiagnostics] = useState(false);
  const [publishGithub, setPublishGithub] = useState(false);
  const [github, setGithub] = useState<Publication>();
  const [githubFiles, setGithubFiles] = useState<Attachment[]>([]);
  const [images, setImages] = useState<Attachment[]>([]);
  const [capture, setCapture] = useState<'pending' | 'ready' | 'failed'>(session.capture ? 'pending' : 'ready');
  const [awaitingFrame, setAwaitingFrame] = useState(!!session.frame);
  const [adding, setAdding] = useState(false);
  const [capturingTab, setCapturingTab] = useState<'permission' | 'frame'>();
  const [readingTabFrame, setReadingTabFrame] = useState(false);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [imageError, setImageError] = useState('');
  const [submitError, setSubmitError] = useState('');
  const [preview, setPreview] = useState<Preview>();
  const [editing, setEditing] = useState<{ item: Attachment; label: string }>();
  const [editorOpen, setEditorOpen] = useState(false);
  const [editorSaving, setEditorSaving] = useState(false);
  const picker = useRef<HTMLInputElement>(null);
  const processingImages = useRef(false);
  const form = useRef<HTMLFormElement>(null);
  const previewPending = useRef(false);
  const imageTrigger = useRef<HTMLButtonElement>(null);
  const captureSkipped = useRef(false);
  const tabAttempt = useRef<AbortController | null>(null);
  useEffect(() => () => tabAttempt.current?.abort(), []);

  useEffect(() => {
    const load = new AbortController();
    void apiGet<FeedbackEnvironment>('/api/app-feedback/environment', load.signal).then(facts => {
      if (!facts?.version || !facts.system || !facts.distribution) throw new Error('Missing environment facts');
      if (!facts.release || !facts.architecture) throw new Error('Missing operating system version or architecture');
      const system = facts.release.includes(facts.system) ? facts.release : `${facts.system} ${facts.release}`;
      if (load.signal.aborted) return;
      setEnvironment({
        environmentPeach: facts.version,
        environmentSystem: `${system} · ${facts.architecture}`,
        environmentInstall: t(`shell:feedback.distribution.${facts.distribution}`),
        environmentPython: facts.python,
      });
      setEnvironmentStatus('ready');
    }).catch(() => {
      if (!load.signal.aborted) setEnvironmentStatus('failed');
    });
    return () => load.abort();
  }, []);

  useEffect(() => {
    if (category !== 'bug' || diagnostics !== undefined) return;
    const load = new AbortController();
    void apiGet<FeedbackDiagnostics>('/api/app-feedback/diagnostics', load.signal).then(snapshot => {
      if (!load.signal.aborted) setDiagnostics(snapshot);
    }).catch(() => {
      if (!load.signal.aborted) setDiagnostics(null);
    });
    return () => load.abort();
  }, [category, diagnostics]);

  useEffect(() => {
    void session.frame?.then(() => setAwaitingFrame(false));
  }, [session.frame]);

  useEffect(() => {
    if (!open || awaitingFrame || !session.formPainted) return;
    let frame: number;
    let afterPaint: number;
    function waitForForm() {
      const surface = form.current?.closest('[data-feedback-surface]');
      if (!surface || Number(getComputedStyle(surface).opacity) < .1) {
        frame = window.requestAnimationFrame(waitForForm);
        return;
      }
      afterPaint = window.setTimeout(() => session.formPainted?.(true), 0);
    }
    frame = window.requestAnimationFrame(waitForForm);
    return () => {
      window.cancelAnimationFrame(frame);
      window.clearTimeout(afterPaint);
    };
  }, [session, open, awaitingFrame]);

  useEffect(() => {
    const nativeLayer = session.portal?.closest('dialog:modal');
    if (!nativeLayer) return;
    const protectParent = (event: Event) => {
      if (event.target !== nativeLayer) return;
      event.preventDefault();
      event.stopImmediatePropagation();
    };
    nativeLayer.addEventListener('cancel', protectParent, true);
    return () => nativeLayer.removeEventListener('cancel', protectParent, true);
  }, [session.portal]);

  useEffect(() => {
    if (!session.capture) return;
    let waiting = true;
    const finish = (image?: FeedbackImage) => {
      if (!waiting || captureSkipped.current) return;
      waiting = false;
      if (image) setImages(current => [{ ...image, screenshot: 'page', name: session.tabTitle }, ...current]);
      setCapture(image ? 'ready' : 'failed');
    };
    const deadline = window.setTimeout(finish, 25000);
    void session.capture.then(finish, () => finish()).finally(() => window.clearTimeout(deadline));
    return () => { waiting = false; window.clearTimeout(deadline) };
  }, [session]);
  useEffect(() => () => preview?.slides.forEach(({ src }) => URL.revokeObjectURL(src)), [preview]);

  const prefilled = {
    ...environment,
    environmentHealth: diagnostics ? JSON.stringify(diagnostics.health, null, 2) : undefined,
    logs: diagnostics?.logs,
  };
  const fieldValue = (field: IssueField) => fields[field] ?? prefilled[field] ?? '';
  const updateField = (field: IssueField, value: string) => setFields(current => ({ ...current, [field]: value }));
  const requiredFields = category === 'bug' ? [...ISSUE_FIELDS.bug, ...ENVIRONMENT_FIELDS] : ISSUE_FIELDS.feature;
  const formReady = title.trim() !== '' && requiredFields.every(([field, , required]) => !required || fieldValue(field).trim() !== '');
  const remaining = IMAGE_LIMIT - images.length - Number(capture === 'pending' || (!!capturingTab && !images.some(item => item.screenshot)));
  const labels = images.map((item, index) => attachmentLabel(item, index + 1 - Number(Boolean(images[0].screenshot))));
  const offerTabCapture = !session.capture;
  const roomForTab = images.length < IMAGE_LIMIT || images.some(item => item.screenshot);

  function closeForm() {
    tabAttempt.current?.abort();
    close();
  }

  async function replaceWithTab(button?: HTMLButtonElement) {
    if (tabAttempt.current || processingImages.current || sending || !roomForTab) return;
    setImageError('');
    setCapturingTab('permission');
    const attempt = new AbortController();
    const tabTitle = button ? document.title.trim() : session.tabTitle;
    tabAttempt.current = attempt;
    try {
      const image = await captureFeedbackTab(
        attempt.signal,
        () => setCapturingTab('frame'),
        onlyPage => flushSync(() => setReadingTabFrame(onlyPage)),
      );
      if (attempt.signal.aborted) return;
      captureSkipped.current = true;
      setImages(current => [{ ...image, screenshot: 'tab', name: tabTitle }, ...current.filter(item => !item.screenshot)]);
      setCapture('ready');
    } catch (error) {
      if (attempt.signal.aborted) return;
      setImageError(error instanceof WrongFeedbackTab ? 'tabCaptureWrongTab'
        : error instanceof DOMException && error.name === 'NotAllowedError' ? 'tabCaptureCancelled' : 'tabCaptureFailed');
    } finally {
      if (tabAttempt.current === attempt) tabAttempt.current = null;
      if (!attempt.signal.aborted) {
        setCapturingTab(undefined);
        if (button) window.requestAnimationFrame(() => button.focus({ preventScroll: true }));
      }
    }
  }
  useImperativeHandle(startTab, () => () => { void replaceWithTab() });

  function focusImage() {
    window.requestAnimationFrame(() => imageTrigger.current?.focus({ preventScroll: true }));
  }
  async function showImage(index: number, button: HTMLButtonElement) {
    if (previewPending.current) return;
    previewPending.current = true;
    setImageError('');
    try {
      const Swiper = await loadSwiper();
      if (!form.current) return;
      imageTrigger.current = button;
      const slides = images.map(({ blob }, at) => {
        const src = URL.createObjectURL(blob);
        return { src, thumb: src, name: labels[at], source: message('trigger'), size: blob.size };
      });
      setPreview({ index, slides, Swiper, attachments: images });
    } catch {
      setImageError('previewFailed');
    } finally {
      previewPending.current = false;
    }
  }

  async function add(files: File[] | Promise<File[]>) {
    if (processingImages.current || sending || sent) return;
    if (remaining <= 0) {
      setImageError('imageLimit');
      return;
    }
    processingImages.current = true;
    setAdding(true);
    setImageError('');
    try {
      const images = await files;
      const withinLimit = images.slice(0, remaining);
      const results = await Promise.allSettled(withinLimit.map(prepareImage));
      const attachments = results.flatMap((result, index) =>
        result.status === 'fulfilled' ? [{ ...result.value, name: withinLimit[index].name }] : []);
      setImages(current => [...current, ...attachments]);
      if (attachments.length < results.length) setImageError('imageFailed');
      else if (images.length > remaining) setImageError('imageLimit');
    } catch {
      setImageError('imageFailed');
    } finally {
      processingImages.current = false;
      setAdding(false);
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!formReady || sending || processingImages.current || tabAttempt.current || editing || capture === 'pending') return;
    const issueTitle = title.trim();
    const keys: IssueField[] = ISSUE_FIELDS[category].map(([key]) => key);
    if (category === 'bug') keys.push(...ENVIRONMENT_FIELDS.map(([key]) => key));
    const issueFields = Object.fromEntries(keys.map(key => [key, fieldValue(key).trim()]));
    const diagnosticFields = category === 'bug' && includeDiagnostics
      ? { environmentHealth: fieldValue('environmentHealth').trim(), logs: fieldValue('logs').trim() }
      : undefined;
    const privateDiagnostics = publishGithub && !publishDiagnostics ? diagnosticFields : undefined;
    setSending(true);
    setSubmitError('');
    try {
      const githubImages = publishGithub ? images.flatMap((image, index) => image.publicGithub ? [index] : []) : [];
      const payload = { title: issueTitle, fields: { ...issueFields, ...(privateDiagnostics ? undefined : diagnosticFields) },
        category, publishGithub, githubImages, privateDiagnostics,
        images: await Promise.all(images.map(item => encodeImage(item.blob))) };
      const receipt = await apiSend<{ id?: string; github?: Publication }>('/api/app-feedback', payload);
      if (!receipt?.id) throw new Error();
      if (publishGithub) {
        const issue = receipt.github ?? { status: 'unconfirmed' };
        setGithub(issue);
        if (issue.status === 'published' && issue.images !== 'attached') {
          setGithubFiles(githubImages.map(index => images[index]));
        }
      }
      setSent(true);
      setImages([]);
    } catch (error) {
      setSubmitError(error instanceof ApiError
        ? error.status === 401 ? message('signIn') : error.message
        : message('sendFailed'));
    } finally {
      setSending(false);
    }
  }

  return <ModalFrame isOpen={open} onOpenChange={next => {
    if (!next && !sending && !capturingTab && !preview && !editing) closeForm();
  }} onExited={exited} width="form" label={message('title')}
  portalContainer={session.portal}
  surfaceClassName="peach-react" surfaceData={{
    'data-feedback-surface': '',
    'data-feedback-awaiting-frame': awaitingFrame ? '' : undefined,
    'data-feedback-tab-busy': capturingTab ? '' : undefined,
    'data-feedback-capturing-tab': readingTabFrame ? '' : undefined,
  }}
  fitVisualViewport>
    <form ref={form} data-peach-feedback=""
        className="flex flex-col gap-4 p-5 sm:p-6" onSubmit={event => { void submit(event) }}
        onPaste={event => {
          if (event.defaultPrevented || sent || sending) return;
          const files = Array.from(event.clipboardData.files).filter(file => IMAGE_TYPES.includes(file.type));
          if (!files.length) return;
          event.preventDefault();
          void add(files);
        }}>
      <header className="flex items-center justify-between gap-3">
        <h2 className="text-title-2-medium text-text-primary">{copy('title')}</h2>
        <Button type="button" variant="ghost" iconOnly leadingIcon={RiCloseLine} onClick={closeForm}
          disabled={sending} aria-label={message('close')} />
      </header>
      {sent ? <div className="flex flex-col gap-3">
        <p role="status" className="text-body-regular text-text-primary">{copy('sent')}</p>
        {github && github.status !== 'published' && <p role="status" className="text-caption-1-regular text-text-secondary">
          {copy(github.status === 'unconfirmed' ? 'githubUnconfirmed'
            : github.status === 'unavailable' ? 'githubUnavailable' : 'githubFailed')}
        </p>}
        {github?.status === 'published' && <div className="flex flex-wrap items-center gap-2">
          <ButtonLink href={`${GITHUB_ISSUES}/${github.number}`} target="_blank" rel="noopener noreferrer"
            variant="secondary" data-feedback-action="" size="small">{copy('githubView')}</ButtonLink>
        </div>}
        {github?.status === 'published' && github.images === 'attached' && <p role="status" className="text-caption-1-regular text-text-secondary">
          {copy('githubImagesAttached')}
        </p>}
        {githubFiles.length > 0 && <div className="flex flex-col gap-2">
          <p className="text-caption-1-regular text-text-secondary">
            {copy(github?.status === 'published' && github.images === 'unconfirmed' ? 'githubCheckImages' : 'githubAddImagesManually')}
          </p>
          <div className="flex flex-wrap gap-2">
            {githubFiles.map((image, index) => <DownloadGithubImage key={index} image={image} number={index + 1} />)}
          </div>
        </div>}
      </div> : <>
        <RadioGroup aria-label={message('category')} value={category} onChange={value => setCategory(value === 'feature' ? 'feature' : 'bug')}
          isDisabled={sending} orientation="horizontal">
          <div className="flex flex-wrap gap-x-4 gap-y-2">
            {CATEGORIES.map(value => <Radio key={value} value={value} size="sm">{copy(value)}</Radio>)}
          </div>
        </RadioGroup>
        <Input label={copy('issueTitle')} placeholder={message('issueTitlePlaceholder')} maxLength={TITLE_LIMIT}
          value={title} onChange={setTitle} isDisabled={sending} isRequired />
        {ISSUE_FIELDS[category].map(([field, limit, required], index) => <Textarea key={field} label={copy(field)}
          placeholder={message(`${field}Placeholder`)} rows={index === 0 ? 3 : 2}
          resize="none" maxLength={limit} value={fieldValue(field)}
          isDisabled={sending} isRequired={required} onChange={value => updateField(field, value)} />)}
        {category === 'bug' && <>
          <fieldset className="flex min-w-0 flex-col gap-2">
            <legend className="mb-2 text-body-medium text-text-primary">{copy('environment')}</legend>
            <div data-feedback-environment="" className="min-w-0 gap-2">
              {ENVIRONMENT_FIELDS.map(([field, limit, required]) => <Input key={field} label={copy(field)}
                maxLength={limit} value={fieldValue(field)} isDisabled={sending} isRequired={required}
                onChange={value => updateField(field, value)} />)}
            </div>
            {environmentStatus !== 'ready' && <p role="status" className="text-caption-1-regular text-text-secondary">
              {copy(environmentStatus === 'loading' ? 'environmentLoading' : 'environmentUnavailable')}
            </p>}
          </fieldset>
          <fieldset className="flex min-w-0 flex-col gap-2">
            <legend className="mb-2 text-body-medium text-text-primary">{copy('diagnostics')}</legend>
            <Checkbox isSelected={includeDiagnostics} onChange={setIncludeDiagnostics} isDisabled={sending}>
              {copy('includeDiagnostics')}
            </Checkbox>
            <Textarea label={copy('environmentHealth')} rows={2} autoResize maxRows={5} resize="none" maxLength={500}
              isDisabled={sending} value={fieldValue('environmentHealth')}
              hint={diagnostics === undefined ? <span role="status">{copy('diagnosticsLoading')}</span> :
                diagnostics === null ? <span role="status">{copy('diagnosticsUnavailable')}</span> : undefined}
              onChange={value => updateField('environmentHealth', value)} />
            <Textarea label={copy('logs')} placeholder={message('logsPlaceholder')} rows={2} autoResize maxRows={3} resize="none" maxLength={550}
              hint={diagnostics && !diagnostics.logs ? <span role="status">{copy(diagnostics.logs === null
                ? 'diagnosticsLogsUnavailable' : 'diagnosticsNoErrors')}</span> : undefined}
              isDisabled={sending} value={fieldValue('logs')} onChange={value => updateField('logs', value)} />
          </fieldset>
        </>}
        <div>
          <div className="flex flex-col gap-1">
            <Checkbox isSelected={publishGithub} onChange={setPublishGithub} isDisabled={sending}
              aria-describedby="feedback-github-public">{copy('githubPublish')}</Checkbox>
            <p id="feedback-github-public" className="text-caption-1-regular text-text-secondary">{copy('githubPublic')}</p>
          </div>
          <CollapseRegion open={publishGithub && category === 'bug' && includeDiagnostics}>
            <div className="pt-1">
              <Checkbox isSelected={publishDiagnostics} onChange={setPublishDiagnostics} isDisabled={sending}>
                {copy('diagnosticsPublic')}
              </Checkbox>
            </div>
          </CollapseRegion>
        </div>
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-body-medium text-text-primary">{copy('images')}</span>
            <div className="ms-auto flex flex-wrap justify-end gap-2">
              {offerTabCapture && <Button type="button" variant="secondary" data-feedback-action="" size="small" leadingIcon={RiScreenshot2Line}
                disabled={!roomForTab || adding || sending} aria-disabled={!!capturingTab} aria-busy={!!capturingTab}
                onClick={event => { void replaceWithTab(event.currentTarget) }}>{copy('captureTab')}</Button>}
            </div>
          </div>
          {images.length > 0 && <ul className="m-0 flex list-none flex-wrap gap-x-2 gap-y-3 p-0" aria-label={message('images')}>
            {images.map((item, index) => <AttachmentTile key={item.screenshot ? 'screenshot' : index} item={item}
              label={labels[index]} disabled={sending} publishGithub={publishGithub}
              show={button => { void showImage(index, button) }}
              selectPublic={selected => setImages(current =>
                current.map(candidate => candidate === item ? { ...item, publicGithub: selected } : candidate)
              )}
              remove={() => setImages(current => current.filter(candidate => candidate !== item))} />)}
          </ul>}
          {remaining > 0 && <DropZone aria-label={message('pasteImages')} isDisabled={adding || sending}
            className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-xl border border-dashed border-border-button-default px-3 py-2 data-[drop-target]:border-border-focus-ring data-[focus-visible]:border-border-focus-ring"
            getDropOperation={(types, allowed) => IMAGE_TYPES.some(type => types.has(type)) && allowed.includes('copy') ? 'copy' : 'cancel'}
            onDrop={event => {
              if (processingImages.current || sending) return;
              const files = event.items.flatMap(item => item.kind === 'file' && IMAGE_TYPES.includes(item.type) ? [item] : []);
              if (files.length > 0) void add(Promise.all(files.map(item => item.getFile())));
            }}>
            <input ref={picker} type="file" accept={IMAGE_TYPES.join(',')} multiple hidden onChange={event => {
              const files = Array.from(event.currentTarget.files ?? []);
              event.currentTarget.value = '';
              if (files.length > 0) void add(files);
            }} />
            <Button type="button" variant="secondary" data-feedback-action="" size="small" leadingIcon={RiImageAddLine}
              disabled={adding || sending} onClick={() => picker.current?.click()}>{copy('addImages')}</Button>
            <span className="text-caption-1-regular text-text-secondary">{copy('pasteImages')}</span>
          </DropZone>}
          {capture !== 'ready' && <div className="flex flex-wrap items-center justify-between gap-1">
            <p role="status" className="text-caption-1-regular text-text-secondary">
              {copy(capture === 'pending' ? 'capturing' : 'captureFailed')}
            </p>
            {capture === 'pending' && <Button type="button" variant="ghost" size="xs" onClick={() => {
              captureSkipped.current = true;
              setCapture('ready');
            }}>{copy('skipCapture')}</Button>}
          </div>}
          {capturingTab && <p role="status" className="flex items-center gap-2 text-caption-1-regular text-text-secondary">
            <RiLoader4Line aria-hidden className="size-4 motion-safe:animate-spin" />
            {copy(capturingTab === 'permission' ? 'tabWaitingPermission' : 'tabCapturing')}
          </p>}
          {imageError && <p role="status" className="text-caption-1-regular text-text-secondary">{copy(imageError)}</p>}
          {images.length > 0 && <div>
            <p className="text-caption-1-regular text-text-secondary">{copy('imagePrivacy')}</p>
            <CollapseRegion open={publishGithub && images.some(image => image.publicGithub)}>
              <p className="pt-2 text-caption-1-regular text-text-secondary">{copy('githubPublicMedia')}</p>
            </CollapseRegion>
          </div>}
        </div>
        {submitError && <p role="alert" className="text-body-regular text-text-error-primary">{submitError}</p>}
        <footer className="flex flex-wrap justify-end gap-2">
          <Button type="button" variant="secondary" data-feedback-action="" disabled={sending} onClick={closeForm}>{copy('cancel')}</Button>
          <Button type="submit" disabled={!formReady || adding || !!capturingTab || capture === 'pending'} aria-disabled={sending} aria-busy={sending}>
            {copy(sending ? 'sending' : 'send')}
          </Button>
        </footer>
      </>}
    </form>
    {preview && <PhotoLightbox slides={preview.slides} index={preview.index} Swiper={preview.Swiper}
      onClose={restoreFocus => {
        setPreview(undefined);
        if (restoreFocus) focusImage();
      }} devicePixels imageAction={(index, dismiss) =>
        <Button type="button" size="small" variant="secondary" data-feedback-action="" leadingIcon={RiPencilLine} disabled={sending}
          onClick={() => dismiss(() => {
            setEditing({ item: preview.attachments[index], label: preview.slides[index].name ?? message('images') });
            setEditorOpen(true);
          })}>{copy('editor.title')}</Button>} />}
    {editing && <ModalFrame isOpen={editorOpen} onOpenChange={next => {
      if (!editorSaving) setEditorOpen(next);
    }} onExited={() => {
      setEditing(undefined);
      focusImage();
    }}
      width="cover-crop" label={message('editor.title')} portalContainer={session.portal}
      surfaceClassName="peach-react" surfaceData={{ 'data-feedback-surface': '' }} fitVisualViewport>
      <FeedbackImageEditor item={editing.item} label={editing.label} saving={editorSaving} onSavingChange={setEditorSaving}
        onCancel={() => setEditorOpen(false)}
        onSave={result => {
          setImages(current => current.map(item => item.blob === editing.item.blob ? { ...item, ...result, publicGithub: false } : item));
          setEditorOpen(false);
        }} />
    </ModalFrame>}
  </ModalFrame>;
}

function startCapture(desktop = desktopCaptureHost()): PageCapture {
  const tabTitle = document.title.trim();
  let frameReady!: () => void;
  const frame = desktop && new Promise<void>(resolve => { frameReady = resolve });
  let formPainted!: (shown: boolean) => void;
  const shown = new Promise<boolean>(resolve => { formPainted = resolve });
  async function captureInBrowser() {
    if (!await shown) throw new Error('Feedback closed');
    return capturePage();
  }
  const capture = desktop ? captureDesktopViewport(desktop, frameReady, shown).catch(() => {
    frameReady();
    return captureInBrowser();
  }) : captureInBrowser();
  return { capture, frame, formPainted, tabTitle };
}

function Feedback() {
  const settings = appSettingsStore();
  const enabled = useSyncExternalStore(settings.subscribe, () => settings.value.showFeedbackButton);
  const [target, setTarget] = useState<Element>(document.body);
  const [session, setSession] = useState<Session>();
  const launcherLayer = useRef<HTMLDivElement>(null);
  const launcher = useRef<HTMLButtonElement>(null);
  const prepared = useRef<{ session: PageCapture; timer: number } | undefined>(undefined);
  const startTab = useRef<() => void>(null);
  const [open, setOpen] = useState(false);
  useLayoutEffect(() => {
    const layer = launcherLayer.current;
    if (!layer || session || !layer.isConnected) return;
    // The launcher stays in the active dialog's focus scope and escapes its clipped scroll surface.
    layer.showPopover?.();
    return () => { if (layer.matches(':popover-open')) layer.hidePopover(); };
  }, [enabled, session, target]);
  useEffect(() => {
    let frame = 0;
    const update = () => {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(() => {
        const fullscreen = document.fullscreenElement;
        const layers = [...(fullscreen ?? document).querySelectorAll(TOP_LAYERS)].reverse().filter(element =>
          !element.closest('[data-feedback-surface], [hidden], [inert]') && element.getClientRects().length);
        const native = layers.find(element => element.matches('dialog:modal'));
        setTarget(layers.find(element => !native || native.contains(element)) ?? fullscreen ?? document.body);
      });
    };
    const observer = new MutationObserver(update);
    observer.observe(document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ['open', 'hidden', 'aria-modal'] });
    document.addEventListener('fullscreenchange', update);
    update();
    return () => {
      observer.disconnect();
      document.removeEventListener('fullscreenchange', update);
      window.cancelAnimationFrame(frame);
    };
  }, []);
  function discardPrepared() {
    const job = prepared.current;
    if (!job) return;
    prepared.current = undefined;
    window.clearTimeout(job.timer);
    job.session.formPainted(false);
  }
  const begin = (pointer: boolean) => {
    if (session) return;
    const inTopLayer = target.closest('dialog:modal, :fullscreen');
    const portal = inTopLayer?.isConnected ? overlayHost(inTopLayer) : undefined;
    if (!desktopCaptureHost() && canCaptureFeedbackTab()) {
      // The picker requires the launcher's user gesture, before leaving this handler.
      flushSync(() => {
        setSession({ tabTitle: document.title.trim(), portal });
        setOpen(true);
      });
      startTab.current?.();
      return;
    }
    const capture = prepared.current;
    prepared.current = undefined;
    window.clearTimeout(capture?.timer);
    if (!pointer) capture?.session.formPainted(false);
    const job = (pointer && capture?.session) || startCapture();
    setSession({ ...job, portal });
    setOpen(true);
  };
  return <>
    {enabled && createPortal(<div ref={launcherLayer} popover="manual" hidden={!!session}
      data-feedback-corner={target.closest('[data-photo-lightbox], :fullscreen, .peach-guide-popover') ? 'top' : 'bottom'}
      data-peach-feedback="" data-feedback-launcher="" className="peach-react">
      <Button ref={launcher} type="button" variant="secondary" data-feedback-action="" size="small" leadingIcon={RiChat3Line}
        onClick={event => begin(event.detail > 0)} onPointerEnter={warmPageCapture} onFocus={warmPageCapture}
        onPointerDown={event => {
          if (event.button !== 0 || !event.isPrimary || session) return;
          const desktop = desktopCaptureHost();
          if (!desktop) return;
          discardPrepared();
          const job = startCapture(desktop);
          void job.capture.catch(() => {});
          prepared.current = { session: job, timer: window.setTimeout(discardPrepared, 450) };
        }} onPointerCancel={discardPrepared} onPointerLeave={discardPrepared}
        aria-disabled={!!session} aria-haspopup="dialog">{copy('trigger')}</Button>
    </div>, target)}
    {session && <FeedbackDialog session={session} open={open} startTab={startTab} close={() => {
      session.formPainted?.(false);
      setOpen(false);
    }} exited={() => {
      setSession(undefined);
      window.requestAnimationFrame(() => launcher.current?.focus());
    }} />}
  </>;
}

export function mountFeedback(): void {
  const host = document.createElement('div');
  host.dataset.peachFeedback = '';
  document.body.append(host);
  createRoot(host).render(<Providers><InterfaceLocale><Feedback /></InterfaceLocale></Providers>);
}
