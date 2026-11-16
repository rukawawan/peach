import { islandButton, islandGlyph, islandSelect } from './island-skeleton';
import { FIELDSET_BODY, FIELDSET_FOOT, fieldsetClass, type FieldsetLayout } from './react/components/fieldset-layout';
import { CLEANUP_TOOLS } from './cleanup-tools';
import { CLEANUP_ENTRY, CLEANUP_ENTRY_GRID } from './react/data-cleanup/cleanup-entry';
import { PLAIN_STAT_STRIP, plainStatClass } from './react/components/stat-card';
import { t } from './i18n';

/* 「扫描与采集」「媒体修复」两张卡的正文。卡片本体由 React 画，骨架与遗留层的取数占位
   画的是同一段话：写两份的话，骨架上的那句会比真卡短一截，接管时整张卡跳一次。 */
export const SCAN_CARD_TEXT = t('manage:cleanupCards.scanText');
export const REPAIR_CARD_TEXT = t('manage:cleanupCards.repairText');

const bar = '<span class="skeleton skeleton-text" aria-hidden="true"></span>';
/* 要等数据才能执行的键是真的按不了：原生 `disabled` 挡住点击与聚焦，`data-skeleton-action`
   让各档按键在骨架里统一成同一副禁用面（`board.css`），尺寸仍是最终那一档，数据一到只换颜色。 */

/* 两张 React 卡的骨架包在同一层 `.peach-react` 里，按键与下拉照 Board UI 的尺寸画（见
   `island-skeleton.ts`）。卡片这一层的结构照 React 那两张卡抄：外面一列 `gap-4`，标题与正文
   同一对字级。下拉框里只是一截占位条，不是控件，留 `aria-disabled` 就够。 */
const waitingAction = 'disabled data-skeleton-action';
const unavailable = 'aria-disabled="true"';
const island = (card: string) => `<div class="peach-react"><div class="flex flex-col gap-4">${card}</div></div>`;
const cardText = (title: string, text: string, layout: FieldsetLayout, controls = '') => `<div class="${FIELDSET_BODY[layout]}"><div class="flex flex-col gap-2">
          <h3 class="text-title-2-medium text-text-primary">${title}</h3>
          <p class="text-body-2-regular text-text-secondary">${text}</p>${controls}</div></div>`;

/** 「扫描与采集」卡：与 React `LibraryProcessingCard` 同一副容器、同一段正文、同一组键。
 *  「复核资料」只在有候选时出现，这里不预画。 */
export function scanCardSkeletonHtml(): string {
  const links = [['/sources', t('manage:managePages.sources')], ['/settings/diagnostics', t('manage:managePages.diagnostics')]]
    .map(([href, label]) => `<a href="${href}" class="inline-flex items-center justify-center gap-1 whitespace-nowrap font-sans rounded-sm text-body-medium text-accent-600"><span>${label}</span>${islandGlyph('arrow-up', 'size-(--icon-inline) shrink-0 rotate-90')}</a>`).join('');
  return island(`<section aria-label="${t('manage:scanFetch.title')}" class="${fieldsetClass('stack')}" data-cleanup-task data-cleanup-processing>
        ${cardText(t('manage:scanFetch.title'), SCAN_CARD_TEXT, 'stack', `<div class="w-full max-w-80"><p class="mb-1 text-body-2-medium text-text-secondary">${t('manage:shared.library')}</p>${islandSelect(bar, { attrs: `${unavailable} aria-label="${t('manage:shared.library')}"` })}</div>`)}
        <footer class="${FIELDSET_FOOT.stack}">${links}<span data-button-group data-split-button data-variant="primary">${islandButton({ label: t('manage:syncMenu.syncNewFiles'), attrs: waitingAction })}${islandButton({ glyph: 'chevron-down', attrs: `${waitingAction} aria-label="${t('manage:syncMenu.moreOptions')}"` })}</span></footer>
      </section>`);
}

/** 「媒体修复」卡：页脚的媒体库下拉框先按最终尺寸画出来，库名要等数据；「开始修复」要等选定
 *  媒体库，骨架里是禁用态。 */
export function repairCardSkeletonHtml(): string {
  return island(`<section aria-label="${t('cleanup:tools.mediaRepair')}" class="${fieldsetClass('split')}" data-cleanup-task data-cleanup-processing>
        ${cardText(t('cleanup:tools.mediaRepair'), REPAIR_CARD_TEXT, 'split')}
        <footer class="${FIELDSET_FOOT.split}">${islandSelect(bar, { className: 'w-48', attrs: unavailable })}${islandButton({ label: t('cleanup:mediaRepair.start'), attrs: waitingAction })}</footer>
      </section>`);
}

/** 首页骨架与最终页面共用工具顺序；完整表单、结果和清单在二级页加载。 */
export function cleanupSkeletonHtml(): string {
  const entry = (label: string, glyph: string, summary: string, detail = '') => `<div class="${CLEANUP_ENTRY.face}"><span class="${CLEANUP_ENTRY.icon}">${islandGlyph(glyph, 'size-5')}</span><span class="${CLEANUP_ENTRY.body}"><span class="${CLEANUP_ENTRY.title}">${label}</span><span class="${CLEANUP_ENTRY.summary}">${summary}</span>${detail ? `<span class="${CLEANUP_ENTRY.detail}">${detail}</span>` : ''}</span>${islandGlyph('chevron-right', CLEANUP_ENTRY.arrow)}</div>`;
  const stat = (label: string, glyph: string) => `<div class="${plainStatClass()}"><span class="flex min-w-0 items-center gap-2 text-body-medium text-text-secondary"><i class="flex size-8 shrink-0 items-center justify-center rounded-md bg-background-primary-default text-text-primary">${islandGlyph(glyph, 'size-4')}</i><span>${label}</span></span><strong class="block text-title-1-medium tabular-nums text-text-primary">${bar}</strong><span class="block min-h-4 text-caption-1-regular text-text-tertiary">${bar}</span></div>`;
  const heading = (label: string) => `<h2 class="text-title-2-medium! m-0! text-text-primary">${label}</h2>`;
  const tools = (deletion: boolean) => CLEANUP_TOOLS.filter(tool => (tool.key === 'batch-delete') === deletion)
    .map(tool => entry(tool.title, tool.icon, tool.description)).join('');
  return `<div class="peach-react" data-skeleton="cleanup" aria-busy="true" role="status" aria-label="${t('manage:manageSkeleton.loadingLibraryTools')}"><div aria-hidden="true" inert class="mx-auto flex w-full max-w-board flex-col gap-8">
    <section class="flex flex-col gap-4">${heading(t('cleanup:overview.needsAttention'))}<div class="${PLAIN_STAT_STRIP}">${[[t('manage:managePages.review'), 'square-check-big'], [t('manage:managePages.duplicates'), 'file-stack'], [t('manage:managePages.junkFiles'), 'file-archive'], [t('manage:managePages.qualityGoals'), 'sparkles'], [t('manage:managePages.trash'), 'trash']].map(([label, glyph]) => stat(label!, glyph!)).join('')}</div></section>
    <div id="libraryProcessing" class="scroll-mt-20">${scanCardSkeletonHtml()}</div>
    <section class="flex flex-col gap-4">${heading(t('cleanup:overview.maintenanceSection'))}<div class="${CLEANUP_ENTRY_GRID}">${tools(false)}</div></section>
    <section class="flex flex-col gap-4">${heading(t('cleanup:overview.deletionSection'))}<div class="${CLEANUP_ENTRY_GRID}">${tools(true)}</div></section>
    </div></div>`;
}
