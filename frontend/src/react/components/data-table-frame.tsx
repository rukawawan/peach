import { useEffect, useLayoutEffect, useRef, type MouseEvent, type PropsWithChildren, type RefObject } from 'react';
import { attachOverlayScrollbar } from '@peach/legacy/ui';
import { wireTableScroller } from '../../ui-kit/scroll';
import { ResizableTableContainer, VisuallyHidden } from 'react-aria-components';
import { useSidebarReorder } from '../sidebar/use-sidebar-reorder';
import type { TablePreferences } from './table-column-preferences';
import './table-column-controls.css';

import { clickedBlank } from './row-click';
import { useRectangleSelection, type RectangleCommit } from './rectangle-selection';

export interface DataTableFrameProps extends PropsWithChildren {
  ref?: RefObject<HTMLDivElement | null>;
  /** 关注来源表需要额外的排序图标规则；外框与行状态仍由这个共享组件负责。 */
  follow?: boolean;
  preferences?: TablePreferences;
  resizable?: boolean;
  /** 给了就是整行可选：点在某一行的空白处时以那一行的 `data-key`（React Aria 写在 `tr` 上的
   *  行 id）回调；点在行里的勾、键、链接上不算。 */
  onRowClick?(key: string, event: MouseEvent<HTMLDivElement>): void;
  onRectangle?: RectangleCommit | undefined;
  rectangleSelecting?: boolean;
  onRectangleEnter?(): void;
}

/* 拖宽期间在根元素上做标记，整页锁成左右箭头光标且不选字；不用 `html:has(…)` 判断，那样每次
 * DOM 变动都要重新匹配整棵树，首页启动会慢几百毫秒。 */
const markResizing = () => { document.documentElement.dataset.columnResizing = '' };
const COLUMN = 'thead th[data-key]:not([data-table-space])';
const FIXED_COLUMNS = ['select'];
const noop = () => {};

/** BoardUI Table 的 Data Table 外框：主表面、完整边线、圆角与选中行反馈。 */
export function DataTableFrame({ children, follow = false, onRowClick, onRectangle, rectangleSelecting = false, onRectangleEnter,
  preferences, resizable = Boolean(preferences), ref }: DataTableFrameProps) {
  const localHost = useRef<HTMLDivElement>(null);
  const host = ref ?? localHost;
  const header = useRef<HTMLElement>(null);
  const resizingColumn = useRef<string | undefined>(undefined);
  const startingWidths = useRef<Parameters<TablePreferences['resize']>[0] | null>(null);
  const setViewportWidth = preferences?.setViewportWidth;
  useLayoutEffect(() => {
    const node = host.current;
    if (!resizable || !node || !setViewportWidth) return;
    const measure = () => setViewportWidth(node.clientWidth);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => observer.disconnect();
  }, [resizable, setViewportWidth]);
  const reorder = useSidebarReorder(header, preferences?.columnOrder ?? [], preferences?.changeOrder ?? noop, noop, 'x', 'key', FIXED_COLUMNS, 'column');
  const reorderEvents = reorder.bindings('');
  const canReorder = Boolean(preferences && preferences.columnOrder.filter(key => !FIXED_COLUMNS.includes(key)
    && preferences.visibility[key] !== false).length > 1);
  useLayoutEffect(() => {
    if (!reorder.picked) return;
    const cells = [...header.current!.querySelectorAll<HTMLElement>(':scope > [data-key]:not([data-table-space])')];
    const source = cells.find(cell => cell.dataset.key === reorder.picked?.key);
    const target = reorder.dropTarget;
    source?.setAttribute('data-column-dragging', '');
    target?.setAttribute('data-column-drop', reorder.dropAfter ? 'after' : 'before');
    const shifted = cells.filter(cell => {
      const { distance } = reorder.nudge(cell.dataset.key!);
      if (distance === 0) return false;
      cell.style.setProperty('--navigation-nudge-x', `${distance}px`);
      return true;
    });
    return () => {
      source?.removeAttribute('data-column-dragging');
      target?.removeAttribute('data-column-drop');
      for (const cell of shifted) cell.style.removeProperty('--navigation-nudge-x');
    };
  }, [reorder.picked, reorder.dropTarget, reorder.dropAfter]);
  const columnAt = (target: EventTarget) => target instanceof Element ? target.closest<HTMLElement>(COLUMN) : null;
  const rectangle = useRectangleSelection(onRectangle, {
    selecting: rectangleSelecting, items: 'tbody [role="row"][data-key]:not([data-list-skeleton-row], [data-rectangle-disabled])', start: 'tbody', table: true,
    onEnter: onRectangleEnter,
  });
  useEffect(() => {
    const viewport = host.current?.querySelector<HTMLElement>('.overflow-x-auto') ?? null;
    attachOverlayScrollbar(viewport);
    wireTableScroller(viewport);
  });
  const click = onRowClick ? (event: MouseEvent<HTMLDivElement>) => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    const row = target.closest<HTMLElement>('[role="row"][data-key]');
    if (row && clickedBlank(event, row)) onRowClick(row.dataset.key!, event);
  } : undefined;
  return (
    <div ref={host} data-board-data-table data-resizable-table={resizable ? '' : undefined} data-follow-table={follow || undefined}
      data-reorderable-columns={canReorder || undefined} data-column-reordering={reorder.picked ? '' : undefined} {...rectangle} onClick={click}
      onClickCapture={event => { if (columnAt(event.target) && event.detail > 0) reorder.clickCapture(event); rectangle.onClickCapture(event) }}
      onPointerDownCapture={event => {
        if (event.target instanceof Element && event.target.closest('.react-aria-ColumnResizer'))
          resizingColumn.current = columnAt(event.target)?.dataset.key;
        if (!canReorder || !event.isPrimary) return;
        const column = columnAt(event.target);
        if (!column) { reorderEvents.onPointerCancel(); return }
        header.current = column.parentElement;
        reorder.bindings(column.dataset.key!, column).onPointerDown(event);
      }}
      onPointerMoveCapture={reorderEvents.onPointerMove} onPointerUpCapture={reorderEvents.onPointerUp}
      onPointerCancelCapture={reorderEvents.onPointerCancel} onLostPointerCaptureCapture={reorderEvents.onLostPointerCapture}
      onKeyDownCapture={event => {
        if (event.target instanceof Element && event.target.closest('.react-aria-ColumnResizer'))
          resizingColumn.current = columnAt(event.target)?.dataset.key;
        const column = canReorder ? columnAt(event.target) : null;
        if (column && event.target === column) {
          header.current = column.parentElement;
          reorder.bindings(column.dataset.key!, column).onKeyDown(event);
        }
      }}
      onDragStart={event => { if (canReorder && columnAt(event.target)) reorderEvents.onDragStart(event); else rectangle.onDragStart(event) }}>
      {preferences && resizable ? <ResizableTableContainer className="relative min-w-0"
        onResizeStart={widths => { startingWidths.current = widths; markResizing() }} onResize={preferences.resize}
        onResizeEnd={widths => {
          delete document.documentElement.dataset.columnResizing;
          const id = resizingColumn.current;
          preferences.save(widths, id && startingWidths.current?.get(id) !== widths.get(id) ? id : undefined);
          startingWidths.current = null;
          resizingColumn.current = undefined;
        }}>
        {children}
      </ResizableTableContainer> : children}
      {preferences ? <VisuallyHidden role="status" aria-live="polite">{reorder.announcement}</VisuallyHidden> : null}
    </div>
  );
}
