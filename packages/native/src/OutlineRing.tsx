import { StyleSheet } from 'react-native';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';
import type { EffectOf } from '@scene-kit/core';
import { useLoop } from './useNodeMotion';

type Props = {
  effect: EffectOf<'outlinePulse'>;
  color: string;
  radius: number | '50%';
  unit: number;
  running: boolean;
};

/** Ripple ring: scale 1 → spread, opacity 0.9 → 0. Only transform + opacity are animated. */
export function OutlineRing({ effect, color, radius, unit, running }: Props) {
  const progress = useLoop(effect.durationMs, running, false);
  const spread = effect.spread - 1;

  const animatedStyle = useAnimatedStyle(() => {
    'worklet';
    return {
      opacity: running ? 0.9 * (1 - progress.get()) : 0,
      transform: [{ scale: 1 + spread * progress.get() }],
    };
  });

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.ring,
        { borderColor: color, borderWidth: effect.width * unit, borderRadius: radius },
        animatedStyle,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  ring: { ...StyleSheet.absoluteFill },
});
