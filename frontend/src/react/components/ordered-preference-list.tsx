import { useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { VisuallyHidden } from 'react-aria-components';
import { Button } from '@/components/base/buttons/button';
import { t } from '../../i18n';
import { moveSidebarKey } from '../sidebar/sidebar-order';
import { useSidebarReorder } from '../sidebar/use-sidebar-reorder';
import { NavigationDropLine } from './navigation-order';
import { Select, SelectItem } from './select';
import { spriteGlyph } from './sprite-glyph';
import './ordered-preference-list.css';

const Grip = spriteGlyph('grip-vertical');
const Up = spriteGlyph('chevron-up');
const Down = spriteGlyph('chevron-down');
const Hide = spriteGlyph('eye-off');
const optionKey = (key: string) => 'item:' + key;

interface OrderedItem {
  key: string;
  label: string;
  icon?: ReactNode;
}

export function OrderedPreferenceList({ items, order, onChange, chooseLabel, allShown, empty, scrollable,
  allowEmpty = false, id, footer }: {
  items: readonly OrderedItem[];
  order: readonly string[];
  onChange(next: string[]): void;
  chooseLabel: string;
  allShown: string;
  empty?: ReactNode;
  scrollable?: boolean;
  allowEmpty?: boolean;
  id?: string;
  footer?: ReactNode;
}) {
  const list = useRef<HTMLDivElement>(null);
  const [picked, setPicked] = useState<string | null>(null);
  const byKey = new Map(items.map(item => [item.key, item]));
  const visible = order.map(key => byKey.get(key)).filter(item => item !== undefined);
  const available = items.filter(item => !order.includes(item.key));
  const chosen = available.find(item => optionKey(item.key) === picked) ?? available[0];
  const reorder = useSidebarReorder(list, order, onChange, () => {}, 'y', 'tab');

  const move = (key: string, index: number, direction: -1 | 1) => {
    const target = visible[index + direction];
    if (!target) return;
    const next = moveSidebarKey(order, key, target.key, direction === 1);
    if (next) onChange(next);
  };

  return <div data-sidebar-order="" className="peach-react" id={id}>
    <div data-ordered-preference-scroll={scrollable ? '' : undefined}>
      <div ref={list} data-navigation-order="preferences" data-navigation-axis="y" data-navigation-rows=""
        data-reordering={reorder.picked ? '' : undefined} onClickCapture={reorder.clickCapture}>
        {visible.map(({ key, label, icon }, index) => {
          const active = reorder.picked?.key === key;
          const { distance, delay } = reorder.nudge(key);
          return <div key={key} data-sidebar-row={key} data-tab={key} {...reorder.bindings(key)}
            role="group" aria-label={label} tabIndex={0} aria-keyshortcuts="Alt+ArrowUp Alt+ArrowDown"
            data-dragging={active ? '' : undefined}
            style={{ '--navigation-picked-offset': active ? `${reorder.picked?.offset}px` : undefined,
              '--sidebar-nudge': `${distance}px`, '--sidebar-delay': `${delay}ms` } as CSSProperties}>
            <span data-sidebar-label=""><span data-sidebar-grip=""><Grip /></span>{icon}<span className="font-normal wrap-anywhere">{label}</span></span>
            <span data-sidebar-actions="">
              <Button size="xs" variant="ghost" iconOnly leadingIcon={Up}
                data-sidebar-key={key} data-sidebar-move="-1" aria-label={t('settings:sidebarOrder.moveItemUp', { label })}
                title={t('settings:sidebarOrder.moveUp')} disabled={index === 0} onClick={() => move(key, index, -1)} />
              <Button size="xs" variant="ghost" iconOnly leadingIcon={Down}
                data-sidebar-key={key} data-sidebar-move="1" aria-label={t('settings:sidebarOrder.moveItemDown', { label })}
                title={t('settings:sidebarOrder.moveDown')} disabled={index === visible.length - 1} onClick={() => move(key, index, 1)} />
              <Button size="xs" variant="ghost" iconOnly leadingIcon={Hide}
                data-sidebar-key={key} data-sidebar-hide="" aria-label={t('settings:sidebarOrder.hideItem', { label })}
                title={t('settings:sidebarOrder.hide')} disabled={!allowEmpty && visible.length === 1}
                onClick={() => onChange(order.filter(item => item !== key))} />
            </span>
          </div>;
        })}
        <NavigationDropLine reorder={reorder} />
      </div>
    </div>
    {visible.length ? null : empty}
    <VisuallyHidden role="status" aria-live="polite">{reorder.announcement}</VisuallyHidden>
    <div data-sidebar-add-row="">
      <Select aria-label={chooseLabel} triggerClassName="h-(--control-h)" className="min-w-0"
        selectedKey={chosen ? optionKey(chosen.key) : null} isDisabled={!chosen}
        renderValue={chosen ? undefined : allShown}
        onSelectionChange={key => setPicked(key === null ? null : String(key))}>
        {available.map(({ key, label, icon }) => <SelectItem key={key} id={optionKey(key)} textValue={label}>
          {icon ? <span data-sidebar-picker-icon="" className="inline-flex shrink-0">{icon}</span> : null}<span>{label}</span>
        </SelectItem>)}
      </Select>
      <Button size="small" className="h-(--control-h)" data-sidebar-add="" disabled={!chosen}
        onClick={() => { if (chosen) onChange([...order, chosen.key]); }}>{t('settings:shared.add')}</Button>
    </div>
    {footer}
  </div>;
}
