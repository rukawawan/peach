/* 「账本备份」：列出可恢复的备份与来源，立即备份进任务进度，恢复先二次确认、写明会替换当前账本；
 * 只读端不能恢复。 */
import { expect, it, vi } from 'vitest';
import * as legacyUi from '@peach/legacy/ui';

import {
  LedgerBackupSettings, type LedgerBackupJob, type LedgerBackupState,
} from '../../src/react/settings/ledger-backup-settings';
import { buttonNamed, click, mount, settle } from './render';

const idle: LedgerBackupJob = { status: 'idle' };
const listed: LedgerBackupState = {
  backups: [
    { id: 'database/ledger.pre-manual-20261104-101500.db', name: 'ledger.pre-manual-20261104-101500.db',
      bytes: 120 * 2 ** 20, modified_at: 1_793_000_000, source: 'manual', purpose: '手动备份' },
    { id: 'database/ledger.pre-migrate-20261103-090000.db', name: 'ledger.pre-migrate-20261103-090000.db',
      bytes: 118 * 2 ** 20, modified_at: 1_792_900_000, source: 'auto', purpose: '迁移前' },
  ],
  backup: idle, restore: idle, writer: true, writer_reason: '', last_restore: null,
};

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

/** GET 回列表，POST 按地址回给定的状态；记下每一次 POST 的地址与正文。 */
function server(get: LedgerBackupState, posts: Record<string, LedgerBackupState> = {}) {
  const sent: [string, unknown][] = [];
  const fetcher = vi.fn(async (url: string, init?: RequestInit) => {
    const method = init?.method || 'GET';
    if (method !== 'GET') sent.push([url, JSON.parse(String(init?.body))]);
    const body = method === 'GET' ? get : posts[url.split('/').pop()!] ?? get;
    return { ok: true, status: 200, json: async () => body };
  });
  vi.stubGlobal('fetch', fetcher);
  return sent;
}

const rows = (host: HTMLElement) => [...host.querySelectorAll('[data-ledger-backups] p.text-body-2-regular')]
  .map((node) => node.textContent);

it('列出可恢复的备份，写明手动与自动及自动备份的用途', async () => {
  server(listed);
  const host = await mount(<LedgerBackupSettings receipt={vi.fn()} />);
  await settle();

  expect(rows(host)).toEqual(['手动 · 120 MB', '自动 · 迁移前 · 118 MB']);
  expect(host.textContent).toContain('共 2 份可恢复的备份');
  expect([...host.querySelectorAll('button')].filter((button) => button.textContent === '恢复')
    .every((button) => !button.disabled)).toBe(true);
});

it('恢复先确认，确认框写明替换当前账本并先另存；取消不发请求', async () => {
  const seen = confirmWith(false);
  const sent = server(listed);
  const host = await mount(<LedgerBackupSettings receipt={vi.fn()} />);
  await settle();

  await click([...host.querySelectorAll('button')].filter((button) => button.textContent === '恢复')[1]);
  await settle();
  expect(seen[0]!.danger).toBe(true);
  expect(seen[0]!.confirmLabel).toBe('替换当前账本');
  expect(String(seen[0]!.body)).toContain('自动 · 迁移前 · 118 MB');
  expect(String(seen[0]!.body)).toContain('替换前会先备份当前账本');
  expect(sent).toEqual([]);
});

it('确认后发出恢复，恢复中禁用全部按钮并显示进度，完成后回执写明另存的文件', async () => {
  confirmWith(true);
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
  const receipt = vi.fn();
  const restoring = { ...listed, restore: { status: 'running', stage: '复制备份', done: 3, total: 10 } as LedgerBackupJob };
  const sent = server(listed, { restore: restoring });
  const host = await mount(<LedgerBackupSettings receipt={receipt} />);
  await settle();

  await click([...host.querySelectorAll('button')].find((button) => button.textContent === '恢复'));
  await settle();
  expect(sent).toEqual([['/api/configuration/ledger-backups/restore',
    { id: 'database/ledger.pre-manual-20261104-101500.db', confirm: true }]]);
  const bar = host.querySelector('[role="progressbar"]')!;
  expect([bar.getAttribute('aria-label'), bar.getAttribute('aria-valuenow')]).toEqual(['恢复进度 · 复制备份', '3']);
  expect(host.textContent).toContain('复制备份');
  expect(buttonNamed('立即备份', host)!.disabled).toBe(true);
  expect([...host.querySelectorAll('button')].filter((button) => button.textContent === '恢复')
    .every((button) => button.disabled)).toBe(true);

  try {
    server({ ...listed, restore: { status: 'complete', saved: 'ledger.pre-restore-20261104-102000.db' } });
    await vi.advanceTimersByTimeAsync(1600);
    await settle();
  } finally {
    vi.useRealTimers();
  }
  expect(receipt).toHaveBeenCalledWith(expect.stringContaining('ledger.pre-restore-20261104-102000.db'));
});

it('立即备份发出请求；失败的原因留在分区里', async () => {
  const failed = { ...listed, backup: { status: 'failed', error: '备份没有通过完整性检查：page 3' } as LedgerBackupJob };
  const sent = server(listed, { backup: failed });
  const host = await mount(<LedgerBackupSettings receipt={vi.fn()} />);
  await settle();

  await click(buttonNamed('立即备份', host));
  await settle();
  expect(sent.map(([url]) => url)).toEqual(['/api/configuration/ledger-backups/backup']);
  expect(host.querySelector('[role="alert"]')!.textContent).toBe('备份没有通过完整性检查：page 3');
});

it('只读端能看列表、能备份，不能恢复，并写明原因；上次恢复中断的处理结果照常显示', async () => {
  server({
    ...listed, writer: false, writer_reason: '这台电脑是只读端',
    last_restore: { state: 'interrupted', outcome: 'rolled-back', message: '上次从备份恢复被中断；已退回恢复前的账本', finished_at: 1 },
  });
  const host = await mount(<LedgerBackupSettings receipt={vi.fn()} />);
  await settle();

  expect(host.textContent).toContain('这台电脑不是账本写入端，只能在写入端恢复：这台电脑是只读端');
  expect([...host.querySelectorAll('button')].filter((button) => button.textContent === '恢复')
    .every((button) => button.disabled)).toBe(true);
  expect(buttonNamed('立即备份', host)!.disabled).toBe(false);
  expect(host.querySelector('[role="alert"]')!.textContent).toBe('上次从备份恢复被中断；已退回恢复前的账本');
});
