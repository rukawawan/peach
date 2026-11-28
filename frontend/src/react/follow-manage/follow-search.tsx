import { Fragment, useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode, type RefObject } from 'react';
import { RiSearchLine } from '@remixicon/react';
import { useQuery } from '@tanstack/react-query';
import { Popover } from 'react-aria-components';

import { Button } from '@/components/base/buttons/button';
import { InputBase } from '@/components/base/input/input';
import { MENU_ITEM, MENU_ITEM_INTERACTIVE, MENU_POPOVER_SURFACE } from '@/components/base/dropdown/menu-styles';
import { cx } from '@/utils/cx';
import type { FaceRef } from '../../card-art/markup';
import { t } from '../../i18n';
import { ActivityStatus } from '../components/activity-motion';
import { ColumnFilterAvatar } from '../components/column-filter-avatar';
import { composingKey } from '../components/ime';
import { busyProps } from '../settings/use-action';
import { SUGGEST_DEBOUNCE_MS } from './follow-manage';

const MENU_ROW = cx(MENU_ITEM, MENU_ITEM_INTERACTIVE, 'text-body-2-medium');

/** 候选行前那枚头像按哪一类实体画。 */
export type SuggestKind = 'creator' | 'performer' | 'studio' | 'agency' | 'series' | 'tag';
export interface SuggestOption { value: string; matched?: string; n?: number; group?: string; portrait?: FaceRef }
export const optionId = (menuId: string, option: SuggestOption) =>
  `${menuId}-${encodeURIComponent(JSON.stringify([option.group, option.value]))}`;

/** 敲字建议的下拉。只在输入框有焦点时开着，键盘上下键在里面走。
 *
 * 每组一个组名，行里先是名字本身，再是在哪儿见到的（归档站名、站方分类）和作品数：
 * 名字才是选中后要去查的东西，另外两样只帮人认出是不是他。
 *
 * 站上那一路要先问补全再问分类，实测一秒上下，这段时间得看得出在做事：空着像是敲了没反应。
 * 忙的那一行不是候选，上下键和回车这时不该选中一个「正在查找建议」。
 *
 * 定位和来源筛选同一个 react-aria `Popover`：它把高度压到字段下方真正剩下的空间，
 * 装不下就在菜单里滚。不翻到上方：每敲一个字建议条数都在变，翻来翻去读不成一张表。
 * 非模态是为了焦点留在输入框；页面一滚走字段它就收起，菜单自己的滚动不收。 */
export function SuggestMenu(
  { field, menu, id, options, active, busy, failed, label, kind, onPick, onClose }:
  {
    field: RefObject<HTMLDivElement | null>; menu: RefObject<HTMLElement | null>;
    id: string; options: SuggestOption[]; active?: string; busy: boolean; failed: boolean; label: string; kind: SuggestKind;
    onPick(value: string): void; onClose(): void;
  },
) {
  // 上下键走到菜单可见区外的那一行，把它滚进来；菜单外的页面不动。
  useEffect(() => {
    const panel = menu.current;
    const row = active && document.getElementById(active);
    if (!panel || !row) return;
    const frame = panel.getBoundingClientRect(), item = row.getBoundingClientRect();
    if (item.top < frame.top) panel.scrollTop += item.top - frame.top;
    else if (item.bottom > frame.bottom) panel.scrollTop += item.bottom - frame.bottom;
  }, [menu, active]);
  const groups: { label?: string; options: SuggestOption[] }[] = [];
  for (const option of options) {
    const last = groups.at(-1);
    if (last && last.label === option.group) last.options.push(option);
    else groups.push({ label: option.group, options: [option] });
  }
  const renderOption = (option: SuggestOption) => {
    const key = optionId(id, option);
    return (
      <button key={key} type="button" id={key} role="option" tabIndex={-1} data-copy-interact=""
        aria-selected={key === active} className={key === active ? cx(MENU_ROW, 'bg-background-secondary-default') : MENU_ROW}
        onMouseDown={(event) => event.preventDefault()}
        onClick={() => onPick(option.value)}>
        {option.portrait ? <ColumnFilterAvatar kind={kind} person={{ ...option.portrait, name: option.value }} /> : null}
        <span className="min-w-0 grow truncate text-left">{option.value}</span>
        {option.matched ? (
          <span className="shrink-0 text-caption-1-regular text-text-tertiary">{option.matched}</span>
        ) : null}
        {option.n ? (
          <span className="shrink-0 text-caption-1-regular tabular-nums text-text-tertiary">{option.n.toLocaleString()}</span>
        ) : null}
      </button>
    );
  };
  return (
    <Popover ref={menu} triggerRef={field} isOpen isNonModal shouldFlip={false} data-follow-suggest-popover=""
      onOpenChange={(open) => { if (!open) onClose() }}
      shouldCloseOnInteractOutside={element => !element.closest('[data-copy-editor]')}
      placement="bottom start" offset={4}
      className={cx(MENU_POPOVER_SURFACE, 'w-(--trigger-width) overscroll-contain')}>
      {options.length ? null : busy
        ? <div className="px-2 py-1.5" data-copy-key="follow.addCreatorSource.findingSuggestions">
          <ActivityStatus kind="radar" label={t('follow:addCreatorSource.findingSuggestions')} />
        </div>
        : <p role="status" className="px-2 py-1.5 text-caption-1-regular text-text-tertiary"
          data-copy-key={failed ? 'follow.addCreatorSource.suggestionsFailed' : 'follow.addCreatorSource.noSuggestions'}>
          {failed ? t('follow:addCreatorSource.suggestionsFailed') : t('follow:addCreatorSource.noSuggestions')}
        </p>}
      <div id={id} role="listbox" aria-label={label} aria-busy={busy || undefined} className="flex flex-col gap-1">
        {groups.map((group, index) => {
          const heading = `${id}-group-${index}`;
          const rows = group.options.map(renderOption);
          return group.label
            ? <div key={heading} role="group" aria-labelledby={heading} className="flex flex-col gap-1">
                <div id={heading} className="px-2 pt-1 text-caption-1-regular text-text-tertiary">{group.label}</div>
                {rows}
              </div>
            : <Fragment key={heading}>{rows}</Fragment>;
        })}
      </div>
    </Popover>
  );
}

export function FollowSearch({ label, placeholder, suggestionsLabel, value, setValue, search, suggest, kind,
  readOnly, busy, actions, suggestOnline }: {
  label: string; placeholder: string; suggestionsLabel: string; value: string; setValue(value: string): void;
  search(value: string): void; suggest(value: string, signal: AbortSignal): Promise<SuggestOption[]>;
  kind: 'creator' | 'performer'; readOnly: boolean; busy: boolean; actions?: ReactNode;
  suggestOnline?(value: string, signal: AbortSignal): Promise<SuggestOption[]>;
}) {
  const [composing, setComposing] = useState(false);
  const [focused, setFocused] = useState(false);
  const [closedAt, setClosedAt] = useState<string | null>(null);
  const [active, setActive] = useState<string>();
  const [term, setTerm] = useState('');
  const menuId = useId();
  const field = useRef<HTMLDivElement>(null);
  const menu = useRef<HTMLElement>(null);
  const text = value.trim();

  useEffect(() => {
    if (composing || !text || text.includes('/')) { setTerm(''); return }
    const timer = setTimeout(() => setTerm(text), SUGGEST_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [text, composing]);

  const canSuggest = Boolean(text) && !text.includes('/') && !composing && !busy && !readOnly;
  const current = canSuggest && term === text;
  const menuOpen = canSuggest && focused && closedAt !== value;
  const query = useQuery({
    queryKey: ['follow-manage', 'search-suggestions', kind, term],
    queryFn: ({ signal }) => suggest(term, signal),
    enabled: current && menuOpen,
    retry: false,
  });
  const online = useQuery({
    queryKey: ['follow-manage', 'online-performers', term],
    queryFn: ({ signal }) => suggestOnline!(term, signal),
    enabled: Boolean(suggestOnline) && current && menuOpen && term.length >= (/^[ -~]+$/.test(term) ? 3 : 2),
    staleTime: 5 * 60 * 1000,
    retry: false,
  });
  const local = current ? query.data ?? [] : [];
  const known = new Set(local.map(option => option.value.toLocaleLowerCase()));
  const options = current ? [...local, ...(online.data ?? []).filter(option => !known.has(option.value.toLocaleLowerCase()))] : [];
  const suggesting = !current || query.isFetching || online.isFetching;
  const activeIndex = menuOpen ? options.findIndex(option => optionId(menuId, option) === active) : -1;
  const activeOption = options[activeIndex];

  const closeMenu = () => { setActive(undefined); setClosedAt(value) };
  const submit = (input: string) => {
    const next = input.trim();
    if (!next || readOnly || busy || composing) return;
    setActive(undefined);
    setClosedAt(next);
    setValue(next);
    search(next);
  };
  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (composing || composingKey(event.nativeEvent)) return;
    if (event.key === 'Escape' && menuOpen) {
      event.preventDefault();
      event.stopPropagation();
      closeMenu();
      return;
    }
    if ((event.key === 'ArrowDown' || event.key === 'ArrowUp') && canSuggest) {
      event.preventDefault();
      setClosedAt(null);
      if (!menuOpen || !options.length) return;
      const next = activeIndex + (event.key === 'ArrowDown' ? 1 : -1);
      const option = options[next < 0 ? options.length - 1 : next % options.length]!;
      setActive(optionId(menuId, option));
    }
    if (event.key === 'Enter') {
      event.preventDefault();
      submit(activeOption?.value || value);
    }
  };

  return <form aria-busy={busy || undefined} className="flex flex-wrap items-end gap-2"
    onSubmit={event => { event.preventDefault(); submit(value) }}>
    <div ref={field} className="min-w-0 flex-1 basis-64" onFocus={() => setFocused(true)}
      onBlur={event => {
        const next = event.relatedTarget;
        if (!event.currentTarget.contains(next) && !menu.current?.contains(next) && !next?.closest('[data-copy-editor]')) {
          setFocused(false);
          setActive(undefined);
        }
      }}>
      <InputBase role="combobox" aria-label={label} aria-autocomplete="list" aria-expanded={menuOpen}
        aria-controls={menuOpen ? menuId : undefined} aria-activedescendant={activeOption ? active : undefined}
        placeholder={placeholder} value={value} leadingIcon={RiSearchLine}
        enterKeyHint="search" disabled={readOnly} onChange={event => {
          setActive(undefined);
          setClosedAt(null);
          setValue(event.currentTarget.value);
        }} onCompositionStart={() => { setComposing(true); setActive(undefined) }}
        onCompositionEnd={event => { setComposing(false); setValue(event.currentTarget.value) }} onKeyDown={onKeyDown} />
      {menuOpen ? <SuggestMenu field={field} menu={menu} id={menuId} options={options} active={active}
        busy={suggesting} failed={query.isError || online.isError} label={suggestionsLabel} kind={kind} onPick={submit} onClose={closeMenu} /> : null}
    </div>
    {actions}
    <Button type="submit" variant="primary" disabled={readOnly || !text} {...busyProps(busy)}>{t('follow:shared.search')}</Button>
  </form>;
}
