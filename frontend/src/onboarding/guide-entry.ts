import { ROUTE_META } from '../history/route-meta';
import { PREFERENCE_SECTIONS, CONFIGURATION_SECTIONS } from '../history/settings-route';
import { JAV_TABS } from '../react/jav/jav-navigation';
import type { GuideStep } from './guide-catalog';
import { t } from '../i18n';

export interface GuideEntry { path: readonly string[]; hint?: string }
const sidebarHint = t('onboarding:guideEntry.sidebarHint');
const sidebar = (...path: string[]): GuideEntry => ({ path: [t('onboarding:guideEntry.sidebar'), ...path], hint: sidebarHint });
const preferences = (title: string): GuideEntry => ({ path: [t('onboarding:guideEntry.sidebarPreferences'), title], hint: sidebarHint });

/** 描述真实点击路径；页面与设置名称复用应用定义，不把网址当作操作说明。 */
export function guideEntry(step: GuideStep): GuideEntry | undefined {
  if (step.surface) {
    if (step.id === 'external') return { path: [t('onboarding:guideEntry.videoCard'), t('onboarding:shared.videoDetails'), t('onboarding:shared.externalPlayer')] };
    if (step.surface === 'subtitles') return { path: [t('onboarding:guideEntry.videoCard'), t('onboarding:guideEntry.playerGear'), t('onboarding:guideEntry.subtitles')] };
    if (step.surface === 'player') return { path: [t('onboarding:guideEntry.videoCard'), t('onboarding:guideEntry.playerControlBar')] };
    return { path: [t('onboarding:guideEntry.home'), t('onboarding:guideEntry.clickVideoCard'), t('onboarding:shared.videoDetails')] };
  }
  if (!step.route) return undefined;
  const [pathname = '/', query = ''] = step.route.split('#')[0]!.split('?');
  const key = pathname.split('/')[2];
  if (pathname.startsWith('/settings/')) {
    const preference = PREFERENCE_SECTIONS[key as keyof typeof PREFERENCE_SECTIONS];
    if (preference) return preferences(preference);
    const configuration = CONFIGURATION_SECTIONS[key as keyof typeof CONFIGURATION_SECTIONS];
    if (configuration) return { path: [t('onboarding:guideEntry.sidebarPreferences'), t('onboarding:guideEntry.settings'), configuration], hint: sidebarHint };
  }
  const params = new URLSearchParams(query);
  if (pathname === '/jav' || params.get('jav') === '1') {
    const tab = JAV_TABS.find(([id]) => id === (params.get('tab') || 'library'));
    return sidebar('JAV', tab?.[1] || JAV_TABS[0][1]);
  }
  if (pathname === '/') {
    switch (step.id) {
      case 'search': return { path: [t('onboarding:guideEntry.pageTop'), t('onboarding:shared.search')], hint: t('onboarding:guideEntry.searchHint') };
      case 'navigation': return { path: [t('onboarding:guideEntry.navButton'), t('onboarding:guideEntry.sidebarBrowse')] };
      case 'library': return { path: [t('onboarding:guideEntry.sidebarTop'), t('onboarding:guideEntry.librarySwitcher')], hint: sidebarHint };
      case 'preferences': return preferences(PREFERENCE_SECTIONS.appearance);
      case 'wall': return { path: [t('onboarding:guideEntry.pageTop'), t('onboarding:guideEntry.wallButton')] };
      case 'immerse': return { path: [t('onboarding:guideEntry.pageTop'), t('onboarding:guideEntry.immersiveButton')] };
      case 'cards': case 'detail': return { path: [t('onboarding:guideEntry.home'), t('onboarding:guideEntry.clickVideoCard'), t('onboarding:shared.videoDetails')] };
      case 'player': return { path: [t('onboarding:guideEntry.home'), t('onboarding:guideEntry.clickVideoCard'), t('onboarding:guideEntry.playButton')], hint: t('onboarding:guideEntry.playerHint') };
      case 'filter': return { path: [t('onboarding:guideEntry.home'), t('onboarding:guideEntry.filterSort')], hint: t('onboarding:guideEntry.filterHint') };
    }
    return sidebar(t('onboarding:guideEntry.home'));
  }
  if (['/review', '/quality-goals', '/trash'].includes(pathname)) {
    return sidebar(t('onboarding:guideEntry.manage'), ROUTE_META['/data-cleanup']!.title!, ROUTE_META[pathname]!.title!);
  }
  const meta = ROUTE_META[pathname];
  if (meta?.nav && meta.title) {
    const entry = sidebar(meta.title);
    if (pathname === '/playlists') entry.hint = t('onboarding:guideEntry.playlistsHint');
    return entry;
  }
  if (meta?.section && meta.title) return sidebar(t('onboarding:guideEntry.manage'), meta.title);
  return undefined;
}
