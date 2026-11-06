import { useState } from 'react';
import { RiCompassLine } from '@remixicon/react';
import catalog from '../../../../resources/browser-icons/manifest.json';

const normalize = (name: string) => name.normalize('NFKC').toLowerCase().replace(/[\s_-]/g,'');
const icons = new Map(catalog.icons.flatMap(icon => icon.aliases.map(alias => [normalize(alias),icon.id] as const)));

export function browserIconId(name: string): string | undefined {
  return icons.get(normalize(name));
}

/** `className` 换掉默认尺寸（独立图块 24px）；行内跟文字时传更小的尺寸。 */
export function BrowserIcon({ name, className }: {name:string; className?:string}) {
  const [failed,setFailed] = useState('');
  const id = browserIconId(name);
  return id && failed !== id
    ? <img src={`/browser-icon/${id}`} width={24} height={24} alt="" aria-hidden loading="lazy"
        className={`${className ?? 'size-6 shrink-0'} object-contain`} onError={() => setFailed(id)} />
    : <RiCompassLine aria-hidden className={`${className ?? 'size-5 shrink-0'} text-foreground-icon-secondary`} />;
}
