/* 侧栏导航的骨架：壳启动时同步写进 `#drawerScroll`，路由树画上常驻组件 `sidebar`（`react/sidebar/`）的那一刻
 * 整块换掉。
 *
 * 左侧导航只认地址和本地设置，一个请求都不等；React 包装载回来之前这一列不能是空的。骨架与组件画的是
 * 同一份结构（标题行的空槽、导航那一列），两者之间换手没有位移。 */
import { resetSidebarOrder } from './sidebar';
import { t } from './i18n';

const escape = (value: string) => value.replace(/[&<>"']/g, (char) =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]!);

/** `order` 是 `appSettings.sidebarOrder`，`catalog` 是 `[键, 名称, 字形]` 的全部入口，`pressed` 是壳的 `navOn`。 */
export function sidebarSkeletonHtml(
  order: readonly string[], catalog: readonly (readonly [string, string, string])[], pressed: (key: string) => boolean,
): string {
  const byKey = new Map(catalog.map((item) => [item[0], item]));
  const buttons = order.map((key) => byKey.get(key)).filter((item) => item !== undefined).map(([key, label, glyph]) => {
    const mark = key === ''
      ? '<img data-sidebar-home-logo="" src="/peach-logo-64.png" srcset="/peach-logo-64.png 64w, /peach-logo-128.png 128w"'
        + ' sizes="24px" width="24" height="24" alt="" decoding="async">'
      : `<svg viewBox="0 0 24 24" aria-hidden="true"><use href="#i-${escape(glyph)}"/></svg>`;
    return `<button type="button" data-nav="${escape(key)}" aria-pressed="${pressed(key)}" aria-label="${escape(label)}">`
      + `${mark}<span>${escape(label)}</span></button>`;
  });
  const reset = order.join(',') === resetSidebarOrder(order).join(',') ? ''
    : `<button type="button" disabled data-navigation-menu="" aria-label="${escape(t('shell:navigationOrder.menuLabel', { group: t('navigation:navigationGroups.sidebar') }))}" aria-haspopup="dialog" aria-expanded="false"><svg viewBox="0 0 24 24" aria-hidden="true"><use href="#i-ellipsis"/></svg></button>`;
  return `<div data-sidebar-head=""></div><div data-sidebar-nav="">${buttons.join('')}${reset}</div>`;
}
