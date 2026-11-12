// 数源码里还写死的中文界面文案（ADR-0156）：字符串、模板与 JSX 文字里带汉字的节点各算一处。
// 注释、import 路径、对象键和 console 调用不算；测试文件不扫。
// 门槛在 `test/i18n.test.ts`：每个文件的数目不得超过 `i18n-literal-baseline.json`，基线里没有的文件必须是 0。
// `node scripts/i18n-literals.mjs --write` 只把基线往下收（抽走的文案不能再加回来），新增数目要手改基线、在评审里说明。
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseSync } from 'oxc-parser';

const frontend = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const BASELINE = join(frontend, 'i18n-literal-baseline.json');
const HAN = /[㐀-鿿]/;

/** 一个源文件里带汉字的文案节点数。 */
export function countLiterals(path, source) {
  const parsed = parseSync(path, source);
  let count = 0;
  const walk = (node, parent, key) => {
    if (!node || typeof node !== 'object') return;
    if (Array.isArray(node)) { for (const item of node) walk(item, parent, key); return; }
    if (node.type === 'CallExpression' && node.callee?.type === 'MemberExpression' && node.callee.object?.name === 'console') return;
    const machine = (parent?.type === 'ImportDeclaration' || parent?.type?.startsWith('Export')) && key === 'source'
      || key === 'key' && parent?.type === 'Property' && !parent.computed;
    if (!machine) {
      if ((node.type === 'Literal' && typeof node.value === 'string' && HAN.test(node.value))
        || (node.type === 'TemplateElement' && HAN.test(node.value?.cooked ?? node.value?.raw ?? ''))
        || (node.type === 'JSXText' && HAN.test(node.value))) count++;
    }
    for (const [childKey, child] of Object.entries(node)) {
      if (childKey !== 'type' && childKey !== 'start' && childKey !== 'end') walk(child, node, childKey);
    }
  };
  walk(parsed.program, null, null);
  return count;
}

function* sources(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) { if (entry.name !== 'locales') yield* sources(path); continue; }
    if (/\.(ts|tsx|js|mjs)$/.test(entry.name) && !/\.(test|d)\.[a-z]+$/.test(entry.name)) yield path;
  }
}

/** `src/` 下每个还有中文文案的文件 → 处数，键是相对 `frontend/` 的路径。 */
export function scan(root = frontend) {
  const counts = {};
  for (const path of sources(join(root, 'src'))) {
    const count = countLiterals(path, readFileSync(path, 'utf8'));
    if (count) counts[relative(root, path).replaceAll('\\', '/')] = count;
  }
  return Object.fromEntries(Object.entries(counts).sort(([a], [b]) => a.localeCompare(b)));
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const current = scan();
  const baseline = JSON.parse(readFileSync(BASELINE, 'utf8'));
  const raised = Object.entries(current).filter(([file, count]) => count > (baseline[file] ?? 0));
  if (process.argv.includes('--write')) {
    const lowered = Object.fromEntries(Object.entries(baseline)
      .map(([file, count]) => [file, Math.min(count, current[file] ?? 0)]).filter(([, count]) => count > 0));
    writeFileSync(BASELINE, `${JSON.stringify(lowered, null, 2)}\n`);
  }
  for (const [file, count] of raised) console.log(`${file}: ${count}（基线 ${baseline[file] ?? 0}）`);
  const total = (counts) => Object.values(counts).reduce((sum, count) => sum + count, 0);
  console.log(`写死的中文文案 ${total(current)} 处，基线 ${total(baseline)} 处`);
  process.exitCode = raised.length ? 1 : 0;
}
