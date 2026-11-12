import { describe, expect, it } from 'vitest';
import { cleanupSkeletonHtml, SCAN_CARD_TEXT } from '../src/management';

describe('数据管理首屏', () => {
  const skeleton = () => {
    const root = document.createElement('div');
    root.innerHTML = cleanupSkeletonHtml();
    return root;
  };

  it('日常扫描立即呈现，其余操作只展示分组入口', () => {
    const root = skeleton();
    expect(root.querySelector('#libraryProcessing p')?.textContent).toBe(SCAN_CARD_TEXT);
    expect([...root.querySelectorAll('h2')].map(heading => heading.textContent))
      .toEqual(['待处理事项', '整理与维护', '清理与删除']);
    expect(root.querySelector('#mediaRepair, #organize, #link-manager, #resource-sync, table')).toBeNull();
    expect(root.querySelector('#libraryProcessing footer > a')?.getAttribute('href')).toBe('/sources');
  });

  it('扫描按钮保留最终尺寸与变体，在数据就绪前不能操作', () => {
    const root = skeleton();
    expect(root.querySelector('[inert]')).not.toBeNull();
    const split = root.querySelector('#libraryProcessing [data-split-button]')!;
    expect(split.getAttribute('data-variant')).toBe('primary');
    expect(split.querySelector('button:last-child use')?.getAttribute('href')).toBe('#i-chevron-down');
    expect(root.querySelector('[aria-label="媒体库"]')?.getAttribute('aria-disabled')).toBe('true');
    for (const button of root.querySelectorAll('footer button')) {
      expect(button.hasAttribute('disabled')).toBe(true);
      expect(button.hasAttribute('data-skeleton-action')).toBe(true);
    }
  });
});
