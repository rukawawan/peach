/** 原生滚动沿用浏览器的时长与曲线，减少动态效果时直接定位。 */
export const routeScrollBehavior = (): ScrollBehavior =>
  window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth';

/** 页面内容与字体就绪后，在布局帧里定位；导航已变化时不再滚动。 */
export async function scrollToAnchor(hash: string, isCurrent: () => boolean): Promise<void> {
  let id: string;
  try { id = decodeURIComponent(hash.slice(1)) } catch { return }
  if (!id) return;
  const pending = () => document.getElementById(id)?.querySelector('[data-content-transition][data-pending]');
  if (isCurrent() && pending()) {
    await new Promise<void>(resolve => {
      const observer = new MutationObserver(() => {
        if (!isCurrent() || !pending()) { observer.disconnect(); resolve() }
      });
      observer.observe(document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ['data-pending'] });
    });
  }
  await document.fonts?.ready;
  await new Promise<void>(resolve => { requestAnimationFrame(() => { requestAnimationFrame(() => resolve()) }) });
  if (!isCurrent()) return;
  const target = document.getElementById(id);
  if (target?.getClientRects().length) target.scrollIntoView({ block: 'start', behavior: routeScrollBehavior() });
}
