/* 关注页与播放列表页的路由元素（ADR-0031）：页面组匹配到 `BROWSE_ROUTES` 的这两条时挂上，按地址打开那一页，
 * 画进 `#stats`。元素自己什么都不画：页面经 `openManagedRoute` 登记进 `#stats`，由 `ManagedSurface` 画。
 *
 * 什么时候打开同索引页（`usePageOpen`）：挂上、领了页面打开序号（后退前进与不认领的跳转）、壳要求按当前地址重开
 * （`@peach/shell` 的 `pageOpens` 加一）各一次；`pageOpens` 还是 0 时壳没开始路由，元素只挂着；那一刻被详情压着
 * （页面组按背景匹配）就不动，关掉详情时这一页没画着才打开。
 *
 * 关注页不按代次挂 key，回来时交壳按地址恢复筛选、取样种子与刷新代次（`refresh`）：
 * - 关注页还画在 `#stats` 里就铺开它，就地推属性，不因进入页面增加刷新代次。
 * - 没画着时，缓存已有内容就直接提交，不铺加载骨架；首次取数才铺骨架。已加载分页沿用同一标签页里的缓存，
 *   共用导航入口平滑恢复保存的位置，首次进入回到顶上。
 * 主动重新进入才由壳换种子和刷新代次。关掉关注详情回列表由壳认领写地址、只推筛选，元素不动。深链直接进关注详情时页面组没有背景，不挂这个
 * 元素，列表等关掉详情才打开。后退前进落到压在列表上的关注详情、列表却没画着（中间去过别的页）时，交壳让出
 * `#stats`（`ShellActions.follow.ground`），不画列表。
 *
 * 播放列表页每次打开都整页重开、取最新的那一份。停在这一页时壳要求重读（顶栏「换一批」）就写一个新的刷新代次
 * （`playlistsRevision`），元素推给画着的那一页，页面重取、不重挂。
 *
 * 两个元素卸下时都不收页面：换到管理区、索引页时由它们认领表面收掉；资料页压过来时壳只藏起 `#stats`，回来还要
 * 接着用。 */
import { useContext, useEffect, useRef, useSyncExternalStore } from 'react';

import { managedEntry, openManagedRoute, peachHistory, updateManagedRoute } from '@peach/history';
import { playlistsRevision, subscribeShell } from '@peach/shell';
import { pageNavigationReady, rememberPageState, restoredPageState } from '../../../history/page-navigation';
import { followFeedQuery, type FollowFeedProps } from '../../follow-feed/follow-feed';
import { queryClient } from '../../query';
import { managementSkeletonHtml, paintManagementPlaceholder } from '../../../management-placeholder';

import { ShellActionsContext, useOpenEpoch } from '../router';
import type { ShellActions } from '../shell-actions';
import { usePageOpen } from './index-entity';

const statsHost = () => document.getElementById('stats');
const readPlaylistsRevision = () => playlistsRevision;

/* ── 关注 ── */

async function openFollow(actions: ShellActions, live: () => boolean) {
  const stats = statsHost();
  const shell = actions.follow;
  if (!stats || !shell) return;
  const restored = restoredPageState<Pick<FollowFeedProps, 'view' | 'seed' | 'revision'>>('follow');
  const shown = shell.refresh(restored);
  const props = shell.props();
  rememberPageState('follow', { view: props.view, seed: props.seed, revision: props.revision });
  if (shown) return;
  const cached = queryClient.getQueryData(followFeedQuery(props.view, props.revision).queryKey) !== undefined;
  if (!cached) {
    actions.surfaceChanged('follow', '/follow');
    paintManagementPlaceholder(stats, shell.skeleton());
    void pageNavigationReady(live, stats, { pending: true });
  }
  await openManagedRoute('/follow', props, { container: stats, isCurrent: live,
    beforePlace: cached ? () => actions.surfaceChanged('follow', '/follow') : undefined });
  if (live()) {
    const { selectMode, selected } = shell.props();
    updateManagedRoute(stats, { selectMode, selected });
    void pageNavigationReady(live, stats.querySelector('[data-filter-frame]'));
  }
}

/* `#stats` 里画着、露着的是关注页。 */
function followShown(): boolean {
  const stats = statsHost();
  const entry = stats ? managedEntry(stats) : null;
  return !!stats && !stats.hidden && !!entry && entry.path === '/follow' && entry.host.isConnected;
}

/** 关注页的元素。 */
export function FollowMatch() {
  const actions = useContext(ShellActionsContext);
  usePageOpen(useOpenEpoch(), (_fresh, live) => {
    if (actions) void openFollow(actions, live);
  }, {
    shown: followShown,
    onCovered: () => {
      if (peachHistory.navigation.location.pathname.startsWith('/posts/')) actions?.follow?.ground();
    },
  });
  return null;
}

/* ── 播放列表 ── */

/* `#stats` 里画着的是播放列表页。 */
function playlistsShown(stats: HTMLElement | null): stats is HTMLElement {
  const entry = stats ? managedEntry(stats) : null;
  return !!entry && entry.path === '/playlists' && entry.host.isConnected;
}

async function openPlaylists(actions: ShellActions, live: () => boolean) {
  const stats = statsHost();
  if (!stats) return;
  actions.surfaceChanged('playlists', '/playlists');
  paintManagementPlaceholder(stats, managementSkeletonHtml('/playlists', { followLayout: '', followSort: '', followDir: '' }));
  void pageNavigationReady(live, stats, { pending: true });
  await openManagedRoute('/playlists', { revision: playlistsRevision }, { container: stats, isCurrent: live });
  if (live()) void pageNavigationReady(live);
}

/** 播放列表页的元素。 */
export function PlaylistsMatch() {
  const actions = useContext(ShellActionsContext);
  const revision = useSyncExternalStore(subscribeShell, readPlaylistsRevision);
  const last = useRef(revision);
  useEffect(() => {
    if (last.current === revision) return;
    last.current = revision;
    const stats = statsHost();
    if (playlistsShown(stats)) updateManagedRoute(stats, { revision });
  }, [revision]);
  usePageOpen(useOpenEpoch(), (_fresh, live) => {
    if (actions) void openPlaylists(actions, live);
  }, { shown: () => { const stats = statsHost(); return playlistsShown(stats) && !stats.hidden } });
  return null;
}
