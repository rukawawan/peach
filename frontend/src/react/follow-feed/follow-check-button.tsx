import { useState } from 'react';
import { Button } from '@/components/base/buttons/button';
import { errorMessage } from '../../api';
import { useBackgroundJob } from '../background-job';
import { queryClient } from '../query';
import { Note } from '../components/note';
import { busyProps } from '../settings/busy-props';
import { fetchCheckJob, FOLLOW_CHECK_KEY, reloadFollowManage, startCheck, type CheckJob } from '../follow-manage/follow-manage';
import { validCheckSources } from './follow-check';
import { jobText } from '../../core/server-text';
import { FOLLOW_CHECK_TASK } from '../../running-tasks';
import { t } from '../../i18n';

/** 只检查入口所属的来源，任务状态沿用关注管理的共享查询。 */
export function FollowCheckButton({ sources, report }: { sources: readonly number[]; report(result: unknown): void }) {
  const ids = validCheckSources(sources);
  const [failure, setFailure] = useState('');
  const { running, start } = useBackgroundJob<CheckJob, number[]>({
    queryKey: FOLLOW_CHECK_KEY,
    taskKey: FOLLOW_CHECK_TASK,
    queryFn: ({ signal }) => fetchCheckJob(signal),
    start: ids => startCheck(ids),
    onError: cause => setFailure(errorMessage(cause)),
    onFinish: result => {
      if (result.status === 'failed') setFailure(jobText(result, 'error') || t('follow:followCheck.checkFailed'));
      void reloadFollowManage();
      void queryClient.invalidateQueries({ queryKey: ['follow-feed'] });
      report(result);
    },
  });
  const busy = running || start.isPending;
  return <div className="flex min-w-0 flex-col gap-2">
    <Button size="small" disabled={!ids.length} {...busyProps(busy)} onClick={() => {
      if (!ids.length || busy) return;
      setFailure('');
      start.mutate(ids);
    }}>{t('follow:followCheck.checkUpdates')}</Button>
    {failure ? <Note tone="error">{failure}</Note> : null}
  </div>;
}
