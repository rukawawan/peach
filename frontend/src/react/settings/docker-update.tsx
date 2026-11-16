/* Docker 一键更新（ADR-0140）：点击后等新容器起来。
 *
 * 容器换不掉自己，Peach 只请同一 compose 里的 Watchtower 在后台拉镜像、重建容器；令牌与地址都由
 * compose 自动配好，页面没有设置项。请求发出后 Peach 会断开一会儿；每 3 秒问一次运行版本，
 * 换成新版本就提示刷新，15 分钟没换就报告未完成。 */
import { useEffect, useRef, useState } from 'react';

import { apiGet, apiSend } from '../../api';
import { CommandSteps, ErrorText, Help, Stack } from './section';
import { TaskProgress } from '../components/task-progress';
import { useAction } from './use-action';
import { t } from '../../i18n';

const POLL = 3000;
const GIVE_UP = 15 * 60 * 1000;

export type DockerJob = { state: 'idle' | 'updating' | 'done' | 'timeout'; version?: string };

/** 点击「一键更新」之后的进度：发请求、等运行版本变化。 */
export function useDockerUpdate(currentVersion: string) {
  const [job, setJob] = useState<DockerJob>({ state: 'idle' });
  const action = useAction();
  const started = useRef(0);

  useEffect(() => {
    if (job.state !== 'updating') return undefined;
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout>;
    const poll = async () => {
      try {
        const next = await apiGet<{ runtime?: { version?: string } }>('/api/client-updates', controller.signal);
        const version = next.runtime?.version;
        if (!controller.signal.aborted && version && version !== currentVersion) {
          setJob({ state: 'done', version });
          return;
        }
      } catch {
        // 重建期间连不上是正常的，继续等。
      }
      if (controller.signal.aborted) return;
      if (Date.now() - started.current > GIVE_UP) setJob({ state: 'timeout' });
      else timer = setTimeout(poll, POLL);
    };
    timer = setTimeout(poll, POLL);
    return () => { controller.abort(); clearTimeout(timer); };
  }, [job.state, currentVersion]);

  const run = () => action.run('docker-update',
    (signal) => apiSend<{ state: string }>('/api/configuration/docker-update', {}, 'POST', signal),
    () => { started.current = Date.now(); setJob({ state: 'updating' }); });
  return { job, run, busy: action.busy === 'docker-update', error: action.error };
}

export function DockerUpdateProgress({ job }: { job: DockerJob }) {
  if (job.state === 'updating') {
    // 等 Watchtower 拉镜像、重建容器，再等服务回来：是在等外部，画 Clock。
    return <TaskProgress embedded kind="clock" label={t('settings:dockerUpdate.updating')} />;
  }
  if (job.state === 'done') return <Help role="status">{t('settings:dockerUpdate.done', { version: job.version })}</Help>;
  if (job.state === 'timeout') {
    return <Stack>
      <ErrorText>{t('settings:dockerUpdate.timeout')}</ErrorText>
      <CommandSteps label={t('settings:dockerUpdate.logsLabel')} steps={[{ text: t('settings:dockerUpdate.watchtowerLog'), command: 'docker compose logs watchtower' },
        { text: t('settings:dockerUpdate.peachLog'), command: 'docker compose logs peach' }]} />
    </Stack>;
  }
  return null;
}
