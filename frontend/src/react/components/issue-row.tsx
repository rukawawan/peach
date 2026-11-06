/* 问题清单里的一条：标题一层（13px 中等字重，能打开的就是作品链接），下面是原因与路径等说明。
 * 数据管理的问题清单与任务卡的问题详情共用这一种分层。条间线画在每条自己身上，不用 `divide-y`：
 * 那一族的选择器裹在 `:where()` 里没有特异性，压不过岛内 `@scope` 末尾那条把所有元素边框清零的
 * preflight，线会静默消失。线用 `currentColor` 混色，放进黄色提示或灰色明细框里都跟着所在的字色走。 */
import type { ReactNode } from 'react';
import { NameLink } from './name-link';

export function IssueRow({ title, href, children }: { title: ReactNode; href?: string; children?: ReactNode }) {
  return <li className="flex min-w-0 flex-col gap-1 border-b border-current/15 py-2 pr-6 wrap-anywhere first:pt-0 last:border-b-0 last:pb-0">
    {href ? <NameLink href={href}>{title}</NameLink> : <span className="text-body-2-medium">{title}</span>}
    {children}
  </li>;
}
