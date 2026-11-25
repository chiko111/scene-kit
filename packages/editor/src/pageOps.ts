import {
  MAX_SLIDES,
  createId,
  createScene,
  type Page,
  type PageSection,
  type Scene,
  type Slide,
  type Widget,
} from '@chiko111/scene-kit-core';
import { SCENE_TEMPLATES, templateScene } from './templates';

export type SceneVariant = 'desktop' | 'mobile';
type SceneSection = Extract<PageSection, { kind: 'scene' }>;
type WidgetSection = Extract<PageSection, { kind: 'widget' }>;
export type SliderSection = Extract<PageSection, { kind: 'slider' }>;

export const sectionIds = (page: Page): Set<string> => new Set(page.sections.map((s) => s.id));

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

export function addSection(page: Page, section: PageSection, afterId: string | null): Page {
  const i = afterId ? page.sections.findIndex((s) => s.id === afterId) : -1;
  const sections = [...page.sections];
  sections.splice(i >= 0 ? i + 1 : sections.length, 0, section);
  return { ...page, sections };
}

export function removeSection(page: Page, id: string): Page {
  return { ...page, sections: page.sections.filter((s) => s.id !== id) };
}

export function moveSection(page: Page, id: string, delta: number): Page {
  const i = page.sections.findIndex((s) => s.id === id);
  const j = i + delta;
  if (i < 0 || j < 0 || j >= page.sections.length) return page;
  const sections = [...page.sections];
  const [item] = sections.splice(i, 1);
  if (item) sections.splice(j, 0, item);
  return { ...page, sections };
}

export function updateSection(page: Page, id: string, recipe: (s: PageSection) => PageSection): Page {
  let changed = false;
  const sections = page.sections.map((s) => {
    if (s.id !== id) return s;
    const next = recipe(s);
    if (next !== s) changed = true;
    return next;
  });
  return changed ? { ...page, sections } : page;
}

function copyScene(scene: Scene): Scene {
  return { ...clone(scene), id: createId('scene') };
}

function copySlide(slide: Slide, taken: ReadonlySet<string>): Slide {
  return {
    id: createId('slide', taken),
    scene: copyScene(slide.scene),
    mobileScene: slide.mobileScene ? copyScene(slide.mobileScene) : null,
  };
}

export function duplicateSection(page: Page, id: string): { page: Page; newId: string | null } {
  const source = page.sections.find((s) => s.id === id);
  if (!source) return { page, newId: null };
  const newId = createId('sec', sectionIds(page));
  let copy: PageSection;
  if (source.kind === 'scene') {
    copy = { ...source, id: newId, scene: copyScene(source.scene), mobileScene: source.mobileScene ? copyScene(source.mobileScene) : null };
  } else if (source.kind === 'widget') {
    copy = clone(source);
    copy.id = newId;
  } else {
    const taken = new Set<string>();
    const slides = source.slides.map((s) => {
      const c = copySlide(s, taken);
      taken.add(c.id);
      return c;
    });
    copy = { ...clone(source), id: newId, slides };
  }
  return { page: addSection(page, copy, id), newId };
}

/* ───────────── scene sections ───────────── */

export function getSceneVariant(page: Page, id: string, variant: SceneVariant): Scene | null {
  const s = page.sections.find((x) => x.id === id);
  if (!s || s.kind !== 'scene') return null;
  return variant === 'mobile' ? s.mobileScene : s.scene;
}

export function setSceneVariant(page: Page, id: string, variant: SceneVariant, scene: Scene | null): Page {
  return updateSection(page, id, (s) => {
    if (s.kind !== 'scene') return s;
    if (variant === 'desktop') return scene ? { ...s, scene } : s;
    return { ...s, mobileScene: scene };
  });
}

/** Mobile version starts as a copy of the desktop scene (portrait-ish ratio is up to the operator). */
export function createMobileVariant(page: Page, id: string): Page {
  const desktop = getSceneVariant(page, id, 'desktop');
  if (!desktop) return page;
  return setSceneVariant(page, id, 'mobile', { ...copyScene(desktop), name: `${desktop.name} (mobile)`.slice(0, 120) });
}

export function createTemplateSceneSection(taken: ReadonlySet<string>, templateId?: string, aspectRatio = 16 / 9): SceneSection {
  const scene = (templateId && templateScene(templateId)) || createScene('Section', aspectRatio);
  return { kind: 'scene', id: createId('sec', taken), scene, mobileScene: null };
}

/* ───────────── widget sections ───────────── */

export function getWidgetVariant(page: Page, id: string, variant: SceneVariant): Widget | null {
  const s = page.sections.find((x) => x.id === id);
  if (!s || s.kind !== 'widget') return null;
  return variant === 'mobile' ? (s.mobileWidget ?? null) : s.widget;
}

export function setWidgetVariant(page: Page, id: string, variant: SceneVariant, widget: Widget | null): Page {
  return updateSection(page, id, (s) => {
    if (s.kind !== 'widget') return s;
    if (variant === 'desktop') {
      if (!widget) return s;
      // a type change on desktop would make the mobile variant invalid → drop it
      const mobileOk = !s.mobileWidget || s.mobileWidget.type === widget.type;
      return mobileOk ? { ...s, widget } : withoutMobileWidget({ ...s, widget });
    }
    return widget ? { ...s, mobileWidget: widget } : withoutMobileWidget(s);
  });
}

function withoutMobileWidget(s: WidgetSection): WidgetSection {
  const { mobileWidget: _drop, ...rest } = s;
  return rest;
}

export function createWidgetMobileVariant(page: Page, id: string): Page {
  const desktop = getWidgetVariant(page, id, 'desktop');
  return desktop ? setWidgetVariant(page, id, 'mobile', clone(desktop)) : page;
}

/* ───────────── slider sections ───────────── */

export const DEFAULT_SLIDER_TEMPLATES = ['hero-cta', 'ken-burns'] as const;

export function createSliderSection(taken: ReadonlySet<string>, templateIds: readonly string[] = DEFAULT_SLIDER_TEMPLATES): SliderSection {
  const ids = new Set<string>();
  const first = templateScene(templateIds[0] ?? 'hero-cta') ?? createScene('Slide 1', 16 / 9);
  const slides: Slide[] = templateIds.map((tid, i) => {
    const scene = i === 0 ? first : (templateScene(tid, first.aspectRatio) ?? createScene(`Slide ${i + 1}`, first.aspectRatio));
    const id = createId('slide', ids);
    ids.add(id);
    return { id, scene: { ...scene, name: `Slide ${i + 1}: ${scene.name}`.slice(0, 120) }, mobileScene: null };
  });
  return {
    kind: 'slider',
    id: createId('sec', taken),
    slides,
    transition: 'fade',
    transitionMs: 700,
    autoplayMs: 6000,
    loop: true,
    showDots: true,
    showArrows: true,
    pauseOnInteraction: true,
    dotColor: 'white',
    activeDotColor: 'gold',
  };
}

function getSlider(page: Page, id: string): SliderSection | null {
  const s = page.sections.find((x) => x.id === id);
  return s && s.kind === 'slider' ? s : null;
}

function updateSlider(page: Page, id: string, recipe: (s: SliderSection) => SliderSection): Page {
  return updateSection(page, id, (s) => (s.kind === 'slider' ? recipe(s) : s));
}

export function getSlideScene(page: Page, sectionId: string, slideId: string, variant: SceneVariant): Scene | null {
  const slide = getSlider(page, sectionId)?.slides.find((s) => s.id === slideId);
  if (!slide) return null;
  return variant === 'mobile' ? slide.mobileScene : slide.scene;
}

/**
 * Sets one slide's scene. An aspect-ratio change is applied to the same variant of every slide,
 * so the slider never becomes invalid (all slides share one ratio per variant).
 */
export function setSlideScene(page: Page, sectionId: string, slideId: string, variant: SceneVariant, scene: Scene): Page {
  return updateSlider(page, sectionId, (s) => {
    const slides = s.slides.map((slide) => {
      const current = variant === 'mobile' ? slide.mobileScene : slide.scene;
      if (slide.id === slideId) return variant === 'mobile' ? { ...slide, mobileScene: scene } : { ...slide, scene };
      if (!current || Math.abs(current.aspectRatio - scene.aspectRatio) < 0.0001) return slide;
      const resized = { ...current, aspectRatio: scene.aspectRatio };
      return variant === 'mobile' ? { ...slide, mobileScene: resized } : { ...slide, scene: resized };
    });
    return { ...s, slides };
  });
}

/** New slide after `afterId`: a template (resized to the slider's ratio) or a copy of the slide it follows. */
export function addSlide(page: Page, sectionId: string, afterId: string | null, templateId?: string): { page: Page; slideId: string | null } {
  const slider = getSlider(page, sectionId);
  if (!slider || slider.slides.length >= MAX_SLIDES) return { page, slideId: null };
  const taken = new Set(slider.slides.map((s) => s.id));
  const anchorIndex = afterId ? slider.slides.findIndex((s) => s.id === afterId) : slider.slides.length - 1;
  const anchor = slider.slides[anchorIndex] ?? slider.slides[slider.slides.length - 1];
  if (!anchor) return { page, slideId: null };
  const tpl = templateId ? templateScene(templateId, anchor.scene.aspectRatio) : null;
  const slide: Slide = tpl
    ? {
        id: createId('slide', taken),
        scene: { ...tpl, name: `Slide ${slider.slides.length + 1}: ${tpl.name}`.slice(0, 120) },
        mobileScene: anchor.mobileScene ? { ...copyScene(tpl), aspectRatio: anchor.mobileScene.aspectRatio, name: `${tpl.name} (mobile)`.slice(0, 120) } : null,
      }
    : copySlide(anchor, taken);
  const slides = [...slider.slides];
  slides.splice(anchorIndex + 1, 0, slide);
  return { page: updateSlider(page, sectionId, (s) => ({ ...s, slides })), slideId: slide.id };
}

export function duplicateSlide(page: Page, sectionId: string, slideId: string): { page: Page; slideId: string | null } {
  return addSlide(page, sectionId, slideId);
}

export function removeSlide(page: Page, sectionId: string, slideId: string): Page {
  return updateSlider(page, sectionId, (s) => (s.slides.length <= 1 ? s : { ...s, slides: s.slides.filter((x) => x.id !== slideId) }));
}

export function moveSlide(page: Page, sectionId: string, slideId: string, delta: number): Page {
  return updateSlider(page, sectionId, (s) => {
    const i = s.slides.findIndex((x) => x.id === slideId);
    const j = i + delta;
    if (i < 0 || j < 0 || j >= s.slides.length) return s;
    const slides = [...s.slides];
    const [item] = slides.splice(i, 1);
    if (item) slides.splice(j, 0, item);
    return { ...s, slides };
  });
}

/** Mobile versions are all-or-nothing: creates a copy of the desktop scene on every slide. */
export function createSliderMobile(page: Page, sectionId: string): Page {
  return updateSlider(page, sectionId, (s) => ({
    ...s,
    slides: s.slides.map((slide) =>
      slide.mobileScene ? slide : { ...slide, mobileScene: { ...copyScene(slide.scene), name: `${slide.scene.name} (mobile)`.slice(0, 120) } },
    ),
  }));
}

export function removeSliderMobile(page: Page, sectionId: string): Page {
  return updateSlider(page, sectionId, (s) => ({ ...s, slides: s.slides.map((slide) => ({ ...slide, mobileScene: null })) }));
}

export function updateSliderSettings(page: Page, sectionId: string, patch: Partial<Omit<SliderSection, 'kind' | 'id' | 'slides'>>): Page {
  return updateSlider(page, sectionId, (s) => ({ ...s, ...patch }));
}

export function sectionLabel(section: PageSection): string {
  if (section.kind === 'scene') return section.scene.name || 'Scene';
  if (section.kind === 'widget') return section.widget.type;
  return `Slider (${section.slides.length})`;
}

export { SCENE_TEMPLATES };
