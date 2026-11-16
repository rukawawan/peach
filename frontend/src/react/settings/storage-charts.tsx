/* 「存储空间」统计结果的两张图：数据目录里各类各占多少，以及 Peach 在整块磁盘里占多少。
 *
 * 两张图回答的是不同的整体，所以分开画、各有各的总数。各类占比用 EvilCharts 的环形图，
 * 中间写总量；磁盘用 EvilCharts 的横向百分比堆叠柱，一根柱子三段：Peach、磁盘上的其他文件、可用。
 * 颜色跟着类别走，不跟着排名走：某一类清理后变小，它的颜色不变。图表色只有九档，
 * 日志、登录状态与「其他」通常最小，图上并进灰色的「其余」，列表里仍逐项列出。
 * 差异登记在 `../evilcharts/ORIGIN.md`。 */
import { fmtSize } from '@peach/legacy/core';

import { EvilBarChart } from '@/registry/charts/recharts-bar-chart';
import { EvilPieChart } from '@/registry/charts/recharts-pie-chart';
import type { ChartConfig } from '@/registry/ui/recharts-chart';

import type { StorageCategory, StorageState } from '../bundle';
import { tone } from '../charts/chart-card';
import { ChartTip, TIP_SWATCH } from '../charts/chart-tip';
import { t } from '../../i18n';

/** 每一类固定一档图表色；不在表里的并进「其余」。 */
const CATEGORY_COLORS: Record<string, string> = {
  database: 'var(--color-chart-1)', backups: 'var(--color-chart-2)', playback: 'var(--color-chart-3)',
  thumbnails: 'var(--color-chart-4)', previews: 'var(--color-chart-5)', downloads: 'var(--color-chart-6)',
  sources: 'var(--color-chart-7)', records: 'var(--color-chart-8)', tools: 'var(--color-chart-9)',
};
const REST_COLOR = 'var(--color-text-tertiary)';

/** 列表里那一格色块的类名，与图上同色。类名写成整串，Tailwind 扫得到。 */
export const CATEGORY_SWATCH: Record<string, string> = {
  database: 'bg-chart-1', backups: 'bg-chart-2', playback: 'bg-chart-3', thumbnails: 'bg-chart-4',
  previews: 'bg-chart-5', downloads: 'bg-chart-6', sources: 'bg-chart-7', records: 'bg-chart-8',
  tools: 'bg-chart-9',
};
export const REST_SWATCH = 'bg-text-tertiary';

const size = (value: number) => fmtSize(value);

/** 图上画的几段：有颜色的类别各一段，其余并成一段。为 0 的不画。 */
export function storageSlices(categories: StorageCategory[]) {
  const named = categories.filter((item) => CATEGORY_COLORS[item.key] && item.bytes > 0)
    .map((item) => ({ key: item.key, label: item.label, bytes: item.bytes, color: CATEGORY_COLORS[item.key]! }));
  const rest = categories.filter((item) => !CATEGORY_COLORS[item.key])
    .reduce((sum, item) => sum + item.bytes, 0);
  return rest > 0 ? [...named, { key: 'rest', label: t('settings:storageCharts.rest'), bytes: rest, color: REST_COLOR }] : named;
}

export function StorageOverview({ storage }: { storage: StorageState }) {
  const usage = storage.usage!;
  const slices = storageSlices(usage.categories);
  const config: ChartConfig = Object.fromEntries(slices.map((slice) =>
    [slice.key, { label: slice.label, colors: tone(slice.color) }]));
  const data = slices.map((slice) => ({ slice: slice.key, value: slice.bytes }));
  return (
    <div className="flex flex-col gap-5 md:flex-row md:items-center">
      {/* 环形图的总量写在圈里：图的容器自带 `flex-1`，在这一行 flex 里换成定宽。 */}
      <div className="relative mx-auto size-48 flex-none" role="img"
        aria-label={t('settings:storageCharts.categoryShare', { size: size(usage.total_bytes) })}>
        <EvilPieChart data={data} dataKey="value" nameKey="slice" config={config}
          className="aspect-square size-48 flex-none">
          <EvilPieChart.Pie innerRadius="68%" outerRadius="100%" paddingAngle={1} cornerRadius={3} />
          <ChartTip nameKey="slice" hideLabel format={size} />
        </EvilPieChart>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <b className="text-title-2-medium tabular-nums text-text-primary">{size(usage.total_bytes)}</b>
          <small className="text-caption-1-regular tabular-nums text-text-secondary">
            {t('settings:storageCharts.fileCount', { count: usage.total_files })}
          </small>
        </div>
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-4">
        <ul className="flex flex-wrap gap-x-4 gap-y-1.5" aria-label={t('settings:storageCharts.legend')}>
          {slices.map((slice) => (
            <li key={slice.key} className="flex items-center gap-1.5 text-caption-1-regular text-text-secondary">
              <i aria-hidden className={`${TIP_SWATCH} ${CATEGORY_SWATCH[slice.key] || REST_SWATCH}`} />
              {slice.label}
              <span className="tabular-nums text-text-primary">{size(slice.bytes)}</span>
            </li>
          ))}
        </ul>
        <DiskBar storage={storage} />
      </div>
    </div>
  );
}

/** 整块磁盘：Peach 占的、别的文件占的、还剩的。读不到磁盘容量时整块不画。 */
function DiskBar({ storage }: { storage: StorageState }) {
  if (storage.total_bytes === null || storage.free_bytes === null || !storage.usage) return null;
  const peach = Math.min(storage.usage.total_bytes, storage.total_bytes);
  const free = storage.free_bytes;
  const others = Math.max(0, storage.total_bytes - free - peach);
  const config = {
    /* 不用任何一类的图表色：这一段是整个数据目录，与上面某一类同色会读成「只有数据库」。 */
    peach: { label: t('settings:storageCharts.peachData'), colors: tone('var(--color-border-focus-ring)') },
    others: { label: t('settings:storageCharts.otherFiles'), colors: tone(REST_COLOR) },
    free: { label: t('settings:storageCharts.free'), colors: tone('var(--color-background-tertiary-default)') },
  } satisfies ChartConfig;
  const share = (part: number) => {
    const percent = (part / storage.total_bytes!) * 100;
    return percent < 0.1 ? t('settings:storageCharts.underTenthPercent') : `${percent.toFixed(percent < 10 ? 1 : 0)}%`;
  };
  return (
    <div className="flex flex-col gap-2">
      <p className="text-caption-1-regular text-text-secondary">
        {t('settings:storageCharts.diskSummary', {
          total: size(storage.total_bytes), systemDrive: storage.system_drive ? t('settings:storageCharts.systemDrive') : '', share: share(peach), free: size(free) })}
      </p>
      <EvilBarChart data={[{ disk: t('settings:libraryIcons.hardDrive'), peach, others, free }]} config={config}
        layout="horizontal" stackType="percent" barRadius={4}
        chartProps={{ margin: { top: 0, right: 0, bottom: 0, left: 0 } }}
        className="aspect-auto h-6 flex-none">
        <EvilBarChart.YAxis dataKey="disk" hide />
        <EvilBarChart.XAxis hide />
        <EvilBarChart.Bar dataKey="peach" />
        <EvilBarChart.Bar dataKey="others" />
        <EvilBarChart.Bar dataKey="free" />
        <ChartTip hideLabel format={size} />
      </EvilBarChart>
    </div>
  );
}
