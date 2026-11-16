import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseSync } from 'oxc-parser';

type Rule = [pattern: string, message: string, severity: string];
export interface Finding { path: string; line: number; severity: string; message: string; term?: string }
/** oxc 的 ESTree 节点：只读到的几个字段写出类型，其余按未知处理。 */
type AstNode = { type?: string; start: number; computed?: boolean; value?: unknown; [key: string]: unknown };

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const rules: Rule[] = JSON.parse(readFileSync(join(root, 'scripts/copy-rules.json'), 'utf8')).prose;
const marker = 'copy-lint-disable-line';

export function scanSource(path: string, source: string): Finding[] {
  const parsed = parseSync(path, source);
  const lines = source.split('\n');
  const found: Finding[] = parsed.errors.map(error => ({ path, line: 1, severity: 'error', message: error.message }));
  const scan = (value: string, start: number) => {
    let line = source.slice(0, start).split('\n').length;
    for (const part of value.split('\n')) {
      if (!lines[line - 1]?.includes(marker)) {
        const hits = rules.flatMap(([pattern, message, severity]) =>
          [...part.matchAll(new RegExp(pattern, 'gi'))].map(match => ({ path, line, term: match[0], message, severity })));
        const errors = hits.filter(hit => hit.severity === 'error');
        found.push(...(errors.length ? errors : hits));
      }
      line++;
    }
  };
  const walk = (value: unknown, parent?: AstNode, key?: string): void => {
    if (!value || typeof value !== 'object') return;
    if (Array.isArray(value)) { value.forEach(item => walk(item, parent, key)); return; }
    const node = value as AstNode;
    const machine = (parent?.type === 'ImportDeclaration' || parent?.type?.startsWith('Export')) && key === 'source'
      || key === 'key' && !parent?.computed;
    if (!machine && node.type === 'Literal' && typeof node.value === 'string') scan(node.value, node.start);
    if (node.type === 'TemplateElement') {
      const template = node.value as { cooked?: string | null; raw: string };
      scan(template.cooked ?? template.raw, node.start);
    }
    if (node.type === 'JSXText') scan(String(node.value), node.start);
    for (const [childKey, child] of Object.entries(node)) {
      if (childKey !== 'comments') walk(child, node, childKey);
    }
  };
  walk(parsed.program);
  for (const comment of parsed.comments) scan(comment.value, comment.start);
  return found;
}

export function sourceFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? sourceFiles(path) : /\.[jt]sx?$/.test(path) ? [path] : [];
  });
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const files = sourceFiles(join(root, 'frontend/src'));
  const findings = files.flatMap(path => scanSource(path, readFileSync(path, 'utf8')));
  for (const item of findings) console.error(`${item.path}:${item.line}: ${item.severity}: ${item.message}`);
  console.log(`前端文案检查：${files.length} 个源码文件。`);
  process.exitCode = Number(findings.some(item => item.severity === 'error'));
}
