import { StatusDot } from '@/components/base/badges/status-dot';
import { cx } from '@/utils/cx';
import type { ReactNode } from 'react';
import './connection-status.css';

type ConnectionTone = 'success' | 'warning' | 'progress' | 'neutral' | 'error';

const TEXT: Record<ConnectionTone, string> = {
  success: 'text-green-700 dark:text-green-400',
  warning: 'text-status-yellow-text',
  progress: 'text-notification-information-foreground',
  neutral: 'text-text-secondary',
  error: 'text-text-error-primary',
};

/** 连接状态使用圆点；任务结果和配置状态使用 Chip。`online` 为 `null` 或没给都是「未检测」。 */
export function ConnectionStatus({ online, tone, children }: {
  online?: boolean | null; tone?: ConnectionTone; children?: ReactNode;
}) {
  const color = tone ?? (online === true ? 'success' : online === false ? 'warning' : 'neutral');
  return <span data-mount={online === true ? 'online' : online === false ? 'offline' : 'unknown'}
    data-connection-tone={color}
    className={cx('inline-flex items-center gap-1.5 whitespace-nowrap text-body-2-medium', TEXT[color])}>
    <StatusDot color={color === 'success' ? 'green' : color === 'warning' ? 'yellow' : 'indigo'} />
    {children ?? (online === true ? '在线' : online === false ? '离线' : '未检测')}
  </span>;
}
