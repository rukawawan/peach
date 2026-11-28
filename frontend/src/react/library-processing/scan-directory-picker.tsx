import { useEffect, useState, type ReactElement } from 'react';
import type { Key, Selection } from 'react-aria-components';
import { useQueries, useQuery } from '@tanstack/react-query';
import { RiFolder3Line, RiFolderOpenLine } from '@remixicon/react';
import { Button } from '@/components/base/buttons/button';
import { Note } from '../components/note';
import { TreeView, TreeViewItem } from '@/components/base/tree-view/tree-view';
import { errorMessage } from '../../api';
import { t } from '../../i18n';
import { fetchScanDirectories, type ScanDirectoryChoices } from './library-processing';

export function ScanDirectoryPicker({ libraryId, confirmButton, onSelect }: {
  libraryId?: string; confirmButton: HTMLButtonElement; onSelect(path?: string): void;
}) {
  const [selected, setSelected] = useState<string>();
  const [expanded, setExpanded] = useState<Set<Key>>(new Set());
  const directoryQuery = (directory?: string) => ({
    queryKey: ['library-processing', 'scan-directories', libraryId, directory],
    queryFn: ({ signal }: { signal: AbortSignal }) => fetchScanDirectories(libraryId, directory, signal),
    retry: false,
  });
  const roots = useQuery(directoryQuery());
  const paths = [...new Set([...expanded, ...(selected ? [selected] : [])])].map(String);
  const results = useQueries({ queries: paths.map(path => directoryQuery(path)) });
  const branches = new Map(paths.map((path, index) => [path, results[index]]));
  const selectedBranch = selected ? branches.get(selected) : undefined;
  const confirmed = selectedBranch?.isSuccess && !selectedBranch.isFetching ? selectedBranch.data.current : undefined;

  useEffect(() => {
    onSelect(confirmed);
    confirmButton.disabled = !confirmed;
  }, [confirmButton, confirmed, onSelect]);

  const select = (selection: Selection) => {
    if (selection === 'all') return;
    const key = selection.values().next().value;
    if (typeof key !== 'string') return;
    onSelect();
    confirmButton.disabled = true;
    setSelected(key);
    setExpanded(previous => new Set([...previous, key]));
  };
  const render = (item: ScanDirectoryChoices['directories'][number]): ReactElement => {
    const branch = branches.get(item.path);
    return <TreeViewItem key={item.path} id={item.path} label={item.name} icon={RiFolder3Line}
      expandedIcon={RiFolderOpenLine} iconClassName="size-(--icon-inline)" trailingContent={item.library}>
      {branch?.data ? branch.data.directories.map(render)
        : <TreeViewItem id={`loading:${item.path}`} isDisabled
            label={branch?.error ? errorMessage(branch.error) : t('manage:syncMenu.loadingDirectories')} />}
    </TreeViewItem>;
  };
  const failed = [roots, ...results].filter(result => result.isError);
  return <div className="flex min-w-0 flex-col gap-3">
    {roots.isPending ? <p role="status" className="text-body-2-regular text-text-secondary">{t('manage:syncMenu.loadingDirectories')}</p> : null}
    {failed.length ? <Note tone="error" action={
      <Button size="small" variant="secondary" onClick={() => { failed.forEach(result => { void result.refetch() }) }}>
        {t('catalog:shared.retryNow')}
      </Button>
    }>{errorMessage(failed[0]?.error)}</Note> : null}
    {roots.isSuccess ? <div className="max-h-64 min-w-0 overflow-x-hidden overflow-y-auto rounded-3xl">
      <TreeView aria-label={t('catalog:catalogFolders.mediaDirectories')} size="sm"
        expandedKeys={expanded} onExpandedChange={setExpanded} disallowEmptySelection
        selectedKeys={selected ? new Set([selected]) : new Set()} onSelectionChange={select}
        renderEmptyState={() => <p className="p-2 text-body-2-regular text-text-secondary">{t('catalog:catalogFolders.noDirectories')}</p>}>
        {roots.data.directories.map(render)}
      </TreeView>
    </div> : null}
    {selected ? <p className="text-body-2-medium wrap-anywhere" data-scan-directory>{selected}</p> : null}
  </div>;
}
