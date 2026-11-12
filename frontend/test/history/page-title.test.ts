import { expect, it } from 'vitest';
import { homeRouteLabel, mediaRouteLabel, postRouteLabel, presentPost } from '../../src/history/page-title';
import { registerResponseEntities } from '../../src/core/entity-links';
import { routeMetaOf } from '../../src/history/route-meta';

it('详情标签页优先显示番号，没有番号时保留文件名', () => {
  expect(mediaRouteLabel('/assets/1', { id: 1, display_code: ' DASD-911 ', code: 'DASD-00911', name: 'video.mp4' }))
    .toBe('DASD-911');
  expect(mediaRouteLabel('/assets/1', { id: 1, display_code: ' ', code: 'ABP-616', name: 'video.mp4' })).toBe('ABP-616');
  expect(mediaRouteLabel('/assets/1', { id: 1, name: '我的视频.mp4' })).toBe('我的视频.mp4');
  expect(mediaRouteLabel('/works/abw-032', null)).toBe('ABW-032');
});

it('换页及另一条详情读取期间不沿用上一条的身份', () => {
  expect(mediaRouteLabel('/assets/2', { id: 1, code: 'ABP-616' })).toBe('');
  expect(mediaRouteLabel('/tasks', { id: 1, code: 'ABP-616' })).toBe('');
  expect(mediaRouteLabel('/assets/1', null)).toBe('');
});

it('首页三栏与搜索结果各有自己的标签，其他地址交给路由登记', () => {
  expect(homeRouteLabel('/', '?jav=1')).toBe('JAV');
  expect(homeRouteLabel('/', '?orient=%E7%AB%96%E5%B1%8F')).toBe('竖屏');
  expect(homeRouteLabel('/', '?jav=1&q=%20abp%20')).toBe('搜索 abp');
  expect(homeRouteLabel('/', '')).toBe('');
  expect(homeRouteLabel('/unseen', '?jav=1')).toBe('');
  expect(routeMetaOf('/trash')?.title).toBe('回收站');
});

it('按 ID 直达的资料页取到资料后标签是名字，取到之前不猜', () => {
  expect(routeMetaOf('/performers/987654')?.title).toBe('资料');
  registerResponseEntities('/api/entity?kind=performer&id=987654', { id: 987654, kind: 'performer', canonical_name: '月野江すい' });
  expect(routeMetaOf('/performers/987654')?.title).toBe('月野江すい');
});

it('关注详情只认当前地址那一条，没有标题时用作者', () => {
  presentPost(5, ' ', 'Kou');
  expect(postRouteLabel('/posts/5')).toBe('Kou');
  expect(postRouteLabel('/posts/6')).toBe('');
  presentPost(6, '新作预告');
  expect(postRouteLabel('/posts/6')).toBe('新作预告');
});
