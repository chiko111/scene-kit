import type React from 'react';
import { Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming, type SharedValue } from 'react-native-reanimated';
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
  type Trigger,
  resolveAsset,
} from '@chiko111/scene-kit-core/runtime';
import {
  BorderRunners,
  EdgeLayers,
  GlowLayers,
  ImageContourGlow,
  SceneImage,
  TextGlowLayers,
} from './effects';
import { CountdownContent, LottieContent, SplitTextContent } from './layers';
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
  /** Changes → replay entrance / timeline / split text / Ken Burns once. */
  replayToken: number;
  /** Trigger visibility (startHidden, show / hide / toggle). */
  shown: boolean;
  /** Runs this layer's triggers (scene state lives in SceneView). */
  onTriggers: (triggers: readonly Trigger[]) => void;
  parallaxDelta: SharedValue<number> | undefined;
};

type ContentProps = Omit<Props, 'aspectRatio' | 'shown' | 'onTriggers' | 'parallaxDelta'> & {
  width: number;
  height: number;
  /** Tap handler: runs triggers, then the action (if any). undefined = not tappable. */
  press: ((action?: SceneAction) => void) | undefined;
  tappable: boolean;
  /** Hover / press highlight on/off (only when the layer has `hover`). */
  onHover: ((on: boolean) => void) | undefined;
};

/** Pressable props that drive the hover highlight: finger down/up, and pointer hover where available. */
function hoverHandlers(onHover: ((on: boolean) => void) | undefined) {
  if (!onHover) return {};
  return {
    onPressIn: () => onHover(true),
    onPressOut: () => onHover(false),
    onHoverIn: () => onHover(true),
    onHoverOut: () => onHover(false),
  };
}

/*
 * Static styles live in StyleSheet.create. Values that come from the scene JSON
 * (position, size, colors, font size) are data, so they are computed per node.
 */

function frameStyle(node: SceneNode): ViewStyle {
  const { x, y, w, h } = node.frame;
  return { left: `${x}%`, top: `${y}%`, width: `${w}%`, height: `${h}%` };
}

function Content({
  node,
  palette,
  unit,
  running,
  reducedMotion,
  fontFamily,
  fonts,
  replayToken,
  width,
  height,
  press,
  tappable,
  onHover,
}: ContentProps) {
  const r = nodeRadius(node);
  const borderRadius = r === 'ellipse' ? '50%' : r * unit;
  const boxShadow = toBoxShadow(node.shadow, palette, (u) => `${u * unit}px`);

  switch (node.type) {
    case 'image': {
      const image = (
        <SceneImage
          node={node}
          unit={unit}
          running={running}
          reducedMotion={reducedMotion}
          borderRadius={borderRadius}
          boxShadow={boxShadow}
          width={width}
          height={height}
          replayToken={replayToken}
        />
      );
      const action = node.action;
      if (!press || (!action && !tappable)) return image;
      return (
        <Pressable
          onPress={() => press(action)}
          {...hoverHandlers(onHover)}
          accessibilityRole="button"
          accessibilityLabel={node.alt || undefined}
          style={({ pressed }) => [styles.fill, pressed && styles.pressed]}
        >
          {image}
        </Pressable>
      );
    }

    case 'text': {
      const split = findEffect(node.effects, 'splitText');
      if (split) {
        return (
          <TapArea press={tappable ? press : undefined} onHover={onHover}>
            <SplitTextContent
              node={node}
              effect={split}
              palette={palette}
              unit={unit}
              fonts={fonts}
              fontFamily={fontFamily}
              running={running}
              reducedMotion={reducedMotion}
              replayToken={replayToken}
            />
          </TapArea>
        );
      }
      return (
        <TapArea press={tappable ? press : undefined} onHover={onHover}>
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
        </TapArea>
      );
    }

    case 'button': {
      const handlePress = press ? () => press(node.action) : undefined;
      return (
        <Pressable
          onPress={handlePress}
          {...hoverHandlers(onHover)}
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
      return (
        <TapArea press={tappable ? press : undefined} onHover={onHover}>
          <View style={[styles.fill, { backgroundColor: palette[node.fill], borderRadius, boxShadow }]} />
        </TapArea>
      );

    case 'lottie':
      return (
        <TapArea press={tappable ? press : undefined} onHover={onHover}>
          <LottieContent node={node} running={running} reducedMotion={reducedMotion} />
        </TapArea>
      );

    case 'countdown':
      return (
        <TapArea press={tappable ? press : undefined} onHover={onHover}>
          <CountdownContent node={node} palette={palette} unit={unit} fonts={fonts} fontFamily={fontFamily} running={running} />
        </TapArea>
      );
  }
}

/** Makes a non-button layer tappable when it has triggers. */
function TapArea({
  press,
  onHover,
  children,
}: {
  press: (() => void) | undefined;
  onHover?: ((on: boolean) => void) | undefined;
  children: React.ReactNode;
}) {
  if (!press) return <>{children}</>;
  return (
    <Pressable
      onPress={() => press()}
      {...hoverHandlers(onHover)}
      accessibilityRole="button"
      style={({ pressed }) => [styles.fill, pressed && styles.pressed]}
    >
      {children}
    </Pressable>
  );
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
  replayToken,
  shown,
  onTriggers,
  parallaxDelta,
}: Props) {
  const motionStyle = useNodeMotion({
    effects: node.effects,
    opacity: node.opacity,
    rotation: node.frame.rotation,
    unit,
    running,
    reducedMotion,
    replayToken,
    shown,
    parallaxDelta,
  });
  const triggers = node.triggers ?? [];
  const tappable = triggers.length > 0;
  // triggers first (scene-local), then the whitelisted action for the host app
  const press =
    tappable || onAction
      ? (action?: SceneAction) => {
          if (tappable) onTriggers(triggers);
          if (action && onAction) onAction(action);
        }
      : undefined;
  const width = node.frame.w * unit;
  const height = (node.frame.h * unit) / aspectRatio;

  // hover / press highlight: scale + lift the content, fade in a glow behind it
  const hover = node.hover;
  const hov = useSharedValue(0);
  const onHover = hover && !reducedMotion ? (on: boolean) => hov.set(withTiming(on ? 1 : 0, { duration: hover.durationMs })) : undefined;
  const hScale = hover ? hover.scale - 1 : 0;
  const hLift = hover ? hover.lift * unit : 0;
  const hoverStyle = useAnimatedStyle(() => {
    'worklet';
    const h = hov.get();
    return { transform: [{ translateY: -hLift * h }, { scale: 1 + hScale * h }] };
  });
  const glowOpacity = hover?.glow?.opacity ?? 0;
  const glowStyle = useAnimatedStyle(() => {
    'worklet';
    return { opacity: glowOpacity * hov.get() };
  });

  const ring = findEffect(node.effects, 'outlinePulse');
  const r = nodeRadius(node);
  const radius = r === 'ellipse' ? '50%' : r * unit;
  const fx = { effects: node.effects, palette, unit, running, reducedMotion };

  return (
    <Animated.View testID={node.id} nativeID={`sk-${node.id}`} pointerEvents={shown ? 'auto' : 'none'} style={[styles.node, frameStyle(node), motionStyle]}>
      <Animated.View style={[styles.fill, hover && hoverStyle]}>
      {hover?.glow && node.type === 'image' && (
        // contour glow: a tinted, blurred copy of the picture (drop-shadow isn't available on iOS)
        <Animated.View pointerEvents="none" style={[styles.fill, glowStyle]}>
          <Image
            source={{ uri: resolveAsset(node.uri) }}
            contentFit={node.fit}
            cachePolicy="memory-disk"
            transition={0}
            tintColor={palette[hover.glow.color]}
            blurRadius={hover.glow.blur * unit}
            style={styles.fill}
          />
        </Animated.View>
      )}
      {node.type === 'text' ? (
        <TextGlowLayers {...fx} node={node} fontFamily={resolveFont(fonts, node.font) ?? fontFamily} />
      ) : node.type === 'image' && findEffect(node.effects, 'glow')?.contour ? (
        <ImageContourGlow {...fx} node={node} />
      ) : (
        <GlowLayers {...fx} radius={radius} />
      )}
      <Content
        node={node}
        palette={palette}
        unit={unit}
        running={running}
        reducedMotion={reducedMotion}
        fontFamily={fontFamily}
        fonts={fonts}
        onAction={onAction}
        replayToken={replayToken}
        width={width}
        height={height}
        press={press}
        tappable={tappable}
        onHover={onHover}
      />
      </Animated.View>
      <EdgeLayers {...fx} radius={radius} />
      <BorderRunners {...fx} width={width} height={height} />
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
