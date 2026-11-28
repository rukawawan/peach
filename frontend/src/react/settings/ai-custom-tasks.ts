import { useQuery } from '@tanstack/react-query';
import { apiGet } from '../../api';
import { t } from '../../i18n';
import type { AIEffort } from './use-ai-models';

export const CUSTOM_TASKS_URL = '/api/ai-library/custom-tasks';
export const CUSTOM_TASKS_KEY = ['ai-library-custom-tasks'];
export const CUSTOM_TASK_EDITOR_URL = '/settings/ai#ai-prompts';
export const customTaskCopy = (key: string) => t('settings:aiLibrary.customTasks.' + key);

export interface FixedTaskShortcut { id: string; name: string; provider: string | null }
export interface FixedTask extends FixedTaskShortcut { prompt: string; model: string | null; effort: AIEffort | null }

export function useCustomTasks<T extends FixedTaskShortcut>(edit = false, enabled = true) {
  return useQuery({
    queryKey: [...CUSTOM_TASKS_KEY, edit],
    queryFn: ({ signal }) => apiGet<{ tasks: T[] }>(CUSTOM_TASKS_URL + (edit ? '?edit=1' : ''), signal),
    enabled,
  });
}
