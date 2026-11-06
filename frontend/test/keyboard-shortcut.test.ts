import { expect, it } from 'vitest';

import {
  DEFAULT_SFW_SHORTCUT, formatShortcut, isApplePlatform, matchesShortcut, parseShortcut, recordShortcut, serializeShortcut,
  shortcutKeys,
} from '../src/keyboard-shortcut';

const press = (code: string, mods: Partial<Record<'ctrlKey' | 'altKey' | 'shiftKey' | 'metaKey', boolean>> = {}) =>
  ({ code, ctrlKey: false, altKey: false, shiftKey: false, metaKey: false, ...mods });

it('默认 Shift+S 往返不变，读不出的文本返回 null', () => {
  const shortcut = parseShortcut(DEFAULT_SFW_SHORTCUT)!;
  expect(shortcut).toEqual({ code: 'KeyS', ctrl: false, alt: false, shift: true, meta: false });
  expect(serializeShortcut(shortcut)).toBe(DEFAULT_SFW_SHORTCUT);
  expect(serializeShortcut(parseShortcut('Meta+Alt+Ctrl+Shift+Digit1')!)).toBe('Ctrl+Alt+Shift+Meta+Digit1');
  for (const text of ['', 'KeyS', 'Shift+ArrowLeft', 'Hyper+KeyS', 'Ctrl+KeyW', null]) {
    expect(parseShortcut(text)).toBeNull();
  }
});

it('Mac 用 ⌃⌥⇧⌘ 字形按 Apple 次序连写，其余平台写 Ctrl+Alt+Shift+Win', () => {
  const all = parseShortcut('Ctrl+Alt+Shift+Meta+KeyS')!;
  expect(formatShortcut(all, true)).toBe('⌃⌥⇧⌘S');
  expect(formatShortcut(all, false)).toBe('Ctrl+Alt+Shift+Win+S');
  expect(formatShortcut(parseShortcut('Shift+KeyS')!, true)).toBe('⇧S');
  expect(formatShortcut(parseShortcut('Alt+F5')!, false)).toBe('Alt+F5');
});

it('按物理键位匹配：Option+S 打出「ß」也认，修饰键多一个少一个都不认', () => {
  const shortcut = parseShortcut('Alt+KeyS')!;
  expect(matchesShortcut({ ...press('KeyS', { altKey: true }), key: 'ß' } as KeyboardEvent, shortcut)).toBe(true);
  expect(matchesShortcut(press('KeyS', { altKey: true, shiftKey: true }), shortcut)).toBe(false);
  expect(matchesShortcut(press('KeyS'), shortcut)).toBe(false);
  expect(matchesShortcut(press('KeyD', { altKey: true }), shortcut)).toBe(false);
});

it('录制：只按修饰键还在等；单键、方向键和浏览器占用的组合给出原因', () => {
  expect(recordShortcut(press('ShiftLeft', { shiftKey: true }))).toEqual({ state: 'waiting' });
  expect(recordShortcut(press('MetaRight', { metaKey: true }))).toEqual({ state: 'waiting' });
  expect(recordShortcut(press('KeyS'))).toMatchObject({ state: 'invalid', problem: expect.stringContaining('修饰键') });
  expect(recordShortcut(press('ArrowLeft', { shiftKey: true }))).toMatchObject({ state: 'invalid' });
  expect(recordShortcut(press('KeyW', { metaKey: true }))).toMatchObject({ state: 'invalid', problem: expect.stringContaining('浏览器') });
  expect(recordShortcut(press('KeyH', { metaKey: true, shiftKey: true })))
    .toEqual({ state: 'done', shortcut: { code: 'KeyH', ctrl: false, alt: false, shift: true, meta: true } });
});

it('平台判断先看 Client Hints，再看 navigator.platform', () => {
  expect(isApplePlatform({ platform: 'Win32', userAgentData: { platform: 'macOS' } })).toBe(true);
  expect(isApplePlatform({ platform: 'MacIntel' })).toBe(true);
  expect(isApplePlatform({ platform: 'Win32', userAgentData: { platform: 'Windows' } })).toBe(false);
});

it('键帽一个键一枚：修饰键在前、主键在后，只按修饰键时没有主键', () => {
  const held = { ctrl: true, alt: false, shift: true, meta: false };
  expect(shortcutKeys(held, 'KeyK', false)).toEqual(['Ctrl', 'Shift', 'K']);
  expect(shortcutKeys(held, 'KeyK', true)).toEqual(['⌃', '⇧', 'K']);
  expect(shortcutKeys(held, null, false)).toEqual(['Ctrl', 'Shift']);
  expect(shortcutKeys({ ctrl: false, alt: false, shift: false, meta: false }, 'ArrowLeft', false)).toEqual(['←']);
});
