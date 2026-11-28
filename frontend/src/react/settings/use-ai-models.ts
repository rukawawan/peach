import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiGet, apiSend, errorMessage } from '../../api';

export const AI_ASSET_TASKS = ['translate', 'tags', 'vision'] as const;
export const AI_LIBRARY_TASKS = [...AI_ASSET_TASKS, 'search'] as const;
export type AITask = typeof AI_LIBRARY_TASKS[number];
export type AIEffort = 'default' | 'none' | 'low' | 'medium' | 'high' | 'xhigh' | 'max';
export interface ModelChoices { efforts: AIEffort[]; default_efforts: Record<AITask, AIEffort>; effort_reported?: boolean }
export interface AIModel extends ModelChoices { id: string; label: string; vision?: boolean }
export interface AIModelCatalog { models: AIModel[]; loading: boolean; error: string }
export interface AIApiTarget { base_url: string; port: string; protocol?: 'openai' | 'anthropic' }
export const aiSearchModelsKey = (provider: string) => ['ai-search-models', provider];

export function useAIConnectionModels(provider: string, enabled = true) {
  return useQuery({
    queryKey: aiSearchModelsKey(provider),
    queryFn: ({ signal }) => apiGet<{ models: AIModel[] }>(
      '/api/ai-library/search-models?' + new URLSearchParams({ provider }), signal),
    staleTime: 300_000,
    enabled,
  });
}

export function matchesAIModel(model: AIModel, query: string) {
  const needle = query.trim().toLowerCase();
  return !needle || [aiModelLabel(model.id, model.label), model.label, model.id].join(' ').toLowerCase().includes(needle);
}

export function preferredAIConnection<T extends { base_url?: string }>(connections: readonly T[]): T | undefined {
  return connections.find(connection => !connection.base_url) ?? connections[0];
}

export function aiModelLabel(id: string, name?: string) {
  if (/^gpt-\d/i.test(id)) {
    return id.split('-').map(part => part.toLowerCase() === 'gpt' ? 'GPT' : part.charAt(0).toUpperCase() + part.slice(1)).join('-');
  }
  return name?.trim() || id;
}

const EMPTY: AIModelCatalog = { models: [], loading: false, error: '' };
const LOADING: AIModelCatalog = { ...EMPTY, loading: true };

export function useAIModels(endpoint: string, provider: string, key: string, enabled: boolean, target?: AIApiTarget,
                             connectionRevision?: string) {
  const [result, setResult] = useState<{
    request: object; attempt: number; catalog: AIModelCatalog;
  } | null>(null);
  const [attempt, setAttempt] = useState(0);
  const request = useMemo(() => ({}), [endpoint, provider, key, target, connectionRevision]);
  useEffect(() => {
    if (!enabled) {
      setResult(null);
      return;
    }
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      try {
        const { models } = await apiSend<{ models: AIModel[] }>(endpoint,
          { provider, api_key: key, ...target }, 'POST', controller.signal);
        if (!controller.signal.aborted) setResult({ request, attempt, catalog: { ...EMPTY, models } });
      } catch (error) {
        if (!controller.signal.aborted) {
          setResult({ request, attempt, catalog: { ...EMPTY, error: errorMessage(error) } });
        }
      }
    }, key ? 600 : 0);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [endpoint, provider, key, target, request, enabled, attempt]);
  const current = result?.request === request && result.attempt === attempt;
  const catalog = !enabled ? EMPTY : current ? result.catalog : LOADING;
  return { ...catalog, retry: () => setAttempt(value => value + 1) };
}
