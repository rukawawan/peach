import { createContext, useCallback, useContext, useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from 'react';
import { Button } from '@/components/base/buttons/button';
import { JAV_SELECTION_EVENT } from '../../jav-controls';
import { selectRange, selectionSummary } from '../../selection';
import { errorMessage } from '../../api';
import { SelectionDock } from '../components/selection-dock';
import { addWant, invalidateWants } from '../wants/wants';
import { busyProps, useAction } from '../settings/use-action';
import { JavBatchResources } from './jav-batch-resources';
import type { Discovery } from './jav';
import { t } from '../../i18n';

function subscribeDensity(notify: () => void) {
  const observer = new MutationObserver(notify);
  observer.observe(document.body, { attributes: true, attributeFilter: ['data-density'] });
  return () => observer.disconnect();
}
const denseDensity = () => document.body.dataset.density === 'dense';
interface Selection {
  dense: boolean; mode: boolean; selected: Set<string>;
  toggle(item: Discovery, range?: boolean): void;
  visible(items: Discovery[]): void;
  selectPage(): void;
  all: boolean; mixed: boolean;
}
const Context = createContext<Selection | null>(null);
export const useJavSelection = () => useContext(Context);

/** 当前页提供展示顺序；跨页选择保留作品本身，不能把来源 ID 当馆藏 ID。 */
export function useVisibleJavWorks(items: Discovery[]) {
  const selection = useJavSelection();
  const visible = selection?.visible;
  useEffect(() => { visible?.(items) }, [items, visible]);
}

export function JavSelectionProvider({ children, readOnly, receipt }: {
  children: ReactNode; readOnly: boolean; receipt(message: string): void;
}) {
  const dense = useSyncExternalStore(subscribeDensity, denseDensity, () => false);
  const [mode, setMode] = useState(false);
  const [picked, setPicked] = useState<Map<string, Discovery>>(new Map());
  const [page, setPage] = useState<Discovery[]>([]);
  const [resources, setResources] = useState<Discovery[] | null>(null);
  const anchor = useRef<string | null>(null);
  const action = useAction();
  const selected = new Set(picked.keys());
  const summary = selectionSummary(selected, page.map(item => item.code));
  const visible = useCallback((items: Discovery[]) => {
    setPage(current => current.length === items.length && current.every((item, index) => item === items[index]) ? current : items);
    setPicked(current => {
      const changed = items.filter(item => current.has(item.code) && current.get(item.code) !== item);
      return changed.length ? new Map([...current, ...changed.map(item => [item.code, item] as const)]) : current;
    });
  }, []);
  const cancel = action.cancel;
  const close = useCallback(() => { cancel(); setMode(false); setPicked(new Map()); anchor.current = null }, [cancel]);
  const selectPage = () => setPicked(current => {
    const next = new Map(current);
    page.forEach(item => summary.all ? next.delete(item.code) : next.set(item.code, item));
    return next;
  });
  useEffect(() => {
    const toggle = () => { if (mode) close(); else setMode(true) };
    window.addEventListener(JAV_SELECTION_EVENT, toggle);
    return () => window.removeEventListener(JAV_SELECTION_EVENT, toggle);
  }, [mode, close]);
  useEffect(() => {
    if (!mode) { setPicked(new Map()); anchor.current = null }
    document.getElementById('selectMode')?.setAttribute('aria-pressed', String(mode));
    return () => document.getElementById('selectMode')?.setAttribute('aria-pressed', 'false');
  }, [mode]);
  useEffect(() => {
    if (!mode) return;
    const keydown = (event: KeyboardEvent) => {
      if ((event.target as HTMLElement).closest('input,textarea,[contenteditable]:not([contenteditable="false"]),[role="dialog"]')) return;
      if (event.key === 'Escape') { event.preventDefault(); close() }
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'a') {
        event.preventDefault();
        setPicked(current => new Map([...current, ...page.map(item => [item.code, item] as const)]));
      }
    };
    window.addEventListener('keydown', keydown);
    return () => window.removeEventListener('keydown', keydown);
  }, [mode, close, page]);
  const toggle = (item: Discovery, range = false) => {
    setMode(true);
    const previousAnchor = anchor.current;
    anchor.current = item.code;
    setPicked(current => {
      const keys = new Set(current.keys());
      selectRange(keys, page.map(row => row.code), previousAnchor, item.code, range);
      const known = new Map([...current, ...page.map(row => [row.code, row] as const), [item.code, item]]);
      return new Map([...keys].map(key => [key, known.get(key)!]));
    });
  };
  const eligible = [...picked.values()].filter(item => !item.wanted && !item.asset_id);
  const want = () => { void action.run('want', async signal => {
    let completed = 0;
    try {
      for (const item of eligible) {
        signal.throwIfAborted();
        try { await addWant({ code: item.code }, signal) }
        catch (error) { throw Error(t('catalog:javSelection.wantPartialFailed', { count: completed, code: item.code, error: errorMessage(error) })) }
        signal.throwIfAborted();
        completed++;
        setPicked(current => { const next = new Map(current); next.delete(item.code); return next });
      }
      return completed;
    } finally { void invalidateWants() }
  }, count => receipt(t('catalog:javSelection.wantAdded', { count }))) };
  return <Context.Provider value={{ dense, mode, selected, toggle, visible, selectPage, all: summary.all, mixed: summary.mixed }}>
    <div data-jav-selection="" data-select-mode={mode ? '' : undefined} className="flex min-w-0 flex-col gap-4">
      {children}
    </div>
    <SelectionDock visible={mode} count={t('catalog:javSelection.selectedCount', { count: picked.size })} label={t('catalog:javSelection.dockLabel')}>
      {action.error ? <p role="alert" className="w-full px-2 text-caption-1-regular text-text-error-primary">{action.error}</p> : null}
      <Button size="small" variant="secondary" disabled={!page.length || !!action.busy} onClick={selectPage}>
        <span data-copy-key={`jav.selection.page.${summary.all ? 'clear' : 'all'}`}>{summary.all ? t('catalog:javSelection.deselectPage') : t('catalog:javSelection.selectPage')}</span></Button>
      <Button size="small" variant="secondary" disabled={readOnly || !eligible.length} {...busyProps(action.busy === 'want')} onClick={want}>{t('catalog:javSelection.addToWants')}</Button>
      <Button size="small" variant="secondary" disabled={!picked.size || !!action.busy} onClick={() => setResources([...picked.values()])}>{t('catalog:shared.searchTorrents')}</Button>
      <Button size="small" variant="ghost" onClick={close}>{t('catalog:javSelection.exit')}</Button>
    </SelectionDock>
    <JavBatchResources items={resources} close={() => setResources(null)} readOnly={readOnly} receipt={receipt} />
  </Context.Provider>;
}
