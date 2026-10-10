// Conformance fixtures shared by the JS tests and non-JS backends (e.g. the Spring Boot example).
// valid-*.json   → a strict backend must accept
// invalid-*.json → a strict backend must reject
import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const dir = fileURLToPath(new URL('../fixtures/', import.meta.url));
mkdirSync(dir, { recursive: true });

const frame = (x, y, w, h) => ({ x, y, w, h, rotation: 0 });
const base = (id, name, f) => ({ id, name, frame: f, opacity: 1, hidden: false, shadow: null, effects: [] });

const full = {
  version: 1,
  id: 'promo_welcome',
  name: 'Welcome banner',
  aspectRatio: 1.7778,
  background: 'background',
  nodes: [
    { ...base('img_bg', 'Background', frame(0, 0, 100, 100)), type: 'image', uri: 'https://cdn.example.com/scene-assets/bg.webp', fit: 'cover', alt: '', radius: 0 },
    {
      ...base('img_coin', 'Coin', frame(60, 10, 30, 40)),
      type: 'image', uri: 'https://cdn.example.com/scene-assets/coin.webp', fit: 'contain', alt: 'Gold coin', radius: 0,
      effects: [
        { type: 'float', distance: 1.5, durationMs: 2000 },
        { type: 'glow', colors: ['gold', 'primary'], blur: 3, spread: 0.5, durationMs: 1200 },
      ],
    },
    {
      ...base('txt_title', 'Title', frame(5, 15, 50, 20)),
      type: 'text', text: 'Welcome bonus', color: 'white', font: 'heading', fontSize: 5, weight: '800', align: 'left',
      shadow: { color: 'black', opacity: 0.4, x: 0, y: 0.3, blur: 0.8 },
      effects: [{ type: 'fadeIn', delayMs: 200, durationMs: 600 }],
    },
    { ...base('shp_badge', 'Badge', frame(5, 40, 12, 12)), type: 'shape', shape: 'ellipse', fill: 'gold', radius: 0 },
    {
      ...base('btn_cta', 'CTA', frame(5, 70, 30, 14)),
      type: 'button', label: 'Play now', action: { type: 'navigate', route: 'Casino', params: { tab: 'slots' } },
      bg: 'primary', fg: 'onPrimary', fontSize: 3, weight: '700', radius: 1.5,
      shadow: { color: 'black', opacity: 0.35, x: 0, y: 0.6, blur: 1.5 },
      effects: [
        { type: 'pulse', scale: 1.06, durationMs: 900 },
        { type: 'outlinePulse', color: 'gold', width: 0.4, spread: 1.12, durationMs: 1400 },
        { type: 'borderRun', colors: ['gold', 'accent'], size: 1.2, durationMs: 2400 },
      ],
    },
    { ...base('btn_promo', 'Promo', frame(40, 70, 25, 14)), effects: [{ type: 'edgeBlink', colors: ['gold', 'danger', 'accent'], width: 0.4, blur: 1, mode: 'blink', durationMs: 500 }], type: 'button', label: 'Details', action: { type: 'openPromo', promoId: 'welcome-100' }, bg: 'surface', fg: 'onSurface', fontSize: 2.5, weight: '600', radius: 1.5 },
    { ...base('btn_game', 'Game', frame(70, 70, 25, 14)), type: 'button', label: 'Spin', action: { type: 'openGame', gameId: 'book_of_ra' }, bg: 'accent', fg: 'black', fontSize: 2.5, weight: '600', radius: 1.5 },
  ],
};

const empty = { version: 1, id: 'empty', name: '', aspectRatio: 1, background: null, nodes: [] };

const clone = (v) => JSON.parse(JSON.stringify(v));
const withNode = (i, patch) => { const s = clone(full); s.nodes[i] = { ...s.nodes[i], ...patch }; return s; };

const cases = {
  'valid-full': full,
  'valid-empty': empty,
  'invalid-version-2': { ...clone(full), version: 2 },
  'invalid-aspect-ratio': { ...clone(full), aspectRatio: 99 },
  'invalid-http-image': withNode(0, { uri: 'http://cdn.example.com/bg.webp' }),
  'invalid-javascript-uri': withNode(0, { uri: 'javascript:alert(1)' }),
  'invalid-unknown-node-type': (() => { const s = clone(full); s.nodes.push({ ...base('vid_1', 'Video', frame(0, 0, 10, 10)), type: 'video' }); return s; })(),
  'invalid-unknown-action': withNode(4, { action: { type: 'openUrl', url: 'https://evil.example' } }),
  'invalid-hex-color': withNode(3, { fill: '#ff0000' }),
  'invalid-duplicate-node-id': (() => { const s = clone(full); s.nodes.push(clone(s.nodes[0])); return s; })(),
  'invalid-duplicate-effect': withNode(4, { effects: [{ type: 'pulse', scale: 1.1, durationMs: 800 }, { type: 'pulse', scale: 1.2, durationMs: 800 }] }),
  'invalid-too-many-params': withNode(4, { action: { type: 'navigate', route: 'Casino', params: Object.fromEntries(Array.from({ length: 11 }, (_, i) => [`k${i}`, 'v'])) } }),
  'invalid-extra-property': { ...clone(full), script: 'alert(1)' },
  'invalid-bad-id': { ...clone(full), id: '../../etc/passwd' },
  'invalid-too-many-colors': withNode(1, { effects: [{ type: 'glow', colors: ['gold', 'gold', 'gold', 'gold', 'gold'], blur: 3, spread: 0, durationMs: 1000 }] }),
  'invalid-no-colors': withNode(1, { effects: [{ type: 'glow', colors: [], blur: 3, spread: 0, durationMs: 1000 }] }),
  'invalid-font-key': withNode(2, { font: '../../font' }),
  'invalid-missing-nodes': (() => { const s = clone(full); delete s.nodes; return s; })(),
};

for (const [name, value] of Object.entries(cases)) {
  writeFileSync(`${dir}${name}.json`, `${JSON.stringify(value, null, 2)}\n`);
}
console.log(`wrote ${Object.keys(cases).length} fixtures to ${dir}`);
