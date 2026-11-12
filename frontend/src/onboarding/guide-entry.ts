import { ROUTE_META } from '../history/route-meta';
import { PREFERENCE_SECTIONS, CONFIGURATION_SECTIONS } from '../history/settings-route';
import { JAV_TABS } from '../react/jav/jav-navigation';
import type { GuideStep } from './guide-catalog';

export interface GuideEntry { path: readonly string[]; hint?: string }
const sidebarHint = '侧栏收起时，先点左上角的导航按钮。';
const sidebar = (...path: string[]): GuideEntry => ({ path: ['侧栏', ...path], hint: sidebarHint });
const preferences = (title: string): GuideEntry => ({ path: ['侧栏底部的设置', title], hint: sidebarHint });

/** 描述真实点击路径；页面与设置名称复用应用定义，不把网址当作操作说明。 */
export function guideEntry(step: GuideStep): GuideEntry | undefined {
  if (step.surface) {
    if (step.id === 'external') return { path: ['作品卡片', '作品详情', '外部播放器'] };
    if (step.surface === 'subtitles') return { path: ['作品卡片', '播放器齿轮', '字幕'] };
    if (step.surface === 'player') return { path: ['作品卡片', '播放器底部控制条'] };
    return { path: ['首页', '点击作品卡片', '作品详情'] };
  }
  if (!step.route) return undefined;
  const [pathname = '/', query = ''] = step.route.split('#')[0]!.split('?');
  const key = pathname.split('/')[2];
  if (pathname.startsWith('/settings/')) {
    const preference = PREFERENCE_SECTIONS[key as keyof typeof PREFERENCE_SECTIONS];
    if (preference) return preferences(preference);
    const configuration = CONFIGURATION_SECTIONS[key as keyof typeof CONFIGURATION_SECTIONS];
    if (configuration) return { path: ['侧栏底部的设置', 'Peach 配置', configuration], hint: sidebarHint };
  }
  const params = new URLSearchParams(query);
  if (pathname === '/jav' || params.get('jav') === '1') {
    const tab = JAV_TABS.find(([id]) => id === (params.get('tab') || 'library'));
    return sidebar('JAV', tab?.[1] || JAV_TABS[0][1]);
  }
  if (pathname === '/') {
    switch (step.id) {
      case 'search': return { path: ['页面顶部', '搜索'], hint: '手机上先点放大镜，再输入关键词。' };
      case 'navigation': return { path: ['左上角导航按钮', '侧栏中的浏览入口'] };
      case 'library': return { path: ['侧栏顶部', '媒体库选择器'], hint: sidebarHint };
      case 'preferences': return preferences(PREFERENCE_SECTIONS.appearance);
      case 'wall': return { path: ['页面顶部', '播放墙按钮'] };
      case 'immerse': return { path: ['页面顶部', '沉浸模式按钮'] };
      case 'cards': case 'detail': return { path: ['首页', '点击作品卡片', '作品详情'] };
      case 'player': return { path: ['首页', '点击作品卡片', '播放入口'], hint: '开始播放后，在播放器中选择字幕和播放选项。' };
      case 'filter': return { path: ['首页', '列表上方的筛选与排序'], hint: '来源、时长等更多筛选位于侧栏。' };
    }
    return sidebar('首页');
  }
  if (['/review', '/quality-goals', '/trash'].includes(pathname)) {
    return sidebar('管理', ROUTE_META['/data-cleanup']!.title!, ROUTE_META[pathname]!.title!);
  }
  const meta = ROUTE_META[pathname];
  if (meta?.nav && meta.title) {
    const entry = sidebar(meta.title);
    if (pathname === '/playlists') entry.hint = '若侧栏没有播放列表，到设置 → 外观与导航 → 导航入口与顺序添加；手机上先展开侧栏。';
    return entry;
  }
  if (meta?.section && meta.title) return sidebar('管理', meta.title);
  return undefined;
}
