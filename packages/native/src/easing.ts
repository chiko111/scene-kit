import type { Easing as EasingName, Keyframe } from '@chiko111/scene-kit-core/runtime';

/*
 * Worklet copies of core EASING_FNS / sampleTimeline (same formulas, so web and native match
 * numerically). Core functions aren't worklets, so they can't run on the UI thread directly.
 */

export function ease(name: EasingName, t: number): number {
  'worklet';
  switch (name) {
    case 'linear':
      return t;
    case 'easeIn':
      return t * t * t;
    case 'easeOut':
      return 1 - (1 - t) * (1 - t) * (1 - t);
    case 'easeInOut':
      return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    case 'back':
      return 1 + 2.70158 * Math.pow(t - 1, 3) + 1.70158 * Math.pow(t - 1, 2);
    case 'bounce': {
      const n = 7.5625;
      const d = 2.75;
      if (t < 1 / d) return n * t * t;
      if (t < 2 / d) {
        const u = t - 1.5 / d;
        return n * u * u + 0.75;
      }
      if (t < 2.5 / d) {
        const u = t - 2.25 / d;
        return n * u * u + 0.9375;
      }
      const u = t - 2.625 / d;
      return n * u * u + 0.984375;
    }
    case 'elastic':
      return t === 0 || t === 1 ? t : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * ((2 * Math.PI) / 3)) + 1;
  }
  return t;
}

export type TimelineState = { opacity: number; x: number; y: number; scale: number; rotate: number };

/** Layer state at t ms (same rules as core sampleTimeline). */
export function sampleKeyframes(keyframes: readonly Keyframe[], t: number): TimelineState {
  'worklet';
  const first = keyframes[0] as Keyframe;
  const last = keyframes[keyframes.length - 1] as Keyframe;
  if (t <= 0) return { opacity: first.opacity, x: first.x, y: first.y, scale: first.scale, rotate: first.rotate };
  if (t >= last.atMs) return { opacity: last.opacity, x: last.x, y: last.y, scale: last.scale, rotate: last.rotate };
  let i = 1;
  while (i < keyframes.length && (keyframes[i] as Keyframe).atMs < t) i++;
  const a = keyframes[i - 1] as Keyframe;
  const b = keyframes[i] as Keyframe;
  const p = ease(b.easing, (t - a.atMs) / (b.atMs - a.atMs));
  return {
    opacity: a.opacity + (b.opacity - a.opacity) * p,
    x: a.x + (b.x - a.x) * p,
    y: a.y + (b.y - a.y) * p,
    scale: a.scale + (b.scale - a.scale) * p,
    rotate: a.rotate + (b.rotate - a.rotate) * p,
  };
}

/** CSS cubic-bezier(x1, y1, x2, y2) evaluated at progress t (Newton–Raphson + bisection fallback). */
export function cubicBezier(x1: number, y1: number, x2: number, y2: number, t: number): number {
  'worklet';
  if (t <= 0) return 0;
  if (t >= 1) return 1;
  const cx = 3 * x1;
  const bx = 3 * (x2 - x1) - cx;
  const ax = 1 - cx - bx;
  const cy = 3 * y1;
  const by = 3 * (y2 - y1) - cy;
  const ay = 1 - cy - by;
  // solve x(u) = t for u
  let u = t;
  for (let i = 0; i < 8; i++) {
    const x = ((ax * u + bx) * u + cx) * u - t;
    const dx = (3 * ax * u + 2 * bx) * u + cx;
    if (Math.abs(x) < 1e-6) break;
    if (Math.abs(dx) < 1e-6) break;
    u -= x / dx;
  }
  if (u < 0 || u > 1 || Math.abs(((ax * u + bx) * u + cx) * u - t) > 1e-4) {
    let lo = 0;
    let hi = 1;
    u = t;
    for (let i = 0; i < 30; i++) {
      const x = ((ax * u + bx) * u + cx) * u;
      if (Math.abs(x - t) < 1e-6) break;
      if (x < t) lo = u;
      else hi = u;
      u = (lo + hi) / 2;
    }
  }
  return ((ay * u + by) * u + cy) * u;
}

/**
 * Entrance easing for `enter` / `splitText` presets – same curves as the web renderer:
 * back = cubic-bezier(.34,1.56,.64,1), out = cubic-bezier(.2,.75,.25,1).
 */
export function enterEase(kind: 'out' | 'back', t: number): number {
  'worklet';
  return kind === 'back' ? cubicBezier(0.34, 1.56, 0.64, 1, t) : cubicBezier(0.2, 0.75, 0.25, 1, t);
}
