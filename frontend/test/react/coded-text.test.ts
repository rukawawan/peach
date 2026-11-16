/* 配置页与首启页按 code 显示服务端文字（ADR-0159）：英文界面拿到英文，没有 code 或缺译文的照原句。
 * 英文界面才看得出差别，所以按英文加载。 */
import { afterEach, describe, expect, it, vi } from 'vitest';

import { SETTINGS_KEY } from '../../src/settings-key';
import enServer from '../../../resources/locales/en/server.json' with { type: 'json' };

async function load() {
  vi.resetModules();
  localStorage.setItem(SETTINGS_KEY, JSON.stringify({ interfaceLanguage: 'en' }));
  const [configuration, setup] = await Promise.all([
    import('../../src/react/settings/configuration'), import('../../src/react/pages/setup/setup-api'),
  ]);
  return { ...configuration, ...setup };
}

afterEach(() => {
  localStorage.removeItem(SETTINGS_KEY);
  vi.unstubAllGlobals();
  vi.resetModules();
});

describe('配置页与首启页的取数入口', () => {
  it('配置的区域错误、不能编辑的原因、运行信息与口令原因都换成英文', async () => {
    const { localizedConfiguration } = await load();
    const data = localizedConfiguration({
      editable: false, notice: '这个部署由配置文件管理服务；在本机编辑下方的设置文件。',
      notice_code: 'labels.configuration.fileManagedNotice', revision: 'r', media_dirs: [], library_count: 0,
      facts: [{ term: '版本', term_code: 'labels.runtimeFacts.version', value: '1.0' },
        { term: 'FFmpeg', value: '未找到 FFmpeg；转码、媒体信息与缩略图需要 FFmpeg 工具包。',
          value_code: 'labels.runtimeFacts.ffmpegToolMissing', value_params: { tool: 'FFmpeg' },
          download_url: 'https://ffmpeg.org/download.html', download_label: '下载 FFmpeg',
          download_label_code: 'labels.downloadNamed', download_label_params: { name: 'FFmpeg' } }],
      section_errors: { tunnel: { title: '公网入口未取得', title_code: 'labels.configuration.sectionUnavailable',
        title_params: { section: '公网入口' }, section_code: 'labels.configuration.section.tunnel',
        message: '请重新读取；持续失败时导出诊断报告。', message_code: 'labels.configuration.sectionRetry', error_id: 'x' } },
      api_token: { rotatable: false, reason: '这次启动没有使用访问口令。', reason_code: 'api.configuration.tokenNotUsed', paired: false },
    } as never);
    expect(data.notice).toBe(enServer.labels.configuration.fileManagedNotice);
    expect(data.facts.map(({ term, value, download_label }) => [term, value, download_label])).toEqual([
      ['Version', '1.0', undefined],
      ['FFmpeg', 'FFmpeg not found. Transcoding, media info and thumbnails need the FFmpeg tools.', 'Download FFmpeg'],
    ]);
    expect(data.section_errors?.tunnel).toMatchObject({ title: 'Remote access: not found', message: enServer.labels.configuration.sectionRetry });
    expect(data.api_token?.reason).toBe(enServer.api.configuration.tokenNotUsed);
  });

  it('首启读题的题面、说明、选项与云盘提示换成英文，提交失败的字段错误也是', async () => {
    const { fetchQuestions, submitSetup, SetupRequestError } = await load();
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({
      windows: true, standalone: false, media_sources: [], media_source_default: 'local', media_root: null,
      access_enabled: true, scan_now: true, history_guide: false,
      questions: [{ key: 'host', label: '谁可以访问', label_code: 'pages.setup.question.host.label', help: [], help_codes: [],
        default: '2', required: false, advanced: false, input: 'choice', prefix: '', suffix: '',
        options: [{ value: '2', label: '同一局域网的设备', label_code: 'labels.onboarding.hostOption.lan' }] },
      { key: 'port', label: '端口', label_code: 'pages.setup.question.port.label', help: ['浏览器地址里冒号后面的数字，一般不用改。'],
        help_codes: ['pages.setup.question.port.help'], default: '8900', required: true, advanced: true, input: 'number',
        prefix: 'localhost:', suffix: '' }],
      cloud: { help: '请先将……', help_code: 'pages.setup.cloudHelp',
        link: { url: 'https://www.clouddrive2.com/help.html', label: '挂载帮助', label_code: 'pages.setup.cloudHelpLink' },
        dependencies: [{ name: 'WinFsp', message: '未检测到 WinFsp。', message_code: 'pages.setup.mountMissing',
          message_params: { name: 'WinFsp' }, download_url: 'https://winfsp.dev/rel/', download_label: '下载 WinFsp',
          download_label_code: 'labels.downloadNamed', download_label_params: { name: 'WinFsp' } }] },
    }), { status: 200, headers: { 'Content-Type': 'application/json' } })));
    const setup = await fetchQuestions();
    expect(setup.questions.map((question) => question.label)).toEqual(['Who can connect', 'Port']);
    expect(setup.questions[0]!.options?.[0]?.label).toBe('Devices on the same LAN');
    expect(setup.questions[1]!.help).toEqual([enServer.pages.setup.question.port.help]);
    expect([setup.cloud.help, setup.cloud.link.label]).toEqual([enServer.pages.setup.cloudHelp, 'Mount help']);
    expect(setup.cloud.dependencies[0]).toMatchObject({ message: 'WinFsp not detected.', download_label: 'Download WinFsp' });

    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({
      error: '有几项需要修改', message_code: 'api.pages.needsChanges', message_params: {},
      errors: { port: '端口要是 1 到 65535 之间的整数' }, error_codes: { port: { code: 'errors.onboarding.portInvalid', params: {} } },
    }), { status: 400, headers: { 'Content-Type': 'application/json' } })));
    const failure = await submitSetup({ media_dir: [], skip_media: true, access_enabled: false, scan_now: false }).catch((cause: unknown) => cause);
    expect(failure).toBeInstanceOf(SetupRequestError);
    expect((failure as InstanceType<typeof SetupRequestError>).message).toBe(enServer.api.pages.needsChanges);
    expect((failure as InstanceType<typeof SetupRequestError>).errors).toEqual({ port: enServer.errors.onboarding.portInvalid });
  });
});
