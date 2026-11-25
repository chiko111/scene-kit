// Writes scene.schema.json from the built package (run after `tsup`).
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { pageJsonSchema, sceneJsonSchema } from '../dist/index.js';

const target = fileURLToPath(new URL('../scene.schema.json', import.meta.url));
writeFileSync(target, `${JSON.stringify(sceneJsonSchema(), null, 2)}\n`);
console.log(`wrote ${target}`);

const pageTarget = fileURLToPath(new URL('../page.schema.json', import.meta.url));
writeFileSync(pageTarget, `${JSON.stringify(pageJsonSchema(), null, 2)}\n`);
console.log(`wrote ${pageTarget}`);
