import { useLayoutEffect, useRef, useState, type KeyboardEvent, type PointerEvent, type RefObject } from 'react';
import { flushSync } from 'react-dom';
import { moveSidebarKey } from './sidebar-order';
import { t } from '../../i18n';
import './navigation-reorder.css';

interface Picked {
  key: string;
  origin: number;
  slot: number | null;
  offset: number;
  bounds: { left: number; top: number; width: number };
}
interface Gesture {
  key: string;
  node: HTMLElement;
  pointer: number;
  x: number;
  y: number;
  keys: string[];
  started: boolean;
  preview: HTMLElement | null;
  minHeight: string;
  cursor: string;
}

/** 玻璃背景和弹层变换会成为 fixed 的定位容器，拾起坐标须换算到该容器。 */
function floatingBounds(node: HTMLElement) {
  const bounds = node.getBoundingClientRect();
  for (let parent = node.parentElement; parent; parent = parent.parentElement) {
    const style = getComputedStyle(parent);
    if (style.transform !== 'none' || style.filter !== 'none' || style.backdropFilter !== 'none'
      || style.perspective !== 'none' || /paint|layout|strict|content/.test(style.contain)) {
      const origin = parent.getBoundingClientRect();
      return { left: bounds.left - origin.left - parent.clientLeft + parent.scrollLeft,
        top: bounds.top - origin.top - parent.clientTop + parent.scrollTop, width: bounds.width };
    }
  }
  return { left: bounds.left, top: bounds.top, width: bounds.width };
}

/** 顶层预览沿用原控件样式并越过滚动容器裁切，原节点继续接收拖动指针。 */
function showDragPreview(node: HTMLElement, keyAttribute: string): HTMLElement | null {
  if (typeof node.showPopover !== 'function') return null;
  const box = node.getBoundingClientRect();
  const preview = node.cloneNode(true) as HTMLElement;
  for (const attribute of ['id', `data-${keyAttribute}`, 'data-queue-row']) preview.removeAttribute(attribute);
  for (const child of preview.querySelectorAll('[id],[data-queue-item],[data-queue-remove]')) {
    child.removeAttribute('id');
    child.removeAttribute('data-queue-item');
    child.removeAttribute('data-queue-remove');
  }
  preview.setAttribute('data-navigation-drag-preview', '');
  preview.setAttribute('aria-hidden', 'true');
  preview.inert = true;
  preview.popover = 'manual';
  Object.assign(preview.style, {
    position: 'fixed', left: `${box.left}px`, top: `${box.top}px`, width: `${box.width}px`, height: `${box.height}px`,
  });
  node.after(preview);
  preview.showPopover();
  node.setAttribute('data-navigation-drag-source', '');
  return preview;
}

function clearDragPreview(gesture: Gesture) {
  gesture.preview?.remove();
  gesture.node.removeAttribute('data-navigation-drag-source');
}

/** 指针移动只更新浮起项和目标，松手时提交顺序。 */
export function useSidebarReorder(column: RefObject<HTMLElement | null>, order: readonly string[],
  commit: (next: string[]) => void, settled: () => void, axis: 'x' | 'y' = 'y', attribute = 'nav', fixed: readonly string[] = [],
  mode?: 'row' | 'column') {
  const dropOnRow = mode === 'row';
  const tableHeader = mode === 'column';
  const [picked, setPicked] = useState<Picked | null>(null);
  const [announcement, announce] = useState('');
  const gesture = useRef<Gesture | null>(null);
  const before = useRef<Map<HTMLElement, DOMRect> | null>(null);
  const ignoreClick = useRef(false);
  const latest = useRef({ order, commit, settled, picked });
  latest.current = { order, commit, settled, picked };
  const rows = () => [...column.current!.querySelectorAll<HTMLElement>(`:scope > [data-${attribute}]:not([data-table-space])`)];
  const capture = (active?: Gesture) => {
    if (!dropOnRow) before.current = new Map(rows().map(node => [
      node, (node === active?.node && active.preview ? active.preview : node).getBoundingClientRect(),
    ]));
  };

  useLayoutEffect(() => {
    const snapshot = before.current;
    before.current = null;
    if (!snapshot || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const css = getComputedStyle(column.current!);
    for (const node of rows()) {
      if (node.dataset[attribute] === picked?.key) continue;
      const old = snapshot.get(node);
      if (!old) continue;
      node.getAnimations().find(animation => animation.id === 'sidebar-reorder')?.cancel();
      const now = node.getBoundingClientRect(), dx = old.left - now.left, dy = old.top - now.top;
      if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5) continue;
      node.animate([{ transform: `translate(${dx}px,${dy}px)` }, { transform: 'translate(0,0)' }], {
        id: 'sidebar-reorder', duration: parseFloat(css.getPropertyValue('--sidebar-reorder-ms')),
        easing: css.getPropertyValue('--spring-press').trim(),
      });
    }
  });

  const finish = (accept: boolean) => {
    const active = gesture.current;
    if (!active) return;
    gesture.current = null;
    if (!active.started) return;
    const mark = latest.current.picked!;
    const remaining = active.keys.filter(key => key !== active.key);
    const slot = accept ? mark.slot : null;
    const next = slot === null || slot === mark.origin ? null : moveSidebarKey(latest.current.order, active.key,
      remaining[Math.min(slot, remaining.length - 1)]!, slot === remaining.length);
    capture(active);
    column.current!.style.minHeight = active.minHeight;
    document.body.style.cursor = active.cursor;
    clearDragPreview(active);
    active.node.style.removeProperty('--sidebar-drag-x');
    active.node.style.removeProperty('--sidebar-drag-y');
    ignoreClick.current = true;
    flushSync(() => {
      setPicked(null);
      if (next) latest.current.commit(next);
      announce(next ? t('navigation:sidebarReorder.moved', { label: active.node.ariaLabel || active.node.textContent, position: slot! + 1 })
        : accept && slot === mark.origin ? t('navigation:sidebarReorder.unchanged') : t('navigation:sidebarReorder.canceled'));
    });
    latest.current.settled();
  };

  useLayoutEffect(() => {
    const cancel = (event: globalThis.KeyboardEvent) => {
      if (event.key !== 'Escape' || !gesture.current?.started) return;
      event.preventDefault();
      event.stopPropagation();
      finish(false);
    };
    const abort = () => finish(false);
    window.addEventListener('keydown', cancel, true);
    window.addEventListener('blur', abort);
    return () => {
      window.removeEventListener('keydown', cancel, true);
      window.removeEventListener('blur', abort);
      const active = gesture.current;
      if (active?.started) {
        document.body.style.cursor = active.cursor;
        if (column.current) column.current.style.minHeight = active.minHeight;
        clearDragPreview(active);
      }
    };
  }, []);

  const pointerDown = (event: PointerEvent<HTMLElement>, key: string, node: HTMLElement, dragControl?: string) => {
    if (event.button !== 0 || !event.isPrimary) return;
    ignoreClick.current = false;
    if (fixed.includes(key)) return;
    const controls = tableHeader ? 'button,input,select,a,label,.react-aria-ColumnResizer' : 'button,input,select,a';
    const control = (event.target as Element).closest(controls);
    const draggableControl = control && (tableHeader
      ? control.hasAttribute('data-table-column-filter') : dragControl && control.matches(dragControl));
    if (control && control !== node && !draggableControl) return;
    gesture.current = { key, node, pointer: event.pointerId, x: event.clientX, y: event.clientY,
      keys: rows().map(row => row.dataset[attribute]!), started: false, preview: null,
      minHeight: column.current!.style.minHeight, cursor: document.body.style.cursor };
    if (!tableHeader) (control instanceof HTMLElement && draggableControl ? control : node).setPointerCapture(event.pointerId);
  };
  const pointerMove = (event: PointerEvent<HTMLElement>) => {
    const active = gesture.current;
    if (!active || active.pointer !== event.pointerId) return;
    if (tableHeader && !(event.buttons & 1)) { finish(false); return }
    const dx = event.clientX - active.x, dy = event.clientY - active.y;
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!active.started) {
      if ((tableHeader ? Math.abs(dx) : Math.hypot(dx, dy)) < 6) return;
      if (tableHeader) active.node.setPointerCapture(event.pointerId);
      active.started = true;
      if (!tableHeader) {
        capture();
        column.current!.style.minHeight = `${column.current!.offsetHeight}px`;
      }
      document.body.style.cursor = 'grabbing';
      const offset = axis === 'x' ? active.node.offsetLeft : active.node.offsetTop;
      const { left, top, width } = floatingBounds(active.node);
      const origin = active.keys.indexOf(active.key);
      if (!reduced && !tableHeader) active.preview = showDragPreview(active.node, attribute);
      flushSync(() => setPicked({ key: active.key, offset, origin, slot: origin, bounds: { left, top, width } }));
    }
    event.preventDefault();
    const dragX = reduced ? 0 : dx + (axis === 'y' ? 18 : 0);
    const dragY = reduced ? 0 : dy + (axis === 'x' ? 18 : 0);
    if (active.preview) {
      active.preview.style.transform = `translate3d(${dragX}px,${dragY}px,0) scale(var(--navigation-pick-scale,.9))`;
    } else {
      active.node.style.setProperty('--sidebar-drag-x', `${dragX}px`);
      active.node.style.setProperty('--sidebar-drag-y', `${dragY}px`);
    }
    const list = column.current!;
    const box = list.getBoundingClientRect();
    const inside = event.clientX >= box.left && event.clientX <= box.right
      && event.clientY >= box.top && event.clientY <= box.bottom;
    let slot: number | null = null;
    if (inside && dropOnRow) {
      // 被拖的条目仍占原位，目标条目的整个宽度或高度对应它原来的序号。
      const point = axis === 'x' ? event.clientX - box.left + list.scrollLeft
        : event.clientY - box.top + list.scrollTop;
      const at = rows().findIndex(row => axis === 'x'
        ? point < row.offsetLeft + row.offsetWidth : point < row.offsetTop + row.offsetHeight);
      slot = at < 0 ? active.keys.length - 1 : at;
    } else if (inside) {
      const remaining = rows().filter(row => row !== active.node);
      const at = remaining.findIndex(row => {
        if (tableHeader) return event.clientX - box.left < row.offsetLeft + row.offsetWidth / 2;
        return axis === 'x'
          ? event.clientX - box.left + column.current!.scrollLeft < row.offsetLeft + row.offsetWidth / 2
          : event.clientY - box.top < row.offsetTop + row.offsetHeight / 2;
      });
      slot = Math.max(active.keys.filter(key => fixed.includes(key)).length, at < 0 ? remaining.length : at);
    }
    if (slot !== latest.current.picked?.slot) flushSync(() => setPicked(mark => mark && { ...mark, slot }));
  };
  const keyboard = (event: KeyboardEvent<HTMLElement>, key: string, node: HTMLElement) => {
    const previousKey = axis === 'x' ? 'ArrowLeft' : 'ArrowUp';
    const nextKey = axis === 'x' ? 'ArrowRight' : 'ArrowDown';
    if (!event.altKey || (event.key !== previousKey && event.key !== nextKey)) return;
    event.preventDefault();
    event.stopPropagation();
    const visible = rows().map(row => row.dataset[attribute]!);
    const at = visible.indexOf(key), down = event.key === nextKey;
    const target = visible[at + (down ? 1 : -1)];
    if (target === undefined || fixed.includes(key) || fixed.includes(target)) return;
    const next = moveSidebarKey(order, key, target, down);
    if (!next) return;
    capture();
    flushSync(() => commit(next));
    announce(t('navigation:sidebarReorder.moved', { label: node.ariaLabel || node.textContent, position: at + (down ? 2 : 0) }));
    settled();
  };

  const remaining = picked ? rows().filter(row => row.dataset[attribute] !== picked.key) : [];
  const remainingPositions = new Map(remaining.map((row, index) => [row.dataset[attribute], index]));
  const hint = !!picked && picked.slot !== null && picked.slot !== picked.origin;
  const position = (node: HTMLElement) => axis === 'x' ? node.offsetLeft : node.offsetTop;
  const size = (node: HTMLElement) => axis === 'x' ? node.offsetWidth : node.offsetHeight;
  let linePosition = hint ? (picked.slot === remaining.length
    ? position(remaining.at(-1)!) + size(remaining.at(-1)!) + 1.5
    : position(remaining[picked.slot!]!) - 1.5) : 0;
  if (hint && dropOnRow) {
    const list = column.current!;
    const start = axis === 'x' ? list.scrollLeft : list.scrollTop;
    const length = axis === 'x' ? list.clientWidth : list.clientHeight;
    linePosition = Math.min(Math.max(linePosition, start), start + length - 2);
  }
  const nudge = (key: string) => {
    const at = remainingPositions.get(key);
    if (!hint || at === undefined) return { distance: 0, delay: 0 };
    const { origin, slot, bounds } = picked!;
    if (tableHeader) {
      // Crossed columns move by the dragged column's width, including when columns have different widths.
      const crosses = at >= Math.min(origin, slot!) && at < Math.max(origin, slot!);
      return { distance: crosses ? Math.sign(origin - slot!) * bounds.width : 0, delay: 0 };
    }
    const before = at < slot!, n = before ? slot! - at - 1 : at - slot!;
    return { distance: (before ? -1 : 1) * 10 * 0.7 ** n, delay: 24 * n };
  };
  return {
    picked, announcement, linePosition, hint, nudge,
    dropTarget: hint ? remaining[Math.min(picked.slot!, remaining.length - 1)] : null,
    dropAfter: picked?.slot === remaining.length,
    bindings(key: string, target?: HTMLElement | string) {
      const node = typeof target === 'string' ? undefined : target;
      const dragControl = typeof target === 'string' ? target : undefined;
      return { onPointerDown: (event: PointerEvent<HTMLElement>) => pointerDown(event, key, node ?? event.currentTarget, dragControl),
        onPointerMove: pointerMove,
        onPointerUp: (event: PointerEvent<HTMLElement>) => {
          if (gesture.current?.pointer !== event.pointerId) return;
          if (dropOnRow && gesture.current.started) pointerMove(event);
          finish(true);
        },
        onPointerCancel: () => finish(false),
        onLostPointerCapture: () => finish(false), onKeyDown: (event: KeyboardEvent<HTMLElement>) => keyboard(event, key, node ?? event.currentTarget),
        onDragStart: (event: { preventDefault(): void }) => event.preventDefault() };
    },
    clickCapture(event: { preventDefault(): void; stopPropagation(): void }) {
      if (!ignoreClick.current) return;
      ignoreClick.current = false;
      event.preventDefault();event.stopPropagation();
    },
  };
}
