import type { CSSProperties } from 'react';
import type { ColorToken, Palette } from '@chiko111/scene-kit-core/runtime';

export type CSSVars = CSSProperties & Record<`--${string}`, string | number | undefined>;

/** { text: 'white' } → { '--skw-text': palette.white } (null tokens are skipped). */
export function colorVars(palette: Palette, colors: Readonly<Record<string, ColorToken | null>>): CSSVars {
  const vars: CSSVars = {};
  for (const [name, token] of Object.entries(colors)) {
    if (!token) continue;
    const cssName = name.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);
    vars[`--skw-${cssName}`] = palette[token];
  }
  return vars;
}
