/* 路径与「查看文件位置」：服务端核对数据根边界，桌面定位、NAS 展示可选中的路径。
 * 请求失败留在路径旁边，桌面定位成功通过调用方回执。 */
import { useEffect, useRef, useState, type ReactNode } from 'react';

import { IconButton } from '@/components/base/buttons/icon-button';
import { cx } from '@/utils/cx';

import { ApiError, apiSend } from '../../api';
import { busyProps } from '../settings/use-action';
import { t } from '../../i18n';
import { showServerPath, type ServerPathReply } from './server-path-dialog';

/** 全站「打开位置」那一枚。雪碧图里的 `folder-open`，Remix Icon 没有对应的一枚。 */
function FolderOpenIcon({ className }: { className?: string }) {
  return (
    <svg aria-hidden viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
      strokeLinecap="round" strokeLinejoin="round" className={className}>
      <use href="#i-folder-open" />
    </svg>
  );
}

/** 请求没发出去（断网、页面换了口令）时的说法。服务端答得上来的原因由它自己写成中文。 */
const UNREACHED = t('shell:sourceTools.revealFailed');

export function PathLine(
  { path, prefix, className, action, onRevealed }:
  {
    path: string;
    /** 路径前面那几个字（「完整记录：」）。跟路径同一行，换行时不和路径拆开。 */
    prefix?: string;
    /** 这一行文字的字号与颜色由使用处定：路径是次要信息，各处的次要色不是同一个。 */
    className?: string;
    /** 同样针对这份文件的动作（导出），排在打开位置那颗键旁边。 */
    action?: ReactNode;
    /** 定位成功后的回执。窗口不在这台机器上时，这句话是唯一的动静。 */
    onRevealed?(message: string): void;
  },
) {
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState('');
  /* 弹窗这一下由服务端去做，回程可能落在页面已经换掉之后；那时这一行早就不在了。 */
  const alive = useRef(true);
  useEffect(() => () => { alive.current = false }, []);
  const reveal = async () => {
    if (busy) return;
    setBusy(true);
    setProblem('');
    try {
      const result = await apiSend<ServerPathReply & { mode?: string }>('/api/reveal', { path });
      if (result.mode === 'server' && result.path) await showServerPath(result);
      else onRevealed?.(t('shell:sourceTools.revealed'));
    } catch (error) {
      if (alive.current) setProblem(error instanceof ApiError ? error.message : UNREACHED);
    } finally {
      if (alive.current) setBusy(false);
    }
  };
  return (
    <div className="flex flex-col gap-1">
      {/* 路径和那颗键排在同一条中线上：键比这行小字高一截，顶对齐时它自己看着往上飘。 */}
      <div className="flex items-center justify-between gap-2">
        <p className={cx('min-w-0 break-all', className)}>
          {prefix}{path}
        </p>
        <div className="flex shrink-0 items-center gap-2">
          <IconButton icon={FolderOpenIcon} size="small" aria-label={t('shell:pathLine.reveal')}
            onClick={() => void reveal()} {...busyProps(busy)} />
          {action}
        </div>
      </div>
      {problem ? <p className="text-caption-1-regular text-text-error-primary">{problem}</p> : null}
    </div>
  );
}
