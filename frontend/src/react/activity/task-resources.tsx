/* 每轮任务的实测读数。高占用仅改变 Chip 强调程度，不调整任务资源使用。 */
import { fmtSize } from '@peach/legacy/core';
import { ResourceChip } from './resource-chip';

import { isActive, type TaskResourceMetric, type TaskRunPayload } from './tasks';

const METRICS = {
  cpu: {
    name: 'CPU', color: 'blue',
    description: 'CPU 使用率以执行端可用容量为 100%，容器按可见 CPU 配额计算。达到 50% 时加深显示。',
  },
  gpu: {
    name: 'GPU', color: 'purple',
    description: 'GPU 使用率显示该任务最忙的 GPU 引擎。达到 50% 时加深显示。',
  },
  network: {
    name: '网络', color: 'cyan',
    description: '网络速率显示该任务已观测的下载速度，达到 10 MiB/s 时加深显示。从网盘挂载读取时显示网盘读取，SMB 或无法准确归属的传输显示未取得。',
  },
} as const;

function unavailable(metric: TaskResourceMetric) {
  if (metric.state === 'sampling') return '采样中';
  return metric.via === 'cloud' ? '网盘读取' : '未取得';
}

/* 读数为 0 说的是这一轮没占用这项资源，直接写「未使用」，不让人去读一个 0。 */
function reading(key: 'cpu' | 'gpu' | 'network', value: number) {
  if (value === 0) return '未使用';
  return key === 'network' ? `${fmtSize(value)}/s` : `${value.toLocaleString(undefined, { maximumFractionDigits: 1 })}%`;
}

export function TaskResources({ run, active = isActive(run) || Boolean(run.control) }: {
  run: TaskRunPayload; active?: boolean;
}) {
  if (!active || !run.resources) return null;
  const resources = run.resources;
  return <div data-task-resources={run.id} className="flex min-w-0 flex-wrap items-center gap-2">
    {(['cpu', 'gpu', 'network'] as const).map((key) => {
      const metric = resources[key];
      const appearance = METRICS[key];
      const value = key === 'network' ? resources.network.bytes_per_second : resources[key].percent;
      const ready = metric.state === 'ready' && value !== null;
      const high = ready && metric.high;
      const label = ready ? reading(key, value) : unavailable(metric);
      const explanation = [metric.reason, high ? '当前为高占用。' : '', appearance.description, resources.detail]
        .filter(Boolean).join('\n');
      return <ResourceChip key={key} color={appearance.color} high={high}
        tabIndex={0} title={explanation}
        data-task-resource={key} data-resource-state={metric.state} data-resource-via={metric.via} data-resource-high={high || undefined}
        data-resource-idle={ready && value === 0 || undefined} data-copy-ignore=""
        data-tooltip-copy-key={!metric.reason && !resources.detail && !high ? `tasks.resources.${key}.description` : undefined}>
        {appearance.name} {label}
      </ResourceChip>;
    })}
  </div>;
}
