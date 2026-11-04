/* AI 字幕（`/data-cleanup/ai-subtitles`）：本机 Faster-Whisper-XXL 听写日语，DeepSeek 翻成中文。
 *
 * 给哪部片做由详情页的「生成中文字幕」决定；这里管设置、Key 和最近结果。服务端见 `src/peach/ai_subtitles.py`。 */
import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/base/buttons/button';
import { Checkbox } from '@/components/base/checkbox/checkbox';
import { Input } from '@/components/base/input/input';
import { Label } from '@/components/base/input/label';
import { Select, SelectItem } from '@/components/base/select/select';

import { apiGet, apiSend, errorMessage } from '../../api';
import { Fieldset, FieldsetTitle } from '../components/fieldset';
import { Note } from '../components/note';
import { queryClient } from '../query';

export const AI_SUBTITLES_KEY = ['ai-subtitles'] as const;

interface SubtitleJob {
  id: number; status: string; name?: string; output?: string; error?: string; lines?: number; untranslated?: number;
}

export interface AiSubtitlesState {
  configured: boolean;
  key_saved: boolean;
  config: { exe: string; model: string; vocal: boolean; bilingual: boolean; extra: string };
  models: string[];
  jobs: SubtitleJob[];
  queue: number[];
  current: { asset_id?: number; stage?: string };
}

const MODEL_LABELS: Record<string, string> = {
  'large-v3': 'large-v3（最准，推荐）',
  'large-v3-turbo': 'large-v3-turbo（更快，略逊）',
  medium: 'medium（快，准确度一般）',
};

const STATUS: Record<string, string> = {
  queued: '排队中', running: '处理中', succeeded: '完成', failed: '失败', cancelled: '已取消', interrupted: '中断（可重新开始）',
};

export function AiSubtitlesCard({ toast }: { toast(message: string): void }) {
  const query = useQuery({
    queryKey: AI_SUBTITLES_KEY,
    queryFn: ({ signal }) => apiGet<AiSubtitlesState>('/api/ai-subtitles', signal),
    refetchInterval: (current) => (current.state.data && (current.state.data.queue.length || current.state.data.current.asset_id) ? 3000 : false),
  });
  const data = query.data;
  const [exe, setExe] = useState('');
  const [model, setModel] = useState('large-v3');
  const [vocal, setVocal] = useState(true);
  const [bilingual, setBilingual] = useState(false);
  const [extra, setExtra] = useState('');
  const [key, setKey] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!data) return;
    setExe(data.config.exe); setModel(data.config.model); setVocal(data.config.vocal);
    setBilingual(data.config.bilingual); setExtra(data.config.extra);
  }, [data?.config.exe, data?.config.model, data?.config.vocal, data?.config.bilingual, data?.config.extra]);

  const send = async (body: Record<string, unknown>, done: string) => {
    setBusy(true); setError('');
    try {
      const next = await apiSend<AiSubtitlesState>('/api/ai-subtitles', body);
      queryClient.setQueryData(AI_SUBTITLES_KEY, next);
      toast(done);
      return true;
    } catch (cause) {
      setError(errorMessage(cause));
      return false;
    } finally { setBusy(false) }
  };

  return (
    <Fieldset layout="stack" labelledBy="ai-subtitles-title">
      <FieldsetTitle id="ai-subtitles-title">AI 字幕</FieldsetTitle>
      <p className="text-body-regular text-text-secondary">
        在影片详情页点「生成中文字幕」：先用本机的 Faster-Whisper-XXL 把日语听写成字幕，再交给 DeepSeek 翻成中文。
        生成的「原文件名.ja.srt」和「原文件名.zh.srt」放在影片旁边，播放时在字幕菜单里选。一次处理一部，进度在任务中心。
      </p>
      {query.isError ? <Note tone="error" title="读取状态失败">{errorMessage(query.error)}</Note> : null}

      <div className="flex flex-col gap-3">
        <Input label="听写程序位置" placeholder="C:\Users\你\Apps\Faster-Whisper-XXL\faster-whisper-xxl.exe" value={exe} onChange={setExe} />
        <p className="text-caption-1-regular text-text-secondary">
          从 Purfview 的 whisper-standalone-win 的 GitHub Releases 下载 Faster-Whisper-XXL 的 Windows 版，解压后填其中 faster-whisper-xxl.exe 的完整路径。第一次听写会自动下载模型（约 3 GB）。
        </p>
        <div className="flex flex-col gap-1"><Label>听写模型</Label>
          <Select aria-label="听写模型" selectedKey={model} onSelectionChange={(value) => setModel(String(value))}>
            {(data?.models || ['large-v3']).map((name) => <SelectItem key={name} id={name}>{MODEL_LABELS[name] || name}</SelectItem>)}
          </Select>
        </div>
        <Checkbox isSelected={vocal} onChange={setVocal}>先分离人声再听写（背景音乐和杂音多时更准，稍慢）</Checkbox>
        <Checkbox isSelected={bilingual} onChange={setBilingual}>中日双语字幕（中文在上，日文在下）</Checkbox>
        <Input label="附加参数（可不填）" placeholder="例如 --vad_method pyannote_v3" value={extra} onChange={setExtra} />
        <div className="flex flex-wrap gap-2">
          <Button size="small" variant="primary" disabled={busy || !exe.trim()}
            onClick={() => void send({ action: 'config', exe, model, vocal, bilingual, extra }, '已保存字幕设置')}>保存</Button>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Input type="password" autoComplete="off" value={key} onChange={setKey}
          label={data?.key_saved ? 'DeepSeek API Key（已保存，填新的可替换）' : 'DeepSeek API Key'} />
        <p className="text-caption-1-regular text-text-secondary">
          在 platform.deepseek.com 的 API Keys 页面创建。Key 只保存在本机 Peach 数据目录的 secrets 里。
        </p>
        <div className="flex flex-wrap gap-2">
          <Button size="small" variant="secondary" disabled={busy || !key.trim()}
            onClick={() => void send({ action: 'key', key }, 'Key 已验证并保存').then((ok) => { if (ok) setKey('') })}>验证并保存 Key</Button>
          {data?.key_saved ? <Button size="small" variant="ghost" disabled={busy}
            onClick={() => void send({ action: 'key', key: '' }, '已删除 Key')}>删除 Key</Button> : null}
        </div>
      </div>
      {error ? <Note tone="error" title="操作失败">{error}</Note> : null}

      {data?.current.asset_id ? (
        <Note tone="info" title="正在生成字幕">{`当前步骤：${data.current.stage || '准备'}，后面还有 ${data.queue.length} 部排队`}</Note>
      ) : null}
      {data?.jobs.length ? (
        <ul className="flex flex-col gap-2 text-body-regular">
          {data.jobs.map((job) => (
            <li key={job.id} className="flex flex-col">
              <span className="text-text-primary wrap-anywhere">{`${STATUS[job.status] || job.status} · ${job.name || job.id}`}</span>
              {job.output ? <span className="text-caption-1-regular text-text-secondary wrap-anywhere">
                {`字幕：${job.output}` + (job.lines ? `，${job.lines} 条` : '') + (job.untranslated ? `，${job.untranslated} 条没译成保留日文` : '')}
              </span> : null}
              {job.error ? <span className="text-caption-1-regular text-text-secondary wrap-anywhere">{job.error}</span> : null}
            </li>
          ))}
        </ul>
      ) : null}
    </Fieldset>
  );
}
