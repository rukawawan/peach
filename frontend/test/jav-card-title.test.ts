import { expect, it } from 'vitest';
import { feedNewCardHtml } from '../src/application/feed.js';
import { javTitleHtml } from '../src/core/jav-title';
import { textLang } from '../src/core/text-lang';

it('新作订阅还没入库，卡片只给番号与片名，不出版次与画质徽章', () => {
  const host = document.createElement('div');
  host.innerHTML = feedNewCardHtml({ id: 1, code: 'ABC-123', title: '示例新作', width: 3840, height: 2160,
    edition_badges: ['中字', '无码破解'] });
  expect(host.querySelector('.ui-javcode')?.textContent).toBe('ABC-123');
  expect(host.querySelectorAll('.javedition')).toHaveLength(0);
});

it('已确认的版本标签与 4K 位于标题，分辨率未取得时不添加画质标记', () => {
  const host = document.createElement('div');
  const item = { is_jav: true, code: 'EXM-001', catalog_title: '示例作品', edition_badges: ['中字', '无码'] };
  host.innerHTML = javTitleHtml({ ...item, width: 3840, height: 2160 });
  expect([...host.querySelectorAll('.javedition')].map(node => node.textContent)).toEqual(['中字', '无码', '4K']);
  expect(host.querySelector('.ui-javtitle')?.textContent).toBe('示例作品');
  for (const dimensions of [{}, { width: 1920, height: 1080 }, { width: 3840, height: 1080 }]) {
    host.innerHTML = javTitleHtml({ ...item, ...dimensions });
    expect(host.querySelector('.quality')).toBeNull();
  }
});

it('无码三档各用自己的颜色：无码、流出、破解', () => {
  const host = document.createElement('div');
  host.innerHTML = ['无码', '无码流出', '无码破解'].map((label) =>
    javTitleHtml({ is_jav: true, code: 'EXM-001', catalog_title: '示例作品', edition_badges: [label] })).join('');
  expect([...host.querySelectorAll('.javedition')].map((node) => node.className))
    .toEqual(['javedition uncensored', 'javedition leaked', 'javedition cracked']);
});

it('含假名的标题标日文、纯拉丁字母标英文，纯汉字分不出中日时沿用页面语言', () => {
  expect(textLang('新人 AV デビュー')).toBe('ja');
  expect(textLang('ｶﾀｶﾅ')).toBe('ja');
  expect(textLang('First Date')).toBe('en');
  expect(textLang('三上悠亜')).toBeUndefined();
  expect(textLang('示例作品 4K')).toBeUndefined();
  expect(textLang('')).toBeUndefined();
  const host = document.createElement('div');
  host.innerHTML = javTitleHtml({ is_jav: true, code: 'EXM-001', catalog_title: '新人デビュー' });
  expect(host.querySelector('.ui-javtitle')?.getAttribute('lang')).toBe('ja');
  host.innerHTML = javTitleHtml({ is_jav: true, code: 'EXM-001', catalog_title: '示例作品' });
  expect(host.querySelector('.ui-javtitle')?.hasAttribute('lang')).toBe(false);
});
