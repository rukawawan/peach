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
import { codedText, serverLabelList } from '../../core/server-text';
import { t } from '../../i18n';

const NUMBERS = [
  ['minimum_free_gib', t('settings:storageLimits.reservedSpace'), t('settings:storageLimits.reservedSpaceHelp')],
  ['data_max_gib', t('settings:storageLimits.dataLimit'), t('settings:storageLimits.dataLimitHelp')],
  ['cache_max_gib', t('settings:storageLimits.cacheLimit'), t('settings:storageLimits.cacheLimitHelp')],
] as const;

type LastCheck = NonNullable<NonNullable<StorageState['budget']>['last_check']>;
/** 触线原因按当前界面语言：`reason_codes` 与 `reasons` 同序，缺 code 的照原文。 */
const reasonTexts = (check: LastCheck) =>
  serverLabelList(check.reasons, check.reason_codes?.map(item => item?.code ?? null),
    check.reason_codes?.map(item => item?.params ?? null));

export function StorageBudgetSettings({ initial, after, receipt }: {
  initial: NonNullable<StorageState['budget']>;
  after(storage: StorageState): void;
  receipt(message: string): void;
}) {
  const [policy, setPolicy] = useState(initial.policy);
  const action = useAction(codedText(initial, 'error'));
  const [cacheRead, setCacheRead] = useState('');
  useEffect(() => {
    if (!policy?.enabled || initial.policy?.external_cache_path) return;
    const controller = new AbortController();
    setCacheRead(t('settings:storageLimits.readingCloudDrive'));
    void apiGet<{ path?: string; configured?: boolean }>('/api/configuration/storage/external-cache', controller.signal).then(result => {
      if (controller.signal.aborted) return;
      const path = result.path;
      if (!path) {
        setCacheRead(t('settings:storageLimits.cloudDriveMissing'));
        return;
      }
      setPolicy(current => current && !current.external_cache_path ? { ...current, external_cache_path: path } : current);
      setCacheRead(t('settings:storageLimits.cacheDetected'));
    }).catch(cause => {
      if (!controller.signal.aborted) setCacheRead(t('settings:storageLimits.cacheReadFailed', { error: errorMessage(cause) }));
    });
    return () => controller.abort();
  }, [policy?.enabled, initial.policy?.external_cache_path]);
  const update = <K extends keyof StoragePolicy>(key: K, value: StoragePolicy[K]) =>
    setPolicy(current => current ? { ...current, [key]: value } : current);
  const check = initial.last_check;
  if (!policy) return <Section title={t('settings:storageLimits.title')}><Stack><ErrorText>{action.error || t('settings:storageLimits.loadFailed')}</ErrorText></Stack></Section>;

  return <Section id="storageBudgetSettings" title={t('settings:storageLimits.title')} onSubmit={event => {
    event.preventDefault();
    void action.run('save', signal => apiSend<StorageState>('/api/configuration/storage/policy', policy, 'POST', signal),
      result => { setCacheRead(''); after(result); receipt(t('settings:storageLimits.saved')); });
  }}>
    <Rows>
      <SettingsRow label={t('settings:storageLimits.enable')} description={t('settings:storageLimits.enableHelp')}>
        <Switch aria-label={t('settings:storageLimits.enable')} isSelected={policy.enabled} isDisabled={Boolean(action.busy)}
          onChange={value => update('enabled', value)} />
      </SettingsRow>
      {policy.enabled ? <>
      {NUMBERS.map(([key, label, description]) => <SettingsRow key={key} label={label} description={description}>
        <ConfigurationInput aria-label={t('settings:storageLimits.limitGib', { label })} unit="GiB" inputMode="numeric" pattern="[0-9]*" size="small"
          className="w-32 shrink-0" placeholder={key === 'minimum_free_gib' ? t('settings:shared.auto') : t('settings:shared.noLimit')}
          value={policy[key] ? String(policy[key]) : ''} onChange={value => update(key, Number(value))}
          isDisabled={Boolean(action.busy)} />
      </SettingsRow>)}
      <SettingsRow label={t('settings:storageLimits.autoClean')} description={t('settings:storageLimits.autoCleanHelp')}>
        <Switch aria-label={t('settings:storageLimits.autoClean')} isSelected={policy.auto_clean} isDisabled={Boolean(action.busy)}
          onChange={value => update('auto_clean', value)} />
      </SettingsRow>
      </> : null}
    </Rows>
    {policy.enabled ? <Stack divided>
        <Input label={t('settings:storageLimits.externalCache')} hint={cacheRead || t('settings:storageLimits.externalCacheHelp')}
          value={policy.external_cache_path} size="small" className="w-full" placeholder={t('settings:shared.notSet')}
          onChange={value => update('external_cache_path', value)} isDisabled={Boolean(action.busy)} />
    </Stack> : null}
    {policy.enabled && policy.external_cache_path ? <Rows>
      <SettingsRow label={t('settings:storageLimits.externalCacheLimit')}
        description={t('settings:storageLimits.externalCacheLimitHelp')}>
        <ConfigurationInput aria-label={t('settings:storageLimits.externalCacheLimitGib')} unit="GiB" size="small" className="w-32 shrink-0" placeholder={t('settings:shared.noLimit')}
          inputMode="numeric" pattern="[0-9]*" value={policy.external_cache_max_gib ? String(policy.external_cache_max_gib) : ''}
          onChange={value => update('external_cache_max_gib', Number(value))} isDisabled={Boolean(action.busy)} />
      </SettingsRow>
    </Rows> : null}
    <Stack divided>
      {policy.enabled ? <Help>{t('settings:storageLimits.limitsHelp')}</Help> : null}
      {policy.enabled && check?.paused ? <ErrorText>{t('settings:storageLimits.pausedWithReasons', { reasons: reasonTexts(check).join(t('shell:format.semicolonSeparator')) })}</ErrorText> : null}
      {action.error ? <ErrorText>{action.error}</ErrorText> : null}
    </Stack>
    <Footer><Button type="submit" {...busyProps(action.busy === 'save')}>{t('settings:shared.saveSettings')}</Button></Footer>
  </Section>;
}
