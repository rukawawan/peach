/* 配置页的骨架：整页静态骨架（React 包与 `/api/configuration` 回来之前）与各分区自己取数时的
 * 分区骨架都由这里的构件拼，按终态的结构画：列表画成行，表单画成「标签 + 输入框」，开关行画成
 * 「标题 + 说明 + 开关」，底栏画禁用的键。
 *
 * 行数有两种来路：
 * - 代码里的静态登记决定的（来源凭据的站点清单、各分区固定的设置行与字段名）直接照登记画，名字写真名；
 * - 随这台机器的配置变的（媒体库与文件夹、索引器、网盘账号、下载渠道、访问密码的状态等）照本机上次
 *   画好时记下的结构画：记的是行数与每行是否展开这类结构，不是高度。没有记录时按空集合或一行的最小结构画。 */
import { esc } from '@peach/legacy/core';
import { islandButton, islandGlyph, islandSelect } from './island-skeleton';
import { appSettingsStore } from './appearance/settings';
import { NAVIGATION_GROUPS, normalizeNavigationOrder } from './navigation-order';
import { diagnosticsSkeleton } from './diagnostics-skeleton';
import { LIBRARY_FOLDER_HELP, POLICY_SUMMARY } from './react/settings/library-policy-copy';
import { ENTRY_LINKS_HELP, ENTRY_LINKS_HINT } from './configuration-copy';
import CREDENTIAL_REGISTRY from './react/follow-manage/credential-providers.json' with { type: 'json' };

export const CLOUD_PROXY_HELP = 'API 代理用于列目录和查询文件信息，数据代理用于读取视频及配套文件。保存后，同一网盘账号在 CloudDrive 中的其他读取也会使用此设置。';

/* ---------- 本机记下的结构 ---------- */

export interface MediaShape { folders: number[]; cloud: boolean }
export interface DiscoveryShape { enabled: boolean; watchLocal: boolean; cloud: boolean; webhook: boolean; prefixes: number }
export interface CredentialsShape { done: string[] }
/** 每个索引器一项：是否默认展开（还没有地址的那条展开）。 */
export interface IndexersShape { open: boolean[] }
export interface JavBrowserShape { enabled: boolean; ready: boolean }
/** 每个网盘账号一项：[数据代理走代理, API 代理走代理]，走代理时多出地址、端口与认证三行。 */
export interface CloudProxyShape { configured: boolean; accounts: [boolean, boolean][]; unlinked: number }
export interface DownloadsShape { cloud: boolean; has115: boolean; pikpak: boolean; pikpakRoots: boolean; pikpakLoggedIn: boolean; browserLogin: boolean }
export interface NetworkShape { port: boolean; addresses?: number; networkEditable?: boolean; lan?: boolean; proxyAddress: boolean; access: string; tunnelNamed: boolean; tunnelNamedMode: boolean; tunnelNote: boolean }
/** 已登录的设备：行数，以及底栏有没有「撤销其他设备」。 */
export interface DevicesShape { rows: number; manageable: boolean }
export interface MaintenanceShape {
  releaseFacts: number; releaseNotes: number; autoUpdateHelp: boolean; startupNote: boolean; desktopNote: boolean;
  storageRows: number; storageNotes: number; reporting: boolean; reportingIdle: boolean; sharing: boolean;
  sharingNotice: boolean; sharingIdle: boolean; facts: string[]; uninstall: boolean; uninstallHelp: boolean;
}
export interface ConfigurationShape {
  media: MediaShape; discovery: DiscoveryShape; credentials: CredentialsShape; indexers: IndexersShape;
  javBrowser: JavBrowserShape; cloudProxy: CloudProxyShape; downloads: DownloadsShape; network: NetworkShape;
  devices: DevicesShape; maintenance: MaintenanceShape;
}
type Shapes = { [K in keyof ConfigurationShape]?: Partial<ConfigurationShape[K]> };

export const SHAPE_KEY = 'peach.configuration.shape.v1';

function shapes(): Shapes {
  try {
    const value = JSON.parse(localStorage.getItem(SHAPE_KEY) || '{}') as unknown;
    return value && typeof value === 'object' ? value as Shapes : {};
  } catch { return {} }
}

/** 记下一个分区这次画好时的结构，下次首屏骨架照它排。 */
export function rememberShape<K extends keyof ConfigurationShape>(key: K, value: ConfigurationShape[K]): void {
  try {
    const all = shapes();
    if (JSON.stringify(all[key]) === JSON.stringify(value)) return;
    localStorage.setItem(SHAPE_KEY, JSON.stringify({ ...all, [key]: value }));
  } catch { /* 下次按最小结构画。 */ }
}

/** 上次记下的结构；本机没有记录时是 `undefined`。取值时逐项校验，坏数据按没有处理。 */
export const rememberedShape = <K extends keyof ConfigurationShape>(key: K): Shapes[K] => shapes()[key];

const on = (value: unknown): boolean => value === true;
const count = (value: unknown, max: number): number => Number.isInteger(value) && (value as number) > 0 ? Math.min(value as number, max) : 0;
const list = <T>(value: unknown, max: number, item: (entry: unknown) => T): T[] => Array.isArray(value) ? value.slice(0, max).map(item) : [];

/* ---------- 构件：类名与正式组件同几何 ---------- */

const wait = 'disabled data-skeleton-action';
const text = (width = '60%') => `<span class="skeleton skeleton-text" style="width:${width}"></span>`;
const input = (width = '100%') => `<span class="skeleton ui-configuration-skeleton-input" style="width:${width}"></span>`;
/** 图标、徽章这类定尺寸的块：只放在 flex 行里。 */
const block = (width: string, height: string) => `<span class="skeleton shrink-0" style="width:${width};height:${height}"></span>`;
const chip = (width = '3em') => block(width, '24px');
const icon = () => block('var(--icon-inline)', 'var(--icon-inline)');
const button = (label: string, variant: 'primary' | 'secondary' = 'primary', size: 'medium' | 'small' = 'medium') =>
  islandButton({ label, variant, size, attrs: wait });
const footer = (content: string, status = '') => `<div class="-ml-3 flex flex-wrap items-center justify-end gap-3 rounded-b-2xl border-t border-separator-border bg-card-footer px-3 py-3">${status ? `<div class="mr-auto min-w-0 text-body-2-regular text-text-secondary">${status}</div>` : ''}${content}</div>`;
const stack = (content: string, divided = false) => `<div class="flex flex-col gap-4 ${divided ? 'border-t border-separator-border ' : ''}py-4 pr-3">${content}</div>`;
const heading = (name: string, aside: string, mark: boolean) => {
  const label = `<p class="w-full px-3 text-body-2-medium text-text-secondary">${mark ? `<span class="inline-flex items-center gap-1.5">${icon()}${name}</span>` : name}</p>`;
  return aside ? `<div class="flex w-full flex-wrap items-center justify-between gap-2"><div class="min-w-40 flex-1">${label}</div><div class="flex min-w-0 max-w-full">${aside}</div></div>` : label;
};
const section = (name: string, content: string, actions = '', { aside = '', status = '', mark = false } = {}) =>
  `<section aria-label="${name}" class="flex w-full flex-col gap-2 wrap-anywhere">${heading(name, aside, mark)}<div class="flex w-full flex-col rounded-2xl bg-background-secondary-default pl-3">${content}${actions ? footer(actions, status) : ''}</div></section>`;
/** 同 BoardUI `SettingsRow`；`lead` 是行首图标的占位。 */
const controlRow = (label: string, description: string, control: string, lead = '') => {
  const body = `<div class="flex min-w-0 flex-col"><p class="text-body-regular text-text-primary">${label}</p>${description ? `<p class="text-body-2-regular text-text-secondary">${description}</p>` : ''}</div>`;
  return `<div class="flex min-h-[52px] w-full items-center justify-between gap-4 py-2.5 pr-2.5 border-b border-separator-border last:border-b-0">${lead ? `<div class="flex min-w-0 items-center gap-3">${lead}${body}</div>` : body}${control}</div>`;
};
const row = (label: string, description = '', control = 'ui-configuration-skeleton-toggle') => controlRow(label, description, `<span class="skeleton ${control}"></span>`);
/* 只读一句读数的行（「每 3 个月」）：右边是一段文字宽的占位，行高同开关行。 */
const valueRow = (label: string, description = '', width = '4em') => controlRow(label, description, text(width));
const help = (content: string) => `<p class="text-body-2-regular text-text-secondary">${content}</p>`;
const fieldLabel = (label: string) => `<p class="text-body-medium text-text-primary">${label}</p>`;
const inputField = (label: string, hint = '') => `<div class="flex w-full flex-col items-start gap-1"><span class="flex items-center gap-0.5 text-body-medium text-text-primary">${label}</span>${input()}${hint ? `<span class="pt-px text-caption-1-medium text-text-secondary">${hint}</span>` : ''}</div>`;
const selectField = (label: string) => `<div class="flex flex-col gap-1">${fieldLabel(label)}${islandSelect(text('8em'))}</div>`;
const check = (label: string) => `<span class="flex items-center gap-2 text-body-regular text-text-primary">${block('16px', '16px')}${label}</span>`;
const marked = (label: string) => `<span class="inline-flex items-center gap-1">${icon()}${label}</span>`;
/** 折叠行（`Disclosure` 的 summary）：箭头与名字；展开时箭头转下。 */
const summary = (label: string, open = false) => `<span class="flex w-fit items-center gap-1 text-body-2-medium text-text-secondary">${islandGlyph('chevron-right', `size-(--icon-inline) shrink-0${open ? ' rotate-90' : ''}`)}${label}</span>`;
/* 读数一行一条；缺工具的 FFmpeg、untrunc 两行是一段说明加一条下载链接，画成三行字。 */
const DEPENDENCY_FACTS = new Set(['FFmpeg', 'untrunc']);
const facts = (terms: string[]) => `<dl class="ui-settings-facts flex flex-col">${terms.map(term => `<div class="flex min-h-11 items-center justify-between gap-4 border-b border-separator-border py-2.5 pr-3 last:border-b-0"><dt class="flex max-w-1/2 min-w-0 shrink-0 items-center gap-2 text-body-regular text-text-secondary">${term}</dt><dd class="flex min-w-0 flex-wrap items-center justify-end gap-2 text-body-regular text-text-primary">${DEPENDENCY_FACTS.has(term) ? text('100%') + text('80%') + text('6em') : text('6em')}</dd></div>`).join('')}</dl>`;

/* ---------- 来源凭据：站点清单是静态登记 ---------- */

interface CredentialProvider { provider: string; label: string; requirement: string; fields?: string[]; why?: string; where?: string; howto?: string }
/** 与 `/api/follow/credentials` 的静态部分一致，由 `tests/test_follow_web.py` 对照接口核对。 */
export const CREDENTIAL_PROVIDERS: readonly CredentialProvider[] = CREDENTIAL_REGISTRY;

export interface CredentialSkeletonRow extends CredentialProvider { done: boolean; open: boolean }

/** 骨架里每一行：站点、分组与要的字段取自登记；配好没有取自上次记录，没有记录时按都没配。
 *  展开规则与终态同一条：必填且没配好的展开。 */
export function credentialSkeletonRows(shape = rememberedShape('credentials')): CredentialSkeletonRow[] {
  const done = new Set(list(shape?.done, 64, String));
  return CREDENTIAL_PROVIDERS.map(entry => {
    const configured = done.has(entry.provider);
    return { ...entry, done: configured, open: entry.requirement === 'required' && !configured };
  });
}

function credentialRow(row: CredentialSkeletonRow): string {
  const fields = row.fields ?? [];
  const configurable = row.requirement !== 'none' && row.requirement !== 'blocked';
  /* 徽章位：状态一枚，没配好时每个缺的字段再一枚。 */
  const chips = chip() + (configurable && !row.done ? fields.map(() => chip('4.5em')).join('') : '');
  const head = `<span class="flex min-w-0 flex-wrap items-center gap-2">${block('14px', '14px')}<b class="min-w-0 text-body-medium wrap-anywhere text-text-primary">${esc(row.label)}</b>${chips}</span>`;
  if (!configurable) {
    return `<div class="flex flex-wrap items-center gap-3 border-b border-separator-border px-6 py-5 last:border-b-0 max-sm:px-4">${head}${row.requirement === 'blocked' && row.why ? help(esc(row.why)) : ''}</div>`;
  }
  const form = row.open ? '<div class="flex flex-col gap-2 pt-3"><div class="flex flex-col gap-3">'
    + help(`${esc(row.why ?? '')}${row.where ? ' 获取凭据' : ''}`) + (row.howto ? help(esc(row.howto)) : '')
    + `<div class="flex w-full flex-col gap-3">${fields.map(name => inputField(esc(name))).join('')}</div>`
    + `<div class="flex flex-wrap items-center gap-2">${button('保存配置')}</div>${summary('凭据文件')}</div></div>` : '';
  return `<div class="flex flex-col gap-2 border-b border-separator-border px-6 py-5 last:border-b-0 max-sm:px-4">${head}<div>${summary(row.done ? '修改凭据' : '填写凭据', row.open)}${form}</div></div>`;
}

export function credentialsSkeleton(): string {
  const rows = credentialSkeletonRows();
  const pending = rows.filter(row => row.requirement === 'required' && !row.done).length;
  const groups = [
    ['可配置凭据', rows.filter(row => row.requirement !== 'none' && row.requirement !== 'blocked')],
    ['不需要凭据', rows.filter(row => row.requirement === 'none')],
    ['暂不支持', rows.filter(row => row.requirement === 'blocked')],
  ] as const;
  const body = groups.filter(([, items]) => items.length).map(([name, items]) => `<div class="flex flex-col gap-2"><h4 class="text-body-medium text-text-secondary">${name}</h4><div class="min-w-0 border border-separator-border bg-background-primary-default rounded-surface flex flex-col overflow-hidden">${items.map(credentialRow).join('')}</div></div>`).join('');
  return section('来源凭据', stack(`<div class="flex flex-col gap-4">${body}</div>`), '', { aside: pending ? text('5em') : '' });
}

/* ---------- 资源搜索：索引器条数随配置 ---------- */

export function indexersSkeleton(): string {
  const open = list(rememberedShape('indexers')?.open, 20, on);
  const rows = open.map(expanded => `<div class="min-w-0 border-t border-separator-border pt-2"><span class="flex w-full min-w-0 items-center gap-1 text-body-2-medium">${islandGlyph('chevron-right', `size-(--icon-inline) shrink-0 text-text-secondary${expanded ? ' rotate-90' : ''}`)}${text('6em')}${text('12em')}</span>`
    + (expanded ? `<div class="flex flex-col gap-2 pt-3"><div class="flex min-w-0 flex-col gap-4">${inputField('名称')}${inputField('Torznab 地址')}${inputField('API key')}<div class="flex flex-wrap items-center gap-x-6 gap-y-2">${check('启用')}${button('移除', 'secondary', 'small')}</div></div></div>` : '')
    + '</div>').join('');
  return section('资源搜索', stack(`<div class="flex min-w-0 flex-col gap-4">${summary('索引器连接帮助')}${rows}</div>`), button('添加索引器', 'secondary') + button('保存配置'));
}

/* ---------- 浏览器添加 JAV ---------- */

export function javBrowserSkeleton(): string {
  const shape = rememberedShape('javBrowser');
  const enabled = on(shape?.enabled);
  const status = '<div class="min-w-0 bg-background-primary-default rounded-2xl shadow-card p-5 border border-border-button-default flex flex-col gap-3">'
    + `<div class="flex flex-wrap items-center justify-between gap-3"><span class="text-body-medium text-text-primary">Peach 用户脚本</span>${text('4em')}</div>`
    + `<div class="flex flex-wrap items-center justify-between gap-3"><span class="text-body-regular text-text-secondary">浏览器添加</span>${chip()}</div>`
    + `<p class="text-caption-1-regular text-text-secondary">${text('70%')}</p>`
    + `<div class="flex flex-wrap items-center gap-2">${button('重新检测', 'secondary')}</div></div>`;
  return section('浏览器添加 JAV', stack(`<div class="flex min-w-0 flex-col gap-4">${status}${selectField('浏览器添加的下载渠道')}`
    + `${on(shape?.ready) ? '' : help('请在媒体库中添加支持云下载的网盘，并配置账号与目标目录。')}${inputField('Peach 地址')}</div>`),
  (enabled ? button('关闭浏览器添加', 'secondary') : '') + button(enabled ? '更新渠道与令牌' : '启用并生成令牌'));
}

/* ---------- CloudDrive 代理：账号数随配置 ---------- */

const proxyEditor = (label: string, proxy: boolean) => `<div class="flex min-w-0 flex-col gap-3">${fieldLabel(label)}${islandSelect(text('6em'))}`
  + (proxy ? `<div class="flex flex-wrap gap-3"><div class="min-w-40 flex-1">${inputField(`${label}地址`)}</div><div class="w-full sm:w-28">${inputField(`${label}端口`)}</div></div>${summary('代理认证')}` : '') + '</div>';

export function cloudProxySkeleton(): string {
  const shape = rememberedShape('cloudProxy');
  const accounts = list(shape?.accounts, 12, entry => Array.isArray(entry) ? [on(entry[0]), on(entry[1])] as const : [false, false] as const);
  const unlinked = count(shape?.unlinked, 12);
  const body = accounts.length || unlinked
    ? Array.from({ length: unlinked }, () => `<div class="flex min-w-0 flex-col gap-1">${fieldLabel(marked(text('6em')))}${help(text('9em'))}</div>`).join('')
      + accounts.map(([data, api]) => `<div class="flex min-w-0 flex-col gap-4 border-t border-separator-border pt-4">${fieldLabel(marked(text('8em')))}${help(text('50%'))}${proxyEditor('数据代理', data)}${proxyEditor('API 代理', api)}<div class="flex justify-end">${button('保存配置')}</div></div>`).join('')
    : help(text('60%'));
  return section('CloudDrive 代理', stack(`${help(CLOUD_PROXY_HELP)}<div class="flex min-w-0 flex-col gap-4">${body}</div>`), button('重新读取', 'secondary'));
}

/* ---------- 媒体库与入库 ---------- */

const field = (label: string, control: string, className: string) =>
  `<div class="flex min-w-0 flex-col gap-1 ${className}"><span class="flex items-center gap-0.5 text-body-medium text-text-primary" aria-hidden="true">${label}</span>${control}</div>`;
const folderRow = (libraries: number) => `<div data-folder-row class="@container flex flex-col gap-2 rounded-2lg border border-separator-border bg-background-primary-default p-3">
    <div class="flex items-start gap-2"><span class="min-w-0 flex-1">${input()}</span>${islandButton({ glyph: 'folder-search', variant: 'secondary', attrs: wait })}</div>
    <div class="flex flex-wrap items-end gap-2"><div class="flex w-full flex-wrap items-start gap-2">${field('来源', islandSelect(text('6em')), 'w-full @lg:w-60')}${field('读取策略', islandSelect(text('4em')), 'w-full @lg:w-32')}${libraries > 1 ? field('移到媒体库', islandSelect(text('4em')), 'w-full @lg:w-48') : ''}</div></div>
  </div>`;
/* 媒体库卡与 `cardClass({ variant: 'raised', padding: 'none' })` 同一组类名。 */
const libraryBlock = (folders: number, libraries: number) => `<div data-library-block class="min-w-0 bg-background-primary-default rounded-2xl shadow-card flex flex-col p-2">
    <div data-library-head>${islandButton({ label: '自动识别', variant: 'secondary', attrs: wait })}${input()}<span class="skeleton ui-configuration-skeleton-input" style="width:136px"></span>${islandSelect(text('4em'), { prefix: '处理方式' })}</div>
    <div data-library-folders>${folderRow(libraries).repeat(folders)}<div class="flex">${islandButton({ label: '添加文件夹', variant: 'secondary', attrs: wait })}</div></div></div>`;
/* 说明区是固定文字：常显那一句照原文写，对比表收着，只画它的展开行。 */
const legend = `<div data-policy-legend class="flex flex-col gap-1"><p class="text-body-2-regular text-text-secondary">${POLICY_SUMMARY}</p>`
  + '<span class="flex items-center gap-1 text-body-2-medium text-text-secondary">三种处理方式对比</span></div>';
const cloudHelp = '<p class="text-body-2-regular text-text-secondary">读取策略选「代理保护」时，会限制自动读取视频。</p>'
  + '<div class="flex flex-col gap-3"><span class="flex items-center gap-1 text-body-2-medium text-text-secondary">CloudDrive 设置帮助</span></div>';

/** 每个媒体库几个文件夹：上次的记录，没有时一组一个文件夹。 */
export function mediaSkeletonShape(shape = rememberedShape('media')): MediaShape {
  const folders = list(shape?.folders, 12, entry => count(entry, 50)).filter(Boolean);
  return folders.length ? { folders, cloud: on(shape?.cloud) } : { folders: [1], cloud: false };
}

/** 自动发现新文件：三行开关是固定的；开着时的说明、Webhook 行与前缀表随配置。 */
export function discoverySkeleton(): string {
  const shape = rememberedShape('discovery');
  const enabled = on(shape?.enabled);
  const cloud = enabled && on(shape?.cloud);
  const webhook = cloud && on(shape?.webhook);
  const prefixRow = `<div class="flex items-start gap-2"><span class="min-w-0 flex-1">${input()}</span>${islandSelect(text('4em'), { prefix: '对应目录' })}${islandButton({ glyph: 'trash', variant: 'secondary', attrs: wait })}</div>`;
  return section('自动发现新文件', stack(`<div class="flex flex-wrap items-center gap-2"><span class="text-body-regular text-text-secondary">本机监视</span>${chip()}</div>`)
    + row('发现新文件后自动入库', enabled ? text('10em') : '') + row('监视本机文件夹', enabled && on(shape?.watchLocal) ? text('12em') : '')
    + row('接收 CloudDrive2 通知', '网盘目录有变化时由 CloudDrive2 推送过来。') +(cloud ? controlRow('Webhook 配置', text('20em'), '') : '')
    + (webhook ? stack(summary('查看配置'), true) : '')
    + (cloud ? stack(`<div class="flex flex-col gap-3">${fieldLabel('云端路径前缀')}<div class="flex flex-col gap-3">${prefixRow.repeat(count(shape?.prefixes, 20))}</div><div>${button('添加前缀', 'secondary')}</div></div>`, true) : ''),
  (webhook ? button('更换密钥', 'secondary') : '') + button('保存配置'));
}

/** 媒体库与目录：图例、每个媒体库的标题行、文件夹行与它自己的添加键，最下面添加媒体库与底部动作。 */
const media = () => {
  const shape = mediaSkeletonShape();
  return section('媒体库与目录', stack(`${legend}<div class="flex flex-col gap-4">${shape.folders.map(folders => libraryBlock(folders, shape.folders.length)).join('')}</div>
  <div class="self-start">${button('添加媒体库', 'secondary')}</div>
  <p class="text-body-2-regular text-text-secondary">${LIBRARY_FOLDER_HELP}</p>
  ${shape.cloud ? cloudHelp : ''}<span class="text-body-medium text-text-primary">${text('15em')}</span>`),
  button('保存配置'), { status: '保存后 Peach 会重新启动。' })
  + (shape.cloud ? cloudProxySkeleton() : '')
  + discoverySkeleton()
  + section('番号识别规则', stack(`${text('90%')}${text('60%')}<span class="skeleton ui-configuration-skeleton-input" style="width:100%;height:88px"></span>`), button('保存配置'))
  + section('视频预览', row('生成视频预览', '为本地视频生成九宫格与时间轴预览。')
    + row('时间轴预览', '按所选间隔抽帧，仅处理本机磁盘上的视频。', 'ui-configuration-skeleton-select')
    + row('抽帧解码方式', '用于生成封面、九宫格和时间轴。', 'ui-configuration-skeleton-select'));
};

/* ---------- 来源与订阅 ---------- */

const subscriptions = () => `<div>${button('采集来源与登录状态', 'secondary')}</div>`
  + credentialsSkeleton()
  + section('关注采集', controlRow('自动检查更新', '', `<span class="flex items-center gap-2"><span class="skeleton ui-configuration-skeleton-toggle"></span><span class="skeleton ui-configuration-skeleton-input" style="width:96px"></span></span>`)
    + valueRow('订阅源拉取') + row('首次采集范围', '新关注的来源第一次回看多久以前的内容。', 'ui-configuration-skeleton-select')
    + valueRow('头像刷新', '重新获取关注创作者的头像。') + valueRow('favicon 刷新', '重新获取来源站点的图标。'))
  + indexersSkeleton()
  + section('作品资料站点', stack(`<p class="text-body-2-regular text-text-secondary">${ENTRY_LINKS_HELP}</p>${inputField(marked('JavDB 地址'), ENTRY_LINKS_HINT)}${inputField(marked('MISSAV 地址'), ENTRY_LINKS_HINT)}`), button('保存配置'));

/* ---------- 下载渠道：云下载与 PikPak 两块随媒体库里的网盘出现 ---------- */

const downloads = () => {
  const shape = rememberedShape('downloads');
  const pikpak = on(shape?.pikpak);
  const roots = on(shape?.pikpakRoots) ? selectField(marked('PikPak 根目录对应的媒体目录'))
    : `<div class="flex flex-col gap-1">${fieldLabel(marked('PikPak 根目录对应的媒体目录'))}${help('先在「媒体库与入库」添加 PikPak 挂载文件夹。')}</div>`;
  const cloud = on(shape?.cloud) ? section('云下载', stack(inputField('CloudDrive2 地址') + inputField('CloudDrive2 API 令牌', '需要离线任务权限。')
    + (on(shape?.has115) ? inputField(marked('115 目标目录'), '应位于自动入库的云端路径前缀内。') : '')
    + (pikpak ? inputField(marked('PikPak 目标目录'), '目录要已经存在。') + roots : '')
    + inputField('等待上限（小时）', text('14em'))), button('检查连接', 'secondary') + button('保存配置')) : '';
  const loggedIn = on(shape?.pikpakLoggedIn);
  const account = pikpak ? section('PikPak 账号', loggedIn ? facts(['账号', text('4em')]) : stack(inputField('账号') + inputField('密码') + check('保存密码，登录过期时自动重新登录')),
    loggedIn ? button('登出', 'secondary') : (on(shape?.browserLogin) ? button('用浏览器登录', 'secondary') : '') + button('登录'), { aside: chip(), mark: true }) : '';
  return cloud + account + javBrowserSkeleton();
};

/* ---------- 网络与访问 ---------- */

const ACCESS_HELP: Record<string, string> = {
  legacy: '当前使用系统生成的访问口令。改设自己的密码，或关闭登录要求。',
  locked: '访问设置无法读取，请在本机检查配置文件。',
  password: '已设置密码。新设备需要登录，登录时勾选「保持登录」可保持 30 天。',
};
const TUNNEL_HELP = {
  quick: '临时预览用，地址随机，重启后会变。启动前要先设置访问密码。',
  named: '使用你在 Cloudflare 绑定的固定域名。启动前要先设置访问密码。',
};

function accessBody(mode: string): string {
  const pair = mode === 'locked' ? '' : inputField(mode === 'password' ? '新访问密码 *' : '设置访问密码 *', '至少 8 个字符。保存后其他设备需要重新登录。')
    + inputField(mode === 'password' ? '确认新访问密码 *' : '确认访问密码 *');
  return (ACCESS_HELP[mode] ? help(ACCESS_HELP[mode]) : '') + (mode === 'open' ? block('100%', '64px') : '')
    + (mode === 'password' || mode === 'legacy' ? check('关闭访问密码') : '')
    + (mode === 'password' ? inputField('当前访问密码 *') : '') + pair;
}

/** 已登录的设备：分区自己取数时也画这一份。没有记录时按一行（本机）画。 */
export function devicesSkeleton(): string {
  const shape = rememberedShape('devices');
  const rows = Array.from({ length: Math.max(1, count(shape?.rows, 8)) }, () => controlRow(text('8em'), text('14em'), text('3em'), block('20px', '20px'))).join('');
  return section('已登录的设备', rows, on(shape?.manageable) ? button('撤销其他设备', 'secondary') : '',
    on(shape?.manageable) ? { status: '修改访问密码会让全部设备退出。' } : {});
}

const network = () => {
  const shape = rememberedShape('network');
  /* 没有记录时按服务端的默认状态画：没有访问设置文件就是 `legacy`（系统生成的口令）。 */
  const mode = typeof shape?.access === 'string' && shape.access ? shape.access : 'legacy';
  const named = on(shape?.tunnelNamed);
  const tunnel = (named && on(shape?.tunnelNamedMode)
    ? help(TUNNEL_HELP.named) + inputField('公开主机名', 'Cloudflare Zero Trust 里指向这台电脑的主机名。') + inputField('隧道令牌', text('16em'))
    : help(TUNNEL_HELP.quick)) + (on(shape?.tunnelNote) ? block('100%', '64px') : '');
  const addresses = count(shape?.addresses, 3);
  const addressFields = Array.from({ length: addresses }, (_, i) => `<div class="flex min-w-0 flex-wrap items-end gap-2"><div class="min-w-0 flex-1">${inputField(['本机地址', '手机连接地址', '备用 IP 地址'][i]!)}</div>${button('复制地址', 'secondary')}</div>`).join('');
  return (addresses || on(shape?.port) ? section('访问地址', stack(addressFields + (addresses ? block('100%', '40px') : '')
      + (on(shape?.networkEditable) ? `<div class="flex flex-col gap-1.5">${fieldLabel('谁可以访问')}${block('min(100%, 20em)', '36px')}</div>` + (on(shape?.lan) ? inputField('局域网访问地址') : '') : '')
      + (on(shape?.port) ? inputField('端口') : '')), on(shape?.port) ? button('保存配置') : '',
      on(shape?.port) ? { status: '保存后 Peach 会重启，并跳转到新地址。' } : {}) : '')
    + section('访问密码', stack(accessBody(mode)), mode === 'locked' ? '' : button('保存配置'))
    + (mode === 'password' || mode === 'legacy' ? devicesSkeleton() : '')
    + section('Cloudflare 公网入口', stack((named ? block('10.5em', '36px') : '') + tunnel),
      button('启动公网入口', named ? 'secondary' : 'primary') + (named ? button('保存配置') : ''), { aside: chip() })
    + section('Peach 代理', row('连接方式', 'Peach 访问外网和采集来源时使用。', 'ui-configuration-skeleton-select') + (on(shape?.proxyAddress) ? stack(inputField('代理地址'), true) : ''), button('保存配置'));
};

/* ---------- 应用与维护 ---------- */

/** 运行信息里总在的几项；FFmpeg、untrunc 缺失时才多一行，按上次记录。 */
const RUNTIME_FACTS = ['版本', '操作系统', '数据目录', '设置文件', '日志目录'];

const maintenance = () => {
  const shape = rememberedShape('maintenance');
  const releaseFacts = ['当前版本', '安装方式', '更新通道', '最新版本', '下载内容'].slice(0, Math.max(4, count(shape?.releaseFacts, 5)));
  const releaseNotes = count(shape?.releaseNotes, 4);
  const storageRows = count(shape?.storageRows, 12);
  const storageNotes = count(shape?.storageNotes, 3);
  const runtime = list(shape?.facts, 12, entry => esc(String(entry)));
  const idle = `<span class="self-start">${chip('6em')}</span>`;
  /* 数据上传与卸载两块服务端总会给；没有记录时也画上，只是不画随状态出现的提示。 */
  const given = (value: unknown) => shape ? on(value) : true;
  const reporting = given(shape?.reporting) ? row('发送版本统计与错误诊断（推荐）', '上传版本、系统信息、故障类型、代码位置与发生次数。') + (on(shape?.reportingIdle) ? stack(idle, true) : '') : '';
  const sharing = given(shape?.sharing) ? `<div class="border-t border-separator-border">${row('上传馆藏与口味明细', on(shape?.sharingNotice) ? text('12em') : '')}${on(shape?.sharingIdle) ? stack(idle, true) : ''}${footer(button('预览上传内容', 'secondary'))}</div>` : '';
  return section('检查更新', facts(releaseFacts) + (releaseNotes ? stack(help(text('50%')).repeat(releaseNotes), true) : ''),
    button('检查更新'), { aside: chip('4em'), status: text('5em') })
    + section('自动更新', row('自动检查新版本') + row('自动下载更新', '发现新版本后先下载，重启安装前会询问。') +row('检查频率', on(shape?.autoUpdateHelp) ? text('12em') : '', 'ui-configuration-skeleton-select'), button('保存配置'))
    + section('开机自启', row('开机后启动 Peach') + row('只启动托盘，不打开网页', '开机后在后台运行，需要时从托盘打开页面。') +row('在桌面创建快捷方式', on(shape?.desktopNote) ? text('12em') : '')
      + (on(shape?.startupNote) ? stack(help(text('60%')), true) : ''), button('保存配置'))
    + section('视频播放', row('转码方式', '用于播放时的视频转码。', 'ui-configuration-skeleton-select'))
    + section('存储空间', facts(['数据目录', '所在磁盘'])
      + (storageRows ? Array.from({ length: storageRows }, () => controlRow(text('6em'), '', text('4em'))).join('') : stack(help('统计后显示各类数据的占用，并可清理缓存与旧备份。'), true))
      + (storageNotes ? stack(help(text('80%')).repeat(storageNotes), true) : ''),
    button('更改位置', 'secondary') + button(storageRows ? '重新统计' : '统计占用'))
    + (reporting || sharing ? section('数据上传', reporting + sharing) : '')
    + section('运行信息', facts(runtime.length ? runtime : RUNTIME_FACTS))
    + `<section aria-label="新手教程" class="w-full"><div class="flex w-full flex-col rounded-2xl bg-background-secondary-default pl-3">${controlRow('新手教程', '在所有设备上恢复右上角教程入口，保留已读进度', button('重新打开', 'secondary'))}</div></section>`
    + (given(shape?.uninstall) ? section('卸载 Peach', (on(shape?.uninstallHelp) ? stack(help('卸载移除 Peach 程序本身，原始媒体文件保留。')) : '')
      + row('完全卸载', '同时删除设置、本地数据库、观看记录、凭据和缓存') + stack(summary('数据目录'), true), button('卸载 Peach'), { status: text('16em') }) : '');
};

/** 各分区复用正式表单的 Section、Stack 与 SettingsRow 几何。 */
export function configurationContentSkeleton(chosen: string): string {
  switch (chosen) {
    case '系统诊断': return diagnosticsSkeleton();
    case '来源与订阅': return subscriptions();
    case '下载渠道': return downloads();
    case '网络与访问': return network();
    case '应用与维护': return maintenance();
    default: return media();
  }
}

export function configurationSkeleton(chosen = '媒体库与入库'): string {
  const titles = normalizeNavigationOrder('configuration', appSettingsStore().value.navigationOrders.configuration)
    .map(key => NAVIGATION_GROUPS.configuration.items.find(([id]) => id === key)![1]);
  const nav = `<div class="ui-board-local-nav" data-section-nav data-section-items>${titles.map(title => `<button type="button" tabindex="-1" aria-selected="${title === chosen}">${title}</button>`).join('')}</div>`;
  return `<div class="peach-react"><div class="ui-configpage">${nav}<div class="flex min-w-0 flex-col gap-6">${configurationContentSkeleton(chosen)}</div></div></div>`;
}
