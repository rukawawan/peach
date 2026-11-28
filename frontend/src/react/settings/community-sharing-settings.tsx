import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/base/buttons/button';

import { apiGet, apiSend, errorMessage } from '../../api';
import { t } from '../../i18n';
import { StatusLabel } from '../components/status-label';
import { LibrarySharingDelivery, LibrarySharingPreview, LibrarySharingScope, type LibraryPreview, type LibrarySharingState } from './library-sharing-settings';
import { Disclosure, ErrorText, Footer, Help, Stack } from './section';
import { SeedSharingDelivery, SeedSharingPreview, SeedSharingScope, type SeedPreview, type SeedSharingState } from './seed-sharing-details';
import { SharingChoice } from './sharing-choice';
import { busyProps, useAction } from './use-action';

const CHOICE_URL = '/api/configuration/community-sharing';
const CHOICE_KEY = ['community-sharing'];
interface State { library: LibrarySharingState; metadata: SeedSharingState; failed?: ('library' | 'metadata')[] }
interface Preview { library: LibraryPreview; metadata: SeedPreview }

async function readState(signal: AbortSignal) {
  const value = await apiGet<State>(CHOICE_URL, signal);
  if (!value?.library || !value.metadata) throw new Error(t('settings:communitySharing.readFailed'));
  return value;
}

function downloadPreview(preview: Preview) {
  const data = JSON.stringify({ library: preview.library.data, public_metadata: preview.metadata.data }, null, 2);
  const url = URL.createObjectURL(new Blob([data], { type: 'application/json' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = 'peach-community-sharing-preview.json';
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function SharingDataGroup({ title, children }: { title: string; children: ReactNode }) {
  return <div className="flex min-w-0 flex-col gap-2">
    <p className="text-body-semibold text-text-primary">{title}</p>
    {children}
  </div>;
}

export function CommunitySharingSettings({ active, receipt }: { active: boolean; receipt(message: string): void }) {
  const client = useQueryClient();
  const read = useQuery({ queryKey: CHOICE_KEY, enabled: active, queryFn: ({ signal }) => readState(signal) });
  const [preview, setPreview] = useState<Preview | null>(null);
  const previewHeading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    if (preview) previewHeading.current?.focus();
  }, [preview]);
  const action = useAction();
  const state = read.data;
  const libraryOn = state?.library.enabled === true;
  const metadataOn = state?.metadata.enabled === true;
  const fullyEnabled = libraryOn && metadataOn;
  const available = state ? state.library.available && state.metadata.available : undefined;
  const partial = libraryOn !== metadataOn;
  const participation = state?.library.participation;
  const hasDeliveryDetails = Boolean(state && (
    state.library.consent_state === 'needs-consent'
    || state.library.last_sent_at
    || state.library.last_attempt?.status
    || participation?.pending_state
    || (participation?.status && participation.status !== 'not-attempted')
    || state.metadata.last_attempt.status
    || Object.values(state.metadata.name_candidates ?? {}).some(Boolean)
  ));
  const setState = (next: State) => client.setQueryData(CHOICE_KEY, next);
  const refresh = () => void action.run('refresh', readState, setState);

  const startPreview = () => void action.run('preview', async signal => {
    const [library, metadata] = await Promise.all([
      apiGet<LibraryPreview>('/api/configuration/library-sharing/preview', signal),
      apiGet<SeedPreview>('/api/configuration/seed-sharing/preview', signal),
    ]);
    return { library, metadata };
  }, setPreview);

  const save = (enabled: boolean) => void action.run('save', signal => apiSend<State>(CHOICE_URL, {
    enabled,
    ...(enabled && preview ? {
      consent: true,
      library: { token: preview.library.token, schema: preview.library.schema },
      metadata: { token: preview.metadata.token, schema: preview.metadata.schema },
    } : {}),
  }, 'POST', signal), next => {
    setState(next);
    setPreview(null);
    if (!next.failed?.length) receipt(t('settings:communitySharing.saved'));
  }, cause => {
    action.setError(errorMessage(cause));
    void read.refetch();
  });

  return <>
    <SharingChoice label={t('settings:communitySharing.enable')} description={t('settings:communitySharing.description')}
      selected={libraryOn || metadataOn} available={available} disabled={!state} busy={Boolean(action.busy)}
      onChange={enabled => enabled ? startPreview() : save(false)} />
    {partial ? <Stack divided>
      <StatusLabel className="self-start" tone="warning">
        {libraryOn ? t('settings:communitySharing.onlyStudy') : t('settings:communitySharing.onlyMetadata')}
      </StatusLabel>
    </Stack> : null}
    {state && preview ? <section aria-labelledby="community-sharing-preview">
      <Stack divided>
        <h4 id="community-sharing-preview" ref={previewHeading} tabIndex={-1} className="text-body-semibold text-text-primary">
          {t('settings:communitySharing.previewTitle')}
        </h4>
        <Help>{t('settings:librarySharing.previewSummary', {
          count: preview.library.data.library.length, uncoded: preview.library.data.coverage.uncoded_items,
          size: (preview.library.bytes / 1024).toFixed(1),
        })}</Help>
        <Help>{t('settings:seedSharing.summary', {
          count: preview.metadata.data.claims.length, omitted: preview.metadata.data.omitted,
          size: (preview.metadata.bytes / 1024).toFixed(1),
        })}</Help>
        <Disclosure summary={t('settings:communitySharing.previewDetails')}>
          <div className="flex min-w-0 flex-col gap-6">
            <SharingDataGroup title={t('settings:communitySharing.study')}>
              <LibrarySharingScope value={state.library} />
              <LibrarySharingPreview preview={preview.library} />
            </SharingDataGroup>
            <SharingDataGroup title={t('settings:seedSharing.title')}>
              <SeedSharingScope />
              <SeedSharingPreview preview={preview.metadata} />
            </SharingDataGroup>
          </div>
        </Disclosure>
      </Stack>
    </section> : null}
    {state?.failed?.length || read.isError || action.error ? <Stack divided>
      <ErrorText>{action.error || (state?.failed?.length
        ? t('settings:communitySharing.saveFailed') : t('settings:communitySharing.readFailed'))}</ErrorText>
    </Stack> : null}
    {state && !preview && hasDeliveryDetails ? <div id="seedSharing">
      <Stack divided>
        <Disclosure summary={t('settings:communitySharing.deliveryStatus')}>
          <SharingDataGroup title={t('settings:communitySharing.study')}>
            <LibrarySharingDelivery value={state.library} />
          </SharingDataGroup>
          <SharingDataGroup title={t('settings:seedSharing.title')}>
            <SeedSharingDelivery value={state.metadata} />
          </SharingDataGroup>
        </Disclosure>
      </Stack>
    </div> : null}
    <Footer status={state && !preview && !hasDeliveryDetails ? <span id="seedSharing">
      <StatusLabel aria-label={t('settings:communitySharing.deliveryStatus')}>
        {t('settings:librarySharing.notSent')}
      </StatusLabel>
    </span> : undefined}>
      {preview ? <>
        <Button variant="secondary" onClick={() => setPreview(null)}>{t('settings:shared.cancel')}</Button>
        <Button variant="secondary" onClick={() => downloadPreview(preview)}>{t('settings:librarySharing.downloadPreview')}</Button>
        {!fullyEnabled ? <Button variant="primary" disabled={!available} onClick={() => save(true)}
          {...busyProps(action.busy === 'save')}>{t('settings:communitySharing.agree')}</Button> : null}
      </> : <>
        {hasDeliveryDetails || libraryOn || metadataOn || read.isError ? <Button variant="secondary" onClick={refresh}
          {...busyProps(action.busy === 'refresh')}>{t('settings:communitySharing.refresh')}</Button> : null}
        <Button variant="secondary" disabled={!state} onClick={startPreview}
          {...busyProps(action.busy === 'preview')}>{t(partial ? 'settings:communitySharing.complete' : 'settings:communitySharing.preview')}</Button>
      </>}
    </Footer>
  </>;
}
