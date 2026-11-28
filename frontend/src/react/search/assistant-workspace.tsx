import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { Heading } from 'react-aria-components';
import { RiArrowLeftLine, RiArrowUpLine, RiCloseLine, RiExpandLeftRightLine, RiSettings3Line, RiStopFill } from '@remixicon/react';
import { Button, ButtonLink } from '@/components/base/buttons/button';
import { IconButton } from '@/components/base/buttons/icon-button';
import { ComposerLoader } from '@/components/application/composer-loader/composer-loader';
import { cx } from '@/utils/cx';
import { t } from '../../i18n';
import { ModalFrame } from '../components/modal-frame';
import { useOverlayScrollbar } from '../components/overlay-scrollbar';
import { AssistantMascot } from './assistant-mascot';
import { AssistantSuggestInput } from './assistant-suggest';
import './assistant-boardui-motion.css';

export const assistantCopy = (key: string) => t('catalog:libraryAssistant.' + key);
export function AssistantWorkspace({ focusKey, resultKey, active, compose, history, children, onBack }: {
  focusKey: string; resultKey: string; active: boolean; compose: ReactNode;
  history(close?: () => void): ReactNode; children: ReactNode;
  onBack?(): void;
}) {
  const scroll = useOverlayScrollbar<HTMLDivElement>();
  const rail = useOverlayScrollbar<HTMLElement>();
  const workspace = useRef<HTMLDivElement>(null);
  const historyTrigger = useRef<HTMLButtonElement>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  useLayoutEffect(() => {
    const panel = workspace.current;
    if (!panel) return;
    const measure = () => {
      panel.style.setProperty('--ai-workspace-top', `${Math.max(0, panel.getBoundingClientRect().top + window.scrollY)}px`);
    };
    measure();
    window.addEventListener('resize', measure);
    const observer = new ResizeObserver(measure);
    for (const element of document.querySelectorAll('.top, [data-network-banner]')) observer.observe(element);
    return () => { window.removeEventListener('resize', measure); observer.disconnect(); };
  }, []);
  useEffect(() => {
    if (!historyOpen || !workspace.current) return;
    const observer = new ResizeObserver(() => {
      if (!historyTrigger.current?.getClientRects().length) setHistoryOpen(false);
    });
    observer.observe(workspace.current);
    return () => observer.disconnect();
  }, [historyOpen]);
  useEffect(() => {
    const panel = scroll.current;
    const current = panel?.querySelector('[data-ai-search-current]');
    if (panel) panel.scrollTop = current ? current.getBoundingClientRect().top - panel.getBoundingClientRect().top + panel.scrollTop - 12 : 0;
  }, [focusKey, scroll]);
  useEffect(() => {
    const panel = scroll.current;
    const source = resultKey.split(',').at(-1);
    const results = source === 'library' || source === 'external' ? panel?.querySelector(`[data-ai-search-source="${source}"]`) : null;
    if (resultKey && panel && results) {
      panel.scrollTop += results.getBoundingClientRect().top - panel.getBoundingClientRect().top - 12;
    }
  }, [resultKey, scroll]);

  return <div ref={workspace} className="@container w-full min-w-0" data-ai-search-workspace="">
    <div data-ai-search-layout="">
      <section data-ai-search-pane="" className="rounded-3xl">
        <header className="flex min-h-14 min-w-0 shrink-0 items-center justify-between gap-3 px-4 py-2.5 sm:px-5">
          <div className="flex min-w-0 items-center gap-2">
            {onBack ? <IconButton icon={RiArrowLeftLine} size="small" data-ai-button="round"
              aria-label={assistantCopy('backToAssistant')} title={assistantCopy('backToAssistant')} onClick={onBack} /> : null}
            <h1 className="text-headline-medium text-text-primary" data-copy-key="catalog.libraryAssistant.title">{assistantCopy('title')}</h1>
          </div>
          <Button ref={historyTrigger} size="small" variant="secondary" iconOnly leadingIcon={RiExpandLeftRightLine}
            data-ai-button="round" className="@min-[52rem]:hidden" aria-haspopup="dialog" aria-expanded={historyOpen}
            aria-label={assistantCopy('openHistory')} title={assistantCopy('openHistory')} onClick={() => setHistoryOpen(true)} />
        </header>
        <div ref={scroll} data-ai-search-scroll="" data-ai-search-transcript="">
          <div data-ai-search-content="" className={cx('flex flex-col gap-4 py-4',
            !active && 'min-h-full justify-center')}>
            {children}
          </div>
        </div>
        {compose ? <div data-ai-search-content="" data-ai-search-compose="">{compose}</div> : null}
      </section>
      <aside ref={rail} aria-label={assistantCopy('history')} data-ai-search-rail="" className="rounded-3xl">
        {history()}
      </aside>
    </div>
    <ModalFrame width="form" side="right" isOpen={historyOpen} onOpenChange={setHistoryOpen} fitVisualViewport>
      <div className="flex items-center justify-between gap-3 px-4 pt-4">
        <Heading slot="title" className="text-title-2-medium text-text-primary">{assistantCopy('history')}</Heading>
        <Button size="small" variant="ghost" iconOnly leadingIcon={RiCloseLine} aria-label={t('catalog:shared.close')}
          onClick={() => setHistoryOpen(false)} />
      </div>
      <div className="min-w-0 p-4">{history(() => setHistoryOpen(false))}</div>
    </ModalFrame>
  </div>;
}

export function SearchComposer({ query, setQuery, busy, stop, submit, conditions, model, status, loading, canSubmit, fixedTask, demo = false }: {
  query: string; setQuery(value: string): void; busy: boolean; stop(): void; submit(): void; demo?: boolean;
  loading: boolean;
  fixedTask?: string;
  canSubmit: boolean; conditions: ReactNode; model: ReactNode; status: ReactNode;
}) {
  const sendLabel = assistantCopy(fixedTask ? 'steps.fixedTask' : 'sendSearch');
  return <div className="flex min-w-0 flex-col gap-1.5">
    <div data-ai-search-composer-motion={loading ? 'active' : 'idle'}>
      <ComposerLoader active={loading}>
        <form aria-busy={loading} data-ai-search-composer="" className="flex min-w-0 items-center gap-2 rounded-full border border-transparent focus-within:border-border-focus-ring"
          onSubmit={event => { event.preventDefault(); if (!busy && !demo && canSubmit) submit(); }}>
          {conditions}
          <AssistantSuggestInput label={assistantCopy(fixedTask ? 'fixedTaskInput' : 'prompt')}
            placeholder={assistantCopy(fixedTask ? 'fixedTaskInput' : 'prompt')}
            value={query} onChange={setQuery} disabled={busy || demo} composer suggestions={!fixedTask} />
          {model}
          {busy || loading
            ? <Button type="button" iconOnly variant="secondary" leadingIcon={RiStopFill} data-ai-composer-send="" data-ai-composer-stop=""
              className="shrink-0" aria-label={assistantCopy('stop')} title={assistantCopy('stop')} onClick={stop} />
            : <Button type="submit" iconOnly leadingIcon={RiArrowUpLine} data-ai-composer-send="" disabled={demo || !canSubmit}
                className="shrink-0" aria-label={sendLabel} title={sendLabel} />}
        </form>
      </ComposerLoader>
    </div>
    <AssistantFooter>{status}</AssistantFooter>
  </div>;
}

export function AssistantFooter({ children }: { children: ReactNode }) {
  return <footer className="flex min-w-0 flex-wrap items-center justify-between gap-x-3 gap-y-1 px-2">{children}</footer>;
}

export function ConfigureAIButton() {
  return <ButtonLink href="/settings/ai" variant="primary" size="small" leadingIcon={RiSettings3Line}>
    <span data-copy-key="catalog.aiLibrary.configure">{t('catalog:aiLibrary.configure')}</span>
  </ButtonLink>;
}

export function SearchWelcome({ demoCases, setupAction }: {
  demoCases: ReactNode; setupAction: ReactNode;
}) {
  return <div className="flex min-w-0 flex-col items-center gap-4 text-center">
    <AssistantMascot label={assistantCopy('playMascot')} />
    <div className="flex min-w-0 flex-col gap-1.5">
      <h2 className="text-title-1-medium text-text-primary" data-copy-key="catalog.libraryAssistant.welcome">{assistantCopy('welcome')}</h2>
      <p className="text-body-regular text-text-secondary" data-copy-key="catalog.libraryAssistant.description">{assistantCopy('description')}</p>
    </div>
    {demoCases}
    {setupAction}
  </div>;
}
