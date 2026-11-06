/* 详情页的文件操作：在资源管理器里打开文件所在位置（`/api/reveal`），交给 Jasna 去码、
 * 生成 AI 中文字幕（`src/peach/ai_subtitles.py`），或把这部影片连同磁盘上的文件永久删除。
 *
 * 去码在服务端排队（`src/peach/jasna_restore.py`），进度在任务中心；成品是同目录的
 * `<原文件名>-去码.mkv`，登记后作为新的一条出现在片库。永久删除走与回收站相同的两步：
 * 先移入回收站，再永久删除，删的是磁盘上的文件和库里这一行。 */
import { useState } from 'react';
import { confirmModal } from '@peach/legacy/ui';
import { Button } from '@/components/base/buttons/button';

import { apiGet, apiSend, errorMessage } from '../../api';
import { queryClient } from '../query';

export const JASNA_KEY = ['jasna'] as const;

export interface JasnaJob {
  id: number; status: string; name?: string; output?: string; error?: string; restored_id?: number | null; at?: string;
}

export interface JasnaState {
  configured: boolean;
  config: { exe: string; model: string; extra: string };
  models: string[];
  jobs: JasnaJob[];
  queue: number[];
  current: { asset_id?: number; progress?: number };
  version?: string;
}

export const fetchJasna = (signal?: AbortSignal) => apiGet<JasnaState>('/api/jasna', signal);

const RESTORED = /-去码$/;

export function DetailFileActions({ item, toast, onDeleted }: {
  item: { id: number; name?: string | null; medium?: string | null };
  toast(message: string): void;
  onDeleted(): void | Promise<void>;
}) {
  /* 详情页不为去码键单独取状态：点下去才问服务端，没设置 Jasna 时由服务端说明去哪里设置。 */
  const [busy, setBusy] = useState('');
  const [queued, setQueued] = useState(false);
  const [subtitling, setSubtitling] = useState(false);
  const stem = String(item.name || '').replace(/\.[^.]+$/, '');
  const video = (item.medium || 'video') === 'video';

  /* 路径由服务端按 id 查，资源管理器开在 Peach 所在的那台电脑上，并选中这个文件。 */
  const reveal = async () => {
    setBusy('reveal');
    try {
      await apiSend('/api/reveal', { id: item.id });
      toast('已在资源管理器中显示');
    } catch (cause) {
      toast(errorMessage(cause));
    } finally { setBusy('') }
  };

  const restore = async () => {
    setBusy('jasna');
    try {
      const next = await apiSend<JasnaState>('/api/jasna', { action: 'enqueue', id: item.id });
      queryClient.setQueryData(JASNA_KEY, next);
      setQueued(true);
      toast('已交给 Jasna 去码，进度在「管理 → 任务中心」');
    } catch (cause) {
      toast(errorMessage(cause));
    } finally { setBusy('') }
  };

  const subtitle = async () => {
    setBusy('subtitle');
    try {
      await apiSend('/api/ai-subtitles', { action: 'enqueue', id: item.id });
      setSubtitling(true);
      toast('已开始生成中文字幕，进度在「管理 → 任务中心」');
    } catch (cause) {
      toast(errorMessage(cause));
    } finally { setBusy('') }
  };

  const remove = () => {
    void confirmModal({
      title: '永久删除这部影片',
      body: `会删除磁盘上的文件「${item.name || item.id}」和库里的这一条，不能恢复。只想先放一边，用上面的回收站按钮。`,
      confirmLabel: '永久删除',
      danger: true,
      onConfirm: async () => {
        await apiSend('/api/batch', { ids: [item.id], operation: 'dispose', disposal_reason: 'manual' });
        await apiSend('/api/batch', { ids: [item.id], operation: 'delete' });
        await queryClient.invalidateQueries({ queryKey: ['trash-summary'] });
        toast('已永久删除');
        await onDeleted();
      },
    });
  };

  return (
    <div className="flex flex-wrap items-center gap-2" data-detail-file-actions="">
      <Button size="small" variant="secondary" disabled={!!busy} onClick={() => void reveal()}>打开所在位置</Button>
      {video && !RESTORED.test(stem) ? (
        <Button size="small" variant="secondary" disabled={!!busy || queued} onClick={() => void restore()}>
          {queued ? '已排进 Jasna 去码队列' : '用 Jasna 去码'}
        </Button>
      ) : null}
      {video ? (
        <Button size="small" variant="secondary" disabled={!!busy || subtitling} onClick={() => void subtitle()}>
          {subtitling ? '已排进字幕队列' : '生成中文字幕'}
        </Button>
      ) : null}
      <Button size="small" variant="secondary" disabled={!!busy} onClick={remove}>永久删除</Button>
    </div>
  );
}
