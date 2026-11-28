import { useMemo, useState, type ReactNode } from 'react';
import { RiAddLine } from '@remixicon/react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Tab, TabPanel, Tabs, VisuallyHidden } from 'react-aria-components';
import { Button, ButtonLink } from '@/components/base/buttons/button';
import { Input } from '@/components/base/input/input';
import { Textarea } from '@/components/base/textarea/textarea';
import { Select, SelectItem } from '@/components/base/select/select';
import { apiGet, apiSend, errorMessage } from '../../api';
import { aiConnectionsSkeleton } from '../../configuration-skeleton';
import { t } from '../../i18n';
import { AIProviderLabel, AIProviderLogo } from '../components/ai-provider-logo';
import { SectionToc } from '../components/section-toc';
import { SEGMENT, SEGMENTED_TRACK, SegmentedTabList } from '../components/segmented';
import { StatusLabel, type StatusTone } from '../components/status-label';
import { ErrorText, ExternalLink, Footer, Help, Section, SectionSkeleton, Stack } from './section';
import { busyProps, useAction } from './use-action';
import { AIPromptEditor, AI_PROMPT_SCOPES, promptCopy, useAIPromptSettings, type AIPromptScope } from './ai-prompt-settings';
import { AIUsageDashboard } from './ai-usage-dashboard';
import { AIModelVisibilityButton } from './ai-model-visibility';
import { CUSTOM_TASKS_KEY, CUSTOM_TASKS_URL, customTaskCopy, useCustomTasks, type FixedTask } from './ai-custom-tasks';
import { aiModelLabel, aiSearchModelsKey, preferredAIConnection, useAIModels, type AIEffort, type AITask, type ModelChoices } from './use-ai-models';

export const AI_CONNECTIONS_URL = '/api/ai-library/connections';
export const AI_CONNECTIONS_KEY = ['ai-library-connections'];

export interface AIConnection extends ModelChoices {
  id: string;
  label: string;
  model: string;
  configured: boolean;
  host?: string;
  base_url?: string;
  default_base_url?: string;
  key_url?: string;
  status?: OAuthStatus;
  email?: string;
  custom?: boolean;
  protocol?: 'openai' | 'anthropic';
  manual_model?: boolean;
  suggested_models?: Record<AITask, string[]>;
}
export interface TaskProfile { provider: string; model: string; effort: AIEffort }
export interface AIConnections {
  providers: AIConnection[];
  task_profiles?: Partial<Record<AITask, Partial<TaskProfile>>>;
}
type OAuthStatus = 'disconnected' | 'pending' | 'connected' | 'permission_required' | 'error';

const OAUTH_URL = '/api/ai-library/openai/oauth';
const VERIFY_URL = AI_CONNECTIONS_URL + '/verify';
const OAUTH_TONES: Record<OAuthStatus, StatusTone> = {
  disconnected: 'neutral', pending: 'progress', connected: 'success', permission_required: 'warning', error: 'error',
};

export function aiConnectionLabel(row: Pick<AIConnection, 'id' | 'label'>) {
  if (row.id === 'openai') return t('settings:aiLibrary.openaiKeyLabel');
  if (row.id === 'openai-oauth') return t('settings:aiLibrary.openaiOAuthLabel');
  return row.label;
}

export function AILibrarySettings({ active, receipt }: { active: boolean; receipt(message: string): void }) {
  const [adding, setAdding] = useState(false);
  const query = useQuery({
    queryKey: AI_CONNECTIONS_KEY,
    queryFn: ({ signal }) => apiGet<AIConnections>(AI_CONNECTIONS_URL, signal),
    enabled: active,
    refetchInterval: query => active && query.state.data?.providers.some(row => row.status === 'pending') ? 1500 : false,
  });
  const refresh = () => { void query.refetch(); };
  const saved = () => {
    refresh();
    receipt(t('settings:aiLibrary.saved'));
  };
  if (!query.data && query.isPending) return active
    ? <SectionSkeleton label={t('settings:aiLibrary.loading')} html={aiConnectionsSkeleton} />
    : null;
  const providers = query.data?.providers ?? [];
  const oauth = providers.find(value => value.id === 'openai-oauth');
  const services = { id: 'ai-services', label: t('settings:aiLibrary.servicesTitle') };
  const prompts = { id: 'ai-prompts', label: t('settings:aiLibrary.prompts.title') };
  const usage = { id: 'ai-usage', label: t('settings:aiLibrary.usage.title') };
  return <div className="@container flex min-w-0 flex-col gap-5">
    <SectionToc inline label={t('settings:configurationPage.contents')} entries={[services, prompts, usage]}>
      <div id={services.id} className="flex min-w-0 flex-col gap-5">
        {query.error ? <ErrorText>{errorMessage(query.error)}</ErrorText> : null}
        {!adding && query.data ? <div className="flex justify-end">
          <Button size="small" type="button" variant="secondary" leadingIcon={RiAddLine} onClick={() => setAdding(true)}>
            <span data-copy-key="settings.aiLibrary.addProvider">{t('settings:aiLibrary.addProvider')}</span>
          </Button>
        </div> : null}
        {adding ? <Section title={t('settings:aiLibrary.addProvider')} icon={<AIProviderLogo provider="custom" className="size-5" />}>
          <ProviderForm active={active} value={{ id: 'custom', label: t('settings:aiLibrary.addProvider'),
            model: '', configured: false, custom: true }} cancel={() => setAdding(false)}
            saved={() => { setAdding(false); saved(); }} />
        </Section> : null}
        <div className="flex min-w-0 flex-col gap-5">
          {providers.filter(value => value.id !== 'openai-oauth').map(value =>
            <Section key={value.id} title={value.label} icon={<AIProviderLogo provider={value.id} className="size-5" />}>
              {value.id === 'openai' && oauth ? <OpenAIMethods api={value} oauth={oauth} active={active} saved={saved} refresh={refresh} />
                : <ProviderForm value={value} active={active} saved={saved} />}
            </Section>)}
        </div>
      </div>
      <Section id={prompts.id} title={prompts.label}>
        <AITaskSettings providers={providers} profiles={query.data?.task_profiles} active={active} receipt={receipt} />
      </Section>
      <Section id={usage.id} title={usage.label}>
        <AIUsageDashboard active={active} providers={providers.map(row => ({ id: row.id, label: aiConnectionLabel(row), configured: row.configured }))} />
      </Section>
    </SectionToc>
  </div>;
}

const MODEL_TASK: Record<Exclude<AIPromptScope, 'system'>, AITask> = {
  translate: 'translate', tags: 'tags', vision: 'vision', timeline: 'vision', official: 'vision',
  search: 'search', metadata: 'search', organize: 'search',
};

function AITaskSettings({ providers, profiles, active, receipt }: {
  providers: AIConnection[]; profiles: AIConnections['task_profiles']; active: boolean; receipt(message: string): void;
}) {
  const client = useQueryClient();
  const [scope, setScope] = useState<AIPromptScope>('translate');
  const [fixedId, setFixedId] = useState('');
  const fixedTasks = useCustomTasks<FixedTask>(true, active);
  const fixed = fixedTasks.data?.tasks.find(row => row.id === fixedId);
  const isFixed = fixedId === 'new' || Boolean(fixed);
  const [drafts, setDrafts] = useState<Partial<Record<AITask, Partial<TaskProfile>>>>({});
  const action = useAction();
  const busy = Boolean(action.busy);
  const prompt = useAIPromptSettings(scope, active && !isFixed);
  const task = scope === 'system' ? undefined : MODEL_TASK[scope];
  const profile = task ? profiles?.[task] : undefined;
  const modelDraft = task ? drafts[task] : undefined;
  const { provider, model, effort } = modelDraft ?? {};
  const options = providers.filter(row => row.configured);
  const connection = task ? options.find(row => row.id === (provider ?? profile?.provider ?? preferredAIConnection(options)?.id)) : undefined;
  const editModel = (change: Partial<TaskProfile>) => {
    if (task) setDrafts(current => ({ ...current, [task]: { ...current[task], ...change } }));
  };
  const authorized = connection?.id === 'openai-oauth';
  const connectionRevision = connection ? JSON.stringify([connection.base_url, connection.protocol, connection.manual_model, connection.model]) : undefined;
  const catalog = useAIModels(authorized ? OAUTH_URL + '/models' : AI_CONNECTIONS_URL + '/models',
    connection?.id ?? '', '', active && !isFixed && Boolean(connection), undefined, connectionRevision);
  const eligibleCatalog = task === 'vision' ? { ...catalog, models: catalog.models.filter(row => row.vision !== false) } : catalog;
  const prior = connection?.id === profile?.provider ? profile?.model : undefined;
  const recommendations = task ? connection?.suggested_models?.[task] ?? [] : [];
  const capable = task ? eligibleCatalog.models.filter(row => task === 'vision' ? row.vision
    : row.effort_reported && row.default_efforts[task] !== 'default') : [];
  const recommended = recommendations.map(id => eligibleCatalog.models.find(row => row.id === id || row.id.startsWith(id + '-20')))
    .find(Boolean) ?? capable.find(row => row.id === connection?.model) ?? capable[0];
  const selected = pickModel(eligibleCatalog, model, prior, recommended?.id, connection?.model);
  const choice = eligibleCatalog.models.find(row => row.id === selected);
  const efforts = choice?.efforts ?? ['default'];
  const requested = effort ?? (selected === prior ? profile?.effort : undefined);
  const chosenModelEffort = (task && choice?.default_efforts[task]) || 'default';
  const selectedEffort = requested && efforts.includes(requested) ? requested : chosenModelEffort;
  const recommendedEffort = (task && recommended?.default_efforts[task]) || 'default';
  const modelSettings = connection && choice ? { provider: connection.id, model: selected, effort: selectedEffort } : null;
  const modelDirty = Boolean(modelSettings && modelDraft && (profile?.provider !== modelSettings.provider
    || profile.model !== modelSettings.model || profile.effort !== modelSettings.effort));
  async function saveModel(signal: AbortSignal, reset = false) {
    if (!task || (!reset && !modelSettings)) return;
    const body = reset ? { task, remove: true } : { task, ...modelSettings };
    const reply = await apiSend<{ task_profiles: AIConnections['task_profiles'] }>('/api/ai-library/task-profile', body, 'POST', signal);
    client.setQueryData<AIConnections>(AI_CONNECTIONS_KEY, current => current ? { ...current, task_profiles: reply.task_profiles } : current);
    setDrafts(current => ({ ...current, [task]: undefined }));
  }
  const save = () => {
    void action.run('save', async signal => {
      if (modelDirty) await saveModel(signal);
      try {
        if (prompt.dirty) await prompt.save(signal);
      } catch (error) {
        if (modelDirty && !signal.aborted) receipt(t('settings:aiLibrary.taskModelSaved'));
        throw error;
      }
    }, () => receipt(t('settings:aiLibrary.taskSettingsSaved')));
  };
  const [editingBusy, setEditingBusy] = useState(false);
  const choose = (next: string) => {
    action.setError('');
    if (AI_PROMPT_SCOPES.includes(next as AIPromptScope)) {
      setFixedId('');
      setScope(next as AIPromptScope);
    } else {
      setFixedId(next);
    }
  };
  return <>
    <Stack>
      <span className="text-body-medium text-text-primary" data-copy-key="settings.aiLibrary.prompts.scope">{promptCopy('scope')}</span>
      <div className="flex flex-wrap items-center gap-2">
        <Select className="min-w-0 flex-1" aria-label={promptCopy('scope')} selectedKey={isFixed ? fixedId : scope}
          isDisabled={busy || editingBusy} onSelectionChange={next => { if (next !== null) choose(String(next)); }}>
          {AI_PROMPT_SCOPES.map(name => <SelectItem key={name} id={name}>{promptCopy('scopes.' + name)}</SelectItem>)}
          {fixedTasks.data?.tasks.map(row => <SelectItem key={row.id} id={row.id}>{row.name}</SelectItem>)}
          {fixedId === 'new' ? <SelectItem id="new">{customTaskCopy('new')}</SelectItem> : null}
        </Select>
        <Button type="button" size="small" variant="secondary" leadingIcon={RiAddLine}
          disabled={busy || editingBusy || fixedId === 'new' || !fixedTasks.data}
          onClick={() => choose('new')}>
          <span data-copy-key="settings.aiLibrary.customTasks.add">{customTaskCopy('add')}</span>
        </Button>
      </div>
      {fixedTasks.error ? <ErrorText>{errorMessage(fixedTasks.error)}</ErrorText> : null}
      {!isFixed && task && scope !== task ? <Help>{t('settings:aiLibrary.sharedTaskModel', { task: promptCopy('scopes.' + task) })}</Help> : null}
    </Stack>
    {isFixed ? <FixedTaskEditor key={fixedId} task={fixed} providers={options} active={active}
      busyChanged={setEditingBusy} choose={choose} receipt={receipt} /> : <form noValidate onSubmit={event => {
      event.preventDefault();
      if (!busy && (modelDirty || prompt.dirty)) save();
    }}>
    {task ? <Stack divided>
      {!connection && profile?.provider ? <Help>{t('settings:aiLibrary.taskConnectionMissing')}</Help> : null}
      {!options.length ? <Help>{t('settings:aiLibrary.taskConnectFirst')}</Help> : null}
      <Select aria-label={t('catalog:aiLibrary.provider')} selectedKey={connection?.id ?? null} isDisabled={busy || !options.length}
        onSelectionChange={next => { if (next) editModel({ provider: String(next), model: undefined, effort: undefined }); }}>
        {options.map(row => {
          const label = aiConnectionLabel(row);
          return <SelectItem key={row.id} id={row.id} textValue={label}>
            <AIProviderLabel provider={row.id} label={label} />
          </SelectItem>;
        })}
      </Select>
      <ModelPicker catalog={eligibleCatalog} selected={selected} onChange={next => editModel({ model: next, effort: undefined })}
        enabled={Boolean(connection)} disabled={busy} hint={t('settings:aiLibrary.taskConnectFirst')} savedModel={prior} />
      {recommended ? <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <Help>
          <span data-copy-key="settings.aiLibrary.modelRecommendation">{t('settings:aiLibrary.modelRecommendation')}</span>
          <span data-copy-ignore=""> · {aiModelLabel(recommended.id, recommended.label)}</span>
        </Help>
        {recommended.id !== selected || (!profile?.provider && !modelDraft) ? <Button
          variant="secondary" size="small" type="button" disabled={busy}
          onClick={() => editModel({ model: recommended.id, effort: recommendedEffort })}>
          <span data-copy-key="settings.aiLibrary.useRecommendation">{t('settings:aiLibrary.useRecommendation')}</span>
        </Button> : null}
      </div> : null}
      <div className="flex min-w-0 flex-col gap-1.5">
        <span className="text-body-medium text-text-primary" data-copy-key="settings.aiLibrary.effort">{t('settings:aiLibrary.effort')}</span>
        <Select aria-label={t('settings:aiLibrary.effort')} selectedKey={selectedEffort} isDisabled={busy || !choice || efforts.length === 1}
          onSelectionChange={next => { if (next) editModel({ effort: next as AIEffort }); }}>
          {efforts.map(level => <SelectItem key={level} id={level}>{t('settings:aiLibrary.effortOptions.' + level)}</SelectItem>)}
        </Select>
        {choice ? <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
          <Help>
            <span data-copy-key="settings.aiLibrary.effortRecommendation">{t('settings:aiLibrary.effortRecommendation')}</span>
            <span data-copy-ignore=""> · {t('settings:aiLibrary.effortOptions.' + chosenModelEffort)}</span>
          </Help>
          {chosenModelEffort !== selectedEffort ? <Button type="button" size="small" variant="secondary" disabled={busy}
            onClick={() => editModel({ effort: chosenModelEffort })}>
            <span data-copy-key="settings.aiLibrary.useEffortRecommendation">{t('settings:aiLibrary.useEffortRecommendation')}</span>
          </Button> : null}
        </div> : null}
      </div>
      {choice?.effort_reported === false ? <Help><span data-copy-key="settings.aiLibrary.effortUnreported">
        {t('settings:aiLibrary.effortUnreported')}
      </span></Help> : null}
    </Stack> : null}
    <AIPromptEditor scope={scope} prompt={prompt} busy={busy} divided />
    {action.error ? <Stack><ErrorText>{action.error}</ErrorText></Stack> : null}
    <Footer>
      {profile?.provider ? <Button type="button" size="small" variant="secondary" disabled={busy}
        onClick={() => { void action.run('reset-model', signal => saveModel(signal, true),
          () => receipt(t('settings:aiLibrary.taskModelReset'))); }}
        {...busyProps(action.busy === 'reset-model')}>{t('settings:aiLibrary.resetTaskProfile')}</Button> : null}
      {prompt.resettable ? <Button type="button" size="small" variant="secondary" disabled={busy}
        onClick={() => { void action.run('reset-prompt', signal => prompt.save(signal, true),
          () => receipt(promptCopy('resetDone'))); }}
        {...busyProps(action.busy === 'reset-prompt')}>{promptCopy('reset')}</Button> : null}
      <Button type="submit" size="small" disabled={busy || (!modelDirty && !prompt.dirty)} {...busyProps(action.busy === 'save')}>
        <span data-copy-key="settings.shared.saveSettings">{t('settings:shared.saveSettings')}</span>
      </Button>
    </Footer>
  </form>}
  </>;
}

function FixedTaskEditor({ task, providers, active, choose, busyChanged, receipt }: {
  task?: FixedTask; providers: AIConnection[]; active: boolean;
  choose(id: string): void; busyChanged(value: boolean): void; receipt(message: string): void;
}) {
  const client = useQueryClient();
  const action = useAction();
  const busy = Boolean(action.busy);
  const [name, setName] = useState(task?.name ?? '');
  const [prompt, setPrompt] = useState(task?.prompt ?? '');
  const [provider, setProvider] = useState(task?.provider ?? '');
  const [model, setModel] = useState(task?.model ?? '');
  const [effort, setEffort] = useState<AIEffort | undefined>(task?.effort ?? undefined);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const connection = providers.find(row => row.id === provider);
  const catalog = useAIModels(provider === 'openai-oauth' ? OAUTH_URL + '/models' : AI_CONNECTIONS_URL + '/models',
    provider, '', active && Boolean(connection));
  const selectedModel = model || pickModel(catalog, connection?.model);
  const choice = catalog.models.find(row => row.id === selectedModel);
  const suggested = choice?.default_efforts.search ?? 'default';
  const efforts = choice?.efforts ?? (effort && effort !== 'default' ? ['default', effort] as const : ['default'] as const);
  const selectedEffort = effort && efforts.includes(effort) ? effort : suggested;
  const valid = Boolean(name.trim() && prompt.trim() && (!provider || (connection && selectedModel)));
  const save = (remove = false) => {
    busyChanged(true);
    void action.run(remove ? 'remove' : 'save', signal => apiSend<{ id: string; tasks: FixedTask[] }>(CUSTOM_TASKS_URL,
      remove ? { id: task?.id, remove: true } : {
        id: task?.id, name, prompt, connection: provider ? { provider, model: selectedModel, effort: selectedEffort } : null,
      }, 'POST', signal), reply => {
      client.setQueryData([...CUSTOM_TASKS_KEY, true], { tasks: reply.tasks });
      void client.invalidateQueries({ queryKey: [...CUSTOM_TASKS_KEY, false] });
      setConfirmRemove(false);
      choose(remove ? 'translate' : reply.id);
      receipt(customTaskCopy(remove ? 'removed' : 'saved'));
    }).finally(() => busyChanged(false));
  };

  return <form noValidate onSubmit={event => { event.preventDefault(); if (valid && !busy && !confirmRemove) save(); }}>
    <Stack divided>
      <Input label={customTaskCopy('name')} value={name} onChange={setName} maxLength={80} isDisabled={busy} />
      <Textarea label={customTaskCopy('prompt')} value={prompt} onChange={setPrompt} rows={6}
        maxLength={2400} showCount resize="vertical" isDisabled={busy} />
      <Help>{customTaskCopy('help')}</Help>
    </Stack>
    <Stack divided>
      <span className="text-body-medium text-text-primary">{t('catalog:aiLibrary.provider')}</span>
      <Select aria-label={t('catalog:aiLibrary.provider')} selectedKey={provider || '*'} isDisabled={busy}
        onSelectionChange={key => {
          if (key !== null) { setProvider(key === '*' ? '' : String(key)); setModel(''); setEffort(undefined); }
        }}>
        <SelectItem id="*">{customTaskCopy('automatic')}</SelectItem>
        {provider && !connection ? <SelectItem id={provider}>{t('settings:aiLibrary.taskConnectionMissing')}</SelectItem> : null}
        {providers.map(row => {
          const label = aiConnectionLabel(row);
          return <SelectItem key={row.id} id={row.id} textValue={label}>
            <AIProviderLabel provider={row.id} label={label} />
          </SelectItem>;
        })}
      </Select>
      {connection ? <>
        <ModelPicker catalog={catalog} selected={selectedModel} onChange={value => { setModel(value); setEffort(undefined); }}
          enabled disabled={busy} hint="" savedModel={task?.model ?? undefined} />
        <span className="text-body-medium text-text-primary">{t('settings:aiLibrary.effort')}</span>
        <Select aria-label={t('settings:aiLibrary.effort')} selectedKey={selectedEffort} isDisabled={busy || efforts.length === 1}
          onSelectionChange={key => { if (key !== null) setEffort(key as AIEffort); }}>
          {efforts.map(level => <SelectItem key={level} id={level}>{t('settings:aiLibrary.effortOptions.' + level)}</SelectItem>)}
        </Select>
        {choice ? <Help>{t('settings:aiLibrary.effortRecommendation')} · {t('settings:aiLibrary.effortOptions.' + suggested)}</Help> : null}
      </> : null}
      {action.error ? <ErrorText>{action.error}</ErrorText> : null}
      {confirmRemove ? <Help role="status">{customTaskCopy('removePrompt')}</Help> : null}
    </Stack>
    <Footer>
      {task ? <Button type="button" size="small" variant="secondary" disabled={busy}
        onClick={() => confirmRemove ? save(true) : setConfirmRemove(true)}
        {...busyProps(action.busy === 'remove')}>{customTaskCopy(confirmRemove ? 'confirmRemove' : 'remove')}</Button> : null}
      {!task || confirmRemove ? <Button type="button" size="small" variant="ghost" disabled={busy} onClick={() =>
        confirmRemove ? setConfirmRemove(false) : choose('translate')}>{customTaskCopy('cancel')}</Button> : null}
      {!confirmRemove ? <Button type="submit" size="small" disabled={busy || !valid} {...busyProps(action.busy === 'save')}>
        {t('settings:shared.saveSettings')}
      </Button> : null}
    </Footer>
  </form>;
}

function OpenAIMethods({ api, oauth, active, saved, refresh }: {
  api: AIConnection; oauth: AIConnection; active: boolean; saved(): void; refresh(): void;
}) {
  const [method, setMethod] = useState(() => {
    const direct = new URLSearchParams(window.location.search).get('connection') === 'chatgpt';
    return direct || (!api.configured && oauth.status !== 'disconnected') ? 'oauth' : 'key';
  });
  return <Tabs selectedKey={method} onSelectionChange={key => setMethod(String(key))}>
    <SegmentedTabList aria-label={t('settings:aiLibrary.connectionMethod')} className={SEGMENTED_TRACK + ' mt-3'}>
      <Tab id="key" className={SEGMENT}>API Key</Tab>
      <Tab id="oauth" className={SEGMENT}>
        <span data-copy-key="settings.aiLibrary.oauthTitle">{t('settings:aiLibrary.oauthTitle')}</span>
      </Tab>
    </SegmentedTabList>
    <TabPanel id="key" shouldForceMount className="data-inert:hidden">
      <ProviderForm value={api} active={active && method === 'key'} saved={saved} />
    </TabPanel>
    <TabPanel id="oauth" shouldForceMount className="data-inert:hidden">
      <OAuthForm value={oauth} active={active && method === 'oauth'} saved={saved} refresh={refresh} />
    </TabPanel>
  </Tabs>;
}

type ModelCatalog = ReturnType<typeof useAIModels>;

function pickModel(catalog: ModelCatalog, ...preferred: (string | null | undefined)[]) {
  return preferred.find(id => id && catalog.models.some(row => row.id === id)) ?? '';
}

function ModelPicker({ catalog, selected, onChange, disabled, enabled, hint, savedModel, action }: {
  catalog: ModelCatalog; selected: string; onChange(model: string): void; disabled: boolean;
  enabled: boolean; hint: string; savedModel?: string; action?: ReactNode;
}) {
  const label = t('settings:aiLibrary.model');
  const placeholder = !enabled ? hint : t(catalog.loading ? 'settings:aiLibrary.modelsLoading' : 'settings:aiLibrary.chooseModel');
  const selectedLabel = aiModelLabel(selected, catalog.models.find(row => row.id === selected)?.label);
  return <div className="flex min-w-0 flex-col gap-1.5">
    <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
      <span className="text-body-medium text-text-primary" data-copy-key="settings.aiLibrary.model">{label}</span>
      {action}
    </div>
    <Select aria-label={label} placeholder={placeholder} selectedKey={selected || null}
      renderValue={({ isPlaceholder }) => <span className="truncate">{isPlaceholder ? placeholder : selectedLabel}</span>}
      isDisabled={disabled || !catalog.models.length} onSelectionChange={key => { if (key !== null) onChange(String(key)); }}>
      {catalog.models.map(row => {
        const name = aiModelLabel(row.id, row.label);
        return <SelectItem key={row.id} id={row.id} textValue={name}>
          <span className="min-w-0 wrap-anywhere">
            <span className="block">{name}</span>
            {name !== row.id ? <span className="block text-body-2-regular text-text-secondary">{row.id}</span> : null}
          </span>
        </SelectItem>;
      })}
    </Select>
    {enabled && catalog.loading ? <VisuallyHidden role="status">{placeholder}</VisuallyHidden> : null}
    {enabled && !catalog.loading && !catalog.models.length ? <div className="flex flex-wrap items-center gap-x-2">
      {catalog.error ? <ErrorText>{catalog.error}</ErrorText> : <Help role="status">{t('settings:aiLibrary.modelsEmpty')}</Help>}
      {!action ? <Button variant="ghost" size="small" type="button" onClick={catalog.retry} disabled={disabled}>
        {t('settings:aiLibrary.retryModels')}
      </Button> : null}
    </div> : null}
    {savedModel && savedModel !== selected ? <Help>{t('settings:aiLibrary.savedModel', { model: aiModelLabel(savedModel) })}</Help> : null}
  </div>;
}

function OAuthForm({ value, active, saved, refresh }: {
  value: AIConnection; active: boolean; saved(): void; refresh(): void;
}) {
  const [model, setModel] = useState<string | null>(null);
  const [url, setUrl] = useState('');
  const [revocationUnconfirmed, setRevocationUnconfirmed] = useState(false);
  const action = useAction();
  const status = value.status || 'disconnected';
  const pending = status === 'pending';
  const enabled = active && value.configured;
  const catalog = useAIModels(OAUTH_URL + '/models', value.id, '', enabled);
  const selected = pickModel(catalog, model ?? value.model);
  const busy = Boolean(action.busy);
  const command = (disconnect: boolean) => {
    const data = disconnect ? { disconnect } : { model: value.model };
    const wasConfigured = value.configured || status === 'permission_required';
    void action.run(disconnect ? 'remove' : 'start', signal => apiSend<{ authorization_url?: string; revoked?: boolean }>(
      OAUTH_URL, data, 'POST', signal,
    ), result => {
      setUrl(result.authorization_url || '');
      setModel(null);
      setRevocationUnconfirmed(disconnect && wasConfigured && !result.revoked);
      refresh();
    });
  };
  const saveModel = () => {
    void action.run('model', signal => apiSend(OAUTH_URL, { set_model: true, model: selected }, 'POST', signal), () => {
      setModel(null);
      saved();
    });
  };
  return <>
    <Stack>
      <div><StatusLabel tone={OAUTH_TONES[status]}>{t('settings:aiLibrary.oauthStatus.' + status)}</StatusLabel></div>
      <Help><span className="select-text" data-copy-key="settings.aiLibrary.oauthHelp">{t('settings:aiLibrary.oauthHelp')}</span></Help>
      {value.email ? <Help>{value.email}</Help> : null}
      <ModelPicker catalog={catalog} selected={selected} onChange={setModel} enabled={enabled}
        disabled={busy || pending} hint={t('settings:aiLibrary.modelsAfterAuth')} savedModel={value.configured ? value.model : undefined} />
      {action.error ? <ErrorText>{action.error}</ErrorText> : null}
      {status === 'error' ? <ErrorText>{t('settings:aiLibrary.oauthError')}</ErrorText> : null}
      {revocationUnconfirmed ? <Help role="status">{t('settings:aiLibrary.oauthRevocationUnconfirmed')}</Help> : null}
    </Stack>
    <Footer>
      {value.configured ? <AIModelVisibilityButton connection={{ ...value, label: aiConnectionLabel(value) }} disabled={busy} /> : null}
      {status !== 'disconnected' ? <Button size="small" variant="secondary" disabled={busy}
        onClick={() => command(true)} {...busyProps(action.busy === 'remove')}>{t('settings:aiLibrary.oauthDisconnect')}</Button> : null}
      {value.configured ? <Button size="small" disabled={busy || !selected || selected === value.model}
        onClick={saveModel} {...busyProps(action.busy === 'model')}>{t('settings:shared.saveSettings')}</Button>
        : pending && url ? <ButtonLink data-button-link="" size="small" href={url} target="_blank" rel="noopener noreferrer">
          <span data-copy-key="settings.aiLibrary.oauthContinue">{t('settings:aiLibrary.oauthContinue')}</span>
        </ButtonLink> : <Button size="small" disabled={busy}
            onClick={() => command(false)} {...busyProps(action.busy === 'start')}>
          <span data-copy-key={pending ? 'settings.aiLibrary.oauthResume' : 'settings.aiLibrary.oauthPrepare'}>
            {t(pending ? 'settings:aiLibrary.oauthResume' : 'settings:aiLibrary.oauthPrepare')}
          </span>
        </Button>}
    </Footer>
  </>;
}

const MAGPIE_BASE = 'http://127.0.0.1/v1';
const MAGPIE_PORT = '3425';
type EndpointMode = 'official' | 'magpie' | 'custom';

function ProviderForm({ value, active, saved, cancel }: {
  value: Omit<AIConnection, keyof ModelChoices>; active: boolean; saved(): void; cancel?(): void;
}) {
  const queryClient = useQueryClient();
  const [model, setModel] = useState<string | null>(null);
  const [key, setKey] = useState('');
  const [verified, setVerified] = useState('');
  const [baseDraft, setBaseDraft] = useState<string | null>(null);
  const [portDraft, setPortDraft] = useState<string | null>(null);
  const [modeDraft, setModeDraft] = useState<EndpointMode | null>(null);
  const [labelDraft, setLabelDraft] = useState<string | null>(null);
  const [protocolDraft, setProtocolDraft] = useState<AIConnection['protocol']>();
  const [manualDraft, setManualDraft] = useState<boolean | null>(null);
  const [readRequested, setReadRequested] = useState(false);
  const action = useAction();
  const savedUrl = value.base_url ? new URL(value.base_url) : null;
  const savedPort = savedUrl?.port ?? '';
  if (savedUrl) savedUrl.port = '';
  const savedBase = savedUrl?.href.replace(/\/$/, '') ?? '';
  const mode = value.custom ? 'custom'
    : modeDraft ?? (value.id === 'openai' && savedBase === MAGPIE_BASE ? 'magpie' : savedBase ? 'custom' : 'official');
  const protocol = value.custom ? protocolDraft ?? value.protocol ?? 'openai' : undefined;
  const label = labelDraft ?? (value.id === 'custom' ? '' : value.label);
  const manual = value.custom && (manualDraft ?? value.manual_model ?? false);
  const base = baseDraft ?? savedBase;
  const port = portDraft ?? savedPort;
  const target = useMemo(() => ({ base_url: base.trim(), port: port.trim(), protocol }), [base, port, protocol]);
  const targetChanged = target.base_url !== savedBase || target.port !== savedPort || (value.configured && protocol !== value.protocol);
  const needsKey = value.configured && targetChanged && !key.trim();
  const hasKey = Boolean(key.trim()) || (value.configured && !targetChanged);
  const hasTarget = mode === 'official' || Boolean(target.base_url || (!value.custom && target.port));
  const manualRead = targetChanged || (mode !== 'official' && Boolean(key.trim()));
  const enabled = active && hasKey && hasTarget && !manual && (!manualRead || readRequested);
  const catalog = useAIModels(AI_CONNECTIONS_URL + '/models', value.id, key.trim(), enabled, target);
  const alternatives = !value.configured && !model ? value.suggested_models?.translate ?? [] : [];
  const selected = manual ? (model ?? (targetChanged ? '' : value.model)).trim() : pickModel(catalog, model ?? value.model, ...alternatives);
  const draft = { provider: value.id, model: selected, api_key: key, ...target,
    ...(value.custom ? { label: label.trim(), manual_model: Boolean(manual) } : {}) };
  const busy = Boolean(action.busy);
  const ready = active && hasKey && hasTarget && (!value.custom || Boolean(label.trim()))
    && (manual ? /^[A-Za-z0-9][A-Za-z0-9_.:/-]{0,127}$/.test(selected) : Boolean(selected) && enabled && !catalog.loading);
  const resetModel = () => {
    setReadRequested(false);
    setModel(null);
    setVerified('');
  };
  const resetTarget = () => { setKey(''); resetModel(); };
  const selectEndpoint = (next: EndpointMode) => {
    if (next === mode) return;
    setModeDraft(next);
    if (next !== 'custom') {
      setBaseDraft(next === 'magpie' ? MAGPIE_BASE : '');
      setPortDraft(next === 'magpie' ? MAGPIE_PORT : '');
    }
    resetTarget();
  };
  const verify = () => {
    setVerified('');
    void action.run('verify', signal => apiSend<{ model: string }>(VERIFY_URL, draft, 'POST', signal),
      result => setVerified(result.model));
  };
  const update = (remove: boolean) => {
    const data = remove ? { provider: value.id, remove } : draft;
    void action.run(remove ? 'remove' : 'save', signal => apiSend<AIConnections>(AI_CONNECTIONS_URL, data, 'POST', signal), result => {
      queryClient.setQueryData<AIConnections>(AI_CONNECTIONS_KEY, current => {
        const oauth = current?.providers.find(row => row.id === 'openai-oauth');
        if (!oauth || result.providers.some(row => row.id === 'openai-oauth')) return result;
        const official = result.providers.filter(row => !row.custom);
        return { ...result, providers: [...official, oauth, ...result.providers.filter(row => row.custom)] };
      });
      void queryClient.invalidateQueries({ queryKey: aiSearchModelsKey(value.id) });
      setKey('');
      setBaseDraft(null);
      setPortDraft(null);
      setModeDraft(null);
      setLabelDraft(null);
      setProtocolDraft(undefined);
      setManualDraft(null);
      resetModel();
      saved();
    });
  };
  return <form aria-label={value.label} noValidate onSubmit={event => { event.preventDefault(); if (ready && !busy) update(false); }}>
    <Stack>
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <StatusLabel tone={value.configured ? 'success' : 'neutral'}>{t(value.configured
          ? 'settings:aiLibrary.keySaved' : 'settings:aiLibrary.keyMissing')}</StatusLabel>
        {value.key_url && mode === 'official' ? <ExternalLink href={value.key_url}>
          <span data-copy-key="settings.aiLibrary.getKey">{t('settings:aiLibrary.getKey')}</span>
        </ExternalLink> : null}
      </div>
      {value.custom ? <>
        <Input label={t('settings:aiLibrary.customLabel')} value={label} maxLength={80} autoComplete="off"
          isDisabled={busy} onChange={setLabelDraft} />
        <div className="flex min-w-0 flex-col gap-1.5">
          <span className="text-body-medium text-text-primary" data-copy-key="settings.aiLibrary.protocol">
            {t('settings:aiLibrary.protocol')}
          </span>
          <Select aria-label={t('settings:aiLibrary.protocol')} selectedKey={protocol} isDisabled={busy}
            onSelectionChange={next => {
              if (next === 'openai' || next === 'anthropic') { setProtocolDraft(next); resetTarget(); }
            }}>
            {(['openai', 'anthropic'] as const).map(id => <SelectItem key={id} id={id}>
              {t('settings:aiLibrary.protocols.' + id)}
            </SelectItem>)}
          </Select>
        </div>
      </> : <div className="flex min-w-0 flex-col gap-1.5">
        <span className="text-body-medium text-text-primary" data-copy-key="settings.aiLibrary.endpointMode">
          {t('settings:aiLibrary.endpointMode')}
        </span>
        <Select aria-label={t('settings:aiLibrary.endpointMode')} selectedKey={mode} isDisabled={busy}
          onSelectionChange={next => { if (next !== null) selectEndpoint(next as EndpointMode); }}>
          <SelectItem id="official">{t('settings:aiLibrary.officialEndpoint')}</SelectItem>
          {value.id === 'openai' ? <SelectItem id="magpie">Magpie</SelectItem> : null}
          <SelectItem id="custom">{t('settings:aiLibrary.customEndpoint')}</SelectItem>
        </Select>
      </div>}
      {mode !== 'official' ? <>
        <div className="flex min-w-0 flex-col gap-3 @sm:flex-row">
          <div className="min-w-0 flex-1"><Input label={t('settings:aiLibrary.baseUrl')} value={base}
            placeholder={value.default_base_url ?? value.host} type="url" autoComplete="off" maxLength={512} isDisabled={busy}
            onChange={text => { setBaseDraft(text); setModeDraft('custom'); resetTarget(); }} /></div>
          <div className="@sm:w-28 @sm:shrink-0"><Input label={t('settings:aiLibrary.port')} value={port}
            placeholder={t('settings:aiLibrary.defaultPort')} inputMode="numeric" autoComplete="off" maxLength={5} isDisabled={busy}
            onChange={text => { setPortDraft(text); resetTarget(); }} /></div>
        </div>
        <Help><span data-copy-key="settings.aiLibrary.endpointHelp">{t('settings:aiLibrary.endpointHelp')}</span></Help>
      </> : null}
      <Input label="API Key" value={key} type="password" maxLength={2048}
        onChange={text => { setBaseDraft(base); setPortDraft(port); setKey(text); resetModel(); }} autoComplete="new-password" isDisabled={busy}
        placeholder={needsKey ? t('settings:aiLibrary.endpointKey') : value.configured ? t('settings:shared.savedLeaveBlank') : undefined}
        hint={t(mode === 'magpie' ? 'settings:aiLibrary.magpieKeyHelp' : 'settings:aiLibrary.keyPrivacy')} />
      {manual ? <Input label={t('settings:aiLibrary.manualModel')} value={model ?? (targetChanged ? '' : value.model)} autoComplete="off"
        maxLength={128} isDisabled={busy} onChange={setModel} hint={t('settings:aiLibrary.manualModelHelp')} />
        : <ModelPicker catalog={catalog} selected={selected} onChange={next => { setModel(next); setVerified(''); }} disabled={busy}
        enabled={enabled} hint={t(manualRead && hasKey ? 'settings:aiLibrary.readModels' : 'settings:aiLibrary.modelsAfterKey')}
        action={mode !== 'official' || manualRead ? <Button variant="secondary" size="small" type="button"
          disabled={busy || !hasKey || !hasTarget || catalog.loading}
          onClick={() => enabled ? catalog.retry() : setReadRequested(true)} {...busyProps(catalog.loading)}>
          {t('settings:aiLibrary.readModels')}
        </Button> : null}
        savedModel={value.configured && !targetChanged ? value.model : undefined} />}
      {value.custom ? <div className="flex">
        <Button type="button" size="small" variant="secondary" disabled={busy}
          onClick={() => { setManualDraft(!manual); resetModel(); }}>
          {t(manual ? 'settings:aiLibrary.catalogModel' : 'settings:aiLibrary.enterModelId')}
        </Button>
      </div> : null}
      {action.error ? <ErrorText>{action.error}</ErrorText> : null}
      {verified ? <Help role="status">{t('settings:aiLibrary.verified', { model: aiModelLabel(verified) })}</Help> : null}
    </Stack>
    <Footer>
      {cancel ? <Button type="button" variant="secondary" size="small" disabled={busy} onClick={cancel}>
        {t('settings:aiLibrary.cancelProvider')}
      </Button> : null}
      {value.configured ? <AIModelVisibilityButton connection={{ ...value, label: aiConnectionLabel(value) }} disabled={busy} /> : null}
      {value.configured ? <Button variant="secondary" type="button" size="small" disabled={busy}
        onClick={() => update(true)} {...busyProps(action.busy === 'remove')}>
        {t(value.custom ? 'settings:aiLibrary.removeProvider' : 'settings:aiLibrary.disconnect')}
      </Button> : null}
      {manual ? null : <Button variant="secondary" type="button" size="small" disabled={busy || !ready} onClick={verify}
        {...busyProps(action.busy === 'verify')}><span data-copy-key="settings.aiLibrary.verify">
          {t('settings:aiLibrary.verify')}</span></Button>}
      <Button size="small" type="submit" disabled={busy || !ready} {...busyProps(action.busy === 'save')}>
        {t('settings:shared.saveSettings')}
      </Button>
    </Footer>
  </form>;
}
