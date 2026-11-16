/* 整理、垃圾队列与搜索补全按 code 显示服务端文字（ADR-0159）：英文界面拿到英文，没有 code 的照原句。
 * 英文界面才看得出差别，所以按英文加载。 */
import { afterEach, describe, expect, it, vi } from 'vitest';

import { SETTINGS_KEY } from '../../src/settings-key';
import enServer from '../../../resources/locales/en/server.json' with { type: 'json' };

async function load() {
  vi.resetModules();
  localStorage.setItem(SETTINGS_KEY, JSON.stringify({ interfaceLanguage: 'en' }));
  const [organize, serverText] = await Promise.all([
    import('../../src/react/data-cleanup/organize'), import('../../src/core/server-text'),
  ]);
  return { ...organize, ...serverText };
}

afterEach(() => {
  localStorage.removeItem(SETTINGS_KEY);
  vi.resetModules();
});

describe('目录与整理的服务端文字', () => {
  it('整理预览的跳过原因按 reason_codes 换成英文，认不出的原因照原文', async () => {
    const { planSummary } = await load();
    const text = planSummary({
      counts: { change: 0 }, reasons: { 来源未挂载: 3, 别处来的原因: 1 }, rows: [], truncated: false,
      reason_codes: { 来源未挂载: 'labels.organize.skip.offline' },
    });
    expect(text).toContain(`${enServer.labels.organize.skip.offline} 3`);
    expect(text).toContain('别处来的原因 1');
  });

  it('垃圾理由按段拼成英文，词库里的原文段照原样', async () => {
    const { partsLabel } = await load();
    const parts = [{ code: 'labels.junk.repeatedCopies', params: { count: 3 } }, { text: ' · ' }, { text: '推广安装包' }];
    expect(partsLabel(parts, '同名同体积的副本散布在 3 个目录 · 推广安装包'))
      .toBe('Copies with the same name and size appear in 3 directories · 推广安装包');
  });

  it('产地、补全分组与推荐理由的显示名有英文', async () => {
    const { codedText, serverLabelList } = await load();
    expect(codedText({ label: '未判定', label_code: 'labels.regions.none' }, 'label')).toBe('Not set');
    expect(codedText({ label: '女优', label_code: 'labels.webEntity.suggestGroup.performer' }, 'label')).toBe('Actresses');
    expect(serverLabelList(['同创作者', '标签接近'], ['labels.related.sameCreator', 'labels.related.similarTags']))
      .toEqual(['Same creator', 'Similar tags']);
  });
});
