import { sampleTimeline, type EffectOf } from '@chiko111/scene-kit-core/runtime';

/*
 * Timeline effect → CSS @keyframes.
 * CSS easing can't express bounce / elastic (and per-segment easings differ), so every segment is
 * SAMPLED with core's EASING_FNS (via sampleTimeline) into linear steps. The native renderer evaluates
 * the same easing functions, so both platforms follow the same curve.
 */

type Timeline = EffectOf<'timeline'>;

/** Linear steps per segment: ≥ 12, ~one per 40 ms, at most 60. */
export function stepsForSegment(ms: number): number {
  return Math.min(60, Math.max(12, Math.ceil(ms / 40)));
}

const round = (n: number, digits = 4) => {
  const f = 10 ** digits;
  return Math.round(n * f) / f;
};

/** Stable short name for identical timelines (deduplicated <style> per name). */
export function timelineName(timeline: Timeline, baseRotation: number, baseOpacity: number): string {
  const text = JSON.stringify([timeline.keyframes, baseRotation, baseOpacity]);
  let h = 5381;
  for (let i = 0; i < text.length; i++) h = ((h << 5) + h + text.charCodeAt(i)) | 0;
  return `sk-tl-${(h >>> 0).toString(36)}`;
}

/**
 * @keyframes for a timeline. x / y are in "u" (= cqw), rotate is added to the layer's own rotation,
 * opacity is multiplied with the layer's opacity.
 */
export function timelineKeyframesCss(name: string, timeline: Timeline, baseRotation: number, baseOpacity: number): string {
  const frames = timeline.keyframes;
  const total = frames[frames.length - 1]?.atMs ?? 0;
  if (total <= 0) return '';
  const stops: string[] = [];
  const push = (t: number) => {
    const s = sampleTimeline(frames, t);
    stops.push(
      `${round((t / total) * 100, 3)}%{opacity:${round(s.opacity * baseOpacity)};translate:${round(s.x)}cqw ${round(s.y)}cqw;scale:${round(s.scale)};rotate:${round(baseRotation + s.rotate)}deg}`,
    );
  };
  push(0);
  for (let i = 1; i < frames.length; i++) {
    const a = frames[i - 1];
    const b = frames[i];
    if (!a || !b) continue;
    const n = stepsForSegment(b.atMs - a.atMs);
    for (let s = 1; s <= n; s++) push(a.atMs + ((b.atMs - a.atMs) * s) / n);
  }
  return `@keyframes ${name}{${stops.join('')}}`;
}

/** CSS animation shorthand: delay runs once; none = play once + hold, loop = restart, pingpong = alternate. */
export function timelineAnimation(name: string, timeline: Timeline): string {
  const total = timeline.keyframes[timeline.keyframes.length - 1]?.atMs ?? 0;
  const repeat =
    timeline.repeat === 'none' ? '1' : timeline.repeat === 'loop' ? 'infinite' : 'infinite alternate';
  return `${name} ${total}ms linear ${timeline.delayMs}ms ${repeat} both`;
}
