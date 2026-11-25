import { readFileSync } from 'node:fs';
import { validatePage } from '../../../packages/core/dist/index.js';
const page = JSON.parse(readFileSync(new URL('../neon-night.page.json', import.meta.url), 'utf8'));
const r = validatePage(page);
console.log(r.ok ? '✓ neon-night.page.json valid' : '✗ ' + r.errors.join('\n'));
if (r.ok)
  for (const s of page.sections)
    console.log(' ', s.id.padEnd(8), s.kind.padEnd(7),
      s.kind === 'scene' ? `${s.scene.nodes.length} nodes + mobile ${s.mobileScene.nodes.length}`
      : s.kind === 'slider' ? s.slides.map((x) => `${x.id}: ${x.scene.nodes.length}+${x.mobileScene.nodes.length}`).join(' · ')
      : s.widget.type);
process.exit(r.ok ? 0 : 1);
