/* 给已有的带标签输入框（提交式的番号框、人名框）接上候选，不换掉它的外观与提交方式：浏览器原生的
 * `<datalist>`，同复核卡标签框那一种。候选来源与筛选框共用（`library-suggest.ts`）。 */
import { useCallback, useEffect, useId, useState, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { SuggestOption } from '../follow-manage/follow-search';
import { queryClient } from '../query';

const SUGGEST_AFTER_MS = 300;

/** `bind` 交给输入框的 `ref`，`list` 画在它旁边。停手 300ms 才问候选；`text` 为空或 `enabled` 为假时不问。 */
export function useDatalistSuggest(key: string, text: string, load: (term: string, signal: AbortSignal) => Promise<SuggestOption[]>,
  enabled = true): { bind(node: HTMLInputElement | null): void; list: ReactNode } {
  const id = useId();
  const trimmed = text.trim();
  const [term, setTerm] = useState('');
  useEffect(() => {
    if (!trimmed || !enabled) { setTerm(''); return }
    const wait = setTimeout(() => setTerm(trimmed), SUGGEST_AFTER_MS);
    return () => clearTimeout(wait);
  }, [trimmed, enabled]);
  const query = useQuery({
    queryKey: ['datalist-suggestions', key, term],
    queryFn: ({ signal }) => load(term, signal),
    enabled: enabled && !!term, retry: false, staleTime: 60_000,
    placeholderData: previous => previous,
  // 候选挂在各种输入框上，有的弹层不在 Provider 底下：直接用全站那一份查询客户端。
  }, queryClient);
  const bind = useCallback((node: HTMLInputElement | null) => { node?.setAttribute('list', id) }, [id]);
  const options = term ? query.data ?? [] : [];
  return {
    bind,
    list: <datalist id={id}>
      {options.map(option => <option key={`${option.group ?? ''}:${option.value}`} value={option.value}>{option.matched || undefined}</option>)}
    </datalist>,
  };
}
