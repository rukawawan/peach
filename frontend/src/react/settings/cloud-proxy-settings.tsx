/* CloudDrive 是代理配置的保存方；页面进入、重新聚焦和手动刷新时读取。 */
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Button } from '@/components/base/buttons/button';
import { Input } from '@/components/base/input/input';
import { Select, SelectItem } from '@/components/base/select/select';
import { Checkbox } from '@/components/base/checkbox/checkbox';
import { LinkButton } from '@/components/base/buttons/link-button';
import { apiGet, apiSend } from '../../api';
import { Note } from '../components/note';
import { Disclosure, FieldLabel, Footer, Help, Section, SectionSkeleton, Stack, SourceMark } from './section';
import { sourceMark } from './folder-rows';
import { busyProps, useAction } from './use-action';
import { CLOUD_PROXY_HELP, cloudProxySkeleton, rememberShape } from '../../configuration-skeleton';
import { joinList, t } from '../../i18n';

export const CLOUD_PROXIES_URL = '/api/configuration/cloud-proxies';
type Mode = 'direct' | 'system' | 'http' | 'socks5' | 'unknown';
interface ProxyValue {
  mode: Mode; host: string; port: number; username: string; password_set: boolean;
  password?: string; clear_password?: boolean;
}
interface Account {
  id: string; name: string; cloud: string; path: string; revision: string; writable: boolean;
  api: ProxyValue; data: ProxyValue;
  libraries?: Library[];
}
interface Library { name: string; root: string; location: string }
interface ProxyList { accounts: Account[]; unlinked?: Library[]; configured?: boolean }
const options = [['direct', t('settings:cloudProxy.direct')], ['system', t('settings:shared.followSystem')], ['http', t('settings:cloudProxy.http')], ['socks5', t('settings:cloudProxy.socks5')]] as const;

export function CloudProxySettings({ receipt }: { receipt(message: string): void }) {
  const [state, setState] = useState<ProxyList | null>(null);
  const [loading, setLoading] = useState(true);
  const dirty = useRef(new Set<string>());
  const saving = useRef(new Set<string>());
  const [writing, setWriting] = useState(false);
  const refreshRef = useRef<() => void>(() => undefined);
  const action = useAction();
  const refresh = () => { if (saving.current.size) return; void action.run('refresh', signal => apiGet<ProxyList>(CLOUD_PROXIES_URL, signal), result => {
    dirty.current.clear();
    setState(result);
    setLoading(false);
  }, cause => { setLoading(false); action.setError(cause instanceof Error ? cause.message : t('settings:cloudProxy.loadFailed')); }); };
  refreshRef.current = refresh;
  useEffect(() => {
    refreshRef.current();
    const focus = () => { if (!dirty.current.size) refreshRef.current(); };
    window.addEventListener('focus', focus);
    return () => window.removeEventListener('focus', focus);
  }, []);
  // 记下账号几个、哪一路走代理（走代理时多出地址、端口与认证），下次骨架照这个结构画。
  useEffect(() => {
    if (!state) return;
    const proxied = (value: ProxyValue) => value.mode === 'http' || value.mode === 'socks5';
    rememberShape('cloudProxy', { configured: state.configured !== false, unlinked: state.unlinked?.length ?? 0,
      accounts: state.accounts.map(account => [proxied(account.data), proxied(account.api)]) });
  }, [state]);
  if (loading) return <SectionSkeleton label={t('settings:cloudProxy.loading')} html={cloudProxySkeleton} />;
  return <Section guide="cloud-proxy" title={t('settings:cloudProxy.title')}>
    <Stack>
      <Help>{CLOUD_PROXY_HELP}</Help>
      <div className="flex min-w-0 flex-col gap-4">
      {action.error ? <Note tone="error" title={t('settings:cloudProxy.readFailedTitle')}>{action.error} <LinkButton href="/settings/downloads" size="small">{t('settings:cloudProxy.downloadSettingsLink')}</LinkButton></Note> : null}
      {state?.configured === false ? <Help>{t('settings:cloudProxy.notConfigured')} <LinkButton href="/settings/downloads" size="small">{t('settings:cloudProxy.downloadSettingsLink')}</LinkButton></Help>
        : state?.accounts.length === 0 && !state.unlinked?.length ? <Help>{t('settings:cloudProxy.noLibraries')}</Help> : null}
      {state?.unlinked?.map(library => <div key={library.root} className="flex min-w-0 flex-col gap-1">
        <FieldLabel><span className="inline-flex items-center gap-2"><SourceMark mark={sourceMark(library.location)} />{library.name}</span></FieldLabel>
        <Help>{t('settings:cloudProxy.unmatched')}</Help>
      </div>)}
      {state?.accounts.map(account => <ProxyAccount key={account.id + account.revision} initial={account} receipt={receipt}
        onDirty={() => dirty.current.add(account.id)} onSaving={pending => {
          if (pending) saving.current.add(account.id); else saving.current.delete(account.id);
          setWriting(Boolean(saving.current.size));
        }}
        onSaved={next => { dirty.current.delete(next.id); setState(current => current ? { ...current, accounts: current.accounts.map(row => row.id === next.id ? next : row) } : current); }} />)}
      </div>
    </Stack>
    <Footer><Button variant="secondary" disabled={writing} onClick={refresh} {...busyProps(action.busy === 'refresh')}>{t('settings:shared.reload')}</Button></Footer>
  </Section>;
}

function ProxyAccount({ initial, receipt, onDirty, onSaved, onSaving }: {
  initial: Account; receipt(message: string): void; onDirty(): void; onSaved(account: Account): void; onSaving(saving: boolean): void;
}) {
  const [account, setAccount] = useState(initial);
  const [changed, setChanged] = useState<string[]>([]);
  const name = joinList(account.libraries?.map(library => library.name) ?? []) || account.name;
  const action = useAction();
  const edit = (key: 'api' | 'data', value: ProxyValue) => {
    setAccount(current => ({ ...current, [key]: value }));
    setChanged(current => current.includes(key) ? current : [...current, key]);
    onDirty();
  };
  const submit = (event: FormEvent) => {
    event.preventDefault();
    onSaving(true);
    void action.run('save', signal => apiSend<Account>(CLOUD_PROXIES_URL, {
      id: account.id, revision: account.revision,
      ...(changed.includes('api') ? { api: account.api } : {}),
      ...(changed.includes('data') ? { data: account.data } : {}),
    }, 'POST', signal), result => {
      setAccount(result); setChanged([]); onSaved(result); receipt(t('settings:cloudProxy.saved'));
    }).finally(() => onSaving(false));
  };
  return <form aria-label={t('settings:cloudProxy.accountForm', { name })} onSubmit={submit} className="flex min-w-0 flex-col gap-4 border-t border-separator-border pt-4">
    <FieldLabel><span className="inline-flex items-center gap-2"><SourceMark mark={sourceMark(account.libraries?.[0]?.location || (account.cloud === '115open' ? '115' : account.cloud.toLowerCase()))} />{name}</span></FieldLabel>
    <Help>{account.name} · {account.path}</Help>
    <ProxyEditor label={t('settings:cloudProxy.dataProxy')} value={account.data} disabled={!account.writable || Boolean(action.busy)} onChange={value => edit('data', value)} />
    <ProxyEditor label={t('settings:cloudProxy.apiProxy')} value={account.api} disabled={!account.writable || Boolean(action.busy)} onChange={value => edit('api', value)} />
    {!account.writable ? <Help>{t('settings:cloudProxy.needsWritePermission')}</Help> : null}
    {action.error ? <Note tone="error" title={t('settings:shared.notSaved')}>{action.error}</Note> : null}
    <div className="flex justify-end"><Button type="submit" disabled={!account.writable || !changed.length} {...busyProps(action.busy === 'save')}>{t('settings:shared.saveSettings')}</Button></div>
  </form>;
}

function ProxyEditor({ label, value, disabled, onChange }: {
  label: string; value: ProxyValue; disabled: boolean; onChange(value: ProxyValue): void;
}) {
  const proxy = value.mode === 'http' || value.mode === 'socks5';
  return <div className="flex min-w-0 flex-col gap-3">
    <FieldLabel>{label}</FieldLabel>
    <Select aria-label={label} selectedKey={value.mode} isDisabled={disabled}
      onSelectionChange={key => { if (key) onChange({ ...value, mode: String(key) as Mode }); }}>
      {value.mode === 'unknown' ? <SelectItem id="unknown">{t('settings:cloudProxy.unknownType')}</SelectItem> : null}
      {options.map(([id, name]) => <SelectItem key={id} id={id}>{name}</SelectItem>)}
    </Select>
    {proxy ? <>
      <div className="flex flex-wrap gap-3">
        <Input className="min-w-40 flex-1" label={t('settings:cloudProxy.host', { label })} value={value.host} autoComplete="off" isDisabled={disabled}
          onChange={host => onChange({ ...value, host })} />
        <Input className="w-full sm:w-28" label={t('settings:cloudProxy.port', { label })} value={value.port ? String(value.port) : ''} inputMode="numeric" isDisabled={disabled}
          onChange={port => onChange({ ...value, port: Number(port) })} />
      </div>
      <Disclosure summary={t('settings:cloudProxy.authentication')}>
        <Input label={t('settings:cloudProxy.username', { label })} value={value.username} autoComplete="off" isDisabled={disabled} onChange={username => onChange({ ...value, username })} />
        <Input label={t('settings:cloudProxy.password', { label })} type="password" value={value.password || ''} autoComplete="new-password" isDisabled={disabled}
          placeholder={value.password_set ? t('settings:shared.savedLeaveBlank') : t('settings:shared.optional')} onChange={password => onChange({ ...value, password })} />
        {value.password_set ? <Checkbox isSelected={Boolean(value.clear_password)} isDisabled={disabled}
          onChange={clear_password => onChange({ ...value, clear_password })}>{t('settings:cloudProxy.clearPassword')}</Checkbox> : null}
      </Disclosure>
    </> : null}
  </div>;
}
