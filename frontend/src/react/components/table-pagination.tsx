import { Button } from '@/components/base/buttons/button';
import { DOTS, paginationRange } from '../../pagination';
import { t } from '../../i18n';

export function Pagination({ page, pages, onPage, label = t('shell:tablePagination.followingDefault') }: {
  page: number; pages: number; onPage(page: number): void; label?: string;
}) {
  if (pages <= 1) return null;
  return (
    <nav aria-label={label} data-pagination-layout="" className="inline-grid min-w-0 max-w-full items-center gap-2">
      <Button variant="secondary" size="small" disabled={page <= 1} onClick={() => onPage(page - 1)}>{t('shell:tablePagination.previous')}</Button>
      <ul className="flex min-w-0 flex-wrap items-center justify-center gap-1">
        {paginationRange(page, pages).map((item, at) => (
          <li key={item === DOTS ? `dots-${at}` : item}>
            {item === DOTS ? <span aria-hidden className="px-1 text-body-2-regular text-text-tertiary">{DOTS}</span>
              : <Button variant={item === page ? 'secondary' : 'ghost'} size="small"
                  aria-label={t('shell:tablePagination.page', { page: item })} aria-current={item === page ? 'page' : undefined}
                  onClick={() => onPage(Number(item))}>{item}</Button>}
          </li>
        ))}
      </ul>
      <Button variant="secondary" size="small" disabled={page >= pages} onClick={() => onPage(page + 1)}>{t('shell:tablePagination.next')}</Button>
    </nav>
  );
}
