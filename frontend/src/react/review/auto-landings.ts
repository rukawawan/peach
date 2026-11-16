/* 复核页「自动写入的资料」的数据契约（ADR-0141）。
 *
 * 一个读端点、一个写端点。列表一行是一条自动写入：哪部作品的哪一格写成了什么。带 `items`
 * 读到的是这几条的撤回预览与 token；撤回把同一个 token 交回去，服务端在写锁里重算，对不上就拒绝。 */
import { apiGet, apiSend } from '../../api';
import { localTime } from '../time';
import { serverLabel } from '../../core/server-text';
import { joinList, quoted, t } from '../../i18n';

export const AUTO_LANDINGS_URL = '/api/review/auto-landings';
export const AUTO_LANDING_REVERT_URL = '/api/review/auto-landings/revert';
export const AUTO_LANDINGS_KEY = ['review', 'auto-landings'] as const;

interface AssetRef {
  asset_id: number | null;
  name: string;
  code: string;
  /** 作品已不在账本里。 */
  gone?: boolean;
}

export interface AutoLandingWrite extends AssetRef {
  item_key: string;
  rule: string;
  /** 规则写给人看的名字，`label_code` 是它的 code。 */
  label: string;
  label_code?: string;
  batch: string;
  /** 写入时刻，秒；读不出时为 null。 */
  at: number | null;
  /** 写的是哪一格：标题、发行日期，或「标签」；`field_code` 是它的 code。 */
  field: string;
  field_code?: string;
  /** 覆盖写下的值；并集是补上的标签连成的一串。 */
  value: string;
  /** 覆盖前的值，各文件不同时有几个列几个；并集为空。 */
  previous: string[];
  /** 并集补上的标签。 */
  tags: string[];
  /** 同一番号的几个文件一起写的，有几个。 */
  assets: number;
  preview_url: string;
}

interface Row extends AssetRef { asset_id: number }
/** 一格的名字：有 code 且有译文用译文，否则用服务端原文。 */
export const fieldName = (row: { field: string; field_code?: string }) => serverLabel(row.field_code ?? '', row.field);
/** 规则的名字。 */
export const ruleName = (item: AutoLandingWrite) => serverLabel(item.label_code ?? '', item.label);
export interface RestoreRow extends Row { field: string; field_code?: string; current: string; previous: string }
export interface ChangedRow extends Row { field: string; field_code?: string; written: string }
export interface TagRow extends Row { tag: string; batch: string }

export interface AutoLandingPreview {
  items: string[];
  token: string;
  decisions: number;
  restores: RestoreRow[];
  changed: ChangedRow[];
  tags: TagRow[];
}

export interface AutoLandingResult {
  ok: boolean;
  items: string[];
  restored: number;
  removed_tags: number;
  decisions: number;
  changed: ChangedRow[];
  backup: string;
}

export const fetchAutoLandings = (signal?: AbortSignal) =>
  apiGet<{ items: AutoLandingWrite[] }>(AUTO_LANDINGS_URL, signal);

export const previewAutoLandings = (items: string[]) =>
  apiGet<AutoLandingPreview>(`${AUTO_LANDINGS_URL}?items=${encodeURIComponent(items.join('\n'))}`);

/** 真实 ledger 写入：服务端先备份，再按预览的那份计划撤回。 */
export const revertAutoLandings = (items: string[], token: string) =>
  apiSend<AutoLandingResult>(AUTO_LANDING_REVERT_URL, { items, token });

export const writeTime = (item: AutoLandingWrite) =>
  item.at === null ? '' : localTime(new Date(item.at * 1000).toISOString());

export const workLabel = (row: AssetRef) =>
  row.code || row.name || (row.asset_id ? `#${row.asset_id}` : t('manage:autoLandings.unknownVideo'));
const shown = (value: string) => (value ? quoted(value) : t('manage:autoLandings.emptyValue'));

/** 这一条写下了什么：覆盖是新值，并集是补上的标签。 */
export const writtenText = (item: AutoLandingWrite) =>
  item.tags.length ? joinList(item.tags) : item.value;

/** 写入前的样子：覆盖写原值，并集写「只增不删」。 */
export const previousText = (item: AutoLandingWrite) => item.tags.length
  ? t('manage:autoLandings.existingTagsKept')
  : t('manage:autoLandings.previousValue', { value: item.previous.length ? joinList(item.previous.map(shown)) : t('manage:autoLandings.emptyValue') });

/** 确认弹层里逐条列出的改动：改回的值、删掉的标签，最后是不动的那几条。 */
export function previewLines(preview: AutoLandingPreview): string[] {
  return [
    ...preview.restores.map((row) => t('manage:autoLandings.previewRestore', { video: workLabel(row), field: fieldName(row), current: shown(row.current), previous: shown(row.previous) })),
    ...preview.tags.map((row) => t('manage:autoLandings.previewRemoveTag', { video: workLabel(row), tag: row.tag })),
    ...preview.changed.map((row) => row.gone
      ? t('manage:autoLandings.previewGone', { video: workLabel(row), field: fieldName(row) })
      : t('manage:autoLandings.previewEdited', { video: workLabel(row), field: fieldName(row) })),
  ];
}

export function previewBody(preview: AutoLandingPreview): string {
  const parts = [
    preview.restores.length ? t('manage:autoLandings.previewRestoreCount', { count: preview.restores.length }) : '',
    preview.tags.length ? t('manage:autoLandings.previewRemoveTags', { count: preview.tags.length }) : '',
  ].filter(Boolean);
  return [
    parts.length
      ? t('manage:autoLandings.previewRevert', { count: preview.decisions, details: parts.join(t('shell:format.clauseSeparator')) })
      : t('manage:autoLandings.previewRevertNothing', { count: preview.decisions }),
    preview.changed.length ? t('manage:autoLandings.previewUnchanged', { count: preview.changed.length }) : '',
    t('manage:autoLandings.revertBackupNote'),
  ].filter(Boolean).join(t('shell:format.sentenceGap'));
}

export function resultText(result: AutoLandingResult): string {
  const parts = [
    result.restored ? t('manage:autoLandings.resultRestoreCount', { count: result.restored }) : '',
    result.removed_tags ? t('manage:autoLandings.resultRemovedTags', { count: result.removed_tags }) : '',
  ].filter(Boolean);
  return parts.length
    ? t('manage:autoLandings.resultSummaryDetails', { count: result.decisions, details: parts.join(t('shell:format.clauseSeparator')) })
    : t('manage:autoLandings.resultSummary', { count: result.decisions });
}
