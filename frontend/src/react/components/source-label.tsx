import { MEDIA_SOURCE_ICONS } from '@peach/legacy/ui';
import { useState } from 'react';
import { SourceMark } from '../settings/section';

const sourceLocation = (source: string) => source.startsWith('clouddrive:') ? source.split(':')[1]! : source;
const sourceIcons = Object.fromEntries(Object.entries(MEDIA_SOURCE_ICONS).map(([source, mark]) => [source,
  function ProviderIcon({ className }: { className?: string }) {
    return <span className={className}><SourceMark mark={mark} /></span>;
  },
] as const));
function CloudIcon({ className }: { className?: string }) {
  return <span className={className}><SourceMark mark="database" /></span>;
}
export const providerIcon = (source: string) => sourceIcons[sourceLocation(source)] ?? CloudIcon;

/** 站点标识经本站缓存读取。javdb 与 dmm 是采集来源，用随应用提供的站标；文字放不下时截断，
 *  不压到后面的外链图标上。 */
export function SiteLabel({ site, label }: { site: string; label: string }) {
  const [failed, setFailed] = useState(false);
  const source = site === 'javdb' || site === 'dmm' ? `/site-mark?source=${site}`
    : site === 'missav' ? '/site-mark?domain=missav.com' : null;
  return <span className="inline-flex min-w-0 items-center gap-1.5">
    {failed || !source ? <SourceMark mark="globe" /> : <img src={source} alt="" className="size-(--icon-inline) shrink-0 object-contain" onError={() => setFailed(true)} />}
    <span className="min-w-0 truncate">{label}</span>
  </span>;
}

/** 网盘与本地来源共用已登记的标识。 */
export function SourceLabel({ source, label }: { source: string; label: string }) {
  const location = sourceLocation(source);
  return <span className="inline-flex min-w-0 items-center gap-1.5">
    <SourceMark mark={MEDIA_SOURCE_ICONS[location] || (location === 'local' ? 'hard-drive' : 'database')} />
    <span className="min-w-0 truncate">{label}</span>
  </span>;
}
