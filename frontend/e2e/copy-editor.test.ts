import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { after, before, describe, it } from 'node:test';
import type { Browser } from 'playwright-core';
import { launch, visit, settle, VIEWPORTS } from './harness.ts';

async function editorScripts() {
  return await readFile(new URL('../src/copy-editor-core.js', import.meta.url), 'utf8') + '\n'
    + await readFile(new URL('../../scripts/dev/copy-editor.js', import.meta.url), 'utf8');
}

describe('原位改字', () => {
  let browser: Browser;
  before(async () => { browser = await launch(); });
  after(async () => { await browser?.close(); });
  for (const viewport of VIEWPORTS) {
    it(`核心工具栏通过回调处理动作并清理未完成选择（${viewport.name}）`, async () => {
      const context = await browser.newContext({ viewport });
      try {
        const page = await context.newPage();
        await page.setContent('<meta charset="utf-8"><body><p>预览说明</p></body>');
        await page.addScriptTag({ content: await readFile(new URL('../src/copy-editor-core.js', import.meta.url), 'utf8') });
        await page.evaluate(() => {
          const tools = (globalThis as any).PeachCopyEditorCore.createTools({
            onToggle(active: boolean) { document.body.dataset.active = String(active); },
            onExport() { document.body.dataset.exported = 'true'; },
            onExit() { document.body.dataset.exited = 'true'; },
          });
          (globalThis as any).copyTools = tools;
          tools.say('编辑就绪');
        });
        assert.equal(await page.getByRole('status').innerText(), '编辑就绪');
        await page.getByRole('button', { name: '暂停编辑', exact: true }).click();
        assert.equal(await page.locator('body').getAttribute('data-active'), 'false');
        await page.getByRole('button', { name: '继续编辑', exact: true }).click();
        assert.equal(await page.locator('body').getAttribute('data-active'), 'true');
        await page.evaluate(() => (globalThis as any).copyTools.setBusy(true));
        await page.getByRole('button', { name: '暂停编辑', exact: true }).click();
        await page.getByRole('button', { name: '退出编辑', exact: true }).click();
        assert.equal(await page.locator('body').getAttribute('data-active'), 'true');
        assert.equal(await page.locator('body').getAttribute('data-exited'), null);
        await page.evaluate(() => (globalThis as any).copyTools.setBusy(false));
        await page.getByRole('button', { name: '导出修改', exact: true }).click();
        await page.getByRole('button', { name: '退出编辑', exact: true }).click();
        assert.equal(await page.locator('body').getAttribute('data-exported'), 'true');
        assert.equal(await page.locator('body').getAttribute('data-exited'), 'true');
        await page.evaluate(() => {
          const tools = (globalThis as any).copyTools;
          tools.setRecovery('继续等待', () => { document.body.dataset.recovery = 'wait'; });
          tools.setRecovery('重试生效', () => { document.body.dataset.recovery = 'retry'; });
        });
        assert.equal(await page.getByRole('button', { name: '继续等待', exact: true }).count(), 0);
        await page.getByRole('button', { name: '重试生效', exact: true }).click();
        assert.equal(await page.locator('body').getAttribute('data-recovery'), 'retry');
        assert.equal(await page.getByRole('button', { name: '重试生效', exact: true }).count(), 0);
        await page.evaluate(() => {
          (globalThis as any).copyTools.choose([{ label: '文案位置', value: 'source-1' }], { left: 20, bottom: 80 }, { label: '文案来源' })
            .then((value: unknown) => { document.body.dataset.choice = JSON.stringify(value); });
        });
        await page.getByRole('combobox', { name: '文案来源' }).selectOption('0');
        assert.equal(await page.locator('body').getAttribute('data-choice'), '"source-1"');
        await page.evaluate(() => {
          const tools = (globalThis as any).copyTools;
          tools.choose([{ label: '文案位置', value: 'source-2' }], { left: 20, bottom: 80 })
            .then((value: unknown) => { document.body.dataset.choice = JSON.stringify(value); });
          tools.destroy();
        });
        assert.equal(await page.locator('body').getAttribute('data-choice'), 'null');
        assert.equal(await page.locator('[data-copy-editor]').count(), 0);
      } finally { await context.close(); }
    });

    it(`模态弹层中的工具栏可暂停编辑并随关闭返回页面（${viewport.name}）`, async () => {
      const context = await browser.newContext({ viewport });
      try {
        const page = await context.newPage();
        await page.route('https://copy.example/**', route => route.fulfill({ contentType: 'text/html; charset=utf-8',
          body: '<meta charset="utf-8"><body><dialog id="first"><p id="copy">弹层说明</p></dialog><dialog id="second"><p>确认说明</p></dialog></body>' }));
        await page.goto('https://copy.example/?edit');
        await page.addScriptTag({ content: await editorScripts() });
        await page.evaluate(() => {
          const dialog = document.querySelector<HTMLDialogElement>('#first')!;
          document.body.dataset.dialogClicks = '0';
          dialog.addEventListener('click', () => { document.body.dataset.dialogClicks = String(Number(document.body.dataset.dialogClicks) + 1) });
          dialog.showModal();
        });
        await page.locator('#first [data-copy-bar]').waitFor();
        await page.getByRole('button', { name: '暂停编辑', exact: true }).click();
        await page.getByRole('button', { name: '继续编辑', exact: true }).click();
        assert.equal(await page.locator('body').getAttribute('data-dialog-clicks'), '0');
        await page.locator('#copy').click({ position: { x: 8, y: 8 } });
        const input = page.locator('#copy [contenteditable]');
        await input.fill('临时修改'); await input.press('Escape');
        assert.equal(await page.locator('#copy').innerText(), '弹层说明');
        await page.evaluate(() => document.querySelector<HTMLDialogElement>('#second')!.showModal());
        await page.locator('#second [data-copy-bar]').waitFor();
        await page.getByRole('button', { name: '暂停编辑', exact: true }).click();
        await page.evaluate(() => document.querySelector<HTMLDialogElement>('#second')!.close());
        await page.locator('#first [data-copy-bar]').waitFor();
        await page.evaluate(() => document.querySelector<HTMLDialogElement>('#first')!.close());
        assert.equal(await page.locator('[data-copy-bar]').evaluate(node => node.closest('dialog') === null), true);
      } finally { await context.close(); }
    });

    it(`工具条在 Shadow DOM 弹窗外按网页定位，非按钮区域可拖动（${viewport.name}）`, async () => {
      const context = await browser.newContext({ viewport });
      try {
        const page = await context.newPage();
        await page.setContent('<meta charset="utf-8"><body><aside></aside></body>');
        await page.addScriptTag({ content: await readFile(new URL('../src/copy-editor-core.js', import.meta.url), 'utf8') });
        const styles = (await Promise.all([
          '../src/react/components/selection-dock.css', '../src/react/batch-dock/batch-dock.css',
          '../src/react/pages/copy-editor-page.css',
        ].map(path => readFile(new URL(path, import.meta.url), 'utf8')))).join('\n');
        const originalBodyHeight = await page.evaluate(styles => {
          const root = document.querySelector('aside')!.attachShadow({ mode: 'open' });
          root.innerHTML = '<style>dialog{inset:auto 16px 16px auto;margin:0;width:180px;height:200px;overflow:hidden;transform:translateY(0)}</style><dialog><div class="body"><p>设置内容</p></div></dialog>';
          root.querySelector('dialog')!.showModal();
          const bodyHeight = root.querySelector('.body')!.getBoundingClientRect().height;
          (globalThis as any).copyTools = (globalThis as any).PeachCopyEditorCore.createTools({
            styles, onToggle(active: boolean) { document.body.dataset.active = String(active); },
          });
          return bodyHeight;
        }, '.peach-react *{box-sizing:border-box}' + styles);
        const dock = page.getByRole('group', { name: '文案编辑', exact: true });
        await dock.waitFor();
        assert.equal(await page.locator('dialog .body').evaluate(node => node.getBoundingClientRect().height),
          originalBodyHeight, '全页浮条不增加设置内容高度');
        const placement = await dock.evaluate(node => {
          const rect = node.getBoundingClientRect(), modal = node.closest('dialog')!.getBoundingClientRect();
          return { open: node.matches(':popover-open'), left: rect.left, center: (rect.left + rect.right) / 2,
            width: innerWidth, modalLeft: modal.left };
        });
        assert.equal(placement.open, true);
        assert.ok(Math.abs(placement.center - placement.width / 2) <= 1, JSON.stringify(placement));
        assert.ok(placement.left < placement.modalLeft, JSON.stringify(placement));
        const before = await dock.boundingBox(), grip = await dock.locator('[data-copy-state]').boundingBox();
        assert.ok(before && grip);
        await page.mouse.move(grip.x + grip.width / 2, grip.y + grip.height / 2);
        await page.mouse.down();
        await page.mouse.move(grip.x + grip.width / 2, grip.y + grip.height / 2 - 120, { steps: 8 });
        await page.mouse.up();
        const dragged = await dock.boundingBox();
        assert.ok(dragged && Math.abs(dragged.y - before.y + 120) <= 1);
        await dock.getByRole('button', { name: '暂停编辑', exact: true }).click();
        assert.equal(await page.locator('body').getAttribute('data-active'), 'false');
        assert.deepEqual(await dock.boundingBox(), dragged, '点击按钮不拖动工具条');
        await page.evaluate(() => document.querySelector('aside')!.shadowRoot!.querySelector('dialog')!.close());
        await page.locator('body > [data-copy-editor] [data-copy-bar]').waitFor();
        assert.equal(await dock.evaluate(node => node.matches(':popover-open')), true);
        await page.evaluate(() => (globalThis as any).copyTools.destroy());
        assert.equal(await dock.count(), 0);
      } finally { await context.close(); }
    });

    it(`链接和按钮输入框独占文字位置并恢复原文（${viewport.name}）`, async () => {
      const context = await browser.newContext({ viewport });
      try {
        const page = await context.newPage();
        await page.setContent('<meta charset="utf-8"><style>[data-copy-highlight]{pointer-events:none}[data-copy-input]{padding:2px 6px;border:0;background:#141518;color:white}</style><header style="position:fixed;top:8px;left:20px;font:13px/20.8px sans-serif"><a id="link" href="#download">下载最新版 →</a></header><button id="button" style="margin:90px 20px">操作名称</button>');
        await page.addScriptTag({ content: await readFile(new URL('../src/copy-editor-core.js', import.meta.url), 'utf8') });
        await page.evaluate(() => (globalThis as any).PeachCopyEditorCore.create({save(_edit: unknown, text: string) {
          if (text === '保存失败') throw Error('临时失败');
          return {};
        }}));
        for (const id of ['link', 'button']) {
          const target = page.locator('#' + id), before = await target.boundingBox(), original = await target.innerText();
          await target.click();
          const input = page.locator('[data-copy-input]'); await input.waitFor();
          assert.equal(await target.locator('[data-copy-editor]').evaluate(node => getComputedStyle(node).visibility), 'hidden');
          assert.deepEqual(await target.boundingBox(), before, '隐藏原文仍保留控件布局');
          const rect = await input.boundingBox(); assert.ok(rect && rect.y >= 2);
          await input.fill('取消修改'); await input.press('Escape');
          assert.equal(await target.innerText(), original);
          assert.equal(await target.locator('[data-copy-editor]').count(), 0);
          await target.click(); await input.fill('保存失败'); await input.press('Enter');
          assert.equal(await target.innerText(), original);
          assert.equal(await target.locator('[data-copy-editor]').count(), 0);
          await target.click(); await input.fill('已修改'); await input.press('Enter');
          assert.equal(await target.innerText(), '已修改');
          assert.equal(await target.locator('[data-copy-editor]').count(), 0);
        }
      } finally { await context.close(); }
    });
    it(`连续行内文字整段编辑、取消与保存失败保留样式（${viewport.name}）`, async () => {
      const context = await browser.newContext({ viewport });
      try {
        const page = await context.newPage();
        await page.setContent('<meta charset="utf-8"><style>[data-copy-highlight]{pointer-events:none}</style><p id="copy" style="margin:80px 20px">配置保存在 <code>/data</code>，媒体在 <code>/media</code>。</p>');
        await page.addScriptTag({ content: await readFile(new URL('../src/copy-editor-core.js', import.meta.url), 'utf8') });
        await page.evaluate(() => {
          const core = (globalThis as any).PeachCopyEditorCore;
          core.create({ resolve(node: Text) {
            const element = node.parentElement!.closest('#copy');
            if (!element) return null;
            const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT), nodes = [];
            for (let part = walker.nextNode(); part; part = walker.nextNode()) nodes.push(part);
            return { element, nodes };
          }, save(_edit: unknown, text: string) {
            if (text === '保存失败') throw Error('临时失败');
            return {};
          } });
        });
        const box = page.locator('[contenteditable]');
        await page.locator('#copy code').first().click();
        assert.equal(await box.innerText(), '配置保存在 /data，媒体在 /media。');
        await box.fill('取消修改'); await box.press('Escape');
        assert.equal(await page.locator('#copy code').count(), 2);
        await page.locator('#copy code').first().click();
        await box.fill('保存失败'); await box.press('Enter');
        assert.equal(await page.locator('#copy').innerText(), '配置保存在 /data，媒体在 /media。');
        assert.equal(await page.locator('#copy code').count(), 2);
        await page.locator('#copy code').first().click();
        await box.fill('配置保存在 ，媒体在 /media。'); await box.press('Enter');
        assert.equal(await page.locator('#copy code').count(), 1);
        assert.equal(await page.locator('#copy code').innerText(), '/media');
        await page.locator('#copy code').click();
        await box.fill(''); await box.press('Enter');
        assert.equal(await page.locator('#copy').innerText(), '');
        assert.equal(await page.locator('#copy code').count(), 0);
      } finally { await context.close(); }
    });
    it(`切换控件可操作、Alt 改字与清空草稿可保存（${viewport.name}）`, async () => {
      const context = await browser.newContext({ viewport });
      try {
        const page = await context.newPage();
        await page.route('https://copy.example/**', route => route.fulfill({ contentType: 'text/html; charset=utf-8',
          body: '<meta charset="utf-8"><body><main style="margin:80px 20px"><button id="tab" role="tab" aria-selected="false" onclick="this.setAttribute(\'aria-selected\',\'true\')">平台切换</button><p id="copy">可删除说明</p><pre id="command">命令一</pre><div style="height:1800px"></div></main></body>' }));
        await page.goto('https://copy.example/?edit');
        await page.addScriptTag({ content: await editorScripts() });
        await page.locator('#tab').click();
        assert.equal(await page.locator('#tab').getAttribute('aria-selected'), 'true');
        assert.equal(await page.locator('[data-copy-input]').count(), 0);
        await page.locator('#tab').click({ modifiers: ['Alt'] });
        const input = page.locator('[data-copy-input]');
        await input.waitFor();
        await page.evaluate(() => scrollTo(0, 120));
        const rect = await input.boundingBox();
        assert.ok(rect && rect.x >= 16 && rect.y >= 2 && rect.x + rect.width <= viewport.width - 15
          && rect.y + rect.height <= viewport.height - 1);
        await input.fill('切换文字'); await input.press('Enter');
        assert.equal(await page.locator('#tab').innerText(), '切换文字');
        await page.locator('#command').click({ position: { x: 5, y: 8 } });
        const multiline = page.locator('#command [contenteditable]');
        await multiline.fill('命令一'); await multiline.press('End'); await multiline.press('Shift+Enter');
        await multiline.pressSequentially('command2'); await multiline.press('Enter');
        assert.equal(await page.locator('#command').innerText(), '命令一\ncommand2');
        await page.locator('#copy').click({ position: { x: 5, y: 8 } });
        const inline = page.locator('#copy [contenteditable]');
        await inline.fill(''); await inline.press('Enter');
        assert.equal(await page.locator('#copy').innerText(), '');
        assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('peach.copy-edits.v1')!)['可删除说明']), '');
        await page.reload(); await page.addScriptTag({ content: await editorScripts() });
        assert.equal(await page.locator('#copy').innerText(), '');
      } finally { await context.close(); }
    });

    it(`保存后等待生效并保留编辑地址刷新，失败可单独重试（${viewport.name}）`, async () => {
      const context = await browser.newContext({ viewport });
      try {
        const page = await context.newPage();
        let navigations = 0, saves = 0, retries = 0;
        let job = { id: 'build-1', state: 'building', message: '已保存，正在构建…' };
        await page.route('https://copy.example/**', async route => {
          const path = new URL(route.request().url()).pathname;
          if (path === '/dev/copy-edits') return route.fulfill({ json: {} });
          if (path === '/dev/copy-candidates') return route.fulfill({ json: [{ file: 'frontend/src/copy.ts', line: 1 }] });
          if (path === '/dev/copy-save') { saves++; return route.fulfill({ json: { ok: true, text: '生效说明', apply: job } }); }
          if (path === '/dev/copy-apply') {
            if (route.request().method() === 'POST') {
              retries++; job = { id: 'build-2', state: 'ready', message: '构建完成，正在刷新…' };
              return route.fulfill({ json: { ok: true, apply: job } });
            }
            return route.fulfill({ json: job });
          }
          navigations++;
          return route.fulfill({ contentType: 'text/html; charset=utf-8', body: `<meta charset="utf-8"><body data-peach-copy-mode="source"><p id="copy" style="margin:60px 20px">${navigations === 1 ? '原说明' : '生效说明'}</p></body>` });
        });
        await page.goto('https://copy.example/settings?section=library&edit');
        await page.addScriptTag({ content: await editorScripts() });
        await page.locator('#copy').click({ position: { x: 5, y: 8 } });
        const inline = page.locator('#copy [contenteditable]');
        await inline.fill('生效说明'); await inline.press('Enter');
        await page.getByRole('status').filter({ hasText: '正在构建' }).waitFor();
        assert.equal(navigations, 1);
        job = { ...job, state: 'error', message: '构建失败' };
        await page.getByRole('status').filter({ hasText: '已保存，未生效：构建失败' }).waitFor();
        assert.equal(await page.locator('#copy').innerText(), '生效说明');
        await Promise.all([page.waitForEvent('load'), page.getByRole('button', { name: '重试生效' }).click()]);
        assert.equal(navigations, 2); assert.equal(saves, 1); assert.equal(retries, 1);
        assert.equal(page.url(), 'https://copy.example/settings?section=library&edit');
        assert.equal(await page.locator('#copy').innerText(), '生效说明');
        assert.equal(await page.evaluate(() => sessionStorage.getItem('peach.copy-apply.v1')), null);
      } finally { await context.close(); }
    });

    it(`连续改字记录显示最终文案并终止循环（${viewport.name}）`, async () => {
      const context = await browser.newContext({ viewport });
      try {
        const page = await context.newPage();
        await page.route('https://copy.example/**', route => route.fulfill({
          contentType: 'text/html; charset=utf-8', body: '<meta charset="utf-8"><body><p id="copy">说明</p><p id="cycle">循环甲</p></body>',
        }));
        await page.goto('https://copy.example/?edit');
        await page.evaluate(() => localStorage.setItem('peach.copy-edits.v1', JSON.stringify({
          说明: '中间文案', 中间文案: '最终文案', 循环甲: '循环乙', 循环乙: '循环甲',
        })));
        await page.addScriptTag({ content: await editorScripts() });
        assert.equal(await page.locator('#copy').innerText(), '最终文案');
        assert.equal(await page.locator('#cycle').innerText(), '循环甲');
      } finally { await context.close(); }
    });

    it(`源码模板保存与占位符失败反馈（${viewport.name}）`, async () => {
      const context = await browser.newContext({ viewport });
      try {
        const page = await context.newPage();
        const original = '768 项需要处理，其中 533 项是来源限流；其余可重试。';
        const template = '{problems} 项需要处理，其中 {paused} 项是来源限流；其余可重试。';
        const candidate = { file: 'src/peach/library_processing.py', line: 1, template };
        const saves: unknown[] = [];
        await page.route('https://copy.example/**', async route => {
          const path = new URL(route.request().url()).pathname;
          if (path === '/dev/copy-edits') return route.fulfill({ json: {} });
          if (path === '/dev/copy-candidates') return route.fulfill({ json: [candidate] });
          if (path === '/dev/copy-save') {
            const body = route.request().postDataJSON(); saves.push(body);
            return body.replacement.includes('{paused}')
              ? route.fulfill({ json: { ok: true, text: '待处理 768 项，限流 533 项。' } })
              : route.fulfill({ status: 409, json: { error: '请保留全部占位符，各出现一次' } });
          }
          return route.fulfill({ contentType: 'text/html; charset=utf-8',
            body: `<meta charset="utf-8"><body data-peach-copy-mode="source"><p id="copy" style="margin:60px 20px">${original}</p></body>` });
        });
        await page.goto('https://copy.example/?edit');
        await page.addScriptTag({ content: await editorScripts() });
        await page.locator('#copy').click({ position: { x: 5, y: 8 } });
        const inline = page.locator('#copy [contenteditable]');
        await inline.waitFor();
        assert.equal(await inline.innerText(), template);
        await inline.fill('处理 {problems} 项');
        await inline.press('Enter');
        await page.getByRole('status').filter({ hasText: '没保存：请保留全部占位符' }).waitFor();
        assert.equal(await page.locator('#copy').innerText(), original);
        assert.equal(await page.evaluate(() => localStorage.getItem('peach.copy-edits.v1')), null);
        await page.locator('#copy').click({ position: { x: 5, y: 8 } });
        await inline.fill('待处理 {problems} 项，限流 {paused} 项。');
        await inline.press('Enter');
        await page.getByRole('status').filter({ hasText: '已保存修改' }).waitFor();
        assert.equal(await page.locator('#copy').innerText(), '待处理 768 项，限流 533 项。');
        assert.deepEqual(saves[1], { original, replacement: '待处理 {problems} 项，限流 {paused} 项。', candidate });
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
      } finally { await context.close(); }
    });

    it(`改字浮条与多选操作条共享玻璃、排版与按钮（${viewport.name}）`, async () => {
      const opened = await visit(browser, '/settings/library?section=' + encodeURIComponent('应用与维护') + '&edit', viewport);
      try {
        const { page } = opened;
        await page.getByRole('region', { name: 'Peach 共建计划', exact: true }).waitFor();
        await settle(page);
        const dock = page.getByRole('group', { name: '文案编辑', exact: true });
        await dock.waitFor();
        const measured = await dock.evaluate(node => {
          const style = getComputedStyle(node), rect = node.getBoundingClientRect();
          const status = getComputedStyle(node.querySelector('[role="status"]')!);
          return { glass: node.hasAttribute('data-glass-pane'), padding: style.padding, radius: style.borderRadius,
            fontSize: status.fontSize, lineHeight: status.lineHeight, left: rect.left, right: rect.right,
            center: (rect.left + rect.right) / 2, viewport: innerWidth,
            buttons: [...node.querySelectorAll('button')].map(button => {
              const css = getComputedStyle(button);
              return { height: button.getBoundingClientRect().height, radius: css.borderRadius,
                fontSize: css.fontSize, lineHeight: css.lineHeight, weight: css.fontWeight };
            }) };
        });
        assert.equal(measured.glass, true);
        assert.equal(measured.padding, '9px 11px');
        assert.equal(measured.radius, '22px');
        assert.equal(measured.fontSize, '14px');
        assert.equal(measured.lineHeight, '20px');
        assert.ok(Math.abs(measured.center - measured.viewport / 2) <= 1, JSON.stringify(measured));
        assert.ok(measured.left >= 11 && measured.right <= measured.viewport - 11, JSON.stringify(measured));
        assert.equal(measured.buttons.length, 3);
        for (const button of measured.buttons) assert.deepEqual(button,
          { height: 36, radius: '10px', fontSize: '14px', lineHeight: '20px', weight: '500' });
        await page.evaluate(() => document.documentElement.style.setProperty('--selection-dock-space', '120px'));
        assert.equal(await dock.evaluate(node => getComputedStyle(node).bottom), '120px');
        assert.ok(await dock.evaluate(node => node.getBoundingClientRect().bottom <= innerHeight - 119));
        const handle = dock;
        const initial = await dock.boundingBox();
        assert.ok(initial);
        await handle.press('Shift+ArrowUp');
        const moved = await dock.boundingBox();
        assert.ok(moved && Math.abs(moved.y - initial.y + 40) <= 1);
        await handle.press('Escape');
        const reset = await dock.boundingBox();
        assert.ok(reset && Math.abs(reset.y - initial.y) <= 1);
        const grip = await dock.locator('[data-copy-state]').boundingBox();
        assert.ok(grip);
        await page.mouse.move(grip.x + grip.width / 2, grip.y + grip.height / 2);
        await page.mouse.down();
        await page.mouse.move(0, 0, { steps: 8 });
        await page.mouse.up();
        const dragged = await dock.boundingBox();
        assert.ok(dragged && dragged.y < initial.y - 30);
        assert.ok(dragged.x >= 11 && dragged.y >= 11);
        await dock.locator('[data-copy-state]').dblclick();
        const restored = await dock.boundingBox();
        assert.ok(restored && Math.abs(restored.y - initial.y) <= 1);
        assert.deepEqual(opened.problems, []);
      } finally { await opened.close(); }
    });
    it(`回车、失焦保存与 Esc 取消（${viewport.name}）`, async () => {
      const context = await browser.newContext({ viewport });
      try {
        const page = await context.newPage();
        await page.route('https://copy.example/**', route => route.fulfill({
          contentType: 'text/html; charset=utf-8', body: '<meta charset="utf-8"><body data-peach-copy-mode="local"><main style="margin:80px 20px"><p id="copy" style="width:max-content">原位说明</p><button id="action">操作名称</button><div id="other" style="height:60px"></div></main></body>',
        }));
        await page.goto('https://copy.example/?edit');
        await page.addScriptTag({ content: await editorScripts() });
        await page.locator('#copy').click();
        const inline = page.locator('#copy [contenteditable]');
        await inline.waitFor();
        await inline.fill('新的说明');
        await inline.press('Escape');
        assert.equal(await page.locator('#copy').innerText(), '原位说明');
        assert.equal(await page.evaluate(() => localStorage.getItem('peach.copy-edits.v1')), null);
        await page.locator('#copy').click();
        await inline.fill('新的说明');
        await inline.press('Enter');
        assert.equal(await page.locator('#copy').innerText(), '新的说明');
        await page.locator('#copy').click();
        await inline.fill('点别处保存');
        await page.locator('#other').click();
        assert.equal(await page.locator('#copy').innerText(), '点别处保存');
        await page.locator('#action').click();
        const input = page.locator('input[data-copy-editor]');
        await input.waitFor();
        const a = await page.locator('#action').boundingBox(), b = await input.boundingBox();
        assert.ok(a && b && Math.abs(a.y - b.y) < 20, '按钮输入框位于文字处');
        await input.fill('修改按钮');
        await input.press('Enter');
        assert.equal(await page.locator('#action').innerText(), '修改按钮');
        await page.getByRole('button', { name: '暂停编辑', exact: true }).click();
        await page.locator('#copy').click();
        assert.equal(await page.locator('[contenteditable]').count(), 0);
        await page.getByRole('button', { name: '继续编辑', exact: true }).click();
        const edits = await page.evaluate(() => JSON.parse(localStorage.getItem('peach.copy-edits.v1')!));
        assert.equal(edits['原位说明'], '点别处保存');
      } finally { await context.close(); }
    });
  }
});
