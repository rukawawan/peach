import { useState, type FormEvent } from 'react';
import { Heading } from 'react-aria-components';
import { Button } from '@/components/base/buttons/button';
import { Input } from '@/components/base/input/input';
import { ModalFrame } from '../components/modal-frame';
import { Note } from '../components/note';
import { FieldLabel } from '../settings/section';
import { busyProps, useAction } from '../settings/use-action';
import { renameAliasGroup, reloadFollowManage, type AliasGroup } from './follow-manage';
import { t } from '../../i18n';

export function AliasRenameDialog({ group, close, receipt }: { group: AliasGroup | null; close(): void; receipt(message: string): void }) {
  return <ModalFrame isOpen={Boolean(group)} onOpenChange={open => { if (!open) close() }} width="form" label={t('follow:creatorAliases.rename')}>
    {group ? <RenameForm key={group.canonical_key} group={group} close={close} receipt={receipt} /> : null}
  </ModalFrame>;
}

function RenameForm({ group, close, receipt }: { group: AliasGroup; close(): void; receipt(message: string): void }) {
  const [name, setName] = useState(group.canonical_name);
  const action = useAction();
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!name.trim() || name.trim() === group.canonical_name) return;
    void action.run('rename', signal => renameAliasGroup(group.canonical_key, name.trim(), signal), () => {
      void reloadFollowManage(); receipt(t('follow:creatorAliases.renamed', { name: name.trim() })); close();
    });
  };
  return <form onSubmit={submit} className="flex min-h-0 flex-col gap-4 p-5">
    <Heading slot="title" className="text-title-2-semibold text-text-primary">{t('follow:creatorAliases.rename')}</Heading>
    <p className="text-body-2-regular wrap-anywhere text-text-secondary">{t('follow:creatorAliases.currentName')}{group.canonical_name}</p>
    <Input aria-label={t('follow:creatorAliases.displayName')} autoFocus value={name} onChange={setName} />
    <div className="flex flex-col gap-2">
      <FieldLabel>{t('follow:creatorAliases.chooseExisting')}</FieldLabel>
      <div className="flex flex-wrap gap-2">{group.aliases.map(alias => <Button key={alias.key} variant="secondary" size="small"
        onClick={() => setName(alias.name)}>{alias.name}</Button>)}</div>
    </div>
    <p className="text-body-2-regular text-text-secondary">{t('follow:creatorAliases.renameHint')}</p>
    {action.error ? <Note tone="error">{action.error}</Note> : null}
    <div className="flex flex-wrap justify-end gap-2">
      <Button variant="secondary" onClick={close}>{t('follow:shared.cancel')}</Button>
      <Button type="submit" variant="primary" disabled={!name.trim() || name.trim() === group.canonical_name}
        {...busyProps(Boolean(action.busy))}>{t('follow:creatorAliases.rename')}</Button>
    </div>
  </form>;
}
