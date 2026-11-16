/* 开了流量保护的目录里补预览：同步时这些目录不读，只有人点名的影片、确认过一次才读。
 * 作品卡上的单部按钮与状态条上的整批按钮共用这一份确认和请求，服务端只对指定影片的
 * 补全预览认 `allow_metered`（`web_library_processing._metered_grant`）。 */
import { confirmModal } from '@peach/legacy/ui';

import { apiSend } from '../../api';
import { LIBRARY_PROCESSING_URL, type LibraryProcessingData } from './library-processing';
import { t } from '../../i18n';

export async function confirmMeteredPreviews(count: number): Promise<boolean> {
  const { confirmed } = await confirmModal({
    title: t('manage:completionPrompt.meteredTitle'),
    body: count > 1 ? t('manage:completionPrompt.meteredBodyMany', { count }) : t('manage:completionPrompt.meteredBodySingle'),
    confirmLabel: t('manage:completionPrompt.meteredConfirm'),
  });
  return confirmed;
}

export const startPreviews = (ids: number[], metered: boolean, signal?: AbortSignal) =>
  apiSend<LibraryProcessingData>(LIBRARY_PROCESSING_URL,
    { stage: 'previews', asset_ids: ids, ...(metered ? { allow_metered: true } : {}) }, 'POST', signal);
