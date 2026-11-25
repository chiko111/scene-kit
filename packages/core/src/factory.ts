import {
  SCENE_VERSION,
  type Effect,
  type EffectOf,
  type EffectType,
  type Frame,
  type NodeOf,
  type Scene,
  type SceneNode,
} from './schema';

export function createId(prefix: string, taken: ReadonlySet<string> = new Set()): string {
  for (;;) {
    const id = `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
    if (!taken.has(id)) return id;
  }
}

export function createScene(name = 'Untitled scene', aspectRatio = 16 / 9): Scene {
  return {
    version: SCENE_VERSION,
    id: createId('scene'),
    name,
    aspectRatio,
    background: null,
    nodes: [],
  };
}

const centered = (w: number, h: number): Frame => ({
  x: Math.round((50 - w / 2) * 100) / 100,
  y: Math.round((50 - h / 2) * 100) / 100,
  w,
  h,
  rotation: 0,
});

const base = (prefix: string, name: string, frame: Frame, taken: ReadonlySet<string>) => ({
  id: createId(prefix, taken),
  name,
  frame,
  opacity: 1,
  hidden: false,
  shadow: null,
  effects: [] as Effect[],
});

export function createImageNode(
  uri: string,
  frame: Frame,
  taken: ReadonlySet<string>,
): NodeOf<'image'> {
  return { ...base('img', 'Image', frame, taken), type: 'image', uri, fit: 'contain', alt: '', radius: 0 };
}

export function createTextNode(taken: ReadonlySet<string>): NodeOf<'text'> {
  return {
    ...base('txt', 'Text', centered(50, 15), taken),
    type: 'text',
    text: 'Your text',
    color: 'white',
    fontSize: 5,
    weight: '700',
    align: 'center',
  };
}

export function createButtonNode(taken: ReadonlySet<string>, route: string): NodeOf<'button'> {
  return {
    ...base('btn', 'Button', centered(30, 14), taken),
    type: 'button',
    label: 'Play now',
    action: { type: 'navigate', route },
    bg: 'primary',
    fg: 'onPrimary',
    fontSize: 3,
    weight: '700',
    radius: 1.5,
  };
}

export function createShapeNode(taken: ReadonlySet<string>): NodeOf<'shape'> {
  return {
    ...base('shp', 'Shape', centered(30, 30), taken),
    type: 'shape',
    shape: 'rect',
    fill: 'accent',
    radius: 0,
  };
}

const EFFECT_DEFAULTS: { [T in EffectType]: EffectOf<T> } = {
  pulse: { type: 'pulse', scale: 1.06, durationMs: 900 },
  outlinePulse: { type: 'outlinePulse', color: 'gold', width: 0.4, spread: 1.12, durationMs: 1400 },
  float: { type: 'float', distance: 1.5, durationMs: 2000 },
  fadeIn: { type: 'fadeIn', delayMs: 0, durationMs: 600 },
  enter: { type: 'enter', preset: 'fadeUp', delayMs: 0, durationMs: 800 },
  wiggle: { type: 'wiggle', angle: 4, durationMs: 1200 },
  spin: { type: 'spin', direction: 'cw', durationMs: 6000 },
  timeline: {
    type: 'timeline',
    delayMs: 0,
    repeat: 'none',
    keyframes: [
      { atMs: 0, opacity: 0, x: 0, y: 6, scale: 0.8, rotate: 0, easing: 'linear' },
      { atMs: 700, opacity: 1, x: 0, y: -1, scale: 1.05, rotate: 0, easing: 'easeOut' },
      { atMs: 1000, opacity: 1, x: 0, y: 0, scale: 1, rotate: 0, easing: 'easeInOut' },
    ],
  },
  kenBurns: { type: 'kenBurns', fromScale: 1, toScale: 1.15, fromX: 0, fromY: 0, toX: -4, toY: -3, durationMs: 12000, mode: 'pingpong' },
  parallax: { type: 'parallax', depth: 0.3 },
  splitText: { type: 'splitText', by: 'char', preset: 'fadeUp', staggerMs: 40, delayMs: 0, durationMs: 500 },
  glow: { type: 'glow', colors: ['gold', 'primary'], blur: 3, spread: 0.5, durationMs: 1200 },
  edgeBlink: { type: 'edgeBlink', colors: ['gold', 'danger'], width: 0.4, blur: 1, mode: 'blink', durationMs: 500 },
  borderRun: { type: 'borderRun', colors: ['gold', 'accent'], size: 1.2, durationMs: 2400 },
  blur: { type: 'blur', amount: 2, mode: 'focusIn', durationMs: 900 },
};

export function createEffect<T extends EffectType>(type: T): EffectOf<T> {
  // arrays (colors, keyframes) are copied so every node owns its own
  return JSON.parse(JSON.stringify(EFFECT_DEFAULTS[type])) as EffectOf<T>; // structuredClone isn't on every Hermes build
}

export function createLottieNode(uri: string, taken: ReadonlySet<string>): NodeOf<'lottie'> {
  return { ...base('lot', 'Lottie', centered(30, 30), taken), type: 'lottie', uri, loop: true, speed: 1, alt: '' };
}

/** Countdown to `endDate` at 23:59 in the given time zone. */
export function createCountdownNode(endDate: string, timeZone: string, taken: ReadonlySet<string>): NodeOf<'countdown'> {
  return {
    ...base('cd', 'Countdown', centered(60, 12), taken),
    type: 'countdown',
    endDate,
    endTime: { hour: 23, minute: 59 },
    timeZone,
    format: 'auto',
    labels: { days: 'д', hours: 'ч', minutes: 'м', seconds: 'с' },
    endedText: 'ПРОМОЦИЯТА ПРИКЛЮЧИ',
    color: 'white',
    fontSize: 5,
    weight: '800',
    align: 'center',
  };
}

/** Default hover: the classic promo-card lift + glow. */
export function createHover(): import('./schema').Hover {
  return { scale: 1.07, lift: 0.6, brightness: 1.15, glow: { color: 'accent', blur: 1.4, opacity: 0.8 }, durationMs: 500 };
}

/** Image node frame height (in % of scene height) that keeps the image's own aspect ratio. */
export function heightForImage(widthPct: number, sceneAspect: number, imageAspect: number): number {
  const h = (widthPct * sceneAspect) / imageAspect;
  return Math.round(Math.min(200, Math.max(0.5, h)) * 100) / 100;
}

export function duplicateNode(node: SceneNode, taken: ReadonlySet<string>): SceneNode {
  const prefix = node.id.split('_')[0] ?? 'node';
  return {
    ...node,
    id: createId(prefix, taken),
    name: `${node.name} copy`.slice(0, 80),
    frame: { ...node.frame, x: node.frame.x + 2, y: node.frame.y + 2 },
  };
}
