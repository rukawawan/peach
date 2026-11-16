/* 服务端文字的解析（ADR-0156 第三条）：按 message_code 取译文，没有译文回落到原文；
 * 取数入口换好的原因再经过 requestErrorMessage 不会被按状态码换掉。英文界面才看得出这两件事，所以按英文加载。 */
import { afterEach, describe, expect, it, vi } from 'vitest';

import { SETTINGS_KEY } from '../src/settings-key';
import enServer from '../../resources/locales/en/server.json' with { type: 'json' };
import enShell from '../../resources/locales/en/shell.json' with { type: 'json' };

async function load(language: 'en' | 'zh-CN') {
  vi.resetModules();
  localStorage.setItem(SETTINGS_KEY, JSON.stringify({ interfaceLanguage: language }));
  vi.doMock('../../resources/locales/en/server.json', () => ({
    default: { ...enServer, sample: { withParams: 'Peach found {{count}} files in {{folder}}.' } },
  }));
  const [server, request, api, core] = await Promise.all([
    import('../src/core/server-text'), import('../src/core/request-error'), import('../src/api'), import('../src/core'),
  ]);
  return { ...server, ...request, ...api, legacyApi: core.api };
}

const respond = (status: number, body: unknown) => vi.fn(async () => new Response(JSON.stringify(body), {
  status, headers: { 'Content-Type': 'application/json' },
}));

afterEach(() => {
  localStorage.removeItem(SETTINGS_KEY);
  vi.unstubAllGlobals();
  vi.doUnmock('../../resources/locales/en/server.json');
  vi.resetModules();
});

describe('serverText', () => {
  it('有 code 且有译文时用当前界面语言，参数填进占位', async () => {
    const { serverText } = await load('en');
    expect(serverText({ error: '这个地址下没有页面。', message_code: 'http.notFound', message_params: {} }))
      .toBe(enServer.http.notFound);
    expect(serverText({ message: '在 R:\\media 找到 3 个文件。', message_code: 'sample.withParams', message_params: { count: 3, folder: 'R:\\media' } }))
      .toBe('Peach found 3 files in R:\\media.');
  });

  it('code 没有译文时显示服务端原文，不显示键名', async () => {
    const { serverText, serverLabel } = await load('en');
    expect(serverText({ error: '整理路径不在所选来源内', message_code: 'organize.notYetTranslated' })).toBe('整理路径不在所选来源内');
    expect(serverLabel('release.installation.unknown', '源码运行')).toBe('源码运行');
  });

  it('没带 code 的原文只有中文才显示，英文协议值交给状态码', async () => {
    const { serverText } = await load('en');
    expect(serverText({ error: '媒体盘没有挂载' })).toBe('媒体盘没有挂载');
    expect(serverText({ error: 'not found' })).toBe('');
    expect(serverText(null)).toBe('');
  });
});

describe('jobText', () => {
  it('后台任务的进度说明与失败原因各按自己的 code 取译文，没有 code 照原文', async () => {
    const { jobText } = await load('en');
    const state = {
      message: '在 R:\\media 找到 3 个文件。', message_code: 'sample.withParams', message_params: { count: 3, folder: 'R:\\media' },
      error: '这个地址下没有页面。', error_code: 'http.notFound', error_params: {},
    };
    expect(jobText(state)).toBe('Peach found 3 files in R:\\media.');
    expect(jobText(state, 'error')).toBe(enServer.http.notFound);
    expect(jobText({ message: '正在准备', message_code: '' })).toBe('正在准备');
    expect(jobText(null, 'error')).toBe('');
  });
});

describe('codedText 与字段错误', () => {
  it('同层的 `<键>_code` 有译文就用译文，没有 code 照原句', async () => {
    const { codedText } = await load('en');
    expect(codedText({ notice: '这个部署由配置文件管理服务；在本机编辑下方的设置文件。',
      notice_code: 'labels.configuration.fileManagedNotice' }, 'notice')).toBe(enServer.labels.configuration.fileManagedNotice);
    expect(codedText({ notice: '旧服务端的原句' }, 'notice')).toBe('旧服务端的原句');
    expect(codedText({ notice: '缺译文的原句', notice_code: 'labels.configuration.noSuchKey' }, 'notice')).toBe('缺译文的原句');
  });

  it('逐字段错误按同形的 error_codes 换成英文，列表字段逐行对齐', async () => {
    const { bodyFieldErrors } = await load('en');
    const body = {
      errors: { media_dirs: ['', '和上面的 /a 重复了', '没有 code 的原句'], port: '端口要是 1 到 65535 之间的整数' },
      error_codes: { media_dirs: [null, { code: 'errors.onboarding.mediaDirDuplicate', params: { other: '/a' } }, null],
        port: { code: 'errors.onboarding.portInvalid', params: {} } },
    };
    expect(bodyFieldErrors(body)).toEqual({
      media_dirs: ['', 'Duplicates /a above', '没有 code 的原句'], port: enServer.errors.onboarding.portInvalid,
    });
    expect(bodyFieldErrors({ errors: { target: '旧服务端只给原句' } })).toEqual({ target: '旧服务端只给原句' });
    expect(bodyFieldErrors({ error: '没有字段错误' })).toBeUndefined();
  });
});

describe('嵌套参数与列表参数', () => {
  it('参数是另一句带 code 的话时按同一语言渲染，列表按界面的列表分隔符连', async () => {
    const { serverLabel } = await load('en');
    const params = { action: { code: 'labels.downloadsClouddrive.action.findTarget' }, details: 'timeout' };
    expect(serverLabel('errors.downloadsClouddrive.unreachable', '查找目标目录时连不上 CloudDrive2：timeout', params))
      .toBe('Cannot reach CloudDrive2 while finding the target directory: timeout');
    expect(serverLabel('sample.withParams', '原文', { count: 2, folder: ['R:', 'S:'] })).toBe('Peach found 2 files in R:, S:.');
  });

  it('中文界面与服务端渲染的原句逐字相同', async () => {
    const { serverLabel } = await load('zh-CN');
    expect(serverLabel('errors.downloadsClouddrive.callFailed', '',
      { action: { code: 'labels.downloadsClouddrive.action.readCacheDir', params: {} }, details: 'x' })).toBe('读取缓存目录失败：x');
  });

  it('嵌套的那句缺译文时整句用服务端原文', async () => {
    const { serverLabel } = await load('en');
    expect(serverLabel('errors.downloadsClouddrive.unreachable', '整句原文',
      { action: { code: 'labels.notYetTranslated' }, details: 'x' })).toBe('整句原文');
  });
});

describe('按段与并行的服务端文字', () => {
  it('partsLabel 逐段取译文，原样给的 text 段照接，缺一段译文整句用原文', async () => {
    const { partsLabel } = await load('en');
    expect(partsLabel([{ code: 'sample.withParams', params: { count: 1, folder: 'R:' } }, { text: ' 原样' }], '原文'))
      .toBe('Peach found 1 files in R:. 原样');
    expect(partsLabel([{ code: 'http.notFound' }, { code: 'outcome.notYetTranslated' }], '原文')).toBe('原文');
    expect(partsLabel(undefined, '原文')).toBe('原文');
    expect(partsLabel([{ other: 1 }], '原文')).toBe('原文');
  });

  it('口味总结的一句：嵌着的维度名取译文，标签名原样按列表连', async () => {
    const { codedText } = await load('en');
    expect(codedText({
      headline: '浏览兴趣以足系为主，Peach 中稳定出现巨乳、美乳。', headline_code: 'taste.headline.browserAndPeach',
      headline_params: { category: { code: 'taste.category.feet', params: {}, text: '足系' }, tags: ['巨乳', '美乳'] },
    }, 'headline')).toBe('Your browsing centers on Feet, and 巨乳, 美乳 show up steadily in Peach.');
    expect(codedText({ label: '资源盘 2', label_code: 'taste.volume.local.numbered', label_params: { index: 2 } }, 'label'))
      .toBe('Media drive 2');
  });

  it('serverLabelList 按并行的 code 与参数重排，缺 code 的项照原文', async () => {
    const { serverLabelList } = await load('en');
    expect(serverLabelList(['标签偏好：恋足（浏览记录）', '旧版理由'], ['taste.reason.line'], [{
      dimension: { code: 'taste.dimension.tag', text: '标签偏好' }, names: ['恋足'],
      sources: [{ code: 'taste.evidence.browsing', text: '浏览记录' }],
    }])).toEqual(['Tag preference: 恋足 (Browsing history)', '旧版理由']);
  });
});

describe('partsText', () => {
  it('按段存的结论逐段取当前语言，嵌套的原因与改写过的参数一并填进去', async () => {
    const { partsText } = await load('en');
    const parts = [{ code: 'siteSaved', params: { site: 'javdb' } }, { code: 'semicolon' },
      { code: 'deferredBy', params: { reason: [{ code: 'deferCooling' }] } }];
    const site = (params: Record<string, unknown>) => ({ ...params, site: params.site === 'javdb' ? 'JavDB' : params.site });
    expect(partsText(parts, '原文', site)).toBe(
      `Saved metadata from JavDB. Postponed: ${enServer.outcome.deferCooling}`);
  });

  it('有一段没有译文就整句用服务端渲染好的原文', async () => {
    const { partsText } = await load('en');
    expect(partsText([{ code: 'installed' }, { code: 'notYetTranslated' }], '已装上')).toBe('已装上');
    expect(partsText('不是段落', '原文')).toBe('原文');
  });
});

describe('取数失败的原因', () => {
  it('apiGet 抛出的译文经过页面再处理一次仍是译文', async () => {
    const { apiGet, ApiError, requestErrorMessage, errorMessage } = await load('en');
    vi.stubGlobal('fetch', respond(404, { error: '这个地址下没有页面。', message_code: 'http.notFound', message_params: {} }));
    const error = await apiGet('/api/missing').catch((cause: unknown) => cause);
    expect(error).toBeInstanceOf(ApiError);
    expect((error as Error).message).toBe(enServer.http.notFound);
    expect(requestErrorMessage(error)).toBe(enServer.http.notFound);
    expect(errorMessage(error)).toBe(enServer.http.notFound);
  });

  it('apiSend 收到英文协议值时按状态码给通用句', async () => {
    const { apiSend } = await load('en');
    vi.stubGlobal('fetch', respond(404, { error: 'no such id' }));
    const error = await apiSend('/api/items/1', {}).catch((cause: unknown) => cause);
    expect((error as Error).message).toBe(enShell.requestError.notFound);
  });

  it('遗留层的 api() 走同一个解析函数，再处理一次也不变', async () => {
    const { legacyApi, requestErrorMessage } = await load('en');
    vi.stubGlobal('fetch', respond(500, { error: '服务处理失败，请导出诊断报告', message_code: 'http.serverError', error_id: 'abc' }));
    const error = await legacyApi('/api/boom').catch((cause: unknown) => cause);
    expect((error as Error).message).toBe(enServer.http.serverError);
    expect(requestErrorMessage(error)).toBe(enServer.http.serverError);
  });

  it('页面自己的英文句子原样显示，运行时异常与 Python 异常行换成通用句', async () => {
    const { requestErrorMessage } = await load('en');
    expect(requestErrorMessage("Couldn't load the list.")).toBe("Couldn't load the list.");
    expect(requestErrorMessage(new TypeError('Failed to fetch'))).toBe(enShell.requestError.unreachable);
    expect(requestErrorMessage(new SyntaxError('Unexpected token < in JSON'))).toBe(enShell.requestError.fallback);
    expect(requestErrorMessage('ConnectionError: HTTPSConnectionPool(host=example.com)')).toBe(enShell.requestError.fallback);
    expect(requestErrorMessage('request failed', 503)).toBe(enShell.requestError.unavailable);
  });
});
