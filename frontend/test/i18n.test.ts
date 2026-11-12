import { readFileSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

import { createTranslator, resolveInterfaceLanguage, resources, storedInterfaceLanguage, INTERFACE_LANGUAGES, SOURCE_LANGUAGE } from '../src/i18n';
// @ts-expect-error 检查脚本是纯 ESM，没有类型声明
import { BASELINE, countLiterals, scan } from '../scripts/i18n-literals.mjs';

const frontend = resolve(__dirname, '..');
const locales = join(frontend, 'src/locales');

type Tree = { [key: string]: string | Tree };
const flatten = (tree: Tree, prefix = ''): Record<string, string> => Object.fromEntries(Object.entries(tree).flatMap(
  ([key, value]) => typeof value === 'string' ? [[prefix + key, value]] : Object.entries(flatten(value, `${prefix}${key}.`))));
const read = (language: string, ns: string) => flatten(JSON.parse(readFileSync(join(locales, language, `${ns}.json`), 'utf8')));
const namespaces = (language: string) => readdirSync(join(locales, language)).map((name) => name.replace(/\.json$/, '')).sort();
const placeholders = (text: string) => [...text.matchAll(/\{\{\s*([^},\s]+)[^}]*\}\}/g)].map((match) => match[1]).sort();
/* 复数键按 i18next v4：中文只有 `_other`，英文另有 `_one`；比键时折成同一个基名。 */
const base = (key: string) => key.replace(/_(zero|one|two|few|many|other)$/, '');

/** TBX 里每条术语：中文词、英文写法、是不是禁用写法。 */
function glossary() {
  const doc = new DOMParser().parseFromString(readFileSync(join(locales, 'glossary/en.tbx'), 'utf8'), 'application/xml');
  return [...doc.querySelectorAll('termEntry')].map((entry) => {
    const lang = (code: string) => [...entry.querySelectorAll('langSet')].find((set) => set.getAttribute('xml:lang') === code);
    const target = lang('en')?.querySelector('tig');
    return {
      id: entry.getAttribute('id') || '',
      zh: lang('zh-CN')?.querySelector('term')?.textContent?.trim() || '',
      en: target?.querySelector('term')?.textContent?.trim() || '',
      forbidden: target?.querySelector('termNote[type="administrativeStatus"]')?.textContent?.trim() === 'forbidden',
    };
  });
}

describe('界面文案的语言资源', () => {
  it('每种语言的命名空间齐全，英文与源文的键一一对应', () => {
    expect(namespaces('en')).toEqual(namespaces(SOURCE_LANGUAGE));
    for (const ns of namespaces(SOURCE_LANGUAGE)) {
      const zh = Object.keys(read(SOURCE_LANGUAGE, ns)).map(base);
      const en = Object.keys(read('en', ns)).map(base);
      expect([...new Set(en)].sort(), ns).toEqual([...new Set(zh)].sort());
    }
  });

  it('入口登记的资源就是目录里的全部文件', () => {
    for (const language of INTERFACE_LANGUAGES) {
      expect(Object.keys(resources[language]).sort(), language).toEqual(namespaces(language));
    }
  });

  it('译文的插值占位和源文一致', () => {
    for (const ns of namespaces(SOURCE_LANGUAGE)) {
      const zh = read(SOURCE_LANGUAGE, ns), en = read('en', ns);
      for (const [key, text] of Object.entries(en)) {
        const source = zh[key] ?? zh[`${base(key)}_other`] ?? zh[base(key)] ?? '';
        expect(placeholders(text), `${ns}:${key}`).toEqual(placeholders(source));
      }
    }
  });

  it('译文不用术语表里禁用的写法', () => {
    const banned = glossary().filter((term) => term.forbidden);
    const hits: string[] = [];
    for (const ns of namespaces(SOURCE_LANGUAGE)) {
      const zh = read(SOURCE_LANGUAGE, ns), en = read('en', ns);
      for (const [key, text] of Object.entries(en)) {
        const source = zh[key] ?? zh[`${base(key)}_other`] ?? zh[base(key)] ?? '';
        /* 占位名是代码里的变量名（如 {{done}}），不是译文里的词。 */
        const prose = text.replace(/\{\{[^}]*\}\}/g, ' ');
        for (const term of banned) {
          const word = new RegExp(`\\b${term.en.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
          if (source.includes(term.zh) && word.test(prose)) hits.push(`${ns}:${key}「${source}」→ ${text}：${term.zh} 不写 ${term.en}`);
        }
      }
    }
    expect(hits).toEqual([]);
  });

  it('术语表每条都有中文词和英文写法，条目编号不重复', () => {
    const terms = glossary();
    expect(terms.length).toBeGreaterThan(0);
    expect(terms.filter((term) => !term.zh || !term.en)).toEqual([]);
    expect(new Set(terms.map((term) => term.id)).size).toBe(terms.length);
  });
});

describe('界面语言', () => {
  it('选了固定语言就用它，不看浏览器', () => {
    const storage = (value: unknown) => ({ getItem: () => JSON.stringify(value) });
    expect(storedInterfaceLanguage(storage({ interfaceLanguage: 'en' }), ['zh-CN'])).toBe('en');
    expect(storedInterfaceLanguage(storage({ interfaceLanguage: 'zh-CN' }), ['en-US'])).toBe('zh-CN');
  });

  it('自动：按浏览器语言的顺序取第一个有译文的，中文各种写法都给简体中文', () => {
    expect(resolveInterfaceLanguage('auto', null, ['ja-JP', 'zh-TW', 'en-US'])).toBe('zh-CN');
    expect(resolveInterfaceLanguage('auto', 'zh-CN', ['en-GB', 'zh-CN'])).toBe('en');
    expect(resolveInterfaceLanguage('auto', null, ['zh-Hant-HK'])).toBe('zh-CN');
  });

  it('自动：浏览器语言都没有译文时看系统语言，再没有就用英文', () => {
    expect(resolveInterfaceLanguage('auto', 'zh-CN', ['ja-JP', 'fr'])).toBe('zh-CN');
    expect(resolveInterfaceLanguage('auto', null, ['ja-JP'])).toBe('en');
    expect(resolveInterfaceLanguage('auto', 'de-DE', [])).toBe('en');
  });

  it('没存、存坏或不认识的选择按自动算，系统语言从本地缓存读', () => {
    const storage = (value: string | null) => ({ getItem: () => value });
    expect(storedInterfaceLanguage(storage(null), ['zh-CN'])).toBe('zh-CN');
    expect(storedInterfaceLanguage(storage('{坏掉'), ['en-US'])).toBe('en');
    expect(storedInterfaceLanguage(storage(JSON.stringify({ interfaceLanguage: 'fr', systemLanguage: 'zh-CN' })), ['ja'])).toBe('zh-CN');
  });

  it('英文取英文，缺的键回落到源文', () => {
    const en = createTranslator('en');
    expect(en.t('navigation:sidebar.home')).toBe('Home');
    en.addResource('zh-CN', 'navigation', 'onlySource', '仅源文');
    expect(en.t('navigation:onlySource')).toBe('仅源文');
    expect(createTranslator('zh-CN').t('navigation:manage.configuration')).toBe('Peach 配置');
  });

  it('数字 count 选单复数并按语言加千位分隔', () => {
    const en = createTranslator('en');
    en.addResources('en', 'navigation', { items_one: '{{count, number}} item', items_other: '{{count, number}} items' });
    en.addResource('zh-CN', 'navigation', 'items', '{{count, number}} 项');
    expect([en.t('navigation:items', { count: 1 }), en.t('navigation:items', { count: 1234 })]).toEqual(['1 item', '1,234 items']);
    expect(en.t('navigation:items', { count: 1234, lng: 'zh-CN' })).toBe('1,234 项');
  });

  it('count 传数字，不传格式化好的字符串', () => {
    // 字符串 count 不走单复数，英文找不到不带后缀的键，整句会回落成中文。
    const offenders: string[] = [];
    const visit = (dir: string) => {
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const path = join(dir, entry.name);
        if (entry.isDirectory()) { if (entry.name !== 'locales') visit(path); continue; }
        if (!/\.(ts|tsx|js)$/.test(entry.name)) continue;
        readFileSync(path, 'utf8').split('\n').forEach((line, index) => {
          if (/\bt\(\s*'[^']+'[^)]*\bcount:\s*[^,}]*toLocaleString\(/.test(line)) offenders.push(`${path}:${index + 1}`);
        });
      }
    };
    visit(join(frontend, 'src'));
    expect(offenders).toEqual([]);
  });
});

describe('写死的中文文案只减不增', () => {
  it('逐个文件不超过基线，基线外的文件没有中文文案', () => {
    const baseline: Record<string, number> = JSON.parse(readFileSync(BASELINE, 'utf8'));
    const raised = Object.entries(scan() as Record<string, number>)
      .filter(([file, count]) => count > (baseline[file] ?? 0))
      .map(([file, count]) => `${file}: ${count}（基线 ${baseline[file] ?? 0}）`);
    expect(raised, '新文案写进 src/locales/<语言>/*.json，用 t() 取；抽走后跑 node scripts/i18n-literals.mjs --write 收紧基线').toEqual([]);
  }, 60_000);

  it('计数认字符串、模板和 JSX 文字，不认注释、对象键、导入路径和 console', () => {
    const source = [
      "// 注释里的中文",
      "import x from './中文路径';",
      "const a = { 键: '值' };",
      "const b = `模板${x}`;",
      "console.warn('日志');",
      "const c = <b>正文</b>;",
      "const d = 'plain';",
    ].join('\n');
    expect(countLiterals('sample.tsx', source)).toBe(3);
  });
});
