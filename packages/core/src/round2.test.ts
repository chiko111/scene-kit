import { describe, expect, it } from 'vitest';
import { createCountdownNode, createEffect, createLottieNode, createScene, createTextNode } from './factory';
import { parseScene } from './parse';
import { parsePage, validatePage, widgetForWidth } from './page';
import { formatCountdownText, sampleTimeline, secondsUntil } from './campaignTime';
import type { Keyframe, Scene } from './schema';

const img = (id: string, extra: Record<string, unknown> = {}) => ({
  id, name: id, type: 'image', uri: 'https://cdn.example.com/a.png', fit: 'contain', alt: '', radius: 0,
  frame: { x: 0, y: 0, w: 50, h: 50, rotation: 0 }, opacity: 1, hidden: false, shadow: null, effects: [], ...extra,
});
const sceneWith = (nodes: unknown[], aspectRatio = 2): unknown => ({ ...createScene('S', aspectRatio), nodes });

describe('timeline effect', () => {
  const kf = (atMs: number, extra: Partial<Keyframe> = {}): Keyframe => ({ atMs, opacity: 1, x: 0, y: 0, scale: 1, rotate: 0, easing: 'linear', ...extra });

  it('accepts ordered keyframes starting at 0 and rejects the rest', () => {
    const ok = { type: 'timeline', delayMs: 0, repeat: 'none', keyframes: [kf(0, { opacity: 0 }), kf(500)] };
    const r = parseScene(sceneWith([img('a', { effects: [ok] })]));
    expect(r.ok && r.warnings).toEqual([]);
    for (const keyframes of [[kf(100), kf(500)], [kf(0), kf(500), kf(400)]]) {
      const bad = parseScene(sceneWith([img('a', { effects: [{ ...ok, keyframes }] })]));
      expect(bad.ok && bad.warnings).toHaveLength(1);
    }
  });

  it('samples with easing, holding the ends', () => {
    const frames = [kf(0, { opacity: 0, x: -10 }), kf(1000, { opacity: 1, x: 10, easing: 'linear' })];
    expect(sampleTimeline(frames, -5)).toMatchObject({ opacity: 0, x: -10 });
    expect(sampleTimeline(frames, 500)).toMatchObject({ opacity: 0.5, x: 0 });
    expect(sampleTimeline(frames, 5000)).toMatchObject({ opacity: 1, x: 10 });
    const eased = sampleTimeline([kf(0, { x: 0 }), kf(1000, { x: 100, easing: 'easeOut' })], 500);
    expect(eased.x).toBeGreaterThan(50);
  });

  it('default effects of every new type validate', () => {
    const text = createTextNode(new Set());
    const scene = createScene('S', 2) as Scene;
    scene.nodes.push(
      { ...img('i'), effects: [createEffect('timeline'), createEffect('kenBurns'), createEffect('parallax')] } as never,
      { ...text, effects: [createEffect('splitText')] },
      createLottieNode('https://cdn.example.com/confetti.json', new Set(['i', text.id])),
      createCountdownNode('2026-11-30', 'Europe/Sofia', new Set()),
    );
    const r = parseScene(JSON.stringify(scene));
    expect(r.ok && r.warnings).toEqual([]);
  });
});

describe('new layers', () => {
  it('lottie only from https .json/.lottie', () => {
    const lottie = (uri: string) => ({ ...createLottieNode(uri, new Set()), id: 'l1' });
    expect(parseScene(sceneWith([lottie('https://cdn.example.com/a.json')])).ok && true).toBe(true);
    const bad = parseScene(sceneWith([lottie('http://cdn.example.com/a.json'), { ...lottie('https://cdn.example.com/a.js'), id: 'l2' }]));
    expect(bad.ok && bad.scene.nodes).toHaveLength(0);
  });
});

describe('triggers', () => {
  it('keeps triggers to existing layers and drops the rest with a warning', () => {
    const r = parseScene(
      sceneWith([
        img('gift', { triggers: [{ do: 'show', target: 'prize' }, { do: 'play', target: 'ghost' }, { do: 'hide', target: 'gift' }] }),
        img('prize', { startHidden: true }),
      ]),
    );
    expect(r.ok).toBe(true);
    if (r.ok) {
      // the missing target is dropped; hiding itself (tap to dismiss) is allowed
      expect(r.scene.nodes[0]?.triggers).toEqual([{ do: 'show', target: 'prize' }, { do: 'hide', target: 'gift' }]);
      expect(r.warnings).toHaveLength(1);
    }
  });
});

describe('slider section', () => {
  const slide = (id: string, aspectRatio = 2, mobile: number | null = null) => ({
    id,
    scene: sceneWith([img(`${id}_bg`)], aspectRatio),
    mobileScene: mobile === null ? null : sceneWith([img(`${id}_m`)], mobile),
  });
  const slider = (slides: unknown[]) => ({
    kind: 'slider', id: 'hero', slides, transition: 'fade', transitionMs: 600, autoplayMs: 5000, loop: true,
    showDots: true, showArrows: true, pauseOnInteraction: true, dotColor: 'white', activeDotColor: 'gold',
  });
  const page = (sections: unknown[]) => ({ version: 1, id: 'p', name: 'P', background: null, mobileBreakpoint: 600, maxWidth: 1400, sections });

  it('accepts consistent slides and validates strictly', () => {
    const p = page([slider([slide('s1', 2, 0.8), slide('s2', 2, 0.8)])]);
    const r = parsePage(p);
    expect(r.ok && r.page.sections[0]?.kind).toBe('slider');
    expect(validatePage(p).ok).toBe(true);
  });

  it('drops a slider whose slides have different aspect ratios or mixed mobile scenes', () => {
    expect(parsePage(page([slider([slide('s1', 2), slide('s2', 1.5)])])).ok && true).toBe(true);
    const mixed = parsePage(page([slider([slide('s1', 2, 0.8), slide('s2', 2)])]));
    expect(mixed.ok && mixed.page.sections).toHaveLength(0);
    const ratio = parsePage(page([slider([slide('s1', 2), slide('s2', 1.5)])]));
    expect(ratio.ok && ratio.page.sections).toHaveLength(0);
  });

  it('drops only the broken slide', () => {
    const r = parsePage(page([slider([slide('s1'), { id: 's2', scene: { nope: 1 }, mobileScene: null }])]));
    expect(r.ok && r.page.sections[0]?.kind === 'slider' && r.page.sections[0].slides.map((s) => s.id)).toEqual(['s1']);
  });
});

describe('widget mobile variants', () => {
  const terms = (title: string) => ({
    type: 'terms', title, expandLabel: 'Още', collapseLabel: 'По-малко', previewBlocks: 1,
    blocks: [{ kind: 'paragraph', level: 1, spans: [{ text: 'Виж ', bold: false }, { text: 'тук', bold: true, italic: true, action: { type: 'navigate', route: 'Promo', webPath: '/promo' } }] }],
    colors: { background: null, card: 'surface', text: 'white', accent: 'gold' },
  });
  const section = (mobileWidget: unknown) => ({ kind: 'widget', id: 'w', widget: terms('Desktop'), mobileWidget });
  const page = (sections: unknown[]) => ({ version: 1, id: 'p', name: 'P', background: null, mobileBreakpoint: 600, maxWidth: 1400, sections });

  it('picks the mobile widget below the breakpoint', () => {
    const r = parsePage(page([section(terms('Mobile'))]));
    expect(r.ok).toBe(true);
    if (r.ok && r.page.sections[0]?.kind === 'widget') {
      expect((widgetForWidth(r.page.sections[0], 390, 600) as { title: string }).title).toBe('Mobile');
      expect((widgetForWidth(r.page.sections[0], 1200, 600) as { title: string }).title).toBe('Desktop');
    }
    expect(validatePage(page([section(terms('Mobile'))])).ok).toBe(true);
  });

  it('rejects a mobile widget of another type', () => {
    expect(validatePage(page([section({ type: 'calendar' })])).ok).toBe(false);
  });
});

describe('countdown', () => {
  const labels = { days: 'д', hours: 'ч', minutes: 'м', seconds: 'с' };
  it('counts to a wall-clock moment in the campaign zone', () => {
    const now = { dateKey: '2026-11-24', secondsOfDay: 12 * 3600 };
    expect(secondsUntil('2026-11-24', { hour: 20, minute: 0 }, now)).toBe(8 * 3600);
    expect(secondsUntil('2026-11-30', { hour: 23, minute: 59 }, now)).toBe(6 * 86400 + 11 * 3600 + 59 * 60);
    expect(secondsUntil('2026-11-23', { hour: 0, minute: 0 }, now)).toBeLessThan(0);
  });
  it('formats with and without labels', () => {
    const s = 2 * 86400 + 3 * 3600 + 14 * 60 + 9;
    expect(formatCountdownText(s, 'auto', labels)).toBe('2д 03ч 14м 09с');
    expect(formatCountdownText(s, 'hms', labels)).toBe('51ч 14м 09с');
    expect(formatCountdownText(3 * 3600, 'auto', { days: '', hours: '', minutes: '', seconds: '' })).toBe('03:00:00');
  });
});

describe('hover', () => {
  it('accepts a hover highlight and rejects out-of-range values', () => {
    const hover = { scale: 1.07, lift: 0.6, brightness: 1.15, glow: { color: 'accent', blur: 1.4, opacity: 0.8 }, durationMs: 500 };
    const ok = parseScene(sceneWith([img('card', { hover })]));
    expect(ok.ok && ok.warnings).toEqual([]);
    const bad = parseScene(sceneWith([img('card', { hover: { ...hover, scale: 3 } })]));
    expect(bad.ok && bad.scene.nodes).toHaveLength(0);
  });
});
