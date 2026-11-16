/** 个人评分保存为 0–100，界面按五颗星显示；0 表示取消评分。 */
import { t } from '../../i18n';
export const RATING_STEP = 20;
export const clampRating = (value: number | null | undefined) => Math.min(Math.max(value || 0, 0), 100);
export const ratingStars = (value: number | null | undefined) => Math.round(clampRating(value) / RATING_STEP);
export const ratingText = (value: number | null | undefined) => {
  const stars = ratingStars(value);
  return stars ? t('shell:rating.stars', { count: stars }) : t('shell:rating.unrated');
};
export const nextRating = (before: number | null | undefined, star: number) =>
  star === ratingStars(before) ? 0 : star * RATING_STEP;
