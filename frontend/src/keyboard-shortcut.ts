/* 用户可改的单个快捷键（目前只有 SFW 开关）：录制、存储、匹配与显示。
 *
 * 主键按物理键位 `KeyboardEvent.code` 记，不用 `key`：Mac 上 Option+S 的 `key` 是「ß」，
 * Shift 下字母变大写，换成别的键盘布局字符也跟着变；`code` 恒为 `KeyS`。存成
 * `Ctrl+Alt+Shift+Meta+KeyS` 这样的文本，修饰键次序固定，比较时只看 `code` 和四个修饰位。
 *
 * 只管一个绑定，不引 tinykeys、hotkeys-js 这类库：它们能替掉的只有匹配那几行，录制与按平台
 * 显示仍要自己写；全局监听又在遗留的 `application/search.js` 里，React 专用的录制钩子接不上。
 * 取舍记在 `docs/REUSE.md`「快捷键」。 */
import { t } from './i18n';

export interface Shortcut { code: string; ctrl: boolean; alt: boolean; shift: boolean; meta: boolean }

/** 存在本机，不随设置同步：⌘ 在 Windows 上是 Win 键，同一个绑定换台设备就不成立。 */
export const SFW_SHORTCUT_KEY = 'peach.sfw-shortcut';
export const DEFAULT_SFW_SHORTCUT = 'Shift+KeyS';

/** 可作主键的键：字母、数字与 F1–F12。方向键、空格、回车留给播放器与表单。 */
const MAIN_KEY = /^(?:Key[A-Z]|Digit[0-9]|F(?:[1-9]|1[0-2]))$/;
/** 修饰键本身按下时还在等主键，不算一次录制。 */
const MODIFIER_CODES = /^(?:Shift|Control|Alt|Meta|OS)(?:Left|Right)?$/;
/** Ctrl（Mac 上是 ⌘）加这几个键是浏览器自己的新建、关闭、退出窗口，页面收不到这次按键。 */
const BROWSER_RESERVED = new Set(['KeyW', 'KeyT', 'KeyN', 'KeyQ']);

export function parseShortcut(text: string | null | undefined): Shortcut | null {
  const parts = String(text || '').split('+');
  const code = parts.pop() || '';
  const flags = new Set(parts);
  if (!MAIN_KEY.test(code) || [...flags].some((flag) => !['Ctrl', 'Alt', 'Shift', 'Meta'].includes(flag))) return null;
  const shortcut = { code, ctrl: flags.has('Ctrl'), alt: flags.has('Alt'), shift: flags.has('Shift'), meta: flags.has('Meta') };
  return problemWith(shortcut) ? null : shortcut;
}

export function serializeShortcut(shortcut: Shortcut): string {
  return [shortcut.ctrl && 'Ctrl', shortcut.alt && 'Alt', shortcut.shift && 'Shift', shortcut.meta && 'Meta', shortcut.code]
    .filter(Boolean).join('+');
}

/** 不能用的绑定说明原因；能用返回空串。 */
function problemWith(shortcut: Shortcut): string {
  if (!shortcut.ctrl && !shortcut.alt && !shortcut.shift && !shortcut.meta) {
    return t('shell:keyboardShortcut.needsModifier');
  }
  if ((shortcut.ctrl || shortcut.meta) && BROWSER_RESERVED.has(shortcut.code)) return t('shell:keyboardShortcut.reservedByBrowser');
  return '';
}

export function isModifierCode(code: string): boolean {
  return MODIFIER_CODES.test(code);
}

export type Recorded = { state: 'waiting' } | { state: 'invalid'; problem: string } | { state: 'done'; shortcut: Shortcut };

/** 录制时的一次按键：只按了修饰键还在等，主键不支持或组合不能用给出原因。 */
export function recordShortcut(event: Pick<KeyboardEvent, 'code' | 'ctrlKey' | 'altKey' | 'shiftKey' | 'metaKey'>): Recorded {
  if (isModifierCode(event.code)) return { state: 'waiting' };
  if (!MAIN_KEY.test(event.code)) return { state: 'invalid', problem: t('shell:keyboardShortcut.unsupportedKey') };
  const shortcut = { code: event.code, ctrl: event.ctrlKey, alt: event.altKey, shift: event.shiftKey, meta: event.metaKey };
  const problem = problemWith(shortcut);
  return problem ? { state: 'invalid', problem } : { state: 'done', shortcut };
}

export function matchesShortcut(event: Pick<KeyboardEvent, 'code' | 'ctrlKey' | 'altKey' | 'shiftKey' | 'metaKey'>,
                                shortcut: Shortcut): boolean {
  return event.code === shortcut.code && event.ctrlKey === shortcut.ctrl && event.altKey === shortcut.alt
    && event.shiftKey === shortcut.shift && event.metaKey === shortcut.meta;
}

/** 苹果设备显示 ⌘⌥ 字形。先看 User-Agent Client Hints，再退到 `navigator.platform`（同 `browser-diagnostics.ts`）。 */
export function isApplePlatform(source: Pick<Navigator, 'platform'> & { userAgentData?: { platform?: string } } = navigator): boolean {
  return /mac|iphone|ipad|ipod/i.test(source.userAgentData?.platform || source.platform || '');
}

const KEY_LABELS: Record<string, string> = {
  ArrowLeft: '←', ArrowRight: '→', ArrowUp: '↑', ArrowDown: '↓', Space: 'Space', Enter: 'Enter', Escape: 'Esc',
  Backspace: 'Backspace', Tab: 'Tab',
};

function keyLabel(code: string): string {
  return KEY_LABELS[code] ?? code.replace(/^Key|^Digit|^Numpad/, '');
}

export type Modifiers = Pick<Shortcut, 'ctrl' | 'alt' | 'shift' | 'meta'>;

/** 一个键一枚键帽：修饰键按 Apple 的次序 Control、Option、Shift、Command 排在前，主键在最后。
 *  Mac 上修饰键写 ⌃⌥⇧⌘ 字形，其余平台写名字，Meta 在那边是 Win 键。`code` 为 null 时只有修饰键，
 *  用于录制中还没按主键的那一刻。 */
export function shortcutKeys(modifiers: Modifiers, code: string | null, apple = isApplePlatform()): string[] {
  const names = apple ? ['⌃', '⌥', '⇧', '⌘'] : ['Ctrl', 'Alt', 'Shift', 'Win'];
  const held = [modifiers.ctrl, modifiers.alt, modifiers.shift, modifiers.meta];
  return [...names.filter((_, index) => held[index]), ...(code ? [keyLabel(code)] : [])];
}

/** 写成一串给读屏与提示用：Mac 连写（`⇧S`），其余平台用加号连（`Shift+S`）。 */
export function formatShortcut(shortcut: Shortcut, apple = isApplePlatform()): string {
  return shortcutKeys(shortcut, shortcut.code, apple).join(apple ? '' : '+');
}
