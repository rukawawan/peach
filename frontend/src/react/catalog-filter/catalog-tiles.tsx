import { useState, type ReactNode } from 'react';
import { AsyncText } from '../components/async-text';

interface TileProps {
  name: string;
  entityName?: string;
  busy?: boolean;
  pressed?: boolean;
  title?: string;
  onClick(): void;
}

export function CatalogPerformerTile({ name, entityName, busy, pressed, title, ringHtml, onClick }: TileProps & { ringHtml: string }) {
  return <button type="button" data-tier-performer="" data-entity-kind={entityName ? 'performer' : undefined}
    data-entity-name={entityName} aria-pressed={pressed} title={title} onClick={onClick}>
    <span data-tier-ring="" dangerouslySetInnerHTML={{ __html: ringHtml }} />
    <span data-tier-name=""><AsyncText text={name} busy={!!busy} /></span>
  </button>;
}

export function CatalogStudioTile({ name, entityName, busy, pressed, title, logo, fallback, children, onClick }: TileProps & {
  logo?: string; fallback: string; children?: ReactNode;
}) {
  const [broken, setBroken] = useState(false);
  return <button type="button" data-tier-studio="" data-entity-kind={entityName ? 'studio' : undefined}
    data-entity-name={entityName} aria-pressed={pressed} title={title} onClick={onClick}>
    <span data-tier-mark="" aria-hidden>{logo && !broken ? <img src={logo} alt="" width={28} height={28}
      loading="lazy" decoding="async" onError={() => setBroken(true)}
      onLoad={event => { if (event.currentTarget.naturalWidth < 32) setBroken(true) }} /> : fallback}</span>
    <AsyncText text={name} busy={!!busy} />
    {children}
  </button>;
}
