import { useEffect, useRef } from 'react';
import {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { findEffect, type Effect } from '@chiko111/scene-kit-core';

export type LoopMode = 'pingpong' | 'ripple' | 'linear';

const LOOP_EASING = {
  pingpong: Easing.inOut(Easing.sin),
  ripple: Easing.out(Easing.quad),
  linear: Easing.linear,
} as const;

/**
 * Loops a shared value 0 → 1 while `enabled` ('pingpong' goes back to 0, the others restart).
 * Resets to 0 when disabled (not visible anyway).
 * Uses .get()/.set() — required for React Compiler compatibility.
 */
export function useLoop(durationMs: number, enabled: boolean, mode: LoopMode = 'pingpong'): SharedValue<number> {
  const progress = useSharedValue(0);

  useEffect(() => {
    if (!enabled || durationMs <= 0) {
      cancelAnimation(progress);
      progress.set(0);
      return;
    }
    progress.set(0);
    progress.set(
      withRepeat(withTiming(1, { duration: durationMs, easing: LOOP_EASING[mode] }), -1, mode === 'pingpong'),
    );
    return () => cancelAnimation(progress);
  }, [durationMs, enabled, mode, progress]);

  return progress;
}

/** Plays once, the first time the scene becomes active. */
function useFadeIn(
  delayMs: number | undefined,
  durationMs: number | undefined,
  running: boolean,
  reducedMotion: boolean,
): SharedValue<number> {
  const hasFade = delayMs !== undefined && durationMs !== undefined && !reducedMotion;
  const progress = useSharedValue(hasFade ? 0 : 1);
  const played = useRef(false);

  useEffect(() => {
    if (!hasFade) {
      cancelAnimation(progress);
      progress.set(1);
      return;
    }
    if (!running || played.current) return;
    played.current = true;
    progress.set(
      withDelay(delayMs, withTiming(1, { duration: durationMs, easing: Easing.out(Easing.cubic) })),
    );
  }, [hasFade, running, delayMs, durationMs, progress]);

  return progress;
}

type Options = {
  effects: readonly Effect[];
  opacity: number;
  rotation: number;
  /** px per "u" (1% of scene width) */
  unit: number;
  running: boolean;
  reducedMotion: boolean;
};

/** Single animated style per node: opacity + translate/rotate/scale on the UI thread. */
export function useNodeMotion({ effects, opacity, rotation, unit, running, reducedMotion }: Options) {
  const pulse = findEffect(effects, 'pulse');
  const float = findEffect(effects, 'float');
  const fadeIn = findEffect(effects, 'fadeIn');
  const loops = running && !reducedMotion;

  const pulseProgress = useLoop(pulse?.durationMs ?? 0, loops && pulse !== undefined);
  const floatProgress = useLoop(float?.durationMs ?? 0, loops && float !== undefined);
  const fadeProgress = useFadeIn(fadeIn?.delayMs, fadeIn?.durationMs, running, reducedMotion);

  const pulseAmount = pulse ? pulse.scale - 1 : 0;
  const floatPx = float ? float.distance * unit : 0;

  return useAnimatedStyle(() => {
    'worklet';
    return {
      opacity: opacity * fadeProgress.get(),
      transform: [
        { translateY: -floatPx * floatProgress.get() },
        { rotate: `${rotation}deg` },
        { scale: 1 + pulseAmount * pulseProgress.get() },
      ],
    };
  });
}
