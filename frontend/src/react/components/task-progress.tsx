import { useState, type ReactNode } from 'react';
import { cx } from '@/utils/cx';
import { ActivityStatus, type ActivityKind } from './activity-motion';
import { Progress } from './progress';

/** 后台任务的进度提示，全站一套结构：有总量画横条、下面一行说明；没有总量画 `kind` 那一枚语义动画加说明
 *  （`kind` 查 `../../activity-kinds.ts`）；失败由调用处在同一位置换成 `Note`。
 *  独立任务带框，框与中性提示条（`Note`）同一底色与圆角，内边距放宽一档，和它们排在一起时是同一种条；
 *  卡片或结果分区内的任务复用所在容器。 */
export function TaskProgress({ kind, label, labelContent = label, value = 0, total, embedded = false }: {
  kind: ActivityKind; label: string; labelContent?: ReactNode; value?: number; total?: number | null; embedded?: boolean;
}) {
  return (
    <div data-task-progress={embedded ? 'embedded' : 'framed'} className={cx('flex flex-col gap-1.5',
      !embedded && 'gap-2 rounded-2lg bg-background-tertiary-default px-4 py-3 text-text-secondary')}>
      {total && total > 0 ? <>
        <Progress label={label} value={value} max={total} tinted={!embedded} smooth />
        <p className="text-caption-1-regular text-text-secondary wrap-anywhere">{labelContent}</p>
      </> : <ActivityStatus kind={kind} label={labelContent} />}
    </div>
  );
}

/** 阶段变化淡入一次，阶段内每次更新的文案直接显示。 */
export function TaskStage({ phase, children }: { phase: string; children: ReactNode }) {
  const [state, setState] = useState({ phase, changed: false });
  if (state.phase !== phase) setState({ phase, changed: true });
  return <span key={phase} className={state.changed ? 'task-stage-change' : undefined}>{children}</span>;
}
