/* 「账本备份」：立即备份当前账本，或从一份备份恢复（ADR-0138）。
 *
 * 列表里是两处备份目录里能恢复的全部备份，新的在前：手动备份与写入前的自动备份同一套保留规则。
 * 备份与恢复都是服务端的后台任务，进行中每 1.5 秒问一次状态，进度同时进任务中心。
 * 恢复会替换当前账本，确认框写清这一点；只读端只看列表，不能恢复。 */
import { useEffect, useRef, useState } from 'react';
import { confirmModal } from '@peach/legacy/ui';
import { fmtSize } from '@peach/legacy/core';

import { SettingsRow } from '@/components/application/settings/settings-rows';
import { Button } from '@/components/base/buttons/button';

import { apiGet, apiSend } from '../../api';
import { TaskProgress } from '../components/task-progress';
import { activityKind } from '../../activity-kinds';
import { ledgerBackupsSkeleton } from '../../configuration-skeleton';
import { ErrorText, Footer, Help, Rows, Section, SectionSkeleton, Stack, TaskCenterLink } from './section';
import { busyProps, useAction } from './use-action';
import { codedText, jobText, serverLabel, stageText } from '../../core/server-text';
import { pollUntil } from '../../polling';
import { interfaceLanguage, t } from '../../i18n';

export const LEDGER_BACKUPS_URL = '/api/configuration/ledger-backups';
const POLL_MS = 1500;
/** 一轮备份或恢复最多跟这么久；更久的看任务中心。 */
const POLL_LIMIT_MS = 60 * 60_000;

export interface LedgerBackup {
  id: string;
  name: string;
  bytes: number;
  modified_at: number;
  source: 'manual' | 'auto';
  purpose: string;
  /** 用途的 id，按它取译文；没有译文时显示 `purpose`。 */
  purpose_code?: string;
}

export interface LedgerBackupJob {
  status: 'idle' | 'running' | 'complete' | 'failed' | 'cancelled';
  stage?: string;
  stage_code?: string;
  done?: number;
  total?: number;
  error?: string;
  name?: string;
  saved?: string;
}

export interface LedgerBackupState {
  backups: LedgerBackup[];
  backup: LedgerBackupJob;
  restore: LedgerBackupJob;
  writer: boolean;
  writer_reason: string;
  last_restore: { state: 'interrupted' | 'failed'; outcome: string; message: string; finished_at: number } | null;
}

const when = (backup: LedgerBackup) => new Date(backup.modified_at * 1000).toLocaleString(interfaceLanguage);

function describe(backup: LedgerBackup) {
  return [backup.source === 'manual' ? t('settings:databaseBackups.manual') : t('settings:databaseBackups.automatic', { purpose: serverLabel(`ledgerBackup.purpose.${backup.purpose_code}`, backup.purpose) }), fmtSize(backup.bytes)].join(' · ');
}

/** 进行中的那一个任务：知道页数就画进度条，否则画写入动画；说明写当前那一步。 */
function Running({ job, task, label }: { job: LedgerBackupJob; task: 'ledger-backup' | 'ledger-restore'; label: string }) {
  return (
    <div aria-live="polite" className="flex flex-col gap-2">
      <TaskProgress embedded kind={activityKind(task, job.stage_code)} label={[label, stageText(job)].filter(Boolean).join(' · ')} value={job.done || 0} total={job.total} />
      <TaskCenterLink />
    </div>
  );
}

export function LedgerBackupSettings({ receipt }: { receipt(message: string): void }) {
  const [state, setState] = useState<LedgerBackupState | null>(null);
  const [loadError, setLoadError] = useState('');
  const action = useAction();
  const backingUp = state?.backup.status === 'running';
  const restoring = state?.restore.status === 'running';
  const running = backingUp || restoring;
  const reported = useRef({ backup: false, restore: false });

  useEffect(() => {
    const controller = new AbortController();
    apiGet<LedgerBackupState>(LEDGER_BACKUPS_URL, controller.signal)
      .then(setState, (cause) => { if (!controller.signal.aborted) setLoadError(String(cause?.message || cause)); });
    return () => controller.abort();
  }, []);

  /* 有一轮在跑时 1.5 秒读一次，读失败退避，页面不可见时暂停，跑满上限就停。 */
  useEffect(() => {
    if (!running) return;
    const controller = new AbortController();
    void pollUntil({
      signal: controller.signal, everyMs: POLL_MS, limitMs: POLL_LIMIT_MS,
      read: (signal) => apiGet<LedgerBackupState>(LEDGER_BACKUPS_URL, signal),
      apply: setState,
      done: (next) => next.backup.status !== 'running' && next.restore.status !== 'running',
    });
    return () => controller.abort();
  }, [running]);

  // 一轮结束：成功的回执走 Toast，失败的原因留在分区里。只报这一页上看着开始的那一轮。
  useEffect(() => {
    if (!state) return;
    for (const key of ['backup', 'restore'] as const) {
      const job = state[key];
      if (job.status === 'running') { reported.current[key] = true; continue; }
      if (!reported.current[key]) continue;
      reported.current[key] = false;
      if (job.status !== 'complete') continue;
      receipt(key === 'backup'
        ? t('settings:databaseBackups.backedUp', { name: job.name })
        : t('settings:databaseBackups.restored', { name: job.saved }));
    }
  }, [state]);

  /* 首次读取：骨架按最终结构占住说明、备份行与底栏。 */
  if (!state && !loadError) return <SectionSkeleton label={t('settings:databaseBackups.loading')} html={ledgerBackupsSkeleton} />;
  if (!state) {
    return (
      <Section id="ledgerBackups" guide="ledger-backups" title={t('settings:databaseBackups.title')}>
        <Stack><ErrorText>{loadError}</ErrorText></Stack>
      </Section>
    );
  }

  const backup = () => void action.run('backup', (signal) =>
    apiSend<LedgerBackupState>(`${LEDGER_BACKUPS_URL}/backup`, {}, 'POST', signal), setState);

  const restore = (item: LedgerBackup) => void confirmModal({
    title: t('settings:databaseBackups.restoreTitle'),
    danger: true,
    body: t('settings:databaseBackups.restoreBody', { time: when(item), details: describe(item) }),
    confirmLabel: t('settings:databaseBackups.replaceCurrent'),
    onConfirm: async () => {
      reported.current.restore = true;
      setState(await apiSend<LedgerBackupState>(`${LEDGER_BACKUPS_URL}/restore`, { id: item.id, confirm: true }));
    },
  });

  const failed = [state.backup, state.restore].find((job) => job.status === 'failed');
  const last = state.last_restore;
  const status = backingUp ? t('settings:databaseBackups.backingUp') : restoring ? t('settings:databaseBackups.restoring')
    : state.backups.length ? t('settings:databaseBackups.count', { count: state.backups.length }) : t('settings:databaseBackups.empty');
  return (
    <Section id="ledgerBackups" guide="ledger-backups" title={t('settings:databaseBackups.title')}>
      <Stack>
        <Help>{t('settings:databaseBackups.help')}</Help>
        {!state.writer ? <Help>{t('settings:databaseBackups.notPrimary')}{codedText(state, 'writer_reason')}</Help> : null}
        {backingUp ? <Running job={state.backup} task="ledger-backup" label={t('settings:databaseBackups.backupProgress')} /> : null}
        {restoring ? <Running job={state.restore} task="ledger-restore" label={t('settings:databaseBackups.restoreProgress')} /> : null}
        {failed ? <ErrorText>{jobText(failed, 'error') || t('settings:databaseBackups.jobIncomplete')}</ErrorText> : null}
        {last ? (last.outcome === 'kept' || last.outcome === 'completed'
          ? <Help>{codedText(last, 'message')}</Help> : <ErrorText>{codedText(last, 'message')}</ErrorText>) : null}
        {action.error ? <ErrorText>{action.error}</ErrorText> : null}
      </Stack>
      {state.backups.length
        ? <div className="border-t border-separator-border" data-ledger-backups="">
            <Rows>
              {state.backups.map((item) => (
                <SettingsRow key={item.id} label={when(item)} description={describe(item)}>
                  <Button variant="secondary" disabled={!state.writer || running}
                    onClick={() => restore(item)}>{t('settings:databaseBackups.restore')}</Button>
                </SettingsRow>
              ))}
            </Rows>
          </div>
        : null}
      <Footer status={<p>{status}</p>}>
        <Button disabled={running} onClick={backup}
          {...busyProps(action.busy === 'backup' || backingUp)}>{t('settings:databaseBackups.backUpNow')}</Button>
      </Footer>
    </Section>
  );
}
