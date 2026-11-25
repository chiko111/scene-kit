import { useContext, useEffect, useRef, useState, type ComponentType } from 'react';
import { StyleSheet, Text, View, type TextStyle } from 'react-native';
import Animated, { useAnimatedStyle, type SharedValue } from 'react-native-reanimated';
import LottieView from 'lottie-react-native';
import {
  ENTER_FROM,
  formatCountdownText,
  resolveFont,
  secondsUntil,
  zonedNow,
  type EffectOf,
  type FontMap,
  type NodeOf,
  type Palette,
  resolveAsset,
} from '@chiko111/scene-kit-core/runtime';
import { enterEase } from './easing';
import { PageContext } from './pageContext';
import { useOneShot } from './useNodeMotion';

/* ───────────── split text ───────────── */

type Piece = { kind: 'piece'; text: string; index: number } | { kind: 'space'; text: string } | { kind: 'break' };
type Word = { pieces: Piece[] };

/** Words (kept together so lines only break between words) made of animated pieces. */
function splitPieces(text: string, by: 'char' | 'word'): { lines: (Word | 'space' | 'break')[]; count: number } {
  const out: (Word | 'space' | 'break')[] = [];
  let index = 0;
  for (const token of text.split(/(\n|[^\S\n]+)/)) {
    if (token === '') continue;
    if (token === '\n') out.push('break');
    else if (/^\s+$/.test(token)) out.push('space');
    else if (by === 'word') out.push({ pieces: [{ kind: 'piece', text: token, index: index++ }] });
    else out.push({ pieces: Array.from(token).map((ch) => ({ kind: 'piece' as const, text: ch, index: index++ })) });
  }
  return { lines: out, count: index };
}

function SplitPiece({
  text,
  index,
  clock,
  effect,
  total,
  unit,
  textStyle,
}: {
  text: string;
  index: number;
  clock: SharedValue<number>;
  effect: EffectOf<'splitText'>;
  total: number;
  unit: number;
  textStyle: TextStyle;
}) {
  const from = ENTER_FROM[effect.preset];
  const start = index * effect.staggerMs;
  const duration = effect.durationMs;
  const fx = from.x * unit;
  const fy = from.y * unit;
  const fs = from.scale;
  const fr = from.rotateX;
  const easing = from.easing;

  const style = useAnimatedStyle(() => {
    'worklet';
    const t = clock.get() * total;
    const raw = Math.min(1, Math.max(0, (t - start) / duration));
    const e = enterEase(easing, raw);
    const rest = 1 - e;
    return {
      opacity: Math.min(1, Math.max(0, e)),
      transform: [
        { perspective: 800 },
        { translateX: fx * rest },
        { translateY: fy * rest },
        { rotateX: `${fr * rest}deg` },
        { scale: fs + (1 - fs) * e },
      ],
    };
  });

  return (
    <Animated.View style={style}>
      <Text style={textStyle}>{text}</Text>
    </Animated.View>
  );
}

/** Text layer whose characters / words enter one after another (replays with replayToken). */
export function SplitTextContent({
  node,
  effect,
  palette,
  unit,
  fonts,
  fontFamily,
  running,
  reducedMotion,
  replayToken,
}: {
  node: NodeOf<'text'>;
  effect: EffectOf<'splitText'>;
  palette: Palette;
  unit: number;
  fonts: FontMap | undefined;
  fontFamily: string | undefined;
  running: boolean;
  reducedMotion: boolean;
  replayToken: number;
}) {
  const { lines, count } = splitPieces(node.text, effect.by);
  const total = effect.durationMs + Math.max(0, count - 1) * effect.staggerMs;
  const clock = useOneShot(effect.delayMs, total, running, reducedMotion, replayToken);
  const textStyle: TextStyle = {
    color: palette[node.color],
    fontFamily: resolveFont(fonts, node.font) ?? fontFamily,
    fontSize: node.fontSize * unit,
    fontWeight: node.weight,
    includeFontPadding: false,
    ...(node.shadow
      ? {
          textShadowColor: palette[node.shadow.color],
          textShadowOffset: { width: node.shadow.x * unit, height: node.shadow.y * unit },
          textShadowRadius: node.shadow.blur * unit,
        }
      : null),
  };
  const justify = node.align === 'center' ? 'center' : node.align === 'right' ? 'flex-end' : 'flex-start';

  return (
    <View style={styles.textBox} accessible accessibilityLabel={node.text}>
      <View style={[styles.row, { justifyContent: justify }]}>
        {lines.map((w, i) =>
          w === 'break' ? (
            <View key={`b${i}`} style={styles.break} />
          ) : w === 'space' ? (
            <Text key={`s${i}`} style={textStyle}>
              {' '}
            </Text>
          ) : (
            <View key={`w${i}`} style={styles.word}>
              {w.pieces.map((p) =>
                p.kind === 'piece' ? (
                  <SplitPiece
                    key={p.index}
                    text={p.text}
                    index={p.index}
                    clock={clock}
                    effect={effect}
                    total={total}
                    unit={unit}
                    textStyle={textStyle}
                  />
                ) : null,
              )}
            </View>
          ),
        )}
      </View>
    </View>
  );
}

/* ───────────── lottie ───────────── */

/** react-native-web: lottie-react-native renders dotLottie and sizes it via `webStyle`. */
const WEB_FILL = { width: '100%', height: '100%' };

type LottieRef = { play: () => void; pause: () => void; resume: () => void };

/** Lottie animation from the CDN. Plays only while the scene is running; nothing is shown if it fails. */
export function LottieContent({ node, running, reducedMotion }: { node: NodeOf<'lottie'>; running: boolean; reducedMotion: boolean }) {
  const ref = useRef<LottieRef | null>(null);
  const [failed, setFailed] = useState(false);
  const started = useRef(false);
  const play = running && !reducedMotion;

  useEffect(() => {
    const player = ref.current;
    if (!player) return;
    if (play) {
      if (started.current) player.resume();
      else player.play();
      started.current = true;
    } else player.pause();
  }, [play]);

  if (failed) return null;
  const Lottie = LottieView as unknown as ComponentType<Record<string, unknown>>;
  return (
    <View style={styles.fill} accessible={node.alt.length > 0} accessibilityRole="image" accessibilityLabel={node.alt || undefined}>
      <Lottie
        ref={ref}
        source={{ uri: resolveAsset(node.uri) }}
        autoPlay={play}
        loop={node.loop}
        speed={node.speed}
        resizeMode="contain"
        onAnimationFailure={() => setFailed(true)}
        style={styles.fill}
        webStyle={WEB_FILL}
      />
    </View>
  );
}

/* ───────────── countdown ───────────── */

/** "2д 03ч 14м 09с" until endDate endTime in the campaign zone; endedText afterwards. Ticks while running. */
export function CountdownContent({
  node,
  palette,
  unit,
  fonts,
  fontFamily,
  running,
}: {
  node: NodeOf<'countdown'>;
  palette: Palette;
  unit: number;
  fonts: FontMap | undefined;
  fontFamily: string | undefined;
  running: boolean;
}) {
  const page = useContext(PageContext);
  const now = page?.now ?? Date.now;
  const [time, setTime] = useState(() => now());

  useEffect(() => {
    if (!running) return;
    setTime(now());
    const id = setInterval(() => setTime(now()), 1000);
    return () => clearInterval(id);
  }, [running, now]);

  const left = secondsUntil(node.endDate, node.endTime, zonedNow(time, node.timeZone));
  const text = left <= 0 ? node.endedText : formatCountdownText(left, node.format, node.labels);

  return (
    <View style={styles.textBox}>
      <Text
        accessibilityRole="timer"
        style={{
          color: palette[node.color],
          fontFamily: resolveFont(fonts, node.font) ?? fontFamily,
          fontSize: node.fontSize * unit,
          fontWeight: node.weight,
          textAlign: node.align,
          fontVariant: ['tabular-nums'],
          includeFontPadding: false,
        }}
      >
        {text}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { ...StyleSheet.absoluteFill },
  textBox: { ...StyleSheet.absoluteFill, justifyContent: 'center' },
  row: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'flex-end' },
  word: { flexDirection: 'row' },
  break: { flexBasis: '100%', height: 0 },
});
