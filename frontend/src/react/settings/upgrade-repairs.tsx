/** 升级补修与程序安装分别显示；复核和重试都由用户明确发起。 */
import { useEffect, useState } from 'react';
import { RiArrowRightLine } from '@remixicon/react';
import { Button } from '@/components/base/buttons/button';
import { LinkButton } from '@/components/base/buttons/link-button';
import { REPAIR_CENTER_PATH } from '@peach/history';
import { apiSend } from '../../api';
import { useClientUpdates } from '../client-updates';
import type { ClientUpdates } from '../client-updates';
import { AnimatedNumber } from '../components/animated-number';
import { StatusLabel } from '../components/status-label';
import { ErrorText, ExternalLink, Fact, FactList, Footer, Help, Section, Stack, TaskCenterLink } from './section';
import { useAction } from './use-action';

const LABELS: Record<string, string> = { pending: '等待修复', running: '正在修复', failed: '需要重试',
  review: '需要复核', complete: '已完成', unavailable: '当前部署未启用' };

export function UpgradeRepairs() {
  const { snapshot } = useClientUpdates();
  const [saved, setSaved] = useState<ClientUpdates['repairs'] | null>(null);
  const action = useAction();
  useEffect(() => setSaved(null), [snapshot]);
  const data = saved ?? snapshot?.repairs;
  const state = data?.state || 'pending';
  const pending = data?.items.reduce((count, row) => count + (row.pending || 0), 0) || 0;
  const failed = data?.items.reduce((count, row) => count + (row.failed || 0), 0) || 0;
  const review = data?.items.reduce((count, row) => count + (row.review_count || 0), 0) || 0;
  const retry = () => void action.run('retry', signal => apiSend<ClientUpdates['repairs']>(
    '/api/configuration/upgrade-repairs/retry', {}, 'POST', signal), next => {
    setSaved(next);
    document.dispatchEvent(new Event('peach:client-updates'));
  });
  return <Section id="upgradeRepairs" title="自动修复" aside={<StatusLabel
    tone={state === 'failed' ? 'error' : state === 'running' ? 'progress' : state === 'review' ? 'warning'
      : state === 'complete' ? 'success' : 'neutral'}><span key={state}
        data-copy-key={`upgradeRepairs.${state}.status`}>{LABELS[state] || '未取得'}</span></StatusLabel>}>
    <FactList>
      <Fact term="待完成"><span><AnimatedNumber value={pending} /> 项</span></Fact>
      <Fact term="失败"><span><AnimatedNumber value={failed} /> 项</span></Fact>
      <Fact term="待复核"><span><AnimatedNumber value={review} /> 项</span></Fact>
    </FactList>
    {data?.message || action.error ? <Stack><ErrorText>{action.error || data?.message}</ErrorText></Stack> : null}
    {state === 'running' ? <Stack><Help>资料与预览正在后台补全。</Help><TaskCenterLink /></Stack> : null}
    <Footer status={review ? <ExternalLink href="/api/configuration/upgrade-repairs/review">下载复核记录</ExternalLink> : null}>
      <LinkButton href={REPAIR_CENTER_PATH} size="small" trailingIcon={RiArrowRightLine}>修复与迁移</LinkButton>
      <Button size="small" variant="secondary" disabled={!data?.available || state === 'running' || !!action.busy || (!failed && state !== 'failed')}
        onClick={retry}>重试失败项</Button>
    </Footer>
  </Section>;
}
