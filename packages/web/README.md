# @chiko111/scene-kit-web

React DOM renderer for **scene-kit** scenes and promo pages. CSS animations (compositor-only), container-query sizing, keyframe timelines, automatic pause off-screen and `prefers-reduced-motion` support. Styles are injected automatically.

```bash
npm i @chiko111/scene-kit-web @chiko111/scene-kit-core
# optional, only for Lottie layers:
npm i lottie-web
```

## Scene

```tsx
import { SceneView } from '@chiko111/scene-kit-web';

<SceneView scene={scene} palette={palette} fontFamily="Inter, sans-serif" onAction={handleAction} />
```

## Page

```tsx
import { PageView } from '@chiko111/scene-kit-web';

<PageView
  page={page}                                          // from parsePage()
  palette={palette}
  user={{ loggedIn: true, fields: { tickets: 7 } }}    // display values only, never tokens
  onAction={handleAction}
/>
```

Renders scene, widget and slider sections. Widgets can read page context with `usePage()`. `lottie-web` is loaded lazily, only when a page contains a Lottie layer.

Requires React 19.2+. Full docs: https://github.com/chiko111/scene-kit#readme
