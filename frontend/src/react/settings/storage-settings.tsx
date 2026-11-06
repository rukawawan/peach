/* 「存储空间」：数据目录在哪、所在磁盘还剩多少、各类数据各占多少，清理可重建的几类，
 * 或把整个数据目录迁到别的磁盘。
 *
 * 统计结果单独圈在一块面里：上面两张图（各类占比、磁盘占用），下面逐类一行。能清理的那几类
 * 行首有勾选框，勾几类一起清，或者「全部清理」；不能清理的勾选框禁用，行里写明为什么。
 *
 * 统计与清理在服务端后台线程里跑，进行中每 1.5 秒问一次状态。统计时按上次的文件数估进度，
 * 没统计过就只报走过多少文件。迁移请求被接受后服务会退出，
 * 页面只留一句回执：托盘完成迁移后会自己重新打开 Peach。 */
import { useEffect, useRef, useState } from 'react';
import { confirmModal } from '@peach/legacy/ui';
import { fmtSize } from '@peach/legacy/core';

import { Button } from '@/components/base/buttons/button';
import { Checkbox } from '@/components/base/checkbox/checkbox';

import { ApiError, apiGet, apiSend, errorMessage } from '../../api';
import { PICK_FOLDER_URL } from '../../configuration-endpoints';
import type { StorageCategory, StorageState } from '../bundle';
import { AnimatedNumber } from '../components/animated-number';
import { cardClass } from '../components/card';
import { LoadingDots } from '../components/loading-dots';
import { PathLine } from '../components/path-line';
import { Progress } from '../components/progress';
import { CommandSteps, ErrorText, Fact, FactList, Footer, Help, Stack, Section } from './section';
import { CATEGORY_SWATCH, REST_SWATCH, StorageOverview } from './storage-charts';
import { busyProps, useAction } from './use-action';

const STORAGE_URL = '/api/configuration/storage';
const POLL_MS = 1500;
/** 迁移完成的回执留一天；之后只在还有要处理的事（备注）时显示。 */
const RESULT_MS = 24 * 3600 * 1000;

const targetReason = (cause: unknown) =>
  (cause instanceof ApiError && (cause.body as { errors?: { target?: string } } | null)?.errors?.target)
  || errorMessage(cause);

function diskLine(storage: StorageState) {
  if (storage.free_bytes === null || storage.total_bytes === null) return '未取得';
  const line = `${fmtSize(storage.free_bytes)} 可用，共 ${fmtSize(storage.total_bytes)}`;
  return storage.system_drive ? `${line}（系统盘）` : line;
}

const cleanable = (category: StorageCategory) => category.cleanable && category.reclaimable > 0;

/** 统计进行中：知道上次有多少文件就画进度条，不知道就只说走过多少。 */
function Measuring({ job }: { job: StorageState['job'] }) {
  const files = job.files || 0;
  const expected = job.expected_files || 0;
  const reading = <>已统计 <AnimatedNumber value={files} /> 个文件 · <AnimatedNumber value={job.bytes || 0} format={fmtSize} /></>;
  return (
    <div aria-live="polite" className="flex flex-col gap-2">
      {expected
        ? <>
            {/* 文件比上次多时进度条停在 99%，等结果出来。 */}
            <Progress label="统计进度" value={Math.min(files, expected * 0.99)} max={expected} />
            <Help>{reading}，上次共 {expected.toLocaleString()} 个</Help>
          </>
        : <LoadingDots label="正在统计占用空间" />}
      {!expected ? <Help>{reading}</Help> : null}
    </div>
  );
}

/** 一类数据一行：勾选框、色块、名字与说明、大小。不能清理的勾选框禁用，说明里写原因。 */
function CategoryRow(
  { category, selected, disabled, onToggle }:
  { category: StorageCategory; selected: boolean; disabled: boolean; onToggle(next: boolean): void },
) {
  const able = cleanable(category);
  const reason = category.cleanable
    ? category.reclaimable > 0 ? `清理后${category.note}` : '没有可以清理的文件'
    : `不能清理：${category.note}`;
  return (
    <div data-category={category.key}
      className="flex min-h-13 w-full items-start gap-3 border-b border-separator-border py-2.5 pr-3 last:border-b-0">
      <Checkbox aria-label={`清理${category.label}`} isSelected={selected} isDisabled={!able || disabled}
        onChange={onToggle} className="mt-0.5" />
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <p className="flex items-center gap-2 text-body-regular text-text-primary">
          <i aria-hidden className={`size-2.5 shrink-0 rounded-xs ${CATEGORY_SWATCH[category.key] || REST_SWATCH}`} />
          {category.label}
        </p>
        <p className="text-body-2-regular text-text-secondary">{category.description}</p>
        <p className="text-caption-1-regular text-text-tertiary">{reason}</p>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-0.5 text-right">
        <AnimatedNumber value={category.bytes} format={fmtSize} className="text-body-regular text-text-primary" />
        {able ? <span className="text-caption-1-regular text-text-secondary">可释放 {fmtSize(category.reclaimable)}</span> : null}
      </div>
    </div>
  );
}

export function StorageSettings({ initial, receipt }: { initial: StorageState; receipt(message: string): void }) {
  const [storage, setStorage] = useState(initial);
  const [accepted, setAccepted] = useState('');
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const action = useAction();
  const running = storage.job.state !== 'idle';
  const reported = useRef(running);

  useEffect(() => {
    if (!running) return;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      apiGet<StorageState>(STORAGE_URL, controller.signal).then(setStorage, () => {
        if (!controller.signal.aborted) setStorage((current) => ({ ...current }));
      });
    }, POLL_MS);
    return () => { controller.abort(); clearTimeout(timer); };
  }, [storage]);

  // 一轮统计或清理结束：成功的回执走 Toast，失败的原因留在分区里；清掉的类别不再勾着。
  useEffect(() => {
    if (running) { reported.current = true; return; }
    if (!reported.current) return;
    reported.current = false;
    setPicked(new Set());
    if (!storage.job.error) receipt(storage.job.message || '已统计占用空间');
  }, [running]);

  const measure = () => void action.run('measure', (signal) =>
    apiSend<StorageState>(`${STORAGE_URL}/measure`, {}, 'POST', signal), setStorage);

  const usage = storage.usage;
  const available = usage?.categories.filter(cleanable) ?? [];
  const chosen = available.filter((category) => picked.has(category.key));

  const clean = (targets: StorageCategory[], title: string) => {
    if (!targets.length) return;
    const total = targets.reduce((sum, category) => sum + category.reclaimable, 0);
    void confirmModal({
      title,
      body: `将删除 ${fmtSize(total)}：${targets.map((category) =>
        `${category.label} ${fmtSize(category.reclaimable)}（清理后${category.note}）`).join('；')}。`,
      confirmLabel: `清理 ${fmtSize(total)}`,
      danger: targets.some((category) => category.key === 'backups'),
      onConfirm: async () => setStorage(await apiSend<StorageState>(`${STORAGE_URL}/clean`,
        { categories: targets.map((category) => category.key) })),
    });
  };

  const relocate = () => void action.run('relocate', async (signal) => {
    const target = (await apiSend<{ path: string | null }>(PICK_FOLDER_URL, { initial: storage.data_root }, 'POST', signal)).path;
    if (!target) return;
    const size = storage.usage ? fmtSize(storage.usage.total_bytes) : '';
    await confirmModal({
      title: '迁移数据目录',
      body: `将 ${size} 数据从 ${storage.data_root} 移到 ${target}。迁移期间 Peach 会退出，完成后自动重新打开；原位置的数据在新位置核对无误后删除。`,
      confirmLabel: '迁移数据目录',
      onConfirm: async () => {
        try {
          setAccepted((await apiSend<{ message: string }>(`${STORAGE_URL}/relocate`, { target })).message);
        } catch (cause) {
          throw new Error(targetReason(cause));
        }
      },
    });
  }, () => undefined);

  const last = storage.relocation.last;
  const recent = last && (last.state === 'error' || (last.notes?.length ?? 0) > 0
    || Date.now() - last.finished_at * 1000 < RESULT_MS);
  const cleaningLabel = usage?.categories.find((category) => category.key === storage.job.category)?.label;
  const status = accepted
    || (storage.job.state === 'cleaning' ? `正在清理${cleaningLabel || ''}…`
      : storage.job.state === 'measuring' ? '正在统计占用空间…'
        : chosen.length ? `已选 ${chosen.length} 类，可释放 ${fmtSize(chosen.reduce((sum, item) => sum + item.reclaimable, 0))}`
          : usage ? `统计于 ${new Date(usage.measured_at * 1000).toLocaleString()}` : '');
  const locked = running || Boolean(accepted);
  const toggle = (key: string) => (next: boolean) => setPicked((current) => {
    const copy = new Set(current);
    if (next) copy.add(key); else copy.delete(key);
    return copy;
  });
  return (
    <Section id="storageSettings" guide="storage" title="存储空间">
      <FactList>
        <Fact term="数据目录">
          <PathLine path={storage.data_root} className="text-body-regular text-text-primary" onRevealed={receipt} />
        </Fact>
        <Fact term="所在磁盘">{diskLine(storage)}</Fact>
      </FactList>
      <Stack divided>
        {storage.job.state === 'measuring' ? <Measuring job={storage.job} /> : null}
        {usage
          ? <div data-storage-result="" className={cardClass({ variant: 'outlined', padding: 'none', className: 'flex flex-col' })}>
              <div className="border-b border-separator-border p-4"><StorageOverview storage={storage} /></div>
              <div className="flex flex-col pl-4">
                {usage.categories.map((category) => (
                  <CategoryRow key={category.key} category={category} selected={picked.has(category.key)}
                    disabled={locked} onToggle={toggle(category.key)} />
                ))}
              </div>
            </div>
          : storage.job.state === 'measuring' ? null
            : <Help>统计后显示各类数据的占用，并可清理缓存与旧备份。</Help>}
        {!storage.relocation.available ? <Help>{storage.relocation.message}</Help> : null}
        {/* 设置页迁移不了的部署（容器）：宿主机上该做的几步，每步一句说明加一条可照抄的命令。 */}
        {!storage.relocation.available && storage.relocation.steps?.length
          ? <CommandSteps label="在宿主机上迁移" steps={storage.relocation.steps} />
          : null}
        {storage.job.error ? <ErrorText>{storage.job.message}</ErrorText> : null}
        {action.error ? <ErrorText>{action.error}</ErrorText> : null}
        {recent && last ? (last.state === 'error'
          ? <ErrorText>{last.message}</ErrorText>
          : <Help>{[last.message, ...(last.notes ?? [])].join('；')}</Help>) : null}
      </Stack>
      <Footer status={status ? <p role={accepted ? 'status' : undefined}>{status}</p> : null}>
        {usage ? <>
          <Button variant="secondary" disabled={locked || !chosen.length}
            {...busyProps(storage.job.state === 'cleaning' && chosen.length > 0)}
            onClick={() => clean(chosen, '清理所选数据')}>清理所选</Button>
          <Button variant="secondary" disabled={locked || !available.length}
            onClick={() => clean(available, '清理全部可清理的数据')}>全部清理</Button>
        </> : null}
        <Button variant="secondary" disabled={locked || !storage.relocation.available || !usage}
          onClick={relocate} {...busyProps(action.busy === 'relocate')}>更改位置</Button>
        <Button disabled={Boolean(accepted) || storage.job.state === 'cleaning'} onClick={measure}
          {...busyProps(action.busy === 'measure' || storage.job.state === 'measuring')}>
          {usage ? '重新统计' : '统计占用'}
        </Button>
      </Footer>
    </Section>
  );
}
