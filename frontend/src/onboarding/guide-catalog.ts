import { PREFERENCE_SECTIONS, CONFIGURATION_SECTIONS } from '../history/settings-route';
import type { RegisteredRoutePath } from '../history/route-meta';
import { javPath } from '../react/jav/jav-navigation';
import { t } from '../i18n';

/** 沿用应用的路由类型，页面移除或改名会在类型检查中指出教程的旧链接。 */
type GuidePath = RegisteredRoutePath;
export type GuideRoute = GuidePath | `${GuidePath}?${string}` | `${GuidePath}#${string}`;
export interface GuideStep { id: string; title: string; body: string; route?: GuideRoute | undefined; target?: string | undefined; surface?: 'detail' | 'player' | 'subtitles'; scope?: string | undefined; details?: readonly [string, string][] | undefined }
export interface GuideChapter { id: string; title: string; summary: string; kind: 'interface' | 'settings'; steps: GuideStep[] }
/** 教程定位的目标用目标控件自己的无障碍名称，取同一个键，换语言也对得上。 */
const byLabel = (key: string, tag = ''): string => `${tag}[aria-label="${t(key)}"]`;
const step = (id: string, title: string, body: string, route?: GuideRoute, target?: string, scope?: string): GuideStep => ({ id, title, body, route, target, scope });
const page = (id: string, title: string, body: string, route: GuideRoute, target?: string) => step(id, title, body, route, target);

export const INTERFACE_CHAPTERS: GuideChapter[] = [
  { id: 'basics', kind: 'interface', title: t('onboarding:guideBasics.title'), summary: t('onboarding:guideBasics.summary'), steps: [
    page('search', t('onboarding:guideBasics.searchTitle'), t('onboarding:guideBasics.searchBody'), '/', '#q, #searchBtn'),
    page('navigation', t('onboarding:guideBasics.navigationTitle'), t('onboarding:guideBasics.navigationBody'), '/', '#filterBtn, [data-sidebar-nav]'),
    page('cards', t('onboarding:guideBasics.cardsTitle'), t('onboarding:guideBasics.cardsBody'), '/', '[data-media-grid] > [data-id], [data-catalog-row], [data-media-empty]'),
    page('preferences', t('onboarding:guideBasics.preferencesTitle'), t('onboarding:guideBasics.preferencesBody'), '/', '#settingsBtn, #filterBtn'),
  ] },
  { id: 'find-play', kind: 'interface', title: t('onboarding:guideFindPlay.title'), summary: t('onboarding:guideFindPlay.summary'), steps: [
    page('library', t('onboarding:guideFindPlay.libraryTitle'), t('onboarding:guideFindPlay.libraryBody'), '/', '#brandHome, #filterBtn'),
    page('search', t('onboarding:guideFindPlay.searchTitle'), t('onboarding:guideFindPlay.searchBody'), '/', '#q, #searchBtn'),
    page('filter', t('onboarding:guideFindPlay.filterTitle'), t('onboarding:guideFindPlay.filterBody'), '/', '[data-catalog-frame]'),
    { ...step('detail', t('onboarding:shared.videoDetails'), t('onboarding:guideFindPlay.detailBody'), '/', '[data-item-title]'), surface: 'detail' },
    { ...step('player', t('onboarding:guideFindPlay.playerTitle'), t('onboarding:guideFindPlay.playerBody'), '/', '#stage .vjs-control-bar'), surface: 'player' },
    { ...step('subtitles', t('onboarding:guideFindPlay.subtitlesTitle'), t('onboarding:guideFindPlay.subtitlesBody'), '/', '#stage [data-player-subtitles]'), surface: 'subtitles' },
    { ...step('external', t('onboarding:shared.externalPlayer'), t('onboarding:guideFindPlay.externalBody'), '/', '#stage [data-local-playback-row]'), surface: 'detail' },
  ] },
  { id: 'save', kind: 'interface', title: t('onboarding:guideSave.title'), summary: t('onboarding:guideSave.summary'), steps: [
    { ...page('marks', t('onboarding:shared.rating'), t('onboarding:guideSave.marksBody'), '/', '#stage [data-item-rating]'), surface: 'detail' },
    { ...page('mark-actions', t('onboarding:guideSave.markActionsTitle'), t('onboarding:guideSave.markActionsBody'), '/', '#stage [data-item-feedback]'), surface: 'detail' },
    page('lists', t('onboarding:guideSave.listsTitle'), t('onboarding:guideSave.listsBody'), '/playlists', '[data-playlist-create]'),
    page('queue', t('onboarding:guideSave.queueTitle'), t('onboarding:guideSave.queueBody'), '/playlists', '[data-playlist-card]'),
  ] },
  { id: 'entities', kind: 'interface', title: t('onboarding:guideEntities.title'), summary: t('onboarding:guideEntities.summary'), steps: [
    page('people', t('onboarding:guideEntities.peopleTitle'), t('onboarding:guideEntities.peopleBody'), '/performers', '[data-index-body] [data-index-cell], [data-index-body] [data-empty-state]'),
    page('studios', t('onboarding:catalogEmpty.studios'), t('onboarding:guideEntities.studiosBody'), '/studios', '[data-index-body] [data-index-cell], [data-index-body] [data-empty-state]'),
    page('tags', t('onboarding:guideEntities.tagsTitle'), t('onboarding:guideEntities.tagsBody'), '/tags', '[data-index-body] [data-alpha-tag], [data-index-body] [data-tag-chip], [data-index-body] [data-empty-state]'),
    page('manage-tags', t('onboarding:guideEntities.manageTagsTitle'), t('onboarding:guideEntities.manageTagsBody'), '/tags', '[data-tag-mode]'),
  ] },
  { id: 'jav', kind: 'interface', title: t('onboarding:guideJav.title'), summary: t('onboarding:guideJav.summary'), steps: [
    page('library', t('onboarding:guideJav.libraryTitle'), t('onboarding:guideJav.libraryBody'), javPath('library') as GuideRoute, '[data-catalog-frame]'),
    page('new', t('onboarding:guideJav.newTitle'), t('onboarding:guideJav.newBody'), javPath('discover') as GuideRoute, '[data-jav-filter] [data-catalog-views]'),
    page('wants', t('onboarding:guideJav.wantsTitle'), t('onboarding:guideJav.wantsBody'), javPath('discover') as GuideRoute, byLabel('catalog:javTabs.label')),
    page('quality', t('onboarding:guideJav.qualityTitle'), t('onboarding:guideJav.qualityBody'), '/quality-goals', '[data-goal-id], #main [data-empty-state]'),
  ] },
  { id: 'follow', kind: 'interface', title: t('onboarding:shared.followCreators'), summary: t('onboarding:guideFollow.summary'), steps: [
    page('feed', t('onboarding:guideFollow.feedTitle'), t('onboarding:guideFollow.feedBody'), '/follow', '[data-follow-item], [data-follow-empty] [data-empty-state]'),
    page('sources', t('onboarding:guideFollow.sourcesTitle'), t('onboarding:guideFollow.sourcesBody'), '/subscriptions', byLabel('follow:followManagePage.sectionTabs')),
    page('credentials', t('onboarding:guideFollow.credentialsTitle'), t('onboarding:guideFollow.credentialsBody'), '/settings/subscriptions', '[data-guide-target="credentials"]'),
  ] },
  { id: 'viewing', kind: 'interface', title: t('onboarding:guideViewing.title'), summary: t('onboarding:guideViewing.summary'), steps: [
    page('wall', t('onboarding:guideViewing.wallTitle'), t('onboarding:guideViewing.wallBody'), '/', '#wallBtn'),
    page('immerse', t('onboarding:guideViewing.immerseTitle'), t('onboarding:guideViewing.immerseBody'), '/', '#immerseBtn'),
    page('mini', t('onboarding:guideViewing.miniTitle'), t('onboarding:guideViewing.miniBody'), '/settings/playback', '#miniplayerSetting'),
  ] },
  { id: 'maintenance', kind: 'interface', title: t('onboarding:guideMaintenance.title'), summary: t('onboarding:guideMaintenance.summary'), steps: [
    page('scan', t('onboarding:guideMaintenance.scanTitle'), t('onboarding:guideMaintenance.scanBody'), '/data-cleanup', '#libraryProcessing'),
    page('review', t('onboarding:shared.review'), t('onboarding:guideMaintenance.reviewBody'), '/review', '[aria-labelledby="reviewcategories"]'),
    page('organize', t('onboarding:guideMaintenance.organizeTitle'), t('onboarding:guideMaintenance.organizeBody'), '/data-cleanup', '[data-cleanup-organize]'),
    page('trash', t('onboarding:shared.trash'), t('onboarding:guideMaintenance.trashBody'), '/trash', '[data-media-grid] > [data-id], [data-catalog-row], [data-media-empty]'),
    page('tasks', t('onboarding:guideMaintenance.tasksTitle'), t('onboarding:guideMaintenance.tasksBody'), '/tasks', '[data-run-id], #main [data-empty-state]'),
  ] },
  { id: 'insights', kind: 'interface', title: t('onboarding:guideInsights.title'), summary: t('onboarding:guideInsights.summary'), steps: [
    page('stats', t('onboarding:guideInsights.statsTitle'), t('onboarding:guideInsights.statsBody'), '/stats', byLabel('manage:stats.viewsLabel')),
    page('taste', t('onboarding:shared.tasteAndHistory'), t('onboarding:guideInsights.tasteBody'), '/taste', byLabel('manage:taste.evidenceLabel')),
    page('import', t('onboarding:guideInsights.importTitle'), t('onboarding:guideInsights.importBody'), '/taste', '[data-guide-target="history-import"]'),
    page('history', t('onboarding:guideInsights.historyTitle'), t('onboarding:guideInsights.historyBody'), '/taste', byLabel('manage:tasteSources.dataSources', 'section')),
  ] },
  { id: 'external', kind: 'interface', title: t('onboarding:guideExternal.title'), summary: t('onboarding:guideExternal.summary'), steps: [
    page('downloads', t('onboarding:guideExternal.downloadsTitle'), t('onboarding:guideExternal.downloadsBody'), '/settings/downloads', '[data-guide-target="download"]'),
    page('search', t('onboarding:guideExternal.searchTitle'), t('onboarding:guideExternal.searchBody'), '/settings/subscriptions', '[data-guide-target="indexers"]'),
    page('browser', t('onboarding:shared.addJavFromBrowser'), t('onboarding:guideExternal.browserBody'), '/settings/downloads', '[data-guide-target="browser"]'),
  ] },
  { id: 'devices', kind: 'interface', title: t('onboarding:guideDevices.title'), summary: t('onboarding:guideDevices.summary'), steps: [
    page('address', t('onboarding:guideDevices.addressTitle'), t('onboarding:guideDevices.addressBody'), '/settings/network', '[data-guide-target="port"]'),
    page('password', t('onboarding:shared.accessPassword'), t('onboarding:guideDevices.passwordBody'), '/settings/network', '[data-guide-target="access"]'),
    page('tunnel', t('onboarding:guideDevices.tunnelTitle'), t('onboarding:guideDevices.tunnelBody'), '/settings/network', '[data-guide-target="tunnel"]'),
  ] },
];

const local = t('onboarding:guideScopes.thisBrowser');
const shared = t('onboarding:guideScopes.collection');
const saved = t('onboarding:guideScopes.serverConfirm');
type Field = [string, string, string, string?, string?];
const fields = (route: keyof typeof PREFERENCE_SECTIONS | keyof typeof CONFIGURATION_SECTIONS, entries: Field[], scope = local): GuideStep[] => entries.map(([id, title, body, target, override]) => step(id, title, body, `/settings/${route}`, target || `[data-guide-target="${id}"]`, override || scope));
export const SETTING_CHAPTERS: GuideChapter[] = [
  { id: 'appearance', kind: 'settings', title: PREFERENCE_SECTIONS.appearance, summary: t('onboarding:guideAppearance.summary'), steps: fields('appearance', [
    ['theme', t('onboarding:guideAppearance.themeTitle'), t('onboarding:guideAppearance.themeBody'), '#themeSetting'],
    ['contrast', t('onboarding:guideAppearance.contrastTitle'), t('onboarding:guideAppearance.contrastBody'), '#glassContrastSetting'],
    ['sounds', t('onboarding:guideAppearance.soundsTitle'), t('onboarding:guideAppearance.soundsBody'), '#uiSoundsSetting'],
    ['glow', t('onboarding:guideAppearance.glowTitle'), t('onboarding:guideAppearance.glowBody'), '#homeGlowSetting'],
    ['sidebar', t('onboarding:guideAppearance.sidebarTitle'), t('onboarding:guideAppearance.sidebarBody'), '[data-sidebar-setting]', shared],
  ]) },
  { id: 'playback', kind: 'settings', title: PREFERENCE_SECTIONS.playback, summary: t('onboarding:guidePlayback.summary'), steps: fields('playback', [
    ['batch', t('onboarding:guidePlayback.batchTitle'), t('onboarding:guidePlayback.batchBody'), '#batchSizeSetting'],
    ['sort', t('onboarding:guidePlayback.sortTitle'), t('onboarding:guidePlayback.sortBody'), '[data-setting-sort-controls]'],
    ['size', t('onboarding:guidePlayback.sizeTitle'), t('onboarding:guidePlayback.sizeBody'), '#javSizeSetting'],
    ['versions', t('onboarding:guidePlayback.versionsTitle'), t('onboarding:guidePlayback.versionsBody'), '#groupCollapseSetting'],
    ['hover', t('onboarding:guidePlayback.hoverTitle'), t('onboarding:guidePlayback.hoverBody'), '#hoverDelaySetting'],
    ['autoplay', t('onboarding:guidePlayback.autoplayTitle'), t('onboarding:guidePlayback.autoplayBody'), '#detailAutoplaySetting'],
    ['miniplayer', t('onboarding:guidePlayback.miniplayerTitle'), t('onboarding:guidePlayback.miniplayerBody'), '#miniplayerSetting'],
    ['seek', t('onboarding:guidePlayback.seekTitle'), t('onboarding:guidePlayback.seekBody'), '#seekSecondsSetting'],
  ]) },
  { id: 'jav-settings', kind: 'settings', title: PREFERENCE_SECTIONS.jav, summary: t('onboarding:guideJavSettings.summary'), steps: fields('jav', [
    ['names', t('onboarding:guideJavSettings.namesTitle'), t('onboarding:guideJavSettings.namesBody'), '#performerNameLanguageSetting', shared],
    ['image', t('onboarding:guideJavSettings.imageTitle'), t('onboarding:guideJavSettings.imageBody'), '#javImageSetting'],
    ['limit', t('onboarding:guideJavSettings.limitTitle'), t('onboarding:guideJavSettings.limitBody'), '#feedLimitSetting'],
    ['scroll', t('onboarding:guideJavSettings.scrollTitle'), t('onboarding:guideJavSettings.scrollBody'), '#feedAutoScrollSetting'],
    ['compilations', t('onboarding:guideJavSettings.compilationsTitle'), t('onboarding:guideJavSettings.compilationsBody'), '#feedHideGroupSetting', shared],
    ['solo-compilations', t('onboarding:guideJavSettings.soloCompilationsTitle'), t('onboarding:guideJavSettings.soloCompilationsBody'), '#feedHideSoloSetting', shared],
    ['excerpts', t('onboarding:guideJavSettings.excerptsTitle'), t('onboarding:guideJavSettings.excerptsBody'), '#feedHideExcerptSetting', shared],
  ]) },
  { id: 'search-settings', kind: 'settings', title: PREFERENCE_SECTIONS.search, summary: t('onboarding:guideSearchSettings.summary'), steps: [
    ...fields('search', [['history', t('onboarding:guideSearchSettings.historyTitle'), t('onboarding:guideSearchSettings.historyBody'), '#searchHistoryLimitSetting']], shared),
    ...fields('search', [['related', t('onboarding:guideSearchSettings.relatedTitle'), t('onboarding:guideSearchSettings.relatedBody'), '#relatedLimitSetting']]),
  ] },
  { id: 'content', kind: 'settings', title: PREFERENCE_SECTIONS.content, summary: t('onboarding:guideContent.summary'), steps: fields('content', [
    ['sfw', t('onboarding:guideContent.sfwTitle'), t('onboarding:guideContent.sfwBody'), '#censorSetting'],
  ]) },
  { id: 'library', kind: 'settings', title: CONFIGURATION_SECTIONS.library, summary: t('onboarding:guideLibrary.summary'), steps: fields('library', [
    ['media', t('onboarding:guideLibrary.mediaTitle'), t('onboarding:guideLibrary.mediaBody'), '[data-guide-target="media"] [data-library-head]'],
    ['folders', t('onboarding:guideLibrary.foldersTitle'), t('onboarding:guideLibrary.foldersBody'), '[data-guide-target="media"] [data-folder-row]'],
    ['policy', t('onboarding:guideLibrary.policyTitle'), t('onboarding:guideLibrary.policyBody'), '[data-guide-target="library-policy"]'],
    ['read-policy', t('onboarding:guideLibrary.readPolicyTitle'), t('onboarding:guideLibrary.readPolicyBody'), '[data-guide-target="media"] [data-media-read-policy]'],
    ['mounts', t('onboarding:guideLibrary.mountsTitle'), t('onboarding:guideLibrary.mountsBody'), '[data-guide-target="media"] [data-folder-row]:has([data-mount]), [data-guide-target="mounts"]'],
    ['cloud-proxy', t('onboarding:guideLibrary.cloudProxyTitle'), t('onboarding:guideLibrary.cloudProxyBody')],
    ['discovery', t('onboarding:guideLibrary.discoveryTitle'), t('onboarding:guideLibrary.discoveryBody')],
    ['codes', t('onboarding:guideLibrary.codesTitle'), t('onboarding:guideLibrary.codesBody')],
    ['preview', t('onboarding:guideLibrary.previewTitle'), t('onboarding:guideLibrary.previewBody')],
  ], saved) },
  { id: 'subscriptions', kind: 'settings', title: CONFIGURATION_SECTIONS.subscriptions, summary: t('onboarding:guideSubscriptions.summary'), steps: fields('subscriptions', [
    ['sources', t('onboarding:guideSubscriptions.sourcesTitle'), t('onboarding:guideSubscriptions.sourcesBody'), '[data-guide-target="sources"]'],
    ['credentials', t('onboarding:guideSubscriptions.credentialsTitle'), t('onboarding:guideSubscriptions.credentialsBody')],
    ['follow-options', t('onboarding:guideSubscriptions.followOptionsTitle'), t('onboarding:guideSubscriptions.followOptionsBody')],
    ['indexers', t('onboarding:guideSubscriptions.indexersTitle'), t('onboarding:guideSubscriptions.indexersBody')],
    ['entry-links', t('onboarding:guideSubscriptions.entryLinksTitle'), t('onboarding:guideSubscriptions.entryLinksBody')],
  ], saved) },
  { id: 'downloads', kind: 'settings', title: CONFIGURATION_SECTIONS.downloads, summary: t('onboarding:guideDownloads.summary'), steps: fields('downloads', [
    ['download', t('onboarding:guideDownloads.downloadTitle'), t('onboarding:guideDownloads.downloadBody')],
    ['pikpak', t('onboarding:guideDownloads.pikpakTitle'), t('onboarding:guideDownloads.pikpakBody')],
    ['browser', t('onboarding:shared.addJavFromBrowser'), t('onboarding:guideDownloads.browserBody')],
  ], saved) },
  { id: 'network', kind: 'settings', title: CONFIGURATION_SECTIONS.network, summary: t('onboarding:guideNetwork.summary'), steps: fields('network', [
    ['port', t('onboarding:guideNetwork.portTitle'), t('onboarding:guideNetwork.portBody')],
    ['proxy', t('onboarding:guideNetwork.proxyTitle'), t('onboarding:guideNetwork.proxyBody')],
    ['access', t('onboarding:shared.accessPassword'), t('onboarding:guideNetwork.accessBody')],
    ['tunnel', t('onboarding:guideNetwork.tunnelTitle'), t('onboarding:guideNetwork.tunnelBody')],
  ], saved) },
  { id: 'app-maintenance', kind: 'settings', title: CONFIGURATION_SECTIONS.maintenance, summary: t('onboarding:guideAppMaintenance.summary'), steps: fields('maintenance', [
    ['updates', t('onboarding:guideAppMaintenance.updatesTitle'), t('onboarding:guideAppMaintenance.updatesBody')],
    ['automatic-updates', t('onboarding:guideAppMaintenance.autoUpdatesTitle'), t('onboarding:guideAppMaintenance.autoUpdatesBody')],
    ['startup', t('onboarding:guideAppMaintenance.startupTitle'), t('onboarding:guideAppMaintenance.startupBody')],
    ['transcode', t('onboarding:guideAppMaintenance.transcodeTitle'), t('onboarding:guideAppMaintenance.transcodeBody')],
    ['storage', t('onboarding:guideAppMaintenance.storageTitle'), t('onboarding:guideAppMaintenance.storageBody')],
    ['ledger-backups', t('onboarding:guideAppMaintenance.backupsTitle'), t('onboarding:guideAppMaintenance.backupsBody')],
    ['reporting', t('onboarding:guideAppMaintenance.reportingTitle'), t('onboarding:guideAppMaintenance.reportingBody')],
    ['facts', t('onboarding:guideAppMaintenance.factsTitle'), t('onboarding:guideAppMaintenance.factsBody')],
    ['uninstall', t('onboarding:guideAppMaintenance.uninstallTitle'), t('onboarding:guideAppMaintenance.uninstallBody')],
  ], saved) },
  { id: 'diagnostics', kind: 'settings', title: CONFIGURATION_SECTIONS.diagnostics, summary: t('onboarding:guideDiagnostics.summary'), steps: fields('diagnostics', [
    ['attention', t('onboarding:guideDiagnostics.attentionTitle'), t('onboarding:guideDiagnostics.attentionBody'), '[data-guide-target="attention"], [data-guide-target="health"]'],
    ['system-checks', t('onboarding:guideDiagnostics.systemChecksTitle'), t('onboarding:guideDiagnostics.systemChecksBody'), byLabel('manage:diagnostics.systemChecks', 'section')],
    ['sessions', t('onboarding:guideDiagnostics.sessionsTitle'), t('onboarding:guideDiagnostics.sessionsBody')],
    ['report', t('onboarding:guideDiagnostics.reportTitle'), t('onboarding:guideDiagnostics.reportBody')],
  ], t('onboarding:guideScopes.readOnlyChecks')) },
];

/** 复杂设置的逐项解释留在可展开目录中，短导览只讲关键选择。 */
const FIELD_DETAILS: Record<string, readonly [string, string][]> = {
  glow: [
    [t('onboarding:guideAppearance.glowPresetsTitle'), t('onboarding:guideAppearance.glowPresetsBody')],
    [t('onboarding:guideAppearance.glowIntensityTitle'), t('onboarding:guideAppearance.glowIntensityBody')],
    [t('onboarding:guideAppearance.glowGrainTitle'), t('onboarding:guideAppearance.glowGrainBody')],
    [t('onboarding:guideAppearance.glowDriftTitle'), t('onboarding:guideAppearance.glowDriftBody')],
    [t('onboarding:guideAppearance.glowSoftnessTitle'), t('onboarding:guideAppearance.glowSoftnessBody')],
    [t('onboarding:shared.size'), t('onboarding:guideAppearance.glowSizeBody')],
    [t('onboarding:guideAppearance.glowColorsTitle'), t('onboarding:guideAppearance.glowColorsBody')],
    [t('onboarding:shared.reset'), t('onboarding:guideAppearance.glowResetBody')],
  ],
  media: [
    [t('onboarding:guideLibrary.identityTitle'), t('onboarding:guideLibrary.identityBody')],
    [t('onboarding:guideLibrary.directoryLibraryTitle'), t('onboarding:guideLibrary.directoryLibraryBody')],
    [t('onboarding:guideLibrary.storageTitle'), t('onboarding:guideLibrary.storageBody')],
    [t('onboarding:guideLibrary.directoryChangeTitle'), t('onboarding:guideLibrary.directoryChangeBody')],
  ],
  policy: [
    [t('onboarding:guideLibrary.policyAutoTitle'), t('onboarding:guideLibrary.policyAutoBody')],
    [t('onboarding:guideLibrary.policyLocalTitle'), t('onboarding:guideLibrary.policyLocalBody')],
    [t('onboarding:guideLibrary.policyCustomTitle'), t('onboarding:guideLibrary.policyCustomBody')],
  ],
  'read-policy': [
    [t('onboarding:guideLibrary.readStandardTitle'), t('onboarding:guideLibrary.readStandardBody')],
    [t('onboarding:guideLibrary.readDataSaverTitle'), t('onboarding:guideLibrary.readDataSaverBody')],
  ],
  preview: [
    [t('onboarding:guideLibrary.generatePreviewsTitle'), t('onboarding:guideLibrary.generatePreviewsBody')],
    [t('onboarding:guideLibrary.seekPreviewTitle'), t('onboarding:guideLibrary.seekPreviewBody')],
    [t('onboarding:guideLibrary.thumbnailIntervalTitle'), t('onboarding:guideLibrary.thumbnailIntervalBody')],
    [t('onboarding:guideLibrary.frameDecodingTitle'), t('onboarding:guideLibrary.frameDecodingBody')],
  ],
  'cloud-proxy': [
    [t('onboarding:guideLibrary.dataProxyTitle'), t('onboarding:guideLibrary.dataProxyBody')], [t('onboarding:guideLibrary.apiProxyTitle'), t('onboarding:guideLibrary.apiProxyBody')],
    [t('onboarding:guideLibrary.proxyModeTitle'), t('onboarding:guideLibrary.proxyModeBody')],
    [t('onboarding:guideLibrary.proxyAuthTitle'), t('onboarding:guideLibrary.proxyAuthBody')],
  ],
  discovery: [
    [t('onboarding:guideLibrary.autoImportTitle'), t('onboarding:guideLibrary.autoImportBody')],
    [t('onboarding:guideLibrary.monitorLocalTitle'), t('onboarding:guideLibrary.monitorLocalBody')],
    [t('onboarding:guideLibrary.cloudDriveNotifyTitle'), t('onboarding:guideLibrary.cloudDriveNotifyBody')],
    ['Webhook', t('onboarding:guideLibrary.webhookBody')],
    [t('onboarding:guideLibrary.pathMappingTitle'), t('onboarding:guideLibrary.pathMappingBody')],
  ],
  'follow-options': [
    [t('onboarding:guideSubscriptions.initialRangeTitle'), t('onboarding:guideSubscriptions.initialRangeBody')],
    [t('onboarding:guideSubscriptions.autoCheckTitle'), t('onboarding:guideSubscriptions.autoCheckBody')],
    [t('onboarding:guideSubscriptions.checkIntervalTitle'), t('onboarding:guideSubscriptions.checkIntervalBody')],
    [t('onboarding:guideSubscriptions.feedFetchTitle'), t('onboarding:guideSubscriptions.feedFetchBody')],
    [t('onboarding:guideSubscriptions.iconRefreshTitle'), t('onboarding:guideSubscriptions.iconRefreshBody')],
  ],
  download: [
    [t('onboarding:guideDownloads.cloudDriveTitle'), t('onboarding:guideDownloads.cloudDriveBody')],
    [t('onboarding:guideDownloads.findCheckTitle'), t('onboarding:guideDownloads.findCheckBody')],
    [t('onboarding:guideDownloads.target115Title'), t('onboarding:guideDownloads.target115Body')],
    [t('onboarding:guideDownloads.targetPikpakTitle'), t('onboarding:guideDownloads.targetPikpakBody')],
    [t('onboarding:guideDownloads.mediaMappingTitle'), t('onboarding:guideDownloads.mediaMappingBody')],
    [t('onboarding:guideDownloads.waitLimitTitle'), t('onboarding:guideDownloads.waitLimitBody')],
  ],
  browser: [
    [t('onboarding:guideDownloads.pairingTitle'), t('onboarding:guideDownloads.pairingBody')],
    [t('onboarding:guideDownloads.defaultChannelTitle'), t('onboarding:guideDownloads.defaultChannelBody')],
    [t('onboarding:shared.enable'), t('onboarding:guideDownloads.enableBody')],
    [t('onboarding:guideDownloads.tokenTitle'), t('onboarding:guideDownloads.tokenBody')],
  ],
  'automatic-updates': [
    [t('onboarding:guideAppMaintenance.autoCheckTitle'), t('onboarding:guideAppMaintenance.autoCheckBody')], [t('onboarding:guideAppMaintenance.autoDownloadTitle'), t('onboarding:guideAppMaintenance.autoDownloadBody')],
    [t('onboarding:guideAppMaintenance.checkFrequencyTitle'), t('onboarding:guideAppMaintenance.checkFrequencyBody')],
  ],
  storage: [
    [t('onboarding:guideAppMaintenance.usageTitle'), t('onboarding:guideAppMaintenance.usageBody')],
    [t('onboarding:guideAppMaintenance.cleanupTitle'), t('onboarding:guideAppMaintenance.cleanupBody')],
    [t('onboarding:guideAppMaintenance.moveDataTitle'), t('onboarding:guideAppMaintenance.moveDataBody')],
  ],
  codes: [
    [t('onboarding:guideLibrary.codeRulesTitle'), t('onboarding:guideLibrary.codeRulesBody')],
  ],
  indexers: [
    [t('onboarding:shared.name'), t('onboarding:guideSubscriptions.indexerNameBody')], [t('onboarding:guideSubscriptions.torznabUrlTitle'), t('onboarding:guideSubscriptions.torznabUrlBody')],
    ['API key', t('onboarding:guideSubscriptions.apiKeyBody')],
  ],
  proxy: [
    [t('onboarding:guideNetwork.systemProxyTitle'), t('onboarding:guideNetwork.systemProxyBody')], [t('onboarding:guideNetwork.directTitle'), t('onboarding:guideNetwork.directBody')],
    [t('onboarding:guideNetwork.customProxyTitle'), t('onboarding:guideNetwork.customProxyBody')],
  ],
  access: [
    [t('onboarding:guideNetwork.currentPasswordTitle'), t('onboarding:guideNetwork.currentPasswordBody')],
    [t('onboarding:guideNetwork.newPasswordTitle'), t('onboarding:guideNetwork.newPasswordBody')],
    [t('onboarding:guideNetwork.passwordOffTitle'), t('onboarding:guideNetwork.passwordOffBody')],
  ],
  tunnel: [
    [t('onboarding:guideNetwork.quickTunnelTitle'), t('onboarding:guideNetwork.quickTunnelBody')], [t('onboarding:guideNetwork.namedTunnelTitle'), t('onboarding:guideNetwork.namedTunnelBody')],
    [t('onboarding:guideNetwork.hostnameTitle'), t('onboarding:guideNetwork.hostnameBody')], [t('onboarding:guideNetwork.tunnelTokenTitle'), t('onboarding:guideNetwork.tunnelTokenBody')],
    [t('onboarding:guideNetwork.connectionStatusTitle'), t('onboarding:guideNetwork.connectionStatusBody')],
  ],
  startup: [
    [t('onboarding:guideAppMaintenance.launchAtStartupTitle'), t('onboarding:guideAppMaintenance.launchAtStartupBody')],
    [t('onboarding:guideAppMaintenance.trayOnlyTitle'), t('onboarding:guideAppMaintenance.trayOnlyBody')],
    [t('onboarding:guideAppMaintenance.desktopShortcutTitle'), t('onboarding:guideAppMaintenance.desktopShortcutBody')],
  ],
  reporting: [
    [t('onboarding:guideAppMaintenance.diagnosticsUploadTitle'), t('onboarding:guideAppMaintenance.diagnosticsUploadBody')],
    [t('onboarding:guideAppMaintenance.detailsUploadTitle'), t('onboarding:guideAppMaintenance.detailsUploadBody')],
    [t('onboarding:guideAppMaintenance.uploadPreviewTitle'), t('onboarding:guideAppMaintenance.uploadPreviewBody')],
  ],
};
for (const chapter of SETTING_CHAPTERS) for (const item of chapter.steps) {
  item.details = FIELD_DETAILS[item.id];
  if (item.id === 'preview' || item.id === 'transcode') item.scope = t('onboarding:guideScopes.serverAutoSave');
  if (item.id === 'follow-options' || item.id === 'sources' || item.id === 'reporting' || item.id === 'storage'
    || item.id === 'ledger-backups') item.scope = t('onboarding:guideScopes.perOption');
}
export const GUIDE_CHAPTERS = [...INTERFACE_CHAPTERS, ...SETTING_CHAPTERS];

export interface GuideTopic { id: string; kind: GuideChapter['kind']; title: string; summary: string; chapters: string[] }
/** 目录按使用意图组织；小章节可单独阅读，设置步骤对应实际设置分区。 */
export const GUIDE_TOPICS: GuideTopic[] = [
  { id: 'browse', kind: 'interface', title: t('onboarding:guideTopics.browseTitle'), summary: t('onboarding:guideTopics.browseSummary'), chapters: ['find-play', 'entities', 'jav'] },
  { id: 'collect', kind: 'interface', title: t('onboarding:guideTopics.collectTitle'), summary: t('onboarding:guideTopics.collectSummary'), chapters: ['save', 'follow', 'insights'] },
  { id: 'watch', kind: 'interface', title: t('onboarding:guideTopics.watchTitle'), summary: t('onboarding:guideTopics.watchSummary'), chapters: ['viewing', 'devices'] },
  { id: 'manage', kind: 'interface', title: t('onboarding:guideTopics.manageTitle'), summary: t('onboarding:guideTopics.manageSummary'), chapters: ['external', 'maintenance'] },
  { id: 'experience', kind: 'settings', title: t('onboarding:guideTopics.experienceTitle'), summary: t('onboarding:guideTopics.experienceSummary'), chapters: ['appearance', 'playback', 'content'] },
  { id: 'discovery', kind: 'settings', title: t('onboarding:guideTopics.discoveryTitle'), summary: t('onboarding:guideTopics.discoverySummary'), chapters: ['search-settings', 'jav-settings', 'subscriptions'] },
  { id: 'storage', kind: 'settings', title: t('onboarding:guideTopics.storageTitle'), summary: t('onboarding:guideTopics.storageSummary'), chapters: ['library', 'downloads'] },
  { id: 'system', kind: 'settings', title: t('onboarding:guideTopics.systemTitle'), summary: t('onboarding:guideTopics.systemSummary'), chapters: ['network', 'app-maintenance', 'diagnostics'] },
];
export function contextualChapter(path: string): GuideChapter {
  if (path === '/') return INTERFACE_CHAPTERS[0]!;
  return SETTING_CHAPTERS.find(chapter => chapter.steps[0]?.route === path)
    || INTERFACE_CHAPTERS.find(chapter => chapter.id !== 'basics' && chapter.steps.some(item => item.route === path))
    || INTERFACE_CHAPTERS[0]!;
}
