import { avatarInner, type FaceRef } from '../../card-art/markup';
import { SourceAvatar } from './source-avatar';
import { LEGACY_AVATAR_IMG } from './legacy-avatar';
import './table-column-filter.css';

export function ColumnFilterStudioAvatar({ studio }: { studio: { name: string; has_logo?: boolean; logo_version?: string } }) {
  return <ColumnFilterAvatar person={{ name: studio.name, logo_version: studio.logo_version }} kind="studio"
    logo={studio.has_logo ? studio.name : undefined} />;
}

/** 表格与列头菜单复用卡片的实体取景、来源头像与首字回落。 */
export function ColumnFilterAvatar({ person, kind = 'performer', markId = null, size = 'small', logo = '' }: {
  person: FaceRef & { name: string; source_avatar?: boolean; source_actor_id?: string; avatar_code?: string };
  kind?: string;
  markId?: number | null;
  size?: 'small' | 'medium';
  logo?: string;
}) {
  return person.source_avatar && person.source_actor_id && person.avatar_code && !person.has_image && !person.has_avatar
    ? <span data-column-filter-avatar="" data-avatar-size={size} className={LEGACY_AVATAR_IMG} aria-hidden="true"><SourceAvatar code={person.avatar_code} person={person} /></span>
    : <span data-column-filter-avatar="" data-avatar-size={size} className={LEGACY_AVATAR_IMG} aria-hidden="true"
        dangerouslySetInnerHTML={{ __html: avatarInner(person.name, person, null, kind, markId, logo) }} />;
}
