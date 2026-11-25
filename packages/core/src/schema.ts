import { z } from 'zod';
import { SCENE_VERSION, MAX_NODES, MAX_EFFECTS_PER_NODE, MAX_EFFECT_COLORS, COLOR_TOKENS, ENTER_PRESETS, ENTER_FROM, EASINGS } from './constants';

export { SCENE_VERSION, MAX_NODES, MAX_EFFECTS_PER_NODE, MAX_EFFECT_COLORS, COLOR_TOKENS, ENTER_PRESETS, ENTER_FROM, EASINGS } from './constants';
export type { EnterPreset, Easing } from './constants';

/**
 * Units
 * - frame.x / y / w / h  → percent of the scene (x, w: of width; y, h: of height)
 * - every other length   → "u" = 1% of the scene WIDTH
 *   (fontSize, radius, shadow offsets/blur, outline width, float distance)
 *   On web 1u === 1cqw, on native 1u === sceneWidth / 100.
 */



export const ColorTokenSchema = z.enum(COLOR_TOKENS);
export type ColorToken = z.infer<typeof ColorTokenSchema>;

/** Maps theme tokens to real colors. The app passes its own theme (Colors.*). */
export type Palette = Record<ColorToken, string>;

export const IdSchema = z.string().regex(/^[A-Za-z0-9_-]{1,64}$/, 'id: 1-64 chars [A-Za-z0-9_-]');
const DurationSchema = z.number().int().min(100).max(20000);

/** "YYYY-MM-DD" */
export const DateKeySchema = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/, 'date must be YYYY-MM-DD');
/** "YYYY-MM" */
export const MonthKeySchema = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'month must be YYYY-MM');
/** IANA time zone, e.g. "Europe/Sofia" */
export const TimeZoneSchema = z.string().regex(/^[A-Za-z]+(?:\/[A-Za-z0-9_+-]+){0,2}$/, 'time zone like Europe/Sofia');
export const TimeOfDaySchema = z.object({
  hour: z.number().int().min(0).max(23),
  minute: z.number().int().min(0).max(59),
});
export type TimeOfDay = z.infer<typeof TimeOfDaySchema>;

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

/** Optional start offset for loop effects – staggers otherwise identical loops (e.g. floating cards). */
const LoopDelaySchema = z.number().int().min(0).max(10000).optional();

export const PulseEffectSchema = z.object({
  type: z.literal('pulse'),
  scale: z.number().min(1.01).max(1.5),
  durationMs: DurationSchema,
  delayMs: LoopDelaySchema,
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
  delayMs: LoopDelaySchema,
});

/** Rocks back and forth around the centre (±angle degrees). */
export const WiggleEffectSchema = z.object({
  type: z.literal('wiggle'),
  angle: z.number().min(0.5).max(30),
  durationMs: DurationSchema,
  delayMs: LoopDelaySchema,
});

/** Continuous rotation. durationMs = one full turn. */
export const SpinEffectSchema = z.object({
  type: z.literal('spin'),
  direction: z.enum(['cw', 'ccw']),
  durationMs: DurationSchema,
});



export const EnterEffectSchema = z.object({
  type: z.literal('enter'),
  preset: z.enum(ENTER_PRESETS),
  delayMs: z.number().int().min(0).max(10000),
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

/* ── Slider Revolution–style effects ── */

const Ms = (max: number) => z.number().int().min(0).max(max);


/** Full layer state at a moment. x / y in "u", relative to the layer's frame; rotate in degrees. */
export const KeyframeSchema = z.object({
  atMs: Ms(20000),
  opacity: z.number().min(0).max(1),
  x: z.number().min(-200).max(200),
  y: z.number().min(-200).max(200),
  scale: z.number().min(0).max(5),
  rotate: z.number().min(-1080).max(1080),
  /** Easing used to arrive at this keyframe from the previous one (ignored on the first). */
  easing: z.enum(EASINGS),
});
export type Keyframe = z.infer<typeof KeyframeSchema>;

/**
 * Keyframe timeline. Starts when the scene enters the view (or its slide becomes active), after delayMs.
 * repeat: none = play once and hold the last keyframe · loop = restart · pingpong = back and forth.
 * The first keyframe is at 0 ms, times strictly increase.
 */
export const TimelineEffectSchema = z
  .object({
    type: z.literal('timeline'),
    delayMs: Ms(10000),
    repeat: z.enum(['none', 'loop', 'pingpong']),
    keyframes: z.array(KeyframeSchema).min(2).max(12),
  })
  .refine((t) => t.keyframes[0]?.atMs === 0, { message: 'first keyframe must be at 0 ms' })
  .refine((t) => t.keyframes.every((k, i, a) => i === 0 || k.atMs > (a[i - 1] as Keyframe).atMs), {
    message: 'keyframe times must increase',
  });

/** Images only: slow zoom / pan inside the layer's frame (the picture is clipped to the frame). */
export const KenBurnsEffectSchema = z.object({
  type: z.literal('kenBurns'),
  fromScale: z.number().min(1).max(2),
  toScale: z.number().min(1).max(2),
  /** Pan in % of the layer size. */
  fromX: z.number().min(-25).max(25),
  fromY: z.number().min(-25).max(25),
  toX: z.number().min(-25).max(25),
  toY: z.number().min(-25).max(25),
  durationMs: z.number().int().min(1000).max(60000),
  mode: z.enum(['once', 'pingpong']),
});

/**
 * Moves the layer at a different speed while the page scrolls: depth > 0 = farther (slower),
 * depth < 0 = closer (faster). Only has an effect inside a PageView.
 */
export const ParallaxEffectSchema = z.object({
  type: z.literal('parallax'),
  depth: z.number().min(-1).max(1),
});

/** Text only: each character / word enters with the preset, one after another. */
export const SplitTextEffectSchema = z.object({
  type: z.literal('splitText'),
  by: z.enum(['char', 'word']),
  preset: z.enum(ENTER_PRESETS),
  staggerMs: Ms(500),
  delayMs: Ms(10000),
  durationMs: z.number().int().min(100).max(5000),
});

export const EffectSchema = z.discriminatedUnion('type', [
  PulseEffectSchema,
  OutlinePulseEffectSchema,
  FloatEffectSchema,
  FadeInEffectSchema,
  EnterEffectSchema,
  WiggleEffectSchema,
  SpinEffectSchema,
  TimelineEffectSchema,
  KenBurnsEffectSchema,
  ParallaxEffectSchema,
  SplitTextEffectSchema,
  GlowEffectSchema,
  EdgeBlinkEffectSchema,
  BorderRunEffectSchema,
  BlurEffectSchema,
]);
export type Effect = z.infer<typeof EffectSchema>;
export type EffectType = Effect['type'];
export type EffectOf<T extends EffectType> = Extract<Effect, { type: T }>;
/** Effects that only make sense on image nodes (the editor offers them only there). */
export const IMAGE_ONLY_EFFECTS: readonly EffectType[] = ['blur', 'kenBurns'];
/** Effects that only make sense on text nodes. */
export const TEXT_ONLY_EFFECTS: readonly EffectType[] = ['splitText'];

export const EFFECT_TYPES: readonly EffectType[] = [
  'pulse',
  'outlinePulse',
  'glow',
  'edgeBlink',
  'borderRun',
  'blur',
  'float',
  'wiggle',
  'spin',
  'fadeIn',
  'enter',
  'timeline',
  'splitText',
  'kenBurns',
  'parallax',
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

/** Tap a layer → play / show / hide / toggle other layers of the same scene (whitelisted, no code). */
export const TriggerSchema = z.object({
  /** play = replay the target's enter / timeline / splitText · show / hide / toggle = visibility with a fade */
  do: z.enum(['play', 'show', 'hide', 'toggle']),
  target: IdSchema,
});
export type Trigger = z.infer<typeof TriggerSchema>;
export const MAX_TRIGGERS = 6;

/**
 * Hover / press highlight. Web: on mouse hover and keyboard focus. Apps: while the layer is pressed
 * (and on pointer hover where the platform has one). lift is in "u", glow.blur in "u".
 */
export const HoverSchema = z.object({
  scale: z.number().min(1).max(1.5),
  lift: z.number().min(0).max(10),
  brightness: z.number().min(0.5).max(2),
  glow: z
    .object({
      color: ColorTokenSchema,
      blur: z.number().min(0).max(10),
      opacity: z.number().min(0).max(1),
    })
    .nullable(),
  durationMs: z.number().int().min(50).max(2000),
});
export type Hover = z.infer<typeof HoverSchema>;

const baseNode = {
  id: IdSchema,
  name: z.string().max(80),
  frame: FrameSchema,
  opacity: z.number().min(0).max(1),
  hidden: z.boolean(),
  shadow: ShadowSchema.nullable(),
  effects: EffectsSchema,
  /** Tapping this layer runs these (in order). Targets must be ids in the same scene. */
  triggers: z.array(TriggerSchema).max(MAX_TRIGGERS).optional(),
  /** Starts invisible; a show / toggle trigger reveals it. (`hidden` removes the layer entirely.) */
  startHidden: z.boolean().optional(),
  /** Highlight on hover (web) / press (apps). */
  hover: HoverSchema.optional(),
};

export const ImageNodeSchema = z.object({
  ...baseNode,
  type: z.literal('image'),
  uri: ImageUriSchema,
  fit: z.enum(['cover', 'contain']),
  alt: z.string().max(200),
  radius: RadiusSchema,
  /** Optional: makes the image tappable (e.g. promo cards linking to other promos). alt = accessible label. */
  action: ActionSchema.optional(),
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

/** Lottie (After Effects) animation from your CDN: https .json or .lottie only. */
export const LottieUriSchema = z
  .string()
  .max(2048)
  .regex(/^https:\/\/[^\s"'<>?]+\.(json|lottie)(\?[^\s"'<>]*)?$/, 'uri must be an https:// .json or .lottie file');

export const LottieNodeSchema = z.object({
  ...baseNode,
  type: z.literal('lottie'),
  uri: LottieUriSchema,
  loop: z.boolean(),
  speed: z.number().min(0.1).max(3),
  alt: z.string().max(200),
});

/** Time left until a wall-clock moment in the campaign's time zone, e.g. "2д 03:14:09". */
export const CountdownNodeSchema = z.object({
  ...baseNode,
  type: z.literal('countdown'),
  endDate: DateKeySchema,
  endTime: TimeOfDaySchema,
  timeZone: TimeZoneSchema,
  /** dhms = always days · hms = hours can exceed 24 · auto = days only while > 0 */
  format: z.enum(['dhms', 'hms', 'auto']),
  /** Unit labels, e.g. { days: 'д', … }; all empty = "02:03:14:09". */
  labels: z.object({
    days: z.string().max(10),
    hours: z.string().max(10),
    minutes: z.string().max(10),
    seconds: z.string().max(10),
  }),
  /** Shown after the end, e.g. "ПРОМОЦИЯТА ПРИКЛЮЧИ". */
  endedText: z.string().max(80),
  color: ColorTokenSchema,
  font: FontKeySchema.optional(),
  fontSize: FontSizeSchema,
  weight: WeightSchema,
  align: z.enum(['left', 'center', 'right']),
});

export const NodeSchema = z.discriminatedUnion('type', [
  ImageNodeSchema,
  TextNodeSchema,
  ButtonNodeSchema,
  ShapeNodeSchema,
  LottieNodeSchema,
  CountdownNodeSchema,
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
