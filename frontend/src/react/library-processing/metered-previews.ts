/* 开了流量保护的目录里补预览：同步时这些目录不读，只有人点名的影片、确认过一次才读。
 * 作品卡上的单部按钮与状态条上的整批按钮共用这一份确认和请求，服务端只对指定影片的
 * 补全预览认 `allow_metered`（`web_library_processing._metered_grant`）。 */
import { confirmModal } from '@peach/legacy/ui';

import { apiSend } from '../../api';
import { LIBRARY_PROCESSING_URL, type LibraryProcessingData } from './library-processing';

export async function confirmMeteredPreviews(count: number): Promise<boolean> {
  const which = count > 1 ? `这 ${count.toLocaleString()} 部影片` : '这部影片';
  const each = count > 1 ? '每部影片' : '这部影片';
  const { confirmed } = await confirmModal({
    title: '读取开了流量保护的目录',
    body: `${which}所在的目录开了流量保护，同步时不会读它。补全预览会按九个时间点跳读${each}，消耗这个来源的流量。`,
    confirmLabel: '继续补全',
  });
  return confirmed;
}

export const startPreviews = (ids: number[], metered: boolean, signal?: AbortSignal) =>
  apiSend<LibraryProcessingData>(LIBRARY_PROCESSING_URL,
    { stage: 'previews', asset_ids: ids, ...(metered ? { allow_metered: true } : {}) }, 'POST', signal);
