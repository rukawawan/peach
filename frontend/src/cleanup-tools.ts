/** 数据管理的维护工具；首页入口、二级页和面包屑共用名称与地址。 */
export const CLEANUP_TOOLS = [
  { key: 'organize', path: '/data-cleanup/organize', title: '整理文件', icon: 'folder-cog',
    description: '清理文件名，按模板改名和归档；先预览，执行后可整批退回。' },
  { key: 'resource-sync', path: '/data-cleanup/resource-sync', title: '资源同步', icon: 'git-compare',
    description: '核对文件与馆藏记录，检查失效条目、空文件夹和缓存。' },
  { key: 'orphan-records', path: '/data-cleanup/orphan-records', title: '文件已丢失的记录', icon: 'file-stack',
    description: '为丢失的文件选择替代版本，转移或清理保留的个人记录。' },
  { key: 'media-repair', path: '/data-cleanup/media-repair', title: '媒体修复', icon: 'wrench',
    description: '处理播放卡顿或打不开的视频，修复时间戳表和索引。' },
  { key: 'links', path: '/data-cleanup/links', title: '链接管理', icon: 'link',
    description: '检查官网、社交账号和资料站链接，复核并清理失效地址。' },
  { key: 'western-scrape', path: '/data-cleanup/western-scrape', title: '欧美资料刮削', icon: 'globe',
    description: '用 ThePornDB 为欧美作品补标题、厂牌、演员、标签和封面。' },
  { key: 'jasna', path: '/data-cleanup/jasna', title: 'Jasna 去码', icon: 'sparkles',
    description: '设置本机 Jasna，在影片详情页一键去码，成品放回原文件夹。' },
  { key: 'batch-delete', path: '/data-cleanup/batch-delete', title: '批量删除', icon: 'trash',
    description: '按女优勾选并永久删除关联影片，执行前确认范围与影响。' },
] as const;

export type CleanupTool = typeof CLEANUP_TOOLS[number];
export type CleanupToolKey = CleanupTool['key'];
export type CleanupToolPath = CleanupTool['path'];

export const CLEANUP_CRUMB_PAGES = Object.fromEntries(CLEANUP_TOOLS.map(tool => [tool.path, tool.title]));

/** 已分享的锚点仍能进入对应工具；扫描与采集继续留在首页。 */
export const CLEANUP_HASH_REDIRECTS: Readonly<Record<string, CleanupToolPath>> = {
  '#organize': '/data-cleanup/organize',
  '#mediaRepair': '/data-cleanup/media-repair',
  '#link-manager': '/data-cleanup/links',
  '#resource-sync': '/data-cleanup/resource-sync',
  '#orphan-records': '/data-cleanup/orphan-records',
  '#batch-delete': '/data-cleanup/batch-delete',
};
