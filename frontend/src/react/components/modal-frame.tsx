/* 模态弹层的外壳：遮罩、浮层那一档面与圆角、里面一个 React Aria `Dialog`。
 *
 * React Aria 组合保留 Peach 的尺寸与 Portal，进入和退出使用 BoardUI Modal 过渡。
 * 层级取遗留壳的 `--layer-dialog`（`z-dialog`）：顶栏和侧栏各有自己的 z-index，比 Tailwind
 * 那档 `z-50` 都高，遮罩压不住它们，弹层开着时那两块还亮着。
 *
 * 宽度按用途取一档：换头像一排四张候选、裁剪封面放得下整张封套、填一份表同
 * `ui-kit/modal.css` 里 `.ui-geist-modal` 的 540px。
 *
 * 页头左边那枚 56px 图标方块也在这里（`ModalGlyph`）：它是弹层页头的一部分，不是卡。 */
import { useCallback, useLayoutEffect, useRef, type ReactNode } from 'react';
import { useFocusVisible } from 'react-aria';
import { Dialog, Modal, ModalOverlay } from 'react-aria-components';
import { cx } from '@/utils/cx';

const WIDTH = {
  'avatar-picker': 'max-w-avatar-picker',
  'cover-crop': 'max-w-cover-crop',
  form: 'max-w-form-modal',
  collections: 'max-w-4xl',
  tutorial: 'max-w-2xl',
} as const;

export function ModalFrame({ isOpen, onOpenChange, width, label, children, surfaceClassName = '', surfaceData, portalContainer, shouldCloseOnInteractOutside,
  fullScreen = false, fitVisualViewport = false, onExited, side }: {
  isOpen: boolean;
  onOpenChange(open: boolean): void;
  width: keyof typeof WIDTH;
  /** 弹层没有 `Heading slot="title"` 时的无障碍名称。 */
  label?: string;
  surfaceClassName?: string;
  surfaceData?: Record<`data-${string}`, string | undefined>;
  /** 从原生 dialog 内打开的子弹层留在其 top layer 中。 */
  portalContainer?: Element;
  shouldCloseOnInteractOutside?(element: Element): boolean;
  fullScreen?: boolean;
  /** 含搜索输入的移动端目录浮层随软键盘后的可见视口定位。 */
  fitVisualViewport?: boolean;
  side?: 'right';
  onExited?(): void;
  children: ReactNode;
}) {
  const { isFocusVisible } = useFocusVisible();
  const overlay = useRef<HTMLDivElement>(null);
  const exited = useRef(onExited);
  useLayoutEffect(() => { exited.current = onExited }, [onExited]);
  const setOverlay = useCallback((element: HTMLDivElement | null) => {
    const previous = overlay.current;
    overlay.current = element;
    if (!element && previous) queueMicrotask(() => { if (!overlay.current) exited.current?.() });
  }, []);
  useLayoutEffect(() => {
    const element = overlay.current;
    const viewport = window.visualViewport;
    if (!isOpen || !fitVisualViewport || !element || !viewport) return;
    const place = () => element.style.setProperty('--modal-viewport-top', `${viewport.offsetTop}px`);
    place();
    viewport.addEventListener('scroll', place);
    viewport.addEventListener('resize', place);
    return () => {
      viewport.removeEventListener('scroll', place);
      viewport.removeEventListener('resize', place);
    };
  }, [fitVisualViewport, isOpen]);
  return (
    <ModalOverlay ref={setOverlay} isOpen={isOpen} onOpenChange={onOpenChange} isDismissable UNSTABLE_portalContainer={portalContainer}
      shouldCloseOnInteractOutside={shouldCloseOnInteractOutside}
      data-modal-motion="" data-modal-kind={width} data-modal-side={side} data-motion-instant={!side && isFocusVisible || undefined}
      data-fit-visual-viewport={fitVisualViewport || undefined}
      className={cx('fixed inset-0 z-dialog flex', side ? 'items-stretch justify-end' : 'items-center justify-center',
        !fullScreen && !side && 'p-4',
        fitVisualViewport && 'h-(--visual-viewport-height)')}>
      <div aria-hidden="true" data-modal-backdrop="" className="pointer-events-none absolute inset-0 bg-scrim" />
      <Modal {...surfaceData} data-modal-surface="" data-modal-width={fullScreen ? 'fullscreen' : width}
        className={cx('relative flex max-h-full w-full transform-gpu flex-col overflow-hidden bg-background-full',
          fullScreen ? 'h-dvh' : side ? 'modal-drawer-width rounded-l-3xl shadow-dropdown'
            : ['rounded-2-5xl border border-separator-border shadow-dropdown', WIDTH[width]], surfaceClassName)}>
        {/* 调用方自己的正文滚动区收得下时这一层不滚；矮视口里连页头加按钮都放不下，就整块滚，
            关闭键总够得着。 */}
        <Dialog aria-label={label} className={cx('flex min-h-0 flex-col overflow-y-auto overscroll-contain outline-none', (fullScreen || side) && 'flex-1')}>{children}</Dialog>
      </Modal>
    </ModalOverlay>
  );
}

/** 弹层页头左边的方图标槽，字形由调用方给（`size-6`）。 */
export function ModalGlyph({ children }: { children: ReactNode }) {
  return (
    <span aria-hidden className="flex size-14 shrink-0 items-center justify-center rounded-2xl border border-separator-border bg-background-secondary-default text-foreground-icon-secondary">
      {children}
    </span>
  );
}
