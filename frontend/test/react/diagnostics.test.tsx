import { notifyManager, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, expect, it, vi } from 'vitest';
import { queryClient } from '../../src/react/query';
import { DiagnosticsPage } from '../../src/react/diagnostics/diagnostics-page';
import { DIAGNOSTICS_KEY, type DiagnosticReport } from '../../src/react/diagnostics/diagnostics';
import { ScrapingExport } from '../../src/react/diagnostics/scraping-export';
import { buttonNamed, click, fetchMock, linkNamed, mount, settle, type } from './render';

notifyManager.setScheduler(notify => notify());
afterEach(() => queryClient.clear());

it('刮削导出按番号启动任务并保留服务端失败原因', async () => {
  const fetch = vi.fn(async (_url: string, options?: RequestInit) => options?.method === 'POST'
    ? new Response(JSON.stringify({ detail: '请填写有效番号，单次最多 20 个' }), { status: 400 })
    : new Response(JSON.stringify({ status: 'idle' })));
  vi.stubGlobal('fetch', fetch);
  const host = await mount(<QueryClientProvider client={queryClient}><ScrapingExport /></QueryClientProvider>);
  const input = host.querySelector('input')!;
  await type(input, 'ABC-123, DEF-456');
  await click(buttonNamed('导出刮削记录', host)!);
  await settle();
  const request = fetch.mock.calls.find(([, options]) => options?.method === 'POST')!;
  expect(request[0]).toBe('/api/diagnostics/exports');
  expect(JSON.parse(String(request[1]?.body))).toEqual({ kind: 'scraping', codes: 'ABC-123, DEF-456' });
  expect(host.textContent).toContain('请填写有效番号，单次最多 20 个');
  expect(buttonNamed('导出刮削记录', host)?.getAttribute('aria-busy')).not.toBe('true');
});

it('刮削记录显示后台进度并支持取消', async () => {
  const fetch = vi.fn(async (url: string) => new Response(JSON.stringify(url.endsWith('/cancel')
    ? { status: 'cancelled', job_id: 'export', kind: 'scraping' }
    : { status: 'running', job_id: 'export', kind: 'scraping', stage: '整理来源快照', done: 2, total: 8 })));
  vi.stubGlobal('fetch', fetch);
  const host = await mount(<QueryClientProvider client={queryClient}><ScrapingExport /></QueryClientProvider>);
  await settle();
  expect(host.querySelector('[role="progressbar"]')?.getAttribute('aria-valuenow')).toBe('2');
  expect(host.querySelector('[data-task-progress]')?.getAttribute('data-task-progress')).toBe('embedded');
  expect((buttonNamed('导出刮削记录', host) as HTMLButtonElement).disabled).toBe(true);
  await click(buttonNamed('取消导出', host));
  await settle();
  expect(host.textContent).toContain('导出已取消');
  expect(host.querySelector('[role="progressbar"]')).toBeNull();
  expect(fetch).toHaveBeenCalledWith('/api/diagnostics/exports/export/cancel', expect.objectContaining({ method: 'POST' }));
});
const data = (): DiagnosticReport => ({ version: 'test', status: 'warning', checks: {
  media_mounts: { label: '媒体挂载', status: 'warning', reason: '来源不存在', action: '检查媒体目录', target: '/settings/library', details: {} },
  security: { label: '访问安全', status: 'warning', reason: '密码未开启', action: '开启密码', target: '/settings/library', details: {} },
  data_root: { label: '数据目录', status: 'failed', reason: '没有权限', action: '调整权限', target: null, details: {} },
}, library: { issue_at: null, groups: {
  duration: { label: '缺时长', count: 2, status: 'ok', truncated: false, items: [
    { id: 1, code: 'ABC-123', title: '作品甲', name: '甲.mp4', path: 'R:\\Media\\甲.mp4', location: 'local', duration: null, size: 1024 },
    { id: 2, code: null, title: '作品乙', name: '乙.mp4', path: 'R:\\Media\\乙.mp4', location: 'local', duration: null, size: 2048 },
  ] },
  cover: { label: '缺封面', count: 0, status: 'ok', truncated: false, items: [] },
} }, sources: [{ source: 'javdb', label: 'javdb', status: 'unknown', reason: '当前解析状态未取得', last_success_at: null, cooldown_until: null }] });
async function open(report = data()) {
  queryClient.setQueryData(DIAGNOSTICS_KEY, report);
  const props = { openItem: vi.fn(), receipt: vi.fn() };
  const host = await mount(<QueryClientProvider client={queryClient}><DiagnosticsPage {...props} /></QueryClientProvider>);
  return { host, props };
}
it('诊断跳到具体配置分栏，系统权限项只显示动作', async () => {
  const { host } = await open();
  expect(linkNamed('打开媒体库与入库', host)?.getAttribute('href')).toBe('/settings/library');
  expect(linkNamed('打开网络与访问', host)?.getAttribute('href')).toBe('/settings/network');
  expect(buttonNamed('打开媒体库与入库', host)).toBeNull();
  const root = [...host.querySelectorAll('h3')].find(node => node.textContent === '数据目录')!.parentElement!.parentElement!;
  expect(root.textContent).toContain('调整权限');
  expect(root.querySelector('button, a')).toBeNull();
  expect(host.textContent).toContain('当前解析状态未取得');
});
it('展开作品表格并复制可识别信息；零结果有独立空态', async () => {
  const clipboard = vi.fn<(text: string) => Promise<void>>(async () => {});
  vi.stubGlobal('navigator', { clipboard: { writeText: clipboard } });
  const { host, props } = await open();
  await click(host.querySelector('summary'));
  await click(buttonNamed('作品甲', host));
  expect(props.openItem).toHaveBeenCalledWith(1);
  await click(buttonNamed('复制当前清单', host));
  await settle();
  expect(clipboard.mock.calls[0][0]).toContain('作品甲\tABC-123\t甲.mp4\t本地\tR:\\Media\\甲.mp4');
  expect(clipboard.mock.calls[0][0]).toContain('作品乙\t\t乙.mp4\t本地\tR:\\Media\\乙.mp4');
  expect(host.textContent).toContain('未识别');
  expect(props.receipt).toHaveBeenCalledWith('已复制清单');
  expect(host.querySelector('[data-empty-state]')?.textContent).toContain('清单为空');
});
it('请求失败保留原因和重试入口', async () => {
  vi.stubGlobal('fetch', fetchMock(403, { detail: '请在运行 Peach 的电脑上打开系统诊断' }));
  const props = { openItem: vi.fn(), receipt: vi.fn() };
  const host = await mount(<QueryClientProvider client={queryClient}><DiagnosticsPage {...props} /></QueryClientProvider>);
  await settle();
  expect(host.textContent).toContain('诊断读取失败');
  expect(host.textContent).toContain('请在运行 Peach 的电脑上打开系统诊断');
  expect(buttonNamed('重新检查', host)).not.toBeNull();
});
it('异常检查位于首区，其他检查可展开且没有重复条目', async () => {
  const report = data();
  report.checks.database = { label: '数据库', status: 'ok', reason: '可读取', action: '', target: null, details: {} };
  const { host } = await open(report);
  const priority = host.querySelector('section[aria-label="需要关注 · 3 项"]');
  expect(host.querySelector('section')).toBe(priority);
  expect([...priority!.querySelectorAll('h3')].map(node => node.textContent)).toEqual(['媒体挂载', '访问安全', '数据目录']);
  for (const check of Object.values(report.checks)) {
    expect([...host.querySelectorAll('h3,h4')].filter(node => node.textContent === check.label)).toHaveLength(1);
  }
  const summary = [...host.querySelectorAll('summary')].find(node => node.textContent === '其他检查 · 1 项');
  expect(summary?.getAttribute('aria-expanded')).toBe('false');
  await click(summary!);
  expect(summary?.getAttribute('aria-expanded')).toBe('true');
  expect(summary?.parentElement?.textContent).toContain('数据库');
});
it('恢复动作的名称与实际目标一致', async () => {
  const report = data();
  report.checks.security.target = '/settings/network';
  report.checks.ffmpeg = { label: '媒体工具', status: 'warning', reason: '缺少 FFmpeg', action: '安装工具', target: '/settings/maintenance', details: {} };
  report.checks.tasks = { label: '后台任务', status: 'warning', reason: '有任务失败', action: '查看原因', target: '/tasks', details: {} };
  const { host } = await open(report);
  expect(linkNamed('打开网络与访问', host)?.getAttribute('href')).toBe('/settings/network');
  expect(linkNamed('打开应用与维护', host)?.getAttribute('href')).toBe('/settings/maintenance');
  expect(linkNamed('查看任务', host)?.getAttribute('href')).toBe('/tasks');
  expect(linkNamed('打开来源和凭证', host)?.getAttribute('href')).toBe('/sources');
});

it('页头的诊断报告进度自己带框，和重新检查同排', async () => {
  vi.stubGlobal('fetch', vi.fn(async (url: string) => new Response(JSON.stringify(url.startsWith('/api/diagnostics/exports')
    ? { status: 'running', kind: 'support', job_id: 'report', stage: '收集日志', done: 1, total: 4 }
    : data()))));
  const { host } = await open();
  await settle();
  const report = host.querySelector('[data-guide-target="report"]')!;
  expect(report.querySelector('[data-task-progress]')?.getAttribute('data-task-progress')).toBe('framed');
  expect(buttonNamed('取消导出', report)?.parentElement).toBe(buttonNamed('重新检查', report)?.parentElement);
});

it('诊断报告启动时附浏览器环境，产物使用直接下载链接', async () => {
  const create = vi.spyOn(URL, 'createObjectURL');
  const fetch = vi.fn(async (_url: string, options?: RequestInit) => new Response(JSON.stringify(options?.method === 'POST'
    ? { status: 'complete', kind: 'support', job_id: 'report', bytes: 2048,
      download_url: '/api/diagnostics/exports/report/download' }
    : { status: 'idle' })));
  vi.stubGlobal('fetch', fetch);
  const { host } = await open();
  await click(buttonNamed('下载诊断报告', host));
  await settle();
  const request = fetch.mock.calls.find(([, options]) => options?.method === 'POST')!;
  expect(request[0]).toBe('/api/diagnostics/exports');
  const header = new Headers(request[1]?.headers).get('X-Peach-Browser-Diagnostics')!;
  const bytes = Uint8Array.from(atob(header), value => value.charCodeAt(0));
  expect(JSON.parse(new TextDecoder().decode(bytes)).native_codecs).toHaveProperty('h264');
  expect(create).not.toHaveBeenCalled();
  expect(linkNamed('下载已生成的文件', host)?.getAttribute('href')).toBe('/api/diagnostics/exports/report/download');
});
