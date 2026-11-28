import { RiClaudeFill, RiDeepseekFill, RiOpenaiFill, RiServerLine } from '@remixicon/react';
import { cx } from '@/utils/cx';

const LOGOS: Partial<Record<string, typeof RiOpenaiFill>> = {
  anthropic: RiClaudeFill,
  openai: RiOpenaiFill,
  'openai-oauth': RiOpenaiFill,
  deepseek: RiDeepseekFill,
};

export function AIProviderLogo({ provider, className }: { provider: string; className?: string }) {
  const Icon = LOGOS[provider] ?? (provider.startsWith('custom-') || provider === 'custom' ? RiServerLine : undefined);
  return Icon ? <Icon aria-hidden="true" data-ai-provider-logo={provider} className={cx('size-4 shrink-0', className)} /> : null;
}

export function AIProviderLabel({ provider, label }: { provider: string; label: string }) {
  return <span className="flex min-w-0 items-center gap-2">
    <AIProviderLogo provider={provider} />
    <span className="min-w-0 wrap-anywhere">{label}</span>
  </span>;
}
