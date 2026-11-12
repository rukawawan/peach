/* 关注列表：同一份来源集合的两种视图，外加检查更新那一趟后台任务。
 *
 * 两种视图共用一个勾选集合（身份是来源 ID）和一份排序状态。表格视图由
 * `@tanstack/react-table` 驱动：列定义、排序状态、行选择与分页都在它手里，行数据是
 * 已经按共用比较器排好的**全集**——排序作用在全部结果上，分页只切最后一步，所以
 * 「下一页」看到的是真的下一批，而不是本页内部重排。
 *
 * 选择跨页也跨视图：换页、换排序、从卡片切到表格，选中的仍是同一批来源，底部那条批量
 * 操作发出去的也是整个 ID 集合，而不是屏幕上这一页。 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  RiCheckDoubleLine,
  RiDeleteBinLine, RiLayoutGridLine, RiRefreshLine, RiRssLine, RiTableLine,
} from '@remixicon/react';
import { useMutation } from '@tanstack/react-query';
import {
  createColumnHelper, createPaginatedRowModel, flexRender, rowPaginationFeature,
  rowSelectionFeature, rowSortingFeature, columnVisibilityFeature, tableFeatures, useTable,
  type RowSelectionState, type SortingState,
} from '@tanstack/react-table';
import { VisuallyHidden } from 'react-aria-components';

import { mapLimit } from '@peach/legacy/core';
import { confirmModal } from '@peach/legacy/ui';

import { Button } from '@/components/base/buttons/button';
import { Checkbox } from '@/components/base/checkbox/checkbox';
import { Select, SelectItem } from '../components/select';
import { Switch } from '@/components/base/switch/switch';
import {
  Table, TableBody, TableCell, TableColumn, TableHeader, TableRow,
} from '@/components/base/table/table';
import { ChevronSortDown } from '@/components/foundations/icons/chevrons';

import { errorMessage } from '../../api';
import { DataTableFooter } from '../components/table-controls';
import { useBackgroundJob } from '../background-job';
import { cardClass } from '../components/card';
import { DataTableFrame } from '../components/data-table-frame';
import { useTablePreferences } from '../components/table-column-preferences';
import { TableColumnControls, TableColumnResizer } from '../components/table-column-controls';
import { CollapseChevron, CollapseRegion } from '../components/collapse-region';
import { TableSelectionHeader } from '../components/table-selection-header';
import { SortDirectionIcon } from '../components/icon-swap';
import { EmptyState } from '../components/empty-state';
import { clickedBlank } from '../components/row-click';
import { Note } from '../components/note';
import { TaskProgress } from '../components/task-progress';
import { SelectionDock } from '../components/selection-dock';
import { busyProps } from '../settings/use-action';
import {
  authorGroups, authorName, checkedText, checkEvidenceGap, checkFailures, checkReceipt, checkSummary,
  COLUMN_SORT, dropSources, errorHeadline, fetchCheckJob, FOLLOW_CHECK_KEY, isBroken,
  LAYOUTS, markAllPending, pageWindow, patchSource, removeSource,
  reloadFollowManage, selectionState, setSourceEnabled, SORT_DEFAULT_DIR, SORT_OPTIONS,
  sortLabel, startCheck, tableRows, toggleGroup,
  type CheckJob, type FollowData, type FollowSource, type Layout, type SortDir, type SortKey,
  type TableRow as SourceTableRow,
} from './follow-manage';
import { AuthorAvatar, ErrorLine, SourceIcon, SourceLink, StatusBadge } from './source-view';

const sourceTableFeatures = tableFeatures({
  rowPaginationFeature,
  rowSelectionFeature,
  rowSortingFeature,
  columnVisibilityFeature,
  paginatedRowModel: createPaginatedRowModel(),
});

const count = (value: unknown) => (Number(value) || 0).toLocaleString();

/** 列头点的就是工具栏里的那一档排序，所以两边共用同一张对照表，方向也共用一个值。 */
const SORT_COLUMN = Object.fromEntries(
  Object.entries(COLUMN_SORT).map(([column, sort]) => [sort, column]),
) as Partial<Record<SortKey, string>>;

/** 工具行窄到这个宽度以下，带字的按钮就只留字形。取自旧版实测的那条断点。 */
const TOOLBAR_COMPACT_PX = 740;

/** 这一行自己有多宽。
 *
 * 判据只能是这一行自己的宽度，不是视口的：同一个视口下侧栏收起与展开留给它的宽度差两百
 * 像素，按视口断点会在一边早折、在另一边照样超框。塌下去用的是 `Button` 自己的 `iconOnly`
 * ——外面改它的内外边距会被 `no-restyle` 挡下，那条规则说的就是间距归控件自己。 */
function useCompactToolbar(): [(node: HTMLDivElement | null) => void, boolean] {
  const [compact, setCompact] = useState(false);
  const observer = useRef<ResizeObserver | null>(null);
  const attach = useCallback((node: HTMLDivElement | null) => {
    observer.current?.disconnect();
    if (!node) { observer.current = null; return }
    const watch = new ResizeObserver(() => setCompact(node.clientWidth < TOOLBAR_COMPACT_PX));
    watch.observe(node);
    observer.current = watch;
    setCompact(node.clientWidth < TOOLBAR_COMPACT_PX);
  }, []);
  useEffect(() => () => observer.current?.disconnect(), []);
  return [attach, compact];
}

const COLUMN_LABELS: Record<string, string> = {
  select: '选择', author: '创作者', source: '来源', provider: '站点',
  status: '状态', checked: '上次检查', actions: '操作',
};
const preferenceColumns = Object.entries(COLUMN_LABELS).map(([id, label]) => ({ id, label,
  width: id === 'select' ? 48 : id === 'source' ? 320 : id === 'author' ? 240 : id === 'actions' ? 208 : 184,
  min: id === 'select' ? 48 : id === 'actions' ? 200 : id === 'source' ? 320 : 112, max: id === 'select' ? 48 : id === 'source' ? 2000 : 800,
  flex: id === 'source',
  required: id === 'select' || id === 'source',
}));

/** 行上那两个动作由调用方给，但列定义不该跟着每一次渲染重建；两者之间放一个当前值的盒子。 */
interface RowHandlers {
  check(ids: number[]): void;
  /** 行尾的启用开关：只写这一条，不动勾选、不弹批量那句 toast，和订阅源表的开关一样。 */
  toggle(source: FollowSource, enabled: boolean): void;
  remove(source: FollowSource): void;
  busy: boolean;
  readOnly: boolean;
}

export interface SourceListProps {
  data: FollowData;
  sort: SortKey;
  dir: SortDir;
  page: number;
  layout: Layout;
  pageSize: number;
  selected: ReadonlySet<number>;
  readOnly: boolean;
  onSort(sort: SortKey, dir: SortDir): void;
  onPage(page: number): void;
  onLayout(layout: Layout): void;
  onPageSize(size: number): void;
  onSelected(next: Set<number>): void;
  toast(message: string): void;
  openFollow(): void;
  onAdd(): void;
}

/** 一条来源在创作者卡里的那一行：勾选、站标与名字、状态、上次检查、动作。 */
function SourceRow(
  { source, selected, onToggle, handlers }:
  { source: FollowSource; selected: boolean; onToggle(on: boolean): void; handlers: RowHandlers },
) {
  /* 点这一行的空白处就是勾上或取消：勾选框只有 16px，一行里其余的地方点了没反应的话，选几条要瞄几次。
     第一行是勾选、站标与名字、状态，宽屏时上次检查、开关与动作键也在这一行；报错单独占一整行，
     左边让出勾选框与站标的宽度，和名字对齐。窄屏依次是第一行、报错、操作行。 */
  return (
    <div data-selected={selected || undefined} data-follow-source-row=""
      className="flex min-h-16 flex-wrap items-center gap-3 px-2 py-3 last:rounded-b-lg max-sm:gap-x-2"
      onClick={(event) => { if (clickedBlank(event, event.currentTarget)) onToggle(!selected) }}>
      <Checkbox isSelected={selected} onChange={onToggle} aria-label={`选择 ${source.label}`} />
      {/* 名字从零宽起长：长名字在列内折行，不把状态和操作键挤到下一行。站标贴在名字前。 */}
      <span className="flex min-w-0 grow basis-0 items-center gap-1.5">
        <span data-follow-source-site="" className="flex shrink-0 items-center text-body-medium">
          <SourceIcon provider={source.provider} />
        </span>
        <SourceLink source={source} />
      </span>
      {/* 站标只画字形，站名给读屏。 */}
      <VisuallyHidden>{source.provider_label}</VisuallyHidden>
      <StatusBadge source={source} />
      {source.last_error ? (
        <span data-follow-source-error="" className="flex min-w-0 basis-full gap-3 max-sm:gap-x-2 sm:order-last">
          <span aria-hidden className="w-4 shrink-0" />
          <span className="flex min-w-0 grow gap-1.5">
            <span aria-hidden className="w-(--icon-inline) shrink-0 text-body-medium" />
            <span className="min-w-0 grow"><ErrorLine text={source.last_error} /></span>
          </span>
        </span>
      ) : null}
      <span data-follow-source-controls="" className="flex w-max max-w-full flex-none flex-wrap items-center gap-1.5 max-sm:w-full">
        <span className="shrink-0 text-body-2-regular whitespace-nowrap text-text-secondary max-sm:mr-auto max-sm:text-caption-1-regular">
          {checkedText(source)}
        </span>
        <Switch aria-label={`启用 ${source.label}`} isSelected={source.enabled}
          isDisabled={handlers.readOnly} onChange={(on) => handlers.toggle(source, on)} />
        <span className="flex shrink-0 items-center gap-1">
          <Button variant="secondary" size="small" iconOnly leadingIcon={RiRefreshLine}
            aria-label={`检查 ${source.label} 的更新`}
            disabled={!source.enabled || handlers.readOnly} {...busyProps(handlers.busy)}
            onClick={() => handlers.check([source.id])} />
          <Button variant="secondary" size="small" iconOnly leadingIcon={RiDeleteBinLine}
            aria-label={`移除 ${source.label}`} disabled={handlers.readOnly}
            onClick={() => handlers.remove(source)} />
        </span>
      </span>
    </div>
  );
}

/** 一位创作者一张卡。同一个人在几个站上的来源收在一处，标题行给出这个人的整体状态。 */
function AuthorCard(
  { group, name, open, selected, handlers, onOpen, onToggleGroup, onToggle }:
  {
    group: FollowSource[]; name: string; open: boolean; selected: ReadonlySet<number>;
    handlers: RowHandlers;
    onOpen(open: boolean): void;
    onToggleGroup(on: boolean): void;
    onToggle(id: number, on: boolean): void;
  },
) {
  const ids = group.map((source) => source.id);
  const enabled = group.filter((source) => source.enabled).map((source) => source.id);
  const bad = group.filter(isBroken).length;
  const providers = [...new Set(group.map((source) => source.provider_label || source.provider))].join('、');
  const panel = `follow-author-${group[0]!.id}`;
  const state = selectionState(selected, ids);
  return (
    <section aria-label={`${name} 的关注来源`}
      className={cardClass({
        variant: 'raised', padding: 'none', className: 'flex flex-col overflow-hidden p-2',
      })}>
      <div data-follow-author-header data-open={open || undefined}
        className="flex flex-wrap items-center gap-3 px-2 py-2.5">
        <AuthorAvatar group={group} name={name} />
        {/* 名字下面一行说这个人的来源：各站站标与失败数。窄屏时操作键另起一行靠右。 */}
        <span className="flex min-w-0 grow basis-0 flex-col gap-1">
          <b className="min-w-0 text-body-medium wrap-anywhere text-text-primary">{name}</b>
          <span data-follow-author-sites="" className="flex min-w-0 flex-wrap items-center gap-1 text-body-2-regular" title={providers}>
            {group.map((source) => <SourceIcon key={source.id} provider={source.provider} />)}
            {/* 只读屏用的文字走 `VisuallyHidden`：它把样式写在元素上，不会生成一个和旧
                样式表同名的工具类（`web/css/01-base.css` 里那条 `.sr-only` 带 !important）。 */}
            <VisuallyHidden>{`来源：${providers}`}</VisuallyHidden>
            {bad
              ? <span className="ml-1 shrink-0 text-text-error-primary">{`${bad} 个失败`}</span>
              : null}
          </span>
        </span>
        <span data-follow-author-controls="" className="flex flex-none items-center gap-2 max-sm:w-full max-sm:justify-end">
          <Button variant="secondary" size="small" iconOnly leadingIcon={RiRefreshLine}
            aria-label={`检查 ${name} 的全部来源`} disabled={!enabled.length || handlers.readOnly}
            {...busyProps(handlers.busy)} onClick={() => handlers.check(enabled)} />
          <span className="flex flex-none items-center gap-2">
          <Button variant="secondary" size="small" leadingIcon={RiCheckDoubleLine}
            aria-pressed={state.all ? 'true' : state.some ? 'mixed' : 'false'}
            aria-label={`${state.all ? '取消全选' : '全选'} ${name} 的来源`}
            onClick={() => onToggleGroup(!state.all)}>{state.all ? '取消全选' : '全选'}</Button>
          <Button variant="secondary" size="small" aria-expanded={open} aria-controls={panel}
            leadingIcon={CollapseChevron}
            aria-label={`${open ? '收起' : '展开'} ${name} 的来源`}
            onClick={() => onOpen(!open)}>{open ? '收起' : '展开'}</Button>
          </span>
        </span>
      </div>
      <CollapseRegion id={panel} open={open} data-source-divider>
        {group.map((source) => (
          <SourceRow key={source.id} source={source} handlers={handlers}
            selected={selected.has(source.id)} onToggle={(on) => onToggle(source.id, on)} />
        ))}
      </CollapseRegion>
    </section>
  );
}

export function SourceList(props: SourceListProps) {
  const {
    data, sort, dir, page, layout, pageSize, selected, readOnly,
    onSort, onPage, onLayout, onPageSize, onSelected, toast, openFollow, onAdd,
  } = props;
  const sources = data.sources;
  const aliases = useMemo(() => data.author_aliases || [], [data.author_aliases]);
  const counts = data.counts || {};
  const [collapsed, setCollapsed] = useState<ReadonlySet<string>>(new Set<string>());
  const [toolbar, compact] = useCompactToolbar();
  const [problem, setProblem] = useState('');

  const groups = useMemo(() => authorGroups(sources, sort, dir, aliases), [sources, sort, dir, aliases]);
  const rows = useMemo(() => tableRows(groups, sort, dir, aliases), [groups, sort, dir, aliases]);

  const { job, running, outcome, start: check } = useBackgroundJob<CheckJob, number[]>({
    queryKey: FOLLOW_CHECK_KEY,
    queryFn: ({ signal }) => fetchCheckJob(signal),
    start: (ids) => startCheck(ids),
    onError: (cause) => setProblem(errorMessage(cause)),
    onFinish: (state) => {
      void reloadFollowManage();
      toast(state.status === 'failed' ? (state.error || '检查失败') : checkReceipt(state));
    },
  });

  const startChecking = (ids: number[]) => {
    if (running || check.isPending) return;
    setProblem('');
    check.mutate(ids);
  };

  const toggleOne = (id: number, on: boolean) => onSelected(toggleGroup(selected, [id], on));
  const toggleMany = (ids: number[], on: boolean) => onSelected(toggleGroup(selected, ids, on));

  /* 单条移除只把那一条从缓存里去掉，顺手把它从勾选里也去掉：否则底部那条会一直算着
     一个已经不存在的来源。 */
  const remove = useMutation({
    mutationFn: (id: number) => removeSource(id),
    onSuccess: (_result, id) => {
      dropSources([id]);
      onSelected(toggleGroup(selected, [id], false));
      toast('已取消关注来源');
    },
    onError: (cause) => setProblem(errorMessage(cause)),
  });

  /* 行尾的开关只写这一条并改本地那一行；批量那条路会顺手清勾选、弹「已启用 n 个」，
     一枚开关不该有这两样动静。 */
  const toggleEnabled = useMutation({
    mutationFn: (work: { id: number; enabled: boolean }) => setSourceEnabled(work.id, work.enabled),
    onSuccess: (_result, work) => {
      patchSource(work.id, { enabled: work.enabled });
      setProblem('');
    },
    onError: (cause) => setProblem(errorMessage(cause)),
  });

  const removeSourceRow = (source: FollowSource) => void confirmModal({
    title: '取消关注来源', body: '将移除这个来源及已抓取的条目，媒体文件保留。',
    confirmLabel: '取消关注来源', danger: true,
    onConfirm: () => remove.mutateAsync(source.id),
  });

  /** 批量：一次请求一条，有界并发。串行发几百条是实测的卡点，一次全发出去又会自己挤自己。 */
  const bulk = useMutation({
    mutationFn: async (work: { ids: number[]; action: 'enabled' | 'paused' | 'remove' }) => {
      const results = await mapLimit(work.ids, 4, async (id: number) => {
        if (work.action === 'remove') await removeSource(id);
        else await setSourceEnabled(id, work.action === 'enabled');
      });
      return { ...work, done: work.ids.filter((_id, at) => results[at]?.ok), results };
    },
    onSuccess: (result) => {
      if (result.action === 'remove') dropSources(result.done);
      else for (const id of result.done) patchSource(id, { enabled: result.action === 'enabled' });
      onSelected(toggleGroup(selected, result.done, false));
      const failed = result.results.filter((row) => !row.ok);
      if (failed.length) {
        setProblem(`${failed.length}/${result.ids.length} 个来源未更新：${errorMessage(failed[0]?.error)}`);
        return;
      }
      setProblem('');
      const word = result.action === 'remove' ? '删除' : result.action === 'enabled' ? '启用' : '暂停';
      toast(`已${word} ${result.done.length} 个关注来源`);
    },
    onError: (cause) => setProblem(errorMessage(cause)),
  });

  /** 未看条目的批量标记：按 1000 条一批调批量接口，一页待处理之外的也接着标完（`markAllPending`）。 */
  const markAll = useMutation({
    mutationFn: markAllPending,
    onSuccess: (result) => {
      void reloadFollowManage();
      if (result.failed) {
        setProblem(`批量更新 ${result.failed}/${result.total} 项未完成：${errorMessage(result.error)}`);
        return;
      }
      setProblem('');
      toast(`已批量标记 ${result.total} 项`);
    },
    onError: (cause) => setProblem(errorMessage(cause)),
  });

  const toggleSourceRow = (source: FollowSource, enabled: boolean) =>
    toggleEnabled.mutate({ id: source.id, enabled });

  const handlers = useRef<RowHandlers>({
    check: startChecking, toggle: toggleSourceRow, remove: removeSourceRow, busy: false, readOnly,
  });
  handlers.current = {
    check: startChecking,
    toggle: toggleSourceRow,
    remove: removeSourceRow,
    busy: running || check.isPending,
    readOnly,
  };
  const rowHandlers = handlers.current;

  /* ── 表格视图：列定义、排序、行选择与分页都交给 TanStack Table ── */
  const columns = useMemo(() => {
    const column = createColumnHelper<typeof sourceTableFeatures, SourceTableRow>();
    const label = (id: string) => () => COLUMN_LABELS[id] || id;
    return column.columns([
      column.display({
        id: 'select',
        header: context => <TableSelectionHeader table={context.table} label="全选本页来源" page />,
        /* `slot={null}`：表格自带一个叫 selection 的插槽，摆进去的勾不声明归属就会被它
           拦下报错。这一列的勾归 TanStack Table 那份行选择管，不走 Table 自己的选择。 */
        cell: (context) => (
          <Checkbox slot={null} isSelected={context.row.getIsSelected()}
            onChange={(on) => context.row.toggleSelected(on)}
            aria-label={`选择 ${context.row.original.source.label}`} />
        ),
      }),
      column.accessor((row) => row.author, {
        id: 'author',
        header: label('author'),
        cell: (context) => (
          <span className="flex min-w-0 items-center gap-2">
            <AuthorAvatar group={context.row.original.group} name={context.row.original.author} />
            <span className="min-w-0 break-words">{context.row.original.author}</span>
          </span>
        ),
      }),
      column.accessor((row) => row.source.label, {
        id: 'source',
        header: label('source'),
        cell: (context) => (
          <span className="flex min-w-0 flex-col gap-0.5">
            <SourceLink source={context.row.original.source} />
            {context.row.original.source.last_error ? <ErrorLine text={context.row.original.source.last_error} /> : null}
          </span>
        ),
      }),
      column.accessor((row) => row.source.provider_label, {
        id: 'provider',
        header: label('provider'),
        cell: (context) => (
          <span className="flex items-center gap-1.5">
            <SourceIcon provider={context.row.original.source.provider} />
            {context.row.original.source.provider_label}
          </span>
        ),
      }),
      column.display({
        id: 'status',
        header: label('status'),
        cell: (context) => <StatusBadge source={context.row.original.source} />,
      }),
      column.accessor((row) => row.source.last_checked_at || '', {
        id: 'checked',
        header: label('checked'),
        cell: (context) => checkedText(context.row.original.source),
      }),
      column.display({
        id: 'actions',
        header: label('actions'),
        cell: (context) => (
          <span className="flex items-center gap-1">
            <Switch aria-label={`启用 ${context.row.original.source.label}`}
              isSelected={context.row.original.source.enabled} isDisabled={rowHandlers.readOnly}
              onChange={(on) => handlers.current.toggle(context.row.original.source, on)} />
            <Button variant="secondary" size="small" iconOnly leadingIcon={RiRefreshLine}
              aria-label={`检查 ${context.row.original.source.label} 的更新`}
              disabled={!context.row.original.source.enabled || rowHandlers.readOnly}
              {...busyProps(rowHandlers.busy)}
              onClick={() => handlers.current.check([context.row.original.source.id])} />
            <Button variant="secondary" size="small" iconOnly leadingIcon={RiDeleteBinLine}
              aria-label={`移除 ${context.row.original.source.label}`} disabled={rowHandlers.readOnly}
              onClick={() => handlers.current.remove(context.row.original.source)} />
          </span>
        ),
      }),
    ]);
  }, [rowHandlers]);

  const sorting: SortingState = useMemo(() => {
    const id = SORT_COLUMN[sort];
    return id ? [{ id, desc: dir === 'desc' }] : [];
  }, [sort, dir]);
  const rowSelection: RowSelectionState = useMemo(
    () => Object.fromEntries([...selected].map((id) => [String(id), true])), [selected]);

  const asTable = layout === 'table';
  const preferences = useTablePreferences('follow-sources', preferenceColumns);
  // 越界的页码落到末页：地址栏里挂着的可能是上一次、来源更多时的页码。
  const win = pageWindow(asTable ? rows.length : groups.length, pageSize, page);

  const table = useTable({
    features: sourceTableFeatures,
    data: rows,
    columns,
    /* 行的身份是来源 ID，不是它在这一页里的下标：换页、换排序之后 `rowSelection` 里记着的
       仍是同一批来源，卡片视图读的也是同一组数。 */
    getRowId: (row) => String(row.source.id),
    state: { sorting, rowSelection, pagination: { pageIndex: win.page - 1, pageSize }, columnVisibility: preferences.visibility },
    onColumnVisibilityChange: preferences.change,
    /* 排序由共用的比较器算好再交进来：表格自己再排一遍的话，卡片视图与表格视图会各有一套
       顺序，同一份数据在两个视图里的先后就不一样了。 */
    manualSorting: true,
    enableRowSelection: true,
    onSortingChange: (updater) => {
      const next = typeof updater === 'function' ? updater(sorting) : updater;
      const first = next[0];
      if (!first) return;
      const key = COLUMN_SORT[first.id as keyof typeof COLUMN_SORT];
      if (key) onSort(key, first.desc ? 'desc' : 'asc');
    },
    onRowSelectionChange: (updater) => {
      const next = typeof updater === 'function' ? updater(rowSelection) : updater;
      onSelected(new Set(Object.entries(next).filter(([, on]) => on).map(([id]) => Number(id))));
    },
    onPaginationChange: (updater) => {
      const now = { pageIndex: win.page - 1, pageSize };
      const next = typeof updater === 'function' ? updater(now) : updater;
      if (next.pageSize !== pageSize) onPageSize(next.pageSize);
      else if (next.pageIndex !== now.pageIndex) onPage(next.pageIndex + 1);
    },
  });

  const pageRows = table.getRowModel().rows;
  const pageIds = asTable
    ? pageRows.map((row) => row.original.source.id)
    : groups.slice(win.start, win.end).flatMap((group) => group.map((source) => source.id));
  const pageState = selectionState(selected, pageIds);
  const chosen = [...selected];
  const failures = checkFailures(outcome);
  const failedSourceIds = sources.filter((source) => source.enabled
    && (source.last_status === 'error' || source.last_status === 'unauthorized')).map((source) => source.id);
  const evidence = checkEvidenceGap(outcome);
  const allCollapsed = groups.length > 0 && collapsed.size >= groups.length;

  if (!sources.length) {
    return (
      <EmptyState icon={RiRssLine} title="还没有关注来源" actions={
        <Button variant="primary" size="small" onClick={onAdd}>添加关注</Button>
      }>关注来源及其检查状态会显示在这里。</EmptyState>
    );
  }

  return (
    /* 旧 `.followmanage .fmain>.fsec`：整块关注列表是一张填充卡，标题、工具条、创作者分组
       和底下那条汇总都在同一张卡里，不是一个描边容器套着几行。 */
    <div className={cardClass({
      padding: 'none',
      className: 'flex flex-col gap-4 px-6 py-5 max-sm:px-4',
    })}>
      {/* 操作区作为一组换行；独占一行仍放不下时，组内控件继续按顺序换行。 */}
      <div ref={toolbar} data-follow-toolbar="" data-responsive-toolbar="">
        <span data-follow-toolbar-heading="" data-toolbar-heading="">
          <h3 className="text-title-2-medium text-text-primary">关注列表</h3>
          <span className="text-body-2-regular text-text-secondary">
            {`${sources.length.toLocaleString()} 个来源${counts.new ? ` · ${count(counts.new)} 条未看` : ''}`}
          </span>
        </span>
        <div data-follow-toolbar-actions="" data-toolbar-actions="">
        {failedSourceIds.length ? <Button variant="secondary" disabled={readOnly}
          {...busyProps(rowHandlers.busy)} onClick={() => startChecking(failedSourceIds)}>检查失败项</Button> : null}
        <Button variant="primary" leadingIcon={RiRefreshLine} disabled={readOnly}
          aria-label="检查全部" iconOnly={compact}
          {...busyProps(rowHandlers.busy)} onClick={() => startChecking([])}>检查全部</Button>
        <span data-follow-toolbar-controls="" className="contents">
          <span data-button-group role="group" aria-label="关注列表版式">
            <Button variant="ghost" iconOnly
              leadingIcon={RiLayoutGridLine} aria-label={LAYOUTS[0][1]} aria-pressed={!asTable}
              onClick={() => onLayout('default')} />
            <Button variant="ghost" iconOnly
              leadingIcon={RiTableLine} aria-label={LAYOUTS[1][1]} aria-pressed={asTable}
              onClick={() => onLayout('table')} />
          </span>
          {asTable ? <TableColumnControls preferences={preferences} label="关注来源" /> : null}
          <span className="flex flex-none items-center gap-2">
          <Select aria-label="关注列表排序" prefix="排序" selectedKey={sort}
            onSelectionChange={(key) => {
              if (key === null) return;
              const next = String(key) as SortKey;
              onSort(next, SORT_DEFAULT_DIR[next]);
            }}>
            {SORT_OPTIONS.map(([key, name]) => <SelectItem key={key} id={key}>{name}</SelectItem>)}
          </Select>
          {/* 箭头是装饰，方向由无障碍名称说，而且说的是点下去会得到的那一头。 */}
          <Button variant="secondary" iconOnly
            leadingIcon={SortDirectionIcon} data-icon-state={dir === 'asc' ? 'a' : 'b'}
            aria-label={sortLabel(sort, dir)}
            onClick={() => onSort(sort, dir === 'asc' ? 'desc' : 'asc')} />
          </span>
          {asTable ? null : (
            <Button variant="secondary" iconOnly={compact}
              leadingIcon={CollapseChevron} aria-expanded={!allCollapsed}
              aria-label={allCollapsed ? '全部展开' : '全部收起'}
              onClick={() => setCollapsed(allCollapsed
                ? new Set<string>()
                : new Set(groups.map((group) => String(group[0]!.author_key || group[0]!.id))))}>
              {allCollapsed ? '全部展开' : '全部收起'}
            </Button>
          )}
        </span>
        </div>
      </div>

      {/* 这一趟在后台跑，关掉页面还在继续，所以状态留在页面上而不是只让按钮转一下。 */}
      <div aria-live="polite" className="flex flex-col gap-3 empty:hidden">
        {running ? <TaskProgress embedded label={job?.message || (job?.total
          ? `${job.older ? '抓取历史' : '检查更新'}：已完成 ${job.checked || 0}/${job.total} 个来源`
          : '正在准备检查任务')} value={job?.checked} total={job?.total} /> : null}
        {problem ? <Note tone="error" title="操作未完成">{problem}</Note> : null}
        {!running && outcome?.results?.length ? (
          <Note tone="neutral" title="检查结果">{checkSummary(outcome)}</Note>
        ) : null}
        {failures.length ? (
          <Note tone="error" title={`${failures.length} 个来源检查失败`}
            extra={<ul className="flex flex-col gap-0.5 text-body-2-regular">
              {failures.map((row, at) => (
                <li key={`${row.provider || ''}-${row.ref || at}`}>
                  {`${row.provider_label || row.provider || ''} ${row.author || row.label || row.ref || ''}：${errorHeadline(row.error || '') || '未说明原因'}`}
                </li>
              ))}
            </ul>}>
            这些来源这一轮没有取到更新。
          </Note>
        ) : null}
        {evidence ? <Note tone="warning">{`条目已保存，但这次未保存来源的原始响应：${evidence}`}</Note> : null}
      </div>

        <SelectionDock label="关注来源批量操作" visible={chosen.length > 0} count={`已选 ${chosen.length} 个来源`}>
          <Button variant="secondary" size="small" disabled={readOnly}
            {...busyProps(rowHandlers.busy)} onClick={() => startChecking(chosen)}>检查所选</Button>
          <Button variant="secondary" size="small" disabled={readOnly} {...busyProps(bulk.isPending)}
            onClick={() => bulk.mutate({ ids: chosen, action: 'enabled' })}>启用</Button>
          <Button variant="secondary" size="small" disabled={readOnly} {...busyProps(bulk.isPending)}
            onClick={() => bulk.mutate({ ids: chosen, action: 'paused' })}>暂停</Button>
          <Button variant="danger" size="small" disabled={readOnly} {...busyProps(bulk.isPending)}
            onClick={() => void confirmModal({
              title: `删除 ${chosen.length} 个关注来源`,
              body: '将移除所选关注来源及其已抓取条目，媒体文件保留。',
              confirmLabel: '删除所选来源', danger: true,
              onConfirm: () => bulk.mutateAsync({ ids: chosen, action: 'remove' }),
            })}>删除</Button>
          <Button variant="ghost" size="small" onClick={() => onSelected(new Set())}>取消选择</Button>
        </SelectionDock>

      {asTable ? (
        <DataTableFrame follow preferences={preferences} onRowClick={(key) => toggleOne(Number(key), !selected.has(Number(key)))}>
          <Table aria-label="关注来源" size="sm"
            sortDescriptor={sorting[0]
              ? { column: sorting[0].id, direction: sorting[0].desc ? 'descending' : 'ascending' }
              : undefined}
            onSortChange={(descriptor) => table.setSorting([
              { id: String(descriptor.column), desc: descriptor.direction === 'descending' },
            ])}>
            <TableHeader>
              {table.getHeaderGroups()[0]!.headers.map((header) => {
                const sortable = header.column.id in COLUMN_SORT;
                const text = flexRender(header.column.columnDef.header, header.getContext());
                return (
                  <TableColumn key={header.id} id={header.id} allowsSorting={sortable}
                    isRowHeader={header.column.id === 'source'} {...preferences.columnProps(header.id)}>
                    {({ sortDirection }) => <>{header.id === 'select' ? text : sortable ? (
                      <span className="flex items-center gap-0.5">
                        {text}
                        <span data-sort-indicator data-direction={sortDirection || undefined}>
                          <ChevronSortDown />
                        </span>
                      </span>
                    ) : <VisuallyHidden>{text}</VisuallyHidden>}<TableColumnResizer preferences={preferences} id={header.id} /></>}
                  </TableColumn>
                );
              })}
              <TableColumn id="remaining-space" aria-label="行空白区域" data-table-space="" width={preferences.spaceWidth} minWidth={0} />
            </TableHeader>
            <TableBody renderEmptyState={() => '这一页没有来源'}>
              {pageRows.map((row) => (
                <TableRow key={row.id} id={row.id}
                  data-follow-selected={row.getIsSelected() || undefined}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                  <TableCell data-table-space="" />
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </DataTableFrame>
      ) : (
        <>
          <Checkbox isSelected={pageState.all} isIndeterminate={pageState.some}
            onChange={(on) => toggleMany(pageIds, on)} aria-label="全选本页来源">全选本页</Checkbox>
          <div className="flex flex-col gap-3">
            {groups.slice(win.start, win.end).map((group) => {
              const key = String(group[0]!.author_key || group[0]!.id);
              return (
                <AuthorCard key={key} group={group} name={authorName(group, aliases)}
                  handlers={rowHandlers} selected={selected} open={!collapsed.has(key)}
                  onOpen={(open) => {
                    const next = new Set(collapsed);
                    if (open) next.delete(key); else next.add(key);
                    setCollapsed(next);
                  }}
                  onToggleGroup={(on) => toggleMany(group.map((source) => source.id), on)}
                  onToggle={toggleOne} />
              );
            })}
          </div>
        </>
      )}

      <DataTableFooter label="关注列表" total={win.total} pagination={{ pageIndex: win.page - 1, pageSize }}
        unit={asTable ? '个来源' : '位创作者'} pageUnit={asTable ? '条' : '位'}
        onChange={(next) => { if (next.pageSize !== pageSize) table.setPageSize(next.pageSize); else table.setPageIndex(next.pageIndex); }} />

      {counts.new ? (
        /* 旧 `.fsecfoot`：汇总与它的动作是卡底那一条带，比卡面暗一点点，通到卡片左右两沿。 */
        <div className="-mx-6 -mb-5 flex flex-wrap items-center gap-2 border-t border-separator-border rounded-b-2xl bg-card-footer px-6 py-4 max-sm:-mx-4 max-sm:px-4">
          <span className="mr-auto text-body-2-regular text-text-secondary">
            {`未看 ${count(counts.new)} · 已看 ${count(counts.seen)} · 已保存 ${count(counts.saved)} · 已忽略 ${count(counts.ignored)}`}
          </span>
          <Button variant="secondary" size="small" onClick={openFollow}>去看更新</Button>
          <Button variant="secondary" size="small" disabled={readOnly} {...busyProps(markAll.isPending)}
            onClick={() => void confirmModal({
              title: '标记已看', body: '将把当前未看作品标记为已看。', confirmLabel: '标记已看',
              onConfirm: () => markAll.mutateAsync('seen'),
            })}>全部标记已看</Button>
          <Button variant="secondary" size="small" disabled={readOnly} {...busyProps(markAll.isPending)}
            onClick={() => void confirmModal({
              title: '标记已忽略', body: '将把当前未看作品标记为已忽略。', confirmLabel: '标记已忽略',
              onConfirm: () => markAll.mutateAsync('ignored'),
            })}>全部忽略</Button>
        </div>
      ) : null}
    </div>
  );
}
