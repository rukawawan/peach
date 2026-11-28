import { t } from '../../i18n';
import { CodeBlock } from '../components/code-block';
import { StatusLabel } from '../components/status-label';
import { Help, Stack } from './section';

export interface SeedSharingState {
  enabled: boolean; available: boolean; schema: number;
  last_attempt: { status?: string; period?: string };
  name_candidates?: { pending: number; adopted: number; withdrawn: number };
}
export interface SeedPreview { data: { claims: unknown[]; omitted: number }; token: string; schema: number; bytes: number }

export function SeedSharingScope() {
  return <>
    <ul className="list-disc space-y-2 pl-5">
      {['works', 'entities', 'decisions', 'images', 'sources'].map(key => <li key={key}><Help>{t(`settings:seedSharing.${key}`)}</Help></li>)}
    </ul>
    <Help>{t('settings:seedSharing.excluded')}</Help>
    <Help>{t('settings:seedSharing.independent')}</Help>
    <Help>{t('settings:seedSharing.notice')}</Help>
  </>;
}

export function SeedSharingDelivery({ value }: { value: SeedSharingState }) {
  const status = value.last_attempt.status;
  return <Stack divided>
    <StatusLabel className="self-start" tone={status === 'failed' ? 'error' : status === 'accepted' ? 'success' : 'neutral'}>
      {status ? t(`settings:seedSharing.status.${status}`) : t('settings:librarySharing.notSent')}
    </StatusLabel>
    {status === 'accepted' ? <Help>{t('settings:seedSharing.acceptedHelp')}</Help> : null}
    {value.name_candidates && Object.values(value.name_candidates).some(Boolean)
      ? <Help>{t('settings:seedSharing.names', { ...value.name_candidates })}</Help> : null}
  </Stack>;
}

export function SeedSharingPreview({ preview }: { preview: SeedPreview }) {
  const previewText = JSON.stringify(preview.data, null, 2);
  return <>
    <CodeBlock code={previewText} language="json" label={t('settings:seedSharing.previewData')} maxCharacters={24000} />
    {previewText.length > 24000 ? <Help>{t('settings:librarySharing.truncated')}</Help> : null}
  </>;
}
