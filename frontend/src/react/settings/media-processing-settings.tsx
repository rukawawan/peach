/* 这台机器的媒体处理偏好，两张卡读写同一个 `['media-processing']` 键：
 * - 「视频预览」（「媒体库与入库」）：为本地视频生成九宫格与时间轴预览的总开关、时间轴档位与抽帧解码方式。
 *   总开关在前，依赖它的档位次之，少改的解码方式最后。
 * - 「视频播放」（「应用与维护」）：播放时整片与 HLS 转码的编解码方式。它管的是这台电脑的硬件，
 *   和开机自启同属本机运行，不放在设置弹窗的界面偏好里（ADR-0103）。 */
import { useQuery } from '@tanstack/react-query';
import { SettingsRow } from '@/components/application/settings/settings-rows';
import { Switch } from '@/components/base/switch/switch';
import { Select, SelectItem } from '@/components/base/select/select';

import { apiSend, errorMessage } from '../../api';
import { queryClient } from '../query';
import {
  MEDIA_PROCESSING_KEY, MEDIA_PROCESSING_URL, THUMBNAIL_JOBS_KEY, fetchMediaProcessing, type MediaProcessingPolicy,
} from '../settings-panel/settings-data';
import { LIBRARY_PROCESSING_KEY } from '../library-processing/library-processing';
import { ErrorText, Help, Rows, Section, Stack } from './section';
import { useAction } from './use-action';
import { VideoThumbnailControls } from './service-preferences';

export function MediaProcessingSettings({ receipt }: { receipt(message: string): void }) {
  const policy = useQuery({ queryKey: MEDIA_PROCESSING_KEY, queryFn: ({ signal }) => fetchMediaProcessing(signal) });
  const action = useAction();
  const error = action.error || (policy.error ? errorMessage(policy.error) : '');
  const blocked = !policy.data || policy.isFetching || !!action.busy;
  return (
    <Section guide="preview" title="视频预览">
      <Rows>
        <SettingsRow label="生成视频预览" description="为本地视频生成九宫格与时间轴预览。">
          <Switch aria-label="生成视频预览" isSelected={!!policy.data && !policy.data.metadata_only} isDisabled={blocked}
            onChange={(value) => void action.run('save', (signal) =>
              apiSend<MediaProcessingPolicy>(MEDIA_PROCESSING_URL, { metadata_only: !value }, 'POST', signal), (saved) => {
                queryClient.setQueryData(MEDIA_PROCESSING_KEY, saved);
                void queryClient.invalidateQueries({ queryKey: THUMBNAIL_JOBS_KEY });
                void queryClient.invalidateQueries({ queryKey: LIBRARY_PROCESSING_KEY });
                receipt(saved.metadata_only ? '已关闭视频预览生成' : '已开启视频预览生成');
              })} />
        </SettingsRow>
      </Rows>
      <VideoThumbnailControls disabled={!policy.data || policy.data.metadata_only || !!action.busy} />
      <Rows>
        <SettingsRow label="抽帧解码方式" description="用于生成封面、九宫格和时间轴。">
          <div id="previewAccelerationSetting">
            <Select aria-label="抽帧解码方式" selectedKey={policy.data?.preview_acceleration || 'auto'} isDisabled={blocked}
              onSelectionChange={(mode) => {
                if (mode === null) return;
                void action.run('preview_acceleration', (signal) => apiSend<MediaProcessingPolicy>(MEDIA_PROCESSING_URL,
                  { preview_acceleration: String(mode) }, 'POST', signal), (saved) => {
                  queryClient.setQueryData(MEDIA_PROCESSING_KEY, saved);
                  receipt('已保存抽帧解码方式');
                });
              }}>
              <SelectItem id="auto">自动（硬件优先）</SelectItem>
              <SelectItem id="software">软件解码</SelectItem>
            </Select>
          </div>
        </SettingsRow>
      </Rows>
      {action.busy ? <Stack divided><Help role="status">正在保存…</Help></Stack> : null}
      {error ? <Stack divided><ErrorText>{error}</ErrorText></Stack> : null}
    </Section>
  );
}

export function PlaybackTranscodeSettings({ receipt }: { receipt(message: string): void }) {
  const policy = useQuery({ queryKey: MEDIA_PROCESSING_KEY, queryFn: ({ signal }) => fetchMediaProcessing(signal) });
  const action = useAction();
  const error = action.error || (policy.error ? errorMessage(policy.error) : '');
  return (
    <Section guide="transcode" title="视频播放">
      <Rows>
        <SettingsRow label="转码方式" description="用于播放时的视频转码。">
          <div id="playbackAccelerationSetting">
            <Select aria-label="转码方式" selectedKey={policy.data?.playback_acceleration || 'auto'}
              isDisabled={!policy.data || policy.isFetching || !!action.busy}
              onSelectionChange={(mode) => {
                if (mode === null) return;
                void action.run('playback_acceleration', (signal) => apiSend<MediaProcessingPolicy>(MEDIA_PROCESSING_URL,
                  { playback_acceleration: String(mode) }, 'POST', signal), (saved) => {
                  queryClient.setQueryData(MEDIA_PROCESSING_KEY, saved);
                  receipt('已保存转码方式');
                });
              }}>
              <SelectItem id="auto">自动（硬件优先）</SelectItem>
              <SelectItem id="software">软件编解码</SelectItem>
            </Select>
          </div>
        </SettingsRow>
      </Rows>
      {action.busy ? <Stack divided><Help role="status">正在保存…</Help></Stack> : null}
      {error ? <Stack divided><ErrorText>{error}</ErrorText></Stack> : null}
    </Section>
  );
}
