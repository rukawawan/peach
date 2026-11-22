import { useEffect, useState } from 'react';
import { RiArrowUpLine, RiFolderLine } from '@remixicon/react';
import { LinkButton } from '@/components/base/buttons/link-button';
import { MENU_ITEM, MENU_ITEM_INTERACTIVE } from '@/components/base/dropdown/menu-styles';
import { cx } from '@/utils/cx';
import { errorMessage } from '../../api';
import { t } from '../../i18n';
import { fetchScanDirectories, type ScanDirectoryChoices } from './library-processing';

export function ScanDirectoryPicker({ libraryId, confirmButton, onSelect }: {
  libraryId?: string; confirmButton: HTMLButtonElement; onSelect(path?: string): void;
}) {
  const [choices, setChoices] = useState<ScanDirectoryChoices>();
  const [failure, setFailure] = useState('');
  const [loading, setLoading] = useState(true);
  const [request, setRequest] = useState<{ directory?: string }>({});
  const browse = (directory?: string) => {
    confirmButton.disabled = true;
    onSelect();
    setLoading(true);
    setFailure('');
    setRequest({ directory });
  };
  useEffect(() => {
    const controller = new AbortController();
    void fetchScanDirectories(libraryId, request.directory, controller.signal).then(result => {
      if (controller.signal.aborted) return;
      setChoices(result);
      onSelect(result.current);
      confirmButton.disabled = !result.current;
    }, error => {
      if (!controller.signal.aborted) setFailure(errorMessage(error));
    }).finally(() => {
      if (!controller.signal.aborted) setLoading(false);
    });
    return () => controller.abort();
  }, [confirmButton, libraryId, onSelect, request]);

  return <div className="flex min-w-0 flex-col gap-2">
    {choices?.current ? <>
      <p className="text-body-2-medium wrap-anywhere" data-scan-directory>{choices.current}</p>
      <LinkButton size="small" leadingIcon={RiArrowUpLine} disabled={loading}
        onClick={() => browse(choices.parent || undefined)}>{t('manage:syncMenu.parentDirectory')}</LinkButton>
    </> : null}
    {failure ? <p role="alert" className="text-body-2-regular text-text-secondary">{failure}</p> : null}
    {loading ? <p role="status" className="text-body-2-regular text-text-secondary">{t('manage:syncMenu.loadingDirectories')}</p> : null}
    {!loading && !failure && choices?.directories.length === 0
      ? <p className="text-body-2-regular text-text-secondary">{t('manage:syncMenu.noChildDirectories')}</p> : null}
    <div className="flex max-h-60 flex-col overflow-y-auto">
      {choices?.directories.map(item => <button key={item.path} type="button" disabled={loading}
        className={cx(MENU_ITEM, MENU_ITEM_INTERACTIVE, 'text-body-2-medium')} onClick={() => browse(item.path)}>
        <RiFolderLine aria-hidden className="size-4 shrink-0" />
        <span className="min-w-0 wrap-anywhere">{item.name}
          {item.library ? <span className="block text-caption-1-regular text-text-secondary">{item.library}</span> : null}
        </span>
      </button>)}
    </div>
  </div>;
}
