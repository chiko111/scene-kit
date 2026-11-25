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
import { ENTER_FROM, findEffect, type Effect, type Keyframe } from '@chiko111/scene-kit-core/runtime';
import { enterEase, sampleKeyframes } from './easing';

export type LoopMode = 'pingpong' | 'ripple' | 'linear' | 'linear-pingpong';

const LOOP_EASING = {
  pingpong: Easing.inOut(Easing.sin),
  ripple: Easing.out(Easing.quad),
  linear: Easing.linear,
  'linear-pingpong': Easing.linear,
} as const;

/** Parallax factor shared with the web renderer: translateY = -depth × 0.3 × (sectionCenter − viewportCenter). */
export const PARALLAX_FACTOR = 0.3;

/**
 * Loops a shared value 0 → 1 while `enabled` ('pingpong' goes back to 0, the others restart).
 * `delayMs` offsets the start (staggers identical loops). Resets to 0 when disabled.
 * Uses .get()/.set() — required for React Compiler compatibility.
 */
export function useLoop(
  durationMs: number,
  enabled: boolean,
  mode: LoopMode = 'pingpong',
  delayMs = 0,
): SharedValue<number> {
  const progress = useSharedValue(0);

  useEffect(() => {
    if (!enabled || durationMs <= 0) {
      cancelAnimation(progress);
      progress.set(0);
      return;
    }
    progress.set(0);
    const loop = withRepeat(
      withTiming(1, { duration: durationMs, easing: LOOP_EASING[mode] }),
      -1,
      mode === 'pingpong' || mode === 'linear-pingpong',
    );
    progress.set(delayMs > 0 ? withDelay(delayMs, loop) : loop);
    return () => cancelAnimation(progress);
  }, [durationMs, enabled, mode, delayMs, progress]);

  return progress;
}

/**
 * Plays 0 → 1 (linear progress; callers apply the easing) the first time `running` is true, and again
 * whenever `replayToken` changes while running (slide activation, "play" triggers).
 * Without a duration (effect absent / reduced motion) it stays at 1.
 */
export function useOneShot(
  delayMs: number | undefined,
  durationMs: number | undefined,
  running: boolean,
  reducedMotion: boolean,
  replayToken = 0,
): SharedValue<number> {
  const has = delayMs !== undefined && durationMs !== undefined && !reducedMotion;
  const progress = useSharedValue(has ? 0 : 1);
  const playedToken = useRef<number | null>(null);

  useEffect(() => {
    if (!has) {
      cancelAnimation(progress);
      progress.set(1);
      return;
    }
    if (!running || playedToken.current === replayToken) return;
    playedToken.current = replayToken;
    cancelAnimation(progress);
    progress.set(0);
    progress.set(withDelay(delayMs, withTiming(1, { duration: durationMs, easing: Easing.linear })));
  }, [has, running, delayMs, durationMs, replayToken, progress]);

  return progress;
}

/** Eased one-shot that plays once (blur focusIn). Cubic-out, like the web renderer's ease-out. */
export function useFadeIn(
  delayMs: number | undefined,
  durationMs: number | undefined,
  running: boolean,
  reducedMotion: boolean,
): SharedValue<number> {
  return useOneShot(delayMs, durationMs, running, reducedMotion);
}

/**
 * Timeline clock in ms (0 → last keyframe). Starts like an entrance (first time running, again on replay),
 * repeat none / loop / pingpong. Loops pause while not running and restart from 0 when visible again.
 */
export function useTimelineClock(
  keyframes: readonly Keyframe[] | undefined,
  delayMs: number,
  repeat: 'none' | 'loop' | 'pingpong',
  running: boolean,
  reducedMotion: boolean,
  replayToken: number,
): SharedValue<number> {
  const total = keyframes ? (keyframes[keyframes.length - 1] as Keyframe).atMs : 0;
  // -1 = not entered yet (layer invisible, like the web renderer); then 0 … total ms
  const clock = useSharedValue(reducedMotion ? total : -1);
  const playedToken = useRef<number | null>(null);
  const looping = useRef(false);

  useEffect(() => {
    if (!keyframes || total <= 0) return;
    if (reducedMotion) {
      cancelAnimation(clock);
      clock.set(total);
      return;
    }
    if (!running) {
      if (looping.current) {
        cancelAnimation(clock);
        looping.current = false;
        playedToken.current = null; // restart the loop when visible again
      }
      return;
    }
    if (playedToken.current === replayToken) return;
    playedToken.current = replayToken;
    cancelAnimation(clock);
    clock.set(0);
    const run = withTiming(total, { duration: total, easing: Easing.linear });
    const anim = repeat === 'none' ? run : withRepeat(run, -1, repeat === 'pingpong');
    looping.current = repeat !== 'none';
    clock.set(delayMs > 0 ? withDelay(delayMs, anim) : anim);
  }, [keyframes, total, delayMs, repeat, running, reducedMotion, replayToken, clock]);

  useEffect(() => () => cancelAnimation(clock), [clock]);

  return clock;
}

/** 0 ↔ 1 fade used by show / hide / toggle triggers: 400 ms cubic in-out (same as web). */
export function useVisibility(shown: boolean): SharedValue<number> {
  const v = useSharedValue(shown ? 1 : 0);
  useEffect(() => {
    v.set(withTiming(shown ? 1 : 0, { duration: 400, easing: Easing.bezier(0.65, 0, 0.35, 1) }));
  }, [shown, v]);
  return v;
}

type Options = {
  effects: readonly Effect[];
  opacity: number;
  rotation: number;
  /** px per "u" (1% of scene width) */
  unit: number;
  running: boolean;
  reducedMotion: boolean;
  /** Changes → entrance / timeline replay. */
  replayToken: number;
  /** Trigger visibility (startHidden / show / hide / toggle). */
  shown: boolean;
  /** sectionCenterY − viewportCenterY (px) from PageView; undefined outside a page. */
  parallaxDelta: SharedValue<number> | undefined;
};

const NO_ENTER = { x: 0, y: 0, scale: 1, rotateX: 0, easing: 'out' as const };

/**
 * Single animated style per node on the UI thread. Entrance OR timeline (timeline wins), loops
 * (pulse, float, wiggle, spin), parallax and trigger visibility compose into one transform.
 */
export function useNodeMotion({
  effects,
  opacity,
  rotation,
  unit,
  running,
  reducedMotion,
  replayToken,
  shown,
  parallaxDelta,
}: Options) {
  const pulse = findEffect(effects, 'pulse');
  const float = findEffect(effects, 'float');
  const wiggle = findEffect(effects, 'wiggle');
  const spin = findEffect(effects, 'spin');
  const fadeIn = findEffect(effects, 'fadeIn');
  const timeline = findEffect(effects, 'timeline');
  const enter = timeline ? undefined : findEffect(effects, 'enter');
  const parallax = findEffect(effects, 'parallax');
  const loops = running && !reducedMotion;

  const pulseProgress = useLoop(pulse?.durationMs ?? 0, loops && pulse !== undefined, 'pingpong', pulse?.delayMs ?? 0);
  const floatProgress = useLoop(float?.durationMs ?? 0, loops && float !== undefined, 'pingpong', float?.delayMs ?? 0);
  const wiggleProgress = useLoop(wiggle?.durationMs ?? 0, loops && wiggle !== undefined, 'pingpong', wiggle?.delayMs ?? 0);
  const spinProgress = useLoop(spin?.durationMs ?? 0, loops && spin !== undefined, 'linear');
  const fadeProgress = useOneShot(fadeIn?.delayMs, fadeIn?.durationMs, running, reducedMotion, replayToken);

  const from = enter ? ENTER_FROM[enter.preset] : NO_ENTER;
  const enterProgress = useOneShot(enter?.delayMs, enter?.durationMs, running, reducedMotion, replayToken);
  const keyframes = timeline?.keyframes;
  const clock = useTimelineClock(
    keyframes,
    timeline?.delayMs ?? 0,
    timeline?.repeat ?? 'none',
    running,
    reducedMotion,
    replayToken,
  );
  const visibility = useVisibility(shown);
  const zero = useSharedValue(0);
  const delta = parallaxDelta ?? zero;

  const pulseAmount = pulse ? pulse.scale - 1 : 0;
  const floatPx = float ? float.distance * unit : 0;
  const wiggleDeg = wiggle ? wiggle.angle : 0;
  const spinDeg = spin ? (spin.direction === 'ccw' ? -360 : 360) : 0;
  const fromX = from.x * unit;
  const fromY = from.y * unit;
  const fromScale = from.scale;
  const fromRotateX = from.rotateX;
  const enterEasing = from.easing;
  const depth = parallax ? parallax.depth : 0;
  const hasFade = fadeIn !== undefined;

  return useAnimatedStyle(() => {
    'worklet';
    const raw = enterProgress.get();
    const e = enterEase(enterEasing, raw);
    const rest = 1 - e;
    const c = clock.get();
    const tl = keyframes ? sampleKeyframes(keyframes, c) : null;
    const tlOpacity = tl ? (c < 0 ? 0 : Math.min(1, Math.max(0, tl.opacity))) : 1;
    const angle =
      rotation + (tl ? tl.rotate : 0) + wiggleDeg * (2 * wiggleProgress.get() - 1) + spinDeg * spinProgress.get();
    const parallaxY = depth !== 0 ? -depth * PARALLAX_FACTOR * delta.get() : 0;
    const fade = hasFade ? enterEase('out', fadeProgress.get()) : 1;
    return {
      opacity:
        opacity *
        fade *
        Math.min(1, Math.max(0, e)) *
        tlOpacity *
        visibility.get(),
      transform: [
        { perspective: 800 },
        { translateX: fromX * rest + (tl ? tl.x * unit : 0) },
        { translateY: fromY * rest - floatPx * floatProgress.get() + (tl ? tl.y * unit : 0) + parallaxY },
        { rotateX: `${fromRotateX * rest}deg` },
        { rotate: `${angle}deg` },
        { scale: (fromScale + (1 - fromScale) * e) * (1 + pulseAmount * pulseProgress.get()) * (tl ? tl.scale : 1) },
      ],
    };
  });
}
