const EXCLUDED = [
  '[data-peach-feedback]', '[data-modal-motion]:has([data-feedback-surface])', '[data-copy-editor]', '[data-copy-bar]',
  'input:not([type=checkbox], [type=radio], [type=range], [type=button], [type=submit], [type=reset])',
  'textarea', '[contenteditable=true]', 'video', 'iframe',
].join(', ');
export const IMAGE_LIMIT = 4;
export const IMAGE_BYTES = 4 * 1024 * 1024;
const IMAGE_EDGE = 4096;
const DESKTOP_CAPTURE = 'peach:feedback-capture:';
const MAC_CAPTURE_REPLY = 'peach:feedback-capture-reply';

export interface FeedbackImage { blob: Blob; width: number; height: number }

type WebViewMessageHandler = { postMessage(message: string): void };
type DesktopCaptureHost = {
  send(message: string): void;
  listen(receive: (payload: unknown) => void): () => void;
};

export function desktopCaptureHost(): DesktopCaptureHost | undefined {
  const desktop = window as Window & {
    peachDesktopFeedbackCapture?: boolean;
    chrome?: { webview?: EventTarget & WebViewMessageHandler };
    webkit?: { messageHandlers?: { peachFeedbackCapture?: WebViewMessageHandler } };
  };
  if (!desktop.peachDesktopFeedbackCapture) return;
  const edge = desktop.chrome?.webview;
  const webkit = desktop.webkit?.messageHandlers?.peachFeedbackCapture;
  if (!edge && !webkit) return;
  const target = edge ?? window;
  const eventName = edge ? 'message' : MAC_CAPTURE_REPLY;
  return {
    send: message => (edge ?? webkit)!.postMessage(message),
    listen(receive) {
      const listener = (event: Event) => receive(edge ? (event as MessageEvent).data : (event as CustomEvent).detail);
      target.addEventListener(eventName, listener);
      return () => target.removeEventListener(eventName, listener);
    },
  };
}

function toBlob(canvas: HTMLCanvasElement, type: string, quality?: number): Promise<Blob | null> {
  return new Promise(resolve => canvas.toBlob(resolve, type, quality));
}

export async function encodeCanvas(canvas: HTMLCanvasElement, lossless: boolean): Promise<FeedbackImage> {
  let blob = lossless ? await toBlob(canvas, 'image/png') : null;
  if (!blob?.size || blob.size > IMAGE_BYTES) blob = await toBlob(canvas, 'image/jpeg', 0.92);
  if (blob && blob.size > IMAGE_BYTES) blob = await toBlob(canvas, 'image/jpeg', 0.8);
  if (!blob?.size || blob.size > IMAGE_BYTES) throw new Error();
  return { blob, width: canvas.width, height: canvas.height };
}

function drawImage(image: CanvasImageSource, width: number, height: number): HTMLCanvasElement {
  if (!width || !height) throw new Error();
  const scale = Math.min(1, IMAGE_EDGE / Math.max(width, height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(width * scale));
  canvas.height = Math.max(1, Math.round(height * scale));
  const context = canvas.getContext('2d', { alpha: false });
  if (!context) throw new Error();
  context.fillStyle = 'white';
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  return canvas;
}

type TabCaptureDevices = MediaDevices & {
  setCaptureHandleConfig?: (config: { handle?: string; permittedOrigins: string[] }) => void;
};
type TabCaptureTrack = MediaStreamTrack & { getCaptureHandle?: () => { handle: string } | null };
type TabCaptureOptions = DisplayMediaStreamOptions & {
  preferCurrentTab: boolean;
  monitorTypeSurfaces: 'exclude';
  surfaceSwitching: 'exclude';
};

export class WrongFeedbackTab extends Error {}
let activeTabHandle: string | undefined;

export function canCaptureFeedbackTab(): boolean {
  const devices = navigator.mediaDevices as TabCaptureDevices | undefined;
  return typeof devices?.getDisplayMedia === 'function' && typeof devices.setCaptureHandleConfig === 'function'
    && typeof (MediaStreamTrack.prototype as TabCaptureTrack).getCaptureHandle === 'function'
    && typeof HTMLVideoElement.prototype.requestVideoFrameCallback === 'function';
}

export async function captureFeedbackTab(
  signal: AbortSignal, onAuthorized: () => void, showPageOnly: (onlyPage: boolean) => void,
): Promise<FeedbackImage> {
  const devices = navigator.mediaDevices as TabCaptureDevices;
  const handle = crypto.randomUUID();
  const viewport = window.visualViewport;
  const dpr = window.devicePixelRatio * (viewport?.scale ?? 1);
  const viewportWidth = (viewport?.width ?? innerWidth) * dpr;
  const viewportHeight = (viewport?.height ?? innerHeight) * dpr;
  const scale = Math.min(1, IMAGE_EDGE / Math.max(viewportWidth, viewportHeight));
  const width = Math.round(viewportWidth * scale);
  const height = Math.round(viewportHeight * scale);
  const options: TabCaptureOptions = {
    audio: false,
    video: {
      displaySurface: 'browser',
      width: { ideal: width },
      height: { ideal: height },
    },
    preferCurrentTab: true,
    monitorTypeSurfaces: 'exclude',
    surfaceSwitching: 'exclude',
  };
  const video = document.createElement('video');
  video.muted = true;
  video.playsInline = true;
  let stream: MediaStream | undefined;
  let canvas: HTMLCanvasElement;
  const stopSharing = () => stream?.getTracks().forEach(track => track.stop());
  devices.setCaptureHandleConfig!({ handle, permittedOrigins: [location.origin] });
  activeTabHandle = handle;
  signal.addEventListener('abort', stopSharing, { once: true });
  try {
    stream = await devices.getDisplayMedia(options);
    signal.throwIfAborted();
    const track = stream.getVideoTracks()[0] as TabCaptureTrack | undefined;
    if (track?.getCaptureHandle?.()?.handle !== handle) throw new WrongFeedbackTab();
    onAuthorized();
    video.srcObject = stream;
    await new Promise<void>((resolve, reject) => {
      let frame: number;
      let settle: number | undefined;
      function done(error?: unknown) {
        window.clearTimeout(timeout);
        window.clearTimeout(settle);
        video.cancelVideoFrameCallback(frame);
        if (error) reject(error);
        else resolve();
      }
      function frameReady() {
        // Chrome may send a CSS-pixel frame before switching to the viewport's device pixels.
        if (video.videoWidth >= width - 2 && video.videoHeight >= height - 2) {
          done();
          return;
        }
        settle ??= window.setTimeout(() => done(), 650);
        frame = video.requestVideoFrameCallback(frameReady);
      }
      const timeout = window.setTimeout(() => done(new Error('Tab did not produce a frame')), 5000);
      frame = video.requestVideoFrameCallback(frameReady);
      void video.play().catch(done);
    });
    // Let the size settle with the feedback dialog visible. Hide it only while reading a new frame.
    signal.throwIfAborted();
    showPageOnly(true);
    await new Promise<void>((resolve, reject) => {
      let frame: number;
      let paint: number;
      const timeout = window.setTimeout(() => {
        window.cancelAnimationFrame(paint);
        video.cancelVideoFrameCallback(frame);
        reject(new Error('No clean tab frame'));
      }, 360);
      paint = window.requestAnimationFrame(() => {
        paint = window.requestAnimationFrame(paintedAt => {
          let delivered = 0;
          function receive(_now: number, metadata: VideoFrameCallbackMetadata) {
            // A decoded frame can arrive after the sheet was hidden but have been captured earlier.
            const fresh = metadata.captureTime === undefined ? ++delivered >= 2 : metadata.captureTime >= paintedAt;
            if (!fresh) {
              frame = video.requestVideoFrameCallback(receive);
              return;
            }
            window.clearTimeout(timeout);
            resolve();
          }
          frame = video.requestVideoFrameCallback(receive);
        });
      });
    });
    signal.throwIfAborted();
    if (track?.getCaptureHandle?.()?.handle !== handle) throw new WrongFeedbackTab();
    canvas = drawImage(video, video.videoWidth, video.videoHeight);
  } finally {
    signal.removeEventListener('abort', stopSharing);
    stopSharing();
    video.pause();
    video.srcObject = null;
    if (activeTabHandle === handle) {
      devices.setCaptureHandleConfig!({ permittedOrigins: [] });
      activeTabHandle = undefined;
    }
    if (!signal.aborted) showPageOnly(false);
  }
  return encodeCanvas(canvas, true);
}

export function warmPageCapture(): void {
  if (!desktopCaptureHost() && !canCaptureFeedbackTab()) void import('@zumer/snapdom').catch(() => {});
}

export async function capturePage(): Promise<FeedbackImage> {
  const { snapdom } = await import('@zumer/snapdom');
  const root = document.fullscreenElement ?? document.documentElement;
  const viewport = window.visualViewport;
  const longest = Math.max(viewport?.width ?? window.innerWidth, viewport?.height ?? window.innerHeight);
  const dpr = (window.devicePixelRatio || 1) * (viewport?.scale ?? 1);
  const rootColor = getComputedStyle(root).backgroundColor;
  // The document's canvas paints the body color across the viewport even when the body is short.
  const backgroundColor = root === document.documentElement && rootColor === 'rgba(0, 0, 0, 0)'
    ? getComputedStyle(document.body).backgroundColor : rootColor;
  const canvas = await snapdom.toCanvas(root, {
    clip: 'viewport', backgroundColor, exclude: EXCLUDED,
    dpr: Math.min(dpr, IMAGE_EDGE / Math.ceil(longest)), fast: false,
  });
  return encodeCanvas(canvas, true);
}

export async function captureDesktopViewport(
  host: DesktopCaptureHost, frameReady: () => void, formPainted: Promise<boolean>,
): Promise<FeedbackImage> {
  const request = `${DESKTOP_CAPTURE}${crypto.randomUUID()}`;
  const reply = `${request}:`;
  const content = await new Promise<string>((resolve, reject) => {
    function cleanup() {
      window.clearTimeout(frameTimeout);
      window.clearTimeout(imageTimeout);
      stopListening();
    }
    function receive(payload: unknown) {
      if (typeof payload !== 'string' || !payload.startsWith(reply)) return;
      const content = payload.slice(reply.length);
      window.clearTimeout(frameTimeout);
      frameReady();
      if (content === 'frame') return;
      cleanup();
      if (content) resolve(content);
      else reject(new Error('WebView screenshot failed'));
    }
    const timedOut = () => {
      cleanup();
      reject(new Error('WebView screenshot timed out'));
    };
    const frameTimeout = window.setTimeout(timedOut, 500);
    const imageTimeout = window.setTimeout(timedOut, 8000);
    const stopListening = host.listen(receive);
    try {
      host.send(request);
    } catch (error) {
      cleanup();
      reject(error);
    }
  });
  if (!await formPainted) throw new Error('Feedback closed');
  const binary = atob(content);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  const frame = new Blob([bytes], { type: content.startsWith('/9j/') ? 'image/jpeg' : 'image/png' });
  const image = await createImageBitmap(frame);
  try {
    if (frame.size <= IMAGE_BYTES && Math.max(image.width, image.height) <= IMAGE_EDGE) {
      return { blob: frame, width: image.width, height: image.height };
    }
    return await encodeCanvas(drawImage(image, image.width, image.height), false);
  } finally {
    image.close();
  }
}

export async function prepareImage(file: File): Promise<FeedbackImage> {
  if (file.size > 20 * 1024 * 1024) throw new Error();
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    return await encodeCanvas(drawImage(image, image.naturalWidth, image.naturalHeight), file.type === 'image/png');
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function encodeImage(image: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(',', 2)[1]);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(image);
  });
}
