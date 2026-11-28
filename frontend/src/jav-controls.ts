/** JAV 卡片页的壳入口；选择集由当前页面持有，不混入馆藏资产 ID。 */
export const JAV_SELECTION_EVENT = 'peach:jav-selection';
let pendingTab = '';
const tabOf = (search: string) => new URLSearchParams(search).get('tab') || '';

export function requestJavSelection(search: string, enter = false) {
  const tab = tabOf(search);
  if (window.dispatchEvent(new CustomEvent(JAV_SELECTION_EVENT, { cancelable: true, detail: { tab, enter } }))) {
    pendingTab = !enter && pendingTab === tab ? '' : tab;
  }
}

export function takeJavSelection(search: string) {
  const requested = !!pendingTab && pendingTab === tabOf(search);
  pendingTab = '';
  return requested;
}

export function syncJavSelection(path: string, search: string) {
  if (path !== '/jav' || pendingTab !== tabOf(search)) pendingTab = '';
}
export function javCardPage(path: string, search: string) {
  return path === '/jav' && ['releases', 'discover'].includes(tabOf(search));
}

/** JAV 作品与想要清单的选择集归当前页签，进多选模式后显示勾选。 */
export function javSelectPage(path: string, search: string) {
  return path === '/jav' && ['releases', 'discover', 'online', 'wants'].includes(tabOf(search));
}
