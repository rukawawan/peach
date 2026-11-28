import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { EvilBarChart } from '@/registry/charts/recharts-bar-chart';
import { Select, SelectItem } from '@/components/base/select/select';
import { apiGet, errorMessage } from '../../api';
import { interfaceLanguage, t } from '../../i18n';
import { CHART_COLORS, tone } from '../charts/chart-card';
import { ChartTip } from '../charts/chart-tip';
import { AIProviderLabel } from '../components/ai-provider-logo';
import { ErrorText, ExternalLink, Help, Rows, Stack } from './section';
import { aiModelLabel } from './use-ai-models';
import { ACCOUNT_DASHBOARDS, useAccountUsage } from './ai-account-usage';
import { SettingsRow } from '@/components/application/settings/settings-rows';

const copy = (key: string, values: Record<string, unknown> = {}) => t('settings:aiLibrary.usage.' + key, values);
const number = new Intl.NumberFormat(interfaceLanguage);
const dayFormat = new Intl.DateTimeFormat(interfaceLanguage, { month: 'short', day: 'numeric', timeZone: 'UTC' });
const tokens = (value: number) => copy('tokens', { count: number.format(value) });

type Counts = { requests: number; measured: number; input_tokens: number | null; output_tokens: number | null };
type UsageRow = Counts & { provider: string; model: string; task: string };
type DayRow = Counts & { day: string; provider: string };
type Usage = { start: string; end: string; rows: UsageRow[]; daily: DayRow[] };
type Provider = { id: string; label: string; configured: boolean };

function UsageServicePicker({ label, providers, value, onChange, all = false }: {
  label: string; providers: Provider[]; value: string | undefined; onChange(value: string): void; all?: boolean;
}) {
  return <Select size="sm" aria-label={label} selectedKey={value}
    onSelectionChange={key => { if (key !== null) onChange(String(key)); }}>
    {all ? <SelectItem id="all">{copy('allServices')}</SelectItem> : null}
    {providers.map(provider => <SelectItem key={provider.id} id={provider.id} textValue={provider.label}>
      <AIProviderLabel provider={provider.id} label={provider.label} />
    </SelectItem>)}
  </Select>;
}

function totals(rows: Counts[]) {
  return rows.reduce((sum, row) => ({
    requests: sum.requests + row.requests, measured: sum.measured + row.measured,
    input: sum.input + (row.input_tokens ?? 0), output: sum.output + (row.output_tokens ?? 0),
  }), { requests: 0, measured: 0, input: 0, output: 0 });
}

function series(usage: Usage, scope: string) {
  const grouped = new Map<string, DayRow[]>();
  for (const row of usage.daily) {
    if (scope !== 'all' && row.provider !== scope) continue;
    const entries = grouped.get(row.day) ?? [];
    entries.push(row);
    grouped.set(row.day, entries);
  }
  const days = [];
  const end = Date.parse(usage.end);
  for (let day = Date.parse(usage.start); day <= end; day += 86_400_000) {
    const sum = totals(grouped.get(new Date(day).toISOString().slice(0, 10)) ?? []);
    days.push({ day: dayFormat.format(day), ...sum });
  }
  return days;
}

export function AIUsageDashboard({ active, providers }: { active: boolean; providers: Provider[] }) {
  const [days, setDays] = useState(30);
  const [scope, setScope] = useState('all');
  const [metric, setMetric] = useState('tokens');
  const [accountSelection, setAccountSelection] = useState<string>();
  const query = useQuery({
    queryKey: ['ai-library-usage', days],
    queryFn: ({ signal }) => apiGet<Usage>('/api/ai-library/usage?days=' + days, signal),
    enabled: active,
  });
  const usage = query.data;
  const accountProvider = providers.find(row => row.id === accountSelection)?.id
    ?? providers.find(row => row.configured)?.id
    ?? providers.find(row => usage?.rows.some(item => item.provider === row.id))?.id
    ?? providers[0]?.id;
  const byProvider = new Map(providers.map(provider => [provider.id, provider.label]));
  const selected = usage?.rows.filter(row => scope === 'all' || row.provider === scope) ?? [];
  const accountRows = usage?.rows.filter(row => row.provider === accountProvider) ?? [];
  const total = totals(selected);
  const history = usage ? series(usage, scope) : [];
  const requestConfig = { requests: { label: copy('requestSeries'), colors: tone(CHART_COLORS[0]) } };
  const tokenConfig = { input: { label: copy('input'), colors: tone(CHART_COLORS[0]) },
    output: { label: copy('output'), colors: tone(CHART_COLORS[1]) } };
  const config = metric === 'requests' ? requestConfig : tokenConfig;
  return <>
    <Stack>
      <div className="flex min-w-0 flex-wrap items-center gap-2">
        <Select size="sm" aria-label={copy('range')} selectedKey={String(days)}
          onSelectionChange={key => { if (key) setDays(Number(key)); }}>
          {[7, 30, 90].map(value => <SelectItem key={value} id={String(value)}>{copy('rangeDays', { days: value })}</SelectItem>)}
        </Select>
        <UsageServicePicker label={copy('service')} providers={providers} value={scope} onChange={setScope} all />
        <Select size="sm" aria-label={copy('metric')} selectedKey={metric}
          onSelectionChange={key => { if (key) setMetric(String(key)); }}>
          <SelectItem id="tokens">Token</SelectItem>
          <SelectItem id="requests">{copy('requestSeries')}</SelectItem>
        </Select>
      </div>
      {query.isError ? <ErrorText>{errorMessage(query.error)}</ErrorText> : !usage ? <Help role="status">{copy('loading')}</Help> : <>
        <dl className="inline-grid w-full grid-cols-2 gap-2 @min-[34rem]:grid-cols-3">
          <UsageStat label="peach" value={total.requests && !total.measured ? copy('unreported') : tokens(total.input + total.output)} />
          <UsageStat label="requestSeries" value={number.format(total.requests)} />
          <UsageStat label="meteredRequests" value={number.format(total.measured) + ' / ' + number.format(total.requests)} />
        </dl>
        <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
          <h3 className="text-body-medium text-text-primary" data-copy-key="settings.aiLibrary.usage.history">{copy('history')}</h3>
          <Help>{usage.start} – {usage.end}</Help>
        </div>
        <div className="relative min-w-0 rounded-xl bg-background-primary-default px-2 pt-2 sm:px-3" data-ai-usage-history="">
          <EvilBarChart data={history} config={config} stackType="stacked" barRadius={3}
            className="aspect-auto h-48 min-w-0 flex-none text-text-secondary">
            <EvilBarChart.Grid />
            <EvilBarChart.XAxis dataKey="day" minTickGap={24} />
            <EvilBarChart.YAxis hide domain={[0, Math.max(1, ...history.map(day => metric === 'requests' ? day.requests : day.input + day.output))]} />
            {metric === 'requests' ? <EvilBarChart.Bar dataKey="requests" /> : <>
              <EvilBarChart.Bar dataKey="input" /><EvilBarChart.Bar dataKey="output" />
            </>}
            <EvilBarChart.Legend />
            {total.requests && (metric === 'requests' || total.measured) ? <ChartTip format={number.format} /> : null}
          </EvilBarChart>
          {!total.requests || (metric === 'tokens' && !total.measured) ? <p
            className="pointer-events-none absolute inset-x-2 top-1/3 text-center text-body-2-regular text-text-secondary"
            data-copy-key={'settings.aiLibrary.usage.' + (total.requests ? 'unreported' : 'empty')}>
            {copy(total.requests ? 'unreported' : 'empty')}
          </p> : null}
        </div>
        {total.requests > total.measured && metric === 'tokens'
          ? <Help>{copy('missing', { count: number.format(total.requests - total.measured) })}</Help> : null}
        <div className="flex flex-col gap-3 border-t border-separator-border pt-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-body-medium text-text-primary" data-copy-key="settings.aiLibrary.usage.compare">{copy('compare')}</h3>
            {providers.length ? <UsageServicePicker label={copy('accountService')} providers={providers}
              value={accountProvider} onChange={setAccountSelection} /> : null}
          </div>
          {accountProvider ? <AccountComparison provider={accountProvider} days={days} active={active} usage={totals(accountRows)} /> : null}
        </div>
      </>}
    </Stack>
    {selected.length ? <Rows>{selected.map(row => <SettingsRow key={JSON.stringify([row.provider, row.model, row.task])}
      label={t('catalog:aiLibrary.' + row.task)} description={(byProvider.get(row.provider) ?? row.provider) + ' · ' + aiModelLabel(row.model)}>
      <div className="max-w-1/2 text-right text-body-2-regular text-text-secondary tabular-nums">
        <p className="text-text-primary">{row.measured ? tokens((row.input_tokens ?? 0) + (row.output_tokens ?? 0)) : copy('unreported')}</p>
        <p>{copy('requests', { count: number.format(row.requests) })}</p>
      </div>
    </SettingsRow>)}</Rows> : null}
  </>;
}

function UsageStat({ label, value }: { label: string; value: string }) {
  return <div className="flex min-w-0 flex-col gap-1 rounded-xl bg-background-primary-default p-3">
    <dt className="text-caption-1-regular text-text-secondary" data-copy-key={'settings.aiLibrary.usage.' + label}>{copy(label)}</dt>
    <dd className="text-title-2-medium text-text-primary tabular-nums wrap-anywhere">{value}</dd>
  </div>;
}

function AccountComparison({ provider, days, active, usage }: {
  provider: string; days: number; active: boolean; usage: ReturnType<typeof totals>;
}) {
  const peach = usage.input + usage.output;
  const known = !usage.requests || usage.measured > 0;
  const { organization, balance, note } = useAccountUsage(provider, days, active);
  const comparison = organization !== null && known;
  const config = { peach: { label: copy('peach'), colors: tone(CHART_COLORS[0]) },
    organization: { label: copy('organizationUsed'), colors: tone(CHART_COLORS[1]) } };
  const accountLabel = provider === 'deepseek' ? 'balance' : provider === 'openai-oauth' ? 'subscription' : 'organizationUsed';
  return <div className="flex min-w-0 flex-col gap-3" data-ai-account-usage="">
    <dl className="inline-grid w-full grid-cols-2 gap-2">
      <UsageStat label="peach" value={known ? tokens(peach) : copy('unreported')} />
      <UsageStat label={accountLabel} value={organization !== null ? tokens(organization) : balance || copy('accountUnknown')} />
    </dl>
    {comparison ? <EvilBarChart data={[{ range: copy('rangeDays', { days }), peach, organization }]}
      config={config} layout="horizontal" barRadius={3} className="aspect-auto h-20 min-w-0 flex-none">
      <EvilBarChart.YAxis dataKey="range" hide />
      <EvilBarChart.XAxis hide domain={[0, Math.max(1, peach, organization)]} />
      <EvilBarChart.Bar dataKey="peach" /><EvilBarChart.Bar dataKey="organization" />
      <EvilBarChart.Legend />
      <ChartTip hideLabel format={tokens} />
    </EvilBarChart> : null}
    <Help><span data-copy-key={'settings.aiLibrary.usage.' + note}>
      {copy(note, { key: provider === 'openai' ? 'OPENAI_ADMIN_KEY' : 'ANTHROPIC_ADMIN_KEY' })}
    </span></Help>
    {ACCOUNT_DASHBOARDS[provider] ? <div><ExternalLink href={ACCOUNT_DASHBOARDS[provider]}>
      {copy(provider === 'openai-oauth' ? 'planLink' : 'accountDashboard')}
    </ExternalLink></div> : null}
  </div>;
}
