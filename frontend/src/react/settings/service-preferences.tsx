/* Peach 配置中的采集档位与来源更新偏好，读写复用设置接口和查询缓存。 */
import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { useQuery } from '@tanstack/react-query';

import { appSettingsStore } from '@peach/appearance';
import { SettingsRow } from '@/components/application/settings/settings-rows';
import { Select, SelectItem } from '@/components/base/select/select';
import { Switch } from '@/components/base/switch/switch';
import { Input } from '@/components/base/input/input';
import { Button } from '@/components/base/buttons/button';

import { FOLLOW_INITIAL_RANGE_OPTIONS } from '../../application/initial-follow-ranges';
import { errorMessage } from '../../api';
import { boundedPreference } from '../../number-setting';
import { momentText } from '../activity/tasks';
import { Note } from '../components/note';
import {
  FEED_SCHEDULE_KEY, FOLLOW_SCHEDULE_KEY, SCHEDULE_RUNS, SETTINGS_KEY, THUMBNAIL_JOBS_KEY, fetchFeedSchedule,
  fetchFollowSchedule, fetchSettings, fetchThumbnailJobs, schedulePollInterval, useRunSchedule,
  useSaveFollowSchedule, useSaveSettings, useSaveThumbnailMode, type FollowScheduleStatus,
} from '../settings-panel/settings-data';
import { ErrorText, Help, Rows, Section, Stack, TaskCenterLink } from './section';
import { busyProps } from './use-action';
import { ProcessingMode } from '../library-processing/processing-effort';

const THUMBNAIL_OPTIONS = [['off', '关闭'], ['precise', '每 10 秒一张'], ['coarse', '每 30 秒一张']] as const;

export function TaskSpeedSettings({ receipt }: { receipt(message: string): void }) {
  const settings = useQuery({ queryKey: SETTINGS_KEY, queryFn: ({ signal }) => fetchSettings(signal) });
  const save = useSaveSettings();
  const error = save.error || settings.error;
  return <Section title="后台任务">
    <Rows><SettingsRow label="默认处理速度" description="新任务使用此档位。运行中的任务可在活动页单独调整。">
      <ProcessingMode value={settings.data?.taskSpeedMode || 'standard'} busy={!settings.data || save.isPending}
        onChange={(mode) => save.mutate({ taskSpeedMode: mode }, { onSuccess: () => receipt('已保存默认处理速度') })} />
    </SettingsRow></Rows>
    {error ? <Stack divided><ErrorText>{errorMessage(error)}</ErrorText></Stack> : null}
  </Section>;
}

export function VideoThumbnailRow({ epoch = 0 }: { epoch?: number }) {
  return <Section guide="timeline" title="时间轴缩略图"><VideoThumbnailControls epoch={epoch} /></Section>;
}

export function VideoThumbnailControls({ epoch = 0, disabled = false }: { epoch?: number; disabled?: boolean }) {
  const status = useQuery({ queryKey: THUMBNAIL_JOBS_KEY, queryFn: ({ signal }) => fetchThumbnailJobs(signal), refetchOnMount: 'always' });
  const save = useSaveThumbnailMode();
  const reset = save.reset;
  useEffect(() => { reset() }, [epoch, reset]);
  const data = status.data;
  const error = save.error || status.error;
  return (
    <>
      <Rows>
        <SettingsRow label="时间轴预览" description="按所选间隔抽帧，仅处理本机磁盘上的视频。">
          <div id="videoThumbnailSetting">
            <Select aria-label="缩略图采集间隔" selectedKey={data?.mode || 'off'}
              isDisabled={disabled || !data || status.isFetching || save.isPending}
              onSelectionChange={(key) => { if (key !== null) save.mutate(String(key)) }}>
              {THUMBNAIL_OPTIONS.map(([key, label]) => <SelectItem key={key} id={key}>{label}</SelectItem>)}
            </Select>
          </div>
        </SettingsRow>
      </Rows>
      {save.isPending || data?.status === 'running'
        ? <Stack divided>
            <Help role="status">{save.isPending ? '正在保存…' : '正在采集。'}</Help>
            {save.isPending ? null : <TaskCenterLink />}
          </Stack>
        : null}
      {error ? <Stack divided><ErrorText>{errorMessage(error)}</ErrorText></Stack> : null}
    </>
  );
}

export function FollowPreferenceRows({ receipt }: { receipt(message: string): void }) {
  const store = appSettingsStore();
  useSyncExternalStore(store.subscribe, store.version);
  const settings = useQuery({ queryKey: SETTINGS_KEY, queryFn: ({ signal }) => fetchSettings(signal), refetchOnMount: 'always' });
  const initial = useSaveSettings();
  const initialDays = settings.data?.followInitialDays ?? store.value.followInitialDays;
  const error = initial.error || settings.error;
  return (
    <Section guide="follow-options" title="关注采集">
      <Rows>
        <FollowScheduleRow />
        <FeedScheduleRow />
        <SettingsRow label="首次采集范围" description="新关注的来源第一次回看多久以前的内容。">
          <div id="followInitialDaysSetting" className="shrink-0">
            <Select aria-label="首次采集范围" selectedKey={String(initialDays)}
              isDisabled={settings.isFetching || initial.isPending}
              onSelectionChange={(key) => {
                if (key === null) return;
                initial.mutate({ followInitialDays: Number(key) }, { onSuccess: (saved) => {
                  if (typeof saved.followInitialDays === 'number') store.value.followInitialDays = saved.followInitialDays;
                  store.save();
                  receipt('已保存首次采集范围');
                } });
              }}>
              {FOLLOW_INITIAL_RANGE_OPTIONS.map(([key, label]) => <SelectItem key={key} id={key}>{label}</SelectItem>)}
            </Select>
          </div>
        </SettingsRow>
        <SettingsRow label="头像刷新" description="重新获取关注创作者的头像。"><span className="shrink-0">每 3 个月</span></SettingsRow>
        <SettingsRow label="favicon 刷新" description="重新获取来源站点的图标。"><span className="shrink-0">每年</span></SettingsRow>
      </Rows>
      {error ? <Stack divided><ErrorText>{errorMessage(error)}</ErrorText></Stack> : null}
    </Section>
  );
}

function FollowScheduleRow() {
  const status = useQuery({ queryKey: FOLLOW_SCHEDULE_KEY, queryFn: ({ signal }) => fetchFollowSchedule(signal),
    refetchOnMount: 'always', refetchInterval: (query) => schedulePollInterval(query.state.data) });
  const save = useSaveFollowSchedule();
  const data = status.data;
  const remembered = useRef(boundedPreference(Number(localStorage.getItem('peach.number.followScheduleSetting')), 15, 10080, 60));
  const [draft, setDraft] = useState('60');
  const [invalid, setInvalid] = useState(false);
  useEffect(() => {
    if (data?.enabled) {
      remembered.current = data.interval_minutes;
      setDraft(String(data.interval_minutes));
    }
  }, [data]);
  const blocked = !data?.available || status.isFetching || save.isPending;
  const commit = () => {
    const minutes = Number(draft);
    if (!Number.isInteger(minutes) || minutes < 15 || minutes > 10080) { setInvalid(true); return }
    setInvalid(false);
    if (!data?.enabled || blocked || minutes === data.interval_minutes) return;
    remembered.current = minutes;
    localStorage.setItem('peach.number.followScheduleSetting', String(minutes));
    save.mutate(minutes);
  };
  const error = save.error || status.error;
  return (
    <>
      <SettingsRow label="自动检查更新" description="近 7 天有更新的来源按这个间隔检查，久未更新的逐级放慢，最长一天一次">
        {/* 间隔框只在开着时出现；这一行按有框的高度留位，读回状态时下面几行不跟着动。
            控件这一侧不收缩：窄屏上让左边的说明换行，不让开关与间隔框压到说明上。 */}
        <div id="followScheduleSetting" className="flex min-h-9 shrink-0 flex-wrap items-center justify-end gap-2">
          <Switch aria-label="自动检查更新" isSelected={data?.enabled === true} isDisabled={blocked}
            onChange={(on) => {
              localStorage.setItem('peach.number.followScheduleSetting', String(remembered.current));
              save.mutate(on ? remembered.current : 0);
            }} />
          {data?.enabled ? <div className="flex items-center gap-2">
            <Input type="number" inputMode="numeric" name="follow-interval" autoComplete="off"
              aria-label="自动检查间隔" className="w-21 sm:w-24"
              value={draft} onChange={(value) => { setDraft(value); setInvalid(false) }} onBlur={commit}
              onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); commit() } }}
              isDisabled={blocked} isInvalid={invalid} />
            <span className="text-body-2-regular text-text-secondary">分钟</span>
          </div> : null}
        </div>
      </SettingsRow>
      {invalid ? <Stack><ErrorText>请输入 15–10080 的整数（分钟）。</ErrorText></Stack> : null}
      {save.isPending || data?.running
        ? <Stack><Help role="status">{save.isPending ? '正在保存…' : '正在检查来源更新…'}</Help></Stack> : null}
      <ScheduleFailure kind="follow" status={data} title="上次自动检查失败" />
      {error ? <Stack><ErrorText>{errorMessage(error)}</ErrorText></Stack> : null}
    </>
  );
}

/* 订阅源定时拉取没有可调的档位，这一行只读出间隔与上一轮的失败。 */
function FeedScheduleRow() {
  const status = useQuery({ queryKey: FEED_SCHEDULE_KEY, queryFn: ({ signal }) => fetchFeedSchedule(signal),
    refetchOnMount: 'always', refetchInterval: (query) => schedulePollInterval(query.state.data) });
  const data = status.data;
  /* 首次读取时先占住这一行：读数回来再填字，下面的行不往下跳。 */
  if (!data) {
    return status.isPending ? <SettingsRow label="订阅源拉取">
      <span data-skeleton aria-busy="true" aria-label="正在读取订阅源拉取间隔"
        className="block h-4 w-16 rounded-2lg bg-background-tertiary-default" />
    </SettingsRow> : null;
  }
  const minutes = data.interval_minutes;
  const interval = minutes % 60 ? `每 ${minutes} 分钟` : `每 ${minutes / 60} 小时`;
  return (
    <>
      <SettingsRow label="订阅源拉取">
        <span id="feedScheduleSetting">{!data.available ? '只在写入端可用' : data.enabled ? interval : '已关闭'}</span>
      </SettingsRow>
      {data.running ? <Stack><Help role="status">正在拉取订阅源…</Help></Stack> : null}
      <ScheduleFailure kind="feed" status={data} title="上次自动拉取失败" />
    </>
  );
}

/* 每轮开始时服务端清空上一轮的原因，所以正在跑的那一轮不显示；下一轮成功同样清空。
   「立即重试」让调度自己提前跑一轮：手动检查不经过调度，跑完了这条原因也不会消失。 */
function ScheduleFailure({ kind, status, title }: {
  kind: keyof typeof SCHEDULE_RUNS; status: FollowScheduleStatus | undefined; title: string;
}) {
  const run = useRunSchedule(kind);
  if (!status?.enabled || status.running || !status.last_error) return null;
  const failures = status.consecutive_failures ?? 0;
  const next = momentText(status.next_run_at);
  const detail = [failures > 1 ? `已连续失败 ${failures} 次` : '', next ? `下一轮 ${next}` : '']
    .filter(Boolean).join('，');
  const reason = [status.last_error, detail, run.error ? `没有重试：${errorMessage(run.error)}` : '']
    .filter(Boolean).join('\n');
  return (
    <Stack>
      <Note tone="error" title={title} action={<Button variant="secondary" size="small"
        disabled={!status.available} {...busyProps(run.isPending)} onClick={() => run.mutate()}>立即重试</Button>}>
        {reason}
      </Note>
    </Stack>
  );
}
