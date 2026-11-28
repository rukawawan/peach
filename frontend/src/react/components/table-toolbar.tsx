import { useRef, type ReactNode } from 'react';
import { useToolbar } from 'react-aria';

/** 表格操作组共用一个 Tab 入口。文本光标和输入控件仍处理自己的方向键。 */
export function TableToolbar({ label, className, responsive, children }: {
  label: string; className?: string; responsive?: boolean; children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const { toolbarProps } = useToolbar({ 'aria-label': label }, ref);
  return <div {...toolbarProps} ref={ref} className={className} data-responsive-toolbar={responsive ? '' : undefined}
    onKeyDownCapture={event => {
      if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
        if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
        if (event.target instanceof Element && event.target.closest(
          'input:not([type=checkbox], [type=radio]), textarea, [contenteditable]:not([contenteditable=false]), [role=slider]',
        )) return;
      }
      toolbarProps.onKeyDownCapture?.(event);
    }}>
    {children}
  </div>;
}
