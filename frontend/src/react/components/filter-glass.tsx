/* 粘在顶栏下沿的玻璃操作条：标题、筛选项与文字操作，或上下两排的筛选浮层。
 *
 * 料（漂移的两团、斜光、内嵌边与落影）由 `web/board.css` 的 `[data-glass-pane]` 一处给，
 * 几何、饱和度与文字色在 `../styles.css` 的 `[data-filter-glass]`，高对比与减少透明度的回退
 * 也在那一条上。吸到顶栏下沿那一刻由 `use-stuck.ts` 标 `data-stuck`，影换成抬起来那一档。
 * 文字操作共用 BoardUI 的 32px 小号按钮，筛选项使用类型对应的选中面。 */
import { cloneElement, useEffect, useRef, useState, type ComponentProps, type ReactElement, type ReactNode, type RefObject } from 'react';
import { cx } from '@/utils/cx';
import { IconButton, type IconButtonProps } from '@/components/base/buttons/icon-button';
import { Button } from '@/components/base/buttons/button';
import { spinnerHtml } from '@peach/legacy/ui';

import { spriteGlyph } from './sprite-glyph';
import { useSearchText } from './use-search-text';
import { useDatalistSuggest } from '../search/datalist-suggest';
import type { SuggestOption } from '../follow-manage/follow-search';
import { GlassDrift } from './glass-drift';
import { useStuck } from './use-stuck';
import { useHorizontalScroller } from './use-horizontal-scroller';
import { useViewGlide } from './use-view-glide';
import { t } from '../../i18n';
import './filter-glass.css';

export const FILTER_TOOLBAR_POPOVER_OFFSET = 12;

const BusyIcon = ({ className }: { className?: string }) => <span aria-hidden className={className}
  dangerouslySetInnerHTML={{ __html: spinnerHtml(t('shell:shared.processing')) }} />;

/** 筛选栏动作使用紧凑档（`size="small"`，32px）和蓝色动作表面。 */
export function FilterIconButton({ label, icon, busy = false, busyStyle = 'spinner', onPress, ...props }:
  Omit<IconButtonProps, 'aria-label' | 'size' | 'onClick'> & { label: string; busy?: boolean; busyStyle?: 'spinner' | 'strand'; onPress(): void }) {
  return <IconButton {...props} className={cx('shrink-0', props.className)} data-filter-action="" size="small"
    icon={busy && busyStyle === 'spinner' ? BusyIcon : icon}
    aria-label={label} title={props.title || label} aria-busy={busy || undefined} aria-disabled={busy || undefined}
    onClick={() => { if (!busy) onPress() }} />;
}

const SearchGlyph = spriteGlyph('search');
const ClearGlyph = spriteGlyph('x');
type SearchSuggest = { key: string; load(term: string, signal: AbortSignal): Promise<SuggestOption[]> };

/** 候选单独一棵：只有给了 `suggest` 的那几处才用得到查询客户端，其余页面的查找不依赖它。 */
function SearchHints({ suggest, text, input }: { suggest: SearchSuggest; text: string; input: RefObject<HTMLInputElement | null> }) {
  const hints = useDatalistSuggest(suggest.key, text, suggest.load);
  const { bind } = hints;
  useEffect(() => { bind(input.current) }, [bind, input]);
  return hints.list;
}

/** 浮层下排的查找：32px 高、8px 圆角，平时一层淡玻璃面，聚焦或有词时升到选中态那块高亮玻璃，
 *  有词时尾端多一枚清除。停手就查，节律同 `IndexSearch`。
 *  放在读数后面、工具与排序之前；筛到一条不剩时调用方要保证这一枚还在，词才改得回去。
 *  `suggest` 给了就在敲字时挂浏览器原生候选（`<datalist>`），`key` 分开各处的缓存。
 *  `compact` 用在下排本来就摆满的浮层（首页那一排排序键）：没词也没聚焦时收成一枚 32px 的图标键，
 *  点一下或聚焦再展开。 */
export function FilterSearch({ label, value, onQuery, placeholder = t('shell:shared.find'), suggest, compact = false }: {
  label: string; value: string; onQuery(q: string): void; placeholder?: string; compact?: boolean;
  suggest?: SearchSuggest;
}) {
  const search = useSearchText(value, onQuery);
  const input = useRef<HTMLInputElement>(null);
  // 展开的那一档比失焦晚一点收（样式里说了为什么）。
  const [open, setOpen] = useState(false);
  const closing = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(closing.current), []);
  return (
    <label data-filter-search="" data-compact={compact ? '' : undefined} data-filled={search.text ? '' : undefined}
      data-open={open ? '' : undefined} title={compact ? label : undefined} {...search.composition}
      onFocus={() => { clearTimeout(closing.current); setOpen(true) }}
      onBlur={() => { clearTimeout(closing.current); closing.current = setTimeout(() => setOpen(false), 200) }}>
      <SearchGlyph aria-hidden className="size-4 shrink-0" />
      <input ref={input} type="search" aria-label={label} value={search.text} placeholder={placeholder} spellCheck={false}
        autoComplete="off" enterKeyHint="search" onChange={(event) => search.change(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Escape' && search.text) { event.preventDefault(); search.commit('') }
          else search.onKeyDown(event);
        }} />
      {search.text ? (
        <button type="button" data-filter-search-clear="" aria-label={t('shell:shared.clearFind')}
          onClick={() => search.commit('')}><ClearGlyph aria-hidden className="size-3.5" /></button>
      ) : null}
      {suggest ? <SearchHints suggest={suggest} text={search.text} input={input} /> : null}
    </label>
  );
}

export function FilterGlass({ title, children }: { title: string; children: ReactNode }) {
  const glass = useRef<HTMLDivElement>(null);
  useStuck(glass);
  return (
    <div ref={glass} role="group" aria-label={title} data-filter-glass data-glass-pane=""
      className="sticky top-topbar z-10 mb-5.5 flex flex-wrap items-center gap-x-2.5 gap-y-2 px-4 py-2.5">
      <h3 className="mr-1 text-body-medium">{title}</h3>
      {children}
      <GlassDrift />
    </div>
  );
}

/** 两排的那一副：首页、标签页与实体页的筛选浮层。上排是一行横滚的筛选药丸，下排是读数和
 *  这一屏的视图控件。几何同壳的 `.board-filter-frame`：上排 48px 高、8px／12px 内边距，下排最矮
 *  46px、格间 12px。整块吸在顶栏下沿，粘住时仍是同一块玻璃。
 *
 *  实体页那一副的几何差一点（上排格间 6px、下排最矮 48px），上排也不是整排一起滚——左端的
 *  媒体键钉住，只有里面那一格滚。这些由调用方在 `className`／`topClassName`／`bottomClassName`
 *  里改写，`cx` 合并时后写的赢。`panes` 是直接挂在浮层根上的那几块滑动玻璃
 *  （`use-view-glide.ts`），`attrs` 给根补壳要认的标记（窄屏让位认 `data-filter-frame`）。
 *  `busy` 标在下排上：读数在等这一趟取数，下排里认它的动效（换批键描线）跟着走。上排没有可放的
 *  东西时 `top` 给 `null`，整行不出，玻璃只剩下排。 */
export function FilterGlassRows(
  { label, topLabel, top, bottom, className, topClassName, bottomClassName, panes, attrs, busy, bottomRef }: {
    label: string;
    topLabel: string;
    top: ReactNode;
    bottom: ReactNode;
    className?: string;
    topClassName?: string;
    bottomClassName?: string;
    panes?: ReactNode;
    attrs?: Record<`data-${string}`, string>;
    busy?: boolean;
    bottomRef?: RefObject<HTMLDivElement | null>;
  },
) {
  const glass = useRef<HTMLDivElement>(null);
  const topScroll = useHorizontalScroller<HTMLDivElement>();
  const bottomScroll = useHorizontalScroller<HTMLDivElement>(bottomRef);
  useStuck(glass);
  return (
    <div ref={glass} role="group" aria-label={label} data-filter-glass data-glass-pane="" {...attrs}
      className={cx('sticky top-topbar z-10 mb-5.5 flex flex-col', className)}>
      {panes}
      {top === null ? null : (
        <div ref={topScroll} role="group" aria-label={topLabel} data-filter-row="top"
          className={cx('flex h-12 min-w-0 items-center gap-1.75 overflow-x-auto overscroll-x-contain px-3 py-2',
            topClassName)}>
          {top}
        </div>
      )}
      <div ref={bottomScroll} data-filter-row="bottom" aria-busy={busy || undefined}
        className={cx('flex min-h-11.5 min-w-0 items-center gap-3 px-3 py-2', bottomClassName)}>
        {bottom}
      </div>
      <GlassDrift />
    </div>
  );
}

interface FilterScopeChoice<Key extends string> {
  key: Key;
  label: string;
  href?: string;
  attrs?: Record<`data-${string}`, string>;
}

/** 首页与在线目录的口径切换共用同一块滑动玻璃和按键。 */
export function useFilterScope<Key extends string>(active: Key, rowRef?: RefObject<HTMLDivElement | null>) {
  const localRow = useRef<HTMLDivElement>(null);
  const row = rowRef ?? localRow;
  const pane = useRef<HTMLSpanElement>(null);
  const glide = useViewGlide(pane, row, '[data-catalog-view][aria-pressed="true"]', active);
  return {
    pane: <span ref={pane} data-view-glide="" aria-hidden="true" />,
    choices: (label: string, items: readonly FilterScopeChoice<Key>[], select: (key: Key) => void) =>
      <div ref={row} role="group" aria-label={label} data-catalog-views="" onPointerLeave={glide.leave}>
        {items.map(({ key, label, href, attrs }) => {
          const common = { ...attrs, 'data-catalog-view': key, 'data-entity-press': '',
            'aria-pressed': active === key, onPointerEnter: glide.hover };
          return href
            ? <a key={key} href={href} {...common} onClick={event => { event.preventDefault(); select(key) }}>{label}</a>
            : <button key={key} type="button" {...common} onClick={() => select(key)}>{label}</button>;
        })}
        <span data-entity-sep="" aria-hidden="true" />
      </div>,
  };
}

/** 下排工具按图标、筛选字段、排序排列。 */
export function FilterToolbarControls({ tools, fields, fieldGroup, sorts }: {
  tools: ReactNode;
  fields?: ReactNode;
  fieldGroup?: ComponentProps<'span'>;
  sorts: ReactElement<{ fields?: ReactNode; fieldGroup?: ComponentProps<'span'> }> | null;
}) {
  return <span data-entity-sorts="">
    {tools}
    {tools ? <span data-entity-sep="" aria-hidden="true" /> : null}
    {sorts ? cloneElement(sorts, { fields, fieldGroup }) : fields ? <span {...fieldGroup} data-filter-fields="">{fields}</span> : null}
  </span>;
}

/* 浮层上的筛选药丸：8px 圆角、13px 字，未选中是一圈虚线 `--glass-low`，悬停转实线；选中的
 * 线与填充归调用方（标签类型药丸取自己的类型色，见 `../styles.css` 的 `[data-tag-pill]`）。 */
const FILTER_PILL = 'flex h-8 flex-none cursor-pointer items-center gap-1.75 rounded-lg border border-dashed'
  + ' border-(--glass-low) bg-transparent px-2.5 text-body-2-regular leading-5 whitespace-nowrap text-inherit'
  + ' outline-none hover:border-solid focus-visible:ring-2 focus-visible:ring-border-focus-ring';

export function FilterPill(
  { children, pressed, onPress, className, ...data }:
  { children: ReactNode; pressed: boolean; onPress(): void; className?: string } & Record<`data-${string}`, string>,
) {
  return (
    <button type="button" {...data} aria-pressed={pressed} className={cx(FILTER_PILL, className)}
      onClick={onPress}>
      {children}
    </button>
  );
}

/** 快捷标签与下拉共用同一份选项和选择动作。 */
export function FilterTagStrip({ choices, onSelect }: {
  choices: readonly { id: string; label: string; count?: number | null; selected?: boolean }[];
  onSelect(id: string): void;
}) {
  const scroll = useHorizontalScroller<HTMLDivElement>();
  if (!choices.length) return null;
  const shown = [...choices.slice(48).filter(choice => choice.selected), ...choices.slice(0, 48)];
  return <div ref={scroll} data-filter-tag-strip="">
    {shown.map(choice => <FilterPill key={choice.id} data-filter-tag={choice.id} pressed={!!choice.selected}
      className="aria-pressed:border-solid aria-pressed:bg-(--picked)" onPress={() => onSelect(choice.id)}>
      {choice.label}{choice.count != null ? <span data-count-badge="" className="text-caption-1-regular tabular-nums text-text-tertiary">{choice.count.toLocaleString()}</span> : null}
    </FilterPill>)}
  </div>;
}

/** 筛选浮窗的文字操作统一使用 BoardUI 小号按钮，选中态使用主动作表面。 */
export function FilterActionButton(
  { children, onPress, busy = false, pressed, ...data }:
  { children: ReactNode; onPress(): void; busy?: boolean; pressed?: boolean | 'mixed' } & Record<`data-${string}`, string>,
) {
  return (
    <Button {...data} className="shrink-0" size="small" variant={pressed ? 'primary' : 'secondary'}
      aria-pressed={pressed} aria-busy={busy || undefined} disabled={busy} onClick={onPress}>
      {children}
    </Button>
  );
}

/** 处理队列页浮层下排、读数后面那颗「全选」：按这一屏已取回的条目全选或全不选。全选了是按下，
 *  选了一部分是半按下（`aria-pressed="mixed"`），再点一次全选。 */
export function SelectAllButton({ label, picked, total, onChange }: {
  label: string; picked: number; total: number; onChange(on: boolean): void;
}) {
  const all = total > 0 && picked === total;
  return <FilterActionButton data-select-all="" pressed={all ? true : picked > 0 ? 'mixed' : false} onPress={() => onChange(!all)}>
    {label}</FilterActionButton>;
}
