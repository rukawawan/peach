/* 浏览器异常只记录到当前 Peach 主机。失败不再生成新的错误请求。 */
import { browserDiagnostics, detailedBrowserDiagnostics, playbackDiagnostics } from './browser-diagnostics';
import { t } from './i18n';
let installed = false;
const errorNames = new Set(['Error', 'TypeError', 'RangeError', 'ReferenceError', 'SyntaxError', 'URIError', 'EvalError', 'AggregateError', 'DOMException']);
/* 正式包的文件名：主包入口、页面包与主包按页拆出的 chunk（ADR-0118），与服务端 `diagnostic_browser.SHIPPED` 同一口径。 */
const shippedName = /^(?:peach-pages\.js|peach-app(?:\.[A-Za-z0-9_-]+)?\.js)$/;
const shippedInStack = /(?:^|[/\\])(peach-pages\.js|peach-app(?:\.[A-Za-z0-9_-]+)?\.js)(?=[:?#)\s]|$)/m;
const debugIdPattern = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;

function bundleDebugIds(): Record<string, string> {
  const globals = globalThis as typeof globalThis & { _sentryDebugIds?: Record<string, unknown> };
  const ids: Record<string, string> = {};
  // 官方注入的 stack 只在本机用于识别文件名；请求不携带这份 stack 或其中的 URL。最上面那一帧就是注入它的文件。
  for (const [stack, id] of Object.entries(globals._sentryDebugIds ?? {})) {
    if (typeof id !== 'string' || !debugIdPattern.test(id)) continue;
    const name = stack.match(shippedInStack)?.[1];
    if (name) ids[name] = id;
  }
  return ids;
}

export function installErrorReporting(): void {
  if (installed || typeof window === 'undefined') return;
  installed = true;
  if (!/^\/(?:login|setup)(?:\/|$)/.test(location.pathname)) {
    void detailedBrowserDiagnostics().then(browser => fetch('/api/diagnostics/client-error', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin',
      body: JSON.stringify({ kind: 'context', message: t('shell:errorReport.browserSnapshot'), browser }),
    })).catch(() => {});
  }
  let start = Date.now();
  let count = 0;
  const seen = new Set<string>();
  const send = (kind: string, cause: unknown, fallback = '', source?: ErrorEvent, playback?: ReturnType<typeof playbackDiagnostics>) => {
    const rawName = cause instanceof Error || cause instanceof DOMException ? cause.name : '';
    if (rawName === 'AbortError') return;
    const errorName = errorNames.has(rawName) ? rawName : cause instanceof DOMException ? 'DOMException' : 'Error';
    if (Date.now() - start >= 60_000) {
      start = Date.now(); count = 0; seen.clear();
    }
    if (count >= 10) return;
    const message = (cause instanceof Error ? cause.message : typeof cause === 'string' ? cause : fallback).slice(0, 2000);
    if (!message) return;
    const stack = cause instanceof Error ? (cause.stack ?? '').slice(0, 6000) : '';
    const key = `${kind}:${message}:${stack}:${playback?.asset_id ?? ''}`;
    if (seen.has(key)) return;
    seen.add(key); count += 1;
    void fetch('/api/diagnostics/client-error', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ kind, message, stack, error_name: errorName, page: window.location.pathname,
        browser: browserDiagnostics(), playback,
        bundle_debug_ids: bundleDebugIds(),
        source_file: [source?.filename?.split('/').pop()?.split(/[?#]/)[0] ?? ''].find(name => shippedName.test(name)),
        line: source?.lineno, column: source?.colno }), credentials: 'same-origin', keepalive: true,
    }).catch(() => {});
  };
  window.addEventListener('error', event => send('error', event.error, event.message, event));
  window.addEventListener('unhandledrejection', event => send('unhandledrejection', event.reason, t('shell:errorReport.unhandledRejection')));
  document.addEventListener('error', event => {
    const target = event.target;
    const video = target instanceof HTMLMediaElement ? target
      : target instanceof HTMLElement && target.matches('hlsjs-video,dash-video') ? target.querySelector('video') : null;
    const failure = (target as (HTMLElement & { error?: unknown }) | null)?.error || (event as ErrorEvent).error;
    if (!video || !failure) return;
    const evidence = playbackDiagnostics(video, failure);
    send('media', t('shell:errorReport.mediaPlaybackFailed', { code: evidence.code }), '', undefined, evidence);
  }, true);
}
