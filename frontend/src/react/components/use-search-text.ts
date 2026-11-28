import { useEffect, useRef, useState, type CompositionEvent, type KeyboardEvent } from 'react';

import { composingKey } from './ime';

/** 停手多久才交出查找词。 */
export const SEARCH_AFTER_MS = 300;

/* 只读查找框共用的节律：停手 300ms 就查，回车是「别等了，现在就查」。中文输入法选字过程中
   一样发 input，拿还没定型的拼音去筛，筛的是「zhon」这种半截输入；组完字由 compositionend
   接手，组字过程中的回车是在定字，也放过去。外面换了 `value`（清除筛选、前进后退）框里跟着换。 */
export function useSearchText(value: string, onQuery: (q: string) => void) {
  const [text, setText] = useState(value);
  const composing = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => { clearTimeout(timer.current); setText(value) }, [value]);
  useEffect(() => () => clearTimeout(timer.current), []);
  const later = (next: string) => {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => onQuery(next.trim()), SEARCH_AFTER_MS);
  };
  return {
    text,
    change: (next: string) => { setText(next); if (!composing.current) later(next) },
    /** 立刻交出这个词，不等停手：清除键用。 */
    commit: (next: string) => { clearTimeout(timer.current); setText(next); onQuery(next.trim()) },
    onKeyDown: (event: KeyboardEvent) => {
      if (event.key !== 'Enter' || composing.current || composingKey(event.nativeEvent)) return;
      event.preventDefault();
      clearTimeout(timer.current);
      onQuery(text.trim());
    },
    composition: {
      onCompositionStart: () => { composing.current = true },
      onCompositionEnd: (event: CompositionEvent) => { composing.current = false; later((event.target as HTMLInputElement).value) },
    },
  };
}
