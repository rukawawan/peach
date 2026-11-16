/* 检查更新：当前与最新版本、下载安装进度，准备好之后确认重启。
 *
 * 更新任务与检查结果读页面顶部横幅那份 `/api/client-updates` 快照（`useClientUpdates`），本页不另查：
 * 更新进行中它每 2 秒刷新，空闲时 2 分钟一次；连不上时它按退避重试，约 2 分钟仍连不上就在这里说明。
 * Docker 镜像配好 Watchtower 时给「一键更新」，没配好时列出宿主机上的两步命令。 */
import { useEffect, useRef, useState } from 'react';
import { confirmModal } from '@peach/legacy/ui';

import { Button, ButtonLink } from '@/components/base/buttons/button';

import { apiGet, apiSend, errorMessage } from '../../api';
import { checkClientUpdates, useClientUpdates } from '../client-updates';
import { codedText, jobText, serverLabel, serverText } from '../../core/server-text';
import type { ReleaseState, UpdateJob } from '../bundle';
import { Note } from '../components/note';
import { Progress } from '../components/progress';
import { StatusLabel } from '../components/status-label';
import { DockerUpdateProgress, useDockerUpdate } from './docker-update';
import { RELEASE_NOTICE_EVENT } from '../release-notice';
import { CommandSteps, ErrorText, ExternalLink, Fact, FactList, Footer, Help, Section, Stack } from './section';
import { busyProps, useAction } from './use-action';
import { interfaceLanguage, t } from '../../i18n';

const ACTIVE = new Set(['downloading', 'verifying', 'extracting', 'preparing', 'restarting', 'installing']);
const STOPS = [65, 75, 90];
/** 横幅的快照连续这么多次没取得（按 2、4、8、16、30 秒退避，约 2 分钟）就说明连不上。 */
const LOST_AFTER_FAILURES = 7;
/** 服务端没给发布页时的去处；检查到新版本后服务端给的是那一版自己的发布页。 */
const RELEASES_URL = 'https://github.com/peach-mitao/peach/releases';

export function ReleaseUpdates({ initial, initialJob }: { initial: ReleaseState; initialJob?: UpdateJob | undefined }) {
  const [data, setData] = useState(initial);
  const [job, setJob] = useState<UpdateJob>(initialJob || { state: 'idle', progress: 0 });
  const { snapshot, failures } = useClientUpdates();
  /** 挂上时已有的那份快照可能比 `initial`／`initialJob` 旧，只接之后取到的。 */
  const mountedSnapshot = useRef(snapshot);
  const action = useAction();
  const prompted = useRef(false);
  const mounted = useRef(true);
  const running = ACTIVE.has(job.state);
  const container = useDockerUpdate(initial.current_version);
  const oneClick = data.state === 'available' && !!data.one_click?.available;
  const rebuilding = container.job.state === 'updating';
  const testBuild = data.installation_code === 'standalone';
  const confirmDockerUpdate = () => void confirmModal({
    title: t('settings:releaseUpdates.oneClickUpdate'), body: t('settings:releaseUpdates.dockerUpdateBody', { version: data.latest_version || '' }),
    confirmLabel: t('settings:releaseUpdates.startUpdate'), cancelLabel: t('settings:shared.cancel'), onConfirm: container.run,
  });

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  const restart = async () => {
    const result = await apiSend<UpdateJob>('/api/configuration/update-restart', {});
    if (mounted.current) setJob(result);
    checkClientUpdates();
  };
  const confirmRestart = () => void confirmModal({
    title: t('settings:releaseUpdates.updateReady'), body: t('settings:releaseUpdates.installAfterRestart', { version: job.version || '' }),
    confirmLabel: t('settings:releaseUpdates.restartNow'), cancelLabel: t('settings:shared.later'), onConfirm: restart,
  });

  useEffect(() => {
    if (job.state !== 'ready' || prompted.current) return;
    prompted.current = true;
    confirmRestart();
  }, [job.state]);

  useEffect(() => {
    if (!snapshot || snapshot === mountedSnapshot.current) return;
    const next = snapshot.update_job;
    setJob(next);
    // 没检查过时快照里是默认的「尚未检查」，不覆盖本页已有的结果。
    if (snapshot.release.checked_at) setData(snapshot.release);
    if (next.state === 'complete') {
      setData((current) => ({ ...current, current_version: next.version || current.current_version, state: 'current', message: t('settings:releaseUpdates.latestTestBuild') }));
    }
  }, [snapshot]);

  const download = () => {
    if (running) return;
    prompted.current = false;
    void action.run('download', (signal) => apiSend<UpdateJob>('/api/configuration/update', {}, 'POST', signal), (next) => {
      setJob(next);
      checkClientUpdates();
    });
  };
  const check = () => void action.run('check', (signal) => apiGet<ReleaseState>('/api/configuration/updates', signal), setData,
    (cause) => { setData({ ...initial, state: 'error' }); action.setError(errorMessage(cause)); });

  const pollError = failures >= LOST_AFTER_FAILURES ? t('settings:releaseUpdates.connectionLost') : '';
  const error = action.error || pollError || container.error;
  const message = serverText(data);
  const reading = job.state === 'downloading' && job.total
    ? `${((job.downloaded || 0) / 1048576).toFixed(1)} / ${(job.total / 1048576).toFixed(1)} MB`
    : `${job.progress}%`;
  return (
    <Section id="releaseUpdates" guide="updates" title={t('settings:releaseUpdates.check')} aside={<StatusLabel tone={error || data.state === 'error' || job.state === 'error' || container.job.state === 'timeout' ? 'error' : running || rebuilding ? 'progress' : container.job.state === 'done' ? 'success' : data.state === 'available' ? 'warning' : data.state === 'unchecked' ? 'neutral' : 'success'}>
      {error || data.state === 'error' || job.state === 'error' ? t('settings:releaseUpdates.checkIncomplete') : container.job.state === 'timeout' ? t('settings:releaseUpdates.updateIncomplete') : running ? t('settings:releaseUpdates.preparing') : rebuilding ? t('settings:releaseUpdates.updating') : container.job.state === 'done' ? t('settings:releaseUpdates.updated') : job.state === 'ready' ? t('settings:releaseUpdates.readyToInstall') : data.state === 'available' ? t('settings:releaseUpdates.updateAvailable') : data.state === 'unchecked' ? t('settings:releaseUpdates.notChecked') : t('settings:releaseUpdates.checkDone')}</StatusLabel>}>
      <FactList>
        <Fact term={t('settings:releaseUpdates.currentVersion')}>{container.job.state === 'done' ? container.job.version : data.current_version}</Fact>
        <Fact term={t('settings:releaseUpdates.installation')}>{serverLabel(`release.installation.${data.installation_code}`, data.installation)}</Fact>
        <Fact term={t('settings:releaseUpdates.channel')}>{serverLabel(`release.channel.${data.channel_code}`, data.channel)}</Fact>
        <Fact term={t('settings:releaseUpdates.latestVersion')}>{data.latest_version || t('settings:shared.notFound')}</Fact>
        {data.package_kind ? <Fact term={t('settings:releaseUpdates.package')}>
          {data.package_kind === 'update' ? t('settings:releaseUpdates.appUpdatePackage') : data.package_kind === 'installer' ? t('settings:releaseUpdates.macosDiskImage') : t('settings:releaseUpdates.appAndTools')}
          {data.asset_size ? ` · ${(data.asset_size / 1048576).toFixed(1)} MB` : ''}
        </Fact> : null}
      </FactList>
      {data.package_kind === 'update'
        ? <Help>{t('settings:releaseUpdates.updatePackageHelp')}</Help>
        : data.package_kind === 'full' ? <Help>{t('settings:releaseUpdates.includesMediaTools')}</Help>
          : data.package_kind === 'installer' ? <Help>{t('settings:releaseUpdates.installerHelp')}</Help> : null}
      {data.state === 'unchecked' && !data.checked_at && !error && job.state === 'idle' ? null : <Stack divided>
        {data.checked_at ? <Help>{t('settings:releaseUpdates.checkedAt', { time: new Date(data.checked_at * 1000).toLocaleString(interfaceLanguage) })}</Help> : null}
        {container.job.state === 'done' ? null : data.state === 'available' && !error
          ? <Note tone="info" title={t('settings:releaseUpdates.updateAvailable')}>{message}</Note>
          : error || data.state === 'error'
            ? <ErrorText>{error || message}</ErrorText>
            : data.state === 'unchecked' ? null : <Help role="status">{message}</Help>}
        {/* 容器没启用 Watchtower 时没有应用内更新：在宿主机上拉镜像、重建容器，并说明怎样才能一键更新。 */}
        {data.state === 'available' && !error && !oneClick && container.job.state === 'idle' && data.steps?.length
          ? <>
              <CommandSteps label={t('settings:releaseUpdates.updateOnHost')}
                steps={data.steps.map((step) => ({ ...step, text: serverLabel(`release.dockerStep.${step.id}`, step.text) }))} />
              <Help>{(data.one_click?.reason ? codedText(data.one_click, 'reason') : '') || t('settings:releaseUpdates.watchtowerHint')}</Help>
            </> : null}
        <DockerUpdateProgress job={container.job} />
        {job.state === 'error' ? <ErrorText>{jobText(job)}</ErrorText> : null}
        {job.state !== 'idle' && job.state !== 'error' ? (
          <div aria-live="polite" className="flex flex-col gap-2">
            <Progress label={t('settings:releaseUpdates.progressLabel')} value={job.progress} stops={STOPS} />
            <Help>{t('settings:releaseUpdates.progressSteps')} {jobText(job)}</Help>
            <Help>{reading}</Help>
          </div>
        ) : null}
      </Stack>}
      <Footer status={<div className="flex flex-wrap items-center gap-3">
        <ExternalLink href="https://peach.video/#download">{t('settings:shared.officialSite')}</ExternalLink>
        <ExternalLink href="https://github.com/peach-mitao/peach">GitHub</ExternalLink>
        <ExternalLink href={data.release_url || RELEASES_URL}>{t('settings:releaseUpdates.releasePage')}</ExternalLink>
      </div>}>
        <Button variant="ghost" onClick={() => document.dispatchEvent(new Event(RELEASE_NOTICE_EVENT))}>{t('settings:releaseUpdates.whatsNew')}</Button>
        <Button variant={job.state === 'ready' || oneClick || (data.state === 'available' && testBuild) ? 'secondary' : 'primary'}
          disabled={running || rebuilding} onClick={check} {...busyProps(action.busy === 'check')}>{t('settings:releaseUpdates.check')}</Button>
        {container.job.state === 'done'
          ? <Button variant="primary" onClick={() => window.location.reload()}>{t('settings:releaseUpdates.refreshPage')}</Button>
          : oneClick
            ? <Button variant="primary" onClick={confirmDockerUpdate} {...busyProps(rebuilding || container.busy)}>{t('settings:releaseUpdates.oneClickUpdate')}</Button>
            : null}
        {data.state === 'available' && data.in_app_update && job.state !== 'ready'
          ? <Button variant="primary" onClick={download} {...busyProps(running || action.busy === 'download')}>{t('settings:releaseUpdates.downloadAndInstall')}</Button>
          : data.state === 'available' && testBuild && data.asset_url
            ? <ButtonLink variant="primary" href={data.asset_url}>{t('settings:releaseUpdates.downloadNewVersion')}</ButtonLink>
            : null}
        {job.state === 'ready' ? <Button variant="primary" onClick={confirmRestart}>{t('settings:releaseUpdates.restartToInstall')}</Button> : null}
      </Footer>
    </Section>
  );
}
