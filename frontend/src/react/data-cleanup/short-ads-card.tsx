/* 短视频广告（`/data-cleanup/short-ads`）：设定多短的视频按广告处理。
 *
 * 规则由 `src/peach/junk.py` 的 `short_ad_minutes` 读取：扫描入库后的自动垃圾检查把短于它的视频
 * 移入回收站（可还原），文件名自带番号的只进「垃圾文件」复核。0 为关闭。 */
import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button, ButtonLink } from '@/components/base/buttons/button';
import { Input } from '@/components/base/input/input';

import { apiGet, apiSend, errorMessage } from '../../api';
import { Fieldset, FieldsetTitle } from '../components/fieldset';
import { Note } from '../components/note';
import { queryClient } from '../query';

const KEY = ['junk-rules'] as const;

interface JunkRules { short_ad_minutes: number; max_minutes: number; matching: number }

export function ShortAdsCard({ toast }: { toast(message: string): void }) {
  const query = useQuery({ queryKey: KEY, queryFn: ({ signal }) => apiGet<JunkRules>('/api/junk-rules', signal) });
  const data = query.data;
  const [minutes, setMinutes] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => { if (data) setMinutes(String(data.short_ad_minutes)) }, [data?.short_ad_minutes]);

  const save = async () => {
    setBusy(true); setError('');
    try {
      const next = await apiSend<JunkRules>('/api/junk-rules', { short_ad_minutes: Number(minutes) || 0 });
      queryClient.setQueryData(KEY, next);
      await queryClient.invalidateQueries({ queryKey: ['junk-queue'] });
      await queryClient.invalidateQueries({ queryKey: ['junk-summary'] });
      toast(next.short_ad_minutes ? `已保存：短于 ${next.short_ad_minutes} 分钟的视频按广告处理` : '已关闭短视频广告规则');
    } catch (cause) {
      setError(errorMessage(cause));
    } finally { setBusy(false) }
  };

  return (
    <Fieldset layout="stack" labelledBy="short-ads-title">
      <FieldsetTitle id="short-ads-title">短视频广告</FieldsetTitle>
      <p className="text-body-regular text-text-secondary">
        时长短于设定分钟数的视频按广告处理：新扫描入库的自动移入回收站，在回收站里可以还原。
        文件名自带番号的（可能是预告或没下完的正片）不自动移，只放进「垃圾文件」等你判断。
        点过「不是垃圾」、标过喜欢或有字幕的视频不会被移走。填 0 关闭。
      </p>
      {query.isError ? <Note tone="error" title="读取设置失败">{errorMessage(query.error)}</Note> : null}
      <div className="flex flex-wrap items-end gap-2">
        <Input label="短于多少分钟算广告" inputMode="numeric" value={minutes} onChange={setMinutes}
          placeholder="例如 5" />
        <Button size="small" variant="primary" disabled={busy || minutes.trim() === ''} onClick={() => void save()}>保存</Button>
      </div>
      {error ? <Note tone="error" title="保存失败">{error}</Note> : null}
      {data && data.short_ad_minutes > 0 ? (
        <Note tone="info" title={`库里现在有 ${data.matching.toLocaleString()} 个短于 ${data.short_ad_minutes} 分钟的视频`}>
          已经在库里的不会自己消失：到「垃圾文件」页，它们排在最前面，确认后可以一键全部移入回收站。
          <span className="mt-2 block"><ButtonLink size="small" href="/junk-files">打开垃圾文件</ButtonLink></span>
        </Note>
      ) : null}
    </Fieldset>
  );
}
