import { useEffect, useId, useState, type CSSProperties } from 'react';
import './effort-flow.css';

export function EffortFlow({ animate = true }: { animate?: boolean }) {
  const id = useId();
  const [hidden, setHidden] = useState(document.hidden);
  useEffect(() => {
    const changed = () => setHidden(document.hidden);
    document.addEventListener('visibilitychange', changed);
    return () => document.removeEventListener('visibilitychange', changed);
  }, []);
  return <div aria-hidden="true" data-effort-flow="" data-motion={animate && !hidden ? 'running' : 'paused'}>
    <svg viewBox="0 0 240 27" preserveAspectRatio="none">
      <defs>
        <linearGradient id={`${id}-trail`} gradientUnits="userSpaceOnUse" x1="27" x2="240">
          <stop offset="0" stopColor="var(--color-accent-700)" stopOpacity="0" />
          <stop offset=".27" stopColor="var(--color-accent-600)" stopOpacity=".6" />
          <stop offset=".68" stopColor="var(--color-accent-500)" />
          <stop offset="1" stopColor="var(--color-accent-400)" />
        </linearGradient>
        <linearGradient id={`${id}-light`} gradientUnits="userSpaceOnUse" x1="65" x2="240">
          <stop offset="0" stopColor="var(--color-accent-500)" stopOpacity="0" />
          <stop offset=".54" stopColor="var(--color-accent-400)" stopOpacity=".7" />
          <stop offset=".79" stopColor="var(--color-accent-200)" />
          <stop offset="1" stopColor="var(--color-accent-50)" />
        </linearGradient>
        <filter id={`${id}-glow`} x="0" y="-8" width="255" height="43" filterUnits="userSpaceOnUse">
          <feGaussianBlur stdDeviation="1.8" />
        </filter>
        <filter id={`${id}-soft`} x="0" y="-8" width="255" height="43" filterUnits="userSpaceOnUse">
          <feGaussianBlur stdDeviation=".85" />
        </filter>
      </defs>
      <path d="M25 14C61 7 102 10 140 9S199 1 240 1V25C200 24 180 18 140 18S63 17 25 14Z"
        fill={`url(#${id}-trail)`} filter={`url(#${id}-glow)`} opacity=".68" />
      <path d="M31 14C67 10 104 12 140 10S196 3 240 4V23C199 23 181 17 140 16S68 15 31 14Z"
        fill={`url(#${id}-trail)`} />
      <path d="M62 14C96 12 114 14 145 12S197 5 240 6V21C202 21 174 16 145 15S96 15 62 14Z"
        fill={`url(#${id}-light)`} filter={`url(#${id}-soft)`} />
    </svg>
    {Array.from({ length: 16 }, (_, at) => <i key={at} style={{
      '--particle-y': `${(at * 7 + 3) % 25}px`,
      '--particle-width': `${1.5 + (at % 4)}px`,
      '--particle-delay': `${-at * .11}s`,
    } as CSSProperties} />)}
  </div>;
}
