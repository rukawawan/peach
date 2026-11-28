import type { Page } from 'playwright-core';
import type { FeedNewItem } from '../src/react/feed-new/feed-new.ts';

/** 让首页的新作骨架和实际条目使用同一份测试数据。 */
export async function stubHomeDiscoveries<Item extends FeedNewItem>(page: Page, items: readonly Item[]): Promise<void> {
  await page.route(url => url.pathname === '/api/entity/shapes', async route => {
    const response = await route.fetch();
    if (!response.ok()) return route.fulfill({ response });
    const data = await response.json();
    return route.fulfill({ response, json: { ...data, home: { ...data.home, feed: items.length > 0 } } });
  });
  await page.route(url => url.pathname === '/api/feeds/discoveries' && !url.searchParams.has('entity'), route =>
    route.fulfill({ json: { ok: true, items } }));
}
