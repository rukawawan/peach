/** 首页新作卡的封面片段：本地封面、经 `/cover-image` 取的官方封面，或「抓取中」「无封面」占位。 */
export declare function feedNewCoverHtml(item: Record<string, unknown>): string;
/** 首页新作卡：番号与片名，不带版次与画质徽章——新作还没入库，没有文件可判。 */
export declare function feedNewCardHtml(item: Record<string, unknown>): string;
