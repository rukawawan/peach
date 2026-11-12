/* 界面语言默认跟浏览器语言走（ADR-0156）。用例断言的是中文文案，这里在任何模块求值前把浏览器语言固定成简体中文，
 * 不随跑测试的机器（CI 上是 en-US）变；要测探测逻辑的用例直接给 resolveInterfaceLanguage 传语言列表。 */
Object.defineProperty(globalThis.navigator, 'languages', { value: ['zh-CN', 'zh'], configurable: true });
Object.defineProperty(globalThis.navigator, 'language', { value: 'zh-CN', configurable: true });
