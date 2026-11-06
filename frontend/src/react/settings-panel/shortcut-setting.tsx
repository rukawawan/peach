/* 「SFW 快捷键」一行。平时用 BoardUI Kbd 胶囊提示当前绑定；点「更改」后换成一排拟物键帽：按住的键
 * 下沉亮起，还没按的位置用虚线空位占着，没过的一下描边变成错误色，录好变成成功色，片刻后收回胶囊。
 *
 * 录制期间在 window 捕获阶段收走每一次按键：同一下不能再落到壳的全局监听里切 SFW、关设置弹层
 * 或触发播放器快捷键。Esc 取消，焦点离开按钮也取消。规则与显示见 `../../keyboard-shortcut.ts`。 */
import { useEffect, useState } from 'react';
import { Button } from '@/components/base/buttons/button';
import { Kbd } from '@/components/base/kbd/kbd';
import { Keycaps, type KeycapItem } from '../components/keycap';
import {
  DEFAULT_SFW_SHORTCUT, formatShortcut, isApplePlatform, isModifierCode, recordShortcut, serializeShortcut, shortcutKeys,
  type Modifiers, type Shortcut,
} from '../../keyboard-shortcut';

/** 录好之后键帽停留多久再收回胶囊。 */
const SETTLE_MS = 600;
const NONE: Modifiers = { ctrl: false, alt: false, shift: false, meta: false };
const heldModifiers = (event: KeyboardEvent): Modifiers =>
  ({ ctrl: event.ctrlKey, alt: event.altKey, shift: event.shiftKey, meta: event.metaKey });

export function ShortcutSetting({ current, onChange }: { current: Shortcut; onChange(shortcut: Shortcut | null): void }) {
  const [recording, setRecording] = useState(false);
  const [problem, setProblem] = useState('');
  /** 录制中正按着的键：只按了修饰键时 `code` 为 null；按了不能用的主键会留在这里，配着原因。 */
  const [pressed, setPressed] = useState<{ modifiers: Modifiers; code: string | null }>({ modifiers: NONE, code: null });
  /** 刚录好的那一组，键帽亮一下再收回胶囊。 */
  const [saved, setSaved] = useState<Shortcut | null>(null);
  const stop = () => { setRecording(false); setProblem(''); setPressed({ modifiers: NONE, code: null }) };
  useEffect(() => {
    if (!recording) return undefined;
    const keydown = (event: KeyboardEvent) => {
      event.preventDefault();
      event.stopPropagation();
      if (event.key === 'Escape' && !event.ctrlKey && !event.altKey && !event.shiftKey && !event.metaKey) { stop(); return }
      const modifier = isModifierCode(event.code);
      setPressed({ modifiers: heldModifiers(event), code: modifier ? null : event.code });
      setProblem('');
      const result = recordShortcut(event);
      if (result.state === 'invalid') setProblem(result.problem);
      if (result.state === 'done') { onChange(result.shortcut); setSaved(result.shortcut); stop() }
    };
    // 松开修饰键时同步键帽；已经按过主键的那一组留着，让人看清是哪一下没过。
    const keyup = (event: KeyboardEvent) => {
      event.stopPropagation();
      setPressed((last) => (last.code === null ? { modifiers: heldModifiers(event), code: null } : last));
    };
    window.addEventListener('keydown', keydown, true);
    window.addEventListener('keyup', keyup, true);
    return () => { window.removeEventListener('keydown', keydown, true); window.removeEventListener('keyup', keyup, true) };
  }, [recording, onChange]);
  useEffect(() => {
    if (!saved) return undefined;
    const timer = window.setTimeout(() => setSaved(null), SETTLE_MS);
    return () => window.clearTimeout(timer);
  }, [saved]);

  const apple = isApplePlatform();
  const caps = (modifiers: Modifiers, code: string | null, state: KeycapItem['state']): KeycapItem[] =>
    shortcutKeys(modifiers, code, apple).map((label) => ({ label, state }));
  const slot = (label: string): KeycapItem => ({ label, state: 'slot' });
  const held = pressed.modifiers.ctrl || pressed.modifiers.alt || pressed.modifiers.shift || pressed.modifiers.meta;
  const keys: KeycapItem[] | null = saved ? caps(saved, saved.code, 'done')
    : !recording ? null
      : pressed.code ? caps(pressed.modifiers, pressed.code, problem ? 'invalid' : 'down')
        : held ? [...caps(pressed.modifiers, null, 'down'), slot('键')] : [slot('修饰键'), slot('键')];
  const custom = serializeShortcut(current) !== DEFAULT_SFW_SHORTCUT;
  const hint = saved ? `已改为 ${formatShortcut(saved, apple)}`
    : recording ? (problem || '按下新的组合键，Esc 取消') : '输入框外随时开关。';
  return (
    <div data-setting-row="">
      <span><b>SFW 快捷键</b><small id="sfwShortcutDescription" aria-live="polite">{hint}</small></span>
      <div data-setting-shortcut="" className="peach-react">
        {keys ? <Keycaps keys={keys} plus={!apple} />
          : <Kbd data-shortcut-keys="" aria-label={`当前快捷键 ${formatShortcut(current, apple)}`}>{formatShortcut(current, apple)}</Kbd>}
        {custom && !recording && !saved ? (
          <Button variant="secondary" size="small" onClick={() => onChange(null)}>恢复默认</Button>
        ) : null}
        <Button variant={recording ? 'secondary' : 'primary'} size="small" aria-describedby="sfwShortcutDescription"
          onClick={() => { if (recording) stop(); else { setSaved(null); setRecording(true) } }}
          onBlur={stop}>
          {recording ? '取消' : '更改'}
        </Button>
      </div>
    </div>
  );
}
