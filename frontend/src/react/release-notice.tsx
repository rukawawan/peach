/** 更新后的版本公告：升级后弹一次，点「知道了」记为已读；设置页可以再次打开。
 *
 *  条目已经由服务端按平台和本机数据挑过，这里只负责显示。列表沿用新手教程「开始使用」的
 *  图标行（`peach-guide-routes`），每条一句短话；修复与完整清单在 Release 页。
 *  新安装与不弹窗的补丁版直接记为已读，不打扰。 */
import { useEffect, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import {
  RiArrowLeftRightLine, RiAspectRatioLine, RiCheckboxMultipleLine, RiDatabase2Line, RiDraggable, RiFolderLine,
  RiHardDrive3Line, RiRefreshLine, RiServerLine, RiShieldCheckLine, RiSparklingLine, RiSpeedUpLine, RiStackLine,
  RiUserLine, type RemixiconComponentType,
} from '@remixicon/react';
import { Button } from '@/components/base/buttons/button';
import { apiGet, apiSend } from '../api';
import { ModalFrame } from './components/modal-frame';
import { Note } from './components/note';
import { SettingsDialogClose } from './components/settings-dialog-close';
import { StatusLabel } from './components/status-label';
import { Disclosure, ExternalLink } from './settings/section';

interface NoticeItem { id?: string; icon?: string; title: string; body: string; route?: string;
  progress?: { done?: number; total?: number; count?: number } }
interface ReleaseNoticeSnapshot {
  current: string; kind: 'new-install' | 'upgrade' | 'skipped' | 'seen'; show: boolean;
  previous: string | null; estimated: boolean; release_url: string;
  missed: { version: string; headline: string; features: NoticeItem[] }[];
  notice?: { level: 'notice' | 'quiet'; headline: string;
    features: NoticeItem[]; automatic: NoticeItem[]; attention: NoticeItem[] };
}

export const RELEASE_NOTICE_EVENT = 'peach:release-notice';
const ICONS: Record<string, RemixiconComponentType> = {
  storage: RiHardDrive3Line, reorder: RiDraggable, library: RiFolderLine, select: RiCheckboxMultipleLine,
  resize: RiAspectRatioLine, server: RiServerLine, person: RiUserLine, shield: RiShieldCheckLine,
  stack: RiStackLine, switch: RiArrowLeftRightLine, speed: RiSpeedUpLine, refresh: RiRefreshLine,
  database: RiDatabase2Line, sparkle: RiSparklingLine,
};

function progressLabel(progress: NoticeItem['progress']) {
  if (!progress) return null;
  if (progress.total) {
    return progress.done! >= progress.total
      ? <StatusLabel tone="success">已完成</StatusLabel>
      : <StatusLabel tone="progress">{(progress.done || 0).toLocaleString()} / {progress.total.toLocaleString()}</StatusLabel>;
  }
  return progress.count ? <StatusLabel tone="success">{progress.count.toLocaleString()} 个</StatusLabel> : null;
}

function Rows({ items, trailing }: { items: NoticeItem[]; trailing(item: NoticeItem): ReactNode }) {
  return (
    <ol className="peach-guide-routes">
      {items.map(item => {
        const Icon = ICONS[item.icon || ''] || RiSparklingLine;
        return (
          <li key={item.title}>
            <span className="peach-guide-topic-icon"><Icon aria-hidden className="size-5" /></span>
            <div className="min-w-0 flex-1"><strong>{item.title}</strong><p>{item.body}</p></div>
            {trailing(item)}
          </li>
        );
      })}
    </ol>
  );
}

export function ReleaseNotice({ navigate }: { navigate(path: string): void }) {
  const [data, setData] = useState<ReleaseNoticeSnapshot | null>(null);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let disposed = false;
    const load = (reopen: boolean) => apiGet<ReleaseNoticeSnapshot>('/api/release-notice').then(next => {
      if (disposed) return;
      setData(next);
      if (reopen) { setOpen(Boolean(next.notice)); return }
      if (next.show) setOpen(true);
      else if (next.kind === 'new-install' || (next.kind === 'upgrade' && next.notice?.level === 'quiet')) {
        void apiSend('/api/release-notice', { version: next.current }).catch(() => {});
      }
    }).catch(() => {});
    void load(false);
    const reopen = () => { void load(true) };
    document.addEventListener(RELEASE_NOTICE_EVENT, reopen);
    return () => { disposed = true; document.removeEventListener(RELEASE_NOTICE_EVENT, reopen) };
  }, []);

  if (!data?.notice) return null;
  const notice = data.notice;
  const done = () => {
    setError('');
    apiSend('/api/release-notice', { version: data.current })
      .then(() => { setOpen(false); setData({ ...data, kind: 'seen', show: false }) })
      .catch((reason: Error) => setError(reason.message || '未能记录，请稍后再试'));
  };
  const go = (route: string) => { setOpen(false); navigate(route) };
  const view = (item: NoticeItem) => item.route
    ? <Button variant="ghost" size="small" aria-label={`查看${item.title}`} onClick={() => go(item.route!)}>查看</Button>
    : null;

  return createPortal(
    <ModalFrame isOpen={open} onOpenChange={value => { if (!value) setOpen(false) }} width="form" label="版本更新说明"
      surfaceClassName="peach-react">
      <header className="flex shrink-0 items-start justify-between gap-4 border-b border-separator-border px-6 py-4">
        <div className="flex min-w-0 flex-col gap-0.5">
          <h2 className="text-title-2-medium text-text-primary">Peach {data.current}</h2>
          <p className="text-body-2-regular text-text-secondary">{notice.headline}</p>
        </div>
        <SettingsDialogClose label="关闭更新说明" onPress={() => setOpen(false)} />
      </header>
      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto overscroll-contain px-6 py-4">
        {notice.attention.map(item => (
          <Note key={item.title} tone="warning" title={item.title}
            action={item.route ? <Button size="small" variant="secondary" onClick={() => go(item.route!)}>去设置</Button> : undefined}>
            {item.body}
          </Note>
        ))}
        {notice.features.length ? <Rows items={notice.features} trailing={view} /> : null}
        {notice.automatic.length ? (
          <Disclosure summary="更新后自动进行" defaultOpen>
            <div className="pt-3"><Rows items={notice.automatic} trailing={item => progressLabel(item.progress)} /></div>
          </Disclosure>
        ) : null}
        {data.missed.length ? (
          <Disclosure summary={data.estimated ? '最近几版' : `还错过了 ${data.missed.map(row => row.version).join('、')}`}>
            <div className="flex flex-col gap-4 pt-3">
              {data.missed.map(row => (
                <section key={row.version} className="flex flex-col gap-2">
                  <h3 className="text-body-2-medium text-text-secondary">{row.version} · {row.headline}</h3>
                  <Rows items={row.features} trailing={() => null} />
                </section>
              ))}
            </div>
          </Disclosure>
        ) : null}
      </div>
      <footer className="flex shrink-0 items-center justify-between gap-3 border-t border-separator-border px-6 py-3">
        <ExternalLink href={data.release_url}>完整更新日志</ExternalLink>
        <div className="flex items-center gap-3">
          {error ? <p role="alert" className="text-body-2-regular text-text-error-primary">{error}</p> : null}
          <Button onClick={done}>知道了</Button>
        </div>
      </footer>
    </ModalFrame>,
    document.body,
  );
}
