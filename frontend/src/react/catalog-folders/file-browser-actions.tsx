import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Heading } from 'react-aria-components';
import { Button } from '@/components/base/buttons/button';
import { Input } from '@/components/base/input/input';
import { apiSend } from '../../api';
import { serverLabel } from '../../core/server-text';
import { t } from '../../i18n';
import { attachHoldToConfirm } from '../../ui-kit/hold-to-confirm';
import { ModalFrame } from '../components/modal-frame';
import { Note } from '../components/note';
import { busyProps } from '../settings/busy-props';

export interface FileEntry { name: string; directory: boolean; asset_id?: number | null }
export type FileTrashEntry = FileEntry & { id: string; relative: string; at: number; ready: boolean; library: string; available: boolean } &
  ({ kind: 'file'; root: string } | { kind: 'catalog'; asset_id: number });
export type FileRequest = { operation: 'mkdir' | 'rename' | 'move' | 'trash' | 'restore'; root: string;
  relative?: string; entries?: FileEntry[]; name?: string; destination?: string; ids?: string[] };
export interface FileResult { name: string; ok: boolean; id?: string; error?: string;
  message_code?: string; message_params?: Record<string, unknown> }

export const fileOperation = (request: FileRequest) =>
  apiSend<{ items: FileResult[] }>('/api/media-directory', request).then(result => result.items);

export const resultError = (row: FileResult) =>
  serverLabel(row.message_code ?? '', row.error ?? '', row.message_params);

export function FileNameDialog({ mode, item, busy, errors, portal, submit, close }: {
  mode: 'mkdir' | 'rename'; item?: FileEntry; busy: boolean; errors: string[];
  portal?: Element; submit(name: string): void; close(): void;
}) {
  const [name, setName] = useState(item?.name ?? '');
  const label = t(mode === 'mkdir' ? 'shell:mediaDirectory.createFolder' : 'shell:mediaDirectory.rename');
  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (name.trim() && name !== item?.name && !busy) submit(name);
  };
  return <ModalFrame isOpen label={label} onOpenChange={open => { if (!open && !busy) close() }} width="form"
    portalContainer={portal} surfaceClassName="peach-react">
    <form className="flex min-w-0 flex-col gap-4 p-6" onSubmit={onSubmit}>
      <Heading slot="title" className="text-title-2-medium">{label}</Heading>
      <Input label={t('shell:mediaDirectory.name')} value={name} onChange={setName} autoFocus isReadOnly={busy} />
      {errors.length ? <Note tone="error">{errors.join('\n')}</Note> : null}
      <div className="flex flex-wrap justify-end gap-2">
        <Button variant="secondary" disabled={busy} onClick={close}>{t('shell:shared.cancel')}</Button>
        <Button type="submit" variant="primary" {...busyProps(busy)} disabled={!name.trim() || name === item?.name}>{label}</Button>
      </div>
    </form>
  </ModalFrame>;
}

export function FileTrashDialog({ items, busy, errors, portal, submit, close }: {
  items: FileEntry[]; busy: boolean; errors: string[]; portal: Element; submit(): void; close(): void;
}) {
  const button = useRef<HTMLButtonElement>(null);
  useEffect(() => button.current ? attachHoldToConfirm(button.current) : undefined, []);
  const label = t('shell:mediaDirectory.moveToTrash');
  return <ModalFrame isOpen width="form" label={label} surfaceClassName="peach-react" portalContainer={portal}
    onOpenChange={open => { if (!open && !busy) close() }}>
    <div className="flex min-w-0 flex-col gap-4 p-6">
      <Heading slot="title" className="text-title-2-medium">{label}</Heading>
      <p className="text-body-regular text-text-secondary">{t('shell:mediaDirectory.trashConfirm', { count: items.length })}</p>
      <ul className="max-h-40 overflow-auto text-body-regular text-text-secondary" aria-label={t('shell:confirmModal.selectedItems')}>
        {items.map(item => <li className="break-all" key={item.name}>{item.name}</li>)}
      </ul>
      {errors.length ? <Note tone="error">{errors.join('\n')}</Note> : null}
      <div className="flex flex-wrap justify-end gap-2">
        <Button variant="secondary" autoFocus disabled={busy} onClick={close}>{t('shell:shared.cancel')}</Button>
        <Button ref={button} variant="danger" {...busyProps(busy)} onClick={() => { if (!busy) submit() }}>
          {t('shell:holdToConfirm.label', { action: label })}
        </Button>
      </div>
    </div>
  </ModalFrame>;
}
