/* 「存储空间」：勾选几类一起清理或全部清理，不能清理的写明原因；统计中按上次的文件数报进度；
 * 容器部署给出宿主机上的迁移步骤。 */
import { expect, it, vi } from 'vitest';
import * as legacyUi from '@peach/legacy/ui';

import type { StorageCategory, StorageState } from '../../src/react/bundle';
import { StorageSettings } from '../../src/react/settings/storage-settings';
import { buttonNamed, click, fetchMock, mount, sentBody, settle, submit, type } from './render';

const category = (key: string, label: string, bytes: number, reclaimable: number, cleanable: boolean,
                  note: string): StorageCategory =>
  ({ key, label, description: `${label}是什么`, note, cleanable, bytes, files: 1, reclaimable });

const measured: StorageState = {
  data_root: 'C:\\peach-data', free_bytes: 100 * 2 ** 30, total_bytes: 1000 * 2 ** 30, system_drive: true,
  usage: {
    measured_at: 1_790_000_000, total_bytes: 6 * 2 ** 30, total_files: 300,
    categories: [
      category('database', '数据库', 2 ** 30, 0, false, 'Peach 的全部资料都在这里'),
      category('backups', '数据库备份', 2 ** 30, 2 ** 29, true, '更早的无法再恢复'),
      category('playback', '播放缓存', 2 ** 30, 2 ** 30, true, '再次播放时重新转码'),
      category('previews', '预览图', 2 ** 30, 0, false, '重建要重新读取整部影片'),
      category('logs', '日志', 2 ** 20, 0, true, '只清理已归档的日志'),
    ],
  },
  job: { state: 'idle', message: '' },
  relocation: { available: true, message: '', last: null },
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

const box = (host: HTMLElement, key: string) =>
  host.querySelector<HTMLInputElement>(`[data-category="${key}"] input[type="checkbox"]`)!;

it('首次打开维护页自动统计，已有结果时复用统计', async () => {
  const fetcher = fetchMock(200, measured);
  vi.stubGlobal('fetch', fetcher);
  await mount(<StorageSettings initial={{ ...measured, usage: null }} receipt={vi.fn()} />);
  await settle();
  expect(fetcher).toHaveBeenCalledTimes(1);
  expect(fetcher.mock.calls[0]?.[0]).toBe('/api/configuration/storage/measure');
  await mount(<StorageSettings initial={measured} receipt={vi.fn()} />);
  await settle();
  expect(fetcher).toHaveBeenCalledTimes(1);
});

it('只读教程经过维护页不启动占用统计，正常访问仍可统计', async () => {
  const fetcher = fetchMock(200, measured);
  vi.stubGlobal('fetch', fetcher);
  document.body.classList.add('peach-guiding');
  try {
    await mount(<StorageSettings initial={{ ...measured, usage: null }} receipt={vi.fn()} />);
    await settle();
    expect(fetcher).not.toHaveBeenCalled();
  } finally {
    document.body.classList.remove('peach-guiding');
  }
  await mount(<StorageSettings initial={{ ...measured, usage: null }} receipt={vi.fn()} />);
  await settle();
  expect(fetcher.mock.calls[0]?.[0]).toBe('/api/configuration/storage/measure');
});

it('不能清理的勾选框禁用并写明原因，勾几类一起清，全部清理只发可清理的那几类', async () => {
  const seen = confirmWith(true);
  const fetcher = fetchMock(200, { ...measured, job: { state: 'cleaning', category: 'playback', message: '' } });
  vi.stubGlobal('fetch', fetcher);
  const host = await mount(<StorageSettings initial={measured} receipt={vi.fn()} />);

  expect(box(host, 'database').disabled).toBe(true);
  expect(host.querySelector('[data-category="previews"]')!.textContent).toContain('不能清理：重建要重新读取整部影片');
  expect(box(host, 'logs').disabled).toBe(true);
  expect(host.querySelector('[data-category="logs"]')!.textContent).toContain('没有可以清理的文件');
  expect(host.querySelector('[data-category="playback"]')!.textContent).toContain('清理后再次播放时重新转码');
  expect(buttonNamed('清理所选', host)!.disabled).toBe(true);

  await click(box(host, 'playback'));
  expect(host.textContent).toContain('已选 1 类，可释放 1.0 GB');
  await click(buttonNamed('清理所选', host));
  await settle();
  expect(seen[0]!.danger).toBe(false);
  expect(sentBody(fetcher)).toEqual({ categories: ['playback'] });

  vi.stubGlobal('fetch', fetchMock(200, measured));
  const again = await mount(<StorageSettings initial={measured} receipt={vi.fn()} />);
  const all = fetchMock(200, measured);
  vi.stubGlobal('fetch', all);
  await click(buttonNamed('全部清理', again));
  await settle();
  // 备份在里面时确认框是危险样式；正文逐类写清理后会怎样。
  expect(seen[1]!.danger).toBe(true);
  expect(String(seen[1]!.body)).toContain('数据库备份 512 MB（清理后更早的无法再恢复）');
  expect(sentBody(all)).toEqual({ categories: ['backups', 'playback'] });
});

it('统计中按上次的文件数画进度，读数是已走过的文件与大小', async () => {
  vi.stubGlobal('fetch', fetchMock(200, measured));
  const measuring: StorageState = {
    ...measured, job: { state: 'measuring', message: '', files: 120, bytes: 2 ** 30, expected_files: 300 },
  };
  const host = await mount(<StorageSettings initial={measuring} receipt={vi.fn()} />);
  const bar = host.querySelector('[role="progressbar"]')!;
  expect([bar.getAttribute('aria-valuenow'), bar.getAttribute('aria-valuemax')]).toEqual(['120', '300']);
  expect(host.textContent).toContain('已统计 120 个文件 · 1.0 GB，上次共 300 个');
  expect(buttonNamed('全部清理', host)!.disabled).toBe(true);
});

it('容器部署不给更改位置，列出在宿主机上迁移的几步', async () => {
  vi.stubGlobal('fetch', fetchMock(200, measured));
  const docker: StorageState = {
    ...measured,
    relocation: {
      available: false, message: '容器的数据目录是宿主机上的数据卷', last: null,
      steps: [{ text: '停止 Peach', command: 'docker compose down' }, { text: '再启动', command: 'docker compose up -d' }],
    },
  };
  const host = await mount(<StorageSettings initial={docker} receipt={vi.fn()} />);
  expect(buttonNamed('更改位置', host)!.disabled).toBe(true);
  const steps = host.querySelector('ol[aria-label="在宿主机上迁移"]')!;
  expect([...steps.querySelectorAll('code')].map((node) => node.textContent))
    .toEqual(['docker compose down', 'docker compose up -d']);
});

it('容量字段带 GiB 单位，保存整数上限及留空的不设限，并保留占比与分类清理', async () => {
  const policy = { enabled: true, minimum_free_gib: 0, data_max_gib: 0, cache_max_gib: 0, auto_clean: true,
    external_cache_path: '/cache', external_cache_max_gib: 0 };
  const storage = { ...measured, budget: { policy, last_check: null, error: '' } };
  const fetcher = fetchMock(200, storage);
  vi.stubGlobal('fetch', fetcher);
  const host = await mount(<StorageSettings initial={storage} receipt={vi.fn()} />);
  const field = host.querySelector<HTMLInputElement>('input[aria-label="Peach 数据上限（GiB）"]');
  expect(field?.value).toBe('');
  expect([...host.querySelectorAll('[aria-hidden="true"]')].filter(node => node.textContent === 'GiB')).toHaveLength(4);
  expect(host.querySelector('[data-storage-result]')).not.toBeNull();
  expect(buttonNamed('清理所选', host)).not.toBeNull();
  await type(field, '80');
  await submit(host.querySelector('#storageBudgetSettings'));
  await settle();
  expect(fetcher.mock.calls[0]?.[0]).toBe('/api/configuration/storage/policy');
  expect(sentBody(fetcher)).toEqual({ ...policy, data_max_gib: 80 });
});

it('关闭容量保护隐藏限制并保存开关，重新开启保留原设置', async () => {
  const policy = { enabled: true, minimum_free_gib: 8, data_max_gib: 80, cache_max_gib: 20,
    auto_clean: true, external_cache_path: '/cache', external_cache_max_gib: 100 };
  const storage = { ...measured, budget: { policy, last_check: null, error: '' } };
  const fetcher = fetchMock(200, storage);
  vi.stubGlobal('fetch', fetcher);
  const host = await mount(<StorageSettings initial={storage} receipt={vi.fn()} />);
  await click(host.querySelector('[aria-label="启用容量保护"]'));
  expect(host.querySelector('input[aria-label="Peach 数据上限（GiB）"]')).toBeNull();
  await submit(host.querySelector('#storageBudgetSettings'));
  await settle();
  expect(sentBody(fetcher)).toEqual({ ...policy, enabled: false });
  await click(host.querySelector('[aria-label="启用容量保护"]'));
  expect(host.querySelector<HTMLInputElement>('input[aria-label="Peach 数据上限（GiB）"]')?.value).toBe('80');
});

it('空目录自动读取 CloudDrive，填入表单后由保存写入设置', async () => {
  const policy = { enabled: true, minimum_free_gib: 0, data_max_gib: 0, cache_max_gib: 0,
    auto_clean: true, external_cache_path: '', external_cache_max_gib: 0 };
  const storage = { ...measured, budget: { policy, last_check: null, error: '' } };
  const fetcher = vi.fn(async (path: string, _options?: RequestInit) => ({ ok: true, json: async () =>
    path.endsWith('/external-cache') ? { path: '/detected-cache' } : storage }));
  vi.stubGlobal('fetch', fetcher);
  const host = await mount(<StorageSettings initial={storage} receipt={vi.fn()} />);
  await settle();
  const directory = [...host.querySelectorAll('input')].find(input =>
    [...(input.labels ?? [])].some(label => label.textContent === '外部缓存目录'));
  expect(directory?.value).toBe('/detected-cache');
  expect(fetcher).toHaveBeenCalledTimes(1);
  await submit(host.querySelector('#storageBudgetSettings'));
  await settle();
  expect(JSON.parse(String(fetcher.mock.calls[1]?.[1]?.body))).toEqual({ ...policy, external_cache_path: '/detected-cache' });
});
