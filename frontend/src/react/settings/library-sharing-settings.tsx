import { CodeBlock } from '../components/code-block';
import { StatusLabel, type StatusTone } from '../components/status-label';
import { ErrorText, Fact, FactList, Help, Stack } from './section';
import { codedText, serverLabelList } from '../../core/server-text';
import { interfaceLanguage, t } from '../../i18n';

export interface LibrarySharingState {
  enabled: boolean; available: boolean; schema: number; fields: string[]; notice: string;
  /** 与 `fields` 同序的 code 与 `notice` 的 code，按界面语言取译文。 */
  field_codes?: string[]; notice_code?: string;
  last_sent_at?: string | null;
  last_attempt?: { period?: string; status?: string; reason?: string; attempted?: boolean;
    snapshot_id?: string; raw_bytes?: number; compressed_bytes?: number };
  consent_state?: 'enabled' | 'disabled' | 'needs-consent' | 'not-selected';
  participation?: { status: string; pending_state?: 'enabled' | 'disabled' | null;
    state?: 'enabled' | 'disabled'; last_seen?: string; reason?: string };
}
export interface LibraryPreview { data: { library: unknown[]; preferences: unknown; coverage: { uncoded_items: number } };
  bytes: number; compressed_bytes: number; token: string; schema: number }

export function LibrarySharingScope({ value }: { value: LibrarySharingState }) {
  return <>
    <ul className="list-disc space-y-2 pl-5">{serverLabelList(value.fields, value.field_codes).map(field => <li key={field}><Help>{field}</Help></li>)}</ul>
    <Help>{codedText(value, 'notice')}</Help>
  </>;
}

export function LibrarySharingDelivery({ value }: { value: LibrarySharingState }) {
  const participation = value.participation;
  const deliveryNames: Record<string, string> = {
    'not-attempted': t('settings:librarySharing.notSent'), queued: t('settings:librarySharing.waiting'), accepted: t('settings:librarySharing.sent'),
    failed: t('settings:librarySharing.sendFailed'), unknown: t('settings:librarySharing.resultUnknown'), blocked: t('settings:librarySharing.blocked'),
  };
  const participationTones: Record<string, StatusTone> = {
    queued: 'progress', accepted: 'success', failed: 'error', unknown: 'warning', blocked: 'warning',
  };
  return <>
    {value.consent_state === 'needs-consent' ? <Stack divided>
      <span className="self-start"><StatusLabel tone="warning">{t('settings:librarySharing.needsConsent')}</StatusLabel></span>
      <Help>{t('settings:librarySharing.fieldsChanged')}</Help>
    </Stack> : null}
    {participation ? <Stack divided>
      <FactList><Fact term={t('settings:librarySharing.participation')}><StatusLabel aria-label={t('settings:librarySharing.participation')}
        tone={participation.pending_state ? 'progress' : participationTones[participation.status] || 'neutral'}>
        {participation.pending_state
        ? (participation.pending_state === 'disabled' ? t('settings:librarySharing.pendingOff') : t('settings:librarySharing.pendingOn'))
        : deliveryNames[participation.status] || t('settings:librarySharing.resultUnknown')}</StatusLabel></Fact></FactList>
      {value.last_sent_at ? <Help>{t('settings:librarySharing.lastSentAt', { date: new Date(value.last_sent_at).toLocaleDateString(interfaceLanguage) })}</Help> : null}
    </Stack> : null}
    {value.enabled && value.last_attempt?.snapshot_id ? <Stack divided>
      <FactList>
        <Fact term={t('settings:librarySharing.snapshot')}><StatusLabel
          tone={participationTones[value.last_attempt.status || ''] || 'neutral'}>
          {deliveryNames[value.last_attempt.status || ''] || t('settings:librarySharing.waitingData')}</StatusLabel></Fact>
        <Fact term={t('settings:librarySharing.snapshotId')}>{value.last_attempt.snapshot_id}</Fact>
      </FactList>
      {value.last_attempt.raw_bytes !== undefined && value.last_attempt.compressed_bytes !== undefined
        ? <Help>{t('settings:librarySharing.snapshotSizes', {
          raw: (value.last_attempt.raw_bytes / 1024).toFixed(1),
          compressed: (value.last_attempt.compressed_bytes / 1024).toFixed(1),
        })}</Help> : null}
      {value.last_attempt.status === 'accepted' ? <Help>{t('settings:librarySharing.acceptedHelp')}</Help> : null}
    </Stack> : null}
    {value.enabled && value.last_attempt?.status === 'failed'
      ? <Stack divided><span className="self-start"><StatusLabel tone={value.last_attempt.attempted ? 'error' : 'warning'}>{value.last_attempt.attempted ? t('settings:librarySharing.uploadFailed') : t('settings:librarySharing.retryPending')}</StatusLabel></span><ErrorText>{value.last_attempt.attempted
        ? t('settings:librarySharing.failedThisWeek') : t('settings:librarySharing.incomplete')}</ErrorText></Stack> : null}
    {value.enabled && value.last_attempt?.status === 'waiting-data'
      ? <Stack divided><span className="self-start"><StatusLabel>{t('settings:librarySharing.waitingData')}</StatusLabel></span><Help>{t('settings:librarySharing.waitingDataHelp')}</Help></Stack> : null}
    {value.enabled && value.last_attempt?.status === 'unknown'
      ? <Stack divided><span className="self-start"><StatusLabel tone="warning">{t('settings:librarySharing.resultUnknown')}</StatusLabel></span><Help>{t('settings:librarySharing.resultUnknownHelp')}</Help></Stack> : null}
  </>;
}

export function LibrarySharingPreview({ preview }: { preview: LibraryPreview }) {
  const previewText = JSON.stringify(preview.data, null, 2);
  return <>
    <Help>{t('settings:librarySharing.snapshotSizes', {
      raw: (preview.bytes / 1024).toFixed(1), compressed: (preview.compressed_bytes / 1024).toFixed(1),
    })}</Help>
    <CodeBlock code={previewText} language="json" label={t('settings:librarySharing.previewLabel')} maxCharacters={24000} />
    {previewText.length > 24000 ? <Help>{t('settings:librarySharing.truncated')}</Help> : null}
  </>;
}
