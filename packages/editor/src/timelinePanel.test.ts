import { describe, expect, it } from 'vitest';
import { createTextNode, createImageNode, type Effect, type Keyframe, type SceneNode } from '@chiko111/scene-kit-core';
import {
  addKeyframeAt,
  applyQuickPreset,
  barsForNode,
  moveBar,
  moveKeyframe,
  quickPresetsFor,
  resizeBar,
  rulerTicks,
  sceneLength,
  snap,
  splitPieces,
} from './timelinePanelOps';
import type { Timeline } from './timelineOps';

const kf = (atMs: number, extra: Partial<Keyframe> = {}): Keyframe => ({ atMs, opacity: 1, x: 0, y: 0, scale: 1, rotate: 0, easing: 'linear', ...extra });
const tl = (delayMs: number, times: number[], repeat: Timeline['repeat'] = 'none'): Timeline => ({
  type: 'timeline',
  delayMs,
  repeat,
  keyframes: times.map((t, i) => kf(t, { opacity: i === 0 ? 0 : 1, x: i * 10 })),
});
const text = (value: string, effects: Effect[]): SceneNode => ({ ...createTextNode(new Set()), text: value, effects }) as SceneNode;
const image = (effects: Effect[]): SceneNode => ({ ...createImageNode('https://cdn.example.com/a.png', { x: 0, y: 0, w: 10, h: 10, rotation: 0 }, new Set()), effects }) as SceneNode;

describe('bar geometry', () => {
  it('entrance / fade in / timeline / split text', () => {
    const bars = barsForNode(
      text('Ала бала', [
        { type: 'enter', preset: 'fadeUp', delayMs: 200, durationMs: 800 },
        tl(300, [0, 500, 1200]),
        { type: 'splitText', by: 'char', preset: 'fadeUp', staggerMs: 50, delayMs: 100, durationMs: 400 },
      ]),
    );
    expect(bars.map((b) => [b.kind, b.start, b.end])).toEqual([
      ['enter', 200, 1000],
      ['timeline', 300, 1500],
      // 7 chars without the space → 100 + 400 + 50·6
      ['splitText', 100, 800],
    ]);
    expect(bars[1]?.keyframes).toEqual([300, 800, 1500]);
  });

  it('split text pieces follow the renderer rule', () => {
    expect(splitPieces('33 000 € ВСЕКИ ДЕН', 'char')).toBe(14);
    expect(splitPieces('33 000 € ВСЕКИ ДЕН', 'word')).toBe(5);
    expect(splitPieces('😀ok', 'char')).toBe(3);
  });

  it('loops repeat from their delay; only float/pulse/wiggle can move', () => {
    const bars = barsForNode(image([{ type: 'float', distance: 1, durationMs: 2000, delayMs: 500 }, { type: 'spin', direction: 'cw', durationMs: 6000 }, { type: 'kenBurns', fromScale: 1, toScale: 1.2, fromX: 0, fromY: 0, toX: 0, toY: 0, durationMs: 9000, mode: 'pingpong' }]));
    expect(bars.map((b) => [b.kind, b.start, b.end, b.repeats, b.movable])).toEqual([
      ['loop', 500, 2500, true, true],
      ['loop', 0, 6000, true, false],
      ['kenBurns', 0, 9000, true, false],
    ]);
  });

  it('scene length = last end (+1 s), loops count 2 cycles, min 3 s', () => {
    expect(sceneLength([])).toBe(3000);
    expect(sceneLength([text('x', [{ type: 'enter', preset: 'fade', delayMs: 2500, durationMs: 1000 }])])).toBe(4500);
    expect(sceneLength([image([{ type: 'float', distance: 1, durationMs: 2000, delayMs: 500 }])])).toBe(3500);
    // a long loop doesn't stretch the axis: entrances stay readable
    expect(sceneLength([image([{ type: 'kenBurns', fromScale: 1, toScale: 1.1, fromX: 0, fromY: 0, toX: 0, toY: 0, durationMs: 14000, mode: 'pingpong' }])])).toBe(3000);
  });

  it('ruler: 100 ms ticks, major every second', () => {
    const ticks = rulerTicks(1500);
    expect(ticks).toHaveLength(16);
    expect(ticks.filter((t) => t.major).map((t) => t.ms)).toEqual([0, 1000]);
  });
});

describe('dragging', () => {
  it('snaps and clamps the delay', () => {
    expect(snap(437, 50)).toBe(450);
    expect(snap(437, 10)).toBe(440);
    const enter: Effect = { type: 'enter', preset: 'fade', delayMs: 0, durationMs: 500 };
    expect(moveBar(enter, 450)).toMatchObject({ delayMs: 450 });
    expect(moveBar(enter, -200)).toMatchObject({ delayMs: 0 });
    expect(moveBar(enter, 99999)).toMatchObject({ delayMs: 10000 });
  });

  it('loop delay 0 removes the key; non-delayable loops ignore moves', () => {
    expect(moveBar({ type: 'float', distance: 1, durationMs: 1000, delayMs: 300 }, 0)).toEqual({ type: 'float', distance: 1, durationMs: 1000 });
    const spin: Effect = { type: 'spin', direction: 'cw', durationMs: 4000 };
    expect(moveBar(spin, 500)).toBe(spin);
  });

  it('resizes durations with limits', () => {
    const node = text('ab cd', []);
    expect(resizeBar({ type: 'enter', preset: 'fade', delayMs: 200, durationMs: 500 }, 1200, node)).toMatchObject({ durationMs: 1000 });
    expect(resizeBar({ type: 'enter', preset: 'fade', delayMs: 200, durationMs: 500 }, 210, node)).toMatchObject({ durationMs: 100 });
    // 4 chars → stagger 3 × 100 is kept, the piece duration changes
    expect(resizeBar({ type: 'splitText', by: 'char', preset: 'fade', staggerMs: 100, delayMs: 0, durationMs: 400 }, 1000, node)).toMatchObject({ durationMs: 700 });
    expect(resizeBar({ type: 'float', distance: 1, durationMs: 1000, delayMs: 500 }, 3000, node)).toMatchObject({ durationMs: 2500 });
  });

  it('resizing a timeline scales the keyframes, first stays 0, times stay increasing', () => {
    const r = resizeBar(tl(100, [0, 500, 1000]), 2100, text('x', [])) as Timeline;
    expect(r.keyframes.map((k) => k.atMs)).toEqual([0, 1000, 2000]);
    const tiny = resizeBar(tl(0, [0, 500, 1000]), 5, text('x', [])) as Timeline;
    expect(tiny.keyframes.map((k) => k.atMs)).toEqual([0, 10, 20]);
  });
});

describe('keyframes on the bar', () => {
  it('moves a keyframe between its neighbours; the first is pinned', () => {
    const t = tl(0, [0, 500, 1000]);
    expect(moveKeyframe(t, 1, 700).keyframes.map((k) => k.atMs)).toEqual([0, 700, 1000]);
    expect(moveKeyframe(t, 1, 5000).keyframes.map((k) => k.atMs)).toEqual([0, 990, 1000]);
    expect(moveKeyframe(t, 1, -50).keyframes.map((k) => k.atMs)).toEqual([0, 10, 1000]);
    expect(moveKeyframe(t, 0, 300)).toBe(t);
    expect(moveKeyframe(t, 2, 3000).keyframes.map((k) => k.atMs)).toEqual([0, 500, 3000]);
  });

  it('adds a keyframe sampled from the timeline', () => {
    const { timeline, index } = addKeyframeAt(tl(0, [0, 1000]), 500);
    expect(index).toBe(1);
    expect(timeline.keyframes[1]).toMatchObject({ atMs: 500, opacity: 0.5, x: 5 });
    expect(addKeyframeAt(tl(0, [0, 1000]), 1000).index).toBe(-1);
  });
});

describe('quick add', () => {
  it('respects image-only / text-only effects', () => {
    expect(quickPresetsFor(text('x', [])).map((p) => p.id)).toEqual(['fadeUp', 'pop', 'split', 'float']);
    expect(quickPresetsFor(image([])).map((p) => p.id)).toEqual(['fadeUp', 'pop', 'float', 'kenBurns']);
  });

  it('replaces an effect of the same type', () => {
    const node = text('x', [{ type: 'enter', preset: 'zoomIn', delayMs: 900, durationMs: 300 }]);
    const preset = quickPresetsFor(node).find((p) => p.id === 'fadeUp');
    expect(preset && applyQuickPreset(node, preset).effects).toEqual([{ type: 'enter', preset: 'fadeUp', delayMs: 0, durationMs: 800 }]);
  });
});
