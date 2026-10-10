import { z } from 'zod';

/**
 * Units
 * - frame.x / y / w / h  → percent of the scene (x, w: of width; y, h: of height)
 * - every other length   → "u" = 1% of the scene WIDTH
 *   (fontSize, radius, shadow offsets/blur, outline width, float distance)
 *   On web 1u === 1cqw, on native 1u === sceneWidth / 100.
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

export const ColorTokenSchema = z.enum(COLOR_TOKENS);
export type ColorToken = z.infer<typeof ColorTokenSchema>;

/** Maps theme tokens to real colors. The app passes its own theme (Colors.*). */
export type Palette = Record<ColorToken, string>;

export const IdSchema = z.string().regex(/^[A-Za-z0-9_-]{1,64}$/, 'id: 1-64 chars [A-Za-z0-9_-]');
const DurationSchema = z.number().int().min(100).max(20000);

/** Remote images must come from HTTPS (your CDN). No data:, blob:, http:. */
export const ImageUriSchema = z
  .string()
  .max(2048)
  .regex(/^https:\/\/[^\s"'<>]+$/, 'uri must be an https:// URL');

export const FrameSchema = z.object({
  x: z.number().min(-100).max(200),
  y: z.number().min(-100).max(200),
  w: z.number().min(0.5).max(200),
  h: z.number().min(0.5).max(200),
  rotation: z.number().min(-360).max(360),
});
export type Frame = z.infer<typeof FrameSchema>;

export const ShadowSchema = z.object({
  color: ColorTokenSchema,
  opacity: z.number().min(0).max(1),
  x: z.number().min(-10).max(10),
  y: z.number().min(-10).max(10),
  blur: z.number().min(0).max(10),
});
export type Shadow = z.infer<typeof ShadowSchema>;

/* ───────────── Effects ───────────── */

export const PulseEffectSchema = z.object({
  type: z.literal('pulse'),
  scale: z.number().min(1.01).max(1.5),
  durationMs: DurationSchema,
});

export const OutlinePulseEffectSchema = z.object({
  type: z.literal('outlinePulse'),
  color: ColorTokenSchema,
  width: z.number().min(0.1).max(3),
  spread: z.number().min(1).max(1.5),
  durationMs: DurationSchema,
});

export const FloatEffectSchema = z.object({
  type: z.literal('float'),
  distance: z.number().min(0.1).max(10),
  durationMs: DurationSchema,
});

export const FadeInEffectSchema = z.object({
  type: z.literal('fadeIn'),
  delayMs: z.number().int().min(0).max(10000),
  durationMs: DurationSchema,
});

/** 1–4 colors; the effect cycles through them in order. */
const EffectColorsSchema = z.array(ColorTokenSchema).min(1).max(MAX_EFFECT_COLORS);

/** Soft glow around the element that breathes and blends from color to color. durationMs = per color. */
export const GlowEffectSchema = z.object({
  type: z.literal('glow'),
  colors: EffectColorsSchema,
  blur: z.number().min(0.5).max(10),
  spread: z.number().min(0).max(5),
  durationMs: DurationSchema,
  /** Images only: follow the picture's outline (transparent PNG/WebP) instead of its box. */
  contour: z.boolean().optional(),
});

/**
 * Images only. A blurred copy sits under the sharp image; only opacity is animated.
 *  - static:  always blurred
 *  - focusIn: blurred → sharp once, when the scene first becomes visible
 *  - breathe: sharp ↔ blurred loop
 */
export const BlurEffectSchema = z.object({
  type: z.literal('blur'),
  amount: z.number().min(0.2).max(10),
  mode: z.enum(['static', 'focusIn', 'breathe']),
  durationMs: DurationSchema,
});

/** The edge flashes ("blink") or cross-fades ("fade") through the colors. durationMs = per color. */
export const EdgeBlinkEffectSchema = z.object({
  type: z.literal('edgeBlink'),
  colors: EffectColorsSchema,
  width: z.number().min(0.1).max(3),
  blur: z.number().min(0).max(5),
  mode: z.enum(['blink', 'fade']),
  durationMs: DurationSchema,
});

/** Lights running around the border; one light per color, evenly spaced. durationMs = one lap. */
export const BorderRunEffectSchema = z.object({
  type: z.literal('borderRun'),
  colors: EffectColorsSchema,
  size: z.number().min(0.3).max(5),
  durationMs: DurationSchema,
});

export const EffectSchema = z.discriminatedUnion('type', [
  PulseEffectSchema,
  OutlinePulseEffectSchema,
  FloatEffectSchema,
  FadeInEffectSchema,
  GlowEffectSchema,
  EdgeBlinkEffectSchema,
  BorderRunEffectSchema,
  BlurEffectSchema,
]);
export type Effect = z.infer<typeof EffectSchema>;
export type EffectType = Effect['type'];
export type EffectOf<T extends EffectType> = Extract<Effect, { type: T }>;
/** Effects that only make sense on image nodes (the editor offers them only there). */
export const IMAGE_ONLY_EFFECTS: readonly EffectType[] = ['blur'];

export const EFFECT_TYPES: readonly EffectType[] = [
  'pulse',
  'outlinePulse',
  'glow',
  'edgeBlink',
  'borderRun',
  'blur',
  'float',
  'fadeIn',
];

const EffectsSchema = z
  .array(EffectSchema)
  .max(MAX_EFFECTS_PER_NODE)
  .refine((list) => new Set(list.map((e) => e.type)).size === list.length, {
    message: 'each effect type may appear only once per node',
  });

/* ───────────── Actions (whitelist — never code, never raw URLs) ───────────── */

export const RouteSchema = z.string().regex(/^[A-Za-z][A-Za-z0-9_]{0,63}$/, 'invalid route name');
export const ParamKeySchema = z.string().regex(/^[A-Za-z][A-Za-z0-9_]{0,31}$/);
/**
 * Relative path on your own site: starts with a single "/", no scheme, no "//", no backslashes,
 * no whitespace or control characters. Blocks open redirects and javascript: links.
 */
export const WebPathSchema = z
  .string()
  .max(512)
  .regex(/^\/(?![\/\\])[^\s\\<>"'`]*$/, 'webPath must be a relative path like /casino/slots');

export const ActionSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('navigate'),
    /** App screen name — the app maps it to its own navigation. */
    route: RouteSchema,
    /** Optional same-site web path (e.g. "/casino/slots?tab=new"). Never an absolute/external URL. */
    webPath: WebPathSchema.optional(),
    params: z
      .record(ParamKeySchema, z.string().max(256))
      .refine((p) => Object.keys(p).length <= 10, { message: 'max 10 params' })
      .optional(),
  }),
  z.object({ type: z.literal('openPromo'), promoId: IdSchema }),
  z.object({ type: z.literal('openGame'), gameId: IdSchema }),
]);
export type SceneAction = z.infer<typeof ActionSchema>;

/* ───────────── Nodes ───────────── */

const WeightSchema = z.enum(['400', '500', '600', '700', '800']);
/** Key into the app's font map (e.g. "heading" → "Montserrat-Bold"). Missing/unknown → default font. */
export const FontKeySchema = z.string().regex(/^[A-Za-z][A-Za-z0-9_-]{0,31}$/, 'font: letter first, max 32 chars');
/** Maps font keys used in scenes to real font families. Each app passes its own. */
export type FontMap = Readonly<Record<string, string>>;
export type FontWeight = z.infer<typeof WeightSchema>;
const RadiusSchema = z.number().min(0).max(50);
const FontSizeSchema = z.number().min(0.5).max(30);

const baseNode = {
  id: IdSchema,
  name: z.string().max(80),
  frame: FrameSchema,
  opacity: z.number().min(0).max(1),
  hidden: z.boolean(),
  shadow: ShadowSchema.nullable(),
  effects: EffectsSchema,
};

export const ImageNodeSchema = z.object({
  ...baseNode,
  type: z.literal('image'),
  uri: ImageUriSchema,
  fit: z.enum(['cover', 'contain']),
  alt: z.string().max(200),
  radius: RadiusSchema,
});

export const TextNodeSchema = z.object({
  ...baseNode,
  type: z.literal('text'),
  text: z.string().min(1).max(500),
  color: ColorTokenSchema,
  font: FontKeySchema.optional(),
  fontSize: FontSizeSchema,
  weight: WeightSchema,
  align: z.enum(['left', 'center', 'right']),
});

export const ButtonNodeSchema = z.object({
  ...baseNode,
  type: z.literal('button'),
  label: z.string().min(1).max(60),
  action: ActionSchema,
  bg: ColorTokenSchema,
  fg: ColorTokenSchema,
  font: FontKeySchema.optional(),
  fontSize: FontSizeSchema,
  weight: WeightSchema,
  radius: RadiusSchema,
});

export const ShapeNodeSchema = z.object({
  ...baseNode,
  type: z.literal('shape'),
  shape: z.enum(['rect', 'ellipse']),
  fill: ColorTokenSchema,
  radius: RadiusSchema,
});

export const NodeSchema = z.discriminatedUnion('type', [
  ImageNodeSchema,
  TextNodeSchema,
  ButtonNodeSchema,
  ShapeNodeSchema,
]);
export type SceneNode = z.infer<typeof NodeSchema>;
export type NodeType = SceneNode['type'];
export type NodeOf<T extends NodeType> = Extract<SceneNode, { type: T }>;

/* ───────────── Scene ───────────── */

export const SceneSchema = z.object({
  version: z.literal(SCENE_VERSION),
  id: IdSchema,
  name: z.string().max(120),
  /** width / height */
  aspectRatio: z.number().min(0.2).max(5),
  background: ColorTokenSchema.nullable(),
  /** Array order = z-order (last is on top). */
  nodes: z.array(NodeSchema).max(MAX_NODES),
});
export type Scene = z.infer<typeof SceneSchema>;
