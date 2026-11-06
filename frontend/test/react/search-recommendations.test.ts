import { describe, expect, it, vi } from 'vitest';
import { pendingRecommendations, searchRecommendations } from '../../src/react/search/recommendations';

describe('搜索图片推荐', () => {
  it('一个请求取齐各组：作品来源保留各自详情地址，关注头像和署名取实际发布者', async () => {
    const source = { id: 8, author_key: 'name:作者', label: '作者', ref: '作者', provider: 'pixiv',
      entity_id: 20, entity_name: '作者', official_avatar_url: '/avatar-fixture' };
    const request = vi.fn(async (_url: string) => ({
      items: { items: [{ id: 11, name: '本地作品' }] },
      jav: { items: [{ id: 12, asset_id: 12, code: 'ABW-101', performer_refs: [{ id: 15, name: '女优', has_image: true }] }] },
      feeds: { items: [{ id: 12, code: 'ABW-102', cover_url: '/release-cover' }] },
      authors: { items: [{ k: '作者', key: source.author_key, entity_id: 20,
        avatar: '/author-avatar', avatar_fallback: '/author-mirror', latest: '2025-03-04T05:06:07Z' }] },
      latest: { 15: { id: 30, code: 'ABW-099', release_date: '2025-02-01' } },
      words: ['ABW-101', '女优'],
      follow: { sources: [source], groups: [{
        primary: { id: 12, source_id: 8, title: '关注作品', thumb_url: '/post-cover', media_kind: 'video', status: 'saved' },
        variants: [{ id: 13, source_id: 8, title: '图片作品', status: 'seen', media_kind: 'image',
          media_items: [{ index: 2, media_kind: 'image', thumb_url: '/photo-cover' }] }], duplicates: [],
      }] },
    }));
    const { groups, words } = await searchRecommendations(request);
    expect(request.mock.calls).toEqual([['/api/search/recommendations']]);
    expect(words).toEqual(['ABW-101', '女优']);
    const entry = (kind: string) => groups.find(group => group.kind === kind)!.items[0]!;
    expect(entry('asset').id).toBe(11);
    expect(entry('jav').href).toBe('/assets/12');
    expect(entry('jav').who).toBe('女优');
    expect(entry('release').href).toBe('/works/ABW-102');
    expect(entry('release').card?.sourceWork).toBe(true);
    expect(entry('post').href).toBe('/posts/12');
    expect(entry('post').who).toBe('作者');
    expect(entry('post').whoAvatarHtml).toContain('/avatar-fixture');
    expect(entry('post').card?.thumb_url).toBe('/post-cover');
    expect(entry('photo').href).toBe('/posts/13');
    expect(entry('photo').mediaIndex).toBe(2);
    expect(entry('photo').followMedia).toBe('images');
    expect(entry('photo').card?.thumb_url).toBe('/photo-cover');
    expect(entry('author').href).toBe('/creators/20');
    expect(entry('author').avatarHtml).toContain('/author-avatar');
    expect(entry('author').avatarHtml).toContain('/author-mirror');
    expect(entry('author').subtitle).toBe('最新更新于 2025-03-04');
    expect(entry('performer').entity_id).toBe(15);
    expect(entry('performer').subtitle).toBe('最新作 ABW-099 · 2025-02-01');
    // 每组带着整池，「换一批」在池里翻页。
    expect(groups.find(group => group.kind === 'jav')).toMatchObject({ offset: 0, size: 5 });
    expect(groups.map(group => group.kind)).toEqual(pendingRecommendations().map(group => group.kind));
  });

  it('服务端某一份没取到只缺那一组，无实体的作者进入自己的关注筛选', async () => {
    const { groups } = await searchRecommendations(async () => ({
      items: { items: [{ id: 11, name: '本地作品' }] }, jav: null, follow: null, feeds: null,
      authors: { items: [{ k: '作者', key: 'name:作者' }] }, latest: {}, words: [],
    }));
    expect(groups.find(group => group.kind === 'asset')!.items).toHaveLength(1);
    expect(groups.find(group => group.kind === 'jav')!.items).toEqual([]);
    expect(groups.find(group => group.kind === 'post')!.items).toEqual([]);
    expect(groups.find(group => group.kind === 'author')!.items[0]!.href).toBe('/follow?author=name%3A%E4%BD%9C%E8%80%85');
    expect(groups.find(group => group.kind === 'author')!.items[0]!.subtitle).toBe('更新时间未取得');
    expect(groups.find(group => group.kind === 'performer')!.action).toBe('订阅新作');
    expect(groups.some(group => group.pending)).toBe(false);
  });
});
