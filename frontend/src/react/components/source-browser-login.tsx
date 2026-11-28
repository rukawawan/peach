import { useEffect } from 'react';
import { useMutation, useQuery, type QueryKey } from '@tanstack/react-query';
import { Button } from '@/components/base/buttons/button';
import { apiGet, apiSend, errorMessage } from '../../api';
import { jobText } from '../../core/server-text';
import { t } from '../../i18n';
import { queryClient } from '../query';
import { busyProps } from '../settings/use-action';
import { Note } from './note';

interface BrowserLoginState {
  available: boolean;
  state: 'idle' | 'waiting' | 'done' | 'cancelled' | 'timeout' | 'failed';
  message?: string;
  message_code?: string;
  message_params?: Record<string, unknown>;
}

export function sourceBrowserLoginUrl(source: string) {
  return `/api/source-browser-login/${encodeURIComponent(source)}`;
}

export function useSourceBrowserLogin(url: string, enabled: boolean, refresh: readonly QueryKey[]) {
  const key = ['source-browser-login', url] as const;
  const status = useQuery({
    queryKey: key,
    queryFn: ({ signal }) => apiGet<BrowserLoginState>(url, signal),
    enabled,
    staleTime: 0,
    refetchInterval: query => query.state.data?.state === 'waiting' ? 2000 : false,
  });
  const command = useMutation({
    mutationFn: (cancel: boolean) => apiSend<BrowserLoginState>(cancel ? `${url}/cancel` : url, {}),
    onSuccess: async next => {
      await queryClient.cancelQueries({ queryKey: key, exact: true });
      queryClient.setQueryData(key, next);
    },
  });
  const data = enabled ? status.data : undefined;
  const waiting = data?.state === 'waiting';
  useEffect(() => {
    if (data?.state !== 'done') return;
    for (const queryKey of refresh) void queryClient.invalidateQueries({ queryKey, exact: true });
  }, [data?.state, refresh]);
  return {
    data, waiting,
    busy: command.isPending || waiting,
    pending: command.isPending,
    error: command.error ? errorMessage(command.error) : '',
    send: command.mutate,
  };
}

type BrowserLogin = ReturnType<typeof useSourceBrowserLogin>;

export function SourceBrowserLoginButton({ login, disabled, onStart }: {
  login: BrowserLogin; disabled?: boolean; onStart?(): void;
}) {
  if (!login.data?.available) return null;
  return login.waiting
    ? <Button type="button" variant="secondary" {...busyProps(login.pending)}
        onClick={() => { if (!login.pending) login.send(true); }}>{t('settings:shared.cancel')}</Button>
    : <Button type="button" variant="secondary" {...busyProps(login.pending || Boolean(disabled))}
        onClick={() => {
          if (login.pending || disabled) return;
          onStart?.();
          login.send(false);
        }}>{t('manage:sourceSettings.browserSignIn')}</Button>;
}

export function SourceBrowserLoginStatus({ login, saved }: { login: BrowserLogin; saved: boolean }) {
  const status = login.data;
  if (!status || status.state === 'idle' || (status.state === 'done' && !saved)) return null;
  const tone = status.state === 'done' ? 'success' : status.state === 'waiting' ? 'info'
    : status.state === 'failed' || status.state === 'timeout' ? 'warning' : 'neutral';
  return <Note tone={tone}>{jobText(status)}</Note>;
}
