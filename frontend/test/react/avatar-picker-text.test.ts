/* 换头像格子上的服务端文字（ADR-0159）：来源名与「代表作画面」按 code 取当前语言，「已裁剪」与番号照服务端的拼法接上，
 * 图库分类、片名这类内容原样。英文界面才看得出来，所以按英文加载。 */
import { afterEach, expect, it, vi } from 'vitest';

import type { AvatarChoice } from '../../src/react/avatar-picker/avatar-picker';
import { SETTINGS_KEY } from '../../src/settings-key';

async function load(language: 'en' | 'zh-CN') {
  vi.resetModules();
  localStorage.setItem(SETTINGS_KEY, JSON.stringify({ interfaceLanguage: language }));
  return import('../../src/react/avatar-picker/avatar-picker');
}

afterEach(() => {
  localStorage.removeItem(SETTINGS_KEY);
  vi.resetModules();
});

const choice = (over: Partial<AvatarChoice>): AvatarChoice => ({
  ref: 'sha256:0', source: 'history', label: '', width: 0, height: 0, detail: '', found_by: '',
  current: false, crop: false, bases: [], focus: null, cast: 0, version: '', ...over,
});

const cropped = choice({
  label: '图库 · S1 · 已裁剪', user_cropped: true,
  label_code: 'labels.avatarPicker.galleryCategory', label_params: { category: 'S1' },
});
const wholeCover = choice({
  label: '作品封面 ABW-232', label_code: 'labels.avatarPicker.source.videoCover', label_params: {}, cover_code: 'ABW-232',
});
const standIn = choice({
  source: 'asset', label: 'ABW-232', detail: '代表作画面，非本人 · ABW-232 的标题',
  detail_code: 'labels.avatarPicker.standInWithTitle', detail_params: { title: 'ABW-232 的标题' },
});

it('英文界面里来源名、已裁剪与代表作说明都换成英文，分类名、番号与片名原样', async () => {
  const { choiceLabel, choiceDetailText } = await load('en');
  expect(choiceLabel(cropped)).toBe('Gallery · S1 · Cropped');
  expect(choiceLabel(wholeCover)).toBe('Video cover ABW-232');
  expect(choiceLabel(standIn)).toBe('ABW-232');
  expect(choiceDetailText(standIn)).toBe('Still from a representative video, not this person · ABW-232 的标题');
});

it('中文界面与服务端原文逐字相同；没有 code 的旧格子照原文显示', async () => {
  const { choiceLabel, choiceDetailText } = await load('zh-CN');
  expect(choiceLabel(cropped)).toBe(cropped.label);
  expect(choiceLabel(wholeCover)).toBe(wholeCover.label);
  expect(choiceDetailText(standIn)).toBe(standIn.detail);
  expect(choiceLabel(choice({ label: '7-S1' }))).toBe('7-S1');
});
