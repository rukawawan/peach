import { createRoot } from 'react-dom/client';
import { flushSync } from 'react-dom';
import { Button } from '@/components/base/buttons/button';
import type { GuideStep } from '../../onboarding/guide-catalog';
import { guideEntry } from '../../onboarding/guide-entry';
import { RiRouteLine, RiArrowRightSLine } from '@remixicon/react';
import { Note } from '../components/note';
import { SettingsDialogClose } from '../components/settings-dialog-close';
import { useOverlayScrollbar } from '../components/overlay-scrollbar';
import { Disclosure } from '../settings/section';
import { GuideFieldDetails } from './guide-help';

interface Props {
  step: GuideStep; position: number; total: number; missing: boolean;
  invitation?: boolean;
  next(skipped?: boolean): void; previous(): void; close(): void;
}
function GuidePopover({ step, position, total, missing, next, previous, close, invitation }: Props) {
  const body = useOverlayScrollbar<HTMLDivElement>();
  const entry = guideEntry(step);
  return <div className="peach-guide-popover-content" onPointerDown={event => event.stopPropagation()}>
    <header className="flex shrink-0 items-center justify-between gap-3 px-4 pt-4 pb-3">
      <h3 id="driver-popover-title" className="text-body-medium text-text-primary">{step.title}</h3>
      <SettingsDialogClose label={invitation ? '关闭教程提示' : '结束导览'} onPress={close} />
    </header>
    <div className="peach-guide-step-frame"><div ref={body} className="peach-guide-step-body flex flex-col gap-3 px-4 pb-4">
      {entry ? <section aria-label="打开方式" className="flex flex-col gap-2 rounded-xl bg-background-secondary-default p-3">
        <div className="flex items-center gap-2 text-body-2-medium text-text-secondary"><RiRouteLine className="size-4 shrink-0" aria-hidden="true" />打开方式</div>
        <ol className="flex flex-wrap items-center gap-x-1 gap-y-1 text-body-2-medium text-text-primary">
          {entry.path.map((label, index) => <li key={`${index}-${label}`} className="inline-flex items-center gap-1">
            {index ? <RiArrowRightSLine className="size-4 shrink-0 text-text-secondary" aria-hidden="true" /> : null}<span>{label}</span>
          </li>)}
        </ol>
        {entry.hint ? <p className="text-caption-1-regular text-text-secondary">{entry.hint}</p> : null}
      </section> : null}
      <p id="driver-popover-description" className="text-body-regular text-text-secondary">{step.body}</p>
      {step.details?.length ? <Disclosure summary="更多说明"><GuideFieldDetails details={step.details} /></Disclosure> : null}
      {step.scope ? <p className="text-body-2-regular text-text-secondary">{step.scope}</p> : null}
      {missing ? <Note tone="neutral">{step.surface ? '尚未取得可演示的视频或对应控件。请先添加视频，或跳过后稍后重看。' : '当前页面未显示这个入口，可能尚无内容、没有配置权限或仍在加载。可以跳过，稍后重看。'}</Note> : null}
    </div></div>
    <footer className="flex shrink-0 flex-wrap items-center gap-2 border-t border-separator-border px-4 py-3">
      {invitation ? <>
        <Button variant="ghost" size="small" className="ml-auto" onClick={close}>稍后再说</Button>
        <Button size="small" data-guide-next="" onClick={() => next()}>打开教程</Button>
      </> : <>
      <span className="mr-auto text-body-2-regular tabular-nums text-text-secondary">{position + 1} / {total} 步</span>
      <Button variant="ghost" size="small" onClick={close}>跳过本章</Button>
      <Button variant="secondary" size="small" disabled={position === 0} onClick={previous}>上一步</Button><Button size="small" data-guide-next="" onClick={() => next(missing)}>{position === total - 1 ? '完成本章' : '下一步'}</Button>
      </>}
    </footer>
  </div>;
}

/** Driver 负责定位，高亮说明的内容与控件由应用组件绘制。 */
export function mountGuidePopover(wrapper: HTMLElement, arrow: HTMLElement, props: Props) {
  const mount = document.createElement('div');
  wrapper.replaceChildren(mount, arrow);
  const root = createRoot(mount);
  flushSync(() => root.render(<GuidePopover {...props} />));
  return () => root.unmount();
}
