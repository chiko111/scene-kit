import { useRef } from 'react';
import type { FontMap, Palette, Scene, SceneAction, SceneFit } from '@chiko111/scene-kit-core';
import { NodeView } from './NodeView';
import { SCENE_CSS } from './styles';
import { useInViewport } from './useInViewport';

export type SceneViewProps = {
  scene: Scene;
  palette: Palette;
  onAction?: (action: SceneAction) => void;
  /** Extra pause switch (e.g. hidden tab in your layout). Off-screen pausing is automatic. */
  active?: boolean;
  /** false in the editor preview: buttons don't fire and can't be focused. */
  interactive?: boolean;
  /** Font of the app (same value in editor and app keeps the preview identical). */
  fontFamily?: string;
  /** Font keys used in scenes → font families loaded on the page (e.g. { heading: '"Montserrat", sans-serif' }). */
  fonts?: FontMap;
  /** Upper limits in px. The scene keeps its aspect ratio and is centered. */
  maxWidth?: number;
  maxHeight?: number;
  /**
   * 'width' (default): fill the slot's width, height follows the aspect ratio.
   * 'contain': fit entirely inside the slot — the slot must have a height (e.g. a fixed-height box).
   */
  fit?: SceneFit;
  className?: string;
};

const positive = (n: number | undefined): n is number => typeof n === 'number' && Number.isFinite(n) && n > 0;

/** CSS width that never exceeds the limits and never distorts (height comes from aspect-ratio). */
function sceneWidth(aspectRatio: number, maxWidth?: number, maxHeight?: number, fit?: SceneFit): string {
  const limits = ['100%'];
  if (positive(maxWidth)) limits.push(`${maxWidth}px`);
  if (positive(maxHeight)) limits.push(`${maxHeight * aspectRatio}px`);
  if (fit === 'contain') limits.push(`${aspectRatio * 100}cqh`);
  return limits.length === 1 ? '100%' : `min(${limits.join(', ')})`;
}

export function SceneView({
  scene,
  palette,
  onAction,
  active,
  interactive,
  fontFamily,
  fonts,
  maxWidth,
  maxHeight,
  fit,
  className,
}: SceneViewProps) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInViewport(ref);
  const running = (active ?? true) && inView;
  const isInteractive = interactive ?? true;

  return (
    <div className="sk-frame" data-fit={fit ?? 'width'}>
      <style href="scene-kit-renderer" precedence="medium">
        {SCENE_CSS}
      </style>
      <div
        ref={ref}
        className={className ? `sk-scene ${className}` : 'sk-scene'}
        data-running={running}
        role="group"
        aria-label={scene.name || undefined}
        style={{
          width: sceneWidth(scene.aspectRatio, maxWidth, maxHeight, fit),
          aspectRatio: scene.aspectRatio,
          background: scene.background ? palette[scene.background] : undefined,
          fontFamily,
        }}
      >
        {scene.nodes.map((node) =>
          node.hidden ? null : (
            <NodeView
              key={node.id}
              node={node}
              palette={palette}
              aspectRatio={scene.aspectRatio}
              fonts={fonts}
              interactive={isInteractive}
              onAction={onAction}
            />
          ),
        )}
      </div>
    </div>
  );
}
