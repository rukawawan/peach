import { PREFERENCE_SECTIONS, CONFIGURATION_SECTIONS } from '../history/settings-route';
import type { RegisteredRoutePath } from '../history/route-meta';
import { javPath } from '../react/jav/jav-navigation';

/** 沿用应用的路由类型，页面移除或改名会在类型检查中指出教程的旧链接。 */
type GuidePath = RegisteredRoutePath;
export type GuideRoute = GuidePath | `${GuidePath}?${string}` | `${GuidePath}#${string}`;
export interface GuideStep { id: string; title: string; body: string; route?: GuideRoute | undefined; target?: string | undefined; surface?: 'detail' | 'player' | 'subtitles'; scope?: string | undefined; details?: readonly [string, string][] | undefined }
export interface GuideChapter { id: string; title: string; summary: string; kind: 'interface' | 'settings'; steps: GuideStep[] }
const step = (id: string, title: string, body: string, route?: GuideRoute, target?: string, scope?: string): GuideStep => ({ id, title, body, route, target, scope });
const page = (id: string, title: string, body: string, route: GuideRoute, target?: string) => step(id, title, body, route, target);

export const INTERFACE_CHAPTERS: GuideChapter[] = [
  { id: 'basics', kind: 'interface', title: '认识界面', summary: '4 步认识搜索、导航、作品详情和设置。', steps: [
    page('search', '搜索馆藏', '输入作品名、番号、艺人、厂牌或标签。搜索结果来自已经入库的内容。', '/', '#q, #searchBtn'),
    page('navigation', '切换浏览入口', '在侧栏按人物、厂牌和标签浏览。手机上用导航按钮展开侧栏；入口与顺序可以在设置里调整。', '/', '#filterBtn, [data-sidebar-nav]'),
    page('cards', '打开作品详情', '选择作品查看资料、版本和播放入口。首次扫描尚未入库时，可以先继续认识导航。', '/', '[data-media-grid] > [data-id], [data-catalog-row], [data-media-empty]'),
    page('preferences', '调整自己的界面', '侧栏底部的设置包含显示与播放偏好；手机上先展开侧栏。媒体目录、网络和后台服务放在其中的 Peach 配置入口。', '/', '#settingsBtn, #filterBtn'),
  ] },
  { id: 'find-play', kind: 'interface', title: '找到并播放', summary: '搜索、筛选、详情、版本、字幕和播放器。', steps: [
    page('library', '选择媒体库', '导航顶部可以切换全部媒体库或某个媒体库；手机上先展开侧栏。媒体库把不同目录组织成一组。', '/', '#brandHome, #filterBtn'),
    page('search', '按关键词找内容', '输入作品、番号或人物名称，结合筛选与排序定位内容。搜索记录数量可在搜索与推荐中设置。', '/', '#q, #searchBtn'),
    page('filter', '筛选与清除', '多个筛选条件会共同缩小结果。找不到内容时先检查媒体库和筛选条件。', '/', '[data-catalog-frame]'),
    { ...step('detail', '作品详情', '这里显示当前作品的标题和源文件工具。评分、人物和标签在下方；有分卷或版本的作品可从馆藏卡片进入相应队列。', '/', '[data-item-title]'), surface: 'detail' },
    { ...step('player', '播放器控件', '底部控制条提供播放、进度、音量和全屏。右侧齿轮打开播放速度、字幕、画面旋转和清晰度等选项。', '/', '#stage .vjs-control-bar'), surface: 'player' },
    { ...step('subtitles', '字幕与播放选项', '从播放器齿轮菜单进入字幕，可以选择已有字幕、加载本地字幕文件或搜索字幕；播放速度和清晰度也在这个菜单中。', '/', '#stage [data-player-subtitles]'), surface: 'subtitles' },
    { ...step('external', '外部播放器', '在这里选择本地播放器、M3U 播放列表或网络播放地址，再点打开。另一台设备需要能访问当前 Peach 地址。', '/', '#stage [data-local-playback-row]'), surface: 'detail' },
  ] },
  { id: 'save', kind: 'interface', title: '保存喜欢的内容', summary: '评分、标记、播放列表与当前播放队列。', steps: [
    { ...page('marks', '评分', '点击星星给作品评分；下方的喜欢、稍后看和加入播放列表用于保存感兴趣的内容。', '/', '#stage [data-item-rating]'), surface: 'detail' },
    { ...page('mark-actions', '标记与加入列表', '喜欢影响口味推荐，稍后看便于回找；加入播放列表可把作品整理到自己的列表。', '/', '#stage [data-item-feedback]'), surface: 'detail' },
    page('lists', '建立播放列表', '在这里输入名称，创建自己的播放列表。之后从作品详情的加入播放列表按钮添加内容。', '/playlists', '[data-playlist-create]'),
    page('queue', '从列表开始播放', '选择一张播放列表卡片进入队列，查看和调整播放顺序。没有列表时先创建，再加入作品。', '/playlists', '[data-playlist-card]'),
  ] },
  { id: 'entities', kind: 'interface', title: '按人物与主题浏览', summary: '从人物、厂牌和标签继续发现相关馆藏。', steps: [
    page('people', '艺人与创作者', '选择人物卡片进入资料页，查看相关作品、照片与已连接的来源。上方可以切换艺人、卖家与在线人物。', '/performers', '[data-index-body] [data-index-cell], [data-index-body] [data-empty-state]'),
    page('studios', '厂牌', '选择厂牌卡片集中查看作品。资料页中的作品仍会受到当前媒体库范围影响。', '/studios', '[data-index-body] [data-index-cell], [data-index-body] [data-empty-state]'),
    page('tags', '标签与主题', '选择标签继续浏览相关馆藏；本地与在线使用不同的标签词表。', '/tags', '[data-index-body] [data-alpha-tag], [data-index-body] [data-tag-chip], [data-index-body] [data-empty-state]'),
    page('manage-tags', '管理标签', '铅笔按钮打开标签管理，用于整理标签名称和关系；再次点击返回浏览。', '/tags', '[data-tag-mode]'),
  ] },
  { id: 'jav', kind: 'interface', title: 'JAV 与追新', summary: '馆藏、新作、想要清单与高清版。', steps: [
    page('library', 'JAV 馆藏', '按番号、出演者和厂牌查找已入库的作品，可以选择官方封面或预览图。', javPath('library') as GuideRoute, '[data-catalog-frame]'),
    page('new', '发现推荐', '发现页按口味推荐作品。在这里切换馆藏或外部内容，并按标签筛选。', javPath('discover') as GuideRoute, '[data-jav-filter] [data-catalog-views]'),
    page('wants', '查看想要清单', '喜欢的外部作品可以加入想要清单；在这里切换馆藏、发现与想要。', javPath('discover') as GuideRoute, '[aria-label="JAV 分区"]'),
    page('quality', '高清版', '待升级卡片列出当前版本信息和判定原因，可以查看版本或查找资源；没有目标时这里显示空状态。', '/quality-goals', '[data-goal-id], #main [data-empty-state]'),
  ] },
  { id: 'follow', kind: 'interface', title: '关注创作者', summary: '多来源更新、同作品合并和来源状态。', steps: [
    page('feed', '集中看关注更新', '来自不同来源的创作者更新汇集在这里，选择一项更新查看内容；尚未关注来源时，按空状态中的入口添加。', '/follow', '[data-follow-item], [data-follow-empty] [data-empty-state]'),
    page('sources', '管理关注来源', '从列表查看启用状态、采集结果和失败原因；切换到添加区域，添加创作者或订阅来源。', '/subscriptions', '[aria-label="关注管理区域"]'),
    page('credentials', '按需配置凭据', '部分来源需要登录凭据；先确认要启用的来源，再展开对应站点，填写其要求的信息。', '/settings/subscriptions', '[data-guide-target="credentials"]'),
  ] },
  { id: 'viewing', kind: 'interface', title: '专注观看', summary: '播放墙、沉浸模式与详情小窗。', steps: [
    page('wall', '播放墙', '播放墙提供多画面观看入口。结束导览后点击进入，再选择要播放的内容。', '/', '#wallBtn'),
    page('immerse', '沉浸模式', '沉浸模式适合连续观看。点击入口会进入观看流程，请在准备好播放时使用。', '/', '#immerseBtn'),
    page('mini', '离开详情后继续看', '开启小窗播放后，离开详情可以继续观看。自动播放、小窗和快进步长都在浏览与播放设置中。', '/settings/playback', '#miniplayerSetting'),
  ] },
  { id: 'maintenance', kind: 'interface', title: '整理与维护', summary: '扫描、补资料、复核、文件整理与回收站。', steps: [
    page('scan', '扫描与补资料', '在媒体库处理区域选择扫描和资料处理范围。读取策略取决于媒体库配置；导览不会启动任务。', '/data-cleanup', '#libraryProcessing'),
    page('review', '人工复核', '先按分类找到待复核资料，再查看项目的来源和证据后作决定。', '/review', '[aria-labelledby="reviewcategories"]'),
    page('organize', '文件整理', '文件整理先查看预览，确认命名与目标目录再执行。资料整理和真实文件操作有不同的影响范围。', '/data-cleanup', '[data-cleanup-organize]'),
    page('trash', '回收站', '查看已移入回收站的作品，按需要恢复或处理。永久删除前认真核对确认框中的范围。', '/trash', '[data-media-grid] > [data-id], [data-catalog-row], [data-media-empty]'),
    page('tasks', '任务与失败原因', '任务记录显示处理状态；展开记录查看详情与失败原因。还没有任务时，这里会说明哪些操作会留下记录。', '/tasks', '[data-run-id], #main [data-empty-state]'),
  ] },
  { id: 'insights', kind: 'interface', title: '了解自己的馆藏', summary: '统计、口味，以及浏览历史和书签来源。', steps: [
    page('stats', '馆藏统计', '选择统计视图查看馆藏、存储和观看情况，各视图中的入口可继续查看相关作品。', '/stats', '[aria-label="统计视图"]'),
    page('taste', '口味与记录', '在这里切换浏览器记录与 Peach 观看评价，分析各自的口味。', '/taste', '[aria-label="口味分析的数据来源"]'),
    page('import', '取得浏览历史与书签', '读取浏览器记录需要在运行 Peach 的电脑操作；更多方式菜单可以导入历史或书签文件，适合其它设备。', '/taste', '[data-guide-target="history-import"]'),
    page('history', '管理记录来源', '已取得的记录来源集中列在这里，可以停用本机浏览器读取或移除已导入的数据源；导览不会修改这些记录。', '/taste', 'section[aria-label="数据源"]'),
  ] },
  { id: 'external', kind: 'interface', title: '从外部加入内容', summary: '云下载、目录映射与浏览器添加。', steps: [
    page('downloads', '配置下载渠道', '先连接支持的渠道，再指定云端目标目录与本地媒体目录。下载完成后按目录规则入库。', '/settings/downloads', '[data-guide-target="download"]'),
    page('search', '搜索资源', '资源搜索使用配置的索引器。查到结果后还需要你主动选择下载。', '/settings/subscriptions', '[data-guide-target="indexers"]'),
    page('browser', '浏览器添加 JAV', '用户脚本与 Peach 配对后可从浏览器添加作品。专用令牌、默认渠道和开关在下载渠道里管理。', '/settings/downloads', '[data-guide-target="browser"]'),
  ] },
  { id: 'devices', kind: 'interface', title: '手机与其他设备', summary: '访问地址、密码、局域网和公网入口。', steps: [
    page('address', '找到访问地址', '同一局域网的设备使用 Peach 的局域网地址。仅本机访问时，其它设备无法连接。', '/settings/network', '[data-guide-target="port"]'),
    page('password', '访问密码', '能连接到 Peach 的设备按访问密码登录。显示偏好与访问权限是不同的设置。', '/settings/network', '[data-guide-target="access"]'),
    page('tunnel', '需要时启用公网入口', 'Cloudflare 公网入口适合离开局域网后访问，需要按实际部署配置连接信息。', '/settings/network', '[data-guide-target="tunnel"]'),
  ] },
];

const local = '当前浏览器 · 修改后自动保存';
const shared = '跟随馆藏 · 修改后自动保存';
const saved = '运行 Peach 的电脑 · 确认后保存配置';
type Field = [string, string, string, string?, string?];
const fields = (route: keyof typeof PREFERENCE_SECTIONS | keyof typeof CONFIGURATION_SECTIONS, entries: Field[], scope = local): GuideStep[] => entries.map(([id, title, body, target, override]) => step(id, title, body, `/settings/${route}`, target || `[data-guide-target="${id}"]`, override || scope));
export const SETTING_CHAPTERS: GuideChapter[] = [
  { id: 'appearance', kind: 'settings', title: PREFERENCE_SECTIONS.appearance, summary: '主题、光晕与导航入口。', steps: fields('appearance', [
    ['theme', '主题', '选择浅色、深色或跟随系统；适合不同光线下阅读。', '#themeSetting'],
    ['contrast', '增加对比度', '需要更清楚区分文字与背景时开启。', '#glassContrastSetting'],
    ['sounds', '界面音效', '控制界面操作反馈音，按自己的使用环境选择。', '#uiSoundsSetting'],
    ['glow', '侧栏光晕', '控制侧栏背景光晕。开启后，下方显示配色预设和参数；可调整颜色、强度、颗粒、漂移速度、柔化和大小，或恢复默认。玻璃原色只显示适用参数。', '#homeGlowSetting'],
    ['sidebar', '导航入口与顺序', '把常用入口放到侧栏，拖动调整顺序。', '[data-sidebar-setting]', shared],
  ]) },
  { id: 'playback', kind: 'settings', title: PREFERENCE_SECTIONS.playback, summary: '列表呈现、悬停预览与播放行为。', steps: fields('playback', [
    ['batch', '每批作品', '决定列表一次加载多少项。列表较慢时可调小。', '#batchSizeSetting'],
    ['sort', '默认排序与方向', '决定进入列表时先看什么；随机排序不区分升降序。', '[data-setting-sort-controls]'],
    ['size', '视频卡片大小', '大图便于看封面，密集显示便于一次浏览更多作品。', '#javSizeSetting'],
    ['versions', '合并分卷与版本', '将同一作品的分卷和版本集中显示；播放时在详情选择。', '#groupCollapseSetting'],
    ['hover', '悬停预览延迟', '鼠标停留多久后开始预览，单位为秒。容易误触时增加延迟。', '#hoverDelaySetting'],
    ['autoplay', '打开详情自动播放', '决定打开作品详情时是否直接播放。需要安静浏览时关闭。', '#detailAutoplaySetting'],
    ['miniplayer', '离开详情后小窗播放', '离开详情时用小窗继续观看；需要专注浏览时关闭。', '#miniplayerSetting'],
    ['seek', '快进 / 快退', '设置每次跳转的秒数，按自己的观看习惯调整。', '#seekSecondsSetting'],
  ]) },
  { id: 'jav-settings', kind: 'settings', title: PREFERENCE_SECTIONS.jav, summary: '封面与新作筛选。', steps: fields('jav', [
    ['names', '女优名称', '选择中文或日文名称；偏好跟随馆藏，其他设备读取同一份设置。', '#performerNameLanguageSetting', shared],
    ['image', '默认图片', '选择官方封面或预览图作为卡片的默认图像。', '#javImageSetting'],
    ['limit', '新作显示数量', '控制新作区域一次展示的数量。', '#feedLimitSetting'],
    ['scroll', '自动滚动', '控制新作区域是否自动滚动。', '#feedAutoScrollSetting'],
    ['compilations', '隐藏大合集', '过滤新作中的大合集，只影响新作展示，馆藏仍可查找。', '#feedHideGroupSetting', shared],
    ['solo-compilations', '隐藏单人合集', '过滤新作中的单人合集，只影响新作展示，馆藏仍可查找。', '#feedHideSoloSetting', shared],
    ['excerpts', '隐藏切片', '过滤新作中的切片，只影响新作展示，馆藏仍可查找。', '#feedHideExcerptSetting', shared],
  ]) },
  { id: 'search-settings', kind: 'settings', title: PREFERENCE_SECTIONS.search, summary: '搜索记录、推荐数量与口味入口。', steps: [
    ...fields('search', [['history', '搜索记录', '设置保留的搜索记录上限，0 表示不记录。', '#searchHistoryLimitSetting']], shared),
    ...fields('search', [['related', '相关推荐数量', '决定详情中显示多少项相关推荐。口味和记录来源在口味页面管理。', '#relatedLimitSetting']]),
  ] },
  { id: 'content', kind: 'settings', title: PREFERENCE_SECTIONS.content, summary: 'SFW 模式与画面显示。', steps: fields('content', [
    ['sfw', 'SFW 模式', '隐藏敏感画面并停止悬停预览，适合需要遮挡画面的环境。访问控制请另设访问密码。', '#censorSetting'],
  ]) },
  { id: 'library', kind: 'settings', title: CONFIGURATION_SECTIONS.library, summary: '媒体库、目录、读取与处理方式。', steps: fields('library', [
    ['media', '媒体库名称与外观', '名称、图标和来源色帮助区分媒体库。一个媒体库可含多个文件夹，下方的文件夹行配置本机或网盘挂载路径。', '[data-guide-target="media"] [data-library-head]'],
    ['folders', '媒体文件夹', '填写媒体目录路径并选择来源。更换已保存的路径时，按页面提示选择重定位原目录或添加另一目录；存在多个媒体库时可以移动文件夹归属。', '[data-guide-target="media"] [data-folder-row]'],
    ['policy', '媒体库处理方式', '这里选择整个媒体库的处理方式。自定义处理可分别选择探测、资料、封面、人物与预览。', '[data-guide-target="library-policy"]'],
    ['read-policy', '文件夹读取策略', '每个文件夹分别选择读取策略。正常读取允许按处理规则读取视频；代理保护适合计费挂载，限制自动读取视频。', '[data-guide-target="media"] [data-media-read-policy]'],
    ['mounts', '挂载状态', '文件夹路径旁显示已保存目录的挂载状态；新目录保存前可能没有状态。网盘挂载不可用时先恢复挂载，再运行扫描。', '[data-guide-target="media"] [data-folder-row]:has([data-mount]), [data-guide-target="mounts"]'],
    ['cloud-proxy', 'CloudDrive 代理', '数据代理控制文件内容请求，API 代理控制接口请求。分别选择模式、地址与端口，认证需要时填写用户名和密码；它们与 Peach 代理分别配置。'],
    ['discovery', '自动发现新文件', '可监视本机文件夹或接收 CloudDrive2 通知。Webhook 用来接收事件，路径前缀映射把通知路径对应到媒体目录。'],
    ['codes', '番号识别规则', '当文件名无法识别时，检查或补充识别规则。规则会影响之后的识别，请先核对样例。'],
    ['preview', '视频预览', '生成视频预览会读取视频并产生缓存。时间轴预览的开关与采集间隔控制本机磁盘缩略图；抽帧解码方式决定生成预览使用的解码器。修改后自动保存，并受媒体库处理方式与读取策略约束。'],
  ], saved) },
  { id: 'subscriptions', kind: 'settings', title: CONFIGURATION_SECTIONS.subscriptions, summary: '资料来源、关注、索引器与站点入口。', steps: fields('subscriptions', [
    ['sources', '采集来源与登录状态', '从这个入口查看作品资料来源及登录状态。关注凭据在下方分别管理，按需要启用来源。', '[data-guide-target="sources"]'],
    ['credentials', '来源凭据', '展开需要使用的站点，按其要求填写登录信息。已保存的字段可以留空保留；操作按站点表单的保存按钮生效。'],
    ['follow-options', '关注采集', '首次采集范围决定回看多久。自动检查更新和间隔控制后续查询；订阅源拉取与头像、favicon 刷新信息按页面显示查看。'],
    ['indexers', '资源搜索', '为索引器填写名称、Torznab 地址和 API key，可以增删来源。资源搜索提供候选结果，下载由你另行确认。'],
    ['entry-links', '作品资料站点', '配置资料站点和镜像入口，用于打开相关作品页面。地址和登录凭据分别管理。'],
  ], saved) },
  { id: 'downloads', kind: 'settings', title: CONFIGURATION_SECTIONS.downloads, summary: '云下载目录、账号与浏览器配对。', steps: fields('downloads', [
    ['download', '云下载', 'CloudDrive2 地址与 API 令牌用于连接服务，可自动查找或检查连接。115 和 PikPak 的目标目录决定云端存放位置，本地媒体目录映射用于下载后入库；等待上限控制等待时长。'],
    ['pikpak', 'PikPak 账号', '按页面选择账号密码或浏览器登录，连接状态用于判断是否可用。登录由你主动操作。'],
    ['browser', '浏览器添加 JAV', '安装用户脚本并配对 Peach。默认渠道决定提交到哪里；启用开关控制功能，专用令牌可更新或关闭，脚本检测帮助确认配对。'],
  ], saved) },
  { id: 'network', kind: 'settings', title: CONFIGURATION_SECTIONS.network, summary: '访问端口、代理、密码和公网入口。', steps: fields('network', [
    ['port', '访问地址与端口', '查看本机、局域网及其他设备可用的访问地址。端口设置保留当前值即可；保存端口变更后，需要使用页面提示的新地址。'],
    ['proxy', 'Peach 代理', '来源联网可选择系统代理、直连或自定义代理地址。连接失败时先检查当前模式与地址。'],
    ['access', '访问密码', '设置或修改进入 Peach 的密码；关闭后，能连接到 Peach 的设备可直接访问。'],
    ['tunnel', 'Cloudflare 公网入口', '临时链接用于临时连接，命名隧道使用主机名与隧道令牌。连接状态显示是否已可用，按需要启用。'],
  ], saved) },
  { id: 'app-maintenance', kind: 'settings', title: CONFIGURATION_SECTIONS.maintenance, summary: '更新、存储、数据选择与应用维护。', steps: fields('maintenance', [
    ['updates', '检查更新', '检查当前可用版本。下载与重启安装分别执行，按页面状态操作。'],
    ['automatic-updates', '自动更新', '选择自动检查、自动下载和检查频率。下载完成后按提示确认重启安装。'],
    ['startup', '开机自启', '设置开机启动、仅启动托盘和桌面快捷方式。可用选项随平台变化。'],
    ['transcode', '视频播放', '播放转码方式决定兼容播放使用的处理方式；抽帧解码在媒体库与入库中单独设置。修改后自动保存。'],
    ['storage', '存储空间', '查看占用，按需要清理缓存和旧备份。迁移数据目录会移动资料与缓存；媒体文件目录单独管理。'],
    ['ledger-backups', '账本备份', '立即备份当前账本，或从列表里的一份备份恢复。恢复会替换当前账本，替换前先另存一份；只有写入端能恢复。'],
    ['reporting', '数据上传', '版本统计与错误诊断、馆藏与口味明细是独立选择。明细上传前可查看预览，按自己的意愿开启。'],
    ['facts', '运行信息与新手教程', '运行信息用于核对环境。新手教程可以随时重开，阅读进度随本机账本在所有设备间共享。'],
    ['uninstall', '卸载 Peach', '卸载移除程序；完全卸载还移除设置、资料库、记录、凭据和缓存。执行前核对页面列出的数据目录与确认内容。'],
  ], saved) },
  { id: 'diagnostics', kind: 'settings', title: CONFIGURATION_SECTIONS.diagnostics, summary: '遇到问题时查看检查项与诊断报告。', steps: fields('diagnostics', [
    ['attention', '需要关注的检查项', '从需要关注的项目进入原因与恢复入口；没有异常时查看库健康。', '[data-guide-target="attention"], [data-guide-target="health"]'],
    ['system-checks', '其他系统检查', '展开其他检查，按系统、配置等分组查看当前状态。需要关注的检查项会单独列在页面上方。', 'section[aria-label="系统检查"]'],
    ['sessions', '来源会话', '查看各来源的会话状态、失败原因和上次解析成功时间，用于判断连接和资料读取问题。'],
    ['report', '重新检查与诊断报告', '处理原因后可以重新检查。需要提供排查资料时，由你点击下载诊断报告。'],
  ], '只读检查 · 重新检查与下载由你主动执行') },
];

/** 复杂设置的逐项解释留在可展开目录中，短导览只讲关键选择。 */
const FIELD_DETAILS: Record<string, readonly [string, string][]> = {
  glow: [
    ['配色预设', '一次应用一组配色和参数，适合先挑选整体外观。'],
    ['强度', '控制光晕的明亮程度；太抢眼时降低。'],
    ['颗粒', '控制光晕纹理中的颗粒感；需要平滑背景时降低。'],
    ['漂移速度', '控制背景光晕移动的速度。'],
    ['柔化', '控制光晕边缘的柔和程度。'],
    ['大小', '控制光晕覆盖的面积。'],
    ['三个自定义颜色', '分别设置三个光晕的颜色，组合成自己的配色。'],
    ['恢复默认', '将光晕配色和参数恢复为默认设置。'],
  ],
  media: [
    ['媒体库名称、图标和来源色', '帮助在侧栏与卡片上区分内容；名称不改变文件路径。'],
    ['文件夹与所属媒体库', '文件夹是实际存放媒体的位置；多个文件夹可以归到同一个媒体库。'],
    ['来源', '说明目录来自本机磁盘还是网盘挂载，用于选择合适的读取行为。'],
    ['目录变更方式', '修改已保存目录路径时，选择重定位原目录或添加另一目录。'],
  ],
  policy: [
    ['自动补全', '读取本地资料，联网补齐缺失资料、封面和人物图片；本地视频可生成九宫格预览。'],
    ['仅使用本地资料', '使用本地 NFO 和图片，按读取策略获取视频信息；本地视频可生成九宫格预览。'],
    ['自定义步骤', '分别选择探测时长与分辨率、补作品资料、取封面、补人物资料和生成视频预览。'],
  ],
  'read-policy': [
    ['正常读取', '允许按处理规则读取视频信息与生成预览，适合本机磁盘或不计费挂载。'],
    ['代理保护', '限制自动读取视频，适合读取会消耗计费流量的挂载。'],
  ],
  preview: [
    ['生成视频预览', '控制九宫格和预览缓存的生成；读取行为同时受媒体库规则约束。'],
    ['时间轴预览', '在本机磁盘视频的播放时间轴上显示缩略图。'],
    ['缩略图采集间隔', '决定相邻时间轴缩略图之间的时间；更密集会生成更多缓存。'],
    ['抽帧解码方式', '选择生成预览时的解码方式；播放转码另行设置。'],
  ],
  'cloud-proxy': [
    ['数据代理', '控制读取文件内容时的网络连接。'], ['API 代理', '控制向 CloudDrive 接口发出请求时的网络连接。'],
    ['模式、地址和端口', '模式选择如何连接，自定义模式需要有效的代理地址与端口。'],
    ['用户名和密码', '仅在代理要求认证时填写。'],
  ],
  discovery: [
    ['发现新文件后自动入库', '允许发现事件触发入库；关闭后按需要手动扫描。'],
    ['监视本机文件夹', '接收本机文件系统的变更，用于发现新内容。'],
    ['接收 CloudDrive2 通知', '通过 CloudDrive2 推送目录变化。'],
    ['Webhook', '供来源服务发送变更事件的接收入口。'],
    ['路径前缀映射', '将来源通知里的路径换算为 Peach 能访问的媒体目录路径。'],
  ],
  'follow-options': [
    ['首次采集范围', '决定新加入的关注来源回看多久；跟随馆藏保存。'],
    ['自动检查更新', '决定是否定期查询已启用来源的新内容；修改后自动保存。'],
    ['自动检查间隔', '决定定期查询之间的时间；修改后自动保存。'],
    ['订阅源拉取', '控制订阅内容的获取，实际状态与操作入口以当前页面为准。'],
    ['头像与 favicon 刷新', '页面显示现有刷新信息；头像用于识别创作者，favicon 用于识别站点。'],
  ],
  download: [
    ['CloudDrive2 地址与 API 令牌', '地址定位服务，令牌授权 Peach 调用服务接口。'],
    ['自动查找与检查', '查找可连接的服务或核对当前连接。'],
    ['115 目标目录', '决定提交到 115 的内容保存到哪个云端目录。'],
    ['PikPak 目标目录', '决定提交到 PikPak 的内容保存到哪个云端目录。'],
    ['媒体目录映射', '将云端目标对应到 Peach 能扫描的挂载路径，便于下载后入库。'],
    ['等待上限', '控制等待下载结果的最长时间。'],
  ],
  browser: [
    ['脚本检测与配对', '确认用户脚本已安装，并与当前 Peach 服务连接。'],
    ['默认渠道', '决定从浏览器添加时默认使用的下载渠道。'],
    ['启用', '控制浏览器添加功能是否接受请求。'],
    ['专用令牌', '授权用户脚本连接；更新后需要重新配对，关闭后停止使用该功能。'],
  ],
  'automatic-updates': [
    ['自动检查新版本', '定期询问是否有新版本。'], ['自动下载更新', '发现更新后先下载；安装仍按提示确认。'],
    ['检查频率', '决定查询新版本的间隔。'],
  ],
  storage: [
    ['占用统计', '查看资料、缓存与备份占用的空间。'],
    ['清理缓存与旧备份', '移除确认范围内的生成文件或旧备份，执行前核对清单。'],
    ['迁移数据目录', '更换资料与缓存的存放位置，按流程迁移并重启。媒体文件目录单独配置。'],
  ],
  codes: [
    ['识别规则', '按输入框中的格式填写，用来从文件名提取番号；保存前核对规则与目标文件名。'],
  ],
  indexers: [
    ['名称', '用于区分资源搜索来源。'], ['Torznab 地址', '索引器提供的查询接口地址。'],
    ['API key', '授权 Peach 使用该索引器；按索引器提供的信息填写。'],
  ],
  proxy: [
    ['系统代理', '采用运行 Peach 的电脑提供的代理配置。'], ['直连', '直接连接来源。'],
    ['自定义代理地址', '指定 Peach 使用的代理；已保存时留空保留当前地址。'],
  ],
  access: [
    ['当前访问密码', '修改访问密码时用于验证当前密码。'],
    ['新访问密码与确认', '两次填写相同密码，保存后使用新密码登录。'],
    ['关闭访问密码', '保存后，能连接到 Peach 的设备可直接进入。'],
  ],
  tunnel: [
    ['临时链接', '适合临时使用的公网访问入口。'], ['命名隧道', '连接已配置的固定公网入口。'],
    ['公开主机名', '填写命名隧道对应的访问域名。'], ['隧道令牌', '授权本机连接命名隧道。'],
    ['连接状态', '用于判断公网入口是否已经可访问。'],
  ],
  startup: [
    ['开机后启动 Peach', '系统登录后启动应用；可用性取决于当前平台。'],
    ['只启动托盘，不打开网页', '开机启动时保留后台运行，按需要再打开页面。'],
    ['在桌面创建快捷方式', '提供打开 Peach 的桌面入口。'],
  ],
  reporting: [
    ['发送版本统计与错误诊断', '上传版本、系统信息、故障类型、代码位置与发生次数。'],
    ['上传馆藏与口味明细', '独立控制馆藏及口味信息的上传，启用前查看当前上传预览并确认。'],
    ['上传预览', '查看本次会包含的内容，再决定是否启用明细上传。'],
  ],
};
for (const chapter of SETTING_CHAPTERS) for (const item of chapter.steps) {
  item.details = FIELD_DETAILS[item.id];
  if (item.id === 'preview' || item.id === 'transcode') item.scope = '运行 Peach 的电脑 · 修改后自动保存';
  if (item.id === 'follow-options' || item.id === 'sources' || item.id === 'reporting' || item.id === 'storage'
    || item.id === 'ledger-backups') item.scope = '按页面中各项的保存或确认动作生效';
}
export const GUIDE_CHAPTERS = [...INTERFACE_CHAPTERS, ...SETTING_CHAPTERS];

export interface GuideTopic { id: string; kind: GuideChapter['kind']; title: string; summary: string; chapters: string[] }
/** 目录按使用意图组织；小章节可单独阅读，设置步骤对应实际设置分区。 */
export const GUIDE_TOPICS: GuideTopic[] = [
  { id: 'browse', kind: 'interface', title: '查找与发现', summary: '搜索播放、人物标签、JAV 追新', chapters: ['find-play', 'entities', 'jav'] },
  { id: 'collect', kind: 'interface', title: '收藏与关注', summary: '标记列表、创作者更新、口味统计', chapters: ['save', 'follow', 'insights'] },
  { id: 'watch', kind: 'interface', title: '观看与设备', summary: '播放墙、沉浸观看、手机访问', chapters: ['viewing', 'devices'] },
  { id: 'manage', kind: 'interface', title: '导入与整理', summary: '下载接入、扫描维护、人工复核', chapters: ['external', 'maintenance'] },
  { id: 'experience', kind: 'settings', title: '外观与播放', summary: '界面样式、播放行为、内容显示', chapters: ['appearance', 'playback', 'content'] },
  { id: 'discovery', kind: 'settings', title: '搜索与来源', summary: '搜索推荐、新作、关注来源', chapters: ['search-settings', 'jav-settings', 'subscriptions'] },
  { id: 'storage', kind: 'settings', title: '媒体与下载', summary: '媒体库、目录、读取与下载渠道', chapters: ['library', 'downloads'] },
  { id: 'system', kind: 'settings', title: '连接与维护', summary: '网络访问、应用维护、系统诊断', chapters: ['network', 'app-maintenance', 'diagnostics'] },
];
export function contextualChapter(path: string): GuideChapter {
  if (path === '/') return INTERFACE_CHAPTERS[0]!;
  return SETTING_CHAPTERS.find(chapter => chapter.steps[0]?.route === path)
    || INTERFACE_CHAPTERS.find(chapter => chapter.id !== 'basics' && chapter.steps.some(item => item.route === path))
    || INTERFACE_CHAPTERS[0]!;
}
