// Round-2 feature showcase for the WEB renderer: /features.html
// slider (3 slides, all transitions selectable via ?t=fade|slide|zoom|flip), timeline (bounce/elastic/back),
// kenBurns, parallax, splitText, countdown, lottie, triggers (tap the gift), widget mobile variants,
// draw announceTime, game badges, terms italic/links/levels.
import { StrictMode, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  parsePage,
  type Effect,
  type Keyframe,
  type Palette,
  type Scene,
  type SceneAction,
  type SceneNode,
} from '@chiko111/scene-kit-core';
import { PageView } from '@chiko111/scene-kit-web';
import winbet from '../examples/promo-pages/winbet-november-birthday.page.json';
import palettes from '../examples/promo-pages/palettes.json';

const palette = (palettes as Record<string, Palette>).winbet;
const ORIGIN = window.location.origin;
const WB = 'https://wbbgcdn.kubdev.com/common-content/landing-pages/container/2026-november-birthday-landing';
const IB = 'https://ibbgcdn.kubdev.com/common-content/landing-pages/container/tablet/html/2610-path/desk';
const ASPECT = 3840 / 2150;
const params = new URLSearchParams(location.search);
const transition = (params.get('t') ?? 'slide') as 'fade' | 'slide' | 'zoom' | 'flip';

const kf = (atMs: number, o: Partial<Keyframe> = {}): Keyframe => ({ atMs, opacity: 1, x: 0, y: 0, scale: 1, rotate: 0, easing: 'linear', ...o });
const timeline = (keyframes: Keyframe[], delayMs = 0, repeat: 'none' | 'loop' | 'pingpong' = 'none'): Effect => ({ type: 'timeline', delayMs, repeat, keyframes });

const node = (n: Partial<SceneNode> & { id: string; type: SceneNode['type'] }): SceneNode =>
  ({ name: n.id, opacity: 1, hidden: false, shadow: null, effects: [], frame: { x: 0, y: 0, w: 10, h: 10, rotation: 0 }, ...n }) as SceneNode;
const img = (id: string, uri: string, frame: SceneNode['frame'], effects: Effect[] = [], extra: Partial<SceneNode> = {}) =>
  node({ id, type: 'image', uri, fit: 'contain', alt: id, radius: 0, frame, effects, ...extra } as never);
const text = (id: string, value: string, frame: SceneNode['frame'], fontSize: number, effects: Effect[] = [], color = 'white') =>
  node({ id, type: 'text', text: value, color, fontSize, weight: '800', align: 'center', frame, effects } as never);
const scene = (id: string, nodes: SceneNode[], aspectRatio = ASPECT, background: Scene['background'] = 'background'): Scene => ({
  version: 1, id, name: id, aspectRatio, background, nodes,
});
const f = (x: number, y: number, w: number, h: number, rotation = 0) => ({ x, y, w, h, rotation });

/* ── slide 1: the real winbet hero, animated with timelines + ken burns + split text ── */
const heroSection = (winbet as { sections: { id: string; scene?: Scene }[] }).sections.find((s) => s.id === 'hero');
const hero = structuredClone(heroSection?.scene as Scene);
for (const n of hero.nodes) {
  if (n.id === 'bg') n.effects = [{ type: 'kenBurns', fromScale: 1, toScale: 1.12, fromX: 0, fromY: 0, toX: -3, toY: -2, durationMs: 9000, mode: 'pingpong' }];
  if (n.id === 'cake')
    n.effects = [
      timeline([kf(0, { opacity: 0, y: 14, scale: 0.85 }), kf(900, { y: -1.5, scale: 1.03, easing: 'back' }), kf(1300, { easing: 'easeInOut' })]),
      { type: 'float', distance: 1, durationMs: 2400, delayMs: 1300 },
    ];
  if (n.id === 'prize') n.effects = [timeline([kf(0, { opacity: 0, scale: 0.2 }), kf(1200, { easing: 'elastic' })], 500)];
  if (n.id === 'title') n.effects = [timeline([kf(0, { opacity: 0, y: 6 }), kf(800, { easing: 'bounce' })], 1100)];
  if (n.id === 'confetti') n.effects = [{ type: 'wiggle', angle: 2, durationMs: 3000 }];
}
hero.id = 'slide_winbet';

/* ── slide 2: inbet cards bouncing in on a ken-burns background ── */
const slide2 = scene('slide_inbet', [
  img('ib_bg', `${IB}/bgr-desk.png`, f(0, 0, 100, 100), [{ type: 'kenBurns', fromScale: 1.25, toScale: 1.05, fromX: 0, fromY: 12, toX: 0, toY: 6, durationMs: 8000, mode: 'once' }], { fit: 'cover' } as never),
  img('ib_header', `${IB}/header-bg-desk.png`, f(25, 2, 50, 42), [timeline([kf(0, { opacity: 0, y: -10 }), kf(900, { easing: 'bounce' })])]),
  img('ib_c2', `${IB}/2-bg-desk.png`, f(4, 52, 30, 22), [timeline([kf(0, { opacity: 0, x: -30, rotate: -12 }), kf(900, { easing: 'back' })], 400)]),
  img('ib_c3', `${IB}/3-bg-desk.png`, f(35, 56, 30, 28), [timeline([kf(0, { opacity: 0, scale: 0 }), kf(1100, { easing: 'elastic' })], 700), { type: 'float', distance: 1.2, durationMs: 2200 }]),
  img('ib_c6', `${IB}/6-bg-desk.png`, f(66, 52, 30, 28), [timeline([kf(0, { opacity: 0, x: 30, rotate: 12 }), kf(900, { easing: 'back' })], 1000)]),
]);

/* ── slide 3: countdown + lottie + split text ── */
const slide3 = scene('slide_countdown', [
  img('s3_bg', `${WB}/desktop/hero-bg.jpg`, f(0, 0, 100, 116), [{ type: 'kenBurns', fromScale: 1.1, toScale: 1, fromX: 2, fromY: 0, toX: 0, toY: 0, durationMs: 7000, mode: 'once' }], { fit: 'cover' } as never),
  text('s3_title', 'Промоцията приключва след', f(10, 14, 80, 14), 5.2, [{ type: 'splitText', by: 'char', preset: 'fadeUp', staggerMs: 35, delayMs: 100, durationMs: 500 }]),
  node({
    id: 's3_cd', type: 'countdown', endDate: '2026-11-30', endTime: { hour: 23, minute: 59 }, timeZone: 'Europe/Sofia', format: 'auto',
    labels: { days: 'д', hours: 'ч', minutes: 'м', seconds: 'с' }, endedText: 'ПРОМОЦИЯТА ПРИКЛЮЧИ', color: 'gold', fontSize: 9, weight: '800', align: 'center',
    frame: f(5, 36, 90, 22), effects: [timeline([kf(0, { opacity: 0, scale: 1.6 }), kf(700, { easing: 'easeOut' })], 900)],
  } as never),
  node({ id: 's3_lottie_l', type: 'lottie', uri: `${ORIGIN}/sparkle.json`, loop: true, speed: 1, alt: 'Искри', frame: f(4, 58, 18, 32) } as never),
  node({ id: 's3_lottie_r', type: 'lottie', uri: `${ORIGIN}/sparkle.json`, loop: true, speed: 1.6, alt: 'Искри', frame: f(78, 58, 18, 32) } as never),
  text('s3_words', 'Всеки ден един печеливш', f(20, 66, 60, 14), 4, [{ type: 'splitText', by: 'word', preset: 'zoomIn', staggerMs: 180, delayMs: 1400, durationMs: 600 }], 'onSurface'),
]);

/* ── trigger demo: tap the gift → prize appears (show + play) ── */
const triggers = scene('triggers', [
  text('tg_hint', 'Докосни подаръка', f(10, 6, 80, 12), 4.4, [{ type: 'enter', preset: 'fadeDown', delayMs: 0, durationMs: 600 }]),
  img('gift', `${IB}/5-bg-desk.png`, f(22, 22, 56, 40), [{ type: 'pulse', scale: 1.05, durationMs: 800 }], {
    alt: 'Подарък',
    triggers: [
      { do: 'show', target: 'prize' },
      { do: 'play', target: 'prize' },
      { do: 'toggle', target: 'tg_hint' },
    ],
  } as never),
  img('prize', `${WB}/desktop/hero-33000.png`, f(20, 64, 60, 15), [timeline([kf(0, { opacity: 0, scale: 0.3, rotate: -20 }), kf(900, { easing: 'elastic' })])], { startHidden: true } as never),
], 1.8);

/* ── parallax: layers at different depths while the page scrolls ── */
const parallax = scene('parallax', [
  img('px_bg', `${WB}/desktop/hero-bg.jpg`, f(0, -10, 100, 130), [{ type: 'parallax', depth: 0.6 }], { fit: 'cover' } as never),
  img('px_confetti', `${WB}/desktop/hero-confetti.png`, f(0, 0, 100, 75), [{ type: 'parallax', depth: -0.8 }]),
  img('px_cake', `${WB}/desktop/hero-cake.png`, f(28, 8, 44, 70), [{ type: 'parallax', depth: 0.25 }]),
  text('px_text', 'Паралакс при скрол', f(10, 82, 80, 12), 4.6, [{ type: 'parallax', depth: -0.3 }]),
], 1.6);

/* ── widgets with round-2 fields ── */
const sections = (winbet as { sections: Record<string, unknown>[] }).sections.filter((s) => s.id !== 'hero').map((s) => structuredClone(s));
for (const s of sections) {
  const w = s.widget as Record<string, unknown>;
  if (w.type === 'drawVideos') {
    w.releaseTime = { hour: 19, minute: 0 };
    w.announceTime = { hour: 20, minute: 0 };
  }
  if (w.type === 'gameCarousel') {
    (w.games as Record<string, unknown>[]).forEach((g, i) => {
      if (i % 2 === 0) g.badgeUri = `${WB}/jackpot-cards-badge.png`;
    });
  }
  if (w.type === 'ticketCounter') {
    s.mobileWidget = { ...w, aspectRatio: 750 / 366, backgroundUri: `${WB}/mobile/mob-ticket-mobile-birthday-november-background-v4.png` };
  }
}
sections.push({
  kind: 'widget',
  id: 'terms',
  widget: {
    type: 'terms', title: 'ПРАВИЛА И УСЛОВИЯ:', expandLabel: 'ПОКАЖИ ВСИЧКИ', collapseLabel: 'СКРИЙ', previewBlocks: 4,
    blocks: [
      { kind: 'numbered', spans: [{ text: 'Кампанията е валидна от ', bold: false }, { text: '09.11.2026', bold: true }, { text: ' до 30.11.2026.', bold: false }] },
      { kind: 'numbered', spans: [{ text: 'Участват само ', bold: false }, { text: 'верифицирани', bold: false, italic: true }, { text: ' играчи.', bold: false }] },
      { kind: 'bullet', level: 1, spans: [{ text: 'Вложено ниво (level 1)', bold: false }] },
      { kind: 'paragraph', spans: [{ text: 'Пълните правила: ', bold: false }, { text: 'виж тук', bold: true, action: { type: 'navigate', route: 'Promo', webPath: '/promotions/rules' } }] },
      { kind: 'paragraph', spans: [{ text: 'Скрит текст след разгъване.', bold: false }] },
    ],
    colors: { background: null, card: 'surface', text: 'white', accent: 'gold' },
  },
});

const raw = {
  version: 1, id: 'features', name: 'Round 2 features', background: 'background', mobileBreakpoint: 600, maxWidth: 1400,
  sections: [
    {
      kind: 'slider', id: 'hero_slider', transition, transitionMs: 700, autoplayMs: Number(params.get('autoplay') ?? 5000), loop: true,
      showDots: true, showArrows: true, pauseOnInteraction: true, dotColor: 'white', activeDotColor: 'gold',
      slides: [
        { id: 's1', scene: hero, mobileScene: null },
        { id: 's2', scene: slide2, mobileScene: null },
        { id: 's3', scene: slide3, mobileScene: null },
      ],
    },
    { kind: 'scene', id: 'triggers', scene: triggers, mobileScene: null },
    ...sections.slice(0, 1),
    { kind: 'scene', id: 'parallax', scene: parallax, mobileScene: null },
    ...sections.slice(1),
  ],
};

function App() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [log, setLog] = useState<string[]>([]);
  const result = parsePage(raw);
  if (!result.ok) return <pre style={{ color: '#fff' }}>{result.error}</pre>;
  if (result.warnings.length) console.warn('page warnings', result.warnings);
  const onAction = (a: SceneAction) => {
    setLog((l) => [JSON.stringify(a), ...l].slice(0, 3));
    if (a.type === 'navigate' && a.route === 'Login') setLoggedIn(true);
  };
  return (
    <>
      <PageView
        page={result.page}
        palette={palette}
        fontFamily='"Sofia Sans", sans-serif'
        user={loggedIn ? { loggedIn: true, fields: { tickets: 7 } } : { loggedIn: false }}
        onAction={onAction}
      />
      <pre data-testid="log" style={{ position: 'fixed', left: 0, bottom: 0, margin: 0, padding: 4, color: '#0f0', background: '#000c', fontSize: 11, zIndex: 10 }}>
        {log.join('\n')}
      </pre>
    </>
  );
}

createRoot(document.getElementById('root') as HTMLElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
