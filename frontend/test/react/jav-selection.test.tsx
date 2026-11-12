import { act } from 'react';
import { afterEach, expect, it, vi } from 'vitest';
import { JavSelectionProvider, useJavSelection, useVisibleJavWorks } from '../../src/react/jav/jav-selection';
import { JAV_SELECTION_EVENT } from '../../src/jav-controls';
import { addWant } from '../../src/react/wants/wants';
import type { Discovery } from '../../src/react/jav/jav';
import { buttonNamed, click, mountRoot, settle } from './render';

vi.mock('../../src/react/wants/wants', () => ({ addWant: vi.fn(), invalidateWants: vi.fn() }));
vi.mock('../../src/react/jav/jav-batch-resources', () => ({
  JavBatchResources: ({ items }: { items: Discovery[] | null }) =>
    items ? <section aria-label="资源候选">{items.map(item => item.code).join(',')}</section> : null,
}));
afterEach(() => { vi.mocked(addWant).mockReset(); delete document.body.dataset.density });
const works = [1, 2, 3].map(id => ({ id, code: `ABC-00${id}`, wanted: false, title: `作品 ${id}` } as Discovery));
function Choices({ items }: { items: Discovery[] }) {
  useVisibleJavWorks(items);
  const selection = useJavSelection()!;
  return <div>{items.map(item => <button key={item.code} aria-pressed={selection.selected.has(item.code)}
    onClick={event => selection.toggle(item, event.shiftKey)}>{item.code}</button>)}</div>;
}
const view = (items = works, receipt = vi.fn()) =>
  <JavSelectionProvider readOnly={false} receipt={receipt}><Choices items={items} /></JavSelectionProvider>;
const start = async () => { await act(async () => { window.dispatchEvent(new Event(JAV_SELECTION_EVENT)) }) };

it('页头进入选择，Shift 连选、跨页保留，资源查找只拿所选作品', async () => {
  const { host, rerender } = await mountRoot(view());
  await start();
  await click(buttonNamed('ABC-001', host));
  await act(async () => buttonNamed('ABC-003', host)!.dispatchEvent(new MouseEvent('click', { bubbles: true, shiftKey: true })));
  expect(host.textContent).toContain('已选 3 部');
  await rerender(view([{ ...works[0]!, title: '刷新标题' }]));
  expect(host.textContent).toContain('已选 3 部');
  await click(buttonNamed('查找资源'));
  expect(document.querySelector('[aria-label="资源候选"]')?.textContent).toBe('ABC-001,ABC-002,ABC-003');
  await start();
  expect(buttonNamed('ABC-001', host)?.getAttribute('aria-pressed')).toBe('false');
});

it('全选仅影响当前页，加入失败保留未完成项，重试不重复已完成项', async () => {
  const receipt = vi.fn();
  vi.mocked(addWant).mockResolvedValueOnce({} as never).mockRejectedValueOnce(Error('服务不可用'));
  const { host } = await mountRoot(view(works, receipt));
  await start(); await click(buttonNamed('全选本页'));
  await click(buttonNamed('加入想要')); await settle();
  expect(document.querySelector('[role="alert"]')?.textContent).toContain('已加入 1 部；ABC-002 未完成');
  expect(host.textContent).toContain('已选 2 部');
  vi.mocked(addWant).mockResolvedValue({} as never);
  await click(buttonNamed('加入想要')); await settle();
  expect(vi.mocked(addWant).mock.calls.map(([target]) => target)).toEqual([
    { code: 'ABC-001' }, { code: 'ABC-002' }, { code: 'ABC-002' }, { code: 'ABC-003' },
  ]);
  expect(receipt).toHaveBeenCalledWith('已加入想要 2 部');
});

it('退出选择中止等待和后续提交，旧请求返回不污染新一轮选择', async () => {
  let finish!: (value: never) => void;
  vi.mocked(addWant).mockImplementationOnce(() => new Promise(resolve => { finish = resolve }));
  const receipt = vi.fn();
  const { host } = await mountRoot(view(works, receipt));
  await start(); await click(buttonNamed('全选本页')); await click(buttonNamed('加入想要'));
  const signal = vi.mocked(addWant).mock.calls[0]![1]!;
  await click(buttonNamed('取消选择'));
  expect(signal.aborted).toBe(true);
  await start(); await click(buttonNamed('ABC-001', host));
  await act(async () => finish({} as never));
  await settle();
  expect(addWant).toHaveBeenCalledTimes(1);
  expect(receipt).not.toHaveBeenCalled();
  expect(host.textContent).toContain('已选 1 部');
  expect(buttonNamed('ABC-001', host)?.getAttribute('aria-pressed')).toBe('true');
});
