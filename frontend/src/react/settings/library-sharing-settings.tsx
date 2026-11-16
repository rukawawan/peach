import { useMemo, useState } from 'react';

import { SettingsRow } from '@/components/application/settings/settings-rows';
import { Button } from '@/components/base/buttons/button';
import { Checkbox } from '@/components/base/checkbox/checkbox';
import { Switch } from '@/components/base/switch/switch';

import { apiGet, apiSend } from '../../api';
import { CodeBlock } from '../components/code-block';
import { StatusLabel, type StatusTone } from '../components/status-label';
import { Disclosure, ErrorText, Fact, FactList, Footer, Help, Rows, Stack } from './section';
import { busyProps, useAction } from './use-action';
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
interface Preview { data: { library: unknown[]; preferences: unknown; coverage: { uncoded_items: number } };
  bytes: number; compressed_bytes: number; token: string; schema: number }

export function LibrarySharingSettings({ initial, receipt }: {
  initial: LibrarySharingState; receipt(message: string): void;
}) {
  const [value, setValue] = useState(initial);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [reviewing, setReviewing] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const previewText = useMemo(() => preview ? JSON.stringify(preview.data, null, 2) : '', [preview]);
  const action = useAction();
  const participation = value.participation;
  const deliveryNames: Record<string, string> = {
    'not-attempted': t('settings:librarySharing.notSent'), queued: t('settings:librarySharing.waiting'), accepted: t('settings:librarySharing.sent'),
    failed: t('settings:librarySharing.sendFailed'), unknown: t('settings:librarySharing.resultUnknown'), blocked: t('settings:librarySharing.blocked'),
  };
  const participationTones: Record<string, StatusTone> = {
    queued: 'progress', accepted: 'success', failed: 'error', unknown: 'warning', blocked: 'warning',
  };
  const save = (enabled: boolean) => void action.run('save', (signal) =>
    apiSend<LibrarySharingState>('/api/configuration/library-sharing', {
      enabled, schema: value.schema, consent: accepted, preview_token: preview?.token,
    }, 'POST', signal), (saved) => {
    setValue(saved); setPreview(null); setAccepted(false); setReviewing(false); receipt(t('settings:librarySharing.saved'));
  });
  const downloadPreview = () => {
    const url = URL.createObjectURL(new Blob([previewText], { type: 'application/json' }));
    const anchor = document.createElement('a');
    anchor.href = url; anchor.download = 'peach-library-taste-preview.json';
    document.body.append(anchor);
    try { anchor.click() } finally {
      anchor.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
    }
  };
  return <>
    <Rows><SettingsRow label={t('settings:librarySharing.uploadDetails')} description={t('settings:librarySharing.uploadDescription')}>
      <Switch aria-label={t('settings:librarySharing.uploadDetails')} isSelected={value.enabled}
        onChange={(enabled) => enabled ? setReviewing(true) : save(false)}
        {...busyProps(action.busy === 'save')} />
    </SettingsRow></Rows>
    {!value.available ? <Stack divided><span className="self-start"><StatusLabel>{t('settings:librarySharing.unavailable')}</StatusLabel></span></Stack> : null}
    {value.consent_state === 'needs-consent' ? <Stack divided>
      <span className="self-start"><StatusLabel tone="warning">{t('settings:librarySharing.needsConsent')}</StatusLabel></span>
      <Help>{t('settings:librarySharing.fieldsChanged')}</Help>
    </Stack> : null}
    <Stack divided><Disclosure summary={t('settings:librarySharing.fieldsAndRules')}>
      <ul className="list-disc space-y-2 pl-5">{serverLabelList(value.fields, value.field_codes).map(field => <li key={field}><Help>{field}</Help></li>)}</ul>
      <Help>{codedText(value, 'notice')}</Help>
    </Disclosure></Stack>
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
    {preview ? <Stack divided>
      <Help>{t('settings:librarySharing.previewSummary', { count: preview.data.library.length, uncoded: preview.data.coverage.uncoded_items, size: (preview.bytes / 1024).toFixed(1) })}</Help>
      <Help>{t('settings:librarySharing.snapshotSizes', {
        raw: (preview.bytes / 1024).toFixed(1), compressed: (preview.compressed_bytes / 1024).toFixed(1),
      })}</Help>
      <Help>{t('settings:librarySharing.previewNotice')}</Help>
      <Disclosure summary={t('settings:librarySharing.previewData')} defaultOpen>
        <CodeBlock code={previewText} language="json" label={t('settings:librarySharing.previewLabel')} maxCharacters={24000} />
      </Disclosure>
      {previewText.length > 24000 ? <Help>{t('settings:librarySharing.truncated')}</Help> : null}
      <Button variant="secondary" onClick={downloadPreview}>{t('settings:librarySharing.downloadPreview')}</Button>
      {!value.enabled ? <Checkbox isSelected={accepted} onChange={setAccepted}>{t('settings:librarySharing.consent')}</Checkbox> : null}
    </Stack> : null}
    {action.error ? <Stack divided><ErrorText>{action.error}</ErrorText></Stack> : null}
    <Footer>
      {reviewing && !value.enabled ? <Button variant="secondary" onClick={() => {
        setReviewing(false); setPreview(null); setAccepted(false);
      }}>{t('settings:shared.cancel')}</Button> : null}
      {participation ? <Button variant="secondary" onClick={() => void action.run('refresh',
        async signal => {
          const data = await apiGet<{ library_sharing?: LibrarySharingState }>('/api/configuration', signal);
          if (!data.library_sharing) throw new Error(t('settings:librarySharing.statusUnavailable'));
          return data.library_sharing;
        }, setValue)} {...busyProps(action.busy === 'refresh')}>{t('settings:librarySharing.refreshStatus')}</Button> : null}
      <Button variant="secondary" onClick={() => { setReviewing(true); void action.run('preview',
        (signal) => apiGet<Preview>('/api/configuration/library-sharing/preview', signal),
        (data) => { setPreview(data); setAccepted(false) }) }}
        {...busyProps(action.busy === 'preview')}>{t('settings:librarySharing.preview')}</Button>
      {!value.enabled && preview ? <Button variant="primary" disabled={!accepted} onClick={() => save(true)}
        {...busyProps(action.busy === 'save')}>{t('settings:librarySharing.agreeAndEnable')}</Button> : null}
    </Footer>
  </>;
}
