/* 服务端发来的界面文字（ADR-0156 第三条、ADR-0159）。
 *
 * 一句话由三样组成：同一层的原文（成功在 `message`，失败在 `error`，FastAPI 默认的 `detail` 也认）、
 * 稳定的 `message_code` 与插值参数 `message_params`。有 code 且 `server` 命名空间里有这条译文就用译文，
 * 否则显示原文。还没迁移的接口只给原文，照样能显示。
 *
 * 参数可以是另一句带 code 的话 `{code, params}`（服务端 `interface_text.nested` 同一种形状），按同一语言
 * 递归渲染；也可以是列表，按界面的列表分隔符连起来。嵌套的那句缺译文时整句用服务端原文。 */
import { hasTranslation, joinList, t } from '../i18n';

type Params = Record<string, unknown>;

/** 嵌在参数里的另一句。口味分析的段落另带服务端按中文渲染好的 `text`，这里不用它。 */
export interface CodedPhrase { code: string; params?: Params; text?: string }

const PHRASE_KEYS = new Set(['code', 'params', 'text']);
const isPhrase = (value: unknown): value is CodedPhrase =>
  !!value && typeof value === 'object' && !Array.isArray(value) && typeof (value as CodedPhrase).code === 'string'
  && Object.keys(value).every((key) => PHRASE_KEYS.has(key));

const record = (value: unknown): Params => (value && typeof value === 'object' && !Array.isArray(value) ? value as Params : {});

/** 缺译文的标记：一路往外传，最外层整句用原文。 */
const MISSING = Symbol('missing');

function paramValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    const items = value.map(paramValue);
    return items.includes(MISSING) ? MISSING : joinList(items.map((item) => (item == null ? '' : String(item))));
  }
  return isPhrase(value) ? rendered(value.code, value.params) : value;
}

function rendered(code: string, params: unknown): string | typeof MISSING {
  const key = `server:${code}`;
  if (!code || !hasTranslation(key)) return MISSING;
  const values: Params = {};
  for (const [name, value] of Object.entries(record(params))) {
    const text = paramValue(value);
    if (text === MISSING) return MISSING;
    values[name] = text;
  }
  return t(key, values);
}

/** 显示表里按 id 取的一项：`server:<键>` 有译文用译文，没有就用服务端给的原文。 */
export function serverLabel(key: string, fallback: string, params?: Params | null): string {
  const text = rendered(key, params);
  return text === MISSING ? fallback : text;
}

/** 后台任务此刻的阶段：`stage_code` 有译文用译文，否则显示服务端的 `stage` 原文。 */
export function stageText(state: { stage?: string | null; stage_code?: string | null } | null | undefined): string {
  return serverLabel(state?.stage_code ? `stage.${state.stage_code}` : '', state?.stage || '');
}

/** 一段：完整的 `server` 键与参数，或服务端原样给的一段 `text`（内容数据，如候选表里的提醒原文）。 */
export type TextPart = { code: string; params?: Params } | { text: string };

/** 按段存的一句：逐段取当前语言再连起来；有一段缺译文或段落形状不对，整句用服务端渲染好的 `fallback`。 */
export function partsLabel(parts: unknown, fallback: string): string {
  if (!Array.isArray(parts) || !parts.length) return fallback;
  let text = '';
  for (const part of parts as unknown[]) {
    const fields = record(part);
    if (typeof fields.code === 'string') {
      const segment = rendered(fields.code, fields.params);
      if (segment === MISSING) return fallback;
      text += segment;
    } else if (typeof fields.text === 'string') {
      text += fields.text;
    } else {
      return fallback;
    }
  }
  return text;
}

/** 结果摘要里按段存的一句（ADR-0159）：每段是 `server:outcome.<code>`，参数里嵌着的段落一并渲染。 */
export interface OutcomePart { code: string; params?: Params }

const isParts = (value: unknown): value is OutcomePart[] =>
  Array.isArray(value) && value.every((item) => item && typeof item === 'object' && typeof item.code === 'string');

/** 把段落拼成当前语言的一句；有一段缺译文就整句用服务端渲染好的 `fallback`。`adjust` 改写每段的参数（如站点显示名）。 */
export function partsText(parts: unknown, fallback: string, adjust: (params: Params) => Params = (params) => params): string {
  if (!isParts(parts)) return fallback;
  const render = (items: OutcomePart[]): string | null => {
    let text = '';
    for (const item of items) {
      const key = `server:outcome.${item.code}`;
      if (!hasTranslation(key)) return null;
      const params: Params = {};
      for (const [name, value] of Object.entries(adjust(item.params ?? {}))) {
        const nested = isParts(value) ? render(value) : value;
        if (nested === null) return null;
        params[name] = nested;
      }
      text += t(key, params);
    }
    return text;
  };
  return render(parts) ?? fallback;
}

/** 一组按 id 取的显示名：`ids` 与服务端给的 `labels` 一一对应，缺 id 或缺译文的项用原文。 */
export function serverLabels(prefix: string, ids: readonly string[] | undefined, labels: readonly string[]): string[] {
  return labels.map((label, index) => serverLabel(ids?.[index] ? `${prefix}.${ids[index]}` : '', label));
}

/** 一组并行的原文、code 与参数（如读取任务的 `warnings`、推荐的 `reasons`）：缺 code 或缺译文的项照原文。 */
export function serverLabelList(texts: readonly string[] | undefined, codes?: readonly (string | null)[] | null,
  params?: readonly (Params | null)[] | null): string[] {
  return (texts ?? []).map((text, index) => serverLabel(codes?.[index] ?? '', text, params?.[index]));
}

/** 对象里的一项文字 `<键>`，配同层的 `<键>_code` 与 `<键>_params`：有 code 且有译文用译文，否则显示原文。 */
export function codedText(body: unknown, key: string): string {
  const fields = record(body);
  const original = typeof fields[key] === 'string' ? fields[key] as string : '';
  const code = typeof fields[`${key}_code`] === 'string' ? fields[`${key}_code`] as string : '';
  return serverLabel(code, original, record(fields[`${key}_params`]));
}

/** 后台任务状态里的一句：`message`（进度说明）或 `error`（失败原因），是 `codedText` 的特例。 */
export function jobText(state: object | null | undefined, key: 'message' | 'error' = 'message'): string {
  return codedText(state, key);
}

const fieldText = (text: unknown, coded: unknown): string => {
  const { code, params } = record(coded);
  return serverLabel(typeof code === 'string' ? code : '', typeof text === 'string' ? text : '', record(params));
};

/** 逐字段的错误换成当前语言：`errors` 是原句（列表字段逐行），`codes` 是同形的 `{code, params}`，缺的项照原句。
 *  服务端写法是 `web_entry.field_errors`。 */
export function localizedFieldErrors<T>(errors: T, codes: unknown): T {
  if (!errors || typeof errors !== 'object') return errors;
  const coded = record(codes);
  return Object.fromEntries(Object.entries(errors as Params).map(([key, value]) => {
    if (Array.isArray(value)) {
      const lines = Array.isArray(coded[key]) ? coded[key] as unknown[] : [];
      return [key, value.map((line, index) => fieldText(line, lines[index]))];
    }
    return [key, typeof value === 'string' ? fieldText(value, coded[key]) : value];
  })) as T;
}

/** 失败响应正文里的字段错误（`errors` 配同形的 `error_codes`），已换成当前语言；没有 `errors` 时是 `undefined`。 */
export function bodyFieldErrors<T>(body: unknown): T | undefined {
  const fields = record(body);
  const errors = fields.errors as T | undefined;
  return errors ? localizedFieldErrors(errors, fields.error_codes) : undefined;
}

/** 响应体里那句给人看的话；没有就是空串，由调用方按状态码给通用句。
 *
 *  没带 code 的原文只有中文才是给人看的话：服务端的界面文字以中文为源文，
 *  英文的是 `not found`、`unavailable` 这类协议值，不直接给人看。 */
export function serverText(payload: unknown): string {
  if (!payload || typeof payload !== 'object') return '';
  const body = payload as Params;
  const found = ['message', 'detail', 'error'].map((key) => body[key]).find((value) => typeof value === 'string' && value);
  const original = typeof found === 'string' ? found : '';
  const code = typeof body.message_code === 'string' ? body.message_code : '';
  return serverLabel(code, code || /[㐀-鿿]/.test(original) ? original : '', record(body.message_params));
}
