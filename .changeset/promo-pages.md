---
'@chiko111/scene-kit-core': minor
'@chiko111/scene-kit-web': minor
'@chiko111/scene-kit-native': minor
'@chiko111/scene-kit-editor': minor
---

Promo pages, widgets and timeline editing.

- **core**: page schema (`parsePage`, `validatePage`, `serializePage`, `page.schema.json`) with scene, widget and slider sections; widgets `ticketCounter`, `calendar`, `drawVideos`, `gameCarousel`, `terms`; campaign date helpers; asset resolver (`setAssetResolver`, `mapAssetPrefix`); light `@chiko111/scene-kit-core/runtime` entry without zod.
- **web**: `PageView`, `usePage`, `Slider`, widgets, keyframe timelines, lazy Lottie support (optional peer `lottie-web`).
- **native**: `PageView` with scene, widget and slider sections, Lottie layers, draw videos widget. New required peers: `expo-video` and `lottie-react-native` (native modules, rebuild the app).
- **editor**: `PageEditor`, timeline panel, animation tab and presets, scene templates, widget forms, page operations.
