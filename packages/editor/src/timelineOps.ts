import { TimelineEffectSchema, sampleTimeline, type EffectOf, type Keyframe } from '@chiko111/scene-kit-core';

export type Timeline = EffectOf<'timeline'>;

const MAX_KEYFRAMES = 12;
const MAX_TIME = 20000;
const STEP = 300;

/** Sorted by time; the first keyframe is pinned to 0 ms. */
export function sortKeyframes(keyframes: readonly Keyframe[]): Keyframe[] {
  const sorted = [...keyframes].sort((a, b) => a.atMs - b.atMs);
  const first = sorted[0];
  if (first && first.atMs !== 0) sorted[0] = { ...first, atMs: 0 };
  return sorted;
}

/** Adds a keyframe after index i: halfway to the next one, or +300 ms at the end. Copies the state at that time. */
export function addKeyframe(tl: Timeline, i: number): Timeline {
  if (tl.keyframes.length >= MAX_KEYFRAMES) return tl;
  const a = tl.keyframes[i];
  if (!a) return tl;
  const b = tl.keyframes[i + 1];
  const atMs = b ? Math.round((a.atMs + b.atMs) / 2) : Math.min(MAX_TIME, a.atMs + STEP);
  if (atMs === a.atMs || (b && atMs === b.atMs)) return tl;
  const state = sampleTimeline(tl.keyframes, atMs);
  const frame: Keyframe = { ...state, atMs, easing: b?.easing ?? a.easing };
  const keyframes = [...tl.keyframes];
  keyframes.splice(i + 1, 0, roundFrame(frame));
  return { ...tl, keyframes };
}

/** Removes keyframe i (a timeline keeps at least 2). Removing the first makes the next one start at 0. */
export function removeKeyframe(tl: Timeline, i: number): Timeline {
  if (tl.keyframes.length <= 2) return tl;
  return { ...tl, keyframes: sortKeyframes(tl.keyframes.filter((_, j) => j !== i)) };
}

/** Copy of keyframe i placed 300 ms later (or halfway to the next one). */
export function duplicateKeyframe(tl: Timeline, i: number): Timeline {
  if (tl.keyframes.length >= MAX_KEYFRAMES) return tl;
  const a = tl.keyframes[i];
  if (!a) return tl;
  const b = tl.keyframes[i + 1];
  const atMs = b ? Math.round((a.atMs + b.atMs) / 2) : Math.min(MAX_TIME, a.atMs + STEP);
  if (atMs === a.atMs || (b && atMs === b.atMs)) return tl;
  const keyframes = [...tl.keyframes];
  keyframes.splice(i + 1, 0, { ...a, atMs });
  return { ...tl, keyframes };
}

/** Changes keyframe i; a new time re-sorts the list (first stays at 0). */
export function updateKeyframe(tl: Timeline, i: number, patch: Partial<Keyframe>): Timeline {
  const keyframes = tl.keyframes.map((k, j) => (j === i ? { ...k, ...patch } : k));
  return { ...tl, keyframes: 'atMs' in patch ? sortKeyframes(keyframes) : keyframes };
}

export function timelineDuration(tl: Timeline): number {
  return tl.keyframes[tl.keyframes.length - 1]?.atMs ?? 0;
}

/** null = valid, else a readable message (duplicate times etc.). */
export function timelineProblem(tl: Timeline): string | null {
  const r = TimelineEffectSchema.safeParse(tl);
  return r.success ? null : (r.error.issues[0]?.message ?? 'invalid timeline');
}

const r2 = (n: number) => Math.round(n * 100) / 100;
function roundFrame(k: Keyframe): Keyframe {
  return { ...k, opacity: r2(k.opacity), x: r2(k.x), y: r2(k.y), scale: r2(k.scale), rotate: r2(k.rotate) };
}
