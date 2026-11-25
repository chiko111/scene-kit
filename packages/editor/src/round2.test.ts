import { describe, expect, it } from 'vitest';
import {
  EffectSchema,
  TermsBlockSchema,
  createEffect,
  createImageNode,
  createTextNode,
  parsePage,
  parseScene,
  validatePage,
  validateScene,
  type EffectOf,
  type Page,
} from '@chiko111/scene-kit-core';
import { createPage } from './PageEditor';
import {
  addSection,
  addSlide,
  createSliderMobile,
  createSliderSection,
  createTemplateSceneSection,
  createWidgetMobileVariant,
  duplicateSection,
  getSlideScene,
  getWidgetVariant,
  moveSlide,
  removeSlide,
  removeSliderMobile,
  setSlideScene,
  setWidgetVariant,
} from './pageOps';
import { BUILT_IN_PRESETS, applyPreset, effectAllowed, presetFromNode, sanitizePresets } from './presets';
import { SCENE_TEMPLATES, templateScene } from './templates';
import { parseInline, termsToText, textToTerms } from './termsText';
import { addKeyframe, duplicateKeyframe, removeKeyframe, timelineProblem, updateKeyframe } from './timelineOps';
import { createWidgetSection } from './widgetDefaults';

const strict = (page: Page) => validatePage(JSON.parse(JSON.stringify(page)));

describe('timeline keyframe ops', () => {
  const tl = () => createEffect('timeline') as EffectOf<'timeline'>;

  it('adds a keyframe halfway between two, with the sampled state', () => {
    const next = addKeyframe(tl(), 0);
    expect(next.keyframes.map((k) => k.atMs)).toEqual([0, 350, 700, 1000]);
    expect(next.keyframes[1]?.opacity).toBeGreaterThan(0);
    expect(timelineProblem(next)).toBeNull();
  });

  it('adds at the end +300 ms, duplicates, removes (min 2) and re-sorts on time change', () => {
    const t = tl();
    expect(addKeyframe(t, 2).keyframes.at(-1)?.atMs).toBe(1300);
    expect(duplicateKeyframe(t, 1).keyframes.map((k) => k.atMs)).toEqual([0, 700, 850, 1000]);
    const two = removeKeyframe(removeKeyframe(t, 1), 1);
    expect(two.keyframes).toHaveLength(2);
    expect(removeKeyframe(two, 0).keyframes).toHaveLength(2);
    const moved = updateKeyframe(t, 1, { atMs: 1500 });
    expect(moved.keyframes.map((k) => k.atMs)).toEqual([0, 1000, 1500]);
  });

  it('removing the first keyframe pins the next one to 0', () => {
    expect(removeKeyframe(tl(), 0).keyframes[0]?.atMs).toBe(0);
  });

  it('flags duplicate times', () => {
    expect(timelineProblem(updateKeyframe(tl(), 2, { atMs: 700 }))).toMatch(/increase/);
  });
});

describe('presets', () => {
  it('every built-in preset effect validates', () => {
    for (const preset of BUILT_IN_PRESETS) {
      for (const effect of preset.effects) {
        const r = EffectSchema.safeParse(effect);
        expect(r.success, `${preset.id}/${effect.type}`).toBe(true);
      }
    }
  });

  it('applies only effects the layer type can use, replacing same types, and stays valid', () => {
    const image = { ...createImageNode('https://cdn.example.com/a.png', { x: 0, y: 0, w: 50, h: 50, rotation: 0 }, new Set()), effects: [createEffect('float'), createEffect('pulse')] };
    const text = createTextNode(new Set([image.id]));
    for (const preset of BUILT_IN_PRESETS) {
      for (const node of [image, text]) {
        const out = applyPreset(node, preset);
        expect(out.effects.every((e) => effectAllowed(e.type, node.type))).toBe(true);
        expect(new Set(out.effects.map((e) => e.type)).size).toBe(out.effects.length);
        const scene = { version: 1, id: 's', name: 's', aspectRatio: 2, background: null, nodes: [out] };
        expect(validateScene(scene).ok, `${preset.id} on ${node.type}`).toBe(true);
      }
    }
    const zoom = applyPreset(text, BUILT_IN_PRESETS.find((p) => p.id === 'slow-zoom-bg')!);
    expect(zoom.effects.map((e) => e.type)).toEqual(['fadeIn']); // kenBurns is image-only
    const floated = applyPreset(image, BUILT_IN_PRESETS.find((p) => p.id === 'card-float')!);
    expect(floated.effects.filter((e) => e.type === 'float')).toHaveLength(1);
    expect(floated.effects.some((e) => e.type === 'pulse')).toBe(true);
  });

  it('saves a preset from a layer and sanitizes stored data', () => {
    const node = { ...createTextNode(new Set()), effects: [createEffect('splitText')] };
    const preset = presetFromNode(node, '  Мой  ');
    expect(preset?.name).toBe('Мой');
    expect(presetFromNode({ ...node, effects: [] }, 'x')).toBeNull();
    const stored = sanitizePresets([preset, { id: 'bad', name: 'x', effects: [{ type: 'explode' }] }, 'junk', { id: 1 }]);
    expect(stored.map((p) => p.name)).toEqual(['Мой']);
    expect(sanitizePresets('nope')).toEqual([]);
  });
});

describe('scene templates', () => {
  for (const tpl of SCENE_TEMPLATES) {
    it(`${tpl.id} validates strictly and parses without warnings`, () => {
      const scene = tpl.create();
      const r = parseScene(JSON.stringify(scene));
      expect(r.ok && r.warnings).toEqual([]);
      expect(validateScene(JSON.parse(JSON.stringify(scene))).ok).toBe(true);
    });
  }

  it('tap-to-reveal wires triggers to a hidden prize', () => {
    const scene = templateScene('tap-reveal')!;
    const gift = scene.nodes.find((n) => n.triggers);
    const prize = scene.nodes.find((n) => n.startHidden);
    expect(gift?.triggers?.map((t) => t.target)).toContain(prize?.id);
  });

  it('templates can be resized', () => {
    expect(templateScene('countdown', 1)?.aspectRatio).toBe(1);
    expect(templateScene('nope')).toBeNull();
  });
});

describe('slider sections', () => {
  const pageWithSlider = () => {
    const slider = createSliderSection(new Set());
    return { page: addSection(createPage('S'), slider, null), id: slider.id, slides: slider.slides.map((s) => s.id) };
  };

  it('a new slider (2 template slides) validates strictly', () => {
    const { page } = pageWithSlider();
    expect(strict(page).ok).toBe(true);
    const r = parsePage(JSON.parse(JSON.stringify(page)));
    expect(r.ok && r.warnings).toEqual([]);
  });

  it('adds (copy / template), duplicates, moves and removes slides', () => {
    let { page, id, slides } = pageWithSlider();
    const added = addSlide(page, id, slides[0]!);
    page = added.page;
    const order = () => (page.sections[1] as { slides: { id: string }[] }).slides.map((s) => s.id);
    expect(order()).toEqual([slides[0], added.slideId, slides[1]]);
    page = addSlide(page, id, null, 'countdown').page;
    expect(order()).toHaveLength(4);
    // the template slide is resized to the slider's ratio
    expect(getSlideScene(page, id, order()[3]!, 'desktop')?.aspectRatio).toBeCloseTo(16 / 9);
    page = moveSlide(page, id, order()[3]!, -3);
    expect(order()[0]).not.toBe(slides[0]);
    page = removeSlide(page, id, order()[0]!);
    expect(order()).toHaveLength(3);
    expect(strict(page).ok).toBe(true);
  });

  it('never removes the last slide', () => {
    let { page, id, slides } = pageWithSlider();
    page = removeSlide(page, id, slides[0]!);
    page = removeSlide(page, id, slides[1]!);
    expect((page.sections[1] as { slides: unknown[] }).slides).toHaveLength(1);
  });

  it('an aspect change on one slide resizes every slide of that variant', () => {
    let { page, id, slides } = pageWithSlider();
    const scene = getSlideScene(page, id, slides[0]!, 'desktop')!;
    page = setSlideScene(page, id, slides[0]!, 'desktop', { ...scene, aspectRatio: 2.5 });
    expect(getSlideScene(page, id, slides[1]!, 'desktop')?.aspectRatio).toBe(2.5);
    expect(strict(page).ok).toBe(true);
  });

  it('mobile versions are created and removed for all slides at once', () => {
    let { page, id, slides } = pageWithSlider();
    page = createSliderMobile(page, id);
    expect(slides.every((s) => getSlideScene(page, id, s, 'mobile'))).toBe(true);
    const m = getSlideScene(page, id, slides[0]!, 'mobile')!;
    page = setSlideScene(page, id, slides[0]!, 'mobile', { ...m, aspectRatio: 0.6 });
    expect(getSlideScene(page, id, slides[1]!, 'mobile')?.aspectRatio).toBe(0.6);
    // a new slide in a slider with mobile versions also gets one
    page = addSlide(page, id, null, 'prize-row').page;
    expect(strict(page).ok).toBe(true);
    page = removeSliderMobile(page, id);
    expect(getSlideScene(page, id, slides[0]!, 'mobile')).toBeNull();
    expect(strict(page).ok).toBe(true);
  });

  it('duplicating a slider section gives new ids', () => {
    const { page, id } = pageWithSlider();
    const dup = duplicateSection(page, id);
    expect(dup.page.sections).toHaveLength(3);
    expect(strict(dup.page).ok).toBe(true);
  });

  it('template scene sections validate', () => {
    for (const tpl of SCENE_TEMPLATES) {
      expect(strict(addSection(createPage(), createTemplateSceneSection(new Set(), tpl.id), null)).ok).toBe(true);
    }
  });
});

describe('widget mobile variants', () => {
  it('creates, edits and removes a mobile widget', () => {
    let page = addSection(createPage(), createWidgetSection('ticketCounter', new Set()), null);
    const id = page.sections[1]!.id;
    expect(getWidgetVariant(page, id, 'mobile')).toBeNull();
    page = createWidgetMobileVariant(page, id);
    const mobile = getWidgetVariant(page, id, 'mobile');
    expect(mobile?.type).toBe('ticketCounter');
    page = setWidgetVariant(page, id, 'mobile', { ...(mobile as never as Record<string, unknown>), aspectRatio: 2 } as never);
    expect((getWidgetVariant(page, id, 'mobile') as { aspectRatio: number }).aspectRatio).toBe(2);
    expect(strict(page).ok).toBe(true);
    page = setWidgetVariant(page, id, 'mobile', null);
    expect('mobileWidget' in page.sections[1]!).toBe(false);
    expect(strict(page).ok).toBe(true);
  });
});

describe('terms text: italic, links, nesting', () => {
  it('parses italic, bold+italic, links and escapes', () => {
    expect(parseInline('a *b* ***c*** \\*d [виж тук](Promo /ingame/promo-landing/x) e')).toEqual([
      { text: 'a ', bold: false },
      { text: 'b', bold: false, italic: true },
      { text: ' ', bold: false },
      { text: 'c', bold: true, italic: true },
      { text: ' *d ', bold: false },
      { text: 'виж тук', bold: false, action: { type: 'navigate', route: 'Promo', webPath: '/ingame/promo-landing/x' } },
      { text: ' e', bold: false },
    ]);
  });

  it('treats invalid link targets as plain text', () => {
    expect(parseInline('[x](javascript:alert(1))').map((s) => s.action)).toEqual([undefined]);
    expect(parseInline('[x](Promo https://evil.com)')[0]?.action).toBeUndefined();
  });

  it('reads indentation as nesting level', () => {
    const blocks = textToTerms('1. Първо\n  - под точка\n    1. по-дълбоко\n2. Второ');
    expect(blocks.map((b) => [b.kind, b.level ?? 0])).toEqual([
      ['numbered', 0],
      ['bullet', 1],
      ['numbered', 2],
      ['numbered', 0],
    ]);
  });

  it('round-trips text with every feature, and every block validates', () => {
    const text = [
      '# Правила',
      '1. **Срок:** до *30.11* – виж [условията](Terms /promo/terms)',
      '  - вложена ***точка*** със \\*звезда',
      '    1. дълбоко',
      '    2. дълбоко 2',
      '2. Второ [линк](Casino)',
      'абзац',
    ].join('\n');
    const blocks = textToTerms(text);
    expect(termsToText(blocks)).toBe(text);
    expect(blocks.every((b) => TermsBlockSchema.safeParse(b).success)).toBe(true);
  });

  it('keeps the old bold-only format identical', () => {
    const text = '# Заглавие\n1. **Срок:** до 30.11\n2. Второ\n- точка\nабзац';
    expect(termsToText(textToTerms(text))).toBe(text);
  });
});
