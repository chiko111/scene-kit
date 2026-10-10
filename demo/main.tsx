import { StrictMode, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { parseScene, type Palette, type Scene, type SceneAction } from '@chiko111/scene-kit-core';
import { SceneEditor } from '@chiko111/scene-kit-editor';
import { SceneView } from '@chiko111/scene-kit-web';

// In the real apps this comes from your Colors.* theme.
const palette: Palette = {
  primary: '#ffb81c',
  onPrimary: '#1a1300',
  secondary: '#7b2ff7',
  onSecondary: '#ffffff',
  accent: '#00d1b2',
  gold: '#ffd54a',
  success: '#2ecc71',
  danger: '#ff4d5e',
  surface: '#1b1530',
  onSurface: '#f3f0ff',
  background: '#120d24',
  white: '#ffffff',
  black: '#000000',
};

const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';
const ROUTES = ['Home', 'Casino', 'LiveCasino', 'Sport', 'Promotions'] as const;

// Fake upload: uses files from demo/public so they are served over https by Vite.
async function fakeUpload(file: File): Promise<string> {
  await new Promise((r) => setTimeout(r, 300));
  return new URL(file.name.endsWith('.webp') ? '/coin.webp' : '/bg.png', window.location.origin).href;
}

function App() {
  const [saved, setSaved] = useState<Scene | null>(null);
  const [actions, setActions] = useState<SceneAction[]>([]);

  return (
    <div style={{ display: 'grid', gridTemplateRows: '1fr auto', height: '100%' }}>
      <SceneEditor
        palette={palette}
        fontFamily={FONT}
        routes={ROUTES}
        onUpload={fakeUpload}
        onSave={async (scene) => {
          // Simulates the round trip: server stores JSON, app fetches and parses it.
          const result = parseScene(JSON.stringify(scene));
          if (!result.ok) throw new Error(result.error);
          setSaved(result.scene);
        }}
      />
      <section data-testid="app-preview" style={{ padding: 16, background: '#000', color: '#fff' }}>
        <h4 style={{ margin: '0 0 8px' }}>App preview (last saved JSON)</h4>
        {saved ? (
          <>
            <div style={{ maxWidth: 480 }}>
              <SceneView scene={saved} palette={palette} fontFamily={FONT} onAction={(a) => setActions((list) => [...list, a])} />
            </div>
            <div data-testid="limit-max-height" style={{ width: 800 }}>
              <SceneView scene={saved} palette={palette} fontFamily={FONT} maxHeight={120} />
            </div>
            <div data-testid="limit-contain" style={{ width: 300, height: 300, outline: '1px dashed #555' }}>
              <SceneView scene={saved} palette={palette} fontFamily={FONT} fit="contain" />
            </div>
          </>
        ) : (
          <p>Press Save in the JSON tab.</p>
        )}
        <pre data-testid="actions">{JSON.stringify(actions)}</pre>
      </section>
    </div>
  );
}

const root = document.getElementById('root');
if (root) {
  createRoot(root).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}
