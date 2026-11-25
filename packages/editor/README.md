# @chiko111/scene-kit-editor

Visual back-office editor for **scene-kit** scenes and promo pages (React DOM). The preview uses `@chiko111/scene-kit-web`, so what you see is what ships.

```bash
npm i @chiko111/scene-kit-editor @chiko111/scene-kit-web @chiko111/scene-kit-core
```

## Scene editor

Layers, drag & resize, effects, shadows, keyframe timeline, animation presets, buttons with whitelisted actions, uploads, undo/redo, JSON import/export.

```tsx
import { SceneEditor } from '@chiko111/scene-kit-editor';

<SceneEditor palette={palette} routes={['Home', 'Casino']} onUpload={upload} onSave={save} />
```

## Page editor

Builds whole promo pages from scene, widget and slider sections, with edit / preview / JSON tabs, scene templates and per-widget forms.

```tsx
import { PageEditor } from '@chiko111/scene-kit-editor';

<PageEditor
  initialPage={page}            // already validated with parsePage()
  palette={palette}
  routes={['Home', 'Casino']}
  onUpload={upload}             // (file) => Promise<https URL>
  onSave={save}                 // receives a strictly re-validated page; throw to show an error
/>
```

Requires React 19.2+. Full docs: https://github.com/chiko111/scene-kit#readme
