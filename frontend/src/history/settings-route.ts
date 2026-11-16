import { t } from '../i18n';

/* 设置分区的标识是地址里的 id（`/settings/<id>`）；标题按界面语言取，只用于显示。
   按标题找分区的入口都先经 `sectionId` 换成 id，所以中英文标题和旧的中文 `?section=` 链接都认。 */
export const PREFERENCE_SECTIONS = {
  appearance: t('navigation:preferenceSections.appearance'), playback: t('navigation:preferenceSections.playback'),
  jav: t('navigation:preferenceSections.jav'), search: t('navigation:preferenceSections.search'),
  content: t('navigation:preferenceSections.content'),
} as const;
export const CONFIGURATION_SECTIONS = {
  library: t('navigation:configurationSections.library'), subscriptions: t('navigation:configurationSections.feeds'),
  downloads: t('navigation:configurationSections.downloads'), network: t('navigation:configurationSections.network'),
  maintenance: t('navigation:configurationSections.maintenance'), diagnostics: t('navigation:configurationSections.diagnostics'),
} as const;
export type SettingsSectionId = keyof typeof PREFERENCE_SECTIONS | keyof typeof CONFIGURATION_SECTIONS;
/* 抽取前的分享链接与书签里写的是中文分区名（`?section=下载渠道`），照旧认。 */
const LEGACY_TITLES: Readonly<Record<string, SettingsSectionId>> = {
  外观与导航: 'appearance', 浏览与播放: 'playback', 'JAV 与新作': 'jav', 搜索与推荐: 'search', 内容显示: 'content',
  媒体库与入库: 'library', 来源与订阅: 'subscriptions', 下载渠道: 'downloads', 网络与访问: 'network',
  应用与维护: 'maintenance', 系统诊断: 'diagnostics',
};
const SECTION_TITLES: Readonly<Record<SettingsSectionId, string>> = { ...PREFERENCE_SECTIONS, ...CONFIGURATION_SECTIONS };
/** 分区 id、当前语言的分区标题或旧链接里的中文分区名 → 分区 id；认不出返回 null。 */
export function sectionId(name: string | null | undefined): SettingsSectionId | null {
  if (!name) return null;
  if (name in SECTION_TITLES) return name as SettingsSectionId;
  return (Object.entries(SECTION_TITLES).find(([, title]) => title === name)?.[0] as SettingsSectionId | undefined)
    ?? LEGACY_TITLES[name] ?? null;
}
/** 分区在当前界面语言里的标题；认不出的原样返回。 */
export const sectionTitle = (name: string): string => { const id = sectionId(name); return id ? SECTION_TITLES[id] : name; };
export type ConfigurationPath = `/settings/${keyof typeof CONFIGURATION_SECTIONS}`;
/** 「应用与维护」之下的子页：升级后的修复与迁移。不进配置分区页签，从「自动修复」进入，页头画面包屑。 */
export const REPAIR_CENTER_PATH = '/settings/maintenance/repairs' as const;
/** 设置分区那一层的地址（`/settings/<分区>`）；分区之下的子页不算。 */
export const isSettingsSectionPath = (path: string): boolean => /^\/settings\/[^/]+$/.test(path);
export function configurationSection(path: string): string {
  return CONFIGURATION_SECTIONS[path.split('/')[2] as keyof typeof CONFIGURATION_SECTIONS] || CONFIGURATION_SECTIONS.library;
}
export const PREFERENCE_PATHS = ['/settings', ...Object.keys(PREFERENCE_SECTIONS).map(key => `/settings/${key}`)];
export const isPreferencePath = (path: string): boolean => PREFERENCE_PATHS.includes(path);
export function preferenceSection(path: string): string {
  return PREFERENCE_SECTIONS[path.split('/')[2] as keyof typeof PREFERENCE_SECTIONS] || PREFERENCE_SECTIONS.appearance;
}
/** 分区的地址；`section` 可以是 id、标题或旧的中文分区名。 */
export function settingsPath(section: string): string {
  return `/settings/${sectionId(section) || 'appearance'}`;
}
export interface SettingsBackground {
  pathname: string; search: string; state: unknown; seq: number;
}
export const settingsBackgroundOf = (state: unknown): SettingsBackground | null => {
  const background = (state as { settingsBackground?: SettingsBackground } | null)?.settingsBackground;
  return background && typeof background.pathname === 'string' ? background : null;
};
