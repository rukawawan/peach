import { useLayoutEffect, useRef } from 'react';
import { Skeleton, SkulletProvider } from 'skullet/react';

import { cardClass } from '../components/card';

const FIELDS = {
  creators: ['关注创作者', '位'],
  enabled: ['启用来源', ''],
  failed: ['检查失败', '个来源'],
  updates: ['未看更新', '条'],
  subscriptions: ['JAV 订阅', '位'],
  releases: ['未看新作', '条'],
} as const;

// 只测量六个只读读数：隐藏样本没有请求、Portal、媒体或操作控件。
// 形状记忆只接触数字与固定单位；上游的填充函数不会替换中文，不传用户文字。
const REVEAL = { duration: 0, delay: 0, hold: 150 };

// 上游在 Shadow DOM 内绘制；用构造样式表接入原有微光，避免外层 CSS 选不中骨架。
let sheen: CSSStyleSheet | undefined;
function readingSheen() {
  if (!sheen) {
    sheen = new CSSStyleSheet();
    sheen.replaceSync(`
      @keyframes peach-skeleton-sweep { to { transform: translateX(-50%); } }
      [skullet-rect] { overflow: hidden; }
      [skullet-rect]::after {
        content: ''; position: absolute; inset: 0; right: -200%; border-radius: inherit;
        background: linear-gradient(to right, var(--skullet-base), var(--skullet-highlight) 50%, var(--skullet-base));
        background-size: 50% 100%; animation: peach-skeleton-sweep 1.5s ease-in-out infinite reverse;
      }
      @media (prefers-reduced-motion: reduce) { [skullet-rect]::after { animation: none; } }
    `);
  }
  return sheen;
}

function Value({ figure, unit }: { figure: number; unit: string }) {
  return <b data-follow-reading="" className={`flex min-w-0 flex-wrap items-baseline gap-x-1 tabular-nums text-text-primary ${
    figure >= 1000000 ? 'text-headline-medium' : figure >= 100000 ? 'text-title-3-medium' : 'text-title-1-medium'}`}>
    <span>{figure.toLocaleString()}</span>
    <small className="whitespace-nowrap text-body-2-regular text-text-secondary">{` ${unit}`}</small>
  </b>;
}

/** 每格独立等待，只在没有数据时显示骨架，后台重读保留已取得的数值。 */
export function MeasuredReading({ field, figure, total, failed = false }: {
  field: keyof typeof FIELDS; figure: number | undefined; total?: number; failed?: boolean;
}) {
  const [term, unit] = FIELDS[field];
  const host = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const shadows = [...host.current!.querySelectorAll('[skullet-layer]')]
      .map(layer => layer.shadowRoot).filter((root): root is ShadowRoot => !!root);
    if (!shadows.length) return;
    const sheet = readingSheen();
    for (const root of shadows) root.adoptedStyleSheets = [...root.adoptedStyleSheets, sheet];
    return () => {
      for (const root of shadows) root.adoptedStyleSheets = root.adoptedStyleSheets.filter(value => value !== sheet);
    };
  }, [figure, failed]);
  return <div ref={host} data-measured-reading={field} className={cardClass({ padding: 'none',
    className: 'flex flex-col gap-3 px-6 py-5 max-sm:gap-2 max-sm:p-4' })}>
    <span className="text-body-medium text-text-secondary">{term}</span>
    {figure === undefined && failed
      ? <b data-follow-reading="" className="text-title-1-medium text-text-primary">未取得</b>
      : <SkulletProvider reveal={REVEAL}>
        <Skeleton id={`peach:follow-reading:v1:${field}`} data={figure} sample={12345} label={`正在读取${term}`}>
          {value => <Value figure={value} unit={field === 'enabled' ? `/ ${total ?? 0}` : unit} />}
        </Skeleton>
      </SkulletProvider>}
  </div>;
}
