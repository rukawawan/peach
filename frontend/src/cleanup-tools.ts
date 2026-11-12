/** 数据管理的维护工具；首页入口、二级页和面包屑共用名称与地址。 */
import { CLEANUP_TOOL_PATHS } from './cleanup-routes';
import { t } from './i18n';

export { CLEANUP_HASH_REDIRECTS, type CleanupToolKey, type CleanupToolPath } from './cleanup-routes';
export const CLEANUP_TOOLS = [
  { key: 'organize', path: CLEANUP_TOOL_PATHS.organize, title: t('cleanup:tools.organize'), icon: 'folder-cog',
    description: t('cleanup:tools.organizeDescription') },
  { key: 'resource-sync', path: CLEANUP_TOOL_PATHS['resource-sync'], title: t('cleanup:tools.resourceSync'), icon: 'git-compare',
    description: t('cleanup:tools.resourceSyncDescription') },
  { key: 'orphan-records', path: CLEANUP_TOOL_PATHS['orphan-records'], title: t('cleanup:tools.orphanRecords'), icon: 'file-stack',
    description: t('cleanup:tools.orphanRecordsDescription') },
  { key: 'media-repair', path: CLEANUP_TOOL_PATHS['media-repair'], title: t('cleanup:tools.mediaRepair'), icon: 'wrench',
    description: t('cleanup:tools.mediaRepairDescription') },
  { key: 'links', path: CLEANUP_TOOL_PATHS.links, title: t('cleanup:tools.links'), icon: 'link',
    description: t('cleanup:tools.linksDescription') },
  { key: 'western-scrape', path: CLEANUP_TOOL_PATHS['western-scrape'], title: '欧美资料刮削', icon: 'globe',
    description: '用 ThePornDB 为欧美作品补标题、厂牌、演员、标签和封面。' },
  { key: 'jasna', path: CLEANUP_TOOL_PATHS.jasna, title: 'Jasna 去码', icon: 'sparkles',
    description: '设置本机 Jasna，在影片详情页一键去码，成品放回原文件夹。' },
  { key: 'ai-subtitles', path: CLEANUP_TOOL_PATHS['ai-subtitles'], title: 'AI 字幕', icon: 'file-stack',
    description: '本机听写日语，用 DeepSeek 翻成中文字幕，放在影片旁边。' },
  { key: 'folder-performers', path: CLEANUP_TOOL_PATHS['folder-performers'], title: '按文件夹归艺人', icon: 'user-round',
    description: '已经按艺人分好的文件夹，把里面的视频都记到这位艺人名下。' },
  { key: 'short-ads', path: CLEANUP_TOOL_PATHS['short-ads'], title: '短视频广告', icon: 'trash',
    description: '设定多短的视频算广告，新入库的自动移入回收站，可还原。' },
  { key: 'batch-delete', path: CLEANUP_TOOL_PATHS['batch-delete'], title: t('cleanup:tools.bulkDelete'), icon: 'trash',
    description: t('cleanup:tools.bulkDeleteDescription') },
] as const;

export type CleanupTool = typeof CLEANUP_TOOLS[number];

export const CLEANUP_CRUMB_PAGES = Object.fromEntries(CLEANUP_TOOLS.map(tool => [tool.path, tool.title]));
