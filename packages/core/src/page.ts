import { z } from 'zod';
import { parseScene, type ParseIssue } from './parse';
import { ColorTokenSchema, IdSchema, SceneSchema, type Scene } from './schema';
import { WidgetSchema, type Widget } from './widgets';

/**
 * A promo page = a vertical stack of sections:
 *  - scene:  a free-form scene (layers + effects) with an optional mobile variant
 *  - widget: an interactive block (calendar, draw videos, game carousel, ticket counter, terms)
 */

export const PAGE_VERSION = 1;
export const MAX_SECTIONS = 20;

export const SceneSectionSchema = z.object({
  kind: z.literal('scene'),
  id: IdSchema,
  scene: SceneSchema,
  /** Used when the page is narrower than page.mobileBreakpoint. null = always `scene`. */
  mobileScene: SceneSchema.nullable(),
});

export const WidgetSectionSchema = z
  .object({
    kind: z.literal('widget'),
    id: IdSchema,
    widget: WidgetSchema,
    /** Same widget type with phone settings (e.g. a portrait ticket background). null = always `widget`. */
    mobileWidget: WidgetSchema.nullable().optional(),
  })
  .refine((s) => !s.mobileWidget || s.mobileWidget.type === s.widget.type, {
    message: 'mobileWidget must be the same widget type',
  });

export const SLIDER_TRANSITIONS = ['fade', 'slide', 'zoom', 'flip'] as const;
export const MAX_SLIDES = 10;

export const SlideSchema = z.object({
  id: IdSchema,
  scene: SceneSchema,
  mobileScene: SceneSchema.nullable(),
});
export type Slide = z.infer<typeof SlideSchema>;

/** Same aspect ratio on every slide (per variant) so the slider never jumps in height. */
function slidesConsistent(slides: readonly Slide[]): string | null {
  const first = slides[0];
  if (!first) return null;
  if (slides.some((s) => Math.abs(s.scene.aspectRatio - first.scene.aspectRatio) > 0.001)) return 'all slides need the same aspect ratio';
  const withMobile = slides.filter((s) => s.mobileScene).length;
  if (withMobile !== 0 && withMobile !== slides.length) return 'either every slide has a mobile scene or none';
  const m = first.mobileScene;
  if (m && slides.some((s) => Math.abs((s.mobileScene as Scene).aspectRatio - m.aspectRatio) > 0.001)) {
    return 'all mobile slides need the same aspect ratio';
  }
  return null;
}

/** Hero carousel: slides are scenes; their layer animations replay every time a slide becomes active. */
const SliderBaseSchema = z.object({
    kind: z.literal('slider'),
    id: IdSchema,
    slides: z.array(SlideSchema).min(1).max(MAX_SLIDES),
    transition: z.enum(SLIDER_TRANSITIONS),
    transitionMs: z.number().int().min(150).max(3000),
    /** 0 = manual only */
    autoplayMs: z.number().int().min(0).max(30000),
    loop: z.boolean(),
    showDots: z.boolean(),
    showArrows: z.boolean(),
    /** Pause autoplay while the user touches / hovers the slider. */
    pauseOnInteraction: z.boolean(),
    dotColor: ColorTokenSchema,
    activeDotColor: ColorTokenSchema,
  });
export const SliderSectionSchema = SliderBaseSchema.refine((s) => slidesConsistent(s.slides) === null, {
  message: 'slides must share aspect ratios',
});

export const SectionSchema = z.union([SceneSectionSchema, WidgetSectionSchema, SliderSectionSchema]);
export type PageSection = z.infer<typeof SectionSchema>;

export const PageSchema = z.object({
  version: z.literal(PAGE_VERSION),
  id: IdSchema,
  name: z.string().max(120),
  background: ColorTokenSchema.nullable(),
  /** Below this width (px / dp) scene sections use their mobileScene. */
  mobileBreakpoint: z.number().int().min(200).max(2000),
  /** Content never grows wider than this (px / dp); centred. */
  maxWidth: z.number().int().min(320).max(4000),
  sections: z.array(SectionSchema).max(MAX_SECTIONS),
});
export type Page = z.infer<typeof PageSchema>;

/** What the host app tells the page about the current user. Never tokens – only display values. */
export type PageUser = {
  loggedIn: boolean;
  /** e.g. { tickets: 7 } – shown by ticketCounter widgets. */
  fields?: Readonly<Record<string, string | number>>;
};

export type PageParseResult =
  | { ok: true; page: Page; warnings: ParseIssue[] }
  | { ok: false; error: string; warnings: ParseIssue[] };

const EnvelopeSchema = PageSchema.omit({ sections: true }).extend({
  sections: z.array(z.unknown()).max(MAX_SECTIONS),
});

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);

function issues(error: z.ZodError): string {
  return error.issues
    .slice(0, 5)
    .map((i) => (i.path.length ? `${i.path.map(String).join('.')}: ${i.message}` : i.message))
    .join('; ');
}

function parseSceneIn(raw: unknown, path: string, warnings: ParseIssue[]): Scene | null {
  const result = parseScene(raw);
  for (const w of result.warnings) warnings.push({ path: `${path}.${w.path}`, message: w.message });
  if (!result.ok) {
    warnings.push({ path, message: `dropped invalid scene (${result.error})` });
    return null;
  }
  return result.scene;
}

/**
 * Tolerant parser for pages coming from the network (same contract as parseScene):
 * an invalid section (or a scene's invalid layer) is dropped with a warning, the rest renders.
 * Never throws.
 */
export function parsePage(input: unknown): PageParseResult {
  let data: unknown = input;
  if (typeof input === 'string') {
    try {
      data = JSON.parse(input);
    } catch {
      return { ok: false, error: 'Invalid JSON', warnings: [] };
    }
  }
  if (isRecord(data) && typeof data.version === 'number' && data.version !== PAGE_VERSION) {
    return { ok: false, error: `Unsupported page version ${data.version} (this build supports ${PAGE_VERSION})`, warnings: [] };
  }
  const envelope = EnvelopeSchema.safeParse(data);
  if (!envelope.success) return { ok: false, error: issues(envelope.error), warnings: [] };

  const warnings: ParseIssue[] = [];
  const seen = new Set<string>();
  const sections: PageSection[] = [];

  envelope.data.sections.forEach((raw, i) => {
    const path = `sections[${i}]`;
    if (!isRecord(raw) || typeof raw.id !== 'string' || !IdSchema.safeParse(raw.id).success) {
      warnings.push({ path, message: 'dropped section without a valid id' });
      return;
    }
    if (seen.has(raw.id)) {
      warnings.push({ path, message: `dropped duplicate section id "${raw.id}"` });
      return;
    }
    if (raw.kind === 'scene') {
      const scene = parseSceneIn(raw.scene, `${path}.scene`, warnings);
      if (!scene) return;
      const mobileScene = raw.mobileScene == null ? null : parseSceneIn(raw.mobileScene, `${path}.mobileScene`, warnings);
      seen.add(raw.id);
      sections.push({ kind: 'scene', id: raw.id, scene, mobileScene });
      return;
    }
    if (raw.kind === 'widget') {
      const widget = WidgetSchema.safeParse(raw.widget);
      if (!widget.success) {
        warnings.push({ path, message: `dropped invalid widget (${issues(widget.error)})` });
        return;
      }
      let mobileWidget: Widget | null | undefined = raw.mobileWidget === undefined ? undefined : null;
      if (raw.mobileWidget != null) {
        const m = WidgetSchema.safeParse(raw.mobileWidget);
        if (m.success && m.data.type === widget.data.type) mobileWidget = m.data as Widget;
        else warnings.push({ path: `${path}.mobileWidget`, message: 'dropped invalid mobile widget' });
      }
      seen.add(raw.id);
      const section: PageSection = { kind: 'widget', id: raw.id, widget: widget.data as Widget };
      if (mobileWidget !== undefined) (section as { mobileWidget?: Widget | null }).mobileWidget = mobileWidget;
      sections.push(section);
      return;
    }
    if (raw.kind === 'slider') {
      const settings = SliderBaseSchema.omit({ slides: true }).safeParse({ ...raw, slides: undefined });
      if (!settings.success || !Array.isArray(raw.slides)) {
        warnings.push({ path, message: `dropped invalid slider (${settings.success ? 'slides missing' : issues(settings.error)})` });
        return;
      }
      const slides: Slide[] = [];
      const slideIds = new Set<string>();
      raw.slides.slice(0, MAX_SLIDES).forEach((rs: unknown, j: number) => {
        const sp = `${path}.slides[${j}]`;
        if (!isRecord(rs) || typeof rs.id !== 'string' || !IdSchema.safeParse(rs.id).success || slideIds.has(rs.id)) {
          warnings.push({ path: sp, message: 'dropped slide without a valid unique id' });
          return;
        }
        const scene = parseSceneIn(rs.scene, `${sp}.scene`, warnings);
        if (!scene) return;
        const mobileScene = rs.mobileScene == null ? null : parseSceneIn(rs.mobileScene, `${sp}.mobileScene`, warnings);
        slideIds.add(rs.id);
        slides.push({ id: rs.id, scene, mobileScene });
      });
      const problem = slides.length === 0 ? 'no valid slides' : slidesConsistent(slides);
      if (problem) {
        warnings.push({ path, message: `dropped slider (${problem})` });
        return;
      }
      seen.add(raw.id);
      sections.push({ ...settings.data, kind: 'slider', id: raw.id, slides });
      return;
    }
    warnings.push({ path, message: 'dropped section with unknown kind' });
  });

  return { ok: true, page: { ...envelope.data, sections }, warnings };
}

function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (typeof a !== 'object' || typeof b !== 'object' || a === null || b === null) return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  const ka = Object.keys(a);
  const kb = Object.keys(b);
  if (ka.length !== kb.length) return false;
  return ka.every((k) => Object.hasOwn(b, k) && deepEqual((a as Record<string, unknown>)[k], (b as Record<string, unknown>)[k]));
}

export type PageValidateResult = { ok: true; page: Page } | { ok: false; errors: string[] };

/** Strict validation for backends: nothing is dropped silently, unknown properties are errors. */
export function validatePage(input: unknown): PageValidateResult {
  let data: unknown = input;
  if (typeof input === 'string') {
    try {
      data = JSON.parse(input);
    } catch {
      return { ok: false, errors: ['Invalid JSON'] };
    }
  }
  const result = parsePage(data);
  if (!result.ok) return { ok: false, errors: [result.error] };
  if (result.warnings.length > 0) return { ok: false, errors: result.warnings.map((w) => `${w.path}: ${w.message}`) };
  if (!deepEqual(result.page, data)) return { ok: false, errors: ['page contains unknown properties'] };
  return { ok: true, page: result.page };
}

export function serializePage(page: Page, pretty = false): string {
  const result = PageSchema.safeParse(page);
  if (!result.success) throw new Error(issues(result.error));
  return JSON.stringify(result.data, null, pretty ? 2 : undefined);
}

export { sceneForWidth, widgetForWidth } from './pageHelpers';

/** JSON Schema for non-JS backends (same rules; uniqueness checks must be done there too). */
export function pageJsonSchema(): Record<string, unknown> {
  const schema = z.toJSONSchema(PageSchema, { target: 'draft-2020-12', io: 'output' });
  return {
    $schema: schema.$schema,
    $id: 'https://unpkg.com/@chiko111/scene-kit-core/page.schema.json',
    title: 'scene-kit page',
    ...schema,
  };
}
