/** 导航保存稳定 ID；显示名称、默认次序与固定首项集中维护。 */
export const NAVIGATION_GROUPS = {
  review: { label: '复核分类', items: [
    ['metadata_fields', '元数据字段'], ['creator_tags', '创作者标签'], ['code_creators', '番号目录存疑'],
    ['western_identity', '西方身份回配'], ['performer_avatars', '女优头像'], ['studio_logos', '厂牌 Logo'],
    ['fc2_markings', 'FC2 评论标记'], ['fc2_similarity', 'FC2 跨号相似'], ['video_endcards', '片尾/出处证据'],
  ] },
  configuration: { label: 'Peach 配置', items: [
    ['library', '媒体库与入库'], ['sources', '来源与订阅'], ['downloads', '下载渠道'],
    ['network', '网络与访问'], ['maintenance', '应用与维护'], ['diagnostics', '系统诊断'],
  ] },
  favorites: { label: '我的收藏', items: [
    ['all', '全部'], ['filters', '保存的筛选'], ['performer', '艺人'], ['creator', '创作者'],
    ['tag', '标签'], ['series', '系列'], ['studio', '片商与厂牌'], ['agency', '事务所'],
  ] },
  jav: { label: 'JAV 分区', items: [['library', '馆藏'], ['wants', '想要'], ['releases', '新作'], ['discover', '发现']] },
  follow: { label: '关注管理', items: [['list', '关注列表'], ['add', '添加关注'], ['tags', '标签管理']] },
  tags: { label: '标签词表', items: [['local', '本地'], ['online', '在线']] },
  preferences: { label: '个人设置', items: [
    ['appearance', '外观与导航'], ['browsing', '浏览与播放'], ['jav', 'JAV 与新作'],
    ['search', '搜索与推荐'], ['content', '内容显示'],
  ] },
} as const;

export type NavigationGroup = keyof typeof NAVIGATION_GROUPS;
export type NavigationOrders = Partial<Record<NavigationGroup, string[]>>;
export const navigationDefaults = (group: NavigationGroup): string[] => NAVIGATION_GROUPS[group].items.map(([key]) => key);
export const navigationFixedKeys = (group: NavigationGroup | undefined): readonly string[] => group === 'favorites' ? ['all'] : [];

export function normalizeNavigationOrder(group: NavigationGroup, value: unknown): string[] {
  const defaults = navigationDefaults(group);
  const keys = Array.isArray(value) ? value.filter((key): key is string => typeof key === 'string' && defaults.includes(key)) : [];
  return [...new Set([...navigationFixedKeys(group), ...keys, ...defaults])];
}

export function normalizeNavigationOrders(raw: unknown): NavigationOrders {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
  const saved = raw as Record<string, unknown>;
  return Object.fromEntries((Object.keys(NAVIGATION_GROUPS) as NavigationGroup[])
    .filter(group => Array.isArray(saved[group]))
    .map(group => [group, normalizeNavigationOrder(group, saved[group])]));
}
