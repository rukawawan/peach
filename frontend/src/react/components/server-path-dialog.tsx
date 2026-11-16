/* 无桌面部署的目录选择与位置回执，共用 BoardUI 弹层。 */
import { useEffect, useRef, useState, type ComponentProps, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import { Heading } from 'react-aria-components';
import { Button } from '@/components/base/buttons/button';
import { Input } from '@/components/base/input/input';
import { ModalFrame } from './modal-frame';
import { Help, ErrorText } from '../settings/section';
import { busyProps } from '../settings/busy-props';
import { t } from '../../i18n';

export interface FolderReply {
  path: string | null;
  mode?: 'server' | 'manual';
  roots?: string[];
  parent?: string | null;
  directories?: { name: string; path: string }[];
  next_offset?: number | null;
  editable?: boolean;
  container?: boolean;
}

export interface FolderRequest {
  initial: string;
  purpose: 'media' | 'data';
  start?: boolean;
  offset?: number;
}
type RequestFolder = (body: FolderRequest) => Promise<FolderReply>;

function PathModalFrame(props: ComponentProps<typeof ModalFrame>) {
  return <ModalFrame {...props} portalContainer={document.querySelector('dialog[open]') || undefined} />;
}

function mountDialog<T>(render: (close: (value: T) => void) => ReactNode): Promise<T> {
  const host = document.createElement('div');
  host.className = 'peach-react';
  (document.querySelector('dialog[open]') || document.body).append(host);
  const root = createRoot(host);
  return new Promise(resolve => {
    const close = (value: T) => {
      root.unmount(); host.remove(); resolve(value);
    };
    root.render(render(close));
  });
}

export async function pickServerFolder(initial: string, request: RequestFolder, purpose: FolderRequest['purpose'] = 'media'): Promise<string | null> {
  const reply = await request({ initial, purpose, start: true });
  if (reply.mode === 'manual') return mountDialog<string | null>(close => <DataFolderDialog reply={reply} close={close} />);
  if (reply.mode !== 'server') return reply.path;
  return mountDialog<string | null>(close => <FolderDialog initial={reply} initialPath={initial} request={request} close={close} />);
}

function DataFolderDialog({ reply, close }: { reply: FolderReply; close(path: string | null): void }) {
  const [path, setPath] = useState(reply.path || '');
  return <PathModalFrame isOpen onOpenChange={open => { if (!open) close(null) }} width="form" surfaceClassName="peach-react">
    <div className="flex flex-col gap-4 p-5">
      <Heading slot="title" className="text-title-2-semibold text-text-primary">{t('shell:serverPath.dataTitle')}</Heading>
      <Help>{t(reply.container ? 'shell:serverPath.dataContainer' : 'shell:serverPath.dataManual')}</Help>
      <Input aria-label={t('shell:serverPath.dataField')} value={path} onChange={setPath} isReadOnly={reply.editable === false} />
      <div className="flex justify-end gap-2">
        <Button variant="secondary" onClick={() => close(null)}>{t(reply.editable === false ? 'shell:serverPath.close' : 'shell:serverPath.cancel')}</Button>
        {reply.editable !== false ? <Button disabled={!path.trim()} onClick={() => close(path.trim())}>{t('shell:serverPath.useFolder')}</Button> : null}
      </div>
    </div>
  </PathModalFrame>;
}

function FolderDialog({ initial, initialPath, request, close }: {
  initial: FolderReply; initialPath: string; request: RequestFolder; close(path: string | null): void;
}) {
  const [reply, setReply] = useState(initial);
  const [path, setPath] = useState(initialPath);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const active = useRef(false);
  const reading = useRef(false);
  const browse = async (next: string, offset = 0) => {
    if (reading.current) return;
    reading.current = true;
    setBusy(true); setError('');
    try {
      const result = await request({ initial: next, purpose: 'media', offset });
      if (!active.current) return;
      setReply(previous => offset && previous.path === result.path ? {
        ...result, directories: [...new Map([...(previous.directories || []), ...(result.directories || [])].map(item => [item.path, item])).values()],
      } : result);
      setPath(result.path || '');
    } catch (cause) {
      if (active.current) setError(cause instanceof Error ? cause.message : t('shell:serverPath.readFailed'));
    } finally {
      reading.current = false;
      if (active.current) setBusy(false);
    }
  };
  useEffect(() => {
    active.current = true;
    if (initialPath) void browse(initialPath);
    return () => { active.current = false };
  }, []);
  return <PathModalFrame isOpen onOpenChange={open => { if (!open) close(null) }} width="form" surfaceClassName="peach-react">
    <div className="flex flex-col gap-4 p-5">
      <Heading slot="title" className="text-title-2-semibold text-text-primary">{t('shell:serverPath.pickTitle')}</Heading>
      <Help>{t('shell:serverPath.pickHelp')}</Help>
      <Input aria-label={t('shell:serverPath.pathField')} value={path} onChange={setPath} onKeyDown={event => {
        if (event.key === 'Enter' && !event.nativeEvent.isComposing) { event.preventDefault(); void browse(path) }
      }} />
      <div className="flex flex-wrap gap-2">
        <Button variant="secondary" {...busyProps(busy)} onClick={() => void browse('')}>{t('shell:serverPath.roots')}</Button>
        {reply.parent ? <Button variant="secondary" {...busyProps(busy)} onClick={() => void browse(reply.parent!)}>{t('shell:serverPath.parent')}</Button> : null}
      </div>
      <div className="flex max-h-64 flex-col gap-2 overflow-y-auto">
        {(reply.path ? reply.directories || [] : (reply.roots || []).map(root => ({ name: root, path: root }))).map(item =>
          <Button key={item.path} variant="ghost" className="min-w-0 break-all" {...busyProps(busy)} onClick={() => void browse(item.path)}>{item.name}</Button>)}
      </div>
      {busy ? <p role="status">{t('shell:serverPath.reading')}</p> : null}
      {!busy && reply.path && !reply.directories?.length ? <Help>{t(reply.next_offset != null ? 'shell:serverPath.noSubfoldersYet' : 'shell:serverPath.noSubfolders')}</Help> : null}
      {reply.path && reply.next_offset != null ? <Button variant="secondary" {...busyProps(busy)} onClick={() => void browse(reply.path!, reply.next_offset!)}>{t('shell:serverPath.readMore')}</Button> : null}
      {!reply.roots?.length ? <Help>{t('shell:serverPath.noRoots')}</Help> : null}
      {error ? <ErrorText>{error}</ErrorText> : null}
      <div className="flex justify-end gap-2">
        <Button variant="secondary" onClick={() => close(null)}>{t('shell:serverPath.cancel')}</Button>
        <Button disabled={!reply.path || path !== reply.path} {...busyProps(busy)} onClick={() => {
          if (!reading.current && reply.path && path === reply.path) close(reply.path);
        }}>{t('shell:serverPath.choose')}</Button>
      </div>
    </div>
  </PathModalFrame>;
}

export interface ServerPathReply { path: string; container?: boolean; media_root?: string; relative_path?: string }

export function showServerPath(reply: ServerPathReply): Promise<void> {
  return mountDialog<void>(close => <PathModalFrame isOpen onOpenChange={open => { if (!open) close() }} width="form" surfaceClassName="peach-react">
    <div className="flex flex-col gap-4 p-5">
      <Heading slot="title" className="text-title-2-semibold text-text-primary">{t('shell:serverPath.locationTitle')}</Heading>
      <Help>{t(reply.container ? 'shell:serverPath.locationContainer' : 'shell:serverPath.locationServer')}</Help>
      <Input label={t(reply.container ? 'shell:serverPath.containerPath' : 'shell:serverPath.serverPath')} aria-label={t('shell:serverPath.locationField')} value={reply.path} isReadOnly onFocus={event => event.target.select()} />
      {reply.media_root ? <Input label={t('shell:serverPath.mediaRoot')} value={reply.media_root} isReadOnly onFocus={event => event.target.select()} /> : null}
      {reply.relative_path ? <Input label={t('shell:serverPath.relativePath')} value={reply.relative_path} isReadOnly onFocus={event => event.target.select()} /> : null}
      <div className="flex justify-end"><Button onClick={() => close()}>{t('shell:serverPath.close')}</Button></div>
    </div>
  </PathModalFrame>);
}

/** 定位回执收尾：服务端部署弹出路径，桌面部署照常 `success()`。 */
export async function completeReveal(result: unknown, success: () => void): Promise<void> {
  const reply = result as (ServerPathReply & { mode?: string }) | undefined;
  if (reply?.mode === 'server' && reply.path) await showServerPath(reply);
  else success();
}
