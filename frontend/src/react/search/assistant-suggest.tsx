import { useEffect, useId, useState, type KeyboardEvent } from 'react';
import { useQuery } from '@tanstack/react-query';
import { InputBase } from '@/components/base/input/input';
import { apiGet } from '../../api';
import { cx } from '@/utils/cx';
import { ColumnFilterAvatar } from '../components/column-filter-avatar';
import { composingKey } from '../components/ime';
import { useOverlayScrollbar } from '../components/overlay-scrollbar';
import { uniqueLibraryWorks, WorkSuggestion, workTitle, type SearchResult, type SearchWork } from './assistant-results';
import type { SuggestResponse } from './search';

export function AssistantSuggestInput({ value, onChange, label, placeholder, kind, composer, disabled, workLibrary, onWorkPick, suggestions = true }: {
  value: string; onChange(value: string): void; label: string; placeholder?: string;
  suggestions?: boolean;
  kind?: 'performer' | 'studio' | 'tag' | 'work'; composer?: boolean; disabled?: boolean;
  workLibrary?: string; onWorkPick?(work: SearchWork): void;
}) {
  const id = useId();
  const listRef = useOverlayScrollbar<HTMLUListElement>();
  const [focused, setFocused] = useState(false);
  const [composing, setComposing] = useState(false);
  const [active, setActive] = useState<number | null>(null);
  const [term, setTerm] = useState('');
  const [dismissed, setDismissed] = useState(false);
  const query = (kind === 'tag' ? value.split(',').at(-1) ?? '' : value).trim();
  useEffect(() => {
    const timer = window.setTimeout(() => setTerm(query), 160);
    return () => window.clearTimeout(timer);
  }, [query]);
  const lookup = suggestions && focused && !disabled && !composing && !dismissed && Boolean(query) && query === term;
  const rich = workLibrary !== undefined;
  const search = useQuery({
    queryKey: ['assistant-suggest', kind, term],
    queryFn: ({ signal }) => apiGet<SuggestResponse>('/api/suggest?' + new URLSearchParams({
      q: term, limit: '8', ...(kind ? { kind: kind === 'work' ? 'asset' : kind } : {}),
    }), signal),
    enabled: lookup && !rich, staleTime: 30_000,
  });
  const works = useQuery({
    queryKey: ['assistant-work-suggest', workLibrary, term],
    queryFn: ({ signal }) => apiGet<SearchResult>('/api/items?' + new URLSearchParams({
      q: term, sort: 'new', limit: '24', count: '0', ...(workLibrary ? { library: workLibrary } : {}),
    }), signal),
    enabled: lookup && rich, staleTime: 30_000,
  });
  const options = (search.data?.groups ?? []).flatMap(group => group.items.map(item => ({ kind: group.kind, item }))).slice(0, 8);
  const workOptions = uniqueLibraryWorks(works.data?.items ?? []).slice(0, 6);
  const length = rich ? workOptions.length : options.length;
  const open = lookup && length > 0;
  const pick = (index: number) => {
    const work = workOptions[index];
    const next = rich ? work?.code || (work && workTitle(work)) : options[index]?.item.value;
    if (next !== undefined) {
      const prefix = kind === 'tag' ? value.slice(0, value.lastIndexOf(',') + 1) : '';
      onChange(prefix + next);
    }
    if (rich && work) onWorkPick?.(work);
    setActive(null); setDismissed(true);
  };
  const keyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (composing || composingKey(event.nativeEvent)) {
      if (event.key === 'Enter') event.preventDefault();
      return;
    }
    if (open && (event.key === 'ArrowUp' || event.key === 'ArrowDown')) {
      event.preventDefault();
      const step = event.key === 'ArrowUp' ? -1 : 1;
      const next = ((active ?? (step < 0 ? 0 : -1)) + step + length) % length;
      setActive(next);
      document.getElementById(id + '-' + next)?.scrollIntoView({ block: 'nearest' });
    } else if (open && active !== null && event.key === 'Enter') {
      event.preventDefault(); pick(active);
    } else if (open && event.key === 'Escape') {
      event.preventDefault(); event.stopPropagation(); setDismissed(true); setActive(null);
    }
  };
  const Field = composer ? 'input' : InputBase;
  return <div data-ai-search-suggest="" data-ai-search-suggest-composer={composer || undefined} className={cx(rich && 'relative')}>
    <Field type="text" {...(suggestions && {
      role: 'combobox', 'aria-autocomplete': 'list', 'aria-expanded': open,
      'aria-controls': open ? id : undefined, 'aria-activedescendant': open && active !== null ? id + '-' + active : undefined,
    } as const)}
      aria-label={label} placeholder={placeholder} data-ai-search-input={composer ? '' : undefined}
      {...(composer ? { 'data-ai-search-suggest-input': '', className: 'text-body-regular text-text-primary' }
        : { fieldClassName: rich ? 'h-9' : undefined })}
      value={value} readOnly={disabled} autoComplete="off" maxLength={composer ? 500 : kind === 'tag' ? 180 : 100}
      onFocus={() => { setFocused(true); setDismissed(false); }}
      onBlur={() => { setFocused(false); setActive(null); }}
      onCompositionStart={() => setComposing(true)} onCompositionEnd={() => setComposing(false)}
      onKeyDown={keyDown} onChange={event => { onChange(event.currentTarget.value); setActive(null); setDismissed(false); }} />
    {open ? <ul ref={listRef} id={id} role="listbox" aria-label={label} data-ai-search-suggestions="" className={cx(rich && 'absolute inset-x-0 top-full z-20 mt-1 max-h-60 overflow-auto rounded-xl border border-border-button-default bg-background-primary-default p-1 shadow-dropdown')}>
      {rich ? workOptions.map((item, index) => <li key={item.id} id={id + '-' + index} role="option" aria-selected={active === index}
        className="flex min-w-0 cursor-pointer items-center gap-2 rounded-lg p-2 text-body-2-medium text-text-primary hover:bg-dropdown-item-hover-background aria-selected:bg-dropdown-item-hover-background"
        onMouseDown={event => event.preventDefault()} onClick={() => pick(index)}><WorkSuggestion item={item} /></li>)
        : options.map(({ kind, item }, index) => {
        const avatar = kind === 'performer' || kind === 'creator' || kind === 'studio' || kind === 'agency';
        return <li key={kind + ':' + (item.id ?? item.entity_id ?? item.value)} id={id + '-' + index} role="option" aria-selected={active === index}
          className="flex min-w-0 cursor-pointer items-center gap-2 px-2 py-1.5 text-body-2-medium text-text-primary"
          onMouseDown={event => event.preventDefault()} onClick={() => pick(index)}>
          {avatar ? <ColumnFilterAvatar kind={kind} person={{ name: item.value,
            id: item.entity_id as number | undefined, has_image: Boolean(item.has_image), has_avatar: Boolean(item.has_avatar),
            image_version: item.image_version as string | undefined, logo_version: item.logo_version as string | undefined,
            avatar_focus: item.avatar_focus,
            rep: item.rep as number | undefined }} logo={item.has_logo ? item.value : undefined} /> : null}
          <span className="min-w-0 flex-1 truncate">{item.value}</span>
          {item.matched && item.matched !== item.value ? <span className="truncate text-caption-1-regular text-text-secondary">{item.matched}</span> : null}
        </li>;
      })}
    </ul> : null}
  </div>;
}
