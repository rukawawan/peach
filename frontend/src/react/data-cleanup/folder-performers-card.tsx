/* 按文件夹归艺人（`/data-cleanup/folder-performers`）：父目录下每个子文件夹是一位艺人。
 *
 * 填父目录 → 列出子文件夹、视频数和建议的艺人名 → 勾选、改名 → 写入。服务端见
 * `src/peach/folder_performers.py`；写入可按来源整批撤回。 */
import { useState } from 'react';
import { confirmModal } from '@peach/legacy/ui';
import { Button } from '@/components/base/buttons/button';
import { Checkbox } from '@/components/base/checkbox/checkbox';
import { Input } from '@/components/base/input/input';

import { apiSend, errorMessage } from '../../api';
import { Fieldset, FieldsetTitle } from '../components/fieldset';
import { Note } from '../components/note';

interface FolderRow { folder: string; name: string; videos: number; assigned: number; selected: boolean }
interface FolderPreview {
  parent: string; folders: FolderRow[]; truncated: boolean;
  applied?: { videos: number; performers: number }; undone?: { removed: number };
}

export function FolderPerformersCard({ toast }: { toast(message: string): void }) {
  const [parent, setParent] = useState('');
  const [preview, setPreview] = useState<FolderPreview | null>(null);
  const [rows, setRows] = useState<FolderRow[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const send = async (body: Record<string, unknown>) => {
    setBusy(true); setError('');
    try {
      const next = await apiSend<FolderPreview>('/api/folder-performers', { parent, ...body });
      setPreview(next); setRows(next.folders);
      return next;
    } catch (cause) {
      setError(errorMessage(cause));
      return null;
    } finally { setBusy(false) }
  };

  const update = (index: number, patch: Partial<FolderRow>) =>
    setRows((current) => current.map((row, at) => (at === index ? { ...row, ...patch } : row)));

  const chosen = rows.filter((row) => row.selected && row.name.trim());
  const videos = chosen.reduce((sum, row) => sum + row.videos, 0);

  const apply = async () => {
    const next = await send({ action: 'apply', folders: chosen.map(({ folder, name }) => ({ folder, name })) });
    if (next?.applied) toast(`已把 ${next.applied.videos} 部视频记到 ${next.applied.performers} 位艺人名下`);
  };

  const undo = () => {
    void confirmModal({
      title: '撤回这个目录下按文件夹归的艺人',
      body: '只撤回在这里写入的艺人，刮削得到的不动。视频文件不受影响。',
      confirmLabel: '撤回',
      onConfirm: async () => {
        const next = await send({ action: 'undo' });
        if (next?.undone) toast(`已撤回 ${next.undone.removed} 条`);
      },
    });
  };

  return (
    <Fieldset layout="stack" labelledBy="folder-performers-title">
      <FieldsetTitle id="folder-performers-title">按文件夹归艺人</FieldsetTitle>
      <p className="text-body-regular text-text-secondary">
        已经按艺人分好文件夹、但文件名刮削不到的，在这里填它们的上一级目录，例如 D:\Downloads\欧美。
        每个子文件夹算一位艺人，里面（含更深的子文件夹）的视频都记到她名下，艺人页就能看到。
        像人名的文件夹默认勾选，合集、站名之类不勾；艺人名可以改。
      </p>
      <div className="flex flex-wrap items-end gap-2">
        <span className="min-w-0 flex-1"><Input label="上一级目录" placeholder="D:\Downloads\欧美" value={parent} onChange={setParent} /></span>
        <Button size="small" variant="secondary" disabled={busy || !parent.trim()} onClick={() => void send({ action: 'preview' })}>列出子文件夹</Button>
      </div>
      {error ? <Note tone="error" title="操作失败">{error}</Note> : null}
      {preview && !rows.length ? <Note tone="info" title="这个目录下没有找到库里的视频">确认路径和 Peach 扫描的媒体目录一致，子文件夹里要有已入库的视频。</Note> : null}
      {rows.length ? (
        <>
          <ul className="flex flex-col gap-2">
            {rows.map((row, index) => (
              <li key={row.folder} className="flex flex-wrap items-center gap-3 border-b border-separator-border pb-2">
                <Checkbox isSelected={row.selected} onChange={(value) => update(index, { selected: value })} aria-label={`选择 ${row.folder}`} />
                <span className="w-56 min-w-0 truncate text-body-regular text-text-secondary" title={row.folder}>{row.folder}</span>
                <span className="min-w-40 flex-1"><Input aria-label={`${row.folder} 的艺人名`} value={row.name}
                  onChange={(value) => update(index, { name: value })} isDisabled={!row.selected} /></span>
                <span className="text-caption-1-regular text-text-secondary">
                  {`${row.videos} 部` + (row.assigned ? `，已归 ${row.assigned}` : '')}
                </span>
              </li>
            ))}
          </ul>
          {preview?.truncated ? <p className="text-caption-1-regular text-text-secondary">子文件夹太多，只列出前 500 个。</p> : null}
          <div className="flex flex-wrap gap-2">
            <Button size="small" variant="primary" disabled={busy || !chosen.length} onClick={() => void apply()}>
              {`把 ${videos} 部视频记到 ${chosen.length} 位艺人名下`}
            </Button>
            <Button size="small" variant="ghost" disabled={busy} onClick={undo}>撤回这个目录下归过的</Button>
          </div>
        </>
      ) : null}
    </Fieldset>
  );
}
