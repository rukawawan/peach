import { useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Label, Popover, Radio, RadioGroup, Slider, SliderThumb, SliderTrack } from 'react-aria-components';
import { RiAddLine, RiBuilding4Line, RiCalendarLine, RiCloseLine, RiEyeLine, RiPriceTag3Line, RiRestartLine, RiSortDesc, RiTranslate2, RiUser3Line } from '@remixicon/react';
import { Button } from '@/components/base/buttons/button';
import { LinkButton } from '@/components/base/buttons/link-button';
import { AgentThinking } from '@/components/application/agent-thinking/agent-thinking';
import { MENU_POPOVER_SURFACE } from '@/components/base/dropdown/menu-styles';
import { Input } from '@/components/base/input/input';
import { RadioDot } from '@/components/base/radio/radio';
import { Select, SelectItem } from '@/components/base/select/select';
import { cx } from '@/utils/cx';
import { errorMessage } from '../../api';
import { t } from '../../i18n';
import { AIProviderLabel, AIProviderLogo } from '../components/ai-provider-logo';
import { EffortFlow } from '../components/effort-flow';
import { MenuChevron } from '../components/menu-chevron';
import { MenuDialog } from '../components/menu-dialog';
import { TableDateBound } from '../components/table-date-bound';
import { outsideTableDateBound } from '../components/table-column-range';
import { aiConnectionLabel, type AIConnection, type TaskProfile } from '../settings/ai-library-settings';
import { modelIsVisible, useAIModelVisibility, visibleAIModels } from '../settings/ai-model-visibility';
import { Help } from '../settings/section';
import { Note } from '../components/note';
import { aiModelLabel, aiSearchModelsKey, matchesAIModel, useAIConnectionModels, type AIEffort, type AIModel } from '../settings/use-ai-models';
import { assistantCopy as copy } from './assistant-workspace';
import { AssistantSuggestInput } from './assistant-suggest';

export const SEARCH_SCOPES = ['library', 'external', 'both'] as const;
const LIBRARY_FILTERS = ['q', 'performer', 'studio', 'tag', 'year', 'period', 'state', 'sort', 'translation_missing'] as const;
export const SEARCH_FIELDS = ['q', 'performer', 'studio', 'tag', 'year', 'state', 'sort', 'translation_missing', 'releaseFrom', 'releaseTo', 'outside'] as const;
const FILTER_ICONS = {
  q: RiPriceTag3Line, outside: RiPriceTag3Line, performer: RiUser3Line, studio: RiBuilding4Line, tag: RiPriceTag3Line,
  year: RiCalendarLine, period: RiCalendarLine, state: RiEyeLine, sort: RiSortDesc, translation_missing: RiTranslate2,
};
const years = Array.from({ length: new Date().getFullYear() - 1898 }, (_, index) => new Date().getFullYear() + 1 - index);
const FIELD_OPTIONS = {
  state: ['fresh', 'played', 'flagged', 'later'],
  sort: ['new', 'release', 'rating', 'dur'],
  translation_missing: ['zh-TW', 'zh-CN', 'en'],
} as const;
export type SearchScope = typeof SEARCH_SCOPES[number];
export type SearchField = typeof SEARCH_FIELDS[number];
export type SearchFilters = Partial<Record<SearchField, string>>;
const MENU_RADIO = 'flex w-full min-w-0 cursor-pointer items-center gap-2 px-2 text-text-primary outline-none transition-colors';

function ComposerPopover({ label, title, mark, count, side, disabled, children, expanded, onExpanded }: {
  label: string; title: string; count?: number; side: 'start' | 'end'; disabled: boolean;
  mark?: ReactNode; children: ReactNode; expanded?: boolean; onExpanded?(open: boolean): void;
}) {
  const trigger = useRef<HTMLButtonElement>(null);
  const [local, setLocal] = useState(false);
  const open = expanded ?? local;
  const setOpen = onExpanded ?? setLocal;
  const start = side === 'start';
  return <>
    <Button ref={trigger} type="button" size="small" variant="ghost"
      leadingIcon={start ? (open ? RiCloseLine : RiAddLine) : undefined} trailingIcon={start ? undefined : MenuChevron}
      iconOnly={start} data-ai-composer-trigger={side} data-has-filters={start && Boolean(count) || undefined}
      className="shrink-0"
      aria-label={label} title={title} disabled={disabled}
      aria-haspopup="dialog" aria-expanded={open && !disabled} onClick={() => setOpen(!open)}>
      <span className="flex min-w-0 items-center gap-1.5">{mark}<span className="truncate">{title}</span></span>
    </Button>
    <Popover triggerRef={trigger} isOpen={open && !disabled} onOpenChange={setOpen} placement={start ? 'top start' : 'top end'}
      shouldCloseOnInteractOutside={start ? outsideTableDateBound : undefined}
      offset={8} data-ai-composer-menu={side} className={cx(MENU_POPOVER_SURFACE, 'overscroll-contain')}>
      <MenuDialog aria-label={label} data-copy-choice-host="" className="flex min-w-0 flex-col outline-none">{children}</MenuDialog>
    </Popover>
  </>;
}

function SearchFieldInput({ field, value, onChange }: {
  field: SearchField; value: string; onChange(value: string): void;
}) {
  const label = copy('fields.' + field);
  if (field === 'state' || field === 'sort' || field === 'translation_missing' || field === 'year') {
    const choices = field === 'year' ? [...new Set([...(value ? [value] : []), ...years.map(String)])] : FIELD_OPTIONS[field];
    return <div className="flex min-w-0 flex-col gap-1.5">
      <Select aria-label={label} selectedKey={value || 'any'} triggerClassName="w-full"
        onSelectionChange={key => onChange(key && key !== 'any' ? String(key) : '')}>
        <SelectItem id="any">{copy('any')}</SelectItem>
        {choices.map(key => <SelectItem key={key} id={key}>
          {filterValueLabel(field, key)}
        </SelectItem>)}
      </Select>
    </div>;
  }
  if (field === 'outside') return <Input aria-label={label} placeholder={label} value={value} maxLength={100} onChange={onChange} />;
  return <AssistantSuggestInput label={label} placeholder={label} value={value} onChange={onChange}
    kind={field === 'q' ? 'work' : field === 'performer' || field === 'studio' || field === 'tag' ? field : undefined} />;
}

function filterValueLabel(field: SearchField, value: string) {
  if (field === 'translation_missing') return t('catalog:aiLibrary.' + value);
  if (field === 'state' || field === 'sort') return copy('options.' + value);
  return value;
}

export function SearchConditionPicker({ scope, filters, disabled, onScope, onChange, clear, open, setOpen, actions }: {
  scope: SearchScope; filters: SearchFilters; disabled: boolean; onScope(scope: SearchScope): void;
  onChange(field: SearchField, value: string): void; clear(): void;
  open: boolean; setOpen(open: boolean): void; actions: ReactNode;
}) {
  const count = Object.entries(filters).filter(([key, value]) => value?.trim()
    && (scope === 'external' ? key === 'outside' : scope === 'library' ? key !== 'outside' : true)).length;
  const label = copy('conditions');
  return <ComposerPopover label={label} title={copy('scopes.' + scope) + (count ? ' · ' + count : '')}
    count={count} side="start" disabled={disabled} expanded={open} onExpanded={setOpen}>
    <MenuHeading copyKey="catalog.libraryAssistant.scope">{copy('scope')}</MenuHeading>
    <RadioGroup className="flex flex-col gap-0.5" aria-label={copy('scope')} value={scope} onChange={key => onScope(key as SearchScope)}>
      {SEARCH_SCOPES.map(key => <ComposerRadio key={key} id={key} label={copy('scopes.' + key)} />)}
    </RadioGroup>
      <div className="mt-2 border-t border-separator-border pt-1">
        <div className="flex items-center justify-between gap-2">
          <MenuHeading copyKey="catalog.libraryAssistant.conditions">{label}</MenuHeading>
          {count ? <Button type="button" size="small" variant="ghost" className="shrink-0" onClick={clear}>
            <span data-copy-key="catalog.libraryAssistant.clearConditions">{copy('clearConditions')}</span>
          </Button> : null}
        </div>
        <ConditionRows scope={scope} filters={filters} onChange={onChange} />
      </div>
      <div className="mt-2 flex flex-col gap-2 border-t border-separator-border px-2 pt-2">{actions}</div>
  </ComposerPopover>;
}

function MenuHeading({ copyKey, children }: { copyKey: string; children: ReactNode }) {
  return <p data-ai-search-menu-heading="" className="min-w-0 text-body-2-medium text-text-secondary">
    <span data-copy-key={copyKey}>{children}</span>
  </p>;
}

function ConditionRows({ scope, filters, onChange }: { scope: SearchScope; filters: SearchFilters; onChange(field: SearchField, value: string): void }) {
  const [expanded, setExpanded] = useState<(typeof LIBRARY_FILTERS)[number] | 'outside'>();
  const fields = scope === 'external' ? ['outside'] as const : scope === 'library' ? LIBRARY_FILTERS : ['outside', ...LIBRARY_FILTERS] as const;
  return <div className="flex flex-col gap-0.5">
    {fields.map(field => {
      const Icon = FILTER_ICONS[field];
      const open = expanded === field;
      const value = field === 'period' ? [filters.releaseFrom, filters.releaseTo].filter(Boolean).join(' – ') : filters[field] || '';
      return <div key={field}>
        <Button type="button" variant="ghost" size="small" leadingIcon={Icon} trailingIcon={MenuChevron}
          data-ai-search-menu-row="" data-ai-search-filter-row="" className="w-full justify-start text-left"
          aria-expanded={open} onClick={() => setExpanded(open ? undefined : field)}>
          <span data-copy-key={'catalog.libraryAssistant.fields.' + field}>{copy('fields.' + field)}</span>
          {value ? <span className="ml-2 truncate text-caption-1-regular text-text-secondary">{field === 'period' ? value : filterValueLabel(field, value)}</span> : null}
        </Button>
        {open ? <div className="px-2 py-2">
          {field === 'period' ? <div className="inline-grid w-full grid-cols-2 gap-2">
            {(['releaseFrom', 'releaseTo'] as const).map(bound => <TableDateBound key={bound} label={copy('fields.' + bound)}
              value={filters[bound] || ''} years={years} latest="" loading={false} onChange={next => onChange(bound, next)} />)}
          </div> : <SearchFieldInput field={field} value={value} onChange={next => onChange(field, next)} />}
        </div> : null}
      </div>;
    })}
  </div>;
}

const effortLabel = (effort: AIEffort) => t('settings:aiLibrary.effortOptions.' + effort);

export function SearchModelPicker({ providers, fallback, value, onChange, disabled }: {
  providers: AIConnection[]; fallback?: TaskProfile; value: TaskProfile | null;
  onChange(value: TaskProfile | null): void; disabled: boolean;
}) {
  const current = value ?? fallback;
  const client = useQueryClient();
  const catalog = current && client.getQueryData<{ models: AIModel[] }>(aiSearchModelsKey(current.provider));
  const label = current && aiModelLabel(current.model, catalog?.models.find(model => model.id === current.model)?.label);
  const connections = providers.filter(row => row.configured);
  const unconfigured = providers.filter(row => !row.configured);
  return <ComposerPopover label={copy('modelPicker')} title={label || copy('modelPicker')}
    mark={current ? <AIProviderLogo provider={current.provider} /> : undefined}
    side="end" disabled={disabled}>
    {connections.length ? <SearchModelChoices connections={connections} fallback={fallback} value={value} onChange={onChange} />
      : <>
        <MenuHeading copyKey="catalog.libraryAssistant.modelPicker">{copy('modelPicker')}</MenuHeading>
        <div className="px-2 py-1.5">
          <Help><span data-copy-key="settings.aiLibrary.taskConnectFirst">{t('settings:aiLibrary.taskConnectFirst')}</span></Help>
        </div>
      </>}
    {unconfigured.length || !connections.length ? <div data-ai-provider-setup=""
      className="mt-1 flex min-h-8 items-center justify-between gap-2 border-t border-separator-border px-2 py-1.5">
      {unconfigured.length ? <div className="flex min-w-0 items-center gap-2 text-text-secondary">
        <span role="img" aria-label={unconfigured.map(aiConnectionLabel).join(' · ')} className="flex shrink-0 items-center gap-1">
          {unconfigured.map(row => <span key={row.id} title={aiConnectionLabel(row)} className="flex">
            <AIProviderLogo provider={row.id} className="size-3.5" />
          </span>)}
        </span>
        <span className="truncate text-caption-1-regular" data-copy-key="settings.aiLibrary.keyMissing">
          {t('settings:aiLibrary.keyMissing')}
        </span>
      </div> : null}
      <LinkButton href="/settings/ai" size="xs" variant="secondary" className="ml-auto shrink-0" data-copy-interact="">
        <span data-copy-key="catalog.aiLibrary.configure">{t('catalog:aiLibrary.configure')}</span>
      </LinkButton>
    </div> : null}
  </ComposerPopover>;
}

function SearchProviderChoices({ connections, value, onChange }: {
  connections: AIConnection[]; value: string; onChange(id: string): void;
}) {
  return <div className="border-b border-separator-border pb-1.5">
    <MenuHeading copyKey="catalog.aiLibrary.provider">{t('catalog:aiLibrary.provider')}</MenuHeading>
    <RadioGroup aria-label={t('catalog:aiLibrary.provider')} value={value} onChange={onChange}
      className="flex flex-col gap-0.5 px-1">
      {connections.map(row => <Radio key={row.id} value={row.id} data-ai-search-menu-row=""
        aria-label={aiConnectionLabel(row)}
        className={cx(MENU_RADIO, 'py-1 text-body-2-medium')}>
        <AIProviderLabel provider={row.id} label={aiConnectionLabel(row)} />
      </Radio>)}
    </RadioGroup>
  </div>;
}

function SearchModelChoices({ connections, fallback, value, onChange }: {
  connections: AIConnection[]; fallback?: TaskProfile; value: TaskProfile | null; onChange(value: TaskProfile | null): void;
}) {
  const [browsing, setBrowsing] = useState<string>();
  const [modelQuery, setModelQuery] = useState('');
  const connection = connections.find(row => row.id === (browsing ?? value?.provider ?? fallback?.provider)) ?? connections[0];
  const catalog = useAIConnectionModels(connection.id);
  const visibility = useAIModelVisibility(connection);
  const saved: AIModel = { id: connection.model, label: connection.model, efforts: connection.efforts,
    default_efforts: connection.default_efforts, effort_reported: connection.effort_reported };
  const remoteModels = catalog.data?.models ?? [];
  const models = saved.id && !remoteModels.some(row => row.id === saved.id) ? [saved, ...remoteModels] : remoteModels;
  const offered = visibleAIModels(models, visibility);
  const visible = offered.filter(model => matchesAIModel(model, modelQuery));
  const current = value ?? fallback;
  const currentModel = current?.provider === connection.id ? models.find(model => model.id === current.model) : undefined;
  const efforts = currentModel?.efforts ?? [];
  const activeEffort = current && efforts.includes(current.effort) ? current.effort : currentModel?.default_efforts?.search ?? 'default';
  return <>
    {connections.length > 1 ? <SearchProviderChoices connections={connections} value={connection.id}
      onChange={id => { setBrowsing(id); setModelQuery(''); }} /> : null}
    <div className="flex min-h-9 items-center justify-between gap-1 pr-1">
      <MenuHeading copyKey="catalog.libraryAssistant.modelPicker">{copy('modelPicker')}</MenuHeading>
      <div className="flex min-w-0 items-center gap-1">
        {connections.length === 1 ? <span className="px-1 text-caption-1-regular text-text-secondary">
          <AIProviderLabel provider={connection.id} label={aiConnectionLabel(connection)} />
        </span> : null}
        {fallback && value ? <Button type="button" iconOnly leadingIcon={RiRestartLine} size="small" variant="ghost"
          aria-label={copy('useConfiguredModel')} title={copy('useConfiguredModel')}
          onClick={() => { onChange(null); setBrowsing(undefined); setModelQuery(''); }} /> : null}
      </div>
    </div>
    {offered.length > 10 || modelQuery ? <div className="px-2 pb-2"><Input aria-label={copy('filterModels')} placeholder={copy('filterModels')}
      value={modelQuery} onChange={setModelQuery} /></div> : null}
    <RadioGroup aria-label={copy('modelPicker')} value={current?.provider === connection.id ? current.model : ''}
      className="flex max-h-48 flex-col gap-0.5 overflow-y-auto"
      onChange={id => {
        const model = models.find(option => option.id === id);
        if (model) onChange({ provider: connection.id, model: model.id, effort: model.default_efforts?.search ?? 'default' });
      }}>
      {visible.map(model => <ComposerRadio key={model.id} id={model.id} label={aiModelLabel(model.id, model.label)} />)}
    </RadioGroup>
    {!catalog.isPending && !catalog.error && !visible.length ? <Help>
      {copy(models.length && !offered.length ? 'noVisibleModels' : 'noModelsFound')}
    </Help> : null}
    {currentModel && !modelIsVisible(visibility, currentModel.id) ? <Help>{copy('currentModelHidden')}</Help> : null}
    {catalog.isPending ? <div className="px-2 py-1.5">
      <AgentThinking variant="spin" showTimer={false} label={t('settings:aiLibrary.modelsLoading')} />
    </div> : null}
    {catalog.error ? <Note tone="error" action={
      <Button type="button" size="small" variant="secondary" disabled={catalog.isFetching} onClick={() => void catalog.refetch()}>
        {copy('retryModels')}
      </Button>
    }>{errorMessage(catalog.error)}</Note> : null}
    {currentModel && current && efforts.length > 1 ? <SearchEffort efforts={efforts} value={activeEffort}
      onChange={effort => onChange({ ...current, effort })} /> : null}
    {currentModel?.effort_reported === false ? <Help>{t('settings:aiLibrary.effortUnreported')}</Help> : null}
  </>;
}

function ComposerRadio({ id, label }: { id: string; label: string }) {
  return <Radio value={id} data-ai-search-menu-row="" className={MENU_RADIO}>
    {({ isSelected }) => <>
      <span className="min-w-0 flex-1 wrap-anywhere text-body-medium">{label}</span>
      <RadioDot selected={isSelected} />
    </>}
  </Radio>;
}

function SearchEffort({ efforts, value, onChange }: { efforts: AIEffort[]; value: AIEffort; onChange(effort: AIEffort): void }) {
  const title = t('settings:aiLibrary.effort');
  const index = Math.max(0, efforts.indexOf(value));
  const highest = index === efforts.length - 1;
  const stopPosition = (stop: number) => `${stop / (efforts.length - 1) * 100}%`;
  return <Slider data-ai-search-effort="" value={index} minValue={0} maxValue={efforts.length - 1}
    onChange={next => onChange(efforts[next])}>
    <Label className="text-body-medium text-text-primary">
      <span data-copy-key="settings.aiLibrary.effort" className="text-text-secondary">{title}</span>{' '}{effortLabel(value)}
    </Label>
    <div className="flex justify-between text-caption-1-regular text-text-secondary" aria-hidden="true">
      <span data-copy-key="catalog.libraryAssistant.effortFaster">{copy('effortFaster')}</span>
      <span data-copy-key="catalog.libraryAssistant.effortDeeper">{copy('effortDeeper')}</span>
    </div>
    <div data-ai-search-effort-surface="">
      {highest ? <EffortFlow /> : null}
      <SliderTrack data-ai-search-effort-track="">
        {!highest ? <>
          <span data-ai-search-effort-fill="" style={{ '--effort-fill-position': stopPosition(index) } as CSSProperties} aria-hidden />
          <span data-ai-search-effort-stops="" aria-hidden>{efforts.map((stop, position) =>
            <i key={stop} data-filled={position < index || undefined} style={{ '--effort-stop-position': stopPosition(position) } as CSSProperties} />)}</span>
        </> : null}
        <SliderThumb aria-label={title} data-ai-search-effort-thumb="" />
      </SliderTrack>
    </div>
  </Slider>;
}
