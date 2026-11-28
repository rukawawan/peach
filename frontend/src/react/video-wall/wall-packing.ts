import type { WallTile } from './wall-layout';

const COVER_GAP = 32;
const BLOCK_INSET = 13;
export const WALL_FALLBACK_ASPECT = 1.48;
export type WallPlacement = WallTile & { preparing?: boolean };

function partitions(count: number): number[][] {
  if (count < 6) return [Array.from({ length: Math.ceil(count / 3) }, (_, i) => Math.min(3, count - i * 3))];
  const choices: number[][] = [];
  const append = (left: number, rows: number[]) => {
    if (!left) { choices.push(rows); return; }
    for (let span = 2; span <= Math.min(6, left); span++) {
      append(left - span, [...rows, span]);
    }
  };
  append(count, []);
  return choices;
}

const arrangements = Array.from({ length: 13 }, (_, count) => partitions(count));

/** 封面显示前确定整块的坐标。续页或迟到的图片只填入原有位置。 */
export function packWallTiles(tiles: readonly WallTile[], packed: Map<string, WallTile[]>,
  aspect: (tile: WallTile) => number | undefined): WallPlacement[] {
  const blocks = new Map<string, WallTile[]>();
  for (const tile of tiles) {
    const key = tile.key.slice(0, tile.key.lastIndexOf(':'));
    const block = blocks.get(key);
    if (block) block.push(tile);
    else blocks.set(key, [tile]);
  }
  return [...blocks].flatMap(([key, block]) => {
    const previous = packed.get(key);
    if (previous?.length === block.length) {
      return previous.map((tile, index) => ({ ...tile, index: block[index]!.index }));
    }
    const aspects = block.map(tile => tile.index < 0 ? WALL_FALLBACK_ASPECT : aspect(tile));
    if (!aspects.every((ratio): ratio is number => ratio !== undefined)) {
      return packBlock(block, block.map(() => WALL_FALLBACK_ASPECT)).map(tile => ({ ...tile, preparing: true }));
    }
    const placed = packBlock(block, aspects);
    // 候补位都还没有作品时，等到这一块真的开始显示封面再定比例。
    if (block.some(tile => tile.index >= 0)) packed.set(key, placed);
    return placed;
  });
}

function packBlock(block: readonly WallTile[], aspects: readonly number[]): WallTile[] {
  const left = Math.min(...block.map(tile => tile.x)) + BLOCK_INSET;
  const top = Math.min(...block.map(tile => tile.y)) + BLOCK_INSET;
  const width = Math.max(...block.map(tile => tile.x + tile.width)) - left - BLOCK_INSET;
  const height = Math.max(...block.map(tile => tile.y + tile.height)) - top - BLOCK_INSET;
  const ratios = aspects.map(aspect => Math.min(3, Math.max(.45, aspect)));
  const candidates = arrangements[block.length]!.map(counts => {
    let start = 0;
    const rows = counts.map(count => {
      const sum = ratios.slice(start, start + count).reduce((a, b) => a + b);
      const row = { start, count, height: (width - COVER_GAP * (count - 1)) / sum };
      start += count;
      return row;
    });
    const totalHeight = rows.reduce((sum, row) => sum + row.height, 0);
    const available = height - COVER_GAP * (rows.length - 1);
    const scale = Math.min(1, available / totalHeight);
    const density = totalHeight * scale ** 2 / available;
    const balance = Math.min(...rows.map(row => row.height)) / Math.max(...rows.map(row => row.height));
    return { rows, scale, score: density + balance * .65 };
  });
  const best = candidates.reduce((a, b) => a.score >= b.score ? a : b);
  const usedHeight = best.rows.reduce((sum, row) => sum + row.height * best.scale, 0) + COVER_GAP * (best.rows.length - 1);
  // 把分块余量匀到各行的间隙，避免两块墙面交界处出现整条空带。
  const extraY = block.length >= 6 ? Math.max(0, height - usedHeight) / best.rows.length : 0;
  let y = top + extraY / 2;
  return best.rows.flatMap(row => {
    const rowHeight = row.height * best.scale;
    const coverWidth = (width - COVER_GAP * (row.count - 1)) * best.scale;
    const spare = Math.max(0, width - coverWidth - COVER_GAP * (row.count - 1));
    const extraX = Math.min(COVER_GAP / 2, spare / row.count);
    let x = left + (row.count === block.length && block.length < 6 ? 0 : (spare - extraX * (row.count - 1)) / 2);
    const packed = block.slice(row.start, row.start + row.count).map((tile, index) => {
      const tileWidth = ratios[row.start + index]! * rowHeight;
      const result = { ...tile, x, y, width: tileWidth, height: rowHeight };
      x += tileWidth + COVER_GAP + extraX;
      return result;
    });
    y += rowHeight + COVER_GAP + extraY;
    return packed;
  });
}
