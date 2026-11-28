import type { ReactNode } from 'react';
import { t } from '../../i18n';
import { CollapseChevron } from './collapse-region';
import { useFoldedTitle } from './folded-title';

export function DetailTitle({ textKey, html, tools }: { textKey: string; html: string; tools: ReactNode }) {
  const { text, expanded, foldable, toggle } = useFoldedTitle(textKey);
  return (
    <div data-item-title="">
      <div data-stage-title="" data-title-line="" data-reveal-line="">
        <span ref={text} data-detail-title="" data-expanded={expanded ? '' : undefined}
          data-foldable={foldable ? '' : undefined}
          onClick={() => { if (foldable && !String(getSelection() || '')) toggle() }}
          dangerouslySetInnerHTML={{ __html: html }} />
        <span data-title-tools="">
          <button type="button" data-title-fold="" hidden={!foldable} aria-expanded={expanded}
            aria-label={t(expanded ? 'catalog:titleFold.collapse' : 'catalog:titleFold.expand')}
            title={t(expanded ? 'catalog:titleFold.collapse' : 'catalog:titleFold.expandFull')} onClick={toggle}>
            <CollapseChevron />
          </button>
          {tools}
        </span>
      </div>
    </div>
  );
}
