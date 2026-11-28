/* 文件面板的目录状态只在面板内变化，背景页面不参与导航。 */
import { useCallback, useContext, useEffect, useRef, useState, useSyncExternalStore, type MouseEvent } from 'react';
import { flushSync } from 'react-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { SortingState } from '@tanstack/react-table';
import { useLocation } from 'react-router';
import { Heading } from 'react-aria-components';
import { RiArrowUpLine, RiDeleteBin6Line, RiFullscreenExitLine, RiFileLine, RiFolder3Line, RiFolderAddLine,
  RiFullscreenLine, RiRefreshLine, RiSearchLine } from '@remixicon/react';
import { Button } from '@/components/base/buttons/button';
import { IconButton } from '@/components/base/buttons/icon-button';
import { Checkbox } from '@/components/base/checkbox/checkbox';
import { Input } from '@/components/base/input/input';
import { Breadcrumb, BreadcrumbItem } from '@/components/base/breadcrumb/breadcrumb';
import { Table, TableBody, TableCell, TableColumn, TableHeader, TableRow } from '@/components/base/table/table';
import { ChevronSortDown } from '@/components/foundations/icons/chevrons';
import { fmtDur, fmtSize } from '@peach/legacy/core';
import { MEDIA_SOURCE_ICONS } from '@peach/legacy/ui';
import { backgroundOf, isOverlayPath } from '@peach/history';
import { apiGet, apiSend, errorMessage } from '../../api';
import { hasSelectionModifier } from '../../selection';
import { t } from '../../i18n';
import { catalogTableDate } from '../catalog-grid/catalog-table-controls';
import { DataTableFrame } from '../components/data-table-frame';
import { DataTableFooter } from '../components/table-controls';
import { TableColumnControls, TableColumnLayout, TableColumnResizer } from '../components/table-column-controls';
import { useTablePreferences, type TableColumnSpec } from '../components/table-column-preferences';
import { useRememberedPageSize } from '../components/page-size-preferences';
import { SelectionDock } from '../components/selection-dock';
import { ColumnFilterPopover } from '../components/table-column-filter';
import { MenuDialog } from '../components/menu-dialog';
import { useTableFilters, type TableFacets, type TableFilter, type TableFilters } from '../components/use-table-filters';
import { ModalFrame } from '../components/modal-frame';
import { overlayHost } from '../components/overlay-host';
import { EmptyState } from '../components/empty-state';
import { Note } from '../components/note';
import { SettingsDialogClose } from '../components/settings-dialog-close';
import { ShellActionsContext } from '../router/router';
import { Disclosure, SourceMark } from '../settings/section';
import { busyProps } from '../settings/busy-props';
import { FileNameDialog, FileTrashDialog, fileOperation, resultError, type FileEntry, type FileRequest, type FileTrashEntry } from './file-browser-actions';
import './media-directory.css';
import { closeMediaDirectory, directorySnapshot, subscribeDirectory } from './media-directory-navigation';

interface DirectoryRoot { id: string; name: string; mount: string; icon: string }
interface DirectoryEntry { name: string; modified_at: number | null; created_at: number | null }
interface DirectoryFile extends DirectoryEntry {
  size: number | null; asset_id: number | null; duration?: number | null; width?: number | null; height?: number | null;
}
interface BrowsePosition { origin: string | null; row: string; top: number; left: number }

interface DirectoryPage {
  roots: DirectoryRoot[];
  root: string | null; relative: string; path?: string; last_path?: string; focus_name?: string;
  path_separator?: string; total?: number;
  facets?: TableFacets;
  state: 'roots' | 'ready' | 'unmapped' | 'denied' | 'missing' | 'timeout' | 'unreachable';
  directories: DirectoryEntry[]; files: DirectoryFile[];
  next_offset: number | null;
  read_only?: boolean | null;
  offset?: number;
}

const COLUMNS: (TableColumnSpec & { copyKey?: string })[] = [
  { id: 'select', label: t('shell:dataTable.selectColumn'), width: 44, min: 44, max: 44, required: true },
  { id: 'name', label: t('shell:mediaDirectory.name'), width: 204, min: 136, required: true, flex: true, copyKey: 'mediaDirectory.name' },
  { id: 'type', label: t('shell:mediaDirectory.type'), width: 120, min: 108, copyKey: 'mediaDirectory.type' },
  { id: 'size', label: t('settings:shared.fileSize'), width: 116, min: 104, copyKey: 'mediaDirectory.size' },
  { id: 'modified', label: t('shell:mediaDirectory.modifiedAt'), width: 176, min: 160, copyKey: 'mediaDirectory.modifiedAt' },
  { id: 'duration', label: t('catalog:catalogList.duration'), width: 136, min: 128, copyKey: 'mediaDirectory.duration' },
  { id: 'resolution', label: t('catalog:catalogList.resolution'), width: 148, min: 140, copyKey: 'mediaDirectory.resolution' },
  { id: 'created', label: t('shell:mediaDirectory.createdAt'), width: 168, min: 156, visible: false, copyKey: 'mediaDirectory.createdAt' },
];
const PAGE_SIZES = [20, 50, 100, 200];
const FILTERS: Record<string, TableFilter<DirectoryEntry & Partial<DirectoryFile>>> = {
  type: { values: () => '', option: id => ({
    label: id === 'folder' ? t('shell:mediaDirectory.folder') : id === 'file' ? t('shell:mediaDirectory.file') : id,
  }) },
  size: { range: 'size', value: item => item.size },
  modified: { range: 'timestamp', value: item => item.modified_at },
  created: { range: 'timestamp', value: item => item.created_at },
  duration: { range: 'duration', value: item => item.duration },
  resolution: { values: () => '', option: id => ({ label: id === 'none' ? t('cleanup:shared.none') : id.replace('×', ' × ') }) },
};
const entryKey = ({ name, directory }: FileEntry) => `${directory ? 'dir' : 'file'}:${name}`;
const ROOT_COLUMNS = [
  { id: 'library', label: t('shell:shared.library'), required: true },
  { id: 'mount', label: t('shell:mediaDirectory.mountPath'), required: true },
] as const;

function LibraryName({ library, crumb = false }: { library: DirectoryRoot; crumb?: boolean }) {
  return <span className="flex min-w-0 items-center gap-1.5" title={crumb ? library.mount : library.name}>
    <SourceMark mark={MEDIA_SOURCE_ICONS[library.icon] ?? library.icon} />
    <span className={crumb ? 'folder-crumb-name' : 'truncate'}>{library.name}</span>
  </span>;
}

function EntryName({ name, folder = false }: { name: string; folder?: boolean }) {
  const Icon = folder ? RiFolder3Line : RiFileLine;
  return <span className="flex min-w-0 items-center gap-2">
    <Icon aria-hidden className="size-(--icon-inline) shrink-0 text-foreground-icon-secondary" />
    <span className="min-w-0 truncate" dir="auto" title={name}>{name}</span>
  </span>;
}

function fileFormat(name: string) {
  const dot = name.lastIndexOf('.');
  return dot > 0 && dot < name.length - 1 ? name.slice(dot + 1).toUpperCase() : t('shell:mediaDirectory.file');
}

export function MediaDirectoryBrowser() {
  const request = useSyncExternalStore(subscribeDirectory, directorySnapshot);
  return request ? <DirectoryBrowser key={request.revision} initial={request.search} revision={request.revision} /> : null;
}

function DirectoryBrowser({ initial, revision }: { initial: string; revision: number }) {
  const [params, setParams] = useState(() => new URLSearchParams(initial));
  const [returnPosition, setReturnPosition] = useState<BrowsePosition | null>(null);
  const [isOpen, setOpen] = useState(true);
  const [fullScreen, setFullScreen] = useState(() => new URLSearchParams(initial).get('directory_full') === '1');
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<TableFilters>({});
  const [search, setSearch] = useState('');
  const [term, setTerm] = useState('');
  const [pageSize, setPageSize] = useRememberedPageSize('media-directory', 100);
  const [selection, setSelection] = useState(new Map<string, FileEntry>());
  const [selecting, setSelecting] = useState(false);
  const rangeStart = useRef<string | null>(null);
  const shiftCheck = useRef(false);
  const [moveFrom, setMoveFrom] = useState<{ root: string; relative: string; params: URLSearchParams } | null>(null);
  const [trashView, setTrashView] = useState(false);
  const [trashSelection, setTrashSelection] = useState(new Set<string>());
  const [nameDialog, setNameDialog] = useState<{ mode: 'mkdir' | 'rename'; item?: FileEntry } | null>(null);
  const [confirmTrash, setConfirmTrash] = useState(false);
  const [busy, setBusy] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [failure, setFailure] = useState<string[]>([]);
  const [receipt, setReceipt] = useState('');
  const closing = useRef(false);
  const preferences = useTablePreferences('media-directory', COLUMNS);
  const rootPreferences = useTablePreferences('media-directory-roots', ROOT_COLUMNS);
  const location = useLocation();
  const actions = useContext(ShellActionsContext);
  const client = useQueryClient();
  const permission = useQuery({ queryKey: ['file-browser-permission'], staleTime: 60_000,
    queryFn: ({ signal }) => apiGet<{ ledger_read_only?: boolean }>('/healthz', signal) });
  const sort = sorting[0];
  const queryParams = new URLSearchParams();
  for (const key of ['root', 'relative', 'asset', 'offset']) {
    const value = params.get(`directory_${key}`);
    if (value) queryParams.set(key, value);
  }
  queryParams.set('sort', sort?.id ?? 'name');
  queryParams.set('dir', sort?.desc ? 'desc' : 'asc');
  queryParams.set('limit', String(pageSize));
  if (term && !moveFrom) queryParams.set('q', term);
  const encodedFilters = JSON.stringify(columnFilters);
  if (encodedFilters !== '{}' && !moveFrom) queryParams.set('column_filters', encodedFilters);
  const query = useQuery<DirectoryPage>({ queryKey: ['media-directory', queryParams.toString()], retry: false, refetchOnWindowFocus: false,
    placeholderData: previous => previous?.root === queryParams.get('root') &&
      previous?.relative === (queryParams.get('relative') ?? '') ? previous : undefined,
    queryFn: ({ signal }) => apiGet<DirectoryPage>(`/api/media-directory?${queryParams}`, signal) });
  const focused = useRef<HTMLTableRowElement>(null);
  const dialog = useRef<HTMLDivElement>(null);
  const connectDialog = useCallback((node: HTMLDivElement | null) => {
    dialog.current = node;
    if (!node && closing.current) queueMicrotask(() => {
      if (directorySnapshot()?.revision === revision) closeMediaDirectory();
    });
  }, [revision]);
  const onOverlay = isOverlayPath(location.pathname);
  const suspended = returnPosition !== null && onOverlay;
  const leftOrigin = returnPosition?.origin != null && !onOverlay &&
    returnPosition.origin !== location.pathname + location.search;
  const data = query.data;
  const rootId = data?.root;
  const trash = useQuery({ queryKey: ['media-directory-trash'], enabled: trashView, retry: false,
    queryFn: ({ signal }) => apiGet<{ items: FileTrashEntry[] }>('/api/media-directory/trash', signal) });
  const trashItems = trash.data?.items ?? [];
  const availableTrash = trashItems.filter(item => item.available);
  useEffect(() => { focused.current?.scrollIntoView({ block: 'nearest', inline: 'nearest' }) }, [data]);
  useEffect(() => {
    if (leftOrigin) closeMediaDirectory();
  }, [leftOrigin]);
  const restoreTable = useCallback((table: HTMLTableElement | null) => {
    if (!table || !returnPosition) return;
    let scrollFrame = 0;
    const focusFrame = requestAnimationFrame(() => {
      // 表格导航会把焦点行滚入视野，等它更新完再恢复原来的两轴位置。
      flushSync(() => table.querySelector<HTMLElement>(`[data-key="${CSS.escape(returnPosition.row)}"]`)?.focus({ preventScroll: true }));
      scrollFrame = requestAnimationFrame(() => {
        table.parentElement?.scrollTo({ top: returnPosition.top, left: returnPosition.left, behavior: 'instant' });
        setReturnPosition(null);
      });
    });
    return () => { cancelAnimationFrame(focusFrame); cancelAnimationFrame(scrollFrame) };
  }, [returnPosition]);
  const clearSelection = () => { setSelection(new Map()); setSelecting(false); rangeStart.current = null };
  const change = (root?: string, relative = '', offset = 0) => {
    const next = new URLSearchParams();
    if (root) next.set('directory_root', root);
    if (relative) next.set('directory_relative', relative);
    if (offset) next.set('directory_offset', String(offset));
    setReturnPosition(null);
    setParams(next);
  };
  const browse = (root?: string, relative = '') => {
    if (!moveFrom) { clearSelection(); setColumnFilters({}) }
    setTrashSelection(new Set()); setTrashView(false);
    setSearch(''); setTerm(''); setFailure([]); setReceipt('');
    change(root, relative);
  };
  useEffect(() => {
    const timer = window.setTimeout(() => {
      const next = search.trim();
      if (next === term) return;
      setTerm(next);
      setParams(current => {
        if (!data?.root) return current;
        const params = new URLSearchParams({ directory_root: data.root });
        if (data.relative) params.set('directory_relative', data.relative);
        return params;
      });
    }, 250);
    return () => window.clearTimeout(timer);
  }, [search, term, data?.root, data?.relative]);
  const root = data?.roots.find(item => item.id === data.root);
  const parts = data?.relative ? data.relative.split('/') : [];
  const close = () => { closing.current = true; setOpen(false) };
  const openAsset = (id: number, row: string) => {
    if (!actions) return;
    const scroller = dialog.current?.querySelector<HTMLElement>('[data-media-directory-body] .overflow-x-auto');
    const origin = onOverlay ? backgroundOf(location.state) : location;
    setReturnPosition({ origin: origin ? origin.pathname + origin.search : null,
      row, top: scroller?.scrollTop ?? 0, left: scroller?.scrollLeft ?? 0 });
    actions.openItem(id);
  };
  const selectedMissing = data?.state === 'ready' && data.focus_name && !data.files.some(item => item.name === data.focus_name);
  const path = data?.last_path || data?.path;
  const hasRoots = data?.state === 'roots' && data.roots.length > 0;
  const readyFiles = data?.state === 'ready';
  const shown = preferences.columns.filter(column => preferences.visibility[column.id] !== false && (column.id !== 'select' || (selecting && !moveFrom)));
  const visibleFiles = moveFrom ? [] : (data?.files ?? []);
  const pageEntries: FileEntry[] = [
    ...(data?.directories ?? []).map(({ name }) => ({ name, directory: true })),
    ...visibleFiles.map(({ name, asset_id }) => ({ name, directory: false, asset_id })),
  ];
  const picked = [...selection.values()];
  const allPage = pageEntries.length > 0 && pageEntries.every(item => selection.has(entryKey(item)));
  const pageHasSelected = pageEntries.some(item => selection.has(entryKey(item)));
  const canWriteLedger = permission.data?.ledger_read_only === false;
  const canWrite = canWriteLedger && !data?.read_only;
  const entriesLabel = t('shell:mediaDirectory.entries');
  const applySelection = (items: FileEntry[], add: boolean, checked = true) => {
    setSelecting(true);
    setSelection(current => {
      const next = add ? new Map(current) : new Map<string, FileEntry>();
      for (const item of items) if (checked) next.set(entryKey(item), item); else next.delete(entryKey(item));
      return next;
    });
  };
  const pick = (key: string, checked: boolean, range: boolean) => {
    const end = pageEntries.findIndex(item => entryKey(item) === key);
    if (end < 0) return;
    const start = range ? pageEntries.findIndex(item => entryKey(item) === rangeStart.current) : -1;
    const items = start < 0 ? [pageEntries[end]!] : pageEntries.slice(Math.min(start, end), Math.max(start, end) + 1);
    applySelection(items, true, checked);
    rangeStart.current = key;
  };
  const rowClick = (key: string, event: MouseEvent<HTMLDivElement>) =>
    pick(key, event.shiftKey || !selection.has(key), event.shiftKey);
  const changeSort = (next: SortingState) => {
    setSorting(next);
    if (rootId && data) change(rootId, data.relative);
  };
  const filtered = useTableFilters<DirectoryEntry & Partial<DirectoryFile>>(
    [...(data?.directories ?? []), ...visibleFiles], FILTERS, () => { if (rootId && data) change(rootId, data.relative) },
    { values: columnFilters, facets: data?.facets ?? {}, onChange: setColumnFilters });
  const refreshDirectory = () => void client.invalidateQueries({ queryKey: ['media-directory'] });
  const refresh = async () => {
    if (refreshing || busy) return;
    setRefreshing(true); setFailure([]); setReceipt('');
    try {
      if (trashView) {
        await trash.refetch({ throwOnError: true });
      } else {
        const result = await query.refetch({ throwOnError: true });
        if (!result.data || !['roots', 'ready'].includes(result.data.state)) return;
      }
      setReceipt(t(trashView ? 'shell:mediaDirectory.trashRefreshed' : 'shell:mediaDirectory.refreshed'));
    } catch (error) {
      setFailure([errorMessage(error)]);
    } finally { setRefreshing(false) }
  };
  const toggleTrash = (open: boolean) => {
    setTrashView(open); setTrashSelection(new Set()); setFailure([]); setReceipt('');
  };
  const dismissMove = () => {
    if (moveFrom) setParams(moveFrom.params);
    setMoveFrom(null);
  };
  const submit = async (request: FileRequest) => {
    setBusy(true); setFailure([]); setReceipt('');
    try {
      const results = await fileOperation(request);
      const succeeded = results.filter(row => row.ok);
      const failed = results.filter(row => !row.ok);
      setFailure(failed.map(row => `${row.name} · ${resultError(row)}`));
      if (!succeeded.length) return;
      setReceipt(t('shell:mediaDirectory.operationDone', { count: succeeded.length }));
      if (request.operation !== 'mkdir') {
        setSelection(current => new Map([...current].filter(([, item]) => !succeeded.some(row => row.name === item.name))));
      }
      if (request.operation === 'move') dismissMove();
      if (request.operation === 'trash') {
        setConfirmTrash(false);
        void client.invalidateQueries({ queryKey: ['media-directory-trash'] });
      }
      setNameDialog(null);
      refreshDirectory();
    } catch (error) {
      setFailure([errorMessage(error)]);
    } finally { setBusy(false) }
  };
  const restoreTrash = async () => {
    const items = availableTrash.filter(item => trashSelection.has(item.id));
    if (busy || !items.length || items.length > 100) return;
    setBusy(true); setFailure([]); setReceipt('');
    const restores = new Map<string, FileTrashEntry[]>();
    const catalog = items.filter(item => item.kind === 'catalog');
    const issues: string[] = [];
    let restored = 0;
    for (const item of items) {
      if (item.kind === 'file') restores.set(item.root, [...(restores.get(item.root) ?? []), item]);
    }
    try {
      if (catalog.length) {
        try {
          const result = await apiSend<{ changed: number }>('/api/batch', { ids: catalog.map(item => item.asset_id), operation: 'restore' });
          restored += result.changed;
        } catch (error) { issues.push(errorMessage(error)) }
      }
      for (const [root, group] of restores) {
        try {
          const result = await fileOperation({ operation: 'restore', root, ids: group.map(item => item.id) });
          restored += result.filter(row => row.ok).length;
          issues.push(...result.filter(row => !row.ok).map(row => `${row.name} · ${resultError(row)}`));
        } catch (error) { issues.push(errorMessage(error)) }
      }
      setFailure(issues);
      if (restored) {
        setReceipt(t('shell:mediaDirectory.operationDone', { count: restored }));
        refreshDirectory();
        const latest = await trash.refetch();
        if (latest.data) {
          const remaining = new Set(latest.data.items.map(item => item.id));
          setTrashSelection(current => new Set([...current].filter(id => remaining.has(id))));
        }
      }
    } finally { setBusy(false) }
  };
  const copy = async () => {
    if (!path) return;
    const separator = data?.path_separator ?? '/';
    const base = path.endsWith(separator) ? path : path + separator;
    try {
      await navigator.clipboard.writeText(picked.map(item => base + item.name).join('\n'));
      setReceipt(t('shell:mediaDirectory.pathsCopied', { count: picked.length }));
    } catch (error) { setFailure([errorMessage(error)]) }
  };
  const mark = (operation: 'like' | 'seen' | 'later', button: HTMLElement) => {
    const ids = picked.flatMap(item => item.asset_id == null ? [] : [item.asset_id]);
    if (ids.length === picked.length && ids.length) void actions?.catalogFileAction?.(operation, ids, button);
  };
  const moveHere = () => {
    if (!moveFrom || !data || rootId !== moveFrom.root || busy || data.state !== 'ready') return;
    void submit({ operation: 'move', root: moveFrom.root, relative: moveFrom.relative,
      destination: data.relative, entries: picked });
  };
  const entry = (item: DirectoryEntry, file?: DirectoryFile) => {
    const key = entryKey({ name: item.name, directory: !file });
    const focusedAsset = Boolean(file && item.name === data?.focus_name);
    const selected = selection.has(key);
    const format = file ? fileFormat(file.name) : t('shell:mediaDirectory.folder');
    const cells: Record<string, React.ReactNode> = {
      name: <EntryName name={item.name} folder={!file} />,
      select: <span onClickCapture={event => { shiftCheck.current = event.shiftKey }}
        onKeyDownCapture={event => { shiftCheck.current = event.shiftKey }}>
        <Checkbox slot={null} aria-label={t('shell:dataTable.selectRow', { name: item.name })}
          isSelected={selected} isDisabled={busy} onChange={on => pick(key, shiftCheck.current || on, shiftCheck.current)} />
      </span>,
      type: <span className="block truncate" title={format}>{format}</span>,
      size: file?.size == null ? '—' : fmtSize(file.size),
      modified: catalogTableDate(item.modified_at),
      duration: fmtDur(file?.duration),
      resolution: file?.width && file.height ? `${file.width} × ${file.height}` : '—',
      created: catalogTableDate(item.created_at),
    };
    const onAction = selecting && !moveFrom ? undefined : !file ? () => browse(root?.id, [...parts, item.name].join('/'))
      : file.asset_id == null ? undefined : () => openAsset(file.asset_id!, key);
    return <TableRow key={key} id={key} ref={focusedAsset ? focused : undefined} data-media-directory-row=""
      data-board-selected={selected || (focusedAsset && !selecting) || undefined} onAction={onAction}>
      {shown.map(column => <TableCell key={column.id} data-media-directory-name={column.id === 'name' ? '' : undefined}>{cells[column.id]}</TableCell>)}
      <TableCell data-table-space="" />
    </TableRow>;
  };
  if (suspended || leftOrigin) return null;
  const portal = overlayHost(onOverlay ? document.querySelector('dialog:modal') : null);
  const modeLabel = t(fullScreen ? 'shell:mediaDirectory.exitFullscreen' : 'shell:mediaDirectory.fullscreen');
  return <><ModalFrame isOpen={isOpen} onOpenChange={open => {
    if (!open && !busy && !nameDialog && !confirmTrash) {
      if (moveFrom) dismissMove(); else if (selecting && selection.size) clearSelection(); else close();
    }
  }} width="collections" fullScreen={fullScreen} label={t('shell:mediaDirectory.title')} surfaceClassName="peach-react"
    portalContainer={portal}><div data-media-directory-dialog="" data-directory-fullscreen={fullScreen || undefined} ref={connectDialog}
      onKeyDown={event => {
        if (event.key.toLowerCase() !== 'a' || !hasSelectionModifier(event) || !selecting || trashView || moveFrom ||
            (event.target instanceof Element && event.target.closest('input,textarea,[contenteditable]'))) return;
        event.preventDefault();
        applySelection(pageEntries, true);
      }}>
    <div data-media-directory-header="">
      <Heading slot="title" className="text-title-2-medium">{t('shell:mediaDirectory.title')}</Heading>
      <div className="flex items-center gap-2">
        <IconButton size="small" icon={fullScreen ? RiFullscreenExitLine : RiFullscreenLine}
          aria-label={modeLabel} aria-pressed={fullScreen} title={modeLabel} onClick={() => setFullScreen(value => !value)} />
        <SettingsDialogClose label={t('shell:serverPath.close')} onPress={() => { if (!busy) close() }} />
      </div>
    </div>
    <div data-media-directory-toolbar="">
      <div className="flex min-w-0 flex-1 items-center gap-3">
      <IconButton size="small" icon={RiArrowUpLine} disabled={(!root && !trashView) || (Boolean(moveFrom) && !parts.length) || busy} title={t('shell:mediaDirectory.up')}
        aria-label={t('shell:mediaDirectory.up')} onClick={() => trashView ? toggleTrash(false)
          : parts.length ? browse(root?.id, parts.slice(0, -1).join('/')) : browse()} />
      <Breadcrumb aria-label={t('catalog:catalogFolders.path')}>
        <BreadcrumbItem current={!root && !trashView} icon={RiFolder3Line} onClick={() => { if (!moveFrom && !busy) browse() }}>{t('shell:mediaDirectory.libraries')}</BreadcrumbItem>
        {root && !trashView ? <BreadcrumbItem current={!parts.length} onClick={() => { if (!busy) browse(root.id) }}><LibraryName library={root} crumb /></BreadcrumbItem> : null}
        {!trashView && parts.map((part, index) => <BreadcrumbItem key={index} current={index === parts.length - 1}
          onClick={() => { if (!busy) browse(root?.id, parts.slice(0, index + 1).join('/')) }}><span className="folder-crumb-name" data-middle-truncate="" title={part}>{part}</span></BreadcrumbItem>)}
        {trashView ? <BreadcrumbItem current icon={RiDeleteBin6Line}>{t('shell:mediaDirectory.trash')}</BreadcrumbItem> : null}
      </Breadcrumb>
      </div>
    </div>
    {!trashView ? <div data-directory-actions="" role="toolbar" aria-label={entriesLabel}>
      {moveFrom ? <>
        <span className="me-auto text-body-2-regular text-text-secondary">{t('shell:mediaDirectory.chooseMoveTarget', { count: picked.length })}</span>
        <Button variant="secondary" size="small" onClick={dismissMove} disabled={busy}>{t('shell:shared.cancel')}</Button>
        <Button variant="primary" size="small" onClick={moveHere} {...busyProps(busy)}
          disabled={data?.state !== 'ready' || data.relative === moveFrom.relative}>{t('shell:mediaDirectory.moveHere')}</Button>
      </> : <>
        {readyFiles ? <Input aria-label={t('shell:mediaDirectory.search')} placeholder={t('shell:mediaDirectory.search')} leadingIcon={RiSearchLine}
          size="small" value={search} onChange={setSearch} /> : null}
        <div data-toolbar-actions="">
          {readyFiles && canWrite ? <Button variant="secondary" size="small" leadingIcon={RiFolderAddLine} disabled={busy || query.isPlaceholderData}
            onClick={() => { setFailure([]); setNameDialog({ mode: 'mkdir' }) }}>{t('shell:mediaDirectory.createFolder')}</Button> : null}
          <Button variant="secondary" size="small" leadingIcon={RiDeleteBin6Line} disabled={busy} data-copy-interact=""
            onClick={() => toggleTrash(true)}><span data-copy-key="mediaDirectory.trash">{t('shell:mediaDirectory.trash')}</span></Button>
          <IconButton size="small" icon={RiRefreshLine} disabled={busy || refreshing} aria-busy={refreshing || undefined}
            data-directory-refresh="" aria-label={t('shell:mediaDirectory.refresh')}
            title={t('shell:mediaDirectory.refresh')} onClick={() => void refresh()} />
          {readyFiles ? <Button variant={selecting ? 'primary' : 'secondary'} size="small" aria-pressed={selecting}
            onClick={() => { if (selecting) clearSelection(); else setSelecting(true) }}>
            {t(selecting ? 'shell:mediaDirectory.exitSelection' : 'shell:chrome.selectMode')}</Button> : null}
          {readyFiles ? <TableColumnControls preferences={preferences} label={entriesLabel} size="small" /> : null}
          {hasRoots ? <TableColumnLayout preferences={rootPreferences} label={t('shell:mediaDirectory.libraries')} resizable={false} size="small" /> : null}
        </div>
      </>}
    </div> : null}
    {trashView ? <div data-directory-actions="" role="toolbar" aria-label={t('shell:mediaDirectory.trash')}>
      <Button size="small" variant="secondary" disabled={busy} onClick={() => toggleTrash(false)}>{t('shell:mediaDirectory.backToFiles')}</Button>
      <div data-toolbar-actions="">
        <IconButton size="small" icon={RiRefreshLine} disabled={busy || refreshing} aria-busy={refreshing || undefined}
          data-directory-refresh="" aria-label={t('shell:mediaDirectory.refreshTrash')}
          title={t('shell:mediaDirectory.refreshTrash')} onClick={() => void refresh()} />
        <Button size="small" variant="secondary" disabled={busy || !canWriteLedger || !trashSelection.size || trashSelection.size > 100}
          title={trashSelection.size > 100 ? t('shell:mediaDirectory.batchLimit') : undefined} {...busyProps(busy)}
          onClick={() => void restoreTrash()}>{t('shell:mediaDirectory.restore')}</Button>
      </div>
    </div> : null}
    {failure.length && !nameDialog && !confirmTrash ? <div data-directory-feedback=""><Note tone="error">{failure.join('\n')}</Note></div> : null}
    {receipt ? <div data-directory-feedback="" role="status" className="text-body-2-regular text-text-secondary">{receipt}</div> : null}
    <div data-media-directory-body="" aria-label={t('shell:mediaDirectory.entries')} aria-busy={trashView ? trash.isFetching : query.isFetching}>
      {(trashView ? trash.isPending : query.isPending) ? <div aria-label={t('shell:serverPath.reading')} data-skeleton="" className="flex flex-col gap-3 p-4">{Array.from({ length: 8 }, (_, i) => <div key={i} className="skeleton-sheen h-9 w-full rounded-lg" />)}</div> : null}
      {trashView && trash.error ? <Note tone="error" action={<Button variant="secondary" onClick={() => void trash.refetch()}>{t('shell:mediaDirectory.retry')}</Button>}>{errorMessage(trash.error)}</Note> : null}
      {trashView && trash.data ? <DataTableFrame>
        <Table size="sm" aria-label={t('shell:mediaDirectory.trash')}>
          <TableHeader>
            <TableColumn className="w-11"><Checkbox slot={null} aria-label={t('shell:dataTable.selectAll', { label: t('shell:mediaDirectory.trash') })}
              isSelected={availableTrash.length > 0 && trashSelection.size === availableTrash.length}
              isIndeterminate={trashSelection.size > 0 && trashSelection.size < availableTrash.length} isDisabled={busy || !availableTrash.length}
              onChange={on => setTrashSelection(new Set(on ? availableTrash.map(item => item.id) : []))} /></TableColumn>
            <TableColumn isRowHeader>{t('shell:mediaDirectory.name')}</TableColumn>
            <TableColumn>{t('shell:shared.library')}</TableColumn>
            <TableColumn>{t('shell:mediaDirectory.originalFolder')}</TableColumn>
            <TableColumn>{t('shell:mediaDirectory.trashedAt')}</TableColumn>
          </TableHeader>
          <TableBody renderEmptyState={() => t('shell:mediaDirectory.trashEmpty')}>
            {trashItems.map(item => <TableRow key={item.id} id={item.id} data-board-selected={trashSelection.has(item.id) || undefined}>
              <TableCell><Checkbox slot={null} aria-label={t('shell:dataTable.selectRow', { name: item.name })}
                isSelected={trashSelection.has(item.id)} isDisabled={busy || !item.available} onChange={on => setTrashSelection(current => {
                  const next = new Set(current); if (on) next.add(item.id); else next.delete(item.id); return next;
                })} /></TableCell>
              <TableCell><EntryName name={item.name} folder={item.directory} />
                {item.kind === 'catalog' || !item.ready ? <span className="text-caption-1-regular text-text-secondary">
                  {t(item.kind === 'catalog' ? 'shell:mediaDirectory.catalogTrash' : 'shell:mediaDirectory.trashPending')}</span> : null}</TableCell>
              <TableCell>{item.library || '—'}</TableCell>
              <TableCell><span title={item.relative} className="block truncate">{item.relative || '—'}</span></TableCell>
              <TableCell>{catalogTableDate(item.at)}</TableCell>
            </TableRow>)}
          </TableBody>
        </Table>
      </DataTableFrame> : null}
      {!trashView ? <>
      {query.error ? <div className="p-4"><Note tone="error" action={<Button variant="secondary" onClick={() => void query.refetch()}>{t('shell:mediaDirectory.retry')}</Button>}>{errorMessage(query.error)}</Note></div> : null}
      {data && !['roots', 'ready'].includes(data.state) ? <div className="p-4"><Note tone="warning" action={<Button variant="secondary" onClick={() => void query.refetch()}>{t('shell:mediaDirectory.retry')}</Button>}>{t(`shell:mediaDirectory.${data.state}`)}</Note></div> : null}
      {selectedMissing ? <div className="p-4"><Note tone="warning">{t('shell:mediaDirectory.fileMissing', { name: data.focus_name })}</Note></div> : null}
      {hasRoots ? <DataTableFrame preferences={rootPreferences} resizable={false}>
        <Table size="sm" aria-label={t('shell:mediaDirectory.libraries')}>
          <TableHeader>
            {rootPreferences.columns.map(column => <TableColumn key={column.id} id={column.id} isRowHeader={column.id === 'library'}
              data-directory-root-column={column.id}
              data-copy-key={column.id === 'mount' ? 'mediaDirectory.mountPath' : undefined}>{column.label}</TableColumn>)}
          </TableHeader>
          <TableBody>
            {data.roots.map(item => <TableRow key={item.id} id={item.id} data-media-directory-root="" onAction={() => browse(item.id)}>
              {rootPreferences.columns.map(column => <TableCell key={column.id} data-media-directory-mount={column.id === 'mount' ? '' : undefined}>
                {column.id === 'library' ? <LibraryName library={item} /> : <span className="block truncate font-mono" title={item.mount}>{item.mount}</span>}
              </TableCell>)}
            </TableRow>)}
          </TableBody>
        </Table>
      </DataTableFrame> : null}
      {readyFiles ? <DataTableFrame follow preferences={preferences} rectangleSelecting={selecting}
        onRowClick={selecting && !moveFrom && !busy && !query.isPlaceholderData ? rowClick : undefined}
        onRectangleEnter={() => setSelecting(true)}
        onRectangle={!moveFrom && !busy && !query.isPlaceholderData ? (keys, add) => {
          const found = new Set(keys);
          applySelection(pageEntries.filter(item => found.has(entryKey(item))), add);
          rangeStart.current = keys.at(-1) ?? null;
        } : undefined}>
        <Table ref={restoreTable} size="sm" data-media-directory-entries="" aria-label={entriesLabel}
          sortDescriptor={sort ? { column: sort.id, direction: sort.desc ? 'descending' : 'ascending' } : undefined}
          onSortChange={next => changeSort([{ id: String(next.column), desc: next.direction === 'descending' }])}>
          <TableHeader>
            {shown.map(column => column.id === 'select' ? <TableColumn key={column.id} id={column.id} {...preferences.columnProps(column.id)}>
              <Checkbox slot={null} aria-label={t('shell:dataTable.selectAll', { label: entriesLabel })}
                isSelected={allPage} isIndeterminate={pageHasSelected && !allPage} isDisabled={busy || !pageEntries.length}
                onChange={on => applySelection(pageEntries, true, on)} />
            </TableColumn> : <TableColumn key={column.id} id={column.id} isRowHeader={column.id === 'name'} allowsSorting={!moveFrom}
              {...preferences.columnProps(column.id)}>
              {({ sortDirection }) => <><span data-directory-column="" className="flex min-w-0 items-center gap-0.5"
                onPointerDown={event => { if ((event.target as Element).closest('button')) event.stopPropagation() }}
                onClick={event => { if ((event.target as Element).closest('button')) event.stopPropagation() }}
                onKeyDown={event => {
                  if ((event.key === 'Enter' || event.key === ' ') && (event.target as Element).closest('button')) event.stopPropagation();
                }}>
                {moveFrom ? <span data-copy-key={column.copyKey}>{column.label}</span> : column.id === 'name'
                  ? <ColumnFilterPopover id="name" label={column.label} copyKey={column.copyKey} active={Boolean(search)}>
                    {() => <MenuDialog aria-label={t('catalog:columnFilter.label', { column: column.label })} className="p-3">
                      <Input aria-label={t('shell:mediaDirectory.search')} placeholder={t('shell:mediaDirectory.search')}
                        leadingIcon={RiSearchLine} size="small" value={search} onChange={setSearch} />
                    </MenuDialog>}
                  </ColumnFilterPopover> : filtered.header(column.id, column.label, column.copyKey)}
                {!moveFrom ? <button type="button" data-sort-indicator="" data-direction={sortDirection || undefined}
                  aria-label={t(sortDirection === 'ascending' ? 'shell:tableSort.toDescending' : 'shell:tableSort.toAscending', { table: column.label })}
                  className="cursor-pointer rounded-sm focus-visible:ring-2 focus-visible:ring-border-focus-ring"
                  onClick={event => {
                    event.stopPropagation();
                    changeSort([{ id: column.id, desc: sortDirection === 'ascending' }]);
                  }}><ChevronSortDown /></button> : null}
              </span><TableColumnResizer preferences={preferences} id={column.id} /></>}
            </TableColumn>)}
            <TableColumn id="remaining-space" aria-label={t('catalog:catalogList.rowSpacer')} data-table-space="" width={preferences.spaceWidth} minWidth={0} />
          </TableHeader>
          <TableBody renderEmptyState={() => <div className="p-4"><EmptyState size="compact" icon={RiFolder3Line}
            title={t(term || encodedFilters !== '{}' ? 'shell:mediaDirectory.noMatches' : 'shell:mediaDirectory.empty')}>{null}</EmptyState></div>}>
            {data.directories.map(item => entry(item))}
            {visibleFiles.map(item => entry(item, item))}
          </TableBody>
        </Table>
      </DataTableFrame> : null}
      {data?.state === 'roots' && !data.roots.length ? <div className="p-8"><EmptyState size="compact" icon={RiFolder3Line} title={t('shell:serverPath.noRoots')}>{null}</EmptyState></div> : null}
      </> : null}
    </div>
    {!trashView && (path || data?.read_only || data?.offset || data?.next_offset != null) ? <div data-media-directory-footer="">
      {path ? <div className="min-w-0 max-h-28 overflow-auto"><Disclosure summary={t('shell:mediaDirectory.pathDetails')}>
        <p className="text-caption-1-regular text-text-tertiary">{t('shell:mediaDirectory.pathHelp')}</p>
        <p className="select-text break-all font-mono text-caption-1-regular text-text-secondary">{path}</p>
      </Disclosure></div> : null}
      <div className="ms-auto flex min-w-0 flex-wrap items-center justify-end gap-2">
        {data?.read_only ? <span className="text-caption-1-regular text-text-tertiary" title={t('shell:mediaDirectory.readOnly')}>{t('shell:mediaDirectory.readOnlyShort')}</span> : null}
        {data?.root && data.total !== undefined ? <DataTableFooter
          label={entriesLabel} total={data.total} pagination={{ pageIndex: Math.floor((data.offset ?? 0) / pageSize), pageSize }}
          onChange={next => { setPageSize(next.pageSize); change(data.root!, data.relative, next.pageIndex * next.pageSize) }}
          unit={t('shell:dataTable.recordUnit')} pageSizes={PAGE_SIZES} /> : null}
      </div>
    </div> : null}
    <SelectionDock placement="inline" visible={!trashView && !moveFrom && picked.length > 0}
      label={t('shell:dataTable.bulkActions', { label: entriesLabel })}
      count={t('shell:dataTable.selectedCount', { count: picked.length, unit: t('shell:dataTable.recordUnit') })} actions={[]}>
      <Button variant="secondary" size="small" onClick={() => void copy()} disabled={!path}>{t('shell:mediaDirectory.copyPaths')}</Button>
      {canWrite && rootId && data?.state === 'ready' ? <>
        {picked.length === 1 ? <Button variant="secondary" size="small" disabled={busy}
          onClick={() => { setFailure([]); setNameDialog({ mode: 'rename', item: picked[0] }) }}>{t('shell:mediaDirectory.rename')}</Button> : null}
        <Button variant="secondary" size="small" disabled={busy || picked.length > 100}
          title={picked.length > 100 ? t('shell:mediaDirectory.batchLimit') : undefined}
          onClick={() => { setMoveFrom({ root: rootId, relative: data.relative, params }); setFailure([]); setReceipt('') }}>
          {t('shell:mediaDirectory.move')}</Button>
        <Button variant="danger" size="small" disabled={busy || picked.length > 100}
          title={picked.length > 100 ? t('shell:mediaDirectory.batchLimit') : undefined}
          onClick={() => { setFailure([]); setConfirmTrash(true) }}>{t('shell:mediaDirectory.moveToTrash')}</Button>
      </> : null}
      {canWrite && picked.every(item => item.asset_id != null) && actions?.catalogFileAction ? <>
        <Button variant="secondary" size="small" onClick={event => mark('like', event.currentTarget)}>{t('manage:shared.like')}</Button>
        <Button variant="secondary" size="small" onClick={event => mark('seen', event.currentTarget)}>{t('manage:batchDock.seen')}</Button>
        <Button variant="secondary" size="small" onClick={event => mark('later', event.currentTarget)}>{t('manage:shared.watchLater')}</Button>
      </> : null}
      <Button variant="ghost" size="small" onClick={clearSelection} disabled={busy}>{t('shell:dataTable.clearSelection')}</Button>
    </SelectionDock>
  </div></ModalFrame>
  {nameDialog && rootId && data?.state === 'ready' ? <FileNameDialog {...nameDialog} portal={portal} busy={busy} errors={failure}
    close={() => { setNameDialog(null); setFailure([]) }} submit={name => void submit({
      operation: nameDialog.mode, root: rootId, relative: data.relative, name,
      entries: nameDialog.item ? [nameDialog.item] : undefined,
    })} /> : null}
  {confirmTrash && rootId && data?.state === 'ready' ? <FileTrashDialog items={picked} portal={portal} busy={busy} errors={failure}
    close={() => { setConfirmTrash(false); setFailure([]) }}
    submit={() => void submit({ operation: 'trash', root: rootId, relative: data.relative, entries: picked })} /> : null}</>;
}
