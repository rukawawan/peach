/* 图标大小位置上的确定进度：一枚小环形，按比例画弧（`peach-web-ui`）。
 *
 * 状态行前导、页面顶部更新横幅与扫描采集通知卡的图标位共用这一枚；整行宽的进度用 `./progress` 的 `Progress`，
 * 没有确定百分比时改用 `./activity-motion` 的语义动画。`inline` 是 `--icon-inline`，跟所在那一行的字号走；
 * `lead` 是标题加一行说明的两行图标位（`--icon-lead`），线条按比例收细，与同尺寸的线性图标一样粗。
 * 弧长随数值平滑过渡，减少动效时全局规则关掉过渡。用 SVG 属性画，不写内联样式；颜色与 `Progress` 一致：
 * 轨道是文字色的浅一层，填充是强调色。 */
import { cx } from '@/utils/cx';

const SIZES = {
  inline: { className: 'size-(--icon-inline)', stroke: 2 },
  lead: { className: 'size-(--icon-lead)', stroke: 1.5 },
} as const;

export function ProgressRing({ label, value, max = 100, size = 'inline' }:
  { label: string; value: number; max?: number; size?: keyof typeof SIZES }) {
  const total = max > 0 ? max : 1;
  const done = Math.min(Math.max(Number.isFinite(value) ? value : 0, 0), total);
  const share = (done / total) * 100;
  const { className, stroke } = SIZES[size];
  const radius = 8 - stroke / 2 - 0.5;
  return (
    <svg role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={total} aria-valuenow={done}
      viewBox="0 0 16 16" data-size={size} className={cx(className, 'shrink-0 -rotate-90')}>
      <circle cx="8" cy="8" r={radius} pathLength={100} strokeWidth={stroke} className="fill-none stroke-text-primary/15" />
      <circle cx="8" cy="8" r={radius} pathLength={100} strokeWidth={stroke} strokeLinecap="round"
        strokeDasharray={`${share} ${100 - share}`}
        className="fill-none stroke-border-focus-ring transition-all duration-300" />
    </svg>
  );
}
