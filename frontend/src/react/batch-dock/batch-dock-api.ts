/* 批量条（常驻组件 `batch-dock`，`batch-dock-island.tsx`）对壳的契约，以及每种语境下列哪几颗键。
 *
 * 多选的状态归共享 shell store 与 application/selection.js：开关、选中集、Shift 连选与切页退出只有一份。壳每次重画
 * 选中态时把计数与语境推进来；这一面只负责画底部那块浮条（共用的 `SelectionDock`）。点下去回到壳的
 * `run`：确认弹层、写接口、回执与撤销是壳里按分组分派的那几条流程，忙态挂在传回去的那颗键上。 */
import { t } from '../../i18n';

/** 目录（含资料页与标签页）、回收站、垃圾文件、关注页。 */
export type BatchContext = 'catalog' | 'trash' | 'junk' | 'follow';

/** 一颗键回到壳的哪条流程：`batch` 走 `/api/batch`，`region` 是判定产地的弹层，`follow` 写关注条目，
 *  `junk` 是垃圾文件的判定，`clear` 退出多选。 */
export type BatchGroup = 'batch' | 'region' | 'follow' | 'junk' | 'clear';

export interface BatchAction {
  group: BatchGroup;
  operation: string;
  label: string;
  glyph: string;
  danger?: boolean;
}

export interface BatchDockProps {
  /** 选中了几项；0 时浮条收起。 */
  count: number;
  context: BatchContext;
  /** 垃圾文件页此刻看的是「已排除」那一份：那里给「重新判断」，待判断那一份给「不是垃圾」。 */
  junkDismissed: boolean;
}

export interface BatchDockHost {
  /** 这一面画进去的那一层（`[data-batch-dock]`，本身 `display: contents`），也就是常驻组件的宿主。 */
  root: HTMLElement;
  run(group: BatchGroup, operation: string, button: HTMLButtonElement): void;
}

export interface BatchDockApi {
  render(props: BatchDockProps): void;
}

const CLEAR: BatchAction = { group: 'clear', operation: 'clear', label: t('manage:batchDock.clearSelection'), glyph: 'x' };

/** 这一语境下浮条上的键，按从左到右的顺序。「取消」总在最后。 */
export function batchActions(context: BatchContext, junkDismissed = false): BatchAction[] {
  switch (context) {
    case 'trash':
      return [
        { group: 'batch', operation: 'restore', label: t('manage:shared.restore'), glyph: 'rotate-ccw' },
        { group: 'batch', operation: 'delete', label: t('manage:batchDock.deletePermanently'), glyph: 'trash', danger: true },
        CLEAR,
      ];
    case 'junk':
      return [
        junkDismissed
          ? { group: 'junk', operation: 'reconsider-junk', label: t('manage:batchDock.recheck'), glyph: 'rotate-ccw' }
          : { group: 'junk', operation: 'dismiss-junk', label: t('manage:batchDock.notJunk'), glyph: 'check' },
        { group: 'junk', operation: 'dispose', label: t('manage:shared.moveToTrash'), glyph: 'trash', danger: true },
        CLEAR,
      ];
    case 'follow':
      return [
        { group: 'follow', operation: 'save', label: t('manage:batchDock.saveToDatabase'), glyph: 'bookmark-plus' },
        { group: 'follow', operation: 'seen', label: t('manage:batchDock.markWatched'), glyph: 'eye' },
        { group: 'follow', operation: 'ignored', label: t('manage:shared.ignore'), glyph: 'eye-off' },
        CLEAR,
      ];
    default:
      return [
        { group: 'batch', operation: 'like', label: t('manage:shared.like'), glyph: 'thumbs-up' },
        { group: 'batch', operation: 'seen', label: t('manage:batchDock.seen'), glyph: 'eye' },
        { group: 'batch', operation: 'later', label: t('manage:shared.watchLater'), glyph: 'bookmark-plus' },
        { group: 'region', operation: 'region', label: t('manage:batchDock.setRegion'), glyph: 'globe' },
        { group: 'batch', operation: 'dispose', label: t('manage:shared.moveToTrash'), glyph: 'trash', danger: true },
        CLEAR,
      ];
  }
}
