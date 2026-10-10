export type CycleMode = 'crossfade' | 'blink';

/**
 * Opacity of color layer `index` (of `count`) at time `t`, where t is measured in color steps
 * (t = elapsedMs / durationMs). Used by the native renderer on the UI thread; the web renderer
 * implements the same curves with CSS keyframes.
 *
 *  - 1 color,  crossfade → breathes 0.3 … 1
 *  - 1 color,  blink     → on for half a step, off for half
 *  - N colors, crossfade → adjacent colors blend; total brightness stays constant
 *  - N colors, blink     → exactly one color on at a time, hard switch
 */
export function cycleOpacity(t: number, index: number, count: number, mode: CycleMode): number {
  'worklet';
  if (count <= 1) {
    const p = ((t % 1) + 1) % 1;
    if (mode === 'blink') return p < 0.5 ? 1 : 0;
    return 0.3 + 0.7 * (0.5 - 0.5 * Math.cos(2 * Math.PI * p));
  }
  const phi = (((t - index) % count) + count) % count;
  if (mode === 'blink') return phi < 1 ? 1 : 0;
  if (phi < 1) return 1 - phi;
  if (phi > count - 1) return phi - (count - 1);
  return 0;
}

/** Point on the node's rectangle for a light running around it (each side takes a quarter of the lap). */
export function borderPoint(progress: number, width: number, height: number): { x: number; y: number } {
  'worklet';
  const q = ((((progress % 1) + 1) % 1) * 4);
  if (q < 1) return { x: q * width, y: 0 };
  if (q < 2) return { x: width, y: (q - 1) * height };
  if (q < 3) return { x: (3 - q) * width, y: height };
  return { x: 0, y: (4 - q) * height };
}
