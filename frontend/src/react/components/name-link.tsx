/* 列表里指向作品的文件名或标题：沿用所在文字的颜色，中等字重，悬停才出下划线。
 * 名称是内容而不是操作，所以不用蓝色的 LinkButton；数据管理的问题清单和任务卡共用这一种写法。 */
import type { AnchorHTMLAttributes } from 'react';
import { cx } from '@/utils/cx';

export function NameLink({ className, ...props }: AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) {
  return <a {...props} className={cx('text-body-2-medium underline-offset-4 hover:underline', className)} />;
}
