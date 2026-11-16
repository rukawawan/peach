import { useContext, useDeferredValue, useEffect, useId, useLayoutEffect, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useInRouterContext, useLocation } from 'react-router';
import { useQueries, useQuery } from '@tanstack/react-query';
import type { Key, Selection } from 'react-aria-components';
import { RiFolder3Line, RiFolderOpenLine, RiFolderSettingsLine, RiSearchLine, RiSideBarLine } from '@remixicon/react';
import { Breadcrumb, BreadcrumbItem } from '@/components/base/breadcrumb/breadcrumb';
import { TreeView, TreeViewItem } from '@/components/base/tree-view/tree-view';
import { Button, ButtonLink } from '@/components/base/buttons/button';
import { IconButton } from '@/components/base/buttons/icon-button';
import { Input } from '@/components/base/input/input';
import { Checkbox } from '@/components/base/checkbox/checkbox';
import { isCatalogPath } from '@peach/legacy/core';
import { errorMessage } from '../../api';
import { ModalFrame } from '../components/modal-frame';
import { SettingsDialogClose } from '../components/settings-dialog-close';
import { Note } from '../components/note';
import { EmptyState } from '../components/empty-state';
import { useOverlayScrollbar } from '../components/overlay-scrollbar';
import { ShellActionsContext } from '../router/router';
import { FolderRuleDialog } from './folder-rule-dialog';
import { useFolderStickyOffset } from './use-folder-sticky-offset';
import { folderHref, folderQuery, PURPOSES, type FolderPage, type FolderScope, type MediaFolder } from './catalog-folders';
import { t } from '../../i18n';

export function FolderBrowseToggle() {
  return useInRouterContext() ? <FolderBrowseControl /> : null;
}

function FolderBrowseControl() {
  const address = useLocation();
  const actions = useContext(ShellActionsContext);
  if (!isCatalogPath(address.pathname) && !/^\/(performers|creators|studios|series|agencies|tags)\/[^/]+$/.test(address.pathname)) return null;
  const params = new URLSearchParams(address.search);
  const active = params.get('browse') === 'folders' || !!params.get('folder');
  return <IconButton size="small" data-folder-mode-toggle="" aria-label={t('catalog:catalogFolders.folderMode')} title={t('catalog:catalogFolders.folderMode')} aria-pressed={active}
    icon={RiFolder3Line}
    onClick={() => actions?.navigate(folderHref(address,
      active ? { browse: null, folder: null, folder_recursive: null } : { browse: 'folders' }))} />;
}

export function EntityFolderWorkspace({ children, enabled }: { children: ReactNode; enabled: boolean }) {
  return useInRouterContext() ? <RoutedFolderWorkspace enabled={enabled}>{children}</RoutedFolderWorkspace> : <>{children}</>;
}

function RoutedFolderWorkspace({ children, enabled }: { children: ReactNode; enabled: boolean }) {
  const [tree, setTree] = useState<HTMLElement | null>(null);
  const [header, setHeader] = useState<HTMLDivElement | null>(null);
  const address = useLocation();
  const params = new URLSearchParams(address.search);
  const active = enabled && (params.get('browse') === 'folders' || !!params.get('folder'));
  return <div className="entity-folder-workspace" data-folder-workspace="" data-folder-browse={active ? '' : undefined}>
    <aside ref={setTree} data-folder-tree-host="" hidden={!active} />
    <div className="min-w-0"><div ref={setHeader} data-folder-header-host="" hidden={!active} />{children}</div>
    {tree && header ? <CatalogFolders treeTarget={tree} headerTarget={header} enabled={enabled} /> : null}
  </div>;
}

export function CatalogFolders({ treeTarget, headerTarget, enabled = true }: {
  treeTarget?: HTMLElement; headerTarget?: HTMLElement; enabled?: boolean;
} = {}) {
  const address = useLocation();
  const actions = useContext(ShellActionsContext);
  const params = new URLSearchParams(address.search);
  const active = enabled && (params.get('browse') === 'folders' || !!params.get('folder'));
  const scope: FolderScope = { loc: params.get('loc') ?? '', library: params.get('library') ?? '' };
  useFolderStickyOffset(active, treeTarget);
  const key = params.get('folder') || '';
  const query = useQuery({ ...folderQuery(scope, key), enabled: active });
  const [drawer, setDrawer] = useState(false);
  const [editing, setEditing] = useState(false);
  const treeHost = treeTarget ?? document.getElementById('catalogFoldersTree');
  const headerHost = headerTarget ?? document.getElementById('catalogFolderHeader');
  useLayoutEffect(() => {
    if (treeHost) treeHost.hidden = !active;
    if (headerHost) headerHost.hidden = !active;
    if (!treeTarget) document.body.toggleAttribute('data-folder-browse', active);
    return () => {
      if (treeHost) treeHost.hidden = true;
      if (headerHost) headerHost.hidden = true;
      if (!treeTarget) document.body.removeAttribute('data-folder-browse');
    };
  }, [active, treeHost, headerHost, treeTarget]);
  useEffect(() => { setDrawer(false); setEditing(false) }, [key, active]);
  if (!active || !treeHost || !headerHost || !actions) return null;
  const go = (id: string) => {
    setDrawer(false);
    actions.navigate(folderHref(address, { browse: 'folders', folder: id }));
  };
  const data = query.data;
  const navigation = <FolderTree scope={scope} selected={key} current={data} go={go} reportedError={drawer ? null : query.error} />;
  return <>
    {createPortal(navigation, treeHost)}
    {createPortal(<div className="catalog-folder-heading">
      <div className="flex min-w-0 items-center gap-2">
        <span className="folder-drawer-trigger"><IconButton aria-label={t('catalog:catalogFolders.openTree')} icon={RiSideBarLine} size="small"
          onClick={() => setDrawer(true)} /></span>
        <Breadcrumb aria-label={t('catalog:catalogFolders.path')}>
          <BreadcrumbItem current={!key} onClick={() => go('')} icon={RiFolder3Line}>{t('catalog:catalogFolders.allFolders')}</BreadcrumbItem>
          {data?.ancestors.map((node, index) => <BreadcrumbItem key={node.id} current={index === data.ancestors.length - 1}
            onClick={() => go(node.id)}><span className="folder-crumb-name" data-middle-truncate="">{node.name}</span></BreadcrumbItem>)}
        </Breadcrumb>
        {data?.selected ? <IconButton aria-label={t('catalog:catalogFolders.setPurpose')} icon={RiFolderSettingsLine} size="small"
          onClick={() => setEditing(true)} /> : null}
      </div>
      {query.error && !drawer ? <Note tone="error" action={<Button variant="secondary" size="small" onClick={() => { void query.refetch() }}>{t('catalog:shared.retryNow')}</Button>}>{errorMessage(query.error)}</Note> : null}
      {data?.conflicts?.length ? <Note tone="warning" action={<Button variant="secondary" size="small" onClick={() => setEditing(true)}>{t('catalog:catalogFolders.viewConflicts')}</Button>}>{t('catalog:catalogFolders.conflictsKept', { count: data.conflicts.length })}</Note> : null}
      {data?.selected ? <div className="folder-scope-row">
        <Checkbox size="sm" isSelected={params.get('folder_recursive') !== '0'}
          onChange={on => actions.navigate(folderHref(address, { folder_recursive: on ? null : '0' }))}>{t('catalog:catalogFolders.includeSubfolders')}</Checkbox>
        <span className="text-caption-1-regular text-text-tertiary">{data.rule ? `${PURPOSES[data.rule.purpose]}${data.rule.name ? ` · ${data.rule.name}` : ''}` : t('catalog:folderRule.purposeCategory')}</span>
      </div> : null}
      {query.isPending ? <div data-skeleton="" aria-busy="true" aria-label={t('catalog:catalogFolders.loading')} className="folder-children">{Array.from({ length: 6 }, (_, i) => <span key={i} className="skeleton-sheen h-8 w-28 rounded-lg" />)}</div> : null}
      {data?.children.length ? <FolderChildren key={key} nodes={data.children} go={go} /> : null}
    </div>, headerHost)}
    <ModalFrame isOpen={drawer} onOpenChange={setDrawer} width="form" label={t('catalog:catalogFolders.tree')}>
      <div className="flex items-center justify-between border-b border-separator-border p-4">
        <h2 className="text-title-2-medium">{t('catalog:catalogFolders.treeTitle')}</h2><SettingsDialogClose label={t('catalog:catalogFolders.closeTree')} onPress={() => setDrawer(false)} />
      </div>
      <div className="peach-react relative p-4">{drawer ? navigation : null}</div>
    </ModalFrame>
    {editing && data?.selected ? <FolderRuleDialog key={data.selected.id} folder={data.selected} rule={data.rule}
      revision={data.rules_revision} close={() => setEditing(false)} /> : null}
  </>;
}

function FolderChildren({ nodes, go }: { nodes: MediaFolder[]; go(id: string): void }) {
  const [expanded, setExpanded] = useState(false);
  const id = useId();
  const visible = expanded ? nodes : nodes.slice(0, 12);
  return <div className="flex min-w-0 flex-col items-start gap-2">
    <div id={id} className="folder-children" aria-label={t('catalog:catalogFolders.subfolders')}>{visible.map(node =>
      <Button key={node.id} variant="secondary" size="small" leadingIcon={RiFolder3Line}
        onClick={() => go(node.id)}><span className="truncate">{node.name}</span></Button>)}</div>
    {nodes.length > 12 ? <Button variant="ghost" size="small" aria-expanded={expanded} aria-controls={id}
      onClick={() => setExpanded(value => !value)}>{expanded ? t('catalog:catalogFolders.collapse') : t('catalog:catalogFolders.expandAll', { count: nodes.length })}</Button> : null}
  </div>;
}

function FolderTree({ scope, selected, current, go, reportedError }: {
  scope: FolderScope; selected: string; current: FolderPage | undefined; go(id: string): void; reportedError: unknown;
}) {
  const roots = useQuery(folderQuery(scope));
  const [expanded, setExpanded] = useState<Set<Key>>(new Set());
  const [search, setSearch] = useState('');
  const deferredSearch = useDeferredValue(search);
  const searchQuery = useQuery({ ...folderQuery(scope, '', deferredSearch), enabled: !!deferredSearch.trim() });
  const scroll = useOverlayScrollbar<HTMLDivElement>();
  useEffect(() => {
    if (current?.ancestors.length) setExpanded(previous => new Set([...previous, ...current.ancestors.filter(row => row.has_children).map(row => row.id)]));
  }, [current?.ancestors]);
  const keys = [...expanded].map(String);
  const branches = useQueries({ queries: keys.map(id => folderQuery(scope, id)) });
  const childMap = new Map<string, MediaFolder[]>();
  branches.forEach((branch, index) => { if (branch.data) childMap.set(keys[index], branch.data.children) });
  if (current?.selected) childMap.set(current.selected.id, current.children);
  const render = (node: MediaFolder) => {
    const loaded = childMap.get(node.id);
    return <TreeViewItem key={node.id} id={node.id} label={node.name} icon={RiFolder3Line} expandedIcon={RiFolderOpenLine}
      iconClassName="size-(--icon-inline)" trailingContent={node.parent ? undefined : node.location === 'local' ? t('catalog:shared.localLabel') : node.location}>
      {node.has_children ? loaded ? loaded.map(render)
        : <TreeViewItem id={`${node.id}:loading`} label={t('catalog:catalogFolders.loading')} isDisabled /> : null}
    </TreeViewItem>;
  };
  const choose = (selection: Selection) => {
    if (selection !== 'all') { const id = selection.values().next().value; if (id && !String(id).endsWith(':loading')) go(String(id)); }
  };
  const failed = [roots.error, ...branches.map(branch => branch.error)].find(error => error && error !== reportedError);
  return <section aria-label={t('catalog:catalogFolders.navigation')} className="catalog-folder-navigation flex min-h-0 min-w-0 flex-col gap-3">
    <Input aria-label={t('catalog:catalogFolders.search')} placeholder={t('catalog:catalogFolders.search')} leadingIcon={RiSearchLine} value={search}
      onChange={setSearch} size="small" />
    {failed ? <Note tone="error" action={<Button variant="secondary" size="small" onClick={() => { void roots.refetch(); branches.forEach(branch => { if (branch.error) void branch.refetch() }) }}>{t('catalog:shared.retryNow')}</Button>}>{errorMessage(failed)}</Note> : null}
    <div className="folder-tree-frame relative flex min-h-0 flex-col overflow-hidden rounded-3xl"><div ref={scroll} className="folder-tree-scroller">
      {roots.error ? null : roots.isPending ? <div data-skeleton="" aria-busy="true" aria-label={t('catalog:catalogFolders.loadingTree')} className="flex flex-col gap-2">{Array.from({ length: 8 }, (_, i) => <div key={i} className="flex h-8 items-center gap-2 px-3"><span className="skeleton-sheen size-4" /><span className="skeleton-sheen h-4 flex-1" /></div>)}</div>
        : deferredSearch ? <div className="flex flex-col gap-1">{searchQuery.isPending ? <div data-skeleton="" aria-busy="true" className="h-8 skeleton-sheen" aria-label={t('catalog:catalogFolders.searching')} />
          : searchQuery.error ? <Note tone="error">{errorMessage(searchQuery.error)}</Note>
          : searchQuery.data?.matches.length ? searchQuery.data.matches.map(node => <Button key={node.id} variant="secondary" size="small" leadingIcon={RiFolder3Line}
            onClick={() => { setSearch(''); go(node.id) }}>{node.name}</Button>) : <EmptyState size="compact" icon={RiSearchLine} title={t('catalog:catalogFolders.noMatches')}
              actions={<Button size="small" onClick={() => setSearch('')}>{t('catalog:shared.clearSearch')}</Button>}>{t('catalog:catalogFolders.tryAnotherName')}</EmptyState>}</div>
        : !roots.data?.roots.length ? <EmptyState size="compact" icon={RiFolder3Line} title={t('catalog:catalogFolders.noDirectories')}
          actions={<ButtonLink size="small" href="/settings/library">{t('catalog:shared.addMedia')}</ButtonLink>}>{t('catalog:catalogFolders.addInSettings')}</EmptyState>
        : <TreeView aria-label={t('catalog:catalogFolders.mediaDirectories')} size="sm" expandedKeys={expanded} onExpandedChange={setExpanded}
          selectedKeys={new Set(selected ? [selected] : [])} onSelectionChange={choose}
          >
          {roots.data?.roots.map(render)}
        </TreeView>}
    </div></div>
  </section>;
}
