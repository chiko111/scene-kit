// Renders the converted inbet page (examples/promo-pages) with the WEB renderer: /promo.html
import { StrictMode, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { parsePage, type FontMap, type Palette, type SceneAction } from '@chiko111/scene-kit-core';
import { PageView } from '@chiko111/scene-kit-web';
import inbet from '../examples/promo-pages/inbet-izjiviavane-vseki-den.page.json';
import palettes from '../examples/promo-pages/palettes.json';
import fonts from '../examples/promo-pages/fonts.json';

const PAGES = { inbet } as const;
type Brand = keyof typeof PAGES;
const brand: Brand = 'inbet';

function App() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [last, setLast] = useState('');
  const result = parsePage(PAGES[brand]);
  if (!result.ok) return <pre style={{ color: '#fff' }}>{result.error}</pre>;
  if (result.warnings.length) console.warn(result.warnings);
  const onAction = (a: SceneAction) => {
    setLast(JSON.stringify(a));
    if (a.type === 'navigate' && a.route === 'Login') setLoggedIn(true);
  };
  return (
    <>
      <PageView
        page={result.page}
        palette={(palettes as Record<string, Palette>)[brand]}
        fonts={(fonts as Record<string, FontMap>)[brand]}
        fontFamily={'"Montserrat", sans-serif'}
        user={loggedIn ? { loggedIn: true, fields: { tickets: 7 } } : { loggedIn: false }}
        onAction={onAction}
      />
      <pre data-testid="last-action" style={{ position: 'fixed', bottom: 0, left: 0, margin: 0, color: '#0f0', background: '#000a', fontSize: 11 }}>{last}</pre>
    </>
  );
}

createRoot(document.getElementById('root')!).render(<StrictMode><App /></StrictMode>);
