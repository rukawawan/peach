import { act } from 'react';
import { describe, expect, it, vi } from 'vitest';
import * as legacyUi from '@peach/legacy/ui';

import type { ConfigurationData, ReleaseState } from '../../src/react/bundle';
import {
  AutomaticUpdates, MaintenanceSettings, TutorialSettings, UninstallSettings,
} from '../../src/react/settings/maintenance-settings';
import { ReleaseUpdates } from '../../src/react/settings/release-updates';
import { actionOrder, buttonNamed, choose, click, fetchMock, mount, section, sentBody, settle, submit, switches } from './render';

const automatic = { mode: 'off', interval_hours: 24, available: true, download_available: true };
const release: ReleaseState = {
  current_version: '0.9.0', latest_version: null, channel: '测试版', installation: '独立测试包', in_app_update: true,
  state: 'unchecked', message: '尚未检查', release_url: 'https://github.com/peach-mitao/peach/releases',
};
const uninstall = { available: true, full_available: true, message: '', data_root: 'fixture', directories: ['fixture', 'fixture/cache'] };

it('分区依次是运行信息、新手教程、卸载；缺依赖的运行信息带下载链接', async () => {
  const data: ConfigurationData = {
    editable: true, notice: '', revision: 'r', media_dirs: [], library_count: 0, port: 9123,
    automatic_updates: automatic, updates: release, uninstall,
    facts: [
      { term: '版本', value: '0.7.25' },
      { term: 'FFmpeg', value: '未找到 FFmpeg', download_url: 'https://ffmpeg.org/download.html', download_label: '下载 FFmpeg' },
    ],
  };
  const host = await mount(<MaintenanceSettings data={data} receipt={vi.fn()} reopenTutorial={vi.fn()} />);
  expect([...host.firstElementChild!.children].map((node) => node.getAttribute('aria-label')))
    .toEqual(['运行信息', '新手教程', '卸载 Peach']);
  const facts = section(host, '运行信息')!;
  expect([...facts.querySelectorAll('dt')].map((dt) => dt.textContent)).toEqual(['版本', 'FFmpeg']);
  const link = facts.querySelector('a[href="https://ffmpeg.org/download.html"]');
  expect(link?.getAttribute('target')).toBe('_blank');
  expect(link?.textContent).toBe('下载 FFmpeg');
});

it('能装的缺失工具给「安装」，装完用服务端回的运行信息换掉那一行并回执', async () => {
  const data: ConfigurationData = {
    editable: true, notice: '', revision: 'r', media_dirs: [], library_count: 0, port: 9123,
    facts: [{ term: 'untrunc', value: '未安装；缺索引的 MP4 需要它才修得了。', install_tool: 'untrunc' }],
  };
  const fetcher = fetchMock(200, { message: '已安装 untrunc（9d86ec9）', facts: [{ term: 'untrunc', value: '已安装，版本 9d86ec9' }] });
  vi.stubGlobal('fetch', fetcher);
  const receipt = vi.fn();
  const host = await mount(<MaintenanceSettings data={data} receipt={receipt} reopenTutorial={vi.fn()} />);
  const facts = section(host, '运行信息')!;
  expect(facts.querySelector('a[target="_blank"]')).toBeNull();
  await click(buttonNamed('安装', facts));
  await settle();
  expect(fetcher.mock.calls[0]?.[0]).toBe('/api/configuration/media-tools');
  expect(sentBody(fetcher)).toEqual({ tool: 'untrunc' });
  expect(facts.querySelector('dd')?.textContent).toBe('已安装，版本 9d86ec9');
  expect(buttonNamed('安装', facts)).toBeNull();
  expect(receipt).toHaveBeenCalledWith('已安装 untrunc（9d86ec9）');
});

describe('自动更新', () => {
  it('两颗开关互相约束，服务端成功后才回执，关闭也能保存', async () => {
    const fetcher = fetchMock(200, automatic);
    vi.stubGlobal('fetch', fetcher);
    const receipt = vi.fn();
    const host = await mount(<AutomaticUpdates initial={automatic} receipt={receipt} />);
    expect(switches(host)[1]!.disabled).toBe(true);
    await click(switches(host)[0]);
    expect(switches(host)[1]!.disabled).toBe(false);
    await click(switches(host)[1]);
    await choose(host.querySelector('[aria-haspopup="listbox"]'), '每周');
    await submit(host.querySelector('form'));
    await settle();
    expect(sentBody(fetcher)).toEqual({ mode: 'download', interval_hours: 168 });
    expect(receipt).toHaveBeenCalledWith('已保存配置');
    await click(switches(host)[0]);
    await submit(host.querySelector('form'));
    await settle();
    expect(sentBody(fetcher, 1)).toEqual({ mode: 'off', interval_hours: 168 });
    expect(receipt).toHaveBeenCalledTimes(2);
  });

  it('源码运行锁住自动下载，检查频率那一行不带说明，失败原因留在分区里且不报成功', async () => {
    vi.stubGlobal('fetch', fetchMock(400, { detail: '设置正在保存' }));
    const receipt = vi.fn();
    const host = await mount(<AutomaticUpdates initial={{ ...automatic, mode: 'check', download_available: false }} receipt={receipt} />);
    expect(switches(host)[1]!.disabled).toBe(true);
    const interval = [...host.querySelectorAll('p')].find((p) => p.textContent === '检查频率');
    expect(interval?.nextElementSibling).toBeNull();
    await submit(host.querySelector('form'));
    await settle();
    expect(host.querySelector('[role="alert"]')?.textContent).toContain('设置正在保存');
    expect(receipt).not.toHaveBeenCalled();
  });
});

describe('检查更新', () => {
  it('标明应用更新包体积和工具补下载条件', async () => {
    const host = await mount(<ReleaseUpdates initial={{ ...release, state: 'available', latest_version: '1.0.0',
      package_kind: 'update', asset_size: 12 * 1048576 }} />);
    expect(host.textContent).toContain('应用更新包 · 12.0 MB');
    expect(host.textContent).toContain('工具缺失、损坏或版本变化时会另行下载所需工具包');
    expect(host.textContent).not.toContain('首次安装');
    expect([...host.querySelectorAll('a')].some((a) => a.textContent === '完整安装包')).toBe(false);
  });

  it('尚未检查的状态只显示一次，最新版本保持未取得', async () => {
    vi.stubGlobal('fetch', fetchMock(200, { state: 'idle', progress: 0 }));
    const host = await mount(<ReleaseUpdates initial={release} />);
    expect(host.textContent?.split('尚未检查')).toHaveLength(2);
  });

  it('刷新后接着已准备好的更新，弹一次重启确认，确认前不发重启', async () => {
    vi.useFakeTimers();
    const modal = vi.spyOn(legacyUi, 'confirmModal');
    const fetcher = fetchMock(200, { state: 'restarting', progress: 0 });
    vi.stubGlobal('fetch', fetcher);
    const host = await mount(<ReleaseUpdates initial={release} initialJob={{ state: 'ready', progress: 100, version: '0.10.0' }} />);
    expect(host.querySelector('[role="progressbar"]')?.getAttribute('aria-valuenow')).toBe('100');
    expect(modal).toHaveBeenCalledTimes(1);
    expect(modal.mock.calls[0]?.[0]).toMatchObject({
      title: '更新已准备好', body: 'Peach 0.10.0 将在重启后安装。', confirmLabel: '立即重启', cancelLabel: '稍后',
    });
    expect(fetcher).not.toHaveBeenCalled();
    await act(async () => { await modal.mock.calls[0]?.[0].onConfirm?.(); });
    expect(fetcher.mock.calls.map(([url]) => url)).toEqual(['/api/configuration/update-restart']);
  });

  it('显式查询更新，连点只发一次，失败后可重试且焦点留在原处', async () => {
    const host = await mount(<ReleaseUpdates initial={release} />);
    const updates = section(host, '检查更新')!;
    const check = buttonNamed('检查更新', updates)!;
    expect(updates.textContent).toContain('当前版本0.9.0');
    const fetcher = fetchMock(200, { ...release, latest_version: '0.10.0', state: 'available', message: '有新版本可下载。' });
    vi.stubGlobal('fetch', fetcher);
    check.focus();
    await act(async () => { check.click(); check.click(); });
    await settle();
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(fetcher.mock.calls[0]?.[0]).toBe('/api/configuration/updates');
    expect(updates.textContent).toContain('最新版本0.10.0');
    expect(updates.querySelector('[role="status"]')?.textContent).toContain('有可用更新');
    expect(buttonNamed('下载并安装', updates)).not.toBeNull();
    expect(actionOrder(check.parentElement)).toEqual(['官网', 'GitHub', '查看发布页', '检查更新', '下载并安装']);
    expect([...updates.querySelectorAll('a')].map((link) => [link.textContent, link.getAttribute('href')]))
      .toEqual([
        ['官网', 'https://peach.video/#download'],
        ['GitHub', 'https://github.com/peach-mitao/peach'],
        ['查看发布页', 'https://github.com/peach-mitao/peach/releases'],
      ]);
    expect(updates.textContent).not.toContain('暂无法更新');
    expect(document.activeElement).toBe(check);
    vi.stubGlobal('fetch', fetchMock(503, { detail: '连接失败' }));
    await click(check);
    await settle();
    expect(updates.querySelector('[role="alert"]')?.textContent).toBe('连接失败');
    expect(updates.textContent).not.toContain('0.10.0');
    expect(check.disabled).toBe(false);
  });

  it('macOS 独立包没有应用内安装，给本机架构的安装镜像下载键', async () => {
    const dmg = 'https://github.com/peach-mitao/peach/releases/download/v1.0.0/Peach-1.0.0-macos-arm64.dmg';
    const host = await mount(<ReleaseUpdates initial={{ ...release, in_app_update: false, state: 'available',
      latest_version: '1.0.0', message: '有新版本可下载。', package_kind: 'installer', asset_url: dmg, asset_size: 300 * 1048576 }} />);
    const updates = section(host, '检查更新')!;
    expect(updates.textContent).toContain('macOS 安装镜像 · 300.0 MB');
    expect(updates.textContent).toContain('把 Peach 拖入「应用程序」');
    expect(buttonNamed('下载并安装', updates)).toBeNull();
    const link = [...updates.querySelectorAll('a')].find((a) => a.textContent === '下载新版本');
    expect(link?.getAttribute('href')).toBe(dmg);
  });

  it('Docker 镜像有新版时列出宿主机上的两步命令，不给下载或安装键', async () => {
    const steps = [{ text: '拉取新镜像', command: 'docker compose pull' }, { text: '重建容器', command: 'docker compose up -d' }];
    const docker = { ...release, installation: 'Docker 镜像', in_app_update: false, steps };
    const host = await mount(<ReleaseUpdates initial={{ ...docker, state: 'available', latest_version: '1.0.0', message: '有新镜像可拉取。' }} />);
    const updates = section(host, '检查更新')!;
    expect(updates.textContent).toContain('Docker 镜像');
    const list = updates.querySelector('ol[aria-label="在宿主机上更新"]');
    expect([...list!.querySelectorAll('code')].map((code) => code.textContent)).toEqual(['docker compose pull', 'docker compose up -d']);
    expect(buttonNamed('下载并安装', updates)).toBeNull();
    expect([...updates.querySelectorAll('a')].some((a) => a.textContent === '下载新版本')).toBe(false);
    const current = await mount(<ReleaseUpdates initial={{ ...docker, state: 'current', latest_version: '0.9.0', message: '已是最新测试版。' }} />);
    expect(current.querySelector('ol[aria-label="在宿主机上更新"]')).toBeNull();
  });

  it('已是最新就不再提示可用更新，也不给安装键', async () => {
    const current = await mount(<ReleaseUpdates initial={{ ...release, latest_version: '0.9.0', state: 'current', message: '已是最新测试版。' }} />);
    expect(current.textContent).not.toContain('有可用更新');
    expect(current.textContent).toContain('已是最新测试版。');
    expect(buttonNamed('下载并安装', current)).toBeNull();
  });
});

it('卸载默认保留数据，勾选完全卸载后确认文案点名要删的东西，受理后锁住', async () => {
  const modal = vi.spyOn(legacyUi, 'confirmModal');
  const fetcher = fetchMock(200, { message: 'Peach 将在几秒后退出并卸载。' });
  vi.stubGlobal('fetch', fetcher);
  const host = await mount(<UninstallSettings uninstall={uninstall} receipt={vi.fn()} />);
  const area = host.querySelector('#uninstallPeach')!;
  expect(area.textContent).toContain('原始媒体文件保留');
  const full = area.querySelector<HTMLInputElement>('input[type="checkbox"]')!;
  expect(full.checked).toBe(false);
  expect([...area.querySelectorAll('details p')].map(p => p.textContent)).toEqual(['fixture', 'fixture/cache']);
  // 每条路径自己带一颗打开键：要删的是哪几个目录，看一眼比照着路径再翻一遍快。
  expect([...area.querySelectorAll('details button[aria-label="在资源管理器中显示"]')]).toHaveLength(2);
  await click(buttonNamed('卸载 Peach', area));
  expect(modal.mock.calls[0]?.[0]).toMatchObject({ title: '卸载 Peach', danger: true, confirmLabel: '卸载 Peach' });
  expect(String(modal.mock.calls[0]?.[0].body)).toContain('设置、本地数据库、观看记录与缓存保留');
  expect(fetcher).not.toHaveBeenCalled();
  await click(full);
  await click(buttonNamed('卸载 Peach', area));
  const options = modal.mock.calls[1]![0];
  expect(String(options.body)).toContain('凭据和缓存');
  await act(async () => { await options.onConfirm?.(); });
  expect(sentBody(fetcher)).toEqual({ delete_data: true, confirmation: '卸载 Peach' });
  expect(area.querySelector('[role="status"]')?.textContent).toBe('Peach 将在几秒后退出并卸载。');
  expect(buttonNamed('卸载 Peach', area)?.disabled).toBe(true);
});

describe('新手教程', () => {
  it('打开教程仅调用入口，不发送写入请求或操作回执', async () => {
    const reopenTutorial = vi.fn(async () => {});
    const receipt = vi.fn();
    const fetcher = vi.fn(); vi.stubGlobal('fetch', fetcher);
    const host = await mount(<TutorialSettings receipt={receipt} reopenTutorial={reopenTutorial} />);
    await click(buttonNamed('重新打开', host));
    expect(reopenTutorial).toHaveBeenCalledTimes(1);
    expect(fetcher).not.toHaveBeenCalled();
    expect(receipt).not.toHaveBeenCalled();
  });

  it('反复打开可重新进入同一教程入口', async () => {
    const receipt = vi.fn();
    const reopenTutorial = vi.fn(async () => {});
    const host = await mount(<TutorialSettings receipt={receipt} reopenTutorial={reopenTutorial} />);
    await click(buttonNamed('重新打开', host));
    await click(buttonNamed('重新打开', host));
    expect(reopenTutorial).toHaveBeenCalledTimes(2);
    expect(receipt).not.toHaveBeenCalled();
  });
});
