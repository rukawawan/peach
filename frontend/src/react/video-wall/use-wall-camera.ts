import { useCallback, useEffect, useLayoutEffect, useRef, useState, type PointerEvent, type MouseEvent } from 'react';
import { animate } from 'motion';
import { clampWall, WALL_CULL_PAD, wallExtent, type WallCamera, type WallRect, type WallSize } from './wall-layout';

const INITIAL: WallCamera = { x: 16, y: 16, scale: 1 };
const MIN_SCALE = .65, MAX_SCALE = 1.6;
const clampScale = (scale: number) => Math.min(MAX_SCALE, Math.max(MIN_SCALE, scale));
/** 以视口内一点为不动点换比例，滚轮缩放时指针下的那一格留在指针下。 */
const scaleAt = (from: WallCamera, scale: number, x: number, y: number): WallCamera =>
  ({ scale, x: x - (x - from.x) * scale / from.scale, y: y - (y - from.y) * scale / from.scale });
/* 裁剪缓冲区（`visibleWallTiles` 每边多铺 `WALL_CULL_PAD` 屏幕像素）用掉三分之二才重新发布：
   剩下那一截给 React 排程留余量，快拖时边缘不露空。平移与缩放同一把尺。 */
function stillCovered(next: WallCamera, by: WallCamera, size: WallSize): boolean {
  const reach = WALL_CULL_PAD * 2 / 3 / by.scale;
  const left = -next.x / next.scale, top = -next.y / next.scale;
  const fromLeft = -by.x / by.scale - reach, fromTop = -by.y / by.scale - reach;
  return left >= fromLeft && top >= fromTop
    && left + size.width / next.scale <= fromLeft + size.width / by.scale + reach * 2
    && top + size.height / next.scale <= fromTop + size.height / by.scale + reach * 2;
}

/** 镜头每帧只写世界层；视口快走出已渲染的磁贴范围时才发布一次 React 状态。 */
export function useWallCamera(count: number, finite: boolean, initial: WallCamera = INITIAL, focused = false) {
  const viewport = useRef<HTMLDivElement>(null);
  const world = useRef<HTMLDivElement>(null);
  const size = useRef<WallSize>({ width: 0, height: 0 });
  const current = useRef<WallCamera>({ ...initial });
  const [view, setView] = useState({ camera: { ...initial }, size: size.current });
  const published = useRef<WallCamera>({ ...initial });
  const options = useRef({ count, finite, focused });
  options.current = { count, finite, focused };
  const frame = useRef<number | null>(null);
  const flight = useRef<{ stop():void } | null>(null);
  const settle = useRef<ReturnType<typeof setTimeout> | null>(null);
  /* 滚轮与键盘共用的缓动目标：平移余量、目标比例（0 表示不缩放）和缩放不动点（视口坐标）。 */
  const glide = useRef({ x: 0, y: 0, scale: 0, anchorX: 0, anchorY: 0, previous: 0 });
  const didDrag = useRef(false);
  const pointer = useRef<{ id: number; x: number; y: number; camera: WallCamera;
    lastX: number; lastY: number; time: number; vx: number; vy: number; dragged: boolean } | null>(null);
  const stop = useCallback(() => {
    flight.current?.stop(); flight.current = null;
    if (frame.current !== null) cancelAnimationFrame(frame.current);
    frame.current = null;
    Object.assign(glide.current, { x: 0, y: 0, scale: 0, previous: 0 });
  }, []);
  const apply = useCallback((next: WallCamera, force = false, center = false) => {
    const { count: total, finite: bounded, focused: expanded } = options.current;
    const actual = clampWall(next, size.current, wallExtent(total), bounded && !expanded && !center);
    const before = current.current;
    current.current = actual;
    const ratio = window.devicePixelRatio || 1;
    const layer = world.current;
    if (layer) {
      layer.style.transform = `translate3d(${Math.round(actual.x * ratio) / ratio}px, ${Math.round(actual.y * ratio) / ratio}px, 0) scale(${actual.scale})`;
      /* 移动期间让合成器整块搬动世界层：不挂 `will-change` 时 Chrome 每挪一次都把整面墙重新
         光栅化，拖动的 GPU 光栅化时间差四倍。停下后摘掉，按最终比例重画一次清晰的。 */
      if (actual.x !== before.x || actual.y !== before.y || actual.scale !== before.scale) {
        layer.style.willChange = 'transform';
        if (settle.current !== null) clearTimeout(settle.current);
        settle.current = setTimeout(() => { settle.current = null; layer.style.willChange = '' }, 240);
      }
    }
    if (viewport.current) {
      viewport.current.dataset.cameraX = String(actual.x);
      viewport.current.dataset.cameraY = String(actual.y);
      viewport.current.dataset.cameraScale = String(actual.scale);
    }
    if (force || !stillCovered(actual, published.current, size.current)) {
      published.current = actual;
      setView({ camera: actual, size: { ...size.current } });
    }
  }, []);
  useLayoutEffect(() => {
    const node = viewport.current;
    if (!node) return;
    const observer = new ResizeObserver(([entry]) => {
      if (!entry) return;
      size.current = { width: entry.contentRect.width, height: entry.contentRect.height };
      apply(current.current, true);
    });
    observer.observe(node);
    return () => { observer.disconnect(); stop(); if (settle.current !== null) clearTimeout(settle.current) };
  }, [apply, stop]);
  useEffect(() => { apply(current.current, true) }, [count, finite, apply]);

  const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
  /* 每帧把平移余量与缩放目标按同一条指数缓动推进一截；余量耗尽、比例到位就停。 */
  const tick = useCallback((now: number) => {
    const state = glide.current;
    const step = 1 - Math.exp(-Math.min(50, state.previous ? now - state.previous : 16) / 80);
    state.previous = now;
    const old = current.current;
    let next = old;
    if (state.scale) {
      const arrived = Math.abs(state.scale - old.scale) < .002;
      next = scaleAt(old, arrived ? state.scale : old.scale + (state.scale - old.scale) * step, state.anchorX, state.anchorY);
      if (arrived) state.scale = 0;
    }
    const last = Math.hypot(state.x, state.y) < .5;
    const moveX = last ? state.x : state.x * step, moveY = last ? state.y : state.y * step;
    apply({ ...next, x: next.x + moveX, y: next.y + moveY });
    // 有限墙撞到边界时这一轴不再走，余量清零免得一直推。
    state.x = moveX && current.current.x === next.x ? 0 : state.x - moveX;
    state.y = moveY && current.current.y === next.y ? 0 : state.y - moveY;
    if (last) { state.x = 0; state.y = 0 }
    if (!state.scale && !state.x && !state.y) { state.previous = 0; frame.current = null; return }
    frame.current = requestAnimationFrame(tick);
  }, [apply]);
  const glideBy = useCallback((pan: { x: number; y: number } | null, zoom: { factor: number; x: number; y: number } | null) => {
    flight.current?.stop(); flight.current = null;
    const state = glide.current;
    if (reduced()) {
      let next = current.current;
      if (zoom) next = scaleAt(next, clampScale(next.scale * zoom.factor), zoom.x, zoom.y);
      if (pan) next = { ...next, x: next.x + pan.x, y: next.y + pan.y };
      apply(next); return;
    }
    if (zoom) Object.assign(state, { scale: clampScale((state.scale || current.current.scale) * zoom.factor), anchorX: zoom.x, anchorY: zoom.y });
    if (pan) { state.x += pan.x; state.y += pan.y }
    if (frame.current === null && (state.scale || state.x || state.y)) { state.previous = 0; frame.current = requestAnimationFrame(tick) }
  }, [apply, tick]);
  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0 || !event.isPrimary || pointer.current) return;
    stop(); didDrag.current = false;
    if (event.target instanceof Element && event.target.closest('button,input,[data-wall-queue]')) return;
    pointer.current = { id: event.pointerId, x: event.clientX, y: event.clientY, camera: current.current,
      lastX: event.clientX, lastY: event.clientY, time: event.timeStamp, vx: 0, vy: 0, dragged: false };
  };
  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const from = pointer.current;
    if (!from || from.id !== event.pointerId) return;
    const dx = event.clientX - from.x, dy = event.clientY - from.y;
    if (!from.dragged && Math.hypot(dx, dy) > 7) {
      from.dragged = true; didDrag.current = true;
      event.currentTarget.setPointerCapture(event.pointerId);
    }
    const elapsed = event.timeStamp - from.time;
    if (elapsed > 0) {
      from.vx = (event.clientX - from.lastX) / elapsed;
      from.vy = (event.clientY - from.lastY) / elapsed;
    }
    from.lastX = event.clientX; from.lastY = event.clientY; from.time = event.timeStamp;
    if (from.dragged) apply({ ...from.camera, x: from.camera.x + dx, y: from.camera.y + dy });
  };
  const onPointerUp = (event: PointerEvent<HTMLDivElement>) => {
    const from = pointer.current;
    if (!from || from.id !== event.pointerId) return;
    pointer.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    if (!from.dragged || reduced() || event.timeStamp - from.time > 80) return;
    let previous = performance.now(), vx = Math.max(-4, Math.min(4, from.vx)), vy = Math.max(-4, Math.min(4, from.vy));
    const coast = (now: number) => {
      const dt = Math.min(50, now - previous); previous = now;
      const old = current.current;
      apply({ ...old, x: old.x + vx * dt, y: old.y + vy * dt });
      vx = current.current.x === old.x ? 0 : vx * Math.exp(-dt / 280);
      vy = current.current.y === old.y ? 0 : vy * Math.exp(-dt / 280);
      if (Math.hypot(vx, vy) < .04) { frame.current = null; return }
      frame.current = requestAnimationFrame(coast);
    };
    frame.current = requestAnimationFrame(coast);
  };
  const onClickCapture = (event: MouseEvent<HTMLDivElement>) => {
    if (!didDrag.current || event.detail === 0) return;
    didDrag.current = false; event.preventDefault(); event.stopPropagation();
  };
  useEffect(() => {
    const node = viewport.current;
    if (!node) return;
    const wheel = (event: WheelEvent) => {
      if (event.target instanceof Element && event.target.closest('[data-wall-queue],[data-wall-player]')) return;
      event.preventDefault();
      if (node.closest('[data-video-wall][data-refreshing]')) return;
      if (pointer.current) return;
      const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? size.current.height : 1;
      /* 纵向滚轮缩放，指针下那一格不动；触控板捏合被浏览器报成带 Ctrl 的纵向滚动，刻度更细。
         横向（触控板左右扫、Shift + 滚轮）仍是平移。 */
      const horizontal = event.shiftKey && !event.deltaX ? event.deltaY : event.deltaX;
      const vertical = event.shiftKey && !event.deltaX ? 0 : event.deltaY;
      if (Math.abs(horizontal) > Math.abs(vertical)) { glideBy({ x: -horizontal * unit, y: 0 }, null); return }
      if (!vertical) return;
      const box = node.getBoundingClientRect();
      glideBy(null, { factor: Math.exp(-vertical * unit * (event.ctrlKey ? .01 : .0015)),
        x: event.clientX - box.left, y: event.clientY - box.top });
    };
    const cancel = () => { stop(); pointer.current = null };
    node.addEventListener('wheel', wheel, { passive: false });
    node.addEventListener('pointerdown', cancel);
    node.addEventListener('keydown', cancel);
    window.addEventListener('blur', cancel);
    return () => {
      cancel(); node.removeEventListener('wheel', wheel); node.removeEventListener('pointerdown', cancel);
      node.removeEventListener('keydown', cancel); window.removeEventListener('blur', cancel);
    };
  }, [glideBy, stop]);
  const reveal = (rect: WallRect, animated = false, fit = false) => {
    stop();
    const from = current.current;
    const scale = fit ? Math.min(from.scale, (size.current.width - 24) / rect.width, (size.current.height - 32) / rect.height) : from.scale;
    const target = { scale, x:size.current.width / 2 - (rect.x + rect.width / 2) * scale,
      y:size.current.height / 2 - (rect.y + rect.height / 2) * scale };
    if (!animated || reduced()) { apply(target, true, fit); return }
    // Folia useWallCameraPan 的 420ms 飞行；世界层每帧变换，磁贴位置由块内弹簧接管。
    flight.current = animate(0, 1, { duration:.42, ease:[.22,1,.36,1],
      onUpdate:progress => apply({ x:from.x + (target.x - from.x) * progress,
        y:from.y + (target.y - from.y) * progress, scale:from.scale + (target.scale - from.scale) * progress }, false, fit),
      onComplete:() => { flight.current = null; apply(target, true, fit) },
    });
  };
  /** 键盘缩放以视口中心为不动点，与滚轮同一条缓动。 */
  const zoom = (factor: number) => glideBy(null, { factor, x: size.current.width / 2, y: size.current.height / 2 });
  return { viewport, world, view, reveal, zoom, snapshot: () => ({ ...current.current }), reset: () => { stop(); apply({ ...INITIAL }, true) },
    pan: (x: number, y: number) => { stop(); apply({ ...current.current, x: current.current.x + x, y: current.current.y + y }, true) },
    handlers: { onPointerDown, onPointerMove, onPointerUp, onClickCapture,
      onPointerCancel: () => { pointer.current = null; stop() } } };
}
