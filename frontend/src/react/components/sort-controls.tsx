import { Children, Fragment, isValidElement, useRef, useState, useSyncExternalStore, type ComponentProps, type ReactElement, type ReactNode } from 'react';
import { Popover, VisuallyHidden } from 'react-aria-components';
import { Checkbox } from '@/components/base/checkbox/checkbox';
import { Button } from '@/components/base/buttons/button';
import { MENU_POPOVER_SURFACE } from '@/components/base/dropdown/menu-styles';
import { cx } from '@/utils/cx';
import { appSettingsStore } from '../../appearance/settings';
import { normalizeSortControl, type SortControlGroup, type SortControlPreference } from '../../sort-controls';
import type { SortDirection } from '../../sort-preferences';
import { t } from '../../i18n';
import { useSaveSettings } from '../settings-panel/settings-data';
import { useSidebarReorder } from '../sidebar/use-sidebar-reorder';
import type { EntitySortKey } from '../entity-filter/entity-filter';
import { NavigationDropLine, NavigationOrderRows } from './navigation-order';
import { FILTER_TOOLBAR_POPOVER_OFFSET, FilterIconButton } from './filter-glass';
import { IconSwap } from './icon-swap';
import { MenuDialog } from './menu-dialog';
import { FilterChoiceList } from './filter-dropdown';
import { ToolbarFieldDrag, type ToolbarFieldDragProps } from './table-column-filter';
import { Note } from './note';
import { spriteGlyph } from './sprite-glyph';
import { errorMessage } from '../../api';
import './sort-controls.css';

const More = spriteGlyph('ellipsis');
const Up = spriteGlyph('arrow-up');
const Down = spriteGlyph('arrow-down');

export interface SortFieldFilter {
  active: boolean;
  required?: boolean;
  render(close: () => void): ReactNode;
  shouldCloseOnInteractOutside?(element: Element): boolean;
}

interface ToolbarField {
  key: string;
  label: string;
  node: ReactElement;
}

function collectToolbarFields(children: ReactNode): ToolbarField[] {
  return Children.toArray(children).flatMap(child => {
    if (!isValidElement<{ children?: ReactNode; orderKey?: string; label?: string }>(child)) return [];
    if (child.type === Fragment) return collectToolbarFields(child.props.children);
    const { orderKey, label } = child.props;
    return orderKey && label ? [{ key: orderKey, label, node: child }] : [];
  });
}

/** 筛选字段、排序项及自定义菜单共用侧栏拖拽。 */
export function SortKeys({ sorts, onSort, group = 'catalog', follow = false, filters, fields, fieldGroup }: {
  sorts: readonly EntitySortKey[]; onSort(key: string, dir: SortDirection): void; group?: SortControlGroup; follow?: boolean;
  filters?: Record<string, SortFieldFilter>;
  fields?: ReactNode;
  fieldGroup?: ComponentProps<'span'>;
}) {
  const store = appSettingsStore();
  useSyncExternalStore(store.subscribe, store.version);
  const preference = normalizeSortControl(group, store.value.sortControls?.[group]);
  const save = useSaveSettings('sort-controls');
  const commit = (next: SortControlPreference) => {
    const value = normalizeSortControl(group, next);
    store.value.sortControls = { ...store.value.sortControls, [group]: value };
    store.save();
    save.mutate({ sortControls: { [group]: value } });
  };
  const list = useRef<HTMLSpanElement>(null);
  const reorder = useSidebarReorder(list, preference.order, order => commit({ ...preference, order }), () => {}, 'x', 'tab');
  const [open, setOpen] = useState(false);
  const [directionKey, setDirectionKey] = useState('');
  const directionTrigger = useRef<HTMLButtonElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const fieldItems = collectToolbarFields(fields);
  const labels = Object.fromEntries([...sorts, ...fieldItems].map(item => [item.key, item.label]));
  const fieldsByKey = new Map(fieldItems.map(item => [item.key, item.node]));
  const alwaysVisible = (key: string) => fieldsByKey.has(key) || !!(filters?.[key]?.required || filters?.[key]?.active);
  const editable = preference.order.filter(key => Object.hasOwn(labels, key));
  const visible = editable.filter(key => alwaysVisible(key) || !preference.hidden.includes(key));
  const current = sorts.find(sort => sort.key === directionKey && visible.includes(sort.key));
  const fieldFilter = current ? filters?.[current.key] : undefined;
  const closeDirection = () => setDirectionKey('');
  const defaults = normalizeSortControl(group, null);
  const customized = JSON.stringify(preference) !== JSON.stringify(defaults);
  const { ref: fieldRef, ...groupProps } = fieldGroup || {};
  const dragProps = (key: string): ToolbarFieldDragProps => {
    const bindings = reorder.bindings(key);
    const nudge = reorder.nudge(key);
    return {
      'data-tab': key,
      'data-dragging': reorder.picked?.key === key ? '' : undefined,
      'aria-keyshortcuts': 'Alt+ArrowLeft Alt+ArrowRight',
      style: { '--navigation-picked-left': `${reorder.picked?.bounds.left || 0}px`,
        '--navigation-picked-top': `${reorder.picked?.bounds.top || 0}px`,
        '--navigation-picked-width': `${reorder.picked?.bounds.width || 0}px`,
        '--sidebar-nudge': `${nudge.distance}px`, '--sidebar-delay': `${nudge.delay}ms` } as ToolbarFieldDragProps['style'],
      ...bindings,
      // Alt 点击由文案编辑器按实际命中的文字处理。
      onPointerDown: event => { if (!event.altKey) bindings.onPointerDown(event) },
    };
  };
  return <>
    <span {...groupProps} ref={node => {
      list.current = node;
      if (typeof fieldRef === 'function') return fieldRef(node);
      if (fieldRef) fieldRef.current = node;
    }} data-sort-controls={group} data-filter-fields={fieldItems.length ? '' : undefined}
      data-navigation-order={`sort-${group}`} data-navigation-axis="x"
      data-reordering={reorder.picked ? '' : undefined} onClickCapture={reorder.clickCapture}>
      {visible.map(key => {
        const field = fieldsByKey.get(key);
        if (field) return <ToolbarFieldDrag.Provider key={key} value={dragProps(key)}>{field}</ToolbarFieldDrag.Provider>;
        const sort = sorts.find(item => item.key === key)!;
        return <button key={key} type="button" {...dragProps(key)} data-entity-sort={key} data-entity-press=""
          data-follow-sort={follow ? key : undefined} data-filter-active={filters?.[key]?.active ? '' : undefined}
          aria-pressed={sort.pressed} aria-label={sort.ariaLabel || sort.label}
          aria-haspopup="dialog" aria-expanded={directionKey === key} onClick={event => {
            directionTrigger.current = event.currentTarget;
            setDirectionKey(key);
          }}>
          {sort.label}{sort.pressed && sort.dir ? <IconSwap a={Up} b={Down} state={sort.dir === 'asc' ? 'a' : 'b'} className="size-(--icon-inline)" /> : null}
        </button>;
      })}
      <NavigationDropLine reorder={reorder} />
    </span>
    <Popover triggerRef={directionTrigger} isOpen={!!current}
      onOpenChange={value => { if (!value) setDirectionKey('') }} placement="bottom end" offset={FILTER_TOOLBAR_POPOVER_OFFSET}
      shouldCloseOnInteractOutside={fieldFilter?.shouldCloseOnInteractOutside}
      className={cx(MENU_POPOVER_SURFACE, 'peach-react px-0 py-2', fieldFilter ? 'w-80' : 'w-40')}>
      {current ? <MenuDialog aria-label={current.label} data-sort-direction-menu="" className="outline-none">
        {fieldFilter ? <>
          {fieldFilter.render(closeDirection)}
          <div data-sort-menu-divider="" className="mx-3 my-2 border-t border-separator-border" aria-hidden />
        </> : null}
        <FilterChoiceList choices={(['asc', 'desc'] as const).map(id => ({
          id, label: t(id === 'asc' ? 'settings:shared.ascending' : 'settings:shared.descending'),
          selected: current.pressed && current.dir === id,
        }))} onSelect={id => {
          closeDirection();
          if (!current.pressed || current.dir !== id) onSort(current.key, id as SortDirection);
        }} />
      </MenuDialog> : null}
    </Popover>
    <FilterIconButton ref={trigger} data-sort-settings={group} label={t('catalog:sortControls.customize')}
      icon={More} aria-haspopup="dialog" aria-expanded={open} onPress={() => setOpen(true)} />
    <Popover triggerRef={trigger} isOpen={open} onOpenChange={setOpen} placement="bottom end" offset={4}
      className={cx('peach-react w-80', MENU_POPOVER_SURFACE)}>
      <MenuDialog aria-label={t('catalog:sortControls.customize')} data-sort-settings-dialog="" className="flex flex-col gap-3 overflow-y-auto p-3 outline-none">
        <h3 className="text-body-medium">{t('catalog:sortControls.title')}</h3>
        <NavigationOrderRows reset={false} labels={labels}
          order={{ label: t('catalog:sortControls.title'), keys: editable, defaults: defaults.order.filter(key => editable.includes(key)),
            commit: order => {
              const changed = [...order];
              commit({ ...preference, order: preference.order.map(key => editable.includes(key) ? changed.shift()! : key) });
            } }}
          render={key => <Checkbox size="sm" isSelected={alwaysVisible(key) || !preference.hidden.includes(key)} isDisabled={alwaysVisible(key)}
            onPointerDown={event => event.stopPropagation()}
            onChange={shown => commit({ ...preference,
              hidden: shown ? preference.hidden.filter(item => item !== key) : [...preference.hidden, key] })}>
            {labels[key]}
          </Checkbox>} />
        {customized ? <Button variant="secondary" size="small"
          onClick={() => commit(defaults)}>{t('catalog:sortControls.reset')}</Button> : null}
        {save.isError ? <Note tone="error">{t('catalog:sortControls.syncFailed', { error: errorMessage(save.error) })}</Note> : null}
      </MenuDialog>
    </Popover>
    <VisuallyHidden role="status" aria-live="polite">{reorder.announcement}</VisuallyHidden>
  </>;
}
