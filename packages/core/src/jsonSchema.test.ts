import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { sceneJsonSchema } from './jsonSchema';

describe('scene.schema.json', () => {
  it('is up to date with the zod schema (run `npm run build -w @chiko111/scene-kit-core`)', () => {
    const committed = JSON.parse(readFileSync(new URL('../scene.schema.json', import.meta.url), 'utf8'));
    expect(committed).toEqual(sceneJsonSchema());
  });
});
