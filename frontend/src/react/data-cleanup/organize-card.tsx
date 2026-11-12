/* 数据管理页上的「整理」（ADR-0039）：选来源、填两份模板、预览、执行，外加整批回滚。
 *
 * 预览是一次同步请求，结果只活在这张卡上；执行与回滚是同一趟后台任务，快照摊在
 * `/api/organize` 的顶层，所以 `useBackgroundJob` 用 `withJob` 只换任务那几格，来源、模板
 * 与上一批原样留着。执行与回滚动的是真实文件名与数据库路径，都要先过确认弹层。 */
import { useLayoutEffect, useRef, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { confirmModal, MEDIA_SOURCE_ICONS } from '@peach/legacy/ui';
import { LOC } from '@peach/legacy/core';

import { Button } from '@/components/base/buttons/button';
import { IconButton } from '@/components/base/buttons/icon-button';
import { Input } from '@/components/base/input/input';
import { Select, SelectItem } from '../components/select';

import { errorMessage } from '../../api';
import { ORGANIZE_PARAMETER_HINT, ORGANIZE_SCOPE_HINT, ORGANIZE_TEXT } from '../../cleanup-tool-skeletons';
import { useBackgroundJob } from '../background-job';
import { Fieldset, FieldsetTitle } from '../components/fieldset';
import { Note } from '../components/note';
import { TaskProgress } from '../components/task-progress';
import { queryClient } from '../query';
import { SourceMark } from '../settings/section';
import { FolderSearchIcon } from '../settings/folder-rows';
import { busyProps } from '../settings/use-action';
import {
  baseName, DIRECTORY_TEMPLATE_ERROR, fetchOrganize, fetchOrganizeExample, ORGANIZE_KEY, organizeOutcome, planSummary,
  pickOrganizeFolder, previewOrganize, rememberTemplates, startOrganize, withOrganizeJob,
  type OrganizeCommand, type OrganizeData, type OrganizeJob, type OrganizePlan,
} from './organize';
import { t } from '../../i18n';

const APPLY_BODY = (name: string, path: string) => (path
  ? t('cleanup:organize.applyBodyPath', { name, path })
  : t('cleanup:organize.applyBodyAll', { name }));
const ROLLBACK_BODY = t('cleanup:organize.rollbackBody');
/** 预览只列前 8 行：这里是给人扫一眼方向对不对，完整计划在 CSV 里。 */
const PLAN_ROWS = 8;

function PlanRows({ plan }: { plan: OrganizePlan }) {
  return (
    <>
      <ol className="mt-2 flex min-w-0 flex-col gap-1">
        {plan.rows.slice(0, PLAN_ROWS).map((row) => (
          <li key={row.current_path}
            className="flex min-w-0 items-center gap-2 text-caption-1-regular text-text-secondary">
            <span data-middle-truncate title={row.current_path} className="min-w-0 truncate">{baseName(row.current_path)}</span>
            <span aria-hidden>→</span>
            <span data-middle-truncate title={row.target_path} className="min-w-0 truncate text-text-primary">{baseName(row.target_path)}</span>
          </li>
        ))}
      </ol>
      {plan.truncated || plan.rows.length > PLAN_ROWS
        ? <p className="text-caption-1-regular text-text-secondary">{t('cleanup:organize.planTruncated')}</p>
        : null}
    </>
  );
}

export function OrganizeCard(
  { toast, failure }: { toast(message: string): void; failure(action: string, error: unknown): void },
) {
  const organize = useQuery({ queryKey: ORGANIZE_KEY, queryFn: ({ signal }) => fetchOrganize(signal) });
  const data = organize.data;
  const locations = data?.locations ?? [];
  const [chosen, setChosen] = useState('');
  const location = locations.some((row) => row.location === chosen) ? chosen : locations[0]?.location ?? '';
  const stored = data?.templates?.[location];
  /* 两个框在人动过之前跟着存下的模板走：换来源就换成那个来源上次用的那两行。 */
  const [draft, setDraft] = useState<{ location: string; file: string; dir: string } | null>(null);
  const fields = draft?.location === location ? draft : { location, file: stored?.file ?? '', dir: stored?.dir ?? '' };
  const edit = (patch: Partial<{ file: string; dir: string }>) => { setDraft({ ...fields, ...patch }); preview.reset() };
  const [scope, setScope] = useState({ location: '', path: '' });
  const path = scope.location === location ? scope.path : '';
  const scopeRef = useRef({ location, path });
  scopeRef.current = { location, path };
  const [invalid, setInvalid] = useState<'file' | 'dir' | 'path' | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const dirInput = useRef<HTMLInputElement>(null);
  const pathInput = useRef<HTMLInputElement>(null);
  const example = useQuery({
    queryKey: ['organize-example', fields.file, fields.dir],
    queryFn: ({ signal }) => fetchOrganizeExample(fields.file, fields.dir, signal),
    enabled: Boolean(data),
  });
  const [target, setTarget] = useState<'file' | 'dir'>('file');
  const focused = useRef(false);
  const insertion = useRef<{ field: 'file' | 'dir'; caret: number } | null>(null);
  useLayoutEffect(() => {
    const next = insertion.current;
    if (!next) return;
    insertion.current = null;
    const input = (next.field === 'file' ? fileInput : dirInput).current;
    input?.focus();
    input?.setSelectionRange(next.caret, next.caret);
  });

  const request = () => ({ location, path: path.trim(), file_template: fields.file.trim(), dir_template: fields.dir.trim() });
  const preview = useMutation({
    mutationFn: previewOrganize,
    /* 模板不合法时错误就出在两个框里的一个，所以除了说原因还要指出是哪一格。 */
    onError: (cause) => {
      const target = /整理路径/.test(errorMessage(cause)) ? 'path'
        : DIRECTORY_TEMPLATE_ERROR.test(errorMessage(cause)) ? 'dir' : 'file';
      setInvalid(target);
      (target === 'path' ? pathInput : target === 'dir' ? dirInput : fileInput).current?.focus();
    },
  });
  const picker = useMutation({
    mutationFn: ({ initial }: { initial: string; location: string; path: string }) => pickOrganizeFolder(initial),
    onSuccess: (picked, sent) => {
      if (!picked.path || sent.location !== scopeRef.current.location || sent.path !== scopeRef.current.path) return;
      setScope({ location: sent.location, path: picked.path });
      setInvalid(null); preview.reset();
      pathInput.current?.focus();
    },
  });
  const job = useBackgroundJob<OrganizeJob, OrganizeCommand, OrganizeData>({
    queryKey: ORGANIZE_KEY,
    queryFn: ({ signal }) => fetchOrganize(signal),
    start: startOrganize,
    jobOf: (current) => current,
    withJob: withOrganizeJob,
    onStarted: () => preview.reset(),
    onFinish: (finished) => {
      /* 上一批跟着这一趟变了：执行多出一批，回滚退掉一批。重读一次拿到新的 `last_batch`。 */
      void queryClient.invalidateQueries({ queryKey: ORGANIZE_KEY, exact: true });
      if (finished.status !== 'complete') return;
      const { text, failed } = organizeOutcome(finished);
      if (failed) failure(t('cleanup:tools.organize'), new Error(t('cleanup:organize.rowsFailed', { count: failed })));
      else toast(text.replace(/。$/, ''));
    },
  });

  const running = job.running || job.start.isPending;
  const previewMatches = JSON.stringify(preview.variables) === JSON.stringify(request());
  const plan = previewMatches ? preview.data : undefined;
  const changes = Number(plan?.counts?.change || 0);
  const name = LOC[location] || location;
  const changeTemplates = (patch: Partial<{ file: string; dir: string }>) => {
    edit(patch); setInvalid(null); preview.reset();
  };
  const insertParameter = (key: string) => {
    const input = (target === 'file' ? fileInput : dirInput).current;
    const value = fields[target];
    const start = focused.current ? input?.selectionStart ?? value.length : value.length;
    const end = focused.current ? input?.selectionEnd ?? start : start;
    const token = `{${key}}`;
    insertion.current = { field: target, caret: start + token.length };
    changeTemplates({ [target]: value.slice(0, start) + token + value.slice(end) });
  };

  const runPreview = () => {
    if (preview.isPending || running || !location) return;
    job.dismiss(); job.start.reset();
    setInvalid(null);
    preview.mutate(request());
  };
  const runApply = () => {
    const sent = preview.variables;
    if (!sent || !plan || !changes) return;
    void confirmModal({
      title: t('cleanup:tools.organize'), body: APPLY_BODY(name, sent.path), confirmLabel: t('cleanup:tools.organize'),
      /* 确认执行时保存该来源的模板。 */
      onConfirm: async () => {
        await job.start.mutateAsync({ kind: 'apply', request: sent });
        void rememberTemplates({
          ...(data?.templates ?? {}), [sent.location]: { file: sent.file_template, dir: sent.dir_template },
        });
      },
    });
  };
  const runRollback = () => void confirmModal({
    title: t('cleanup:organize.rollbackTitle'), body: ROLLBACK_BODY, confirmLabel: t('cleanup:organize.rollbackConfirm'),
    onConfirm: () => job.start.mutateAsync({ kind: 'rollback' }),
  });

  /* 这张卡上的结论只有一句：跑着的那一趟、这次跟完的那一趟、刚出的预览，按新旧取最新。 */
  let state = null;
  const applicable = !!changes && !running && !job.outcome;
  const current = job.job;
  const outcome = job.outcome;
  if (current?.status === 'running') {
    const line = current.message || current.stage || t('cleanup:organize.running');
    state = <TaskProgress embedded label={line} value={Math.min(current.checked || 0, current.total || 0)} total={current.total} />;
  } else if (outcome?.status === 'failed') {
    state = <Note tone="error" title={t('cleanup:organize.incomplete')}>{outcome.error || t('cleanup:shared.checkTaskLogFiles')}</Note>;
  } else if (outcome) {
    const { text, failed } = organizeOutcome(outcome);
    state = <Note tone={failed ? 'warning' : 'success'} title={failed ? t('cleanup:shared.partiallyCompleted') : t('cleanup:organize.result')}>{text}</Note>;
  } else if (job.start.isError) {
    state = <Note tone="error" title={t('cleanup:organize.failed')}>{errorMessage(job.start.error)}</Note>;
  } else if (preview.isPending) {
    state = <TaskProgress embedded label={t('cleanup:organize.checkingPlan')} />;
  } else if (preview.isError && previewMatches) {
    state = <Note tone="error" title={t('cleanup:organize.previewFailed')}>{errorMessage(preview.error)}</Note>;
  } else if (plan) {
    state = <><Note tone="neutral" title={t('cleanup:organize.previewResult')}>{planSummary(plan)}</Note>{changes ? <PlanRows plan={plan} /> : null}</>;
  }

  return (
    <Fieldset layout="stack" id="organize" labelledBy="cleanup-organize-title"
      attributes={{ 'data-cleanup-organize': '' }}
      footer={
        <>
          {data?.last_batch
            ? <Button variant="secondary" {...busyProps(running)} onClick={runRollback}>{t('cleanup:organize.rollbackLastBatch')}</Button>
            : null}
          <Button variant={applicable ? 'secondary' : 'primary'} disabled={!locations.length || running}
            {...busyProps(preview.isPending)} onClick={runPreview}>{t('cleanup:organize.preview')}</Button>
          {applicable ? <Button variant="primary" onClick={runApply}>{t('cleanup:organize.apply')}</Button> : null}
        </>
      }>
      <FieldsetTitle id="cleanup-organize-title" gap="medium">{t('cleanup:organize.title')}</FieldsetTitle>
      <p className="text-body-regular text-text-secondary">
        {ORGANIZE_TEXT}
      </p>
      {organize.isError
        ? <div className="mt-3"><Note tone="error" title={t('cleanup:organize.settingsLoadFailed')}>{errorMessage(organize.error)}</Note></div>
        : null}
      <div className="mt-3 flex flex-col gap-3">
        <div data-organize-scope className="flex min-w-0 flex-wrap items-start gap-2">
        {locations.length
          ? <Select aria-label={t('cleanup:organize.storageLabel')} prefix={t('cleanup:organize.storagePrefix')} className="w-fit min-w-25" selectedKey={location || null}
              onSelectionChange={(key) => {
                if (key === null) return;
                setChosen(String(key)); setScope({ location: String(key), path: '' });
                setInvalid(null); preview.reset(); picker.reset(); focused.current = false;
              }}>
              {locations.map((row) => (
                <SelectItem key={row.location} id={row.location} textValue={LOC[row.location] || row.location}>
                  <SourceMark mark={MEDIA_SOURCE_ICONS[row.location] || 'database'} />{LOC[row.location] || row.location}
                </SelectItem>
              ))}
            </Select>
          : null}
          <div className="flex min-w-0 basis-64 flex-1 items-start gap-2">
            <Input aria-label={t('cleanup:organize.pathLabel')} className="min-w-0 flex-1" placeholder={t('cleanup:organize.pathPlaceholder')}
              name="organize-path" autoComplete="off" spellCheck="false" value={path} ref={pathInput}
              isInvalid={invalid === 'path'}
              onChange={(value) => { setScope({ location, path: value }); setInvalid(null); preview.reset(); picker.reset() }} />
            <IconButton icon={FolderSearchIcon} aria-label={t('cleanup:organize.choosePath')} {...busyProps(picker.isPending)}
              onClick={() => picker.mutate({ initial: path || locations.find((row) => row.location === location)?.roots[0] || '', location, path })} />
          </div>
        </div>
        <p className="text-caption-1-regular text-text-secondary">{ORGANIZE_SCOPE_HINT}</p>
        {picker.isError ? <Note tone="error" title={t('cleanup:organize.pickerFailed')}>{errorMessage(picker.error)}{t('cleanup:organize.pickerFallback')}</Note> : null}
        <Input label={t('cleanup:organize.fileTemplate')} placeholder="{code}[ {title}]" value={fields.file} ref={fileInput}
          spellCheck="false" isInvalid={invalid === 'file'}
          onFocus={() => { setTarget('file'); focused.current = true }}
          onChange={(value) => changeTemplates({ file: value })} />
        <Input label={t('cleanup:organize.dirTemplate')} placeholder={t('cleanup:organize.dirTemplatePlaceholder')} value={fields.dir} ref={dirInput}
          spellCheck="false" isInvalid={invalid === 'dir'}
          onFocus={() => { setTarget('dir'); focused.current = true }}
          onChange={(value) => changeTemplates({ dir: value })} />
        {data?.presets?.length
          ? <div className="flex flex-col gap-2" role="group" aria-label={t('cleanup:organize.applyPreset')}>
              <p className="text-caption-1-medium text-text-secondary">{t('cleanup:organize.applyPreset')}</p>
              <div className="flex flex-wrap gap-2">
              {data.presets.map((preset) => (
                <Button key={preset.label} variant="secondary" size="small" title={preset.example || preset.label}
                  className="max-w-full [&>span]:min-w-0 [&>span]:shrink"
                  onClick={() => { changeTemplates({ file: preset.file, dir: preset.dir }); focused.current = false }}>
                  <span className="truncate">{preset.label}</span>
                </Button>
              ))}
              </div>
            </div>
          : null}
        <p aria-live="polite" aria-busy={example.isFetching} data-organize-example=""
          className="text-caption-1-regular text-text-secondary">
          {t('cleanup:organize.examplePath')}<code className="wrap-anywhere">{example.data?.example || example.data?.error
            || (example.isError ? errorMessage(example.error) : t('cleanup:organize.previewLoading'))}</code>
        </p>
        {data?.placeholders?.length ? <div className="flex flex-col gap-2" role="group" aria-label={t('cleanup:organize.insertParameter')}>
          <p className="text-caption-1-regular text-text-secondary" aria-live="polite">
            <strong className="text-caption-1-semibold text-text-primary">{t('cleanup:organize.insertParameter')}</strong>{t('cleanup:organize.insertTarget', { target: target === 'file' ? t('cleanup:organize.fileTemplate') : t('cleanup:organize.dirTemplate') })}
          </p>
          <div className="flex flex-wrap gap-1">
            {data.placeholders.map((item) => <Button key={item.key} variant="ghost" size="small"
              aria-label={`${item.label} {${item.key}}`} onClick={() => insertParameter(item.key)}>
              <span className="inline-flex flex-wrap items-center gap-x-1.5">
                <code>{`{${item.key}}`}</code><span className="text-text-secondary">{item.label}</span>
              </span>
            </Button>)}
          </div>
        </div> : null}
        <p className="text-caption-1-regular leading-4.5 text-text-secondary">
          {ORGANIZE_PARAMETER_HINT}
        </p>
      </div>
      <div aria-live="polite" className="mt-3 flex flex-col gap-2 empty:hidden">{state}</div>
    </Fieldset>
  );
}
