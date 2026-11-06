/* 一键插队：这一页（或这一行）显示着、封面还在排队的那几部，逐部当场取，不进后台的队。
 * JAV 页「新作」分区、首页与女优页的新作那一行各放一份，各管自己显示的那几部。 */
import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/base/buttons/button';
import { prioritiseCovers } from '../jav/jav';
import { Note } from './note';
import { TaskProgress } from './task-progress';

/** 空闲是一条带「全部优先处理」的中性提示；跑起来换成一条已知总量的 `TaskProgress`（Geist：任务进度用
 *  Progress，Gauge 留给比率与单次请求的不定档），与「正在读取作品资料」同一种条。离开页面就停在当前这部。 */
export function CoverQueue({ codes, scope, fetchOne, settled }: {
  /** 显示着、还在排队的番号。 */
  codes: string[];
  /** 提示里怎么称呼这一批：「本页」「这一行」。 */
  scope: string;
  /** 当场取一部，回取没取到；卡片自己的样子由它负责换。 */
  fetchOne(code: string): Promise<boolean>;
  settled?(got: number, total: number): void;
}) {
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const alive = useRef(false);
  useEffect(() => { alive.current = true; return () => { alive.current = false } }, []);
  if (!codes.length && !progress) return null;
  const run = async () => {
    const total = codes.length;
    setProgress({ done: 0, total });
    const got = await prioritiseCovers(codes, fetchOne, done => setProgress({ done, total }), () => alive.current);
    if (!alive.current) return;
    setProgress(null);
    settled?.(got, total);
  };
  if (progress) return <div data-cover-queue="running" className="min-w-0"><TaskProgress value={progress.done} total={progress.total}
    label={`正在取封面 · ${progress.done} / ${progress.total} 部。离开这一页会停在当前这部，没取的照旧排在后台`} /></div>;
  return <div data-cover-queue="idle" className="min-w-0">
    <Note tone="neutral" action={<Button size="small" variant="secondary" onClick={() => void run()}>全部优先处理</Button>}>
      {`${scope} ${codes.length} 部新作的封面还在排队，可以现在一起取，不用等后台的队。`}
    </Note>
  </div>;
}
