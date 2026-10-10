import { describe, expect, it } from 'vitest';
import { borderPoint, cycleOpacity } from './cycle';

describe('cycleOpacity', () => {
  it('crossfade keeps total brightness constant', () => {
    for (const n of [2, 3, 4]) {
      for (let t = 0; t < n * 2; t += 0.13) {
        let sum = 0;
        for (let i = 0; i < n; i++) sum += cycleOpacity(t, i, n, 'crossfade');
        expect(sum).toBeCloseTo(1, 6);
      }
    }
  });

  it('blink shows exactly one color at a time, in order', () => {
    const n = 3;
    for (let t = 0; t < 6; t += 0.25) {
      const on = [0, 1, 2].filter((i) => cycleOpacity(t, i, n, 'blink') === 1);
      expect(on).toEqual([Math.floor(t) % n]);
    }
  });

  it('single color breathes / blinks', () => {
    expect(cycleOpacity(0, 0, 1, 'crossfade')).toBeCloseTo(0.3);
    expect(cycleOpacity(0.5, 0, 1, 'crossfade')).toBeCloseTo(1);
    expect(cycleOpacity(0.2, 0, 1, 'blink')).toBe(1);
    expect(cycleOpacity(0.7, 0, 1, 'blink')).toBe(0);
  });
});

describe('borderPoint', () => {
  it('walks the rectangle clockwise', () => {
    expect(borderPoint(0, 100, 40)).toEqual({ x: 0, y: 0 });
    expect(borderPoint(0.25, 100, 40)).toEqual({ x: 100, y: 0 });
    expect(borderPoint(0.5, 100, 40)).toEqual({ x: 100, y: 40 });
    expect(borderPoint(0.75, 100, 40)).toEqual({ x: 0, y: 40 });
    expect(borderPoint(1, 100, 40)).toEqual({ x: 0, y: 0 });
    expect(borderPoint(1.125, 100, 40)).toEqual({ x: 50, y: 0 });
  });
});
