/* 媒体修复的数据层：任务快照与可选的媒体库，两份都进共用的 Query 缓存。
 *
 * 一轮要跑几十分钟到几小时，跑到哪一步由服务自己记，页面关掉再回来照样接得上。
 * 首屏两份一起取，卡片挂上去直接读缓存。 */
import { apiGet } from '../../api';
import { queryClient } from '../query';
import { t } from '../../i18n';
import { stageText } from '../../core/server-text';

export const MEDIA_REPAIR_URL = '/api/media-repair';
export const MEDIA_REPAIR_KEY = ['media-repair'] as const;
export const REPAIR_LIBRARIES_KEY = ['media-repair', 'libraries'] as const;

export interface MediaRepairState {
  status: string;
  library: string;
  stage: string;
  stage_code?: string;
  checked: number;
  total: number;
  found: number;
  repaired: number;
  failed: number;
  missing_tool: number;
  skipped: number;
  message: string;
  error?: string;
}

export interface RepairLibrary {
  id: string;
  name: string;
  /** 媒体库图标：来源名（`115`、`pikpak`、`local`）或雪碧图字形名，与侧栏媒体库切换器同一份。 */
  icon: string;
  metered: boolean;
}

export const IDLE_REPAIR: MediaRepairState = {
  status: 'idle', library: '', stage: '', checked: 0, total: 0, found: 0,
  repaired: 0, failed: 0, missing_tool: 0, skipped: 0, message: '',
};

export const fetchMediaRepair = (signal?: AbortSignal) => apiGet<MediaRepairState>(MEDIA_REPAIR_URL, signal);

export const fetchRepairLibraries = async (signal?: AbortSignal) =>
  (await apiGet<{ libraries?: RepairLibrary[] }>('/api/libraries', signal)).libraries || [];

export async function prefetchMediaRepair(signal: AbortSignal): Promise<void> {
  void queryClient.prefetchQuery({ queryKey: REPAIR_LIBRARIES_KEY, queryFn: () => fetchRepairLibraries(signal) });
  await queryClient.fetchQuery({ queryKey: MEDIA_REPAIR_KEY, queryFn: () => fetchMediaRepair(signal) });
}

const count = (value: number) => Number(value).toLocaleString();

/** 一句话说清此刻在干什么：扫描报进度，修复报进度加当前这部片。 */
export function statusLine(state: MediaRepairState): string {
  if (state.status === 'running') {
    // 服务端偶尔报出超过总数的已查数，按总数封顶。
    const where = state.total ? `${count(Math.min(state.checked || 0, state.total))} / ${count(state.total)}` : t('cleanup:mediaRepair.preparing');
    return state.stage_code === 'mediaRepair.repair' && state.message
      ? t('cleanup:mediaRepair.repairingProgress', { progress: where, name: state.message })
      : t('cleanup:mediaRepair.stageProgress', { stage: stageText(state) || t('cleanup:mediaRepair.scanStage'), progress: where });
  }
  if (state.status === 'complete' && (state.repaired || state.failed)) {
    return state.failed
      ? t('cleanup:mediaRepair.repairedWithFailures', { count: Number(state.repaired || 0), failed: Number(state.failed) })
      : t('cleanup:mediaRepair.repairedDone', { count: Number(state.repaired || 0) });
  }
  return '';
}

export const missingToolText = (state: MediaRepairState) =>
  t('cleanup:mediaRepair.missingToolNotice', { count: Number(state.missing_tool || 0) });
