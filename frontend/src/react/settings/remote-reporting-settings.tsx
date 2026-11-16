import { useState } from 'react';

import { SettingsRow } from '@/components/application/settings/settings-rows';
import { Switch } from '@/components/base/switch/switch';
import { StatusLabel } from '../components/status-label';

import { apiSend } from '../../api';
import { Disclosure, ErrorText, Help, Rows, Stack } from './section';
import { busyProps, useAction } from './use-action';
import { codedText, serverLabel } from '../../core/server-text';
import { interfaceLanguage, t } from '../../i18n';

export interface RemoteReportingState {
  usage: boolean; errors: boolean; available: boolean;
  fields: { usage: string; errors: string }; notice: string;
  /** 与 `fields`、`notice` 对应的 code，按界面语言取译文。 */
  field_codes?: { usage: string; errors: string }; notice_code?: string;
  delivery?: Partial<Record<'usage' | 'errors', { status: string; at?: string; last_sent_at?: string; reason?: string }>>;
}

export function ReportingChoices({ value, onChange, busy = false }: {
  value: RemoteReportingState; onChange(value: RemoteReportingState): void; busy?: boolean;
}) {
  return <>
    <Rows>
      <SettingsRow label={t('settings:dataSharing.reportErrors')} description={t('settings:dataSharing.reportErrorsHelp')}>
        <Switch aria-label={t('settings:dataSharing.reportErrors')} isSelected={value.usage && value.errors}
          onChange={(enabled) => onChange({ ...value, usage: enabled, errors: enabled })} {...busyProps(busy)} />
      </SettingsRow>
    </Rows>
    {!value.available ? <Stack divided><span className="self-start"><StatusLabel>{t('settings:librarySharing.unavailable')}</StatusLabel></span></Stack> : null}
  </>;
}

export function RemoteReportingSettings({ initial, receipt }: {
  initial: RemoteReportingState; receipt(message: string): void;
}) {
  const [value, setValue] = useState(initial);
  const action = useAction();
  const sentDates = Object.values(value.delivery ?? {}).flatMap(delivery =>
    delivery.last_sent_at ? [Date.parse(delivery.last_sent_at)] : []).filter(Number.isFinite);
  const lastSent = sentDates.length ? Math.max(...sentDates) : null;
  return <>
    <ReportingChoices value={value} busy={action.busy === 'save'} onChange={(next) => {
      void action.run('save', (signal) => apiSend<RemoteReportingState>('/api/configuration/remote-reporting',
      { usage: next.usage, errors: next.errors }, 'POST', signal), (saved) => {
      setValue(saved); receipt(t('settings:diagnosticsReporting.saved'));
    });
    }} />
    <Stack divided>
      <Disclosure summary={t('settings:diagnosticsReporting.fieldsAndRules')}>
        <Help>{serverLabel(value.field_codes?.usage ?? '', value.fields.usage)}</Help>
        <Help>{serverLabel(value.field_codes?.errors ?? '', value.fields.errors)}</Help>
        <Help>{codedText(value, 'notice')}</Help>
      </Disclosure>
      {lastSent !== null ? <Help>{t('settings:librarySharing.lastSentAt', { date: new Date(lastSent).toLocaleDateString(interfaceLanguage) })}</Help> : null}
    </Stack>
    {action.error ? <Stack divided><ErrorText>{action.error}</ErrorText></Stack> : null}
  </>;
}
