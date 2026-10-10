import type { ReactNode } from 'react';
import { StyleSheet, Text, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, type SharedValue } from 'react-native-reanimated';
import {
  borderPoint,
  cycleOpacity,
  findEffect,
  withAlpha,
  type CycleMode,
  type Effect,
  type NodeOf,
  type Palette,
} from '@chiko111/scene-kit-core';
import { useLoop } from './useNodeMotion';

type Radius = number | '50%';

type LayerProps = {
  progress: SharedValue<number>;
  index: number;
  count: number;
  mode: CycleMode;
  /** No animation (reduced motion): first color fully on, the rest off. */
  still: boolean;
  style: ViewStyle;
  children?: ReactNode;
};

/** One color of a glow/edge cycle. Opacity is computed on the UI thread (same curve as the web CSS). */
function ColorLayer({ progress, index, count, mode, still, style, children }: LayerProps) {
  const animated = useAnimatedStyle(() => {
    'worklet';
    if (still) return { opacity: index === 0 ? 1 : 0 };
    return { opacity: cycleOpacity(progress.get() * count, index, count, mode) };
  });
  return (
    <Animated.View pointerEvents="none" style={[styles.fill, style, animated]}>
      {children}
    </Animated.View>
  );
}

type EffectProps = {
  effects: readonly Effect[];
  palette: Palette;
  /** px per "u" */
  unit: number;
  radius: Radius;
  running: boolean;
  reducedMotion: boolean;
};

/** Behind the content: soft glow cycling through colors. */
export function GlowLayers({ effects, palette, unit, radius, running, reducedMotion }: EffectProps) {
  const glow = findEffect(effects, 'glow');
  const count = glow?.colors.length ?? 0;
  const progress = useLoop((glow?.durationMs ?? 0) * count, running && !reducedMotion && glow !== undefined, 'linear');

  const breathe = useAnimatedStyle(() => {
    'worklet';
    if (count <= 1 || reducedMotion) return { opacity: 1 };
    const p = (progress.get() * count) % 1;
    return { opacity: 0.6 + 0.4 * (0.5 - 0.5 * Math.cos(2 * Math.PI * p)) };
  });

  if (!glow) return null;

  return (
    <Animated.View pointerEvents="none" style={[styles.fill, breathe]}>
      {glow.colors.map((token, i) => (
        <ColorLayer
          key={`${token}-${i}`}
          progress={progress}
          index={i}
          count={count}
          mode="crossfade"
          still={reducedMotion}
          style={{
            borderRadius: radius,
            boxShadow: `0 0 ${glow.blur * unit}px ${glow.spread * unit}px ${palette[token]}`,
          }}
        />
      ))}
    </Animated.View>
  );
}

/** Glow for text nodes: halo around the letters (copies of the text behind the real one). */
export function TextGlowLayers({
  node,
  palette,
  unit,
  running,
  reducedMotion,
  fontFamily,
}: Omit<EffectProps, 'radius' | 'effects'> & { node: NodeOf<'text'>; fontFamily: string | undefined }) {
  const glow = findEffect(node.effects, 'glow');
  const count = glow?.colors.length ?? 0;
  const progress = useLoop((glow?.durationMs ?? 0) * count, running && !reducedMotion && glow !== undefined, 'linear');

  const breathe = useAnimatedStyle(() => {
    'worklet';
    if (count <= 1 || reducedMotion) return { opacity: 1 };
    const p = (progress.get() * count) % 1;
    return { opacity: 0.6 + 0.4 * (0.5 - 0.5 * Math.cos(2 * Math.PI * p)) };
  });

  if (!glow) return null;

  return (
    <Animated.View pointerEvents="none" style={[styles.fill, breathe]}>
      {glow.colors.map((token, i) => {
        const color = palette[token];
        return (
          <ColorLayer
            key={`${token}-${i}`}
            progress={progress}
            index={i}
            count={count}
            mode="crossfade"
            still={reducedMotion}
            style={styles.textBox}
          >
            <Text
              style={[
                styles.text,
                {
                  color,
                  fontFamily,
                  fontSize: node.fontSize * unit,
                  fontWeight: node.weight,
                  textAlign: node.align,
                  textShadowColor: color,
                  textShadowOffset: { width: 0, height: 0 },
                  textShadowRadius: (glow.blur + glow.spread) * unit,
                },
              ]}
            >
              {node.text}
            </Text>
          </ColorLayer>
        );
      })}
    </Animated.View>
  );
}

/** On top of the content: edge that blinks or cross-fades through colors. */
export function EdgeLayers({ effects, palette, unit, radius, running, reducedMotion }: EffectProps) {
  const edge = findEffect(effects, 'edgeBlink');
  const count = edge?.colors.length ?? 0;
  const progress = useLoop((edge?.durationMs ?? 0) * count, running && !reducedMotion && edge !== undefined, 'linear');

  if (!edge) return null;

  return (
    <>
      {edge.colors.map((token, i) => {
        const color = palette[token];
        const blur = edge.blur * unit;
        return (
          <ColorLayer
            key={`${token}-${i}`}
            progress={progress}
            index={i}
            count={count}
            mode={edge.mode === 'blink' ? 'blink' : 'crossfade'}
            still={reducedMotion}
            style={{
              borderRadius: radius,
              borderWidth: edge.width * unit,
              borderColor: color,
              boxShadow: blur > 0 ? `0 0 ${blur}px ${color}, inset 0 0 ${blur}px ${withAlpha(color, 0.6)}` : undefined,
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

type RunnerProps = {
  progress: SharedValue<number>;
  offset: number;
  size: number;
  color: string;
  glow: string | undefined;
  /** node size in px */
  width: number;
  height: number;
};

function Runner({ progress, offset, size, color, glow, width, height }: RunnerProps) {
  const animated = useAnimatedStyle(() => {
    'worklet';
    const { x, y } = borderPoint(progress.get() + offset, width, height);
    return { transform: [{ translateX: x }, { translateY: y }] };
  });
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.runner,
        { width: size, height: size, borderRadius: size / 2, margin: -size / 2, backgroundColor: color, boxShadow: glow },
        animated,
      ]}
    />
  );
}

/** On top of the content: lights running around the border, one per color, evenly spaced. */
export function BorderRunners({
  effects,
  palette,
  unit,
  running,
  reducedMotion,
  width,
  height,
}: Omit<EffectProps, 'radius'> & { width: number; height: number }) {
  const run = findEffect(effects, 'borderRun');
  const progress = useLoop(run?.durationMs ?? 0, running && !reducedMotion && run !== undefined, 'linear');

  if (!run || reducedMotion) return null;
  const count = run.colors.length;

  return (
    <>
      {run.colors.flatMap((token, i) =>
        TAIL.map((tail, k) => {
          const size = run.size * tail.scale * unit;
          const color = palette[token];
          return (
            <Runner
              key={`${token}-${i}-${k}`}
              progress={progress}
              offset={(i / count - tail.lag + 1) % 1}
              size={size}
              color={withAlpha(color, tail.alpha)}
              glow={k === 0 ? `0 0 ${run.size * 1.5 * unit}px ${run.size * 0.4 * unit}px ${color}` : undefined}
              width={width}
              height={height}
            />
          );
        }),
      )}
    </>
  );
}

const styles = StyleSheet.create({
  fill: { ...StyleSheet.absoluteFill },
  runner: { position: 'absolute', left: 0, top: 0 },
  textBox: { justifyContent: 'center' },
  text: { includeFontPadding: false },
});
