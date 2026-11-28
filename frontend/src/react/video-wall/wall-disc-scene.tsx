import { useLayoutEffect, useRef, type CSSProperties, type ReactNode } from 'react';
import { useIsPresent } from 'motion/react';
import type { WallPageDirection } from './wall-motion';

const BLU_RAY = /\bblu[ -]?ray\b|\bbd(?:25|50|rip|remux)?\b|ブルーレイ|[蓝藍]光/iu; // i18n-exempt: 来源标题和版次的原文标识

export function WallOpticalDisc({ edition }: { edition: string }) {
  const format = BLU_RAY.test(edition) ? 'blu-ray' : 'dvd';
  return <div data-wall-disc="" data-format={format} aria-hidden="true">
    <div data-wall-disc-face=""><span>{format === 'blu-ray' ? 'Blu-ray' : 'DVD'}</span></div>
  </div>;
}

export function WallDiscScene({ children, aspect, edition, origin, direction }: {
  children: ReactNode; aspect: number; edition: string; origin: DOMRect | null; direction: WallPageDirection | null;
}) {
  const scene = useRef<HTMLDivElement>(null);
  const open = useIsPresent();
  useLayoutEffect(() => {
    const node = scene.current;
    if (!node || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    if (open && direction) {
      const slide = node.animate([
        { transform: `translateX(${direction * 22}px)`, opacity: .24 },
        { transform: 'translateX(0)', opacity: 1 },
      ], { duration: 210, easing: 'cubic-bezier(.22, 1, .36, 1)' });
      return () => slide.cancel();
    }
    if (!origin?.width || !origin.height) return;
    const target = node.getBoundingClientRect();
    if (!target.width || !target.height) return;
    const x = (origin.left + origin.width / 2) - (target.left + target.width / 2);
    const y = (origin.top + origin.height / 2) - (target.top + target.height / 2);
    const zoom = Math.min(origin.width / target.width, origin.height / target.height);
    const nearTile = { transform: `translate3d(${x}px, ${y}px, 0) scale(${zoom})` };
    const onStage = { transform: 'translate3d(0, 0, 0) scale(1)' };
    const flight = node.animate(open ? [nearTile, onStage] : [onStage, nearTile],
      { duration: open ? 420 : 220, easing: 'cubic-bezier(.22, 1, .36, 1)', fill: open ? 'none' : 'forwards' });
    return () => flight.cancel();
  }, [open, origin, direction]);
  return <div ref={scene} data-wall-scene="" style={{ '--wall-jacket-aspect': Math.max(.55, Math.min(2.4, aspect)) } as CSSProperties}>
    <WallOpticalDisc edition={edition} />
    <div data-wall-jacket="">{children}</div>
  </div>;
}
