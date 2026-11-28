import { useEffect, useId, useRef } from 'react';
import './assistant-mascot.css';

const REDUCED_MOTION = '(prefers-reduced-motion: reduce)';
const POINTER_TRACKING = '(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)';
const EASE_OUT = 'cubic-bezier(.23, 1, .32, 1)';
const EASE_IN_OUT = 'cubic-bezier(.77, 0, .175, 1)';
const REST = 'translate(0, 0) rotate(0deg) scale(1)';

const GREETING = [
  { transform: REST, easing: EASE_OUT },
  { transform: 'translateY(-8px) scale(.96, 1.07)', offset: .42, easing: EASE_IN_OUT },
  { transform: 'translateY(2px) scale(1.07, .94)', offset: .76, easing: EASE_OUT },
  { transform: REST },
];
const IDLE_TILT = [
  { transform: REST, easing: EASE_OUT },
  { transform: 'translate(6px, -2px) rotate(27deg) scale(1.06, .96)', offset: .32 },
  { transform: 'translate(6px, -2px) rotate(27deg) scale(1.06, .96)', offset: .63, easing: EASE_IN_OUT },
  { transform: 'translateX(-2px) rotate(-6deg)', offset: .86, easing: EASE_OUT },
  { transform: REST },
];

const REACTIONS = [
  {
    id: 'peach-mascot-roll', duration: 640,
    frames: [
      { transform: REST, easing: EASE_OUT },
      { transform: 'translate(-8px, 3px) rotate(-18deg) scale(1.11, .86)', offset: .18, easing: EASE_IN_OUT },
      { transform: 'translate(14px, -8px) rotate(170deg) scale(.94, 1.04)', offset: .55, easing: EASE_IN_OUT },
      { transform: 'translate(0, 3px) rotate(360deg) scale(1.12, .86)', offset: .82, easing: EASE_OUT },
      { transform: 'translate(0, 0) rotate(360deg) scale(1)' },
    ],
  },
  {
    id: 'peach-mascot-hop', duration: 540,
    frames: [
      { transform: REST, easing: EASE_OUT },
      { transform: 'translateY(4px) scale(1.12, .84)', offset: .18, easing: EASE_OUT },
      { transform: 'translateY(-17px) scale(.9, 1.13)', offset: .43, easing: EASE_IN_OUT },
      { transform: 'translateY(3px) scale(1.12, .85)', offset: .71, easing: EASE_OUT },
      { transform: 'translateY(-3px) scale(.98, 1.04)', offset: .86, easing: EASE_OUT },
      { transform: REST },
    ],
  },
  {
    id: 'peach-mascot-wobble', duration: 570,
    frames: [
      { transform: REST, easing: EASE_OUT },
      { transform: 'translateX(-7px) rotate(-21deg)', offset: .24, easing: EASE_IN_OUT },
      { transform: 'translateX(6px) rotate(17deg)', offset: .51, easing: EASE_IN_OUT },
      { transform: 'translateX(-3px) rotate(-8deg)', offset: .74, easing: EASE_OUT },
      { transform: REST },
    ],
  },
  {
    id: 'peach-mascot-squish', duration: 450,
    frames: [
      { transform: REST, easing: EASE_OUT },
      { transform: 'translateY(7px) scale(1.23, .72)', offset: .28, easing: EASE_OUT },
      { transform: 'translateY(-4px) scale(.91, 1.13)', offset: .58, easing: EASE_OUT },
      { transform: 'translateY(1px) scale(1.04, .97)', offset: .8, easing: EASE_OUT },
      { transform: REST },
    ],
  },
];

export function AssistantMascot({ label }: { label: string }) {
  const surface = useRef<HTMLButtonElement>(null);
  const body = useRef<SVGSVGElement>(null);
  const eyes = useRef<SVGGElement>(null);
  const lids = useRef<SVGGElement>(null);
  const ripple = useRef<SVGCircleElement>(null);
  const reaction = useRef<Animation | null>(null);
  const idle = useRef<Animation | null>(null);
  const nextReaction = useRef(0);
  const lastInteraction = useRef(-Infinity);
  const shading = useId();

  useEffect(() => {
    const button = surface.current;
    const orb = body.current;
    const gaze = eyes.current;
    const ring = ripple.current;
    if (!button || !orb || !gaze || !ring) return;

    const pointer = matchMedia(POINTER_TRACKING);
    const reducedMotion = matchMedia(REDUCED_MOTION);
    let frame = 0;
    let clientX = 0, clientY = 0;
    const reset = () => {
      cancelAnimationFrame(frame);
      frame = 0;
      gaze.style.translate = '';
    };
    const move = (event: PointerEvent) => {
      if (event.pointerType === 'touch' || !pointer.matches) return;
      lastInteraction.current = performance.now();
      clientX = event.clientX;
      clientY = event.clientY;
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        const { left, top, width, height } = button.getBoundingClientRect();
        const x = clientX - left - width / 2;
        const y = clientY - top - height / 2;
        const distance = Math.max(110, Math.hypot(x, y));
        gaze.style.translate = `${4.8 * x / distance}px ${3.8 * y / distance}px`;
      });
    };
    const stopAnimations = () => {
      reaction.current?.cancel();
      idle.current?.cancel();
      ring.getAnimations().forEach(animation => animation.cancel());
    };
    const animateIdle = (frames: Keyframe[], id: string, duration: number) => {
      if (reducedMotion.matches || document.hidden || reaction.current?.playState === 'running') return;
      idle.current = orb.animate(frames, { id, duration, easing: EASE_IN_OUT });
    };
    const greeting = window.setTimeout(() => {
      if (nextReaction.current === 0) animateIdle(GREETING, 'peach-mascot-greeting', 850);
    }, 550);
    const nudge = window.setInterval(() => {
      if (performance.now() - lastInteraction.current >= 3500) animateIdle(IDLE_TILT, 'peach-mascot-idle', 1350);
    }, 11000);
    document.addEventListener('pointermove', move, { passive: true });
    document.documentElement.addEventListener('pointerleave', reset);
    window.addEventListener('blur', reset);
    pointer.addEventListener('change', reset);
    reducedMotion.addEventListener('change', stopAnimations);
    return () => {
      reset();
      stopAnimations();
      clearTimeout(greeting);
      clearInterval(nudge);
      document.removeEventListener('pointermove', move);
      document.documentElement.removeEventListener('pointerleave', reset);
      window.removeEventListener('blur', reset);
      pointer.removeEventListener('change', reset);
      reducedMotion.removeEventListener('change', stopAnimations);
    };
  }, []);

  function play() {
    lastInteraction.current = performance.now();
    const orb = body.current;
    if (!orb || !lids.current || reaction.current?.playState === 'running') return;
    if (matchMedia(REDUCED_MOTION).matches) {
      reaction.current = lids.current.animate([{ opacity: 1 }, { opacity: .25 }, { opacity: 1 }], 140);
      return;
    }
    const { id, duration, frames } = REACTIONS[nextReaction.current]!;
    nextReaction.current = (nextReaction.current + 1) % REACTIONS.length;
    const current = getComputedStyle(orb).transform;
    idle.current?.cancel();
    reaction.current = orb.animate([{ ...frames[0], transform: current }, ...frames.slice(1)], { id, duration });
    if (id === 'peach-mascot-hop') ripple.current?.animate([
      { opacity: 0, transform: 'scale(.9)' },
      { opacity: .65, transform: 'scale(1)', offset: .26 },
      { opacity: 0, transform: 'scale(1.55)' },
    ], { delay: 130, duration: 390, easing: EASE_OUT });
  }

  return <button ref={surface} type="button" data-ai-assistant-mascot="" aria-label={label} data-copy-interact="" onClick={play}>
    <svg data-ai-assistant-mascot-ripple="" viewBox="0 0 64 64" aria-hidden="true">
      <circle ref={ripple} cx="32" cy="34" r="25" />
    </svg>
    <svg ref={body} data-ai-assistant-mascot-body="" viewBox="0 0 64 64" aria-hidden="true">
      <defs>
        <radialGradient id={shading} cx="34%" cy="22%" r="77%">
          <stop data-ai-assistant-mascot-light="" />
          <stop data-ai-assistant-mascot-shade="" offset="100%" />
        </radialGradient>
      </defs>
      <circle data-ai-assistant-mascot-shell="" cx="32" cy="32" r="25" fill={`url(#${shading})`} />
      <g ref={eyes} data-ai-assistant-mascot-gaze="">
        <g ref={lids} data-ai-assistant-mascot-lids=""><path d="M24 29v6m16-6v6" /></g>
      </g>
    </svg>
  </button>;
}
