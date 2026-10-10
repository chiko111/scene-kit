import { describe, expect, it } from 'vitest';
import { createButtonNode, createScene, createShapeNode } from './factory';
import { parseScene, serializeScene } from './parse';
import { withAlpha, toBoxShadow } from './style';
import { COLOR_TOKENS, type Palette } from './schema';

const palette = Object.fromEntries(COLOR_TOKENS.map((t) => [t, '#112233'])) as Palette;

function validScene() {
  const scene = createScene('Test');
  const taken = new Set<string>();
  const button = createButtonNode(taken, 'Casino');
  const shape = createShapeNode(taken);
  return { ...scene, nodes: [shape, button] };
}

describe('parseScene', () => {
  it('accepts a valid scene and round-trips', () => {
    const scene = validScene();
    const result = parseScene(serializeScene(scene));
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.scene).toEqual(scene);
      expect(result.warnings).toEqual([]);
    }
  });

  it('rejects malformed JSON without throwing', () => {
    expect(parseScene('{nope')).toEqual({ ok: false, error: 'Invalid JSON', warnings: [] });
  });

  it('rejects unknown versions', () => {
    const result = parseScene({ ...validScene(), version: 2 });
    expect(result.ok).toBe(false);
  });

  it('rejects non-objects', () => {
    for (const input of [null, 42, [], 'null', '[]']) {
      expect(parseScene(input).ok).toBe(false);
    }
  });

  it('drops an invalid node but keeps the rest', () => {
    const scene = validScene();
    const result = parseScene({ ...scene, nodes: [...scene.nodes, { type: 'video', id: 'x' }] });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.scene.nodes).toHaveLength(2);
      expect(result.warnings[0]?.path).toBe('nodes[2]');
    }
  });

  it('drops non-https images', () => {
    const scene = validScene();
    const bad = {
      ...scene.nodes[0],
      type: 'image',
      id: 'img_1',
      uri: 'javascript:alert(1)',
      fit: 'cover',
      alt: '',
      radius: 0,
    };
    const result = parseScene({ ...scene, nodes: [bad] });
    expect(result.ok && result.scene.nodes.length).toBe(0);
  });

  it('drops unknown / duplicate effects but keeps the node', () => {
    const scene = validScene();
    const [first] = scene.nodes;
    const node = {
      ...first,
      effects: [
        { type: 'pulse', scale: 1.1, durationMs: 800 },
        { type: 'pulse', scale: 1.2, durationMs: 800 },
        { type: 'explode', power: 9000 },
      ],
    };
    const result = parseScene({ ...scene, nodes: [node] });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.scene.nodes[0]?.effects).toEqual([{ type: 'pulse', scale: 1.1, durationMs: 800 }]);
      expect(result.warnings).toHaveLength(2);
    }
  });

  it('drops duplicate ids', () => {
    const scene = validScene();
    const result = parseScene({ ...scene, nodes: [scene.nodes[0], scene.nodes[0]] });
    expect(result.ok && result.scene.nodes.length).toBe(1);
  });

  it('rejects actions outside the whitelist', () => {
    const scene = validScene();
    const button = { ...scene.nodes[1], action: { type: 'openUrl', url: 'https://evil.example' } };
    const result = parseScene({ ...scene, nodes: [button] });
    expect(result.ok && result.scene.nodes.length).toBe(0);
  });

  it('serializeScene throws on invalid scene', () => {
    const scene = validScene();
    expect(() => serializeScene({ ...scene, aspectRatio: 99 })).toThrow(/aspectRatio/);
  });
});

describe('style helpers', () => {
  it('withAlpha handles hex formats', () => {
    expect(withAlpha('#fff', 0.5)).toBe('rgba(255, 255, 255, 0.5)');
    expect(withAlpha('#000000', 1)).toBe('rgba(0, 0, 0, 1)');
    expect(withAlpha('#ff000080', 1)).toBe('rgba(255, 0, 0, 0.502)');
    expect(withAlpha('rebeccapurple', 0.5)).toBe('rebeccapurple');
  });

  it('toBoxShadow builds a valid string', () => {
    const shadow = { color: 'black' as const, opacity: 0.5, x: 0, y: 1, blur: 2 };
    expect(toBoxShadow(shadow, palette, (u) => `${u}cqw`)).toBe('0cqw 1cqw 2cqw 0px rgba(17, 34, 51, 0.5)');
    expect(toBoxShadow(null, palette, String)).toBeUndefined();
  });
});
