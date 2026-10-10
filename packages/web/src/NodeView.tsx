import type { CSSProperties } from 'react';
import { BorderRunners, EdgeLayers, GlowLayers, TextGlowLayers } from './effects';
import {
  findEffect,
  nodeRadius,
  resolveFont,
  toBoxShadow,
  withAlpha,
  type FontMap,
  type Palette,
  type SceneAction,
  type SceneNode,
} from '@chiko111/scene-kit-core';

type CSSVars = CSSProperties & Record<`--${string}`, string | number>;

type Props = {
  node: SceneNode;
  palette: Palette;
  /** scene.aspectRatio — needed to know the node's height in "u" */
  aspectRatio: number;
  fonts: FontMap | undefined;
  interactive: boolean;
  onAction: ((action: SceneAction) => void) | undefined;
};

const cqw = (u: number) => `${u}cqw`;

function nodeStyle(node: SceneNode): CSSVars {
  const { frame, effects } = node;
  const radius = nodeRadius(node);
  const animations: string[] = [];
  const style: CSSVars = {
    left: `${frame.x}%`,
    top: `${frame.y}%`,
    width: `${frame.w}%`,
    height: `${frame.h}%`,
    rotate: frame.rotation ? `${frame.rotation}deg` : undefined,
    '--sk-opacity': node.opacity,
    '--sk-radius': radius === 'ellipse' ? '50%' : cqw(radius),
  };

  const pulse = findEffect(effects, 'pulse');
  if (pulse) {
    style['--sk-pulse-scale'] = pulse.scale;
    animations.push(`sk-pulse ${pulse.durationMs}ms ease-in-out infinite alternate`);
  }

  const float = findEffect(effects, 'float');
  if (float) {
    style['--sk-float-distance'] = float.distance;
    animations.push(`sk-float ${float.durationMs}ms ease-in-out infinite alternate`);
  }

  const fadeIn = findEffect(effects, 'fadeIn');
  if (fadeIn) {
    animations.push(`sk-fade ${fadeIn.durationMs}ms ease-out ${fadeIn.delayMs}ms both`);
  }

  if (animations.length > 0) style.animation = animations.join(', ');
  return style;
}

function ringStyle(node: SceneNode, palette: Palette): CSSVars | null {
  const ring = findEffect(node.effects, 'outlinePulse');
  if (!ring) return null;
  return {
    '--sk-ring-width': ring.width,
    '--sk-ring-color': palette[ring.color],
    '--sk-ring-spread': ring.spread,
    '--sk-ring-duration': `${ring.durationMs}ms`,
  };
}

function Content({ node, palette, fonts, interactive, onAction }: Omit<Props, 'aspectRatio'>) {
  const shadow = toBoxShadow(node.shadow, palette, cqw);

  switch (node.type) {
    case 'image':
      return (
        <div className="sk-content" style={{ boxShadow: shadow, overflow: 'hidden' }}>
          <img
            className="sk-img"
            src={node.uri}
            alt={node.alt}
            draggable={false}
            decoding="async"
            loading="lazy"
            style={{ objectFit: node.fit }}
          />
        </div>
      );

    case 'text': {
      const textShadow = node.shadow
        ? `${cqw(node.shadow.x)} ${cqw(node.shadow.y)} ${cqw(node.shadow.blur)} ${withAlpha(
            palette[node.shadow.color],
            node.shadow.opacity,
          )}`
        : undefined;
      return (
        <p
          className="sk-content sk-text"
          style={{
            color: palette[node.color],
            fontFamily: resolveFont(fonts, node.font),
            fontSize: cqw(node.fontSize),
            fontWeight: Number(node.weight),
            textAlign: node.align,
            textShadow,
          }}
        >
          <span>{node.text}</span>
        </p>
      );
    }

    case 'button': {
      const enabled = interactive && onAction !== undefined;
      return (
        <button
          type="button"
          className="sk-content sk-btn"
          aria-disabled={!enabled}
          tabIndex={interactive ? 0 : -1}
          onClick={enabled ? () => onAction(node.action) : undefined}
          style={{
            background: palette[node.bg],
            color: palette[node.fg],
            fontFamily: resolveFont(fonts, node.font),
            fontSize: cqw(node.fontSize),
            fontWeight: Number(node.weight),
            boxShadow: shadow,
          }}
        >
          {node.label}
        </button>
      );
    }

    case 'shape':
      return <div className="sk-content" style={{ background: palette[node.fill], boxShadow: shadow }} />;
  }
}

export function NodeView(props: Props) {
  const { node, palette, aspectRatio, fonts } = props;
  const ring = ringStyle(node, palette);

  return (
    <div className="sk-node" data-node-id={node.id} style={nodeStyle(node)}>
      {node.type === 'text' ? (
        <TextGlowLayers node={node} palette={palette} fontFamily={resolveFont(fonts, node.font)} />
      ) : (
        <GlowLayers effects={node.effects} palette={palette} />
      )}
      <Content {...props} />
      <EdgeLayers effects={node.effects} palette={palette} />
      <BorderRunners
        effects={node.effects}
        palette={palette}
        width={node.frame.w}
        height={node.frame.h / aspectRatio}
      />
      {ring && <div className="sk-ring" style={ring} aria-hidden />}
    </div>
  );
}
