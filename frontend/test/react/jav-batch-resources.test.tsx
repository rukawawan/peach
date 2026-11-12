import { QueryClientProvider, notifyManager } from '@tanstack/react-query';
import { afterEach, expect, it, vi } from 'vitest';
import { JavBatchResources } from '../../src/react/jav/jav-batch-resources';
import { queryClient } from '../../src/react/query';
import type { Discovery } from '../../src/react/jav/jav';
import { buttonNamed, click, mount, settle } from './render';

notifyManager.setScheduler(notify => notify());
afterEach(() => { queryClient.clear(); localStorage.clear() });
const works = [1, 2].map(id => ({ id, code: `DEMO-00${id}`, title: `作品 ${id}` } as Discovery));

it('批量查找逐番号取资源，沿用下载配置，查看不会自动提交下载', async () => {
  const fetcher = vi.fn(async (url: string, _init?: RequestInit) => ({ ok: true, status: 200, json: async () =>
    url.startsWith('/api/downloads') ? { available: true, providers: [], tasks: [] }
      : { state: 'ready', items: [], error: '', checked_at: null } }));
  vi.stubGlobal('fetch', fetcher);
  const close = vi.fn();
  await mount(<QueryClientProvider client={queryClient}><JavBatchResources items={works} close={close} readOnly={false} receipt={vi.fn()} /></QueryClientProvider>);
  await settle();
  expect(fetcher.mock.calls.map(([url]) => url)).toEqual(expect.arrayContaining([
    '/api/downloads?limit=50', '/api/jav/resources?code=DEMO-001', '/api/jav/resources?code=DEMO-002',
  ]));
  expect(fetcher.mock.calls.every(([, init]) => !init?.method || init.method === 'GET')).toBe(true);
  expect(document.querySelectorAll('[data-want-magnets]')).toHaveLength(2);
  await click(document.querySelector('button[aria-label="关闭批量资源查找"]'));
  expect(close).toHaveBeenCalledOnce();
});

it('下载配置失败显示原因，资源查询仍独立返回', async () => {
  vi.stubGlobal('fetch', vi.fn(async (url: string) => ({ ok: !url.startsWith('/api/downloads'),
    status: url.startsWith('/api/downloads') ? 503 : 200,
    json: async () => url.startsWith('/api/downloads') ? { error: '服务暂不可用' }
      : { state: 'ready', items: [], error: '', checked_at: null } })));
  await mount(<QueryClientProvider client={queryClient}><JavBatchResources items={[works[0]!]} close={vi.fn()} readOnly={false} receipt={vi.fn()} /></QueryClientProvider>);
  await settle();
  expect(document.body.textContent).toContain('下载配置未取得');
  expect(document.body.textContent).toContain('服务暂不可用');
  expect(buttonNamed('添加下载')).toBeNull();
});
