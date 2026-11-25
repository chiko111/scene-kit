# Спортна седмица (inbet style) – generated page + artwork

New promo page in the style of the inbet path landing page, with artwork generated in code.

| File | What |
|---|---|
| `generate.mjs` | Draws all artwork as vector HTML/SVG (Montserrat 700–900), renders it with headless Chromium (Playwright) and encodes transparent WebP. `PW=<dir with node_modules/playwright> node generate.mjs` (`ONLY=card1-boosted-odds,podium` regenerates selected files). Writes `manifest.json` (sizes). |
| `build_page.py` | Builds `../sports-week.page.json` from the real image sizes in `manifest.json`: desktop scene (1920×4400) + mobile scene (750×3400), terms widget. `python3 -I build_page.py` |
| `validate.mjs` | Strict `validatePage` check (core dist). |

Output images: `~/Downloads/promo-builder-poc/data/assets/sports-week/*.webp` (served in dev from `http://<host>:4000/assets/sports-week/`).
The page JSON references the production CDN path `https://ibbgcdn.kubdev.com/common-content/landing-pages/container/sports-week/<file>.webp` – upload the files there for production.

## Page
- Background, header (fade-down entrance + hover), 6 cards in an alternating path (varied entrances, staggered float/wiggle loops, inbet hover: scale 1.07 / lift 8px / brightness 1.15 / cyan glow 20px), chevrons between cards (fade in, float, parallax 0.2), podium with a football (timeline pop 0.8 → 1.05 → 1).
- Card actions: `Sport /sport/boosted-odds`, `Promo /promotions/free-bet`, `Sport /sport/accumulator`, `Promo /promotions/cashback`, `Sport /sport/champions-league`, `Sport /sport/live` – the app/site must map these routes.
- Terms widget with 12 rules.

## ⚠ Placeholders
- **The terms are generic placeholder text, not legal copy** (period 01.12–07.12.2026, amounts, wagering x5, max 500 € etc. are invented). Replace with the real rules from legal/compliance before publishing.
- Offer amounts on the cards (10 € free bet, +50% accumulator, 20% cashback) are examples too.
- The artwork is illustrated vector art (gradients, highlights, shadows), not photoreal 3D renders like inbet's production art; designers can replace any file 1:1 (same name) without touching the page.
