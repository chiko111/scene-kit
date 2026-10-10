import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

// The Spring Boot example ships copies of the schema + fixtures; keep them identical (`npm run sync:java`).
const example = new URL('../../../examples/spring-boot/src/', import.meta.url);

describe.runIf(existsSync(example))('examples/spring-boot is in sync', () => {
  it('scene.schema.json', () => {
    expect(readFileSync(new URL('main/resources/scene-kit/scene.schema.json', example), 'utf8')).toBe(
      readFileSync(new URL('../scene.schema.json', import.meta.url), 'utf8'),
    );
  });

  it('fixtures', () => {
    const source = new URL('../fixtures/', import.meta.url);
    const target = new URL('test/resources/fixtures/', example);
    expect(readdirSync(target).sort()).toEqual(readdirSync(source).sort());
    for (const f of readdirSync(source)) {
      expect(readFileSync(new URL(f, target), 'utf8')).toBe(readFileSync(new URL(f, source), 'utf8'));
    }
  });
});
