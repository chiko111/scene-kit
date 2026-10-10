import { useState } from 'react';
import {
  PixelRatio,
  StyleSheet,
  View,
  type LayoutChangeEvent,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';
import {
  fitSceneWidth,
  type FontMap,
  type Palette,
  type Scene,
  type SceneAction,
  type SceneFit,
} from '@chiko111/scene-kit-core';
import { NodeView } from './NodeView';
import { useAppActive } from './useAppActive';

export type SceneViewProps = {
  scene: Scene;
  /** Map theme tokens to your Colors.* — never hex in the scene JSON. */
  palette: Palette;
  onAction?: (action: SceneAction) => void;
  /**
   * Visibility from the outside: useIsFocused(), FlatList viewability, etc.
   * App background is handled internally.
   */
  active?: boolean;
  /** Same font family the web/editor uses, so text wraps the same way. */
  fontFamily?: string;
  /** Font keys used in scenes → font families bundled in the app (e.g. { heading: 'Montserrat-Bold' }). */
  fonts?: FontMap;
  /** Upper limits in dp. The scene keeps its aspect ratio and is centered. */
  maxWidth?: number;
  maxHeight?: number;
  /**
   * 'width' (default): fill the slot's width, height follows the aspect ratio.
   * 'contain': fit entirely inside the slot — give the slot a height via `style` (or flex).
   */
  fit?: SceneFit;
  /** Style of the slot (outer frame), e.g. margins or a fixed height for fit="contain". */
  style?: StyleProp<ViewStyle>;
};

type Box = { width: number; height: number };

export function SceneView({
  scene,
  palette,
  onAction,
  active,
  fontFamily,
  fonts,
  maxWidth,
  maxHeight,
  fit,
  style,
}: SceneViewProps) {
  const appActive = useAppActive();
  const reducedMotion = useReducedMotion();
  const [box, setBox] = useState<Box>({ width: 0, height: 0 });
  const running = (active ?? true) && appActive;

  const width = PixelRatio.roundToNearestPixel(
    fitSceneWidth({
      availableWidth: box.width,
      availableHeight: box.height,
      aspectRatio: scene.aspectRatio,
      maxWidth,
      maxHeight,
      fit,
    }),
  );

  const handleLayout = (event: LayoutChangeEvent) => {
    const { width: w, height: h } = event.nativeEvent.layout;
    setBox((prev) => (prev.width === w && prev.height === h ? prev : { width: w, height: h }));
  };

  return (
    <View onLayout={handleLayout} style={[fit === 'contain' ? styles.frameContain : styles.frame, style]}>
      {width > 0 && (
        <View
          accessibilityLabel={scene.name || undefined}
          style={[
            styles.scene,
            {
              width,
              height: width / scene.aspectRatio,
              backgroundColor: scene.background ? palette[scene.background] : undefined,
            },
          ]}
        >
          {scene.nodes.map((node) =>
            node.hidden ? null : (
              <NodeView
                key={node.id}
                node={node}
                palette={palette}
                unit={width / 100}
                aspectRatio={scene.aspectRatio}
                running={running}
                reducedMotion={reducedMotion}
                fontFamily={fontFamily}
                fonts={fonts}
                onAction={onAction}
              />
            ),
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  frame: { width: '100%', alignItems: 'center' },
  frameContain: { flex: 1, alignSelf: 'stretch', alignItems: 'center', justifyContent: 'center' },
  scene: { overflow: 'hidden' },
});
