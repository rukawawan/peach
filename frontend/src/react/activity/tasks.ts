/* 任务中心的数据契约与折算：`/api/tasks` 一次请求供整页三段使用。
 *
 * 分三次取会出现「在跑那段是新的、完成那段是旧的」这种自相矛盾的一屏，所以只有一个
 * queryKey。首屏由 `prefetchTasks` 写进 Query 缓存，组件挂上去读的就是它。 */
import { apiGet, apiSend } from '../../api';
import { fmtSize } from '@peach/legacy/core';
import { requestErrorMessage } from '../../core/request-error';
import { queryClient } from '../query';
import type { ProcessingSpeed } from '../library-processing/library-processing';

export const TASKS_URL = '/api/tasks';
/** 整页共用这一个键：三段是同一次响应的三个字段。 */
export const TASKS_KEY = ['tasks'] as const;

export type TaskControlAction = 'pause' | 'resume' | 'cancel';
export type TaskControlState = 'running' | 'pausing' | 'paused' | 'cancelling';
export type TaskResourceState = 'ready' | 'sampling' | 'unavailable';
/** `via` 只出现在未取得的网络读数上：`cloud` 是从网盘挂载读的，网速无法按任务计量。 */
export interface TaskResourceMetric { state: TaskResourceState; high: boolean; reason?: string; via?: 'cloud' }
export interface TaskPercentMetric extends TaskResourceMetric { percent: number | null }
export interface TaskResourcesPayload {
  cpu: TaskPercentMetric;
  gpu: TaskPercentMetric;
  network: TaskResourceMetric & { bytes_per_second: number | null };
  sampled_at: string;
}

export interface TaskRunPayload {
  id: number;
  task_key: string;
  task_label: string;
  trigger: string;
  status: string;
  host: string;
  started_at: string | null;
  finished_at: string | null;
  elapsed_seconds: number | null;
  progress_current: number | null;
  progress_total: number | null;
  progress_label: string;
  result_summary: Record<string, unknown>;
  error: string;
  /** 派出这一轮的父任务；不是后继时为 null（ADR-0040）。 */
  parent_run_id: number | null;
  root_run_id: number | null;
  /** 这条后继要做的那件事的全名。不是后继时是空串，界面据此判断它挂不挂到父卡片下。 */
  followup_key: string;
  followup_depth: number;
  /** 服务端给出当前控制状态与可用动作，界面不按任务种类推断。 */
  control?: { state: TaskControlState; actions: (TaskControlAction | 'set_speed')[]; speed_mode?: ProcessingSpeed };
  /** 只投影可归属的实测读数；缺失字段代表该快照未提供资源采样。 */
  resources?: TaskResourcesPayload;
}

export interface ActivityData {
  finished_total?: number;
  finished_page?: number;
  available: boolean;
  result_versions?: Record<string, string>;
  message?: string;
  running: TaskRunPayload[];
  skipped: TaskRunPayload[];
  finished: TaskRunPayload[];
  /** 「最近完成」这一页后面还有更早的。 */
  finished_has_more?: boolean;
  /** 自己已结束、后继还在排或在跑的父任务里，不在 `running` 与 `finished` 这一页上的那些。 */
  working_parents?: TaskRunPayload[];
  /** 父任务 id → 它直接派出的后继按状态各几条。下发的后继只是一部分，进度与「还在不在跑」看这份。 */
  followup_counts?: FollowupCounts;
  /** 逐部到来的入库通知：云下载整理完成、推送发现登记的新影片。`epoch` 换了表示服务重启过。 */
  ingest_notices?: { epoch: string; items: IngestNotice[] };
}

export interface IngestNotice { id: number; kind: 'download' | 'discovered'; asset_id: number; label: string; at: number }

export type FollowupCounts = Record<string, Record<string, number>>;

/** 几轮派出的后继合在一起数：共几条、结束了几条、还有几条在排或在跑。 */
export function followupTally(counts: FollowupCounts | undefined, runs: TaskRunPayload[]) {
  let total = 0, active = 0, failed = 0, cancelled = 0;
  for (const run of runs) {
    for (const [status, count] of Object.entries(counts?.[String(run.id)] || {})) {
      total += count;
      if (status === 'pending' || status === 'running') active += count;
      if (status === 'failed' || status === 'interrupted') failed += count;
      if (status === 'cancelled') cancelled += count;
    }
  }
  return { total, active, failed, cancelled, settled: total - active };
}

/** 同一种任务连着派出的几轮合成一件事：自动修复每分钟派一批，一屏十几张「已完成」卡说的是同一件事。
 *  每组按最新那一轮排在前面，`runs[0]` 是最新那一轮。`split` 再按它的值分组，同一种任务值不同的分开。 */
export function foldByKind(rows: TaskRunPayload[], split: (run: TaskRunPayload) => string = () => ''): RunFold[] {
  const folds = new Map<string, RunFold>();
  for (const run of rows) {
    const key = `${run.task_key}\u0000${split(run)}`;
    const fold = folds.get(key);
    if (fold) fold.runs.push(run);
    else folds.set(key, { run, runs: [run] });
  }
  return [...folds.values()];
}

/** 有东西在跑就两秒一次（和进度写库的节流同一个数），全是终态时十秒一次。 */
export const RUNNING_POLL_MS = 2000;
export const SETTLED_POLL_MS = 10000;
export const pollInterval = (data: ActivityData | undefined): number =>
  data?.running?.length ? RUNNING_POLL_MS : SETTLED_POLL_MS;

export const fetchTasks = (signal?: AbortSignal, page = 1, limit = 20) =>
  apiGet<ActivityData>(page === 1 && limit === 20 ? TASKS_URL : `${TASKS_URL}?page=${page}&limit=${limit}`, signal);

/** 每个页面常驻轮询的那一小份：结果版本、入库通知与有没有任务在排或在跑。完整任务列表只给任务中心。 */
export const RESULT_UPDATES_KEY = ['result-updates'] as const;
export type ResultUpdatesData = Pick<ActivityData, 'result_versions' | 'ingest_notices'> & { busy?: boolean };
export const fetchResultUpdates = (signal?: AbortSignal) =>
  apiGet<ResultUpdatesData>('/api/result-updates', signal);

export const controlTask = (id: number, action: TaskControlAction, signal?: AbortSignal) =>
  apiSend(`${TASKS_URL}/${id}/control`, { action }, 'POST', signal);

export const setTaskSpeed = (id: number, speed: ProcessingSpeed) =>
  apiSend(`${TASKS_URL}/${id}/control`, { action: 'set_speed', speed_mode: speed }, 'POST');

/** 首屏：取完数才画。中止时 `fetchQuery` 把 `AbortError` 抛回给挂载方，它据此放弃这一次。 */
export async function prefetchTasks(signal: AbortSignal): Promise<void> {
  await queryClient.fetchQuery({ queryKey: TASKS_KEY, queryFn: () => fetchTasks(signal) });
}

export const TRIGGER_LABELS: Record<string, string> = {
  manual: '手动', scheduled: '定时', startup: '启动', cli: '命令行',
};

const STATUS_LABELS: Record<string, string> = {
  pending: '排队中', running: '进行中', succeeded: '已完成',
  failed: '失败', cancelled: '已取消', interrupted: '意外中断',
};

/** 状态的中文名。表里的状态集是封闭的，认不出来只可能是表先改了，那就原样显示。 */
export const statusLabel = (status: string): string => STATUS_LABELS[status] || status;

/* 主摘要使用已定义的中文字段；原始状态字典由技术详情保留。 */
const SUMMARY_LABELS: Record<string, string> = {
  checked: '已检查', total: '总数', scanned: '已扫描', identified: '已识别',
  candidates: '作品资料', covers: '封面', changed: '已改动', operation: '操作',
  ok: '取得', miss: '未取得', kept: '保留', planned: '计划', done: '已处理', added: '新增',
  written: '已保存', removed: '已移除', issue_count: '需要处理',
  followups_duplicate: '补充任务已在排队', followups_truncated: '补充任务超出数量上限',
  followups_depth_exceeded: '补充任务超出层级上限', name: '名称',
  matched: '匹配项', size: '尺寸', source: '来源', cover_network: '封面图片连接失败',
  probed: '已读取媒体信息', previews: '预览图', paused_count: '等待来源恢复',
  auto_applied: '已自动保存', auto_rejected: '未采用', performer_avatars: '女优头像',
  performer_profile_failed: '女优资料采集失败', performer_aliases: '女优别名',
  performer_profile_conflicts: '女优资料待复核', conflicts: '待复核冲突',
  gone_count: '链接已失效', unclear_count: '链接访问失败',
  source_failed: '来源检查失败', source_warning: '来源补查失败',
  resolve_failed: '查找失败', sources_found: '找到来源',
  warning_count: '需要留意', profiles_checked: '已读取浏览器资料',
  missing: '文件已丢失', purge: '可删除记录', vanish: '需保留个人记录',
  empty: '空目录', unreadable: '无法读取', cache_files: '可清理缓存文件',
  cache_bytes: '可清理缓存大小', bytes_reclaimed: '已释放空间',
  cache_removed: '已清理缓存文件', cache_blocked_count: '缓存清理失败', files_removed: '已删除文件',
  purged: '已删除记录', vanished: '已标记文件丢失', reattached: '已转移记录',
  blocked_count: '未能删除记录', dirs_removed: '已删除空目录', dir_errors: '目录清理失败',
  marked: '已标记失效', recovered: '复查后可访问', entities: '涉及资料',
  found: '发现待修复文件', repaired: '已修复', failed: '失败', missing_tool: '缺少修复工具',
  moved: '已整理文件', restored: '已还原', skipped: '已跳过', made: '已生成预览图',
  fetched: '已取得资料', updated: '已更新', discovered: '发现作品', without_code: '未识别番号',
  incomplete: '资料或封面未取得',
  result: '结果',
};

const PROBLEM_COUNTS = [
  'gone_count', 'unclear_count', 'source_failed', 'source_warning', 'resolve_failed',
  'warning_count', 'missing', 'unreadable', 'cache_blocked_count', 'blocked_count', 'dir_errors',
  'failed', 'missing_tool', 'issue_count', 'cover_network', 'performer_profile_failed',
  'performer_profile_conflicts', 'conflicts', 'paused_count', 'miss', 'incomplete',
];

/** 这一轮缺了一项能力，结论按退回的旧判据得出。数字为 0 也算问题：没做成的不是那几件，是整件。 */
const PROBLEM_FLAGS = ['face_match_unavailable'];

/** 完成检查与检查结果有问题是两件事，问题不能被例行折叠隐藏。 */
export const hasResultProblems = (run: TaskRunPayload): boolean => run.result_summary?.ok === false
  || Boolean(run.result_summary?.error)
  || PROBLEM_FLAGS.some((key) => run.result_summary?.[key] === true)
  || PROBLEM_COUNTS.some((key) => Number(run.result_summary?.[key]) > 0);

export interface TaskIssue { source: number; label: string; provider: string; kind: string; error: string }

/** 问题明细绑定本轮快照，当前来源状态由对应管理页查看。 */
export function taskIssues(run: TaskRunPayload): TaskIssue[] {
  const issues = run.result_summary?.issues;
  return Array.isArray(issues) ? issues.filter((item): item is TaskIssue => !!item
    && typeof item === 'object' && typeof item.error === 'string' && typeof item.label === 'string') : [];
}

/** 处理入口只对同一种任务最新那一轮有意义的任务：目标页只显示最新一轮，更早的失败已经被后来的结果取代。
 *  扫描与采集卡片上的问题清单与「重试未完成项」只认最新一轮的失败集合。 */
const LATEST_ONLY = new Set(['library-processing']);

export function problemDestination(run: TaskRunPayload, latest = true): { href: string; label: string } | null {
  if (!hasResultProblems(run) && run.status !== 'failed') return null;
  if (LATEST_ONLY.has(run.task_key) && !latest) return null;
  const targets: Record<string, [string, string]> = {
    'link-check': ['/data-cleanup#link-manager', '查看有问题的链接'],
    'link-prune': ['/data-cleanup#link-manager', '查看有问题的链接'],
    // 「需要处理」不收这里的可重试项：问题清单有几百项，先看清单再在那张卡上重试。
    'library-processing': ['/data-cleanup#libraryProcessing', '查看未完成项'],
    'follow-check': ['/subscriptions', '查看关注来源'],
    'feed-check': ['/subscriptions', '查看订阅源'],
    'follow-resolve': ['/subscriptions?tab=add', '查看来源查找'],
    'resource-scan': ['/data-cleanup#resource-sync', '查看资源同步'],
    'resource-apply': ['/data-cleanup#resource-sync', '查看资源同步'],
    'media-repair': ['/data-cleanup#mediaRepair', '查看媒体修复'],
    'taste-refresh': ['/taste', '查看口味数据来源'],
    'follow-evidence-reclaim': ['/settings/maintenance/repairs', '查看修复与迁移'],
  };
  const target = targets[run.task_key];
  return target ? { href: target[0], label: target[1] } : null;
}

/** 这一轮只处理一部作品时，摘要里带它的 `asset_id` 与文件名，任务卡据此链接到作品详情。 */
export function taskSubject(run: TaskRunPayload): { href: string; label: string } | null {
  const id = run.result_summary?.asset_id;
  const name = run.result_summary?.name;
  return typeof id === 'number' && Number.isInteger(id) && id > 0 && typeof name === 'string' && name
    ? { href: `/assets/${id}`, label: name } : null;
}

/** `LATEST_ONLY` 里每种任务最新那一轮的 id。后继不算：它们挂在父任务下，不是这种任务的一轮。 */
export function latestOfKind(rows: TaskRunPayload[]): Set<number> {
  const newest = new Map<string, number>();
  for (const row of rows) {
    if (LATEST_ONLY.has(row.task_key) && !row.followup_key
        && row.id > (newest.get(row.task_key) ?? 0)) newest.set(row.task_key, row.id);
  }
  return new Set(newest.values());
}

/** 把一批任务按 `parent_run_id` 归到各自的父任务下。没有父的那些留在外面。 */
export function groupFollowups(rows: TaskRunPayload[]): Map<number, TaskRunPayload[]> {
  const grouped = new Map<number, TaskRunPayload[]>();
  for (const row of rows) {
    if (!row.followup_key || row.parent_run_id == null) continue;
    const siblings = grouped.get(row.parent_run_id);
    if (siblings) siblings.push(row);
    else grouped.set(row.parent_run_id, [row]);
  }
  return grouped;
}

/** 连着的几轮收成一张卡：`runs[0]` 是最新那一轮。 */
export interface RunFold { run: TaskRunPayload; runs: TaskRunPayload[] }

/** 「最近完成」按时间顺序折叠：一段连续的例行轮次里，同一种任务并成一张卡，摆在它
 *  最新那一轮的位置上。任何一轮不是例行的（手动、失败、有新增或派了后继）都会截断这一段
 *  ——折叠只收「按时跑了、什么也没发生」的那些，有事的那一轮必须单独看得见。 */
export function foldRoutine(rows: TaskRunPayload[],
                            routine: (run: TaskRunPayload) => boolean): RunFold[] {
  const folds: RunFold[] = [];
  let open = new Map<string, RunFold>();
  for (const run of rows) {
    if (!routine(run)) {
      open = new Map();
      folds.push({ run, runs: [run] });
      continue;
    }
    const fold = open.get(run.task_key);
    if (fold) fold.runs.push(run);
    else {
      const started = { run, runs: [run] };
      open.set(run.task_key, started);
      folds.push(started);
    }
  }
  return folds;
}

/** 按时跑完、什么也没发生的一轮：定时触发、成功、没有新增也没派后继。 */
export const isRoutine = (run: TaskRunPayload) => run.trigger === 'scheduled'
  && run.status === 'succeeded' && !run.error
  && !hasResultProblems(run)
  && !(Number(run.result_summary?.added) > 0) && !(Number(run.result_summary?.followups) > 0);

export const isActive = (run: TaskRunPayload) => run.status === 'pending' || run.status === 'running';

/** 后继那一行的说明：它在做哪一件（标签去掉与任务名重复的前缀）、做到第几项或结果如何。
 *  标题已经是任务名，这里再写一遍「新作资料采集：」读起来就是同一句话说了两次。 */
export function followupDetail(row: TaskRunPayload): string {
  const prefix = `${row.task_label}：`;
  const label = row.progress_label || '';
  const item = String(row.result_summary?.name || '')
    || (label.startsWith(prefix) ? label.slice(prefix.length) : label === row.task_label ? '' : label);
  const total = row.progress_total || 0;
  const { name: _name, ...result } = row.result_summary || {};
  const tail = readableErrorHeadline(row.error) || summaryText(result)
    || (isActive(row) && total > 0 ? `${progressText(row.progress_current, total)} 项` : '');
  return [item, tail].filter(Boolean).join(' · ');
}

/** 秒数说成「几分几秒」。跑了几小时的批处理也要一眼读得出量级：满 48 小时按天说。 */
export function elapsedText(seconds: number | null | undefined): string {
  if (typeof seconds !== 'number' || !Number.isFinite(seconds) || seconds < 0) return '';
  const whole = Math.floor(seconds);
  if (whole < 60) return `${whole} 秒`;
  const minutes = Math.floor(whole / 60);
  if (minutes < 60) return `${minutes} 分 ${whole % 60} 秒`;
  const hours = Math.floor(minutes / 60);
  if (hours < 48) return `${hours} 小时 ${minutes % 60} 分`;
  return `${Math.floor(hours / 24).toLocaleString()} 天 ${hours % 24} 小时`;
}

/** 进度读数「已做 / 总数」：服务端偶尔报出超过总数的已做数，按总数封顶。 */
export function progressText(current: number | null | undefined, total: number | null | undefined): string {
  const all = Math.max(0, Number(total) || 0);
  const done = Math.min(all, Math.max(0, Number(current) || 0));
  return `${done.toLocaleString()} / ${all.toLocaleString()}`;
}

/** 一段报错在列表里只露的那一行。Python traceback 的第一行永远是「Traceback (most recent call
 *  last):」，说明不了什么，取最后一行的异常类型与消息；别的取第一行非空。 */
export function errorHeadline(text: string | null | undefined): string {
  const lines = String(text || '').split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  if (!lines.length) return '';
  return /^Traceback \(most recent call last\)/.test(lines[0]!) ? lines[lines.length - 1]! : lines[0]!;
}

/** 异常类型和原始堆栈由详情保留，摘要说明实际原因。 */
export function readableErrorHeadline(text: string | null | undefined): string {
  const head = errorHeadline(text);
  const technical = head.match(/^(?:[\w.]*Error|Exception):\s*(.*)$/);
  if (!technical) return head;
  return requestErrorMessage(technical[1]);
}

const OUTCOME_LABELS: Record<string, string> = {
  partial: '处理已结束，部分项目需处理', complete: '处理完成', interrupted: '处理已中断',
  cancelled: '已取消',
  '没有新写法': '未发现新别名', '已装上': '已保存资料图片',
  '已装着认得准的小图': '已保留身份核对通过的小尺寸图片',
  '档案已不存在': '资料记录已不存在', '资料未过期': '现有资料仍在有效期内',
  '图太小': '图片分辨率不足', '官网未取得': '未取得厂牌官网信息',
  '两站都没有作品一览': '两个来源均未提供作品列表',
  '哪一站都没对上她': '未找到与该人物相符的资料页',
  '两站都没对上她': '两个来源均未找到与该人物相符的资料页',
  '三站都没对上她': '三个来源均未找到与该人物相符的资料页',
  '已有身份': '已有创作者分类', '已变': '资料已被其他操作修改，本次未保存',
};
const SOURCE_NAMES: Record<string, string> = { avwikidb: 'AVWikiDB', javdb: 'JavDB', 'minnano-av': 'みんなのAV' };
const OPERATION_LABELS: Record<string, string> = {
  like: '标记喜欢', seen: '标记看过', later: '加入稍后看', dispose: '移入回收站',
  restore: '还原', delete: '永久删除', 'empty-trash': '清空回收站',
  'dismiss-junk': '确认不是垃圾', 'reconsider-junk': '重新判定垃圾', region: '判定产地',
};
const outcomeText = (text: string): string => OUTCOME_LABELS[text] || text
  .replace(/(avwikidb|javdb|minnano-av) (绑定|写入)/gi, (_, site: string, action: string) =>
    action === '绑定' ? `已关联 ${SOURCE_NAMES[site.toLowerCase()]} 资料页`
      : `已保存来自 ${SOURCE_NAMES[site.toLowerCase()]} 的资料`);

/** 时间戳说成本地的「月-日 时:分」。数据库里存的是 UTC，界面上一律按本机时区读。 */
export function momentText(stamp: string | null | undefined): string {
  if (!stamp) return '';
  const moment = new Date(stamp);
  if (Number.isNaN(moment.getTime())) return '';
  return moment.toLocaleString(undefined,
    { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
}

/* 不进摘要的键：「谁挡的」已经写在错误那一句里；其余是域状态字典里的簿记——状态、
   起止时间戳、请求号和任务号，卡片标题、徽章和时间那一行已经说过，原样摆出来只是一串
   英文键和纪元秒。 */
const SUMMARY_HIDDEN = new Set([
  'blocked_by', 'status', 'run_id', 'request_id', 'started_at', 'completed_at', 'finished_at',
]);

/** 任务结果只展示面向使用者的字段。 */
export function summaryItems(summary: Record<string, unknown>): string[] {
  const items = fieldItems(summary);
  // 「发现问题」要说得出是什么问题。原因已写进结论（「人脸模型不可用：…」「人像闸未生效…」）时不再说一遍。
  if (summary?.face_match_unavailable === true && !items.some((line) => /不可用|未生效/.test(line))) {
    items.push('人脸模型不可用，未做人脸核对');
  }
  return items;
}

function fieldItems(summary: Record<string, unknown>): string[] {
  return Object.entries(summary || {})
    .filter(([key, value]) => !SUMMARY_HIDDEN.has(key)
      && (key in SUMMARY_LABELS || key === 'outcome' || key === 'followups' || key === 'error')
      && (typeof value === 'number' || typeof value === 'string')
      && String(value) !== '' && (value !== 0 || key === 'checked' || key === 'total'))
    .map(([key, value]) => {
      if (key === 'followups') return `已安排 ${Number(value).toLocaleString()} 项补充任务`;
      if (key === 'error') return readableErrorHeadline(String(value));
      if (key === 'outcome' || key === 'result') return outcomeText(String(value));
      if (key === 'cache_bytes' || key === 'bytes_reclaimed') return `${SUMMARY_LABELS[key]} ${fmtSize(Number(value))}`;
      if (key === 'operation') return `操作：${OPERATION_LABELS[String(value)] || '批量操作'}`;
      return `${SUMMARY_LABELS[key]} ${typeof value === 'number' ? value.toLocaleString() : value}`;
    });
}

export const summaryText = (summary: Record<string, unknown>): string => summaryItems(summary).join(' · ');
