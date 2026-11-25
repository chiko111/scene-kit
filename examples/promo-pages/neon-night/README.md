# НЕОНОВА НОЩ – synthwave slots tournament (generated page + artwork)

A completely different style from the inbet path pages: 1986 synthwave / outrun – near-black violet sky, striped
sunset sun, glowing perspective grid, chrome lettering with VHS chromatic aberration, neon tubes.

| File | What |
|---|---|
| `generate.mjs` | Draws all artwork as HTML/SVG, renders it in headless Chromium (Playwright), encodes WebP. `PW=<dir with node_modules/playwright> node generate.mjs` (`ONLY=title-desk,coin` regenerates selected files). Writes `manifest.json`. |
| `make_lottie.py` | Hand-written Lottie `equalizer.json` (5 neon bars, 2 s loop, 7 KB). `python3 -I make_lottie.py` |
| `build_page.py` | Builds `../neon-night.page.json` from the real image sizes; fails if any layer leaves its scene. `python3 -I build_page.py` |
| `validate.mjs` | Strict `validatePage` (core dist). |

Images: `~/Downloads/promo-builder-poc/data/assets/neon-night/` (dev: `http://<host>:4000/assets/neon-night/`).
Page JSON points at `https://ibbgcdn.kubdev.com/common-content/landing-pages/container/neon-night/<file>` – upload there for production.

## Page
1. **Hero slider** (3 slides, zoom transition, 7 s autoplay, dots + arrows): sky / stars (parallax) / sun + grid (Ken Burns) backdrop.
   Slide 1 chrome title (timeline drop-in), "ТУРНИР ПО СЛОТОВЕ" split-text, countdown to 05.12.2026 21:00 Europe/Sofia, CTA "ВКЛЮЧИ СЕ" (Login).
   Slide 2 "50 000 €" chrome prize (pop + pulse), three neon coins (bounce drop-in + float). Slide 3 moon + neon clock, neon sign "ВСЯКА НОЩ 21:00 – 02:00", dates, Lottie equalizer.
2. **Как се играе** – 3 neon arcade cabinets (fade-up, float, hover glow) + captions, Lottie equalizer.
3. **Награди** – 5 neon plates (timeline sweep-in cascade), amounts are text layers (editable).
4. **Мистериозна кутия** – tap the box: it hides, a neon burst (pop + spin) and "+50 FREE SPINS" appear (triggers + startHidden).
5. **Турнирни слотове** – gameCarousel with 6 generated neon slot tiles (fictional games), CTA to /casino.
6. **Правила** – terms widget.

## ⚠ Notes
- **Fonts:** Orbitron and Monoton have **no Cyrillic**. The artwork uses Unbounded for all Bulgarian text. The page's text layers use font key
  `heading` – map it to a Cyrillic font (recommended: `"Unbounded", sans-serif`), otherwise Bulgarian falls back to the default font.
- **Placeholders:** terms, prize amounts, dates and game names are invented – not legal copy / real games.
- The art is illustrated vector work (no photoreal 3D). Any file can be replaced 1:1 by name.
