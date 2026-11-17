/* 详情页手动指定艺人：刮削、文件夹和文件名规则都没认出的作品，用户自己填名字挂上或移除。
 *
 * 名字边敲边从 `/api/suggest?kind=performer` 取库里已有的艺人做候选；提交走
 * `/api/item-performer`（`src/peach/item_performers.py`），服务端把别名、大小写不同的写法落到
 * 已有那位，库里没有就新建。写完让这部作品的详情重新取一次，归属区随之刷新。 */
import { useEffect, useId, useState } from 'react';
import { Button } from '@/components/base/buttons/button';

import { apiGet, apiSend, errorMessage } from '../../api';
import { queryClient } from '../query';

interface Suggest { groups?: { kind: string; items: { value?: string; label?: string; name?: string }[] }[] }

const ITEM_PERFORMER_URL = '/api/item-performer';

export function AssignPerformer({ id, itemKey, toast }: {
  id: number;
  itemKey: readonly unknown[];
  toast(message: string, options?: { undo?: () => Promise<void> }): void;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [options, setOptions] = useState<string[]>([]);
  const list = useId();

  useEffect(() => {
    const query = name.trim();
    if (!open || !query) { setOptions([]); return }
    const controller = new AbortController();
    const timer = setTimeout(() => {
      apiGet<Suggest>(`/api/suggest?q=${encodeURIComponent(query)}&kind=performer&limit=12`, controller.signal)
        .then((data) => {
          const items = (data.groups || []).filter((group) => group.kind === 'performer').flatMap((group) => group.items);
          setOptions([...new Set(items.map((item) => String(item.value || item.label || item.name || '')).filter(Boolean))]);
        })
        .catch(() => undefined);
    }, 200);
    return () => { clearTimeout(timer); controller.abort() };
  }, [name, open]);

  const send = (operation: 'add' | 'remove', value: string) =>
    apiSend<{ ok?: boolean; name?: string }>(ITEM_PERFORMER_URL, { id, operation, name: value });
  const refresh = () => queryClient.invalidateQueries({ queryKey: itemKey });

  const run = async (operation: 'add' | 'remove') => {
    const value = name.trim();
    if (!value || busy) return;
    setBusy(true);
    try {
      const result = await send(operation, value);
      const done = result.name || value;
      await refresh();
      if (operation === 'remove' && !result.ok) { toast(`这部作品没有关联「${done}」`); return }
      setName('');
      const undo = operation === 'add' ? 'remove' : 'add';
      toast(operation === 'add' ? `已归到「${done}」` : `已移除「${done}」`, {
        undo: async () => { await send(undo, done); await refresh() },
      });
    } catch (cause) {
      toast(errorMessage(cause));
    } finally { setBusy(false) }
  };

  if (!open) {
    return <Button size="small" variant="secondary" data-assign-performer="" onClick={() => setOpen(true)}>指定艺人</Button>;
  }
  return (
    <form className="flex flex-wrap items-center gap-2" data-assign-performer=""
      onSubmit={(event) => { event.preventDefault(); void run('add') }}>
      <input className="min-w-0 flex-1 rounded-md border border-primary bg-primary px-2 py-1 text-sm" list={list}
        value={name} autoFocus placeholder="艺人名字（中文、日文、别名都行）" aria-label="艺人名字"
        onChange={(event) => setName(event.target.value)} />
      <datalist id={list}>{options.map((option) => <option key={option} value={option} />)}</datalist>
      <Button size="small" type="submit" disabled={busy || !name.trim()}>添加</Button>
      <Button size="small" variant="secondary" disabled={busy || !name.trim()} onClick={() => void run('remove')}>移除</Button>
      <Button size="small" variant="ghost" onClick={() => { setOpen(false); setName('') }}>取消</Button>
    </form>
  );
}
