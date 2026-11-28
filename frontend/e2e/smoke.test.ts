/* 每条主路由在桌面与 390×844 下都要守住的不变量。
 *
 * 这些是界面验收里每一轮都要重测的几何与运行期事实：写成用例之后由测试入口执行，
 * 浏览器面板只留给新布局首次成形和观感判断。新发现的同类问题先在这里补一条再修。
 *
 * 每条路由先等它自己的主体出现，再 settle、再量几何。报错、失败请求、横向溢出和等待态
 * 这几条在页面完全没渲染时全都成立，不写主体的话白屏也是绿的。主体按 `tests/test_web_e2e.py`
 * 生成的演示库写：12 条视频，没有播放列表和关注来源，这两页等到的是各自的空态。
 * 任务中心可能已有自动修复记录，主体认明确的任务空态或任务卡。
 * 女优、厂牌与标签的索引在一轮里会从空变成有：前面的路由打开过作品之后条目就出现了，
 * 所以索引页的主体是「条目或空态」二选一，不绑死其中一种。标题只能拿来认页面，不能单独
 * 当主体：管理页的 `[data-manage-title]` 由外壳先写好，内容区失败时它照样在。
 *
 * 分区 tab（`.ui-board-local-nav`）只显示当前那一格，其余面板不参与布局；每一格都切过去
 * 再测一遍，否则配置页「网络与访问」这类不在首屏的分区永远不会被量到。 */
import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';

import type { Browser, Locator, Page } from 'playwright-core';

import { configurationBody, expectBody, layout, launch, requiredEnv, settle, unmanagedScrollers, visit, VIEWPORTS } from './harness.ts';
import { mockJavDetail } from './jav-detail-fixture.ts';
import { CLEANUP_HASH_REDIRECTS } from '../src/cleanup-routes.ts';

interface Route {
  path: string;
  /** 目标页面主体：每个定位器都要可见。骨架屏的占位标题带 `aria-hidden`，按角色找不到。 */
  body(page: Page): Locator[];
}

const heading = (page: Page, scope: string, name: string): Locator =>
  page.locator(scope).getByRole('heading', { name, exact: true });
/* 数据管理二级页的卡片标题与页头同名；只认页头那一层 h2，React 卡片何时挂载都只匹配一个。 */
const pageTitle = (page: Page, name: string): Locator =>
  page.locator('#main').getByRole('heading', { name, exact: true, level: 2 });

const DESKTOP = VIEWPORTS.find((viewport) => !viewport.mobile)!;

/** 索引条目（`data-k`）或明确的空态，先出现哪个算哪个。两样都只有 React 那棵树画，
 * 壳铺的骨架一样都不带。选择器里就带 `:visible`：不然 `.first()` 可能落在一个隐藏的
 * 匹配上，等它可见等到超时，主体其实早画好了。 */
const indexEntries = (page: Page): Locator =>
  page.locator('#index [data-k]:visible, #index [data-empty-state]:visible').first();

/** 任务数据已渲染：明确空态或真实任务卡都属于任务页的 React 根。 */
const tasksBody = (page: Page): Locator[] => [
  heading(page, '#main', '任务中心'),
  page.locator('#stats .peach-react'),
  heading(page, '#stats .peach-react [data-empty-state]', '还没有任务记录')
    .or(page.locator('#stats .peach-react [data-run-id]:visible')).first(),
];

/** 统计页画完的标志：四张读数卡兼页签，第一张是馆藏。名字里还带读数和体积，按前缀匹配。 */
const statsInventoryTab = (page: Page): Locator =>
  page.locator('#stats').getByRole('tab', { name: /^馆藏视频/ });

const ROUTES: readonly Route[] = [
  { path: '/works/EXM-001', body: page => [page.locator('#stage [data-jav-detail] h1'), page.getByRole('img', { name: 'EXM-001 封面', exact: true })] },
  { path: '/jav', body: page => [heading(page, '#javLibraryHeader', 'JAV'), page.getByRole('tab', { name: '馆藏', exact: true, selected: true }), page.locator('#grid [data-media-card]:visible, #grid [data-media-empty]:visible').first()] },
  { path: '/jav?tab=discover', body: page => [heading(page, '#javLibraryHeader', 'JAV'), page.getByRole('tab', { name: '发现', exact: true, selected: true }), page.getByText('暂无匹配口味的作品', { exact: true })] },
  { path: '/jav?tab=wants', body: page => [heading(page, '#javLibraryHeader', 'JAV'), page.getByRole('tab', { name: '想要', exact: true, selected: true }), page.getByText('还没有想要的作品', { exact: true })] },
  { path: '/ai', body: page => [page.getByRole('heading', { name: 'AI 助手', exact: true }),
    page.getByRole('combobox', { name: '想查找或整理什么？' }),
    ...['看看最近入库的作品，再找几部馆藏外的作品', '找出最近入库、我还没看过的作品', '列出我已标记的作品，最近入库的排前面',
      '找出缺少中文译文的作品，按发行日期从新到旧排列'].map(name =>
      page.getByRole('group', { name: '演示案例' }).getByRole('button', { name, exact: true })),
    page.getByRole('button', { name: '展开对话记录', exact: true }).or(page.getByRole('complementary', { name: '对话记录', exact: true }))] },
  { path: '/', body: (page) => [page.locator('#grid [data-media-card]').first()] },
  { path: '/wall', body: (page) => [page.locator('[data-wall-tile]').first(), page.getByRole('button', { name: '退出播放墙' })] },
  { path: '/performers', body: (page) => [heading(page, '#index', '艺人'), indexEntries(page)] },
  { path: '/creators', body: (page) => [heading(page, '#index', '卖家'), indexEntries(page)] },
  { path: '/creators/', body: (page) => [heading(page, '#index', '卖家'), indexEntries(page)] },
  { path: '/performers?category=animation', body: (page) => [heading(page, '#index', '艺人'), indexEntries(page)] },
  { path: '/studios', body: (page) => [heading(page, '#index', '厂牌'), indexEntries(page)] },
  { path: '/agencies', body: (page) => [heading(page, '#index', '事务所'), indexEntries(page)] },
  { path: '/series', body: (page) => [heading(page, '#index', '系列'), indexEntries(page)] },
  { path: '/tags', body: (page) => [heading(page, '#index', '标签'), indexEntries(page)] },
  {
    path: '/playlists',
    body: (page) => [heading(page, '#stats', '播放列表'), heading(page, '#stats', '还没有播放列表')],
  },
  {
    path: '/follow',
    body: (page) => [heading(page, '#stats', '关注'), heading(page, '#stats', '还没有关注任何来源')],
  },
  {
    // 骨架里也有「关注列表」那一排分段，可整块带 `aria-hidden`；按角色找得到页签的只有真页面。
    path: '/subscriptions',
    body: (page) => [heading(page, '#main', '关注管理'),
      page.locator('#stats').getByRole('tab', { name: '添加关注', exact: true })],
  },
  {
    // 订阅管理链接进入统一关注列表。
    path: '/subscriptions?tab=feeds',
    body: (page) => [page.locator('#stats').getByRole('tab', { name: '关注列表', exact: true, selected: true }),
      heading(page, '#stats', '还没有关注来源')],
  },
  {
    path: '/subscriptions?tab=add',
    body: (page) => [page.locator('#stats').getByRole('region', { name: '添加创作者关注', exact: true }),
      page.locator('#stats').getByRole('region', { name: '添加 JAV 订阅', exact: true })],
  },
  {
    // 骨架里那条指标带也写着「馆藏视频」，认不出画完没有；只有真页面把四张读数卡做成页签。
    path: '/stats',
    body: (page) => [heading(page, '#main', '统计'), statsInventoryTab(page)],
  },
  {
    // 骨架那条指标带也写着「浏览记录」，认不出画完没有；把两套证据做成页签的只有真页面。
    path: '/taste',
    body: (page) => [heading(page, '#main', '口味'),
      page.locator('#stats').getByRole('tab', { name: '浏览器记录', exact: true })],
  },
  {
    // 骨架那一列分类也写着「复核分类」，认不出画完没有；把十个分类做成页签的只有真页面。
    path: '/review',
    body: (page) => [heading(page, '#main', '人工复核'),
      page.locator('#stats').getByRole('tab', { name: '元数据字段' })],
  },
  {
    path: '/data-cleanup',
    // 挂载前的遗留骨架用 heading，最终 React 卡片用带名字的 section；等最终语义才能证明挂载完成。
    body: (page) => [heading(page, '#main', '数据管理'),
      page.locator('#stats section[aria-label="扫描与采集"]'),
      page.locator('#cleanup-pending'), page.locator('#cleanup-maintenance'), page.locator('#cleanup-deletion')],
  },
  { path: '/data-cleanup/organize', body: page => [pageTitle(page, '整理文件'), page.locator('#stats #organize')] },
  { path: '/data-cleanup/media-repair', body: page => [pageTitle(page, '媒体修复'), page.locator('#stats section[aria-label="媒体修复"]')] },
  { path: '/data-cleanup/resource-sync', body: page => [pageTitle(page, '资源同步'), page.locator('#stats #resource-sync')] },
  { path: '/data-cleanup/orphan-records', body: page => [pageTitle(page, '文件已丢失的记录'), page.locator('#stats #orphan-records')] },
  { path: '/data-cleanup/links', body: page => [pageTitle(page, '链接管理'), page.locator('#stats #link-manager')] },
  { path: '/data-cleanup/batch-delete', body: page => [pageTitle(page, '批量删除'), page.locator('#stats #batch-delete')] },
  {
    // 演示库里没有垃圾候选，等到的是垃圾队列那一页的空态标题；壳铺的骨架只有卡片占位。
    path: '/junk-files',
    body: (page) => [heading(page, '#main', '垃圾文件'), heading(page, '#grid', '没有待判断的垃圾文件')],
  },
  {
    // 骨架的读数格只有「重复内容 · 」加一条微光；读数里写出组数的那一版有没有重复组都会画，只有真页面有。
    path: '/duplicates',
    body: (page) => [heading(page, '#main', '重复文件'),
      page.locator('#stats [data-duplicates-frame] [data-catalog-readout]', { hasText: /^重复内容 · \d+ 组/ })],
  },
  {
    // 旧直达地址进入资源同步二级页。
    path: '/resource-sync',
    body: (page) => [pageTitle(page, '资源同步'), page.locator('#stats section#resource-sync')],
  },
  {
    path: '/quality-goals',
    // 演示库里没有标记中的目标，等到的是空态那一句：它是真的标题元素，不是一段文字。
    body: (page) => [heading(page, '#main', '高清版'), heading(page, '#stats', '没有标记中的高清版目标')],
  },
  {
    // 「高清图片可能需要代理」那句遗留骨架里也有，认不出画完没有；「高清封面」那一张只有真页面有。
    path: '/sources',
    body: (page) => [heading(page, '#main', '来源和凭证'), page.locator('#stats form[aria-label="高清封面"]')],
  },
  // 名字对不上任何一家时要换成空态；骨架一直留着，读起来就是还在取。
  { path: '/agencies/不存在的事务所', body: (page) => [heading(page, '#index', '找不到这个事务所')] },
  { path: '/settings/library', body: configurationBody },
  { path: '/settings/ai', body: page => [page.getByRole('tab', { name: 'AI 接入', selected: true }),
    page.getByRole('navigation', { name: '本页目录', exact: true }).getByRole('link', { name: '任务与提示词', exact: true })
      .or(page.getByRole('button', { name: '本页目录', exact: true })),
    page.getByRole('form', { name: 'Claude', exact: true }), page.locator('#ai-usage').getByText('已计量请求', { exact: true })] },
  { path: '/diagnostics', body: page => [page.getByRole('tab', { name: '系统诊断', selected: true }), page.locator('#stats section[aria-label="库健康"]')] },
  { path: '/settings/diagnostics', body: page => [page.getByRole('tab', { name: '系统诊断', selected: true }), page.locator('#stats section[aria-label="库健康"]')] },
  { path: '/tasks', body: tasksBody },
  ...['', '/appearance', '/playback', '/jav', '/search', '/content'].map(section => ({ path: '/settings' + section,
    body: (page: Page) => [page.getByRole('dialog', { name: /外观与导航|浏览与播放|JAV 与新作|搜索与推荐|内容显示/ })] })),
  ...['subscriptions', 'downloads', 'network', 'maintenance'].map(section => ({ path: `/settings/${section}`, body: configurationBody })),
  { path: '/settings/maintenance/repairs', body: page => [pageTitle(page, '修复与迁移'), page.locator('#main [data-manage-crumb] a[href="/settings/maintenance"]'),
    page.locator('#stats section[aria-labelledby="repair-items"], #stats section[aria-labelledby^="repair-group-"]').first()] },
  {
    path: `/assets/${requiredEnv('PEACH_E2E_ITEM')}`,
    body: (page) => {
      const stage = page.getByRole('dialog', { name: '作品详情' });
      return [stage, stage.locator('video.vjs-tech')];
    },
  },
];

const LEGACY_ROUTES: readonly Route[] = [
  ...Object.entries(CLEANUP_HASH_REDIRECTS).map(([hash, path]) => ({
    path: '/data-cleanup' + hash, body: ROUTES.find(route => route.path === path)!.body,
  })),
  { path: '/subscriptions?tab=wants', body: ROUTES.find(route => route.path === '/jav?tab=wants')!.body },
  { path: '/subscriptions?tab=source', body: page => [page.locator('#stats form[aria-label="资源搜索"]')] },
];

async function assertHolds(page: Page, problems: string[], where: string): Promise<void> {
  assert.deepEqual(problems, [], `${where}：页面报错或有失败请求`);
  const box = await layout(page);
  assert.ok(box.scrollWidth <= box.viewportWidth,
    `${where}：横向溢出，scrollWidth ${box.scrollWidth} > 视口 ${box.viewportWidth}`);
  assert.deepEqual(box.offenders, [], `${where}：有元素越出视口右边缘`);
  assert.deepEqual(await unmanagedScrollers(page), [], `${where}：存在未接入统一实现的滚动区`);
  if (where === '/') {
    const images = await page.locator('img[loading="lazy"]').evaluateAll(nodes => ({
      count: nodes.length,
      missing: nodes.filter(node => !(Number(node.getAttribute('width')) > 0 && Number(node.getAttribute('height')) > 0))
        .map(node => node.getAttribute('src')),
    }));
    assert.ok(images.count > 0, '首页没有懒加载图片');
    assert.deepEqual(images.missing, [], '首页懒加载图片需要声明尺寸');
  }
}

describe('路由冒烟', () => {
  let browser: Browser;

  before(async () => {
    browser = await launch();
  });

  after(async () => {
    await browser.close();
  });

  it('AI 助手提交后自动查询馆藏，结果页仍可调整条件', { timeout: 30_000 }, async () => {
    const keyword = 'catalog-example';
    const efforts = ['default', 'low', 'high'];
    const defaultEfforts = { search: 'low' };
    let sent: unknown;
    const opened = await visit(browser, '/ai', DESKTOP, async page => {
      await page.route('**/api/libraries', route => route.fulfill({ json: { libraries: [{ id: 'fixture-library', name: 'Fixture library' }] } }));
      await page.route('**/api/ai-library/connections', route => route.fulfill({ json: { providers: [
        { id: 'openai', label: 'OpenAI', model: 'fixture-model', configured: true, efforts, default_efforts: defaultEfforts },
        { id: 'deepseek', label: 'DeepSeek', model: 'deepseek-flash', configured: true, efforts, default_efforts: defaultEfforts },
        { id: 'anthropic', label: 'Claude', model: 'claude-sonnet-5', configured: false, efforts, default_efforts: defaultEfforts },
      ] } }));
      await page.route('**/api/ai-library/search-models?provider=openai', route => route.fulfill({ json: { models: [
        { id: 'gpt-6.2-sol', label: 'GPT-6.2 Sol', efforts, default_efforts: defaultEfforts },
      ] } }));
      await page.route('**/api/ai-library/search-models?provider=deepseek', route => route.fulfill({ json: { models: [
        { id: 'deepseek-flash', label: 'DeepSeek Flash', efforts, default_efforts: defaultEfforts },
      ] } }));
      await page.route('**/api/ai-library/search-plan', route => {
        const request = route.request().postDataJSON();
        sent = request;
        if (request.query === 'Only show unwatched') {
          return route.fulfill({ json: { filters: { q: keyword, state: 'fresh' } } });
        }
        if (request.query === 'Translate DEMO-001 to English') {
          return route.fulfill({ json: { filters: {}, work: { kind: 'translate', target: 'DEMO-001', language: 'en' } } });
        }
        return route.fulfill({ json: { filters: { q: keyword, year: '2023' }, usage: { input_tokens: 31, output_tokens: 12 } } });
      });
      await page.route(url => url.pathname === '/api/items' && url.searchParams.get('q') === keyword
        && url.searchParams.get('year') === '2024' && url.searchParams.get('library') === 'fixture-library',
        route => route.fulfill({ json: { items: [{ id: 41, title: new URL(route.request().url()).searchParams.has('state')
          ? 'Unwatched fixture work' : 'Fixture work' }] } }));
      await page.route(url => url.pathname === '/api/items' && url.searchParams.get('q') === 'DEMO-001',
        route => route.fulfill({ json: { items: [{ id: 42, code: 'DEMO-001', title: 'Work to translate' }] } }));
    });
    try {
      const page = opened.page;
      await page.getByRole('main').getByRole('button', { name: /媒体库/ }).click();
      await page.getByRole('option', { name: 'Fixture library', exact: true }).click();
      await page.getByRole('button', { name: '模型', exact: true }).click();
      const choices = page.getByRole('dialog', { name: '模型', exact: true });
      const providers = choices.getByRole('radiogroup', { name: 'AI 服务', exact: true });
      assert.equal(await providers.getByRole('radio', { name: /Claude/ }).count(), 0);
      const setup = choices.locator('[data-ai-provider-setup]');
      await setup.getByRole('img', { name: 'Claude', exact: true }).waitFor({ state: 'visible' });
      await setup.getByRole('link', { name: '配置 AI 服务', exact: true }).waitFor({ state: 'visible' });
      await providers.getByText('DeepSeek', { exact: true }).click();
      await choices.getByText('DeepSeek Flash', { exact: true }).waitFor({ state: 'visible' });
      await providers.getByText('OpenAI · API Key', { exact: true }).click();
      await choices.getByText('GPT-6.2-Sol', { exact: true }).click();
      const effort = choices.getByRole('slider', { name: '思考强度' });
      await effort.press('End');
      await choices.locator('[data-effort-flow]').waitFor();
      await effort.press('ArrowLeft');
      await choices.locator('[data-effort-flow]').waitFor({ state: 'hidden' });
      await effort.press('End');
      await effort.press('Escape');
      assert.equal(await page.locator('[data-ai-composer-trigger="end"]').innerText(), 'GPT-6.2-Sol');
      await page.getByRole('button', { name: '查询条件', exact: true }).click();
      const conditions = page.getByRole('dialog', { name: '查询条件', exact: true });
      const yearRow = conditions.getByRole('button', { name: '发行年份', exact: true });
      assert.equal(await yearRow.evaluate(node => getComputedStyle(node).backgroundColor), 'rgba(0, 0, 0, 0)');
      await yearRow.click();
      await conditions.getByRole('button', { name: /不限.*发行年份/ }).click();
      await page.getByRole('option', { name: '2024', exact: true }).click();
      await conditions.getByRole('button', { name: /发行年份.*2024/ }).press('Escape');
      const composer = page.getByRole('combobox', { name: '想查找或整理什么？' });
      await composer.fill('Find the fixture work');
      await composer.press('Enter');
      await page.getByRole('link', { name: 'Fixture work' }).waitFor({ state: 'visible' });
      assert.equal(await composer.inputValue(), '');
      assert.deepEqual(sent, { query: 'Find the fixture work', scope: 'library', prompt_language: 'zh-CN',
        connection: { provider: 'openai', model: 'gpt-6.2-sol', effort: 'high' } });
      const usageButton = page.getByRole('button', { name: 'AI 用量', exact: true });
      await usageButton.click();
      const usage = page.getByRole('dialog', { name: 'AI 用量', exact: true });
      await usage.getByText('43', { exact: true }).waitFor({ state: 'visible' });
      await page.keyboard.press('Escape');
      const filter = page.getByRole('combobox', { name: '馆藏关键词或番号' });
      assert.equal(await filter.isVisible(), false);
      assert.equal(await page.locator('[data-ai-search-transcript] [data-search-step="library"]').count(), 1);
      await page.getByRole('button', { name: '查询条件', exact: true }).click();
      await conditions.getByRole('button', { name: /馆藏关键词或番号/ }).click();
      await filter.waitFor({ state: 'visible' });
      assert.equal(await filter.inputValue(), keyword);
      await filter.press('Escape');
      await composer.fill('Only show unwatched');
      await composer.press('Enter');
      await page.getByRole('link', { name: 'Unwatched fixture work' }).waitFor({ state: 'visible' });
      assert.deepEqual((sent as { previous_filters: unknown }).previous_filters, { q: keyword, year: '2024' });
      await composer.fill('Translate DEMO-001 to English');
      await composer.press('Enter');
      await page.getByRole('link', { name: 'Work to translate' }).waitFor({ state: 'visible' });
    } finally {
      await opened.close();
    }
  });

  it('模型显隐随连接保存，助手仍可使用隐藏的默认模型', { timeout: 45_000 }, async () => {
    const efforts = ['default', 'low'];
    const default_efforts = { search: 'low' };
    const models = [
      { id: 'fixture-default', label: 'Default fixture', efforts, default_efforts },
      { id: 'fixture-other', label: 'Other fixture', efforts, default_efforts },
      { id: 'fixture-third', label: 'Third fixture', efforts, default_efforts },
      { id: 'fixture-extra', label: 'Extra fixture', efforts, default_efforts },
    ];
    const opened = await visit(browser, '/settings/ai', DESKTOP, async page => {
      await page.emulateMedia({ reducedMotion: 'no-preference' });
      await page.route('**/api/ai-library/connections', route => route.fulfill({ json: { providers: [
        { id: 'openai', label: 'OpenAI', model: 'fixture-default', configured: true, efforts, default_efforts },
        { id: 'deepseek', label: 'DeepSeek', model: 'fixture-default', configured: true, efforts, default_efforts },
      ] } }));
      await page.route('**/api/ai-library/search-models?provider=*', route => route.fulfill({ json: { models } }));
    });
    try {
      const { page } = opened;
      const manage = page.getByRole('region', { name: 'OpenAI', exact: true })
        .getByRole('button', { name: '管理可见模型', exact: true });
      await manage.click();
      const editor = page.getByRole('dialog', { name: '管理可见模型', exact: true });
      await editor.getByRole('button', { name: '隐藏 Default fixture', exact: true }).click();
      await editor.getByRole('button', { name: '隐藏 Extra fixture', exact: true }).click();
      await editor.getByText('显示 2 / 4 个模型', { exact: true }).waitFor();
      await editor.getByRole('button', { name: '选择要添加的模型' }).click();
      await page.getByRole('option', { name: 'Extra fixture', exact: true }).click();
      await page.locator('[data-trigger="Select"]').waitFor({ state: 'detached' });
      await editor.getByRole('button', { name: '添加', exact: true }).click();
      const source = editor.getByRole('group', { name: 'Extra fixture', exact: true });
      const grip = source.locator('[data-sidebar-grip]');
      await grip.hover();
      const handle = (await grip.boundingBox())!;
      await page.mouse.down();
      await page.mouse.move(handle.x + handle.width / 2, handle.y + handle.height / 2 - 10);
      await source.and(page.locator('[data-dragging]')).waitFor();
      const target = await editor.getByRole('group', { name: 'Other fixture', exact: true }).evaluate((element: HTMLElement) => {
        const list = element.parentElement!.getBoundingClientRect();
        return { x: list.left + 40, y: list.top + element.offsetTop + element.offsetHeight * .25 };
      });
      await page.mouse.move(target.x, target.y, { steps: 8 });
      await editor.locator('[data-navigation-drag-preview]:popover-open').waitFor();
      await editor.locator('[data-navigation-drop-line]').waitFor();
      await page.mouse.up();
      await editor.getByRole('button', { name: '保存配置', exact: true }).click();
      await editor.waitFor({ state: 'hidden' });
      await page.locator('#drawer [data-sidebar-nav] [data-nav="ai"]').click();
      await page.locator('[data-ai-composer-trigger="end"]').click();
      const menu = page.getByRole('dialog', { name: '模型', exact: true });
      await menu.getByText('Other fixture', { exact: true }).waitFor();
      await menu.getByText('当前模型已隐藏，仍用于此对话', { exact: true }).waitFor();
      assert.equal(await menu.getByRole('radio', { name: 'Default fixture', exact: true }).count(), 0);
      assert.deepEqual(await menu.getByRole('radiogroup', { name: '模型', exact: true })
        .getByRole('radio').evaluateAll(rows => rows.map(row => (row as HTMLInputElement).value)),
      ['fixture-extra', 'fixture-other', 'fixture-third']);
      await menu.getByText('DeepSeek', { exact: true }).click();
      await menu.getByRole('radio', { name: 'Default fixture', exact: true }).waitFor();
    } finally {
      await opened.close();
    }
  });

  it('AI 助手无可用服务时在欢迎区显示配置主按钮', { timeout: 30_000 }, async () => {
    for (const status of [200, 403]) {
      const opened = await visit(browser, '/ai', DESKTOP, async page => {
        await page.route('**/api/ai-library/connections', route => route.fulfill({ status, json: status === 200
          ? { providers: [{ id: 'openai', label: 'OpenAI', configured: false }] }
          : { detail: { message: 'AI connection access denied' } } }));
      });
      try {
        const configure = opened.page.getByRole('link', { name: '配置 AI 服务', exact: true });
        await configure.waitFor({ state: 'visible' });
        assert.equal(await configure.getAttribute('href'), '/settings/ai');
        assert.ok(await configure.evaluate(node => node.classList.contains('bg-button-primary')));
      } finally {
        await opened.close();
      }
    }
  });

  it('AI 演示作品卡保留内边距，悬停只给标题加下划线', { timeout: 25_000 }, async () => {
    const opened = await visit(browser, '/ai', DESKTOP);
    try {
      const page = opened.page;
      await page.getByRole('button', { name: '看看最近入库的作品，再找几部馆藏外的作品', exact: true }).click();
      await page.locator('[data-ai-search-composer-motion="active"]').waitFor();
      assert.equal(await page.locator('[data-search-state="running"] [data-ai-search-thinking]').count(), 1);
      await page.getByRole('button', { name: '停止等待', exact: true }).click();
      await page.locator('[data-search-state="stopped"]').waitFor({ state: 'visible' });
      await page.getByRole('button', { name: '重播演示', exact: true }).click();
      assert.equal(await page.locator('[data-ai-search-results-loading]').count(), 0);
      const card = page.locator('[data-ai-search-source="external"] [data-ai-search-work]');
      const link = card.getByRole('link');
      await link.hover();
      const style = await link.evaluate(node => {
        const image = node.querySelector('img')!;
        const title = node.querySelector('[data-ai-search-work-title]')!;
        return {
          leftPadding: parseFloat(getComputedStyle(node).paddingInlineStart),
          decoration: getComputedStyle(node).textDecorationLine,
          titleDecoration: getComputedStyle(title).textDecorationLine,
          portrait: image.clientHeight > image.clientWidth,
        };
      });
      assert.ok(style.leftPadding > 0);
      assert.equal(style.decoration, 'none');
      assert.equal(style.titleDecoration, 'underline');
      assert.equal(style.portrait, true);
    } finally {
      await opened.close();
    }
  });

  it('在 AI 助手直接显示译文候选或配置入口', { timeout: 30_000 }, async () => {
    for (const configured of [false, true]) {
      const requests: unknown[] = [];
      const opened = await visit(browser, '/ai', DESKTOP, async page => {
        await page.route('**/api/ai-library/connections', route => route.fulfill({ json: { providers: [
          { id: 'openai', label: 'OpenAI', model: 'fixture-model', configured },
        ] } }));
        await page.route(url => url.pathname === '/api/items' && url.searchParams.get('limit') === '24',
          route => route.fulfill({ json: { items: [
            { id: 41, title: 'Fixture work', code: 'FIX-041', is_jav: true },
            { id: 42, title: 'Fixture work', code: 'FIX-041', is_jav: true },
          ] } }));
        await page.route('**/api/ai-library/assets/41', route => {
          if (route.request().method() === 'GET') return route.fulfill({ json: { translations: [], official_samples: 0 } });
          requests.push(route.request().postDataJSON());
          return route.fulfill({ json: { task: 'translate', title: 'Fixture translation', token: 'fixture' } });
        });
      });
      try {
        const page = opened.page;
        await page.getByRole('button', { name: '帮我翻译一部作品', exact: true }).click();
        const replay = page.getByRole('button', { name: '重播演示', exact: true });
        await replay.waitFor({ state: 'visible' });
        const demo = page.getByRole('region', { name: '演示案例', exact: true });
        await demo.getByRole('link', { name: /FIRST IMPRESSION 184/ }).waitFor({ state: 'visible' });
        await demo.getByText('天音ミシェル', { exact: true }).waitFor({ state: 'visible' });
        assert.equal(await demo.getByRole('img').evaluate(image => (image as HTMLImageElement).naturalWidth > 0), true);
        const sampleTranslation = await demo.getByRole('textbox', { name: '译文标题', exact: true }).inputValue();
        assert.match(sampleTranslation, /FIRST IMPRESSION 184.*天音ミシェル/);
        assert.deepEqual(requests, []);
        assert.equal(await page.getByRole('button', { name: '开始任务', exact: true }).count(), 0);
        await replay.click();
        await demo.getByRole('heading', { name: 'AI 生成的结果', exact: true }).waitFor({ state: 'hidden' });
        await replay.waitFor({ state: 'visible' });
        await page.getByRole('button', { name: '返回 AI 助手', exact: true }).click();
        await page.getByRole('button', { name: '馆藏工具', exact: true }).click();
        await page.getByRole('menuitem', { name: '帮我翻译一部作品', exact: true }).click();
        await page.getByRole('button', { name: '翻译标题和简介', exact: true }).click();
        const result = page.getByRole('region', { name: '翻译标题和简介', exact: true });
        if (configured) {
          const translated = result.getByRole('textbox', { name: '译文标题', exact: true });
          await translated.waitFor({ state: 'visible' });
          assert.equal(await translated.inputValue(), 'Fixture translation');
          assert.deepEqual(requests, [{ task: 'translate', language: 'zh-CN', prompt_language: 'zh-CN' }]);
        } else {
          await result.getByRole('link', { name: '配置 AI 服务', exact: true }).waitFor({ state: 'visible' });
          assert.deepEqual(requests, []);
        }
        assert.equal(await page.getByRole('dialog', { name: 'AI 助手', exact: true }).count(), 0);
      } finally {
        await opened.close();
      }
    }
  });

  it('ChatGPT 授权回执可以手动返回，也会自动返回订阅设置', { timeout: 30_000 }, async () => {
    const path = '/settings/ai/authorization';
    const settings = /\/settings\/ai\?connection=chatgpt$/;
    const opened = await visit(browser, path, DESKTOP);
    try {
      const page = opened.page;
      const heading = page.getByRole('heading', { name: 'ChatGPT 授权未完成', exact: true });
      await heading.waitFor({ state: 'visible' });
      await page.getByRole('link', { name: '返回 Peach', exact: true }).click();
      await page.waitForURL(settings);
      const method = page.getByRole('tab', { name: 'ChatGPT 订阅', exact: true, selected: true });
      await method.waitFor({ state: 'visible' });
      await page.goto(requiredEnv('PEACH_E2E_ORIGIN') + path);
      await heading.waitFor({ state: 'visible' });
      await page.waitForURL(settings);
      await method.waitFor({ state: 'visible' });
    } finally {
      await opened.close();
    }
  });

  it('ChatGPT 待授权的外链沿用主按钮的文字颜色、内边距和圆角', { timeout: 30_000 }, async () => {
    let status = 'disconnected';
    const opened = await visit(browser, '/settings/ai', DESKTOP, async page => {
      await page.route('**/api/ai-library/connections', route => route.fulfill({ json: { providers: [
        { id: 'openai', label: 'OpenAI', model: 'fixture-model', configured: false },
        { id: 'openai-oauth', label: 'ChatGPT', model: 'fixture-model', configured: false, status },
      ] } }));
      await page.route('**/api/ai-library/openai/oauth', route => {
        status = 'pending';
        return route.fulfill({ json: { status, authorization_url: 'https://example.test/authorize' } });
      });
    });
    try {
      const colorAndShape = (node: Element) => {
        const { color, borderRadius, paddingInlineStart } = getComputedStyle(node);
        return { color, borderRadius, paddingInlineStart };
      };
      await opened.page.getByRole('tab', { name: 'ChatGPT 订阅', exact: true }).click();
      const start = opened.page.getByRole('button', { name: '连接 ChatGPT 订阅', exact: true });
      const expected = await start.evaluate(colorAndShape);
      await start.click();
      const link = opened.page.getByRole('link', { name: '前往 ChatGPT 授权', exact: true });
      assert.deepEqual(await link.evaluate(colorAndShape), expected);
      assert.equal(await link.getAttribute('target'), '_blank');
    } finally {
      await opened.close();
    }
  });

  it('入库 toast 打开真实详情，标题使用番号或文件名，返回与前进恢复对应页面', { timeout: 60_000 }, async () => {
    const id = Number(requiredEnv('PEACH_E2E_ITEM'));
    let items: Array<{ id: number; kind: string; asset_id: number; label: string; at: number }> = [];
    let reads = 0;
    const opened = await visit(browser, '/stats', DESKTOP, async page => {
      await page.route('**/api/result-updates', route => {
        reads += 1;
        return route.fulfill({ json: { ok: true, busy: true, result_versions: {}, ingest_notices: { epoch: 'toast-navigation', items } } });
      });
    });
    try {
      await expectBody(opened.page, '/stats', [statsInventoryTab(opened.page)]);
      await opened.page.waitForFunction(() => document.title === '统计 · Peach');
      assert.ok(reads > 0, '通知基线没有读取');
      const response = await opened.page.request.get(`${requiredEnv('PEACH_E2E_ORIGIN')}/api/item?id=${id}`);
      const item = await response.json();
      const label = [item.display_code, item.code, item.name].map(value => String(value || '').trim()).find(Boolean);
      assert.ok(label, '样本作品缺少番号与文件名');
      items = [{ id: 1, kind: 'download', asset_id: id, label, at: 0 }];
      const open = opened.page.locator('[data-sonner-toast]').filter({ hasText: '已入库并整理完成' }).getByRole('button', { name: '打开', exact: true });
      await open.click({ timeout: 15_000 });
      const stage = opened.page.getByRole('dialog', { name: '作品详情', exact: true });
      await stage.locator('[data-item-detail] [data-item-title]').waitFor({ state: 'visible' });
      assert.equal(new URL(opened.page.url()).pathname, `/assets/${id}`);
      await opened.page.waitForFunction(expected => document.title === expected, `${label} · Peach`);
      await opened.page.goBack();
      await statsInventoryTab(opened.page).waitFor({ state: 'visible' });
      await opened.page.waitForFunction(() => document.title === '统计 · Peach');
      await opened.page.goForward();
      await stage.locator('[data-item-detail] [data-item-title]').waitFor({ state: 'visible' });
      await opened.page.waitForFunction(expected => document.title === expected, `${label} · Peach`);
    } finally { await opened.close() }
  });

  for (const viewport of VIEWPORTS) {
    for (const route of [...ROUTES, ...LEGACY_ROUTES]) {
      // 单条超时远小于 Python 侧的整轮超时：卡住的那一条自己报名字，不拖垮整轮输出。
      it(`${route.path} @ ${viewport.name}`, { timeout: 60_000 }, async () => {
        const opened = await visit(browser, route.path.startsWith('/works/') ? '/stats' : route.path, viewport);
        try {
          if (route.path.startsWith('/works/')) {
            await mockJavDetail(opened.page);
            await opened.page.goto(requiredEnv('PEACH_E2E_ORIGIN') + route.path);
          }
          await expectBody(opened.page, route.path, route.body(opened.page));
          await settle(opened.page);
          await assertHolds(opened.page, opened.problems, route.path);
          // 设置浮层的那一排 tab 常驻 DOM、关着时不可见；只点页面上看得见的那一排。
          const tabs = opened.page.locator('.ui-board-local-nav [role="tab"]:visible');
          const count = await tabs.count();
          // 选择器一旦对不上，循环一格都不跑也照样绿；配置页至少有媒体、网络与访问、维护三格。
          if (route.path === '/settings/library') assert.ok(count >= 3, `配置页只看到 ${count} 个分区 tab`);
          for (let index = 0; index < count; index += 1) {
            const tab = tabs.nth(index);
            const name = (await tab.textContent())?.trim() || `第 ${index + 1} 格`;
            await tab.click({ timeout: 5_000 });
            await settle(opened.page);
            assert.equal(await tab.getAttribute('aria-selected'), 'true', `${route.path}「${name}」点了没有选中`);
            await assertHolds(opened.page, opened.problems, `${route.path}「${name}」`);
          }
        } finally {
          await opened.close();
        }
      });
    }
  }

  /* 任务页读完整任务列表，常驻的结果更新只读轻量版本：离页卸掉任务页后不再读任务列表，
     结果更新继续低频读取。固定空态让轮询保持十秒间隔；回到任务页前撤掉拦截，再读取服务端真实任务。
     换页走 pushState + popstate：侧栏按钮、抽屉和浏览器后退最后走的都是这一条路。 */
  it('离开任务页卸载旧根，全局结果轮询持续，返回读取真实任务', { timeout: 120_000 }, async () => {
    const polls: number[] = [];
    const updates: number[] = [];
    const opened = await visit(browser, '/tasks', DESKTOP, async (page) => {
      await page.route('**/api/tasks', route => route.fulfill({ json: {
        available: true, running: [], skipped: [], finished: [], finished_has_more: false,
      } }));
      await page.route('**/api/result-updates', route => route.fulfill({ json: {
        ok: true, busy: false, result_versions: {}, ingest_notices: { epoch: 'smoke', items: [] },
      } }));
      page.on('request', (request) => {
        const path = new URL(request.url()).pathname;
        if (path === '/api/tasks') polls.push(performance.now());
        if (path === '/api/result-updates') updates.push(performance.now());
      });
    });
    try {
      const waitForPolls = async (least: number, what: string) => {
        for (let step = 0; step < 80; step += 1) {
          if (polls.length >= least) return;
          await opened.page.waitForTimeout(250);
        }
        assert.ok(polls.length >= least, `${what}：只看到 ${polls.length} 次 /api/tasks，要 ${least} 次`);
      };
      await expectBody(opened.page, '/tasks', tasksBody(opened.page));
      // 先取得首屏与下一次轮询，离页后才能核对共享查询的节律。
      await waitForPolls(2, '活动页的轮询没有跑起来');
      const taskRoot = await opened.page.locator('#stats .peach-react').elementHandle();
      assert.ok(taskRoot, '任务页的 React 根没有挂载');

      await opened.page.evaluate(() => {
        history.pushState({}, '', '/stats');
        window.dispatchEvent(new PopStateEvent('popstate'));
      });
      await expectBody(opened.page, '/stats', [statsInventoryTab(opened.page)]);
      await settle(opened.page);
      const leftAt = polls.length;
      const updatesAt = updates.length;
      // 统计页自己也是 React 档：管理区正文里应当只剩它那一棵根。
      assert.equal(await opened.page.locator('#stats .peach-react').count(), 1,
        '管理区正文里不是只剩统计页那一棵 React 根');
      assert.equal(await taskRoot.evaluate(root => root.isConnected), false,
        '换页之后活动页的 React 根还留在文档里');
      await taskRoot.dispose();
      // 十二秒覆盖一次十秒轮询；允许观察窗口跨过两次，但每次必须至少相隔八秒。
      // 两秒余量容纳导航与计时误差，也能拒绝活跃任务的两秒节律或并行的重复请求。
      await opened.page.waitForTimeout(12_000);
      // 离开任务页后，全局轮询只读轻量的结果版本，不再组装整张任务列表。
      assert.equal(polls.length, leftAt, `离开任务页后仍在读取完整任务列表：${polls.length - leftAt} 次`);
      const continued = updates.slice(updatesAt);
      assert.ok(continued.length >= 1 && continued.length <= 2,
        `离开任务页后全局结果轮询应持续单路低频读取，十二秒内看到 ${continued.length} 次请求`);
      for (let index = Math.max(1, updatesAt); index < updates.length; index += 1) {
        assert.ok(updates[index] - updates[index - 1] >= 8_000,
          `全局结果轮询间隔过短：${Math.round(updates[index] - updates[index - 1])}ms`);
      }

      await opened.page.unroute('**/api/tasks');
      const beforeReturn = polls.length;
      const returningTasks = opened.page.waitForResponse(response =>
        new URL(response.url()).pathname === '/api/tasks' && response.status() === 200);
      await opened.page.goBack();
      await returningTasks;
      await expectBody(opened.page, '/tasks', tasksBody(opened.page));
      await waitForPolls(beforeReturn + 2, '回到任务页之后真实任务轮询没有接上');
      await assertHolds(opened.page, opened.problems, '/tasks 换页往返');
    } finally {
      await opened.close();
    }
  });

  /* 首页那一行新作只属于目录页：从首页进统计页要收起保留，取数还没回来就离开的那一轮
     也不许回头把它画到管理区上。演示库没有订阅，新作由拦截的接口给一条。 */
  it('离开首页之后新作那一行收起，晚到的取数也不画回来', { timeout: 60_000 }, async () => {
    const opened = await visit(browser, '/stats', DESKTOP);
    try {
      let hold: Promise<void> | null = null;
      let served = 0;
      await opened.page.route(/\/api\/feeds\/discoveries\?/, async (route) => {
        if (hold) await hold;
        // 请求可能已随换页撤掉，那时回包会报错；要核对的只是回包之后页面长什么样。
        await route.fulfill({ json: { ok: true, more: false, items: [{
          id: 1, code: 'MCSR-191', title: 'MCSR-191 示例作品', link: null, cover_url: null,
          has_cover: false, cover_frame: null, poster_box: null, release_date: '2025-07-19',
          studio: null, performers: null, read: false, ignored: false, scrape_error: null,
        }] } }).catch(() => undefined);
        served += 1;
      });
      const go = (path: string) => opened.page.evaluate((target) => {
        history.pushState({}, '', target);
        window.dispatchEvent(new PopStateEvent('popstate'));
      }, path);
      const feedCards = opened.page.locator('#feedNew article.feednewcard');
      await expectBody(opened.page, '/stats', [statsInventoryTab(opened.page)]);

      await go('/');
      await expectBody(opened.page, '/', [feedCards.first()]);
      await go('/stats');
      await expectBody(opened.page, '/stats', [statsInventoryTab(opened.page)]);
      assert.equal(await opened.page.locator('#feedNew').isHidden(), true, '进统计页之后新作那一行还露着');
      assert.equal(await feedCards.filter({ visible: true }).count(), 0, '进统计页之后新作卡片仍可见');

      const beforeReturn = served;
      await go('/');
      await expectBody(opened.page, '/', [feedCards.first()]);
      assert.equal(served, beforeReturn + 1, '返回首页读取最新新作');
      await go('/junk-files');
      await opened.page.locator('#count [data-junk-filters]').waitFor();
      assert.equal(await opened.page.locator('#feedNew').isHidden(), true, '垃圾文件页不展示订阅新作');
      assert.equal(await feedCards.filter({ visible: true }).count(), 0);

      for (const target of ['/stats', '/junk-files']) {
        hold = null;
        const reloadPath = new URL(opened.page.url()).pathname;
        await opened.page.reload({ waitUntil: 'load' });
        await expectBody(opened.page, reloadPath, [reloadPath === '/stats'
          ? statsInventoryTab(opened.page) : opened.page.locator('#count [data-junk-filters]')]);
        let release!: () => void;
        hold = new Promise((resolve) => { release = resolve; });
        const asked = opened.page.waitForRequest(/\/api\/feeds\/discoveries\?/);
        await go('/');
        await asked;
        await go(target);
        const body = target === '/stats' ? statsInventoryTab(opened.page) : opened.page.locator('#count [data-junk-filters]');
        await expectBody(opened.page, target, [body]);
        const before = served;
        release();
        for (let step = 0; step < 40 && served === before; step += 1) await opened.page.waitForTimeout(100);
        assert.ok(served > before, '压住的那一次新作取数没有放行');
        // 回包之后页面只剩一次同步重画；目录区的旧加载态不属于当前页面。
        await opened.page.waitForTimeout(500);
        assert.equal(await opened.page.locator('#feedNew').isHidden(), true);
        assert.equal(await feedCards.filter({ visible: true }).count(), 0, `晚到的新作取数画到了 ${target} 上`);
        await assertHolds(opened.page, opened.problems, `首页与 ${target} 往返`);
      }
    } finally {
      await opened.close();
    }
  });

  /* 还没装进本机的新作只有来源给的封套地址，没有边车。贴右缘的话 0.75 的卡片比正封宽，
     左边带进一条书脊；按正封先验比例 0.704 从右缘量回去才只剩正封。 */
  it('远程封套按正封先验比例切，不带进书脊', { timeout: 60_000 }, async () => {
    const opened = await visit(browser, '/stats', DESKTOP);
    try {
      await expectBody(opened.page, '/stats', [statsInventoryTab(opened.page)]);
      const remote = 'https://covers.example.test/sleeve.svg';
      await opened.page.route('**/cover-image?code=ABF-348', (route) => route.fulfill({
        contentType: 'image/svg+xml',
        body: '<svg xmlns="http://www.w3.org/2000/svg" width="1500" height="1000">'
          + '<rect width="1500" height="1000" fill="#888"/></svg>',
      }));
      await opened.page.route(/\/api\/feeds\/discoveries\?/, (route) => route.fulfill({ json: {
        ok: true, more: false, items: [{
          id: 1, code: 'ABF-348', title: 'ABF-348 示例作品', link: null, cover_url: remote,
          has_cover: false, cover_frame: null, poster_box: null, release_date: '2026-09-30',
          studio: null, performers: null, read: false, ignored: false, scrape_error: null,
        }] } }));
      await opened.page.evaluate(() => {
        history.pushState({}, '', '/');
        window.dispatchEvent(new PopStateEvent('popstate'));
      });
      const cover = opened.page.locator('#feedNew img.cover.panel');
      await expectBody(opened.page, '/', [cover]);
      // 1500×1000 的封套，正封宽 704，左缘在 796 列：切掉左边 53.07%，右缘不动。
      assert.equal(await cover.evaluate((img) => img.style.getPropertyValue('--panel-clip')),
        '0% 0% 0% 53.07%');
    } finally {
      await opened.close();
    }
  });

  /* 最近一轮取封面断在连接上、这一行又还有没封面的卡时，行上方挂一条 Note 指去采集页。
     一排「无封面」自己说不清是官方没出还是线路不通。 */
  it('封面连不上图片主机时新作那一行上方指去配连接方式', { timeout: 60_000 }, async () => {
    const opened = await visit(browser, '/stats', DESKTOP);
    try {
      await opened.page.route(/\/api\/feeds\/discoveries\?/, (route) => route.fulfill({ json: {
        ok: true, more: false, cover_network: 3, items: [{
          id: 1, code: 'MCSR-191', title: 'MCSR-191 示例作品', link: null, cover_url: null,
          has_cover: false, cover_frame: null, poster_box: null, release_date: '2025-07-19',
          studio: null, performers: null, read: false, ignored: false, scrape_error: null,
        }] } }));
      await opened.page.evaluate(() => {
        history.pushState({}, '', '/');
        window.dispatchEvent(new PopStateEvent('popstate'));
      });
      const note = opened.page.locator('#feedNew .feednetwork');
      await expectBody(opened.page, '/', [note]);
      assert.match(await note.innerText(), /3 部新作的封面连不上 DMM 图片主机/);
      assert.equal(await note.locator('a').getAttribute('href'), '/sources');
      await assertHolds(opened.page, opened.problems, '新作连不上图片主机的提示');
    } finally {
      await opened.close();
    }
  });
});
