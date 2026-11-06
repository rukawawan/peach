import { afterEach, describe, expect, it } from 'vitest';
import {
  CREDENTIAL_PROVIDERS, configurationContentSkeleton, credentialSkeletonRows, rememberShape, SHAPE_KEY,
} from '../../src/configuration-skeleton';
import { downloadsShape, maintenanceShape, networkShape } from '../../src/react/settings/configuration-shape';
import type { ConfigurationData } from '../../src/react/bundle';

const draw = (section: string) => {
  const root = document.createElement('div');
  root.innerHTML = configurationContentSkeleton(section);
  return root;
};
const sections = (root: ParentNode) => [...root.querySelectorAll('section[aria-label]')]
  .filter(node => !node.parentElement?.closest('section[aria-label]')).map(node => node.getAttribute('aria-label'));
const card = (root: ParentNode, name: string) => root.querySelector(`section[aria-label="${name}"]`)!;

afterEach(() => localStorage.clear());

describe('来源凭据骨架', () => {
  it('站点行取自静态登记，名字写真名；没有记录时按都没配，必填的展开', () => {
    const credentials = card(draw('来源与订阅'), '来源凭据');
    const names = [...credentials.querySelectorAll('b')].map(node => node.textContent);
    const configurable = CREDENTIAL_PROVIDERS.filter(row => row.requirement === 'required' || row.requirement === 'optional');
    const none = CREDENTIAL_PROVIDERS.filter(row => row.requirement === 'none');
    expect(names).toEqual([...configurable, ...none].map(row => row.label));
    expect([...credentials.querySelectorAll('h4')].map(node => node.textContent)).toEqual(['可配置凭据', '不需要凭据']);
    const required = CREDENTIAL_PROVIDERS.filter(row => row.requirement === 'required');
    expect(credentialSkeletonRows().filter(row => row.open).map(row => row.provider)).toEqual(required.map(row => row.provider));
    // 展开的那几行画出各自要填的字段。
    const fields = [...credentials.querySelectorAll('span.text-body-medium')].map(node => node.textContent);
    for (const row of required) expect(fields).toEqual(expect.arrayContaining(row.fields!));
  });

  it('上次记下已配好的来源收起，其余照登记', () => {
    const [first] = CREDENTIAL_PROVIDERS.filter(row => row.requirement === 'required');
    rememberShape('credentials', { done: [first!.provider] });
    const rows = credentialSkeletonRows();
    expect(rows.find(row => row.provider === first!.provider)).toMatchObject({ done: true, open: false });
    expect(rows.map(row => row.provider)).toEqual(CREDENTIAL_PROVIDERS.map(row => row.provider));
  });
});

describe('随配置变化的分区按上次记录的结构画', () => {
  it('资源搜索：没有记录时没有索引器行，有记录时按条数与展开态', () => {
    const empty = card(draw('来源与订阅'), '资源搜索');
    expect(empty.querySelectorAll('.border-t.pt-2')).toHaveLength(0);
    expect([...empty.querySelectorAll('button')].map(key => [key.textContent, key.disabled])).toEqual([['添加索引器', true], ['保存配置', true]]);
    rememberShape('indexers', { open: [true, false, false] });
    const recorded = card(draw('来源与订阅'), '资源搜索');
    expect(recorded.querySelectorAll('.border-t.pt-2')).toHaveLength(3);
    expect([...recorded.querySelectorAll('span.text-body-medium')].map(node => node.textContent)).toEqual(['名称', 'Torznab 地址', 'API key']);
  });

  it('媒体库：没有记录时一个媒体库一个文件夹，有记录时照每个媒体库的文件夹数', () => {
    const first = card(draw('媒体库与入库'), '媒体库与目录');
    expect(first.querySelectorAll('[data-library-block]')).toHaveLength(1);
    expect(first.querySelectorAll('[data-folder-row]')).toHaveLength(1);
    rememberShape('media', { folders: [3, 1], cloud: true });
    const root = draw('媒体库与入库');
    expect([...card(root, '媒体库与目录').querySelectorAll('[data-library-block]')].map(block => block.querySelectorAll('[data-folder-row]').length)).toEqual([3, 1]);
    expect(sections(root)).toEqual(['媒体库与目录', 'CloudDrive 代理', '自动发现新文件', '番号识别规则', '视频预览']);
  });

  it('下载渠道：没有记录时只有浏览器添加，有记录时按网盘画出云下载与 PikPak', () => {
    expect(sections(draw('下载渠道'))).toEqual(['浏览器添加 JAV']);
    rememberShape('downloads', { cloud: true, has115: true, pikpak: true, pikpakRoots: false, pikpakLoggedIn: false, browserLogin: true });
    const root = draw('下载渠道');
    expect(sections(root)).toEqual(['云下载', 'PikPak 账号', '浏览器添加 JAV']);
    expect([...card(root, 'PikPak 账号').querySelectorAll('button')].map(key => key.textContent)).toEqual(['用浏览器登录', '登录']);
  });

  it('CloudDrive 代理：每个账号一组，走代理的那一路多出地址与端口', () => {
    rememberShape('media', { folders: [1], cloud: true });
    expect(card(draw('媒体库与入库'), 'CloudDrive 代理').querySelectorAll('.border-t.pt-4')).toHaveLength(0);
    rememberShape('cloudProxy', { configured: true, unlinked: 0, accounts: [[true, false], [false, false]] });
    const proxy = card(draw('媒体库与入库'), 'CloudDrive 代理');
    expect(proxy.querySelectorAll('.border-t.pt-4')).toHaveLength(2);
    expect([...proxy.querySelectorAll('span.text-body-medium')].map(node => node.textContent)).toEqual(['数据代理地址', '数据代理端口']);
  });

  it('坏记录按没有记录处理', () => {
    localStorage.setItem(SHAPE_KEY, JSON.stringify({ media: { folders: 'x' }, indexers: { open: 3 }, downloads: null }));
    const root = draw('媒体库与入库');
    expect(card(root, '媒体库与目录').querySelectorAll('[data-folder-row]')).toHaveLength(1);
    expect(sections(draw('下载渠道'))).toEqual(['浏览器添加 JAV']);
    expect(card(draw('来源与订阅'), '资源搜索').querySelectorAll('.border-t.pt-2')).toHaveLength(0);
  });

  it('骨架里没有按像素记下的正文高度', () => {
    rememberShape('indexers', { open: [false] });
    for (const name of ['媒体库与入库', '来源与订阅', '下载渠道', '网络与访问', '应用与维护']) {
      expect(configurationContentSkeleton(name)).not.toMatch(/--skeleton-h|--remembered-h/);
    }
    expect(Object.keys(localStorage)).toEqual([SHAPE_KEY]);
  });
});

describe('整页配置记下的结构', () => {
  const data = {
    editable: true, port_editable: false, notice: '', revision: '', media_dirs: [], library_count: 1, port: 8900,
    facts: [{ term: '版本', value: '1' }, { term: 'FFmpeg', value: '未找到' }],
    access: { mode: 'password', revision: 'r' },
    tunnel: { enabled: false, state: 'stopped', url: '', error: '', available: true, mode: 'named', hostname: '', token_set: false, named_available: true },
    peach_proxy: { mode: 'proxy', proxy_saved: true, needs_selection: false },
    downloads: { media_sources: ['local', 'pikpak'], pikpak_roots: ['/'], pikpak: { logged_in: true }, pikpak_browser: { available: false } },
  } as unknown as ConfigurationData;

  it('从配置算出几块、哪种表单，不含任何值', () => {
    expect(downloadsShape(data)).toEqual({ cloud: true, has115: false, pikpak: true, pikpakRoots: true, pikpakLoggedIn: true, browserLogin: false });
    expect(networkShape(data)).toEqual({ port: false, addresses: 0, networkEditable: false, lan: false,
      proxyAddress: true, access: 'password', tunnelNamed: true, tunnelNamedMode: true, tunnelNote: false });
    expect(maintenanceShape(data)).toMatchObject({ facts: ['版本', 'FFmpeg'], reporting: false, uninstall: false, storageRows: 0 });
  });

  it('网络与访问按记录画访问密码的表单；没有记录时按服务端默认的系统口令', () => {
    const fresh = card(draw('网络与访问'), '访问密码');
    expect([...fresh.querySelectorAll('span.text-body-medium')].map(node => node.textContent)).toEqual(['设置访问密码 *', '确认访问密码 *']);
    rememberShape('network', networkShape(data));
    const root = draw('网络与访问');
    expect(sections(root)).toEqual(['访问密码', '已登录的设备', 'Cloudflare 公网入口', 'Peach 代理']);
    expect([...card(root, '访问密码').querySelectorAll('span.text-body-medium')].map(node => node.textContent))
      .toEqual(['当前访问密码 *', '新访问密码 *', '确认新访问密码 *']);
  });
});
