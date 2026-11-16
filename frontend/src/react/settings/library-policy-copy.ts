/* 处理方式与媒体库分组的说明。设置页与它的首屏骨架用同一份文字，骨架里的折行和真实页面一致。 */
import { t } from '../../i18n';

/** 分组上方常显的一句：三档处理方式差在哪，细节收在对比表里。 */
export const POLICY_SUMMARY = t('settings:libraryPolicy.summary');

/** 三档对比表：每行一个步骤，三列依次是自动补全、仅使用本地资料、自定义。 */
export const POLICY_COLUMNS = [t('settings:libraryPolicy.auto'), t('settings:libraryPolicy.localOnly'), t('settings:shared.custom')] as const;
export const POLICY_MATRIX: readonly (readonly [step: string, auto: string, local: string, custom: string])[] = [
  [t('settings:libraryPolicy.stepReadLocal'), '✓', '✓', '✓'],
  [t('settings:libraryPolicy.stepProbeAndSheet'), '✓', '✓', t('settings:shared.optional')],
  [t('settings:libraryPolicy.stepMetadata'), '✓', '—', t('settings:shared.optional')],
  [t('settings:libraryPolicy.stepCovers'), '✓', '—', t('settings:shared.optional')],
  [t('settings:libraryPolicy.stepAvatars'), '✓', '—', t('settings:shared.optional')],
];
export const POLICY_COVER_NOTE = t('settings:libraryPolicy.coverNote');

/** 两颗添加键下面的一句：文件夹归媒体库，什么时候该加文件夹、什么时候该加媒体库。 */
export const LIBRARY_FOLDER_HELP = t('settings:libraryPolicy.directoryHelp');
