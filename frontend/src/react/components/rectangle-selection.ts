import { useEffect, useRef, type MouseEvent, type PointerEvent } from 'react';
import { ENTER_SELECTION_EVENT, hasSelectionModifier } from '../../selection';
import { canPanRectangle, selectionDragAction } from '../../ui-kit/scroll';
import { clickedBlank } from './row-click';

export type RectangleCommit = (keys: string[], add: boolean) => void;

const enterSelection = () => window.dispatchEvent(new Event(ENTER_SELECTION_EVENT));
const itemKey = (item: HTMLElement) => item.dataset.rectangleKey ?? item.dataset.key ?? item.dataset.id;
const editable = 'input,select,textarea,[contenteditable]:not([contenteditable="false"]),[data-work-context-menu],.react-aria-ColumnResizer';

export function useRectangleSelection(commit: RectangleCommit | undefined, {
  items = '[data-rectangle-key]', start = items, selecting = false, onEnter = enterSelection, table = false,
}: { items?: string; start?: string; selecting?: boolean; onEnter?(): void; table?: boolean } = {}) {
  const drag = useRef<{ pointer: number; x: number; y: number;
    add: boolean;
    panOrigin?: readonly [number, number];
    phase: 'pending' | 'dragging' | 'canceled'; rectangle?: HTMLDivElement; hits: HTMLElement[] } | null>(null);
  const clearVisual = () => {
    const active = drag.current;
    if (!active) return;
    active.rectangle?.remove();
    for (const item of active.hits) item.removeAttribute('data-rectangle-hit');
    active.hits = [];
  };
  const clear = () => { clearVisual(); drag.current = null };
  const enabled = !!commit;
  useEffect(() => {
    if (!enabled) return;
    const cancel = (event: KeyboardEvent) => {
      const active = drag.current;
      if (event.key !== 'Escape' || !active || active.phase === 'pending') return;
      event.preventDefault();
      event.stopImmediatePropagation();
      active.phase = 'canceled';
      clearVisual();
    };
    window.addEventListener('keydown', cancel, true);
    return () => { window.removeEventListener('keydown', cancel, true); clear() };
  }, [enabled]);

  const bounds = (event: PointerEvent<HTMLElement>) => {
    const host = event.currentTarget.getBoundingClientRect();
    const active = drag.current!;
    const x = Math.max(0, Math.min(host.width, event.clientX - host.left));
    const y = Math.max(0, Math.min(host.height, event.clientY - host.top));
    return { host, left: Math.min(x, active.x), right: Math.max(x, active.x),
      top: Math.min(y, active.y), bottom: Math.max(y, active.y) };
  };
  const hitsAt = (host: HTMLElement, box: ReturnType<typeof bounds>) =>
    [...host.querySelectorAll<HTMLElement>(items)].filter(item => {
      const rect = item.getBoundingClientRect();
      return !item.closest('[inert]') && rect.width > 0 && rect.height > 0 && rect.left < box.right + box.host.left
        && rect.right > box.left + box.host.left && rect.top < box.bottom + box.host.top && rect.bottom > box.top + box.host.top;
    });

  return {
    'data-rectangle-area': enabled ? '' : undefined,
    'data-rectangle-select': enabled && selecting ? '' : undefined,
    onClickCapture(event: MouseEvent<HTMLElement>) {
      if (!commit || selecting || event.defaultPrevented || event.button !== 0 || !hasSelectionModifier(event)) return;
      const host = event.currentTarget, target = event.target;
      if (!(target instanceof Element) || target.closest('[data-rectangle-area]') !== host || target.closest(editable)) return;
      const item = [...host.querySelectorAll<HTMLElement>(items)].find(candidate => candidate.contains(target));
      if (!item) return;
      const key = itemKey(item);
      // 卡片的主入口可显式参与修饰键点按，卡内其它控件处理自己的点击。
      if (!key || item.closest('[inert]') || (!clickedBlank(event, item) && !target.closest('[data-rectangle-trigger]'))) return;
      event.preventDefault();
      event.stopPropagation();
      onEnter();
      commit([key], true);
    },
    onPointerDown(event: PointerEvent<HTMLElement>) {
      if (!enabled || event.pointerType !== 'mouse' || event.button !== 0 || (table && event.altKey)) return;
      const add = hasSelectionModifier(event);
      if (!add && (event.ctrlKey || event.metaKey || event.altKey)) return;
      const host = event.currentTarget, target = event.target;
      if (!(target instanceof Element) || target.closest('[data-rectangle-area]') !== host || target.closest(editable)
        || (target !== host && !target.hasAttribute('data-rectangle-gap') && !target.closest(start))) return;
      const box = host.getBoundingClientRect();
      clear();
      drag.current = { pointer: event.pointerId, x: event.clientX - box.left, y: event.clientY - box.top, add, phase: 'pending', hits: [] };
      if (canPanRectangle(target, event.nativeEvent)) drag.current.panOrigin = [event.clientX, event.clientY];
      // 保留原处的短按，跨过阈值后才由选择区接收松开。
      target.setPointerCapture(event.pointerId);
    },
    onDragStart(event: { preventDefault(): void }) { if (drag.current) event.preventDefault() },
    onPointerMove(event: PointerEvent<HTMLElement>) {
      const active = drag.current;
      if (!active || active.pointer !== event.pointerId || active.phase === 'canceled' || !(event.buttons & 1)) return;
      const box = bounds(event), width = box.right - box.left, height = box.bottom - box.top;
      if (active.phase === 'pending') {
        if (active.panOrigin) {
          const action = selectionDragAction(event.clientX - active.panOrigin[0], event.clientY - active.panOrigin[1]);
          if (!action) return;
          if (action === 'pan') { clear(); return }
        } else if (Math.hypot(width, height) < 5) return;
        active.phase = 'dragging';
        event.currentTarget.setPointerCapture(event.pointerId);
        if (table) getSelection()?.removeAllRanges();
        if (!selecting) onEnter();
        const rectangle = document.createElement('div');
        rectangle.dataset.cardSelectionRectangle = '';
        rectangle.setAttribute('aria-hidden', 'true');
        event.currentTarget.append(rectangle);
        active.rectangle = rectangle;
      }
      const next = hitsAt(event.currentTarget, box);
      for (const item of active.hits) if (!next.includes(item)) item.removeAttribute('data-rectangle-hit');
      for (const item of next) if (!active.hits.includes(item)) item.setAttribute('data-rectangle-hit', '');
      active.hits = next;
      Object.assign(active.rectangle!.style, { left: `${box.left}px`, top: `${box.top}px`, width: `${width}px`, height: `${height}px` });
    },
    onPointerUp(event: PointerEvent<HTMLElement>) {
      const active = drag.current;
      if (!active || active.pointer !== event.pointerId) return;
      const keys = active.phase === 'dragging' ? hitsAt(event.currentTarget, bounds(event))
        .map(itemKey).filter((key): key is string => Boolean(key)) : null;
      clear();
      if (keys) commit?.(keys, active.add || hasSelectionModifier(event));
    },
    onPointerCancel(event: PointerEvent<HTMLElement>) { if (event.pointerId === drag.current?.pointer) clear() },
    onLostPointerCapture(event: PointerEvent<HTMLElement>) {
      if (event.pointerId === drag.current?.pointer && !event.currentTarget.hasPointerCapture(event.pointerId)) clear();
    },
  };
}
