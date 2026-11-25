import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { useVideoPlayer, VideoView } from 'expo-video';
import {
  drawDays,
  drawStatus,
  drawVideoUrl,
  fillLabel,
  formatCountdown,
  formatDateKey,
  formatTimeOfDay,
  initialDrawDay,
  weekdayIndex,
  withAlpha,
  zonedNow,
  type WidgetOf,
  resolveAsset,
} from '@chiko111/scene-kit-core/runtime';
import { usePageContext } from '../pageContext';
import { clamp, fontOf, useTicker, widgetUnit } from './shared';

/** Daily draw videos: date switcher + the selected day's video, countdown or "coming on …". */
export function DrawVideos({ widget }: { widget: WidgetOf<'drawVideos'> }) {
  const { palette, fonts, fontFamily, now, width, selectedDraw } = usePageContext();
  useTicker(1000); // countdown + release at releaseTime
  const zNow = zonedNow(now(), widget.timeZone);
  const days = drawDays(widget.startDate, widget.endDate);
  const today = initialDrawDay(widget.startDate, widget.endDate, zNow.dateKey);
  const [picked, setPicked] = useState<string | null>(null);
  const [playing, setPlaying] = useState<string | null>(null);

  // the calendar selected a day → follow it
  useEffect(() => {
    if (selectedDraw) {
      setPicked(selectedDraw);
      setPlaying(null);
    }
  }, [selectedDraw]);

  const current = picked && days.includes(picked) ? picked : today;
  const index = days.indexOf(current);
  const status = drawStatus(current, zNow, widget.releaseTime);
  const c = widget.colors;
  const l = widget.labels;
  const font = fontOf(fonts, widget.font, fontFamily);
  const u = widgetUnit(width);
  const cardW = Math.min(width - 32, 720);
  // shown time = the official draw time (announceTime); availability still follows releaseTime
  const time = formatTimeOfDay(widget.announceTime ?? widget.releaseTime);
  const go = (i: number) => {
    const next = days[Math.max(0, Math.min(days.length - 1, i))];
    if (next) {
      setPicked(next);
      setPlaying(null);
    }
  };

  return (
    <View style={[styles.root, { backgroundColor: c.background ? palette[c.background] : undefined }]}>
      {/* date switcher */}
      <View style={[styles.nav, { borderColor: withAlpha(palette[c.accent], 0.3), backgroundColor: withAlpha(palette[c.card], 0.6) }]}>
        <Arrow dir="prev" disabled={index <= 0} color={palette[c.card]} bg={palette[c.text]} onPress={() => go(index - 1)} label={l.drawFor} />
        <View style={styles.dateBox}>
          <Text style={[styles.drawFor, { color: palette[c.muted], fontFamily: font, fontSize: clamp(2.4 * u, 9, 12) }]}>{l.drawFor}</Text>
          <Text style={[styles.date, { color: palette[c.text], fontFamily: font, fontSize: clamp(7 * u, 22, 36) }]}>
            {formatDateKey(current)}
          </Text>
          <View style={styles.metaRow}>
            <Text style={{ color: palette[c.muted], fontFamily: font, fontSize: clamp(2.6 * u, 10, 13) }}>
              {l.weekdays[weekdayIndex(current)]}
            </Text>
            {current === zNow.dateKey && (
              <Text style={[styles.todayChip, { backgroundColor: palette[c.accent], color: palette[c.onAccent], fontFamily: font, fontSize: clamp(2.4 * u, 9, 12) }]}>
                {l.today}
              </Text>
            )}
          </View>
        </View>
        <Arrow dir="next" disabled={index >= days.length - 1} color={palette[c.card]} bg={palette[c.text]} onPress={() => go(index + 1)} label={l.drawFor} />
      </View>

      {/* the draw */}
      <View style={[styles.card, { width: cardW, height: (cardW * 9) / 16, backgroundColor: palette[c.card], borderColor: withAlpha(palette[c.accent], 0.35) }]}>
        {status.kind === 'released' ? (
          playing === current ? (
            <DrawPlayer url={resolveAsset(drawVideoUrl(widget.videoUrlPattern, current))} />
          ) : (
            <Pressable style={StyleSheet.absoluteFill} onPress={() => setPlaying(current)} accessibilityRole="button" accessibilityLabel={`▶ ${formatDateKey(current)}`}>
              {widget.posterUri && <Image source={resolveAsset(widget.posterUri)} style={StyleSheet.absoluteFill} contentFit="cover" />}
              <View style={styles.center}>
                <View style={[styles.play, { backgroundColor: palette[c.accent] }]}>
                  <Text style={[styles.playIcon, { color: palette[c.onAccent] }]}>▶</Text>
                </View>
              </View>
            </Pressable>
          )
        ) : (
          <View style={styles.center}>
            <Text style={[styles.clock, { color: palette[c.muted] }]}>◷</Text>
            <Text style={[styles.stateTitle, { color: palette[c.text], fontFamily: font, fontSize: clamp(3.6 * u, 12, 18) }]}>
              {status.kind === 'pending'
                ? fillLabel(l.pending, { time })
                : fillLabel(l.future, { time, date: formatDateKey(current) })}
            </Text>
            {status.kind === 'pending' && (
              <Text style={[styles.countdown, { color: palette[c.text], fontFamily: font, fontSize: clamp(9 * u, 26, 48) }]}>
                {formatCountdown(status.secondsLeft)}
              </Text>
            )}
          </View>
        )}
        <Text style={[styles.badge, { backgroundColor: palette[c.accent], color: palette[c.onAccent], fontFamily: font }]}>
          {formatDateKey(current).slice(0, 5)}
        </Text>
      </View>

      {current !== today && l.backToToday !== '' && (
        <Pressable
          accessibilityRole="button"
          onPress={() => {
            setPicked(today);
            setPlaying(null);
          }}
          style={({ pressed }) => [styles.back, { borderColor: palette[c.accent] }, pressed && styles.pressed]}
        >
          <Text style={{ color: palette[c.accent], fontFamily: font, fontWeight: '800' }}>→ {l.backToToday}</Text>
        </Pressable>
      )}
    </View>
  );
}

/** Mounted only after "play" – the video is never downloaded before the user asks for it. */
function DrawPlayer({ url }: { url: string }) {
  const player = useVideoPlayer(url, (p) => {
    p.loop = false;
    p.play();
  });
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    const sub = player.addListener('statusChange', ({ status }) => setFailed(status === 'error'));
    return () => sub.remove();
  }, [player]);
  if (failed) {
    return (
      <View style={styles.center}>
        <Text style={styles.failed}>Видеото не е налично</Text>
      </View>
    );
  }
  return <VideoView player={player} style={StyleSheet.absoluteFill} nativeControls contentFit="contain" />;
}

function Arrow({ dir, disabled, color, bg, onPress, label }: { dir: 'prev' | 'next'; disabled: boolean; color: string; bg: string; onPress: () => void; label: string }) {
  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${label} ${dir === 'prev' ? '‹' : '›'}`}
      hitSlop={8}
      style={({ pressed }) => [styles.arrow, { backgroundColor: bg, opacity: disabled ? 0.3 : pressed ? 0.7 : 1 }]}
    >
      <Text style={[styles.arrowText, { color }]}>{dir === 'prev' ? '‹' : '›'}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { width: '100%', alignItems: 'center', paddingVertical: 24, gap: 16 },
  nav: { flexDirection: 'row', alignItems: 'center', gap: 16, borderWidth: 1, borderRadius: 40, paddingHorizontal: 10, paddingVertical: 8 },
  dateBox: { alignItems: 'center', minWidth: 150 },
  drawFor: { fontWeight: '700', letterSpacing: 2, textTransform: 'uppercase' },
  date: { fontWeight: '900', letterSpacing: 1 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  todayChip: { fontWeight: '800', paddingHorizontal: 6, borderRadius: 8, overflow: 'hidden' },
  arrow: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  arrowText: { fontSize: 24, fontWeight: '900', marginTop: -3 },
  card: { borderRadius: 14, borderWidth: 1, overflow: 'hidden' },
  center: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center', padding: 16, gap: 8 },
  play: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center' },
  playIcon: { fontSize: 26, marginLeft: 4 },
  clock: { fontSize: 22 },
  stateTitle: { fontWeight: '700', textAlign: 'center' },
  countdown: { fontWeight: '900', letterSpacing: 2, fontVariant: ['tabular-nums'] },
  badge: { position: 'absolute', left: 10, bottom: 10, fontSize: 11, fontWeight: '800', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, overflow: 'hidden' },
  back: { borderWidth: 1, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 8 },
  failed: { color: '#fff', fontWeight: '700' },
  pressed: { opacity: 0.75 },
});
