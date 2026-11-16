import { ColumnResizer } from 'react-aria-components';
import { Button } from '@/components/base/buttons/button';
import { SelectionPopover } from './selection-popover';
import type { TablePreferences } from './table-column-preferences';
import { t } from '../../i18n';

export function TableColumnControls({ preferences, label = t('shell:tableColumns.defaultLabel') }: { preferences: TablePreferences; label?: string }) {
  const columns = preferences.columns.filter(column => !column.required);
  return <div role="group" aria-label={t('shell:tableColumns.settings', { table: label })} className="flex flex-none gap-2">
    <SelectionPopover label={t('shell:tableColumns.visibleColumns', { table: label })} triggerLabel={t('shell:tableColumns.columns')} actionLayout="fullWidth"
      items={columns.map(column => ({ id: column.id, label: column.label, selected: preferences.visibility[column.id] !== false }))}
      onChange={(id, on) => preferences.change(current => ({ ...current, [id]: on }))}
      actions={[
        { label: t('shell:tableColumns.showAll'), onPress: () => preferences.change(Object.fromEntries(columns.map(column => [column.id, true]))) },
        { label: t('shell:tableColumns.reset'), onPress: () => preferences.change({}) },
      ]} />
    <Button variant="secondary" size="medium" onClick={preferences.reset}>{t('shell:tableColumns.resetWidths')}</Button>
  </div>;
}

export function TableColumnResizer({ preferences, id }: { preferences: TablePreferences; id: string }) {
  const column = preferences.columns.find(column => column.id === id)!;
  return preferences.canResize(id) ? <ColumnResizer aria-label={t('shell:tableColumns.resize', { column: column.label })} /> : null;
}
