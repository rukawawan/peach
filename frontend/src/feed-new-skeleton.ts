import { COVER_FRONT_RATIO } from './appearance/layout';

/** 首页和资料页使用同一份新作行占位。 */
export const feedNewSkeletonHtml = (count = 8) => `<div class="feednewrow srow" data-skeleton="feed/new" aria-hidden="true">${
  `<article class="card feednewcard feednewskeleton"><div class="pic imgwait" style="--card-ratio:${COVER_FRONT_RATIO}"></div>
    <div class="meta"><div class="mtext"><span class="t"><span class="skeleton"></span></span>
      <div class="s mono"><span class="skeleton">&#8203;</span></div></div></div></article>`
    .repeat(count)}</div>`;
