import { StrictMode, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { parsePage, type FontMap, type Page, type Palette, type SceneAction } from '@chiko111/scene-kit-core';
import { PageView } from '@chiko111/scene-kit-web';

// winbet-like theme (the app passes its own Colors.*)
const palette: Palette = {
  primary: '#fecf6f',
  onPrimary: '#3a0000',
  secondary: '#a3050c',
  onSecondary: '#ffffff',
  accent: '#fecf6f',
  gold: '#fecf6f',
  success: '#2ecc71',
  danger: '#c00006',
  surface: '#7a0208',
  onSurface: '#ffd6c9',
  background: '#470001',
  white: '#ffffff',
  black: '#000000',
};
const FONT = '"Sofia Sans", system-ui, sans-serif';
const FONTS: FontMap = { heading: '"Sofia Sans", system-ui, sans-serif' };

const O = window.location.origin;
const CDN = 'https://wbbgcdn.kubdev.com/cdn-cgi/image/width=496,format=auto/gaming-content/game-providers-new';
const node = (id: string, frame: [number, number, number, number], extra: Record<string, unknown>) => ({
  id, name: id, frame: { x: frame[0], y: frame[1], w: frame[2], h: frame[3], rotation: 0 },
  opacity: 1, hidden: false, shadow: null, ...extra,
});

const raw = {
  version: 1, id: 'november', name: 'Happy Cashday (demo)', background: 'background', mobileBreakpoint: 600, maxWidth: 1400,
  sections: [
    {
      kind: 'scene', id: 'hero', mobileScene: null,
      scene: {
        version: 1, id: 'hero_d', name: 'Hero', aspectRatio: 2.4, background: 'background',
        nodes: [
          node('bg', [0, 0, 100, 100], { type: 'image', uri: `${O}/bg.png`, fit: 'cover', alt: '', radius: 0, effects: [] }),
          node('title', [10, 18, 80, 22], {
            type: 'text', text: 'Happy Cashday', color: 'gold', font: 'heading', fontSize: 7, weight: '800', align: 'center',
            effects: [{ type: 'enter', preset: 'zoomIn', delayMs: 100, durationMs: 900 }],
          }),
          node('sub', [15, 44, 70, 12], {
            type: 'text', text: '33 000 € кеш всеки ден', color: 'white', fontSize: 3.6, weight: '700', align: 'center',
            effects: [{ type: 'enter', preset: 'fadeUp', delayMs: 400, durationMs: 800 }],
          }),
          node('coin1', [8, 55, 12, 30], {
            type: 'image', uri: `${O}/coin.webp`, fit: 'contain', alt: 'Монета', radius: 0,
            action: { type: 'openPromo', promoId: 'cashback' },
            effects: [
              { type: 'enter', preset: 'slideRight', delayMs: 600, durationMs: 900 },
              { type: 'float', distance: 1.5, durationMs: 2200, delayMs: 200 },
            ],
          }),
          node('coin2', [80, 50, 12, 30], {
            type: 'image', uri: `${O}/coin.webp`, fit: 'contain', alt: '', radius: 0,
            effects: [
              { type: 'enter', preset: 'bounceIn', delayMs: 800, durationMs: 900 },
              { type: 'wiggle', angle: 8, durationMs: 1600 },
            ],
          }),
          node('cta', [38, 68, 24, 14], {
            type: 'button', label: 'Играй сега', action: { type: 'navigate', route: 'Casino' }, bg: 'gold', fg: 'onPrimary',
            fontSize: 2.4, weight: '800', radius: 7,
            effects: [{ type: 'enter', preset: 'fadeUp', delayMs: 900, durationMs: 700 }, { type: 'pulse', scale: 1.06, durationMs: 900 }],
          }),
        ],
      },
    },
    {
      kind: 'widget', id: 'tickets',
      widget: {
        type: 'ticketCounter', aspectRatio: 4.8,
        backgroundUri: 'https://wbbgcdn.kubdev.com/common-content/landing-pages/container/2026-november-birthday-landing/desktop/ticket-counter-background-v3.png',
        background: 'background',
        boxUri: 'https://wbbgcdn.kubdev.com/common-content/landing-pages/container/2026-november-birthday-landing/center-ticket-november-birthday-v5.png',
        guestText: 'Моля влезте в профила си.', userText: 'Участваш с:', field: 'tickets', textColor: 'white', numberColor: 'white',
        loginAction: { type: 'navigate', route: 'Login' },
      },
    },
    {
      kind: 'widget', id: 'calendar',
      widget: {
        type: 'calendar', title: 'Ноември 2026', month: '2026-11', firstDay: 9, lastDay: 30, timeZone: 'Europe/Sofia',
        prizeText: '33 000 €', wonText: 'СПЕЧЕЛЕНИ', watchText: 'Виж', todayText: 'Теглене до 20:00', todayChip: 'ДНЕС',
        tomorrowText: 'Утре', soonText: 'Скоро', weekdayLabels: ['ПН', 'ВТ', 'СР', 'ЧТ', 'ПТ', 'СБ', 'НД'],
        specialDays: [{ day: 30, label: 'РОЖДЕН ДЕН' }],
        colors: { background: null, board: 'secondary', day: 'surface', text: 'white', muted: 'onSurface', accent: 'gold', today: 'white', onToday: 'danger' },
      },
    },
    {
      kind: 'widget', id: 'draws',
      widget: {
        type: 'drawVideos',
        videoUrlPattern: 'https://wbbgcdn.kubdev.com/common-content/landing-pages/container/2026-november-birthday-landing/tombola-draws/{DD}{MM}novemberdraw.mp4',
        posterUri: 'https://wbbgcdn.kubdev.com/common-content/landing-pages/container/2026-november-birthday-landing/desktop/thumbnail.png',
        startDate: '2026-11-09', endDate: '2026-11-30', timeZone: 'Europe/Sofia', releaseTime: { hour: 20, minute: 0 },
        labels: {
          drawFor: 'Теглене за', today: 'Днес', pending: 'Тегленето ще бъде достъпно до {time}',
          future: 'Тегленето ще бъде достъпно на {date} в {time}', backToToday: 'Към днес',
          weekdays: ['Понеделник', 'Вторник', 'Сряда', 'Четвъртък', 'Петък', 'Събота', 'Неделя'],
        },
        colors: { background: null, card: 'surface', text: 'white', muted: 'onSurface', accent: 'gold', onAccent: 'onPrimary' },
      },
    },
    {
      kind: 'widget', id: 'games',
      widget: {
        type: 'gameCarousel', title: 'WINBET ORIGINALS', backgroundUri: 'https://wbbgcdn.kubdev.com/common-content/landing-pages/container/2026-november-birthday-landing/desktop/hero-bg.jpg',
        background: 'background',
        games: [
          { id: 'g41', name: 'Goal Kings', imageUri: `${CDN}/1/layout_1/game-banners/vertical/41.png`, action: { type: 'openGame', gameId: '-121840' } },
          { id: 'g5328', name: 'Burning Goals', imageUri: `${CDN}/1/layout_1/game-banners/vertical/5328.png`, action: { type: 'openGame', gameId: '-85659' } },
          { id: 'gbw', name: 'Popular Win', imageUri: `${CDN}/2/layout_1/game-banners/vertical/BGWBSlot.png`, action: { type: 'openGame', gameId: '-123731' } },
          { id: 'gkb', name: 'Goal Kings VIP', imageUri: `${CDN}/2/layout_1/game-banners/vertical/WGKBLSlot.png`, action: { type: 'openGame', gameId: '-122103' } },
          { id: 'g41b', name: 'Goal Kings', imageUri: `${CDN}/1/layout_1/game-banners/vertical/41.png`, action: { type: 'openGame', gameId: '-121840' } },
        ],
        playLabel: 'ИГРАЙ', ctaText: 'НЕ НАМИРАШ СВОЯТА ИГРА?', ctaLabel: 'КЪМ КАЗИНОТО', ctaAction: { type: 'navigate', route: 'Casino', webPath: '/casino' },
        colors: { text: 'white', accent: 'gold', onAccent: 'onPrimary' },
      },
    },
    {
      kind: 'widget', id: 'terms',
      widget: {
        type: 'terms', title: 'ПРАВИЛА И УСЛОВИЯ:', expandLabel: 'Покажи пълни правила и условия', collapseLabel: 'Скрий правила и условия', previewBlocks: 3,
        blocks: [
          { kind: 'numbered', spans: [{ text: 'В кампанията „', bold: false }, { text: 'HAPPY CASHDAY', bold: true }, { text: '“ участват всички регистрирани потребители.', bold: false }] },
          { kind: 'numbered', spans: [{ text: 'Кампанията е активна от 09.11.2026 г. до 30.11.2026 г.', bold: false }] },
          { kind: 'bullet', spans: [{ text: '33 000 € кеш всеки ден', bold: true }] },
          { kind: 'bullet', spans: [{ text: 'Едно теглене на ден в 20:00 ч.', bold: false }] },
          { kind: 'paragraph', spans: [{ text: 'Организаторът си запазва правото да променя условията.', bold: false }] },
        ],
        colors: { background: null, card: 'surface', text: 'white', accent: 'gold' },
      },
    },
  ],
};

const parsed = parsePage(raw);
if (!parsed.ok) throw new Error(parsed.error);
if (parsed.warnings.length) console.warn('page warnings', parsed.warnings);
const PAGE: Page = parsed.page;

function App() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [last, setLast] = useState<SceneAction | null>(null);
  return (
    <>
      <div className="bar">
        <button type="button" onClick={() => setLoggedIn((v) => !v)}>{loggedIn ? 'Log out' : 'Log in'}</button>
        <span data-testid="last-action">{last ? JSON.stringify(last) : 'no action yet'}</span>
      </div>
      <PageView
        page={PAGE}
        palette={palette}
        fontFamily={FONT}
        fonts={FONTS}
        user={loggedIn ? { loggedIn: true, fields: { tickets: 7 } } : { loggedIn: false }}
        onAction={setLast}
      />
    </>
  );
}

const root = document.getElementById('root');
if (root) createRoot(root).render(<StrictMode><App /></StrictMode>);
