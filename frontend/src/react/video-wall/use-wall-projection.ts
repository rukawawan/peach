import { useLayoutEffect } from 'react';
import { wallDepthTransform } from './wall-depth';
import type { useWallCamera } from './use-wall-camera';
import type { WallTile } from './wall-layout';

/** 复用镜头已经计算的坐标。拖动时只写投影层，不读取磁贴几何。 */
export function useWallProjection(camera: ReturnType<typeof useWallCamera>, tiles: readonly WallTile[], enabled: boolean) {
  useLayoutEffect(() => {
    const layer = camera.world.current;
    if (!enabled || !layer) return;
    const slots = new Map(tiles.map(tile => [tile.key, tile]));
    const surfaces = Array.from(layer.querySelectorAll<HTMLElement>('[data-wall-surface]'), node => ({
      node, tile: slots.get(node.parentElement!.dataset.wallSlot!),
    }));
    const paint: NonNullable<typeof camera.projection.current> = (view, size) => {
      if (!size.width || !size.height) return;
      for (const { node, tile } of surfaces) {
        if (!tile) continue;
        const x = view.x + (tile.x + tile.width / 2) * view.scale;
        const y = view.y + (tile.y + tile.height / 2) * view.scale;
        node.style.transform = wallDepthTransform(x, y, size, view.scale);
      }
    };
    camera.projection.current = paint;
    paint(camera.snapshot(), camera.view.size);
    return () => {
      camera.projection.current = null;
      for (const { node } of surfaces) node.style.removeProperty('transform');
    };
  });
}
