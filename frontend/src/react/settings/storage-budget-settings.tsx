import { useEffect, useState } from 'react';
import { Button } from '@/components/base/buttons/button';
import { SettingsRow } from '@/components/application/settings/settings-rows';
import { Switch } from '@/components/base/switch/switch';
import { Input } from '@/components/base/input/input';
import { ConfigurationInput } from '../components/configuration-fields';
import { apiGet, apiSend, errorMessage } from '../../api';
import type { StoragePolicy, StorageState } from '../bundle';
import { ErrorText, Footer, Help, Rows, Section, Stack } from './section';
import { busyProps, useAction } from './use-action';

const NUMBERS = [
  ['minimum_free_gib', '磁盘保留空间', '留空自动保留 5%，最低 1 GiB、最高 40 GiB'],
  ['data_max_gib', 'Peach 数据上限', '达到上限暂停刮削与补修，不影响播放'],
  ['cache_max_gib', 'Peach 缓存上限', '播放、网络媒体与缩略图缓存'],
] as const;

export function StorageBudgetSettings({ initial, after, receipt }: {
  initial: NonNullable<StorageState['budget']>;
  after(storage: StorageState): void;
  receipt(message: string): void;
}) {
  const [policy, setPolicy] = useState(initial.policy);
  const action = useAction(initial.error);
  const [cacheRead, setCacheRead] = useState('');
  useEffect(() => {
    if (!policy?.enabled || initial.policy?.external_cache_path) return;
    const controller = new AbortController();
    setCacheRead('正在读取 CloudDrive 缓存目录…');
    void apiGet<{ path?: string; configured?: boolean }>('/api/configuration/storage/external-cache', controller.signal).then(result => {
      if (controller.signal.aborted) return;
      const path = result.path;
      if (!path) {
        setCacheRead('CloudDrive 未配置，可手动填写缓存目录');
        return;
      }
      setPolicy(current => current && !current.external_cache_path ? { ...current, external_cache_path: path } : current);
      setCacheRead('已自动读取，保存配置后生效');
    }).catch(cause => {
      if (!controller.signal.aborted) setCacheRead(`${errorMessage(cause)}；可手动填写。`);
    });
    return () => controller.abort();
  }, [policy?.enabled, initial.policy?.external_cache_path]);
  const update = <K extends keyof StoragePolicy>(key: K, value: StoragePolicy[K]) =>
    setPolicy(current => current ? { ...current, [key]: value } : current);
  const check = initial.last_check;
  if (!policy) return <Section title="容量保护"><Stack><ErrorText>{action.error || '容量设置未取得'}</ErrorText></Stack></Section>;

  return <Section id="storageBudgetSettings" title="容量保护" onSubmit={event => {
    event.preventDefault();
    void action.run('save', signal => apiSend<StorageState>('/api/configuration/storage/policy', policy, 'POST', signal),
      result => { setCacheRead(''); after(result); receipt('已保存容量保护设置'); });
  }}>
    <Rows>
      <SettingsRow label="启用容量保护" description="超限先清理旧缓存，仍超限只暂停后台任务；磁盘空间不足时才影响播放">
        <Switch aria-label="启用容量保护" isSelected={policy.enabled} isDisabled={Boolean(action.busy)}
          onChange={value => update('enabled', value)} />
      </SettingsRow>
      {policy.enabled ? <>
      {NUMBERS.map(([key, label, description]) => <SettingsRow key={key} label={label} description={description}>
        <ConfigurationInput aria-label={`${label}（GiB）`} unit="GiB" inputMode="numeric" pattern="[0-9]*" size="small"
          className="w-32 shrink-0" placeholder={key === 'minimum_free_gib' ? '自动' : '不限'}
          value={policy[key] ? String(policy[key]) : ''} onChange={value => update(key, Number(value))}
          isDisabled={Boolean(action.busy)} />
      </SettingsRow>)}
      <SettingsRow label="自动清理缓存" description="从最旧的开始清理播放缓存与缩略图">
        <Switch aria-label="自动清理缓存" isSelected={policy.auto_clean} isDisabled={Boolean(action.busy)}
          onChange={value => update('auto_clean', value)} />
      </SettingsRow>
      </> : null}
    </Rows>
    {policy.enabled ? <Stack divided>
        <Input label="外部缓存目录" hint={cacheRead || '自动读取本机 CloudDrive，也可手动填写；不自动清理'}
          value={policy.external_cache_path} size="small" className="w-full" placeholder="未设置"
          onChange={value => update('external_cache_path', value)} isDisabled={Boolean(action.busy)} />
    </Stack> : null}
    {policy.enabled && policy.external_cache_path ? <Rows>
      <SettingsRow label="外部缓存上限"
        description="达到上限暂停补修，留空只检查磁盘余量">
        <ConfigurationInput aria-label="外部缓存上限（GiB）" unit="GiB" size="small" className="w-32 shrink-0" placeholder="不限"
          inputMode="numeric" pattern="[0-9]*" value={policy.external_cache_max_gib ? String(policy.external_cache_max_gib) : ''}
          onChange={value => update('external_cache_max_gib', Number(value))} isDisabled={Boolean(action.busy)} />
      </SettingsRow>
    </Rows> : null}
    <Stack divided>
      {policy.enabled ? <Help>推荐值待取得使用数据后给出。上限留空表示不限，在途任务可能超出。</Help> : null}
      {policy.enabled && check?.paused ? <ErrorText>{check.reasons.join('；')}。调整或清理后，在任务中心重试补修。</ErrorText> : null}
      {action.error ? <ErrorText>{action.error}</ErrorText> : null}
    </Stack>
    <Footer><Button type="submit" {...busyProps(action.busy === 'save')}>保存配置</Button></Footer>
  </Section>;
}
