/* 人工复核页的数据契约、分组分页纯函数与写操作。三条端点在 `frontend/src` 里都只在这里
 * 声明一次（`tests/test_frontend_build.py` 盯着）。
 *
 * `['review']` 是整条复核队列。接口一次给出全部分类的可复核行，不重复传候选 CSV 的
 *   JSON 字符串；各分类合在一个响应里，所以也只用一个 `queryKey`：分类切换是翻这一份的
 *   不同段落，不是另一份真相。判定写回来时只把那几行从缓存里摘掉（`dropReviewRows`），
 *   不为一次判定把整条队列重取一遍。
 *
 * 分组、筛选、分页都是纯函数：工具条上的计数说的是整条队列，卡片只画当前这一页，两边
 * 用同一套判据算，各写一份迟早对不上。 */
import { apiGet, apiSend } from '../../api';
import { clampPage, pageCount } from '../../pagination';
import { selectRange } from '../../selection';
import { queryClient } from '../query';
import { localTime } from '../time';
import { t } from '../../i18n';
import { codedText, partsLabel, serverLabel, type TextPart } from '../../core/server-text';

export const REVIEW_URL = '/api/review';
export const REVIEW_DECISION_URL = '/api/review/decision';
export const REVIEW_GENRE_URL = '/api/review/genre';

/** 整条复核队列。 */
export const REVIEW_KEY = ['review'] as const;

/** 复核分类与它们在界面上的名字。次序就是页签次序。 */
export const REVIEW_LABELS = {
  metadata_fields: t('manage:reviewQueue.metadataFields'),
  creator_tags: t('manage:reviewQueue.creatorTags'),
  code_creators: t('manage:reviewQueue.codeCreators'),
  western_identity: t('manage:reviewQueue.westernIdentity'),
  performer_avatars: t('manage:taskSummary.actressAvatars'),
  studio_logos: t('manage:reviewQueue.studioLogos'),
  fc2_markings: t('manage:reviewQueue.fc2Markings'),
  fc2_similarity: t('manage:reviewQueue.fc2Similarity'),
  video_endcards: t('manage:reviewQueue.videoEndcards'),
} as const;

export type ReviewCategory = keyof typeof REVIEW_LABELS;

export const REVIEW_CATEGORIES = Object.keys(REVIEW_LABELS) as ReviewCategory[];

export const DEFAULT_CATEGORY: ReviewCategory = 'metadata_fields';

export const isReviewCategory = (value: unknown): value is ReviewCategory =>
  typeof value === 'string' && Object.hasOwn(REVIEW_LABELS, value);

/** 主体是实体而不是单条作品的分类，值就是实体 kind。这张表与 `web_review.py` 的
 *  `ENTITY_REVIEW_KINDS` 必须逐字一致：这边判成 creator、取图按 performer，
 *  就是标志说有图而请求照样 404。 */
export const ENTITY_REVIEW_KINDS: Partial<Record<ReviewCategory, string>> = {
  creator_tags: 'creator', western_identity: 'creator',
};

/** 默认每页 20 张；接口读取整条队列，页面按所选数量挂载候选表单。 */
export const REVIEW_PAGE_SIZE = 20;

/** 来源顺带交回的一项旁证：`display_value`、`warnings` 是 zh-CN 原句，旁边的 code 与参数给当前语言。 */
export interface CatalogEvidence {
  display_value?: string; display_value_code?: string; display_value_params?: Record<string, unknown>;
  warnings?: string[]; warning_codes?: (string | null)[]; warning_params?: (Record<string, unknown> | null)[];
}

/** 一个来源给出的候选值。选中它就是把 `display_value` 写进数据库。 */
export interface ReviewCandidate {
  candidate_key: string;
  source?: string;
  official?: boolean;
  content_id?: string;
  provider_id?: string;
  display_value?: string;
  warnings?: string[];
  warning_codes?: (string | null)[];
  warning_params?: (Record<string, unknown> | null)[];
  /** 同一来源顺带交回来的其它字段，只作判断依据。 */
  catalog_evidence?: Record<string, CatalogEvidence>;
  /** 静态词表还没收录的 genre。 */
  unmapped_genres?: string[];
}

/** 卡片上那几张图背后的作品。 */
export interface ReviewAsset {
  id: number;
  name?: string;
  code?: string;
  preview_url?: string;
  has_preview?: boolean;
}

/** 队列里的一行。字段以 `src/peach/web_review.py` 的 `_review_rows` 为准，各分类共用这一份
 *  形状，用不上的项缺席。 */
export interface ReviewRow {
  item_key: string;
  queue_order?: number;
  decision?: string;
  status?: string;
  candidates?: ReviewCandidate[];
  field?: string;
  field_label?: string;
  current_value?: string;
  current_owner?: string;
  query?: string;
  code?: string;
  creator?: string;
  studio?: string;
  current_name?: string;
  name?: string;
  board?: string;
  source?: string;
  /** 数据库规范名当标题时，来源自己的写法留在这里。 */
  source_name?: string;
  /** 竖线分隔的候选标签。 */
  tags?: string;
  reason?: string;
  /** 服务端拼的证据句（`reason`）按段的 code；`text` 是来源原文。 */
  reason_parts?: TextPart[];
  evidence?: string;
  note?: string;
  decision_note?: string;
  japanese_name?: string;
  path?: string;
  suggested_query?: string;
  preview_url?: string;
  preview_assets?: ReviewAsset[];
  comparison_assets?: ReviewAsset[];
  asset_id?: number;
  asset_name?: string;
  asset_preview_url?: string;
  asset_path?: string;
  asset_mutation_revision?: number | null;
  entity_id?: number;
  has_image?: boolean;
  image_version?: string;
  avatar_focus?: unknown;
  avatar_url?: string;
  video_count?: number;
  videos?: number | string;
  assets?: number;
  babepedia_name?: string;
  profile_url?: string;
}

/** 只读端读到的是写入端队列的镜像，页面要说清这一份是实时的还是缓存的。 */
export interface ReviewMirror {
  state?: string;
  origin?: string | null;
  fetched_at?: string | null;
  error?: string | null;
  error_code?: string | null;
  error_params?: Record<string, unknown> | null;
  read_only?: boolean;
}

export const REVIEW_QUEUES = ['pending', 'later', 'ignored'] as const;
export type ReviewQueue = typeof REVIEW_QUEUES[number];
export const REVIEW_QUEUE_LABELS: Record<ReviewQueue, string> = {
  pending: t('manage:reviewQueue.pending'), later: t('manage:reviewQueue.later'), ignored: t('manage:reviewQueue.ignored'),
};
export const REVIEW_DECISION_LABELS: Record<string, string> = {
  approved: t('manage:reviewQueue.approved'), rejected: t('manage:reviewQueue.ignored'), skipped: t('manage:reviewQueue.decisionLater'),
};
export const reviewQueueOf = (value: unknown): ReviewQueue =>
  value === 'later' || value === 'ignored' ? value : 'pending';

export interface ReviewQueueData {
  sections: Partial<Record<ReviewCategory, ReviewRow[]>>;
  counts: Partial<Record<ReviewCategory, number>>;
}

export interface ReviewData extends ReviewQueueData {
  queues: Record<Exclude<ReviewQueue, 'pending'>, ReviewQueueData>;
  /** 收录 genre 时的候选词表：静态表已经投影到的那批内容标签。 */
  genre_tags?: string[];
  mirror?: ReviewMirror | null;
}

export const reviewQueueData = (data: ReviewData, queue: ReviewQueue): ReviewQueueData =>
  queue === 'pending' ? { sections: data.sections, counts: data.counts } : data.queues[queue];

function mapReviewQueues(data: ReviewData, transform: (snapshot: ReviewQueueData) => ReviewQueueData): ReviewData {
  return { ...data, ...transform(reviewQueueData(data, 'pending')),
    queues: { later: transform(data.queues.later), ignored: transform(data.queues.ignored) } };
}

/* ── 分组、筛选、分页 ── */

export type ReviewGrouping = 'candidates' | 'source' | 'field';

export interface ReviewGroup { key: string; title: string; rows: ReviewRow[] }

/** 这一批队列能按什么分组。按来源、按字段两档要队列里真有那一项才出现。 */
export function reviewGroupingOptions(rows: ReviewRow[], metadata: boolean): [ReviewGrouping, string][] {
  const options: [ReviewGrouping, string][] = [
    ['candidates', metadata ? t('manage:reviewQueue.bySourceCount') : t('manage:reviewQueue.noGrouping')],
  ];
  if (rows.some((row) => row.source || row.candidates?.some((candidate) => candidate.source))) {
    options.push(['source', t('manage:reviewQueue.bySource')]);
  }
  if (rows.some((row) => row.field)) options.push(['field', t('manage:reviewQueue.byField')]);
  return options;
}

/** 按来源组合分组，每个作品字段只出现一次。 */
export function groupReviewRows(rows: ReviewRow[], by: ReviewGrouping): ReviewGroup[] {
  const groups = new Map<string, ReviewGroup>();
  for (const row of rows) {
    let key: string;
    let title: string;
    if (by === 'field') {
      key = row.field || '__unspecified_field';
      title = fieldName(row) || t('manage:reviewQueue.unspecifiedField');
    } else if (by === 'source') {
      const sources = [...new Set((row.candidates?.map((candidate) => candidate.source || '')
        || [row.source || '']).filter(Boolean))].sort();
      key = JSON.stringify(sources);
      title = sources.join(' / ') || t('manage:reviewQueue.unspecifiedSource');
    } else {
      key = row.candidates ? (row.candidates.length === 1 ? 'single' : 'multiple') : 'pending';
      title = key === 'single' ? t('manage:reviewQueue.singleSource') : key === 'multiple' ? t('manage:reviewQueue.chooseSource') : t('manage:scanFetch.slowWhatMetadata');
    }
    if (!groups.has(key)) groups.set(key, { key, title, rows: [] });
    groups.get(key)!.rows.push(row);
  }
  return [...groups.values()];
}

/** 先按分组筛，再切页。顺序反过来的话，筛选说的就成了「这一屏里符合的那几条」。 */
export function filterReviewRows(
  rows: ReviewRow[], by: ReviewGrouping, filter: string,
): ReviewRow[] {
  if (!filter) return rows;
  return groupReviewRows(rows, by).find((group) => group.key === filter)?.rows || rows;
}

export interface ReviewWindow { page: number; pages: number; rows: ReviewRow[] }

/** 按每页数量切片，页码越界时收回到最后一页。 */
export function reviewWindow(rows: ReviewRow[], page: number, pageSize = REVIEW_PAGE_SIZE): ReviewWindow {
  const pages = pageCount(rows.length, pageSize);
  const current = clampPage(page, pages);
  return {
    page: current,
    pages,
    rows: rows.slice((current - 1) * pageSize, current * pageSize),
  };
}

/** 所选项目都有、且各自只出现一次的来源。统一选来源只能在这些里选：同一来源在一行里
 *  给了两个值时，「统一选 javdb」就没有唯一答案。 */
export function commonReviewSources(rows: ReviewRow[]): string[] {
  if (!rows.length) return [];
  return [...new Set(rows.flatMap((row) => row.candidates?.map((candidate) => candidate.source || '') || []))]
    .filter((source) => source && rows.every(
      (row) => row.candidates?.filter((candidate) => candidate.source === source).length === 1));
}

/** Shift 按当前显示顺序扩展选择，与馆藏页同一套语义。返回新的锚点。 */
export function selectReviewRange(
  selected: Set<string>, keys: string[], anchor: string | null,
  key: string, range: boolean, checked: boolean,
): string {
  return selectRange(selected, keys, anchor, key, range, checked);
}

/* ── 一行能做什么 ── */

/** 这一行能不能通过。元数据字段要有候选；创作者标签只判 `candidate` 状态的那些。 */
export function canApprove(category: ReviewCategory, row: ReviewRow): boolean {
  if (category === 'metadata_fields') return (row.candidates?.length || 0) > 0;
  if (category === 'creator_tags') return String(row.status || '').trim() === 'candidate';
  return true;
}

/** 这一行的标题读作「问的是什么」。字段名是问题本身，作品标识只是它问的对象。 */
export function rowSubject(category: ReviewCategory, row: ReviewRow): string {
  if (category === 'metadata_fields') return String(row.query || row.code || '');
  return String(row.creator || row.studio || row.current_name || row.name || row.item_key);
}

/** 候选表 `field` 列的字段 id 到显示名的 code（`server.json`，与自动写入页同一份）。 */
const FIELD_NAME_CODES: Readonly<Record<string, string>> = {
  title: 'labels.webAutoLandings.fieldTitle', original_title: 'labels.webAutoLandings.fieldOriginalTitle',
  performers: 'labels.webAutoLandings.fieldPerformers', studio: 'labels.webAutoLandings.fieldStudio',
  series: 'labels.webAutoLandings.fieldSeries', release_date: 'labels.webAutoLandings.fieldReleaseDate',
  tags: 'labels.webAutoLandings.fieldTags',
};

/** 字段名按当前语言取；候选表里登记之外的字段照原样显示脚本写的 `field_label`。 */
export function fieldName(row: ReviewRow): string {
  const field = row.field || '';
  const original = String(row.field_label || field).trim();
  return Object.hasOwn(FIELD_NAME_CODES, field) ? serverLabel(FIELD_NAME_CODES[field]!, original) : original;
}

export const rowFieldName = (category: ReviewCategory, row: ReviewRow): string =>
  (category === 'metadata_fields' ? fieldName(row) : '');

export function rowTitle(category: ReviewCategory, row: ReviewRow): string {
  const subject = rowSubject(category, row);
  const field = rowFieldName(category, row);
  return field ? `${subject} · ${field}` : subject;
}

/** 证据句逐段取译文（`partsLabel`）：缺一段译文就整句用服务端原文。 */
export const rowEvidence = (row: ReviewRow): string =>
  partsLabel(row.reason_parts, row.reason || '') || row.evidence || row.note || row.decision_note || '';

export const rowTags = (row: ReviewRow): string[] =>
  String(row.tags || '').split('|').filter(Boolean);

/** 这一行等着被收录的 genre。同一个词在几个来源里各出现一次时只问一遍。 */
export const pendingGenres = (row: ReviewRow): string[] =>
  [...new Set((row.candidates || []).flatMap((candidate) => candidate.unmapped_genres || []))];

/** 一行此刻的选择：选了哪个来源值、勾了哪几条作品。 */
export interface RowChoice { candidateKey: string; assets: number[] }

/** 还没动过的行按默认值算：只有一个候选时它就是选中的那个，作品样本默认全勾。 */
export function defaultChoice(row: ReviewRow): RowChoice {
  const candidates = row.candidates || [];
  return {
    candidateKey: candidates.length === 1 ? candidates[0]!.candidate_key : '',
    assets: (row.preview_assets || []).map((asset) => asset.id),
  };
}

export type DecisionStatus = 'approved' | 'rejected' | 'skipped' | 'restore';

/** 交给 `/api/review/decision` 的那一份。
 *
 *  乐观并发只在这一行钉死了一条资产时带上：按番号命中多条的组没有单一 revision 可报，
 *  硬报一个只会在同番号分卷上换来一串假冲突。 */
export function decisionPayload(
  category: ReviewCategory, row: ReviewRow, status: DecisionStatus, choice: RowChoice,
): Record<string, unknown> {
  const pinned = !!row.asset_path && row.asset_mutation_revision != null;
  return {
    category,
    item_key: row.item_key,
    status,
    candidate_key: choice.candidateKey,
    creator: row.creator,
    tags: row.tags,
    studio: row.studio,
    entity_id: row.entity_id,
    avatar_url: row.avatar_url,
    selected_ids: choice.assets,
    ...(pinned ? { expected_revision: row.asset_mutation_revision } : {}),
  };
}

export const decisionReceipt = (status: DecisionStatus): string => ({
  approved: t('manage:reviewQueue.receiptApproved'), rejected: t('manage:reviewQueue.receiptIgnored'), skipped: t('manage:reviewQueue.receiptLater'), restore: t('manage:reviewQueue.receiptPending'),
})[status];

/* ── 取数与写操作 ── */

export async function fetchReview(signal?: AbortSignal): Promise<ReviewData> {
  const data = await apiGet<ReviewData>(REVIEW_URL, signal);
  for (const key of ['later', 'ignored'] as const) {
    if (!data.queues?.[key]?.sections || !data.queues[key].counts) {
      throw new Error(t(key === 'later' ? 'manage:reviewQueue.laterStatusNotFound' : 'manage:reviewQueue.ignoredStatusNotFound'));
    }
  }
  return data;
}

export interface DecisionResult {
  ok: boolean;
  error?: string;
  asset_revisions?: Record<string, { before: number; after: number }>;
}

export async function submitDecision(payload: Record<string, unknown>): Promise<DecisionResult> {
  const result = await apiSend<DecisionResult>(REVIEW_DECISION_URL, payload);
  if (result.ok && result.asset_revisions) {
    const revisions = result.asset_revisions;
    queryClient.setQueryData<ReviewData>(REVIEW_KEY, (data) => data && mapReviewQueues(data, snapshot => ({
      ...snapshot,
      sections: {
        ...snapshot.sections,
        metadata_fields: snapshot.sections.metadata_fields?.map((row) => {
          const change = revisions[String(row.asset_id)];
          return row.asset_path && change && row.asset_mutation_revision === change.before
            ? { ...row, asset_mutation_revision: change.after } : row;
        }),
      },
    })));
  }
  return result;
}

/** 批量队列保留行身份；并发凭据来自共享缓存里的最新回执。 */
export function currentReviewRow(category: ReviewCategory, row: ReviewRow): ReviewRow {
  const data = queryClient.getQueryData<ReviewData>(REVIEW_KEY);
  return data ? REVIEW_QUEUES.flatMap(key => reviewQueueData(data, key).sections[category] || [])
    .find(item => item.item_key === row.item_key) || row : row;
}

/** 收录一个 genre（给中文名）或把它判成非内容（`tag` 留空）。 */
export const recordGenre = (genre: string, tag: string) =>
  apiSend<DecisionResult>(REVIEW_GENRE_URL, { genre, tag });

/** 首屏只读复核队列。符合 ADR-0018 的候选已在扫描与资料处理结束时落库。 */
export async function prefetchReview(signal: AbortSignal): Promise<void> {
  await queryClient.fetchQuery({ queryKey: REVIEW_KEY, queryFn: () => fetchReview(signal) });
}

/** 判过的行从缓存里摘掉并同步计数。留在队列里的话，看起来就像这一次判定没生效。
 *
 *  失败的那几条不动：它们还要留在屏幕上供重试。 */
export function dropReviewRows(category: ReviewCategory, keys: string[]): void {
  settleReviewRows(category, keys, 'approved');
}

/** 一份响应内移动状态，三个队列的行与计数同时更新；失败的行保持原位。 */
export function settleReviewRows(category: ReviewCategory, keys: string[], status: DecisionStatus): void {
  const gone = new Set(keys);
  if (!gone.size) return;
  queryClient.setQueryData<ReviewData>(REVIEW_KEY, (data) => {
    if (!data) return data;
    const moved = REVIEW_QUEUES.flatMap(key => reviewQueueData(data, key).sections[category] || [])
      .filter(row => gone.has(row.item_key));
    if (!moved.length) return data;
    const target = { skipped: 'later', rejected: 'ignored', restore: 'pending', approved: null }[status];
    const snapshots = Object.fromEntries(REVIEW_QUEUES.map(key => {
      const snapshot = reviewQueueData(data, key);
      const kept = (snapshot.sections[category] || []).filter(row => !gone.has(row.item_key));
      const rows = target === key ? [...kept, ...moved.map(row => ({ ...row,
        decision: status === 'restore' ? 'pending' : status, decision_note: '' }))] : kept;
      rows.sort((a, b) => (a.queue_order ?? 0) - (b.queue_order ?? 0));
      return [key, { ...snapshot, sections: { ...snapshot.sections, [category]: rows },
        counts: { ...snapshot.counts, [category]: rows.length } }];
    })) as Record<ReviewQueue, ReviewQueueData>;
    return { ...data, ...snapshots.pending, queues: { later: snapshots.later, ignored: snapshots.ignored } };
  });
}

/** 收录一个 genre 改的是词表，不是某一条候选：服务端按新词表重新折一遍整条队列
 *  （`_fold_genre_decisions`），所以这里重取队列而不是在前端自己折。同一份判据写两遍
 *  迟早对不上，而对不上的表现是「页面上标签多了一个，批准写下去的还是旧的」。 */
export const reloadReview = (): Promise<void> =>
  queryClient.invalidateQueries({ queryKey: REVIEW_KEY, exact: true });

/** 只读端那句话：实时镜像、缓存快照，还是连镜像都没取到。 */
export function mirrorText(
  mirror: ReviewMirror | null | undefined, readOnlyMessage: string,
): string {
  if (mirror?.state === 'live') return t('manage:reviewQueue.mirrorLive');
  if (mirror?.state === 'cached') return t('manage:reviewQueue.mirrorCached', { time: localTime(mirror.fetched_at) });
  return (mirror?.error ? codedText(mirror, 'error') : '') || readOnlyMessage;
}
