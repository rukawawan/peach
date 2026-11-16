import { describe, expect, it, vi } from 'vitest';

import { LibrarySharingSettings, type LibrarySharingState } from '../../src/react/settings/library-sharing-settings';
import { actionOrder, buttonNamed, click, mount, settle, switches } from './render';

const initial: LibrarySharingState = { enabled: false, available: true, schema: 4,
  fields: ['作品编号、标签、评分与全部偏好维度'], notice: '匿名处理后上传馆藏与各类偏好明细。' };

describe('馆藏与口味分享的明确同意', () => {
  it('展示快照编号及压缩大小，并说明接收回执的含义', async () => {
    const host = await mount(<LibrarySharingSettings initial={{ ...initial, enabled: true, last_attempt: {
      snapshot_id: 'a'.repeat(32), status: 'accepted', attempted: true, raw_bytes: 4096, compressed_bytes: 1024,
    } }} receipt={vi.fn()} />);
    expect(host.textContent).toContain('a'.repeat(32));
    expect(host.textContent).toContain('原始 4.0 KiB，gzip 压缩后 1.0 KiB。');
    expect(host.textContent).toContain('接收端已接受请求，附件留存需由接收端归档核验。');
  });
  it.each([
    [{ status: 'waiting-data', attempted: false }, '等待可分析的馆藏或偏好数据。'],
    [{ status: 'failed', attempted: false }, '馆藏与口味上传未完成，将自动重新准备。'],
    [{ status: 'failed', attempted: true }, '馆藏与口味上传失败，本周不再发送。'],
    [{ status: 'unknown', attempted: true }, '未取得上传结果，本周不再发送。'],
  ])('按实际发送状态显示反馈 %j', async (last_attempt, message) => {
    const host = await mount(<LibrarySharingSettings initial={{ ...initial, enabled: true, last_attempt }} receipt={vi.fn()} />);
    expect(host.textContent).toContain(message);
  });

  it('开关始终可见，上传预览和明确同意完整后才能开启', async () => {
    const fetcher = vi.fn(async (url: string) => ({ ok: true, json: async () => url.endsWith('/preview')
      ? { data: { library: [{ code: 'EXM-001' }], preferences: {}, coverage: { uncoded_items: 0 } }, bytes: 80, compressed_bytes: 60, token: 'preview-token', schema: 4 }
      : { ...initial, enabled: true } }));
    vi.stubGlobal('fetch', fetcher);
    const receipt = vi.fn();
    const host = await mount(<LibrarySharingSettings initial={initial} receipt={receipt} />);
    expect(fetcher).not.toHaveBeenCalled();
    expect(host.textContent).toContain(initial.notice);
    expect(switches(host)[0]?.checked).toBe(false);
    await click(switches(host)[0]);
    expect(fetcher).not.toHaveBeenCalled();
    expect(switches(host)[0]?.checked).toBe(false);
    expect(host.querySelector('details')?.open).toBe(false);
    expect(host.querySelector('input[type="checkbox"]:not([role="switch"])')).toBeNull();
    await click(buttonNamed('预览上传内容', host));
    await settle();
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(host.textContent).toContain('随机标识用于实例去重');
    expect((buttonNamed('同意并开启上传', host) as HTMLButtonElement).disabled).toBe(true);
    expect(actionOrder(buttonNamed('同意并开启上传', host)!.parentElement)).toEqual(['取消', '预览上传内容', '同意并开启上传']);
    await click(host.querySelector('input[type="checkbox"]:not([role="switch"])'));
    await click(buttonNamed('同意并开启上传', host));
    await settle();
    const call = fetcher.mock.calls[1]! as unknown as [string, RequestInit];
    expect(JSON.parse(String(call[1].body))).toEqual({ enabled: true, schema: 4, consent: true, preview_token: 'preview-token' });
    expect(receipt).toHaveBeenCalledWith('已保存馆藏与口味上传选项');
    expect(switches(host)[0]?.checked).toBe(true);
    expect(host.querySelector('details')?.open).toBe(false);
    expect(host.querySelector('pre')).toBeNull();
    expect(host.querySelector('input[type="checkbox"]:not([role="switch"])')).toBeNull();
    expect(buttonNamed('预览上传内容', host)).not.toBeNull();
  });

  it('关闭不要求重新预览或勾选', async () => {
    const fetcher = vi.fn(async () => ({ ok: true, json: async () => initial }));
    vi.stubGlobal('fetch', fetcher);
    const host = await mount(<LibrarySharingSettings initial={{ ...initial, enabled: true }} receipt={vi.fn()} />);
    await click(switches(host)[0]!);
    await settle();
    const call = fetcher.mock.calls[0]! as unknown as [string, RequestInit];
    expect(JSON.parse(String(call[1].body)).enabled).toBe(false);
    expect(switches(host)[0]?.checked).toBe(false);
  });

  it('预览失败时保留关闭状态，可重试且不报保存成功', async () => {
    const fetcher = vi.fn(async () => ({ ok: false, status: 500, json: async () => ({ detail: '读取失败' }) }));
    vi.stubGlobal('fetch', fetcher);
    const receipt = vi.fn();
    const host = await mount(<LibrarySharingSettings initial={initial} receipt={receipt} />);
    await click(switches(host)[0]);
    await click(buttonNamed('预览上传内容', host));
    await settle();
    expect(switches(host)[0]?.checked).toBe(false);
    expect(host.querySelector('[role="alert"]')?.textContent).toContain('读取失败');
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(receipt).not.toHaveBeenCalled();
  });

  it('刷新未取得时保留原参与状态，不把缺失响应当作关闭或成功', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => ({ section_errors: {} }) })));
    const host = await mount(<LibrarySharingSettings initial={{ ...initial,
      participation: { status: 'unknown', pending_state: null } }} receipt={vi.fn()} />);
    await click(buttonNamed('刷新发送状态', host));
    await settle();
    expect(host.querySelector('[role="alert"]')?.textContent).toContain('馆藏上传状态未取得');
    expect(host.querySelector('[aria-label="参与状态"]')?.textContent).toBe('结果未取得');
    expect(host.querySelector('[aria-label="参与状态"]')?.getAttribute('data-status-tone')).toBe('warning');
  });
});
