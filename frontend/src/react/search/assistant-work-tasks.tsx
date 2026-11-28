import { useRef, useState, type ReactNode } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Header, Menu, MenuItem, MenuSection, Popover, Separator } from 'react-aria-components';
import { RiToolsLine } from '@remixicon/react';
import { coverUrl } from '@peach/card-art';
import { Button, ButtonLink } from '@/components/base/buttons/button';
import { MENU_ITEM, MENU_ITEM_ACTIVE, MENU_ITEM_INTERACTIVE, MENU_ITEMS_CONTAINER, MENU_POPOVER_SURFACE, MENU_POPOVER_WIDTH } from '@/components/base/dropdown/menu-styles';
import { cx } from '@/utils/cx';
import { apiGet, errorMessage } from '../../api';
import { DURATION_TAGS } from '../../core';
import { tagLabel } from '../../core/tags';
import { interfaceLanguage, t } from '../../i18n';
import { applySavedItem, ItemEditDialog, type MetadataSuggestion } from '../item-detail/item-edit';
import { fetchItem, itemKey, type DetailItem } from '../item-detail/item-detail';
import { LibraryAIPanel, type TranslationLanguage } from '../item-detail/library-ai-panel';
import { CUSTOM_TASK_EDITOR_URL, type FixedTaskShortcut } from '../settings/ai-custom-tasks';
import { ErrorText, Help } from '../settings/section';
import { busyProps, useAction } from '../settings/use-action';
import { AI_ASSET_TASKS } from '../settings/use-ai-models';
import { MenuChevron } from '../components/menu-chevron';
import { DUPLICATES_KEY, DUPLICATES_URL, type DuplicatesData } from '../duplicates/duplicates';
import { SearchResultSkeleton, SearchWorks, uniqueLibraryWorks, workTitle, type SearchResult, type SearchWork } from './assistant-results';
import { AssistantSuggestInput } from './assistant-suggest';
import { assistantCopy as copy } from './assistant-workspace';

const WORK_TASKS = [...AI_ASSET_TASKS, 'metadata', 'organize'] as const;
export type WorkTask = typeof WORK_TASKS[number];
export type WorkTaskPlan = { kind: WorkTask; target: string; language?: TranslationLanguage; metadata?: MetadataSuggestion };

export function WorkTaskButtons({ choose }: { choose(task: WorkTask): void }) {
  return <>
      {WORK_TASKS.map(task => <Button key={task} size="small" variant="secondary" data-copy-interact=""
        data-ai-button="example" className="min-w-0 max-w-full [&>span]:min-w-0 [&>span]:shrink"
        onClick={event => { if (!event.altKey) choose(task); }}>
        <span className="whitespace-normal wrap-anywhere" data-copy-key={'catalog.libraryAssistant.workTask.' + task}>
          {copy('workTask.' + task)}
        </span>
      </Button>)}
  </>;
}

export function WorkTaskMenu({ choose, chooseFixed, fixedTasks, selected, disabled }: {
  choose(task: WorkTask): void; chooseFixed(id: string): void;
  fixedTasks?: FixedTaskShortcut[]; selected?: string; disabled: boolean;
}) {
  const trigger = useRef<HTMLButtonElement>(null);
  const editing = useRef(false);
  const [open, setOpen] = useState(false);
  const label = copy('workTools');
  return <>
    <Button ref={trigger} size="xs" variant="ghost" leadingIcon={RiToolsLine} trailingIcon={MenuChevron} data-ai-button="footer"
      disabled={disabled} aria-haspopup="menu" aria-expanded={open}
      onClick={event => { if (!event.altKey) setOpen(!open); }}>
      <span data-copy-key="catalog.libraryAssistant.workTools">{label}</span>
    </Button>
    <Popover triggerRef={trigger} isOpen={open} onOpenChange={setOpen} placement="top end" offset={8}
      className={cx(MENU_POPOVER_SURFACE, MENU_POPOVER_WIDTH)}
      isNonModal={new URLSearchParams(location.search).has('edit')}
      shouldCloseOnInteractOutside={element => !element.closest('[data-copy-editor]')}>
      <div onPointerDownCapture={event => { editing.current = event.altKey; }}
        onKeyDownCapture={event => { editing.current = event.altKey; }}>
        <Menu aria-label={label} autoFocus="first" className={MENU_ITEMS_CONTAINER} data-copy-interact="">
          {WORK_TASKS.map(task => {
            const key = 'workTask.' + task;
            return <MenuItem key={task} id={task} textValue={copy(key)} className={cx(MENU_ITEM, MENU_ITEM_INTERACTIVE)}
              onAction={() => {
                if (editing.current) return;
                setOpen(false);
                choose(task);
              }}><span data-copy-key={'catalog.libraryAssistant.' + key}>{copy(key)}</span></MenuItem>;
          })}
          {fixedTasks ? <>
            <Separator className="my-1 border-t border-separator-border" />
            <MenuSection className="flex flex-col gap-1">
              <Header className="px-2 pt-1 text-caption-1-medium text-text-secondary" data-copy-key="catalog.libraryAssistant.fixedTasks">
                {copy('fixedTasks')}
              </Header>
              {fixedTasks.map(task => <MenuItem key={task.id} id={task.id} textValue={task.name}
                className={cx(MENU_ITEM, MENU_ITEM_INTERACTIVE, selected === task.id && MENU_ITEM_ACTIVE)}
                onAction={() => {
                  if (editing.current) return;
                  setOpen(false);
                  chooseFixed(task.id);
                }}>
                <span className="min-w-0 wrap-anywhere">{task.name}</span>
              </MenuItem>)}
              <MenuItem id="manage-fixed-tasks" href={CUSTOM_TASK_EDITOR_URL} onAction={() => setOpen(false)}
                className={cx(MENU_ITEM, MENU_ITEM_INTERACTIVE)}>
                <span data-copy-key="catalog.libraryAssistant.manageFixedTasks">{copy('manageFixedTasks')}</span>
              </MenuItem>
            </MenuSection>
          </> : null}
        </Menu>
      </div>
    </Popover>
  </>;
}

export function WorkTaskWorkspace({ task, library, children }: {
  task: WorkTask; library: string; children?: ReactNode;
}) {
  return <section data-ai-search-current="" className="flex min-w-0 flex-col gap-4">
    <p className="ml-auto assistant-message-width rounded-2xl rounded-br-md bg-background-primary-default px-4 py-2.5 text-body-regular text-text-primary"
      data-copy-key={'catalog.libraryAssistant.workTask.' + task}>{copy('workTask.' + task)}</p>
    {children ?? <AssistantWorkTask plan={{ kind: task, target: '' }} library={library} />}
  </section>;
}

const WORK_RESULTS_KEY = ['assistant-work-results'];

export function AssistantWorkTask({ plan, library }: { plan: WorkTaskPlan; library: string }) {
  return plan.kind === 'organize' ? <OrganizeLibrary />
    : <ChooseWork task={plan.kind} library={library} target={plan.target} language={plan.language} metadata={plan.metadata} />;
}

function ChooseWork({ task, library, target, language, metadata }: {
  task: Exclude<WorkTask, 'organize'>; library: string; target: string; language?: TranslationLanguage; metadata?: MetadataSuggestion;
}) {
  const [input, setInput] = useState(target);
  const [query, setQuery] = useState(target);
  const [picked, setPicked] = useState<SearchWork | null>(null);
  const client = useQueryClient();
  const params = new URLSearchParams({ sort: 'new', limit: '24', count: '0' });
  if (query) params.set('q', query);
  if (library) params.set('library', library);
  const result = useQuery({
    queryKey: [...WORK_RESULTS_KEY, library, query],
    queryFn: ({ signal }) => apiGet<SearchResult>('/api/items?' + params, signal),
  });
  const refresh = (id: number) => {
    void client.invalidateQueries({ queryKey: itemKey(id) });
    void client.invalidateQueries({ queryKey: WORK_RESULTS_KEY });
  };
  const selected = picked ? result.data?.items.find(work => work.id === picked.id) ?? picked : null;
  const shown = selected ? { items: [selected] } : result.data && { ...result.data, items: uniqueLibraryWorks(result.data.items).slice(0, 6) };
  return <>
    <div className="relative z-10 flex flex-col gap-2">
      <p className="text-body-2-medium text-text-primary" data-copy-key="catalog.libraryAssistant.chooseWork">{copy('chooseWork')}</p>
      <form className="flex min-w-0 items-start gap-2" onSubmit={event => { event.preventDefault(); setPicked(null); setQuery(input.trim()); }}>
        <div className="min-w-0 flex-1">
          <AssistantSuggestInput kind="work" label={copy('fields.q')} placeholder={copy('fields.q')} value={input}
            onChange={setInput} workLibrary={library}
            onWorkPick={work => { setPicked(work); setQuery(work.code || workTitle(work)); }} />
        </div>
        <Button type="submit" size="medium" variant="secondary" className="h-9 shrink-0">{copy('sendSearch')}</Button>
      </form>
    </div>
    {result.isPending && !selected ? <SearchResultSkeleton source="library" /> : null}
    {result.error ? <ErrorText>{errorMessage(result.error)}</ErrorText> : null}
    {shown ? <SearchWorks result={shown} source="library" actions={work => {
      const id = work.id;
      if (!id) return null;
      return task === 'metadata' ? <MetadataAction id={id} suggestion={metadata} /> :
        <LibraryAIPanel id={id} code={work.code} cover={work.has_cover ? coverUrl(work, 2) : ''}
          initialTask={task} initialLanguage={language ?? interfaceLanguage} inlineLabel={t('catalog:aiLibrary.' + task)}
          onSaved={() => refresh(id)} />;
    }} /> : null}
  </>;
}

const EDIT_TAGS = { tagLabel, isDurationTag: (tag: string) => DURATION_TAGS.has(tag), tagCandidates: () => [] };

function MetadataAction({ id, suggestion }: { id: number; suggestion?: MetadataSuggestion }) {
  const action = useAction();
  const [item, setItem] = useState<DetailItem | null>(null);
  return <div className="flex min-w-0 flex-col items-end gap-1">
    <Button size="small" variant="secondary" disabled={Boolean(action.busy)} {...busyProps(action.busy === 'load')}
      onClick={() => void action.run('load', signal => fetchItem(id, signal), setItem)}>
      {copy('editMetadata')}
    </Button>
    {action.error ? <ErrorText>{action.error}</ErrorText> : null}
    {item ? <ItemEditDialog item={item} helpers={EDIT_TAGS} suggestion={suggestion} close={() => setItem(null)}
      onSaved={applySavedItem} /> : null}
  </div>;
}

function OrganizeLibrary() {
  const duplicates = useQuery({
    queryKey: DUPLICATES_KEY,
    queryFn: ({ signal }) => apiGet<DuplicatesData>(DUPLICATES_URL, signal),
  });
  const groups = duplicates.data?.groups?.slice(0, 3) ?? [];
  return <div className="flex flex-col gap-2">
    {duplicates.isPending ? <span className="skeleton-sheen h-4 w-40" /> : null}
    {duplicates.error ? <ErrorText>{errorMessage(duplicates.error)}</ErrorText> : null}
    {duplicates.data ? <Help>{t('catalog:libraryAssistant.duplicateCount', { count: duplicates.data.total })}</Help> : null}
    {groups.length ? <ul className="flex flex-col gap-2">
      {groups.map(group => <li key={group.files.map(file => file.id).join(',')}
        className="rounded-xl bg-background-primary-default px-3 py-2">
        <p className="text-body-2-medium text-text-primary">{group.code}</p>
        <p className="text-caption-1-regular text-text-secondary"
          data-copy-key={'catalog.libraryAssistant.' + (group.identical ? 'duplicateExact' : 'duplicateCompare')}>
          {t('catalog:libraryAssistant.' + (group.identical ? 'duplicateExact' : 'duplicateCompare'), { count: group.count })}
        </p>
      </li>)}
    </ul> : null}
    <div className="flex flex-wrap gap-2">
      <ButtonLink size="small" variant="secondary" href="/duplicates">{copy('openDuplicates')}</ButtonLink>
      <ButtonLink size="small" variant="secondary" href="/data-cleanup/organize">{copy('openOrganization')}</ButtonLink>
      <ButtonLink size="small" variant="secondary" href="/review">{copy('openReview')}</ButtonLink>
    </div>
  </div>;
}
