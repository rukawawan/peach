/* 复核页「自动写入的资料」的数据契约（ADR-0141）。
 *
 * 一个读端点、一个写端点。列表一行是一条自动写入：哪部作品的哪一格写成了什么。带 `items`
 * 读到的是这几条的撤回预览与 token；撤回把同一个 token 交回去，服务端在写锁里重算，对不上就拒绝。 */
import { apiGet, apiSend } from '../../api';
import { localTime } from '../time';

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
  /** 规则写给人看的名字。 */
  label: string;
  batch: string;
  /** 写入时刻，秒；读不出时为 null。 */
  at: number | null;
  /** 写的是哪一格：标题、发行日期，或「标签」。 */
  field: string;
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
export interface RestoreRow extends Row { field: string; current: string; previous: string }
export interface ChangedRow extends Row { field: string; written: string }
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
  row.code || row.name || (row.asset_id ? `#${row.asset_id}` : '未知作品');
const shown = (value: string) => (value ? `「${value}」` : '空');

/** 这一条写下了什么：覆盖是新值，并集是补上的标签。 */
export const writtenText = (item: AutoLandingWrite) =>
  item.tags.length ? item.tags.join('、') : item.value;

/** 写入前的样子：覆盖写原值，并集写「只增不删」。 */
export const previousText = (item: AutoLandingWrite) => item.tags.length
  ? '原有标签保留'
  : `原为 ${item.previous.length ? item.previous.map(shown).join('、') : '空'}`;

/** 确认弹层里逐条列出的改动：改回的值、删掉的标签，最后是不动的那几条。 */
export function previewLines(preview: AutoLandingPreview): string[] {
  return [
    ...preview.restores.map((row) => `${workLabel(row)} ${row.field}：${shown(row.current)} 改回 ${shown(row.previous)}`),
    ...preview.tags.map((row) => `${workLabel(row)} 删除标签「${row.tag}」`),
    ...preview.changed.map((row) => row.gone
      ? `${workLabel(row)} ${row.field}：作品已不在账本中，跳过`
      : `${workLabel(row)} ${row.field}：之后已被修改，保留现值`),
  ];
}

export function previewBody(preview: AutoLandingPreview): string {
  const parts = [
    preview.restores.length ? `改回 ${preview.restores.length} 条资料` : '',
    preview.tags.length ? `删除 ${preview.tags.length} 个自动补上的标签` : '',
  ].filter(Boolean);
  return [
    `将撤回 ${preview.decisions} 条自动写入：${parts.join('，') || '没有要改的资料'}。`,
    preview.changed.length ? `${preview.changed.length} 条资料写入后被修改过或作品已删除，不改动。` : '',
    '撤回前会自动备份账本。下一轮资料处理仍按同一判据判断，可能再次写入。',
  ].filter(Boolean).join('');
}

export function resultText(result: AutoLandingResult): string {
  const parts = [
    result.restored ? `改回 ${result.restored} 条资料` : '',
    result.removed_tags ? `删除 ${result.removed_tags} 个标签` : '',
  ].filter(Boolean);
  return `已撤回 ${result.decisions} 条自动写入${parts.length ? `：${parts.join('，')}` : ''}`;
}
