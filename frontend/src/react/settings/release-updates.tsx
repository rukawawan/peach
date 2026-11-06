/* 检查更新：当前与最新版本、下载安装进度，准备好之后确认重启。
 *
 * 更新任务进行中每秒问一次状态，空闲时 30 秒一次；连续 120 次问不到就停下并说明原因。
 * Docker 镜像配好 Watchtower 时给「一键更新」，没配好时列出宿主机上的两步命令。 */
import { useEffect, useRef, useState } from 'react';
import { confirmModal } from '@peach/legacy/ui';

import { Button, ButtonLink } from '@/components/base/buttons/button';

import { apiGet, apiSend, errorMessage } from '../../api';
import type { ReleaseState, UpdateJob } from '../bundle';
import { Note } from '../components/note';
import { Progress } from '../components/progress';
import { StatusLabel } from '../components/status-label';
import { DockerUpdateProgress, useDockerUpdate } from './docker-update';
import { CommandSteps, ErrorText, ExternalLink, Fact, FactList, Footer, Help, Section, Stack } from './section';
import { busyProps, useAction } from './use-action';

const ACTIVE = new Set(['downloading', 'verifying', 'extracting', 'preparing', 'restarting', 'installing']);
const STOPS = [65, 75, 90];
const MAX_FAILURES = 120;
/** 服务端没给发布页时的去处；检查到新版本后服务端给的是那一版自己的发布页。 */
const RELEASES_URL = 'https://github.com/peach-mitao/peach/releases';

export function ReleaseUpdates({ initial, initialJob }: { initial: ReleaseState; initialJob?: UpdateJob | undefined }) {
  const [data, setData] = useState(initial);
  const [job, setJob] = useState<UpdateJob>(initialJob || { state: 'idle', progress: 0 });
  const [pollError, setPollError] = useState('');
  const action = useAction();
  const prompted = useRef(false);
  const mounted = useRef(true);
  const running = ACTIVE.has(job.state);
  const container = useDockerUpdate(initial.current_version);
  const oneClick = data.state === 'available' && !!data.one_click?.available;
  const rebuilding = container.job.state === 'updating';
  const confirmDockerUpdate = () => void confirmModal({
    title: '一键更新', body: `Watchtower 会拉取 Peach ${data.latest_version || ''} 的镜像并重建容器，/data 数据卷保留。`
      + '重建期间 Peach 暂时断开，进行中的任务在启动后续跑；有待执行的数据库迁移时，启动前先备份再迁移。',
    confirmLabel: '开始更新', cancelLabel: '取消', onConfirm: container.run,
  });

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  const restart = async () => {
    const result = await apiSend<UpdateJob>('/api/configuration/update-restart', {});
    if (mounted.current) setJob(result);
  };
  const confirmRestart = () => void confirmModal({
    title: '更新已准备好', body: `Peach ${job.version || ''} 将在重启后安装。`,
    confirmLabel: '立即重启', cancelLabel: '稍后', onConfirm: restart,
  });

  useEffect(() => {
    if (job.state !== 'ready' || prompted.current) return;
    prompted.current = true;
    confirmRestart();
  }, [job.state]);

  useEffect(() => {
    const controller = new AbortController();
    const delay = ACTIVE.has(job.state) ? 1000 : 30000;
    let timer: ReturnType<typeof setTimeout>;
    let failures = 0;
    const poll = async () => {
      try {
        const result = await apiGet<UpdateJob>('/api/configuration/update-status', controller.signal);
        if (controller.signal.aborted) return;
        setJob(result);
        failures = 0;
        if (result.state === 'complete') {
          setData((current) => ({ ...current, current_version: result.version || current.current_version, state: 'current', message: '已是最新测试版。' }));
        }
        const automatic = await apiGet<{ result?: ReleaseState }>('/api/configuration/automatic-updates', controller.signal);
        if (!controller.signal.aborted && automatic.result) setData(automatic.result);
      } catch {
        failures += 1;
        if (failures >= MAX_FAILURES && !controller.signal.aborted) setPollError('尚未连接到 Peach，请检查托盘后刷新页面。');
      }
      if (!controller.signal.aborted && failures < MAX_FAILURES) timer = setTimeout(poll, delay);
    };
    timer = setTimeout(poll, delay);
    return () => { controller.abort(); clearTimeout(timer); };
  }, [job.state]);

  const download = () => {
    if (running) return;
    prompted.current = false;
    setPollError('');
    void action.run('download', (signal) => apiSend<UpdateJob>('/api/configuration/update', {}, 'POST', signal), setJob);
  };
  const check = () => void action.run('check', (signal) => apiGet<ReleaseState>('/api/configuration/updates', signal), setData,
    (cause) => { setData({ ...initial, state: 'error' }); action.setError(errorMessage(cause)); });

  const error = action.error || pollError || container.error;
  const reading = job.state === 'downloading' && job.total
    ? `${((job.downloaded || 0) / 1048576).toFixed(1)} / ${(job.total / 1048576).toFixed(1)} MB`
    : `${job.progress}%`;
  return (
    <Section id="releaseUpdates" guide="updates" title="检查更新" aside={<StatusLabel tone={error || data.state === 'error' || job.state === 'error' || container.job.state === 'timeout' ? 'error' : running || rebuilding ? 'progress' : container.job.state === 'done' ? 'success' : data.state === 'available' ? 'warning' : data.state === 'unchecked' ? 'neutral' : 'success'}>
      {error || data.state === 'error' || job.state === 'error' ? '检查未完成' : container.job.state === 'timeout' ? '更新未完成' : running ? '准备更新中' : rebuilding ? '正在更新' : container.job.state === 'done' ? '已更新' : job.state === 'ready' ? '可安装' : data.state === 'available' ? '有可用更新' : data.state === 'unchecked' ? '尚未检查' : '检查完成'}</StatusLabel>}>
      <FactList>
        <Fact term="当前版本">{container.job.state === 'done' ? container.job.version : data.current_version}</Fact>
        <Fact term="安装方式">{data.installation}</Fact>
        <Fact term="更新通道">{data.channel}</Fact>
        <Fact term="最新版本">{data.latest_version || '未取得'}</Fact>
        {data.package_kind ? <Fact term="下载内容">
          {data.package_kind === 'update' ? '应用更新包' : data.package_kind === 'installer' ? 'macOS 安装镜像' : '应用与工具'}
          {data.asset_size ? ` · ${(data.asset_size / 1048576).toFixed(1)} MB` : ''}
        </Fact> : null}
      </FactList>
      {data.package_kind === 'update'
        ? <Help>应用更新包复用已安装工具；工具缺失、损坏或版本变化时会另行下载所需工具包。</Help>
        : data.package_kind === 'full' ? <Help>本次更新包含媒体工具。</Help>
          : data.package_kind === 'installer' ? <Help>下载后打开镜像，把 Peach 拖入「应用程序」替换旧版本，数据目录与设置保留；提示已损坏时按发布页说明移除隔离标记。</Help> : null}
      {data.state === 'unchecked' && !data.checked_at && !error && job.state === 'idle' ? null : <Stack divided>
        {data.checked_at ? <Help>检查于 {new Date(data.checked_at * 1000).toLocaleString()}</Help> : null}
        {container.job.state === 'done' ? null : data.state === 'available' && !error
          ? <Note tone="info" title="有可用更新">{data.message}</Note>
          : error || data.state === 'error'
            ? <ErrorText>{error || data.message}</ErrorText>
            : data.state === 'unchecked' ? null : <Help role="status">{data.message}</Help>}
        {/* 容器没启用 Watchtower 时没有应用内更新：在宿主机上拉镜像、重建容器，并说明怎样才能一键更新。 */}
        {data.state === 'available' && !error && !oneClick && container.job.state === 'idle' && data.steps?.length
          ? <>
              <CommandSteps label="在宿主机上更新" steps={data.steps} />
              <Help>{data.one_click?.reason || '用 compose 的 watchtower profile 启动 Watchtower 后，可以在这里一键更新，启用前先读 Docker 部署说明。'}</Help>
            </> : null}
        <DockerUpdateProgress job={container.job} />
        {job.state === 'error' ? <ErrorText>{job.message}</ErrorText> : null}
        {job.state !== 'idle' && job.state !== 'error' ? (
          <div aria-live="polite" className="flex flex-col gap-2">
            <Progress label="更新准备进度" value={job.progress} stops={STOPS} />
            <Help>下载 → 校验 → 解压 → 准备安装 · {job.message}</Help>
            <Help>{reading}</Help>
          </div>
        ) : null}
      </Stack>}
      <Footer status={<div className="flex flex-wrap items-center gap-3">
        <ExternalLink href="https://peach.video/#download">官网</ExternalLink>
        <ExternalLink href="https://github.com/peach-mitao/peach">GitHub</ExternalLink>
        <ExternalLink href={data.release_url || RELEASES_URL}>查看发布页</ExternalLink>
      </div>}>
        <Button variant={job.state === 'ready' || oneClick || (data.state === 'available' && data.installation === '独立测试包') ? 'secondary' : 'primary'}
          disabled={running || rebuilding} onClick={check} {...busyProps(action.busy === 'check')}>检查更新</Button>
        {container.job.state === 'done'
          ? <Button variant="primary" onClick={() => window.location.reload()}>刷新页面</Button>
          : oneClick
            ? <Button variant="primary" onClick={confirmDockerUpdate} {...busyProps(rebuilding || container.busy)}>一键更新</Button>
            : null}
        {data.state === 'available' && data.in_app_update && job.state !== 'ready'
          ? <Button variant="primary" onClick={download} {...busyProps(running || action.busy === 'download')}>下载并安装</Button>
          : data.state === 'available' && data.installation === '独立测试包' && data.asset_url
            ? <ButtonLink variant="primary" href={data.asset_url}>下载新版本</ButtonLink>
            : null}
        {job.state === 'ready' ? <Button variant="primary" onClick={confirmRestart}>重启安装</Button> : null}
      </Footer>
    </Section>
  );
}
