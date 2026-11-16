/* 本机端口与已保存媒体配置使用同一份修订号。 */
import { useEffect, useState, type FormEvent } from 'react';
import { Button } from '@/components/base/buttons/button';
import { Input } from '@/components/base/input/input';
import { LinkButton } from '@/components/base/buttons/link-button';
import { ApiError, apiSend, errorMessage } from '../../api';
import { CONFIGURATION_URL } from '../../configuration-endpoints';
import type { ConfigurationGroupProps } from '../bundle';
import { Note } from '../components/note';
import { ConfigurationChoice, ConfigurationInput } from '../components/configuration-fields';
import { RESTART_REDIRECT_MS } from '../restart-redirect';
import { ErrorText, Footer, Help, Section, Stack } from './section';
import { busyProps, useAction } from './use-action';
import { bodyFieldErrors } from '../../core/server-text';
import { t } from '../../i18n';

const HOST_OPTIONS = [
  { value: '0.0.0.0', label: t('settings:accessAddress.lanDevices') },
  { value: '127.0.0.1', label: t('settings:accessAddress.thisComputerOnly') },
];

export function PortSettings({ data, receipt }: ConfigurationGroupProps) {
  const network = data.network;
  const editable = network ? network.editable : data.editable && data.port_editable !== false;
  const [host, setHost] = useState(network?.host ?? '127.0.0.1');
  const [name, setName] = useState(network?.mdns_name ?? 'peach');
  const [port, setPort] = useState(String(data.port));
  const [fields, setFields] = useState<Partial<Record<'port' | 'host' | 'mdns_name', string>>>({});
  const [saved, setSaved] = useState<{ url: string } | null>(null);
  const action = useAction();
  useEffect(() => {
    if (!saved) return;
    const timer = setTimeout(() => location.assign(saved.url), RESTART_REDIRECT_MS);
    return () => clearTimeout(timer);
  }, [saved]);
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFields({});
    void action.run('save', (signal) => apiSend<{ url: string }>(CONFIGURATION_URL, {
      revision: data.revision, media_dirs: data.media_dirs,
      ...(data.media_sources ? { media_sources: data.media_sources } : {}),
      port, scan_now: false,
      ...(network?.editable ? { host, ...(host === '0.0.0.0' ? { mdns_name: name } : {}) } : {}),
    }, 'POST', signal), (result) => {
      setSaved({ url: new URL('/settings/network', result.url).href }); receipt(t('settings:shared.settingsSaved'));
    }, (cause) => {
      const fields = cause instanceof ApiError && cause.status === 400
        ? bodyFieldErrors<Partial<Record<'port' | 'host' | 'mdns_name', string>>>(cause.body) : null;
      if (fields && (fields.port || fields.host || fields.mdns_name)) setFields(fields);
      else action.setError(errorMessage(cause));
    });
  };
  if (saved) return <Section guide="port" title={t('settings:accessUrls.title')}><Stack>
    <Note tone="success" title={t('settings:shared.configSaved')}>{t('settings:accessAddress.restarting')}
      <LinkButton href={saved.url} size="small">{t('settings:accessAddress.backToNetwork')}</LinkButton>
    </Note>
  </Stack></Section>;
  return <Section guide="port" title={t('settings:accessUrls.title')} onSubmit={editable ? submit : undefined}><Stack>
    {network ? <>
      <Address label={t('settings:accessAddress.localUrl')} value={network.local_url} receipt={receipt} />
      {network.lan_url || network.ip_url ? <>
        <Address label={t('settings:accessAddress.phoneUrl')} value={network.lan_url || network.ip_url} receipt={receipt} />
        {network.lan_url && network.ip_url ? <Address label={t('settings:accessAddress.alternateIp')} value={network.ip_url} receipt={receipt} /> : null}
        <Help>{t('settings:accessAddress.sameWifi')}{network.ip_url && network.lan_url ? t('settings:accessAddress.tryIp') : ''}</Help>
      </> : <Help>{network.scope === 'local'
        ? t('settings:accessAddress.localOnly')
        : t('settings:accessAddress.lanUnavailable')}</Help>}
    </> : null}
    {editable ? <>
      {network?.editable ? <>
        <ConfigurationChoice id="configHost" label={t('settings:accessAddress.whoCanConnect')} value={host} onChange={setHost} options={HOST_OPTIONS}
          isDisabled={Boolean(action.busy)} isInvalid={Boolean(fields.host)}>
          {fields.host ? <ErrorText>{fields.host}</ErrorText> : null}
        </ConfigurationChoice>
        {host === '0.0.0.0' ? <ConfigurationInput id="configMdnsName" label={t('settings:accessUrls.lanUrl')} value={name} onChange={setName}
          prefix={network.local_url.startsWith('https:') ? 'https://' : 'http://'} suffix=".local"
          autoComplete="off" spellCheck="false" maxLength={63} isDisabled={Boolean(action.busy)} validationBehavior="aria"
          isInvalid={Boolean(fields.mdns_name)} hint={fields.mdns_name || undefined} /> : null}
      </> : null}
      <ConfigurationInput id="configPort" label={t('settings:accessUrls.port')} prefix="localhost:" inputMode="numeric" value={port} onChange={setPort}
        isDisabled={Boolean(action.busy)} validationBehavior="aria" isInvalid={Boolean(fields.port)} hint={fields.port} />
    </> : <Help>{data.notice || t('settings:accessAddress.managedByStartup')}</Help>}
    {network?.editable && host === '0.0.0.0' && network.scope === 'local'
      ? <Help>{t('settings:accessAddress.phoneUrlAfterRestart')}</Help> : null}
    {action.error ? <Note tone="error" title={t('settings:shared.notSaved')}>{action.error}</Note> : null}
  </Stack>{editable ? <Footer status={t('settings:accessUrls.restartNotice')}>
    <Button type="submit" {...busyProps(action.busy === 'save')}>{t('settings:shared.saveSettings')}</Button>
  </Footer> : null}</Section>;
}

function Address({ label, value, receipt }: { label: string; value: string; receipt(message: string): void }) {
  const action = useAction();
  return <div className="flex min-w-0 flex-col gap-2">
    <div className="flex min-w-0 flex-wrap items-end gap-2">
      <Input className="min-w-0 flex-1" label={label} value={value} isReadOnly autoComplete="off" />
      <Button variant="secondary" aria-label={t('settings:accessAddress.copyLabel', { label })} onClick={() => void action.run('copy', () => navigator.clipboard.writeText(value),
        () => receipt(t('settings:accessAddress.copied')))}>{t('settings:accessAddress.copyUrl')}</Button>
    </div>
    {action.error ? <Help role="status">{t('settings:accessAddress.copyFailed')}</Help> : null}
  </div>;
}
