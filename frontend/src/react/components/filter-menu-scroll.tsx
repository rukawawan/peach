import type { ComponentProps } from 'react';
import { cx } from '@/utils/cx';
import { useOverlayScrollbar } from './overlay-scrollbar';
import './filter-menu.css';

/** 筛选列表占满弹层宽度，内容留内边距，覆盖式轨道固定在弹层边缘。 */
export function FilterMenuScroll({ className, ...props }: ComponentProps<'div'>) {
  const scroll = useOverlayScrollbar<HTMLDivElement>();
  return <div data-filter-menu-scroll-host="">
    <div {...props} data-filter-menu-scroll="" ref={scroll} className={cx('min-w-0', className)} />
  </div>;
}
