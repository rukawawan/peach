import { act } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, expect, it, vi } from 'vitest';

import { CommunitySharingSettings } from '../../src/react/settings/community-sharing-settings';
import { LibrarySharingDelivery, type LibrarySharingState } from '../../src/react/settings/library-sharing-settings';
import { buttonNamed, click, mount, settle, switches } from './render';

const initial: LibrarySharingState = { enabled: false, available: true, schema: 4,
  fields: ['作品编号、标签、评分与全部偏好维度'], notice: '上传馆藏与各类偏好明细。' };
const metadata = { enabled: false, available: true, schema: 1, last_attempt: {} };
const state = { library: initial, metadata };

async function mountPlan(receipt = vi.fn()) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const host = await mount(<QueryClientProvider client={client}>
    <CommunitySharingSettings active receipt={receipt} />
  </QueryClientProvider>);
  await act(async () => { await new Promise(resolve => setTimeout(resolve, 0)); });
  return host;
}

describe('共建计划的明确同意', () => {
  it('展示快照编号及压缩大小，并说明接收回执的含义', async () => {
    const host = await mount(<LibrarySharingDelivery value={{ ...initial, enabled: true, last_attempt: {
      snapshot_id: 'a'.repeat(32), status: 'accepted', attempted: true, raw_bytes: 4096, compressed_bytes: 1024,
    } }} />);
    expect(host.textContent).toContain('a'.repeat(32));
    expect(host.textContent).toContain('原始 4.0 KiB，gzip 压缩后 1.0 KiB。');
    expect(host.textContent).toContain('接收端已接受请求，附件留存需由接收端归档核验。');
  });

  it.each([
    [{ status: 'waiting-data', attempted: false }, '等待可分析的馆藏或偏好数据。'],
    [{ status: 'failed', attempted: false }, '馆藏与口味上传未完成，将自动重新准备。'],
    [{ status: 'failed', attempted: true }, '馆藏与口味上传失败，本周不再发送。'],
    [{ status: 'unknown', attempted: true }, '无法确认上传结果，本周暂停再次发送。'],
  ])('按实际发送状态显示反馈 %j', async (last_attempt, message) => {
    const host = await mount(<LibrarySharingDelivery value={{ ...initial, enabled: true, last_attempt }} />);
    expect(host.textContent).toContain(message);
  });

  it('仅参加研究时显示部分参与，可直接关闭两类分享', async () => {
    const fetcher = vi.fn(async (_url: string, init: RequestInit) => ({ ok: true, json: async () =>
      init.method === 'POST' ? state : { ...state, library: { ...initial, enabled: true } } }));
    vi.stubGlobal('fetch', fetcher);
    const host = await mountPlan();
    expect(switches(host)).toHaveLength(1);
    expect(switches(host)[0].checked).toBe(true);
    expect(host.textContent).toContain('当前仅参与馆藏与偏好研究');
    expect(buttonNamed('预览并参加完整计划', host)).not.toBeNull();
    await click(switches(host)[0]);
    await settle();
    expect(JSON.parse(String(fetcher.mock.calls[1]?.[1].body))).toEqual({ enabled: false });
    expect(switches(host)[0].checked).toBe(false);
  });

  it('任一预览失败时保留关闭状态，可以重试且不会发送确认请求', async () => {
    const fetcher = vi.fn(async (url: string) => url.endsWith('/preview')
      ? { ok: false, status: 500, json: async () => ({ detail: '读取失败' }) }
      : { ok: true, json: async () => state });
    vi.stubGlobal('fetch', fetcher);
    const receipt = vi.fn();
    const host = await mountPlan(receipt);
    await click(buttonNamed('预览分享内容', host));
    await settle();
    expect(switches(host)[0].checked).toBe(false);
    expect(host.querySelector('[role="alert"]')?.textContent).toContain('读取失败');
    expect(fetcher).toHaveBeenCalledTimes(3);
    expect(receipt).not.toHaveBeenCalled();
  });

  it('刷新未取得时保留原参与状态', async () => {
    const enabled = {
      library: { ...initial, enabled: true, participation: { status: 'not-attempted', pending_state: 'enabled' } },
      metadata: { ...metadata, enabled: true },
    };
    const fetcher = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => enabled })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ section_errors: {} }) });
    vi.stubGlobal('fetch', fetcher);
    const host = await mountPlan();
    await click(buttonNamed('刷新状态', host));
    await settle();
    expect(host.querySelector('[role="alert"]')?.textContent).toContain('共建计划状态读取失败');
    expect(switches(host)[0].checked).toBe(true);
  });
});
