import { createContext, useContext, useMemo, useRef, useState, type ComponentProps, type PointerEvent, type ReactNode } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { Popover } from 'react-aria-components';
import { Checkbox } from '@/components/base/checkbox/checkbox';
import { Button } from '@/components/base/buttons/button';
import { LinkButton } from '@/components/base/buttons/link-button';
import { MenuChevron } from './menu-chevron';
import { MENU_ITEM, MENU_ITEM_ACTIVE, MENU_ITEM_INTERACTIVE, MENU_ITEMS_CONTAINER, MENU_POPOVER_SURFACE } from '@/components/base/dropdown/menu-styles';
import { cx } from '@/utils/cx';
import { errorMessage } from '../../api';
import { columnValueSelected, toggleColumnValue, type ColumnSelection } from '../../column-filters';
import { IndexSearch } from '../index/index-search';
import { MenuDialog } from './menu-dialog';
import { FILTER_TOOLBAR_POPOVER_OFFSET } from './filter-glass';
import { FilterMenuScroll } from './filter-menu-scroll';
import { Note } from './note';
import { ActivityStatus } from './activity-motion';
import { t } from '../../i18n';

export type ToolbarFieldDragProps = Pick<ComponentProps<'button'>, 'style' | 'aria-keyshortcuts' | 'onPointerDown'
  | 'onPointerMove' | 'onPointerUp' | 'onPointerCancel' | 'onLostPointerCapture' | 'onKeyDown' | 'onDragStart'> & {
    'data-tab': string; 'data-dragging'?: '';
  };
export const ToolbarFieldDrag = createContext<ToolbarFieldDragProps | null>(null);

export interface ColumnFilterOption { id: string; label: string; content?: ReactNode; count?: number; leading?: ReactNode | (() => ReactNode); searchTerms?: readonly string[]; disabled?: boolean; title?: string }
export interface ColumnFilterPage { items: ColumnFilterOption[]; nextOffset?: number }
interface ColumnFilterProps {
  id: string; label: string; copyKey?: string; values?: ColumnSelection; options?: readonly ColumnFilterOption[] | (() => readonly ColumnFilterOption[]);
  queryKey?: readonly unknown[]; searchable?: boolean;
  load?(signal: AbortSignal, search: string, offset: number): Promise<ColumnFilterPage>;
  onChange(values: ColumnSelection | undefined): void;
}

/** 列头菜单只在展开时挂载查询，关闭后取消未完成请求并回收短期缓存。 */
export function TableColumnFilter(props: ColumnFilterProps) {
  return <ColumnFilterPopover id={props.id} label={props.label} copyKey={props.copyKey} active={props.values !== undefined}>
    {() => <MenuDialog aria-label={t('catalog:columnFilter.label', { column: props.label })} className="outline-none">
      <ColumnFilterFields {...props} />
    </MenuDialog>}
  </ColumnFilterPopover>;
}

export function ColumnFilterPopover({ id, label, copyKey, active, view, toolbar, shouldCloseOnInteractOutside, children }: {
  id: string; label: string; copyKey?: string; active: boolean;
  orderKey?: string;
  toolbar?: boolean;
  view?: { anchor: boolean; onPointerEnter(event: PointerEvent<HTMLButtonElement>): void; onOpenChange(open: boolean): void };
  shouldCloseOnInteractOutside?(element: Element): boolean;
  children(close: () => void): ReactNode;
}) {
  const trigger = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const inToolbar = toolbar || !!view;
  const drag = useContext(ToolbarFieldDrag);
  const changeOpen = (next: boolean) => { setOpen(next); view?.onOpenChange(next) };
  const Trigger = inToolbar ? 'button' : LinkButton;
  const appearance = inToolbar ? {} : { variant: active ? 'primary' as const : 'secondary' as const, size: 'xs' as const, trailingIcon: MenuChevron };
  return <>
    <Trigger {...appearance} {...(inToolbar ? drag : null)} ref={trigger} type="button" data-filter-field={inToolbar ? '' : undefined}
      data-table-column-filter={id} data-filter-active={active ? '' : undefined}
      data-catalog-view={inToolbar ? id : undefined} data-glide-anchor={view?.anchor ? '' : undefined}
      data-entity-press={inToolbar ? '' : undefined} onPointerEnter={view?.onPointerEnter}
      className={inToolbar ? undefined : 'min-w-0 max-w-full justify-start [&>span]:min-w-0'}
      aria-label={t('catalog:columnFilter.label', { column: label })} aria-haspopup="dialog" aria-expanded={open}
      onKeyDown={inToolbar ? drag?.onKeyDown : event => {
        if (event.altKey || (event.key !== 'Enter' && event.key !== ' ')) return;
        // 表头的导航会处理 Enter 与空格。焦点在筛选键上时由筛选键打开自己的菜单。
        event.preventDefault();
        event.stopPropagation();
        changeOpen(true);
      }}
      onClick={event => { if (event.altKey) return; event.stopPropagation(); changeOpen(true) }}>
      <span className="truncate" data-copy-key={copyKey}>{label}</span>
    </Trigger>
    <Popover triggerRef={trigger} isOpen={open} onOpenChange={changeOpen} placement="bottom start" offset={inToolbar ? FILTER_TOOLBAR_POPOVER_OFFSET : 4}
      shouldCloseOnInteractOutside={shouldCloseOnInteractOutside}
      className={cx(MENU_POPOVER_SURFACE, 'peach-react w-80 overflow-hidden p-0')}>
      {children(() => changeOpen(false))}
    </Popover>
  </>;
}

export function ColumnFilterFields({ id, label, values, options = [], queryKey, searchable = true, load, onChange }: ColumnFilterProps) {
  const [search, setSearch] = useState('');
  const [visible, setVisible] = useState(24);
  const result = useInfiniteQuery({
    queryKey: [...(queryKey || ['table-column-filter', id]), search], enabled: !!load,
    initialPageParam: 0,
    queryFn: ({ signal, pageParam }) => load!(signal, search, pageParam),
    getNextPageParam: (last: ColumnFilterPage) => last.nextOffset,
    staleTime: 30_000, gcTime: 60_000,
  });
  const term = search.normalize('NFKC').toLocaleLowerCase();
  const localOptions = useMemo(() => typeof options === 'function' ? options() : options, [options]);
  const rows = load ? result.data?.pages.flatMap(page => page.items) || []
    : localOptions.filter(row => [row.label, ...(row.searchTerms || [])]
      .some(name => name.normalize('NFKC').toLocaleLowerCase().includes(term)));
  const complete = !load || (!!result.data && !result.hasNextPage);
  const all = values === undefined || (!Array.isArray(values) && values.exclude.length === 0)
    || (!search && complete && rows.length > 0 && rows.every(row => columnValueSelected(values, row.id)));
  const partial = !all && (!Array.isArray(values) || values.length > 0);
  const pending = !!load && result.isPending;
  const rowClass = cx(MENU_ITEM, !searchable && 'min-h-8 py-0.5');
  return <div className="flex flex-col gap-2">
    {searchable ? <div className="px-3 pt-3">
      <IndexSearch label={t('catalog:columnFilter.search', { column: label })}
        placeholder={t('catalog:columnFilter.search', { column: label })} value={search}
        onQuery={next => { setSearch(next); setVisible(24) }} />
    </div> : null}
    {load && result.isError ? <Note tone="error" action={<Button size="xs" variant="ghost"
      onClick={() => void (result.isFetchNextPageError ? result.fetchNextPage() : result.refetch())}>{t('shell:shared.retry')}</Button>}>
      {errorMessage(result.error)}</Note> : null}
    <FilterMenuScroll key={search} role="group" aria-label={label} data-column-filter-options=""
      className={cx(MENU_ITEMS_CONTAINER, 'pb-3', !searchable && 'pt-3')}
      onScroll={event => {
        const node = event.currentTarget;
        if (load && result.hasNextPage && !result.isFetching && node.scrollHeight - node.scrollTop - node.clientHeight < 100)
          void result.fetchNextPage({ cancelRefetch: false });
        if (!load && visible < rows.length && node.scrollHeight - node.scrollTop - node.clientHeight < 100)
          setVisible(current => current + 24);
      }}>
      <div className={cx(rowClass, MENU_ITEM_INTERACTIVE, all && MENU_ITEM_ACTIVE, 'focus-within:bg-dropdown-item-hover-background')}>
        <Checkbox slot={null} size="sm" isSelected={all} isIndeterminate={partial} isDisabled={pending}
          onChange={on => onChange(on ? undefined : [])} className="w-full">{t('shell:shared.all')}</Checkbox>
      </div>
      {(load ? rows : rows.slice(0, visible)).map(row => <div key={row.id} title={row.title} data-column-filter-offline={row.disabled || undefined}
        className={cx(rowClass, !row.disabled && MENU_ITEM_INTERACTIVE,
          columnValueSelected(values, row.id) && MENU_ITEM_ACTIVE, !row.disabled && 'focus-within:bg-dropdown-item-hover-background')}>
        <Checkbox slot={null} size="sm" aria-label={row.label} isSelected={columnValueSelected(values, row.id)}
          isDisabled={row.disabled}
          className="w-full min-w-0 [&>span:last-child]:min-w-0 [&>span:last-child]:flex-1"
          onChange={on => onChange(toggleColumnValue(values, row.id, on))}>
          <span className={cx('flex min-w-0 flex-1 items-center gap-2', row.disabled && 'text-text-tertiary')}>
            {typeof row.leading === 'function' ? row.leading() : row.leading}
            <span className="min-w-0 flex-1 truncate">{row.content ?? row.label}</span>
            {row.count == null ? null : <span className="shrink-0 text-text-tertiary tabular-nums">{row.count.toLocaleString()}</span>}
          </span>
        </Checkbox>
      </div>)}
      {load && (pending || result.isFetchingNextPage)
        ? <ActivityStatus kind="linear-dots" label={t(pending ? 'shell:spinner.loading' : 'shell:spinner.loadingMore')} />
        : load && result.hasNextPage ? <Button variant="secondary" size="small"
        onClick={() => void result.fetchNextPage({ cancelRefetch: false })}>
        {t('catalog:shared.loadMore')}</Button> : !load && rows.length > visible
          ? <Button variant="secondary" size="small" onClick={() => setVisible(current => current + 24)}>{t('catalog:shared.loadMore')}</Button> : null}
    </FilterMenuScroll>
    {!pending && !(load && result.isError) && !rows.length
      ? <span role="status" className="px-3 pb-3 text-caption-1-regular text-text-secondary">{t('catalog:columnFilter.noOptions')}</span> : null}
  </div>;
}
