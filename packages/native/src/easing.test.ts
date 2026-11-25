import { describe, expect, it } from 'vitest';
import { EASINGS, EASING_FNS, sampleTimeline, type Keyframe } from '@chiko111/scene-kit-core';
import { cubicBezier, ease, enterEase, sampleKeyframes } from './easing';

// The worklet copies must match core numerically, or web and native animations would drift apart.
describe('native easing parity with core', () => {
  it('every easing matches EASING_FNS', () => {
    for (const name of EASINGS) {
      for (let i = 0; i <= 20; i++) {
        const t = i / 20;
        expect(ease(name, t)).toBeCloseTo(EASING_FNS[name](t), 9);
      }
    }
  });

  it('timeline sampling matches sampleTimeline', () => {
    const kf = (atMs: number, easing: Keyframe['easing'], x: number, o = 1): Keyframe => ({ atMs, opacity: o, x, y: x / 2, scale: 1 + x / 100, rotate: x, easing });
    const frames = [kf(0, 'linear', 0, 0), kf(400, 'bounce', 30), kf(900, 'elastic', -10), kf(1500, 'back', 5)];
    for (let t = -100; t <= 1700; t += 37) expect(sampleKeyframes(frames, t)).toEqual(sampleTimeline(frames, t));
  });

  it('cubic-bezier matches the CSS presets used by the web renderer', () => {
    expect(cubicBezier(0.2, 0.75, 0.25, 1, 0)).toBe(0);
    expect(cubicBezier(0.2, 0.75, 0.25, 1, 1)).toBe(1);
    // linear bezier is the identity
    for (let i = 1; i < 10; i++) expect(cubicBezier(0.25, 0.25, 0.75, 0.75, i / 10)).toBeCloseTo(i / 10, 5);
    // ease-out curve rises fast; back overshoots past 1
    expect(enterEase('out', 0.3)).toBeGreaterThan(0.6);
    expect(Math.max(...Array.from({ length: 99 }, (_, i) => enterEase('back', (i + 1) / 100)))).toBeGreaterThan(1.05);
  });
});
