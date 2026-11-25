# Real promo pages as scene-kit Pages

Two live landing pages, converted from their original HTML/CSS/JS into scene-kit **Page JSON**, which
renders natively on web and React Native:

| File | Original |
|---|---|
| `inbet-izjiviavane-vseki-den.page.json` | https://inbet.com/ingame/promo-landing/inbet-izjiviavane-vseki-den |
| `winbet-november-birthday.page.json` | https://winbet.bg/promo-landing/november-birthday-landing |
| `winbet-november-birthday-showcase.page.json` | the same winbet page using the round-2 features (slider, split text, countdown, Ken Burns, parallax, tap trigger). Not a copy of the original. |
| `palettes.json` | brand colours for the 13 palette tokens (`inbet`, `winbet`) |
| `fonts.json` | font keys → families (`heading`) |

```bash
python3 -I examples/promo-pages/build.py      # re-generate (downloads images once into .cache/ to read their sizes)
node examples/promo-pages/validate.mjs        # strict validation (validatePage) – all three must pass
```

The originals were read as data (inbet: its CMS HTML container + T&C container; winbet: the two hand-coded
Netlify apps for desktop **and** mobile + the platform's Ticket container). Nothing from them is executed or
embedded. The output is pure data: https images, palette tokens and whitelisted actions only.

## inbet – "Лидерът раздава"

| Original | Page JSON |
|---|---|
| `.promo-container` with background image, desktop (≥1200 px, 1920×4461) and mobile (≤600 px, 750×3104) CSS | one `scene` section: `scene` (aspect 1920/4461) + `mobileScene` (aspect 750/3104), `mobileBreakpoint: 600` |
| background image (`bgr-desk.png` / `bgr-mob.png`) | image node, full frame, `fit: cover` |
| header `a.layer-01` (top 30px, width 50% / 86%, centred) | image node `header` + `enter: fadeDown` |
| 7 path cards `.item-0N`: `top %`, `width %`, `translateX(-50%)` and the inner img's `left/right %` shift | image nodes `card1…7`. x = 50 − w/2 ± shift·w, y = top %, h from the image's natural aspect ratio |
| card link `<a href="https://inbet.com/ingame/promo-landing/<slug>">` | image `action: navigate { route: "Promo", webPath: "/ingame/promo-landing/<slug>", params: { slug } }`, Bulgarian `alt` as the accessibility label |
| idle animation `.animated-idle-1/3` (`idleFloat`, −10px, 5s / 5.5s) | `float` (distance in u, `durationMs` = half the cycle, because loops alternate) |
| `.animated-idle-2/4` (`idleFloatAlt`, −8px ±0.5°, 6s / 6.5s) | `float` + `wiggle` (0.5°) |
| `.delay-1…4` (0.3 / 0.9 / 1.2 / 1.8 s) | `delayMs` on the loops |
| *(not in the original)* | an `enter` entrance per card (zoomIn, slide, bounceIn, flipIn), staggered 150 ms |
| T&C container (69 KB HTML: `<ol>/<ul>/<li>/<p>/<strong>/<em>/<a>/<br>/<table>`) | `terms` widget: **411 blocks, nothing merged** (`numbered` / `bullet` / `paragraph`) with bold and italic spans, `level` nesting and link spans, `previewBlocks: 3`, the original's Bulgarian labels |
| `<em>` notes ("*Изключение прави…") | `italic: true` spans (111) |
| `<a href="https://inbet.com/…">` (3 links: INSLOT, КЕШБЕК РУЛЕТКА, Общи игрални условия) | span `action: navigate { route: "Web", webPath: "/…" }`; off-site links would stay plain text |
| sub-items: the `<ul>` between numbered items, "&bull; …" lines and `<br>` continuation lines inside an item, `&nbsp;`-indented "2.2 …" points | `level: 1` (198 nested blocks; one level-2 line) |

The T&C text was checked character for character against the source (whitespace normalised): all 37,828 text
characters are kept.

## winbet – "Happy Cashday"

| Original | Page JSON |
|---|---|
| hero app (`1-no-curtain-november-desktop` 3840×2150 and `…-mobile` 1080×1100 canvases) | `scene` section `hero`: `scene` + `mobileScene` with px boxes from each app's CSS converted to % |
| `.page-bg` satin, `.hero__confetti`, `.hero__cake`, `.hero__prize` (33 000 €), `.hero__title` | 5 image nodes (desktop and mobile image sets from each app's `LANDING_CONFIG.hero`) |
| intro: `img` opacity 0→1 over 0.9 s (`--ease`) while `translateY(dy) scale(s)` → none over 1.4 s (`--ease-out` = `cubic-bezier(.16,1,.3,1)`); cake 80px/.96, prize 70px/.9 (+0.25 s), title 60px (+0.45 s), confetti −60px; mobile: cake 40px/.97, prize 36px/.92, title 30px | `timeline` per layer: 6 keyframes sampled from **the exact CSS curves** (both beziers evaluated in `build.py`), linear between samples, with the same per-layer delays and the mobile overrides |
| idle: `heroFloat` 14px / 6s, `heroConfetti` 28px + 0.4° / 7s alternate, after 1.4s | cake `float` (3000 ms half cycle, delay 1400), confetti `float` + `wiggle` (delay 1400) |
| platform "Ticket" container (background, centre box image, logged-in/out texts) | `ticketCounter` widget (aspect 3840/800, `field: "tickets"`, login → `navigate Login`) + **`mobileWidget`** with the container's mobile background (`mob-ticket-…-v4.png`, aspect 750/366) |
| calendar (`LANDING_CONFIG.calendar`: Nov 2026, days 9–30, 33 000 €, special 30.11 "РОЖДЕН ДЕН") | `calendar` widget with the texts the page shows (СПЕЧЕЛЕНИ / Виж / ДНЕС / Теглене до 20:00 / Утре / Скоро, ПН…НД) |
| daily draws (`LANDING_CONFIG.draws`: `baseUrl` + `DDMM` + `novemberdraw.mp4`, poster, 9–30 Nov, Europe/Sofia, `releaseTime` 19:00, `announceTime` 20:00) | `drawVideos` widget: `videoUrlPattern …/tombola-draws/{DD}{MM}novemberdraw.mp4`, **`releaseTime 19:00` + `announceTime 20:00`**, the app's labels |
| WINBET ORIGINALS (6 games, `target="_top"` game-launch links, "КЪМ КАЗИНОТО") | `gameCarousel`: game id = launch slug, `navigate { route: "GameLaunch", webPath: "/game-launch/…?…" }` with the full path and query; CTA → `navigate Casino /casino` |
| game corner badges: `badge: true` → `games.badgeImage` (Jackpot Cards corner), `badge: "<url>"` → that jackpot logo | `badgeUri` on all 6 games exactly as mapped (3× jackpot-cards-badge, Vip-BellLink, BellLink, cc_95px) |

## Approximated

- **Float distances** are px in the originals and "u" (1% of scene width) here, converted at a typical
  display width (inbet desktop ≈1440 px, mobile 390 px; winbet on its design canvas).
  `durationMs` assumes scene-kit loops alternate, so it is half the CSS cycle. Wiggle uses the same half
  cycle.
- **inbet tablet rules** (768–1199 px, e.g. card 1 at 48.72% width) aren't represented: a page has one
  breakpoint, so tablets get the desktop scene.
- **winbet confetti rocking:** the original rotates 0.4°; the schema's minimum `wiggle` angle is 0.5°.
- **winbet confetti float direction:** the original drifts *down* 28 px; `float` moves up. Same amplitude
  and timing, mirrored direction.
- **winbet intro:** the CSS easing curves are sampled at 6 points with linear interpolation, which is very
  close but not mathematically identical.
- **Palettes** are close approximations of each brand's colours (winbet's from its CSS variables).

## Lost (the schema can't express it)

| What | Where | Why |
|---|---|---|
| Hover zoom + glow on the cards | inbet | no hover state in scenes (touch devices have none) |
| 3D tilt on the active card, coverflow layout, fullscreen button | winbet draws/games | the widget's look and behaviour belong to the renderer, not the data |
| "33 000 €" light sweep (CSS mask of the prize image) and 5 twinkling sparks (`mix-blend-mode: screen`) | winbet hero | no masks, gradients or blend modes in scene nodes |
| Red radial glow behind the cake, blurred shadow under it | winbet hero | shapes have flat token fills only, with no gradient or blur |
| Satin background running from the hero into the calendar | winbet | sections clip; each section has its own background (the hero image is cut at the hero's bottom edge) |
| T&C table layout (2 tables) | inbet T&C | rows became `cell \| cell` paragraphs; there is no table block |

## Schema gaps found

1. **No hover / pointer states:** cards can't react to the mouse on web.
2. **No gradient, blur, mask or blend primitives:** decorative light effects (shine sweeps, glints, radial
   glows) have to be baked into images.
3. **Sections can't share a background:** a page-level or overlapping background image isn't possible.
4. **Only one breakpoint per page:** pages with distinct tablet layouts collapse to desktop or mobile.
5. **No table block in `terms`.**
6. **`wiggle` minimum is 0.5°** (winbet's confetti uses 0.4°); **`float` only moves up.**

## Round 2

Closed from round 1 (core round 2 added these, and the converter now uses them):

| Gap | Now |
|---|---|
| draws had one time | `releaseTime 19:00` (video appears) + `announceTime 20:00` (shown in the labels), as in the original |
| no game badges | `badgeUri` on all 6 games, mapped exactly like the original's `badge` field |
| widgets had no mobile variant | ticket counter `mobileWidget` with the mobile background (aspect 750/366) |
| T&C limited to 400 blocks, no nesting / italics / links | all 411 blocks kept (no merging), `level` nesting, italic spans, the 3 links as `navigate Web` actions |
| winbet intro approximated with `enter` presets | per-layer `timeline` reproducing the original's exact transitions, delays and mobile offsets |

The faithful pages don't use Ken Burns or parallax, because the originals don't move the satin or scroll layers.

### Showcase page (`winbet-november-birthday-showcase.page.json`)

The same winbet content, used to demonstrate the round-2 features (not a copy of the original):

- **hero → `slider`:** 2 slides, fade 900 ms, autoplay 8 s, loop, dots and arrows, pause on touch. Desktop and mobile variants.
  - slide 1 `birthday`: the original hero, plus **Ken Burns** on the satin, **parallax** (depth −0.35) on the
    confetti, and a **tap trigger**: tapping the cake shows and plays the hidden (`startHidden`) gold "+7 билета" badge
    (shape + text, `bounceIn`).
  - slide 2 `daily`: the same assets. "33 000 € ВСЕКИ ДЕН" with **splitText** (per character, fadeUp,
    45 ms stagger), the prize zooming in then pulsing, and a **countdown** layer to 30.11.2026 23:59
    Europe/Sofia ("2д 03ч 14м 09с", then "ЧЕСТИТ РОЖДЕН ДЕН!" after the end).
- Tickets, calendar, draws and games are the same as the faithful page.

`.cache/` holds downloaded originals (images, used only to read their sizes) and is gitignored.
