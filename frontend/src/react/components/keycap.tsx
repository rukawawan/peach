/* 拟物键帽，一个键一枚：录制快捷键时显示正按着的键、还空着的位置和这一下的结果。平时的绑定提示
 * 仍用 BoardUI Kbd 胶囊；BoardUI 没有这类组件，所以是 Peach 自己的组合件。样式见 `keycap.css`。 */
import { Fragment } from 'react';
import './keycap.css';

/** `down` 正按着；`slot` 还空着的位置；`invalid` 这一下没过；`done` 刚录好。 */
export type KeycapState = 'idle' | 'down' | 'slot' | 'invalid' | 'done';
export interface KeycapItem { label: string; state: KeycapState }

/** 一排键帽。`plus` 为真时键与键之间放加号（Windows 的写法），Mac 连写。 */
export function Keycaps({ keys, plus }: { keys: KeycapItem[]; plus: boolean }) {
  return (
    <span data-keycaps="">
      {keys.map((key, index) => (
        <Fragment key={`${index}-${key.label}`}>
          {plus && index ? <span data-keycap-plus="" aria-hidden>+</span> : null}
          <kbd data-keycap="" data-state={key.state}>{key.label}</kbd>
        </Fragment>
      ))}
    </span>
  );
}
