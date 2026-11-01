/* 欧美资料刮削（`/data-cleanup/western-scrape`）：填 ThePornDB 的 API Token，开始一轮，看进度。
 *
 * 一轮在服务端后台跑（`src/peach/western_tpdb.py`），页面只轮询 `/api/western-scrape`。
 * 查过的作品下次跳过；「重新查没找到的」清掉没查到的记录再跑一遍。 */
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/base/buttons/button';
import { Input } from '@/components/base/input/input';

import { apiGet, apiSend, errorMessage } from '../../api';
import { Fieldset, FieldsetTitle } from '../components/fieldset';
import { Note } from '../components/note';
import { queryClient } from '../query';

export const WESTERN_SCRAPE_KEY = ['western-scrape'] as const;

interface WesternJob {
  status: 'idle' | 'running' | 'succeeded' | 'failed' | 'cancelled';
  checked?: number; total?: number; matched?: number; missing?: number; failed?: number; covers?: number;
  current?: string; error?: string;
}

export interface WesternScrapeState {
  configured: boolean;
  candidates: number;
  done: { matched?: number; missing?: number; error?: number };
  job: WesternJob;
}

export const fetchWesternScrape = (signal?: AbortSignal) => apiGet<WesternScrapeState>('/api/western-scrape', signal);

const n = (value: number | undefined) => Number(value || 0).toLocaleString();

export function WesternScrapeCard({ toast }: { toast(message: string): void }) {
  const query = useQuery({
    queryKey: WESTERN_SCRAPE_KEY,
    queryFn: ({ signal }) => fetchWesternScrape(signal),
    refetchInterval: (current) => (current.state.data?.job.status === 'running' ? 2000 : false),
  });
  const [token, setToken] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const send = async (body: Record<string, unknown>, done?: string) => {
    setBusy(true); setError('');
    try {
      const next = await apiSend<WesternScrapeState>('/api/western-scrape', body);
      queryClient.setQueryData(WESTERN_SCRAPE_KEY, next);
      if (done) toast(done);
      return true;
    } catch (cause) {
      setError(errorMessage(cause));
      return false;
    } finally { setBusy(false) }
  };

  const data = query.data;
  const job = data?.job;
  const running = job?.status === 'running';
  return (
    <Fieldset layout="stack" labelledBy="western-scrape-title">
      <FieldsetTitle id="western-scrape-title">欧美资料刮削</FieldsetTitle>
      <p className="text-body-regular text-text-secondary">
        为没有番号、文件名像欧美片（如 <code>Vixen.24.05.07.Name.XXX</code>、<code>site-name-scene</code>）或产地是欧美的视频，
        向 ThePornDB 查询标题、厂牌、发行日、演员、标签和封面。先按文件指纹查，查不到再按文件名查，
        只有厂牌、日期或演员能对上才采用。不会覆盖你手动编辑过的字段；已有封面保留。
      </p>
      {query.isError ? <Note tone="error" title="读取状态失败">{errorMessage(query.error)}</Note> : null}
      {data ? <p className="text-body-regular text-text-primary">
        {`待处理范围：${n(data.candidates)} 部 · 已匹配 ${n(data.done.matched)} · 没找到 ${n(data.done.missing)}`
          + (data.done.error ? ` · 出错 ${n(data.done.error)}` : '')}
      </p> : null}

      <div className="flex flex-col gap-2">
        <Input type="password" label={data?.configured ? 'ThePornDB API Token（已保存，填新的可替换）' : 'ThePornDB API Token'}
          autoComplete="off" value={token} onChange={setToken} />
        <p className="text-caption-1-regular text-text-secondary">
          在 theporndb.net 免费注册后，从个人设置的 API Tokens 里复制。Token 只保存在本机 Peach 数据目录的 secrets 里。
        </p>
        <div className="flex flex-wrap gap-2">
          <Button size="small" variant="secondary" disabled={busy || !token.trim()}
            onClick={() => void send({ action: 'token', token }, 'Token 已验证并保存').then((ok) => { if (ok) setToken('') })}>
            验证并保存 Token
          </Button>
          {data?.configured ? <Button size="small" variant="ghost" disabled={busy || running}
            onClick={() => void send({ action: 'token', token: '' }, '已删除 Token')}>删除 Token</Button> : null}
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {running
          ? <Button size="small" variant="secondary" disabled={busy} onClick={() => void send({ action: 'cancel' }, '正在停止')}>停止</Button>
          : <>
              <Button size="small" variant="primary" disabled={busy || !data?.configured}
                onClick={() => void send({ action: 'start' }, '已开始欧美资料刮削')}>开始刮削</Button>
              <Button size="small" variant="secondary" disabled={busy || !data?.configured || !data?.done.missing}
                onClick={() => void send({ action: 'start', retry_missing: true }, '已开始重新查没找到的作品')}>重新查没找到的</Button>
            </>}
      </div>

      {job && job.status !== 'idle' ? (
        <Note tone={job.status === 'failed' ? 'error' : job.status === 'running' ? 'info' : 'success'}
          title={{ running: '正在刮削', succeeded: '这一轮已完成', failed: '这一轮中断了', cancelled: '已停止', idle: '' }[job.status]}>
          {`进度 ${n(job.checked)} / ${n(job.total)} · 匹配 ${n(job.matched)} · 没找到 ${n(job.missing)} · 封面 ${n(job.covers)}`
            + (job.failed ? ` · 出错 ${n(job.failed)}` : '')}
          {job.current ? <><br />{`当前：${job.current}`}</> : null}
          {job.error ? <><br />{job.error}</> : null}
        </Note>
      ) : null}
      {error ? <Note tone="error" title="操作失败">{error}</Note> : null}
    </Fieldset>
  );
}
