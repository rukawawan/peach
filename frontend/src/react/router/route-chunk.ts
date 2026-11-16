/* 低频页面的代码按页拆成独立 chunk（ADR-0118）：路由表的首屏取数阶段与接口请求并行装载，取齐后同步画页。
 *
 * 不用 `React.lazy`：页面要在 `openManagedRoute` 取齐后的同一个任务里 `flushSync` 画完，lazy 组件第一次渲染
 * 总要抛一次 thenable，等于多画一帧空白。这里的 `get()` 只在 `preload()` 落地之后调用。
 *
 * 打开页面时装载失败，可能是服务端已经换了一版产物、旧入口指着的 chunk 不在了：服务还活着就整页重载一次拿新入口，
 * 同一会话里短时间内只重载一次；服务端连不上时照常抛错，交给页面的错误边界。空闲预热失败不重载，留到打开时再试。 */
import { t } from '../../i18n';

export interface RouteChunk<M> {
  /** 打开页面时装载这一页的模块。失败的那一次不记住，下次打开重试。 */
  preload(): Promise<M>;
  /** 已装载的模块；还没装上就抛错。 */
  get(): M;
}

const warmers: (() => Promise<unknown>)[] = [];
const RELOAD_KEY = 'peach.chunkReloadAt';
const RELOAD_WINDOW_MS = 30_000;

async function recoverStaleBuild(): Promise<void> {
  try {
    const last = Number(sessionStorage.getItem(RELOAD_KEY) || 0);
    if (Date.now() - last < RELOAD_WINDOW_MS) return;
    const health = await fetch('/healthz', { cache: 'no-store', credentials: 'same-origin' });
    if (!health.ok) return;
    sessionStorage.setItem(RELOAD_KEY, String(Date.now()));
    location.reload();
  } catch {
    // 服务端连不上或存储不可用：不重载，错误交给调用方。
  }
}

export function routeChunk<M>(load: () => Promise<M>): RouteChunk<M> {
  let loaded: { module: M } | null = null;
  let pending: Promise<M> | null = null;
  const attempt = (): Promise<M> => pending ??= load().then(
    (module) => { loaded = { module }; return module },
    (error: unknown) => { pending = null; throw error },
  );
  warmers.push(attempt);
  return {
    preload: () => attempt().catch(async (error: unknown) => { await recoverStaleBuild(); throw error }),
    get: () => {
      if (!loaded) throw new Error(t('shell:router.chunkNotLoaded'));
      return loaded.module;
    },
  };
}

/** 立刻装载全部低频页。直接调用路由表 `page()` 而不经首屏取数的地方（组件测试）先等它。 */
export function loadRouteChunks(): Promise<void> {
  return Promise.all(warmers.map(warm => warm())).then(() => {});
}

/** 首屏稳定后在浏览器空闲时逐个装载全部低频页，之后第一次进入这些页面不再等代码。没有
 *  `requestIdleCallback` 的环境不预热，打开时照常装载。 */
export function warmRouteChunks(): void {
  const idle = globalThis.requestIdleCallback;
  if (typeof idle !== 'function') return;
  const queue = [...warmers];
  const next = () => {
    const warm = queue.shift();
    if (warm) idle(() => { void warm().catch(() => {}).finally(next) }, { timeout: 10_000 });
  };
  if (document.readyState === 'complete') next();
  else window.addEventListener('load', next, { once: true });
}
