import { MAX_NODES, type Frame, type Scene, type SceneNode } from '@scene-kit/core';

export const round2 = (n: number) => Math.round(n * 100) / 100;
const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));

/** Keeps a frame inside the schema bounds, so the editor can never produce invalid JSON. */
export function clampFrame(frame: Frame): Frame {
  return {
    x: round2(clamp(frame.x, -100, 200)),
    y: round2(clamp(frame.y, -100, 200)),
    w: round2(clamp(frame.w, 0.5, 200)),
    h: round2(clamp(frame.h, 0.5, 200)),
    rotation: round2(clamp(frame.rotation, -360, 360)),
  };
}

export const nodeIds = (scene: Scene) => new Set(scene.nodes.map((n) => n.id));

export function replaceNode(scene: Scene, node: SceneNode): Scene {
  return { ...scene, nodes: scene.nodes.map((n) => (n.id === node.id ? node : n)) };
}

export function updateNode(scene: Scene, id: string, fn: (node: SceneNode) => SceneNode): Scene {
  return { ...scene, nodes: scene.nodes.map((n) => (n.id === id ? fn(n) : n)) };
}

export function setFrame(scene: Scene, id: string, frame: Frame): Scene {
  return updateNode(scene, id, (n) => ({ ...n, frame: clampFrame(frame) }));
}

export function addNode(scene: Scene, node: SceneNode): Scene {
  if (scene.nodes.length >= MAX_NODES || scene.nodes.some((n) => n.id === node.id)) return scene;
  return { ...scene, nodes: [...scene.nodes, node] };
}

export function removeNode(scene: Scene, id: string): Scene {
  return { ...scene, nodes: scene.nodes.filter((n) => n.id !== id) };
}

/** +1 = one step towards the top (drawn later), -1 = towards the bottom. */
export function moveNode(scene: Scene, id: string, delta: 1 | -1): Scene {
  const index = scene.nodes.findIndex((n) => n.id === id);
  const target = index + delta;
  const node = scene.nodes[index];
  const other = scene.nodes[target];
  if (index < 0 || !node || !other) return scene;
  const nodes = [...scene.nodes];
  nodes[index] = other;
  nodes[target] = node;
  return { ...scene, nodes };
}

export function insertAfter(scene: Scene, afterId: string, node: SceneNode): Scene {
  if (scene.nodes.length >= MAX_NODES || scene.nodes.some((n) => n.id === node.id)) return scene;
  const index = scene.nodes.findIndex((n) => n.id === afterId);
  const nodes = [...scene.nodes];
  nodes.splice(index < 0 ? nodes.length : index + 1, 0, node);
  return { ...scene, nodes };
}

export type DragMode = 'move' | 'nw' | 'ne' | 'sw' | 'se';

/**
 * New frame for a drag. dx/dy are in % of the scene. Rotation is ignored for resize math
 * (handles work on the un-rotated box). Shift keeps the aspect ratio.
 */
export function applyDrag(frame: Frame, mode: DragMode, dx: number, dy: number, keepAspect: boolean): Frame {
  if (mode === 'move') return clampFrame({ ...frame, x: frame.x + dx, y: frame.y + dy });

  const MIN = 1;
  const west = mode === 'nw' || mode === 'sw';
  const north = mode === 'nw' || mode === 'ne';
  const right = frame.x + frame.w;
  const bottom = frame.y + frame.h;

  let w = Math.max(MIN, west ? frame.w - dx : frame.w + dx);
  let h = Math.max(MIN, north ? frame.h - dy : frame.h + dy);

  if (keepAspect && frame.w > 0) {
    // % of width and % of height scale independently, so the ratio of percentages is the pixel ratio.
    h = Math.max(MIN, (w * frame.h) / frame.w);
    w = (h * frame.w) / frame.h;
  }

  return clampFrame({
    ...frame,
    x: west ? right - w : frame.x,
    y: north ? bottom - h : frame.y,
    w,
    h,
  });
}
