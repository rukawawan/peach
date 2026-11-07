/* 数据管理二级页（整理文件、资源同步、文件已丢失的记录、链接管理、批量删除）的首屏骨架。
 * 每页照自己那张 React 卡画：同一副 Fieldset 或数据表外框、同一列 `max-w-board` 正文宽度，
 * 标题、说明与表头是静态文案，直接写出来；条数、读数、库名与模板要等数据，只画占位。
 * 说明文字与 React 卡共用这里的常量，写两份的话骨架上那一段会比真卡短一截，接管时整张卡跳一次。
 * 只在跑过一趟任务后才出现的结果区（扫描结论、死链清单）不预画。 */
import { followCheck, SORT_MARK } from './board-skeleton';
import { islandButton, islandGlyph, islandSearchInput, islandSelect } from './island-skeleton';
import type { CleanupToolKey } from './cleanup-tools';
import { cardClass } from './react/components/card';
import { FIELDSET_BODY, FIELDSET_FOOT, fieldsetClass } from './react/components/fieldset-layout';
import { repairCardSkeletonHtml } from './management';

export const ORGANIZE_TEXT = '清理文件名中的特殊符号与乱码，也可按模板改名并归入目录。先预览，确认后执行；执行过的一批可以整批退回。';
export const ORGANIZE_SCOPE_HINT = '指定路径时包含子目录，目录模板以该路径为起点。模板均留空时只清理文件名。';
export const ORGANIZE_PARAMETER_HINT = '点击参数插入光标处，选中文字可替换。方括号里的内容在字段为空时整段省略。';
export const RESOURCE_SYNC_TEXT = '按馆藏记录逐条查找本地磁盘与网盘上的文件，列出文件已不存在的记录、空文件夹，以及不再被引用的缓存。';
export const ORPHAN_RECORDS_TEXT = '这些作品的源文件已删除，喜欢、稍后看、播放列表与观看历史仍保留。选择替代文件后，这些记录会转移到该文件，旧作品记录随之删除。';
export const BATCH_DELETE_TEXT = '勾选女优，永久删除她们在全部来源中的影片文件、影片资料和观看记录，包括回收站中的影片。女优档案和照片保留。共同出演的同一文件只删除一次。';

const WAITING = 'disabled data-skeleton-action';
const text = (width: string) => `<span class="skeleton skeleton-text" style="width:${width}"></span>`;
const block = (width: number, height: number, round = false) =>
  `<span class="skeleton" style="width:${width}px;height:${height}px;flex:none${round ? ';border-radius:50%' : ''}"></span>`;
const title = (label: string, gap: '' | 'mb-2' | 'mb-3') =>
  `<h3 class="text-title-2-medium text-text-primary${gap ? ` ${gap}` : ''}">${label}</h3>`;

/** Board UI `Input` 中号的静止态：可带块级标签，框里是占位字或一截等数据的占位条。 */
const input = (content: string, { label = '', className = '' } = {}) => `<div data-input-size="medium" class="group flex h-max w-full flex-col items-start gap-1${className ? ` ${className}` : ''}">${
  label ? `<span class="flex items-center gap-0.5 text-body-medium text-text-primary">${label}</span>` : ''
}<div class="relative flex w-full items-center rounded-2lg bg-background-tertiary-default text-foreground-icon-tertiary ring-2 ring-inset ring-transparent p-2"><div class="flex w-full items-center gap-2 min-w-0"><div class="flex flex-1 items-center gap-0.5 min-w-0"><span class="flex min-w-0 flex-1 items-center pl-1 font-sans text-body-regular text-text-tertiary">${content}&#8203;</span></div></div></div></div>`;

/* 预设与参数是 `src/peach/organize.py` 的两张定长表，各九项；名字跟着数据来，键先按小号画出占位，
   宽度照两张表的字数（参数键再算上等宽的 `{key}`）取，折行与真键落在同一处。 */
const PRESET_WIDTHS = ['3em', '5em', '5em', '6em', '7em', '7em', '8em', '8em', '10em'];
const PARAMETER_WIDTHS = ['5.8em', '6.4em', '7em', '7em', '7em', '8.1em', '5.8em', '9em', '9em'];
const smallKey = (variant: 'secondary' | 'ghost', width: string) =>
  islandButton({ variant, size: 'small', label: text(width) });

/* 骨架淡出那一拍与真卡同在页面上，所以不带 `id` 与测试认卡用的 `data-*`，只留决定样式的标记。 */
function organize(): string {
  return `<section class="${fieldsetClass('stack')}">
    <div class="${FIELDSET_BODY.stack}">${title('整理', 'mb-3')}
      <p class="text-body-regular text-text-secondary">${ORGANIZE_TEXT}</p>
      <div class="mt-3 flex flex-col gap-3">
        <div class="flex min-w-0 flex-wrap items-start gap-2">${islandSelect(text('3em'), { prefix: '来源', className: 'w-fit min-w-25', attrs: 'aria-disabled="true"' })}
          <div class="flex min-w-0 basis-64 flex-1 items-start gap-2">${input('留空整理整个来源', { className: 'min-w-0 flex-1' })}<button type="button" class="relative inline-flex shrink-0 items-center justify-center overflow-visible rounded-2lg bg-background-primary-default text-foreground-icon-primary border border-border-button-default shadow-xs size-9">${islandGlyph('folder-search', 'size-5 shrink-0')}</button></div>
        </div>
        <p class="text-caption-1-regular text-text-secondary">${ORGANIZE_SCOPE_HINT}</p>
        ${input(text('12em'), { label: '文件名模板' })}${input(text('8em'), { label: '目录模板' })}
        <div class="flex flex-col gap-2"><p class="text-caption-1-medium text-text-secondary">套用模板</p><div class="flex flex-wrap gap-2">${PRESET_WIDTHS.map(width => smallKey('secondary', width)).join('')}</div></div>
        <p class="text-caption-1-regular text-text-secondary">路径示例：${text('16em')}</p>
        <div class="flex flex-col gap-2"><p class="text-caption-1-regular text-text-secondary"><strong class="text-caption-1-semibold text-text-primary">插入参数</strong>（到文件名模板）</p><div class="flex flex-wrap gap-1">${PARAMETER_WIDTHS.map(width => smallKey('ghost', width)).join('')}</div></div>
        <p class="text-caption-1-regular leading-4.5 text-text-secondary">${ORGANIZE_PARAMETER_HINT}</p>
      </div>
    </div>
    <footer class="${FIELDSET_FOOT.stack}">${islandButton({ label: '预览', attrs: WAITING })}</footer>
  </section>`;
}

/* 键名跟上一趟扫描走（检查文件／重新扫描），骨架画头一次进来的那一版。 */
const resourceSync = () => `<section class="flex scroll-mt-20 flex-col gap-4">
  <section class="${fieldsetClass('split')}"><div class="${FIELDSET_BODY.split}">${title('资源同步', 'mb-2')}
    <p class="max-w-190 text-body-2-regular leading-5 text-text-secondary">${RESOURCE_SYNC_TEXT}</p></div>
    <footer class="${FIELDSET_FOOT.split}">${islandButton({ glyph: 'git-compare', label: '检查文件', attrs: WAITING })}</footer></section>
</section>`;

/** 链接管理那张卡：四格读数（总数与三类链接）和三个主要站点等数据，键名同样画头一次的那一版。 */
const linkStat = (label: string, note = false) => `<div class="flex min-w-0 flex-col gap-0.5"><span class="text-caption-1-regular leading-5 text-text-secondary">${label}</span><b class="text-title-2-semibold font-bold leading-5 tabular-nums text-text-primary">${text('3em')}</b>${note ? `<small class="text-caption-1-regular leading-5 text-text-secondary">${text('14em')}</small>` : ''}</div>`;
const links = () => `<section class="flex scroll-mt-20 flex-col gap-4">
  <section class="${fieldsetClass('stack')}"><div class="${FIELDSET_BODY.stack}">${title('链接管理', 'mb-2')}
    <div class="link-stat-grid mt-4 gap-x-8 gap-y-3">${linkStat('链接总数', true)}${[0, 1, 2].map(() => linkStat(text('5em'))).join('')}</div>
    <div class="mt-4 flex min-w-0 flex-col gap-0.5"><span class="text-caption-1-regular text-text-secondary">主要站点</span><div class="flex min-w-0 flex-wrap gap-x-5 gap-y-2">${
      ['7em', '10em', '8em'].map(width => `<span class="inline-flex min-w-0 items-center gap-1.5 text-body-2-medium">${block(16, 16)}${text(width)}${block(28, 24)}</span>`).join('')}</div></div></div>
    <footer class="${FIELDSET_FOOT.stack}">${islandButton({ glyph: 'link', label: '检查死链', attrs: WAITING })}</footer></section>
</section>`;

/** `DataTable` 的等待态：填充卡里工具行、说明、表头与几行占位、分页行，列宽取列定义的缺省宽度。
 *  可调列宽的表是 `table-layout: fixed`：首列不写宽度，吃掉余下的宽度；整表最窄是各列缺省宽度之和，
 *  窄屏上同真表一样横向滚动。末尾那一格行空白压到 0；分页键要等总数才知道几页，不画。 */
interface TableColumn { label: string; width: number; cell: string }
function dataTable({ title: name, description, search = '', columns, rows }:
  { title: string; description: string; search?: string; columns: TableColumn[]; rows: number }): string {
  const least = columns.reduce((sum, { width }) => sum + width, 48);
  const head = `<th style="width:48px"><span class="flex items-center gap-0.5">${followCheck()}</span></th>${columns.map(({ label, width }, index) =>
    `<th${index ? ` style="width:${width}px"` : ''}><span class="flex items-center gap-0.5">${label}<span data-sort-indicator>${SORT_MARK}</span></span></th>`).join('')}<th data-table-space style="width:0"></th>`;
  const row = `<tr><td>${followCheck()}</td>${columns.map(({ cell }) => `<td>${cell}</td>`).join('')}<td data-table-space></td></tr>`;
  const searchBox = search ? `<div data-index-search class="ml-auto min-w-0 max-w-80 flex-1">${islandSearchInput('', '', search)}</div>` : '';
  return `<div data-data-table-panel class="${cardClass({ padding: 'none', className: 'flex flex-col gap-4 px-6 py-5 max-sm:px-4' })}">
    <div data-responsive-toolbar><div data-toolbar-heading>${title(name, '')}<span class="text-body-2-regular tabular-nums text-text-secondary">${text('4em')}</span></div>
      <div data-toolbar-actions>${searchBox}<div class="flex flex-none gap-2">${islandButton({ variant: 'secondary', label: '显示列' })}${islandButton({ variant: 'secondary', label: '重置列宽' })}</div>
        <span class="flex flex-none items-center gap-2">${islandSelect('默认顺序', { prefix: '排序' })}${islandButton({ variant: 'secondary', glyph: 'arrow-up', attrs: WAITING })}</span></div></div>
    <p class="text-body-2-regular text-text-secondary">${description}</p>
    <div data-board-data-table data-resizable-table data-follow-table><div class="relative min-w-0"><div class="w-full overflow-x-auto"><table class="bui-table bui-table-sm" style="min-width:${least}px"><thead><tr>${head}</tr></thead><tbody>${row.repeat(rows)}</tbody></table></div></div></div>
    <div data-table-pagination class="flex flex-wrap items-center justify-between gap-3"><span class="mr-auto text-body-2-regular tabular-nums text-text-secondary">${text('8em')}</span><div data-toolbar-actions>${islandSelect('每页 20 条', { size: 'sm' })}</div></div>
  </div>`;
}

const twoLines = (first: string, second: string) => `<span class="flex min-w-0 flex-1 flex-col gap-0.5"><span class="text-body-regular">${text(first)}</span><small class="text-caption-1-regular">${text(second)}</small></span>`;
const orphanRecords = () => `<section class="flex scroll-mt-20 flex-col gap-4">${dataTable({
  title: '文件已丢失的记录', description: ORPHAN_RECORDS_TEXT, rows: 4,
  columns: [
    { label: '作品', width: 480, cell: `<span class="flex min-w-0 items-center gap-3"><span class="skeleton flex-none rounded-lg max-cleanup-tight:hidden" style="width:96px;height:60px"></span>${twoLines('70%', '40%')}</span>` },
    { label: '个人记录', width: 176, cell: text('6em') },
    { label: '操作', width: 128, cell: islandButton({ variant: 'secondary', size: 'small', label: '删除记录', attrs: WAITING }) },
  ],
})}</section>`;

const batchDelete = () => `<section class="flex min-w-0 scroll-mt-20 flex-col gap-3">${dataTable({
  title: '批量删除', description: BATCH_DELETE_TEXT, search: '搜索女优姓名或别名', rows: 12,
  columns: [
    { label: '女优', width: 280, cell: `<span class="flex min-w-0 items-center gap-3">${block(32, 32, true)}${text('5em')}</span>` },
    { label: '影片', width: 104, cell: text('3em') },
    { label: '文件', width: 104, cell: text('3em') },
    { label: '登记大小', width: 136, cell: text('4em') },
  ],
})}</section>`;

/** 自定义设置页（欧美刮削、Jasna、AI 字幕、短视频广告）共用的骨架：一张卡，若干行输入框。 */
const settingsCard = (rows: number) => `<section class="flex min-w-0 flex-col gap-3 rounded-2xl border border-separator-border p-5">${
  `<span class="skeleton rounded-md" style="width:8em;height:20px"></span>`
  + Array.from({ length: rows }, () => `<span class="skeleton rounded-lg" style="width:100%;height:36px"></span>`).join('')
}</section>`;

const BODIES: Record<CleanupToolKey, { label: string; body: () => string }> = {
  organize: { label: '正在读取整理配置', body: organize },
  'resource-sync': { label: '正在读取资源同步状态', body: resourceSync },
  'orphan-records': { label: '正在读取文件已丢失的记录', body: orphanRecords },
  'media-repair': { label: '正在读取媒体修复状态', body: repairCardSkeletonHtml },
  links: { label: '正在读取链接统计', body: links },
  'batch-delete': { label: '正在读取女优列表', body: batchDelete },
  'western-scrape': { label: '正在读取欧美资料刮削状态', body: () => settingsCard(3) },
  jasna: { label: '正在读取 Jasna 去码设置', body: () => settingsCard(3) },
  'ai-subtitles': { label: '正在读取 AI 字幕设置', body: () => settingsCard(5) },
  'short-ads': { label: '正在读取短视频广告设置', body: () => settingsCard(1) },
};

/** 二级页骨架：外层是读屏的等待状态，里面那一列与 React `Page` 同宽同间距，整块 `inert`。 */
export function cleanupToolSkeletonHtml(key: CleanupToolKey): string {
  const { label, body } = BODIES[key];
  return `<div class="peach-react" data-skeleton="cleanup/${key}" aria-busy="true" role="status" aria-label="${label}"><div aria-hidden="true" inert class="mx-auto flex w-full max-w-board flex-col gap-8">${body()}</div></div>`;
}
