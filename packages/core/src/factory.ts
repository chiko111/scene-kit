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
};

export function createEffect<T extends EffectType>(type: T): EffectOf<T> {
  return { ...EFFECT_DEFAULTS[type] };
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
