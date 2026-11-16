/* 「应用与维护」的前半段：版本更新与开机自启。版本状态最常看，排在整组最前，自动更新的档位紧跟其后。 */
import { useState, type FormEvent } from 'react';

import { SettingsRow } from '@/components/application/settings/settings-rows';
import { Button } from '@/components/base/buttons/button';
import { Switch } from '@/components/base/switch/switch';

import { apiSend } from '../../api';
import { codedText } from '../../core/server-text';
import type { ConfigurationGroupProps, StartupState } from '../bundle';
import { groupRoot } from './configuration-panel';
import { AutomaticUpdates } from './maintenance-settings';
import { ReleaseUpdates } from './release-updates';
import { UpgradeRepairs } from './upgrade-repairs';
import { ErrorText, Footer, Help, Rows, Section, Stack } from './section';
import { busyProps, useAction } from './use-action';
import { t } from '../../i18n';

export function GeneralSettings({ data, receipt, panel }: ConfigurationGroupProps) {
  return (
    <div {...groupRoot(panel)}>
      {data.updates ? <ReleaseUpdates initial={data.updates} initialJob={data.update_job} /> : null}
      <UpgradeRepairs />
      {data.automatic_updates ? <AutomaticUpdates initial={data.automatic_updates} receipt={receipt} /> : null}
      {data.startup ? <StartupSettings startup={data.startup} receipt={receipt} /> : null}
    </div>
  );
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
    void action.run('save', (signal) => apiSend('/api/configuration/startup', { enabled, silent, desktop }, 'POST', signal),
      () => receipt(t('settings:shared.settingsSaved')));
  };

  return (
    <Section guide="startup" title={t('settings:startup.title')} onSubmit={submit}>
      <Rows>
        <SettingsRow label={t('settings:startup.launchAtStartup')}>
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
