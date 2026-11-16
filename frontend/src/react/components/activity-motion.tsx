/* 后台推进的等待：按做的是哪一类事画 loading.dev 的语义动画（`peach-web-ui`）。
 *
 * 画法与遗留层共用 `../../ui-kit/activity-motion.ts` 那一份 HTML，这里用 `dangerouslySetInnerHTML` 插进来，
 * 和 Spinner 的做法一样；类别查 `../../activity-kinds.ts`。用户刚点下的那一下用按钮里的 Spinner，
 * 有真实分母用 `./progress` 的横条或 `./progress-ring` 的小环形。动画已经在动，`label` 不带省略号。 */
import { cx } from '@/utils/cx';
import { activityMotionHtml, type ActivityKind, type ActivitySize } from '../../ui-kit/activity-motion';

export type { ActivityKind } from '../../ui-kit/activity-motion';

/** 只有动画：放在已有状态文字行里当前导图标（页面顶部的更新横幅、通知卡），文字与读屏状态由那一行给。 */
export function ActivityMotion({ kind, size = 'inline', still = false }: { kind: ActivityKind; size?: ActivitySize; still?: boolean }) {
  return <span className="contents" dangerouslySetInnerHTML={{ __html: activityMotionHtml(kind, { size, still }) }} />;
}

/** 动画加一句状态。`block` 是面板正中的等待：动画大一档，摆在文字上方。 */
export function ActivityStatus({ kind, label, size = 'inline' }: { kind: ActivityKind; label: string; size?: 'inline' | 'block' }) {
  return (
    <p role="status" data-activity-status={size} className={cx('flex min-w-0 text-caption-1-regular text-text-secondary',
      size === 'block' ? 'flex-col items-center gap-2 py-4 text-center' : 'items-center gap-2')}>
      <ActivityMotion kind={kind} size={size} />
      <span className="min-w-0 wrap-anywhere">{label}</span>
    </p>
  );
}
