import { describe, expect, it } from 'vitest';
import { createScene, createShapeNode, createTextNode, SceneSchema } from '@scene-kit/core';
import { applyDrag, clampFrame, moveNode, setFrame } from './sceneOps';

const frame = { x: 10, y: 10, w: 20, h: 10, rotation: 0 };

describe('applyDrag', () => {
  it('moves', () => {
    expect(applyDrag(frame, 'move', 5, -5, false)).toEqual({ ...frame, x: 15, y: 5 });
  });

  it('resizes from the north-west keeping the opposite corner fixed', () => {
    const next = applyDrag(frame, 'nw', 5, 2, false);
    expect(next.x + next.w).toBe(30);
    expect(next.y + next.h).toBe(20);
    expect(next).toMatchObject({ w: 15, h: 8 });
  });

  it('never goes below the minimum size', () => {
    const next = applyDrag(frame, 'se', -500, -500, false);
    expect(next.w).toBeGreaterThanOrEqual(1);
    expect(next.h).toBeGreaterThanOrEqual(1);
  });

  it('keeps the aspect ratio with shift', () => {
    const next = applyDrag(frame, 'se', 20, 0, true);
    expect(next.w / next.h).toBeCloseTo(frame.w / frame.h, 2);
  });
});

describe('scene ops keep the scene valid', () => {
  it('clampFrame always satisfies the schema bounds', () => {
    const wild = clampFrame({ x: 9999, y: -9999, w: 0, h: 1e9, rotation: 1000 });
    const scene = createScene();
    const node = { ...createShapeNode(new Set()), frame: wild };
    expect(SceneSchema.safeParse({ ...scene, nodes: [node] }).success).toBe(true);
  });

  it('setFrame clamps', () => {
    const node = createShapeNode(new Set());
    const scene = { ...createScene(), nodes: [node] };
    const next = setFrame(scene, node.id, { ...node.frame, x: 1e6 });
    expect(next.nodes[0]?.frame.x).toBe(200);
  });

  it('moveNode swaps neighbours and ignores out-of-range moves', () => {
    const a = createShapeNode(new Set());
    const b = createTextNode(new Set([a.id]));
    const scene = { ...createScene(), nodes: [a, b] };
    expect(moveNode(scene, a.id, 1).nodes.map((n) => n.id)).toEqual([b.id, a.id]);
    expect(moveNode(scene, b.id, 1)).toBe(scene);
  });
});
