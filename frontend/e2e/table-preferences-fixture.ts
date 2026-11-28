import assert from 'node:assert/strict';
import type { Locator, Page } from 'playwright-core';
import { settle, withPageDiagnostics } from './harness.ts';

/** 标题与整组操作共享一行或分行，同组列设置按钮保持在一起。 */
async function verifyToolbarWrapping(page: Page) {
  const viewport = page.viewportSize()!;
  try {
    for (const width of [...new Set([viewport.width, 650, 390])]) {
      await page.setViewportSize({ width, height: viewport.height });
      await settle(page);
      const toolbars = await page.locator('[data-responsive-toolbar]').evaluateAll(roots => roots.map(root => {
        const box = (element: Element) => {
          const r = element.getBoundingClientRect();
          return { left: r.left, right: r.right, top: r.top, bottom: r.bottom };
        };
        const actions = root.querySelector('[data-toolbar-actions]')!;
        return { root: box(root), heading: box(root.querySelector('[data-toolbar-heading]')!),
          actions: box(actions), buttons: [...actions.querySelectorAll('button')].map(box),
          columns: [...actions.querySelectorAll('[role="group"]')].map(group =>
            [...group.querySelectorAll(':scope > button')].map(box)) };
      }));
      for (const toolbar of toolbars) {
        assert.ok(toolbar.actions.left >= toolbar.root.left - 1 && toolbar.actions.right <= toolbar.root.right + 1);
        if (toolbar.actions.top < toolbar.heading.bottom - 1) {
          assert.ok(toolbar.actions.left >= toolbar.heading.right);
          const centers = toolbar.buttons.map(b => (b.top + b.bottom) / 2);
          assert.ok(Math.max(...centers) - Math.min(...centers) < 1,
            `${width}px 工具栏有部分操作被挤到下一行`);
        }
        for (const buttons of toolbar.columns) {
          assert.ok(Math.max(...buttons.map(b => b.top)) - Math.min(...buttons.map(b => b.top)) < 2,
            `${width}px 列设置按钮被拆行`);
        }
      }
      const footers = await page.locator('[data-table-pagination]').evaluateAll(roots => roots.map(root => {
        const r = root.getBoundingClientRect(), a = root.querySelector('[data-toolbar-actions]')!.getBoundingClientRect();
        return a.left >= r.left - 1 && a.right <= r.right + 1;
      }));
      assert.ok(footers.every(Boolean), `${width}px 分页操作越出容器`);
      const pagination = await page.locator('nav').filter({ has: page.getByRole('button', { name: '上一页', exact: true }) })
        .evaluateAll(roots => roots.map(root => {
          const buttons = [...root.querySelectorAll(':scope > button')];
          return buttons.length === 2 && Math.abs(buttons[0]!.getBoundingClientRect().y - buttons[1]!.getBoundingClientRect().y) < 1;
        }));
      assert.ok(pagination.every(Boolean), `${width}px 上一页和下一页被拆到不同行`);
    }
  } finally {
    await page.setViewportSize(viewport);
    await settle(page);
  }
}

/** 在真实表格上核验共享列设置、键盘调整、拖动和刷新恢复。 */
export async function verifyTablePreferences(page: Page, table: Locator, label: string, identity: string, optional: { id: string; label: string }, restoreView?: () => Promise<unknown>) {
  await table.waitFor();
  await verifyToolbarWrapping(page);
  const controls = page.getByRole('group', { name: `${label}列设置`, exact: true });
  const header = table.locator(`th[data-key="${identity}"]`);
  const width = async () => header.evaluate(node => node.getBoundingClientRect().width);
  const viewport = page.viewportSize()!;
  const resizeViewport = async (wide: boolean) => {
    // 窄屏的名称列为下一列预留可见空间，缩放与保存的像素宽度在宽屏核对。
    if (viewport.width > 600) return;
    await page.setViewportSize(wide ? { ...viewport, width: 760 } : viewport);
    await settle(page);
  };
  await resizeViewport(true);
  const initial = await width();
  const handle = header.getByRole('slider');
  await withPageDiagnostics(page, `${label}进入键盘列宽调整`, async () => {
    // React Aria 首次进入集合会先聚焦行导航；确认该状态后再移入列宽手柄。
    await table.locator('tbody tr').first().focus();
    await table.locator('tbody tr[data-focused]').first().waitFor();
    await handle.focus();
    assert.equal(await handle.evaluate(node => document.activeElement === node), true,
      `${label}键盘调整前焦点必须位于列宽手柄`);
    await handle.press('Enter');
    await header.locator('.react-aria-ColumnResizer[data-resizing]').waitFor();
  });
  await handle.press('ArrowRight'); await handle.press('ArrowRight');
  await page.waitForFunction(({ node, initial }) => node && node.getBoundingClientRect().width > initial,
    { node: await header.elementHandle(), initial }, { timeout: 5000 });
  await handle.press('Tab');
  const resized = await width(); assert.ok(resized > initial, `${label}: ${initial} → ${resized}`);
  await resizeViewport(false);
  const expectResizedWidth = async () => {
    await resizeViewport(true);
    assert.ok(Math.abs(await width() - resized) <= 1, label);
    await resizeViewport(false);
  };
  const scroll = table.locator('..');
  const range = await scroll.evaluate(node => node.scrollWidth - node.clientWidth);
  if (range > 1) {
    await scroll.evaluate(node => { node.scrollLeft = 0 });
    await table.locator('tbody tr').first().scrollIntoViewIfNeeded();
    const box = (await scroll.boundingBox())!, row = (await table.locator('tbody tr').first().boundingBox())!;
    const x = box.x + box.width - 20, y = row.y + row.height - 4;
    await page.mouse.move(x, y); await page.mouse.down(); await page.mouse.move(x - 80, y, { steps: 8 }); await page.mouse.up();
    assert.ok(await scroll.evaluate(node => node.scrollLeft) >= Math.min(80, range) - 2, label);
    assert.equal(await table.locator('tbody input[type="checkbox"]:checked:not([role="switch"])').count(), 0, label);
  }
  const headerColumns = 'thead th[data-key]:not([data-table-space])';
  const headerKeys = () => table.locator(headerColumns).evaluateAll(headers => headers.map(node => node.getAttribute('data-key')));
  const expectHeaderKeys = async (keys: (string | null)[]) => {
    const node = await table.elementHandle();
    await page.waitForFunction(({ root, selector, ordered }) => JSON.stringify(
      Array.from(root!.querySelectorAll(selector), header => header.getAttribute('data-key')),
    ) === ordered, { root: node, selector: headerColumns, ordered: JSON.stringify(keys) }, { timeout: 5000 });
  };
  const defaultOrder = await headerKeys();
  const changedOrder = [...defaultOrder];
  const columnIndex = changedOrder.indexOf(optional.id);
  assert.ok(columnIndex > 1, label);
  changedOrder.splice(columnIndex - 1, 0, changedOrder.splice(columnIndex, 1)[0]!);
  const layoutMenu = page.getByRole('dialog', { name: `${label}的列布局`, exact: true });
  const layoutButton = controls.getByRole('button', { name: '列布局', exact: true });
  await layoutButton.click();
  await layoutMenu.locator(`[data-tab="${optional.id}"]`).press('Alt+ArrowUp');
  await expectHeaderKeys(changedOrder);
  await page.keyboard.press('Escape');
  await controls.getByRole('button', { name: '显示列', exact: true }).click();
  const menu = page.getByRole('dialog', { name: `${label}显示列`, exact: true });
  const actionLayout = await menu.evaluate(element => {
    const actions = element.querySelector<HTMLElement>('[data-selection-actions]')!;
    const buttons = [...actions.querySelectorAll('button')].map(button => {
      const box = button.getBoundingClientRect();
      const style = getComputedStyle(button);
      const naturalWidth = button.lastElementChild!.getBoundingClientRect().width
        + parseFloat(style.paddingLeft) + parseFloat(style.paddingRight)
        + parseFloat(style.borderLeftWidth) + parseFloat(style.borderRightWidth);
      return { width: box.width, height: box.height, top: box.top, naturalWidth,
        scrollWidth: button.scrollWidth, clientWidth: button.clientWidth };
    });
    const optionBox = element.querySelector('[data-selection-options]')!.getBoundingClientRect();
    const optionWidths = [...element.querySelectorAll('label')].map(label =>
      label.lastElementChild!.getBoundingClientRect().right - label.getBoundingClientRect().left);
    return { width: actions.getBoundingClientRect().width, top: actions.getBoundingClientRect().top,
      bottom: actions.getBoundingClientRect().bottom, placement: element.getAttribute('data-selection-placement'),
      contentWidth: element.getBoundingClientRect().width, naturalWidth: Math.max(...optionWidths, ...buttons.map(button => button.naturalWidth)),
      optionTop: optionBox.top, optionBottom: optionBox.bottom, buttons };
  });
  assert.ok(actionLayout.placement === 'top' ? actionLayout.bottom <= actionLayout.optionTop
    : actionLayout.top >= actionLayout.optionBottom, `${label} 选项应靠近触发器`);
  assert.equal(actionLayout.buttons.length, 2);
  assert.ok(Math.abs(actionLayout.contentWidth - actionLayout.naturalWidth) <= 1, `${label} 菜单宽度跟随内容`);
  for (const button of actionLayout.buttons) {
    assert.ok(Math.abs(button.width - actionLayout.width) <= 1, `${label} 长按钮铺满操作区`);
    assert.ok(button.scrollWidth <= button.clientWidth + 1, `${label} 按钮文案应完整显示`);
  }
  assert.ok(actionLayout.buttons[1]!.top >= actionLayout.buttons[0]!.top + actionLayout.buttons[0]!.height);
  await menu.locator('label').filter({ has: page.getByRole('checkbox', { name: optional.label, exact: true }) }).click();
  await page.keyboard.press('Escape');
  assert.equal(await table.locator(`th[data-key="${optional.id}"]`).count(), 0);
  await page.reload({ waitUntil: 'load' });
  await restoreView?.();
  await table.waitFor();
  await expectResizedWidth();
  await expectHeaderKeys(changedOrder.filter(id => id !== optional.id));
  await controls.getByRole('button', { name: '显示列', exact: true }).click();
  await menu.getByRole('button', { name: '恢复默认显示', exact: true }).click();
  await page.keyboard.press('Escape');
  await table.locator(`th[data-key="${optional.id}"]`).waitFor();
  await expectHeaderKeys(changedOrder);
  await layoutButton.click();
  await layoutMenu.getByRole('button', { name: '重置列顺序', exact: true }).click();
  await expectHeaderKeys(defaultOrder);
  await expectResizedWidth();
  await layoutMenu.getByRole('button', { name: '重置列宽', exact: true }).click();
  await page.keyboard.press('Escape');
  await resizeViewport(true);
  await page.waitForFunction(({ node, initial }) => node && Math.abs(node.getBoundingClientRect().width - initial) <= 1,
    { node: await header.elementHandle(), initial }, { timeout: 5000 });
  assert.ok(Math.abs(await width() - initial) <= 1, label);
  assert.ok(await table.locator('th[data-table-space]').evaluate(node => node.getBoundingClientRect().width) <= 1,
    `${label} 默认剩余空间由名称列承接`);
  await resizeViewport(false);
  await scroll.evaluate(node => { node.scrollLeft = 0 });
}

/** 内容的可用宽度跟随列变化，文字完整保留在 DOM 中。 */
export async function verifyColumnContentWidth(table: Locator, id: string, selector: string) {
  const page = table.page();
  const viewport = page.viewportSize()!;
  if (viewport.width <= 600) {
    await page.setViewportSize({ ...viewport, width: 760 });
    await settle(page);
  }
  const header = table.locator(`th[data-key="${id}"]`);
  const index = await header.evaluate(node => [...node.parentElement!.children].indexOf(node));
  const cell = table.locator('tbody tr').first().locator('td').nth(index);
  const content = cell.locator(selector).first();
  const measure = () => content.evaluate(node => ({ width: node.getBoundingClientRect().width,
    cell: node.closest('td')!.getBoundingClientRect().width,
    text: node.getAttribute('title') || node.getAttribute('aria-label') || node.textContent }));
  const initial = await measure();
  // 用户按住列边拖动；键盘调整时表格的方向键导航会抢走焦点，测不出内容宽度。
  const resizer = header.locator('.react-aria-ColumnResizer');
  // 滚到视口中间，避开右下角弹出的提示。
  await resizer.evaluate(node => node.scrollIntoView({ block: 'center', inline: 'nearest' }));
  const box = (await resizer.boundingBox())!;
  const x = box.x + box.width / 2, y = box.y + box.height / 2;
  await page.mouse.move(x, y); await page.mouse.down(); await page.mouse.move(x + 100, y, { steps: 10 }); await page.mouse.up();
  await page.waitForFunction(({ node, initial }) => node && node.closest('td')!.getBoundingClientRect().width > initial + 70,
    { node: await content.elementHandle(), initial: initial.cell }, { timeout: 5000 }).catch(() => undefined);
  const resized = await measure();
  assert.ok(resized.cell > initial.cell + 70, `${id} 列没有拉宽：${JSON.stringify({ initial, resized })}`);
  assert.ok(Math.abs((resized.width - initial.width) - (resized.cell - initial.cell)) <= 2,
    `${id} 内容没有随列拉宽：${JSON.stringify({ initial, resized })}`);
  assert.equal(resized.text, initial.text);
  const geometry = await content.evaluate(node => ({ content: node.getBoundingClientRect().right,
    cell: node.closest('td')!.getBoundingClientRect().right }));
  assert.ok(geometry.content <= geometry.cell, JSON.stringify(geometry));
  if (viewport.width <= 600) {
    await page.setViewportSize(viewport);
    await settle(page);
  }
}
