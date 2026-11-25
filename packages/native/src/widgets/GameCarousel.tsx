import { resolveAsset } from '@chiko111/scene-kit-core/runtime';
import { useRef, useState } from 'react';
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { Image } from 'expo-image';
import type { WidgetOf } from '@chiko111/scene-kit-core/runtime';
import { usePageContext } from '../pageContext';
import { clamp, fontOf, widgetUnit } from './shared';

type Game = WidgetOf<'gameCarousel'>['games'][number];

/** Horizontal snap carousel; the centred game is larger and has the play button. */
export function GameCarousel({ widget }: { widget: WidgetOf<'gameCarousel'> }) {
  const { palette, fonts, fontFamily, onAction, width } = usePageContext();
  const list = useRef<FlatList<Game>>(null);
  const [index, setIndex] = useState(Math.floor(widget.games.length / 2));
  const font = fontOf(fonts, widget.font, fontFamily);
  const u = widgetUnit(width);
  const item = clamp(width * 0.36, 120, 220);
  const side = (width - item) / 2;
  const c = widget.colors;

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const i = Math.round(e.nativeEvent.contentOffset.x / item);
    if (i !== index && i >= 0 && i < widget.games.length) setIndex(i);
  };
  const goTo = (i: number) => {
    const next = Math.max(0, Math.min(widget.games.length - 1, i));
    list.current?.scrollToOffset({ offset: next * item, animated: true });
    setIndex(next);
  };

  return (
    <View style={[styles.root, { backgroundColor: widget.background ? palette[widget.background] : undefined }]}>
      {widget.backgroundUri && <Image source={resolveAsset(widget.backgroundUri)} style={StyleSheet.absoluteFill} contentFit="cover" />}
      {widget.title !== '' && (
        <Text style={[styles.title, { color: palette[c.text], fontFamily: font, fontSize: clamp(7 * u, 22, 40) }]}>{widget.title}</Text>
      )}
      <View>
        <FlatList
          ref={list}
          data={widget.games}
          keyExtractor={(g) => g.id}
          horizontal
          showsHorizontalScrollIndicator={false}
          snapToInterval={item}
          decelerationRate="fast"
          contentContainerStyle={{ paddingHorizontal: side }}
          initialScrollIndex={index}
          getItemLayout={(_, i) => ({ length: item, offset: item * i, index: i })}
          onScroll={onScroll}
          scrollEventThrottle={32}
          renderItem={({ item: game, index: i }) => {
            const active = i === index;
            return (
              <Pressable
                onPress={() => (active ? onAction?.(game.action) : goTo(i))}
                accessibilityRole="button"
                accessibilityLabel={game.name}
                style={[styles.slot, { width: item }]}
              >
                <View
                  style={[
                    styles.card,
                    {
                      width: item * 0.92,
                      height: item * 0.92 * 1.35,
                      borderColor: active ? palette[c.accent] : 'transparent',
                      transform: [{ scale: active ? 1 : 0.84 }],
                      opacity: active ? 1 : 0.8,
                    },
                  ]}
                >
                  <Image source={resolveAsset(game.imageUri)} style={StyleSheet.absoluteFill} contentFit="cover" transition={200} />
                  {game.badgeUri && (
                    <Image
                      source={resolveAsset(game.badgeUri)}
                      style={[styles.badge, { width: '34%', aspectRatio: 1 }]}
                      contentFit="contain"
                      accessibilityIgnoresInvertColors
                    />
                  )}
                  {active && widget.playLabel !== '' && (
                    <Text style={[styles.play, { backgroundColor: palette[c.accent], color: palette[c.onAccent], fontFamily: font }]}>
                      {widget.playLabel}
                    </Text>
                  )}
                </View>
                {active && (
                  <Text numberOfLines={1} style={[styles.name, { color: palette[c.text], fontFamily: font }]}>
                    {game.name}
                  </Text>
                )}
              </Pressable>
            );
          }}
        />
        <Arrow side="left" bg={palette[c.text]} fg={palette[c.accent]} onPress={() => goTo(index - 1)} />
        <Arrow side="right" bg={palette[c.text]} fg={palette[c.accent]} onPress={() => goTo(index + 1)} />
      </View>
      {widget.ctaLabel !== '' && widget.ctaAction && (
        <View style={styles.footer}>
          {widget.ctaText !== '' && <Text style={[styles.ctaText, { color: palette[c.text], fontFamily: font }]}>{widget.ctaText}</Text>}
          <Pressable
            accessibilityRole="button"
            onPress={() => widget.ctaAction && onAction?.(widget.ctaAction)}
            style={({ pressed }) => [styles.cta, { backgroundColor: palette[c.accent] }, pressed && styles.pressed]}
          >
            <Text style={[styles.ctaLabel, { color: palette[c.onAccent], fontFamily: font }]}>{widget.ctaLabel}</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

function Arrow({ side, bg, fg, onPress }: { side: 'left' | 'right'; bg: string; fg: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={side === 'left' ? '‹' : '›'}
      hitSlop={8}
      style={({ pressed }) => [styles.arrow, side === 'left' ? styles.left : styles.right, { backgroundColor: bg }, pressed && styles.pressed]}
    >
      <Text style={[styles.arrowText, { color: fg }]}>{side === 'left' ? '‹' : '›'}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  badge: { position: 'absolute', top: '3%', right: '3%' },
  root: { width: '100%', paddingVertical: 28, overflow: 'hidden', gap: 12 },
  title: { fontWeight: '900', textAlign: 'center', letterSpacing: 1 },
  slot: { alignItems: 'center', justifyContent: 'center', paddingVertical: 8 },
  card: { borderRadius: 10, borderWidth: 2, overflow: 'hidden', justifyContent: 'flex-end', alignItems: 'center' },
  play: { fontWeight: '900', fontSize: 13, paddingHorizontal: 18, paddingVertical: 6, borderRadius: 16, overflow: 'hidden', marginBottom: 10 },
  name: { fontWeight: '700', fontSize: 13, marginTop: 4 },
  arrow: { position: 'absolute', top: '42%', width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  left: { left: 10 },
  right: { right: 10 },
  arrowText: { fontSize: 24, fontWeight: '900', marginTop: -3 },
  footer: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center', gap: 10, paddingHorizontal: 16 },
  ctaText: { fontWeight: '800', fontSize: 13, letterSpacing: 0.5 },
  cta: { borderRadius: 22, paddingHorizontal: 20, paddingVertical: 10 },
  ctaLabel: { fontWeight: '900', fontSize: 14 },
  pressed: { opacity: 0.8 },
});
