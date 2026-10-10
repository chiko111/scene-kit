import type { EffectOf, EffectType, FontMap, Palette, SceneNode, Shadow } from './schema';

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

/**
 * Applies alpha to a palette color.
 * Supports #rgb, #rrggbb, #rrggbbaa. Any other format (rgb(), named…) is returned unchanged.
 */
export function withAlpha(color: string, alpha: number): string {
  const match = /^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i.exec(color.trim());
  const hex = match?.[1];
  if (!hex) return color;

  const full = hex.length === 3 ? [...hex].map((c) => c + c).join('') : hex;
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  const baseAlpha = full.length === 8 ? parseInt(full.slice(6, 8), 16) / 255 : 1;
  const a = Math.round(clamp(alpha, 0, 1) * baseAlpha * 1000) / 1000;

  return `rgba(${r}, ${g}, ${b}, ${a})`;
}

/**
 * CSS-compatible box-shadow string (works for CSS and RN `boxShadow`).
 * `toLength` converts "u" into a platform length, e.g. `v => `${v}cqw`` or `v => `${v * unit}px``.
 */
export function toBoxShadow(
  shadow: Shadow | null,
  palette: Palette,
  toLength: (u: number) => string,
): string | undefined {
  if (!shadow || shadow.opacity <= 0) return undefined;
  const color = withAlpha(palette[shadow.color], shadow.opacity);
  return `${toLength(shadow.x)} ${toLength(shadow.y)} ${toLength(shadow.blur)} 0px ${color}`;
}

export function findEffect<T extends EffectType>(
  effects: readonly { type: EffectType }[],
  type: T,
): EffectOf<T> | undefined {
  return effects.find((effect): effect is EffectOf<T> => effect.type === type);
}

/** Corner radius in "u", or 'ellipse' for ellipse shapes. */
export function nodeRadius(node: SceneNode): number | 'ellipse' {
  switch (node.type) {
    case 'shape':
      return node.shape === 'ellipse' ? 'ellipse' : node.radius;
    case 'image':
    case 'button':
      return node.radius;
    case 'text':
      return 0;
  }
}

/** Font family for a node's font key, or undefined (→ the scene's default font). Ignores unknown keys. */
export function resolveFont(fonts: FontMap | undefined, key: string | undefined): string | undefined {
  if (!fonts || !key || !Object.hasOwn(fonts, key)) return undefined;
  return fonts[key];
}
