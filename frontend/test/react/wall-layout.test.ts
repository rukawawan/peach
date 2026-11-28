import { describe, expect, it } from 'vitest';
import { clampWall, finiteWallFilters, finiteWallTile, visibleWallTiles, wallExtent, wallHasCover, wallTileAt, WallExploration } from '../../src/react/video-wall/wall-layout';
import { packWallTiles } from '../../src/react/video-wall/wall-packing';

const view = { width: 1280, height: 720 };
const camera = { x: 16, y: 16, scale: 1 };
describe('二维播放墙', () => {
  it('混合宽窄封面以原比例排紧并保持作品实例键', () => {
    const block = visibleWallTiles(12, true, camera, view, true).filter(tile => tile.key.startsWith('0:0:'));
    const ratios = [.7, 1.48, 1.78, 1.48, .75, 1.6, 1.48, 1.48, .7, 1.78, 1.3, 1.48];
    const packed = packWallTiles(block, new Map(), tile => ratios[tile.index]!);
    expect(packed.map(tile => tile.key)).toEqual(block.map(tile => tile.key));
    for (const tile of packed) expect(tile.width / tile.height).toBeCloseTo(ratios[tile.index]!);
    const neighbors = packed.slice(1).flatMap((tile, index) => {
      const previous = packed[index]!;
      return tile.y === previous.y ? [tile.x - previous.x - previous.width] : [];
    });
    expect(neighbors.length).toBeGreaterThan(4);
    for (const gap of neighbors) {
      expect(gap).toBeGreaterThanOrEqual(31.99);
      expect(gap).toBeLessThanOrEqual(48.01);
    }
    const filled = packed.reduce((sum, tile) => sum + tile.width * tile.height, 0);
    const { width, height } = wallExtent(12);
    expect(filled / (width * height)).toBeGreaterThan(.64);
  });
  it('相邻分块将纵向余量分摊到各行，交界处不积成空带', () => {
    const visible = visibleWallTiles(12, false, camera, { ...view, height: 1500 }, true);
    const blocks = visible.filter(tile => /^(0:0|0:1):/.test(tile.key));
    const placed = packWallTiles(blocks, new Map(), () => 1.48);
    const upper = placed.filter(tile => tile.key.startsWith('0:0:'));
    const lower = placed.filter(tile => tile.key.startsWith('0:1:'));
    const gap = Math.min(...lower.map(tile => tile.y)) - Math.max(...upper.map(tile => tile.y + tile.height));
    expect(gap).toBeGreaterThanOrEqual(31.9);
    expect(gap).toBeLessThan(84);
  });
  it('封面显示后，迟到图片与续页只填原有位置', () => {
    const block = visibleWallTiles(12, true, camera, view, true).filter(tile => tile.key.startsWith('0:0:'));
    const slots = block.map(tile => tile.index === 2 ? { ...tile, index: -1 } : tile);
    const placements = new Map();
    expect(packWallTiles(slots, placements, tile => tile.index === 1 ? undefined : 1.48)
      .every(tile => tile.preparing)).toBe(true);
    const shown = packWallTiles(slots, placements, tile => tile.index === 1 ? .7 : 1.48);
    expect(shown.some(tile => tile.preparing)).toBe(false);
    expect(packWallTiles(block, placements, () => 2.6))
      .toEqual(shown.map((tile, index) => ({ ...tile, index })));
  });
  it('探索作品按四向浏览顺序分配，返回已有位置和续页均保持身份与几何', () => {
    const pool = new WallExploration(), positions = new Map<string, number>();
    for (const point of [camera, { x:3000,y:0 },{ x:3000,y:3000 },{ x:-3000,y:3000 },{ x:-3000,y:-3000 }]) {
      const visible = visibleWallTiles(12, false, { ...camera,x:point.x,y:point.y }, view);
      for (const tile of pool.assign(visible, 200, true)) {
        if (positions.has(tile.key)) expect(tile.index).toBe(positions.get(tile.key));
        else { expect([...positions.values()]).not.toContain(tile.index); positions.set(tile.key, tile.index) }
        expect(pool.tile(tile.key, 400)).toEqual(tile);
      }
    }
    expect(pool.size).toBeGreaterThan(60);
    const returned = pool.assign(visibleWallTiles(12, false, camera, view), 400, true);
    for (const tile of returned) expect(tile.index).toBe(positions.get(tile.key));
  });
  it('未取得下一页时保留待填磁贴，范围耗尽后才循环', () => {
    const pool = new WallExploration(), visible = visibleWallTiles(12, false, camera, view);
    const first = pool.assign(visible, 3, true);
    expect(first.filter(tile => tile.index >= 0)).toHaveLength(3);
    expect(first.some(tile => tile.index === -1)).toBe(true);
    const next = pool.assign(visible, 40, true);
    expect(new Set(next.map(tile => tile.index)).size).toBe(next.length);
    expect(next.slice(0, 3)).toEqual(first.slice(0, 3));
    const ended = new WallExploration().assign(visible, 3, false);
    expect(ended.every(tile => tile.index >= 0 && tile.index < 3)).toBe(true);
    expect(new WallExploration().assign(visible, 0, false).every(tile => tile.index === -1)).toBe(true);
  });
  it('队列可定位未展示作品，后续分配不会再次使用它；换批优先使用新增页', () => {
    const pool = new WallExploration(), point = { x:-2500,y:1800 };
    const chosen = pool.nearest(100, 77, point)!;
    expect(chosen.index).toBe(77);
    expect(pool.nearest(140, 77, point)).toEqual(chosen);
    pool.prefer(100);
    const tiles = pool.assign(visibleWallTiles(12, false, camera, view), 140, true);
    expect(tiles[0]!.index).toBe(100);
    expect(tiles.map(tile => tile.index)).not.toContain(77);
  });
  it('只有有封面引用的视频进入墙，缩略图不能替代资格', () => {
    expect(wallHasCover({ id:1, is_jav:true, code:'PCH-001', has_cover:true })).toBe(true);
    expect(wallHasCover({ id:2, cover_key:'custom', has_cover:true })).toBe(true);
    expect(wallHasCover({ id:3, has_cover:false, has_thumb:true })).toBe(false);
    expect(wallHasCover({ id:4, has_cover:true })).toBe(false);
    expect(wallHasCover({ id:5, has_cover:true, code:'PCH-005', medium:'photo' })).toBe(false);
  });
  it('空集合不产生磁贴', () => {
    expect(visibleWallTiles(0, false, camera, view)).toEqual([]);
  });
  it('有限墙队列选择保留唯一位置', () => {
    expect(finiteWallTile(0, 0)).toBeNull();
    expect(finiteWallTile(25, 17)).toEqual(wallTileAt(25, true, '1:0:5'));
  });
  it('探索墙在正负两个方向都循环，实例键唯一', () => {
    for (const position of [-100_000, -3000, 16, 3000, 100_000]) {
      const tiles = visibleWallTiles(25, false, { ...camera, x: position, y: -position }, view);
      expect(tiles.length).toBeGreaterThan(0);
      expect(new Set(tiles.map(tile => tile.key)).size).toBe(tiles.length);
      expect(tiles.every(tile => tile.index >= 0 && tile.index < 25)).toBe(true);
    }
  });
  it('有限墙里每个条目只有一个位置，续页不移动已有条目', () => {
    const huge = { width: 3000, height: 3000 };
    const first = visibleWallTiles(17, true, camera, huge);
    const next = visibleWallTiles(53, true, camera, huge);
    expect(first.length).toBe(17);
    expect(new Set(next.map(tile => tile.index)).size).toBe(next.length);
    for (const tile of first) expect(next.find(other => other.index === tile.index)).toEqual(tile);
  });
  it('只有视口附近的磁贴进入渲染，数量不随馆藏增长', () => {
    expect(visibleWallTiles(80_000, true, camera, view).length).toBeLessThan(100);
    expect(visibleWallTiles(80_000, false, camera, view).length).toBeLessThan(100);
  });
  it('有限墙阻止拖向空白，内容小于屏幕时锁定起点', () => {
    expect(clampWall({ ...camera, x: 4000, y: 4000 }, view, wallExtent(12), true)).toEqual(camera);
    const clamped = clampWall({ ...camera, x: -1e8, y: -1e8 }, view, wallExtent(49), true);
    expect(clamped.x).toBe(view.width - wallExtent(49).width - 16);
    expect(clamped.y).toBe(view.height - wallExtent(49).height - 16);
    expect(clampWall({ ...camera, x: -1e8 }, view, wallExtent(49), false).x).toBe(-1e8);
  });
  it('探索磁贴几何不随取数增长改变', () => {
    for (const key of ['-2:3:0','3:-2:4','8:6:11']) {
      const { index:_, ...first } = wallTileAt(12, false, key)!;
      const { index:__, ...next } = wallTileAt(1800, false, key)!;
      expect(next).toEqual(first);
    }
  });
  it('检索、实体条件、状态和时长使用有限墙，默认来源与 JAV 语境仍可探索', () => {
    for (const key of ['q','performer','series','creator','studio','owner','tag','state','orient','len','dur_min','dur_max','region']) {
      expect(finiteWallFilters({ [key]: 'value' })).toBe(true);
    }
    expect(finiteWallFilters({ jav: '1', loc: 'local', sort: 'seed' })).toBe(false);
  });
});
