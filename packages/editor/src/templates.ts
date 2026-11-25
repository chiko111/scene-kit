import {
  createButtonNode,
  createCountdownNode,
  createImageNode,
  createScene,
  createShapeNode,
  createTextNode,
  type Frame,
  type Scene,
  type SceneNode,
} from '@chiko111/scene-kit-core';

/*
 * Built-in scene templates ("New from template"). Pure data built with the core factories,
 * so they always validate. Placeholder art comes from the winbet CDN (https); operators replace it.
 */

const CDN = 'https://wbbgcdn.kubdev.com/common-content/landing-pages/container/2026-november-birthday-landing';
export const TEMPLATE_ART = {
  satin: `${CDN}/desktop/hero-bg.jpg`,
  cake: `${CDN}/desktop/hero-cake.png`,
  prize: `${CDN}/desktop/hero-33000.png`,
  title: `${CDN}/desktop/hero-title.png`,
  confetti: `${CDN}/desktop/hero-confetti.png`,
  box: `${CDN}/center-ticket-november-birthday-v5.png`,
  card1: 'https://wbbgcdn.kubdev.com/gaming-content/widgets/vip_popular-win.png',
  card2: 'https://wbbgcdn.kubdev.com/gaming-content/widgets/vip-goal-kings.png',
  badge: `${CDN}/jackpot-cards-badge.png`,
} as const;

export type SceneTemplate = { id: string; name: string; description: string; create: () => Scene };

const f = (x: number, y: number, w: number, h: number): Frame => ({ x, y, w, h, rotation: 0 });

/** Builds nodes one by one so every id is unique within the scene. */
function build(name: string, aspectRatio: number, make: (taken: Set<string>) => SceneNode[]): Scene {
  const scene = createScene(name, aspectRatio);
  const taken = new Set<string>();
  const nodes = make(taken);
  return { ...scene, nodes };
}

function track<N extends SceneNode>(taken: Set<string>, node: N): N {
  taken.add(node.id);
  return node;
}

function heroCta(): Scene {
  return build('Hero + CTA', 16 / 9, (t) => [
    track(t, { ...createImageNode(TEMPLATE_ART.satin, f(0, 0, 100, 100), t), name: 'Background', fit: 'cover' as const }),
    track(t, {
      ...createImageNode(TEMPLATE_ART.cake, f(31, 4, 38, 56), t),
      name: 'Hero art',
      effects: [
        { type: 'enter', preset: 'fadeUp', delayMs: 0, durationMs: 900 },
        { type: 'float', distance: 1, durationMs: 3000, delayMs: 900 },
      ],
    }),
    track(t, {
      ...createTextNode(t),
      name: 'Title',
      text: 'ГОЛЯМАТА НАГРАДА',
      frame: f(10, 60, 80, 14),
      fontSize: 5.5,
      weight: '800',
      color: 'gold',
      effects: [{ type: 'splitText', by: 'char', preset: 'fadeUp', staggerMs: 40, delayMs: 300, durationMs: 500 }],
    }),
    track(t, {
      ...createButtonNode(t, 'Register'),
      name: 'CTA',
      label: 'ВЗЕМИ БОНУСА',
      frame: f(35, 78, 30, 13),
      effects: [
        { type: 'enter', preset: 'zoomIn', delayMs: 900, durationMs: 500 },
        { type: 'pulse', scale: 1.05, durationMs: 900, delayMs: 1400 },
      ],
    }),
  ]);
}

function prizeRow(): Scene {
  const cards = [TEMPLATE_ART.card1, TEMPLATE_ART.card2, TEMPLATE_ART.card1];
  return build('Prize cards', 16 / 9, (t) => [
    track(t, { ...createShapeNode(t), name: 'Background', fill: 'background' as const, frame: f(0, 0, 100, 100) }),
    track(t, {
      ...createTextNode(t),
      name: 'Title',
      text: 'ТВОИТЕ НАГРАДИ',
      frame: f(10, 5, 80, 14),
      fontSize: 5,
      weight: '800',
      effects: [{ type: 'enter', preset: 'fadeDown', delayMs: 0, durationMs: 700 }],
    }),
    ...cards.map((uri, i) =>
      track(t, {
        ...createImageNode(uri, f(8 + i * 30, 24, 24, 70), t),
        name: `Card ${i + 1}`,
        radius: 1.5,
        effects: [
          { type: 'enter' as const, preset: 'fadeUp' as const, delayMs: 200 + i * 150, durationMs: 800 },
          { type: 'float' as const, distance: 1.2, durationMs: 2600, delayMs: i * 400 },
        ],
      }),
    ),
  ]);
}

function countdownBanner(): Scene {
  const end = new Date(Date.now() + 7 * 86400000);
  const endDate = `${end.getFullYear()}-${String(end.getMonth() + 1).padStart(2, '0')}-${String(end.getDate()).padStart(2, '0')}`;
  return build('Countdown banner', 3, (t) => [
    track(t, { ...createShapeNode(t), name: 'Background', fill: 'secondary' as const, frame: f(0, 0, 100, 100) }),
    track(t, {
      ...createTextNode(t),
      name: 'Label',
      text: 'ПРОМОЦИЯТА ПРИКЛЮЧВА СЛЕД',
      frame: f(5, 12, 90, 25),
      fontSize: 3.2,
      weight: '700',
      effects: [{ type: 'enter', preset: 'fade', delayMs: 0, durationMs: 600 }],
    }),
    track(t, {
      ...createCountdownNode(endDate, 'Europe/Sofia', t),
      frame: f(10, 42, 80, 40),
      fontSize: 7,
      color: 'gold' as const,
      effects: [{ type: 'enter', preset: 'zoomIn', delayMs: 200, durationMs: 700 }],
    }),
  ]);
}

function tapReveal(): Scene {
  return build('Tap to reveal', 16 / 9, (t) => {
    const bg = track(t, { ...createImageNode(TEMPLATE_ART.satin, f(0, 0, 100, 100), t), name: 'Background', fit: 'cover' as const });
    const hint = track(t, {
      ...createTextNode(t),
      name: 'Hint',
      text: 'НАТИСНИ КУТИЯТА',
      frame: f(20, 6, 60, 12),
      fontSize: 4,
      weight: '800',
      effects: [{ type: 'pulse', scale: 1.05, durationMs: 900 }],
    });
    const prize = track(t, {
      ...createImageNode(TEMPLATE_ART.prize, f(20, 30, 60, 30), t),
      name: 'Prize',
      startHidden: true,
      effects: [
        {
          type: 'timeline',
          delayMs: 0,
          repeat: 'none',
          keyframes: [
            { atMs: 0, opacity: 0, x: 0, y: 4, scale: 0.3, rotate: -8, easing: 'linear' },
            { atMs: 900, opacity: 1, x: 0, y: 0, scale: 1, rotate: 0, easing: 'bounce' },
          ],
        },
        { type: 'glow', colors: ['gold'], blur: 3, spread: 0.5, durationMs: 1400 },
      ],
    });
    const gift = track(t, {
      ...createImageNode(TEMPLATE_ART.box, f(38, 30, 24, 42), t),
      name: 'Gift box',
      alt: 'Подарък – натисни',
      triggers: [
        { do: 'show' as const, target: prize.id },
        { do: 'play' as const, target: prize.id },
        { do: 'hide' as const, target: hint.id },
      ],
      effects: [{ type: 'wiggle', angle: 6, durationMs: 600, delayMs: 800 }],
    });
    return [bg, hint, gift, prize];
  });
}

function kenBurnsBackground(): Scene {
  return build('Ken Burns background', 16 / 9, (t) => [
    track(t, {
      ...createImageNode(TEMPLATE_ART.satin, f(0, 0, 100, 100), t),
      name: 'Background',
      fit: 'cover' as const,
      effects: [{ type: 'kenBurns', fromScale: 1, toScale: 1.18, fromX: 0, fromY: 0, toX: -5, toY: -3, durationMs: 16000, mode: 'pingpong' }],
    }),
    track(t, {
      ...createImageNode(TEMPLATE_ART.confetti, f(0, 0, 100, 42), t),
      name: 'Confetti',
      effects: [
        { type: 'parallax', depth: -0.4 },
        { type: 'float', distance: 1, durationMs: 4000 },
      ],
    }),
    track(t, {
      ...createImageNode(TEMPLATE_ART.title, f(20, 70, 60, 9), t),
      name: 'Title',
      effects: [{ type: 'enter', preset: 'fadeUp', delayMs: 400, durationMs: 900 }],
    }),
  ]);
}

export const SCENE_TEMPLATES: readonly SceneTemplate[] = [
  { id: 'hero-cta', name: 'Hero image + title + CTA', description: 'Background, floating art, letter-by-letter title, pulsing button', create: heroCta },
  { id: 'prize-row', name: 'Prize card row', description: 'Title and three floating cards entering one after another', create: prizeRow },
  { id: 'countdown', name: 'Countdown banner', description: '3:1 strip with a live countdown', create: countdownBanner },
  { id: 'tap-reveal', name: 'Tap-to-reveal gift', description: 'Tap the box: the prize pops in, the hint disappears', create: tapReveal },
  { id: 'ken-burns', name: 'Fullscreen background + Ken Burns', description: 'Slowly zooming background, parallax confetti, title', create: kenBurnsBackground },
];

export function templateById(id: string): SceneTemplate | undefined {
  return SCENE_TEMPLATES.find((tpl) => tpl.id === id);
}

/** A template scene resized to another aspect ratio (frames are in %, so layers keep their layout). */
export function templateScene(id: string, aspectRatio?: number): Scene | null {
  const tpl = templateById(id);
  if (!tpl) return null;
  const scene = tpl.create();
  return aspectRatio ? { ...scene, aspectRatio } : scene;
}
