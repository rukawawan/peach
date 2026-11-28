import { useState } from 'react';
import { leadingGraphemes } from '@peach/legacy/core';
import { logoUrl } from '@peach/card-art';
import { avatarInner } from '../../card-art/markup';
import { entityDisplayName } from '../../core/entity-names';
import { t } from '../../i18n';
import { CatalogPerformerTile, CatalogStudioTile } from '../catalog-filter/catalog-tiles';
import { ColumnFilterStudioAvatar } from '../components/column-filter-avatar';
import { useEntityNames } from '../use-entity-names';
import type { DiscoveryPerson } from './discovery-faces';
import type { ReleaseFacetStudio } from './jav';

type Studio = Omit<ReleaseFacetStudio, 'count'>;
interface FacetOption<T> { id: string; value: T; count: number }

export function countJavFacets<Work, T>(works: readonly Work[], values: (work: Work) => readonly T[], id: (value: T) => string, selected: readonly string[]) {
  const options = new Map<string, FacetOption<T>>();
  for (const work of works) {
    const unique = new Map(values(work).map(value => [id(value), value]));
    for (const [key, value] of unique) {
      const option = options.get(key);
      if (option) option.count += 1;
      else options.set(key, { id: key, value, count: 1 });
    }
  }
  return [...options.values()].sort((a, b) => Number(selected.includes(b.id)) - Number(selected.includes(a.id)) || b.count - a.count);
}
type FacetAction = { count: number; pressed: boolean; onClick(): void };

export function PerformerFacet({ person, count, pressed, onClick }: FacetAction & { person: DiscoveryPerson }) {
  useEntityNames();
  const name = entityDisplayName('performer', person.name, person.id);
  return <CatalogPerformerTile name={name} pressed={pressed} onClick={onClick} ringHtml={avatarInner(person.name, person, null)}
    title={t('catalog:javReleases.facetCount', { name, count })} />;
}

function StudioIcon({ studio }: { studio: Studio }) {
  const [broken, setBroken] = useState(false);
  return studio.has_logo && !broken ? <img data-list-studio-mark="" src={logoUrl(studio.name, 'icon', studio.logo_version)}
    alt="" width={16} height={16} loading="lazy" decoding="async" onError={() => setBroken(true)} />
    : <span data-list-studio-mark="" aria-hidden>{leadingGraphemes(studio.name, 1)}</span>;
}

export function StudioFacet({ studio, count, pressed, onClick, showCount = true }: FacetAction & { studio: Studio; showCount?: boolean }) {
  return <CatalogStudioTile name={studio.name} logo={studio.has_logo ? logoUrl(studio.name, 'icon', studio.logo_version) : undefined}
    fallback={leadingGraphemes(studio.name, 2)} pressed={pressed} onClick={onClick}
    title={t('catalog:javReleases.facetCount', { name: studio.name, count })}>
    {showCount ? <span data-count-badge="">{count}</span> : null}
  </CatalogStudioTile>;
}

export function StudioListLabel({ name, studio }: { name: string; studio?: Studio }) {
  return <span data-list-library="" title={name}>
    <StudioIcon studio={studio || { name, has_logo: false }} /><span>{name}</span>
  </span>;
}

export function StudioFilterLabel({ studio }: { studio: Studio }) {
  return <span className="inline-flex min-w-0 items-center gap-1.5">
    <ColumnFilterStudioAvatar studio={studio} />
    <span className="truncate">{studio.name}</span>
  </span>;
}
