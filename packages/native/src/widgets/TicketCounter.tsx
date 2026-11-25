import { resolveAsset } from '@chiko111/scene-kit-core/runtime';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import type { WidgetOf } from '@chiko111/scene-kit-core/runtime';
import { usePageContext } from '../pageContext';
import { clamp, fontOf, widgetUnit } from './shared';

/** Signed-in: "Участваш с:" + the user's number in a frame. Guest: guestText + the frame opens login. */
export function TicketCounter({ widget }: { widget: WidgetOf<'ticketCounter'> }) {
  const { palette, fonts, fontFamily, user, onAction, width } = usePageContext();
  const u = widgetUnit(width);
  const loggedIn = user?.loggedIn === true;
  const value = user?.fields?.[widget.field];
  const font = fontOf(fonts, widget.font, fontFamily);
  const textSize = clamp(5 * u, 16, 34);
  const box = clamp(30 * u, 96, 170);
  const height = Math.max(width / widget.aspectRatio, textSize * 1.6 + box + 24);

  const frame = (
    <View style={[styles.box, { width: box, height: box }]}>
      {widget.boxUri && <Image source={resolveAsset(widget.boxUri)} style={StyleSheet.absoluteFill} contentFit="contain" />}
      {loggedIn && (
        <Text
          style={[styles.number, { color: palette[widget.numberColor], fontSize: box * 0.3, fontFamily: font }]}
          accessibilityLabel={`${widget.userText} ${String(value ?? 0)}`}
        >
          {String(value ?? 0)}
        </Text>
      )}
    </View>
  );

  return (
    <View style={[styles.root, { height, backgroundColor: widget.background ? palette[widget.background] : undefined }]}>
      {widget.backgroundUri && <Image source={resolveAsset(widget.backgroundUri)} style={StyleSheet.absoluteFill} contentFit="cover" />}
      <Text style={[styles.text, { color: palette[widget.textColor], fontSize: textSize, fontFamily: font }]}>
        {loggedIn ? widget.userText : widget.guestText}
      </Text>
      {loggedIn || !onAction ? (
        frame
      ) : (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={widget.guestText}
          onPress={() => onAction(widget.loginAction)}
          style={({ pressed }) => pressed && styles.pressed}
        >
          {frame}
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { width: '100%', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', gap: 4 },
  text: { fontWeight: '800', textAlign: 'center', textShadowColor: 'rgba(0,0,0,0.45)', textShadowRadius: 8, textShadowOffset: { width: 0, height: 2 } },
  box: { alignItems: 'center', justifyContent: 'center' },
  number: { fontWeight: '900', marginTop: '-4%', includeFontPadding: false },
  pressed: { opacity: 0.8 },
});
