# @chiko111/scene-kit-web

## 0.4.0

### Minor Changes

- f937094: Glow can follow a transparent image's outline (`glow.contour`). New image `blur` effect (static, focusIn, breathe) — opacity-only crossfade, identical on web and native. Buttons: optional same-site `webPath` on `navigate` actions for web apps (relative paths only).

### Patch Changes

- Updated dependencies [f937094]
  - @chiko111/scene-kit-core@0.4.0

## 0.3.0

### Minor Changes

- 7294d54: New effects with color cycles (1–4 colors): `glow` (letters glow on text nodes), `edgeBlink` (blink or fade) and `borderRun` (lights running around the border). Font selection for text and buttons via a `fonts` map. `createSceneClient()` — load/save/upload against two (or three) plain endpoints, with caching that is safe for React `use()`.
- 876fba1: `SceneView` size limits: `maxWidth`, `maxHeight` and `fit="contain"`. The scene keeps its aspect ratio, is centered and never overflows its slot. New `fitSceneWidth()` helper in core.

### Patch Changes

- Updated dependencies [1727107]
- Updated dependencies [7294d54]
- Updated dependencies [876fba1]
  - @chiko111/scene-kit-core@0.3.0

## 0.2.0

### Minor Changes

- fe61db5: Initial public release: scene schema + validation, React DOM and React Native renderers, back-office editor.

### Patch Changes

- Updated dependencies [fe61db5]
  - @chiko111/scene-kit-core@0.2.0
