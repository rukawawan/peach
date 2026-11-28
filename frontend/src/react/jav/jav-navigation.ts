import { t } from '../../i18n';
export const JAV_TABS = [['library', t('catalog:javTabs.collection')], ['wants', t('catalog:javTabs.wants')], ['releases', t('catalog:javTabs.newReleases')], ['discover', t('catalog:javTabs.discover')], ['online', t('catalog:javTabs.online')]] as const;
export const javTab = (value: string | null) => JAV_TABS.some(([key]) => key === value) ? value! : 'library';
export const javPath = (tab: string) => javTab(tab) === 'library' ? '/?jav=1' : `/jav?tab=${tab}`;
export function javLibraryPath(search: string) {
  const params = new URLSearchParams(search);
  params.delete('tab'); params.set('jav', '1');
  return '/?' + params;
}
/** 页头筛选框的名称；馆藏用顶栏搜索，没有。在线目录的框只筛取回的这一页。 */
export const JAV_SEARCH_LABELS: Record<string, string> = { releases: t('catalog:javSearch.filterReleases'), discover: t('catalog:javSearch.filterRecommended'), wants: t('catalog:javSearch.filterWants'), online: t('catalog:javSearch.filterOnlinePage') };
