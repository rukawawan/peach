import { memo, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useDatalistSuggest } from '../search/datalist-suggest';
import { librarySuggest } from '../search/library-suggest';
import { useQuery } from '@tanstack/react-query';
import { AnimatePresence, motion, useIsPresent, useReducedMotion } from 'motion/react';
import { FocusScope } from 'react-aria/FocusScope';
import { cardArtwork } from '@peach/card-art';
import { fmtDur, requestErrorMessage } from '@peach/legacy/core';
import { setActionBusy, spinnerHtml } from '@peach/legacy/ui';
import { isOverlayPath, peachHistory } from '@peach/history';
import { Button } from '@/components/base/buttons/button';
import type { MediaCardActions, MediaCardHelpers, MediaItem } from '../catalog-grid/types';
import { Note } from '../components/note';
import { ArtSlot } from '../components/art-slot';
import { busyProps } from '../settings/busy-props';
import { useWallCamera } from './use-wall-camera';
import { useWallAtmosphere } from './use-wall-atmosphere';
import { useWallProjection } from './use-wall-projection';
import { finiteWallTile, visibleWallTiles, wallTilesInView, WallExploration, type WallCamera, type WallTile } from './wall-layout';
import { packWallTiles, WALL_FALLBACK_ASPECT, type WallPlacement } from './wall-packing';
import { chooseItem, editionLabel, fetchQueue, nextPart, partLabel, queueKey, type QueueItem, type QueueRef } from '../item-detail/item-detail';
import { WallControls } from './wall-controls';
import { WallDiscScene, WallOpticalDisc } from './wall-disc-scene';
import type { WallPageDirection } from './wall-motion';
import { WallQueue } from './wall-queue';
import { Shuffle } from '../entity-filter/entity-filter-page';
import { exitWall, unfilteredWallAddress } from './wall-route';
import { removeWallBootSkeleton } from './wall-boot';
import { t } from '../../i18n';
import './video-wall.css';

interface VideoWallProps {
  sessionKey: string;
  items: readonly MediaItem[];
  finite: boolean;
  hasMore: boolean;
  busy: boolean;
  loading?: boolean;
  error?: string;
  retry?(): void;
  emptyHtml?: string;
  loadMore(): Promise<void>;
  actions: MediaCardActions;
  helpers: MediaCardHelpers;
  javImage: string;
}

interface WallSession { camera: WallCamera; selectedId: number | null; selectedKey?: string; sourceId?: number | null; image: string; pool: string; exploration: WallExploration }
// 页面刷新代次不属于集合身份。只保存界面位置，不保存 Query 中的作品副本。
const wallSessions = new Map<string, WallSession>();

const wallArtworkKey = (id: number, image: string, ratio: number) => `${id}:${image}:${ratio < 1 ? 'front' : 'whole'}`;

const WallArtwork = memo(function WallArtwork({ item, image, big = false, ratio = 1, onAspect }: {
  item: MediaItem; image: string; big?: boolean; ratio?: number; onAspect?(key: string, aspect: number | null): void;
}) {
  const source = !item.is_jav && image === 'thumbnail' && item.has_thumb ? { ...item, has_cover: false } : item;
  // 窄格可用已取得的独立正封。共享素材回落为整图时，墙面同样完整显示。
  const artwork = cardArtwork(source, big || ratio >= 1 ? 'small' : 'big', true, image);
  const key = wallArtworkKey(item.id, image, ratio);
  const pic = useRef<HTMLSpanElement>(null);
  useLayoutEffect(() => {
    const img = pic.current?.querySelector('img');
    if (!onAspect) return;
    if (!img || img.complete) {
      onAspect(key, img?.naturalHeight ? img.naturalWidth / img.naturalHeight : null);
      return;
    }
    // 单张慢图不一直挡住整块墙。它后来到达时仍完整显示在原位。
    const timeout = setTimeout(() => onAspect(key, null), 1000);
    return () => clearTimeout(timeout);
  }, [artwork.html, key, onAspect]);
  return <span ref={pic} data-media-pic="" style={{ '--card-ratio':String(ratio) } as CSSProperties} onLoadCapture={event => {
    const img = event.target;
    if (img instanceof HTMLImageElement && img.naturalHeight) onAspect?.(key, img.naturalWidth / img.naturalHeight);
  }}>
    <ArtSlot artwork={artwork} onFailed={() => onAspect?.(key, null)} />
  </span>;
});

const WALL_SUGGEST = librarySuggest(['performer', 'creator', 'studio', 'series', 'tag', 'asset']);

function WallFocusDialog({ children, itemId, playing, covered, direction }: {
  children: ReactNode; itemId: number; playing: boolean; covered: boolean; direction: WallPageDirection | null;
}) {
  const present = useIsPresent();
  const reduce = useReducedMotion();
  // 改字工具的来源选择器挂在页面顶层，需要接住焦点。
  const editing = document.body.hasAttribute('data-peach-copy-mode');
  return <FocusScope contain={present && !covered && !editing}>
    <motion.div data-wall-focus="" data-wall-active-id={itemId} data-playing={playing || undefined}
      data-wall-page-direction={direction ?? undefined}
      data-wall-closing={!present || undefined} inert={!present} role="dialog" tabIndex={-1}
      aria-modal="true" aria-labelledby="wall-detail-title"
      exit={{ opacity:0 }} transition={{ duration:reduce ? 0 : .22 }}>
      {children}
    </motion.div>
  </FocusScope>;
}

/** 单一播放宿主常驻在墙内，视口裁剪只影响海报磁贴。 */
export function VideoWall({ items, finite, hasMore, busy, loading = false, error: queryError = '', retry, emptyHtml = '', loadMore, actions, helpers, javImage, sessionKey }: VideoWallProps) {
  const pool = String(items[0]?.id);
  const [session] = useState(() => {
    const saved = wallSessions.get(sessionKey);
    return saved && (loading || finite || saved.pool === pool) ? saved : undefined;
  });
  const [exploration] = useState(() => session?.exploration || new WallExploration());
  const moreFlight = useRef(false);
  const [freshFrom, setFreshFrom] = useState<number | null>(null);
  const root = useRef<HTMLDivElement>(null);
  const caption = useRef<HTMLDivElement>(null);
  const playerFrame = useRef<HTMLDivElement>(null);
  const detailContent = useRef<HTMLDivElement>(null);
  const openingCover = useRef<DOMRect | null>(null);
  const codeTitle = useRef<HTMLElement>(null);
  const releasePlayer = useRef<((continuePlaying?: boolean) => void) | null>(null);
  const controller = useRef<AbortController | null>(null);
  const [selected, setSelected] = useState<MediaItem | null>(() => items.find(item => item.id === session?.selectedId) || null);
  const [selectedKey, setSelectedKey] = useState(session?.selectedKey || '');
  const [sourceId, setSourceId] = useState<number | null>(session?.sourceId || null);
  const [pageDirection, setPageDirection] = useState<WallPageDirection | null>(null);
  const [queueOpen, setQueueOpen] = useState(false);
  const groupRef: QueueRef | null = selected?.edition_group
    ? { kind:'editions', seedId:selected.edition_group.seed_id }
    : selected?.part_group ? { kind:'parts', seedId:selected.part_group.seed_id } : null;
  const groupQuery = useQuery({ queryKey:queueKey(groupRef || { kind:'parts', seedId:0 }), enabled:!!groupRef,
    queryFn:({ signal }) => fetchQueue(groupRef!, { tagLabel:helpers.tagLabel,
      mixRelated:async () => [] }, signal),
  });
  const group = groupRef ? groupQuery.data : undefined;
  const activeItem = group?.items.find(item => item.id === chooseItem(group, sourceId || selected?.id || null)) || selected;
  const camera = useWallCamera(items.length, finite && !!items.length, session?.camera || { x: 0, y: 0, scale: innerWidth < 640 ? .68 : 1 });
  const reducedMotion = useReducedMotion();
  const [entranceDone, setEntranceDone] = useState(!!session);
  useEffect(() => {
    if (!items.length || entranceDone || reducedMotion) return;
    const timer = setTimeout(() => setEntranceDone(true), 1100);
    return () => clearTimeout(timer);
  }, [pool, entranceDone, reducedMotion]);
  const hoverable = matchMedia('(hover:hover) and (pointer:fine)').matches;
  const [playing, setPlaying] = useState<number | null>(null);
  const [pendingPlayback, setPendingPlayback] = useState<number | null>(null);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState('');
  const [moreError, setMoreError] = useState('');
  const [laterBusy, setLaterBusy] = useState(false);
  const [later, setLater] = useState<{ id: number; on: boolean } | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  // 墙上的搜索与顶栏搜的是同一批作品，候选也取同一个补全接口：人、厂牌、系列、标签与作品番号。
  const [searchText, setSearchText] = useState('');
  const searchSuggestions = useDatalistSuggest('wall', searchText, WALL_SUGGEST, searchOpen);
  const searchButton = useRef<HTMLButtonElement>(null);
  const [portal] = useState(() => {
    const node = document.createElement('div'); node.className = 'peach-react'; return node;
  });
  useLayoutEffect(() => {
    document.body.append(portal);
    removeWallBootSkeleton();
    camera.viewport.current?.focus({ preventScroll: true });
  }, [portal]);
  useEffect(() => () => portal.remove(), [portal]);
  const [covered, setCovered] = useState(() => isOverlayPath(peachHistory.navigation.location.pathname));
  const sceneReady = !covered && !loading && !!items.length && freshFrom === null;
  const curved = sceneReady;
  useWallAtmosphere(camera.viewport, caption, sceneReady);
  const [image, setImage] = useState(session?.image || javImage);
  const artAspects = useRef(new Map<string, number>());
  const packedBlocks = useMemo(() => new Map<string, WallTile[]>(), [image, pool, sessionKey]);
  const detailWall = useRef<{ tiles: WallPlacement[]; width: number; height: number } | null>(null);
  const aspectFrame = useRef(0);
  const [, commitAspects] = useState(0);
  const rememberAspect = useCallback((key: string, aspect: number | null) => {
    const previous = artAspects.current.get(key);
    if (previous !== undefined && (aspect === null || Math.abs(previous - aspect) < .01)) return;
    artAspects.current.set(key, aspect ?? WALL_FALLBACK_ASPECT);
    if (!aspectFrame.current) aspectFrame.current = requestAnimationFrame(() => {
      aspectFrame.current = 0;
      commitAspects(version => version + 1);
    });
  }, []);
  useEffect(() => () => cancelAnimationFrame(aspectFrame.current), []);
  const [hoveredKey, setHoveredKey] = useState('');
  const [focusedKey, setFocusedKey] = useState('');
  const tileFocus = useRef<{ key: string; id: number } | null>(null);
  const previousPool = useRef(pool);
  const hasItems = useRef(!!items.length);
  hasItems.current = !!items.length;
  const savedView = useRef({ selectedId: selected?.id || null, selectedKey, sourceId, image, pool });
  savedView.current = { selectedId: selected?.id || null, selectedKey, sourceId, image, pool };
  const saveView = () => {
    if (!hasItems.current) return;
    wallSessions.delete(sessionKey);
    wallSessions.set(sessionKey, { ...savedView.current, camera: camera.snapshot(), exploration });
    if (wallSessions.size > 8) wallSessions.delete(wallSessions.keys().next().value!);
  };
  useLayoutEffect(saveView);
  const visible = visibleWallTiles(loading ? 12 : finite ? items.length : items.length || hasMore ? 12 : 0,
    finite && !loading, camera.view.camera, camera.view.size, !loading);
  const view = camera.view;
  const centerX = (view.size.width / 2 - view.camera.x) / view.camera.scale;
  const centerY = (view.size.height / 2 - view.camera.y) / view.camera.scale;
  const distance = (tile: WallTile) => (tile.x + tile.width / 2 - centerX) ** 2 + (tile.y + tile.height / 2 - centerY) ** 2;
  const assigned = loading || finite ? null : new Map(exploration.assign(
    [...visible].sort((a, b) => distance(a) - distance(b)), items.length, hasMore,
  ).map(tile => [tile.key, tile.index]));
  /* 重进墙面时作品列表会按首页重读、比已分配的位置短：没有作品的位置先画骨架，续页补齐后再显示，
     不能拿空位去渲染磁贴（窄屏一屏格子多，这样整面墙直接卸掉成黑屏）。 */
  const slots = loading ? visible.map(tile => ({ ...tile, index:-1 })) : finite ? visible
    : visible.map(tile => {
      const index = assigned?.get(tile.key) ?? -1;
      return { ...tile, index: index < items.length ? index : -1 };
    });
  const slotRatios = new Map(slots.map(tile => [tile.key, tile.width / tile.height]));
  const savedWall = selected ? detailWall.current : null;
  const placements = loading ? slots : packWallTiles(slots, packedBlocks, tile => {
    const item = items[tile.index];
    return item && artAspects.current.get(wallArtworkKey(item.id, image, slotRatios.get(tile.key)!));
  });
  const tiles: WallPlacement[] = savedWall && savedWall.width === view.size.width && savedWall.height === view.size.height
    ? savedWall.tiles : wallTilesInView<WallPlacement>(placements, view.camera, view.size, tile => !!tile.preparing);
  useWallProjection(camera, tiles, curved);
  const captionKey = focusedKey || hoveredKey;
  const captionTile = !selected && freshFrom === null && captionKey
    ? tiles.find(tile => tile.key === captionKey && tile.index >= 0) : undefined;
  const captionItem = captionTile ? items[captionTile.index] : undefined;
  const stopPlayer = (continuePlaying = false) => {
    controller.current?.abort(); controller.current = null;
    releasePlayer.current?.(continuePlaying); releasePlayer.current = null;
    setPlaying(null); setStarting(false);
  };
  useLayoutEffect(() => {
    if (loading) return;
    if (!items.length) {
      if (previousPool.current === pool) return;
      previousPool.current = pool;
      controller.current?.abort(); releasePlayer.current?.(true); releasePlayer.current = null;
      setPlaying(null); setStarting(false); setSelected(null); setSelectedKey(''); setError('');
      return;
    }
    if (previousPool.current === 'undefined') {
      previousPool.current = pool;
      if (session && (finite || session.pool === pool)) setSelected(items.find(item => item.id === session.selectedId) || null);
      else if (session) camera.reset();
      return;
    }
    if (finite || previousPool.current === pool) return;
    previousPool.current = pool;
    controller.current?.abort(); releasePlayer.current?.(true); releasePlayer.current = null;
    setPlaying(null); setStarting(false); setSelected(null); setSelectedKey(''); setError(''); camera.reset();
  }, [finite, pool, loading]);
  useEffect(() => peachHistory.listen(navigation => {
    const overlay = isOverlayPath(navigation.location.pathname);
    if (overlay) {
      controller.current?.abort(); releasePlayer.current?.(true); releasePlayer.current = null;
      setPlaying(null); setStarting(false);
    }
    setCovered(overlay);
  }), []);
  useEffect(() => () => {
    controller.current?.abort(); releasePlayer.current?.(true);
    saveView();
  }, []);
  useEffect(() => {
    if (covered) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = previous };
  }, [covered]);
  const closeSearch = () => {
    setSearchOpen(false);
    requestAnimationFrame(() => searchButton.current?.focus({ preventScroll: true }));
  };
  const close = (continuePlaying = true) => {
    openingCover.current = null;
    detailWall.current = null;
    stopPlayer(continuePlaying); setPendingPlayback(null); setSelected(null); setSelectedKey(''); setSourceId(null); setQueueOpen(false); setError('');
    const focus = tileFocus.current;
    requestAnimationFrame(() => {
      const tile = focus && root.current?.querySelector<HTMLElement>(`[data-wall-tile="${focus.key}"]`);
      const target = tile && tile.dataset.wallId === String(focus?.id) ? tile : camera.viewport.current;
      target?.focus({ preventScroll: true });
    });
  };
  const choose = (item: MediaItem, tile?: WallTile, animate = true, direction: WallPageDirection | null = null) => {
    if (!selected) detailWall.current = { tiles, ...view.size };
    if (selected?.id !== item.id) stopPlayer(false);
    tileFocus.current = tile ? { key: tile.key, id: item.id } : null;
    setError(''); setPendingPlayback(null); setSelected(item); setSelectedKey(tile?.key ?? ''); setSourceId(null);
    setQueueOpen(false); setSearchOpen(false); setPageDirection(direction);
    openingCover.current = animate && tile
      ? root.current?.querySelector(`[data-wall-tile="${tile.key}"] [data-wall-hit]`)?.getBoundingClientRect() ?? null
      : null;
    if (!direction) requestAnimationFrame(() => root.current?.querySelector<HTMLElement>(animate ? '[data-wall-focus]' : '[data-wall-play]')?.focus({ preventScroll: true }));
  };
  const details = () => {
    if (!activeItem || !root.current) return;
    saveView();
    stopPlayer(true);
    actions.wallDetails?.(activeItem, root.current.querySelector<HTMLElement>('[data-wall-focus]') || root.current);
  };
  const play = async (target: MediaItem | null = activeItem) => {
    if (!target || !playerFrame.current || !actions.wallPlayer) return;
    stopPlayer(false); setError(''); setStarting(true);
    const run = new AbortController(); controller.current = run;
    const id = target.id;
    try {
      const release = await actions.wallPlayer(target, playerFrame.current, run.signal);
      if (run.signal.aborted || controller.current !== run) { release(false); return }
      releasePlayer.current = release; setPlaying(id);
    } catch (failure) {
      if (!run.signal.aborted) setError(requestErrorMessage(failure));
    } finally {
      if (controller.current === run) setStarting(false);
    }
  };
  const onEnded = () => {
    const next = nextPart(group || null, playing || 0);
    if (next) { setPageDirection(null); setSourceId(next.id); void play(next) }
  };
  useEffect(() => {
    if (pendingPlayback == null || selected?.id !== pendingPlayback || covered) return;
    setPendingPlayback(null); void play(selected);
  }, [pendingPlayback, selected?.id, covered]);
  const tracks = group?.items || items;
  // 页码跟随墙面作品；同一作品的分卷和版本由播放队列单独管理。
  const catalogIndex = items.findIndex(item => item.id === selected?.id);
  const pageDetail = (direction: WallPageDirection) => {
    const item = catalogIndex >= 0 ? items[catalogIndex + direction] : undefined;
    if (!item) return false;
    const viewport = camera.viewport.current?.getBoundingClientRect();
    const tile = tiles.filter(candidate => items[candidate.index]?.id === item.id && !candidate.preparing)
      .sort((a, b) => distance(a) - distance(b))
      .find(candidate => {
        const bounds = root.current?.querySelector(`[data-wall-tile="${candidate.key}"]`)?.getBoundingClientRect();
        return viewport && bounds && bounds.left < viewport.right && bounds.right > viewport.left
          && bounds.top < viewport.bottom && bounds.bottom > viewport.top;
      });
    choose(item, tile, true, direction);
    return true;
  };
  const switchTrack = (item: QueueItem) => {
    setQueueOpen(false);
    setPageDirection(null);
    if (item.id === activeItem?.id) {
      if (!playing) void play(item);
      else void playerFrame.current?.querySelector('video')?.play().catch(failure => setError(requestErrorMessage(failure)));
      return;
    }
    if (group) { setSourceId(item.id); void play(item); return }
    const view = camera.snapshot();
    const index = items.findIndex(row => row.id === item.id);
    const point = {
      x:(camera.view.size.width / 2 - view.x) / view.scale, y:(camera.view.size.height / 2 - view.y) / view.scale,
    };
    const tile = finite ? finiteWallTile(items.length, index) : exploration.nearest(items.length, index, point);
    if (tile) { choose(item, tile); setPendingPlayback(item.id) }
  };
  const more = async () => {
    if (busy || moreFlight.current) return;
    moreFlight.current = true;
    setMoreError('');
    try { await loadMore() } catch (failure) { setMoreError(requestErrorMessage(failure)); setFreshFrom(null) }
    finally { moreFlight.current = false }
  };
  const pendingTiles = tiles.some(tile => tile.index < 0);
  useEffect(() => {
    if (loading || finite || covered || selected || busy || moreError || freshFrom !== null || !hasMore) return;
    if (pendingTiles || items.length - exploration.size < 24) void more();
  }, [loading, finite, covered, selected, busy, moreError, hasMore, pendingTiles, items.length, exploration.size, freshFrom]);
  useEffect(() => {
    if (freshFrom === null || busy || moreError) return;
    if (items.length <= freshFrom && hasMore) { void more(); return }
    exploration.prefer(freshFrom);
    const next = exploration.fresh(), view = camera.snapshot();
    close(); camera.pan(-next.x * view.scale - view.x, -next.y * view.scale - view.y);
    setFreshFrom(null);
  }, [freshFrom, items.length, busy, hasMore, moreError]);
  const fresh = async () => {
    if (busy || moreFlight.current) return;
    setFreshFrom(items.length);
    if (hasMore) await more();
  };
  const addLater = async () => {
    if (!activeItem || laterBusy) return;
    setLaterBusy(true);
    try { await actions.watchLater(activeItem, on => setLater({ id: activeItem.id, on })) }
    finally { setLaterBusy(false) }
  };
  const label = (item: MediaItem) => helpers.displayName(item, String(item.name || item.code || t('catalog:immerse.untitled')));
  const current = activeItem || selected;
  useLayoutEffect(() => {
    if (detailContent.current) detailContent.current.scrollTop = 0;
  }, [current?.id]);
  useLayoutEffect(() => {
    const node = codeTitle.current;
    if (!node || !current?.code) return;
    let live = true, lastWidth = node.clientWidth;
    const fit = () => {
      if (!live) return;
      node.style.removeProperty('--wall-code-fit');
      const width = node.getBoundingClientRect().width;
      if (!width) return;
      const range = document.createRange(); range.selectNodeContents(node);
      const needed = range.getBoundingClientRect().width;
      if (needed > width) {
        const base = parseFloat(getComputedStyle(node).fontSize);
        node.style.setProperty('--wall-code-fit', `${Math.floor(base * width / needed * 100) / 100}px`);
      }
      lastWidth = node.clientWidth;
    };
    const observer = new ResizeObserver(entries => {
      if (Math.round(entries[0]!.contentRect.width) !== lastWidth) fit();
    });
    observer.observe(node); fit();
    void document.fonts.ready.then(fit);
    document.fonts.addEventListener('loadingdone', fit);
    return () => { live = false; observer.disconnect(); document.fonts.removeEventListener('loadingdone', fit) };
  }, [current?.code, selectedKey, playing, starting, covered]);
  const title = current ? label(current) : '';
  const detailTitle = current?.code && title.startsWith(current.code)
    ? title.slice(current.code.length).trim() || title
    : title;
  const version = current ? [editionLabel(current as QueueItem), partLabel(current as QueueItem)].filter(Boolean).join(' · ') : '';
  const facts = current ? [
    { key: 'released', label: t('catalog:javDetail.releaseDate'), value: current.release_date },
    { key: 'duration', label: t('catalog:catalogList.duration'), value: current.duration ? fmtDur(current.duration) : '' },
    { key: 'edition', label: t('catalog:detailQueue.editions'), value: version },
  ].filter(fact => fact.value) : [];
  const focusContent = current ? <WallFocusDialog key="detail" itemId={current.id} playing={!!playing || starting} covered={covered}
    direction={pageDirection}>
      <div data-wall-stage-media="">
        <WallDiscScene key={current.id} origin={openingCover.current} direction={pageDirection}
          aspect={artAspects.current.get(wallArtworkKey(current.id, 'cover', 1)) ?? WALL_FALLBACK_ASPECT}
          edition={[title, current.code, version, (current as QueueItem).edition].filter(Boolean).join(' ')}>
          <WallArtwork item={current} image="cover" big onAspect={rememberAspect} />
        </WallDiscScene>
        <div ref={playerFrame} data-wall-player="" hidden={!playing && !starting} />
      </div>
      <aside data-wall-details-panel="">
        <div data-wall-detail-nav="">
          {catalogIndex >= 0 && items.length > 1 ? <div data-wall-pager="">
            <button type="button" aria-label={t('catalog:wallControls.previousVideo')} aria-disabled={catalogIndex === 0}
              onClick={() => pageDetail(-1)}><svg viewBox="0 0 24 24" aria-hidden="true"><use href="#i-chevron-left" /></svg></button>
            <button type="button" aria-label={t('catalog:wallControls.nextVideo')} aria-disabled={catalogIndex >= items.length - 1}
              onClick={() => pageDetail(1)}><svg viewBox="0 0 24 24" aria-hidden="true"><use href="#i-chevron-right" /></svg></button>
            <span>{catalogIndex + 1} / {items.length}</span>
          </div> : null}
          <button type="button" data-wall-focus-close="" aria-label={t('catalog:videoWall.collapseVideo')} title={t('catalog:shared.collapse')} onClick={() => close()}>
            <svg viewBox="0 0 24 24" aria-hidden="true"><use href="#i-x" /></svg>
          </button>
        </div>
        <div ref={detailContent} data-wall-details-content="">
          <header data-wall-focus-head="">
            <div key={`wash:${current.id}`} data-wall-detail-wash="" aria-hidden="true"><WallArtwork item={current} image="cover" big /></div>
            <div key={`heading:${current.id}`} data-wall-detail-heading="">
              {playing ? <span data-wall-playing-label="" data-copy-key="videoWall.nowPlaying">{t('catalog:videoWall.nowPlaying')}</span> : null}
              <h2 id="wall-detail-title">{detailTitle}</h2>
              {current.performers?.length || current.creator ? <p>{current.performers?.join(' · ') || current.creator}</p> : null}
              {current.code ? <b ref={codeTitle} data-wall-code="">{current.code}</b> : null}
            </div>
            <div key={`cover:${current.id}`} data-wall-detail-cover="" aria-hidden="true"><WallArtwork item={current} image="cover" big /></div>
          </header>
          <div key={current.id} data-wall-detail-body="">
            {queueOpen ? <WallQueue items={tracks} activeId={current.id} kind={group?.kind || 'wall'} label={label} choose={switchTrack} close={() => setQueueOpen(false)} />
              : <>
                {facts.length ? <dl data-wall-detail-facts="">{facts.map(fact => <div key={fact.key}><dt>{fact.label}</dt><dd>{fact.value}</dd></div>)}</dl> : null}
                {current.studio ? <dl data-wall-detail-spec=""><dt>{t('catalog:entityHero.studio')}</dt><dd>{current.studio}</dd></dl> : null}
              </>}
            {error ? <div data-wall-play-error=""><Note tone="error">{error}</Note></div> : null}
            {groupRef && groupQuery.error && !group ? <div data-wall-play-error="">
              <Note tone="error" action={<Button size="small" variant="secondary" {...busyProps(groupQuery.isFetching)}
                onClick={() => void groupQuery.refetch()}>{t('catalog:shared.retryNow')}</Button>}>
                {requestErrorMessage(groupQuery.error)}
              </Note>
            </div> : null}
          </div>
        </div>
        <WallControls item={current} playing={playing} frame={playerFrame} starting={starting} pendingGroup={!!groupRef && groupQuery.isPending}
          grouped={!!groupRef} queueOpen={queueOpen} queueReady={!!tracks.length && (!groupRef || !!group)}
          later={later?.id === current.id ? later.on : !!current.watch_later} laterBusy={laterBusy}
          play={() => play()}
          queue={() => setQueueOpen(!queueOpen)} watchLater={() => void addLater()} details={details} ended={onEnded} error={setError} />
      </aside>
  </WallFocusDialog> : null;
  const cameraActive = !loading && !selected && freshFrom === null;
  const wall = <div ref={root} data-video-wall="" data-fullscreen="" data-focused={!!selected || undefined}
    data-refreshing={freshFrom !== null || undefined}
    hidden={covered} onKeyDown={event => {
      if (event.defaultPrevented) return;
      if (event.key === 'Escape') {
        event.preventDefault(); event.stopPropagation();
        if (queueOpen) setQueueOpen(false); else if (selected) close(); else if (searchOpen) closeSearch(); else exitWall();
        return;
      }
      if (!selected || covered || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
      const direction = event.key === 'ArrowLeft' ? -1 : event.key === 'ArrowRight' ? 1 : 0;
      if (!direction || (event.target instanceof Element
        && event.target.closest('input,textarea,select,[contenteditable],[role="slider"],[data-wall-queue],[data-wall-player]'))) return;
      if (pageDetail(direction)) { event.preventDefault(); event.stopPropagation() }
    }}>
    <div data-wall-bar="" inert={!!selected}>
      <button type="button" data-wall-back="" aria-label={t('catalog:videoWall.exit')} title={t('catalog:shared.back')} onClick={exitWall}>
        <svg viewBox="0 0 24 24" aria-hidden="true"><use href="#i-chevron-left" /></svg>
      </button>
      {!finite && (hasMore || items.length > 0) ? <div data-wall-refresh=""><Shuffle busy={busy} onPress={() => void fresh()} /></div> : null}
      <button type="button" data-wall-round="" data-wall-image="" aria-label={t('catalog:videoWall.showThumbnails')} title={image === 'thumbnail' ? t('catalog:videoWall.showCovers') : t('catalog:videoWall.showThumbnails')}
        aria-pressed={image === 'thumbnail'} onClick={() => setImage(image === 'thumbnail' ? 'cover' : 'thumbnail')}>
        <svg viewBox="0 0 24 24" aria-hidden="true"><use href="#i-gallery-thumbnails" /></svg>
      </button>
      <form data-wall-search="" data-open={searchOpen || undefined} role="search" onSubmit={event => {
        event.preventDefault();
        const params = new URLSearchParams(location.search);
        const text = String(new FormData(event.currentTarget).get('q') || '').trim();
        // 关键词没变（包括空着再点一次放大镜）只收起，不重进墙面。
        if (text === (params.get('q') || '')) { closeSearch(); return }
        if (text) params.set('q', text); else params.delete('q');
        saveView(); peachHistory.push(`/wall?${params}`); setSearchOpen(false);
      }}>
        <button ref={searchButton} type={searchOpen ? 'submit' : 'button'} data-wall-round=""
          aria-label={searchOpen ? t('catalog:shared.search') : t('catalog:videoWall.openSearch')} title={t('catalog:shared.search')} aria-expanded={searchOpen}
          onClick={event => { if (!searchOpen) { event.preventDefault(); setSearchOpen(true) } }}>
          <svg viewBox="0 0 24 24" aria-hidden="true"><use href="#i-search" /></svg>
        </button>
        {searchOpen ? searchSuggestions.list : null}
        {searchOpen ? <input type="search" name="q" aria-label={t('catalog:videoWall.searchLabel')} placeholder={t('catalog:videoWall.searchPlaceholder')} autoFocus
          ref={searchSuggestions.bind} autoComplete="off" onInput={event => setSearchText(event.currentTarget.value)}
          defaultValue={new URLSearchParams(location.search).get('q') || ''}
          onBlur={event => { if (!event.currentTarget.value.trim() && !event.currentTarget.form?.contains(event.relatedTarget as Node | null)) setSearchOpen(false) }} /> : null}
      </form>
      {finite ? <aside data-wall-filter-notice="" className="ui-project-banner" role="status">
        <div><svg viewBox="0 0 24 24" aria-hidden="true"><use href="#i-info" /></svg><p>{t('catalog:videoWall.filteredOnly')}</p></div>
        <Button size="small" variant="ghost" onClick={() => peachHistory.push(unfilteredWallAddress())}>{t('catalog:shared.clearFilters')}</Button>
      </aside> : null}
    </div>
    <div ref={camera.viewport} data-wall-viewport="" tabIndex={selected ? -1 : 0} role="region" aria-label={t('catalog:videoWall.viewportLabel')}
      data-wall-depth={curved || undefined}
      aria-busy={loading || freshFrom !== null || (busy && pendingTiles) || undefined} data-skeleton={loading ? 'wall' : undefined}
      {...(cameraActive ? camera.handlers : {})}
      onPointerUp={cameraActive ? event => camera.onPointerUp(event, target => {
        const key = target.closest<HTMLElement>('[data-wall-tile]')?.dataset.wallTile;
        const tile = key ? tiles.find(placement => placement.key === key) : undefined;
        if (!tile) return false;
        const item = items[tile.index];
        if (!item) return false;
        choose(item, tile);
        return true;
      }) : undefined} onClickCapture={camera.onClickCapture} onClick={event => {
        if (selected && event.target instanceof Element && !event.target.closest('[data-wall-details-panel],[data-wall-player]')) {
          if (queueOpen) setQueueOpen(false); else close();
        }
      }} onKeyDown={event => {
        if (selected || freshFrom !== null) return;
        if (event.target instanceof Element && event.target.closest('button,input,[role="slider"],[data-wall-player],[data-wall-queue]')) return;
        if (event.ctrlKey || event.metaKey || event.altKey) return;
        const zooms: Record<string, number> = { '+': 1.2, '=': 1.2, '-': 1 / 1.2 };
        if (zooms[event.key]) { event.preventDefault(); camera.zoom(zooms[event.key]!); return }
        if (event.key === '0') { event.preventDefault(); camera.reset(); return }
        const directions: Record<string, [number, number]> = { ArrowLeft: [200,0], ArrowRight: [-200,0], ArrowUp: [0,200], ArrowDown: [0,-200] };
        const delta = directions[event.key];
        if (!delta) return;
        event.preventDefault(); camera.pan(...delta);
      }}>
      <div ref={camera.world} data-wall-world="" inert={!!selected}>
        {tiles.map(tile => {
          const item = items[tile.index];
          if (!item) return <span key={tile.key} data-wall-skeleton="" aria-hidden="true"
            style={{ '--wall-left':`${tile.x}px`, '--wall-top':`${tile.y}px`, '--wall-width':`${tile.width}px`, '--wall-height':`${tile.height}px` } as CSSProperties} />;
          const ready = !tile.preparing;
          return <motion.article key={tile.key} data-wall-slot={tile.key} data-wall-preparing={tile.preparing}
            data-wall-tile={ready ? tile.key : undefined} data-wall-id={ready ? item.id : undefined}
            data-wall-picked={!!selected && selectedKey === tile.key || undefined}
            role={ready ? 'button' : undefined} tabIndex={ready ? 0 : undefined} aria-haspopup={ready ? 'dialog' : undefined}
            aria-hidden={tile.preparing} aria-label={ready ? t('catalog:videoWall.expandItem', { title: label(item) }) : undefined}
            initial={reducedMotion || entranceDone ? false : { opacity:0 }}
            animate={{ opacity:1 }} transition={{ duration:.24 }}
            style={{ '--wall-left': `${tile.x}px`, '--wall-top': `${tile.y}px`, '--wall-width': `${tile.width}px`, '--wall-height': `${tile.height}px`,
              '--wall-jacket-aspect': tile.width / tile.height } as CSSProperties}
            onPointerEnter={event => {
              if (!selected && hoverable && event.pointerType === 'mouse') setHoveredKey(tile.key);
            }}
            onPointerLeave={() => setHoveredKey(key => key === tile.key ? '' : key)}
            onBlur={() => setFocusedKey(key => key === tile.key ? '' : key)}
            onFocus={event => {
              if (selected || event.target !== event.currentTarget || !event.currentTarget.matches(':focus-visible')) return;
              setFocusedKey(tile.key);
              const rect = event.currentTarget.querySelector('[data-wall-hit]')?.getBoundingClientRect();
              const box = camera.viewport.current?.getBoundingClientRect();
              if (rect && box && (rect.left < box.left || rect.right > box.right || rect.top < box.top || rect.bottom > box.bottom)) camera.reveal(tile);
            }} onClick={event => choose(item, tile, event.detail !== 0)}
            onKeyDown={event => {
              if (selected || !['Enter',' '].includes(event.key)) return;
              event.preventDefault(); choose(item, tile, false);
            }}>
            <div data-wall-surface=""><div data-wall-hit="">
              <span data-wall-sleeve="">
                <WallOpticalDisc edition={`${item.code || ''} ${item.name || ''}`} />
                <WallArtwork item={item} image={image} ratio={slotRatios.get(tile.key) ?? tile.width / tile.height} onAspect={rememberAspect} />
              </span>
            </div></div>
          </motion.article>;
        })}
      </div>
      <AnimatePresence>{focusContent}</AnimatePresence>
      <div data-wall-atmosphere="" aria-hidden="true">
        <div data-wall-air="distant" />
        <div data-wall-air="near" />
        <div data-wall-light="" />
        <div data-wall-pointer="">
          <svg data-wall-pointer-open="" viewBox="0 0 24 24"><use href="#i-chevron-right" /></svg>
          <svg data-wall-pointer-drag="" viewBox="0 0 24 24"><use href="#i-hand" /></svg>
          <svg data-wall-pointer-close="" viewBox="0 0 24 24"><use href="#i-x" /></svg>
        </div>
      </div>
    </div>
    {captionItem ? <div ref={caption} data-wall-copy="" data-wall-copy-follow={!focusedKey || undefined} aria-hidden="true">
      <b>{label(captionItem)}</b>
      <span data-wall-copy-details="">
        <span>{captionItem.performers?.join(' · ') || captionItem.creator || captionItem.studio || t('catalog:shared.uncredited')}</span>
        {captionItem.duration ? <span data-wall-duration="">{fmtDur(captionItem.duration)}</span> : null}
      </span>
    </div> : null}
    {!loading && queryError ? <div data-wall-error="">
      <Note tone="error" action={<Button size="small" variant="secondary" onClick={retry}>{t('catalog:shared.retryNow')}</Button>}>
        {queryError}
      </Note>
    </div> : null}
    {!loading && !queryError && !items.length ? <div data-wall-empty="" onClick={async event => {
      const control = (event.target as Element).closest('[data-wall-load-more]');
      if (!control || busy || moreFlight.current) return;
      setActionBusy(control);
      try { await more() } finally { setActionBusy(control, false) }
    }} dangerouslySetInnerHTML={{ __html:emptyHtml }} /> : null}
    {hasMore && finite && items.length > 0 ? <div data-wall-footer=""><Button size="small" variant="secondary" {...busyProps(busy)} onClick={() => void more()}>
      {busy ? <span dangerouslySetInnerHTML={{ __html:spinnerHtml() }} /> : null}{t('catalog:shared.loadMore')}</Button></div> : null}
    {moreError ? <div data-wall-error="">
      <Note tone="error" action={<Button size="small" variant="secondary" {...busyProps(busy)} onClick={() => void more()}>
        {t('catalog:shared.retryNow')}</Button>}>
        {moreError}
      </Note>
    </div> : null}
  </div>;
  return createPortal(wall, portal);
}
