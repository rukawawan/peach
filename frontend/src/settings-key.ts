/** 界面偏好在 localStorage 里的键。单独成模块：翻译入口要在偏好 store 之前同步读出界面语言，
 *  而偏好模块经导航词表间接依赖翻译入口，共用这个键时不能互相导入。 */
export const SETTINGS_KEY = 'peach.settings.v1';
