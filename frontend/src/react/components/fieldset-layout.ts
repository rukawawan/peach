import { cardClass } from './card';

export type FieldsetLayout = 'split' | 'stack';

/** 内容态与骨架共用卡面、正文及操作区的布局。 */
export const FIELDSET_FACE = cardClass({ padding: 'none', className: 'overflow-hidden' });

export const FIELDSET_BODY: Record<FieldsetLayout, string> = {
  split: 'min-w-0 p-6',
  stack: 'flex min-h-30 min-w-0 flex-1 flex-col px-5 pt-5 pb-4 max-cleanup-tight:min-h-0 max-cleanup-tight:p-4.5',
};

export const FIELDSET_FOOT: Record<FieldsetLayout, string> = {
  split: 'flex flex-wrap items-center justify-end gap-2 self-stretch p-6'
    + ' max-[1001px]:justify-start max-[1001px]:pt-0',
  stack: 'flex min-h-14 flex-wrap items-center justify-end gap-2 border-t border-border-button-default'
    + ' bg-card-footer px-5 py-3 max-cleanup-tight:px-4.5',
};

export function fieldsetClass(layout: FieldsetLayout): string {
  return `${FIELDSET_FACE} ${layout === 'split' ? 'fieldset-split' : 'flex flex-col'}`;
}
