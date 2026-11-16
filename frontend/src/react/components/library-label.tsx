/* 媒体库在页面上的写法：图标加名字，图标随这个库的来源色（`--library-color`，由 library-tint 注入）。
 * 侧栏切换器之外，凡是写出媒体库名的地方（表格列、选择器、排序行）都用这一份，不单写库名。 */
import { LOC } from '@peach/legacy/core';
import { SourceLabel } from './source-label';
import { useLibraryTints, type LibraryTint } from './library-tint';
import { SourceMark } from '../settings/section';

export function LibraryLabel({ library }: { library: Pick<LibraryTint, 'id' | 'name' | 'icon'> }) {
  return <span className="flex min-w-0 items-center gap-2">
    <span data-library={library.id} className="inline-flex shrink-0 text-(--library-color)">
      <SourceMark mark={library.icon} />
    </span>
    <span className="truncate">{library.name}</span>
  </span>;
}

/** 条目所属媒体库：按 `library_id` 取名字与图标；不在任何媒体库里时退回存储来源的标识，都没有写 `fallback`。 */
export function ItemLibrary({ libraryId, location, fallback }: { libraryId?: string; location?: string; fallback: string }) {
  const tint = useLibraryTints({ names: true }).get(libraryId || '');
  if (tint?.name) return <LibraryLabel library={tint} />;
  return location ? <SourceLabel source={location} label={LOC[location] || location} /> : <>{fallback}</>;
}
