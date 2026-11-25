# @chiko111/scene-kit-core

Schemas (zod), tolerant parsers and helpers for **scene-kit**: animated, data-driven banners and promo pages designed in a back-office editor and rendered natively in React and React Native.

```bash
npm i @chiko111/scene-kit-core
```

## Scenes

```ts
import { parseScene } from '@chiko111/scene-kit-core';

const result = parseScene(jsonFromServer); // never throws
if (result.ok) render(result.scene);       // invalid nodes/effects are dropped with warnings
else showFallback(result.error);
```

## Pages

A page is a list of sections: scenes, widgets (`ticketCounter`, `calendar`, `drawVideos`, `gameCarousel`, `terms`) and sliders.

```ts
import { parsePage, validatePage } from '@chiko111/scene-kit-core';

// Server, before storing: strict
const checked = validatePage(body);
if (!checked.ok) return badRequest(checked.errors);

// Client: tolerant, never throws
const result = parsePage(jsonFromServer);
if (result.ok) render(result.page);
```

JSON Schemas for non-JS backends ship with the package: `scene.schema.json` and `page.schema.json`.

## Light runtime entry

Renderers can import `@chiko111/scene-kit-core/runtime`: helpers, campaign date logic, constants and types, without zod. Validate on the server with the main entry.

## Asset resolver

Rewrite media URLs from page JSON without touching the data, for example to serve CDN images from a local dev server:

```ts
import { setAssetResolver, mapAssetPrefix } from '@chiko111/scene-kit-core';

// dev builds only
setAssetResolver(mapAssetPrefix('https://cdn.example.com/promos/', 'http://192.168.1.10:4000/assets/'));
```

Production apps don't call it. Full docs: https://github.com/chiko111/scene-kit#readme
