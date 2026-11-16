import { describe, expect, it } from 'vitest';
import { activityKind, stepActivityKind } from '../src/activity-kinds';
import { activityMotionHtml, activityStatusHtml, ACTIVITY_KINDS } from '../src/ui-kit/activity-motion';

const node = (html: string) => {
  const host = document.createElement('div');
  host.innerHTML = html;
  return host.firstElementChild as HTMLElement;
};

describe('后台推进按语义选动画', () => {
  it.each([
    ['follow-check', 'radar'], ['link-check', 'radar'], ['resource-scan', 'radar'],
    ['feed-cover', 'linear-dots'], ['jav-covers', 'linear-dots'], ['want-scrape', 'linear-dots'],
    ['seed-import', 'gather'], ['ledger-backup', 'gather'], ['resource-apply', 'gather'], ['link-prune', 'gather'],
    ['organize', 'blocks'], ['amane-bridge', 'blocks'], ['taste-refresh', 'blocks'], ['diagnostic-export', 'blocks'],
    ['timeline-thumbnails', 'blocks'],
  ])('任务 %s 画 %s', (task, kind) => {
    expect(activityKind(task)).toBe(kind);
  });

  it('阶段 code 比任务名说得细，先按阶段', () => {
    expect(activityKind('library-processing')).toBe('blocks');
    expect(activityKind('library-processing', 'library.scanFiles')).toBe('radar');
    expect(activityKind('library-processing', 'library.fetchMetadata')).toBe('linear-dots');
    expect(activityKind('library-processing', 'library.saveCandidates')).toBe('gather');
    expect(activityKind('ledger-restore', 'backup.migrateBackup')).toBe('blocks');
    expect(activityKind('', 'job.waitingForUpdate')).toBe('clock');
    // 阶段没登记时退回任务名。
    expect(activityKind('ledger-backup', 'backup.copyLedger')).toBe('gather');
  });

  it('说不清做什么的后台推进按传输画，全站不再有第二种三颗点', () => {
    expect(activityKind()).toBe('linear-dots');
    expect(activityKind('a-task-nobody-registered', 'nor.this')).toBe('linear-dots');
  });

  it('处理通知卡的当前步骤按步骤查同一张表', () => {
    expect(stepActivityKind('sources')).toBe('radar');
    expect(stepActivityKind('media')).toBe('blocks');
    expect(stepActivityKind('collect')).toBe('linear-dots');
    expect(stepActivityKind('unknown')).toBe(activityKind('library-processing'));
  });
});

describe('语义动画的节点', () => {
  it.each([
    ['clock', 'svg > path', 1], ['radar', 'svg path', 1], ['linear-dots', ':scope > i', 3],
    ['gather', ':scope > span > i', 4], ['blocks', ':scope > i', 9],
  ] as const)('%s 只出一个读屏忽略的动画节点，形状完整，不写内联样式', (kind, part, count) => {
    const motion = node(activityMotionHtml(kind));
    expect(motion.getAttribute('aria-hidden')).toBe('true');
    expect(motion.dataset.activity).toBe(kind);
    expect(motion.dataset.size, '默认是行内档，跟所在那一行的字号走').toBe('inline');
    expect(motion.querySelectorAll(part)).toHaveLength(count);
    expect(motion.querySelector('[style]'), '错相写在样式表里，节点上没有内联样式').toBeNull();
    expect(motion.hasAttribute('style')).toBe(false);
  });

  it('同一屏的几枚 Radar 各用各的渐变', () => {
    const ids = [node(activityMotionHtml('radar')), node(activityMotionHtml('radar'))]
      .map(motion => motion.querySelector('radialGradient')!.id);
    expect(new Set(ids).size).toBe(2);
    expect(ACTIVITY_KINDS).toHaveLength(5);
  });

  it('排队中的卡片要静帧，尺寸档按位置给', () => {
    const queued = node(activityMotionHtml('clock', { size: 'card', still: true }));
    expect(queued.hasAttribute('data-still')).toBe(true);
    expect(queued.dataset.size).toBe('card');
    expect(node(activityMotionHtml('blocks', { size: 'block' })).dataset.size).toBe('block');
    expect(node(activityMotionHtml('blocks')).hasAttribute('data-still')).toBe(false);
    expect(node(activityMotionHtml('radar', { size: 'lead' })).dataset.size, '通知卡标题加说明的两行图标位').toBe('lead');
  });

  it('Clock 停下来时画表盘加指针，不是一块扇形', () => {
    const face = node(activityMotionHtml('clock', { still: true })).querySelector('.ui-activity-face');
    expect(face?.querySelector('circle'), '表盘').not.toBeNull();
    expect(face?.querySelector('path')?.getAttribute('d'), '时针与分针').toMatch(/^M8 /);
  });

  it('遗留层那一行：读屏读状态文字，动画藏起来，文字照原样转义', () => {
    const status = node(activityStatusHtml('linear-dots', '<继续读取>'));
    expect(status.getAttribute('role')).toBe('status');
    expect(status.textContent).toBe('<继续读取>');
    expect(status.querySelector('[aria-hidden="true"][data-activity="linear-dots"]')).not.toBeNull();
  });
});
