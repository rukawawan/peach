/* 在一张图上框一块。头像和封面共用这一份。
 *
 * 不引裁剪库：要的就是「一个能拖能缩的矩形」，算术全在 `crop-geometry.ts` 里，
 * 画面是一张图加五个绝对定位的块。引一个库进来换到的只有把手样式，代价是一条
 * 新依赖和一套它自己的坐标约定。
 *
 * 框的坐标一律是**源图像素**，进出这一层时各换算一次；屏幕上量到的显示像素不
 * 往外传。确认之后由后端按同一组整数裁，两边不会各取各的整。
 */
import { useCallback, useEffect, useId, useRef, useState } from 'react';
import type {
  CSSProperties, PointerEvent as ReactPointerEvent, KeyboardEvent as ReactKeyboardEvent,
} from 'react';
import { VisuallyHidden } from 'react-aria-components';

import {
  boxPercent, centeredBox, clampBox, handleOutside, isUsableSize, moveBox, resizeFromCorner, scaleBox, stepCropCorner, toNatural,
  type CropBox, type CropSize,
} from '../../crop-geometry';
import { t } from '../../i18n';

export interface CropFrameProps {
  src: string;
  drawSelection?: boolean;
  /** 宽/高。给了就锁比例，拖动只改位置和大小、不改形状。 */
  aspect: number | null;
  box: CropBox | null;
  size: CropSize | null;
  onBox(box: CropBox): void;
  onSize(size: CropSize): void;
  /** 无障碍名称，说清在框哪张图的哪一块。 */
  label: string;
}

/** 键盘一步走框宽的这个比例。一屏之内按住方向键能从一边走到另一边，又不至于
 *  一下越过一张脸。 */
const KEY_STEP = 0.02;
/** 滚轮一格缩放的倍率。 */
const WHEEL_STEP = 1.08;

function describeCrop(box: CropBox) {
  return t('catalog:cropFrame.dimensions', {
    width: box.x1 - box.x0, height: box.y1 - box.y0, x: box.x0, y: box.y0,
  });
}

export function CropFrame({ src, aspect, box, size, onBox, onSize, label, drawSelection = false }: CropFrameProps) {
  const descriptionId = useId();
  const image = useRef<HTMLImageElement>(null);
  const drag = useRef<{ mode: 'move' | 'resize'; x: number; y: number; box: CropBox } | null>(null);
  const selection = useRef<{ x: number; y: number } | null>(null);
  const [failed, setFailed] = useState(false);
  const [announcement, setAnnouncement] = useState('');
  /* 图当前的显示尺寸，只用来判断框在屏幕上够不够大、角柄放框里还是框外。 */
  const [shown, setShown] = useState<CropSize | null>(null);

  useEffect(() => { setFailed(false) }, [src]);
  useEffect(() => {
    const node = image.current;
    if (!node) return undefined;
    const observer = new ResizeObserver(() => setShown({ width: node.clientWidth, height: node.clientHeight }));
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  /** 显示像素的位移 → 源图像素。图片按 `max-w-full` 缩放，两个轴的比例一样。 */
  const scale = useCallback((dx: number, dy: number) => {
    const node = image.current;
    if (!node || !size) return { dx: 0, dy: 0 };
    return {
      dx: toNatural(dx, node.clientWidth, size.width),
      dy: toNatural(dy, node.clientHeight, size.height),
    };
  }, [size]);

  function start(mode: 'move' | 'resize') {
    return (event: ReactPointerEvent) => {
      if (!box || !size || event.button !== 0) return;
      event.preventDefault();
      event.stopPropagation();
      event.currentTarget.setPointerCapture(event.pointerId);
      drag.current = { mode, x: event.clientX, y: event.clientY, box };
    };
  }

  function move(event: ReactPointerEvent) {
    const active = drag.current;
    const node = image.current;
    if (!active || !node || !size) return;
    const shift = scale(event.clientX - active.x, event.clientY - active.y);
    if (active.mode === 'move') {
      onBox(moveBox(active.box, shift.dx, shift.dy, size));
      return;
    }
    onBox(resizeFromCorner(active.box, active.box.x0 + (active.box.x1 - active.box.x0) + shift.dx,
      active.box.y0 + (active.box.y1 - active.box.y0) + shift.dy, size, aspect));
  }

  function end(event: ReactPointerEvent) {
    if (!drag.current) return;
    drag.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }

  function imagePoint(event: ReactPointerEvent<HTMLImageElement>, source: CropSize) {
    const { left, top, width, height } = event.currentTarget.getBoundingClientRect();
    return {
      x: toNatural(Math.min(width, Math.max(0, event.clientX - left)), width, source.width),
      y: toNatural(Math.min(height, Math.max(0, event.clientY - top)), height, source.height),
    };
  }

  function selectArea(event: ReactPointerEvent<HTMLImageElement>) {
    if (!drawSelection || !size || event.button !== 0 || !event.isPrimary) return;
    event.preventDefault();
    selection.current = imagePoint(event, size);
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function resizeSelection(event: ReactPointerEvent<HTMLImageElement>) {
    const start = selection.current;
    if (!start || !size || !event.currentTarget.hasPointerCapture(event.pointerId)) return;
    const point = imagePoint(event, size);
    if (Math.abs(point.x - start.x) < 2 || Math.abs(point.y - start.y) < 2) return;
    onBox(clampBox({
      x0: Math.min(start.x, point.x), y0: Math.min(start.y, point.y),
      x1: Math.max(start.x, point.x), y1: Math.max(start.y, point.y),
    }, size, aspect));
  }

  const crop = box && size ? clampBox(box, size, aspect) : null;

  function keys(mode: 'move' | 'resize') {
    return (event: ReactKeyboardEvent) => {
      if (!crop || !size || event.target !== event.currentTarget || event.altKey || event.ctrlKey || event.metaKey) return;
      const widthStep = Math.max(1, (crop.x1 - crop.x0) * KEY_STEP);
      const heightStep = mode === 'resize' ? Math.max(1, (crop.y1 - crop.y0) * KEY_STEP) : widthStep;
      const steps: Record<string, [number, number]> = {
        ArrowLeft: [-widthStep, 0], ArrowRight: [widthStep, 0],
        ArrowUp: [0, -heightStep], ArrowDown: [0, heightStep],
      };
      const step = steps[event.key];
      let next: CropBox;
      if (step) {
        next = mode === 'move' ? moveBox(crop, ...step, size) : stepCropCorner(crop, ...step, size, aspect);
      } else if (mode === 'move' && ['+', '=', '-'].includes(event.key)) {
        next = scaleBox(crop, event.key === '-' ? 1 / WHEEL_STEP : WHEEL_STEP, size, aspect);
      } else {
        return;
      }
      event.preventDefault();
      const updated = clampBox(next, size, aspect);
      onBox(updated);
      setAnnouncement(describeCrop(updated));
    };
  }

  const rect = crop && size ? boxPercent(crop, size) : null;
  const outside = rect ? handleOutside(rect, shown) : false;
  /* 位置只经自定义属性进 CSS：六个百分数挂在容器上，压暗块与框本身各自用类名取用，
     样式仍然全在类里（`docs/FRONTEND.md`）。 */
  const frame = rect ? {
    '--crop-l': `${rect.left}%`, '--crop-t': `${rect.top}%`,
    '--crop-w': `${rect.width}%`, '--crop-h': `${rect.height}%`,
    '--crop-r': `${rect.left + rect.width}%`, '--crop-b': `${rect.top + rect.height}%`,
  } as CSSProperties : undefined;
  return (
    <div className="relative inline-block max-w-full select-none" style={frame}>
      <img ref={image} src={src} alt="" draggable={false}
        data-draw-crop={drawSelection || undefined}
        tabIndex={drawSelection && !box ? 0 : undefined}
        aria-label={drawSelection && !box ? label : undefined}
        onKeyDown={drawSelection && !box ? event => {
          if (!size || (event.key !== 'Enter' && event.key !== ' ')) return;
          event.preventDefault();
          onBox(scaleBox(centeredBox(size, aspect), 0.8, size, aspect));
          window.requestAnimationFrame(() => image.current?.parentElement?.querySelector<HTMLElement>('[data-crop-box]')?.focus());
        } : undefined}
        onPointerDown={drawSelection ? selectArea : undefined}
        onPointerMove={drawSelection ? resizeSelection : undefined}
        onLostPointerCapture={drawSelection ? () => { selection.current = null } : undefined}
        onLoad={(event) => {
          const node = event.currentTarget;
          if (isUsableSize({ width: node.naturalWidth, height: node.naturalHeight })) {
            onSize({ width: node.naturalWidth, height: node.naturalHeight });
          }
        }}
        onError={() => setFailed(true)}
        className="block max-h-crop-frame max-w-full object-contain" />
      <VisuallyHidden role="status" aria-live="polite">{announcement}</VisuallyHidden>
      {failed || !rect || !crop ? null : (
        <>
          <VisuallyHidden id={descriptionId}>{describeCrop(crop)}</VisuallyHidden>
          <VisuallyHidden id={`${descriptionId}-move`}>{t('catalog:cropFrame.moveHelp')}</VisuallyHidden>
          <VisuallyHidden id={`${descriptionId}-resize`}>{t('catalog:cropFrame.resizeHelp')}</VisuallyHidden>
          {/* 框外压暗。四块而不是一圈巨大的 box-shadow：后者在这一层的圆角与
              overflow 下会溢到弹层外面去。 */}
          <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-(--crop-t) bg-scrim" />
          <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 top-(--crop-b) bg-scrim" />
          <div aria-hidden className="pointer-events-none absolute left-0 top-(--crop-t) h-(--crop-h) w-(--crop-l) bg-scrim" />
          <div aria-hidden className="pointer-events-none absolute right-0 left-(--crop-r) top-(--crop-t) h-(--crop-h) bg-scrim" />
          {/* 框本身。整块可拖，右下角那枚小方块改大小；方向键与加减号做同样两件事。
              框在屏幕上很小（极扁、极长的图）时角柄整枚挪到框外右下，框里留给拖动。 */}
          <div role="group" tabIndex={0} aria-label={label} data-crop-box
            aria-describedby={`${descriptionId} ${descriptionId}-move`}
            onPointerDown={start('move')} onPointerMove={move}
            onPointerUp={end} onPointerCancel={end} onKeyDown={keys('move')}
            onWheel={(event) => {
              if (!box || !size) return;
              onBox(scaleBox(box, event.deltaY > 0 ? WHEEL_STEP : 1 / WHEEL_STEP, size, aspect));
            }}
            className="absolute left-(--crop-l) top-(--crop-t) h-(--crop-h) w-(--crop-w) cursor-move touch-none outline-none ring-2 ring-border-focus-ring ring-inset focus-visible:ring-4">
            <span role="group" tabIndex={0} aria-label={t('catalog:cropFrame.resizeCorner')}
              aria-describedby={`${descriptionId} ${descriptionId}-resize`}
              data-crop-handle data-outside={outside || undefined} onPointerDown={start('resize')}
              onPointerMove={move} onPointerUp={end} onPointerCancel={end} onKeyDown={keys('resize')}
              className="absolute -right-1.5 -bottom-1.5 data-outside:-right-3.5 data-outside:-bottom-3.5 size-3 cursor-nwse-resize touch-none rounded-xs border border-separator-border bg-background-full outline-none focus-visible:ring-2 focus-visible:ring-border-focus-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background-full" />
          </div>
        </>
      )}
      {failed
        ? <p className="p-4 text-body-2-regular text-text-secondary">{t('catalog:coverCrop.unreadableImage')}</p>
        : null}
    </div>
  );
}
