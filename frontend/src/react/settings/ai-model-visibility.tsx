import { useState, useSyncExternalStore } from 'react';
import { Heading } from 'react-aria-components';
import { RiEyeLine } from '@remixicon/react';
import { Button } from '@/components/base/buttons/button';
import { Input } from '@/components/base/input/input';
import { appSettingsStore } from '../../appearance/settings';
import { errorMessage } from '../../api';
import { t } from '../../i18n';
import { AIProviderLabel } from '../components/ai-provider-logo';
import { ModalFrame } from '../components/modal-frame';
import { OrderedPreferenceList } from '../components/ordered-preference-list';
import { SettingsDialogClose } from '../components/settings-dialog-close';
import { ErrorText, Help } from './section';
import { aiModelLabel, matchesAIModel, useAIConnectionModels, type AIModel } from './use-ai-models';

type Connection = { id: string; label: string; base_url?: string; protocol?: string };
type Visibility = { mode: 'all' | 'picked'; picked: readonly string[] };
const ALL_MODELS: Visibility = { mode: 'all', picked: [] };

function visibilityKey(connection: Connection) {
  return JSON.stringify([connection.id, connection.base_url ?? '', connection.protocol ?? '']);
}

export function useAIModelVisibility(connection: Connection): Visibility {
  const store = appSettingsStore();
  useSyncExternalStore(store.subscribe, store.version);
  const prefs = store.value.aiModelVisibility as Record<string, Visibility> | undefined;
  const visibility = prefs?.[visibilityKey(connection)];
  return visibility && ['all', 'picked'].includes(visibility.mode) && Array.isArray(visibility.picked)
    ? visibility : ALL_MODELS;
}

export function modelIsVisible(visibility: Visibility, id: string) {
  return visibility.mode === 'all' || visibility.picked.includes(id);
}

export function visibleAIModels(models: readonly AIModel[], visibility: Visibility) {
  const byId = new Map(models.map(model => [model.id, model]));
  const picked = new Set(visibility.picked);
  const ordered = Array.from(picked, id => byId.get(id)).filter(model => model !== undefined);
  return visibility.mode === 'all'
    ? [...ordered, ...models.filter(model => !picked.has(model.id))]
    : ordered;
}

const copy = (key: string, values: Record<string, string | number> = {}) => t('settings:aiLibrary.visibility.' + key, values);

export function AIModelVisibilityButton({ connection, disabled }: { connection: Connection; disabled?: boolean }) {
  const [open, setOpen] = useState(false);
  const visibility = useAIModelVisibility(connection);
  const [draft, setDraft] = useState(visibility);
  const [query, setQuery] = useState('');
  const catalog = useAIConnectionModels(connection.id, open);
  const models = catalog.data?.models ?? [];
  const visible = visibleAIModels(models, draft);
  const order = visible.map(model => model.id);
  const items = models.filter(model => matchesAIModel(model, query))
    .map(model => ({ key: model.id, label: aiModelLabel(model.id, model.label) }));
  const changeOrder = (next: string[]) => {
    const unavailable = draft.picked.filter(id => !models.some(model => model.id === id));
    setDraft({ mode: draft.mode === 'all' && next.length === models.length ? 'all' : 'picked',
      picked: [...next, ...unavailable] });
  };
  const save = () => {
    const store = appSettingsStore();
    store.value.aiModelVisibility = { ...(store.value.aiModelVisibility as object), [visibilityKey(connection)]: draft };
    store.save();
    setOpen(false);
  };

  return <>
    <Button type="button" size="small" variant="secondary" leadingIcon={RiEyeLine} disabled={disabled}
      data-copy-interact="" onClick={() => { setDraft(visibility); setQuery(''); setOpen(true) }}>
      <span data-copy-key="settings.aiLibrary.visibility.title">{copy('title')}</span>
    </Button>
    <ModalFrame isOpen={open} onOpenChange={setOpen} width="form" fitVisualViewport
      shouldCloseOnInteractOutside={element => !element.closest('[data-trigger="Select"]')}
      surfaceClassName="peach-react">
      <header className="flex items-start justify-between gap-4 border-b border-separator-border px-5 py-4">
        <div className="flex min-w-0 flex-col gap-1">
          <Heading slot="title" className="text-title-2-medium text-text-primary" data-copy-key="settings.aiLibrary.visibility.title">{copy('title')}</Heading>
          <p className="text-body-2-regular text-text-secondary">
            <AIProviderLabel provider={connection.id} label={connection.label} />
          </p>
        </div>
        <SettingsDialogClose label={t('catalog:shared.close')} onPress={() => setOpen(false)} />
      </header>
      <div className="flex min-w-0 flex-col gap-4 px-5 py-4">
        <Help><span data-copy-key="settings.aiLibrary.visibility.description">{copy('description')}</span></Help>
        {catalog.isPending ? <Help role="status">{t('settings:aiLibrary.modelsLoading')}</Help> : null}
        {catalog.error ? <div className="flex flex-wrap items-center gap-2">
          <ErrorText>{errorMessage(catalog.error)}</ErrorText>
          <Button type="button" size="small" variant="ghost" onClick={() => { void catalog.refetch(); }}>{t('settings:aiLibrary.retryModels')}</Button>
        </div> : null}
        {catalog.isSuccess ? <>
          <Help role="status">{copy('count', { shown: visible.length, total: models.length })}</Help>
          {models.length ? <>
            {models.length > 10 || query ? <Input aria-label={copy('filter')} placeholder={copy('filter')}
              value={query} onChange={setQuery} /> : null}
            {items.length ? <OrderedPreferenceList items={items} order={order} onChange={changeOrder} allowEmpty scrollable
              chooseLabel={copy('pickModel')} allShown={copy(query ? 'noMatchingHidden' : 'allShown')}
              empty={<Help>{copy(query && order.length ? 'noMatchingVisible' : 'empty')}</Help>}
              footer={draft.picked.length || draft.mode === 'picked' ? <div>
                <Button size="small" variant="secondary" onClick={() => { setDraft(ALL_MODELS); setQuery(''); }}>
                  <span data-copy-key="settings.aiLibrary.visibility.reset">{copy('reset')}</span>
                </Button>
              </div> : null} /> : <Help>{copy('noMatches')}</Help>}
          </> : <Help>{copy('noModels')}</Help>}
        </> : null}
      </div>
      <footer className="flex flex-wrap justify-end gap-2 border-t border-separator-border px-5 py-4">
        <Button type="button" size="small" variant="secondary" onClick={() => setOpen(false)}>{t('settings:aiLibrary.cancelProvider')}</Button>
        <Button type="button" size="small" disabled={draft.mode === 'picked' && !catalog.isSuccess} onClick={save}>
          {t('settings:shared.saveSettings')}
        </Button>
      </footer>
    </ModalFrame>
  </>;
}
