/* 访问口令与 HTTPS 证书分区：换口令先说清谁要重新登录，新口令只显示这一次；证书分区画出二维码与指纹。
 * 外观由预览与 e2e 量。 */
import { notifyManager, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { afterEach, expect, it, vi } from 'vitest';
import * as legacyUi from '@peach/legacy/ui';

import { queryClient } from '../../src/react/query';
import { ApiTokenSettings, rotationEffect } from '../../src/react/settings/api-token-settings';
import { CertificateTrust, type CertificateState } from '../../src/react/settings/certificate-trust';
import { buttonNamed, click, mount, section, settle } from './render';

notifyManager.setScheduler(notify => notify());
afterEach(() => { queryClient.clear(); vi.restoreAllMocks(); vi.unstubAllGlobals() });

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

function serve(body: unknown) {
  const fetcher = vi.fn(async () => ({ ok: true, status: 200, json: async () => body }));
  vi.stubGlobal('fetch', fetcher);
  return fetcher;
}

const rotatable = { rotatable: true, reason: '', paired: false };
const render = (node: ReactNode) => mount(<QueryClientProvider client={queryClient}>{node}</QueryClientProvider>);

it('确认文案按访问方式说清谁要重新登录', () => {
  expect(rotationEffect('password', false)).toContain('用访问密码登录的浏览器不受影响');
  expect(rotationEffect('legacy', false)).toContain('其他浏览器现在用这串口令登录，会全部退出');
  expect(rotationEffect('open', false)).toContain('浏览器不需要登录，不受影响');
  expect(rotationEffect('password', true)).toContain('另一台电脑要换成同一份口令文件');
  for (const mode of ['password', 'legacy', 'open'] as const) {
    expect(rotationEffect(mode, false)).toContain('用旧口令的脚本和 API 调用会立即失效');
  }
});

it('取消确认就不发请求，确认后显示新口令一次', async () => {
  const fetcher = serve({ ...rotatable, token: 'new-token-value', mode: 'legacy', signed_out: 2 });
  const receipt = vi.fn();
  const seen = confirmWith(false);
  const host = await render(<ApiTokenSettings initial={rotatable} mode="legacy" receipt={receipt} />);
  await click(buttonNamed('更换口令', host)!);
  expect(seen[0]!.body).toBe(rotationEffect('legacy', false));
  expect(fetcher).not.toHaveBeenCalled();

  vi.restoreAllMocks();
  confirmWith(true);
  await click(buttonNamed('更换口令', host)!);
  await settle();
  expect(fetcher).toHaveBeenCalledWith('/api/configuration/access/token/rotate', expect.objectContaining({ method: 'POST' }));
  const card = section(host, '访问口令')!;
  expect(card.querySelector<HTMLInputElement>('input[readonly]')!.value).toBe('new-token-value');
  expect(card.textContent).toContain('新口令只显示这一次');
  expect(receipt).toHaveBeenCalledWith('已更换访问口令，2 台设备需要重新登录');
});

it('口令被启动参数覆盖时只写原因，不给更换键', async () => {
  const host = await render(<ApiTokenSettings initial={{ rotatable: false, reason: '口令由启动参数指定。', paired: false }}
    mode="password" receipt={vi.fn()} />);
  expect(buttonNamed('更换口令', host)).toBeNull();
  expect(section(host, '访问口令')!.textContent).toContain('口令由启动参数指定。');
});

it('证书分区画出二维码、分段的指纹和下载链接', async () => {
  const fingerprint = Array.from({ length: 32 }, (_, index) => index.toString(16).padStart(2, '0').toUpperCase()).join(':');
  const state: CertificateState = {
    fingerprint, not_after: '2036-08-18', download: '/api/configuration/certificate/peach-local-ca.crt',
    phone_url: 'https://peach.local/api/configuration/certificate/peach-local-ca.crt?k=x', expires_in: 600,
    qr: ['101', '010', '101'],
  };
  const host = await render(<CertificateTrust initial={state} />);
  const card = section(host, '其他设备信任 HTTPS 证书')!;
  expect(card.querySelector('svg[role="img"] path')!.getAttribute('d')).toBe('M4 4h1v1h-1zM6 4h1v1h-1zM5 5h1v1h-1zM4 6h1v1h-1zM6 6h1v1h-1z');
  expect([...card.querySelectorAll('.font-mono > span')].map(node => node.textContent)).toEqual([
    '00:01:02:03:04:05:06:07', '08:09:0A:0B:0C:0D:0E:0F', '10:11:12:13:14:15:16:17', '18:19:1A:1B:1C:1D:1E:1F']);
  expect(card.querySelector('a[download]')!.getAttribute('href')).toBe(state.download);
  expect(card.textContent).toContain('证书信任设置');
});
