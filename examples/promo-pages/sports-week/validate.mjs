import { readFileSync } from 'node:fs';
import { validatePage } from '../../../packages/core/dist/index.js';
const page = JSON.parse(readFileSync(new URL('../sports-week.page.json', import.meta.url), 'utf8'));
const r = validatePage(page);
console.log(r.ok ? '✓ sports-week.page.json valid' : '✗ ' + r.errors.join('\n'));
if (r.ok) for (const s of page.sections) console.log(' ', s.id, s.kind, s.kind === 'scene' ? `${s.scene.nodes.length} nodes + mobile ${s.mobileScene.nodes.length}` : `${s.widget.blocks.length} blocks`);
process.exit(r.ok ? 0 : 1);
