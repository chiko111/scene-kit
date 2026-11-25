/*
 * Pure logic of the timeline panel (Slider Revolution–style): which bars a layer gets, how long the
 * scene's timeline is, and how dragging / resizing / keyframe edits change the effects.
 * All times are ms since the scene started (entered the view).
 */
import {
  IMAGE_ONLY_EFFECTS,
  MAX_EFFECTS_PER_NODE,
  TEXT_ONLY_EFFECTS,
  createEffect,
  sampleTimeline,
  type Effect,
  type EffectType,
  type Keyframe,
  type NodeType,
  type SceneNode,
} from '@chiko111/scene-kit-core';
import type { Timeline } from './timelineOps';

export type BarKind = 'enter' | 'fadeIn' | 'timeline' | 'splitText' | 'kenBurns' | 'loop' | 'blur';

export type Bar = {
  effect: EffectType;
  kind: BarKind;
  label: string;
  /** Start / end of the solid part (ms). Loops: end = start + one cycle. */
  start: number;
  end: number;
  /** Keeps going after `end` (loops, repeating timelines, ping-pong Ken Burns) – drawn hatched to the end. */
  repeats: boolean;
  /** Bar body can be dragged (changes the delay). */
  movable: boolean;
  /** Right edge can be dragged (changes the duration / cycle). */
  resizable: boolean;
  /** Absolute keyframe times (timeline bars). */
  keyframes?: number[];
};

/** Loop effects: they start at their delay (or 0) and run forever. */
const LOOP_EFFECTS: readonly EffectType[] = ['float', 'pulse', 'wiggle', 'spin', 'glow', 'edgeBlink', 'borderRun', 'outlinePulse'];
/** Loops whose start can be delayed (schema has delayMs). */
const DELAYABLE_LOOPS: readonly EffectType[] = ['float', 'pulse', 'wiggle'];

const LABELS: Partial<Record<EffectType, string>> = {
  enter: 'Entrance',
  fadeIn: 'Fade in',
  timeline: 'Keyframes',
  splitText: 'Letters',
  kenBurns: 'Slow zoom',
  float: 'Float',
  pulse: 'Pulse',
  wiggle: 'Wiggle',
  spin: 'Spin',
  glow: 'Glow',
  edgeBlink: 'Edge blink',
  borderRun: 'Border run',
  outlinePulse: 'Outline pulse',
  blur: 'Blur',
  parallax: 'Parallax',
};
export const effectLabel = (type: EffectType): string => LABELS[type] ?? type;

const ENTER_NAMES: Record<string, string> = {
  fade: 'fade',
  fadeUp: 'fade up',
  fadeDown: 'fade down',
  slideLeft: 'slide from right',
  slideRight: 'slide from left',
  zoomIn: 'zoom in',
  zoomOut: 'zoom out',
  bounceIn: 'bounce',
  flipIn: 'flip',
};

/** Same splitting rule as the renderers: characters (Array.from) without whitespace, or words. */
export function splitPieces(text: string, by: 'char' | 'word'): number {
  if (by === 'word') return text.split(/\s+/).filter(Boolean).length;
  return Array.from(text).filter((c) => !/\s/.test(c)).length;
}

function timelineLength(tl: Timeline): number {
  return tl.keyframes[tl.keyframes.length - 1]?.atMs ?? 0;
}

/** The bars of one layer, in the order of its effects. Effects without time (parallax, static blur) are skipped. */
export function barsForNode(node: SceneNode): Bar[] {
  const bars: Bar[] = [];
  for (const e of node.effects) {
    const label = effectLabel(e.type);
    switch (e.type) {
      case 'enter':
      case 'fadeIn':
        bars.push({ effect: e.type, kind: e.type, label: e.type === 'enter' ? `${label} · ${ENTER_NAMES[e.preset]}` : label, start: e.delayMs, end: e.delayMs + e.durationMs, repeats: false, movable: true, resizable: true });
        break;
      case 'timeline':
        bars.push({
          effect: 'timeline',
          kind: 'timeline',
          label: e.repeat === 'none' ? label : `${label} · ${e.repeat}`,
          start: e.delayMs,
          end: e.delayMs + timelineLength(e),
          repeats: e.repeat !== 'none',
          movable: true,
          resizable: true,
          keyframes: e.keyframes.map((k) => e.delayMs + k.atMs),
        });
        break;
      case 'splitText': {
        const pieces = node.type === 'text' ? splitPieces(node.text, e.by) : 1;
        bars.push({ effect: 'splitText', kind: 'splitText', label: `${e.by === 'char' ? label : 'Words'} · ${pieces}`, start: e.delayMs, end: e.delayMs + e.durationMs + e.staggerMs * Math.max(0, pieces - 1), repeats: false, movable: true, resizable: true });
        break;
      }
      case 'kenBurns':
        bars.push({ effect: 'kenBurns', kind: 'kenBurns', label, start: 0, end: e.durationMs, repeats: e.mode === 'pingpong', movable: false, resizable: true });
        break;
      case 'blur':
        if (e.mode === 'focusIn') bars.push({ effect: 'blur', kind: 'blur', label: 'Blur · focus in', start: 0, end: e.durationMs, repeats: false, movable: false, resizable: true });
        else if (e.mode === 'breathe') bars.push({ effect: 'blur', kind: 'loop', label: 'Blur · loop', start: 0, end: e.durationMs, repeats: true, movable: false, resizable: true });
        break;
      default:
        if (LOOP_EFFECTS.includes(e.type) && 'durationMs' in e) {
          const start = 'delayMs' in e && typeof e.delayMs === 'number' ? e.delayMs : 0;
          bars.push({ effect: e.type, kind: 'loop', label: `${label} · loop`, start, end: start + e.durationMs, repeats: true, movable: DELAYABLE_LOOPS.includes(e.type), resizable: true });
        }
    }
  }
  return bars;
}

/** Effects of a layer that have no time (shown as an icon at the end of the row). */
export function timelessEffects(node: SceneNode): EffectType[] {
  return node.effects
    .filter((e) => e.type === 'parallax' || (e.type === 'blur' && e.mode === 'static'))
    .map((e) => e.type);
}

/** A loop's first cycle counts towards the axis only up to this long (a 14 s Ken Burns shouldn't squash the entrances). */
const LOOP_VISIBLE_MS = 2000;

/**
 * Length of the panel's time axis: focused on what plays once (entrances, timelines), +1 s padding, min 3 s.
 * Loops count with their start + at most 2 s; they continue hatched to the end of the axis.
 */
export function sceneLength(nodes: readonly SceneNode[]): number {
  let max = 0;
  for (const node of nodes) {
    for (const bar of barsForNode(node)) {
      const end = bar.repeats ? bar.start + Math.min(bar.end - bar.start, LOOP_VISIBLE_MS) : bar.end;
      max = Math.max(max, end);
    }
  }
  return Math.max(3000, Math.ceil((max + 1000) / 100) * 100);
}

/* ───────────── editing ───────────── */

export const snap = (ms: number, step: number): number => Math.round(ms / step) * step;
const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

/** Moves a bar so it starts at `startMs` (changes the delay). Unchanged if the effect has no delay. */
export function moveBar(effect: Effect, startMs: number): Effect {
  const delayMs = clamp(Math.round(startMs), 0, 10000);
  switch (effect.type) {
    case 'enter':
    case 'fadeIn':
    case 'timeline':
    case 'splitText':
      return { ...effect, delayMs };
    case 'float':
    case 'pulse':
    case 'wiggle': {
      // 0 = no key, keeps the JSON minimal (same as the Inspector)
      const { delayMs: _old, ...rest } = effect;
      return (delayMs === 0 ? rest : { ...rest, delayMs }) as Effect;
    }
    default:
      return effect;
  }
}

/**
 * Drags the bar's right edge to `endMs`. Finite bars: the whole duration; loops: one cycle;
 * timelines: all keyframes are scaled so the last lands on `endMs` (first stays at 0, times stay increasing).
 */
export function resizeBar(effect: Effect, endMs: number, node: SceneNode): Effect {
  switch (effect.type) {
    case 'enter':
    case 'fadeIn':
      return { ...effect, durationMs: clamp(Math.round(endMs - effect.delayMs), 100, 20000) };
    case 'splitText': {
      const pieces = node.type === 'text' ? splitPieces(node.text, effect.by) : 1;
      const durationMs = endMs - effect.delayMs - effect.staggerMs * Math.max(0, pieces - 1);
      return { ...effect, durationMs: clamp(Math.round(durationMs), 100, 5000) };
    }
    case 'kenBurns':
      return { ...effect, durationMs: clamp(Math.round(endMs), 1000, 60000) };
    case 'blur':
      return { ...effect, durationMs: clamp(Math.round(endMs), 100, 20000) };
    case 'timeline':
      return scaleTimeline(effect, endMs - effect.delayMs);
    default:
      if ('durationMs' in effect) {
        const start = 'delayMs' in effect && typeof effect.delayMs === 'number' ? effect.delayMs : 0;
        return { ...effect, durationMs: clamp(Math.round(endMs - start), 100, 20000) } as Effect;
      }
      return effect;
  }
}

const MIN_GAP = 10;

/** Scales keyframe times so the last one is at `lengthMs`. */
export function scaleTimeline(tl: Timeline, lengthMs: number): Timeline {
  const old = timelineLength(tl);
  const count = tl.keyframes.length;
  const target = clamp(Math.round(lengthMs), MIN_GAP * (count - 1), 20000);
  if (old <= 0) return tl;
  const factor = target / old;
  let prev = -MIN_GAP;
  const keyframes = tl.keyframes.map((k, i) => {
    let at = i === 0 ? 0 : Math.round(k.atMs * factor);
    at = Math.max(at, prev + MIN_GAP);
    // leave room for the keyframes still to come
    at = Math.min(at, 20000 - MIN_GAP * (count - 1 - i));
    prev = at;
    return { ...k, atMs: at };
  });
  return { ...tl, keyframes };
}

/** Moves keyframe `index` to `atMs` (relative to the timeline start). The first stays at 0; neighbours can't be passed. */
export function moveKeyframe(tl: Timeline, index: number, atMs: number): Timeline {
  if (index <= 0 || index >= tl.keyframes.length) return tl;
  const prev = tl.keyframes[index - 1] as Keyframe;
  const next = tl.keyframes[index + 1];
  const max = next ? next.atMs - MIN_GAP : 20000;
  const at = clamp(Math.round(atMs), prev.atMs + MIN_GAP, max);
  return { ...tl, keyframes: tl.keyframes.map((k, i) => (i === index ? { ...k, atMs: at } : k)) };
}

/** Inserts a keyframe at `atMs` holding the timeline's state at that moment (max 12; no duplicate times). */
export function addKeyframeAt(tl: Timeline, atMs: number): { timeline: Timeline; index: number } {
  const at = Math.round(atMs);
  if (tl.keyframes.length >= 12 || at <= 0 || at > 20000 || tl.keyframes.some((k) => Math.abs(k.atMs - at) < MIN_GAP)) {
    return { timeline: tl, index: -1 };
  }
  const state = sampleTimeline(tl.keyframes, at);
  const next = tl.keyframes.find((k) => k.atMs > at);
  const r2 = (n: number) => Math.round(n * 100) / 100;
  const frame: Keyframe = {
    atMs: at,
    opacity: r2(state.opacity),
    x: r2(state.x),
    y: r2(state.y),
    scale: r2(state.scale),
    rotate: r2(state.rotate),
    easing: next?.easing ?? (tl.keyframes[tl.keyframes.length - 1] as Keyframe).easing,
  };
  const keyframes = [...tl.keyframes, frame].sort((a, b) => a.atMs - b.atMs);
  return { timeline: { ...tl, keyframes }, index: keyframes.indexOf(frame) };
}

/* ───────────── quick add ───────────── */

export type QuickPreset = { id: string; label: string; make: () => Effect };

export const QUICK_PRESETS: readonly QuickPreset[] = [
  { id: 'fadeUp', label: 'Fade up entrance', make: () => ({ type: 'enter', preset: 'fadeUp', delayMs: 0, durationMs: 800 }) },
  {
    id: 'pop',
    label: 'Timeline pop',
    make: () => ({
      type: 'timeline',
      delayMs: 0,
      repeat: 'none',
      keyframes: [
        { atMs: 0, opacity: 0, x: 0, y: 0, scale: 0.4, rotate: 0, easing: 'linear' },
        { atMs: 600, opacity: 1, x: 0, y: 0, scale: 1.12, rotate: 0, easing: 'back' },
        { atMs: 900, opacity: 1, x: 0, y: 0, scale: 1, rotate: 0, easing: 'easeInOut' },
      ],
    }),
  },
  { id: 'split', label: 'Split text', make: () => createEffect('splitText') },
  { id: 'float', label: 'Float loop', make: () => ({ type: 'float', distance: 1.5, durationMs: 2000 }) },
  { id: 'kenBurns', label: 'Ken Burns', make: () => createEffect('kenBurns') },
];

export function effectAllowedOn(type: EffectType, nodeType: NodeType): boolean {
  if (IMAGE_ONLY_EFFECTS.includes(type)) return nodeType === 'image';
  if (TEXT_ONLY_EFFECTS.includes(type)) return nodeType === 'text';
  return true;
}

/** Presets offered for a layer: allowed for its type, and either replacing an effect it has or fitting in the limit. */
export function quickPresetsFor(node: SceneNode): QuickPreset[] {
  return QUICK_PRESETS.filter((p) => {
    const type = p.make().type;
    if (!effectAllowedOn(type, node.type)) return false;
    return node.effects.some((e) => e.type === type) || node.effects.length < MAX_EFFECTS_PER_NODE;
  });
}

/** Adds the preset's effect (replacing one of the same type). */
export function applyQuickPreset(node: SceneNode, preset: QuickPreset): SceneNode {
  const effect = preset.make();
  if (!effectAllowedOn(effect.type, node.type)) return node;
  const has = node.effects.some((e) => e.type === effect.type);
  if (!has && node.effects.length >= MAX_EFFECTS_PER_NODE) return node;
  const effects = has ? node.effects.map((e) => (e.type === effect.type ? effect : e)) : [...node.effects, effect];
  return { ...node, effects } as SceneNode;
}

/** Ruler ticks for [0, lengthMs]: every 100 ms, major each second. */
export function rulerTicks(lengthMs: number): { ms: number; major: boolean }[] {
  const ticks: { ms: number; major: boolean }[] = [];
  for (let ms = 0; ms <= lengthMs; ms += 100) ticks.push({ ms, major: ms % 1000 === 0 });
  return ticks;
}

export function formatTime(ms: number): string {
  const s = Math.max(0, ms) / 1000;
  return `${s.toFixed(2)} s`;
}
