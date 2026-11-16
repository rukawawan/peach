import { entityPath, esc } from '@peach/legacy/core';

import { t } from '../i18n';
import { avatarInner, type FaceRef } from './markup';

type FeedFace = FaceRef & { name: string; source_actor_id?: string; source_avatar?: boolean };

/** 新作署名共用人物头像、取景与首字回退；已有身份通往人物资料页。 */
export function feedIdentity(item: { code?: string; performers?: string; performer_refs?: FeedFace[] }): string {
  const refs = item.performer_refs || [];
  const names = [...new Set((item.performers || '').split(/[,，、;/]/).map(name => name.trim()).filter(Boolean))];
  const people: FeedFace[] = refs.length ? refs : names.map(name => ({ name }));
  const faces = people.slice(0, 3).map((ref, index) => {
    const source = item.code && ref.source_actor_id && ref.source_avatar && !ref.has_image && !ref.has_avatar;
    const attrs = ` style="--media-avatar-index:${index}"` + (source ? ` data-feed-source-avatar data-code="${esc(item.code!)}" data-actor="${esc(ref.source_actor_id!)}" data-name="${esc(ref.name)}"` : '');
    const html = source ? '' : avatarInner(ref.name, ref, null);
    return 'id' in ref && ref.id
      ? `<a class="mav"${attrs} href="${esc(entityPath('performer', ref.name, ref.id))}" aria-label="${t('catalog:javDiscovery.openActress', { name: esc(ref.name) })}">${html}</a>`
      : `<span class="mav"${attrs} title="${esc(ref.name)}">${html}</span>`;
  }).join('');
  return people.length > 1 ? `<div class="mavstack" style="--media-avatar-count:${Math.min(3, people.length)}">${faces}</div>` : faces;
}
