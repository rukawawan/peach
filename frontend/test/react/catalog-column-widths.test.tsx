import { act } from 'react';
import { beforeEach, expect, it, vi } from 'vitest';
import { useCatalogTablePreferences } from '../../src/react/catalog-grid/catalog-column-widths';
import { catalogColumns, columnSizes } from '../../src/react/catalog-grid/catalog-table-columns';
import { mountRoot, settle } from './render';
import { serveTableLayouts } from './table-layout-fixture';

const key = 'peach.catalog-column-widths.v1';
let sizing!: ReturnType<typeof useCatalogTablePreferences>;
let layouts!: ReturnType<typeof serveTableLayouts>;
const defaults = Object.fromEntries(catalogColumns.filter(column => !column.required)
  .map(column => [column.id, column.visible]));
function Probe() { sizing = useCatalogTablePreferences(); return null }
beforeEach(() => {
  localStorage.clear();
  layouts = serveTableLayouts();
});

it('损坏或超限偏好不会破坏列宽，选择列保持固定', async () => {
  for (const [saved, name] of [['broken', '1fr'], ['null', '1fr'], ['[]', '1fr'],
    ['{"name":99999}', '1fr'], ['{"name":9999,"select":200,"dur":-10,"size":"wide"}', 2000]] as const) {
    localStorage.setItem(key, saved);
    const root = await mountRoot(<Probe />);
    expect(sizing.widths.name).toBe(name);
    expect(sizing.widths.select).toBe(48);
    expect(sizing.widths.dur).toBeGreaterThanOrEqual(columnSizes.dur!.min);
    expect(sizing.widths.size).toBe(columnSizes.size!.width);
    await root.unmount();
  }
});

it('列显示偏好只允许隐藏数据列，保留隐藏列的自定义宽度', async () => {
  localStorage.setItem('peach.catalog-column-visibility.v1', '{"name":false,"select":false,"rating":false,"unknown":false}');
  await mountRoot(<Probe />);
  await settle();
  expect(sizing.visibility).toEqual({ ...defaults, rating: false });
  expect(localStorage.getItem('peach.catalog-column-visibility.v1')).toBeNull();
  await act(async () => sizing.save(new Map([['code', 260]]), 'code'));
  await act(async () => sizing.save(new Map([['name', 480]]), 'name'));
  expect(sizing.widths.code).toBe(260);
  await act(async () => sizing.change(current => ({ ...current, plays: false })));
  expect(layouts.catalog?.visibility).toEqual({ ...defaults, rating: false, plays: false });
  await act(async () => sizing.change({ code: true }));
  expect(sizing.visibility.code).toBe(true);
  await act(async () => sizing.change({}));
  expect(sizing.visibility).toEqual(defaults);
});

it('调整结束保存列宽，重置清除偏好，存储被禁用时仍可调整', async () => {
  const root = await mountRoot(<Probe />);
  await act(async () => sizing.save(new Map([['name', 512], ['select', 100]]), 'name'));
  expect(layouts.catalog?.widths).toEqual({ name: 512 });
  expect(sizing.widths.select).toBe(48);
  await root.unmount();
  await mountRoot(<Probe />);
  expect(sizing.widths.name).toBe(512);
  await act(async () => sizing.reset());
  expect(layouts.catalog?.widths).toEqual({});
  expect(sizing.widths.name).toBe('1fr');
  expect(localStorage.getItem(key)).toBeNull();
  const blocked = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('存储未允许') });
  try {
    await act(async () => sizing.save(new Map([['name', 480]]), 'name'));
    expect(sizing.widths.name).toBe(480);
  } finally { blocked.mockRestore() }
});
