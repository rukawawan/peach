import { useRef, useState, type CSSProperties } from 'react';
import { Popover } from 'react-aria-components';
import { RiBarChartLine, RiRestartLine } from '@remixicon/react';
import { MEDIA_SOURCE_ICONS } from '@peach/legacy/ui';
import { Button } from '@/components/base/buttons/button';
import { MENU_POPOVER_SURFACE } from '@/components/base/dropdown/menu-styles';
import { Select, SelectItem } from '@/components/base/select/select';
import { cx } from '@/utils/cx';
import { t } from '../../i18n';
import type { LibraryRow } from '../../library-catalog';
import { AIProviderLogo } from '../components/ai-provider-logo';
import { LibraryLabel } from '../components/library-label';
import { MenuDialog } from '../components/menu-dialog';
import { ACCOUNT_DASHBOARDS, useAccountUsage } from '../settings/ai-account-usage';
import { Disclosure, ExternalLink, Help, SourceMark } from '../settings/section';
import { assistantCopy as copy } from './assistant-workspace';

export type TokenUsage = { input_tokens: number; output_tokens: number };
export type ConversationUsage = TokenUsage & { requests: number; measured: number };
export const EMPTY_USAGE: ConversationUsage = { requests: 0, measured: 0, input_tokens: 0, output_tokens: 0 };

export function DemoStatus() {
  return <span className="text-caption-1-regular text-text-secondary"
    data-copy-key="catalog.libraryAssistant.demoMode">{copy('demoMode')}</span>;
}

export function DemoReplayButton({ onReplay }: { onReplay(): void }) {
  return <Button type="button" size="xs" variant="ghost" leadingIcon={RiRestartLine}
    data-ai-button="footer" data-copy-interact="" onClick={event => { if (!event.altKey) onReplay(); }}>
    <span data-copy-key="catalog.libraryAssistant.replayDemo">{copy('replayDemo')}</span>
  </Button>;
}

export function SearchLibraryPicker({ libraries, library, disabled, change }: {
  libraries: readonly LibraryRow[] | null; library: string; disabled: boolean; change(id: string): void;
}) {
  const all = t('shell:libraryPicker.allLibraries');
  const selected = libraries?.find(row => row.id === library);
  const label = (row?: LibraryRow) => row
    ? <LibraryLabel library={{ id: row.id, name: row.name, icon: MEDIA_SOURCE_ICONS[row.icon || ''] || row.icon || 'database' }} />
    : <span className="flex min-w-0 items-center gap-2">
      <SourceMark mark="database" />
      <span className="truncate" data-copy-key="shell.libraryPicker.allLibraries">{all}</span>
    </span>;
  return <div data-ai-library-picker="" className="min-w-0 assistant-library-width">
    <Select aria-label={t('shell:shared.library')} size="sm"
    selectedKey={selected?.id || '*'} isDisabled={disabled}
    onSelectionChange={key => { if (key !== null) change(key === '*' ? '' : String(key)); }}
    renderValue={label(selected)}>
    <SelectItem id="*" textValue={all}>{label()}</SelectItem>
    {libraries?.map(row => <SelectItem key={row.id} id={row.id} textValue={row.name}>{label(row)}</SelectItem>)}
    </Select>
  </div>;
}

export function ConversationUsagePopover({ usage, demo = false, pending = false, provider }: {
  usage: ConversationUsage; demo?: boolean; pending?: boolean; provider?: string;
}) {
  const trigger = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const changeOpen = (next: boolean) => {
    setOpen(next);
    if (!next) setAccountOpen(false);
  };
  const label = copy('usage');
  const numbers = new Intl.NumberFormat();
  const percentages = new Intl.NumberFormat(undefined, { style: 'percent', maximumFractionDigits: 1 });
  const total = usage.input_tokens + usage.output_tokens;
  const segments = [
    { key: 'usageInput', tokens: usage.input_tokens, color: 'bg-chart-4' },
    { key: 'usageOutput', tokens: usage.output_tokens, color: 'bg-chart-5' },
  ];
  const status = !usage.requests ? 'noUsage'
    : pending ? 'usagePending'
    : usage.measured < usage.requests ? 'usageIncomplete' : null;
  return <>
    <Button ref={trigger} type="button" size="xs" variant="ghost" leadingIcon={RiBarChartLine}
      data-ai-button="footer" aria-haspopup="dialog" aria-expanded={open} onClick={() => changeOpen(!open)}>
      <span data-copy-key="catalog.libraryAssistant.usage">{label}</span>
    </Button>
    <Popover triggerRef={trigger} isOpen={open} onOpenChange={changeOpen} placement="top end" offset={8}
      className={cx(MENU_POPOVER_SURFACE, 'w-72 p-3.5')}>
      <MenuDialog aria-label={label} data-copy-choice-host="" className="flex min-w-0 flex-col gap-3 outline-none">
        <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
          <p className="text-body-2-medium text-text-primary" data-copy-key="catalog.libraryAssistant.conversationUsage">{copy('conversationUsage')}</p>
          {usage.requests ? <dl className="flex items-baseline gap-1 rounded-full bg-background-tertiary-default px-2 py-0.5 text-caption-1-regular text-text-secondary">
            <dt data-copy-key="catalog.libraryAssistant.usageRequests">{copy('usageRequests')}</dt>
            <dd className="text-text-primary tabular-nums">{numbers.format(usage.requests)}</dd>
          </dl> : null}
        </div>
        {usage.measured ? <>
          <dl>
            <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
              <dt className="text-caption-1-regular text-text-secondary" data-copy-key="catalog.libraryAssistant.usageTotal">{copy('usageTotal')}</dt>
              <dd className="order-first text-title-1-medium text-text-primary tabular-nums">{numbers.format(total)}</dd>
            </div>
          </dl>
          <div aria-hidden="true" data-conversation-token-bar="" className="flex h-2.5 gap-0.5 overflow-hidden rounded-full bg-background-tertiary-default">
            {segments.filter(segment => segment.tokens > 0).map(segment => <span key={segment.key}
              className={cx('min-w-0 basis-0', segment.color)} style={{ '--conversation-token-weight': segment.tokens } as CSSProperties} />)}
          </div>
          <dl className="inline-grid w-full grid-cols-2 gap-3">
            {segments.map(segment => <div key={segment.key} className="flex min-w-0 flex-col gap-0.5">
              <dt className="flex min-w-0 items-center gap-1.5 text-caption-1-regular text-text-secondary">
                <span className={cx('size-2 shrink-0 rounded-full', segment.color)} aria-hidden="true" />
                <span data-copy-key={'catalog.libraryAssistant.' + segment.key}>{copy(segment.key)}</span>
              </dt>
              <dd className="flex flex-wrap items-baseline gap-x-1.5 text-body-2-medium text-text-primary tabular-nums">
                {numbers.format(segment.tokens)}
                {total > 0 ? <span className="text-caption-1-regular text-text-secondary">{percentages.format(segment.tokens / total)}</span> : null}
              </dd>
            </div>)}
          </dl>
        </> : null}
        {status ? <p className="text-caption-1-regular text-text-secondary" data-copy-key={'catalog.libraryAssistant.' + status}>{copy(status)}</p> : null}
        {usage.requests > 0 ? <Disclosure summary={
          <span data-copy-key="catalog.libraryAssistant.usageDetail">{copy('usageDetail')}</span>
        }>
          <p className="text-caption-1-regular text-text-secondary" data-copy-key="catalog.libraryAssistant.usageMeasured">
            {t('catalog:libraryAssistant.usageMeasured', { measured: numbers.format(usage.measured), requests: numbers.format(usage.requests) })}
          </p>
        </Disclosure> : null}
        {!demo && provider && ACCOUNT_DASHBOARDS[provider] ? <div className="border-t border-separator-border pt-2">
          <Disclosure onOpenChange={setAccountOpen} summary={<>
            <AIProviderLogo provider={provider} />
            <span data-copy-key="catalog.libraryAssistant.usageAccount">{copy('usageAccount')}</span>
          </>}>
            <ConversationAccountUsage provider={provider} enabled={open && accountOpen} format={numbers.format} />
          </Disclosure>
        </div> : null}
        {demo ? <p className="border-t border-separator-border pt-2 text-caption-1-regular text-text-secondary"
          data-copy-key="catalog.libraryAssistant.demoUsage">{copy('demoUsage')}</p> : null}
      </MenuDialog>
    </Popover>
  </>;
}

function ConversationAccountUsage({ provider, enabled, format }: { provider: string; enabled: boolean; format(value: number): string }) {
  const days = 30;
  const { organization, balance, note } = useAccountUsage(provider, days, enabled);
  const namespace = 'settings:aiLibrary.usage.';
  return <>
    {organization !== null || balance ? <div className="flex flex-col gap-1 text-caption-1-regular text-text-secondary">
      <span>{t(namespace + (balance ? 'balance' : 'organizationUsed'))}
        {balance ? null : ' · ' + t(namespace + 'rangeDays', { days })}</span>
      <strong className="text-body-2-medium text-text-primary">
        {organization !== null ? t(namespace + 'tokens', { count: format(organization) }) : balance}
      </strong>
    </div> : null}
    {note !== 'organizationHelp' && note !== 'balanceHelp' ? <Help>
      {t(namespace + note, { key: provider === 'openai' ? 'OPENAI_ADMIN_KEY' : 'ANTHROPIC_ADMIN_KEY' })}
    </Help> : null}
    <ExternalLink href={ACCOUNT_DASHBOARDS[provider]}>{t(namespace + (provider === 'openai-oauth' ? 'planLink' : 'accountDashboard'))}</ExternalLink>
  </>;
}
