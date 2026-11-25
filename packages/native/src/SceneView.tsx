import { useState } from 'react';
import type { SharedValue } from 'react-native-reanimated';
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
  type Trigger,
} from '@chiko111/scene-kit-core/runtime';
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
  /** Change it to replay every entrance / timeline / split-text (e.g. each time a slide becomes active). */
  replayKey?: number;
  /** sectionCenterY − viewportCenterY in px (PageView passes it for `parallax` layers). */
  parallaxDelta?: SharedValue<number>;
};

/** Per-scene trigger state: visibility overrides and per-layer replay counters. */
type Runtime = { shown: Readonly<Record<string, boolean>>; replays: Readonly<Record<string, number>> };

function initialRuntime(scene: Scene): Runtime {
  const shown: Record<string, boolean> = {};
  for (const n of scene.nodes) shown[n.id] = n.startHidden !== true;
  return { shown, replays: {} };
}

function applyTriggers(rt: Runtime, triggers: readonly Trigger[]): Runtime {
  const shown = { ...rt.shown };
  const replays = { ...rt.replays };
  for (const t of triggers) {
    if (t.do === 'play') replays[t.target] = (replays[t.target] ?? 0) + 1;
    else if (t.do === 'show') shown[t.target] = true;
    else if (t.do === 'hide') shown[t.target] = false;
    else shown[t.target] = !(shown[t.target] ?? true);
    // a layer that appears plays its entrance again
    if ((t.do === 'show' || t.do === 'toggle') && shown[t.target]) replays[t.target] = (replays[t.target] ?? 0) + 1;
  }
  return { shown, replays };
}

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
  replayKey = 0,
  parallaxDelta,
}: SceneViewProps) {
  const appActive = useAppActive();
  const reducedMotion = useReducedMotion();
  const [box, setBox] = useState<Box>({ width: 0, height: 0 });
  const [runtime, setRuntime] = useState<{ sceneId: string; rt: Runtime }>(() => ({ sceneId: scene.id, rt: initialRuntime(scene) }));
  // a different scene (e.g. desktop ↔ mobile variant) starts with fresh trigger state
  const rt = runtime.sceneId === scene.id ? runtime.rt : initialRuntime(scene);
  const runTriggers = (triggers: readonly Trigger[]) =>
    setRuntime((prev) => ({ sceneId: scene.id, rt: applyTriggers(prev.sceneId === scene.id ? prev.rt : initialRuntime(scene), triggers) }));
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
                replayToken={replayKey * 1000 + (rt.replays[node.id] ?? 0)}
                shown={rt.shown[node.id] ?? true}
                onTriggers={runTriggers}
                parallaxDelta={parallaxDelta}
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
