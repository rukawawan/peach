/* JAV 新作分区的列表模式。表格骨架、列偏好、显示列与拖宽手柄同馆藏作品列表那一套，格子沿用它的
 * 名称格、艺人格与媒体库格标记（`catalog-list.css`）。分页与排序在分区里：表头点得开的四列对应新作接口的排序键。 */
import { useState, type MouseEvent } from 'react';
import { Button } from '@/components/base/buttons/button';
import { Checkbox } from '@/components/base/checkbox/checkbox';
import { useJavSelection } from './jav-selection';
import { Table, TableBody, TableCell, TableColumn, TableHeader, TableRow } from '@/components/base/table/table';
import { ChevronSortDown } from '@/components/foundations/icons/chevrons';
import { entityPath, fmtDur, leadingGraphemes } from '@peach/legacy/core';
import { COVER_STATE_TITLE, logoUrl } from '@peach/card-art';
import { relayoutCovers } from '../../card-art/framing';
import { catalogListSkeletonCellHtml } from '../../catalog-content-skeleton';
import { textLang } from '../../core/text-lang';
import { ArtSlot } from '../components/art-slot';
import { DataTableFrame } from '../components/data-table-frame';
import { useTablePreferences } from '../components/table-column-preferences';
import { TableColumnControls, TableColumnResizer } from '../components/table-column-controls';
import { busyProps } from '../settings/use-action';
import { DiscoveryFaces } from './discovery-faces';
import type { DiscoveryDirection, ReleaseSort } from './discovery-sorts';
import { discoveryArtwork, type Discovery, type ReleaseFacetStudio, type ReleaseFilters } from './jav';
import { RELEASE_COLUMN_VISIBILITY_KEY, RELEASE_COLUMN_WIDTHS_KEY, RELEASE_SORT_COLUMNS, releaseColumns } from './release-table-columns';
import '../catalog-grid/catalog-list.css';

const KEYS = { widths: RELEASE_COLUMN_WIDTHS_KEY, visibility: RELEASE_COLUMN_VISIBILITY_KEY };

/** 厂牌格的标识：装了方形图标就用它，否则画首字。 */
function StudioMark({ studio }: { studio: ReleaseFacetStudio | undefined; }) {
  const [broken, setBroken] = useState(false);
  return studio?.has_logo && !broken
    ? <img data-list-studio-mark="" src={logoUrl(studio.name, 'icon', studio.logo_version)} alt="" width={16} height={16}
      loading="lazy" decoding="async" onError={() => setBroken(true)} />
    : <span data-list-studio-mark="" aria-hidden="true">{leadingGraphemes(studio?.name || '', 1)}</span>;
}

export function ReleaseTable({ items, waiting, filters, studios, javImage, readOnly, navigate, onTag, onSort, wanting, onWant, onResource }: {
  items: Discovery[]; waiting: boolean; filters: ReleaseFilters; studios: ReleaseFacetStudio[]; javImage: unknown; readOnly: boolean;
  navigate(path: string): void; onTag(tag: string): void; onSort(key: ReleaseSort, dir: DiscoveryDirection): void;
  wanting(item: Discovery): boolean; onWant(item: Discovery): void; onResource(item: Discovery): void;
}) {
  const selection = useJavSelection();
  const preferences = useTablePreferences('jav-releases', releaseColumns, KEYS);
  const shown = releaseColumns.filter(column => column.required || preferences.visibility[column.id] !== false);
  const active = Object.entries(RELEASE_SORT_COLUMNS).find(([, key]) => key === filters.sort)?.[0];
  const logos = new Map(studios.map(studio => [studio.name, studio]));
  const open = (item: Discovery) => (event: MouseEvent) => {
    event.preventDefault();
    if (selection?.mode || event.shiftKey || event.ctrlKey || event.metaKey) selection?.toggle(item, event.shiftKey);
    else navigate(`/works/${encodeURIComponent(item.code)}`);
  };
  const cell = (id: string, item: Discovery) => {
    const name = item.performer_refs?.[0]?.name || item.performers.split(/[,，、;/]/)[0] || '';
    switch (id) {
      case 'name': {
        const artwork = discoveryArtwork(item, 'small', javImage);
        return <div data-list-identity="">
          <button type="button" data-list-open="" tabIndex={-1} aria-hidden="true" onClick={open(item)}>
            <span data-list-picture="">{artwork
              ? <ArtSlot artwork={{ kind: 'cover', html: artwork }} relayout={root => relayoutCovers(root, 'small')} />
              // 缩略格只放得下状态字，原因放进悬停说明；当场取的键在卡片模式与分区顶上那条提示里。
              : <span title={item.cover_reason || undefined}>{item.cover_state ? COVER_STATE_TITLE[item.cover_state] : '无封面'}</span>}</span>
          </button>
          <span data-list-text="">
            <button type="button" data-list-name="" title={`${item.code} · ${item.title || '标题未取得'}`} aria-label={`查看 ${item.code} 详情`}
              onClick={open(item)}><b>{item.code}</b> {item.title ? <span lang={textLang(item.title)}>{item.title}</span> : '标题未取得'}</button>
          </span>
        </div>;
      }
      case 'people':
        return name ? <div data-list-people=""><DiscoveryFaces item={item} />
          {item.performer_refs?.[0]?.id ? <a data-media-who="" href={entityPath('performer', name)}><span>{name}</span></a>
            : <span data-media-who=""><span>{name}</span></span>}
          {(item.performer_refs?.length || 0) > 1 ? <span data-media-who-more="">等 {item.performer_refs!.length} 人</span> : null}
        </div> : '—';
      case 'studio':
        return item.studio ? <span data-list-library="" title={item.studio}><StudioMark studio={logos.get(item.studio)} /><span>{item.studio}</span></span> : '—';
      case 'tags':
        return item.tags?.length ? <div data-media-tags="" data-list-tags="">
          {item.tags.map(tag => <button key={tag} type="button" data-media-tag="" aria-pressed={filters.tag === tag}
            onClick={() => onTag(filters.tag === tag ? '' : tag)}>{tag}</button>)}
        </div> : '—';
      case 'code': return item.code;
      case 'dur': return fmtDur(item.duration) || '—';
      case 'score': return item.source_score != null ? `${item.source_score.toFixed(2)} / 5` : '—';
      case 'release': return item.release_date || '—';
      default:
        /* 行里只放两个动作；作品来源链接在详情页。 */
        return <div data-release-actions="" className="flex gap-2">
          <Button size="small" variant="ghost" disabled={readOnly || item.wanted || !!item.asset_id} {...busyProps(wanting(item))}
            onClick={() => onWant(item)}>{item.wanted ? '已想要' : '想要'}</Button>
          <Button size="small" variant="secondary" onClick={() => onResource(item)}>查找资源</Button>
        </div>;
    }
  };
  return <div data-catalog-table="" data-release-table="" className="flex min-w-0 flex-col gap-4">
    <div className="flex flex-wrap justify-end gap-2" role="toolbar" aria-label="新作列表工具栏">
      <div data-toolbar-actions=""><TableColumnControls preferences={preferences} label="新作列表" /></div>
    </div>
    <DataTableFrame follow preferences={preferences}>
      <Table aria-label="新作列表" size="sm"
        sortDescriptor={active ? { column: active, direction: filters.dir === 'asc' ? 'ascending' : 'descending' } : undefined}
        onSortChange={next => { const key = RELEASE_SORT_COLUMNS[String(next.column)]; if (key) onSort(key, next.direction === 'ascending' ? 'asc' : 'desc') }}>
        <TableHeader>{selection?.mode ? <TableColumn id="selection" width={44} aria-label="选择作品">
          <Checkbox slot={null} aria-label="全选本页作品" isSelected={selection.all} isIndeterminate={selection.mixed}
            isDisabled={waiting || !items.length} onChange={selection.selectPage} />
        </TableColumn> : null}{shown.map(column => <TableColumn key={column.id} id={column.id} isRowHeader={column.id === 'name'}
          allowsSorting={column.id in RELEASE_SORT_COLUMNS} {...preferences.columnProps(column.id)}>
          {({ sortDirection }) => <>
            <span className="flex items-center gap-0.5">{column.label}
              {column.id in RELEASE_SORT_COLUMNS ? <span data-sort-indicator data-direction={sortDirection || undefined}><ChevronSortDown /></span> : null}</span>
            <TableColumnResizer preferences={preferences} id={column.id} />
          </>}
        </TableColumn>)}
          <TableColumn id="remaining-space" aria-label="行空白区域" data-table-space="" width={preferences.spaceWidth} minWidth={0} />
        </TableHeader>
        <TableBody renderEmptyState={() => '没有符合条件的新作'}>
          {/* 等数据时在真实表格里画骨架行，格子与路由骨架同一份。 */}
          {waiting ? Array.from({ length: 6 }, (_, index) => <TableRow key={`skeleton-${index}`} id={`skeleton-${index}`} data-list-skeleton-row="" aria-hidden="true">
            {selection?.mode ? <TableCell /> : null}
            {shown.map(column => <TableCell key={column.id}><span dangerouslySetInnerHTML={{ __html: catalogListSkeletonCellHtml(column.id) }} /></TableCell>)}
            <TableCell data-table-space="" />
          </TableRow>) : items.map(item => <TableRow key={item.id} id={String(item.id)} data-catalog-row="" data-release-row="">
            {selection?.mode ? <TableCell><Checkbox slot={null} aria-label={`选择 ${item.code}`}
              isSelected={selection.selected.has(item.code)} onChange={() => selection.toggle(item)} /></TableCell> : null}
            {shown.map(column => <TableCell key={column.id}>{cell(column.id, item)}</TableCell>)}
            <TableCell data-table-space="" />
          </TableRow>)}
        </TableBody>
      </Table>
    </DataTableFrame>
  </div>;
}
