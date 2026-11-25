import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { createEffect, createScene, parsePage, type Page, type Palette } from '@chiko111/scene-kit-core';
import { PageView } from './PageView';

const palette = Object.fromEntries(
  ['primary', 'onPrimary', 'secondary', 'onSecondary', 'accent', 'gold', 'success', 'danger', 'surface', 'onSurface', 'background', 'white', 'black'].map(
    (k, i) => [k, `#${String(i).padStart(2, '0')}0000`],
  ),
) as Palette;

const scene = createScene('Hero', 2);
scene.nodes.push({
  id: 'img_card', name: 'Card', type: 'image', uri: 'https://cdn.example.com/card.png', fit: 'contain', alt: 'Cashback', radius: 0,
  frame: { x: 10, y: 10, w: 40, h: 40, rotation: 0 }, opacity: 1, hidden: false, shadow: null,
  effects: [createEffect('enter'), { type: 'float', distance: 1, durationMs: 2000, delayMs: 300 }],
  action: { type: 'openPromo', promoId: 'cashback' },
});

const raw = {
  version: 1, id: 'p', name: 'Promo', background: 'background', mobileBreakpoint: 600, maxWidth: 1400,
  sections: [
    { kind: 'scene', id: 'hero', scene, mobileScene: null },
    {
      kind: 'widget', id: 'tickets',
      widget: {
        type: 'ticketCounter', aspectRatio: 4.8, backgroundUri: null, background: 'surface', boxUri: null,
        guestText: 'Моля влезте в профила си.', userText: 'Участваш с:', field: 'tickets',
        textColor: 'white', numberColor: 'white', loginAction: { type: 'navigate', route: 'Login' },
      },
    },
    {
      kind: 'widget', id: 'cal',
      widget: {
        type: 'calendar', title: 'Ноември 2026', month: '2026-11', firstDay: 9, lastDay: 30, timeZone: 'Europe/Sofia',
        prizeText: '33 000 €', wonText: 'СПЕЧЕЛЕНИ', watchText: 'Виж', todayText: 'Теглене до 20:00', todayChip: 'ДНЕС',
        tomorrowText: 'Утре', soonText: 'Скоро', weekdayLabels: ['ПН', 'ВТ', 'СР', 'ЧТ', 'ПТ', 'СБ', 'НД'],
        specialDays: [{ day: 30, label: 'РОЖДЕН ДЕН' }],
        colors: { background: null, board: 'surface', day: 'secondary', text: 'white', muted: 'onSurface', accent: 'gold', today: 'white', onToday: 'danger' },
      },
    },
    {
      kind: 'widget', id: 'terms',
      widget: {
        type: 'terms', title: 'Правила', expandLabel: 'Покажи', collapseLabel: 'Скрий', previewBlocks: 10,
        blocks: [
          { kind: 'numbered', spans: [{ text: 'Първо', bold: true }] },
          { kind: 'numbered', spans: [{ text: 'Второ', bold: false }] },
          { kind: 'paragraph', spans: [{ text: 'Текст', bold: false }] },
        ],
        colors: { background: null, card: 'surface', text: 'white', accent: 'gold' },
      },
    },
  ],
};

function render(props: Partial<Parameters<typeof PageView>[0]> = {}) {
  const result = parsePage(raw);
  if (!result.ok) throw new Error(result.error);
  expect(result.warnings).toEqual([]);
  return renderToString(
    createElement(PageView, {
      page: result.page as Page,
      palette,
      // 2026-11-24 16:00 in Sofia
      now: () => Date.UTC(2026, 10, 24, 14, 0),
      ...props,
    }),
  );
}

describe('PageView (server render)', () => {
  it('keeps entrance nodes hidden until the scene has been on screen; loops go on the inner wrapper', () => {
    const html = render();
    expect(html).toContain('data-enter="wait"');
    expect(html).toMatch(/class="sk-loop"[^>]*sk-float 2000ms ease-in-out 300ms infinite alternate/);
  });

  it('makes images with an action keyboard-accessible buttons', () => {
    const html = render();
    expect(html).toMatch(/class="sk-content sk-tap"[^>]*role="button"[^>]*aria-label="Cashback"/);
  });

  it('renders the calendar for the campaign time zone', () => {
    const html = render();
    expect(html).toMatch(/data-state="today"/);
    expect((html.match(/data-state="won"/g) ?? []).length).toBe(15); // 9 … 23 November
    expect(html).toContain('РОЖДЕН ДЕН');
  });

  it('shows the guest prompt or the user value in the ticket counter', () => {
    expect(render()).toContain('Моля влезте в профила си.');
    const html = render({ user: { loggedIn: true, fields: { tickets: 7 } } });
    expect(html).toContain('Участваш с:');
    expect(html).toMatch(/<span>7<\/span>/);
  });

  it('groups numbered terms into one list', () => {
    expect(render()).toMatch(/<ol><li><strong>Първо<\/strong><\/li><li><span>Второ<\/span><\/li><\/ol><p>/);
  });
});
