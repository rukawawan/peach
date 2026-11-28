import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Textarea } from '@/components/base/textarea/textarea';
import { apiGet, apiSend, errorMessage } from '../../api';
import { interfaceLanguage, t } from '../../i18n';
import { ErrorText, Help, Stack } from './section';

const URL = '/api/ai-library/prompts?lang=' + interfaceLanguage;
const QUERY = ['ai-library-prompts', interfaceLanguage];
export const promptCopy = (key: string) => t('settings:aiLibrary.prompts.' + key);
export const AI_PROMPT_SCOPES = ['system', 'translate', 'tags', 'vision', 'timeline', 'official', 'search', 'metadata', 'organize'] as const;
export type AIPromptScope = typeof AI_PROMPT_SCOPES[number];
type PromptSettings = { defaults: Record<string, string>; overrides: Partial<Record<string, string>>; limit: number };

export function useAIPromptSettings(scope: AIPromptScope, active: boolean) {
  const client = useQueryClient();
  const query = useQuery({ queryKey: QUERY, queryFn: ({ signal }) => apiGet<PromptSettings>(URL, signal), enabled: active });
  const [drafts, setDrafts] = useState<Partial<Record<AIPromptScope, string>>>({});
  const base = query.data?.defaults[scope] ?? '';
  const override = query.data?.overrides[scope];
  const persisted = override ?? base;
  const value = drafts[scope] ?? persisted;
  const dirty = Boolean(query.data) && (value.trim() || base) !== persisted;
  const save = async (signal: AbortSignal, reset = false) => {
    const next = await apiSend<PromptSettings>(URL, { scope, text: reset ? '' : value }, 'POST', signal);
    client.setQueryData(QUERY, next);
    setDrafts(current => ({ ...current, [scope]: undefined }));
  };
  return { value, dirty, save, limit: query.data?.limit, error: query.error, resettable: Boolean(override) || dirty,
    onChange: (text: string) => setDrafts(current => ({ ...current, [scope]: text })) };
}

export function AIPromptEditor({ scope, prompt, busy, divided }: {
  scope: AIPromptScope; prompt: ReturnType<typeof useAIPromptSettings>; busy: boolean; divided: boolean;
}) {
  return <Stack divided={divided}>
    {scope === 'system' ? <Help><span data-copy-key="settings.aiLibrary.prompts.help">{promptCopy('help')}</span></Help> : null}
    {prompt.limit === undefined ? prompt.error ? <ErrorText>{errorMessage(prompt.error)}</ErrorText>
      : <Help role="status">{promptCopy('loading')}</Help> : <>
      <Help><span data-copy-key={'settings.aiLibrary.prompts.descriptions.' + scope}>{promptCopy('descriptions.' + scope)}</span></Help>
      <Textarea label={promptCopy('scopes.' + scope)} value={prompt.value} onChange={prompt.onChange} isDisabled={busy}
        rows={8} maxLength={prompt.limit} showCount resize="vertical" />
    </>}
  </Stack>;
}
