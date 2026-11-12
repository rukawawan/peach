/** JAV 卡片页的壳入口；选择集由当前页面持有，不混入馆藏资产 ID。 */
export const JAV_SELECTION_EVENT = 'peach:jav-selection';
export function javCardPage(path: string, search: string) {
  return path === '/jav' && ['releases', 'discover'].includes(new URLSearchParams(search).get('tab') || '');
}
