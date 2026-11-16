/* Peach 原位改字核心。以 classic script 同步注册，保存由各端适配器提供。
 * i18n-exempt-file: classic script 不能导入翻译入口，且与官网、演示站共用一份，界面文字随兄弟项目接入多语言时再抽。 */
(() => {
  const SKIP = '[data-copy-editor],script,style,textarea,input,select,svg,[contenteditable]';
  const INTERACT = '[role="tab"],[role="switch"],[role="radio"],[role="radiogroup"],[role="slider"],[role="checkbox"],[role="combobox"],[data-platform-option],[aria-expanded],[aria-pressed],[aria-haspopup],summary,input,select,label,[data-copy-interact]';
  const spacing = new WeakMap();

  // 连续文字共用输入框，未改动的前后片段留在各自的行内元素里。
  function replaceTextParts(parts, text) {
    const before = parts.join('');
    let start = 0, suffix = 0;
    while (start < before.length && start < text.length && before[start] === text[start]) start++;
    while (suffix < before.length - start && suffix < text.length - start
      && before.at(-suffix - 1) === text.at(-suffix - 1)) suffix++;
    const end = before.length - suffix, insert = text.slice(start, text.length - suffix);
    let offset = 0, inserted = false;
    return parts.map((part, i) => {
      const from = offset; offset += part.length;
      const add = !inserted && start >= from && (start < offset || i === parts.length - 1);
      if (add) inserted = true;
      return part.slice(0, Math.max(0, Math.min(part.length, start - from)))
        + (add ? insert : '') + part.slice(Math.max(0, Math.min(part.length, end - from)));
    });
  }

  function cleanInline(element) {
    for (const child of [...element.querySelectorAll('span,code,b,strong,em,i,small,s,mark')].reverse()) {
      if (!child.textContent.trim() && !child.children.length
        && ![...child.attributes].some(attr => !['class', 'style'].includes(attr.name))) child.remove();
    }
    element.normalize();
  }

  async function readJson(response) {
    const raw = await response.text();
    let result;
    try { result = JSON.parse(raw); }
    catch {
      const error = new Error(`未取得保存结果（HTTP ${response.status}），请刷新页面核对；服务未返回 JSON`);
      error.unconfirmed = response.ok;
      throw error;
    }
    if (!response.ok || result?.ok === false) {
      throw new Error(result?.error || (typeof result?.detail === 'string' ? result.detail : `请求失败（HTTP ${response.status}）`));
    }
    if (result === null || typeof result !== 'object') {
      const error = new Error(`未取得保存结果（HTTP ${response.status}），请刷新页面核对`);
      error.unconfirmed = true;
      throw error;
    }
    return result;
  }

  function resolveDraft(edits, original) {
    if (!edits || typeof edits !== 'object') return original;
    let text = original;
    const seen = new Set();
    while (Object.hasOwn(edits, text) && !seen.has(text)) {
      seen.add(text);
      const next = edits[text];
      if (typeof next !== 'string') break;
      text = next;
    }
    return text;
  }

  function applyDrafts(root, edits, originals, skip = '') {
    if (!edits || typeof edits !== 'object') return;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      if (!node.parentElement || node.parentElement.closest(SKIP + (skip ? ',' + skip : ''))) continue;
      const original = originals.get(node) ?? node.data.trim();
      if (!Object.hasOwn(edits, original)) continue;
      const text = resolveDraft(edits, original);
      originals.set(node, original);
      if (!spacing.has(node)) spacing.set(node, [/^\s*/.exec(node.data)[0], /\s*$/.exec(node.data)[0]]);
      const [lead, trail] = spacing.get(node);
      const next = lead + text + trail;
      if (node.data !== next) node.data = next;
    }
  }

  function attachToolbarDrag(bar, handle = bar) {
    const properties = ['left', 'top', 'right', 'bottom', 'transform'];
    const original = properties.map(name => bar.style.getPropertyValue(name));
    let position = null, drag = null;
    const move = (x, y) => {
      const viewport = window.visualViewport;
      const left = (viewport?.offsetLeft ?? 0) + 12, top = (viewport?.offsetTop ?? 0) + 12;
      const width = viewport?.width ?? innerWidth, height = viewport?.height ?? innerHeight;
      Object.assign(bar.style, { left: '0px', top: '0px', right: 'auto', bottom: 'auto', transform: 'none' });
      // 模态框的 transform 可能改变 fixed 的包含块，拖动坐标仍按实际视口计算。
      const origin = bar.getBoundingClientRect();
      position = { x: Math.max(left, Math.min(x, left + width - origin.width - 24)),
        y: Math.max(top, Math.min(y, top + height - origin.height - 24)) };
      bar.style.left = `${(position.x - origin.left) / (origin.width / bar.offsetWidth || 1)}px`;
      bar.style.top = `${(position.y - origin.top) / (origin.height / bar.offsetHeight || 1)}px`;
    };
    const reposition = () => {
      if (position) { move(position.x, position.y); return; }
      const rect = bar.getBoundingClientRect(), viewport = window.visualViewport;
      const left = viewport?.offsetLeft ?? 0, top = viewport?.offsetTop ?? 0;
      if (rect.left < left + 12 || rect.right > left + (viewport?.width ?? innerWidth) - 12
        || rect.top < top + 12 || rect.bottom > top + (viewport?.height ?? innerHeight) - 12) move(rect.left, rect.top);
    };
    const stop = () => {
      if (drag && handle.hasPointerCapture(drag.id)) handle.releasePointerCapture(drag.id);
      drag = null; delete handle.dataset.dragging;
    };
    const down = event => {
      if (event.button !== 0 || event.target.closest('button,a,input,select,textarea,[contenteditable]')) return;
      const rect = bar.getBoundingClientRect();
      drag = { id: event.pointerId, x: event.clientX, y: event.clientY, left: rect.left, top: rect.top };
      handle.setPointerCapture(event.pointerId); handle.dataset.dragging = ''; handle.focus({ preventScroll: true }); event.preventDefault();
    };
    const motion = event => { if (drag?.id === event.pointerId) move(drag.left + event.clientX - drag.x, drag.top + event.clientY - drag.y); };
    const reset = () => { stop(); position = null; properties.forEach((name, index) => bar.style.setProperty(name, original[index])); reposition(); };
    const key = event => {
      if (event.target !== handle) return;
      const direction = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[event.key];
      if (event.key === 'Escape') { event.preventDefault(); reset(); }
      if (!direction) return;
      event.preventDefault(); const rect = bar.getBoundingClientRect(), step = event.shiftKey ? 40 : 10;
      move(rect.left + direction[0] * step, rect.top + direction[1] * step);
    };
    handle.title = '拖动工具栏空白处移动，方向键微调，双击空白处或 Esc 复位';
    handle.dataset.copyDrag = '';
    const events = { pointerdown: down, pointermove: motion, pointerup: stop, pointercancel: stop, keydown: key,
      dblclick: event => { if (!event.target.closest('button,a,input,select,textarea,[contenteditable]')) reset(); } };
    for (const [name, listener] of Object.entries(events)) handle.addEventListener(name, listener);
    const resize = new ResizeObserver(reposition); resize.observe(bar);
    addEventListener('resize', reposition); window.visualViewport?.addEventListener('resize', reposition);
    window.visualViewport?.addEventListener('scroll', reposition);
    return { reposition, destroy() {
      stop(); resize.disconnect();
      for (const [name, listener] of Object.entries(events)) handle.removeEventListener(name, listener);
      removeEventListener('resize', reposition); window.visualViewport?.removeEventListener('resize', reposition);
      window.visualViewport?.removeEventListener('scroll', reposition);
    } };
  }

  function createTools(options = {}) {
    const css = document.createElement('style'); css.dataset.copyEditor = '';
    css.textContent = (options.styles || '') + `
      [data-copy-highlight]{position:fixed;pointer-events:none;z-index:2147483646;outline:1.5px dashed var(--tungsten);outline-offset:3px;border-radius:var(--badge-radius);display:none}
      [data-copy-inline]{outline:2px solid var(--tungsten);outline-offset:3px;border-radius:var(--badge-radius);background:var(--hover);user-select:text;cursor:text}
      [data-copy-input]{position:fixed;z-index:2147483647;padding:2px 6px;border:0;border-radius:var(--badge-radius);outline:2px solid var(--tungsten);background:var(--ground);color:var(--ink)}
      [data-copy-state]{box-sizing:content-box;width:5em;flex:none;padding:0 8px;white-space:nowrap;text-align:center;overflow:hidden;text-overflow:ellipsis}
      [data-copy-feedback]{position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%);white-space:nowrap}
      [data-copy-drag]{cursor:grab!important;touch-action:none;user-select:none}[data-copy-drag][data-dragging]{cursor:grabbing!important}
      [data-copy-bar][data-selection-dock]{top:auto;right:auto;margin:0;bottom:max(16px,env(safe-area-inset-bottom),var(--selection-dock-space,0px),var(--copy-toolbar-clearance,0px))}
      @media(max-width:600px){[data-copy-state]{flex-basis:100%;text-align:center}}
      [data-copy-choice]{position:fixed;z-index:2147483647;background:var(--ground);color:var(--ink);border:1px solid var(--border-15);border-radius:var(--control-radius);padding:8px;max-width:calc(100vw - 32px)}
    `;
    document.head.append(css);
    const highlight = document.createElement('div'); highlight.dataset.copyEditor = ''; highlight.dataset.copyHighlight = '';
    const host = document.createElement('div'); host.className = 'peach-react'; host.dataset.copyEditor = ''; host.dataset.batchScope = '';
    for (const type of ['pointerdown', 'click']) host.addEventListener(type, event => event.stopPropagation());
    const bar = document.createElement('div'); bar.dataset.copyEditor = ''; bar.dataset.copyBar = '';
    bar.popover = 'manual'; bar.tabIndex = 0;
    bar.dataset.selectionDock = ''; bar.dataset.glassPane = ''; bar.setAttribute('role', 'group'); bar.setAttribute('aria-label', '文案编辑');
    const hint = document.createElement('span'); hint.id = 'peach-copy-hint'; hint.hidden = true;
    hint.textContent = '点击文字修改，回车或点别处保存，Esc 取消；暂停编辑后可操作页面。';
    bar.setAttribute('aria-describedby', hint.id);
    const state = document.createElement('span'); state.dataset.copyState = ''; state.textContent = '改字模式'; bar.append(state);
    const status = document.createElement('span'); status.dataset.copyFeedback = ''; status.setAttribute('role', 'status'); status.setAttribute('aria-live', 'polite');
    const say = (text, tone = '') => {
      status.textContent = text; state.title = text || '';
      state.textContent = tone === 'err' ? '保存失败' : text?.includes('Enter 保存') ? '正在编辑'
        : text?.startsWith('已保存') ? '已保存' : text === '已取消' ? '已取消'
        : text?.includes('…') ? '处理中' : active ? '改字模式' : '编辑已暂停';
    };
    const button = (text, action) => {
      const node = document.createElement('button'); node.type = 'button'; node.textContent = text;
      node.onclick = action; bar.append(node); return node;
    };
    let active = true, busy = false, recovery = null, choice = null;
    const toolbarDrag = attachToolbarDrag(bar);
    const toggle = button('暂停编辑', () => {
      if (busy) return;
      active = !active; options.onToggle?.(active); toggle.textContent = active ? '暂停编辑' : '继续编辑'; say('');
    });
    button('导出修改', () => options.onExport?.());
    button('退出编辑', () => { if (!busy) options.onExit?.(); });
    bar.append(status); host.append(hint, bar);
    const localStyles = new Map();
    const shadowObservers = new Map();
    let footer = null, toolsParent = null;
    const measureTools = () => {
      bar.style.setProperty('--copy-toolbar-clearance', `${footer ? innerHeight - footer.getBoundingClientRect().top + 12 : 0}px`);
      toolbarDrag.reposition();
    };
    const layout = new ResizeObserver(measureTools); layout.observe(bar);
    const modalHost = () => [...document.querySelectorAll('dialog:modal'), ...[...document.querySelectorAll('aside')].flatMap(node => [...node.shadowRoot?.querySelectorAll('dialog:modal') || []])].at(-1) || document.body;
    function placeTools() {
      for (const aside of document.querySelectorAll('aside')) {
        const root = aside.shadowRoot;
        if (root && !shadowObservers.has(root)) {
          const observer = new MutationObserver(placeTools);
          observer.observe(root, { childList: true, subtree: true, attributes: true, attributeFilter: ['open'] });
          shadowObservers.set(root, observer);
        }
      }
      for (const [root, observer] of shadowObservers) if (!root.host.isConnected) { observer.disconnect(); shadowObservers.delete(root); }
      const parent = modalHost();
      if (parent !== toolsParent) {
        toolsParent?.removeEventListener('transitionend', measureTools);
        toolsParent = parent; toolsParent.addEventListener('transitionend', measureTools);
      }
      const root = parent.getRootNode();
      if (root instanceof ShadowRoot && !localStyles.has(root)) {
        const style = css.cloneNode(true); root.append(style); localStyles.set(root, style);
      }
      for (const [root, style] of localStyles) if (!root.host.isConnected) { style.remove(); localStyles.delete(root); }
      let moved = false;
      for (const node of [highlight, host, choice?.node]) if (node && node.parentElement !== parent) { parent.append(node); moved = true; }
      // 保持模态框内的可交互资格，工具条本身在顶层按整个视口定位，不受弹窗裁切。
      if (!bar.matches(':popover-open')) bar.showPopover();
      const nextFooter = parent.matches('dialog') ? parent.querySelector('footer,.footer') : null;
      if (footer !== nextFooter) { if (footer) layout.unobserve(footer); footer = nextFooter; if (footer) layout.observe(footer); }
      if (moved) measureTools();
    }
    const observer = new MutationObserver(placeTools);
    observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['open'] });
    placeTools();
    return {
      highlight, say,
      setBusy(value) { busy = value; if (value) bar.setAttribute('aria-busy', 'true'); else bar.removeAttribute('aria-busy'); },
      setRecovery(text, action) {
        recovery?.remove(); recovery = null;
        if (action) recovery = button(text, () => {
          recovery.remove(); recovery = null; action();
        });
      },
      choose(items, rect, { label = '选项', message = '' } = {}) {
        choice?.cancel();
        const select = document.createElement('select'); select.dataset.copyEditor = ''; select.dataset.copyChoice = '';
        select.setAttribute('aria-label', label); select.add(new Option(`请选择${label}`, ''));
        items.forEach((item, index) => select.add(new Option(item.label, String(index))));
        Object.assign(select.style, { left: Math.max(16, Math.min(rect.left, innerWidth - 300)) + 'px',
          top: Math.max(16, Math.min(rect.bottom + 8, innerHeight - 60)) + 'px' });
        modalHost().append(select); select.focus(); if (message) say(message);
        return new Promise(resolve => {
          const finish = value => { select.remove(); document.removeEventListener('keydown', cancel, true); choice = null; resolve(value); };
          const cancel = event => { if (event.key === 'Escape') { event.preventDefault(); event.stopImmediatePropagation(); finish(null); } };
          choice = { node: select, cancel: () => finish(null) };
          select.onchange = () => { if (select.value !== '') finish(items[Number(select.value)].value); };
          document.addEventListener('keydown', cancel, true);
        });
      },
      destroy() {
        observer.disconnect(); layout.disconnect(); toolbarDrag.destroy(); choice?.cancel();
        for (const observer of shadowObservers.values()) observer.disconnect();
        toolsParent?.removeEventListener('transitionend', measureTools);
        for (const style of localStyles.values()) style.remove();
        highlight.remove(); host.remove(); css.remove();
      },
    };
  }

  function create(options) {
    const skip = SKIP + (options.skip ? ',' + options.skip : '');
    const highlight = options.highlight || document.createElement('div');
    highlight.dataset.copyEditor = ''; highlight.dataset.copyHighlight = '';
    if (!options.highlight) document.body.append(highlight);
    let editing = null, busy = false, destroyed = false;
    const say = (message, tone) => options.onStatus?.(message, tone);
    const setBusy = value => { busy = value; options.onBusy?.(value); };
    const blocked = () => destroyed || busy || options.isBusy?.() || options.isActive?.() === false;
    const hideHighlight = () => { highlight.style.display = 'none'; };
    const scroll = () => { hideHighlight(); positionInput(); };
    const rectsOf = node => { const range = document.createRange(); range.selectNodeContents(node); return [...range.getClientRects()]; };
    function textAt(x, y) {
      const shadowRoots = [...document.querySelectorAll('aside')].map(node => node.shadowRoot).filter(Boolean);
      const caret = document.caretPositionFromPoint?.(x, y, { shadowRoots }), range = caret ? null : document.caretRangeFromPoint?.(x, y);
      const node = caret?.offsetNode || range?.startContainer;
      if (!node || node.nodeType !== 3 || !node.data.trim() || !node.parentElement || node.parentElement.closest(skip)) return null;
      return rectsOf(node).some(rect => x >= rect.left - 2 && x <= rect.right + 2 && y >= rect.top - 2 && y <= rect.bottom + 2) ? node : null;
    }
    const resolve = node => options.resolve ? options.resolve(node) : {};
    function move(event) {
      if (blocked() || editing) return;
      if (!event.altKey && event.target.closest?.(INTERACT)) { hideHighlight(); return; }
      const node = textAt(event.clientX, event.clientY);
      if (!node || !resolve(node)) { hideHighlight(); return; }
      const rects = rectsOf(resolve(node)?.element || node), left = Math.min(...rects.map(rect => rect.left)), top = Math.min(...rects.map(rect => rect.top));
      Object.assign(highlight.style, { position: 'fixed', display: 'block', left: left + 'px', top: top + 'px',
        width: Math.max(...rects.map(rect => rect.right)) - left + 'px', height: Math.max(...rects.map(rect => rect.bottom)) - top + 'px' });
    }
    function click(event) {
      if (blocked() || event.target.closest?.(skip)) return;
      if (!event.altKey && event.target.closest?.(INTERACT)) { if (editing) commit(); return; }
      if (editing) {
        event.preventDefault(); event.stopImmediatePropagation();
        if (!editing.box.contains(event.target)) commit();
        return;
      }
      const node = textAt(event.clientX, event.clientY), target = node && resolve(node);
      if (!target) return;
      event.preventDefault(); event.stopImmediatePropagation(); begin(node, target);
    }
    function positionInput() {
      if (editing?.box.tagName !== 'INPUT' || !editing.node.isConnected) return;
      const rect = rectsOf(editing.node)[0];
      if (!rect) return;
      const viewport = window.visualViewport, width = viewport?.width ?? innerWidth, height = viewport?.height ?? innerHeight;
      const x = viewport?.offsetLeft ?? 0, y = viewport?.offsetTop ?? 0;
      const inputWidth = Math.min(Math.max(140, rect.width + 60), Math.max(1, width - 32));
      const inputHeight = editing.box.getBoundingClientRect().height;
      Object.assign(editing.box.style, { left: Math.max(x + 16, Math.min(rect.left - 6, x + width - inputWidth - 16)) + 'px',
        top: Math.max(y + 2, Math.min(rect.top + (rect.height - inputHeight) / 2, y + height - inputHeight - 2)) + 'px', width: inputWidth + 'px' });
    }
    async function begin(node, target) {
      const before = target.element ? target.element.textContent : node.data, originalText = before.trim();
      let ed = { node, before, originalText, lead: /^\s*/.exec(before)[0], trail: /\s*$/.exec(before)[0],
        core: originalText, multiline: !!node.parentElement.closest('pre,code'), ...target };
      setBusy(true);
      try {
        const prepared = await options.prepare?.(ed);
        if (prepared === null || destroyed || !node.isConnected || (ed.element ? ed.element.textContent : node.data) !== before) { say('已取消'); return; }
        ed = { ...ed, ...prepared };
        const input = !!node.parentElement.closest('button,a,[role="button"]');
        const box = document.createElement(input ? 'input' : 'span');
        ed.box = box;
        if (input) {
          box.dataset.copyEditor = ''; box.dataset.copyInput = '';
          if (options.inputClass) box.className = options.inputClass;
          box.value = ed.core;
          const style = getComputedStyle(node.parentElement);
          Object.assign(box.style, { position: 'fixed', boxSizing: 'border-box', font: style.font, letterSpacing: style.letterSpacing });
          const host = node.parentElement.closest('dialog[open]') || document.body;
          ed.placeholder = document.createElement('span'); ed.placeholder.dataset.copyEditor = '';
          ed.placeholder.style.visibility = 'hidden';
          node.replaceWith(ed.placeholder); ed.placeholder.append(node);
          host.append(box);
        } else {
          box.dataset.copyInline = '';
          if (options.inlineClass) box.className = options.inlineClass;
          box.contentEditable = 'plaintext-only'; box.spellcheck = false; box.textContent = ed.core;
          if (ed.element) {
            ed.parts = ed.nodes.map(node => node.data);
            ed.fragment = document.createDocumentFragment();
            ed.fragment.append(...ed.element.childNodes);
            ed.element.append(box);
          } else node.replaceWith(...[ed.lead, box, ed.trail].filter(Boolean));
        }
        box.setAttribute('aria-label', '修改文字'); editing = ed; positionInput(); box.focus();
        if (input) box.select();
        else { const range = document.createRange(); range.selectNodeContents(box); getSelection()?.removeAllRanges(); getSelection()?.addRange(range); }
        hideHighlight(); say(ed.candidate?.template ? '保留 {占位符}，只改文字 · Enter 保存 · Esc 取消' : 'Enter 保存 · Esc 取消');
        box.addEventListener('keydown', event => {
          event.stopPropagation(); if (event.isComposing) return;
          if (event.key === 'Enter' && !(ed.multiline && event.shiftKey)) { event.preventDefault(); commit(); }
          else if (event.key === 'Escape') { event.preventDefault(); commit(true); }
        });
        box.addEventListener('blur', () => commit());
        if (ed.element) box.addEventListener('input', () => {
          const text = box.textContent.replace(/\s*\n\s*/g, ' ').trim();
          ed.parts = replaceTextParts(ed.parts, ed.lead + text + ed.trail);
        });
      } catch (error) { say(error.message, 'err'); }
      finally { setBusy(false); }
    }
    function putBack(ed) {
      if (ed.box.tagName === 'INPUT') { ed.placeholder.replaceWith(ed.node); ed.box.remove(); return; }
      if (ed.element) { ed.box.replaceWith(ed.fragment); return; }
      const a = ed.box.previousSibling, c = ed.box.nextSibling;
      if (ed.lead && a?.nodeType === 3) a.remove();
      if (ed.trail && c?.nodeType === 3) c.remove();
      ed.box.replaceWith(ed.node);
    }
    async function commit(cancel = false) {
      const ed = editing; if (!ed) return; editing = null;
      const value = ed.box.tagName === 'INPUT' ? ed.box.value : ed.box.textContent;
      const text = (ed.multiline ? value : value.replace(/\s*\n\s*/g, ' ')).trim();
      const connected = ed.node.isConnected || ed.box.isConnected;
      putBack(ed);
      if (cancel || !connected) { say('已取消'); return; }
      if (text === ed.core) return;
      setBusy(true); say('保存中…');
      let persisted = false;
      try {
        const result = await options.save(ed, text) ?? {};
        persisted = true;
        const rendered = result.text ?? text;
        if (ed.element) {
          const parts = replaceTextParts(ed.parts, ed.lead + rendered + ed.trail);
          ed.nodes.forEach((node, i) => { node.data = parts[i]; });
          cleanInline(ed.element);
        } else if (result.remove) ed.node.remove(); else ed.node.data = ed.lead + rendered + ed.trail;
        say(result.message || (rendered ? '已保存修改' : '已删除文字'), 'ok');
        await options.onSaved?.(ed, { ...result, text: rendered });
      } catch (error) {
        if (!persisted && !ed.element) ed.node.data = ed.before;
        say((persisted ? '已保存，界面更新未完成：' : error.unconfirmed ? '未确认保存：' : '没保存：') + error.message, 'err');
      } finally { setBusy(false); }
    }
    document.addEventListener('mousemove', move, { passive: true });
    document.addEventListener('click', click, true);
    addEventListener('scroll', scroll, true);
    addEventListener('resize', positionInput);
    window.visualViewport?.addEventListener('resize', positionInput);
    window.visualViewport?.addEventListener('scroll', positionInput);
    return {
      commit, hideHighlight,
      get editing() { return editing; }, get busy() { return busy; },
      destroy() {
        commit(true); destroyed = true; hideHighlight();
        document.removeEventListener('mousemove', move);
        document.removeEventListener('click', click, true);
        removeEventListener('scroll', scroll, true);
        removeEventListener('resize', positionInput);
        window.visualViewport?.removeEventListener('resize', positionInput);
        window.visualViewport?.removeEventListener('scroll', positionInput);
        if (!options.highlight) highlight.remove();
      },
    };
  }
  globalThis.PeachCopyEditorCore = Object.freeze({ version: 1, create, createTools, attachToolbarDrag, readJson, resolveDraft, applyDrafts, replaceTextParts });
})();
