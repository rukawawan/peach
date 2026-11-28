import { useLayoutEffect, type RefObject } from 'react';

interface Point { x: number; y: number }
type CursorMode = 'idle' | 'open' | 'drag' | 'close';

const NATIVE_CURSOR = 'button,input,textarea,select,a,[contenteditable],[data-wall-player],[data-wall-details-panel]';
const clamp = (value: number) => Math.max(-1, Math.min(1, value));
const move = (node: HTMLElement, x: number, y: number, centered = false) => {
  node.style.transform = `translate3d(${x.toFixed(2)}px, ${y.toFixed(2)}px, 0)${centered ? ' translate(-50%, -50%)' : ''}`;
};
const distance = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);
const ease = (a: Point, b: Point, step: number): Point =>
  ({ x: a.x + (b.x - a.x) * step, y: a.y + (b.y - a.y) * step });

export function useWallAtmosphere(
  viewport: RefObject<HTMLDivElement | null>,
  caption: RefObject<HTMLDivElement | null>,
  enabled: boolean,
): void {
  useLayoutEffect(() => {
    const node = viewport.current;
    if (!enabled || !node) return;
    const root = node.closest<HTMLElement>('[data-video-wall]')!;
    const distant = node.querySelector<HTMLElement>('[data-wall-air="distant"]')!;
    const near = node.querySelector<HTMLElement>('[data-wall-air="near"]')!;
    const light = node.querySelector<HTMLElement>('[data-wall-light]')!;
    const cursor = node.querySelector<HTMLElement>('[data-wall-pointer]')!;
    const arrow = cursor.querySelector<SVGElement>('[data-wall-pointer-open]')!;
    const desktop = matchMedia('(hover: hover) and (pointer: fine)');
    const reduced = matchMedia('(prefers-reduced-motion: reduce)');
    let pointer: (Point & { pressed: boolean }) | null = null;
    let cursorPosition: Point | null = null;
    let spotlight: Point | null = null;
    let raisedTile: HTMLElement | null = null;
    let sleeve: HTMLElement | null = null;
    let frame = 0, previous = 0;

    const lift = (tile: HTMLElement | null, art: HTMLElement | null = null) => {
      if (raisedTile === tile && sleeve === art) return;
      sleeve?.style.removeProperty('transform');
      raisedTile?.removeAttribute('data-wall-raised');
      raisedTile = tile;
      sleeve = art;
      raisedTile?.setAttribute('data-wall-raised', '');
    };
    const positionCaption = (at: Point | null, width = 0, height = 0) => {
      const label = caption.current;
      if (!label) return;
      if (!at || !label.hasAttribute('data-wall-copy-follow')) {
        label.removeAttribute('data-wall-copy-at-pointer');
        label.style.removeProperty('transform');
        return;
      }
      const x = Math.max(12, Math.min(width - label.offsetWidth - 12, at.x - label.offsetWidth / 2));
      const y = at.y + label.offsetHeight + 44 < height ? at.y + 31 : at.y - label.offsetHeight - 29;
      move(label, x, Math.max(12, y));
      label.setAttribute('data-wall-copy-at-pointer', '');
    };
    const stop = () => {
      cancelAnimationFrame(frame);
      frame = previous = 0;
      pointer = cursorPosition = spotlight = null;
      delete node.dataset.wallCursorMode;
      lift(null);
      positionCaption(null);
    };
    const tick = (now: number) => {
      if (!pointer) return;
      const target = document.elementFromPoint(pointer.x, pointer.y);
      if (!node.contains(target) || target?.closest(NATIVE_CURSOR)) { stop(); return; }
      const expanded = root.hasAttribute('data-focused');
      const tile = target?.closest<HTMLElement>('[data-wall-tile]') ?? null;
      const mode: CursorMode = expanded ? 'close' : pointer.pressed ? 'drag' : tile ? 'open' : 'idle';
      const width = node.clientWidth, height = node.clientHeight;
      const art = mode === 'open' && !reduced.matches ? tile?.querySelector<HTMLElement>('[data-wall-sleeve]') : null;
      const box = mode === 'open' ? tile?.querySelector('[data-wall-hit]')?.getBoundingClientRect() : undefined;
      const step = 1 - Math.exp(-Math.min(50, previous ? now - previous : 16) / 28);
      previous = now;
      const direct = !cursorPosition || reduced.matches || mode === 'drag';
      cursorPosition = direct || !cursorPosition || distance(cursorPosition, pointer) < .4
        ? pointer : ease(cursorPosition, pointer, step);
      let lighting = false;
      if (!expanded && !reduced.matches && mode !== 'drag') {
        spotlight = !spotlight || distance(spotlight, pointer) < .5 ? pointer : ease(spotlight, pointer, step * .6);
        lighting = distance(spotlight, pointer) > .5;
        move(light, spotlight.x, spotlight.y, true);
        const x = clamp(spotlight.x / width * 2 - 1), y = clamp(spotlight.y / height * 2 - 1);
        move(distant, -x * 7, -y * 6);
        move(near, x * 35, y * 28);
      }
      lift(art ? tile : null, art);
      if (box) {
        const dx = box.left + box.width / 2 - pointer.x;
        const dy = box.top + box.height / 2 - pointer.y;
        if (Math.hypot(dx, dy) > 8) arrow.style.rotate = `${Math.atan2(dy, dx)}rad`;
        if (art) {
          const x = clamp(-2 * dx / box.width), y = clamp(-2 * dy / box.height);
          art.style.transform = `perspective(860px) translate3d(0, -6px, 0) rotateX(${(-y * 10).toFixed(2)}deg) rotateY(${(x * 12).toFixed(2)}deg) scale(1.045)`;
        }
      }
      move(cursor, cursorPosition.x, cursorPosition.y, true);
      node.dataset.wallCursorMode = mode;
      positionCaption(mode === 'open' ? cursorPosition : null, width, height);
      if (lighting || distance(cursorPosition, pointer) > .4) frame = requestAnimationFrame(tick);
      else frame = previous = 0;
    };
    const update = (event: PointerEvent) => {
      if (!desktop.matches || event.pointerType !== 'mouse') return;
      pointer = { x: event.clientX, y: event.clientY, pressed: !!(event.buttons & 1) };
      if (!frame) frame = requestAnimationFrame(tick);
    };
    const keyboard = (event: FocusEvent) => {
      if (event.target instanceof HTMLElement && event.target.matches(':focus-visible')) stop();
    };

    node.addEventListener('pointermove', update, { passive: true });
    node.addEventListener('pointerdown', update, { passive: true });
    node.addEventListener('pointerleave', stop);
    node.addEventListener('pointercancel', stop);
    window.addEventListener('pointerup', update);
    node.addEventListener('focusin', keyboard);
    node.addEventListener('keydown', stop, true);
    window.addEventListener('blur', stop);
    document.addEventListener('visibilitychange', stop);
    desktop.addEventListener('change', stop);
    reduced.addEventListener('change', stop);
    return () => {
      stop();
      node.removeEventListener('pointermove', update);
      node.removeEventListener('pointerdown', update);
      node.removeEventListener('pointerleave', stop);
      node.removeEventListener('pointercancel', stop);
      window.removeEventListener('pointerup', update);
      node.removeEventListener('focusin', keyboard);
      node.removeEventListener('keydown', stop, true);
      window.removeEventListener('blur', stop);
      document.removeEventListener('visibilitychange', stop);
      desktop.removeEventListener('change', stop);
      reduced.removeEventListener('change', stop);
    };
  }, [caption, enabled, viewport]);
}
