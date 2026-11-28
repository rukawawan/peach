import { avatarInner } from '../../card-art/markup';
import { entityPath } from '@peach/legacy/core';
import { SourceAvatar } from '../components/source-avatar';
import { entityDisplayName } from '../../core/entity-names';
import { useEntityNames } from '../use-entity-names';
import type { Discovery } from './jav';
import { javSubscriptionPath } from '../follow-manage/jav-subscription-path';
import { RiExternalLinkLine, RiFilter3Line, RiRssLine } from '@remixicon/react';
import { Button, ButtonLink } from '@/components/base/buttons/button';
import { ColumnFilterAvatar } from '../components/column-filter-avatar';
import { ColumnFilterPopover } from '../components/table-column-filter';
import { FilterMenuScroll } from '../components/filter-menu-scroll';
import { MenuDialog } from '../components/menu-dialog';

export type DiscoveryPerson = NonNullable<Discovery['performer_refs']>[number];

function performerHref(person: DiscoveryPerson): string {
  return person.id ? entityPath('performer', person.name, person.id)
    : person.source_url || javSubscriptionPath(person.name);
}

export function DiscoveryPerformerName({ person, name, title, icon, onFilter }: {
  person?: DiscoveryPerson; name: string; title?: string; icon?: boolean; onFilter?(person: DiscoveryPerson): void;
}) {
  if (!name) return null;
  const target = person?.source_url && !person.id ? { target: '_blank', rel: 'noopener noreferrer' } : {};
  const label = t('catalog:entityHero.subscribeNewReleases');
  const text = <>
      {icon ? <svg viewBox="0 0 24 24" aria-hidden="true"><use href="#i-user-round" /></svg> : null}
      <span>{name}</span>
    </>;
  return <>
    {onFilter && person ? <button type="button" data-media-who="" title={title} onClick={() => onFilter(person)}>{text}</button>
      : <a data-media-who="" href={performerHref(person ?? { name })} title={title} {...target}>{text}</a>}
    {person?.source_url && (!person.id || onFilter) ? <a href={javSubscriptionPath(person.name)}
      className="inline-flex shrink-0 text-text-secondary hover:text-text-primary" aria-label={`${label} · ${name}`} title={label}>
      <RiRssLine className="size-4" aria-hidden />
    </a> : null}
  </>;
}

export function DiscoveryCastMore({ people, onFilter }: { people: DiscoveryPerson[]; onFilter?(person: DiscoveryPerson): void }) {
  useEntityNames();
  if (people.length < 2) return null;
  const label = t('catalog:javDiscovery.morePeople', { count: people.length - 1, total: people.length });
  if (!onFilter) return <span data-media-who-more="">{label}</span>;
  return <span data-media-who-more="" className="shrink-0">
    <ColumnFilterPopover id="cast" label={label} active={false}>
      {close => <MenuDialog aria-label={t('catalog:shared.performers')} className="py-2 outline-none">
        <FilterMenuScroll>
        <ul className="flex flex-col gap-1">
          {people.map(person => {
            const name = entityDisplayName('performer', person.name, person.id);
            return <li key={person.dmm_id || person.name} className="flex min-w-0 items-center gap-2 px-1">
              <ColumnFilterAvatar person={person} />
              <span className="min-w-0 flex-1 truncate text-body-2-medium" title={name}>{name}</span>
              <Button variant="ghost" size="small" iconOnly leadingIcon={RiFilter3Line}
                aria-label={t('catalog:javOnline.filterPerformer', { name })}
                onClick={() => { onFilter(person); close() }} />
              {person.source_url ? <ButtonLink href={person.source_url} target="_blank" rel="noopener noreferrer"
                variant="ghost" size="small" iconOnly leadingIcon={RiExternalLinkLine}
                aria-label={t('catalog:javDiscovery.openActress', { name })} /> : null}
              <ButtonLink href={javSubscriptionPath(person.name)} variant="ghost" size="small" iconOnly leadingIcon={RiRssLine}
                aria-label={`${t('catalog:entityHero.subscribeNewReleases')} · ${name}`} />
            </li>;
          })}
        </ul>
        </FilterMenuScroll>
      </MenuDialog>}
    </ColumnFilterPopover>
  </span>;
}

/** 发现人物使用馆藏的共演头像几何与悬停动作。 */
export function DiscoveryFaces({ item, limit = 5 }: { item: Discovery; limit?: number }) {
  useEntityNames();
  const people: NonNullable<Discovery['performer_refs']> = item.performer_refs?.length ? item.performer_refs
    : [...new Set(item.performers.split(/[,，、;/]/).filter(Boolean))].map(name => ({ name }));
  const faces = people.slice(0, limit).map((person, index) => {
    const style = { '--media-avatar-index': index } as CSSProperties;
    const face = person.source_avatar && person.source_actor_id && !person.has_image && !person.has_avatar
      ? { children: <SourceAvatar code={item.code} person={person} /> }
      : { dangerouslySetInnerHTML: { __html: avatarInner(person.name, person, null) } };
    const label = t('catalog:javDiscovery.openActress', { name: entityDisplayName('performer', person.name, person.id) });
    return <a key={person.dmm_id || person.name} data-media-avatar="" style={style} href={performerHref(person)} aria-label={label}
      {...(person.source_url && !person.id ? { target: '_blank', rel: 'noopener noreferrer' } : {})} {...face} />;
  });
  return faces.length > 1 ? <div data-media-avatars="" style={{ '--media-avatar-count': faces.length } as CSSProperties}>{faces}</div> : faces[0] || null;
}
import type { CSSProperties } from 'react';
import { t } from '../../i18n';
