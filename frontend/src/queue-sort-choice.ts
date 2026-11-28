/* 处理队列页（垃圾文件、高清版、重复文件）浮层上的排序键及实例记住的顺序。页面
 * （`react/components/queue-sort.ts`）与壳铺的骨架（`queue-skeleton.ts`）读同一份，骨架里按下的就是页面
 * 接管后按下的那一枚。不依赖 React。 */
import type { EntitySortKey } from './react/entity-filter/entity-filter';
import { nextSortState, sortDirWord } from './sort-preferences';
import { t } from './i18n';
import { appSettingsStore } from './appearance/settings';

export type QueuePage = 'junk-files' | 'quality-goals' | 'duplicates';
export type QueueSortKey = 'size' | 'dur' | 'new';
export interface QueueSortChoice { sort: string; dir: string }

/** 各页浮层上的排序键，方向的说法用首页那张词表，所以只放那张表里有的列。 */
export const QUEUE_SORTS: Readonly<Record<QueuePage, readonly (readonly [QueueSortKey, string])[]>> = {
  'junk-files': [['size', t('settings:shared.fileSize')], ['new', t('settings:shared.dateAdded')]],
  'quality-goals': [['size', t('settings:shared.fileSize')], ['dur', t('settings:shared.duration')], ['new', t('settings:shared.dateAdded')]],
  duplicates: [['size', t('settings:shared.fileSize')]],
};

/** 实例记住的那一列；缺省照队列自己的顺序。 */
export function rememberedQueueSort(page: QueuePage): QueueSortChoice | null {
  const value = appSettingsStore().value.queueSort[page];
  return value && QUEUE_SORTS[page].some(([key]) => key === value.sort) ? value : null;
}

export function rememberQueueSort(page: QueuePage, choice: QueueSortChoice): void {
  const store = appSettingsStore();
  store.value.queueSort[page] = choice;
  store.save();
}

/** 回到服务端给的顺序（表格排序下拉里的「默认顺序」）。 */
export function forgetQueueSort(page: QueuePage): void {
  const store = appSettingsStore();
  store.value.queueSort[page] = null;
  store.save();
}

/** 浮层上那几枚键的样子：按下哪一枚、朝哪个方向，读屏名说「点了会怎样」。 */
export function queueSortKeys(page: QueuePage, chosen: QueueSortChoice | null): EntitySortKey[] {
  return QUEUE_SORTS[page].map(([key, label]) => {
    const pressed = chosen?.sort === key;
    const next = nextSortState(key, chosen?.sort || '', chosen?.dir || '');
    return { key, label, pressed, dir: pressed ? (chosen!.dir === 'asc' ? 'asc' : 'desc') : '',
      ariaLabel: next ? t('shell:entitySort.ariaLabel', { label, direction: sortDirWord(next.sort, next.dir) }) : '' };
  });
}
