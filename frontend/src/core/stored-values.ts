/* 账本里的取值是英文 id，界面按语言显示（ADR-0162）。旧版本存的是中文，旧书签与历史地址里的
   `orient=竖屏`、`len=短` 读入时先换成 id，生成的新链接只写 id。 */
import { t } from '../i18n';

/** 画幅 `ctx_orient` 与地址参数 `orient` 的取值。 */
export const PORTRAIT = 'portrait';
export const LANDSCAPE = 'landscape';

const LEGACY_ORIENTATIONS: Record<string, string> = {
  // i18n-exempt: 旧版地址参数与账本取值，读入时换成 id
  竖屏: PORTRAIT, 横屏: LANDSCAPE,
};
const LEGACY_LENGTH_BANDS: Record<string, string> = {
  // i18n-exempt: 旧版地址参数与账本取值，读入时换成 id
  速食: 'quick', 短: 'short', 中: 'medium', 长: 'long',
};

/** 地址里的画幅参数：旧版中文换成 id，其余原样。 */
export const orientParam = (value: string | null | undefined): string =>
  LEGACY_ORIENTATIONS[value ?? ''] ?? (value ?? '');

/** 地址里的时长档参数：旧版中文换成 id，其余原样。 */
export const lengthParam = (value: string | null | undefined): string =>
  LEGACY_LENGTH_BANDS[value ?? ''] ?? (value ?? '');

/** 画幅的显示名；认不出的原样显示。 */
export const orientLabel = (value: string | null | undefined): string => {
  const id = orientParam(value);
  if (id === PORTRAIT) return t('shell:orientation.portrait');
  if (id === LANDSCAPE) return t('shell:orientation.landscape');
  return id;
};

/** 链接名：通用链接名是 id，按语言显示；平台名、公司名这类专名原样。 */
export const linkLabel = (label: string | null | undefined): string => {
  if (label === 'official-site') return t('shell:sourceLink.officialSite');
  if (label === 'blog') return t('shell:sourceLink.blog');
  return label ?? '';
};
