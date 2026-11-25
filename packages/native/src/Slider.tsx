import { useEffect, useRef, useState } from 'react';
import { PanResponder, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { sceneForWidth, type FontMap, type PageSection, type Palette, type SceneAction } from '@chiko111/scene-kit-core/runtime';
import { ease } from './easing';
import { SceneView } from './SceneView';

type SliderSection = Extract<PageSection, { kind: 'slider' }>;
type Role = 'settled' | 'in' | 'out' | 'hidden';

/** One slide layer; its transition style follows the shared progress (parity spec with the web renderer). */
function SlideLayer({
  role,
  transition,
  dir,
  width,
  progress,
  children,
}: {
  role: Role;
  transition: SliderSection['transition'];
  dir: 1 | -1;
  width: number;
  progress: SharedValue<number>;
  children: React.ReactNode;
}) {
  const style = useAnimatedStyle(() => {
    'worklet';
    if (role === 'hidden') return { opacity: 0, zIndex: 0, transform: [{ translateX: 0 }, { scale: 1 }, { perspective: 1000 }, { rotateY: '0deg' }] };
    if (role === 'settled') return { opacity: 1, zIndex: 2, transform: [{ translateX: 0 }, { scale: 1 }, { perspective: 1000 }, { rotateY: '0deg' }] };
    const p = ease('easeInOut', progress.get());
    const incoming = role === 'in';
    let opacity = 1;
    let tx = 0;
    let scale = 1;
    let rotY = 0;
    if (transition === 'fade') opacity = incoming ? p : 1 - p;
    else if (transition === 'slide') tx = incoming ? dir * (1 - p) * width : -dir * p * width;
    else if (transition === 'zoom') {
      if (incoming) {
        scale = 1.15 - 0.15 * p;
        opacity = p;
      } else opacity = 1 - p;
    } else if (incoming) rotY = 90 * (1 - p);
    else opacity = 1 - p; // flip: the outgoing slide only fades out
    return {
      opacity,
      zIndex: incoming ? 2 : 1,
      transform: [{ translateX: tx }, { scale }, { perspective: 1000 }, { rotateY: `${rotY}deg` }],
    };
  });
  return (
    <Animated.View pointerEvents={role === 'settled' || role === 'in' ? 'auto' : 'none'} style={[styles.layer, style]}>
      {children}
    </Animated.View>
  );
}

/** Hero carousel: slide scenes with transitions, autoplay, swipe, dots / arrows. Slide animations replay on activation. */
export function Slider({
  section,
  width,
  breakpoint,
  active,
  palette,
  fonts,
  fontFamily,
  onAction,
  parallaxDelta,
}: {
  section: SliderSection;
  width: number;
  breakpoint: number;
  active: boolean;
  palette: Palette;
  fonts: FontMap | undefined;
  fontFamily: string | undefined;
  onAction: ((action: SceneAction) => void) | undefined;
  parallaxDelta: SharedValue<number> | undefined;
}) {
  const slides = section.slides;
  const n = slides.length;
  const scenes = slides.map((s) => sceneForWidth(s, width, breakpoint));
  const aspect = scenes[0]?.aspectRatio ?? 2;
  const height = width / aspect;

  const [index, setIndex] = useState(0);
  const [prev, setPrev] = useState<number | null>(null);
  const [dir, setDir] = useState<1 | -1>(1);
  const [activations, setActivations] = useState<number[]>(() => slides.map(() => 0));
  const [paused, setPaused] = useState(false);
  const progress = useSharedValue(1);

  const clearPrev = () => setPrev(null);

  const go = (next: number, direction: 1 | -1) => {
    if (next === index || next < 0 || next >= n) return;
    setPrev(index);
    setIndex(next);
    setDir(direction);
    setActivations((a) => a.map((v, i) => (i === next ? v + 1 : v)));
    cancelAnimation(progress);
    progress.set(0);
    progress.set(
      withTiming(1, { duration: section.transitionMs, easing: Easing.linear }, (finished) => {
        if (finished) runOnJS(clearPrev)();
      }),
    );
  };
  const goNext = () => {
    if (index + 1 < n) go(index + 1, 1);
    else if (section.loop && n > 1) go(0, 1);
  };
  const goPrev = () => {
    if (index > 0) go(index - 1, -1);
    else if (section.loop && n > 1) go(n - 1, -1);
  };

  // autoplay (paused while touched / hovered, off-screen or at the end without loop)
  const nextRef = useRef(goNext);
  nextRef.current = goNext;
  const canAdvance = section.loop || index < n - 1;
  useEffect(() => {
    if (section.autoplayMs <= 0 || !active || paused || n < 2 || !canAdvance) return;
    const id = setTimeout(() => nextRef.current(), section.autoplayMs);
    return () => clearTimeout(id);
  }, [index, active, paused, section.autoplayMs, n, canAdvance]);

  const pause = (on: boolean) => {
    if (section.pauseOnInteraction) setPaused(on);
  };
  const handlers = useRef({ next: goNext, prev: goPrev, pause });
  handlers.current = { next: goNext, prev: goPrev, pause };

  const pan = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_e, g) => Math.abs(g.dx) > 10 && Math.abs(g.dx) > Math.abs(g.dy) * 1.5,
      onPanResponderGrant: () => handlers.current.pause(true),
      onPanResponderRelease: (_e, g) => {
        if (g.dx < -40) handlers.current.next();
        else if (g.dx > 40) handlers.current.prev();
        handlers.current.pause(false);
      },
      onPanResponderTerminate: () => handlers.current.pause(false),
    }),
  ).current;

  const roleOf = (i: number): Role => {
    if (i === index) return prev === null ? 'settled' : 'in';
    if (i === prev) return 'out';
    return 'hidden';
  };

  return (
    <View
      {...pan.panHandlers}
      onTouchStart={() => pause(true)}
      onTouchEnd={() => pause(false)}
      onPointerEnter={() => pause(true)}
      onPointerLeave={() => pause(false)}
      accessibilityRole="adjustable"
      accessibilityLabel={`Slide ${index + 1} / ${n}`}
      style={[styles.slider, { width, height }]}
    >
      {slides.map((slide, i) => {
        const role = roleOf(i);
        const scene = scenes[i];
        if (!scene) return null;
        return (
          <SlideLayer key={slide.id} role={role} transition={section.transition} dir={dir} width={width} progress={progress}>
            <SceneView
              scene={scene}
              palette={palette}
              fonts={fonts}
              fontFamily={fontFamily}
              onAction={onAction}
              active={active && (role === 'settled' || role === 'in' || role === 'out')}
              replayKey={activations[i] ?? 0}
              parallaxDelta={parallaxDelta}
            />
          </SlideLayer>
        );
      })}

      {section.showArrows && n > 1 && (
        <>
          <Pressable accessibilityRole="button" accessibilityLabel="Previous slide" onPress={goPrev} style={[styles.arrow, styles.arrowLeft, { width: Math.max(32, width * 0.06), height: Math.max(32, width * 0.06) }]}>
            <Text style={[styles.arrowText, { color: palette[section.activeDotColor], fontSize: Math.max(18, width * 0.035) }]}>‹</Text>
          </Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel="Next slide" onPress={goNext} style={[styles.arrow, styles.arrowRight, { width: Math.max(32, width * 0.06), height: Math.max(32, width * 0.06) }]}>
            <Text style={[styles.arrowText, { color: palette[section.activeDotColor], fontSize: Math.max(18, width * 0.035) }]}>›</Text>
          </Pressable>
        </>
      )}

      {section.showDots && n > 1 && (
        <View style={styles.dots} pointerEvents="box-none">
          {slides.map((slide, i) => (
            <Pressable
              key={slide.id}
              accessibilityRole="button"
              accessibilityLabel={`Slide ${i + 1}`}
              accessibilityState={{ selected: i === index }}
              onPress={() => go(i, i > index ? 1 : -1)}
              hitSlop={8}
              style={[
                styles.dot,
                { backgroundColor: palette[i === index ? section.activeDotColor : section.dotColor] },
                i === index && styles.dotActive,
              ]}
            />
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  slider: { overflow: 'hidden', alignSelf: 'center' },
  layer: { ...StyleSheet.absoluteFill, backfaceVisibility: 'hidden' },
  arrow: {
    position: 'absolute',
    top: '50%',
    marginTop: -18,
    borderRadius: 999,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 5,
  },
  arrowLeft: { left: 10 },
  arrowRight: { right: 10 },
  arrowText: { fontWeight: '800', lineHeight: undefined, includeFontPadding: false, marginTop: -2 },
  dots: { position: 'absolute', bottom: 12, left: 0, right: 0, flexDirection: 'row', justifyContent: 'center', gap: 8, zIndex: 5 },
  dot: { width: 9, height: 9, borderRadius: 5, opacity: 0.7 },
  dotActive: { width: 24, opacity: 1 },
});
