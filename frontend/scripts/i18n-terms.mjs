// 找还没进术语表的高频词（ADR-0156「新增概念」）：数 2–4 字中文片段出现在多少条不同文案里，
// 文案取自 zh-CN 语言资源和源码里还写死的中文；去掉术语表已收的词和被更长片段吸收的片段。
// 只出候选清单，要不要进术语表由维护者定。用法：node scripts/i18n-terms.mjs [最少条数，默认 8]
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseSync } from 'oxc-parser';

const frontend = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const minimum = Number(process.argv[2] || 8);
const texts = new Set();

const values = (tree) => Object.values(tree).flatMap((value) => typeof value === 'string' ? [value] : values(value));
for (const name of readdirSync(join(frontend, 'src/locales/zh-CN'))) {
  for (const value of values(JSON.parse(readFileSync(join(frontend, 'src/locales/zh-CN', name), 'utf8')))) texts.add(value);
}
const collect = (node) => {
  if (!node || typeof node !== 'object') return;
  if (Array.isArray(node)) { node.forEach(collect); return; }
  if (node.type === 'Literal' && typeof node.value === 'string') texts.add(node.value);
  if (node.type === 'JSXText') texts.add(node.value);
  if (node.type === 'TemplateElement') texts.add(node.value?.cooked ?? '');
  for (const [key, child] of Object.entries(node)) if (key !== 'type') collect(child);
};
const walk = (dir) => {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) { if (entry.name !== 'locales') walk(path); }
    else if (/\.(ts|tsx|js)$/.test(entry.name) && !/\.(test|d)\./.test(entry.name)) collect(parseSync(path, readFileSync(path, 'utf8')).program);
  }
};
walk(join(frontend, 'src'));

const tbx = readFileSync(join(frontend, 'src/locales/glossary/en.tbx'), 'utf8');
const known = [...tbx.matchAll(/<langSet xml:lang="zh-CN"><tig><term>([^<]+)<\/term>/g)].map((match) => match[1]);
const counts = new Map();
for (const text of texts) {
  const seen = new Set();
  for (const run of text.match(/[一-鿿]+/g) || []) {
    for (let n = 2; n <= 4; n++) for (let i = 0; i + n <= run.length; i++) seen.add(run.slice(i, i + n));
  }
  for (const piece of seen) counts.set(piece, (counts.get(piece) || 0) + 1);
}
const candidates = [...counts].filter(([piece, n]) => n >= minimum && !known.some((term) => term.includes(piece) || piece.includes(term)));
const kept = candidates.filter(([piece, n]) => !candidates.some(([longer, m]) => longer.length > piece.length && longer.includes(piece) && m >= n * 0.8));
for (const [piece, n] of kept.sort((a, b) => b[1] - a[1])) console.log(`${piece}\t${n}`);
