/* 列表里的一段报错：平时只露一行（`errorHeadline`），「查看详情」展开全文。
 *
 * 后端回的常是整段 traceback 或整页 HTML，铺开会把一张卡撑成几屏高；只露一行又看不到全文，
 * 所以全文收在键后面，展开后保留原有换行、长 URL 就地折断，太长时在自己的框里滚。 */
import { useId, useState, type ReactNode } from 'react';

import { Button } from '@/components/base/buttons/button';

import { readableErrorHeadline } from './tasks';
import { cardClass } from '../components/card';
import { useOverlayScrollbar } from '../components/overlay-scrollbar';
import { t } from '../../i18n';

/** 完整报错共用限高容器与覆盖式滚动条。 */
export function ErrorDetails({ children, label, id }: { children: ReactNode; label: string; id?: string }) {
  const scroll = useOverlayScrollbar<HTMLDivElement>();
  return <div data-error-details="" className={cardClass({ bordered: 'soft', radius: 'surface', padding: 'none',
    className: 'relative w-full min-w-0 overflow-hidden bg-background-tertiary-default' })}>
    <div ref={scroll} id={id} role="region" aria-label={label} tabIndex={0}
      className="max-h-80 overflow-y-auto overscroll-contain p-3 text-body-2-regular whitespace-pre-line wrap-anywhere text-text-primary">
      {children}
    </div>
  </div>;
}

export function ErrorExcerpt({ text, className = '' }: { text: string; className?: string }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const full = String(text || '').trim();
  const head = readableErrorHeadline(full);
  if (!head) return null;
  const more = head !== full;
  return (
    <div data-error-excerpt="" className={`flex min-w-0 max-w-full flex-col items-start gap-1 ${className}`}>
      {open
        ? <ErrorDetails id={id} label={t('manage:errorExcerpt.fullDetails')}>{full}</ErrorDetails>
        : <p className="w-full wrap-anywhere">{head}</p>}
      {more
        ? <Button variant="ghost" size="small" data-error-details-toggle="" className="-ml-2" aria-expanded={open} aria-controls={open ? id : undefined}
            onClick={() => setOpen(!open)}>
            {open ? t('manage:errorExcerpt.hideDetails') : t('manage:errorExcerpt.showDetails')}
          </Button>
        : null}
    </div>
  );
}
