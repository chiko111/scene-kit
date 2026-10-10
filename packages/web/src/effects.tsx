import type { CSSProperties } from 'react';
import { findEffect, withAlpha, type Effect, type NodeOf, type Palette } from '@chiko111/scene-kit-core';

type CSSVars = CSSProperties & Record<`--${string}`, string | number>;

const cqw = (u: number) => `${u}cqw`;

/**
 * Timing for color layer `i` of `n` (durationMs per color). Mirrors cycleOpacity() in core:
 * the layer's cycle starts when its color is due; negative delays start every layer mid-cycle
 * immediately, so nothing flashes before the animation begins.
 */
function layerAnimation(kind: 'fade' | 'blink', i: number, n: number, durationMs: number): string {
  if (n === 1) {
    return kind === 'blink'
      ? `sk-blink-1 ${durationMs}ms step-end infinite`
      : `sk-breathe ${durationMs}ms ease-in-out infinite`;
  }
  const delay = i === 0 ? 0 : -(n - i) * durationMs;
  return kind === 'blink'
    ? `sk-blink-${n} ${n * durationMs}ms step-end ${delay}ms infinite`
    : `sk-fade-${n} ${n * durationMs}ms linear ${delay}ms infinite`;
}

/** Behind the content: soft glow cycling through colors (opacity-only animation). */
export function GlowLayers({ effects, palette }: { effects: readonly Effect[]; palette: Palette }) {
  const glow = findEffect(effects, 'glow');
  if (!glow) return null;
  const n = glow.colors.length;
  const wrapper: CSSVars | undefined =
    n > 1 ? { animation: `sk-breathe-soft ${glow.durationMs}ms ease-in-out infinite` } : undefined;

  return (
    <div className="sk-fx-box sk-fx" style={wrapper} aria-hidden>
      {glow.colors.map((token, i) => (
        <div
          key={`${token}-${i}`}
          className="sk-fx-box sk-fx sk-layer"
          data-first={i === 0}
          style={{
            boxShadow: `0 0 ${cqw(glow.blur)} ${cqw(glow.spread)} ${palette[token]}`,
            animation: layerAnimation('fade', i, n, glow.durationMs),
          }}
        />
      ))}
    </div>
  );
}

/**
 * Glow for text nodes: lights up the letters, not the box. Copies of the text in the glow color
 * with a halo sit behind the real text (same cycle as GlowLayers).
 */
export function TextGlowLayers({
  node,
  palette,
  fontFamily,
}: {
  node: NodeOf<'text'>;
  palette: Palette;
  fontFamily: string | undefined;
}) {
  const glow = findEffect(node.effects, 'glow');
  if (!glow) return null;
  const n = glow.colors.length;
  const wrapper: CSSVars | undefined =
    n > 1 ? { animation: `sk-breathe-soft ${glow.durationMs}ms ease-in-out infinite` } : undefined;

  return (
    <div className="sk-fx-box sk-fx" style={wrapper} aria-hidden>
      {glow.colors.map((token, i) => {
        const color = palette[token];
        return (
          <p
            key={`${token}-${i}`}
            className="sk-content sk-text sk-fx sk-layer"
            data-first={i === 0}
            style={{
              color,
              fontFamily,
              fontSize: cqw(node.fontSize),
              fontWeight: Number(node.weight),
              textAlign: node.align,
              textShadow: `0 0 ${cqw(glow.blur)} ${color}, 0 0 ${cqw(glow.blur + glow.spread * 2)} ${color}`,
              animation: layerAnimation('fade', i, n, glow.durationMs),
            }}
          >
            <span>{node.text}</span>
          </p>
        );
      })}
    </div>
  );
}

/**
 * Glow for transparent images that follows the picture's outline, not its box. Each color is a copy
 * of the image with a drop-shadow halo behind the real one (native: tinted + blurred copy).
 */
export function ImageContourGlow({ node, palette }: { node: NodeOf<'image'>; palette: Palette }) {
  const glow = findEffect(node.effects, 'glow');
  if (!glow) return null;
  const n = glow.colors.length;
  const wrapper: CSSVars | undefined =
    n > 1 ? { animation: `sk-breathe-soft ${glow.durationMs}ms ease-in-out infinite` } : undefined;

  return (
    <div className="sk-fx-box sk-fx" style={wrapper} aria-hidden>
      {glow.colors.map((token, i) => (
        <img
          key={`${token}-${i}`}
          className="sk-img sk-fx-box sk-fx sk-layer"
          data-first={i === 0}
          src={node.uri}
          alt=""
          draggable={false}
          decoding="async"
          loading="lazy"
          style={{
            objectFit: node.fit,
            filter: `drop-shadow(0 0 ${cqw(glow.blur + glow.spread)} ${palette[token]})`,
            animation: layerAnimation('fade', i, n, glow.durationMs),
          }}
        />
      ))}
    </div>
  );
}

/** On top of the content: edge that blinks or cross-fades through colors. */
export function EdgeLayers({ effects, palette }: { effects: readonly Effect[]; palette: Palette }) {
  const edge = findEffect(effects, 'edgeBlink');
  if (!edge) return null;
  const n = edge.colors.length;

  return (
    <>
      {edge.colors.map((token, i) => {
        const color = palette[token];
        const glow = edge.blur > 0 ? `0 0 ${cqw(edge.blur)} ${color}, inset 0 0 ${cqw(edge.blur)} ${withAlpha(color, 0.6)}` : undefined;
        return (
          <div
            key={`${token}-${i}`}
            className="sk-fx-box sk-fx sk-layer"
            data-first={i === 0}
            aria-hidden
            style={{
              border: `${cqw(edge.width)} solid ${color}`,
              boxShadow: glow,
              animation: layerAnimation(edge.mode === 'blink' ? 'blink' : 'fade', i, n, edge.durationMs),
            }}
          />
        );
      })}
    </>
  );
}

const TAIL = [
  { lag: 0, scale: 1, alpha: 1 },
  { lag: 0.018, scale: 0.75, alpha: 0.55 },
  { lag: 0.036, scale: 0.5, alpha: 0.25 },
] as const;

/**
 * On top of the content: lights running around the border, one per color, evenly spaced.
 * Each side takes a quarter of the lap (same as borderPoint() on native).
 */
export function BorderRunners({
  effects,
  palette,
  width,
  height,
}: {
  effects: readonly Effect[];
  palette: Palette;
  /** node size in "u" */
  width: number;
  height: number;
}) {
  const run = findEffect(effects, 'borderRun');
  if (!run) return null;
  const n = run.colors.length;
  const box: CSSVars = { '--sk-rw': cqw(width), '--sk-rh': cqw(height) };

  return (
    <div className="sk-fx-box" aria-hidden style={box}>
      {run.colors.flatMap((token, i) =>
        TAIL.map((tail, k) => {
          const size = run.size * tail.scale;
          const color = palette[token];
          // position on the lap at t=0, always ≥ 0 so the negative delay starts it mid-lap immediately
          const offset = (i / n - tail.lag + 1) % 1;
          return (
            <span
              key={`${token}-${i}-${k}`}
              className="sk-fx sk-runner"
              style={{
                width: cqw(size),
                height: cqw(size),
                margin: cqw(-size / 2),
                background: withAlpha(color, tail.alpha),
                boxShadow: k === 0 ? `0 0 ${cqw(run.size * 1.5)} ${cqw(run.size * 0.4)} ${color}` : undefined,
                animation: `sk-run ${run.durationMs}ms linear ${-offset * run.durationMs}ms infinite`,
              }}
            />
          );
        }),
      )}
    </div>
  );
}

/** Keyframes for 1–4 color cycles (see layerAnimation). */
export function cycleKeyframes(maxColors: number): string {
  let css = '';
  for (let n = 2; n <= maxColors; n++) {
    const step = 100 / n;
    css += `@keyframes sk-fade-${n}{0%{opacity:1}${step}%{opacity:0}${100 - step}%{opacity:0}100%{opacity:1}}`;
    css += `@keyframes sk-blink-${n}{0%{opacity:1}${step}%{opacity:0}100%{opacity:0}}`;
  }
  return css;
}
