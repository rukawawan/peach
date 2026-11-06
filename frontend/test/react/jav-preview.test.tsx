import { notifyManager, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, expect, it, vi } from 'vitest';
import { JavDetailPage } from '../../src/react/jav-detail/jav-detail-page';
import { javDetailKey, type JavDetail } from '../../src/react/jav-detail/jav-detail';
import { queryClient } from '../../src/react/query';
import { buttonNamed, click, fetchMock, mountRoot, sentBody, settle } from './render';

const player = vi.hoisted(() => vi.fn((_video: HTMLVideoElement, _source: { src: string; type: string }, _failed: () => void) => vi.fn()));
vi.mock('../../src/player', () => ({ mountPreviewPlayer: player }));
notifyManager.setScheduler(notify => notify());
afterEach(() => { queryClient.clear(); player.mockClear() });

it('官方MP4预告进入现有播放器并在关闭时销毁', async () => {
  const src = '/jav-preview/EXM-001/0123456789abcdef';
  const item: JavDetail = { code: 'EXM-001', title: '示例作品', state: 'ready', summary: '', director: '', publisher: '',
    performers: '', performer_refs: [], studio_refs: [], series_refs: [], tags: [], has_cover: false,
    source_image: false, preview_count: 0, comments_count: 0, source_url: '', wanted: false, want_id: null,
    preview_video_url: src };
  queryClient.setQueryData(javDetailKey(item.code), item);
  vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, status: 200, json: async () => ({ ok: true, image: '' }) })));
  const mounted = await mountRoot(<QueryClientProvider client={queryClient}><JavDetailPage code={item.code} readOnly
    actions={{ close: vi.fn(), navigate: vi.fn(), openTag: vi.fn(), receipt: vi.fn() }} /></QueryClientProvider>);
  await click(mounted.host.querySelector('[data-jav-preview-toggle]'));
  await settle();
  expect(player).toHaveBeenCalledOnce();
  expect(player.mock.calls[0]?.[1]).toEqual({ src, type: 'video/mp4' });
  expect(mounted.host.querySelector('video')?.getAttribute('aria-label')).toBe('视频预览');
  const dispose = player.mock.results[0]!.value;
  await mounted.unmount();
  expect(dispose).toHaveBeenCalledOnce();
});

const missingCover: JavDetail = { code: 'EXM-002', title: '示例作品', state: 'ready', summary: '', director: '', publisher: '',
  performers: '', performer_refs: [], studio_refs: [], series_refs: [], tags: [], has_cover: false,
  source_image: false, preview_count: 0, comments_count: 0, source_url: '', wanted: false, want_id: null };

async function mountMissingCover(reply: unknown) {
  queryClient.setQueryData(javDetailKey(missingCover.code), missingCover);
  const fetcher = fetchMock(200, reply);
  vi.stubGlobal('fetch', fetcher);
  const mounted = await mountRoot(<QueryClientProvider client={queryClient}><JavDetailPage code={missingCover.code} readOnly
    actions={{ close: vi.fn(), navigate: vi.fn(), openTag: vi.fn(), receipt: vi.fn() }} /></QueryClientProvider>);
  return { fetcher, host: mounted.host };
}

it('没有封面时画廊给空态与立即重试，取到后换成本机封面', async () => {
  const { fetcher, host } = await mountMissingCover({ ok: true, has_cover: true, cover_version: 'v7', message: '' });
  try {
    const empty = host.querySelector('[data-jav-picture-wait] [data-empty-state]');
    expect(empty?.querySelector('h3')?.textContent).toBe('封面未取得');
    await click(buttonNamed('立即重试', empty!));
    await settle();
    expect(fetcher.mock.calls[0]?.[0]).toBe('/api/jav/cover');
    expect(sentBody(fetcher)).toEqual({ code: 'EXM-002' });
    expect(host.querySelector('[data-empty-state]')).toBeNull();
    expect(host.querySelector('img[data-jav-picture]')?.getAttribute('src')).toBe('/cover?code=EXM-002&thumb=1&v=v7');
  } finally { vi.unstubAllGlobals() }
});

it('重试没取到时空态写出服务端给的原因', async () => {
  const { host } = await mountMissingCover({ ok: true, has_cover: false, cover_version: '', message: '来源连接失败' });
  try {
    await click(buttonNamed('立即重试', host));
    await settle();
    expect(host.querySelector('[data-empty-state] p')?.textContent).toBe('来源连接失败');
  } finally { vi.unstubAllGlobals() }
});
