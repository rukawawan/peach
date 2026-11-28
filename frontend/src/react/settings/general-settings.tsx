/* 「应用与维护」中的开机自启与桌面快捷方式。 */
import { useState, type FormEvent } from 'react';
import { useQuery } from '@tanstack/react-query';

import { SettingsRow } from '@/components/application/settings/settings-rows';
import { Button } from '@/components/base/buttons/button';
import { Switch } from '@/components/base/switch/switch';

import { apiGet, apiSend, errorMessage } from '../../api';
import { codedText } from '../../core/server-text';
import type { StartupState } from '../bundle';
import { Note } from '../components/note';
import { ErrorText, Footer, Help, Rows, Section, Stack } from './section';
import { busyProps, useAction } from './use-action';
import { t } from '../../i18n';

const STARTUP_URL = '/api/configuration/startup';

export function StartupSettingsSection({ active, initial, receipt }: {
  active: boolean; initial?: StartupState; receipt(message: string): void;
}) {
  const query = useQuery({
    queryKey: ['configuration', 'startup'],
    queryFn: ({ signal }) => apiGet<StartupState>(STARTUP_URL, signal),
    enabled: active,
    initialData: initial,
  });
  if (query.data) return <StartupSettings startup={query.data} receipt={receipt} />;
  if (!active) return null;
  return <Section guide="startup" title={t('settings:startup.title')}>
    {query.isError ? <Note tone="error" action={
      <Button variant="secondary" size="small" {...busyProps(query.isFetching)} onClick={() => void query.refetch()}>
        {t('settings:shared.reload')}
      </Button>
    }>{errorMessage(query.error)}</Note> : <div role="status" aria-busy="true" className="px-4 py-3">
      <span className="block h-4 w-36 rounded-md bg-background-tertiary-default" />
    </div>}
  </Section>;
}

export function StartupSettings({ startup, receipt }: { startup: StartupState; receipt(message: string): void }) {
  const [enabled, setEnabled] = useState(startup.enabled);
  const [silent, setSilent] = useState(startup.silent);
  const [desktop, setDesktop] = useState(startup.desktop);
  const action = useAction();
  // 桌面快捷方式只有 Windows 有，桌面上已经摆着另一份安装的图标时也不给动；两种情况后端
  // 都在 desktop_message 里说了原因，所以按它有没有内容判禁用，不在前端判平台。
  const desktopReady = startup.available && !startup.desktop_message;
  const desktopMessage = codedText(startup, 'desktop_message');
  const message = codedText(startup, 'message');

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!startup.available) return;
    void action.run('save', (signal) => apiSend(STARTUP_URL, { enabled, silent, desktop }, 'POST', signal),
      () => receipt(t('settings:shared.settingsSaved')));
  };

  return (
    <Section guide="startup" title={t('settings:startup.title')} onSubmit={submit}>
      <Rows>
        <SettingsRow label={t('settings:startup.launchAtStartup')} description={t('settings:startup.launchAtStartupHelp')}>
          <Switch aria-label={t('settings:startup.launchAtStartup')} isSelected={enabled} isDisabled={!startup.available} onChange={setEnabled} />
        </SettingsRow>
        <SettingsRow label={t('settings:startup.trayOnly')} description={t('settings:startup.trayOnlyHelp')}>
          <Switch aria-label={t('settings:startup.trayOnly')} isSelected={silent} isDisabled={!startup.available || !enabled} onChange={setSilent} />
        </SettingsRow>
        <SettingsRow label={t('settings:startup.desktopShortcut')} description={desktopMessage || undefined}>
          <Switch aria-label={t('settings:startup.desktopShortcut')} isSelected={desktop} isDisabled={!desktopReady} onChange={setDesktop} />
        </SettingsRow>
      </Rows>
      {message || action.error ? (
        <Stack divided>
          {message ? <Help>{message}</Help> : null}
          {action.error ? <ErrorText>{action.error}</ErrorText> : null}
        </Stack>
      ) : null}
      <Footer>
        <Button type="submit" disabled={!startup.available} {...busyProps(action.busy === 'save')}>{t('settings:shared.saveSettings')}</Button>
      </Footer>
    </Section>
  );
}
