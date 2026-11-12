import { useMemo, useState } from 'react';

import { SettingsRow } from '@/components/application/settings/settings-rows';
import { Button } from '@/components/base/buttons/button';
import { Checkbox } from '@/components/base/checkbox/checkbox';
import { Switch } from '@/components/base/switch/switch';

import { apiGet, apiSend } from '../../api';
import { CodeBlock } from '../components/code-block';
import { StatusLabel, type StatusTone } from '../components/status-label';
import { Disclosure, ErrorText, Fact, FactList, Footer, Help, Rows, Stack } from './section';
import { busyProps, useAction } from './use-action';

export interface LibrarySharingState {
  enabled: boolean; available: boolean; schema: number; fields: string[]; notice: string;
  last_sent_at?: string | null;
  last_attempt?: { period?: string; status?: string; reason?: string; attempted?: boolean };
  consent_state?: 'enabled' | 'disabled' | 'needs-consent' | 'not-selected';
  participation?: { status: string; pending_state?: 'enabled' | 'disabled' | null;
    state?: 'enabled' | 'disabled'; last_seen?: string; reason?: string };
}
interface Preview { data: { library: unknown[]; preferences: unknown; coverage: { uncoded_items: number } }; bytes: number; token: string; schema: number }

export function LibrarySharingSettings({ initial, receipt }: {
  initial: LibrarySharingState; receipt(message: string): void;
}) {
  const [value, setValue] = useState(initial);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [reviewing, setReviewing] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const previewText = useMemo(() => preview ? JSON.stringify(preview.data, null, 2) : '', [preview]);
  const action = useAction();
  const participation = value.participation;
  const deliveryNames: Record<string, string> = {
    'not-attempted': '尚未发送', queued: '等待发送', accepted: '已发送',
    failed: '发送失败', unknown: '结果未取得', blocked: '已拦截',
  };
  const participationTones: Record<string, StatusTone> = {
    queued: 'progress', accepted: 'success', failed: 'error', unknown: 'warning', blocked: 'warning',
  };
  const save = (enabled: boolean) => void action.run('save', (signal) =>
    apiSend<LibrarySharingState>('/api/configuration/library-sharing', {
      enabled, schema: value.schema, consent: accepted, preview_token: preview?.token,
    }, 'POST', signal), (saved) => {
    setValue(saved); setPreview(null); setAccepted(false); setReviewing(false); receipt('已保存馆藏与口味上传选项');
  });
  const downloadPreview = () => {
    const url = URL.createObjectURL(new Blob([previewText], { type: 'application/json' }));
    const anchor = document.createElement('a');
    anchor.href = url; anchor.download = 'peach-library-taste-preview.json';
    document.body.append(anchor);
    try { anchor.click() } finally {
      anchor.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
    }
  };
  return <>
    <Rows><SettingsRow label="上传馆藏与口味明细" description="每周分享馆藏、偏好与容量统计，需先预览并同意。">
      <Switch aria-label="上传馆藏与口味明细" isSelected={value.enabled}
        onChange={(enabled) => enabled ? setReviewing(true) : save(false)}
        {...busyProps(action.busy === 'save')} />
    </SettingsRow></Rows>
    {!value.available ? <Stack divided><span className="self-start"><StatusLabel>上传服务未配置</StatusLabel></span></Stack> : null}
    {value.consent_state === 'needs-consent' ? <Stack divided>
      <span className="self-start"><StatusLabel tone="warning">待重新同意</StatusLabel></span>
      <Help>字段已更新，需重新预览并同意。</Help>
    </Stack> : null}
    <Stack divided><Disclosure summary="馆藏统计字段与发送规则">
      <ul className="list-disc space-y-2 pl-5">{value.fields.map(field => <li key={field}><Help>{field}</Help></li>)}</ul>
      <Help>{value.notice}</Help>
    </Disclosure></Stack>
    {participation ? <Stack divided>
      <FactList><Fact term="参与状态"><StatusLabel aria-label="参与状态"
        tone={participation.pending_state ? 'progress' : participationTones[participation.status] || 'neutral'}>
        {participation.pending_state
        ? `待发送${participation.pending_state === 'disabled' ? '关闭' : '开启'}状态`
        : deliveryNames[participation.status] || '结果未取得'}</StatusLabel></Fact></FactList>
      {value.last_sent_at ? <Help>上次发送：{new Date(value.last_sent_at).toLocaleDateString()}</Help> : null}
    </Stack> : null}
    {value.enabled && value.last_attempt?.status === 'failed'
      ? <Stack divided><span className="self-start"><StatusLabel tone={value.last_attempt.attempted ? 'error' : 'warning'}>{value.last_attempt.attempted ? '上传失败' : '待重新准备'}</StatusLabel></span><ErrorText>{value.last_attempt.attempted
        ? '馆藏与口味上传失败，本周不再发送。' : '馆藏与口味上传未完成，将自动重新准备。'}</ErrorText></Stack> : null}
    {value.enabled && value.last_attempt?.status === 'waiting-data'
      ? <Stack divided><span className="self-start"><StatusLabel>等待数据</StatusLabel></span><Help>等待可分析的馆藏或偏好数据。</Help></Stack> : null}
    {value.enabled && value.last_attempt?.status === 'unknown'
      ? <Stack divided><span className="self-start"><StatusLabel tone="warning">结果未取得</StatusLabel></span><Help>未取得上传结果，本周不再发送。</Help></Stack> : null}
    {preview ? <Stack divided>
      <Help>预览含 {preview.data.library.length} 部作品和 {preview.data.coverage.uncoded_items} 条无编号汇总，约 {(preview.bytes / 1024).toFixed(1)} KiB。</Help>
      <Help>随机标识用于实例去重。状态每日一次；关闭后仅补发一次关闭状态。</Help>
      <Disclosure summary="上传数据预览" defaultOpen>
        <CodeBlock code={previewText} language="json" label="馆藏与口味上传预览" maxCharacters={24000} />
      </Disclosure>
      {previewText.length > 24000 ? <Help>显示前 24,000 个字符，下载可查看完整内容。</Help> : null}
      <Button variant="secondary" onClick={downloadPreview}>下载完整预览</Button>
      {!value.enabled ? <Checkbox isSelected={accepted} onChange={setAccepted}>我已查看上传预览，同意上传馆藏与口味明细</Checkbox> : null}
    </Stack> : null}
    {action.error ? <Stack divided><ErrorText>{action.error}</ErrorText></Stack> : null}
    <Footer>
      {reviewing && !value.enabled ? <Button variant="secondary" onClick={() => {
        setReviewing(false); setPreview(null); setAccepted(false);
      }}>取消</Button> : null}
      {participation ? <Button variant="secondary" onClick={() => void action.run('refresh',
        async signal => {
          const data = await apiGet<{ library_sharing?: LibrarySharingState }>('/api/configuration', signal);
          if (!data.library_sharing) throw new Error('馆藏上传状态未取得');
          return data.library_sharing;
        }, setValue)} {...busyProps(action.busy === 'refresh')}>刷新发送状态</Button> : null}
      <Button variant="secondary" onClick={() => { setReviewing(true); void action.run('preview',
        (signal) => apiGet<Preview>('/api/configuration/library-sharing/preview', signal),
        (data) => { setPreview(data); setAccepted(false) }) }}
        {...busyProps(action.busy === 'preview')}>预览上传内容</Button>
      {!value.enabled && preview ? <Button variant="primary" disabled={!accepted} onClick={() => save(true)}
        {...busyProps(action.busy === 'save')}>同意并开启上传</Button> : null}
    </Footer>
  </>;
}
