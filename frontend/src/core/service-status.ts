/* 服务暂时用不了的信号：启动时正在迁移账本（503 带 `api.ledger.migrating`），或者连不上服务。
 * 两个取数入口（island 的 `apiGet`／`apiSend` 与遗留层 `api()`）遇到时派发 `peach:client-updates`，
 * 页面顶部横幅立即查一次更新状态；同一时刻只查一次、没恢复时怎么退避，都由横幅那边管（`react/client-updates.tsx`）。 */

/** 启动迁移期间，需要账本的请求回 503 时带的 code（服务端 `api.LEDGER_MIGRATING_CODE`）。 */
export const LEDGER_MIGRATING_CODE = 'api.ledger.migrating';
/** 横幅已经在听的事件：立即查一次更新状态。 */
export const CLIENT_UPDATES_EVENT = 'peach:client-updates';

/** 连不上服务，或服务说正在更新本地数据库。 */
export function noticeServiceUnavailable(): void {
  document.dispatchEvent(new Event(CLIENT_UPDATES_EVENT));
}

/** 一次非 2xx 响应：是迁移期间的 503 才算。 */
export function noticeFailedResponse(status: number, payload: unknown): void {
  const code = payload && typeof payload === 'object' ? (payload as { message_code?: unknown }).message_code : undefined;
  if (status === 503 && code === LEDGER_MIGRATING_CODE) noticeServiceUnavailable();
}

/** 请求没发出去：中止不算，别的（断网、服务没在监听）都算连不上。 */
export function noticeRequestFailure(error: unknown): void {
  if ((error as { name?: unknown } | null)?.name !== 'AbortError') noticeServiceUnavailable();
}
