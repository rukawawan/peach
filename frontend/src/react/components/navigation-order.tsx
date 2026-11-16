import { useRef, useState, useSyncExternalStore, type CSSProperties, type ReactNode, type RefObject } from 'react';
import { Popover, VisuallyHidden } from 'react-aria-components';
import { MENU_POPOVER_SURFACE } from '@/components/base/dropdown/menu-styles';
import { Button } from '@/components/base/buttons/button';
import { Select, SelectItem } from '@/components/base/select/select';
import { appSettingsStore } from '../../appearance/settings';
import { esc } from '../../core';
import { errorMessage } from '../../api';
import { MANAGE_MENU_SECTIONS, MANAGE_SECTIONS } from '../../application/navigation-items';
import { NAVIGATION_GROUPS, navigationDefaults, navigationFixedKeys, normalizeNavigationOrder, type NavigationGroup } from '../../navigation-order';
import { useSaveSettings } from '../settings-panel/settings-data';
import { useSidebarReorder } from '../sidebar/use-sidebar-reorder';
import { useCommitNavigationOrder } from '../sidebar/sidebar-order';
import { showToast } from '../toaster';
import { MenuDialog } from './menu-dialog';
import { BoardTabs, type BoardTabsProps } from './board-tabs';
import { spriteGlyph } from './sprite-glyph';
import { useLibraryTints } from './library-tint';
import { LibraryLabel } from './library-label';
import { orderLibraries } from '../../library-catalog';
import { t } from '../../i18n';
import './navigation-order.css';

const More = spriteGlyph('ellipsis');
const Grip = spriteGlyph('grip-vertical');
const Up = spriteGlyph('chevron-up');
const Down = spriteGlyph('chevron-down');

export interface NavigationOrder {
  label: string;
  keys: readonly string[];
  defaults: readonly string[];
  commit(next: string[]): void;
}

export function useNavigationOrder(group: NavigationGroup): NavigationOrder {
  const store = appSettingsStore();
  useSyncExternalStore(store.subscribe, store.version);
  const save = useSaveSettings('navigation-order');
  const keys = normalizeNavigationOrder(group, store.value.navigationOrders[group]);
  return {
    label: NAVIGATION_GROUPS[group].label, keys, defaults: navigationDefaults(group),
    commit(next) {
      const ordered = normalizeNavigationOrder(group, next);
      store.value.navigationOrders = { ...store.value.navigationOrders, [group]: ordered };
      store.save();
      save.mutate({ navigationOrders: { [group]: ordered } }, {
        onError: cause => showToast(`navigation-save-${group}`, {
          html: esc(t('shell:navigationOrder.syncFailed', { error: errorMessage(cause) })), alert: true, timeout: 6000, action: null,
        }),
      });
    },
  };
}

export function restoreNavigationOrder(order: NavigationOrder) {
  const previous = [...order.keys];
  order.commit([...order.defaults]);
  showToast(`navigation-reset-${order.label}`, {
    html: t('shell:navigationOrder.resetDone'), alert: false, timeout: 6000,
    action: { label: t('shell:shared.undo'), run: () => order.commit(previous) },
  });
}

export function NavigationOrderMenu({ order }: { order: NavigationOrder }) {
  const [open, setOpen] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const reset = () => {
    restoreNavigationOrder(order);
    setOpen(false);
  };
  if (order.keys.join(',') === order.defaults.join(',')) return null;
  return <>
    <button ref={trigger} type="button" data-navigation-menu="" aria-label={t('shell:navigationOrder.menuLabel', { group: order.label })}
      aria-haspopup="dialog" aria-expanded={open} onClick={() => setOpen(true)}><More aria-hidden="true" /></button>
    <Popover triggerRef={trigger} isOpen={open} onOpenChange={setOpen} placement="bottom end" offset={4}
      className={`peach-react ${MENU_POPOVER_SURFACE}`}>
      <MenuDialog aria-label={t('shell:navigationOrder.menuLabel', { group: order.label })} className="flex flex-col gap-1 outline-none">
        <button type="button" className="rounded-md px-3 py-2 text-body-2-regular text-text-primary disabled:opacity-50"
          onClick={reset}>{t('shell:navigationOrder.resetGroup')}</button>
      </MenuDialog>
    </Popover>
  </>;
}

export function NavigationOrderRows({ order, labels, render, fixed = [], reset = true }: {
  order: NavigationOrder; labels: Readonly<Record<string, string>>; fixed?: readonly string[]; reset?: boolean;
  /** 行内显示的内容；缺省只写名字。读屏与按钮说明仍用 `labels`。 */
  render?: (key: string) => ReactNode;
}) {
  const list = useRef<HTMLDivElement>(null);
  const reorder = useSidebarReorder(list, order.keys, order.commit, () => {}, 'y', 'tab', fixed);
  const move = (index: number, delta: number) => {
    const next = [...order.keys];
    next.splice(index + delta, 0, next.splice(index, 1)[0]);
    order.commit(next);
  };
  return <div className="flex flex-col gap-3">
    <div ref={list} data-navigation-order="settings" data-navigation-axis="y" data-navigation-rows=""
      data-reordering={reorder.picked ? '' : undefined} onClickCapture={reorder.clickCapture}>
      {order.keys.map((key, index) => <div key={key} data-tab={key} role="group" tabIndex={0}
        aria-label={labels[key]} aria-keyshortcuts="Alt+ArrowUp Alt+ArrowDown"
        data-dragging={reorder.picked?.key === key ? '' : undefined}
        style={{ '--navigation-picked-left': `${reorder.picked?.bounds.left || 0}px`,
          '--navigation-picked-top': `${reorder.picked?.bounds.top || 0}px`,
          '--navigation-picked-width': `${reorder.picked?.bounds.width || 0}px`,
          '--navigation-picked-offset': `${reorder.picked?.offset || 0}px`,
          '--sidebar-nudge': `${reorder.nudge(key).distance}px`, '--sidebar-delay': `${reorder.nudge(key).delay}ms` } as CSSProperties}
        {...reorder.bindings(key)}>
        <Grip aria-hidden="true" /><span>{render ? render(key) : labels[key]}</span>
        <button type="button" data-order-step="" aria-label={t('shell:navigationOrder.moveUp', { name: labels[key] })}
          disabled={index === 0 || fixed.includes(key) || fixed.includes(order.keys[index - 1])}
          onClick={() => move(index, -1)}><Up /></button>
        <button type="button" data-order-step="" aria-label={t('shell:navigationOrder.moveDown', { name: labels[key] })}
          disabled={index === order.keys.length - 1 || fixed.includes(key)}
          onClick={() => move(index, 1)}><Down /></button>
      </div>)}
      <NavigationDropLine reorder={reorder} />
    </div>
    {reset && order.keys.join(',') !== order.defaults.join(',') ? <Button variant="secondary" size="small"
      onClick={() => restoreNavigationOrder(order)}>{t('shell:navigationOrder.resetGroup')}</Button> : null}
    <VisuallyHidden role="status" aria-live="polite">{reorder.announcement}</VisuallyHidden>
  </div>;
}

function GroupOrderPreferences({ group }: { group: NavigationGroup }) {
  const order = useNavigationOrder(group);
  return <NavigationOrderRows order={order} labels={Object.fromEntries(NAVIGATION_GROUPS[group].items)} fixed={navigationFixedKeys(group)} />;
}

function ManageOrderPreferences() {
  const store = appSettingsStore();
  useSyncExternalStore(store.subscribe, store.version);
  const commit = useCommitNavigationOrder(store, 'manageOrder');
  return <NavigationOrderRows order={{ label: t('shell:navigationOrder.manageMenu'), keys: store.value.manageOrder, defaults: MANAGE_MENU_SECTIONS, commit }}
    labels={Object.fromEntries(MANAGE_SECTIONS.map(([key, label]) => [key, label]))} />;
}

export function NavigationOrderPreferences() {
  const [group, setGroup] = useState<NavigationGroup | 'manage' | 'libraries'>('manage');
  return <div className="peach-react"><div className="flex flex-col gap-3">
    <Select aria-label={t('shell:navigationOrder.group')} selectedKey={group} onSelectionChange={key => setGroup(key as typeof group)}>
      <SelectItem id="manage">{t('shell:navigationOrder.manageMenu')}</SelectItem>
      <SelectItem id="libraries">{t('shell:shared.library')}</SelectItem>
      {(Object.keys(NAVIGATION_GROUPS) as NavigationGroup[]).map(key => <SelectItem key={key} id={key}>{NAVIGATION_GROUPS[key].label}</SelectItem>)}
    </Select>
    {group === 'manage' ? <ManageOrderPreferences /> : group === 'libraries' ? <LibraryOrderPreferences /> : <GroupOrderPreferences key={group} group={group} />}
  </div></div>;
}

function LibraryOrderPreferences() {
  const store = appSettingsStore();
  useSyncExternalStore(store.subscribe, store.version);
  const libraries = [...useLibraryTints({ names: true }).values()].filter(row => row.name);
  const save = useSaveSettings('library-order');
  const commit = (keys: string[]) => {
    store.value.libraryOrder = keys;
    store.save();
    save.mutate({ libraryOrder: keys });
  };
  return <>
    <NavigationOrderRows order={{ label: t('shell:shared.library'), keys: orderLibraries(libraries, store.value.libraryOrder, row => row.id).map(row => row.id),
      defaults: libraries.map(row => row.id), commit }} labels={Object.fromEntries(libraries.map(row => [row.id, row.name]))}
      render={key => { const library = libraries.find(row => row.id === key); return library ? <LibraryLabel library={library} /> : key }} />
    {save.isError ? <p role="alert">{t('shell:navigationOrder.librarySyncFailed', { error: errorMessage(save.error) })}</p> : null}
  </>;
}

export function useNavigationDrag(group: NavigationGroup, list: RefObject<HTMLDivElement | null>, axis: 'x' | 'y', attribute = 'tab') {
  const order = useNavigationOrder(group);
  const reorder = useSidebarReorder(list, order.keys, order.commit, () => {}, axis, attribute, navigationFixedKeys(group));
  return { order, reorder };
}

export function NavigationDropLine({ reorder }: { reorder: ReturnType<typeof useSidebarReorder> }) {
  return reorder.hint ? <span data-navigation-drop-line="" aria-hidden="true"
    style={{ '--navigation-line': `${reorder.linePosition}px` } as CSSProperties}><span /></span> : null;
}

export function SortableBoardTabs<V extends string>({ group, ...props }: BoardTabsProps<V> & { group: NavigationGroup }) {
  const list = useRef<HTMLDivElement>(null);
  const axis = props.orientation === 'vertical' ? 'y' : 'x';
  const { order, reorder } = useNavigationDrag(group, list, axis);
  const tabs = order.keys.flatMap(key => props.tabs.filter(tab => tab.value === key));
  return <div data-navigation-frame="" data-navigation-axis={axis} className={props.className ?? 'mb-5.5'}>
    <BoardTabs {...props} className="" tabs={tabs} listRef={list} reorder={reorder} orderGroup={group} />
    <NavigationOrderMenu order={order} />
    <VisuallyHidden role="status" aria-live="polite">{reorder.announcement}</VisuallyHidden>
  </div>;
}
