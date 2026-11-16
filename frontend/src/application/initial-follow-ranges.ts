/** 首次采集的历史范围；值为提交给设置接口的天数，0 表示不限时间。 */
import { t } from '../i18n';
export const FOLLOW_INITIAL_RANGE_OPTIONS = [
  ['0', t('shell:followRange.anyTime')],
  ['7', t('shell:followRange.last7Days')],
  ['30', t('shell:followRange.last30Days')],
  ['90', t('shell:followRange.last90Days')],
] as const satisfies readonly (readonly [value: string, label: string])[];

export type InitialFollowRange = typeof FOLLOW_INITIAL_RANGE_OPTIONS[number][0];
