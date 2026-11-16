/* 已登录的设备：本机标记、逐台撤销、撤销其他设备，以及别处打开时只能看。
 * 撤销都要先过确认弹层：确认了才发，取消了不发。外观由预览与 e2e 量。 */
import { notifyManager, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, expect, it, vi } from 'vitest';
import * as legacyUi from '@peach/legacy/ui';

import { queryClient } from '../../src/react/query';
import { AccessSettings } from '../../src/react/settings/access-settings';
import { DeviceSessions, lastSeen, type DeviceSession, type DeviceSessionList } from '../../src/react/settings/device-sessions';
import { buttonNamed, click, mount, section, settle } from './render';

notifyManager.setScheduler(notify => notify());
afterEach(() => { queryClient.clear(); vi.restoreAllMocks(); vi.unstubAllGlobals(); localStorage.clear() });

const now = Math.floor(Date.now() / 1000);
const row = (fields: Partial<DeviceSession>): DeviceSession => ({
  id: '0000000000000000', device: 'Chrome · Windows', network: 'loopback', remote: false,
  created_at: now - 7200, last_seen: now - 10, expires: now + 86400, legacy: false, current: false, ...fields,
});
const desk = row({ id: 'aaaaaaaaaaaaaaaa', current: true });
const phone = row({ id: 'bbbbbbbbbbbbbbbb', device: 'Safari · iPhone', network: '198.51.100.0/24', last_seen: now - 300 });
const laptop = row({ id: 'cccccccccccccccc', device: '', network: '203.0.113.0/24', remote: true, last_seen: now - 3 * 86400, legacy: true });
const listing = (sessions: DeviceSession[], manageable = true): DeviceSessionList => ({ revision: 'one', sessions, manageable });

type Confirmation = Parameters<typeof legacyUi.confirmModal>[0];
function confirmWith(answer: boolean) {
  const seen: Confirmation[] = [];
  vi.spyOn(legacyUi, 'confirmModal').mockImplementation((async (options: Confirmation) => {
    seen.push(options);
    if (answer) await options.onConfirm?.();
    return { confirmed: answer };
  }) as typeof legacyUi.confirmModal);
  return seen;
}

/** 第一次回列表，之后每次回 `after`（撤销接口的回话）。 */
function serve(first: DeviceSessionList, after?: DeviceSessionList & { removed: number }) {
  const fetcher = vi.fn(async (_url: string, options?: RequestInit) => ({
    ok: true, status: 200, json: async () => (options?.method === 'POST' ? after : first),
  }));
  vi.stubGlobal('fetch', fetcher);
  return fetcher;
}

const render = async (receipt = vi.fn()) => {
  const host = await mount(<QueryClientProvider client={queryClient}><DeviceSessions revision="one" receipt={receipt} /></QueryClientProvider>);
  await settle();
  return host;
};
const rows = (host: HTMLElement) => [...section(host, '已登录的设备')!.querySelectorAll('p.text-body-regular')].map(node => node.textContent);

it('列出设备：本机排第一并标「本机」，其余写最近活动与来源网段', async () => {
  serve(listing([desk, phone, laptop]));
  const host = await render();
  expect(rows(host)).toEqual(['Chrome · Windows', 'Safari · iPhone', '未识别的浏览器']);
  const card = section(host, '已登录的设备')!;
  expect(card.textContent).toContain('本机');
  expect(card.textContent).toContain('最近活动 刚刚 · 运行 Peach 的电脑');
  expect(card.textContent).toContain('最近活动 5 分钟前 · 198.51.100.0/24');
  expect(card.textContent).toContain('最近活动 3 天前 · 公网入口 · 203.0.113.0/24');
  expect(card.querySelector('button[aria-label="撤销 Chrome · Windows 的登录"]')).toBeNull();
  expect(card.querySelector('button[aria-label="撤销 Safari · iPhone 的登录"]')).not.toBeNull();
  expect(buttonNamed('撤销其他设备', card)).not.toBeNull();
});

it('每行有终端图标，认得出的浏览器与系统各在名字前配标志', async () => {
  const tablet = row({ id: 'eeeeeeeeeeeeeeee', device: 'Chrome · Android tablet' });
  const linux = row({ id: 'ffffffffffffffff', device: 'Firefox · Linux' });
  serve(listing([desk, phone, tablet, laptop, linux]));
  const host = await render();
  const lines = [...section(host, '已登录的设备')!.querySelectorAll('p.text-body-regular')];
  expect(lines.map(line => line.textContent)).toEqual(['Chrome · Windows', 'Safari · iPhone', 'Chrome · Android 平板', '未识别的浏览器', 'Firefox · Linux']);
  /* 行首图标和标签同在一个 flex 容器里；浏览器标志是素材图，平台标志是字形，都在标签 <p> 内。 */
  const terminals = lines.map(line => line.parentElement!.previousElementSibling?.tagName.toLowerCase());
  expect(terminals).toEqual(['svg', 'svg', 'svg', 'svg', 'svg']);
  expect(lines.map(line => line.querySelector('img')?.getAttribute('src'))).toEqual(
    ['/browser-icon/chrome', '/browser-icon/safari', '/browser-icon/chrome', undefined, '/browser-icon/firefox']);
  expect(lines.map(line => line.querySelectorAll('svg').length)).toEqual([1, 1, 1, 0, 0]);
  const shapes = lines.slice(0, 4).map(line => line.parentElement!.previousElementSibling!.innerHTML);
  /* 电脑、手机、平板、认不出的设备各是一种图形。 */
  expect(new Set(shapes).size).toBe(4);
});

it('平台标志按品牌标记取色（色值在样式表），ChromeOS 用 Chrome 彩色标志', async () => {
  const chromebook = row({ id: '1111111111111111', device: 'Chrome · ChromeOS' });
  serve(listing([desk, phone, row({ id: '2222222222222222', device: 'Chrome · Android' }), chromebook]));
  const host = await render();
  const lines = [...section(host, '已登录的设备')!.querySelectorAll('p.text-body-regular')];
  expect(lines.map(line => line.querySelector('[data-platform-mark]')?.getAttribute('data-platform-mark')))
    .toEqual(['windows', 'apple', 'android', undefined]);
  expect([...lines[3]!.querySelectorAll('img')].map(img => img.getAttribute('src'))).toEqual(['/browser-icon/chrome', '/browser-icon/chrome']);
});

it('撤销一台先确认，确认后按这一行的 id 发请求并换上服务端回的列表', async () => {
  const receipt = vi.fn();
  const fetcher = serve(listing([desk, phone, laptop]), { ...listing([desk, laptop]), removed: 1 });
  const seen = confirmWith(true);
  const host = await render(receipt);
  await click(host.querySelector('button[aria-label="撤销 Safari · iPhone 的登录"]'));
  await settle();
  expect(seen[0]).toMatchObject({ title: '撤销这台设备的登录', confirmLabel: '撤销登录' });
  expect(seen[0]!.body).toContain('Safari · iPhone（最近活动 5 分钟前 · 198.51.100.0/24）');
  const [url, options] = fetcher.mock.calls.at(-1)!;
  expect(url).toBe('/api/configuration/access/sessions/revoke');
  expect(JSON.parse(String(options?.body))).toEqual({ revision: 'one', id: 'bbbbbbbbbbbbbbbb' });
  expect(rows(host)).toEqual(['Chrome · Windows', '未识别的浏览器']);
  expect(receipt).toHaveBeenCalledWith('已撤销登录');
});

it('取消确认不发请求', async () => {
  const fetcher = serve(listing([desk, phone]));
  confirmWith(false);
  const host = await render();
  await click(buttonNamed('撤销其他设备', host));
  await settle();
  expect(fetcher.mock.calls.filter(([, options]) => options?.method === 'POST')).toHaveLength(0);
  expect(rows(host)).toEqual(['Chrome · Windows', 'Safari · iPhone']);
});

it('撤销其他设备只留本机，回执写撤销了几台', async () => {
  const receipt = vi.fn();
  const fetcher = serve(listing([desk, phone, laptop]), { ...listing([desk]), removed: 2 });
  const seen = confirmWith(true);
  const host = await render(receipt);
  await click(buttonNamed('撤销其他设备', host));
  await settle();
  expect(seen[0]!.body).toContain('除本机以外的 2 台设备');
  expect(JSON.parse(String(fetcher.mock.calls.at(-1)![1]?.body))).toEqual({ revision: 'one', scope: 'others' });
  expect(rows(host)).toEqual(['Chrome · Windows']);
  expect(buttonNamed('撤销其他设备', host)).toBeNull();
  expect(receipt).toHaveBeenCalledWith('已撤销 2 台设备的登录');
});

it('不在运行 Peach 的电脑上时只列出，不给撤销键', async () => {
  serve(listing([phone, row({ id: 'dddddddddddddddd', current: true, device: 'Safari · iPhone' })], false));
  const host = await render();
  const card = section(host, '已登录的设备')!;
  expect(card.querySelectorAll('button')).toHaveLength(0);
  expect(card.textContent).toContain('在运行 Peach 的电脑上打开这一页才能撤销。');
});

it('访问密码分区只在需要登录时带出设备列表', async () => {
  const devices = vi.fn(() => <p>设备列表</p>);
  for (const mode of ['open', 'locked', 'password', 'legacy'] as const) {
    devices.mockClear();
    const host = await mount(<AccessSettings initial={{ mode, revision: 'one' }} receipt={vi.fn()} devices={devices} />);
    expect(host.textContent?.includes('设备列表')).toBe(mode === 'password' || mode === 'legacy');
  }
  expect(devices).toHaveBeenLastCalledWith({ mode: 'legacy', revision: 'one' });
});

it('最近活动按分钟、小时、天写，超过一个月写日期', () => {
  expect(lastSeen(now - 59, now)).toBe('刚刚');
  expect(lastSeen(now - 61, now)).toBe('1 分钟前');
  expect(lastSeen(now - 7200, now)).toBe('2 小时前');
  expect(lastSeen(now - 86400 * 29, now)).toBe('29 天前');
  expect(lastSeen(now - 86400 * 40, now)).toMatch(/\d{4}\/\d{1,2}\/\d{1,2}/);
});
