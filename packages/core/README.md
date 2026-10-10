# @scene-kit/core

Scene schema (zod), tolerant parser and helpers for **scene-kit** — animated, data-driven banners designed in a back-office editor and rendered natively in React and React Native.

```bash
npm i @scene-kit/core
```

```ts
import { parseScene } from '@scene-kit/core';

const result = parseScene(jsonFromServer); // never throws
if (result.ok) render(result.scene);       // invalid nodes/effects are dropped with warnings
else showFallback(result.error);
```

Validate on your server too before storing a scene. Full docs: https://github.com/chiko111/scene-kit#readme
