import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react';
import { useSearchText } from '../components/use-search-text';
import { useQuery } from '@tanstack/react-query';
import { InputBase, TextField } from '@/components/base/input/input';
import { spriteGlyph } from '../components/sprite-glyph';
import { composingKey } from '../components/ime';
import { optionId, SuggestMenu, type SuggestKind, type SuggestOption } from '../follow-manage/follow-search';
import { t } from '../../i18n';

const SearchGlyph = spriteGlyph('search');
/** 停手多久才去问候选，同筛选本身的节律。 */
const SUGGEST_AFTER_MS = 300;

export interface IndexSearchProps {
  label: string; value: string; onQuery(q: string): void; placeholder?: string;
  /** 敲字时给候选：给了就在框下开一张建议下拉，上下键选、回车或点一下填进框并立刻筛。`key` 分开各处的缓存。 */
  suggest?: { key: string; kind?: SuggestKind; load(term: string, signal: AbortSignal): Promise<SuggestOption[]> };
}

/* 只读筛选不配提交按钮，节律见 `useSearchText`。筛选浮层里的那一枚是 `FilterSearch`，同一套节律。 */
export function IndexSearch(props: IndexSearchProps) {
  return props.suggest ? <SuggestingSearch {...props} suggest={props.suggest} /> : <PlainSearch {...props} />;
}

function PlainSearch({ label, value, onQuery, placeholder }: IndexSearchProps) {
  const search = useSearchText(value, onQuery);
  return (
    <div data-index-search="" className="ml-auto min-w-0 max-w-80 flex-1" {...search.composition}>
      <TextField aria-label={label} value={search.text} onChange={search.change}>
        <InputBase type="search" leadingIcon={SearchGlyph} spellCheck={false} autoComplete="off" enterKeyHint="search"
          placeholder={placeholder}
          onKeyDown={search.onKeyDown} />
      </TextField>
    </div>
  );
}

/* 带候选的那一种：筛选照旧停手就查，候选只是把想打的词提前摆出来。没有候选时不开下拉，
   不拿一张「没有建议」挡住下面正在变的结果；Esc 收起这一次的下拉，再敲字又开。 */
function SuggestingSearch({ label, value, onQuery, placeholder, suggest }: IndexSearchProps & { suggest: NonNullable<IndexSearchProps['suggest']> }) {
  const [text, setText] = useState(value);
  const [term, setTerm] = useState('');
  const [composing, setComposing] = useState(false);
  const [focused, setFocused] = useState(false);
  const [closedAt, setClosedAt] = useState<string | null>(null);
  const [active, setActive] = useState<string>();
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const field = useRef<HTMLDivElement>(null);
  const menu = useRef<HTMLElement>(null);
  const menuId = useId();
  useEffect(() => { clearTimeout(timer.current); setText(value) }, [value]);
  useEffect(() => () => clearTimeout(timer.current), []);
  const trimmed = text.trim();
  useEffect(() => {
    if (composing || !trimmed) { setTerm(''); return }
    const wait = setTimeout(() => setTerm(trimmed), SUGGEST_AFTER_MS);
    return () => clearTimeout(wait);
  }, [trimmed, composing]);
  const later = (next: string) => {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => onQuery(next.trim()), 300);
  };
  const wanted = !!trimmed && !composing && focused && closedAt !== text;
  const current = wanted && term === trimmed;
  const query = useQuery({
    queryKey: ['index-search-suggestions', suggest.key, term],
    queryFn: ({ signal }) => suggest.load(term, signal),
    enabled: current, retry: false, staleTime: 60_000,
  });
  // 候选就是框里这个词本身时不必再摆一遍。
  const options = current ? (query.data ?? []).filter(option => option.value.toLocaleLowerCase() !== trimmed.toLocaleLowerCase()) : [];
  const menuOpen = wanted && options.length > 0;
  const activeIndex = menuOpen ? options.findIndex(option => optionId(menuId, option) === active) : -1;
  const activeOption = options[activeIndex];
  const closeMenu = () => { setActive(undefined); setClosedAt(text) };
  const commit = (next: string) => {
    clearTimeout(timer.current);
    setActive(undefined);
    setClosedAt(next);
    setText(next);
    onQuery(next.trim());
  };
  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (composing || composingKey(event.nativeEvent)) return;
    if (event.key === 'Escape' && menuOpen) { event.preventDefault(); event.stopPropagation(); closeMenu(); return }
    if ((event.key === 'ArrowDown' || event.key === 'ArrowUp') && trimmed) {
      event.preventDefault();
      setClosedAt(null);
      if (!menuOpen) return;
      const next = activeIndex + (event.key === 'ArrowDown' ? 1 : -1);
      setActive(optionId(menuId, options[next < 0 ? options.length - 1 : next % options.length]!));
      return;
    }
    if (event.key === 'Enter') { event.preventDefault(); commit(activeOption?.value ?? text) }
  };
  return (
    <div ref={field} data-index-search="" className="ml-auto min-w-0 max-w-80 flex-1" onFocus={() => setFocused(true)}
      onBlur={(event) => {
        const next = event.relatedTarget;
        if (!event.currentTarget.contains(next) && !menu.current?.contains(next) && !next?.closest('[data-copy-editor]')) {
          setFocused(false); setActive(undefined);
        }
      }}>
      <InputBase type="search" role="combobox" aria-label={label} aria-autocomplete="list" aria-expanded={menuOpen}
        aria-controls={menuOpen ? menuId : undefined} aria-activedescendant={activeOption ? active : undefined}
        leadingIcon={SearchGlyph} spellCheck={false} autoComplete="off" enterKeyHint="search" placeholder={placeholder} value={text}
        onChange={(event) => {
          const next = event.currentTarget.value;
          setActive(undefined); setClosedAt(null); setText(next);
          if (!composing) later(next);
        }}
        onCompositionStart={() => { setComposing(true); setActive(undefined) }}
        onCompositionEnd={(event) => { setComposing(false); setText(event.currentTarget.value); later(event.currentTarget.value) }}
        onKeyDown={onKeyDown} />
      {menuOpen ? <SuggestMenu field={field} menu={menu} id={menuId} options={options} active={active}
        busy={query.isFetching} failed={false} label={t('catalog:searchSuggest.suggestionsFor', { label })}
        kind={suggest.kind ?? 'performer'} onPick={commit} onClose={closeMenu} /> : null}
    </div>
  );
}
