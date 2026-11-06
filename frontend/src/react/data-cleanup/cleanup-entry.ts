import { cardClass } from '../components/card';

/** 数据管理中可跳转入口的共同样式，也供首屏加载态复用。 */
export const CLEANUP_ENTRY_GRID = 'inline-grid w-full grid-cols-2 gap-3 max-cleanup-tight:grid-cols-1';
export const CLEANUP_ENTRY = {
  face: cardClass({ padding: 'none', radius: 'plain', interactive: true,
    className: 'flex min-h-28 items-start gap-3 p-4 text-left' }),
  icon: 'flex size-9 shrink-0 items-center justify-center rounded-lg bg-background-primary-default text-foreground-icon-primary',
  body: 'flex min-w-0 flex-1 flex-col gap-1',
  title: 'text-headline-medium text-text-primary wrap-anywhere',
  summary: 'text-body-2-regular tabular-nums text-text-secondary wrap-anywhere',
  detail: 'text-caption-1-regular text-text-tertiary wrap-anywhere',
  arrow: 'size-4 shrink-0 self-center text-foreground-icon-tertiary',
} as const;
