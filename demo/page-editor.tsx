import { StrictMode, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { createScene, parsePage, type Page, type Palette } from '@chiko111/scene-kit-core';
import { PageEditor, createWidget } from '@chiko111/scene-kit-editor';

// Winbet-like theme (in the apps this comes from Colors.*).
const palette: Palette = {
  primary: '#fecf6f',
  onPrimary: '#2a0a00',
  secondary: '#750004',
  onSecondary: '#ffffe1',
  accent: '#c00006',
  gold: '#fecf6f',
  success: '#2ecc71',
  danger: '#c00006',
  surface: '#5a0002',
  onSurface: '#ffffe1',
  background: '#470001',
  white: '#ffffff',
  black: '#000000',
};

const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';
const ROUTES = ['Home', 'Login', 'Casino', 'Promo', 'Game', 'Terms'] as const;

function initialPage(): Page {
  const hero = createScene('Hero', 16 / 9);
  hero.background = 'background';
  hero.nodes.push({
    id: 'txt_title',
    name: 'Title',
    type: 'text',
    text: 'Happy Cashday',
    color: 'gold',
    fontSize: 7,
    weight: '800',
    align: 'center',
    frame: { x: 10, y: 30, w: 80, h: 25, rotation: 0 },
    opacity: 1,
    hidden: false,
    shadow: null,
    effects: [{ type: 'enter', preset: 'zoomIn', delayMs: 100, durationMs: 900 }],
  });
  const page: Page = {
    version: 1,
    id: 'demo_page',
    name: 'Demo promo page',
    background: 'background',
    mobileBreakpoint: 600,
    maxWidth: 1400,
    sections: [
      { kind: 'scene', id: 'sec_hero', scene: hero, mobileScene: null },
      { kind: 'widget', id: 'sec_calendar', widget: { ...createWidget('calendar'), title: 'Ноември', month: '2026-11', firstDay: 9, lastDay: 30, specialDays: [{ day: 30, label: 'РОЖДЕН ДЕН' }] } },
      { kind: 'widget', id: 'sec_terms', widget: createWidget('terms') },
    ],
  };
  const parsed = parsePage(page);
  if (!parsed.ok) throw new Error(parsed.error);
  return parsed.page;
}

function App() {
  const [saved, setSaved] = useState<string>('');
  return (
    <div style={{ display: 'grid', gridTemplateRows: '1fr auto', height: '100%' }}>
      <PageEditor
        initialPage={initialPage()}
        palette={palette}
        fontFamily={FONT}
        routes={ROUTES}
        onSave={async (page) => {
          await new Promise((r) => setTimeout(r, 200));
          setSaved(`${page.sections.length} sections, ${JSON.stringify(page).length} bytes`);
        }}
      />
      <pre data-testid="saved" style={{ margin: 0, padding: 6, background: '#000', color: '#3ecf8e', font: '12px monospace' }}>
        {saved ? `saved: ${saved}` : 'not saved'}
      </pre>
    </div>
  );
}

const root = document.getElementById('root');
if (root) createRoot(root).render(<StrictMode><App /></StrictMode>);
