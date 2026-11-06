/* 「接着看」卡上的推荐理由：作品详情与关注详情共用。一行写关系（同创作者、同系列……）和最稀有的
 * 几枚共同标签，截不下的点开看全。只说「标签接近」不告诉人接近在哪，所以有共同标签就直接写标签。 */
import { useRef, useState } from 'react';
import { Dialog, Popover } from 'react-aria-components';
import { MENU_POPOVER_SURFACE } from '@/components/base/dropdown/menu-styles';

/** 一行里最多写几枚共同标签；其余进浮层。 */
const LINE_TAGS = 3;

export function reasonText(reasons: readonly string[], tags: readonly string[], limit = LINE_TAGS): string {
  return [...reasons, tags.slice(0, limit).join('、')].filter(Boolean).join(' · ');
}

export function RecommendationReason({ reasons, tags = [] }: { reasons: readonly string[]; tags?: readonly string[] }) {
  const trigger = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const line = reasonText(reasons, tags);
  if (!line) return null;
  const full = [reasons.join(' · '), tags.length ? `共同标签：${tags.join('、')}` : ''].filter(Boolean).join('\n');
  return <>
    <button ref={trigger} type="button" data-media-next-reason="" title={full}
      aria-label={`查看推荐理由：${full}`} aria-haspopup="dialog" aria-expanded={open}
      onClick={event => { event.stopPropagation(); setOpen(true) }}>{line}</button>
    <Popover triggerRef={trigger} isOpen={open} onOpenChange={setOpen} placement="top" offset={8}
      containerPadding={12} className={MENU_POPOVER_SURFACE}>
      <Dialog data-media-reason-dialog="" aria-label="推荐理由"
        className="w-64 max-w-full p-2 text-body-regular whitespace-pre-line break-words text-text-primary outline-none focus-visible:ring-2 focus-visible:ring-border-focus-ring">
        {full}
      </Dialog>
    </Popover>
  </>;
}
