import { describe, expect, it } from 'vitest';
import { parsePage, serializePage, validatePage, sceneForWidth, type Page } from './page';
import { createScene, createEffect } from './factory';
import { parseScene } from './parse';

const scene = (id: string) => ({ ...createScene('S', 2), id });

const calendar = {
  type: 'calendar',
  title: 'Ноември',
  month: '2026-11',
  firstDay: 9,
  lastDay: 30,
  timeZone: 'Europe/Sofia',
  prizeText: '33 000 €',
  wonText: 'СПЕЧЕЛЕНИ',
  watchText: 'Виж',
  todayText: 'Теглене до 20:00',
  todayChip: 'ДНЕС',
  tomorrowText: 'Утре',
  soonText: 'Скоро',
  weekdayLabels: ['ПН', 'ВТ', 'СР', 'ЧТ', 'ПТ', 'СБ', 'НД'],
  specialDays: [{ day: 30, label: 'РОЖДЕН ДЕН' }],
  colors: { background: null, board: 'surface', day: 'secondary', text: 'white', muted: 'onSurface', accent: 'gold', today: 'white', onToday: 'danger' },
};

function page(sections: unknown[]): unknown {
  return { version: 1, id: 'promo', name: 'Promo', background: 'background', mobileBreakpoint: 600, maxWidth: 1400, sections };
}

describe('parsePage', () => {
  it('accepts scene + widget sections', () => {
    const r = parsePage(page([
      { kind: 'scene', id: 'hero', scene: scene('hero_d'), mobileScene: scene('hero_m') },
      { kind: 'widget', id: 'cal', widget: calendar },
    ]));
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.page.sections).toHaveLength(2);
      expect(r.warnings).toEqual([]);
    }
  });

  it('drops an invalid widget but keeps the rest', () => {
    const r = parsePage(page([
      { kind: 'widget', id: 'bad', widget: { ...calendar, month: '2026-13' } },
      { kind: 'widget', id: 'cal', widget: calendar },
    ]));
    expect(r.ok && r.page.sections.map((s) => s.id)).toEqual(['cal']);
    expect(r.warnings[0]?.path).toBe('sections[0]');
  });

  it('drops duplicate section ids and unknown kinds', () => {
    const r = parsePage(page([
      { kind: 'widget', id: 'a', widget: calendar },
      { kind: 'widget', id: 'a', widget: calendar },
      { kind: 'html', id: 'b', html: '<script>alert(1)</script>' },
    ]));
    expect(r.ok && r.page.sections).toHaveLength(1);
    expect(r.warnings).toHaveLength(2);
  });

  it('rejects http media and javascript actions inside widgets', () => {
    const carousel = {
      type: 'gameCarousel', title: 'Games', backgroundUri: 'http://evil.example/x.png', background: null,
      games: [{ id: 'g1', name: 'Game', imageUri: 'https://cdn.example.com/g.png', action: { type: 'openGame', gameId: 'g1' } }],
      playLabel: 'ИГРАЙ', ctaText: '', ctaLabel: '', ctaAction: null, colors: { text: 'white', accent: 'gold', onAccent: 'black' },
    };
    const r = parsePage(page([{ kind: 'widget', id: 'c', widget: carousel }]));
    expect(r.ok && r.page.sections).toHaveLength(0);
  });

  it('rejects other versions and broken JSON', () => {
    expect(parsePage('{').ok).toBe(false);
    expect(parsePage({ ...(page([]) as object), version: 2 }).ok).toBe(false);
  });
});

describe('validatePage', () => {
  it('is strict: unknown properties fail', () => {
    const ok = page([{ kind: 'widget', id: 'cal', widget: calendar }]);
    expect(validatePage(ok).ok).toBe(true);
    expect(validatePage({ ...(ok as object), extra: 1 }).ok).toBe(false);
  });

  it('round-trips through serializePage', () => {
    const r = parsePage(page([{ kind: 'widget', id: 'cal', widget: calendar }]));
    expect(r.ok).toBe(true);
    if (r.ok) expect(validatePage(serializePage(r.page as Page)).ok).toBe(true);
  });
});

describe('sceneForWidth', () => {
  it('uses the mobile scene below the breakpoint', () => {
    const section = { kind: 'scene' as const, id: 's', scene: scene('d'), mobileScene: scene('m') };
    expect(sceneForWidth(section, 390, 600).id).toBe('m');
    expect(sceneForWidth(section, 1200, 600).id).toBe('d');
    expect(sceneForWidth({ ...section, mobileScene: null }, 390, 600).id).toBe('d');
  });
});

describe('new effects', () => {
  it('enter / wiggle / spin and loop delays validate', () => {
    const s = createScene('S', 1);
    s.nodes.push({
      id: 'img_1', name: 'Card', type: 'image', uri: 'https://cdn.example.com/a.png', fit: 'contain', alt: '', radius: 0,
      frame: { x: 0, y: 0, w: 50, h: 50, rotation: 0 }, opacity: 1, hidden: false, shadow: null,
      effects: [createEffect('enter'), { type: 'float', distance: 1, durationMs: 2000, delayMs: 300 }, createEffect('wiggle')],
    });
    const r = parseScene(JSON.stringify(s));
    expect(r.ok && r.warnings).toEqual([]);
    const bad = parseScene(JSON.stringify({ ...s, nodes: [{ ...s.nodes[0], effects: [{ type: 'enter', preset: 'explode', delayMs: 0, durationMs: 500 }] }] }));
    expect(bad.ok && bad.warnings.length).toBe(1);
  });
});
