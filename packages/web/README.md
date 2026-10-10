# @scene-kit/web

React DOM renderer for **scene-kit** scenes. CSS animations (compositor-only), container-query sizing, automatic pause off-screen and `prefers-reduced-motion` support.

```bash
npm i @scene-kit/web @scene-kit/core
```

```tsx
import { SceneView } from '@scene-kit/web';

<SceneView scene={scene} palette={palette} fontFamily="Inter, sans-serif" onAction={handleAction} />
```

Requires React 19.2+. Full docs: https://github.com/chiko111/scene-kit#readme
