/* 活动页云下载段的行为：任务卡给哪些键、没有任务时整段不画、只读端不给写操作。 */
import { QueryClientProvider } from '@tanstack/react-query';
import { act } from 'react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { registerNameWritings, setNameLanguage } from '../../src/core/entity-names';

import { DownloadsPanel, downloadPollInterval } from '../../src/react/activity/downloads-panel';
import type { DownloadsSnapshot, DownloadTask } from '../../src/react/bundle';
import { queryClient } from '../../src/react/query';
import { buttonNamed, click, mount, settle } from './render';
import { showToast } from '../../src/react/toaster';

vi.mock('../../src/react/toaster', () => ({ showToast: vi.fn() }));

afterEach(() => queryClient.clear());
beforeEach(() => { registerNameWritings([]); setNameLanguage('zh-CN') });

const task = (patch: Partial<DownloadTask> = {}): DownloadTask => ({
  id: 1, info_hash: 'a'.repeat(40), provider: '115', provider_label: '115', source_uri: 'magnet:?xt=urn:btih:' + 'a'.repeat(40),
  display_name: 'ABC-123.mp4', target: '/115/云下载', code: 'ABC-123', title: null, origin: 'paste',
  state: 'remote_running', state_label: '网盘下载中', failure: null, failure_label: null, failure_detail: null,
  progress: 0.42, remote_name: null, ledger_path: null, asset_id: null, submitted_at: '2026-10-01T08:00:00Z',
  updated_at: '2026-10-01T08:01:00Z', finished_at: null, blocked: false, cancellable: true, resubmittable: false,
  postprocess_state: 'not_requested', postprocess_label: '整理未开始', postprocess_detail: null,
  postprocess_run_id: null, postprocessed_at: null, postprocess_active: false, postprocess_retryable: false,
  ...patch,
});

const snapshot = (patch: Partial<DownloadsSnapshot> = {}): DownloadsSnapshot => ({
  available: true,
  providers: [
    { key: '115', label: '115', configured: true, target: '/115/云下载' },
    { key: 'pikpak', label: 'PikPak', configured: true, target: '/云下载' },
  ],
  tasks: [],
  ...patch,
});

type Call = [string, RequestInit | undefined];

/** 读接口回 `shown`；写接口按地址回 `answers` 里那一份。 */
function serve(shown: DownloadsSnapshot, answers: Record<string, unknown> = {}) {
  const calls: Call[] = [];
  vi.stubGlobal('fetch', vi.fn(async (input: string, init?: RequestInit) => {
    calls.push([input, init]);
    const body = init?.method === 'POST' ? answers[input] : shown;
    return { ok: true, status: 200, json: async () => body };
  }));
  const posts = () => calls.filter(([, init]) => init?.method === 'POST')
    .map(([url, init]) => [url, JSON.parse(String(init!.body))]);
  return { calls, posts };
}

const show = async () => {
  const host = await mount(<QueryClientProvider client={queryClient}><DownloadsPanel /></QueryClientProvider>);
  // 首屏取数要走完 fetch、json 与 Query 派发三段，等到这一段画出内容为止。
  await vi.waitFor(async () => {
    await settle();
    if (!host.childElementCount) throw new Error('云下载段还没画出来');
  });
  return host;
};

it('下载卡片的可见署名和读屏名称跟随语言，人物链接保留原身份', async () => {
  registerNameWritings([], { 宮: '宫', 澤: '泽', 寧: '宁' });
  serve(snapshot({ tasks: [task({ artwork: { has_cover: false, code: 'ABC-123',
    performer_entities: [{ id: 20, name: '宮澤寧音', has_image: false }],
  } })] }));
  const host = await show();
  const link = host.querySelector('[data-media-avatar]');
  expect(link?.getAttribute('aria-label')).toBe('打开女优页：宫泽宁音');
  expect(link?.getAttribute('href')).toBe('/performers/20');
  expect(host.textContent).toContain('宫泽宁音');
  await act(async () => setNameLanguage('ja'));
  expect(link?.getAttribute('aria-label')).toBe('打开女优页：宮澤寧音');
  expect(host.textContent).toContain('宮澤寧音');
});

it.each([
  [{ title: '制作记录' }, 'ABC-123 · 制作记录'],
  [{ title: 'ABC-123 制作记录' }, 'ABC-123 · 制作记录'],
  [{ title: 'ABC-123' }, 'ABC-123'],
  [{ title: null, display_title: '', display_code: 'ABC-123' }, 'ABC-123'],
  [{ title: 'ABC-123', display_title: '作品资料中的标题' }, 'ABC-123 · 作品资料中的标题'],
  [{ code: null, display_code: 'XYZ-456', display_title: '制作花絮' }, 'XYZ-456 · 制作花絮'],
  [{ code: null, title: '制作记录', display_name: '' }, '制作记录'],
] as [Partial<DownloadTask>, string][])('云下载卡片用番号和标题标识作品：%j', async (patch, expected) => {
  serve(snapshot({ tasks: [task(patch)] }));
  const host = await show();
  expect(host.querySelector('strong')?.textContent).toBe(expected);
  await click(buttonNamed('展开标题', host));
  expect(host.querySelector('[data-download-title-full]')?.textContent).toBe(expected);
});

it('入库资料随轮询补上本机封面和女优头像，不发起来源取图', async () => {
  const shown = snapshot({ tasks: [task()] });
  const { calls } = serve(shown);
  const host = await show();
  expect(host.querySelector('[data-download-cover] img')).toBeNull();
  expect(buttonNamed('取消', host)).not.toBeNull();
  const refreshed = serve(snapshot({ tasks: [task({ state: 'ingested', cancellable: false, artwork: {
    has_cover: true, code: 'ABC-123', cover_key: 'ABC-123', cover_version: 'v2',
    performer_entities: [{ id: 20, name: '测试女优', has_image: true, image_version: 'a2' }],
  } })] }));
  await act(async () => { await queryClient.invalidateQueries({ queryKey: ['downloads'] }); });
  await vi.waitFor(async () => {
    await settle();
    expect(host.querySelector('[data-download-cover] img')?.getAttribute('src')).toBe('/cover?code=ABC-123&thumb=2&v=v2');
  });
  expect(host.querySelector('[data-media-avatar] img')?.getAttribute('src')).toContain('/entity-image?');
  expect(host.querySelector('[data-media-avatar]')?.getAttribute('aria-label')).toBe('打开女优页：测试女优');
  expect([...calls, ...refreshed.calls].every(([url]) => url.startsWith('/api/downloads'))).toBe(true);
});

it.each([
  [{ state: 'ingested', asset_id: 42 }, '/assets/42'],
  [{ state: 'ingested', asset_id: null }, null],
  [{ state: 'remote_running', asset_id: 42 }, null],
] as [Partial<DownloadTask>, string | null][])('只有已入库并关联作品的任务提供封面和标题链接：%j', async (patch, href) => {
  serve(snapshot({ tasks: [task(patch)] }));
  const host = await show();
  expect(host.querySelector('[data-download-cover-link]')?.getAttribute('href') ?? null).toBe(href);
  expect(host.querySelector('[data-download-title-link]')?.getAttribute('href') ?? null).toBe(href);
});

it('远端在跑的任务给进度与取消键，取消发到取消接口', async () => {
  const { posts } = serve(snapshot({ tasks: [task()] }), { '/api/downloads/cancel': { ok: true, task: task() } });
  const host = await show();
  const card = host.querySelector('[data-download-state=remote_running]')!;
  expect(card.querySelector('[role=progressbar]')?.getAttribute('aria-valuenow')).toBe('42');
  expect(card.textContent).toContain('网盘下载中');
  expect(buttonNamed('重新提交', card)).toBeNull();
  // 辅助的两个在前，改动任务的取消排在最后。
  expect([...card.querySelectorAll('[data-download-actions] button')].map((node) => node.textContent))
    .toEqual(['展开标题', '复制磁力', '取消']);
  await click(buttonNamed('取消', card));
  await settle();
  expect(posts()).toEqual([['/api/downloads/cancel', { id: 1 }]]);
});

it('失败的任务写中文原因，可以重新提交；被判违规的只剩复制磁力', async () => {
  const failed = task({ id: 2, state: 'failed', state_label: '失败', failure: 'no_source', cancellable: false,
    resubmittable: true, failure_label: '没有可用下载源或进度长时间未更新', failure_detail: '远端任务列表里找不到它' });
  const blocked = task({ id: 3, state: 'failed', state_label: '失败', failure: 'rejected', cancellable: false,
    blocked: true, failure_label: '网盘拒绝下载该资源', failure_detail: '50038' });
  const { posts } = serve(snapshot({ tasks: [failed, blocked] }),
    { '/api/downloads': { ok: true, outcome: 'submitted', task: failed } });
  const host = await show();
  const [first, second] = [...host.querySelectorAll('[data-download-state=failed]')];
  expect(first?.textContent).toContain('没有可用下载源或进度长时间未更新：远端任务列表里找不到它');
  expect(second?.textContent).toContain('网盘拒绝下载该资源');
  expect([buttonNamed('取消', second!), buttonNamed('重新提交', second!)]).toEqual([null, null]);
  expect(buttonNamed('复制磁力', second!)).not.toBeNull();
  await click(buttonNamed('重新提交', first!));
  await settle();
  expect(posts()).toEqual([['/api/downloads', {
    magnet: failed.source_uri, provider: '115', target: '/115/云下载', code: 'ABC-123', title: null, origin: 'paste',
  }]]);
});

it('网盘空间不足时整段顶部给一条渠道提示，说明浏览器添加已暂停', async () => {
  const failed = task({ id: 4, state: 'failed', state_label: '失败', failure: 'storage', cancellable: false,
    resubmittable: true, failure_label: '网盘空间不足', failure_detail: '扩容或清理网盘空间后再提交' });
  serve(snapshot({ tasks: [failed], channel_alerts: [{ provider: '115', provider_label: '115', failure: 'storage',
    message: '扩容或清理网盘空间后再提交', message_code: 'errors.downloads.remoteStorageFull', message_params: {},
    since: '2026-11-13T00:00:00+00:00' }] }));
  const host = await show();
  const note = host.querySelector('[role=note]');
  expect(note?.textContent).toBe('115：网盘空间不足扩容或清理网盘空间后再提交。浏览器添加已暂停，恢复后自动继续');
  expect(host.querySelector('[data-download-state=failed]')?.textContent).toContain('网盘空间不足：扩容或清理网盘空间后再提交');
});

it('网盘配置失效的渠道提示按错误显示', async () => {
  serve(snapshot({ tasks: [task({ id: 5, state: 'failed', failure: 'config', cancellable: false, resubmittable: true,
    failure_label: '配置或登录有误', failure_detail: '还没有填 CloudDrive2 的 API 令牌' })],
  channel_alerts: [{ provider: '115', provider_label: '115', failure: 'config', message: '还没有填 CloudDrive2 的 API 令牌',
    message_code: 'errors.downloadsClouddrive.tokenMissing', message_params: {}, since: '2026-11-13T00:00:00+00:00' }] }));
  const host = await show();
  expect(host.querySelector('[role=note]')).toBeNull();
  expect(host.querySelector('[role=alert]')?.textContent).toContain('115：配置或登录有误');
});

it('对账遇到暂时性故障退避重排时，底栏写出原因，卡片不算失败', async () => {
  serve(snapshot({ tasks: [task({ failure_detail: '查询进度时连不上 CloudDrive2：timeout' })] }));
  const host = await show();
  const card = host.querySelector<HTMLElement>('[data-download-state=remote_running]')!;
  expect(card.textContent).toContain('稍后自动重试 · 查询进度时连不上 CloudDrive2：timeout');
  expect(card.className).not.toContain('border-border-error-default');
  expect(buttonNamed('重新提交', card)).toBeNull();
  expect(buttonNamed('取消', card)).not.toBeNull();
});

it('只读端任务照常列出，但没有取消键', async () => {
  serve(snapshot({ available: false, tasks: [task()] }));
  const host = await show();
  expect(host.querySelector('[data-download-state=remote_running]')).not.toBeNull();
  expect(buttonNamed('取消', host)).toBeNull();
});

it('后处理失败可以单独重试，不会重新提交磁力', async () => {
  const failed = task({
    state: 'ingested', state_label: '已入库', cancellable: false,
    postprocess_state: 'failed', postprocess_label: '整理失败',
    postprocess_detail: '资料采集失败', postprocess_retryable: true,
  });
  const { posts } = serve(snapshot({ tasks: [failed] }), {
    '/api/downloads/postprocess': { ok: true, task: failed },
  });
  const host = await show();
  expect(host.textContent).toContain('资料采集失败');
  await click(buttonNamed('重试入库后整理', host));
  await settle();
  expect(posts()).toEqual([['/api/downloads/postprocess', { id: 1 }]]);
});

it('一条任务都没有时整段不画，也没有提交表单', async () => {
  const { calls } = serve(snapshot());
  const host = await mount(<QueryClientProvider client={queryClient}><DownloadsPanel /></QueryClientProvider>);
  await vi.waitFor(async () => {
    await settle();
    if (!calls.length) throw new Error('还没取数');
  });
  await settle();
  expect(host.childElementCount).toBe(0);
});

it('有任务还在跟进时五秒查一次，全是终态三十秒一次', () => {
  expect(downloadPollInterval(snapshot({ tasks: [task()] }))).toBe(5_000);
  expect(downloadPollInterval(snapshot({ tasks: [task({ cancellable: false, state: 'ingested' })] }))).toBe(30_000);
  expect(downloadPollInterval(snapshot({ tasks: [task({
    cancellable: false, state: 'ingested', postprocess_active: true, postprocess_state: 'running',
  })] }))).toBe(5_000);
  expect(downloadPollInterval(undefined)).toBe(30_000);
});

it('云下载分页失败保留列表，重试替换当前页并支持返回', async () => {
  let fail = true;
  vi.stubGlobal('fetch', vi.fn(async (input: string) => {
    const current = input.includes('page=2') ? 2 : 1;
    if (current === 2 && fail) return { ok: false, status: 500, json: async () => ({ message: '读取失败' }) };
    return { ok: true, status: 200, json: async () => snapshot({
      tasks: current === 2 ? [task({ id: 1 })] : [task({ id: 3 }), task({ id: 2 })],
      page: current, total: 21,
    }) };
  }));
  const host = await show();
  await click(buttonNamed('下一页', host));
  await vi.waitFor(() => expect(host.textContent).toContain('读取失败'));
  expect(host.querySelectorAll('[data-download-id]')).toHaveLength(2);
  fail = false;
  await click(buttonNamed('下一页', host));
  await vi.waitFor(() => expect(host.querySelectorAll('[data-download-id]')).toHaveLength(1));
  await act(async () => { await queryClient.invalidateQueries({ queryKey: ['downloads'] }); });
  expect(host.querySelector('[data-download-id]')?.getAttribute('data-download-id')).toBe('1');
  await click(buttonNamed('上一页', host));
  await vi.waitFor(() => expect(host.querySelectorAll('[data-download-id]')).toHaveLength(2));
});

it('复制磁力成功显示 toast，按钮保留操作名称', async () => {
  const writeText = vi.fn(async () => {});
  vi.stubGlobal('navigator', { clipboard: { writeText } });
  serve(snapshot({ tasks: [task()] }));
  const host = await show();
  await click(buttonNamed('复制磁力', host));
  expect(writeText).toHaveBeenCalledWith(task().source_uri);
  expect(showToast).toHaveBeenCalledWith('download-copy-1', expect.objectContaining({ html: '已复制磁力', alert: false }));
  expect(buttonNamed('复制磁力', host)).not.toBeNull();
});
