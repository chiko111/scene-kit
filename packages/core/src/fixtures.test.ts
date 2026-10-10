import { readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { validateScene } from './parse';

const dir = new URL('../fixtures/', import.meta.url);
const files = readdirSync(dir).filter((f) => f.endsWith('.json'));

describe('conformance fixtures (shared with non-JS backends)', () => {
  it('has fixtures', () => expect(files.length).toBeGreaterThan(5));

  for (const file of files) {
    const expected = file.startsWith('valid-');
    it(`${file} → ${expected ? 'accepted' : 'rejected'}`, () => {
      const result = validateScene(readFileSync(new URL(file, dir), 'utf8'));
      expect(result.ok, result.ok ? '' : result.errors.join('; ')).toBe(expected);
    });
  }
});
