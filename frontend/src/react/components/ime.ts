/* 输入法正在合成时的按键不归页面：回车在定字，方向键在挑候选字。
 *
 * 只看 `isComposing` 不够：Safari 在 `compositionend` 之后还会补发一次定字用的 keydown，
 * 那次 `isComposing` 已经是 false，只有 `keyCode` 还是 229，按回车提交的表单会被它提前提交
 * （open-claude-ui `2dc0e988e` 修的就是这一处）。 */
export function composingKey(event: { isComposing: boolean; keyCode?: number }): boolean {
  return event.isComposing || event.keyCode === 229;
}
