import { useRef, useState, type ReactNode } from 'react';
import { Popover } from 'react-aria-components';
import { Button, type ButtonProps } from '@/components/base/buttons/button';
import { Checkbox } from '@/components/base/checkbox/checkbox';
import { MENU_POPOVER_SURFACE } from '@/components/base/dropdown/menu-styles';
import { cx } from '@/utils/cx';
import { MenuDialog } from './menu-dialog';
import { SelectionActions, type SelectionAction } from './selection-actions';
import { t } from '../../i18n';

/** 多选弹层的选项靠近触发器，操作区随实际展开方向放在远端。 */
export function SelectionPopover({ label, triggerLabel, leadingIcon, items, onChange, actions,
  actionLayout = 'inline', empty = t('shell:selectionPopover.empty') }: {
  label: string;
  triggerLabel: string;
  leadingIcon?: ButtonProps['leadingIcon'];
  items: readonly { id: string; label: ReactNode; selected: boolean; disabled?: boolean }[];
  onChange(id: string, selected: boolean): void;
  actions: readonly SelectionAction[];
  actionLayout?: 'inline' | 'fullWidth';
  empty?: string;
}) {
  const trigger = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const actionBar = <SelectionActions key="actions" actions={actions} layout={actionLayout} onNavigate={() => setOpen(false)} />;
  const options = <div key="options" data-selection-options="" className="flex min-w-0 flex-col gap-1">
    {items.length ? items.map(item => <Checkbox key={item.id} isSelected={item.selected}
      className="min-w-0 [&>span:last-child]:min-w-0 [&>span:last-child]:wrap-anywhere"
      isDisabled={item.disabled} onChange={on => onChange(item.id, on)}>{item.label}</Checkbox>)
      : <span className="text-caption-1-regular text-text-secondary">{empty}</span>}
  </div>;
  return <>
    <Button ref={trigger} variant="secondary" leadingIcon={leadingIcon}
      aria-haspopup="dialog" aria-expanded={open} aria-label={triggerLabel}
      onClick={() => setOpen(true)}>{triggerLabel}</Button>
    <Popover triggerRef={trigger} isOpen={open} onOpenChange={setOpen} placement="bottom end" offset={4}
      className={cx(MENU_POPOVER_SURFACE, 'w-max overscroll-contain')}>
      {({ placement }) => <MenuDialog aria-label={label} data-selection-placement={placement ?? 'bottom'}
          className="flex w-max max-w-full flex-col gap-2 outline-none">
        {placement === 'top' ? [actionBar, options] : [options, actionBar]}
      </MenuDialog>}
    </Popover>
  </>;
}
