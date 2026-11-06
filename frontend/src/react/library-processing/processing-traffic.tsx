import { fmtSize } from '@peach/legacy/core';
import { useId, useState } from 'react';
import { RiArrowDownSLine, RiArrowUpSLine, RiGlobalLine, RiHardDrive3Line } from '@remixicon/react';
import { Button } from '@/components/base/buttons/button';
import type { ProcessingTraffic } from './library-processing';
import { cx } from '@/utils/cx';
import { CollapseRegion } from '../components/collapse-region';
import { useOverlayScrollbar } from '../components/overlay-scrollbar';
import { SourceLabel } from '../components/source-label';
import { SourceMark } from '../settings/section';

const size = (value: number) => fmtSize(value).replace(/\s/g, '');
const averageSize = (value: number) => value >= 1024 ** 2 && value < 1024 ** 3
  ? `${Number((value / 1024 ** 2).toFixed(1))}MB` : size(value);
const range = (low: number, high: number) => {
  if (low === high) return size(high);
  const [start, startUnit] = fmtSize(low).split(' ');
  const [end, endUnit] = fmtSize(high).split(' ');
  return startUnit === endUnit ? `${start}-${end}${endUnit}` : `${size(low)}-${size(high)}`;
};
const forecast = (expected: number | undefined, low: number, high: number) => expected === undefined
  ? range(low, high) : `${expected > 0 ? '约 ' : ''}${size(expected)}`;

/** 确认弹窗、任务卡和管理页共用逐目录分账。`compact` 时只留文件计数与完整性提示，
 *  流量、占用与逐目录明细随任务卡一起收起。 */
export function TrafficProgress({ traffic, initial = false, compact = false, detailsOpen, onDetailsChange }: {
  traffic?: ProcessingTraffic; initial?: boolean; compact?: boolean; detailsOpen?: boolean; onDetailsChange?(open: boolean): void;
}) {
  const list = useOverlayScrollbar<HTMLUListElement>();
  const [expanded, setExpanded] = useState(false);
  const detailsId = useId();
  const open = detailsOpen ?? expanded;
  if (!traffic) return null;
  const count = (value: number) => value.toLocaleString('zh-CN');
  const counted = !!traffic.workload || !!(traffic.inventory && !traffic.inventory.complete)
    || !!(traffic.unknown_files && traffic.inventory?.complete !== false) || !!traffic.inventory?.errors;
  /* 计数与预估之间的间距放进折叠区里层：写成外层的 gap，收起过渡走完那一刻会再跳一下。 */
  return <div data-processing-traffic="" className="flex min-w-0 flex-col text-caption-1-regular text-text-secondary tabular-nums wrap-anywhere">
    <div className="flex min-w-0 flex-col gap-2 empty:hidden">
    {traffic.workload ? <p className="flex flex-wrap gap-x-3 gap-y-1">
      <span>{traffic.unknown_files ? '已发现视频' : '范围内视频'} {count(traffic.workload.video_files)} 个</span>
      <span>JAV 文件 {count(traffic.workload.jav_files)} 个 · 不同番号 {count(traffic.workload.jav_titles)} 个</span>
    </p> : null}
    {traffic.inventory && !traffic.inventory.complete ? <p role="status">正在发现新增文件，数量和预估仍会变化…</p> : null}
    {traffic.unknown_files && traffic.inventory?.complete !== false ? <p role="status">尚有文件未确认，当前数量和预估不完整</p> : null}
    {traffic.inventory?.errors ? <p role="status">部分目录无法读取，数量和预估不完整</p> : null}
    </div>
    <CollapseRegion open={!compact} data-processing-estimate=""><div className={cx('flex min-w-0 flex-col gap-2', counted && 'pt-2')}>
    <div className="inline-grid grid-cols-2 gap-6 py-2">
      <section aria-label="流量预估" className="flex min-w-0 flex-col gap-1">
        <p className="inline-flex items-center gap-1.5"><RiGlobalLine aria-hidden className="size-(--icon-inline) shrink-0" />
          {traffic.inventory && !traffic.inventory.complete ? '已识别流量' : '预计流量'}</p>
        <p className="text-title-3-semibold text-text-primary">{forecast(traffic.estimated_bytes, traffic.estimated_min_bytes, traffic.estimated_max_bytes)}</p>
        <p>{traffic.unknown_route_estimated_bytes ? '已确认代理' : '代理'} {forecast(traffic.metered_estimated_bytes, traffic.metered_estimated_min_bytes, traffic.metered_estimated_max_bytes)}</p>
        {!initial ? <p>已用 <span>{traffic.partial ? '约 ' : ''}{size(traffic.used_bytes)}</span> · 代理 {size(traffic.metered_used_bytes)}</p> : null}
      </section>
      {traffic.disk ? <section aria-label="磁盘预估" className="flex min-w-0 flex-col gap-1">
        <p className="inline-flex items-center gap-1.5"><RiHardDrive3Line aria-hidden className="size-(--icon-inline) shrink-0" />
          {traffic.inventory && !traffic.inventory.complete ? '已识别占用' : '预计占用'}</p>
        <p className="text-title-3-semibold text-text-primary">约 {size(traffic.disk.estimated_bytes)}</p>
        {traffic.disk.temporary_bytes > 0 ? <p>抽帧临时文件约 {averageSize(traffic.disk.temporary_bytes)}</p> : null}
        {traffic.disk.volumes.map(volume => <div key={volume.path} className="flex min-w-0 flex-col gap-1">
          <p>{volume.path} 剩余 {volume.free_bytes == null ? '未取得' : size(volume.free_bytes)}</p>
          {volume.can_fit === false ? <p role="status">空间不足，还差 {size(volume.shortfall_bytes || 0)}</p> : null}
        </div>)}
        {traffic.disk.cache_unknown ? <p role="status">网盘缓存占用待确认</p> : null}
      </section> : null}
    </div>
    <Button variant="secondary" size="small" className="self-start" aria-expanded={open} aria-controls={detailsId}
      trailingIcon={open ? RiArrowUpSLine : RiArrowDownSLine} onClick={() => {
        setExpanded(!open);
        onDetailsChange?.(!open);
      }}>{open ? '收起明细' : '查看明细'}</Button>
    <div id={detailsId} hidden={!open}>
      <div className="relative min-w-0">
      <ul ref={initial ? undefined : list} className={`flex flex-col pr-2${initial ? '' : ' max-h-48 overflow-y-auto overscroll-contain'}`}>
        {traffic.sources.map(source => <li key={source.key} className="flex min-w-0 flex-col gap-1 border-b border-separator-border py-2 last:border-b-0">
          <div className="flex min-w-0 items-start justify-between gap-2">
            {source.root ? <SourceLabel source={source.location} label={source.label} />
              : <span className="inline-flex min-w-0 items-center gap-1.5"><SourceMark mark="globe" />{source.label}</span>}
            <span className="shrink-0">{source.connection === 'system' ? '跟随系统' : source.connection === 'unknown' ? '连接待确认' : source.metered ? '代理' : '直连'}</span>
          </div>
          {source.workload?.video_files ? <p className="text-text-tertiary">视频 {count(source.workload.video_files)} 个 · JAV {count(source.workload.jav_files)} 个</p> : null}
          {source.workload?.pending_jav_titles ? <p className="text-text-tertiary">待补资料 {count(source.workload.pending_jav_titles)} 部 · 平均约 {averageSize(source.workload.metadata_average_bytes || 0)}/部</p> : null}
          <div className="flex flex-wrap justify-between gap-x-4 text-text-tertiary">
            {!initial ? <span>已用{source.unobserved.length ? '约' : ''} {size(source.used_bytes)}</span> : null}
            <span>预计 {forecast(source.estimated_bytes, source.estimated_min_bytes, source.estimated_max_bytes)}</span>
          </div>
        </li>)}
      </ul>
      </div>
    </div>
    </div></CollapseRegion>
  </div>;
}
