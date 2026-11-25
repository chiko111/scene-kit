// Validates the converted pages with the strict backend validator from scene-kit core.
//   node examples/promo-pages/validate.mjs        (core must be built: npm run build -w @chiko111/scene-kit-core)
import { readFileSync } from 'node:fs';
import { validatePage } from '../../packages/core/dist/index.js';

const files = [
  'inbet-izjiviavane-vseki-den.page.json',
];
let failed = false;

const sceneInfo = (scene, mobile) =>
  `${scene.nodes.length} nodes${mobile ? ` + mobile ${mobile.nodes.length} nodes` : ''}`;

function describeWidget(w) {
  if (w.type === 'terms') {
    const levels = w.blocks.filter((b) => b.level).length;
    const italic = w.blocks.flatMap((b) => b.spans).filter((s) => s.italic).length;
    const links = w.blocks.flatMap((b) => b.spans).filter((s) => s.action).length;
    return ` ${w.blocks.length} blocks (${levels} nested, ${italic} italic spans, ${links} links)`;
  }
  if (w.type === 'gameCarousel') return ` ${w.games.length} games (${w.games.filter((g) => g.badgeUri).length} with badge)`;
  if (w.type === 'drawVideos') {
    const t = (x) => `${String(x.hour).padStart(2, '0')}:${String(x.minute).padStart(2, '0')}`;
    return ` video ${t(w.releaseTime)}, announced ${w.announceTime ? t(w.announceTime) : t(w.releaseTime)}`;
  }
  return '';
}

for (const file of files) {
  const raw = readFileSync(new URL(file, import.meta.url), 'utf8');
  const result = validatePage(raw);
  if (!result.ok) {
    failed = true;
    console.log(`✗ ${file}\n  ${result.errors.join('\n  ')}`);
    continue;
  }
  const { page } = result;
  const parts = page.sections.map((s) => {
    if (s.kind === 'widget') {
      return `${s.id}: widget ${s.widget.type}${describeWidget(s.widget)}${s.mobileWidget ? ' + mobile variant' : ''}`;
    }
    if (s.kind === 'slider') {
      const slides = s.slides.map((sl) => `${sl.id} (${sceneInfo(sl.scene, sl.mobileScene)})`).join(', ');
      return `${s.id}: slider ${s.slides.length} slides, ${s.transition} ${s.transitionMs}ms, autoplay ${s.autoplayMs}ms – ${slides}`;
    }
    return `${s.id}: scene ${sceneInfo(s.scene, s.mobileScene)}`;
  });
  console.log(`✓ ${file} (${raw.length} bytes)\n  ${parts.join('\n  ')}`);
}
process.exit(failed ? 1 : 0);
