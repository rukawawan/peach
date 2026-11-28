import { RiArrowRightUpLine, RiImageLine } from '@remixicon/react';
import type { ReactNode } from 'react';
import { cx } from '@/utils/cx';
import { cardClass } from '../components/card';
import { coverUrl, detailPosterUrl, remoteCoverUrl, type FaceRef } from '@peach/card-art';
import { entityDisplayName } from '../../core/entity-names';
import { t } from '../../i18n';
import { ColumnFilterAvatar } from '../components/column-filter-avatar';
import { useEntityNames } from '../use-entity-names';
import { ErrorText, Help } from '../settings/section';
import { assistantCopy as copy } from './assistant-workspace';
import './assistant-motion.css';

export type SearchSource = 'library' | 'external';
type Person = FaceRef & { name: string; source_avatar?: boolean; source_actor_id?: string };

export interface SearchWork {
  id?: number; code?: string; display_code?: string; display_title?: string; title?: string;
  catalog_title?: string; original_title?: string; name?: string; studio?: string; release_date?: string;
  tags?: string[]; performer_entities?: Person[]; performer_refs?: Person[];
  performers?: string[] | string; performer_total?: number;
  has_cover?: boolean; has_local_poster?: boolean; has_thumb?: boolean; cover_key?: string;
  cover_version?: string; cover_url?: string; has_remote_cover?: boolean;
  is_jav?: boolean; edition_group?: { key: string }; part_group?: { key: string };
  demoCover?: string; demoSource?: string;
}
export type SearchResult = { items: SearchWork[]; error?: string };

export function uniqueLibraryWorks(items: readonly SearchWork[]) {
  const seen = new Set<string>();
  return items.filter(item => {
    const code = item.is_jav && item.code?.trim().toUpperCase();
    const key = code ? 'release:' + code : item.edition_group?.key ? 'edition:' + item.edition_group.key
      : item.part_group?.key ? 'part:' + item.part_group.key : 'asset:' + item.id;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function snapshotSearchResult({ items, error }: SearchResult): SearchResult {
  return { error, items: items.map(item => ({
    id: item.id, code: item.code, display_code: item.display_code,
    title: item.display_title || item.title || item.catalog_title || item.original_title || item.name,
    studio: item.studio, release_date: item.release_date, tags: item.tags?.slice(0, 5),
    performer_refs: peopleOf(item).slice(0, 3).map(person => ({
      id: person.id, name: person.name, has_image: person.has_image, image_version: person.image_version,
      has_avatar: person.has_avatar, rep: person.rep, avatar_focus: person.avatar_focus,
    })),
    performer_total: item.performer_total ?? peopleOf(item).length,
    has_cover: item.has_cover, cover_key: item.cover_key, cover_version: item.cover_version,
    has_local_poster: item.has_local_poster, has_thumb: item.has_thumb,
  })) };
}

function peopleOf(work: SearchWork): Person[] {
  const known = work.performer_entities?.length ? work.performer_entities : work.performer_refs;
  if (known?.length) return known;
  const names = Array.isArray(work.performers) ? work.performers : (work.performers || '').split(/[,，、;/]/);
  return [...new Set(names.map(name => name.trim()).filter(Boolean))].map(name => ({ name }));
}

export const workTitle = (item: SearchWork) =>
  item.display_title || item.title || item.catalog_title || item.original_title || item.name || item.display_code || item.code || '';

function artwork(item: SearchWork, source: SearchSource, localOnly: boolean) {
  return item.demoCover || (item.has_cover ? coverUrl(item, 2)
    : source === 'library' && item.id && (item.has_local_poster || item.has_thumb) ? detailPosterUrl({ ...item, id: item.id }, undefined)
    : !localOnly && source === 'external' && (item.has_remote_cover || item.cover_url) ? remoteCoverUrl(item) : '');
}

export function WorkSuggestion({ item }: { item: SearchWork }) {
  const image = artwork(item, 'library', true);
  const cast = peopleOf(item).slice(0, 2);
  return <>
    <span className="relative inline-grid aspect-4/3 w-12 shrink-0 place-items-center overflow-hidden rounded-md bg-background-tertiary-default text-foreground-icon-tertiary">
      <RiImageLine className="size-4" aria-hidden />
      {image ? <img src={image} alt="" className="absolute inset-0 size-full object-cover"
        onError={event => { event.currentTarget.hidden = true; }} /> : null}
    </span>
    <span className="flex min-w-0 flex-1 flex-col gap-1">
      <span className="truncate"><span className="mr-1.5">{item.display_code || item.code}</span>{workTitle(item)}</span>
      {cast.length ? <span className="flex min-w-0 gap-2 text-caption-1-regular text-text-secondary">
        {cast.map(person => <span key={person.id || person.name} className="flex min-w-0 items-center gap-1">
          <ColumnFilterAvatar person={person} />
          <span className="truncate">{entityDisplayName('performer', person.name, person.id)}</span>
        </span>)}
      </span> : null}
    </span>
  </>;
}

function WorkCard({ item, source, localOnly, actions }: { item: SearchWork; source: SearchSource; localOnly: boolean; actions?: ReactNode }) {
  const code = item.display_code || item.code;
  const title = workTitle(item);
  const href = item.demoSource ?? (source === 'library' ? '/assets/' + item.id : '/works/' + encodeURIComponent(item.code || ''));
  const image = artwork(item, source, localOnly);
  const people = peopleOf(item);
  const shown = people.slice(0, 3);
  const extra = Math.max(people.length, item.performer_total || 0) - shown.length;
  return <article data-ai-search-work="" className={cardClass({ variant: 'outlined', radius: 'plain', padding: 'none' })}>
    <a href={href} aria-label={title}
      target={item.demoSource ? '_blank' : undefined} rel={item.demoSource ? 'noreferrer' : undefined}
      data-work-card-link="" className="group flex min-w-0 items-start gap-3 rounded-2xl p-3 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-border-focus-ring sm:gap-4">
      <span className={cx('relative inline-grid shrink-0 place-items-center overflow-hidden rounded-lg bg-background-tertiary-default text-foreground-icon-tertiary',
        item.demoCover ? 'aspect-3/4 w-14 sm:w-20' : 'aspect-4/3 w-20 sm:w-28')}>
        <RiImageLine aria-hidden="true" className="size-5" />
        {image ? <img src={image} loading={localOnly ? 'eager' : 'lazy'} decoding="async" alt={t('catalog:libraryAssistant.cover', { title })}
          className="absolute inset-0 size-full object-cover"
          onError={event => { event.currentTarget.hidden = true; }} /> : null}
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-caption-1-medium text-text-secondary">
          {code ? <span>{code}</span> : null}
          {item.release_date ? <time dateTime={item.release_date}>{item.release_date}</time> : null}
          {item.studio ? <span className="max-w-full truncate">{item.studio}</span> : null}
        </div>
        <span className="flex min-w-0 items-start gap-2 text-body-medium text-text-primary">
          <span data-ai-search-work-title="" className="line-clamp-2 flex-1 wrap-anywhere group-hover:underline group-focus-visible:underline" title={title}>{title}</span>
          <RiArrowRightUpLine aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-foreground-icon-secondary" />
        </span>
        {shown.length ? <ul className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
          {shown.map(person => <li key={person.id || person.name} data-ai-search-person="" className="flex min-w-0 items-center gap-1.5 text-caption-1-medium text-text-secondary">
            <ColumnFilterAvatar person={{ ...person, source_avatar: !localOnly && person.source_avatar, avatar_code: item.code }} />
            <span className="min-w-0 truncate">{entityDisplayName('performer', person.name, person.id)}</span>
          </li>)}
          {extra > 0 ? <li className="text-caption-1-regular text-text-secondary">+{extra}</li> : null}
        </ul> : null}
        {item.tags?.length ? <ul className="flex min-w-0 flex-wrap gap-1" data-ai-search-tags="">
          {item.tags.slice(0, 5).map(tag => <li key={tag}
            className="max-w-full rounded-md px-1.5 py-0.5 text-caption-1-regular text-text-primary wrap-anywhere">{tag}</li>)}
        </ul> : null}
      </div>
    </a>
    {actions ? <div className="flex min-w-0 justify-end px-2.5 pb-2.5 sm:px-3 sm:pb-3">{actions}</div> : null}
  </article>;
}

export function SearchWorks({ result, source, localOnly = false, historical = false, actions, title }: {
  result: SearchResult; source: SearchSource; localOnly?: boolean; historical?: boolean;
  actions?(item: SearchWork): ReactNode; title?: string;
}) {
  useEntityNames();
  const label = title ?? copy(localOnly && source === 'external' ? 'cachedExternal' : 'scopes.' + source);
  return <section aria-label={label} data-ai-search-source={historical ? undefined : source} className="flex min-w-0 flex-col gap-2.5" data-ai-search-reveal="">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <h2 className="text-body-medium! text-text-primary">{label}</h2>
      {result.items.length ? <span className="text-caption-1-regular text-text-secondary">
        {t('catalog:libraryAssistant.resultCount', { count: result.items.length })}
      </span> : null}
    </div>
    {result.error ? <ErrorText>{result.error}</ErrorText>
      : !result.items.length ? <Help>{copy(localOnly && source === 'external' ? 'cachedExternalEmpty' : 'empty')}</Help>
      : <ul className="flex min-w-0 flex-col gap-2.5">
        {result.items.map((item, index) => <li key={item.id ?? item.code} data-ai-search-reveal=""
          data-ai-search-reveal-order={index === 1 ? 'second' : index === 2 ? 'third' : undefined}>
          <WorkCard item={item} source={source} localOnly={localOnly} actions={actions?.(item)} />
        </li>)}
      </ul>}
  </section>;
}

export function SearchResultSkeleton({ source }: { source: SearchSource }) {
  return <div aria-hidden="true" data-ai-search-results-loading={source} data-ai-search-source={source} data-ai-search-reveal=""
    className={cardClass({ variant: 'outlined', radius: 'plain', padding: 'none', className: 'flex items-start gap-3 p-3' })}>
    <span className="skeleton-sheen aspect-4/3 w-20 shrink-0 rounded-lg sm:w-28" />
    <div className="flex min-w-0 flex-1 flex-col gap-2">
      <span className="skeleton-sheen h-3 w-16 rounded-md" /><span className="skeleton-sheen h-5 w-3/4 rounded-md" />
      <span className="skeleton-sheen h-4 w-2/5 rounded-md" />
    </div>
  </div>;
}
