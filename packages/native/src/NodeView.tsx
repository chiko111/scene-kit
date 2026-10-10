import { Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import Animated from 'react-native-reanimated';
import { Image } from 'expo-image';
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
import { BorderRunners, EdgeLayers, GlowLayers, TextGlowLayers } from './effects';
import { OutlineRing } from './OutlineRing';
import { useNodeMotion } from './useNodeMotion';

type Props = {
  node: SceneNode;
  palette: Palette;
  /** px per "u" (1% of scene width) */
  unit: number;
  /** scene.aspectRatio — needed for the node's height in px */
  aspectRatio: number;
  running: boolean;
  reducedMotion: boolean;
  fontFamily: string | undefined;
  fonts: FontMap | undefined;
  onAction: ((action: SceneAction) => void) | undefined;
};

/*
 * Static styles live in StyleSheet.create. Values that come from the scene JSON
 * (position, size, colors, font size) are data, so they are computed per node.
 */

function frameStyle(node: SceneNode): ViewStyle {
  const { x, y, w, h } = node.frame;
  return { left: `${x}%`, top: `${y}%`, width: `${w}%`, height: `${h}%` };
}

function Content({ node, palette, unit, running, fontFamily, fonts, onAction }: Omit<Props, 'reducedMotion' | 'aspectRatio'>) {
  const r = nodeRadius(node);
  const borderRadius = r === 'ellipse' ? '50%' : r * unit;
  const boxShadow = toBoxShadow(node.shadow, palette, (u) => `${u * unit}px`);

  switch (node.type) {
    case 'image':
      return (
        <View style={[styles.fill, { borderRadius, boxShadow }]}>
          <Image
            source={{ uri: node.uri }}
            contentFit={node.fit}
            autoplay={running}
            cachePolicy="memory-disk"
            recyclingKey={node.id}
            transition={0}
            accessible={node.alt.length > 0}
            accessibilityLabel={node.alt || undefined}
            style={[styles.fill, { borderRadius }]}
          />
        </View>
      );

    case 'text':
      return (
        <View style={styles.textBox}>
          <Text
            style={[
              styles.text,
              {
                color: palette[node.color],
                fontFamily: resolveFont(fonts, node.font) ?? fontFamily,
                fontSize: node.fontSize * unit,
                fontWeight: node.weight,
                textAlign: node.align,
              },
              node.shadow && {
                textShadowColor: withAlpha(palette[node.shadow.color], node.shadow.opacity),
                textShadowOffset: { width: node.shadow.x * unit, height: node.shadow.y * unit },
                textShadowRadius: node.shadow.blur * unit,
              },
            ]}
          >
            {node.text}
          </Text>
        </View>
      );

    case 'button': {
      const handlePress = onAction ? () => onAction(node.action) : undefined;
      return (
        <Pressable
          onPress={handlePress}
          disabled={!handlePress}
          accessibilityRole="button"
          accessibilityLabel={node.label}
          style={({ pressed }) => [
            styles.fill,
            styles.button,
            { backgroundColor: palette[node.bg], borderRadius, boxShadow },
            pressed && styles.pressed,
          ]}
        >
          <Text
            numberOfLines={2}
            style={[
              styles.buttonLabel,
              {
                color: palette[node.fg],
                fontFamily: resolveFont(fonts, node.font) ?? fontFamily,
                fontSize: node.fontSize * unit,
                fontWeight: node.weight,
              },
            ]}
          >
            {node.label}
          </Text>
        </Pressable>
      );
    }

    case 'shape':
      return <View style={[styles.fill, { backgroundColor: palette[node.fill], borderRadius, boxShadow }]} />;
  }
}

export function NodeView({
  node,
  palette,
  unit,
  aspectRatio,
  running,
  reducedMotion,
  fontFamily,
  fonts,
  onAction,
}: Props) {
  const motionStyle = useNodeMotion({
    effects: node.effects,
    opacity: node.opacity,
    rotation: node.frame.rotation,
    unit,
    running,
    reducedMotion,
  });

  const ring = findEffect(node.effects, 'outlinePulse');
  const r = nodeRadius(node);
  const radius = r === 'ellipse' ? '50%' : r * unit;
  const fx = { effects: node.effects, palette, unit, running, reducedMotion };

  return (
    <Animated.View style={[styles.node, frameStyle(node), motionStyle]}>
      {node.type === 'text' ? (
        <TextGlowLayers {...fx} node={node} fontFamily={resolveFont(fonts, node.font) ?? fontFamily} />
      ) : (
        <GlowLayers {...fx} radius={radius} />
      )}
      <Content
        node={node}
        palette={palette}
        unit={unit}
        running={running}
        fontFamily={fontFamily}
        fonts={fonts}
        onAction={onAction}
      />
      <EdgeLayers {...fx} radius={radius} />
      <BorderRunners {...fx} width={node.frame.w * unit} height={(node.frame.h * unit) / aspectRatio} />
      {ring && (
        <OutlineRing
          effect={ring}
          color={palette[ring.color]}
          radius={radius}
          unit={unit}
          running={running && !reducedMotion}
        />
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  node: { position: 'absolute' },
  fill: { ...StyleSheet.absoluteFill },
  textBox: { ...StyleSheet.absoluteFill, justifyContent: 'center' },
  text: { includeFontPadding: false },
  button: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: '4%' },
  buttonLabel: { textAlign: 'center', includeFontPadding: false },
  pressed: { opacity: 0.85 },
});
