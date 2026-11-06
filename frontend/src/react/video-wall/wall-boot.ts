import { visibleWallTiles } from './wall-layout';

/** 冷启动直达 `/wall` 时，React 墙要等目录元素和首屏数据才挂上，中间有几秒空档。壳先按墙自己
 *  读取中的那份几何铺一层同样的骨架（镜头原点、窄屏 0.68 倍），墙挂上时摘掉，交接处磁贴不跳。 */
export function paintWallBootSkeleton(): void {
  if (document.querySelector('[data-wall-boot]')) return;
  const scale = innerWidth < 640 ? .68 : 1;
  const host = document.createElement('div');
  host.className = 'peach-react'; host.dataset.wallBoot = '';
  host.innerHTML = '<div data-video-wall="" data-fullscreen=""><div data-wall-viewport="" data-skeleton="wall" role="status" aria-busy="true" aria-label="正在读取播放墙">'
    + `<div data-wall-world="" style="transform:translate3d(0px, 0px, 0) scale(${scale})"></div></div></div>`;
  document.body.append(host);
  const viewport = host.querySelector<HTMLElement>('[data-wall-viewport]')!.getBoundingClientRect();
  host.querySelector('[data-wall-world]')!.innerHTML = visibleWallTiles(12, false, { x: 0, y: 0, scale }, viewport)
    .map(tile => `<span data-wall-skeleton="" aria-hidden="true" style="--wall-left:${tile.x}px;--wall-top:${tile.y}px;--wall-width:${tile.width}px;--wall-height:${tile.height}px"></span>`)
    .join('');
}

export function removeWallBootSkeleton(): void {
  document.querySelectorAll('[data-wall-boot]').forEach(node => node.remove());
}
