import { useQuery } from '@tanstack/react-query';
import { apiGet } from '../../api';
import { interfaceLanguage } from '../../i18n';

export const ACCOUNT_DASHBOARDS: Record<string, string> = {
  'openai': 'https://platform.openai.com/usage',
  'openai-oauth': 'https://chatgpt.com/settings/usage',
  'anthropic': 'https://platform.claude.com/usage',
  'deepseek': 'https://platform.deepseek.com/usage',
};

type AccountUsage = { kind: 'organization'; tokens: number }
  | { kind: 'balance'; balances: { amount: string; currency: string }[] }
  | { kind: 'admin_required' | 'unconfigured' | 'subscription' | 'denied' | 'unavailable' | 'custom' };

const notes = {
  organization: 'organizationHelp', balance: 'balanceHelp', admin_required: 'adminKeyRequired',
  unconfigured: 'accountDisconnected', subscription: 'subscriptionHelp', denied: 'accountDenied', unavailable: 'accountFailed',
  custom: 'accountCustom',
} as const;

export function useAccountUsage(provider: string, days: number, enabled: boolean) {
  const query = useQuery({
    queryKey: ['ai-library-account-usage', provider, provider === 'deepseek' ? null : days],
    queryFn: ({ signal }) => apiGet<AccountUsage>('/api/ai-library/account-usage?' + new URLSearchParams({ provider, days: String(days) }), signal),
    enabled: enabled && Boolean(provider),
    retry: false,
    staleTime: 60_000,
  });
  const data = query.data;
  return {
    organization: data?.kind === 'organization' ? data.tokens : null,
    balance: data?.kind === 'balance' ? data.balances.map(row =>
      new Intl.NumberFormat(interfaceLanguage, { style: 'currency', currency: row.currency, maximumFractionDigits: 8 }).format(Number(row.amount))).join(' · ') : '',
    note: data ? notes[data.kind] : query.isError ? 'accountFailed' : 'accountLoading',
  };
}
