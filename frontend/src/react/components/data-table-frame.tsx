import { useEffect, useRef, type MouseEvent, type PropsWithChildren } from 'react';
import { attachOverlayScrollbar } from '@peach/legacy/ui';
import { wireTableScroller } from '../../ui-kit/scroll';
import { ResizableTableContainer } from 'react-aria-components';
import type { TablePreferences } from './table-column-preferences';
import './table-column-controls.css';

import { clickedBlank } from './row-click';

export interface DataTableFrameProps extends PropsWithChildren {
  /** 关注来源表需要额外的排序图标规则；外框与行状态仍由这个共享组件负责。 */
  follow?: boolean;
  preferences?: TablePreferences;
  /** 给了就是整行可选：点在某一行的空白处时以那一行的 `data-key`（React Aria 写在 `tr` 上的
   *  行 id）回调；点在行里的勾、键、链接上不算。 */
  onRowClick?(key: string): void;
}

/* 拖宽期间在根元素上做标记，整页锁成左右箭头光标且不选字；不用 `html:has(…)` 判断，那样每次
 * DOM 变动都要重新匹配整棵树，首页启动会慢几百毫秒。 */
const markResizing = () => { document.documentElement.dataset.columnResizing = '' };

/** BoardUI Table 的 Data Table 外框：主表面、完整边线、圆角与选中行反馈。 */
export function DataTableFrame({ children, follow = false, onRowClick, preferences }: DataTableFrameProps) {
  const host = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const viewport = host.current?.querySelector<HTMLElement>('.overflow-x-auto') ?? null;
    attachOverlayScrollbar(viewport);
    wireTableScroller(viewport);
  });
  const click = onRowClick ? (event: MouseEvent<HTMLDivElement>) => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    const row = target.closest<HTMLElement>('[role="row"][data-key]');
    if (row && clickedBlank(event, row)) onRowClick(row.dataset.key!);
  } : undefined;
  return (
    <div ref={host} data-board-data-table data-resizable-table={preferences ? '' : undefined} data-follow-table={follow || undefined} onClick={click}>
      {preferences ? <ResizableTableContainer className="relative min-w-0" onResizeStart={markResizing} onResize={preferences.resize}
        onResizeEnd={widths => { delete document.documentElement.dataset.columnResizing; preferences.save(widths) }}>
        {children}
      </ResizableTableContainer> : children}
    </div>
  );
}
