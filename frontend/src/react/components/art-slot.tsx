/* 卡片封面格里那张图（`[data-media-art]`）。
 *
 * 图是遗留层拼的 HTML 片段，加载后壳在同一个 `<img>` 上改取景、把派生档换成原件（见
 * `../catalog-grid/artwork.ts`）。大图、小图拼出的片段只差取景类名，按片段整段重写就是把
 * 每张图都换成新元素：派生档重新解码、取景等 `load` 才重算，整屏一起闪一下。所以按
 * `identity`（同一条作品按小图拼出的片段）认图：身份不变时留着上一段片段，版式交给
 * `relayout` 在同一张图上换，换了图才整段重写。 */
import { useLayoutEffect, useRef, useState } from 'react';

/* 片段里的图不经 React，`onError` 挂不上；`onFailed` 在格子上按捕获阶段接住子图的 `error`，
   交出取失败的那个地址。 */
export function ArtSlot({ artwork, identity = artwork.html, relayout, onFailed }: {
  artwork: { kind: string; html: string };
  identity?: string;
  relayout?(root: HTMLElement): void;
  onFailed?(src: string): void;
}) {
  const [kept, keep] = useState({ identity, artwork });
  if (kept.identity !== identity) keep({ identity, artwork });
  const shown = kept.identity === identity ? kept.artwork : artwork;
  const slot = useRef<HTMLSpanElement>(null);
  const latest = useRef(relayout);
  latest.current = relayout;
  // 片段一变就交给壳比对：它按图上记着的版式判断，同一版式什么都不做。
  useLayoutEffect(() => {
    if (slot.current) latest.current?.(slot.current);
  }, [artwork.html]);
  const failed = useRef(onFailed);
  failed.current = onFailed;
  useLayoutEffect(() => {
    const node = slot.current;
    if (!node) return;
    const listen = (event: Event) => {
      if (event.target instanceof HTMLImageElement) failed.current?.(event.target.getAttribute('src') || '');
    };
    node.addEventListener('error', listen, true);
    return () => node.removeEventListener('error', listen, true);
  }, []);
  return <span ref={slot} data-media-art={shown.kind} dangerouslySetInnerHTML={{ __html: shown.html }} />;
}
