/* React Aria 自带的文案（隐藏的关闭键、日期与数字控件）默认跟浏览器语言走；包一层，跟 Peach 的界面语言走（ADR-0156）。
 * 每个 React 根节点的最外层都包它。 */
import type { ReactNode } from 'react';
import { I18nProvider } from 'react-aria-components';
import { interfaceLanguage } from '../i18n';

export function InterfaceLocale({ children }: { children: ReactNode }) {
  return <I18nProvider locale={interfaceLanguage}>{children}</I18nProvider>;
}
