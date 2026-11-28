import { act } from 'react';
import { beforeEach, expect, it } from 'vitest';
import { useTablePreferences } from '../../src/react/components/table-column-preferences';
import { mountRoot } from './render';
import { serveTableLayouts } from './table-layout-fixture';

const columns = [{ id: 'name', label: '名称', width: 280, required: true }, { id: 'extra', label: '补充', width: 160 }];
let first!: ReturnType<typeof useTablePreferences>, second!: ReturnType<typeof useTablePreferences>;
function Probe() { first = useTablePreferences('first', columns); second = useTablePreferences('second', columns); return null }
beforeEach(() => {
  localStorage.clear();
  serveTableLayouts();
});

it('各表独立保存列显示和列宽，隐藏列保留宽度，身份列保持可见', async () => {
  const root = await mountRoot(<Probe />);
  await act(async () => first.save(new Map([['extra', 360]]), 'extra'));
  await act(async () => first.change({ name: false, extra: false }));
  expect(first.visibility).toEqual({ extra: false });
  expect(first.widths.extra).toBe(360);
  expect(second.widths.extra).toBe(160);
  expect(second.visibility).toEqual({ extra: true });
  await root.unmount();
  await mountRoot(<Probe />);
  expect(first.widths.extra).toBe(360);
  expect(first.visibility.extra).toBe(false);
  await act(async () => first.reset());
  expect(first.widths.extra).toBe(160);
  expect(first.visibility.extra).toBe(false);
});

it('名称默认使用剩余宽度，手动宽度可恢复，重置后保持自适应', async () => {
  let preferences!: ReturnType<typeof useTablePreferences>;
  function Flexible() {
    preferences = useTablePreferences('flexible', [{ ...columns[0]!, flex: true }, columns[1]!]);
    return null;
  }
  localStorage.setItem('peach.table.flexible.widths.v1', JSON.stringify({ name: 280, extra: 160 }));
  const root = await mountRoot(<Flexible />);
  expect(preferences.columnProps('name').width).toBe('1fr');
  expect(preferences.columnProps('name').maxWidth).toBeUndefined();
  expect(preferences.columnProps('name').minWidth).toBe(280);
  expect(preferences.spaceWidth).toBe(0);
  await act(async () => preferences.save(new Map([['name', 720], ['extra', 180]]), 'name'));
  expect(preferences.columnProps('name').width).toBe(720);
  expect(preferences.columnProps('name').minWidth).toBe(96);
  expect(preferences.spaceWidth).toBe('1fr');
  await root.unmount();
  await mountRoot(<Flexible />);
  expect(preferences.columnProps('name').width).toBe(720);
  await act(async () => preferences.reset());
  expect(preferences.columnProps('name').width).toBe('1fr');
  await act(async () => preferences.save(new Map<string, number | '1fr'>([['name', '1fr'], ['extra', 200]]), 'extra'));
  expect(preferences.columnProps('name').width).toBe('1fr');
  expect(preferences.columnProps('extra').width).toBe(200);
});
