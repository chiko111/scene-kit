# @chiko111/scene-kit-editor

Visual back-office editor for **scene-kit** scenes (React DOM): layers, drag & resize, effects, shadows, buttons with whitelisted actions, uploads, undo/redo, JSON import/export. The preview uses `@chiko111/scene-kit-web`, so what you see is what ships.

```bash
npm i @chiko111/scene-kit-editor @chiko111/scene-kit-web @chiko111/scene-kit-core
```

```tsx
import { SceneEditor } from '@chiko111/scene-kit-editor';

<SceneEditor palette={palette} routes={['Home', 'Casino']} onUpload={upload} onSave={save} />
```

Requires React 19.2+. Full docs: https://github.com/chiko111/scene-kit#readme
