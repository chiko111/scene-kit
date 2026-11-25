import { useEffect, useState } from 'react';
import { resolveFont, type FontMap } from '@chiko111/scene-kit-core/runtime';

/** Widgets lay out phone-first: 1 unit = 1% of their width, capped so tablets/desktop don't blow up. */
export const WIDGET_MAX_WIDTH = 640;

export function widgetUnit(width: number): number {
  return Math.min(width, WIDGET_MAX_WIDTH) / 100;
}

export const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

export function fontOf(fonts: FontMap | undefined, key: string | undefined, fallback: string | undefined): string | undefined {
  return resolveFont(fonts, key) ?? fallback;
}

/** Re-renders every `ms` (aligned to the clock) while mounted. Returns a tick counter. */
export function useTicker(ms: number, enabled = true): number {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (!enabled) return;
    let timer: ReturnType<typeof setTimeout>;
    const loop = () => {
      setTick((t) => t + 1);
      timer = setTimeout(loop, ms - (Date.now() % ms) + 5);
    };
    timer = setTimeout(loop, ms - (Date.now() % ms) + 5);
    return () => clearTimeout(timer);
  }, [ms, enabled]);
  return tick;
}
