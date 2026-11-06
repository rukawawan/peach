/* 换页进度条：页面顶边一条 2px 的细条，顶替浏览器自己的加载条。
 *
 * 换页走 pushState，浏览器不再亮它的加载条；骨架在 100ms 内就铺上，可服务端慢的时候骨架一停十几秒，
 * 用户分不清是在等还是卡死了。这一条只回答「还在取」，不报百分比：取数没有可信的总量，按时间涨的
 * 进度是编的（组件契约「等待与回执」）。
 *
 * 判据两路：壳在取某一页的首屏（`managedLoading`），或者屏上有组件在等它的第一份数据——查询有观察者、
 * 从没取到过、正在取（换筛选时列表保留旧行，新条件那一份就是这一种）。已经有数据的后台重取、
 * 失败后的轮询、没人看的预取都不算，否则轮询会让它隔几秒闪一次。
 *
 * 命中缓存的换页在 200ms 内就画完，这一条不出现；出现了至少停 400ms，结束时铺满再淡出，
 * 不闪一下就没。 */
import type { Query } from '@tanstack/query-core';

import { listenManagedLoading, managedLoading } from './history/managed';
import { queryClient } from './query';

const SHOW_DELAY = 200;
const MIN_SHOWN = 400;
const FADE = 240;

/** 装上进度条，返回卸载函数。 */
export function installNavigationProgress(): () => void {
  const bar = document.createElement('div');
  bar.className = 'navprogress';
  bar.setAttribute('aria-hidden', 'true');
  bar.append(document.createElement('i'));
  document.body.append(bar);

  const waiting = new Set<Query>();
  let showTimer = 0;
  let hideTimer = 0;
  let shownAt = 0;
  let queued = false;

  const busy = () => managedLoading() || waiting.size > 0;
  const settle = () => {
    if (busy()) {
      clearTimeout(hideTimer);
      hideTimer = 0;
      if (bar.dataset.state) {
        bar.dataset.state = 'running';
        return;
      }
      showTimer ||= window.setTimeout(() => {
        showTimer = 0;
        shownAt = performance.now();
        bar.dataset.state = 'running';
      }, SHOW_DELAY);
      return;
    }
    clearTimeout(showTimer);
    showTimer = 0;
    if (bar.dataset.state !== 'running' || hideTimer) return;
    hideTimer = window.setTimeout(() => {
      bar.dataset.state = 'done';
      hideTimer = window.setTimeout(() => {
        hideTimer = 0;
        delete bar.dataset.state;
      }, FADE);
    }, Math.max(0, MIN_SHOWN - (performance.now() - shownAt)));
  };
  /* 壳换页时先中止上一趟、再登记这一趟，同一个任务里会先假后真；攒到微任务再读，这一下不算结束。 */
  const schedule = () => {
    if (queued) return;
    queued = true;
    queueMicrotask(() => {
      queued = false;
      settle();
    });
  };

  /* 没数据的查询重取时 Query 把状态退回 pending，失败后的轮询看着和首取一样；失败过的不算首取。 */
  const track = (query: Query) => {
    const { status, fetchStatus, errorUpdateCount } = query.state;
    if (status === 'pending' && fetchStatus === 'fetching' && !errorUpdateCount && query.getObserversCount() > 0) {
      waiting.add(query);
    }
    else waiting.delete(query);
  };
  const stopQueries = queryClient.getQueryCache().subscribe((event) => {
    if (event.type === 'removed') waiting.delete(event.query);
    else track(event.query);
    schedule();
  });
  const stopManaged = listenManagedLoading(schedule);
  for (const query of queryClient.getQueryCache().getAll()) track(query);
  schedule();

  return () => {
    stopQueries();
    stopManaged();
    clearTimeout(showTimer);
    clearTimeout(hideTimer);
    bar.remove();
  };
}
