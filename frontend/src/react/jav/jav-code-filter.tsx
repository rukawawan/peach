import { useState } from 'react';
import { Button } from '@/components/base/buttons/button';
import { Input } from '@/components/base/input/input';
import { t } from '../../i18n';

function codeKey(value: string) {
  return value.normalize('NFKC').toLowerCase().replace(/[\s_\-‐‑‒–—―]+/g, '');
}

export function matchesJavCode(code: string, query: string) {
  return codeKey(code).includes(codeKey(query));
}

export function JavCodeFilter({ value, onChange }: { value: string; onChange(value: string): void }) {
  const [text, setText] = useState(value);
  const label = t('catalog:columnFilter.search', { column: t('catalog:shared.code') });
  return <form className="flex flex-col gap-3 p-3" data-copy-interact="" onSubmit={event => {
    event.preventDefault();
    if (codeKey(text)) onChange(text.trim());
  }}>
    <Input size="small" label={label} value={text} onChange={setText} maxLength={80} />
    <div className="flex justify-end gap-2">
      <Button variant="ghost" size="small" type="button" disabled={!value}
        onClick={() => onChange('')}>{t('catalog:shared.clearFilters')}</Button>
      <Button size="small" type="submit" disabled={!codeKey(text)}>{t('follow:shared.search')}</Button>
    </div>
  </form>;
}
