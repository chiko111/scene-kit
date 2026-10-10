import { useState } from 'react';
import { StyleSheet, View, type LayoutChangeEvent, type StyleProp, type ViewStyle } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';
import type { Palette, Scene, SceneAction } from '@chiko111/scene-kit-core';
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
  style?: StyleProp<ViewStyle>;
};

export function SceneView({ scene, palette, onAction, active, fontFamily, style }: SceneViewProps) {
  const appActive = useAppActive();
  const reducedMotion = useReducedMotion();
  const [width, setWidth] = useState(0);
  const running = (active ?? true) && appActive;

  const handleLayout = (event: LayoutChangeEvent) => {
    setWidth(Math.round(event.nativeEvent.layout.width * 100) / 100);
  };

  return (
    <View
      onLayout={handleLayout}
      accessibilityLabel={scene.name || undefined}
      style={[
        styles.scene,
        {
          aspectRatio: scene.aspectRatio,
          backgroundColor: scene.background ? palette[scene.background] : undefined,
        },
        style,
      ]}
    >
      {width > 0 &&
        scene.nodes.map((node) =>
          node.hidden ? null : (
            <NodeView
              key={node.id}
              node={node}
              palette={palette}
              unit={width / 100}
              running={running}
              reducedMotion={reducedMotion}
              fontFamily={fontFamily}
              onAction={onAction}
            />
          ),
        )}
    </View>
  );
}

const styles = StyleSheet.create({
  scene: { width: '100%', overflow: 'hidden' },
});
