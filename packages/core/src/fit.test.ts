import { describe, expect, it } from 'vitest';
import { fitSceneWidth } from './fit';

const ar = 16 / 9;

describe('fitSceneWidth', () => {
  it('fills the width by default', () => {
    expect(fitSceneWidth({ availableWidth: 390, aspectRatio: ar })).toBe(390);
  });

  it('respects maxWidth', () => {
    expect(fitSceneWidth({ availableWidth: 1200, aspectRatio: ar, maxWidth: 600 })).toBe(600);
  });

  it('respects maxHeight by shrinking the width (no distortion)', () => {
    const w = fitSceneWidth({ availableWidth: 1200, aspectRatio: ar, maxHeight: 180 });
    expect(w).toBeCloseTo(320);
    expect(w / ar).toBeCloseTo(180);
  });

  it('uses the tightest of all limits', () => {
    expect(fitSceneWidth({ availableWidth: 390, aspectRatio: ar, maxWidth: 600, maxHeight: 400 })).toBe(390);
  });

  it('contain fits inside a fixed box', () => {
    const tall = fitSceneWidth({ availableWidth: 300, availableHeight: 300, aspectRatio: 9 / 16, fit: 'contain' });
    expect(tall).toBeCloseTo(168.75);
    const wide = fitSceneWidth({ availableWidth: 300, availableHeight: 300, aspectRatio: ar, fit: 'contain' });
    expect(wide).toBe(300);
  });

  it('returns 0 until the size is known, ignores bad limits', () => {
    expect(fitSceneWidth({ availableWidth: 0, aspectRatio: ar })).toBe(0);
    expect(fitSceneWidth({ availableWidth: 300, aspectRatio: ar, fit: 'contain' })).toBe(0);
    expect(fitSceneWidth({ availableWidth: 300, aspectRatio: ar, maxWidth: -5, maxHeight: Number.NaN })).toBe(300);
    expect(fitSceneWidth({ availableWidth: 300, aspectRatio: 0 })).toBe(0);
  });
});
