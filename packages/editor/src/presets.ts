import {
  EffectSchema,
  IMAGE_ONLY_EFFECTS,
  MAX_EFFECTS_PER_NODE,
  TEXT_ONLY_EFFECTS,
  type Easing,
  type Effect,
  type EffectType,
  type Keyframe,
  type NodeType,
  type SceneNode,
} from '@chiko111/scene-kit-core';

/** A named stack of effects that can be applied to any layer. */
export type AnimationPreset = { id: string; name: string; effects: Effect[]; builtIn?: boolean };

export function effectAllowed(type: EffectType, nodeType: NodeType): boolean {
  if (IMAGE_ONLY_EFFECTS.includes(type)) return nodeType === 'image';
  if (TEXT_ONLY_EFFECTS.includes(type)) return nodeType === 'text';
  return true;
}

const kf = (atMs: number, opacity: number, x: number, y: number, scale: number, rotate: number, easing: Easing): Keyframe => ({
  atMs,
  opacity,
  x,
  y,
  scale,
  rotate,
  easing,
});

export const BUILT_IN_PRESETS: readonly AnimationPreset[] = [
  {
    id: 'gold-pop',
    name: 'Gold pop',
    builtIn: true,
    effects: [
      {
        type: 'timeline',
        delayMs: 0,
        repeat: 'none',
        keyframes: [kf(0, 0, 0, 0, 0.3, 0, 'linear'), kf(700, 1, 0, 0, 1, 0, 'bounce')],
      },
      { type: 'glow', colors: ['gold'], blur: 3, spread: 0.5, durationMs: 1400 },
    ],
  },
  {
    id: 'card-float',
    name: 'Card float',
    builtIn: true,
    effects: [
      { type: 'enter', preset: 'fadeUp', delayMs: 150, durationMs: 800 },
      { type: 'float', distance: 1.2, durationMs: 2500, delayMs: 300 },
    ],
  },
  {
    id: 'hero-rise',
    name: 'Hero rise',
    builtIn: true,
    effects: [
      { type: 'enter', preset: 'fadeUp', delayMs: 0, durationMs: 1000 },
      { type: 'float', distance: 1, durationMs: 3000 },
    ],
  },
  {
    id: 'elastic-drop',
    name: 'Elastic drop',
    builtIn: true,
    effects: [
      {
        type: 'timeline',
        delayMs: 0,
        repeat: 'none',
        keyframes: [kf(0, 0, 0, -20, 1, 0, 'linear'), kf(1200, 1, 0, 0, 1, 0, 'elastic')],
      },
    ],
  },
  {
    id: 'spin-coin',
    name: 'Spin coin',
    builtIn: true,
    effects: [
      { type: 'enter', preset: 'zoomIn', delayMs: 0, durationMs: 600 },
      { type: 'spin', direction: 'cw', durationMs: 4000 },
    ],
  },
  {
    id: 'glow-pulse',
    name: 'Glow pulse',
    builtIn: true,
    effects: [
      { type: 'pulse', scale: 1.06, durationMs: 900 },
      { type: 'glow', colors: ['gold', 'primary'], blur: 3, spread: 0.5, durationMs: 1200 },
    ],
  },
  {
    id: 'slow-zoom-bg',
    name: 'Slow zoom background',
    builtIn: true,
    effects: [
      { type: 'kenBurns', fromScale: 1, toScale: 1.15, fromX: 0, fromY: 0, toX: -4, toY: -3, durationMs: 14000, mode: 'pingpong' },
      { type: 'fadeIn', delayMs: 0, durationMs: 800 },
    ],
  },
  {
    id: 'deep-parallax',
    name: 'Deep parallax',
    builtIn: true,
    effects: [{ type: 'parallax', depth: 0.6 }],
  },
  {
    id: 'letter-rain',
    name: 'Letter rain',
    builtIn: true,
    effects: [{ type: 'splitText', by: 'char', preset: 'fadeDown', staggerMs: 45, delayMs: 0, durationMs: 500 }],
  },
  {
    id: 'wiggle-tease',
    name: 'Wiggle tease',
    builtIn: true,
    effects: [
      { type: 'enter', preset: 'bounceIn', delayMs: 0, durationMs: 700 },
      { type: 'wiggle', angle: 5, durationMs: 700, delayMs: 1500 },
    ],
  },
];

/** Effects of the preset that make sense on this layer type. */
export function presetEffectsFor(preset: AnimationPreset, nodeType: NodeType): Effect[] {
  return preset.effects.filter((e) => effectAllowed(e.type, nodeType));
}

/**
 * Applies a preset: its effects replace the layer's effects of the same types, the layer's other
 * effects stay (up to MAX_EFFECTS_PER_NODE, preset effects win). Effects the layer type can't use are skipped.
 */
export function applyPreset<N extends SceneNode>(node: N, preset: AnimationPreset): N {
  const incoming = presetEffectsFor(preset, node.type).map((e) => JSON.parse(JSON.stringify(e)) as Effect);
  const types = new Set(incoming.map((e) => e.type));
  const kept = node.effects.filter((e) => !types.has(e.type));
  const effects = [...incoming, ...kept].slice(0, MAX_EFFECTS_PER_NODE);
  return { ...node, effects };
}

/** A preset from a layer's current effects (null when the layer has none). */
export function presetFromNode(node: SceneNode, name: string): AnimationPreset | null {
  if (node.effects.length === 0) return null;
  const id = `user-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
  return { id, name: name.trim().slice(0, 60) || 'My preset', effects: JSON.parse(JSON.stringify(node.effects)) as Effect[] };
}

/* ───────────── user presets in localStorage (fallback when the host doesn't persist them) ───────────── */

const STORAGE_KEY = 'scene-kit-editor:presets';

/** Only keeps presets whose effects all validate (storage is user-controlled data). */
export function sanitizePresets(raw: unknown): AnimationPreset[] {
  if (!Array.isArray(raw)) return [];
  const out: AnimationPreset[] = [];
  for (const p of raw.slice(0, 100)) {
    if (!p || typeof p !== 'object') continue;
    const { id, name, effects } = p as Record<string, unknown>;
    if (typeof id !== 'string' || typeof name !== 'string' || !Array.isArray(effects)) continue;
    const parsed = effects.map((e) => EffectSchema.safeParse(e));
    if (parsed.length === 0 || parsed.some((r) => !r.success)) continue;
    out.push({ id: id.slice(0, 80), name: name.slice(0, 60), effects: parsed.map((r) => r.data as Effect) });
  }
  return out;
}

export function loadStoredPresets(): AnimationPreset[] {
  try {
    const text = globalThis.localStorage?.getItem(STORAGE_KEY);
    return text ? sanitizePresets(JSON.parse(text)) : [];
  } catch {
    return [];
  }
}

export function storePresets(presets: readonly AnimationPreset[]): void {
  try {
    globalThis.localStorage?.setItem(STORAGE_KEY, JSON.stringify(presets.filter((p) => !p.builtIn)));
  } catch {
    /* private mode / quota – presets just aren't remembered */
  }
}
