/* 「应用与维护」的后半段：存储空间、数据上传、运行信息、新手教程与卸载。少改的隐私开关和只读信息在后，
 * 卸载是不可逆动作，留在整组最后。 */
import { useState, type FormEvent } from 'react';
import { confirmModal } from '@peach/legacy/ui';

import { SettingsCard, SettingsRow } from '@/components/application/settings/settings-rows';
import { Button } from '@/components/base/buttons/button';
import { Select, SelectItem } from '@/components/base/select/select';
import { Switch } from '@/components/base/switch/switch';

import { apiSend } from '../../api';
import type {
  AutomaticUpdateState, ConfigurationFact, ConfigurationGroupProps, ConfigurationProps, UninstallState,
} from '../bundle';
import { PathLine } from '../components/path-line';
import { groupRoot } from './configuration-panel';
import { LedgerBackupSettings } from './ledger-backup-settings';
import { LibrarySharingSettings } from './library-sharing-settings';
import { RemoteReportingSettings } from './remote-reporting-settings';
import { Disclosure, ErrorText, ExternalLink, Fact, FactList, Footer, Help, Rows, Section, Stack } from './section';
import { StorageSettings } from './storage-settings';
import { busyProps, useAction } from './use-action';

const INTERVALS = [['6', '每 6 小时'], ['24', '每天'], ['168', '每周']] as const;

export function MaintenanceSettings(
  { data, receipt, reopenTutorial, panel }: ConfigurationGroupProps & Pick<ConfigurationProps, 'reopenTutorial'>,
) {
  return (
    <div {...groupRoot(panel)}>
      {data.storage ? <StorageSettings initial={data.storage} receipt={receipt} /> : null}
      {data.storage ? <LedgerBackupSettings receipt={receipt} /> : null}
      {data.remote_reporting || data.library_sharing ? <Section id="librarySharing" guide="reporting" title="数据上传">
        {data.remote_reporting ? <RemoteReportingSettings initial={data.remote_reporting} receipt={receipt} /> : null}
        {data.library_sharing ? <div className="border-t border-separator-border">
          <LibrarySharingSettings initial={data.library_sharing} receipt={receipt} />
        </div> : null}
      </Section> : null}
      <Facts facts={data.facts} receipt={receipt} />
      <TutorialSettings receipt={receipt} reopenTutorial={reopenTutorial} />
      {data.uninstall ? <UninstallSettings uninstall={data.uninstall} receipt={receipt} /> : null}
    </div>
  );
}

/** 恢复账本共享的教程入口，保留首次设置与章节进度。 */
export function TutorialSettings({ reopenTutorial }: ConfigurationProps) {
  return (
    <section aria-label="新手教程" className="w-full"><SettingsCard>
      <Rows><SettingsRow label="新手教程" description="在所有设备上恢复右上角教程入口，保留已读进度">
        <Button variant="secondary" onClick={() => void reopenTutorial()}>重新打开</Button>
      </SettingsRow></Rows>
    </SettingsCard></section>
  );
}

export function AutomaticUpdates({ initial, receipt }: { initial: AutomaticUpdateState; receipt(message: string): void }) {
  const [mode, setMode] = useState(initial.mode);
  const [hours, setHours] = useState(initial.interval_hours);
  const action = useAction(initial.error);

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!initial.available) return;
    void action.run('save', (signal) => apiSend<AutomaticUpdateState>('/api/configuration/automatic-updates',
      { mode, interval_hours: hours }, 'POST', signal), () => receipt('已保存配置'));
  };

  const help = !initial.available
    ? '自动更新需要由托盘管理的服务。'
    : initial.download_available
      ? '下载完成后在这里确认重启安装。'
      : undefined;
  return (
    <Section id="automaticUpdates" guide="automatic-updates" title="自动更新" onSubmit={submit}>
      <Rows>
        <SettingsRow label="自动检查新版本">
          <Switch aria-label="自动检查新版本" isSelected={mode !== 'off'} isDisabled={!initial.available}
            onChange={(on) => setMode(on ? 'check' : 'off')} />
        </SettingsRow>
        <SettingsRow label="自动下载更新" description="发现新版本后先下载，重启安装前会询问。">
          <Switch aria-label="自动下载更新" isSelected={mode === 'download'}
            isDisabled={!initial.available || !initial.download_available || mode === 'off'}
            onChange={(on) => setMode(on ? 'download' : 'check')} />
        </SettingsRow>
        <SettingsRow label="检查频率" description={help}>
          <Select aria-label="检查频率" selectedKey={String(hours)} isDisabled={!initial.available}
            onSelectionChange={(key) => { if (key !== null) setHours(Number(key)); }}>
            {INTERVALS.map(([key, name]) => <SelectItem key={key} id={key}>{name}</SelectItem>)}
          </Select>
        </SettingsRow>
      </Rows>
      {action.error ? <Stack divided><ErrorText>{action.error}</ErrorText></Stack> : null}
      <Footer>
        <Button type="submit" disabled={!initial.available} {...busyProps(action.busy === 'save')}>保存配置</Button>
      </Footer>
    </Section>
  );
}

/* 缺的媒体工具在能装的平台上带「安装」：下载、校验、解压都在那一次请求里做完，回来的运行信息整块
 * 替换，刚装好的那一行直接写着版本。其余平台没有发布的工具包，仍是官方下载外链。 */
function Facts({ facts: loaded, receipt }: { facts: ConfigurationFact[]; receipt(message: string): void }) {
  const [installed, setInstalled] = useState<ConfigurationFact[] | null>(null);
  const facts = installed ?? loaded;
  const action = useAction();
  const install = (tool: string) => void action.run(tool, (signal) => apiSend<{ message: string; facts: ConfigurationFact[] }>(
    '/api/configuration/media-tools', { tool }, 'POST', signal), (result) => {
    setInstalled(result.facts);
    receipt(result.message);
  });
  return (
    <Section guide="facts" title="运行信息">
      <FactList>
        {facts.map(({ term, value, install_tool: tool, download_url: url, download_label: label }) => (
          <Fact key={term} term={term}>
            {/* 「安装」钉在说明右边：说明在自己那一栏里折行，按钮不被挤到下一行。 */}
            {tool ? <span className="flex min-w-0 items-center gap-3">
              <span className="min-w-0">{value}</span>
              <Button size="small" className="shrink-0" onClick={() => install(tool)}
                {...busyProps(action.busy === tool)}>安装</Button>
            </span> : <>
              {value}
              {url ? <ExternalLink href={url}>{label}</ExternalLink> : null}
            </>}
          </Fact>
        ))}
      </FactList>
      {action.error ? <ErrorText>{action.error}</ErrorText> : null}
    </Section>
  );
}

export function UninstallSettings(
  { uninstall, receipt }: { uninstall: UninstallState; receipt(message: string): void },
) {
  const [removeData, setRemoveData] = useState(false);
  const [accepted, setAccepted] = useState('');
  const remove = () => void confirmModal({
    title: '卸载 Peach',
    danger: true,
    body: removeData
      ? '将退出 Peach，移除程序、开机自启、桌面图标、设置、本地数据库、观看记录、凭据和缓存。原始媒体文件保留。'
      : '将退出 Peach 并移除程序、开机自启和桌面图标。设置、本地数据库、观看记录与缓存保留。',
    confirmLabel: '卸载 Peach',
    onConfirm: async () => {
      const result = await apiSend<{ message: string }>('/api/configuration/uninstall', { delete_data: removeData, confirmation: '卸载 Peach' });
      setAccepted(result.message);
    },
  });
  // 底栏左边一句说这颗按钮此刻意味着什么：拦住卸载的理由（源码安装、更新还在跑）和按下去
  // 之后的回执都在答「这颗现在能不能按」，摆在正文末尾就得先读完整段说明才找得到。
  const status = accepted || uninstall.message;
  const paths = [...new Set([uninstall.data_root, ...uninstall.directories])];
  return (
    <Section id="uninstallPeach" guide="uninstall" title="卸载 Peach">
      {uninstall.available ? <Stack><Help>卸载移除 Peach 程序本身，原始媒体文件保留。</Help></Stack> : null}
      <Rows>
        <SettingsRow label="完全卸载" description="同时删除设置、本地数据库、观看记录、凭据和缓存">
          <Switch aria-label="完全卸载" isSelected={removeData} isDisabled={!uninstall.full_available || Boolean(accepted)} onChange={setRemoveData} />
        </SettingsRow>
      </Rows>
      <Stack divided>
        <Disclosure summary="数据目录">
          {paths.map((path) => (
            <PathLine key={path} path={path} className="text-body-2-regular text-text-secondary" onRevealed={receipt} />
          ))}
        </Disclosure>
      </Stack>
      <Footer status={status ? <p role={accepted ? 'status' : undefined}>{status}</p> : null}>
        <Button variant="danger" disabled={!uninstall.available || Boolean(accepted)} onClick={remove}>卸载 Peach</Button>
      </Footer>
    </Section>
  );
}
