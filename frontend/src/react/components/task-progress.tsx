import { cx } from '@/utils/cx';
import { LoadingDots } from './loading-dots';
import { Progress } from './progress';

/** 独立任务带框，框与中性提示条（`Note`）同一底色与圆角，内边距放宽一档，和它们排在一起时是同一种条；
 *  卡片或结果分区内的任务复用所在容器。 */
export function TaskProgress({ label, value = 0, total, embedded = false }: {
  label: string; value?: number; total?: number | null; embedded?: boolean;
}) {
  return (
    <div data-task-progress={embedded ? 'embedded' : 'framed'} className={cx('flex flex-col gap-1.5',
      !embedded && 'gap-2 rounded-2lg bg-background-tertiary-default px-4 py-3 text-text-secondary')}>
      {total && total > 0 ? <>
        <Progress label={label} value={value} max={total} tinted={!embedded} />
        <p className="text-caption-1-regular text-text-secondary wrap-anywhere">{label}</p>
      </> : <LoadingDots label={label} />}
    </div>
  );
}
