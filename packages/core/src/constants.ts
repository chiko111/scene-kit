/*
 * Plain constants shared by the schema and the renderers. No zod here: the renderers import these
 * through the light `@chiko111/scene-kit-core/runtime` entry, so validation code never ships to clients.
 */

export const SCENE_VERSION = 1;
export const MAX_NODES = 60;
export const MAX_EFFECTS_PER_NODE = 8;
export const MAX_EFFECT_COLORS = 4;

export const COLOR_TOKENS = [
  'primary',
  'onPrimary',
  'secondary',
  'onSecondary',
  'accent',
  'gold',
  'success',
  'danger',
  'surface',
  'onSurface',
  'background',
  'white',
  'black',
] as const;

/**
 * Entrance animation, played once when the scene first becomes visible (scrolled into view).
 * Distances are in "u" (1% of scene width) so they look the same on every screen size.
 */
export const ENTER_PRESETS = [
  'fade',
  'fadeUp',
  'fadeDown',
  'slideLeft',
  'slideRight',
  'zoomIn',
  'zoomOut',
  'bounceIn',
  'flipIn',
] as const;
export type EnterPreset = (typeof ENTER_PRESETS)[number];

/** Start state of each preset (end state is always: opacity 1, no offset, scale 1, no rotation). */
export const ENTER_FROM: Readonly<
  Record<EnterPreset, { x: number; y: number; scale: number; rotateX: number; easing: 'out' | 'back' }>
> = {
  fade: { x: 0, y: 0, scale: 1, rotateX: 0, easing: 'out' },
  fadeUp: { x: 0, y: 4, scale: 1, rotateX: 0, easing: 'out' },
  fadeDown: { x: 0, y: -4, scale: 1, rotateX: 0, easing: 'out' },
  /** "slideLeft" = moves leftwards into place (comes from the right) */
  slideLeft: { x: 8, y: 0, scale: 1, rotateX: 0, easing: 'out' },
  slideRight: { x: -8, y: 0, scale: 1, rotateX: 0, easing: 'out' },
  zoomIn: { x: 0, y: 0, scale: 0.6, rotateX: 0, easing: 'out' },
  zoomOut: { x: 0, y: 0, scale: 1.3, rotateX: 0, easing: 'out' },
  bounceIn: { x: 0, y: 0, scale: 0.4, rotateX: 0, easing: 'back' },
  flipIn: { x: 0, y: 0, scale: 1, rotateX: 80, easing: 'out' },
};

export const EASINGS = ['linear', 'easeIn', 'easeOut', 'easeInOut', 'back', 'bounce', 'elastic'] as const;
export type Easing = (typeof EASINGS)[number];
