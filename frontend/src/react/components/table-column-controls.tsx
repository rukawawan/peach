import { useRef, useState } from 'react';
import { ColumnResizer, Popover } from 'react-aria-components';
import { Button, type ButtonProps } from '@/components/base/buttons/button';
import { MENU_POPOVER_SURFACE } from '@/components/base/dropdown/menu-styles';
import { cx } from '@/utils/cx';
import { MenuDialog } from './menu-dialog';
import { NavigationOrderRows } from './navigation-order';
import { SelectionPopover } from './selection-popover';
import type { TablePreferences } from './table-column-preferences';
import { t } from '../../i18n';

export function TableColumnLayout({ preferences, label, resizable = true, size }: {
  preferences: TablePreferences; label: string; resizable?: boolean; size?: ButtonProps['size'];
}) {
  const trigger = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const keys = preferences.columnOrder.filter(id => id !== 'select');
  const defaults = preferences.defaultOrder.filter(id => id !== 'select');
  const atDefaultOrder = keys.every((id, index) => id === defaults[index]);
  const title = t('shell:tableColumns.layout');
  return <>
    <Button ref={trigger} variant="secondary" size={size} aria-haspopup="dialog" aria-expanded={open} onClick={() => setOpen(true)}>
      <span data-copy-key="tableColumns.layout">{title}</span>
    </Button>
    <Popover triggerRef={trigger} isOpen={open} onOpenChange={setOpen} placement="bottom end" offset={4}
      className={cx('peach-react w-72', MENU_POPOVER_SURFACE)}>
      <MenuDialog aria-label={t('shell:tableColumns.layoutForTable', { table: label })} className="flex min-h-0 flex-col gap-2 outline-none">
        <div data-column-order-list="" className="overflow-y-auto overscroll-contain">
          <NavigationOrderRows reset={false} labels={Object.fromEntries(preferences.columns.map(column => [column.id, column.label]))}
            order={{ label: title, keys, defaults, commit: preferences.changeOrder }} />
        </div>
        <div className="flex flex-wrap justify-end gap-2">
          {resizable ? <Button variant="secondary" size="small"
            onClick={preferences.reset}><span data-copy-key="tableColumns.resetWidths">{t('shell:tableColumns.resetWidths')}</span></Button> : null}
          <Button variant="secondary" size="small" aria-disabled={atDefaultOrder}
            onClick={atDefaultOrder ? undefined : preferences.resetOrder}>
            <span data-copy-key="tableColumns.resetOrder">{t('shell:tableColumns.resetOrder')}</span>
          </Button>
        </div>
      </MenuDialog>
    </Popover>
  </>;
}

export function TableColumnControls({ preferences, label = t('shell:tableColumns.defaultLabel'), size }: {
  preferences: TablePreferences; label?: string; size?: ButtonProps['size'];
}) {
  const columns = preferences.columns.filter(column => !column.required);
  return <div role="group" aria-label={t('shell:tableColumns.settings', { table: label })} className="flex max-w-full flex-none flex-wrap gap-2">
    <SelectionPopover label={t('shell:tableColumns.visibleColumns', { table: label })} triggerLabel={t('shell:tableColumns.columns')} triggerSize={size} actionLayout="fullWidth"
      items={columns.map(column => ({ id: column.id, label: column.label, selected: preferences.visibility[column.id] !== false }))}
      onChange={(id, on) => preferences.change(current => ({ ...current, [id]: on }))}
      actions={[
        { label: t('shell:tableColumns.showAll'), onPress: () => preferences.change(Object.fromEntries(columns.map(column => [column.id, true]))) },
        { label: t('shell:tableColumns.reset'), onPress: () => preferences.change({}) },
      ]} />
    <TableColumnLayout preferences={preferences} label={label} size={size} />
  </div>;
}

export function TableColumnResizer({ preferences, id, fixedDivider = false }: {
  preferences: TablePreferences; id: string; fixedDivider?: boolean;
}) {
  const column = preferences.columns.find(column => column.id === id)!;
  if (preferences.canResize(id)) return <ColumnResizer aria-label={t('shell:tableColumns.resize', { column: column.label })} />;
  return fixedDivider ? <span data-table-column-divider="" aria-hidden="true" /> : null;
}
