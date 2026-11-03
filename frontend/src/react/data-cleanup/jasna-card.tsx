/* Jasna 去码（`/data-cleanup/jasna`）：填本机 Jasna 程序的位置、选修复模型，看排队与最近结果。
 *
 * 去哪部片由详情页的「用 Jasna 去码」决定；这里只管设置和看结果。服务端见 `src/peach/jasna_restore.py`。 */
import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/base/buttons/button';
import { Input } from '@/components/base/input/input';
import { Label } from '@/components/base/input/label';
import { Select, SelectItem } from '@/components/base/select/select';

import { apiSend, errorMessage } from '../../api';
import { Fieldset, FieldsetTitle } from '../components/fieldset';
import { Note } from '../components/note';
import { queryClient } from '../query';
import { JASNA_KEY, fetchJasna, type JasnaState } from '../item-detail/detail-file-actions';

const MODEL_LABELS: Record<string, string> = {
  basicvsrpp: 'BasicVSR++（免费，快）',
  'ltx-basic': 'LTX 基础（需支持者许可）',
  ltx: 'LTX 标准（需支持者许可，慢）',
  'ltx-4step': 'LTX 较好（需支持者许可，更慢）',
  'ltx-8step': 'LTX 高（需支持者许可，很慢）',
  'ltx-undistilled': 'LTX 最高（需支持者许可，极慢）',
};

const STATUS: Record<string, string> = {
  queued: '排队中', running: '处理中', succeeded: '完成', failed: '失败', cancelled: '已取消', interrupted: '中断（可重新开始）',
};

export function JasnaCard({ toast }: { toast(message: string): void }) {
  const query = useQuery({
    queryKey: JASNA_KEY,
    queryFn: ({ signal }) => fetchJasna(signal),
    refetchInterval: (current) => (current.state.data && (current.state.data.queue.length || current.state.data.current.asset_id) ? 3000 : false),
  });
  const data = query.data;
  const [exe, setExe] = useState('');
  const [model, setModel] = useState('basicvsrpp');
  const [extra, setExtra] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [found, setFound] = useState('');

  useEffect(() => {
    if (!data) return;
    setExe(data.config.exe); setModel(data.config.model); setExtra(data.config.extra);
  }, [data?.config.exe, data?.config.model, data?.config.extra]);

  const send = async (body: Record<string, unknown>, done: string) => {
    setBusy(true); setError('');
    try {
      const next = await apiSend<JasnaState>('/api/jasna', body);
      queryClient.setQueryData(JASNA_KEY, next);
      if (next.version) setFound(next.version);
      toast(done);
    } catch (cause) {
      setError(errorMessage(cause));
    } finally { setBusy(false) }
  };

  return (
    <Fieldset layout="stack" labelledBy="jasna-title">
      <FieldsetTitle id="jasna-title">Jasna 去码</FieldsetTitle>
      <p className="text-body-regular text-text-secondary">
        调用本机安装的 Jasna 修复影片里的马赛克。在影片详情页点「用 Jasna 去码」排队，一次处理一部，进度在任务中心。
        成品放在原文件夹，名字是「原文件名-去码.mkv」，原片保留，确认没问题后可在原片详情页永久删除。
        需要 NVIDIA GTX 16 / RTX 20 系或更新的显卡；第一次使用会先花 15–60 分钟为显卡准备模型。
      </p>
      {query.isError ? <Note tone="error" title="读取状态失败">{errorMessage(query.error)}</Note> : null}

      <div className="flex flex-col gap-3">
        <Input label="Jasna 程序位置" placeholder="D:\Jasna\jasna.exe" value={exe} onChange={setExe} />
        <p className="text-caption-1-regular text-text-secondary">
          从 Jasna 的 GitHub Releases 下载 Windows 版，解压到路径里没有中文和日文的文件夹，填其中 jasna.exe 的完整路径。
        </p>
        <div className="flex flex-col gap-1"><Label>修复模型</Label>
          <Select aria-label="修复模型" selectedKey={model} onSelectionChange={(key) => setModel(String(key))}>
            {(data?.models || ['basicvsrpp']).map((key) => <SelectItem key={key} id={key}>{MODEL_LABELS[key] || key}</SelectItem>)}
          </Select>
        </div>
        <Input label="附加参数（可不填）" placeholder="例如 --max-clip-size 60" value={extra} onChange={setExtra} />
        <div className="flex flex-wrap gap-2">
          <Button size="small" variant="primary" disabled={busy || !exe.trim()}
            onClick={() => void send({ action: 'config', exe, model, extra }, '已保存 Jasna 设置')}>保存</Button>
          <Button size="small" variant="secondary" disabled={busy || !data?.configured}
            onClick={() => void send({ action: 'check' }, 'Jasna 可以启动')}>试启动</Button>
        </div>
        {found ? <Note tone="success" title="Jasna 可以启动">{found}</Note> : null}
        {error ? <Note tone="error" title="操作失败">{error}</Note> : null}
      </div>

      {data?.current.asset_id ? (
        <Note tone="info" title="正在去码">{`进度 ${Math.round(data.current.progress || 0)}%，后面还有 ${data.queue.length} 部排队`}</Note>
      ) : null}
      {data?.jobs.length ? (
        <ul className="flex flex-col gap-2 text-body-regular">
          {data.jobs.map((job) => (
            <li key={job.id} className="flex flex-col">
              <span className="text-text-primary wrap-anywhere">{`${STATUS[job.status] || job.status} · ${job.name || job.id}`}</span>
              {job.output ? <span className="text-caption-1-regular text-text-secondary wrap-anywhere">{`成品：${job.output}`}</span> : null}
              {job.error ? <span className="text-caption-1-regular text-text-secondary wrap-anywhere">{job.error}</span> : null}
            </li>
          ))}
        </ul>
      ) : null}
    </Fieldset>
  );
}
